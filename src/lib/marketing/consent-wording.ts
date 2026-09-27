/**
 * OQ11 · THE CONSENT SENTENCES THAT NAME SMS — the only wordings a player's "yes" counts under.
 *
 * 🔴 WHY THIS EXISTS. Until 2026-09-26 the two consent points said "Send me product updates" / "Nipe
 * matangazo" and "Product news" / "Habari za bidhaa" — no sender, no SMS, no phone number — while the
 * ledger stamped every tick channel SMS, category MARKETING. OD8's premise ("the profile screen says
 * so") was false. ⭐ Built default, on Ali's delegation (D3): a player is marketable only when the LATEST
 * ledger row is GIVEN and its wording is one of the sentences below. A "yes" given under the old
 * wording is not a yes to SMS marketing, and nothing backfills it — the player is asked again.
 *
 * ⛔ LITERAL STRINGS, NEVER A READ OF TODAY'S DICTIONARY. Deriving this list from `i18n-dict.ts` would
 * make every future rewording silently re-qualify (or disqualify) every consent ever given. The ledger
 * stores what the person read; this list says which of those readings named SMS.
 *
 * ⛔ APPEND-ONLY. Removing or editing an entry would disqualify people who consented under it.
 * `test:marketing-consent-ledger` pins a hash of the entries below and asserts every sentence the
 * dictionary shows TODAY is in the list — so a copy change fails the suite until it is appended here.
 *
 * Pure and import-free, so a screen can reach it.
 */

export type ConsentWordingSite = "REGISTRATION" | "PROFILE" | "OPT_OUT_RESUME";

export type PinnedConsentWording = {
  /** The day this sentence first shipped — the deploy that put it in front of people, not the day it was decided.
   *  ⚠️ The first nine said 2026-09-26 (the D1/D6 decision) while production still showed the old wording; they
   *  were corrected to the ship date on 2026-09-27, before any ledger row had been written under them. */
  readonly since: string;
  readonly site: ConsentWordingSite;
  readonly locale: "SW" | "EN" | "ZH";
  /** ⛔ Byte-for-byte what the ledger stores for this act (§5.7). */
  readonly wording: string;
};

export const SMS_CONSENT_WORDINGS: readonly PinnedConsentWording[] = [
  // ── D1 (decided 2026-09-26, shipped 2026-09-27) — /auth/register checkbox (`auth.optionalUpdates`) ──
  { since: "2026-09-27", site: "REGISTRATION", locale: "SW", wording: "Nitumie ofa na habari za 50pick kwa SMS (hiari)." },
  { since: "2026-09-27", site: "REGISTRATION", locale: "EN", wording: "Send me 50pick offers and news by SMS (optional)." },
  { since: "2026-09-27", site: "REGISTRATION", locale: "ZH", wording: "通过短信向我发送 50pick 的优惠和资讯（可选）。" },
  // ── D1 (decided 2026-09-26, shipped 2026-09-27) — /profile/notifications toggle (`push.marketingTitle — push.marketingBody`) ──
  { since: "2026-09-27", site: "PROFILE", locale: "SW", wording: "Ofa na habari kwa SMS — Ofa na habari za 50pick mara kwa mara kwa SMS kwenye namba yako. Zima wakati wowote — ujumbe kuhusu akaunti yako, dau na fedha bado utakufikia." },
  { since: "2026-09-27", site: "PROFILE", locale: "EN", wording: "Offers and news by SMS — Occasional 50pick offers and news by SMS to your phone number. Turn it off at any time — messages about your account, bets and money still reach you." },
  { since: "2026-09-27", site: "PROFILE", locale: "ZH", wording: "短信优惠与资讯 — 我们会不定期通过短信向您的手机号码发送 50pick 的优惠和资讯。您可随时关闭——有关您的账户、投注和资金的消息仍会发送给您。" },
  // ── D6 (decided 2026-09-26, shipped 2026-09-27) — /s/<token> resume (`optout.resubscribeButton — push.marketingBody`) ──
  { since: "2026-09-27", site: "OPT_OUT_RESUME", locale: "SW", wording: "Anza kupokea tena — Ofa na habari za 50pick mara kwa mara kwa SMS kwenye namba yako. Zima wakati wowote — ujumbe kuhusu akaunti yako, dau na fedha bado utakufikia." },
  { since: "2026-09-27", site: "OPT_OUT_RESUME", locale: "EN", wording: "Start them again — Occasional 50pick offers and news by SMS to your phone number. Turn it off at any time — messages about your account, bets and money still reach you." },
  { since: "2026-09-27", site: "OPT_OUT_RESUME", locale: "ZH", wording: "重新开始接收 — 我们会不定期通过短信向您的手机号码发送 50pick 的优惠和资讯。您可随时关闭——有关您的账户、投注和资金的消息仍会发送给您。" },
  // ⛔ APPEND BELOW THIS LINE — never edit or remove an entry above it.
];

const PINNED = new Set(SMS_CONSENT_WORDINGS.map((w) => w.wording));

/** Does this stored ledger wording name SMS marketing (OQ11)? Exact match — the wording is evidence. */
export function isSmsConsentWording(wording: string | null | undefined): boolean {
  return typeof wording === "string" && PINNED.has(wording);
}
