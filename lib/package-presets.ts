import { GOODS_CATEGORIES, getCategory, type GoodsCategory } from "@/lib/freight"

// Quick-request pricing relies on each good's average volumetric mass (meanM3)
// and average weight (meanKg) from the taxonomy, so customers don't have to
// measure a box for a fast quote. The taxonomy is Category (group) -> sub-category.

export interface PackageEstimate {
  weight: number
  length: number
  width: number
  height: number
}

// Aspect ratio applied to the average volume (L:W:H). Keeps the product equal to
// the average volume while looking like a plausible parcel.
const ASPECT = { l: 1, w: 0.8, h: 0.6 }

export function estimatePackage(packageType: string, quantity = 1): PackageEstimate {
  const category = getCategory(packageType)
  const qty = Math.max(1, Math.min(50, Math.round(quantity) || 1))
  const volumeCm3 = Math.max(category.meanM3, 0.001) * 1_000_000 * qty
  const scale = Math.cbrt(volumeCm3 / (ASPECT.l * ASPECT.w * ASPECT.h))
  return {
    length: Math.max(5, Math.round(scale * ASPECT.l)),
    width: Math.max(5, Math.round(scale * ASPECT.w)),
    height: Math.max(5, Math.round(scale * ASPECT.h)),
    weight: Math.max(0.1, Math.round(category.meanKg * qty * 10) / 10),
  }
}

export interface CategoryGroup {
  group: string
  categories: GoodsCategory[]
}

export function groupCategories(): CategoryGroup[] {
  const groups = new Map<string, GoodsCategory[]>()
  for (const category of GOODS_CATEGORIES) {
    const bucket = groups.get(category.group)
    if (bucket) bucket.push(category)
    else groups.set(category.group, [category])
  }
  return Array.from(groups.entries()).map(([group, categories]) => ({ group, categories }))
}

export const QUICK_CATEGORY_VALUES = GOODS_CATEGORIES.filter((c) => !c.flags?.blocked).map((c) => c.value)
