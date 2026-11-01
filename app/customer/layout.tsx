import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import type React from "react"
import { authOptions } from "@/lib/auth"
import { hasCurrentConsent } from "@/lib/consent"

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "CUSTOMER") {
    redirect("/auth")
  }

  if (!(await hasCurrentConsent(session.user.id))) {
    redirect("/consent")
  }

  return children
}
