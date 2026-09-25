"use server";

import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { appendMarketingConsent } from "@/lib/server/marketing/consent-ledger";

/**
 * E-409 · WITHDRAW OR GIVE MARKETING CONSENT — the control Privacy §3 has promised all along.
 *
 * 🔴 The notice said marketing consent is "revocable any time", and the only writer of
 * `User.marketingOptIn` was the sign-up form: a player who ticked "Send me product updates" had no
 * way to take it back short of closing the account. This is that way, on the player's own session,
 * audited like every other consent change.
 */
export async function setMarketingConsentAction(on: boolean): Promise<{ ok: true; on: boolean } | { ok: false }> {
  const session = await currentSession();
  if (!session) return { ok: false };
  const user = await Promise.resolve(db.user.findById(session.userId)).catch(() => null);
  if (!user) return { ok: false };
  const next = on === true;
  if (user.marketingOptIn !== next) {
    await db.user.update(session.userId, { marketingOptIn: next });
    audit({
      category: "COMPLIANCE",
      action: next ? "privacy.marketing_consent.given" : "privacy.marketing_consent.withdrawn",
      actorId: session.userId,
      targetType: "User",
      targetId: session.userId,
      payload: { marketingOptIn: next },
    });
    // U6 · THE LEDGER ROW THE BOOLEAN COULD NEVER BE (D8). The audit row above says a change
    // happened; it does not say what this player was SHOWN when they made it, and a regulator
    // asking "what did they agree to" cannot be answered from a boolean (GN 478T reg 51(1)).
    // ⛔ Append-only: a withdrawal is a NEW row, never an edit of the row that granted consent.
    await appendMarketingConsent({
      phoneE164: user.phoneE164,
      locale: user.locale,
      status: next ? "GIVEN" : "WITHDRAWN",
      source: "PROFILE",
      site: "PROFILE",
      evidence: "/profile/notifications",
      recordedBy: null,
    });
  }
  revalidatePath("/profile/notifications");
  return { ok: true, on: next };
}
