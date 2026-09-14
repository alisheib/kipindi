/**
 * ONE localised label per audit category — the words on `/profile/account`'s activity rail.
 *
 * 🔴 WHY IT EXISTS: THE STORED ENUM WAS REACHING THE PLAYER IN THREE PLACES ON ONE PAGE, and one
 * of them put an English token inside a translated sentence. Before this module:
 *
 *   · the rail label WAS the value — `activityCategories.map((c) => ({ id: c, label: c }))` — so
 *     the strip read `All · AUTH · BET · COMPLIANCE · KYC · WALLET` in every language;
 *   · the table cell printed it raw — `<td …>{e.category}</td>`;
 *   · and it was INTERPOLATED INTO COPY — `t.profile.noFilteredActivity.replace("{cat}", …)`,
 *     which rendered *"Hakuna shughuli za wallet"* to a Swahili reader and *"没有 wallet 活动"*
 *     to a Chinese one.
 *
 * ⛔ That is the §L2/§L3 defect `position-card.tsx`'s own comment records as already fixed once —
 * *"the chip printed the stored enum, so a Swahili player read 'YES' beside a page reading
 * 'NDIO'"*. Fixed there, still live here, on a page a customer meets.
 *
 * ⚠️ ALL EIGHT ARMS ARE MAPPED THOUGH A PLAYER CANNOT PRODUCE ALL EIGHT. `getAuditForActor` filters
 * on `actorId`, so `ADMIN`, `SECURITY` and `SYSTEM` rows — stamped with a staff actor or none —
 * do not normally appear in a player's own feed. They are mapped anyway because the function is
 * total over the enum: an unmapped arm would fall through to the raw token, which is the exact
 * failure this module exists to end, and a category becoming player-reachable later must not be
 * able to reintroduce it silently.
 *
 * ⭐ THE WORDS ARE THE PLAYER'S, NOT THE SCHEMA'S. `WALLET` is *"Money"* because that is what the
 * player calls it and what `/wallet` is called in the nav; `KYC` is *"Verification"* because §L3
 * forbids an acronym the screen never explains. ⛔ Do not "correct" these back towards the enum.
 *
 * ⭐ THE `action` COLUMN IS NO LONGER A RAW TOKEN (2026-09-14) — see `auditActionLabel` below. It
 * printed `session.created` / `kyc.started` to Swahili and Chinese readers. The audit chain has
 * many distinct actions, so only the ones a player's own feed commonly holds get their own words;
 * every other action falls back to the translated CATEGORY, never to the token. The page puts the
 * LABEL into the row it searches and sorts, so `ACCOUNT_ACTIVITY_SEARCH`'s `action` field matches
 * the words on screen.
 *
 * The type import is type-only, so nothing server-side is pulled into a client bundle by it.
 */
import type { AuditCategory } from "@/lib/server/audit";
import type { Dict } from "@/lib/i18n-dict";

export function auditCategoryLabel(t: Dict, c: string): string {
  switch (c as AuditCategory) {
    case "AUTH": return t.profile.auditCatAuth;
    case "KYC": return t.profile.auditCatKyc;
    case "WALLET": return t.profile.auditCatWallet;
    case "BET": return t.profile.auditCatBet;
    case "ADMIN": return t.profile.auditCatAdmin;
    case "COMPLIANCE": return t.profile.auditCatCompliance;
    case "SECURITY": return t.profile.auditCatSecurity;
    case "SYSTEM": return t.profile.auditCatSystem;
    /**
     * ⛔ THE FALLBACK IS THE TOKEN, AND IT IS NOT A SHRUG. `AuditCategory` is a TypeScript union,
     * not a Prisma enum with a database constraint, and rows are read back with `as AuditCategory`
     * (`audit.ts`), so a value written by an older deploy or a hand-run script can reach here.
     * Printing the token is worse copy than a label and better than an empty cell, which would
     * make a real event look like a rendering failure. ⚠️ A `default` returning "" would be the
     * untoned-chip failure `status-tone.ts` warns about, one column over.
     */
    default: return c;
  }
}

/**
 * The words for one audit ACTION in the player's own activity table.
 *
 * ⛔ THE FALLBACK IS THE TRANSLATED CATEGORY, NEVER THE TOKEN. An unmapped action still says what
 * kind of event it was ("Sign-in", "Money") in the reader's language. To give an action its own
 * words, add the key to `profile` in en, sw and zh first, then an arm here.
 *
 * ⚠️ AN ARM ONLY WHERE THE LABEL IS EXACTLY TRUE. `session.expired`, `session.idle_timeout` and
 * `session.revoked_no_active_record` end a sign-in without the player signing out, so they take
 * the fallback rather than "Signed out". A `switch`, not an object lookup, so an action named
 * like an `Object.prototype` member cannot resolve to something that is not a label.
 */
export function auditActionLabel(t: Dict, action: string, category: string): string {
  switch (action) {
    case "user.login":
    case "user.login.password":
    case "session.created": return t.profile.auditActSignedIn;
    case "session.destroyed": return t.profile.auditActSignedOut;
    case "session.revoked_by_newer_login": return t.profile.auditActSignedOutNewer;
    case "kyc.started": return t.profile.auditActVerificationStarted;
    default: return auditCategoryLabel(t, category);
  }
}
