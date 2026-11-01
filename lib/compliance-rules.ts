export const MS_PER_DAY = 24 * 60 * 60 * 1000
export const REMINDER_THRESHOLDS = [0, 1, 7, 14, 30] as const

export const COMPLIANCE_DOCUMENT_TYPES = [
  "DRIVERS_LICENSE",
  "VEHICLE_REGISTRATION",
  "VEHICLE_INSURANCE",
  "ROADWORTHY_CERTIFICATE",
  "OPERATING_LICENSE",
  "GOODS_IN_TRANSIT_INSURANCE",
] as const

export type ComplianceDocumentType = (typeof COMPLIANCE_DOCUMENT_TYPES)[number]
export type CompliancePurpose = "APPROVAL" | "ACCEPT_ORDER"

export interface DocumentTypeMeta {
  label: string
  description: string
  requiresVehicle: boolean
  requiredForApproval: boolean
  requiredForOrders: boolean
}

export const DOCUMENT_TYPE_META: Record<ComplianceDocumentType, DocumentTypeMeta> = {
  DRIVERS_LICENSE: {
    label: "Driver's licence",
    description: "Valid South African driving licence for the vehicle class used.",
    requiresVehicle: false,
    requiredForApproval: true,
    requiredForOrders: true,
  },
  VEHICLE_REGISTRATION: {
    label: "Vehicle registration",
    description: "Registration certificate showing the vehicle registration number.",
    requiresVehicle: true,
    requiredForApproval: true,
    requiredForOrders: true,
  },
  VEHICLE_INSURANCE: {
    label: "Vehicle insurance",
    description: "Current insurance cover for the delivery vehicle.",
    requiresVehicle: true,
    requiredForApproval: true,
    requiredForOrders: true,
  },
  ROADWORTHY_CERTIFICATE: {
    label: "Roadworthy certificate",
    description: "Current roadworthy certificate for the delivery vehicle.",
    requiresVehicle: true,
    requiredForApproval: true,
    requiredForOrders: true,
  },
  OPERATING_LICENSE: {
    label: "Operating licence",
    description: "Goods transport operating licence or exemption where required.",
    requiresVehicle: false,
    requiredForApproval: true,
    requiredForOrders: true,
  },
  GOODS_IN_TRANSIT_INSURANCE: {
    label: "Goods-in-transit insurance",
    description: "Optional cover for customer goods while in transit.",
    requiresVehicle: false,
    requiredForApproval: false,
    requiredForOrders: false,
  },
}

export const REQUIRED_DOCUMENT_TYPES = COMPLIANCE_DOCUMENT_TYPES.filter(
  (type) => DOCUMENT_TYPE_META[type].requiredForApproval,
)

export function requiredDocumentTypes(purpose: CompliancePurpose): ComplianceDocumentType[] {
  return COMPLIANCE_DOCUMENT_TYPES.filter((type) =>
    purpose === "APPROVAL"
      ? DOCUMENT_TYPE_META[type].requiredForApproval
      : DOCUMENT_TYPE_META[type].requiredForOrders,
  )
}

export function daysUntil(value: Date | string, now: Date = new Date()): number {
  const target = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(target.getTime())) return 0
  return Math.ceil((target.getTime() - now.getTime()) / MS_PER_DAY)
}

export type EffectiveDocumentStatus = "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED"

export function effectiveDocumentStatus(
  document: { status: string; expiresAt: Date | string },
  now: Date = new Date(),
): EffectiveDocumentStatus {
  if (document.status === "REJECTED") return "REJECTED"
  if (document.status === "PENDING") return "PENDING"
  if (document.status === "EXPIRED") return "EXPIRED"
  return daysUntil(document.expiresAt, now) <= 0 ? "EXPIRED" : "VERIFIED"
}

export function isDocumentValid(
  document: { status: string; expiresAt: Date | string },
  now: Date = new Date(),
): boolean {
  return effectiveDocumentStatus(document, now) === "VERIFIED"
}

export function missingDocumentRequirements(
  documents: Array<{ type: string; status: string; expiresAt: Date | string }>,
  purpose: CompliancePurpose,
  now: Date = new Date(),
): ComplianceDocumentType[] {
  const validTypes = new Set(
    documents.filter((document) => isDocumentValid(document, now)).map((document) => document.type),
  )
  return requiredDocumentTypes(purpose).filter((type) => !validTypes.has(type))
}

export function nextReminderThreshold(days: number, sentThresholds: number[]): number | null {
  const sent = new Set(sentThresholds)
  for (const threshold of REMINDER_THRESHOLDS) {
    if (threshold >= days && !sent.has(threshold)) return threshold
  }
  return null
}
