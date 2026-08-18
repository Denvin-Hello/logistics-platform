import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { SUPPORT_EMAIL } from "@/lib/company"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, XCircle, CheckCircle } from "lucide-react"

export default async function ApplicationStatusPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth")
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin")
  }

  if (session.user.role === "CUSTOMER" || session.user.status === "APPROVED") {
    redirect(session.user.role === "CUSTOMER" ? "/customer" : "/provider")
  }

  const declined = session.user.status === "DECLINED"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            {declined ? (
              <XCircle className="h-12 w-12 text-red-500" />
            ) : (
              <Clock className="h-12 w-12 text-accent" />
            )}
          </div>
          <CardTitle className="text-2xl text-center">
            {declined ? "Application Declined" : "Application Under Review"}
          </CardTitle>
          <CardDescription className="text-center">
            {declined
              ? "Your provider application did not meet our criteria."
              : "We're reviewing your provider application. You'll be able to access the provider dashboard once it's approved."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {declined ? (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
              If you have any questions, contact our support team at {SUPPORT_EMAIL}.
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Check back later for a status update.
            </div>
          )}
          <Button asChild className="w-full">
            <Link href="/auth">Go to Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
