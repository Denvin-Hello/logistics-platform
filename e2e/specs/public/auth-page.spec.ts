import { test, expect } from "@playwright/test"

test.describe("Auth Page (/auth)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth")
  })

  test("displays sign-in and sign-up tabs", async ({ page }) => {
    await expect(page.locator("text=Welcome")).toBeVisible()
    await expect(page.locator('role=tab[name="Sign In"]')).toBeVisible()
    await expect(page.locator('role=tab[name="Sign Up"]')).toBeVisible()
  })

  test("sign-in tab has email input and OAuth buttons", async ({ page }) => {
    await page.locator('role=tab[name="Sign In"]').click()
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator('button:has-text("Send Sign-In Link")')).toBeVisible()
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible()
    await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible()
  })

  test("sign-up tab has account type selector", async ({ page }) => {
    await page.locator('role=tab[name="Sign Up"]').click()
    await expect(page.locator("text=Account Type")).toBeVisible()
    await expect(page.locator("#signup-email")).toBeVisible()
    await expect(page.locator('button:has-text("Create Account")')).toBeVisible()
  })

  test("sign-up account type can be changed to provider", async ({ page }) => {
    await page.locator('role=tab[name="Sign Up"]').click()
    await page.locator('[role=combobox]').click()
    await page.locator('[role=option]', { hasText: "Delivery Provider" }).click()
    await expect(page.locator('[role=combobox]')).toContainText("Delivery Provider")
  })

  test("shows loading state on email sign-in submission", async ({ page }) => {
    await page.locator("#email").fill("test@example.com")
    await page.locator('button:has-text("Send Sign-In Link")').click()
    await expect(page.locator('button:has-text("Sending link...")')).toBeVisible()
  })

  test("validates email field is required", async ({ page }) => {
    const emailInput = page.locator("#email")
    await expect(emailInput).toHaveAttribute("required")
  })
})
