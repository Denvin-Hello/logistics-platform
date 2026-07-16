import { expect } from "@playwright/test"
import { test } from "../../fixtures/auth"

test.describe("Customer Tracking (/customer/tracking)", () => {
  test.beforeEach(async ({ customerPage }) => {
    await customerPage.goto("/customer/tracking")
  })

  test("displays header and description", async ({ customerPage }) => {
    await expect(customerPage.locator("h1")).toContainText("Track Your Packages")
    await expect(customerPage.locator("text=Enter a tracking number to see real-time updates")).toBeVisible()
  })

  test("shows tracking form", async ({ customerPage }) => {
    await expect(customerPage.locator("#tracking-number")).toBeVisible()
    await expect(customerPage.locator('button:has-text("Track Package")')).toBeVisible()
  })

  test("tracks ORD001 and shows timeline", async ({ customerPage }) => {
    await customerPage.locator("#tracking-number").fill("ORD001")
    await customerPage.locator('button:has-text("Track Package")').click()
    await expect(customerPage.locator("text=Tracking #ORD001")).toBeVisible()
    await expect(customerPage.locator("text=Order Placed")).toBeVisible()
    await expect(customerPage.locator("text=Picked Up")).toBeVisible()
    await expect(customerPage.locator("text=Delivery Timeline")).toBeVisible()
  })

  test("shows live map toggle for in-transit orders", async ({ customerPage }) => {
    await customerPage.locator("#tracking-number").fill("ORD001")
    await customerPage.locator('button:has-text("Track Package")').click()
    const liveMapBtn = customerPage.locator('button:has-text("Live Map")')
    await expect(liveMapBtn).toBeVisible()
    await liveMapBtn.click()
    await expect(customerPage.locator("text=Live Tracking")).toBeVisible()
    await expect(customerPage.locator("text=Alex Driver")).toBeVisible()
  })

  test("shows not found message for invalid number", async ({ customerPage }) => {
    await customerPage.locator("#tracking-number").fill("INVALID")
    await customerPage.locator('button:has-text("Track Package")').click()
    await expect(customerPage.locator("text=Tracking Number Not Found")).toBeVisible()
    await expect(customerPage.locator("button:has-text('Try Again')")).toBeVisible()
  })

  test("back button returns to search", async ({ customerPage }) => {
    await customerPage.locator("#tracking-number").fill("ORD001")
    await customerPage.locator('button:has-text("Track Package")').click()
    await customerPage.locator('button:has-text("Back to Search")').click()
    await expect(customerPage.locator("h1")).toContainText("Track Your Packages")
  })
})
