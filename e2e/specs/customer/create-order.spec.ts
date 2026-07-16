import { expect } from "@playwright/test"
import { test } from "../../fixtures/auth"

test.describe("Create Order (/customer/new-order)", () => {
  test.beforeEach(async ({ customerPage }) => {
    await customerPage.goto("/customer/new-order")
    // Intercept the API call to prevent actual DB modification
    await customerPage.route("**/api/orders/create", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          order: {
            orderId: "ORDTEST123",
            amount: 205,
            description: "LogiConnect Delivery Service",
            customerEmail: "customer@test.com",
            customerName: "Test Customer",
          },
        }),
      })
    })
  })

  test("displays the order form with all sections", async ({ customerPage }) => {
    await expect(customerPage.locator("h1")).toContainText("Create New Delivery Order")
    await expect(customerPage.locator("text=Pickup Information")).toBeVisible()
    await expect(customerPage.locator("text=Delivery Information")).toBeVisible()
    await expect(customerPage.locator("text=Package Information")).toBeVisible()
  })

  test("pickup form fields are visible", async ({ customerPage }) => {
    await expect(customerPage.locator("#pickup-name")).toBeVisible()
    await expect(customerPage.locator("#pickup-phone")).toBeVisible()
    await expect(customerPage.locator("#pickup-email")).toBeVisible()
    await expect(customerPage.locator("#pickup-address")).toBeVisible()
    await expect(customerPage.locator("#pickup-date")).toBeVisible()
  })

  test("delivery form fields are visible", async ({ customerPage }) => {
    await expect(customerPage.locator("#delivery-name")).toBeVisible()
    await expect(customerPage.locator("#delivery-phone")).toBeVisible()
    await expect(customerPage.locator("#delivery-address")).toBeVisible()
    await expect(customerPage.locator("#delivery-instructions")).toBeVisible()
  })

  test("package form fields are visible", async ({ customerPage }) => {
    await expect(customerPage.locator("#package-weight")).toBeVisible()
    await expect(customerPage.locator("#package-length")).toBeVisible()
    await expect(customerPage.locator("#package-width")).toBeVisible()
    await expect(customerPage.locator("#package-height")).toBeVisible()
    await expect(customerPage.locator("#package-description")).toBeVisible()
  })

  test("checkbox options are visible", async ({ customerPage }) => {
    await expect(customerPage.locator('label:has-text("Fragile")')).toBeVisible()
    await expect(customerPage.locator('label:has-text("Add insurance coverage")')).toBeVisible()
    await expect(customerPage.locator('label:has-text("Require signature on delivery")')).toBeVisible()
  })

  test("order summary sidebar shows base fee", async ({ customerPage }) => {
    await expect(customerPage.locator("text=Order Summary")).toBeVisible()
    await expect(customerPage.locator("text=Base delivery fee")).toBeVisible()
    await expect(customerPage.locator("text=R120")).toBeVisible()
  })

  test("submit button says Proceed to Payment", async ({ customerPage }) => {
    await expect(customerPage.locator('button:has-text("Proceed to Payment")')).toBeVisible()
  })

  test("filling form and submitting shows payment screen", async ({ customerPage }) => {
    await customerPage.locator("#pickup-name").fill("John Test")
    await customerPage.locator("#pickup-phone").fill("+27 82 123 4567")
    await customerPage.locator("#pickup-email").fill("test@example.com")
    await customerPage.locator("#pickup-address").fill("123 Test St")
    await customerPage.locator("#pickup-date").fill("2026-07-20")
    await customerPage.locator("#delivery-name").fill("Jane Test")
    await customerPage.locator("#delivery-phone").fill("+27 83 234 5678")
    await customerPage.locator("#delivery-address").fill("456 Test Ave")
    await customerPage.locator("#package-weight").fill("2.5")
    await customerPage.locator('button:has-text("Proceed to Payment")').click()
    await expect(customerPage.locator("text=Secure Payment").first()).toBeVisible()
    await expect(customerPage.locator("text=Pay R205.00 Now")).toBeVisible()
  })

  test("payment screen shows order summary and payment methods", async ({ customerPage }) => {
    await customerPage.locator("#pickup-name").fill("John Test")
    await customerPage.locator("#pickup-phone").fill("+27 82 123 4567")
    await customerPage.locator("#pickup-email").fill("test@example.com")
    await customerPage.locator("#pickup-address").fill("123 Test St")
    await customerPage.locator("#pickup-date").fill("2026-07-20")
    await customerPage.locator("#delivery-name").fill("Jane Test")
    await customerPage.locator("#delivery-phone").fill("+27 83 234 5678")
    await customerPage.locator("#delivery-address").fill("456 Test Ave")
    await customerPage.locator("#package-weight").fill("2.5")
    await customerPage.locator('button:has-text("Proceed to Payment")').click()
    await expect(customerPage.locator("text=Credit/Debit Card")).toBeVisible()
    await expect(customerPage.locator("text=EFT").first()).toBeVisible()
    await expect(customerPage.locator("text=Instant EFT")).toBeVisible()
  })

  test("error message displays when API fails", async ({ customerPage }) => {
    await customerPage.route("**/api/orders/create", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to create order", success: false }),
      })
    })
    await customerPage.locator("#pickup-name").fill("John Test")
    await customerPage.locator("#pickup-phone").fill("+27 82 123 4567")
    await customerPage.locator("#pickup-email").fill("test@example.com")
    await customerPage.locator("#pickup-address").fill("123 Test St")
    await customerPage.locator("#pickup-date").fill("2026-07-20")
    await customerPage.locator("#delivery-name").fill("Jane Test")
    await customerPage.locator("#delivery-phone").fill("+27 83 234 5678")
    await customerPage.locator("#delivery-address").fill("456 Test Ave")
    await customerPage.locator("#package-weight").fill("2.5")
    await customerPage.locator('button:has-text("Proceed to Payment")').click()
    await expect(customerPage.locator("text=Failed to create order").first()).toBeVisible()
  })
})
