import { prisma } from "@/lib/prisma"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LifeBuoy } from "lucide-react"
import { SupportTicketActions } from "@/components/admin/support-ticket-actions"

export const dynamic = "force-dynamic"

const getStatusColor = (status: string) => {
  switch (status) {
    case "OPEN":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    case "RESOLVED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }
}

export default async function AdminSupportPage() {
  const tickets = await prisma.supportTicket.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  const openCount = tickets.filter((t) => t.status === "OPEN").length

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Support Tickets</h1>
            <p className="text-muted-foreground">Customer support requests and inquiries</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tickets.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Open</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{openCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {tickets.filter((t) => t.status === "RESOLVED").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {tickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <LifeBuoy className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No support tickets yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                        <CardDescription>
                          From: {ticket.user?.name || "Guest"} ({ticket.user?.email || "—"})
                          {ticket.orderId ? ` · Order: ${ticket.orderId}` : ""}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {ticket.createdAt.toLocaleString()}
                        </span>
                        <SupportTicketActions ticketId={ticket.id} status={ticket.status} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}