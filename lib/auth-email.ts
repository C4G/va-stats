import { Resend } from "resend";

export async function sendAuthEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL must be configured to send authentication email.");
  }

  const { error } = await new Resend(apiKey).emails.send({
    from,
    to,
    subject,
    text,
  });

  if (error) throw new Error(`Resend rejected the authentication email: ${error.message}`);
}
