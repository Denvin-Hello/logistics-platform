"use client"

import { useState } from "react"
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
import { Check, X, Clock, Loader2 } from "lucide-react"

interface PendingProvider {
  id: string
  name: string | null
  email: string | null
  businessName: string | null
  createdAt: string
}

export function ProviderApplications({ providers }: { providers: PendingProvider[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [declining, setDeclining] = useState<PendingProvider | null>(null)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const getInitials = (name: string | null) =>
    (name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  const review = async (userId: string, action: "approve" | "decline") => {
    setLoading(true)
    setError(null)
    setPendingId(userId)
    try {
      const res = await fetch("/api/admin/providers/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason: action === "decline" ? reason : undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong.")
        setLoading(false)
        setPendingId(null)
        return
      }
      setDeclining(null)
      setReason("")
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
                <TableHead>Email</TableHead>
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
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(provider.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
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
    </Card>
  )
}
