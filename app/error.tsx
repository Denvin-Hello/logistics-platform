"use client"

import { Button } from "@/components/ui/button"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-3">Something went wrong</h1>
        <p className="text-muted-foreground mb-2">
          An unexpected error occurred while loading this page.
        </p>
        {error.digest ? <p className="text-xs text-muted-foreground mb-8">Error ID: {error.digest}</p> : null}
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  )
}