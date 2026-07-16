import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  // nodemailer accepts your SMTP URL from process.env
  const transporter = nodemailer.createTransport(process.env.EMAIL_SERVER);

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: "ramsiladenvin@gmail.com",
    subject: "SMTP test — Mailtrap",
    text: "SMTP test to Mailtrap: if you see this in the Mailtrap inbox, it works.",
    html: "<p>SMTP test to Mailtrap: <strong>if you see this in the Mailtrap inbox, it works.</strong></p>",
  });

  console.log("Sent message id:", info.messageId || info);
}

main().catch(err => {
  console.error("Failed to send:", err);
  process.exit(1);
});
