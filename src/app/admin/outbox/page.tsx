import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function OutboxPage() {
  if (process.env.NODE_ENV === "production" && process.env.RESEND_API_KEY) {
    // In production with real email configured, don't expose this debug view.
    notFound();
  }

  const emails = await db.outboxEmail.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-serif text-2xl font-semibold text-stone-900">Outbox (dev)</h1>
      <p className="mt-2 text-sm text-stone-600">
        Every email the app has sent - check-in reminders, verifier requests, delivery links. Real email only
        goes out when RESEND_API_KEY is configured.
      </p>
      <ul className="mt-6 flex flex-col gap-4">
        {emails.map((email) => (
          <li key={email.id} className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="flex justify-between text-xs text-stone-500">
              <span>{email.to}</span>
              <span>{email.createdAt.toLocaleString()}</span>
            </div>
            <p className="mt-1 text-sm font-medium text-stone-900">{email.subject}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{email.body}</p>
          </li>
        ))}
        {emails.length === 0 && <li className="text-sm text-stone-500">No mail sent yet.</li>}
      </ul>
    </main>
  );
}
