import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { db } from "@/lib/db";
import { CheckInButton } from "@/components/checkin-button";
import { daysUntil } from "@/lib/dates";

const STATUS_COPY: Record<string, { label: string; color: string; body: string }> = {
  ACTIVE: { label: "Active", color: "bg-emerald-100 text-emerald-800", body: "Everything's on track." },
  OVERDUE: {
    label: "Overdue",
    color: "bg-amber-100 text-amber-800",
    body: "You've missed a check-in. Check in now to reset the clock before your verifier is contacted.",
  },
  VERIFYING: {
    label: "Awaiting verification",
    color: "bg-red-100 text-red-800",
    body: "Your verifier has been asked to confirm what's happened. Check in now if this is a mistake.",
  },
  RELEASED: {
    label: "Released",
    color: "bg-stone-200 text-stone-800",
    body: "Your vault has been opened and delivered to your recipients.",
  },
};

export default async function DashboardPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const [recipientCount, messageCount, recentEvents] = await Promise.all([
    db.recipient.count({ where: { userId } }),
    db.message.count({ where: { userId } }),
    db.auditEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const dueAt = new Date(user.lastCheckInAt.getTime() + user.checkInIntervalDays * 24 * 60 * 60 * 1000);
  const daysLeft = daysUntil(dueAt);
  const status = STATUS_COPY[user.status];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-serif text-2xl font-semibold text-stone-900">Dashboard</h1>

      {!user.vaultSalt ? (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-900">Your vault isn&apos;t set up yet</p>
          <p className="mt-1 text-sm text-amber-800">
            Choose a passphrase and a verifier before you can add messages.
          </p>
          <Link
            href="/dashboard/vault"
            className="mt-3 inline-block rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Set up your vault
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
              <span className="text-xs text-stone-500">
                Last check-in {user.lastCheckInAt.toDateString()}
              </span>
            </div>
            <p className="mt-3 text-sm text-stone-600">{status.body}</p>
            {user.status !== "RELEASED" && (
              <p className="mt-1 text-xs text-stone-500">
                {daysLeft >= 0 ? `Next check-in due in ${daysLeft} day(s).` : `Check-in was due ${-daysLeft} day(s) ago.`}
              </p>
            )}
            {user.status !== "RELEASED" && (
              <div className="mt-4">
                <CheckInButton />
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Link
              href="/dashboard/vault"
              className="rounded-lg border border-stone-200 bg-white p-5 hover:border-stone-400"
            >
              <p className="text-sm font-medium text-stone-900">Vault</p>
              <p className="mt-1 text-sm text-stone-600">{messageCount} message(s) prepared</p>
            </Link>
            <Link
              href="/dashboard/recipients"
              className="rounded-lg border border-stone-200 bg-white p-5 hover:border-stone-400"
            >
              <p className="text-sm font-medium text-stone-900">Recipients</p>
              <p className="mt-1 text-sm text-stone-600">{recipientCount} recipient(s)</p>
            </Link>
          </div>

          <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm font-medium text-stone-900">Verifier</p>
            <p className="mt-1 text-sm text-stone-600">
              {user.verifierName} · {user.verifierEmail}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Checks in every {user.checkInIntervalDays} days, with a {user.graceDays}-day grace period.
            </p>
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-stone-900">Recent activity</p>
            <ul className="mt-2 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white text-sm">
              {recentEvents.map((event) => (
                <li key={event.id} className="flex justify-between px-4 py-2">
                  <span className="text-stone-700">{event.type}{event.detail ? ` — ${event.detail}` : ""}</span>
                  <span className="text-stone-400">{event.createdAt.toLocaleString()}</span>
                </li>
              ))}
              {recentEvents.length === 0 && <li className="px-4 py-2 text-stone-400">Nothing yet.</li>}
            </ul>
          </div>
        </>
      )}
    </main>
  );
}
