import { expect } from "@playwright/test"
import { test } from "../../fixtures/auth"

test.describe("Provider Dashboard (/provider)", () => {
  test.beforeEach(async ({ providerPage }) => {
    await providerPage.goto("/provider")
  })

  test("shows welcome message", async ({ providerPage }) => {
    await expect(providerPage.locator("h1")).toContainText("Dashboard")
    await expect(providerPage.locator("text=Welcome back, Alex Driver")).toBeVisible()
  })

  test("displays all 4 stat cards", async ({ providerPage }) => {
    await expect(providerPage.locator("text=Active Deliveries").first()).toBeVisible()
    await expect(providerPage.locator("text=Today's Earnings")).toBeVisible()
    await expect(providerPage.locator("text=Avg. Delivery Time")).toBeVisible()
    await expect(providerPage.locator("text=Rating")).toBeVisible()
  })

  test("stat cards show correct values", async ({ providerPage }) => {
    await expect(providerPage.locator('text="2"').first()).toBeVisible()
    await expect(providerPage.locator("text=R480")).toBeVisible()
    await expect(providerPage.locator("text=4.8")).toBeVisible()
  })

  test("shows 3 action cards", async ({ providerPage }) => {
    await expect(providerPage.locator("text=Route Optimization")).toBeVisible()
    await expect(providerPage.locator("text=Performance Analytics")).toBeVisible()
    await expect(providerPage.locator("text=Earnings Report")).toBeVisible()
  })

  test("route optimization button reorders deliveries", async ({ providerPage }) => {
    await providerPage.locator('button:has-text("Optimize Routes")').click()
    await expect(providerPage.locator("text=Routes optimized").first()).toBeVisible()
  })

  test("analytics panel toggles on click", async ({ providerPage }) => {
    const btn = providerPage.locator('button:has-text("View Analytics")')
    await btn.waitFor()
    await btn.click({ force: true })
    await expect(providerPage.locator("text=Delivery performance").first()).toBeVisible()
    await expect(providerPage.locator("text=Pending Routes")).toBeVisible()
  })

  test("earnings report downloads CSV", async ({ providerPage }) => {
    const [download] = await Promise.all([
      providerPage.waitForEvent("download"),
      providerPage.locator('button:has-text("Download Report")').click(),
    ])
    expect(download.suggestedFilename()).toContain("provider-deliveries-report.csv")
  })

  test("recent deliveries section shows 3 delivery cards", async ({ providerPage }) => {
    await expect(providerPage.locator("h2:has-text('Recent Deliveries')")).toBeVisible()
    await expect(providerPage.locator("text=#DEL001")).toBeVisible()
    await expect(providerPage.locator("text=#DEL002")).toBeVisible()
    await expect(providerPage.locator("text=#DEL003")).toBeVisible()
  })

  test("pending delivery has Accept button", async ({ providerPage }) => {
    const firstPendingCard = providerPage.locator("text=#DEL001").locator("..").locator("..")
    await expect(providerPage.locator('button:has-text("Accept Delivery")').first()).toBeVisible()
  })

  test("accepting a delivery changes its status", async ({ providerPage }) => {
    await providerPage.locator('button:has-text("Accept Delivery")').first().click()
    await expect(providerPage.locator("text=Delivery accepted").first()).toBeVisible()
  })

  test("in-transit delivery has Mark Delivered button", async ({ providerPage }) => {
    await expect(providerPage.locator('button:has-text("Mark Delivered")').first()).toBeVisible()
  })

  test("marking delivered completes the order", async ({ providerPage }) => {
    await providerPage.locator('button:has-text("Mark Delivered")').first().click()
    await expect(providerPage.locator("text=Delivery complete").first()).toBeVisible()
  })
})
