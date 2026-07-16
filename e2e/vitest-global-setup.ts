import { execSync } from "child_process"

const TEST_DB_URL = "file:./prisma/test.db"

export async function setup() {
  process.env.DATABASE_URL = TEST_DB_URL
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: "pipe",
      timeout: 30000,
    })
    console.log("Test database schema pushed successfully")
  } catch (e) {
    console.warn("Test database setup note:", (e as Error).message?.split("\n")[0])
  }
}

export async function teardown() {}
