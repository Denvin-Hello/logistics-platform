import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { Resend } from "resend"
import { z } from "zod"
import { isSameOrigin, rateLimit } from "@/lib/security"

const resend = new Resend(process.env.RESEND_API_KEY)

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Valid email is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(4000),
})

export async function POST(req: NextRequest) {
  const rate = rateLimit(req, { limit: 3, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = contactSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid request." },
        { status: 400 }
      )
    }

    const { name, email, message } = parsed.data
    const safeName = name.replace(/[\r\n]+/g, " ")

    const { error } = await resend.emails.send({
      from: "LoggiConnect <hello@loggiconnect.co.za>",
      to: "ramsiladenvin@gmail.com",
      replyTo: email,
      subject: `New message from ${safeName}`,
      text: `From: ${safeName} (${email})\n\n${message}`,
    })

    if (error) {
      console.error("Contact email error", error)
      return NextResponse.json({ ok: false, error: "Could not send message." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Contact route error", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}