import { expect } from "@playwright/test"
import { test } from "../../fixtures/auth"

test.describe("Admin Customers (/admin/customers)", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto("/admin/customers")
  })

  test("shows customer management header", async ({ adminPage }) => {
    await expect(adminPage.locator("h1")).toContainText("Customer Management")
  })

  test("search and filter bar is visible", async ({ adminPage }) => {
    await expect(adminPage.getByPlaceholder("Search customers by name, email, or ID")).toBeVisible()
    await expect(adminPage.locator('button:has-text("Filters")')).toBeVisible()
  })

  test("displays 4 customer stat cards", async ({ adminPage }) => {
    await expect(adminPage.locator("text=Total Customers")).toBeVisible()
    await expect(adminPage.locator("text=Active Customers").first()).toBeVisible()
    await expect(adminPage.locator("text=New This Month")).toBeVisible()
    await expect(adminPage.locator("text=Avg Orders/Customer")).toBeVisible()
  })

  test("customer table shows all 5 customers", async ({ adminPage }) => {
    await expect(adminPage.locator("text=John Smith")).toBeVisible()
    await expect(adminPage.locator("text=Sarah Johnson")).toBeVisible()
    await expect(adminPage.locator("text=Mike Wilson")).toBeVisible()
    await expect(adminPage.locator("text=Lisa Brown")).toBeVisible()
    await expect(adminPage.locator("text=David Lee")).toBeVisible()
  })

  test("customer table shows status badges", async ({ adminPage }) => {
    await expect(adminPage.locator("text=ACTIVE").first()).toBeVisible()
    await expect(adminPage.locator("text=INACTIVE").first()).toBeVisible()
    await expect(adminPage.locator("text=SUSPENDED").first()).toBeVisible()
  })

  test("add customer button is visible", async ({ adminPage }) => {
    await expect(adminPage.locator('button:has-text("Add Customer")')).toBeVisible()
  })

  test("each customer row has dropdown with actions", async ({ adminPage }) => {
    const rows = adminPage.locator("table tbody tr")
    await expect(rows).toHaveCount(5)
    const firstRowMenuBtn = rows.first().locator('button[aria-haspopup="menu"]')
    await expect(firstRowMenuBtn).toBeVisible()
  })
})
