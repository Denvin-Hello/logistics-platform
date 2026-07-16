import { test, expect } from "@playwright/test"

test.describe("Public Tracking (/tracking)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tracking")
  })

  test("displays tracking form", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Track Your Package")
    await expect(page.locator("#tracking-number")).toBeVisible()
    await expect(page.locator('button:has-text("Track Package")')).toBeVisible()
  })

  test("shows sample tracking numbers", async ({ page }) => {
    await expect(page.locator("text=ORD001 - In Transit")).toBeVisible()
    await expect(page.locator("text=ORD002 - Delivered")).toBeVisible()
    await expect(page.locator("text=ORD003 - Pending Pickup")).toBeVisible()
  })

  test("clicking sample number fills the input", async ({ page }) => {
    await page.locator("text=ORD001 - In Transit").click()
    await expect(page.locator("#tracking-number")).toHaveValue("ORD001")
  })

  test("tracks ORD001 and shows in-transit timeline", async ({ page }) => {
    await page.locator("#tracking-number").fill("ORD001")
    await page.locator('button:has-text("Track Package")').click()
    await expect(page.locator("text=Tracking #ORD001")).toBeVisible()
    await expect(page.locator("text=In Transit").first()).toBeVisible()
    await expect(page.locator("text=Delivery Timeline")).toBeVisible()
    await expect(page.locator("text=Order Placed")).toBeVisible()
    await expect(page.locator("text=Picked Up")).toBeVisible()
    await expect(page.locator("text=In Transit").first()).toBeVisible()
  })

  test("shows estimated delivery for ORD001", async ({ page }) => {
    await page.locator("#tracking-number").fill("ORD001")
    await page.locator('button:has-text("Track Package")').click()
    await expect(page.locator("text=Estimated Delivery")).toBeVisible()
  })

  test("tracks ORD002 and shows delivered status", async ({ page }) => {
    await page.locator("#tracking-number").fill("ORD002")
    await page.locator('button:has-text("Track Package")').click()
    await expect(page.locator("text=DELIVERED")).toBeVisible()
    await expect(page.locator("text=Yesterday").first()).toBeVisible()
  })

  test("tracks ORD003 and shows pending status", async ({ page }) => {
    await page.locator("#tracking-number").fill("ORD003")
    await page.locator('button:has-text("Track Package")').click()
    await expect(page.locator("text=PENDING")).toBeVisible()
    await expect(page.locator("text=Provider Assigned")).toBeVisible()
  })

  test("shows not found for invalid tracking number", async ({ page }) => {
    await page.locator("#tracking-number").fill("INVALID123")
    await page.locator('button:has-text("Track Package")').click()
    await expect(page.locator("text=Tracking Number Not Found")).toBeVisible()
    await expect(page.locator("button:has-text('Try Again')")).toBeVisible()
  })

  test("live map toggle shows for in-transit orders", async ({ page }) => {
    await page.locator("#tracking-number").fill("ORD001")
    await page.locator('button:has-text("Track Package")').click()
    const liveMapBtn = page.locator('button:has-text("Live Map")')
    await expect(liveMapBtn).toBeVisible()
    await liveMapBtn.click()
    await expect(page.locator("text=Live Tracking")).toBeVisible()
    await expect(page.locator("text=Driver Information")).toBeVisible()
    await expect(page.locator("text=Alex Driver")).toBeVisible()
  })

  test("back button returns to search", async ({ page }) => {
    await page.locator("#tracking-number").fill("ORD001")
    await page.locator('button:has-text("Track Package")').click()
    await page.locator('button:has-text("Back to Search")').click()
    await expect(page.locator("#tracking-number")).toBeVisible()
    await expect(page.locator("h1")).toContainText("Track Your Package")
  })
})
