import { expect } from "@playwright/test"
import { test } from "../../fixtures/auth"

test.describe("Provider Routes (/provider/routes)", () => {
  test.beforeEach(async ({ providerPage }) => {
    await providerPage.goto("/provider/routes")
  })

  test("shows route planning header", async ({ providerPage }) => {
    await expect(providerPage.locator("h1")).toContainText("Route Planning")
    await expect(providerPage.locator("text=Optimize your delivery path")).toBeVisible()
  })

  test("displays 3 stat cards", async ({ providerPage }) => {
    await expect(providerPage.locator("text=Open routes")).toBeVisible()
    await expect(providerPage.locator("text=Pending stops")).toBeVisible()
    await expect(providerPage.locator("text=In transit")).toBeVisible()
  })

  test("route recommendations section is visible", async ({ providerPage }) => {
    await expect(providerPage.locator("text=Route recommendations")).toBeVisible()
    await expect(providerPage.locator("text=Delivery path summary")).toBeVisible()
  })

  test("save plan button exists", async ({ providerPage }) => {
    await expect(providerPage.locator('button:has-text("Save plan")')).toBeVisible()
  })

  test("next scheduled stop is displayed", async ({ providerPage }) => {
    await expect(providerPage.locator("text=Next scheduled stop")).toBeVisible()
  })
})
