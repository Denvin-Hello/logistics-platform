import { test, expect } from "@playwright/test"

test.describe("Driver Safety (/driver-safety)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/driver-safety")
  })

  test("displays page title and description", async ({ page }) => {
    await expect(page.locator("text=Live eye monitoring for logistics drivers")).toBeVisible()
    await expect(page.locator("text=Driver safety").first()).toBeVisible()
  })

  test("has Start Monitor and Stop Monitor buttons", async ({ page }) => {
    await expect(page.locator('button:has-text("Start monitor")')).toBeVisible()
    await expect(page.locator('button:has-text("Stop monitor")')).toBeVisible()
  })

  test("has sound toggle button", async ({ page }) => {
    await expect(page.locator('button:has-text("Sound on")')).toBeVisible()
  })

  test("shows video and canvas elements for face tracking", async ({ page }) => {
    await expect(page.locator("video")).toBeVisible()
    await expect(page.locator("canvas").first()).toBeVisible()
  })

  test("displays logistics metrics section", async ({ page }) => {
    await expect(page.locator("text=Logistics metrics")).toBeVisible()
    await expect(page.locator("text=Fatigue alert").first()).toBeVisible()
    await expect(page.locator("text=Eyes closed")).toBeVisible()
    await expect(page.locator("text=Frame rate")).toBeVisible()
    await expect(page.locator("text=Alert threshold")).toBeVisible()
  })

  test("displays eye movement history graph", async ({ page }) => {
    await expect(page.locator("text=Eye movement history")).toBeVisible()
    await expect(page.locator("canvas").nth(1)).toBeVisible()
  })

  test("recent alerts section is visible", async ({ page }) => {
    await expect(page.locator("text=Recent alerts")).toBeVisible()
  })

  test("safety briefing section is visible", async ({ page }) => {
    await expect(page.locator("text=Safety briefing")).toBeVisible()
    await expect(page.locator("text=when driver fatigue is detected")).toBeVisible()
  })

  test("has link to route tracking", async ({ page }) => {
    await expect(page.locator("a", { hasText: "Open route tracking" })).toBeVisible()
    await expect(page.locator("a", { hasText: "Return home" })).toBeVisible()
  })
})
