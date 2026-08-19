import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  // nodemailer accepts your SMTP URL from process.env
  const transporter = nodemailer.createTransport(process.env.EMAIL_SERVER);

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: "ramsiladenvin@gmail.com",
    subject: "SMTP test — MailerSend",
    text: "SMTP test to MailerSend: if you see this in your inbox, it works.",
    html: "<p>SMTP test to MailerSend: <strong>if you see this in your inbox, it works.</strong></p>",
  });

  console.log("Sent message id:", info.messageId || info);
}

main().catch(err => {
  console.error("Failed to send:", err);
  process.exit(1);
});
