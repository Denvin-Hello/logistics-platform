import assert from "node:assert/strict"
import { test } from "node:test"
import {
  assignmentPhase,
  isOfferActive,
  isProviderEligible,
  isWithinServiceArea,
  offerBatchSize,
  offerExpiry,
  rankProviders,
  requiredCapacityKg,
  vehiclePayloadKg,
  type AssignmentOrder,
  type AssignmentProvider,
} from "../lib/assignment-rules.ts"
import {
  getAssignmentPolicy,
  isAutoAssignmentEnabled,
  type AssignmentPolicy,
} from "../lib/assignment-policy.ts"

const now = new Date("2026-10-26T12:00:00.000Z")
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000)

const policy: AssignmentPolicy = {
  maxActiveJobs: 1,
  radiusKm: 50,
  offerTtlMs: 10 * 60_000,
  escalateAfterMs: 15 * 60_000,
  urgentAfterMs: 30 * 60_000,
  widenRadiusKm: 25,
  offerCount: 3,
  urgentOfferCount: 8,
  maxAttempts: 6,
}

function order(overrides: Partial<AssignmentOrder> = {}): AssignmentOrder {
  return {
    id: "order_1",
    status: "PRICE_AGREED",
    pickupAddress: "Cape Town CBD",
    pickupLat: -33.9249,
    pickupLng: 18.4241,
    chargeableWeightKg: 50,
    weight: 50,
    createdAt: minutesAgo(2),
    assignedProviderId: null,
    assignmentAttempts: 0,
    assignmentEscalatedAt: null,
    assignmentUrgent: false,
    ...overrides,
  }
}

function provider(overrides: Partial<AssignmentProvider> = {}): AssignmentProvider {
  return {
    id: "provider_1",
    status: "APPROVED",
    isAvailable: true,
    vehicleType: "1T van",
    vehicleCapacityKg: 1000,
    serviceArea: "Cape Town",
    serviceAreaLat: null,
    serviceAreaLng: null,
    serviceRadiusKm: 50,
    yearsExperience: 5,
    lastAssignedAt: null,
    activeJobs: 0,
    complianceOk: true,
    hasDeclined: false,
    hasOffer: false,
    ...overrides,
  }
}

test("vehicle payload uses declared capacity then vehicle class", () => {
  assert.equal(vehiclePayloadKg({ vehicleType: "1T van", vehicleCapacityKg: 1200 }), 1200)
  assert.equal(vehiclePayloadKg({ vehicleType: "1T van", vehicleCapacityKg: null }), 1000)
  assert.equal(vehiclePayloadKg({ vehicleType: "TRUCK_4T", vehicleCapacityKg: null }), 4000)
  assert.equal(vehiclePayloadKg({ vehicleType: "unknown", vehicleCapacityKg: null }), 0)
})

test("required capacity uses chargeable weight", () => {
  assert.equal(requiredCapacityKg({ chargeableWeightKg: 120, weight: 80 }), 120)
  assert.equal(requiredCapacityKg({ chargeableWeightKg: null, weight: 80 }), 80)
})

test("eligibility respects capacity, availability, compliance, declines, offers, and load", () => {
  const base = order()
  assert.equal(isProviderEligible(provider(), base, policy), true)
  assert.equal(isProviderEligible(provider({ vehicleCapacityKg: 40 }), base, policy), false)
  assert.equal(isProviderEligible(provider({ isAvailable: false }), base, policy), false)
  assert.equal(isProviderEligible(provider({ complianceOk: false }), base, policy), false)
  assert.equal(isProviderEligible(provider({ hasDeclined: true }), base, policy), false)
  assert.equal(isProviderEligible(provider({ hasOffer: true }), base, policy), false)
  assert.equal(isProviderEligible(provider({ activeJobs: 1 }), base, policy), false)
})

test("service area matching prefers coordinates and falls back to text", () => {
  const base = order()
  const nearby = provider({ serviceAreaLat: -33.9249, serviceAreaLng: 18.4241, serviceArea: null })
  assert.equal(isWithinServiceArea(nearby, base, policy), true)

  const far = provider({ serviceAreaLat: -32.9249, serviceAreaLng: 18.4241, serviceArea: null })
  assert.equal(isWithinServiceArea(far, base, policy), false)
  assert.equal(isWithinServiceArea(far, base, policy, { radiusOverrideKm: 150 }), true)
  assert.equal(isWithinServiceArea(far, base, policy, { ignoreServiceArea: true }), true)

  assert.equal(isWithinServiceArea(provider({ serviceArea: "Cape Town" }), base, policy), true)
  assert.equal(
    isWithinServiceArea(provider({ serviceArea: "Durban" }), order({ pickupAddress: "Durban North" }), policy),
    true,
  )
  assert.equal(isWithinServiceArea(provider({ serviceArea: "Durban" }), base, policy), false)
  assert.equal(isWithinServiceArea(provider({ serviceArea: null }), base, policy), true)
})

test("ranking sorts by distance, active load, fairness, experience, then id", () => {
  const base = order()
  const providers: AssignmentProvider[] = [
    provider({ id: "p_far", serviceAreaLat: -33.8349, serviceAreaLng: 18.4241 }),
    provider({ id: "p_near", serviceAreaLat: -33.9249, serviceAreaLng: 18.4241 }),
    provider({ id: "p_text", serviceAreaLat: null, serviceAreaLng: null, serviceArea: "Cape Town" }),
    provider({ id: "p_busy", serviceAreaLat: -33.9249, serviceAreaLng: 18.4241, activeJobs: 1 }),
  ]

  const ranked = rankProviders(providers, base, policy)
  assert.deepEqual(
    ranked.map((entry) => entry.provider.id),
    ["p_near", "p_far", "p_text"],
  )
})

test("offer expiry and active state are derived from policy", () => {
  const expiresAt = offerExpiry(now, policy)
  assert.equal(expiresAt.getTime(), now.getTime() + 10 * 60_000)
  assert.equal(isOfferActive({ status: "PENDING", expiresAt }, now), true)
  assert.equal(isOfferActive({ status: "PENDING", expiresAt: minutesAgo(1) }, now), false)
  assert.equal(isOfferActive({ status: "EXPIRED", expiresAt }, now), false)
})

test("assignment phase follows retry, escalate, urgent, and terminal states", () => {
  assert.equal(assignmentPhase(order({ createdAt: minutesAgo(5) }), now, policy), "retry")
  assert.equal(assignmentPhase(order({ createdAt: minutesAgo(20) }), now, policy), "escalated")
  assert.equal(assignmentPhase(order({ createdAt: minutesAgo(40) }), now, policy), "urgent")
  assert.equal(assignmentPhase(order({ assignedProviderId: "provider_1" }), now, policy), "none")
  assert.equal(assignmentPhase(order({ status: "CANCELLED" }), now, policy), "none")
  assert.equal(assignmentPhase(order({ assignmentUrgent: true }), now, policy), "urgent")
})

test("offer batch size grows as an order escalates", () => {
  assert.equal(offerBatchSize("retry", policy), 3)
  assert.equal(offerBatchSize("escalated", policy), 5)
  assert.equal(offerBatchSize("urgent", policy), 8)
})

test("assignment policy uses safe defaults and parses overrides", () => {
  const defaults = getAssignmentPolicy({} as unknown as NodeJS.ProcessEnv)
  assert.equal(defaults.maxActiveJobs, 1)
  assert.equal(defaults.radiusKm, 50)
  assert.equal(defaults.offerTtlMs, 10 * 60_000)
  assert.equal(defaults.escalateAfterMs, 15 * 60_000)
  assert.equal(defaults.urgentAfterMs, 30 * 60_000)
  assert.equal(defaults.offerCount, 3)
  assert.equal(defaults.urgentOfferCount, 8)

  const overridden = getAssignmentPolicy({
    ASSIGNMENT_MAX_ACTIVE_JOBS: "3",
    ASSIGNMENT_RADIUS_KM: "80",
    ASSIGNMENT_OFFER_TTL_MIN: "5",
    ASSIGNMENT_OFFER_COUNT: "4",
    ASSIGNMENT_URGENT_OFFER_COUNT: "12",
  } as unknown as NodeJS.ProcessEnv)
  assert.equal(overridden.maxActiveJobs, 3)
  assert.equal(overridden.radiusKm, 80)
  assert.equal(overridden.offerTtlMs, 5 * 60_000)
  assert.equal(overridden.offerCount, 4)
  assert.equal(overridden.urgentOfferCount, 12)
  assert.equal(isAutoAssignmentEnabled({} as unknown as NodeJS.ProcessEnv), false)
  assert.equal(isAutoAssignmentEnabled({ AUTO_ASSIGNMENT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv), true)
})
