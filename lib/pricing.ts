// Distance-based delivery pricing. Pure functions so the same engine can be
// used by the quote API, admin previews and unit tests.

export const PRICING_LIMITS = {
  maxParcels: 20,
  maxQuantityPerParcel: 50,
  maxDimensionCm: 300,
  maxActualWeightKg: 5000,
  maxTotalWeightKg: 8000,
  maxTotalVolumeM3: 120,
} as const

export interface ParcelInput {
  packageType: string
  itemKey?: string
  itemLabel?: string
  catalogCategory?: string
  catalogSubcategory?: string
  description?: string
  lengthCm: number
  widthCm: number
  heightCm: number
  actualWeightKg: number
  quantity: number
}

export interface NormalizedParcel extends ParcelInput {
  description: string
  chargeableWeightKg: number
  volumeM3: number
}

export interface PricingConfigValues {
  baseFare: number
  minimumFare: number
  distanceBands: (number | null)[]
  distanceRates: number[]
  freeWeightKg: number
  weightBands: (number | null)[]
  weightRates: number[]
  volumetricDivisor: number
  quoteTtlMinutes: number
  currency: string
}

export interface FareBandLine {
  label: string
  from: number
  to: number | null
  units: number
  rate: number
  amount: number
}

export interface DeliveryPrice {
  chargeableWeightKg: number
  distanceKm: number
  distanceM: number
  baseFare: number
  distanceFare: number
  weightFare: number
  subtotal: number
  total: number
  minimumApplied: boolean
  distanceLines: FareBandLine[]
  weightLines: FareBandLine[]
  parcels: NormalizedParcel[]
}

export class PricingError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "PricingError"
    this.code = code
  }
}

function finiteNumber(value: unknown, name: string, { min = 0 } = {}) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new PricingError("INVALID_PRICING", `${name} must be a number greater than or equal to ${min}.`)
  }
  return parsed
}

function bandArray(value: unknown, name: string): (number | null)[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PricingError("INVALID_PRICING", `${name} must be a non-empty array.`)
  }

  const bands = value.map((entry) => {
    if (entry === null) return null
    const parsed = Number(entry)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new PricingError("INVALID_PRICING", `${name} entries must be positive numbers or null.`)
    }
    return parsed
  })

  let previous = 0
  bands.forEach((entry, index) => {
    if (entry === null) {
      if (index !== bands.length - 1) {
        throw new PricingError("INVALID_PRICING", `${name} can only end with an open-ended band.`)
      }
      return
    }
    if (entry <= previous) {
      throw new PricingError("INVALID_PRICING", `${name} must be strictly increasing.`)
    }
    previous = entry
  })

  if (bands[bands.length - 1] !== null) {
    throw new PricingError("INVALID_PRICING", `${name} must end with an open-ended band (null).`)
  }

  return bands
}

function rateArray(value: unknown, name: string, expectedLength: number): number[] {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    throw new PricingError("INVALID_PRICING", `${name} must have the same length as its bands.`)
  }
  return value.map((entry) => {
    const parsed = Number(entry)
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new PricingError("INVALID_PRICING", `${name} entries must be non-negative numbers.`)
    }
    return parsed
  })
}

export function parsePricingConfig(input: unknown): PricingConfigValues {
  if (!input || typeof input !== "object") {
    throw new PricingError("INVALID_PRICING", "Pricing configuration is missing.")
  }

  const raw = input as Record<string, unknown>
  const distanceBands = bandArray(raw.distanceBands, "distanceBands")
  const distanceRates = rateArray(raw.distanceRates, "distanceRates", distanceBands.length)
  const weightBands = bandArray(raw.weightBands, "weightBands")
  const weightRates = rateArray(raw.weightRates, "weightRates", weightBands.length)

  const quoteTtlMinutes = Math.round(finiteNumber(raw.quoteTtlMinutes ?? 15, "quoteTtlMinutes", { min: 1 }))
  if (quoteTtlMinutes > 240) {
    throw new PricingError("INVALID_PRICING", "quoteTtlMinutes cannot exceed 240.")
  }

  return {
    baseFare: Math.round(finiteNumber(raw.baseFare, "baseFare")),
    minimumFare: Math.round(finiteNumber(raw.minimumFare, "minimumFare")),
    distanceBands,
    distanceRates,
    freeWeightKg: finiteNumber(raw.freeWeightKg ?? 1, "freeWeightKg"),
    weightBands,
    weightRates,
    volumetricDivisor: Math.round(finiteNumber(raw.volumetricDivisor ?? 5000, "volumetricDivisor", { min: 1 })),
    quoteTtlMinutes,
    currency: typeof raw.currency === "string" && raw.currency.trim() ? raw.currency.trim().toUpperCase() : "ZAR",
  }
}

export function volumetricKg(lengthCm: number, widthCm: number, heightCm: number, divisor: number) {
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0 || divisor <= 0) return 0
  return (lengthCm * widthCm * heightCm) / divisor
}

export function normalizeParcels(parcels: ParcelInput[], divisor: number): NormalizedParcel[] {
  if (!Array.isArray(parcels) || parcels.length === 0) {
    throw new PricingError("INVALID_PARCEL", "Add at least one parcel.")
  }
  if (parcels.length > PRICING_LIMITS.maxParcels) {
    throw new PricingError("INVALID_PARCEL", `A maximum of ${PRICING_LIMITS.maxParcels} parcels is allowed.`)
  }

  let totalWeight = 0
  let totalVolume = 0

  const normalized = parcels.map((parcel, index) => {
    const label = `Parcel ${index + 1}`
    if (!parcel || typeof parcel !== "object") {
      throw new PricingError("INVALID_PARCEL", `${label} is invalid.`)
    }
    if (typeof parcel.packageType !== "string" || !parcel.packageType.trim()) {
      throw new PricingError("INVALID_PARCEL", `${label} needs a package type.`)
    }

    const lengthCm = finiteNumber(parcel.lengthCm, `${label} length`, { min: 0.1 })
    const widthCm = finiteNumber(parcel.widthCm, `${label} width`, { min: 0.1 })
    const heightCm = finiteNumber(parcel.heightCm, `${label} height`, { min: 0.1 })
    const actualWeightKg = finiteNumber(parcel.actualWeightKg, `${label} weight`, { min: 0.01 })
    const quantity = Math.round(finiteNumber(parcel.quantity, `${label} quantity`, { min: 1 }))

    if (lengthCm > PRICING_LIMITS.maxDimensionCm || widthCm > PRICING_LIMITS.maxDimensionCm || heightCm > PRICING_LIMITS.maxDimensionCm) {
      throw new PricingError("INVALID_PARCEL", `${label} exceeds the ${PRICING_LIMITS.maxDimensionCm} cm dimension limit.`)
    }
    if (actualWeightKg > PRICING_LIMITS.maxActualWeightKg) {
      throw new PricingError("INVALID_PARCEL", `${label} exceeds the ${PRICING_LIMITS.maxActualWeightKg} kg limit.`)
    }
    if (quantity > PRICING_LIMITS.maxQuantityPerParcel) {
      throw new PricingError("INVALID_PARCEL", `${label} quantity cannot exceed ${PRICING_LIMITS.maxQuantityPerParcel}.`)
    }

    const parcelVolumeM3 = (lengthCm * widthCm * heightCm) / 1_000_000
    const unitChargeable = Math.max(actualWeightKg, volumetricKg(lengthCm, widthCm, heightCm, divisor))
    const chargeableWeightKg = unitChargeable * quantity

    totalWeight += actualWeightKg * quantity
    totalVolume += parcelVolumeM3 * quantity

    return {
      ...parcel,
      packageType: parcel.packageType.trim().toLowerCase(),
      itemKey: parcel.itemKey?.trim() || undefined,
      itemLabel: parcel.itemLabel?.trim() || undefined,
      catalogCategory: parcel.catalogCategory?.trim() || undefined,
      catalogSubcategory: parcel.catalogSubcategory?.trim() || undefined,
      description: (parcel.description || "").trim(),
      lengthCm,
      widthCm,
      heightCm,
      actualWeightKg,
      quantity,
      chargeableWeightKg,
      volumeM3: parcelVolumeM3,
    }
  })

  if (totalWeight > PRICING_LIMITS.maxTotalWeightKg) {
    throw new PricingError("INVALID_PARCEL", `Total weight cannot exceed ${PRICING_LIMITS.maxTotalWeightKg} kg.`)
  }
  if (totalVolume > PRICING_LIMITS.maxTotalVolumeM3) {
    throw new PricingError("INVALID_PARCEL", `Total volume cannot exceed ${PRICING_LIMITS.maxTotalVolumeM3} m³.`)
  }

  return normalized
}

export function chargeableWeight(parcels: NormalizedParcel[]) {
  return parcels.reduce((sum, parcel) => sum + parcel.chargeableWeightKg, 0)
}

function distanceBandLines(distanceKm: number, bands: (number | null)[], rates: number[]): FareBandLine[] {
  const lines: FareBandLine[] = []
  let previous = 0

  bands.forEach((upper, index) => {
    const to = upper ?? distanceKm
    const units = Math.max(0, Math.min(distanceKm, to) - previous)
    if (units > 0) {
      lines.push({
        label: upper === null ? `${previous}+ km` : `${previous}–${upper} km`,
        from: previous,
        to: upper,
        units,
        rate: rates[index],
        amount: rates[index] * units,
      })
    }
    previous = to
  })

  return lines
}

export function fareMultiBand(distanceKm: number, config: PricingConfigValues, minimum = 0) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new PricingError("INVALID_DISTANCE", "Distance must be a non-negative number.")
  }

  const lines = distanceBandLines(distanceKm, config.distanceBands, config.distanceRates)
  const raw = config.baseFare + lines.reduce((sum, line) => sum + line.amount, 0)
  const fare = Math.max(Math.round(raw), minimum)

  return { fare, raw, lines }
}

export function weightCharge(
  weightKg: number,
  freeWeightKg: number,
  bands: (number | null)[],
  rates: number[],
) {
  if (!Number.isFinite(weightKg) || weightKg <= freeWeightKg) {
    return { charge: 0, raw: 0, lines: [] as FareBandLine[] }
  }

  const lines: FareBandLine[] = []
  let previous = freeWeightKg

  bands.forEach((upper, index) => {
    const to = upper ?? weightKg
    const units = Math.max(0, Math.min(weightKg, to) - previous)
    if (units > 0) {
      lines.push({
        label: upper === null ? `${previous}+ kg` : `${previous}–${upper} kg`,
        from: previous,
        to: upper,
        units,
        rate: rates[index],
        amount: rates[index] * units,
      })
    }
    previous = Math.max(previous, to)
  })

  const raw = lines.reduce((sum, line) => sum + line.amount, 0)
  return { charge: Math.round(raw), raw, lines }
}

export function calculateDeliveryPrice(input: {
  distanceKm: number
  distanceM?: number
  parcels: ParcelInput[]
  config: PricingConfigValues
}): DeliveryPrice {
  const { config } = input
  const distanceKm = finiteNumber(input.distanceKm, "Distance")
  const parcels = normalizeParcels(input.parcels, config.volumetricDivisor)
  const totalChargeable = chargeableWeight(parcels)

  const distance = fareMultiBand(distanceKm, config)
  const weight = weightCharge(totalChargeable, config.freeWeightKg, config.weightBands, config.weightRates)

  const weightFare = Math.max(Math.round(weight.raw), 0)
  const subtotal = Math.max(Math.round(distance.raw + weight.raw), 0)
  const distanceFare = Math.max(subtotal - config.baseFare - weightFare, 0)
  const total = Math.max(subtotal, config.minimumFare)

  return {
    chargeableWeightKg: Math.round(totalChargeable * 100) / 100,
    distanceKm,
    distanceM: input.distanceM ?? Math.round(distanceKm * 1000),
    baseFare: config.baseFare,
    distanceFare,
    weightFare,
    subtotal,
    total,
    minimumApplied: total > subtotal,
    distanceLines: distance.lines,
    weightLines: weight.lines,
    parcels,
  }
}

export const DEFAULT_PRICING_CONFIG: PricingConfigValues = {
  baseFare: 50,
  minimumFare: 50,
  distanceBands: [5, 30, null],
  distanceRates: [35, 28, 20.333],
  freeWeightKg: 1,
  weightBands: [null],
  weightRates: [15],
  volumetricDivisor: 5000,
  quoteTtlMinutes: 15,
  currency: "ZAR",
}
