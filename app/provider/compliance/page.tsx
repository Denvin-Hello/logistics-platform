import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { AlertTriangle, CheckCircle2, Clock, FileWarning } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import {
  COMPLIANCE_DOCUMENT_TYPES,
  DOCUMENT_TYPE_META,
  daysUntil,
  effectiveDocumentStatus,
  getProviderCompliance,
} from "@/lib/compliance"
import { DocumentUploadForm } from "@/components/compliance/document-upload-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function ProviderCompliancePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    redirect("/auth")
  }

  const compliance = await getProviderCompliance(session.user.id)
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

  const verified = documents.filter((document) => document.effectiveStatus === "VERIFIED").length
  const pending = documents.filter((document) => document.effectiveStatus === "PENDING").length
  const expiring = documents.filter(
    (document) => document.effectiveStatus === "VERIFIED" && document.daysRemaining <= 30,
  ).length

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Compliance</h1>
            <p className="text-muted-foreground">
              Keep your licence, vehicle, and insurance documents current so you can accept deliveries.
            </p>
          </div>

          {compliance.inGrace ? (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Compliance grace period</p>
                <p>
                  Your account can keep accepting deliveries until{" "}
                  {compliance.graceUntil ? formatDate(compliance.graceUntil) : "the grace period ends"}.
                  Upload your documents before then to avoid interruption.
                </p>
              </div>
            </div>
          ) : !compliance.ok ? (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Order acceptance is paused</p>
                <p>Upload and verify the missing documents below to start accepting deliveries again.</p>
              </div>
            </div>
          ) : null}

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{verified}</div>
                <p className="text-xs text-muted-foreground">Valid documents</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending review</CardTitle>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pending}</div>
                <p className="text-xs text-muted-foreground">Waiting for an administrator</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Expiring soon</CardTitle>
                <FileWarning className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{expiring}</div>
                <p className="text-xs text-muted-foreground">Within the next 30 days</p>
              </CardContent>
            </Card>
          </div>

          <DocumentUploadForm requirements={requirements} documents={documents} />
        </div>
      </div>
    </div>
  )
}
