import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import type React from "react"
import { authOptions } from "@/lib/auth"
import { hasCurrentConsent } from "@/lib/consent"

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "PROVIDER") {
    redirect("/auth")
  }

  if (!(await hasCurrentConsent(session.user.id))) {
    redirect("/consent")
  }

  if (session.user.status !== "APPROVED") {
    redirect("/application-status")
  }

  return children
}
