import { db } from "@/lib/db";
import { isPast } from "@/lib/dates";

export default async function DeliverPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const grant = await db.deliveryGrant.findUnique({
    where: { token },
    include: { recipient: { include: { user: true } } },
  });

  if (!grant) {
    return <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16 text-sm text-stone-600">This link isn&apos;t valid.</main>;
  }
  if (isPast(grant.expiresAt)) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16 text-sm text-stone-600">
        This link has expired. Contact support if you still need access.
      </main>
    );
  }

  const messages = await db.message.findMany({
    where: { recipientId: grant.recipientId, status: "DELIVERED" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <h1 className="font-serif text-2xl font-semibold text-stone-900">
        {grant.recipient.user.email} left you something
      </h1>
      <p className="mt-2 text-sm text-stone-600">
        This link is private to {grant.recipient.name} and works until {grant.expiresAt.toDateString()}.
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {messages.map((m) => (
          <li key={m.id} className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {m.kind === "vault-item" ? "Password / PIN" : "Note"}
            </p>
            <p className="mt-1 text-base font-medium text-stone-900">{m.title}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-800">{m.deliveredPlaintext}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
