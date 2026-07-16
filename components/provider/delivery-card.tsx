import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Package, DollarSign } from "lucide-react"

interface DeliveryCardProps {
  delivery: {
    id: string
    customerName: string
    pickupAddress: string
    deliveryAddress: string
    status: "pending" | "in-transit" | "delivered"
    amount: number
    estimatedTime: string
    packageType: string
  }
  onAccept?: () => void
  onMarkDelivered?: () => void
  onViewDetails: () => void
}

export function DeliveryCard({ delivery, onAccept, onMarkDelivered, onViewDetails }: DeliveryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "in-transit":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">#{delivery.id}</CardTitle>
          <Badge className={getStatusColor(delivery.status)}>{delivery.status.replace("-", " ").toUpperCase()}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Customer: {delivery.customerName}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Pickup</p>
              <p className="text-muted-foreground">{delivery.pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-accent mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Delivery</p>
              <p className="text-muted-foreground">{delivery.deliveryAddress}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>{delivery.packageType}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{delivery.estimatedTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>R{delivery.amount}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {delivery.status === "pending" && onAccept ? (
            <Button size="sm" className="flex-1" onClick={onAccept}>
              Accept Delivery
            </Button>
          ) : null}
          {delivery.status === "in-transit" && onMarkDelivered ? (
            <Button size="sm" className="flex-1" onClick={onMarkDelivered}>
              Mark Delivered
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="flex-1 bg-transparent" onClick={onViewDetails}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
