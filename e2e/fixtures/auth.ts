import { test as base, type Page } from "@playwright/test"

export const SESSION_TOKENS = {
  CUSTOMER: "e2e-session-customer",
  PROVIDER: "e2e-session-provider",
  ADMIN: "e2e-session-admin",
}

export async function setSessionCookie(page: Page, sessionToken: string) {
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    },
  ])
}

export const test = base.extend<{
  customerPage: Page
  providerPage: Page
  adminPage: Page
}>({
  customerPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    await context.addCookies([
      { name: "next-auth.session-token", value: SESSION_TOKENS.CUSTOMER, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" as const },
    ])
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
  providerPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    await context.addCookies([
      { name: "next-auth.session-token", value: SESSION_TOKENS.PROVIDER, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" as const },
    ])
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    await context.addCookies([
      { name: "next-auth.session-token", value: SESSION_TOKENS.ADMIN, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" as const },
    ])
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})
