import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CATALOG_ITEMS,
  catalogItemEstimate,
  catalogItemPath,
  getCatalogItem,
  isCatalogItemBlocked,
  PACKAGE_CATALOG,
  parcelCatalogPath,
  searchCatalogItems,
} from "../lib/package-catalog.ts"

const PACKAGE_TYPES = new Set([
  "documents",
  "small_parcel",
  "electronics",
  "clothing",
  "books_media",
  "bulky",
  "furniture",
  "appliance",
  "tyres_parts",
  "food_ambient",
  "food_cold",
  "fragile_glass",
  "liquids_nonhaz",
  "other",
  "restricted_hazmat",
])

test("catalog has 12 top-level categories and unique item keys", () => {
  assert.equal(PACKAGE_CATALOG.length, 12)
  assert.equal(new Set(CATALOG_ITEMS.map((item) => item.value)).size, CATALOG_ITEMS.length)
  assert.ok(CATALOG_ITEMS.length > 100)
})

test("every item maps to a known internal package type", () => {
  for (const item of CATALOG_ITEMS) {
    assert.ok(PACKAGE_TYPES.has(item.packageType), `${item.value} has unknown package type ${item.packageType}`)
  }
})

test("hazardous items are visible but blocked", () => {
  const chemical = getCatalogItem("chemicals")
  assert.ok(chemical)
  assert.equal(chemical.category, "special_handling")
  assert.equal(isCatalogItemBlocked(chemical), true)
})

test("search matches item names and keywords across categories", () => {
  assert.ok(searchCatalogItems("fridge").some((item) => item.value === "fridge"))
  assert.ok(searchCatalogItems("air fryer").some((item) => item.value === "air_fryer"))
  assert.ok(searchCatalogItems("tyres").some((item) => item.value === "tyres"))
  assert.equal(searchCatalogItems("").length, 0)
})

test("catalog paths include category, subcategory and item", () => {
  const item = getCatalogItem("air_fryer")
  assert.ok(item)
  assert.equal(catalogItemPath(item), "Household > Kitchenware > Air fryer")
  assert.equal(
    parcelCatalogPath({
      itemKey: "air_fryer",
      itemLabel: "Air fryer",
      catalogCategory: "household",
      catalogSubcategory: "kitchenware",
    }),
    "Household > Kitchenware > Air fryer",
  )
})

test("estimates scale weight and volume with quantity", () => {
  const item = getCatalogItem("laptop")
  assert.ok(item)
  const one = catalogItemEstimate(item, 1)
  const four = catalogItemEstimate(item, 4)
  assert.equal(four.weight, Math.round(one.weight * 4 * 10) / 10)
  assert.ok(four.length > one.length)
})
