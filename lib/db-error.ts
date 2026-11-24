import { NextResponse } from "next/server"

export function handleDbError(err: unknown) {
  if (err instanceof Error) {
    const message = err.message

    // Neon/PostgreSQL connection errors
    if (
      message.includes("ConnectionReset") ||
      message.includes("connection is not open") ||
      message.includes("Client has encountered a connection error") ||
      message.includes("socket hang up") ||
      message.includes("ECONNRESET") ||
      message.includes("ECONNREFUSED") ||
      message.includes("ETIMEDOUT")
    ) {
      console.error("[db] Database connection error:", message)
      return NextResponse.json(
        {
          error: "Database connection unavailable. The database may be paused or restarting. Please try again shortly.",
        },
        { status: 503 },
      )
    }

    // Prisma-specific errors
    if (message.includes("P1001")) {
      console.error("[db] Prisma connection error: Can't reach database server")
      return NextResponse.json(
        {
          error: "Database server cannot be reached. Please check your connection and try again.",
        },
        { status: 503 },
      )
    }

    if (message.includes("P1008")) {
      console.error("[db] Prisma connection error: Database connection deadline exceeded")
      return NextResponse.json(
        {
          error: "Database connection timed out. Please try again shortly.",
        },
        { status: 504 },
      )
    }

    if (message.includes("P1017")) {
      console.error("[db] Prisma connection error: SSL/TLS error")
      return NextResponse.json(
        {
          error: "Database SSL connection error. Please contact support.",
        },
        { status: 503 },
      )
    }
  }

  console.error("[db] Unexpected error:", err)
  return NextResponse.json(
    { error: "An unexpected error occurred. Please try again later." },
    { status: 500 },
  )
}
