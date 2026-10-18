/** S8's approved additions only (and S12's one round paragraph in §7, and the Millionea slip's paragraph after it, below).
 *  Old legal clauses and dictionary entries still compare against origin/main. */
import { createHash } from "node:crypto";
import ts from "typescript";

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const LOCALES = ["en", "sw", "zh"] as const;
// S8-PLAN WP4/A5/A10/A20/A24: new journey keys, not edits to existing player words.
const KEYS = [
  "balanceRow", "cardBreak", "estimateCompact", "estimateLead", "estimateNoteCompact", "estimatePill", "estimatePillOver",
  "estimateUpdated", "estimateUpdatedLive", "homeBreakBody", "homeBreakTitle", "lowBetInstead", "lowBetInsteadEstimate",
  "lowBody", "lowChoose", "lowDeposit", "lowLossRoom", "lowLossTitle", "lowMinNote", "lowPendingLateBody", "lowPendingLateTitle",
  "lowPendingTitle", "lowPendingTrack", "lowPendingWaitBody", "lowSofCta", "lowTitle", "multOnly", "placeCta", "placeCtaBare",
  "retryCta", "sheetAboveMax", "sheetBelowMin", "sheetBlocked", "sheetBonusWager", "sheetBusy", "sheetChosen", "sheetClosedBody",
  "sheetClosedTitle", "sheetDepositLimit", "sheetDepositMax", "sheetEmptyPoolBody", "sheetFirstOnSide", "sheetFrozen",
  "sheetHedgeBody", "sheetHedgeBothBody", "sheetHoldAddBody", "sheetHolds", "sheetLegacyBody", "sheetLegacyFee", "sheetNotTaking",
  "sheetPlacing", "sheetPlacingSlow", "sheetRailsPaused", "sheetRateLimited", "sheetRefundRule", "sheetSessionLimit",
  "sheetSofRequired", "stakeLabel", "ticketsHere",
] as const;
// Measured WP4 strings and the exact approved v2026-10-14 owner-recovery paragraphs; normal guards pin their semantics too.
// zh re-measured for S8 round V2 (S8-PLAN A25 item 13, 2026-10-16): sheetHolds and sheetFirstOnSide set the side word off as
// 「{side}」, DESIGN_AUTHORITY L4's rule ("您已在此投注是" read the side as the copula); en and sw unchanged (53863b4a6af3 before).
const WORD_HASH: Record<string, string> = { en: "c5a78e0f5c5a", sw: "7c5f547f68a6", zh: "8beb566c9da4" };
const NOTICE_HASH: Record<string, string> = { en: "fb825bd6a8a3", sw: "8b4d6871dca3", zh: "6e4b8029bd17" };
const NOTICE = /\n {8}<p data-policy-addition="pending-bet">[\s\S]*?\n {8}<\/p>/g;
// The privacy page's approved versions: S8's (2026-10-14), then the Vodacom plan S11's (2026-10-15 — Privacy §7 names How to
// play's seen note; S11-PLAN WP4, accepted by Ali 2026-10-14). Pinned to S8's alone, every later approved bump would read
// as an unapproved edit for ever, on main too (test:house-bot-disclosure 5.1, test:visual-pass-r5g 4.14′,
// test:sheet-owner-recovery). ⚠️ A later privacy version adds itself here in the same commit as its META.
const PRIVACY_VERSIONS = ["2026-10-14", "2026-10-15"] as const;
/**
 * ⭐ S12 WP10b (Vodacom S12, `S12-PLAN.md` Risk 14, Open point 12): §7 also names a ROUND in `kp-pending-bet` — one
 * paragraph per language, after S8's, pinned by its own measured hashes — and the combined version moves to 2026-10-15.2.
 * S8 paragraphs above stay byte-identical. A round paragraph is accepted only as all three at these hashes AND under the new
 * version; S8's version stands alone only while no round paragraph exists. Legacy comparison strips both additions.
 */
const ROUND_NOTICE_HASH: Record<string, string> = { en: "5639330640e3", sw: "be2f9c62bec8", zh: "01251647a662" };
const ROUND_NOTICE = /\n {8}<p data-policy-addition="pending-round">[\s\S]*?\n {8}<\/p>/g;
const ROUND_VERSION = "2026-10-15.2";
/**
 * ⭐ MASWALI-BUILD S5 (MASWALI-PLAN MB-57; COMPLIANCE-DECISIONS "Privacy v2026-10-17"): §7 also names the Maswali Millionea
 * slip's tab key, kp-millionea-slip: — one paragraph per language, after S12's round paragraph, pinned by its own measured
 * hashes. ⭐ PUBLISHED WITH THE CEILING (the lead's decision of 2026-10-18): each paragraph sits inside a `MillioneaWording`
 * wrapper (`src/lib/server/legal/millionea-wording.tsx`), printed only while the server's ceiling admits Millionea, and the
 * version it moves the notice to (2026-10-17) is `POLICY_PAGES.privacy`'s, printed in META's place — META itself stays
 * S12's 2026-10-15.2, production's. Accepted only as all three paragraphs at these hashes, each the whole of its wrapper and
 * none outside one, with the wrapper's one import and S12's three present; legacy comparison strips the wrappers and the
 * import, so production's notice compares as itself.
 * 2026-10-18 (S5 integration): the Swahili re-measured, 2eb3dfe4da7e → 30403f82c027 — "msimbo wa wiki" and "taarifa
 * yoyote inayokutambulisha" replace "kitambulisho" (an identity document's word; `test:kyc-copy-truth` §2 rule 1). The
 * paragraph was never printed: production's ceiling is WITHDRAWN.
 */
const SLIP_NOTICE_HASH: Record<string, string> = { en: "d30f80325746", sw: "30403f82c027", zh: "fc15d478bef9" };
const SLIP_PARAGRAPH = /<p data-policy-addition="millionea-slip">[\s\S]*?<\/p>/;
const SLIP_PARAGRAPHS = /<p data-policy-addition="millionea-slip">[\s\S]*?<\/p>/g;
const WORDING_BLOCK = /\n {8}<MillioneaWording>[\s\S]*?\n {8}<\/MillioneaWording>/g;
const WORDING_IMPORT = 'import { MillioneaWording } from "@/lib/server/legal/millionea-wording";\n';

export type S8Published = { legacy: string; accepted: boolean; hashes: Record<string, string>; count: number };
export const S8_PUBLICATION_FILES = ["src/app/legal/privacy/page.tsx", "src/lib/i18n-dict.ts"] as const;

export function sameS8PublishedWords(rel: string, source: string, golden: string): boolean {
  const current = s8PublishedWords(rel, source);
  // The combined S8–S12 publication is recorded at 8ce376ca0. S11 changed §7's display-choice sentence and S12
  // added the round paragraph, so the old pre-S8 main comparison alone cannot describe the published page.
  const approvedPrivacy = rel === "src/app/legal/privacy/page.tsx" && sha(source.replace(/\r\n/g, "\n")) === "e9bd4698fa6b";
  return current.accepted && (current.legacy === s8PublishedWords(rel, golden, false).legacy || approvedPrivacy);
}

export function s8PublishedWords(rel: string, source: string, requireAdditions = true): S8Published {
  const text = source.replace(/\r\n/g, "\n");
  if (rel === "src/app/legal/privacy/page.tsx") {
    const paragraphs = [...text.matchAll(NOTICE)];
    const hashes = Object.fromEntries(LOCALES.map((loc, i) => [loc, sha((paragraphs[i]?.[0] ?? "").replace(/\s+/g, " ").trim())]));
    const rounds = [...text.matchAll(ROUND_NOTICE)];
    const roundHashes = LOCALES.map((loc, i) => sha((rounds[i]?.[0] ?? "").replace(/\s+/g, " ").trim()) === ROUND_NOTICE_HASH[loc]);
    const versions = (v: string) => (text.match(new RegExp(`(?:en: "Version |sw: "Toleo |zh: "版本 )${v}`, "g")) ?? []).length;
    const wrapped = [...text.matchAll(WORDING_BLOCK)].map((m) => m[0]);
    const slips = wrapped.map((w) => w.match(SLIP_PARAGRAPH)?.[0] ?? "");
    const slipHashes = LOCALES.map((loc, i) => sha((slips[i] ?? "").replace(/\s+/g, " ").trim()) === SLIP_NOTICE_HASH[loc]);
    // Each wrapper holds its paragraph and nothing else, no paragraph stands outside one, and the one import comes with them.
    const whole = wrapped.every((w, i) => w.replace(slips[i] ?? "", "").replace("<MillioneaWording>", "").replace("</MillioneaWording>", "").trim() === "");
    const loose = [...text.replace(WORDING_BLOCK, "").matchAll(SLIP_PARAGRAPHS)].length;
    const imports = text.split(WORDING_IMPORT).length - 1;
    const slipOk = loose === 0 && (wrapped.length === 0 ? imports === 0
      : wrapped.length === 3 && slipHashes.every(Boolean) && whole && imports === 1);
    const versionOk = rounds.length === 0 ? wrapped.length === 0 && slipOk && PRIVACY_VERSIONS.some((v) => versions(v) === 3)
      : rounds.length === 3 && roundHashes.every(Boolean) && versions(ROUND_VERSION) === 3 && slipOk;
    const accepted = (!requireAdditions && paragraphs.length === 0) || (paragraphs.length === 3
      && LOCALES.every((loc) => hashes[loc] === NOTICE_HASH[loc])
      && versionOk);
    const legacy = text.replace(WORDING_IMPORT, "").replace(WORDING_BLOCK, "").replace(NOTICE, "").replace(ROUND_NOTICE, "")
      .replace(/((?:en: "Version |sw: "Toleo |zh: "版本 ))2026-10-(?:11|13|14|15(?:\.2)?|17)/g, "$1S8-version");
    return { legacy, accepted, hashes, count: paragraphs.length };
  }
  if (rel !== "src/lib/i18n-dict.ts") return { legacy: text, accepted: true, hashes: {}, count: 0 };
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true);
  const initializer = sf.statements.filter(ts.isVariableStatement).flatMap((s) => [...s.declarationList.declarations])
    .find((d) => d.name.getText(sf) === "dict")?.initializer;
  const dict = initializer && ts.isAsExpression(initializer) ? initializer.expression : initializer;
  const property = (obj: ts.Expression | undefined, name: string) => obj && ts.isObjectLiteralExpression(obj)
    ? obj.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText(sf) === name) : undefined;
  const removed: Array<{ start: number; end: number }> = [];
  const hashes: Record<string, string> = {};
  let accepted = true, count = 0;
  for (const loc of LOCALES) {
    const journey = property(property(dict, loc)?.initializer, "journey")?.initializer;
    const additions = journey && ts.isObjectLiteralExpression(journey) ? journey.properties.filter((p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) && (KEYS as readonly string[]).includes(p.name.getText(sf))) : [];
    count += additions.length;
    const values = additions.map((p) => [p.name.getText(sf), ts.isStringLiteral(p.initializer) ? p.initializer.text : "not a string"]).sort(([a], [b]) => a.localeCompare(b));
    hashes[loc] = sha(JSON.stringify(values));
    accepted &&= (!requireAdditions && additions.length === 0) || (additions.length === KEYS.length
      && new Set(values.map(([name]) => name)).size === KEYS.length && hashes[loc] === WORD_HASH[loc]);
    for (const p of additions) removed.push({ start: p.getFullStart(), end: p.end + (text[p.end] === "," ? 1 : 0) });
  }
  let legacy = text;
  for (const range of removed.sort((a, b) => b.start - a.start)) legacy = legacy.slice(0, range.start) + legacy.slice(range.end);
  return { legacy, accepted, hashes, count };
}
