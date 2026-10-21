import { Resend } from "resend"
import nodemailer from "nodemailer"
import { ADMIN_EMAIL, COMPANY_NAME } from "./company"

interface SendEmailInput {
  to: string
  subject: string
  text: string
  html?: string
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function fromAddress() {
  return process.env.EMAIL_FROM || `${COMPANY_NAME} <${ADMIN_EMAIL}>`
}

// Resend is the primary transport; SMTP (EMAIL_SERVER) is a fallback so local
// development still works without an API key.
export async function sendEmail({ to, subject, text, html }: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY

  if (apiKey) {
    try {
      const resend = new Resend(apiKey)
      const { error } = await resend.emails.send({
        from: fromAddress(),
        to,
        subject,
        text,
        html: html || undefined,
      })
      if (error) throw new Error(error.message)
      return true
    } catch (err) {
      console.error("[email] Resend delivery failed, falling back to SMTP:", err)
    }
  }

  const server = process.env.EMAIL_SERVER
  if (!server) {
    console.warn("[email] Neither RESEND_API_KEY nor EMAIL_SERVER is configured; skipping email.")
    return false
  }

  const transporter = nodemailer.createTransport(server)
  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    html,
  })
  return true
}

export async function sendVerificationEmail({ identifier, url }: { identifier: string; url: string }) {
  const escapedUrl = escapeHtml(url)
  await sendEmail({
    to: identifier,
    subject: `Sign in to ${COMPANY_NAME}`,
    text: `Sign in to ${COMPANY_NAME}\n\nUse the link below to sign in. It expires shortly and can only be used once.\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Sign in to ${COMPANY_NAME}</h2>
        <p style="color: #334155;">Click the button below to sign in. This link expires shortly and can only be used once.</p>
        <p style="margin: 24px 0;">
          <a href="${escapedUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Sign in
          </a>
        </p>
        <p style="color: #64748b; font-size: 13px;">If you didn't request this email, you can safely ignore it.</p>
      </div>
    `,
  })
}

export async function sendProviderSignupNotification(input: {
  name: string
  businessName?: string | null
  email: string
  phone?: string | null
  serviceArea?: string | null
  vehicleType?: string | null
  vehicleCapacityKg?: number | null
  yearsExperience?: number | null
}) {
  const business = input.businessName?.trim() || "—"
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const reviewUrl = `${baseUrl}/admin/applications`

  const rows: Array<[string, string]> = [
    ["Name", input.name],
    ["Business", business],
    ["Email", input.email],
    ["Phone", input.phone?.trim() || "—"],
    ["Service area", input.serviceArea?.trim() || "—"],
    ["Vehicle", input.vehicleType?.trim() || "—"],
    ["Capacity (kg)", input.vehicleCapacityKg != null ? String(input.vehicleCapacityKg) : "—"],
    ["Experience (yrs)", input.yearsExperience != null ? String(input.yearsExperience) : "—"],
  ]

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New provider application: ${business}`,
    text: [
      `A new provider has applied to join ${COMPANY_NAME}.`,
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      `Review their application: ${reviewUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #0f172a;">New provider application</h2>
        <p style="color: #334155;">A new provider has applied to join <strong>${COMPANY_NAME}</strong>.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          ${rows
            .map(
              ([label, value]) =>
                `<tr><td style="padding: 6px 0; color: #64748b;">${escapeHtml(label)}</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(value)}</td></tr>`,
            )
            .join("")}
        </table>
        <a href="${escapeHtml(reviewUrl)}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Review application
        </a>
      </div>
    `,
  })
}
