"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { AlertTriangle, Loader2 } from "lucide-react"

export function OrderDeliveryOverride({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (reason.trim().length < 5) {
      toast({
        title: "Reason required",
        description: "Explain why GPS arrival verification is being bypassed.",
        variant: "destructive",
      })
      return
    }

    setBusy(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/override-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "Override failed", description: data.error || "Try again.", variant: "destructive" })
        return
      }

      toast({
        title: "Delivery completed",
        description: `${orderNumber} was completed with a dispatch override.`,
      })
      setOpen(false)
      setReason("")
      router.refresh()
    } catch {
      toast({ title: "Override failed", description: "Check your connection and try again.", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Force complete delivery
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete {orderNumber} without GPS?</DialogTitle>
          <DialogDescription>
            Use this only when the provider cannot verify arrival because GPS or destination coordinates are
            unavailable. The override is recorded against your admin account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label htmlFor="override-reason" className="text-sm font-medium">
            Reason
          </label>
          <Textarea
            id="override-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Driver phoned dispatch from the delivery address; device GPS failed."
            maxLength={500}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">{reason.trim().length}/500 · minimum 5 characters</p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" disabled={busy} onClick={() => void submit()}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Complete delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
