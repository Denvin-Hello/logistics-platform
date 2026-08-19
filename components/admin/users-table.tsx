import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mail, Phone } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  phone: string
  type: "customer" | "provider"
  status: "active" | "inactive" | "suspended"
  joinDate: string
  totalOrders?: number
  rating?: number
}

interface UsersTableProps {
  users: User[]
  title: string
  description: string
}

export function UsersTable({ users, title, description }: UsersTableProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "suspended":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Orders/Rating</TableHead>
              <TableHead>Join Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">ID: {user.id}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3" />
                      {user.phone}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.type.charAt(0).toUpperCase() + user.type.slice(1)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(user.status)}>{user.status.toUpperCase()}</Badge>
                </TableCell>
                <TableCell>
                  {user.type === "customer" && user.totalOrders !== undefined ? (
                    <span>{user.totalOrders} orders</span>
                  ) : user.type === "provider" && user.rating !== undefined ? (
                    <span>⭐ {user.rating}/5</span>
                  ) : (
                    <span>-</span>
                  )}
                </TableCell>
                <TableCell>{user.joinDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
