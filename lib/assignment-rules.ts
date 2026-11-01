import { VEHICLE_CLASSES } from "./freight.ts"
import { haversineDistanceM } from "./geo.ts"
import type { AssignmentPolicy } from "./assignment-policy.ts"

export interface AssignmentOrder {
  id: string
  status: string
  pickupAddress: string
  pickupLat: number | null
  pickupLng: number | null
  chargeableWeightKg: number | null
  weight: number
  createdAt: Date
  assignedProviderId: string | null
  assignmentAttempts: number
  assignmentEscalatedAt: Date | null
  assignmentUrgent: boolean
}

export interface AssignmentProvider {
  id: string
  status: string
  isAvailable: boolean
  vehicleType: string | null
  vehicleCapacityKg: number | null
  serviceArea: string | null
  serviceAreaLat: number | null
  serviceAreaLng: number | null
  serviceRadiusKm: number | null
  yearsExperience: number | null
  lastAssignedAt: Date | null
  activeJobs: number
  complianceOk: boolean
  hasDeclined: boolean
  hasOffer: boolean
}

export interface RankedProvider {
  provider: AssignmentProvider
  distanceM: number | null
}

export type AssignmentPhase = "none" | "retry" | "escalated" | "urgent"

const OPEN_STATUSES = new Set(["PRICE_AGREED", "PENDING"])

function normalize(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function requiredCapacityKg(order: Pick<AssignmentOrder, "chargeableWeightKg" | "weight">): number {
  const value = order.chargeableWeightKg ?? order.weight ?? 0
  return Math.max(0, Number.isFinite(value) ? value : 0)
}

export function vehiclePayloadKg(
  provider: Pick<AssignmentProvider, "vehicleType" | "vehicleCapacityKg">,
): number {
  const declared = provider.vehicleCapacityKg
  if (declared != null && Number.isFinite(declared) && declared > 0) return declared

  const value = normalize(provider.vehicleType)
  if (!value) return 0
  const vehicle = VEHICLE_CLASSES.find(
    (item) => normalize(item.code) === value || normalize(item.label) === value,
  )
  return vehicle?.payloadKg ?? 0
}

export function providerDistanceM(
  provider: Pick<AssignmentProvider, "serviceAreaLat" | "serviceAreaLng">,
  order: Pick<AssignmentOrder, "pickupLat" | "pickupLng">,
): number | null {
  if (
    provider.serviceAreaLat == null ||
    provider.serviceAreaLng == null ||
    order.pickupLat == null ||
    order.pickupLng == null
  ) {
    return null
  }

  return Math.round(
    haversineDistanceM(
      { lat: provider.serviceAreaLat, lng: provider.serviceAreaLng },
      { lat: order.pickupLat, lng: order.pickupLng },
    ),
  )
}

export interface AssignmentOptions {
  radiusOverrideKm?: number
  ignoreServiceArea?: boolean
}

export function isWithinServiceArea(
  provider: Pick<
    AssignmentProvider,
    "serviceArea" | "serviceAreaLat" | "serviceAreaLng" | "serviceRadiusKm"
  >,
  order: Pick<AssignmentOrder, "pickupAddress" | "pickupLat" | "pickupLng">,
  policy: AssignmentPolicy,
  options?: AssignmentOptions,
): boolean {
  if (options?.ignoreServiceArea) return true

  const radiusKm = options?.radiusOverrideKm ?? provider.serviceRadiusKm ?? policy.radiusKm
  const distanceM = providerDistanceM(provider, order)

  if (distanceM != null) {
    return distanceM <= radiusKm * 1000
  }

  const area = normalize(provider.serviceArea)
  if (!area) return true

  const pickup = normalize(order.pickupAddress)
  if (!pickup) return true

  const tokens = area.split(" ").filter((token) => token.length >= 3)
  if (tokens.length === 0) return true
  return tokens.some((token) => pickup.includes(token))
}

export function isProviderEligible(
  provider: AssignmentProvider,
  order: AssignmentOrder,
  policy: AssignmentPolicy,
  options?: AssignmentOptions,
): boolean {
  if (provider.status !== "APPROVED") return false
  if (!provider.isAvailable) return false
  if (!provider.complianceOk) return false
  if (provider.hasDeclined || provider.hasOffer) return false
  if (provider.activeJobs >= policy.maxActiveJobs) return false
  if (vehiclePayloadKg(provider) < requiredCapacityKg(order)) return false
  return isWithinServiceArea(provider, order, policy, options)
}

export function rankProviders(
  providers: AssignmentProvider[],
  order: AssignmentOrder,
  policy: AssignmentPolicy,
  options?: AssignmentOptions,
): RankedProvider[] {
  return providers
    .filter((provider) => isProviderEligible(provider, order, policy, options))
    .map((provider) => ({ provider, distanceM: providerDistanceM(provider, order) }))
    .sort((a, b) => {
      if (a.distanceM != null && b.distanceM == null) return -1
      if (a.distanceM == null && b.distanceM != null) return 1
      if (a.distanceM != null && b.distanceM != null && a.distanceM !== b.distanceM) {
        return a.distanceM - b.distanceM
      }

      if (a.provider.activeJobs !== b.provider.activeJobs) {
        return a.provider.activeJobs - b.provider.activeJobs
      }

      const aLast = a.provider.lastAssignedAt?.getTime() ?? 0
      const bLast = b.provider.lastAssignedAt?.getTime() ?? 0
      if (aLast !== bLast) return aLast - bLast

      const aExperience = a.provider.yearsExperience ?? 0
      const bExperience = b.provider.yearsExperience ?? 0
      if (aExperience !== bExperience) return bExperience - aExperience

      return a.provider.id.localeCompare(b.provider.id)
    })
}

export function assignmentPhase(
  order: Pick<
    AssignmentOrder,
    "status" | "assignedProviderId" | "createdAt" | "assignmentEscalatedAt" | "assignmentUrgent"
  >,
  now: Date,
  policy: AssignmentPolicy,
): AssignmentPhase {
  if (order.assignedProviderId) return "none"
  if (!OPEN_STATUSES.has(order.status)) return "none"
  if (order.assignmentUrgent) return "urgent"

  const ageMs = Math.max(0, now.getTime() - order.createdAt.getTime())
  if (ageMs >= policy.urgentAfterMs) return "urgent"
  if (ageMs >= policy.escalateAfterMs) return "escalated"
  return "retry"
}

export function offerBatchSize(phase: AssignmentPhase, policy: AssignmentPolicy): number {
  if (phase === "urgent") return policy.urgentOfferCount
  if (phase === "escalated") return Math.max(policy.offerCount, 5)
  return policy.offerCount
}

export function offerExpiry(now: Date, policy: AssignmentPolicy): Date {
  return new Date(now.getTime() + policy.offerTtlMs)
}

export function isOfferActive(
  offer: { status: string; expiresAt: Date },
  now: Date,
): boolean {
  return offer.status === "PENDING" && offer.expiresAt.getTime() > now.getTime()
}

export function isOpenOrderStatus(status: string): boolean {
  return OPEN_STATUSES.has(status)
}
