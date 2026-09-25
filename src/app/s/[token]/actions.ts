"use server";

import { headers } from "next/headers";
import { getServerT } from "@/lib/i18n-server";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { stopMarketing, resumeMarketing } from "@/lib/server/marketing/optout-service";
import type { OptOutActResult } from "@/lib/server/marketing/optout-service";
import type { MessagingLocale } from "@/lib/server/store";

/**
 * U8's two acts. ⛔ ONE CLICK EACH — neither returns a "confirm?" state, because there is no
 * confirmation step to return one from. A second screen is a step a person abandons, and every
 * one who abandons it stays marketable while believing they opted out.
 */

/**
 * ⭐ THE LOCALE IS READ SERVER-SIDE, FROM THE SAME COOKIE THE PAGE RENDERED FROM — never taken
 * from the client. The locale decides which sentence is written into the consent ledger as
 * evidence of what this person read (§5.7), and evidence the caller gets to choose is not
 * evidence.
 */
async function actLocale(): Promise<MessagingLocale> {
  const { locale } = await getServerT();
  return (locale.toUpperCase() as MessagingLocale);
}

/**
 * 🔴 THE ONE PLACE A RATE LIMIT ON AN OPT-OUT CAN GO WRONG, SO IT IS WRITTEN OUT.
 *
 * `/s/` is public, unauthenticated and cheap to script, so it needs a ceiling. But a STOP that
 * is refused is a person who asked to leave and was told no — and ETA s.32(1)(c) does not have
 * a rate-limit exception. ⛔ So the bucket is deliberately WIDE (30 burst, 10/min steady): a
 * real person taps once, and Tanzanian mobile networks put a great many real people behind one
 * carrier NAT address, so a tight per-IP rule would refuse strangers who share an operator.
 * It stops a script walking the token space; it is nowhere near anybody acting in good faith.
 *
 * ⚠️ AND WHEN IT DOES FIRE, THE PAGE SAYS "that did not go through, try once more" rather than
 * claiming success — a refusal reported as a success is the exact defect this unit exists to
 * prevent, and a throttle is no different from a database error in that respect.
 */
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

async function throttled(): Promise<boolean> {
  const r = await rateCheckAsync(await clientIp(), "optout.ip");
  return !r.allowed;
}

export async function stopMarketingAction(token: string): Promise<OptOutActResult> {
  if (await throttled()) return { ok: false, reason: "error" };
  return stopMarketing(token, await actLocale());
}

export async function resumeMarketingAction(token: string): Promise<OptOutActResult> {
  if (await throttled()) return { ok: false, reason: "error" };
  return resumeMarketing(token, await actLocale());
}
