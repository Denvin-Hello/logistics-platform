import nodemailer from "nodemailer"
import { ADMIN_EMAIL, COMPANY_NAME } from "./company"

interface SendEmailInput {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail({ to, subject, text, html }: SendEmailInput) {
  const server = process.env.EMAIL_SERVER
  if (!server) {
    console.warn("[email] EMAIL_SERVER not configured; skipping email.")
    return
  }

  const transporter = nodemailer.createTransport(server)
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `${COMPANY_NAME} <${ADMIN_EMAIL}>`,
    to,
    subject,
    text,
    html,
  })
}

export async function sendProviderSignupNotification(input: {
  name: string
  businessName?: string | null
  email: string
}) {
  const business = input.businessName?.trim() || "—"
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const reviewUrl = `${baseUrl}/admin/applications`

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New provider application: ${business}`,
    text: [
      `A new provider has applied to join ${COMPANY_NAME}.`,
      "",
      `Name: ${input.name}`,
      `Business: ${business}`,
      `Email: ${input.email}`,
      "",
      `Review their application: ${reviewUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #0f172a;">New provider application</h2>
        <p style="color: #334155;">A new provider has applied to join <strong>${COMPANY_NAME}</strong>.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 6px 0; color: #64748b;">Name</td><td style="padding: 6px 0; font-weight: 600;">${input.name}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Business</td><td style="padding: 6px 0; font-weight: 600;">${business}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Email</td><td style="padding: 6px 0; font-weight: 600;">${input.email}</td></tr>
        </table>
        <a href="${reviewUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Review application
        </a>
      </div>
    `,
  })
}