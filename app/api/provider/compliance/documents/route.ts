import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { ComplianceDocument } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import {
  COMPLIANCE_DOCUMENT_TYPES,
  DOCUMENT_TYPE_META,
  effectiveDocumentStatus,
  type ComplianceDocumentType,
} from "@/lib/compliance"
import { notifyAdmins } from "@/lib/notifications"
import { recordAudit } from "@/lib/audit"
import { saveComplianceFile, validateComplianceFile } from "@/lib/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function formString(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === "string" ? value.trim() : ""
}

export async function POST(request: NextRequest) {
  const rate = rateLimit(request, { limit: 10, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many uploads. Try again in a minute." }, { status: 429 })
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 })
  }

  const typeValue = formString(form, "type")
  if (!COMPLIANCE_DOCUMENT_TYPES.includes(typeValue as ComplianceDocumentType)) {
    return NextResponse.json({ error: "Choose a valid document type." }, { status: 400 })
  }
  const type = typeValue as ComplianceDocumentType
  const meta = DOCUMENT_TYPE_META[type]

  const number = formString(form, "number") || null
  const vehicleRegistration = formString(form, "vehicleRegistration").toUpperCase() || null

  if (meta.requiresVehicle && !vehicleRegistration) {
    return NextResponse.json({ error: "Enter the vehicle registration number." }, { status: 400 })
  }

  const expiresAtValue = formString(form, "expiresAt")
  const expiresAt = new Date(expiresAtValue)
  if (!expiresAtValue || Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Enter a valid expiry date." }, { status: 400 })
  }
  if (expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "The expiry date must be in the future." }, { status: 400 })
  }

  const issuedAtValue = formString(form, "issuedAt")
  const issuedAt = issuedAtValue ? new Date(issuedAtValue) : null
  if (issuedAt && Number.isNaN(issuedAt.getTime())) {
    return NextResponse.json({ error: "Enter a valid issue date." }, { status: 400 })
  }
  if (issuedAt && issuedAt.getTime() >= expiresAt.getTime()) {
    return NextResponse.json(
      { error: "The issue date must be before the expiry date." },
      { status: 400 },
    )
  }

  if (number && number.length > 120) {
    return NextResponse.json({ error: "The document number is too long." }, { status: 400 })
  }

  if (vehicleRegistration && vehicleRegistration.length > 40) {
    return NextResponse.json({ error: "The vehicle registration number is too long." }, { status: 400 })
  }

  const fileValue = form.get("file")
  const file =
    fileValue &&
    typeof fileValue === "object" &&
    "arrayBuffer" in fileValue &&
    "size" in fileValue &&
    Number(fileValue.size) > 0
      ? (fileValue as File)
      : null

  if (file) {
    const validation = validateComplianceFile(file)
    if (validation) {
      return NextResponse.json({ error: validation }, { status: 400 })
    }
  }

  const now = new Date()
  const activeDocuments = await prisma.complianceDocument.findMany({
    where: {
      userId: session.user.id,
      type,
      status: { in: ["PENDING", "VERIFIED"] },
      expiresAt: { gt: now },
      ...(meta.requiresVehicle ? { vehicleRegistration } : {}),
    },
    select: { id: true, status: true, expiresAt: true },
    orderBy: { expiresAt: "desc" },
  })

  const pendingDuplicate = activeDocuments.find((document) => document.status === "PENDING")
  if (pendingDuplicate) {
    return NextResponse.json(
      {
        error: "A document of this type is already waiting for review. Wait for the review to finish.",
        code: "DUPLICATE_DOCUMENT",
      },
      { status: 409 },
    )
  }

  const coveredByExisting = activeDocuments.find(
    (document) => document.status === "VERIFIED" && document.expiresAt.getTime() >= expiresAt.getTime(),
  )
  if (coveredByExisting) {
    return NextResponse.json(
      {
        error:
          "An active document already covers this period. Upload a renewal that expires after the current document.",
        code: "DUPLICATE_DOCUMENT",
      },
      { status: 409 },
    )
  }

  let storedFile: Awaited<ReturnType<typeof saveComplianceFile>> | null = null
  try {
    if (file) storedFile = await saveComplianceFile(file)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to store the uploaded file." },
      { status: 400 },
    )
  }

  let document: ComplianceDocument
  try {
    document = await prisma.complianceDocument.create({
      data: {
        userId: session.user.id,
        type,
        number,
        vehicleRegistration,
        issuedAt,
        expiresAt,
        fileKey: storedFile?.key ?? null,
        fileName: storedFile?.fileName ?? null,
        mimeType: storedFile?.mimeType ?? null,
        sizeBytes: storedFile?.sizeBytes ?? null,
      },
    })
  } catch (error) {
    if (storedFile) {
      const { deleteComplianceFile } = await import("@/lib/storage")
      await deleteComplianceFile(storedFile.key)
    }
    console.error("Compliance document upload error:", error)
    return NextResponse.json({ error: "Unable to save the compliance document." }, { status: 500 })
  }

  try {
    await recordAudit({
      actorId: session.user.id,
      action: "COMPLIANCE_DOCUMENT_UPLOADED",
      entityType: "ComplianceDocument",
      entityId: document.id,
      metadata: { type, vehicleRegistration, expiresAt: expiresAt.toISOString() },
    })

    await notifyAdmins({
      type: "COMPLIANCE_DOCUMENT_SUBMITTED",
      title: "New compliance document",
      body: `${session.user.name || session.user.email || "A provider"} uploaded ${meta.label}.`,
      href: "/admin/compliance",
      email: {
        subject: `Compliance document submitted: ${meta.label}`,
        text: [
          `${session.user.name || session.user.email || "A provider"} uploaded a compliance document.`,
          "",
          `Type: ${meta.label}`,
          `Vehicle: ${vehicleRegistration || "—"}`,
          `Document number: ${number || "—"}`,
          `Expires: ${expiresAt.toISOString().slice(0, 10)}`,
          "",
          `Review it at ${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/compliance`,
        ].join("\n"),
      },
    })
  } catch (error) {
    console.error("Compliance document notification error:", error)
  }

  return NextResponse.json(
    {
      ok: true,
      document: {
        ...document,
        issuedAt: document.issuedAt?.toISOString() ?? null,
        expiresAt: document.expiresAt.toISOString(),
        reviewedAt: document.reviewedAt?.toISOString() ?? null,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        effectiveStatus: effectiveDocumentStatus(document),
        typeLabel: meta.label,
      },
    },
    { status: 201 },
  )
}
