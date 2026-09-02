"use client";

import { useEffect, useState } from "react";
import { encryptWithKey, decryptWithKey } from "@/lib/vault-crypto";

type Recipient = { id: string; name: string; email: string };
type Message = {
  id: string;
  title: string;
  kind: string;
  status: string;
  cipherIv: string;
  cipherText: string;
  createdAt: string;
  recipient: { name: string; email: string };
};

export function VaultContents({ rawKey, onLock }: { rawKey: Uint8Array; onLock: () => void }) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const [rRes, mRes] = await Promise.all([fetch("/api/recipients"), fetch("/api/messages")]);
    const rBody = await rRes.json();
    const mBody = await mRes.json();
    setRecipients(rBody.recipients ?? []);
    setMessages(mBody.messages ?? []);
    setLoaded(true);
  }

  // Fetch-on-mount, reusing `refresh` after mutations below.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refresh();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2">
        <p className="text-sm text-emerald-900">Vault unlocked for this session.</p>
        <button onClick={onLock} className="text-sm font-medium text-emerald-800 underline">
          Lock
        </button>
      </div>

      {recipients.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Add a recipient first, from the Recipients page, before you can write a message.
        </div>
      ) : (
        <Composer recipients={recipients} rawKey={rawKey} onAdded={refresh} />
      )}

      <div>
        <p className="text-sm font-medium text-stone-900">Your messages</p>
        <ul className="mt-2 flex flex-col gap-3">
          {messages.map((m) => (
            <MessageRow key={m.id} message={m} rawKey={rawKey} onDeleted={refresh} />
          ))}
          {loaded && messages.length === 0 && (
            <li className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-500">
              Nothing here yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Composer({
  recipients,
  rawKey,
  onAdded,
}: {
  recipients: Recipient[];
  rawKey: Uint8Array;
  onAdded: () => void;
}) {
  const [recipientId, setRecipientId] = useState(recipients[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"note" | "vault-item">("note");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { iv, cipherText } = await encryptWithKey(rawKey, body);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, title, kind, cipherIv: iv, cipherText }),
    });
    const resBody = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(resBody.error ?? "Something went wrong");
      return;
    }
    setTitle("");
    setBody("");
    onAdded();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-stone-200 bg-white p-5">
      <p className="text-sm font-medium text-stone-900">Write a message</p>
      <div className="mt-3 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            To
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.email})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Type
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "note" | "vault-item")}
              className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="note">Note / letter</option>
              <option value="vault-item">Password or PIN</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "vault-item" ? "e.g. Email account password" : "e.g. Something I never said"}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Message
          <textarea
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {loading ? "Encrypting…" : "Save to vault"}
      </button>
    </form>
  );
}

function MessageRow({
  message,
  rawKey,
  onDeleted,
}: {
  message: Message;
  rawKey: Uint8Array;
  onDeleted: () => void;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reveal() {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    const plain = await decryptWithKey(rawKey, message.cipherIv, message.cipherText);
    setRevealed(plain ?? "(couldn't decrypt with this passphrase)");
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/messages/${message.id}`, { method: "DELETE" });
    setBusy(false);
    onDeleted();
  }

  return (
    <li className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-stone-900">{message.title}</p>
          <p className="text-xs text-stone-500">
            {message.kind === "vault-item" ? "Password / PIN" : "Note"} · for {message.recipient.name} ·{" "}
            {message.status === "DELIVERED" ? "delivered" : "pending"}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={reveal} className="text-sm font-medium text-stone-700 underline">
            {revealed !== null ? "Hide" : "Reveal"}
          </button>
          <button onClick={remove} disabled={busy} className="text-sm font-medium text-red-600 underline">
            Delete
          </button>
        </div>
      </div>
      {revealed !== null && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-stone-100 p-3 text-sm text-stone-800">{revealed}</p>
      )}
    </li>
  );
}
