"use server";

import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { audit } from "@/lib/server/audit";
import { getServerT } from "@/lib/i18n-server";
import { messagingLocaleOf, renderedLocaleOf } from "@/lib/server/marketing/consent-ledger";
import { recordPlayerMarketingChoice } from "@/lib/server/marketing/consent";

/** What the switch is told. `on` on a failure is the state the server READ after the attempt; null means
 *  it could not read one, and the card re-reads the page rather than guess. */
type MarketingConsentAnswer =
  | { ok: true; on: boolean }
  | { ok: false; reason: "signed_out" | "held" | "referee" | "error"; on: boolean | null };

/**
 * E-409 · WITHDRAW OR GIVE MARKETING CONSENT — the control Privacy §3 has promised all along.
 *
 * 🔴 The notice said marketing consent is "revocable any time", and the only writer of
 * `User.marketingOptIn` was the sign-up form: a player who ticked "Send me product updates" had no
 * way to take it back short of closing the account. This is that way, on the player's own session,
 * audited like every other consent change.
 *
 * ⭐ D4 (2026-09-26): the records are written by `recordPlayerMarketingChoice` against the EFFECTIVE
 * state the switch shows — an ON lifts the player's own stop-link suppression and re-consents after a
 * lapse — so the switch and the gate cannot disagree. This action owns the session and the audit line.
 * ⭐ D2: the ledger records the sentence in the language the switch was DRAWN in — the client's own
 * `useT().locale`, validated to en/sw/zh by `renderedLocaleOf` (it only picks which dictionary sentence
 * is stored). 🔴 The cookie alone was wrong when another tab had switched language after this one was
 * drawn; it stays the fallback. ⛔ Never `user.locale`, which nothing wrote after sign-up, so every row
 * said Swahili whatever the player read.
 * ⭐ A FAILURE SAYS WHY (2026-09-27): a lapsed session is `signed_out` — nothing is written, and the card
 * tells the player to sign in again instead of "try again", which could never succeed.
 */
export async function setMarketingConsentAction(on: boolean, renderedLocale?: string): Promise<MarketingConsentAnswer> {
  const session = await currentSession();
  if (!session) return { ok: false, reason: "signed_out", on: null };
  const next = on === true;
  const shown = renderedLocaleOf(renderedLocale) ?? messagingLocaleOf((await getServerT()).locale);
  const r = await recordPlayerMarketingChoice({ userId: session.userId, marketingOptIn: next, locale: shown });
  if (r.changed) {
    audit({
      category: "COMPLIANCE",
      action: next ? "privacy.marketing_consent.given" : "privacy.marketing_consent.withdrawn",
      actorId: session.userId,
      targetType: "User",
      targetId: session.userId,
      payload: { marketingOptIn: next, locale: shown, liftedStop: r.liftedStop },
    });
  }
  revalidatePath("/profile/notifications");
  if (r.ok && typeof r.on === "boolean") return { ok: true, on: r.on };
  // U33r · a promised agent referee's number: nothing was written, and the card says why, for good.
  return { ok: false, reason: r.held ? "held" : r.referee ? "referee" : "error", on: r.on };
}
