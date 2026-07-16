import { expect } from "@playwright/test"
import { test } from "../../fixtures/auth"

test.describe("Customer Dashboard (/customer)", () => {
  test.beforeEach(async ({ customerPage }) => {
    await customerPage.goto("/customer")
  })

  test("shows welcome message and dashboard header", async ({ customerPage }) => {
    await expect(customerPage.locator("h1")).toContainText("Dashboard")
    await expect(customerPage.locator("text=Welcome back, Sarah Customer")).toBeVisible()
  })

  test("displays all 4 stat cards", async ({ customerPage }) => {
    await expect(customerPage.locator("text=Active Orders")).toBeVisible()
    await expect(customerPage.locator("text=Total Spent")).toBeVisible()
    await expect(customerPage.locator("text=Deliveries").first()).toBeVisible()
    await expect(customerPage.locator("text=Avg. Delivery Time")).toBeVisible()
  })

  test("stat cards show numeric values", async ({ customerPage }) => {
    await expect(customerPage.locator('text="3"').first()).toBeVisible()
    await expect(customerPage.locator("text=R2,340")).toBeVisible()
    await expect(customerPage.locator('text="28"').first()).toBeVisible()
    await expect(customerPage.locator("text=2h 45m")).toBeVisible()
  })

  test("shows 3 quick action cards", async ({ customerPage }) => {
    await expect(customerPage.locator("text=Create New Order").first()).toBeVisible()
    await expect(customerPage.locator("text=Track Packages").first()).toBeVisible()
    await expect(customerPage.locator("text=Payment History").first()).toBeVisible()
  })

  test("recent orders section displays 3 orders", async ({ customerPage }) => {
    await expect(customerPage.locator("h2:has-text('Recent Orders')")).toBeVisible()
    await expect(customerPage.locator("text=#ORD001")).toBeVisible()
    await expect(customerPage.locator("text=#ORD002")).toBeVisible()
    await expect(customerPage.locator("text=#ORD003")).toBeVisible()
  })

  test("orders show status badges with correct labels", async ({ customerPage }) => {
    await expect(customerPage.locator("text=In Transit").first()).toBeVisible()
    await expect(customerPage.locator("text=DELIVERED").first()).toBeVisible()
    await expect(customerPage.locator("text=PENDING").first()).toBeVisible()
  })

  test("new order button in header exists", async ({ customerPage }) => {
    await expect(customerPage.locator('button:has-text("New Order")')).toBeVisible()
  })

  test("notifications button exists", async ({ customerPage }) => {
    await expect(customerPage.locator('button:has-text("Notifications")')).toBeVisible()
  })
})
