import { test, expect } from "@playwright/test"

test.describe("Payment Pages", () => {
  test.describe("Payment Success (/payment/success)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/payment/success")
    })

    test("displays success header and checkmark", async ({ page }) => {
      await expect(page.locator("text=Payment Successful!")).toBeVisible()
      await expect(page.locator("text=Your payment has been processed successfully")).toBeVisible()
    })

    test("shows order details section", async ({ page }) => {
      await expect(page.locator("text=Order Details")).toBeVisible()
      await expect(page.locator("text=Order ID: #ORD001")).toBeVisible()
      await expect(page.locator("text=Estimated delivery: 2-4 hours")).toBeVisible()
    })

    test("shows what happens next steps", async ({ page }) => {
      await expect(page.locator("text=What happens next?")).toBeVisible()
      await expect(page.locator("text=Provider Assignment")).toBeVisible()
      await expect(page.locator("text=Pickup Scheduled")).toBeVisible()
      await expect(page.locator("text=Delivery Complete")).toBeVisible()
    })

    test("has track package and dashboard links", async ({ page }) => {
      await expect(page.locator("a", { hasText: "Track Your Package" })).toBeVisible()
      await expect(page.locator("a", { hasText: "Go to Dashboard" })).toBeVisible()
    })
  })

  test.describe("Payment Cancel (/payment/cancel)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/payment/cancel")
    })

    test("displays cancellation message", async ({ page }) => {
      await expect(page.locator("text=Payment Cancelled")).toBeVisible()
      await expect(page.locator("text=no charges were made")).toBeVisible()
    })

    test("shows retry and dashboard links", async ({ page }) => {
      await expect(page.locator("a", { hasText: "Try Payment Again" })).toBeVisible()
      await expect(page.locator("a", { hasText: "Back to Dashboard" })).toBeVisible()
    })
  })
})
