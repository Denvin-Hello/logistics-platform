import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SUPPORT_EMAIL } from "@/lib/company"
import { CheckCircle, Circle, MapPin, Package, Truck, User, Clock } from "lucide-react"

interface TrackingEvent {
  id: string
  status: string
  description: string
  location: string
  timestamp: string
  completed: boolean
}

interface TrackingTimelineProps {
  trackingNumber: string
  events: TrackingEvent[]
  currentStatus: string
  estimatedDelivery?: string
}

export function TrackingTimeline({ trackingNumber, events, currentStatus, estimatedDelivery }: TrackingTimelineProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "picked up":
      case "in transit":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "out for delivery":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "picked up":
        return <Package className="h-4 w-4" />
      case "in transit":
        return <Truck className="h-4 w-4" />
      case "out for delivery":
        return <MapPin className="h-4 w-4" />
      case "delivered":
        return <User className="h-4 w-4" />
      default:
        return <Circle className="h-4 w-4" />
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                Tracking #{trackingNumber}
              </CardTitle>
              <CardDescription>Real-time delivery updates</CardDescription>
            </div>
            <Badge className={getStatusColor(currentStatus)}>
              {getStatusIcon(currentStatus)}
              <span className="ml-2">{currentStatus.toUpperCase()}</span>
            </Badge>
          </div>
        </CardHeader>
        {estimatedDelivery && (
          <CardContent>
            <div className="bg-accent/10 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span className="font-medium">Estimated Delivery:</span>
                <span>{estimatedDelivery}</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Timeline</CardTitle>
          <CardDescription>Track your package journey from pickup to delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {events.map((event, index) => (
                <div key={event.id} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                      event.completed
                        ? "bg-accent border-accent text-accent-foreground"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    {event.completed ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0 pb-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-medium ${event.completed ? "text-foreground" : "text-muted-foreground"}`}>
                        {event.status}
                      </h3>
                      <time className="text-sm text-muted-foreground">{event.timestamp}</time>
                    </div>
                    <p className={`text-sm ${event.completed ? "text-foreground" : "text-muted-foreground"}`}>
                      {event.description}
                    </p>
                    {event.location && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Pickup Location:</span>
              <p className="text-muted-foreground">123 Main Street, Cape Town</p>
            </div>
            <div>
              <span className="font-medium">Delivery Location:</span>
              <p className="text-muted-foreground">456 Oak Avenue, Stellenbosch</p>
            </div>
            <div>
              <span className="font-medium">Package Type:</span>
              <p className="text-muted-foreground">Documents</p>
            </div>
            <div>
              <span className="font-medium">Delivery Provider:</span>
              <p className="text-muted-foreground">FastTrack Logistics</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Need Help?</h4>
            <p className="text-sm text-muted-foreground mb-2">
              If you have any questions about your delivery, contact us at:
            </p>
            <div className="text-sm space-y-1">
              <p>📧 Email: {SUPPORT_EMAIL}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
