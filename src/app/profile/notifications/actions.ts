"use server";

import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { audit } from "@/lib/server/audit";
import { getServerT } from "@/lib/i18n-server";
import { messagingLocaleOf } from "@/lib/server/marketing/consent-ledger";
import { recordPlayerMarketingChoice } from "@/lib/server/marketing/consent";

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
 * ⭐ D2: the ledger records the sentence in the language the page was SHOWN in — the `kp-locale` cookie,
 * read here on the server exactly as `/s/[token]/actions.ts` reads it. ⛔ Never `user.locale`, which
 * nothing wrote after sign-up, so every row said Swahili whatever the player read.
 */
export async function setMarketingConsentAction(on: boolean): Promise<{ ok: true; on: boolean } | { ok: false }> {
  const session = await currentSession();
  if (!session) return { ok: false };
  const next = on === true;
  const shown = messagingLocaleOf((await getServerT()).locale);
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
  return r.ok ? { ok: true, on: r.on } : { ok: false };
}
