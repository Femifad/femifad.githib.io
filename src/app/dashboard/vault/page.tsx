"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VaultSetup } from "@/components/vault-setup";
import { VaultUnlock } from "@/components/vault-unlock";
import { VaultContents } from "@/components/vault-contents";

type Me = {
  vaultConfigured: boolean;
  vaultSalt: string | null;
  vaultCanaryIv: string | null;
  vaultCanaryCipher: string | null;
};

export default function VaultPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [rawKey, setRawKey] = useState<Uint8Array | null>(null);

  useEffect(() => {
    fetch("/api/me").then(async (res) => {
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      setMe(await res.json());
    });
  }, [router]);

  if (!me) return <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 text-sm text-stone-500">Loading…</main>;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="font-serif text-2xl font-semibold text-stone-900">Vault</h1>

      <div className="mt-6">
        {!me.vaultConfigured && <VaultSetup onDone={() => window.location.reload()} />}

        {me.vaultConfigured && !rawKey && (
          <VaultUnlock
            salt={me.vaultSalt!}
            canaryIv={me.vaultCanaryIv!}
            canaryCipher={me.vaultCanaryCipher!}
            onUnlock={setRawKey}
          />
        )}

        {me.vaultConfigured && rawKey && <VaultContents rawKey={rawKey} onLock={() => setRawKey(null)} />}
      </div>
    </main>
  );
}
