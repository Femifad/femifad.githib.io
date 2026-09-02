"use client";

import { useState } from "react";

export function VerifyForm({ token }: { token: string }) {
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/verify/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), confirm }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong");
      return;
    }
    setDone(body.delivered);
  }

  if (done !== null) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-sm text-emerald-900">
        Confirmed. {done} message(s) have been sent to their recipient(s). Thank you for doing this.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-stone-200 bg-white p-6">
      <label className="flex flex-col gap-1 text-sm">
        Recovery code they gave you
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-md border border-stone-300 px-3 py-2 font-mono text-sm"
          placeholder="Paste the code here"
        />
      </label>
      <label className="mt-4 flex items-start gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5" />
        I confirm that this has genuinely happened, to the best of my knowledge.
      </label>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !confirm}
        className="mt-4 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Confirm and deliver"}
      </button>
    </form>
  );
}
