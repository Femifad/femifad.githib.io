import "server-only";
import { db } from "@/lib/db";

export async function logEvent(userId: string, type: string, detail?: string) {
  await db.auditEvent.create({ data: { userId, type, detail } });
}
