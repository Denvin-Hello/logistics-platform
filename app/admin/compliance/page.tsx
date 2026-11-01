import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { AlertTriangle, CheckCircle2, Clock, Download, FileWarning, Search, XCircle } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  COMPLIANCE_DOCUMENT_TYPES,
  DOCUMENT_TYPE_META,
  daysUntil,
  effectiveDocumentStatus,
  getComplianceStats,
  listComplianceDocuments,
} from "@/lib/compliance"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { ComplianceTable } from "@/components/admin/compliance-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"

interface SearchParams {
  status?: string
  type?: string
  q?: string
  expiring?: string
}

export default async function AdminCompliancePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/auth")
  }

  const expiring = Number(searchParams.expiring)
  const [documents, stats, auditEntries] = await Promise.all([
    listComplianceDocuments({
      status: searchParams.status,
      type: searchParams.type,
      q: searchParams.q,
      expiringDays: Number.isFinite(expiring) && expiring > 0 ? expiring : undefined,
    }),
    getComplianceStats(),
    prisma.auditLog.findMany({
      where: { entityType: "ComplianceDocument" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ])

  const rows = documents.map((document) => ({
    id: document.id,
    providerName: document.user.name || "Unnamed provider",
    providerEmail: document.user.email,
    businessName: document.user.businessName,
    type: document.type,
    typeLabel:
      DOCUMENT_TYPE_META[document.type as keyof typeof DOCUMENT_TYPE_META]?.label ?? document.type,
    number: document.number,
    vehicleRegistration: document.vehicleRegistration,
    issuedAt: document.issuedAt?.toISOString() ?? null,
    expiresAt: document.expiresAt.toISOString(),
    effectiveStatus: effectiveDocumentStatus(document),
    daysRemaining: daysUntil(document.expiresAt),
    notes: document.notes,
    fileName: document.fileName,
    reviewedAt: document.reviewedAt?.toISOString() ?? null,
    reviewedByName: document.reviewedBy?.name || document.reviewedBy?.email || null,
    createdAt: document.createdAt.toISOString(),
  }))

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Compliance</h1>
              <p className="text-muted-foreground">
                Review provider documents, track expiry, and export compliance reports.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/api/admin/compliance/report">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Link>
            </Button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <FileWarning className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">All uploaded documents</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.verified}</div>
                <p className="text-xs text-muted-foreground">Currently valid</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Expiring</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.expiring}</div>
                <p className="text-xs text-muted-foreground">Within 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Expired</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.expired}</div>
                <p className="text-xs text-muted-foreground">Need renewal</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <form method="get" className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="flex-1 space-y-1">
                  <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
                    Search provider or document
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="q"
                      name="q"
                      defaultValue={searchParams.q ?? ""}
                      placeholder="Name, email, business, document number, or vehicle"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="status" className="text-xs font-medium text-muted-foreground">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={searchParams.status ?? ""}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm lg:w-40"
                  >
                    <option value="">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="type" className="text-xs font-medium text-muted-foreground">
                    Document type
                  </label>
                  <select
                    id="type"
                    name="type"
                    defaultValue={searchParams.type ?? ""}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm lg:w-52"
                  >
                    <option value="">All types</option>
                    {COMPLIANCE_DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {DOCUMENT_TYPE_META[type].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="expiring" className="text-xs font-medium text-muted-foreground">
                    Expiry window
                  </label>
                  <select
                    id="expiring"
                    name="expiring"
                    defaultValue={searchParams.expiring ?? ""}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm lg:w-40"
                  >
                    <option value="">Any date</option>
                    <option value="7">Next 7 days</option>
                    <option value="14">Next 14 days</option>
                    <option value="30">Next 30 days</option>
                    <option value="60">Next 60 days</option>
                    <option value="90">Next 90 days</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Filter</Button>
                  <Button type="button" variant="ghost" asChild>
                    <Link href="/admin/compliance">Reset</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <ComplianceTable documents={rows} />

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Recent compliance activity</CardTitle>
            </CardHeader>
            <CardContent>
              {auditEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No compliance activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {auditEntries.map((entry) => (
                    <div key={entry.id} className="flex flex-col justify-between gap-1 border-b pb-2 text-sm last:border-b-0 last:pb-0 sm:flex-row">
                      <span className="font-medium">{entry.action.replaceAll("_", " ").toLowerCase()}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
