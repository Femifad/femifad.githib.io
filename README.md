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

```bash
npm install
npx prisma migrate deploy   # creates dev.db (SQLite)
npm run dev
```

Open http://localhost:3000. Copy `.env.example` to `.env` first if you don't already have one -
it ships with working local defaults.

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
   your user directly in `dev.db`.
4. Trigger a tick: `npm run tick` (hits `/api/cron/tick` with `CRON_SECRET`, meant to be called by
   an external scheduler in production - cron, Vercel Cron, GitHub Actions, etc). Once your
   check-in is overdue *and* past the grace period, this moves you to `VERIFYING` and emails your
   verifier (check `/admin/outbox` for the link).
5. Visit the verifier link, paste in the recovery code, confirm. This decrypts your messages
   server-side (transiently - the key is never persisted) and emails each recipient a delivery
   link, also visible in `/admin/outbox`.
6. Open the delivery link to see the message as your recipient would.

## Architecture

- **Next.js 16 (App Router) + TypeScript + Tailwind v4.**
- **SQLite via Prisma 7**, using the `@prisma/adapter-better-sqlite3` driver adapter - trivial to
  swap for Postgres later by changing the datasource provider and adapter.
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
- **Real key custody for the server's share** - right now it's stored as-is in SQLite; production
  wants envelope encryption via a KMS/HSM, and a defined incident-response story.
- **A continuity plan.** This product has to keep working for decades after anyone stops thinking
  about it day to day - that's a business and legal problem as much as a technical one.

The full concept - business model, trigger design rationale, competitive landscape - is in the
conversation this was built from; ask for it again if it's useful as a written doc.
