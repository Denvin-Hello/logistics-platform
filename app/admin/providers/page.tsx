import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { prisma } from "@/lib/prisma"
import { Truck } from "lucide-react"

export const dynamic = "force-dynamic"

const getStatusColor = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case "DECLINED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }
}

export default async function AdminProvidersPage() {
  const providers = await prisma.user.findMany({
    where: { role: "PROVIDER" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      businessName: true,
      status: true,
      declinedReason: true,
      createdAt: true,
    },
  })

  const stats = {
    total: providers.length,
    approved: providers.filter((p) => p.status === "APPROVED").length,
    pending: providers.filter((p) => p.status === "PENDING").length,
    declined: providers.filter((p) => p.status === "DECLINED").length,
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Provider Management</h1>
              <p className="text-muted-foreground">Manage and review delivery providers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Declined</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Providers</CardTitle>
              <CardDescription>Registered delivery providers and their application status</CardDescription>
            </CardHeader>
            <CardContent>
              {providers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Truck className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No providers registered yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {(provider.name || "?")
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{provider.name || "Unnamed"}</div>
                              <div className="text-xs text-muted-foreground">{provider.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{provider.businessName || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{provider.email}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(provider.status)}>{provider.status}</Badge>
                          {provider.status === "DECLINED" && provider.declinedReason ? (
                            <div className="mt-1 text-xs text-muted-foreground">{provider.declinedReason}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {provider.createdAt.toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}