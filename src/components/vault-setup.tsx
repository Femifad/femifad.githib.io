"use client";

import { useState } from "react";
import { newSalt, deriveVaultKeyRaw, makeCanary } from "@/lib/vault-crypto";
import { splitSecret, toBase64Url } from "@/lib/secret-split";

export function VaultSetup({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"form" | "recovery-code">("form");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [verifierName, setVerifierName] = useState("");
  const [verifierEmail, setVerifierEmail] = useState("");
  const [checkInIntervalDays, setCheckInIntervalDays] = useState(30);
  const [graceDays, setGraceDays] = useState(7);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [savedCode, setSavedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (passphrase.length < 12) {
      setError("Use a passphrase of at least 12 characters - this is the only thing protecting your vault.");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError("Passphrases don't match");
      return;
    }
    setLoading(true);

    const salt = newSalt();
    const rawKey = await deriveVaultKeyRaw(passphrase, salt);
    const canary = await makeCanary(rawKey);
    const { shareA, shareB } = splitSecret(rawKey);

    const res = await fetch("/api/vault/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salt,
        canaryIv: canary.iv,
        canaryCipher: canary.cipherText,
        serverShare: toBase64Url(shareA),
        verifierName,
        verifierEmail,
        checkInIntervalDays,
        graceDays,
      }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong");
      return;
    }

    setRecoveryCode(toBase64Url(shareB));
    setStep("recovery-code");
  }

  if (step === "recovery-code") {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-xl font-semibold text-stone-900">Save your verifier&apos;s recovery code</h2>
        <p className="mt-2 text-sm text-stone-600">
          This code is one half of your vault key - we only ever keep the other half. Give it to{" "}
          <strong>{verifierName}</strong> now, through a channel we don&apos;t control (in person, a phone call,
          a messaging app). <strong>We cannot show this to you again.</strong> Without it, your vault can never
          be opened - not even by us.
        </p>
        <p className="mt-4 select-all break-all rounded-md bg-stone-100 p-4 font-mono text-sm">{recoveryCode}</p>
        <label className="mt-4 flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" checked={savedCode} onChange={(e) => setSavedCode(e.target.checked)} />
          I&apos;ve saved this and will send it to {verifierName || "my verifier"} separately.
        </label>
        <button
          disabled={!savedCode}
          onClick={onDone}
          className="mt-4 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          Continue to my vault
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-stone-200 bg-white p-6">
      <h2 className="font-serif text-xl font-semibold text-stone-900">Set up your vault</h2>
      <p className="mt-2 text-sm text-stone-600">
        Your passphrase encrypts everything you write here, in your browser. We never see it or store it - so
        there&apos;s no way to recover it if you forget it. Write it down somewhere safe.
      </p>

      <div className="mt-5 grid gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Vault passphrase (12+ characters)
          <input
            type="password"
            required
            minLength={12}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Confirm passphrase
          <input
            type="password"
            required
            value={confirmPassphrase}
            onChange={(e) => setConfirmPassphrase(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </label>

        <hr className="border-stone-200" />
        <p className="text-sm font-medium text-stone-900">Your verifier</p>
        <p className="text-xs text-stone-500">
          One trusted person who will confirm what&apos;s happened before anything is delivered.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          Their name
          <input
            required
            value={verifierName}
            onChange={(e) => setVerifierName(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Their email
          <input
            type="email"
            required
            value={verifierEmail}
            onChange={(e) => setVerifierEmail(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </label>

        <hr className="border-stone-200" />
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Check in every (days)
            <input
              type="number"
              min={1}
              max={365}
              value={checkInIntervalDays}
              onChange={(e) => setCheckInIntervalDays(Number(e.target.value))}
              className="rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Grace period (days)
            <input
              type="number"
              min={1}
              max={90}
              value={graceDays}
              onChange={(e) => setGraceDays(Number(e.target.value))}
              className="rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            />
          </label>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-5 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {loading ? "Setting up…" : "Create vault"}
      </button>
    </form>
  );
}
