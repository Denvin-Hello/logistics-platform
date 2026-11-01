import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/security"
import { readComplianceFile } from "@/lib/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const rate = rateLimit(request, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const document = await prisma.complianceDocument.findUnique({
    where: { id: params.id },
    select: { userId: true, fileKey: true, fileName: true, mimeType: true },
  })

  if (!document || !document.fileKey) {
    return NextResponse.json({ error: "File not found." }, { status: 404 })
  }

  if (session.user.role !== "ADMIN" && document.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const bytes = await readComplianceFile(document.fileKey)
    const filename = (document.fileName || "document").replace(/["\r\n]/g, "")

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      },
    })
  } catch (error) {
    console.error("Compliance file read error:", error)
    return NextResponse.json({ error: "Unable to read the stored file." }, { status: 500 })
  }
}
