import { NextRequest, NextResponse } from "next/server";
import { runTick } from "@/lib/tick";

/**
 * Accepts either `x-cron-secret: <CRON_SECRET>` (scripts/tick.ts, generic
 * schedulers) or `Authorization: Bearer <CRON_SECRET>` (what Vercel Cron
 * Jobs sends automatically when CRON_SECRET is set as an env var).
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("x-cron-secret") === secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runTick();
  return NextResponse.json({ ok: true, ...result });
}

export const POST = handle;
export const GET = handle;
