import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye } from "lucide-react"
import Link from "next/link"
import { orderStatusColor, orderStatusLabel } from "@/lib/order-status"

interface Order {
  id: string
  orderNumber: string
  customer: string
  provider: string
  pickup: string
  delivery: string
  status: string
  amount: number
  date: string
}

interface OrdersTableProps {
  orders: Order[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>Manage and monitor all delivery orders</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>{order.provider}</TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="truncate">
                    <span className="text-sm">{order.pickup}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="text-sm">{order.delivery}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={orderStatusColor(order.status)}>{orderStatusLabel(order.status)}</Badge>
                </TableCell>
                <TableCell>R{order.amount}</TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell className="w-[60px]">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/orders/${order.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
