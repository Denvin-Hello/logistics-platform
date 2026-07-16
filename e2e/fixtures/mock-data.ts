export const sampleOrderDetails = {
  customerName: "John Doe",
  customerEmail: "john@example.com",
  pickupAddress: "123 Main St, Cape Town",
  pickupPhone: "+27 82 123 4567",
  pickupDate: "2026-07-20",
  pickupTime: "morning",
  deliveryAddress: "456 Oak Ave, Stellenbosch",
  deliveryName: "Jane Doe",
  deliveryPhone: "+27 83 234 5678",
  deliveryInstructions: "Leave at front door",
  packageType: "electronics",
  weight: "2.5",
  length: "30",
  width: "20",
  height: "15",
  packageDescription: "Laptop computer",
  fragile: true,
  insurance: true,
  signature: true,
}

export const expectedAmountBreakdown = {
  baseFee: 120,
  weightFee: Math.max(0, 2.5 - 1) * 15,
  volumeSurcharge: 20,
  fragileFee: 30,
  insuranceFee: 25,
  signatureFee: 10,
}

export const trackingNumbers = {
  inTransit: "ORD001",
  delivered: "ORD002",
  pending: "ORD003",
  invalid: "INVALID123",
}

export const customerStats = {
  activeOrders: "3",
  totalSpent: "R2,340",
  deliveries: "28",
  avgDeliveryTime: "2h 45m",
}

export const providerStats = {
  activeDeliveries: "2",
  todaysEarnings: "R480",
  avgDeliveryTime: "2h 8m",
  rating: "4.8",
}

export const adminStats = {
  totalOrders: "1,247",
  totalCustomers: "892",
  totalProviders: "156",
  totalRevenue: "R234,567",
}
