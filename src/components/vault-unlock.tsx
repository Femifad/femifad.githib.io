"use client";

import { useState } from "react";
import { deriveVaultKeyRaw, verifyCanary } from "@/lib/vault-crypto";

export function VaultUnlock({
  canaryIv,
  canaryCipher,
  salt,
  onUnlock,
}: {
  canaryIv: string;
  canaryCipher: string;
  salt: string;
  onUnlock: (rawKey: Uint8Array) => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const rawKey = await deriveVaultKeyRaw(passphrase, salt);
    const ok = await verifyCanary(rawKey, canaryIv, canaryCipher);
    setLoading(false);
    if (!ok) {
      setError("That passphrase doesn't match this vault.");
      return;
    }
    onUnlock(rawKey);
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-stone-200 bg-white p-6">
      <h2 className="font-serif text-xl font-semibold text-stone-900">Unlock your vault</h2>
      <p className="mt-2 text-sm text-stone-600">
        Enter your passphrase to view or add messages. It&apos;s checked locally in your browser - it never
        reaches our servers.
      </p>
      <label className="mt-4 flex flex-col gap-1 text-sm">
        Passphrase
        <input
          type="password"
          autoFocus
          required
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        />
      </label>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {loading ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
