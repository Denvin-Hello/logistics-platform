import assert from "node:assert/strict"
import { test } from "node:test"
import {
  calculateDeliveryPrice,
  DEFAULT_PRICING_CONFIG,
  parsePricingConfig,
  PricingError,
  type ParcelInput,
  type PricingConfigValues,
} from "../lib/pricing.ts"

const parcel: ParcelInput = {
  packageType: "small_parcel",
  lengthCm: 30,
  widthCm: 20,
  heightCm: 10,
  actualWeightKg: 2,
  quantity: 1,
}

function priceAt(distanceKm: number, overrides: Partial<PricingConfigValues> = {}) {
  return calculateDeliveryPrice({
    distanceKm,
    parcels: [parcel],
    config: { ...DEFAULT_PRICING_CONFIG, ...overrides },
  })
}

test("base fare and mass charge apply at zero distance", () => {
  const price = priceAt(0)
  assert.equal(price.baseFare, 50)
  assert.equal(price.distanceFare, 0)
  assert.equal(price.weightFare, 15)
  assert.equal(price.subtotal, 65)
  assert.equal(price.total, 65)
})

test("charges R35/km for the first 5 km plus mass", () => {
  const price = priceAt(3)
  assert.equal(price.distanceFare, 105)
  assert.equal(price.total, 170)
})

test("first band stops exactly at 5 km", () => {
  const price = priceAt(5)
  assert.equal(price.distanceFare, 175)
  assert.equal(price.total, 240)
})

test("charges R28/km between 5 and 30 km", () => {
  const price = priceAt(10)
  assert.equal(price.distanceFare, 175 + 5 * 28)
  assert.equal(price.total, 380)
})

test("charges the third band up to and beyond 30 km", () => {
  const at30 = priceAt(30)
  assert.equal(at30.distanceFare, 175 + 25 * 28)
  assert.equal(at30.total, 940)

  const at40 = priceAt(40)
  assert.equal(at40.total, Math.round(940 + 10 * 20.333))
})

test("distance fare excludes base fare but components sum to the subtotal", () => {
  const price = priceAt(12)
  assert.equal(price.baseFare + price.distanceFare + price.weightFare, price.subtotal)
})

test("minimum fare wins when the calculated subtotal is lower", () => {
  const price = priceAt(1, { baseFare: 0, minimumFare: 50, distanceRates: [10, 28, 20.333] })
  assert.equal(price.subtotal, 25)
  assert.equal(price.total, 50)
  assert.equal(price.minimumApplied, true)
})

test("volumetric weight wins when it exceeds actual weight", () => {
  const price = calculateDeliveryPrice({
    distanceKm: 10,
    parcels: [
      {
        packageType: "large_box",
        lengthCm: 100,
        widthCm: 100,
        heightCm: 100,
        actualWeightKg: 10,
        quantity: 2,
      },
    ],
    config: DEFAULT_PRICING_CONFIG,
  })

  assert.equal(price.chargeableWeightKg, 400)
})

test("charges R15 per chargeable kg above the first free kg", () => {
  const price = calculateDeliveryPrice({
    distanceKm: 10,
    parcels: [{ ...parcel, actualWeightKg: 80 }],
    config: DEFAULT_PRICING_CONFIG,
  })
  assert.equal(price.chargeableWeightKg, 80)
  assert.equal(price.weightFare, 79 * 15)
  assert.equal(price.total, price.subtotal)
})

test("the free mass allowance is applied once across all parcels", () => {
  const price = calculateDeliveryPrice({
    distanceKm: 0,
    parcels: [
      { ...parcel, lengthCm: 20, widthCm: 15, heightCm: 5, actualWeightKg: 1 },
      { ...parcel, lengthCm: 20, widthCm: 15, heightCm: 5, actualWeightKg: 1 },
    ],
    config: DEFAULT_PRICING_CONFIG,
  })
  assert.equal(price.chargeableWeightKg, 2)
  assert.equal(price.weightFare, 15)
  assert.equal(price.total, 65)
})

test("parsePricingConfig rejects malformed bands and rates", () => {
  assert.throws(
    () => parsePricingConfig({ ...DEFAULT_PRICING_CONFIG, distanceBands: [5, 30, 50] }),
    (error: unknown) => error instanceof PricingError && error.code === "INVALID_PRICING",
  )
  assert.throws(
    () => parsePricingConfig({ ...DEFAULT_PRICING_CONFIG, distanceRates: [35, 28] }),
    (error: unknown) => error instanceof PricingError && error.code === "INVALID_PRICING",
  )
  assert.throws(
    () => parsePricingConfig({ ...DEFAULT_PRICING_CONFIG, quoteTtlMinutes: 500 }),
    (error: unknown) => error instanceof PricingError && error.code === "INVALID_PRICING",
  )
})
