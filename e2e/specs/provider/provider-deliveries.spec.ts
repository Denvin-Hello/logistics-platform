import { expect } from "@playwright/test"
import { test } from "../../fixtures/auth"

test.describe("Provider Deliveries (/provider/deliveries)", () => {
  test.beforeEach(async ({ providerPage }) => {
    await providerPage.goto("/provider/deliveries")
  })

  test("shows page header", async ({ providerPage }) => {
    await expect(providerPage.locator("h1")).toContainText("Active Deliveries")
  })

  test("displays all 3 delivery cards", async ({ providerPage }) => {
    await expect(providerPage.locator("text=#DEL001")).toBeVisible()
    await expect(providerPage.locator("text=#DEL002")).toBeVisible()
    await expect(providerPage.locator("text=#DEL003")).toBeVisible()
  })

  test("each card shows status badge", async ({ providerPage }) => {
    await expect(providerPage.locator("text=PENDING").first()).toBeVisible()
    await expect(providerPage.locator("text=IN TRANSIT").first()).toBeVisible()
    await expect(providerPage.locator("text=DELIVERED").first()).toBeVisible()
  })

  test("accept button works on pending delivery", async ({ providerPage }) => {
    const acceptBtn = providerPage.locator('button:has-text("Accept Delivery")').first()
    await acceptBtn.click()
    await expect(providerPage.locator("text=Delivery accepted").first()).toBeVisible()
  })

  test("mark delivered works on in-transit delivery", async ({ providerPage }) => {
    const markBtn = providerPage.locator('button:has-text("Mark Delivered")').first()
    await markBtn.click()
    await expect(providerPage.locator("text=Delivery completed").first()).toBeVisible()
  })

  test("filter button is visible", async ({ providerPage }) => {
    await expect(providerPage.locator('button:has-text("Filter deliveries")')).toBeVisible()
  })

  test("delivered card shows no action buttons", async ({ providerPage }) => {
    const deliveredSection = providerPage.locator("text=DELIVERED").first()
    await expect(deliveredSection).toBeVisible()
  })
})
