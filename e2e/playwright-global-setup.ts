import { PrismaClient } from "@prisma/client"
import { execSync } from "child_process"

const TEST_DB_URL = "file:./prisma/test.db"

async function seedTestData(prisma: PrismaClient) {
  await prisma.payment.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.order.deleteMany()
  await prisma.user.deleteMany()

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const customer = await prisma.user.create({
    data: {
      id: "e2e-customer-1",
      name: "E2E Customer",
      email: "e2e-customer@test.com",
      role: "CUSTOMER",
    },
  })

  const provider = await prisma.user.create({
    data: {
      id: "e2e-provider-1",
      name: "E2E Provider",
      email: "e2e-provider@test.com",
      role: "PROVIDER",
    },
  })

  const admin = await prisma.user.create({
    data: {
      id: "e2e-admin-1",
      name: "E2E Admin",
      email: "e2e-admin@test.com",
      role: "ADMIN",
    },
  })

  await prisma.session.create({
    data: { sessionToken: "e2e-session-customer", userId: customer.id, expires },
  })

  await prisma.session.create({
    data: { sessionToken: "e2e-session-provider", userId: provider.id, expires },
  })

  await prisma.session.create({
    data: { sessionToken: "e2e-session-admin", userId: admin.id, expires },
  })

  console.log("E2E test users and sessions seeded")
}

async function globalSetup() {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
    timeout: 30000,
  })
  console.log("E2E database schema pushed")

  process.env.DATABASE_URL = TEST_DB_URL
  const prisma = new PrismaClient()

  try {
    await seedTestData(prisma)
  } catch (e) {
    console.error("E2E seed error:", e)
  } finally {
    await prisma.$disconnect()
  }
}

export default globalSetup
