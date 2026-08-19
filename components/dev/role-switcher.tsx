"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, ShieldCheck } from "lucide-react"

const ROLES = [
  { role: "ADMIN", label: "Admin" },
  { role: "PROVIDER", label: "Provider" },
  { role: "PROVIDER_PENDING", label: "Provider (pending)" },
  { role: "CUSTOMER", label: "Customer" },
]

export function DevRoleSwitcher() {
  const [busy, setBusy] = useState<string | null>(null)

  const switchRole = async (role: string) => {
    setBusy(role)
    try {
      const res = await fetch("/api/dev/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error("Role switch failed:", data.error || res.status)
        return
      }
      window.location.assign(data.redirect || "/")
    } catch (err) {
      console.error("Role switch failed:", err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed bottom-3 left-1/2 z-[9999] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-dashed border-amber-400 bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
        <ShieldCheck className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-medium text-muted-foreground">DEV ROLE SWITCHER</span>
        {ROLES.map(({ role, label }) => (
          <Button
            key={role}
            size="sm"
            variant={busy === role ? "secondary" : "outline"}
            disabled={!!busy}
            onClick={() => void switchRole(role)}
          >
            {busy === role ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}