"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface AdminComplianceDocument {
  id: string
  providerName: string
  providerEmail: string | null
  businessName: string | null
  type: string
  typeLabel: string
  number: string | null
  vehicleRegistration: string | null
  issuedAt: string | null
  expiresAt: string
  effectiveStatus: string
  daysRemaining: number
  notes: string | null
  fileName: string | null
  reviewedAt: string | null
  reviewedByName: string | null
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
  if (status === "PENDING") return "Pending"
  if (status === "REJECTED") return "Rejected"
  if (status === "EXPIRED") return "Expired"
  return status
}

export function ComplianceTable({ documents }: { documents: AdminComplianceDocument[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<AdminComplianceDocument | null>(null)
  const [action, setAction] = useState<"verify" | "reject">("verify")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function openReview(document: AdminComplianceDocument, nextAction: "verify" | "reject") {
    setSelected(document)
    setAction(nextAction)
    setNotes(nextAction === "reject" ? document.notes ?? "" : "")
  }

  async function submitReview() {
    if (!selected) return

    if (action === "reject" && !notes.trim()) {
      toast({
        title: "Add a reason",
        description: "Tell the provider what needs to change.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/compliance/documents/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: notes.trim() || undefined }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        toast({
          title: "Unable to update document",
          description: data.error || "Try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: action === "verify" ? "Document verified" : "Document rejected",
        description: "The provider has been notified.",
      })
      setSelected(null)
      router.refresh()
    } catch {
      toast({ title: "Unable to update document", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>File</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No compliance documents match these filters.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <p className="font-medium">{document.businessName || document.providerName}</p>
                    <p className="text-xs text-muted-foreground">{document.providerEmail || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{document.typeLabel}</p>
                    {document.number ? (
                      <p className="text-xs text-muted-foreground">No. {document.number}</p>
                    ) : null}
                    {document.notes ? (
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{document.notes}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>{document.vehicleRegistration || "—"}</TableCell>
                  <TableCell>
                    <p>{formatDate(document.expiresAt)}</p>
                    <p
                      className={cn(
                        "text-xs",
                        document.daysRemaining <= 0
                          ? "text-red-600"
                          : document.daysRemaining <= 30
                            ? "text-amber-600"
                            : "text-muted-foreground",
                      )}
                    >
                      {document.daysRemaining <= 0
                        ? `${Math.abs(document.daysRemaining)} days overdue`
                        : `${document.daysRemaining} days left`}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border-0", STATUS_STYLES[document.effectiveStatus])}>
                      {statusLabel(document.effectiveStatus)}
                    </Badge>
                    {document.reviewedAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reviewed {formatDate(document.reviewedAt)}
                        {document.reviewedByName ? ` by ${document.reviewedByName}` : ""}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {document.fileName ? (
                      <a
                        href={`/api/compliance/documents/${document.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No file</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openReview(document, "verify")}>
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Verify
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openReview(document, "reject")}>
                        <XCircle className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "verify" ? "Verify document" : "Reject document"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.typeLabel} for ${selected.businessName || selected.providerName}.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="review-notes">
              {action === "reject" ? "Reason for rejection" : "Review notes (optional)"}
            </Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={
                action === "reject"
                  ? "Explain what the provider needs to correct."
                  : "Add any internal notes about this document."
              }
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              variant={action === "reject" ? "destructive" : "default"}
              onClick={() => void submitReview()}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {action === "verify" ? "Verify document" : "Reject document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
