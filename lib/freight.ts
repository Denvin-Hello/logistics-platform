// Central goods taxonomy + freight physics + law-of-averages matching.
// Y (dependent) = required vehicle capacity. X (independent) = goods vector.
// See prisma Order (packageType/weight/lwh) and OrderForm dropdown.

export const VOLUMETRIC_DIVISOR_ROAD = 5000 // L*W*H cm / 5000 = kg (DHL/UPS/FedEx road)
export const PACKING_VOID_FACTOR = 1.2 // 20% dead space for boxes/padding
export const BLEND_WEIGHT_DECLARATION = 0.7 // trust physics 70%, category mean 30%
export const BLEND_WEIGHT_MEAN = 0.3

export type GoodsGroup =
  | "Documents & small items"
  | "Household & bulky"
  | "Food & perishables"
  | "Fragile & special handling"
  | "Restricted"

export interface GoodsCategory {
  value: string
  label: string
  group: GoodsGroup
  description: string
  examples: string
  // Law-of-averages seed prior (mean chargeable kg / mean m3 over delivered history).
  // Replaced by live CategoryStats once enough deliveries exist. See update note below.
  meanKg: number
  meanM3: number
  stdKg: number
  samples: number
  flags?: {
    fragile?: boolean
    cold?: boolean
    closedBody?: boolean
    tailLift?: boolean
    blocked?: boolean
  }
}

export const GOODS_CATEGORIES: GoodsCategory[] = [
  { value: "documents", label: "Documents & envelopes", group: "Documents & small items", description: "Paper, contracts, passports", examples: "A4 envelope, legal pack", meanKg: 0.5, meanM3: 0.005, stdKg: 0.3, samples: 0 },
  { value: "small_parcel", label: "Small parcel (shoebox size)", group: "Documents & small items", description: "Phones, books, clothing order", examples: "30×20×15cm box", meanKg: 3, meanM3: 0.02, stdKg: 2, samples: 0 },
  { value: "electronics", label: "Electronics", group: "Documents & small items", description: "TVs, PCs, appliances small — needs padding", examples: "TV, laptop, speaker", meanKg: 8, meanM3: 0.08, stdKg: 6, samples: 0, flags: { fragile: true } },
  { value: "clothing", label: "Clothing & textiles", group: "Documents & small items", description: "Bags of clothes, linen", examples: "Duffel, bale", meanKg: 5, meanM3: 0.06, stdKg: 3, samples: 0 },
  { value: "books_media", label: "Books & media", group: "Documents & small items", description: "Dense — actual weight usually wins", examples: "Box of books", meanKg: 12, meanM3: 0.03, stdKg: 5, samples: 0 },
  { value: "bulky", label: "Bulky goods", group: "Household & bulky", description: "Prams, bikes, large toys", examples: "Bicycle box 140×25×70cm", meanKg: 25, meanM3: 0.3, stdKg: 12, samples: 0, flags: { closedBody: true } },
  { value: "furniture", label: "Furniture", group: "Household & bulky", description: "Chairs, tables, couches — may need 2 people", examples: "Couch, bed base", meanKg: 45, meanM3: 0.8, stdKg: 20, samples: 0, flags: { closedBody: true, tailLift: true } },
  { value: "appliance", label: "Appliances (large)", group: "Household & bulky", description: "Fridges, washers — keep upright", examples: "Fridge, washing machine", meanKg: 60, meanM3: 0.6, stdKg: 20, samples: 0, flags: { closedBody: true, tailLift: true } },
  { value: "tyres_parts", label: "Car parts & tyres", group: "Household & bulky", description: "Bumpers, tyres, engines", examples: "4 tyres, bumper", meanKg: 30, meanM3: 0.4, stdKg: 15, samples: 0, flags: { closedBody: true } },
  { value: "food_ambient", label: "Food — ambient", group: "Food & perishables", description: "Tinned, dry goods, groceries", examples: "Grocery boxes", meanKg: 15, meanM3: 0.1, stdKg: 8, samples: 0, flags: { closedBody: true } },
  { value: "food_cold", label: "Food — chilled / frozen", group: "Food & perishables", description: "Meat, dairy — needs reefer + fast transit", examples: "Cooler box", meanKg: 15, meanM3: 0.1, stdKg: 8, samples: 0, flags: { cold: true, closedBody: true } },
  { value: "food", label: "Food items (legacy)", group: "Food & perishables", description: "Legacy value — treated as ambient", examples: "Use ambient/cold instead", meanKg: 15, meanM3: 0.1, stdKg: 8, samples: 0, flags: { closedBody: true } },
  { value: "fragile", label: "Fragile items (legacy)", group: "Fragile & special handling", description: "Legacy value — treated as fragile glass", examples: "Glassware, ceramics", meanKg: 8, meanM3: 0.08, stdKg: 5, samples: 0, flags: { fragile: true } },
  { value: "fragile_glass", label: "Fragile — glass / ceramics", group: "Fragile & special handling", description: "Needs padding, no-stack, closed body", examples: "Mirrors, plates, vases", meanKg: 8, meanM3: 0.08, stdKg: 5, samples: 0, flags: { fragile: true, closedBody: true } },
  { value: "liquids_nonhaz", label: "Liquids (non-hazardous)", group: "Fragile & special handling", description: "Water, juice, paint (non-flammable) — leak-proof", examples: "25L containers", meanKg: 20, meanM3: 0.05, stdKg: 10, samples: 0, flags: { closedBody: true } },
  { value: "other", label: "Other / mixed", group: "Fragile & special handling", description: "Describe contents clearly", examples: "Mixed load", meanKg: 10, meanM3: 0.12, stdKg: 8, samples: 0 },
  { value: "restricted_hazmat", label: "Restricted — fuel / gas / chemicals / batteries", group: "Restricted", description: "BLOCKED in v1 — needs UN-certified packaging + PrDP-D", examples: "Petrol, LPG, fireworks", meanKg: 20, meanM3: 0.1, stdKg: 10, samples: 0, flags: { blocked: true } },
]

// Backwards compat: old free-text values map onto the taxonomy.
const LEGACY_ALIASES: Record<string, string> = {
  document: "documents",
  parcel: "small_parcel",
  box: "small_parcel",
  clothes: "clothing",
  electronic: "electronics",
  fragile_items: "fragile_glass",
}

export function getCategory(value: string | null | undefined): GoodsCategory {
  const v = (value || "other").trim().toLowerCase()
  const direct = GOODS_CATEGORIES.find((c) => c.value === v)
  if (direct) return direct
  const aliased = LEGACY_ALIASES[v]
  if (aliased) return GOODS_CATEGORIES.find((c) => c.value === aliased)!
  return GOODS_CATEGORIES.find((c) => c.value === "other")!
}

export interface VehicleClass {
  code: string
  label: string
  payloadKg: number
  volumeM3: number
  baseFee: number
}

// Ordered smallest → largest. Y is the smallest capable entry.
export const VEHICLE_CLASSES: VehicleClass[] = [
  { code: "BIKE", label: "Bike / scooter", payloadKg: 5, volumeM3: 0.1, baseFee: 100 },
  { code: "CAR", label: "Car / hatch", payloadKg: 100, volumeM3: 0.4, baseFee: 120 },
  { code: "BAKKIE", label: "Bakkie", payloadKg: 800, volumeM3: 3, baseFee: 120 },
  { code: "VAN_1T", label: "1T van", payloadKg: 1000, volumeM3: 6, baseFee: 200 },
  { code: "TRUCK_4T", label: "4T truck", payloadKg: 4000, volumeM3: 20, baseFee: 320 },
  { code: "TRUCK_8T", label: "8T truck", payloadKg: 8000, volumeM3: 35, baseFee: 470 },
]

export function volumetricKg(lengthCm: number, widthCm: number, heightCm: number, divisor = VOLUMETRIC_DIVISOR_ROAD) {
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) return 0
  return (lengthCm * widthCm * heightCm) / divisor
}

export function chargeableKg(actualKg: number, lengthCm: number, widthCm: number, heightCm: number) {
  return Math.max(Math.max(0, actualKg), volumetricKg(lengthCm, widthCm, heightCm))
}

export function volumeM3(lengthCm: number, widthCm: number, heightCm: number) {
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) return 0
  return (lengthCm * widthCm * heightCm) / 1_000_000
}

// Law of averages: shrink one-off declarations toward the category mean so a
// single under-declared order cannot pull vehicle selection down. As samples
// grow, replace seed means with live AVG(chargeableKg) per category:
//   newMean = oldMean + (x - oldMean) / (n + 1)
export function blendedKg(chargeable: number, category: GoodsCategory) {
  return chargeable * BLEND_WEIGHT_DECLARATION + category.meanKg * BLEND_WEIGHT_MEAN
}

function safetyMargin(category: GoodsCategory) {
  if (category.meanKg <= 0) return 1.2
  const cv = category.stdKg / category.meanKg // coefficient of variation
  return Math.min(1.3, Math.max(1.15, 1 + cv * 0.5))
}

export interface FreightQuote {
  category: GoodsCategory
  actualKg: number
  volumetricKg: number
  chargeableKg: number
  blendedKg: number
  requiredKg: number
  volumeM3: number
  requiredM3: number
  girthCm: number
  maxDimCm: number
  vehicle: VehicleClass
  blocked: boolean
  blockReason?: string
  breakdown: { label: string; amount: number }[]
  amount: number
}

export function quoteFreight(input: {
  packageType: string
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  fragile?: boolean
  insurance?: boolean
  signatureRequired?: boolean
}): FreightQuote {
  const category = getCategory(input.packageType)
  const actualKg = Math.max(0, input.weightKg || 0)
  const l = Math.max(0, input.lengthCm || 0)
  const w = Math.max(0, input.widthCm || 0)
  const h = Math.max(0, input.heightCm || 0)

  const vol = volumetricKg(l, w, h)
  const chargeable = chargeableKg(actualKg, l, w, h)
  const blended = blendedKg(chargeable, category)
  const margin = safetyMargin(category)
  const requiredKg = blended * margin
  const volM3 = volumeM3(l, w, h)
  const requiredM3 = volM3 * PACKING_VOID_FACTOR
  const girthCm = l + w + h
  const maxDimCm = Math.max(l, w, h)

  const blocked = !!category.flags?.blocked
  const vehicle =
    VEHICLE_CLASSES.find((v) => requiredKg <= v.payloadKg && requiredM3 <= v.volumeM3) ??
    VEHICLE_CLASSES[VEHICLE_CLASSES.length - 1]

  const fragile = !!(input.fragile || category.flags?.fragile)
  const cold = !!category.flags?.cold

  // Keep fee names compatible with /pricing page.
  const breakdown = [
    { label: `Base (${vehicle.label})`, amount: vehicle.baseFee },
    { label: `Chargeable ${(chargeable).toFixed(1)}kg (actual ${actualKg.toFixed(1)} / volumetric ${vol.toFixed(1)})`, amount: Math.max(0, chargeable - 1) * 15 },
    ...(girthCm > 120 ? [{ label: "Oversized package (L+W+H over 120cm)", amount: 20 }] : []),
    ...(fragile ? [{ label: "Fragile handling", amount: 30 }] : []),
    ...(input.insurance ? [{ label: "Insurance", amount: 25 }] : []),
    ...(input.signatureRequired ? [{ label: "Signature required", amount: 10 }] : []),
    ...(cold ? [{ label: "Cold-chain handling", amount: 35 }] : []),
  ]
  const amount = Math.max(100, Math.round(breakdown.reduce((s, b) => s + b.amount, 0)))

  return {
    category, actualKg, volumetricKg: vol, chargeableKg: chargeable,
    blendedKg: blended, requiredKg, volumeM3: volM3, requiredM3,
    girthCm, maxDimCm, vehicle, blocked,
    blockReason: blocked ? "Restricted goods (fuel, gas, chemicals, batteries) need UN-certified packaging and a certified provider. Contact support." : undefined,
    breakdown, amount,
  }
}
