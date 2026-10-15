/** S8's approved additions only (and S12's one round paragraph in §7, below). Old legal clauses and dictionary entries still
 *  compare against origin/main. */
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
const WORD_HASH: Record<string, string> = { en: "c5a78e0f5c5a", sw: "7c5f547f68a6", zh: "53863b4a6af3" };
const NOTICE_HASH: Record<string, string> = { en: "fb825bd6a8a3", sw: "8b4d6871dca3", zh: "6e4b8029bd17" };
const NOTICE = /\n {8}<p data-policy-addition="pending-bet">[\s\S]*?\n {8}<\/p>/g;
/**
 * ⭐ S12 WP10b (Vodacom S12, `S12-PLAN.md` Risk 14, Open point 12): §7 also names a ROUND in `kp-pending-bet` — one
 * paragraph per language, after S8's, pinned by its own measured hashes — and the version moves to 2026-10-15 with it. The
 * S8 paragraphs above stay byte-identical. A round paragraph is accepted only as all three at these hashes AND under the new
 * version; S8's version stands alone only while no round paragraph exists. Legacy comparison strips both additions.
 */
const ROUND_NOTICE_HASH: Record<string, string> = { en: "5639330640e3", sw: "be2f9c62bec8", zh: "01251647a662" };
const ROUND_NOTICE = /\n {8}<p data-policy-addition="pending-round">[\s\S]*?\n {8}<\/p>/g;
const ROUND_VERSION = "2026-10-15";

export type S8Published = { legacy: string; accepted: boolean; hashes: Record<string, string>; count: number };
export const S8_PUBLICATION_FILES = ["src/app/legal/privacy/page.tsx", "src/lib/i18n-dict.ts"] as const;

export function sameS8PublishedWords(rel: string, source: string, golden: string): boolean {
  const current = s8PublishedWords(rel, source);
  return current.accepted && current.legacy === s8PublishedWords(rel, golden, false).legacy;
}

export function s8PublishedWords(rel: string, source: string, requireAdditions = true): S8Published {
  const text = source.replace(/\r\n/g, "\n");
  if (rel === "src/app/legal/privacy/page.tsx") {
    const paragraphs = [...text.matchAll(NOTICE)];
    const hashes = Object.fromEntries(LOCALES.map((loc, i) => [loc, sha((paragraphs[i]?.[0] ?? "").replace(/\s+/g, " ").trim())]));
    const rounds = [...text.matchAll(ROUND_NOTICE)];
    const roundHashes = LOCALES.map((loc, i) => sha((rounds[i]?.[0] ?? "").replace(/\s+/g, " ").trim()) === ROUND_NOTICE_HASH[loc]);
    const versions = (v: string) => (text.match(new RegExp(`(?:en: "Version |sw: "Toleo |zh: "版本 )${v}`, "g")) ?? []).length;
    const versionOk = rounds.length === 0 ? versions("2026-10-14") === 3 : rounds.length === 3 && roundHashes.every(Boolean) && versions(ROUND_VERSION) === 3;
    const accepted = (!requireAdditions && paragraphs.length === 0) || (paragraphs.length === 3
      && LOCALES.every((loc) => hashes[loc] === NOTICE_HASH[loc])
      && versionOk);
    const legacy = text.replace(NOTICE, "").replace(ROUND_NOTICE, "").replace(/((?:en: "Version |sw: "Toleo |zh: "版本 ))2026-10-(?:11|13|14|15)/g, "$1S8-version");
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
