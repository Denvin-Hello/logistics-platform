import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { StatsCards } from "@/components/admin/stats-cards"
import { OrdersTable } from "@/components/admin/orders-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, Settings, Download, AlertTriangle, CheckCircle, Clock } from "lucide-react"

// Mock data
const mockStats = {
  totalOrders: 1247,
  totalCustomers: 892,
  totalProviders: 156,
  totalRevenue: 234567,
  ordersChange: 12.5,
  customersChange: 8.3,
  providersChange: 5.7,
  revenueChange: 15.2,
}

const mockOrders = [
  {
    id: "ORD001",
    customer: "John Smith",
    provider: "FastTrack Logistics",
    pickup: "Cape Town CBD",
    delivery: "Stellenbosch",
    status: "in-transit",
    amount: 180,
    date: "2025-01-26",
  },
  {
    id: "ORD002",
    customer: "Sarah Johnson",
    provider: "Quick Delivery Co",
    pickup: "Durban North",
    delivery: "Pietermaritzburg",
    status: "delivered",
    amount: 220,
    date: "2025-01-25",
  },
  {
    id: "ORD003",
    customer: "Mike Wilson",
    provider: "Express Couriers",
    pickup: "Johannesburg",
    delivery: "Pretoria",
    status: "pending",
    amount: 150,
    date: "2025-01-26",
  },
  {
    id: "ORD004",
    customer: "Lisa Brown",
    provider: "City Logistics",
    pickup: "Port Elizabeth",
    delivery: "East London",
    status: "in-transit",
    amount: 195,
    date: "2025-01-26",
  },
  {
    id: "ORD005",
    customer: "David Lee",
    provider: "Metro Delivery",
    pickup: "Bloemfontein",
    delivery: "Kimberley",
    status: "delivered",
    amount: 175,
    date: "2025-01-24",
  },
]

const mockAlerts = [
  {
    id: "1",
    type: "warning",
    title: "High Volume Alert",
    message: "Order volume is 25% higher than usual today",
    time: "2 hours ago",
  },
  {
    id: "2",
    type: "error",
    title: "Payment Issue",
    message: "3 payments failed in the last hour",
    time: "1 hour ago",
  },
  {
    id: "3",
    type: "success",
    title: "New Provider Approved",
    message: "Lightning Logistics has been approved and activated",
    time: "30 minutes ago",
  },
]

export default function AdminDashboard() {
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Monitor and manage your logistics platform</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mb-8">
            <StatsCards stats={mockStats} />
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  Add New Provider
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  Generate Report
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  Send Notifications
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  System Maintenance
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Platform health overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Status</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Payment Gateway</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">SMS Service</span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-600">Degraded</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Service</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>System notifications and warnings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    {alert.type === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                    {alert.type === "error" && <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />}
                    {alert.type === "success" && <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <OrdersTable orders={mockOrders} />
        </div>
      </div>
    </div>
  )
}
