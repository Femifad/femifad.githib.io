# Legacy Notes (MVP)

Messages, passwords, and things to say - delivered to the people you choose, only once someone you
trust confirms it's time.

This is a working MVP of the idea: a small, opinionated slice that proves out the one part of the
product that actually matters - **you can never be sure someone has died, so the system has to be
designed around that uncertainty, not around pretending it isn't there.**

## What's implemented

- **Zero-knowledge vault.** Your passphrase never leaves the browser. It's run through PBKDF2
  (client-side, `src/lib/vault-crypto.ts`) to derive an AES-GCM key, which encrypts every message
  before it's sent to the server. The server only ever stores ciphertext.
- **Split-trust trigger.** The vault key is split in two (`src/lib/secret-split.ts`, a simple
  2-of-2 XOR one-time-pad split): half stays on the server, half is shown to you once, to hand to
  your verifier out of band. Neither half alone means anything - not even to us.
- **A dead man's switch with a human in the loop.** A periodic check-in
  (`ACTIVE -> OVERDUE -> VERIFYING`, see `src/lib/tick.ts`) never releases anything by itself. It
  only ever gets as far as asking your verifier to confirm and supply their half of the key. You
  can check in at any point up to that moment and cancel it.
- **Delivery.** Once a verifier submits the correct recovery code, the server reconstructs the key
  for that one request, decrypts your pending messages, and emails each recipient a private link.

What's deliberately *not* in this MVP: multiple verifiers / m-of-n quorum, audio/video messages,
death-certificate upload and review, billing, and real production key custody (see
[Where this needs to grow up](#where-this-needs-to-grow-up) below).

## Running it locally

You need a Postgres database - either one running locally, or a free hosted one (any of
[Neon](https://neon.tech), [Supabase](https://supabase.com), or Vercel Postgres work). Point
`DATABASE_URL` in `.env` at it (copy `.env.example` to `.env` first), then:

```bash
npm install
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000.

There's no email provider configured by default: every "email" the app sends (check-in reminders,
verifier requests, delivery links) is written to the database and viewable at
**http://localhost:3000/admin/outbox**, which is how you'll find the verifier/delivery links while
testing locally. Set `RESEND_API_KEY` in `.env` to send real email via [Resend](https://resend.com)
instead.

### Trying the full loop

1. Sign up, then set up your vault (passphrase + a verifier's name/email) at `/dashboard/vault`.
   **Save the recovery code it shows you once** - in real use you'd send it to your verifier
   through a separate channel; for testing, just keep it.
2. Add a recipient and write yourself a message.
3. The check-in interval defaults to 30 days, which is inconvenient to wait out. To simulate time
   passing, either lower the interval when setting up the vault, or backdate `lastCheckInAt` for
   your user directly in the database (`psql $DATABASE_URL -c 'UPDATE "User" SET "lastCheckInAt" = NOW() - INTERVAL '\''40 days'\'';'`).
4. Trigger a tick: `npm run tick` (hits `/api/cron/tick` with `CRON_SECRET`, meant to be called by
   an external scheduler in production - cron, Vercel Cron, GitHub Actions, etc). Once your
   check-in is overdue *and* past the grace period, this moves you to `VERIFYING` and emails your
   verifier (check `/admin/outbox` for the link).
5. Visit the verifier link, paste in the recovery code, confirm. This decrypts your messages
   server-side (transiently - the key is never persisted) and emails each recipient a delivery
   link, also visible in `/admin/outbox`.
6. Open the delivery link to see the message as your recipient would.

## Deploying to Vercel

The app is ready to deploy as-is - it just needs a Postgres database and a handful of env vars.
None of this needs anything from me; it's a few clicks in your own accounts:

1. **Get a Postgres database.** [Neon](https://neon.tech) or [Supabase](https://supabase.com) both
   have a free tier that takes under a minute to set up - create a project, copy the connection
   string it gives you (use the "pooled"/"pgbouncer" one if Neon offers both).
2. **Import the repo on [vercel.com/new](https://vercel.com/new)**, connecting your GitHub account
   and picking this repo / the `claude/posthumous-messaging-app-ltpqdj` branch.
3. **Set environment variables** in the Vercel project settings (same names as `.env.example`):
   - `DATABASE_URL` - the connection string from step 1
   - `SESSION_SECRET` - generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   - `CRON_SECRET` - any random string
   - `APP_URL` - your Vercel deployment URL (e.g. `https://your-app.vercel.app`)
   - `RESEND_API_KEY` / `EMAIL_FROM` - optional, for real outgoing email (see below)
4. **Run the migration against that database once**, from your machine: `DATABASE_URL="<the same
   string>" npx prisma migrate deploy`.
5. **Deploy.** Vercel builds and serves it automatically from there.
6. **The check-in cron is already wired up** - `vercel.json` schedules an hourly call to
   `/api/cron/tick`, which is what actually drives the check-in/verification state machine in
   production. Vercel Cron Jobs authenticate automatically using the `CRON_SECRET` env var you set
   in step 3 (no extra setup needed); nothing to do here unless you want a different cadence.
7. **Set up real email.** Without `RESEND_API_KEY`, mail only lands in `/admin/outbox` - fine for a
   demo, but you won't get the verifier/delivery links to their actual inboxes. Add a
   [Resend](https://resend.com) API key to send real email once you're past the demo stage; the
   `/admin/outbox` route also auto-hides itself once `RESEND_API_KEY` is set in production.

## Architecture

- **Next.js 16 (App Router) + TypeScript + Tailwind v4.**
- **Postgres via Prisma 7**, using the `@prisma/adapter-pg` driver adapter.
- **iron-session** for signed, httpOnly session cookies.
- **Web Crypto (`crypto.subtle`)** for everything cryptographic - the same code in
  `vault-crypto.ts` and `secret-split.ts` runs client-side (compose time) and server-side
  (reconstructing the key during a verified trigger), since both environments expose the same API.
- See `prisma/schema.prisma` for the full data model, and `src/lib/tick.ts` for the trigger state
  machine.

## Where this needs to grow up

This is an MVP for the mechanism, not a production system. Before this could hold anything real:

- **Multiple verifiers (m-of-n), not one.** A single verifier is a single point of failure -
  incapacitated, unreachable, or simply the wrong call. Real secret-sharing (Shamir's, not the
  2-of-2 XOR split here) generalizes this cleanly.
- **A cooling-off window on the trigger itself**, with a way for the account owner to abort even
  after a verifier has acted, before delivery actually goes out.
- **Documentary proof** (death certificate upload + review) as a second track alongside verifier
  confirmation, per the original design.
- **Real key custody for the server's share** - right now it's stored as-is in Postgres; production
  wants envelope encryption via a KMS/HSM, and a defined incident-response story.
- **A continuity plan.** This product has to keep working for decades after anyone stops thinking
  about it day to day - that's a business and legal problem as much as a technical one.

The full concept - business model, trigger design rationale, competitive landscape - is in the
conversation this was built from; ask for it again if it's useful as a written doc.
