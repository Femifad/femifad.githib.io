import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { appUrl, sendMail } from "@/lib/mailer";
import { fromBase64Url, joinShares } from "@/lib/secret-split";
import { decryptWithKey, verifyCanary } from "@/lib/vault-crypto";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verifierToken = await db.verifierToken.findUnique({ where: { token }, include: { user: true } });
  if (!verifierToken) return NextResponse.json({ error: "Unknown or expired link" }, { status: 404 });

  return NextResponse.json({
    userEmail: verifierToken.user.email,
    verifierName: verifierToken.user.verifierName,
    status: verifierToken.user.status,
    used: verifierToken.usedAt !== null,
  });
}

const schema = z.object({
  code: z.string().min(1),
  confirm: z.literal(true),
});

const DELIVERY_GRANT_DAYS = 30;

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "You must confirm and provide the recovery code" }, { status: 400 });
  }

  const verifierToken = await db.verifierToken.findUnique({ where: { token }, include: { user: true } });
  if (!verifierToken) return NextResponse.json({ error: "Unknown or expired link" }, { status: 404 });
  if (verifierToken.usedAt) return NextResponse.json({ error: "This link has already been used" }, { status: 409 });

  const user = verifierToken.user;
  if (user.status !== "VERIFYING" || !user.serverKeyShare || !user.vaultCanaryIv || !user.vaultCanaryCipher) {
    return NextResponse.json({ error: "This account is not awaiting verification" }, { status: 409 });
  }

  let shareB: Uint8Array;
  try {
    shareB = fromBase64Url(parsed.data.code.trim());
  } catch {
    return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 });
  }

  const shareA = fromBase64Url(user.serverKeyShare);
  if (shareA.length !== shareB.length) {
    return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 });
  }

  const vaultKey = joinShares(shareA, shareB);
  const canaryOk = await verifyCanary(vaultKey, user.vaultCanaryIv, user.vaultCanaryCipher);
  if (!canaryOk) {
    await logEvent(user.id, "VERIFY_CODE_REJECTED");
    return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 });
  }

  // Key reconstructed and verified. Decrypt every pending message and hand
  // decrypted content off to per-recipient delivery grants; the raw vault
  // key never leaves this request.
  const pending = await db.message.findMany({
    where: { userId: user.id, status: "PENDING" },
    include: { recipient: true },
  });

  const byRecipient = new Map<string, typeof pending>();
  for (const message of pending) {
    const list = byRecipient.get(message.recipientId) ?? [];
    list.push(message);
    byRecipient.set(message.recipientId, list);
  }

  for (const [recipientId, messages] of byRecipient) {
    const recipient = messages[0].recipient;
    for (const message of messages) {
      const plaintext = await decryptWithKey(vaultKey, message.cipherIv, message.cipherText);
      await db.message.update({
        where: { id: message.id },
        data: { status: "DELIVERED", deliveredPlaintext: plaintext, deliveredAt: new Date() },
      });
    }

    const grantToken = nanoid(32);
    await db.deliveryGrant.create({
      data: {
        recipientId,
        token: grantToken,
        expiresAt: new Date(Date.now() + DELIVERY_GRANT_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    await sendMail(
      recipient.email,
      `${user.email} left something for you`,
      `${user.verifierName ?? "A verifier"} has confirmed that ${user.email} has passed away, and ` +
        `${messages.length} message(s) they prepared for you are ready to view: ${appUrl(`/deliver/${grantToken}`)}\n\n` +
        `This link is private to you and works for ${DELIVERY_GRANT_DAYS} days.`,
    );
  }

  await db.user.update({ where: { id: user.id }, data: { status: "RELEASED" } });
  await db.verifierToken.update({ where: { id: verifierToken.id }, data: { usedAt: new Date() } });
  await logEvent(user.id, "RELEASED", `Confirmed by verifier ${user.verifierEmail}`);

  return NextResponse.json({ ok: true, delivered: pending.length });
}
