import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PackageSearch } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto bg-accent/10 rounded-full p-4 w-fit mb-6">
          <PackageSearch className="h-12 w-12 text-accent" />
        </div>
        <h1 className="text-4xl font-bold mb-3">404 — Page not found</h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/tracking">Track a Package</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}