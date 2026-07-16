export interface Delivery {
  id: string
  customerName: string
  pickupAddress: string
  deliveryAddress: string
  status: "pending" | "in-transit" | "delivered"
  amount: number
  estimatedTime: string
  estimatedMinutes: number
  packageType: string
}

export const initialDeliveries: Delivery[] = [
  {
    id: "DEL001",
    customerName: "John Smith",
    pickupAddress: "123 Main St, Cape Town",
    deliveryAddress: "456 Oak Ave, Stellenbosch",
    status: "pending",
    amount: 150,
    estimatedTime: "2h 30m",
    estimatedMinutes: 150,
    packageType: "Documents",
  },
  {
    id: "DEL002",
    customerName: "Sarah Johnson",
    pickupAddress: "789 Pine Rd, Durban",
    deliveryAddress: "321 Elm St, Pietermaritzburg",
    status: "in-transit",
    amount: 280,
    estimatedTime: "1h 45m",
    estimatedMinutes: 105,
    packageType: "Electronics",
  },
  {
    id: "DEL003",
    customerName: "Mike Wilson",
    pickupAddress: "555 Cedar Ln, Johannesburg",
    deliveryAddress: "777 Birch Dr, Pretoria",
    status: "delivered",
    amount: 200,
    estimatedTime: "Completed",
    estimatedMinutes: 0,
    packageType: "Clothing",
  },
]

export function formatAverageTime(minutes: number) {
  if (minutes <= 0) return "—"
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours}h ${remainder}m`
}

export const routeNotes = [
  "Group nearby pickups together to reduce distance.",
  "Use the fastest corridor for in-transit orders.",
  "Flag high-priority packages for earliest delivery.",
]
