"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CheckInButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/checkin", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Couldn't check in");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={onClick}
        disabled={loading}
        className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {loading ? "Checking in…" : "I'm still here - check in"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
