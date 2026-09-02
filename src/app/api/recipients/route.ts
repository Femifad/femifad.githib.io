import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { logEvent } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  relationship: z.string().optional(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const recipients = await db.recipient.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ recipients });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const recipient = await db.recipient.create({ data: { userId, ...parsed.data } });
  await logEvent(userId, "RECIPIENT_ADDED", recipient.email);

  return NextResponse.json({ recipient });
}
