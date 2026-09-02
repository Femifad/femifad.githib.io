import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { logEvent } from "@/lib/audit";

export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.status === "RELEASED") {
    return NextResponse.json(
      { error: "Your vault has already been opened and delivered. Contact support to regain access." },
      { status: 409 },
    );
  }
  const wasPending = user.status !== "ACTIVE";

  await db.user.update({ where: { id: userId }, data: { lastCheckInAt: new Date(), status: "ACTIVE" } });
  await logEvent(
    userId,
    "CHECKIN",
    wasPending ? `Cancelled pending trigger (was ${user.status})` : undefined,
  );

  return NextResponse.json({ ok: true });
}
