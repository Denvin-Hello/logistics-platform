import { PrismaClient } from "@prisma/client"

async function main() {
  const p = new PrismaClient({ datasources: { db: { url: "file:./prisma/test.db" } } })
  const users = await p.user.findMany()
  console.log("Users:", users.length, JSON.stringify(users.map(u => ({ id: u.id, email: u.email, role: u.role }))))
  const sessions = await p.session.findMany()
  console.log("Sessions:", sessions.length, JSON.stringify(sessions.map(s => ({ token: s.sessionToken, userId: s.userId }))))
  await p.$disconnect()
}

main().catch(console.error)
