// Single source of truth for order lifecycle values, labels and colours.
// `status` is a plain string column, so all comparisons must go through here
// to avoid silent typos breaking filters, tracking and provider visibility.

export const ORDER_STATUS = {
  // Price locked (base or customer-proposed). Open to providers.
  PRICE_AGREED: "PRICE_AGREED",
  // Provider accepted, not yet picked up.
  ASSIGNED: "ASSIGNED",
  // Provider is en route / carrying the package.
  IN_TRANSIT: "IN_TRANSIT",
  // Handed over but not yet paid for (pay-at-end, online or COD).
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  // Settled.
  PAID: "PAID",
  // Historical terminal value kept readable.
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

// Legacy values that may still exist in older rows.
const LEGACY_PENDING = "PENDING"

const LABELS: Record<string, string> = {
  [ORDER_STATUS.PRICE_AGREED]: "Price agreed",
  [LEGACY_PENDING]: "Price agreed",
  [ORDER_STATUS.ASSIGNED]: "Provider assigned",
  [ORDER_STATUS.IN_TRANSIT]: "In transit",
  [ORDER_STATUS.AWAITING_PAYMENT]: "Awaiting payment",
  [ORDER_STATUS.PAID]: "Paid",
  [ORDER_STATUS.DELIVERED]: "Delivered",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
}

export function orderStatusLabel(status: string): string {
  return LABELS[status] ?? status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export function orderStatusColor(status: string): string {
  switch (status) {
    case ORDER_STATUS.PRICE_AGREED:
    case LEGACY_PENDING:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case ORDER_STATUS.ASSIGNED:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
    case ORDER_STATUS.IN_TRANSIT:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    case ORDER_STATUS.AWAITING_PAYMENT:
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
    case ORDER_STATUS.PAID:
    case ORDER_STATUS.DELIVERED:
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    case ORDER_STATUS.CANCELLED:
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }
}

// Orders a provider can still claim.
export function isOpenToProviders(status: string): boolean {
  return status === ORDER_STATUS.PRICE_AGREED || status === LEGACY_PENDING
}

// Orders that belong to an active delivery (tracking/GPS allowed).
export function isActiveDelivery(status: string): boolean {
  return status === ORDER_STATUS.ASSIGNED || status === ORDER_STATUS.IN_TRANSIT
}

// Statuses that owe money after hand-over.
export function isAwaitingPayment(status: string): boolean {
  return status === ORDER_STATUS.AWAITING_PAYMENT
}

export const OPEN_ORDER_STATUSES = [ORDER_STATUS.PRICE_AGREED, LEGACY_PENDING] as const
