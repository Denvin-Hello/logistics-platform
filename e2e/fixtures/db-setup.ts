import { PrismaClient } from "@prisma/client"

export async function getTestPrisma() {
  const p = new PrismaClient()
  return p
}

export async function cleanTestDb() {
  const p = new PrismaClient()
  try {
    await p.payment.deleteMany()
    await p.order.deleteMany()
    await p.session.deleteMany()
    await p.account.deleteMany()
    await p.verificationToken.deleteMany()
    await p.user.deleteMany()
  } catch {
    // Tables may not exist yet
  } finally {
    await p.$disconnect()
  }
}
