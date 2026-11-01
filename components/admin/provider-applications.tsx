"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { DOCUMENT_TYPE_META } from "@/lib/compliance-rules"
import { formatDate } from "@/lib/format"
import { Check, X, Clock, Loader2 } from "lucide-react"

interface PendingProvider {
  id: string
  name: string | null
  email: string | null
  businessName: string | null
  phone: string | null
  serviceArea: string | null
  vehicleType: string | null
  vehicleCapacityKg: number | null
  yearsExperience: number | null
  createdAt: string
}

function vehicleSummary(provider: PendingProvider) {
  if (!provider.vehicleType) return "—"
  const capacity = provider.vehicleCapacityKg ? ` · ${provider.vehicleCapacityKg}kg` : ""
  return `${provider.vehicleType}${capacity}`
}

export function ProviderApplications({ providers }: { providers: PendingProvider[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [declining, setDeclining] = useState<PendingProvider | null>(null)
  const [reason, setReason] = useState("")
  const [complianceBlock, setComplianceBlock] = useState<{
    provider: PendingProvider
    missing: string[]
  } | null>(null)
  const [overrideReason, setOverrideReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const getInitials = (name: string | null) =>
    (name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  const review = async (userId: string, action: "approve" | "decline", override?: string) => {
    setLoading(true)
    setError(null)
    setPendingId(userId)
    try {
      const res = await fetch("/api/admin/providers/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action,
          reason: action === "decline" ? reason : undefined,
          overrideReason: action === "approve" ? override : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (action === "approve" && data.code === "COMPLIANCE_REQUIRED") {
          const provider = providers.find((entry) => entry.id === userId)
          if (provider) {
            setComplianceBlock({ provider, missing: Array.isArray(data.missing) ? data.missing : [] })
          } else {
            setError(data.error || "Compliance documents are required.")
          }
        } else {
          setError(data.error || "Something went wrong.")
        }
        setLoading(false)
        setPendingId(null)
        return
      }
      setDeclining(null)
      setComplianceBlock(null)
      setReason("")
      setOverrideReason("")
      setLoading(false)
      setPendingId(null)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
      setPendingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Provider Applications</CardTitle>
        <CardDescription>Review and approve or decline provider applications</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

        {providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No pending applications. You're all caught up!</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getInitials(provider.name)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{provider.name || "Unnamed"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{provider.businessName || "-"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{provider.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{provider.phone || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{vehicleSummary(provider)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{provider.serviceArea || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(provider.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" asChild>
                        <Link
                          href={`/admin/compliance?q=${encodeURIComponent(
                            provider.email || provider.name || provider.id,
                          )}`}
                        >
                          Docs
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={loading}
                        onClick={() => review(provider.id, "approve")}
                      >
                        {pendingId === provider.id && !declining ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        disabled={loading}
                        onClick={() => setDeclining(provider)}
                      >
                        <X className="h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!declining} onOpenChange={(open) => !open && !loading && setDeclining(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Application</DialogTitle>
            <DialogDescription>
              Declining {declining?.name || "this applicant"} ({declining?.businessName || "no business name"}). Add a
              reason they didn't meet the criteria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decline-reason">Reason</Label>
            <Input
              id="decline-reason"
              value={reason}
              placeholder="e.g. no valid business registration"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclining(null)} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
              onClick={() => declining && review(declining.id, "decline")}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Decline Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(complianceBlock)}
        onOpenChange={(open) => {
          if (!open && !loading) {
            setComplianceBlock(null)
            setOverrideReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compliance documents required</DialogTitle>
            <DialogDescription>
              {complianceBlock
                ? `${complianceBlock.provider.businessName || complianceBlock.provider.name || "This provider"} does not have all required documents verified.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {complianceBlock && complianceBlock.missing.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Missing or invalid documents</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {complianceBlock.missing.map((type) => (
                  <li key={type}>
                    {DOCUMENT_TYPE_META[type as keyof typeof DOCUMENT_TYPE_META]?.label ?? type}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Review the documents first</p>
            <p className="text-muted-foreground">
              Open the provider&apos;s documents in the compliance queue before using an override. An override
              approves the account, but order acceptance stays blocked until the required documents are verified.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link
                href={`/admin/compliance?q=${encodeURIComponent(
                  complianceBlock?.provider.email || complianceBlock?.provider.id || "",
                )}`}
              >
                Open compliance queue
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-reason">Override reason</Label>
            <Textarea
              id="override-reason"
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Explain why this provider should be approved without complete documents."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setComplianceBlock(null)
                setOverrideReason("")
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={loading || !overrideReason.trim()}
              onClick={() =>
                complianceBlock &&
                review(complianceBlock.provider.id, "approve", overrideReason.trim())
              }
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Approve with override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
