import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const grant = await db.deliveryGrant.findUnique({
    where: { token },
    include: { recipient: { include: { user: true } } },
  });
  if (!grant) return NextResponse.json({ error: "This link is invalid" }, { status: 404 });
  if (grant.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }

  const messages = await db.message.findMany({
    where: { recipientId: grant.recipientId, status: "DELIVERED" },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, kind: true, deliveredPlaintext: true, deliveredAt: true },
  });

  return NextResponse.json({
    recipientName: grant.recipient.name,
    fromEmail: grant.recipient.user.email,
    expiresAt: grant.expiresAt,
    messages,
  });
}
