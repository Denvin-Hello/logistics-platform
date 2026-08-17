import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { ProviderApplications } from "@/components/admin/provider-applications"
import { prisma } from "@/lib/prisma"
import { Inbox } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminApplicationsPage() {
  const pendingProviders = await prisma.user.findMany({
    where: { role: "PROVIDER", status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, businessName: true, createdAt: true },
  })

  const providers = pendingProviders.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }))

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Provider Applications</h1>
              <p className="text-muted-foreground">Review applications from providers who want to join the platform</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Inbox className="h-4 w-4" />
              {providers.length} pending
            </div>
          </div>

          <ProviderApplications providers={providers} />
        </div>
      </div>
    </div>
  )
}