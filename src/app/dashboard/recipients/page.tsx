"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Recipient = { id: string; name: string; email: string; relationship: string | null };

export default function RecipientsPage() {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const res = await fetch("/api/recipients");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const body = await res.json();
    setRecipients(body.recipients ?? []);
  }

  // Fetch-on-mount, reusing `refresh` after mutations below.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    refresh();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, relationship: relationship || undefined }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong");
      return;
    }
    setName("");
    setEmail("");
    setRelationship("");
    refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/recipients/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="font-serif text-2xl font-semibold text-stone-900">Recipients</h1>
      <p className="mt-2 text-sm text-stone-600">The people who&apos;ll receive what you leave in your vault.</p>

      <form onSubmit={onSubmit} className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Relationship (optional)"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-3 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add recipient"}
        </button>
      </form>

      <ul className="mt-6 flex flex-col gap-3">
        {recipients?.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4"
          >
            <div>
              <p className="text-sm font-medium text-stone-900">{r.name}</p>
              <p className="text-xs text-stone-500">
                {r.email}
                {r.relationship ? ` · ${r.relationship}` : ""}
              </p>
            </div>
            <button onClick={() => remove(r.id)} className="text-sm font-medium text-red-600 underline">
              Remove
            </button>
          </li>
        ))}
        {recipients?.length === 0 && (
          <li className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-500">
            No recipients yet.
          </li>
        )}
      </ul>
    </main>
  );
}
