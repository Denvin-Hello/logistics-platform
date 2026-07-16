import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import type React from "react"
import { authOptions } from "@/lib/auth"

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "PROVIDER") {
    redirect("/auth")
  }

  return children
}
