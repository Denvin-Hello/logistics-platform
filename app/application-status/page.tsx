import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { SUPPORT_EMAIL } from "@/lib/company"
import { DOCUMENT_TYPE_META, getProviderCompliance } from "@/lib/compliance"
import { hasCurrentConsent } from "@/lib/consent"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, XCircle, CheckCircle, FileWarning } from "lucide-react"

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

  if (!(await hasCurrentConsent(session.user.id))) {
    redirect("/consent")
  }

  const declined = session.user.status === "DECLINED"
  const compliance = declined
    ? null
    : await getProviderCompliance(session.user.id, "APPROVAL")
  const missingDocuments = compliance?.missing ?? []

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-4">
      <Card className="w-full max-w-lg border-0 shadow-2xl">
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
            <>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Check back later for a status update.
              </div>

              {compliance ? (
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileWarning className="h-4 w-4 text-amber-600" />
                    Compliance documents
                  </div>
                  {missingDocuments.length > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Still needed:{" "}
                        {missingDocuments
                          .map((type) => DOCUMENT_TYPE_META[type].label)
                          .join(", ")}
                        .
                      </p>
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/onboarding/compliance">Upload missing documents</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        All required documents are uploaded. We&apos;ll verify them with your application.
                      </p>
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/onboarding/compliance">Review documents</Link>
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
            </>
          )}
          <Button asChild className="w-full">
            <Link href="/auth">Go to Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
