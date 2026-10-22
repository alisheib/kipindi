/**
 * MASWALI MILLIONEA — THE APPROVED MARKETING WORDINGS, WITH THE WEEK'S FEE (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 3,
 * MB-47, R-HEADLINE).
 *
 * The wordings and the lint live in `@/lib/marketing/millionea-claims` (pure: the composer runs the lint in the browser).
 * `{pct}` is filled HERE, from the fee the public line's week froze — the week on sale, its market's `feeSnapshot` (the one
 * home per week) — else from the rules the next week would freeze, read by the how-to's own reader (`millioneaHowTo`), so a
 * wording and the public rules page can never state two fees.
 * ⛔ MARKETING DESCRIBES THE PUBLIC PRODUCT ONLY: the facts are the PUBLIC line's, whatever a staff preview can see, and
 *    `live` says whether that product is public at all. Until it is, no campaign may name it.
 * Compliance reads the filled wordings on the integrity page; the campaign officer copies one into the composer, where the
 * lint holds the three facts and refuses every claim MB-47 lists.
 */
import { millioneaHowTo } from "./maswali-player";
import { millioneaStateNow } from "./millionea-switch";
import { MILLIONEA_WORDINGS, fillMillioneaWording, type MillioneaClaimFacts } from "@/lib/marketing/millionea-claims";

/** The facts a Millionea campaign is held to: the public line's fee at payout, and where it was read. */
export type MillioneaMarketingFacts = MillioneaClaimFacts & {
  /** WEEK: the week on sale (or being graded) froze it; CONFIG: no such week, so the rules the next week would freeze. */
  source: "WEEK" | "CONFIG";
  weekCode: string | null;
  /** The product is public (ACTIVE). Until it is, no campaign may name it. */
  live: boolean;
};

/** The public line's facts, or null when they cannot be read (a campaign then has no fee to state). */
export async function millioneaMarketingFacts(): Promise<MillioneaMarketingFacts | null> {
  try {
    const state = await millioneaStateNow();
    // The PUBLIC line's week, as a public visitor's how-to reads it — never a staff drive's private week.
    const how = await millioneaHowTo({ userId: null, state: "ACTIVE" });
    if (!Number.isFinite(how.feeRate)) return null;
    return { feeRate: how.feeRate, source: how.source, weekCode: how.weekCode, live: state === "ACTIVE" };
  } catch {
    return null;
  }
}

/** The approved wordings with the fee filled in, per campaign language, and the facts they were filled from. */
export type MillioneaApprovedWordings = { facts: MillioneaMarketingFacts; SW: string[]; EN: string[] };

export async function millioneaApprovedWordings(): Promise<MillioneaApprovedWordings | null> {
  const facts = await millioneaMarketingFacts();
  if (!facts) return null;
  return {
    facts,
    SW: MILLIONEA_WORDINGS.SW.map((t) => fillMillioneaWording(t, facts.feeRate)),
    EN: MILLIONEA_WORDINGS.EN.map((t) => fillMillioneaWording(t, facts.feeRate)),
  };
}
