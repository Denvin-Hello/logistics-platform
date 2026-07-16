import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Users, Truck, DollarSign, TrendingUp, TrendingDown } from "lucide-react"

interface StatsCardsProps {
  stats: {
    totalOrders: number
    totalCustomers: number
    totalProviders: number
    totalRevenue: number
    ordersChange: number
    customersChange: number
    providersChange: number
    revenueChange: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Orders",
      value: stats.totalOrders.toLocaleString(),
      change: stats.ordersChange,
      icon: Package,
    },
    {
      title: "Active Customers",
      value: stats.totalCustomers.toLocaleString(),
      change: stats.customersChange,
      icon: Users,
    },
    {
      title: "Delivery Providers",
      value: stats.totalProviders.toLocaleString(),
      change: stats.providersChange,
      icon: Truck,
    },
    {
      title: "Total Revenue",
      value: `R${stats.totalRevenue.toLocaleString()}`,
      change: stats.revenueChange,
      icon: DollarSign,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {card.change > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={card.change > 0 ? "text-green-600" : "text-red-600"}>{Math.abs(card.change)}%</span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
