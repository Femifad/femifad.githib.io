"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="text-sm text-stone-500 hover:text-stone-900"
    >
      Sign out
    </button>
  );
}
