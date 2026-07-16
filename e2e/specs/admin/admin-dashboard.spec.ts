import { expect } from "@playwright/test"
import { test } from "../../fixtures/auth"

test.describe("Admin Dashboard (/admin)", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto("/admin")
  })

  test("shows admin header", async ({ adminPage }) => {
    await expect(adminPage.locator("h1")).toContainText("Admin Dashboard")
    await expect(adminPage.locator("text=Monitor and manage your logistics platform")).toBeVisible()
  })

  test("displays 4 main stat cards", async ({ adminPage }) => {
    await expect(adminPage.locator("text=Total Orders")).toBeVisible()
    await expect(adminPage.locator("text=Active Customers")).toBeVisible()
    await expect(adminPage.locator("text=Delivery Providers")).toBeVisible()
    await expect(adminPage.locator("text=Total Revenue")).toBeVisible()
  })

  test("stat cards show formatted numbers", async ({ adminPage }) => {
    await expect(adminPage.locator("text=1 247").or(adminPage.locator("text=1247"))).toBeVisible()
    await expect(adminPage.locator("text=892")).toBeVisible()
    await expect(adminPage.locator("text=156")).toBeVisible()
  })

  test("shows quick actions section", async ({ adminPage }) => {
    await expect(adminPage.locator("text=Quick Actions")).toBeVisible()
    await expect(adminPage.locator('button:has-text("Add New Provider")')).toBeVisible()
    await expect(adminPage.locator('button:has-text("Generate Report")')).toBeVisible()
  })

  test("shows system status with indicators", async ({ adminPage }) => {
    await expect(adminPage.locator("text=System Status")).toBeVisible()
    await expect(adminPage.locator("text=API Status")).toBeVisible()
    await expect(adminPage.locator("text=Payment Gateway")).toBeVisible()
    await expect(adminPage.locator("text=Email Service")).toBeVisible()
  })

  test("shows recent alerts", async ({ adminPage }) => {
    await expect(adminPage.locator("text=Recent Alerts").first()).toBeVisible()
    await expect(adminPage.locator("text=High Volume Alert")).toBeVisible()
    await expect(adminPage.locator("text=Payment Issue")).toBeVisible()
  })

  test("orders table displays all 5 orders", async ({ adminPage }) => {
    await expect(adminPage.locator("text=Recent Orders")).toBeVisible()
    await expect(adminPage.locator("text=ORD001")).toBeVisible()
    await expect(adminPage.locator("text=ORD002")).toBeVisible()
    await expect(adminPage.locator("text=ORD003")).toBeVisible()
    await expect(adminPage.locator("text=ORD004")).toBeVisible()
    await expect(adminPage.locator("text=ORD005")).toBeVisible()
  })

  test("orders table has dropdown menus", async ({ adminPage }) => {
    const firstMenuButton = adminPage.locator("table button").first()
    await firstMenuButton.click()
    await expect(adminPage.locator("text=View Details").first()).toBeVisible()
    await expect(adminPage.locator("text=Edit Order").first()).toBeVisible()
  })
})
