import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { AuthForm } from "@/components/auth/auth-form"

export default async function AuthPage() {
  const session = await getServerSession(authOptions)

  if (session?.user) {
    if (session.user.role === "ADMIN") {
      redirect("/admin")
    }
    if (session.user.role === "PROVIDER") {
      redirect(session.user.status === "APPROVED" ? "/provider" : "/application-status")
    }
    redirect("/customer")
  }

  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  const githubEnabled = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET)

  return <AuthForm googleEnabled={googleEnabled} githubEnabled={githubEnabled} />
}