require("dotenv").config()
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  const users = [
    {
      email: "admin@tdlco.com",
      name: "Platform Admin",
      role: "ADMIN",
      status: "APPROVED",
    },
    {
      email: "ramsiladenvin@gmail.com",
      name: "Ramzi",
      role: "PROVIDER",
      status: "APPROVED",
      businessName: "TDL CO Logistics",
    },
    {
      email: "newprovider@test.com",
      name: "Provider Test",
      role: "PROVIDER",
      status: "PENDING",
      businessName: "Mokoena Logistics",
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    })
    console.log(`Seeded ${user.email} (${user.role}/${user.status})`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })