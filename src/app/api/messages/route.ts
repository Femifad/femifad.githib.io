import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { logEvent } from "@/lib/audit";

const schema = z.object({
  recipientId: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(["note", "vault-item"]).default("note"),
  cipherIv: z.string().min(1),
  cipherText: z.string().min(1),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const messages = await db.message.findMany({
    where: { userId },
    include: { recipient: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const recipient = await db.recipient.findUnique({ where: { id: parsed.data.recipientId } });
  if (!recipient || recipient.userId !== userId) {
    return NextResponse.json({ error: "Unknown recipient" }, { status: 400 });
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.vaultSalt) {
    return NextResponse.json({ error: "Set up your vault passphrase before adding messages" }, { status: 400 });
  }

  const message = await db.message.create({ data: { userId, ...parsed.data } });
  await logEvent(userId, "MESSAGE_ADDED", `${parsed.data.title} -> ${recipient.email}`);

  return NextResponse.json({ message });
}
