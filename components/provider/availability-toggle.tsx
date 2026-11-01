"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function AvailabilityToggle({ initialValue }: { initialValue: boolean }) {
  const router = useRouter()
  const [available, setAvailable] = useState(initialValue)
  const [busy, setBusy] = useState(false)

  const update = async (next: boolean) => {
    setBusy(true)
    try {
      const res = await fetch("/api/provider/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Could not update availability", description: data.error || "Try again." })
        return
      }
      setAvailable(data.isAvailable)
      toast({
        title: data.isAvailable ? "You are available" : "You are offline",
        description: data.isAvailable
          ? "New delivery offers can be sent to you."
          : "You will not receive new delivery offers.",
      })
      router.refresh()
    } catch {
      toast({ title: "Could not update availability", description: "Try again." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      <div className="space-y-0.5">
        <Label htmlFor="provider-availability" className="text-sm font-medium">
          {available ? "Available for offers" : "Offline"}
        </Label>
        <p className="text-xs text-muted-foreground">
          {available ? "You can receive targeted delivery offers." : "Turn on to receive new offers."}
        </p>
      </div>
      <Switch
        id="provider-availability"
        checked={available}
        disabled={busy}
        onCheckedChange={(checked) => void update(checked)}
        className="ml-auto"
      />
    </div>
  )
}
