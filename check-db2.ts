import { PrismaClient } from "@prisma/client"
import { execSync } from "child_process"

const TEST_DB_URL = "file:./prisma/test.db"

async function seedTestData(prisma: PrismaClient) {
  console.log("Cleaning old data...")
  await prisma.session.deleteMany()
  console.log("  sessions done")
  await prisma.account.deleteMany()
  console.log("  accounts done")
  await prisma.order.deleteMany()
  console.log("  orders done")
  await prisma.user.deleteMany()
  console.log("  users done")

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  console.log("Creating users...")
  const customer = await prisma.user.create({
    data: { id: "e2e-customer-1", name: "E2E Customer", email: "e2e-customer@test.com", role: "CUSTOMER" },
  })
  console.log("  customer:", customer.id)

  const provider = await prisma.user.create({
    data: { id: "e2e-provider-1", name: "E2E Provider", email: "e2e-provider@test.com", role: "PROVIDER" },
  })
  console.log("  provider:", provider.id)

  const admin = await prisma.user.create({
    data: { id: "e2e-admin-1", name: "E2E Admin", email: "e2e-admin@test.com", role: "ADMIN" },
  })
  console.log("  admin:", admin.id)

  console.log("Creating sessions...")
  await prisma.session.create({
    data: { sessionToken: "e2e-session-customer", userId: customer.id, expires },
  })
  console.log("  customer session done")
  await prisma.session.create({
    data: { sessionToken: "e2e-session-provider", userId: provider.id, expires },
  })
  console.log("  provider session done")
  await prisma.session.create({
    data: { sessionToken: "e2e-session-admin", userId: admin.id, expires },
  })
  console.log("  admin session done")

  console.log("Seed complete!")
}

async function main() {
  console.log("Pushing schema...")
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
    timeout: 30000,
  })
  console.log("Schema pushed")

  process.env.DATABASE_URL = TEST_DB_URL
  const prisma = new PrismaClient()
  console.log("PrismaClient created with URL:", process.env.DATABASE_URL)

  try {
    await seedTestData(prisma)
  } catch (e) {
    console.error("Seed error:", e)
  } finally {
    await prisma.$disconnect()
  }

  // Verify
  const p2 = new PrismaClient()
  const users = await p2.user.findMany()
  console.log("After seed - Users:", users.length)
  const sessions = await p2.session.findMany()
  console.log("After seed - Sessions:", sessions.length)
  await p2.$disconnect()
}

main().catch(console.error)
