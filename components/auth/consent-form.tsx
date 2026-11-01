"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

export function ConsentForm({ home }: { home: string }) {
  const router = useRouter()
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!accepted) {
      toast({
        title: "Agreement required",
        description: "Accept the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept: true }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        toast({
          title: "Unable to save your consent",
          description: data.error || "Try again.",
          variant: "destructive",
        })
        return
      }

      router.replace(home)
      router.refresh()
    } catch {
      toast({ title: "Unable to save your consent", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3">
        <Checkbox
          id="consent-terms"
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(checked === true)}
          className="mt-1"
        />
        <Label htmlFor="consent-terms" className="text-sm font-normal leading-6">
          I agree to the{" "}
          <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          , including how my information is used to provide delivery and tracking services.
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={submitting || !accepted}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Agree and continue
      </Button>
    </form>
  )
}
