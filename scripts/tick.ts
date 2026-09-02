import "dotenv/config";

/**
 * Manually fire one cron tick against a running dev server - the same
 * request an external scheduler (cron, Vercel Cron, GitHub Actions) would
 * make against /api/cron/tick in production. Requires `npm run dev` (or
 * `next start`) to already be running.
 */
const base = process.env.APP_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set");
  process.exit(1);
}

const res = await fetch(`${base}/api/cron/tick`, {
  method: "POST",
  headers: { "x-cron-secret": secret },
});
const body = await res.json();
if (!res.ok) {
  console.error("tick failed:", res.status, body);
  process.exit(1);
}
console.log("tick complete:", body);
