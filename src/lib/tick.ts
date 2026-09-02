import "server-only";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { appUrl, sendMail } from "@/lib/mailer";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The dead man's switch, one tick at a time. Meant to be invoked
 * periodically (see /api/cron/tick and scripts/tick.ts) - safe to call as
 * often as you like, it only acts on users whose deadlines have actually
 * passed.
 *
 * ACTIVE  -> OVERDUE   once `checkInIntervalDays` has elapsed since the last check-in.
 * OVERDUE -> VERIFYING once `graceDays` has *also* elapsed - the verifier is asked to confirm.
 *
 * There is deliberately no automatic OVERDUE/VERIFYING -> RELEASED
 * transition here: that only happens when a human verifier submits the
 * correct recovery share through /verify/[token]. A cron tick can start
 * the process; it can never finish it alone.
 */
export async function runTick() {
  const now = new Date();
  let markedOverdue = 0;
  let markedVerifying = 0;

  const active = await db.user.findMany({ where: { status: "ACTIVE" } });
  for (const user of active) {
    const dueAt = user.lastCheckInAt.getTime() + user.checkInIntervalDays * MS_PER_DAY;
    if (now.getTime() < dueAt) continue;

    await db.user.update({ where: { id: user.id }, data: { status: "OVERDUE" } });
    await logEvent(user.id, "STATUS_OVERDUE", `Missed check-in due ${user.lastCheckInAt.toISOString()}`);
    await sendMail(
      user.email,
      "You missed a check-in",
      `You haven't checked in to Legacy Notes since ${user.lastCheckInAt.toDateString()}. ` +
        `If we don't hear from you within ${user.graceDays} more day(s), we'll ask your verifier ` +
        `(${user.verifierName ?? "your designated contact"}) to confirm what's happened. ` +
        `Check in any time at ${appUrl("/dashboard")} to reset the clock.`,
    );
    markedOverdue++;
  }

  const overdue = await db.user.findMany({ where: { status: "OVERDUE" } });
  for (const user of overdue) {
    const verifyAt = user.lastCheckInAt.getTime() + (user.checkInIntervalDays + user.graceDays) * MS_PER_DAY;
    if (now.getTime() < verifyAt) continue;
    if (!user.verifierEmail || !user.serverKeyShare) {
      // No verifier configured yet - nothing safe to do but keep waiting and log it.
      await logEvent(user.id, "VERIFYING_SKIPPED_NO_VERIFIER", "Grace period lapsed but no verifier is configured");
      continue;
    }

    const token = nanoid(32);
    await db.verifierToken.create({ data: { userId: user.id, token } });
    await db.user.update({ where: { id: user.id }, data: { status: "VERIFYING" } });
    await logEvent(user.id, "STATUS_VERIFYING", `Verifier token issued to ${user.verifierEmail}`);

    await sendMail(
      user.verifierEmail,
      `Action needed: confirming on behalf of ${user.email}`,
      `You're listed as a trusted verifier for ${user.email} on Legacy Notes. They have not checked in ` +
        `for ${user.checkInIntervalDays + user.graceDays} days. If you can confirm what has happened, ` +
        `visit ${appUrl(`/verify/${token}`)} and enter the recovery code they gave you separately. ` +
        `If you don't have that code, this cannot proceed - it's what keeps their vault safe from being opened by mistake.`,
    );
    await sendMail(
      user.email,
      "Last chance: your Legacy Notes vault is about to enter verification",
      `We haven't heard from you in a while, so we've asked ${user.verifierName ?? "your verifier"} to confirm ` +
        `what's happened. If this is a mistake, check in right now at ${appUrl("/dashboard")} to cancel it - ` +
        `nothing will be released until your verifier submits your recovery code.`,
    );
    markedVerifying++;
  }

  return { markedOverdue, markedVerifying };
}
