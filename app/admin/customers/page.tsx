import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { UsersTable } from "@/components/admin/users-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Filter } from "lucide-react"

// Mock customer data
const mockCustomers = [
  {
    id: "CUST001",
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+27 82 123 4567",
    type: "customer" as const,
    status: "active" as const,
    joinDate: "2024-01-15",
    totalOrders: 12,
  },
  {
    id: "CUST002",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+27 83 234 5678",
    type: "customer" as const,
    status: "active" as const,
    joinDate: "2024-02-20",
    totalOrders: 8,
  },
  {
    id: "CUST003",
    name: "Mike Wilson",
    email: "mike.wilson@email.com",
    phone: "+27 84 345 6789",
    type: "customer" as const,
    status: "inactive" as const,
    joinDate: "2024-03-10",
    totalOrders: 3,
  },
  {
    id: "CUST004",
    name: "Lisa Brown",
    email: "lisa.brown@email.com",
    phone: "+27 85 456 7890",
    type: "customer" as const,
    status: "active" as const,
    joinDate: "2024-01-05",
    totalOrders: 25,
  },
  {
    id: "CUST005",
    name: "David Lee",
    email: "david.lee@email.com",
    phone: "+27 86 567 8901",
    type: "customer" as const,
    status: "suspended" as const,
    joinDate: "2023-12-20",
    totalOrders: 15,
  },
]

export default function AdminCustomersPage() {
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Customer Management</h1>
              <p className="text-muted-foreground">Manage and monitor customer accounts</p>
            </div>
            <div className="flex items-center gap-4">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Search & Filters</CardTitle>
              <CardDescription>Find and filter customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search customers by name, email, or ID..." className="pl-10" />
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">892</div>
                <p className="text-xs text-muted-foreground">+8.3% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">756</div>
                <p className="text-xs text-muted-foreground">84.7% of total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">67</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Orders/Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">14.2</div>
                <p className="text-xs text-muted-foreground">+2.1 from last month</p>
              </CardContent>
            </Card>
          </div>

          {/* Customers Table */}
          <UsersTable users={mockCustomers} title="All Customers" description="Complete list of registered customers" />
        </div>
      </div>
    </div>
  )
}
