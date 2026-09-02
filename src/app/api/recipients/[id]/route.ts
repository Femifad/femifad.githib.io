import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { logEvent } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const recipient = await db.recipient.findUnique({ where: { id } });
  if (!recipient || recipient.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.recipient.delete({ where: { id } });
  await logEvent(userId, "RECIPIENT_REMOVED", recipient.email);

  return NextResponse.json({ ok: true });
}
