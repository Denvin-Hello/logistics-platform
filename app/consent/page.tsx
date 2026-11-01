import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { hasCurrentConsent } from "@/lib/consent"
import { ConsentForm } from "@/components/auth/consent-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function ConsentPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/auth")
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin")
  }

  const accepted = await hasCurrentConsent(session.user.id)
  const home =
    session.user.role === "PROVIDER"
      ? session.user.status === "APPROVED"
        ? "/provider"
        : "/application-status"
      : "/customer"

  if (accepted) {
    redirect(home)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-4">
      <Card className="w-full max-w-lg border-0 shadow-2xl">
        <CardHeader className="space-y-2">
          <div className="flex justify-center pb-2">
            <div className="rounded-full bg-accent p-3">
              <ShieldCheck className="h-8 w-8 text-accent-foreground" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Before you continue</CardTitle>
          <CardDescription className="text-center">
            Please review and accept our terms and privacy policy so we can keep your account and deliveries
            protected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConsentForm home={home} />
        </CardContent>
      </Card>
    </div>
  )
}
