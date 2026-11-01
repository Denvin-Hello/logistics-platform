import { type NextRequest, NextResponse } from "next/server"
import { sweepAssignments } from "@/lib/assignment"
import { isAutoAssignmentEnabled } from "@/lib/assignment-policy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization")
  if (header === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 })
  }

  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await sweepAssignments(new Date())

  return NextResponse.json({
    ok: true,
    autoAssignmentEnabled: isAutoAssignmentEnabled(),
    ...result,
  })
}
