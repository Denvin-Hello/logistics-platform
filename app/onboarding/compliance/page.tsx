import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { authOptions } from "@/lib/auth"
import {
  COMPLIANCE_DOCUMENT_TYPES,
  DOCUMENT_TYPE_META,
  daysUntil,
  effectiveDocumentStatus,
  getProviderCompliance,
} from "@/lib/compliance"
import { hasCurrentConsent } from "@/lib/consent"
import { DocumentUploadForm } from "@/components/compliance/document-upload-form"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function OnboardingCompliancePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth")
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin")
  }

  if (session.user.role === "CUSTOMER") {
    redirect("/customer")
  }

  if (session.user.status === "APPROVED") {
    redirect("/provider/compliance")
  }

  if (session.user.status !== "PENDING") {
    redirect("/application-status")
  }

  if (!(await hasCurrentConsent(session.user.id))) {
    redirect("/consent")
  }

  const compliance = await getProviderCompliance(session.user.id, "APPROVAL")
  const now = new Date()

  const requirements = COMPLIANCE_DOCUMENT_TYPES.map((type) => ({
    type,
    ...DOCUMENT_TYPE_META[type],
    satisfied: !compliance.missing.includes(type),
  }))

  const documents = compliance.documents.map((document) => ({
    id: document.id,
    type: document.type,
    typeLabel:
      DOCUMENT_TYPE_META[document.type as keyof typeof DOCUMENT_TYPE_META]?.label ?? document.type,
    number: document.number,
    vehicleRegistration: document.vehicleRegistration,
    issuedAt: document.issuedAt?.toISOString() ?? null,
    expiresAt: document.expiresAt.toISOString(),
    status: document.status,
    effectiveStatus: effectiveDocumentStatus(document, now),
    daysRemaining: daysUntil(document.expiresAt, now),
    notes: document.notes,
    fileName: document.fileName,
    createdAt: document.createdAt.toISOString(),
  }))

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/application-status">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Application status
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Compliance documents</h1>
          <p className="text-muted-foreground">
            Upload your licence, vehicle, and insurance documents while your provider application is reviewed.
            An administrator verifies each document.
          </p>
        </div>

        <DocumentUploadForm requirements={requirements} documents={documents} onboarding />
      </div>
    </div>
  )
}
