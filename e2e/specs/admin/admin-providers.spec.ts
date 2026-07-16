import { expect } from "@playwright/test"
import { test } from "../../fixtures/auth"

test.describe("Admin Providers (/admin/providers)", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto("/admin/providers")
  })

  test("shows provider management header", async ({ adminPage }) => {
    await expect(adminPage.locator("h1")).toContainText("Provider Management")
  })

  test("search bar is visible", async ({ adminPage }) => {
    await expect(adminPage.getByPlaceholder("Search providers by name, email, or ID")).toBeVisible()
  })

  test("displays 4 provider stat cards", async ({ adminPage }) => {
    await expect(adminPage.locator("text=Total Providers")).toBeVisible()
    await expect(adminPage.locator("text=Active Providers")).toBeVisible()
    await expect(adminPage.locator("text=Average Rating")).toBeVisible()
    await expect(adminPage.locator("text=Pending Applications")).toBeVisible()
  })

  test("provider stats show correct values", async ({ adminPage }) => {
    await expect(adminPage.locator("text=156")).toBeVisible()
    await expect(adminPage.locator("text=4.6")).toBeVisible()
    await expect(adminPage.locator("text=8").first()).toBeVisible()
  })

  test("provider table shows all 5 providers", async ({ adminPage }) => {
    await expect(adminPage.locator("text=Alex Driver")).toBeVisible()
    await expect(adminPage.locator("text=Maria Santos")).toBeVisible()
    await expect(adminPage.locator("text=James Thompson")).toBeVisible()
    await expect(adminPage.locator("text=Linda Chen")).toBeVisible()
    await expect(adminPage.locator("text=Robert Taylor")).toBeVisible()
  })

  test("provider table shows ratings", async ({ adminPage }) => {
    await expect(adminPage.locator("text=4.8").first()).toBeVisible()
    await expect(adminPage.locator("text=4.9")).toBeVisible()
  })

  test("add provider button is visible", async ({ adminPage }) => {
    await expect(adminPage.locator('button:has-text("Add Provider")')).toBeVisible()
  })

  test("provider status badges are visible", async ({ adminPage }) => {
    await expect(adminPage.locator("text=ACTIVE").first()).toBeVisible()
    await expect(adminPage.locator("text=INACTIVE").first()).toBeVisible()
    await expect(adminPage.locator("text=SUSPENDED").first()).toBeVisible()
  })
})
