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
 * ⚠️ THE `action` COLUMN IS STILL A RAW TOKEN (`user.login`, `kyc.approved`) and is deliberately
 * NOT translated here: there are hundreds of distinct values, they are the audit chain's own
 * vocabulary, and inventing copy for each is a lexicon-sized task rather than a label map. It is
 * recorded rather than hidden — see the note in `src/lib/search/fields.ts`'s
 * `ACCOUNT_ACTIVITY_SEARCH`, which is why that search matches the token: it matches what is on
 * screen, and what is on screen is still English.
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
