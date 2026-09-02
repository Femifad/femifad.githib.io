import { db } from "@/lib/db";
import { VerifyForm } from "@/components/verify-form";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verifierToken = await db.verifierToken.findUnique({ where: { token }, include: { user: true } });

  if (!verifierToken) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16 text-sm text-stone-600">This link isn&apos;t valid.</main>
    );
  }

  const { user } = verifierToken;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <h1 className="font-serif text-2xl font-semibold text-stone-900">Confirming on behalf of {user.email}</h1>
      <p className="mt-3 text-sm text-stone-600">
        You&apos;re listed as the trusted verifier for this account. {user.email} has not checked in for a while.
        If you can confirm what has happened and were given a recovery code, enter it below to release the
        messages they prepared to their recipients.
      </p>

      {verifierToken.usedAt ? (
        <p className="mt-6 rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-600">
          This link has already been used.
        </p>
      ) : user.status !== "VERIFYING" ? (
        <p className="mt-6 rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-600">
          {user.email} has since checked in - nothing further is needed here.
        </p>
      ) : (
        <div className="mt-6">
          <VerifyForm token={token} />
        </div>
      )}
    </main>
  );
}
