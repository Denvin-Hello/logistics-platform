"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface ComplianceRequirement {
  type: string
  label: string
  description: string
  requiresVehicle: boolean
  requiredForApproval: boolean
  requiredForOrders: boolean
  satisfied: boolean
}

export interface ComplianceDocumentItem {
  id: string
  type: string
  typeLabel: string
  number: string | null
  vehicleRegistration: string | null
  issuedAt: string | null
  expiresAt: string
  status: string
  effectiveStatus: string
  daysRemaining: number
  notes: string | null
  fileName: string | null
  createdAt: string
}

const STATUS_STYLES: Record<string, string> = {
  VERIFIED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  EXPIRED: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
}

function statusLabel(status: string): string {
  if (status === "VERIFIED") return "Verified"
  if (status === "PENDING") return "Pending review"
  if (status === "REJECTED") return "Rejected"
  if (status === "EXPIRED") return "Expired"
  return status
}

export function DocumentUploadForm({
  requirements,
  documents,
  onboarding = false,
}: {
  requirements: ComplianceRequirement[]
  documents: ComplianceDocumentItem[]
  onboarding?: boolean
}) {
  const router = useRouter()
  const uploadable = requirements
  const [type, setType] = useState(
    () => (requirements.find((requirement) => !requirement.satisfied) ?? requirements[0])?.type ?? "",
  )
  const [number, setNumber] = useState("")
  const [vehicleRegistration, setVehicleRegistration] = useState("")
  const [issuedAt, setIssuedAt] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const selected = requirements.find((requirement) => requirement.type === type)
  const missing = requirements.filter(
    (requirement) =>
      (requirement.requiredForOrders || requirement.requiredForApproval) && !requirement.satisfied,
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!type) return

    setSubmitting(true)
    const formData = new FormData()
    formData.set("type", type)
    if (number.trim()) formData.set("number", number.trim())
    if (vehicleRegistration.trim()) formData.set("vehicleRegistration", vehicleRegistration.trim())
    if (issuedAt) formData.set("issuedAt", issuedAt)
    formData.set("expiresAt", expiresAt)
    if (file) formData.set("file", file)

    try {
      const response = await fetch("/api/provider/compliance/documents", {
        method: "POST",
        body: formData,
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        toast({
          title: "Unable to upload document",
          description: data.error || "Check the details and try again.",
          variant: "destructive",
        })
        return
      }

      toast({ title: "Document uploaded", description: "An administrator will review it shortly." })
      setNumber("")
      setVehicleRegistration("")
      setIssuedAt("")
      setExpiresAt("")
      setFile(null)
      router.refresh()
    } catch {
      toast({
        title: "Unable to upload document",
        description: "Check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/provider/compliance/documents/${id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast({
          title: "Unable to delete document",
          description: data.error || "Try again.",
          variant: "destructive",
        })
        return
      }
      toast({ title: "Document deleted" })
      router.refresh()
    } catch {
      toast({ title: "Unable to delete document", variant: "destructive" })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Required documents</CardTitle>
          <CardDescription>
            {missing.length === 0
              ? "All required documents are valid."
              : `${missing.length} document${missing.length === 1 ? "" : "s"} still need attention.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requirements.map((requirement) => (
            <div key={requirement.type} className="flex items-start gap-3 rounded-lg border p-3">
              {requirement.satisfied ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {requirement.label}
                  {!requirement.requiredForApproval && !requirement.requiredForOrders ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{requirement.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{onboarding ? "Upload onboarding documents" : "Upload a document"}</CardTitle>
          <CardDescription>
            PDF, JPG, PNG, or WEBP up to 10 MB. Expiry reminders are sent automatically. To renew early,
            upload a document that expires after the current one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document-type">Document type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="document-type">
                  <SelectValue placeholder="Choose a document type" />
                </SelectTrigger>
                <SelectContent>
                  {uploadable.map((requirement) => (
                    <SelectItem key={requirement.type} value={requirement.type}>
                      {requirement.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected?.requiresVehicle ? (
              <div className="space-y-2">
                <Label htmlFor="vehicle-registration">Vehicle registration</Label>
                <Input
                  id="vehicle-registration"
                  value={vehicleRegistration}
                  placeholder="e.g. CA 123 456"
                  onChange={(event) => setVehicleRegistration(event.target.value)}
                  required
                />
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="document-number">Document number</Label>
                <Input
                  id="document-number"
                  value={number}
                  placeholder="Optional reference"
                  onChange={(event) => setNumber(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document-issued">Issue date</Label>
                <Input
                  id="document-issued"
                  type="date"
                  value={issuedAt}
                  onChange={(event) => setIssuedAt(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-expiry">Expiry date</Label>
              <Input
                id="document-expiry"
                type="date"
                value={expiresAt}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setExpiresAt(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-file">Document file</Label>
              <Input
                id="document-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Attach the certificate or licence. You can submit metadata now and upload the file later.
              </p>
            </div>

            <Button type="submit" disabled={submitting || !type || !expiresAt}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Submit for review
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your documents</CardTitle>
          <CardDescription>Only verified, unexpired documents unlock order acceptance.</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => {
                const canDelete = document.effectiveStatus === "PENDING" || document.effectiveStatus === "REJECTED"
                return (
                  <div key={document.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{document.typeLabel}</p>
                          <Badge className={cn("border-0", STATUS_STYLES[document.effectiveStatus])}>
                            {statusLabel(document.effectiveStatus)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {document.vehicleRegistration ? `${document.vehicleRegistration} · ` : ""}
                          Expires {formatDate(document.expiresAt)}
                          {document.effectiveStatus === "VERIFIED"
                            ? ` · ${document.daysRemaining} day${document.daysRemaining === 1 ? "" : "s"} left`
                            : ""}
                        </p>
                        {document.number ? (
                          <p className="text-xs text-muted-foreground">Number: {document.number}</p>
                        ) : null}
                        {document.notes ? (
                          <p className="flex items-start gap-1 text-xs text-red-600">
                            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                            {document.notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {document.fileName ? (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`/api/compliance/documents/${document.id}/file`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View file
                            </a>
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === document.id}
                            onClick={() => void handleDelete(document.id)}
                          >
                            {deletingId === document.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Delete"
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
