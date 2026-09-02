import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  return NextResponse.json({
    email: user.email,
    status: user.status,
    lastCheckInAt: user.lastCheckInAt,
    checkInIntervalDays: user.checkInIntervalDays,
    graceDays: user.graceDays,
    verifierName: user.verifierName,
    verifierEmail: user.verifierEmail,
    vaultConfigured: user.vaultSalt !== null,
    vaultSalt: user.vaultSalt,
    vaultCanaryIv: user.vaultCanaryIv,
    vaultCanaryCipher: user.vaultCanaryCipher,
  });
}
