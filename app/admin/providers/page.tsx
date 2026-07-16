import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { UsersTable } from "@/components/admin/users-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Filter } from "lucide-react"

// Mock provider data
const mockProviders = [
  {
    id: "PROV001",
    name: "Alex Driver",
    email: "alex.driver@email.com",
    phone: "+27 82 111 2222",
    type: "provider" as const,
    status: "active" as const,
    joinDate: "2024-01-10",
    rating: 4.8,
  },
  {
    id: "PROV002",
    name: "Maria Santos",
    email: "maria.santos@email.com",
    phone: "+27 83 222 3333",
    type: "provider" as const,
    status: "active" as const,
    joinDate: "2024-02-15",
    rating: 4.9,
  },
  {
    id: "PROV003",
    name: "James Thompson",
    email: "james.t@email.com",
    phone: "+27 84 333 4444",
    type: "provider" as const,
    status: "inactive" as const,
    joinDate: "2024-03-05",
    rating: 4.2,
  },
  {
    id: "PROV004",
    name: "Linda Chen",
    email: "linda.chen@email.com",
    phone: "+27 85 444 5555",
    type: "provider" as const,
    status: "active" as const,
    joinDate: "2023-12-20",
    rating: 4.7,
  },
  {
    id: "PROV005",
    name: "Robert Taylor",
    email: "robert.taylor@email.com",
    phone: "+27 86 555 6666",
    type: "provider" as const,
    status: "suspended" as const,
    joinDate: "2024-01-25",
    rating: 3.8,
  },
]

export default function AdminProvidersPage() {
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Provider Management</h1>
              <p className="text-muted-foreground">Manage and monitor delivery providers</p>
            </div>
            <div className="flex items-center gap-4">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Search & Filters</CardTitle>
              <CardDescription>Find and filter delivery providers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search providers by name, email, or ID..." className="pl-10" />
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Provider Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-muted-foreground">+5.7% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">142</div>
                <p className="text-xs text-muted-foreground">91.0% of total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.6</div>
                <p className="text-xs text-muted-foreground">⭐ out of 5.0</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>
          </div>

          {/* Providers Table */}
          <UsersTable
            users={mockProviders}
            title="All Providers"
            description="Complete list of registered delivery providers"
          />
        </div>
      </div>
    </div>
  )
}
