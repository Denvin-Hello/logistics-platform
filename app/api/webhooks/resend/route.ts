import { Webhook } from "svix";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET!;
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };

  try {
    const wh = new Webhook(webhookSecret);
    wh.verify(payload, headers);
  } catch (err) {
    console.error("Invalid webhook signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(payload);

  if (event.type === "email.received") {
    const { email_id, from, to, subject, html, text } = event.data;

    try {
      await prisma.inboundEmail.create({
        data: {
          resendId: email_id,
          from,
          to: Array.isArray(to) ? to.join(", ") : to,
          subject,
          html: html ?? null,
          text: text ?? null,
        },
      });
      console.log("Saved inbound email:", { from, subject });
    } catch (err) {
      console.error("Failed to save inbound email:", err);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}