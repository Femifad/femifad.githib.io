import "server-only";
import { db } from "@/lib/db";

/**
 * Local dev / demo email adapter. Every send is written to OutboxEmail
 * (viewable at /admin/outbox) so the app is fully runnable without an email
 * provider. Set RESEND_API_KEY to also send real mail via Resend.
 */
export async function sendMail(to: string, subject: string, body: string) {
  await db.outboxEmail.create({ data: { to, subject, body } });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Legacy Notes <notify@example.com>",
    to,
    subject,
    text: body,
  });
}

export function appUrl(path: string): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
