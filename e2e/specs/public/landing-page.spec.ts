import { test, expect } from "@playwright/test"

test.describe("Landing Page (/)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("displays hero section with title and description", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("TDL CO Logistics Platform")
    await expect(page.locator("text=Connect delivery providers with customers")).toBeVisible()
  })

  test("hero CTA buttons link to correct pages", async ({ page }) => {
    const getStartedBtn = page.locator("a", { hasText: "Get Started" }).first()
    await expect(getStartedBtn).toHaveAttribute("href", "/auth")

    const trackBtn = page.locator("a", { hasText: "Track Package" })
    await expect(trackBtn).toHaveAttribute("href", "/tracking")
  })

  test("safety snapshot section is visible", async ({ page }) => {
    await expect(page.locator("text=Monitor driver alertness while tracking every delivery.")).toBeVisible()
    await expect(page.locator("a", { hasText: "Open driver safety" })).toBeVisible()
    await expect(page.locator("a", { hasText: "View package tracking" })).toBeVisible()
  })

  test("displays all 6 feature cards", async ({ page }) => {
    const features = [
      "Provider Network",
      "Secure Payments",
      "Real-time Tracking",
      "Driver Safety",
      "Delivery Authentication",
      "Customer Management",
    ]
    for (const feature of features) {
      await expect(page.locator(`text="${feature}"`).first()).toBeVisible()
    }
  })

  test("displays Business Intelligence card", async ({ page }) => {
    await expect(page.locator("text=Business Intelligence")).toBeVisible()
  })

  test("CTA section at bottom has Start Free Trial link", async ({ page }) => {
    await expect(page.locator("a", { hasText: "Start Free Trial" }).last()).toBeVisible()
    await expect(page.locator("a", { hasText: "Learn More" }).last()).toBeVisible()
  })

  test("footer contains platform links", async ({ page }) => {
    const footer = page.locator("footer")
    await expect(footer.locator("a", { hasText: "For Customers" })).toBeVisible()
    await expect(footer.locator("a", { hasText: "For Providers" })).toBeVisible()
    await expect(footer.locator("a", { hasText: "Package Tracking" })).toBeVisible()
  })
})
