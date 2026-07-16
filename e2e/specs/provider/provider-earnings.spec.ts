import { expect } from "@playwright/test"
import { test } from "../../fixtures/auth"

test.describe("Provider Earnings (/provider/earnings)", () => {
  test.beforeEach(async ({ providerPage }) => {
    await providerPage.goto("/provider/earnings")
  })

  test("shows earnings header", async ({ providerPage }) => {
    await expect(providerPage.locator("h1")).toContainText("Earnings")
    await expect(providerPage.locator("text=Track your delivery revenue")).toBeVisible()
  })

  test("displays all 4 stat cards", async ({ providerPage }) => {
    await expect(providerPage.locator("text=Total earnings")).toBeVisible()
    await expect(providerPage.locator("text=Deliveries completed")).toBeVisible()
    await expect(providerPage.locator("text=Expected payout")).toBeVisible()
    await expect(providerPage.locator("text=Weekly trend")).toBeVisible()
  })

  test("shows earnings total in Rands", async ({ providerPage }) => {
    await expect(providerPage.locator("text=R630")).toBeVisible()
  })

  test("shows payout section", async ({ providerPage }) => {
    await expect(providerPage.locator("text=Payment summary")).toBeVisible()
    await expect(providerPage.locator("text=Revenue breakdown")).toBeVisible()
  })

  test("export button is visible", async ({ providerPage }) => {
    await expect(providerPage.locator('button:has-text("Export earnings")')).toBeVisible()
  })

  test("next payout date is visible", async ({ providerPage }) => {
    await expect(providerPage.locator("text=Next payout due")).toBeVisible()
  })
})
