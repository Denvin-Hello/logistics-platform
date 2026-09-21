import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  const { data, error } = await resend.emails.send({
    from:"LoggiConnect <hello@loggiconnect.co.za>",
    to: ["ramsiladenvin@gmail.com"],
    subject: "LogiConnect - Resend Test",
    html: `
      <h2>Resend is working!</h2>
      <p>This is a test email from the LogiConnect project.</p>
      <p>If you received this, the Resend integration is working correctly.</p>
    `,
  });

  if (error) {
    console.error("Email failed:");
    console.error(error);
    process.exit(1);
  }

  console.log("Email sent successfully!");
  console.log("Message ID:", data?.id);
}

main();