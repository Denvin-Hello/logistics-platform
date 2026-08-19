"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, PlayCircle, RotateCcw } from "lucide-react"

export function SupportTicketActions({ ticketId, status }: { ticketId: string; status: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function update(next: "OPEN" | "IN_PROGRESS" | "RESOLVED") {
    setError(null)
    const res = await fetch(`/api/admin/support/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Failed to update ticket.")
      return
    }

    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {status === "OPEN" ? (
        <Button size="sm" variant="outline" onClick={() => update("IN_PROGRESS")}>
          <PlayCircle className="h-4 w-4 mr-2" />
          Start Progress
        </Button>
      ) : null}
      {status === "IN_PROGRESS" ? (
        <Button size="sm" onClick={() => update("RESOLVED")}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Mark Resolved
        </Button>
      ) : null}
      {status === "RESOLVED" ? (
        <Button size="sm" variant="outline" onClick={() => update("OPEN")}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reopen
        </Button>
      ) : null}
      {isPending ? <span className="text-xs text-muted-foreground">Updating...</span> : null}
      {error ? <span className="text-xs text-red-500">{error}</span> : null}
    </div>
  )
}