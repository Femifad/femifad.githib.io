import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";

export async function SiteHeader() {
  const userId = await requireUserId();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-lg font-semibold tracking-tight">
          Legacy Notes
        </Link>
        <nav className="flex items-center gap-5">
          {userId ? (
            <>
              <Link href="/dashboard" className="text-sm text-stone-600 hover:text-stone-900">
                Dashboard
              </Link>
              <Link href="/dashboard/vault" className="text-sm text-stone-600 hover:text-stone-900">
                Vault
              </Link>
              <Link href="/dashboard/recipients" className="text-sm text-stone-600 hover:text-stone-900">
                Recipients
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-stone-600 hover:text-stone-900">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
