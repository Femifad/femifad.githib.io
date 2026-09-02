import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { logEvent } from "@/lib/audit";

const schema = z.object({
  salt: z.string().min(1),
  canaryIv: z.string().min(1),
  canaryCipher: z.string().min(1),
  serverShare: z.string().min(1),
  verifierName: z.string().min(1),
  verifierEmail: z.string().email(),
  checkInIntervalDays: z.number().int().min(1).max(365).default(30),
  graceDays: z.number().int().min(1).max(90).default(7),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.vaultSalt) {
    return NextResponse.json({ error: "Your vault is already set up" }, { status: 409 });
  }
  if (parsed.data.verifierEmail.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json({ error: "Your verifier can't be your own account email" }, { status: 400 });
  }

  await db.user.update({
    where: { id: userId },
    data: {
      vaultSalt: parsed.data.salt,
      vaultCanaryIv: parsed.data.canaryIv,
      vaultCanaryCipher: parsed.data.canaryCipher,
      serverKeyShare: parsed.data.serverShare,
      verifierName: parsed.data.verifierName,
      verifierEmail: parsed.data.verifierEmail,
      checkInIntervalDays: parsed.data.checkInIntervalDays,
      graceDays: parsed.data.graceDays,
      lastCheckInAt: new Date(),
      status: "ACTIVE",
    },
  });
  await logEvent(userId, "VAULT_SETUP", `Verifier: ${parsed.data.verifierEmail}`);

  return NextResponse.json({ ok: true });
}
