/**
 * test:share-preview — a shared market link previews truthfully (landing v3 WP14b, K50).
 *
 * The WhatsApp / social preview of a market is og:title + og:description + og:image, and it is the
 * first thing many players ever see of a market. Two defects lived there until WP14b:
 *
 *   1. 🔴 THE MARKET PAGE WROTE A BARE `openGraph` OBJECT. Next merges `metadata` per FIELD, so a
 *      partial `openGraph` replaces the root layout's whole — the page every share links to emitted no
 *      og:type, og:site_name or og:locale. LANDING-TEN records the same shape deleting the landing's own
 *      share card; nothing guarded the law, so it lived on here.
 *   2. 🔴 THE PREVIEW READ `impliedYesPct`: "YES 100% · 0% NO" on a one-sided market and an invented
 *      "YES 50% · tipping" on a market nobody had bet on — the figures the card itself stopped printing
 *      (MOBILE-VISUAL ruling 13 / WP6; D29).
 *
 * §1 the spread law, every route · §2 the rule's behaviour · §3 the wiring. Every refusal has a control.
 *
 * Run: npm run test:share-preview   ·   RED proof: npm run red:share-preview
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment } from "./lib/decomment.mts";
import { sharePreviewPrice, sharePreviewDescription, sharePreviewSettled } from "../src/lib/markets/share-preview.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const APP = join(ROOT, "src", "app");
const rel = (f: string) => relative(ROOT, f).replace(/\\/g, "/");
let fail = 0;
const check = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  PASS ${label}`);
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

console.log("share preview (landing v3 WP14b)\n");

// ── 1 · every route's openGraph spreads ROOT_OPEN_GRAPH ────────────────────────────────────────
console.log("── 1 · the spread law");
{
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(e) ? [p] : [];
  });
  // An `openGraph:` that is a literal object must open with the spread; the layout's own assignment is the root.
  const bare = (src: string) => [...src.matchAll(/\bopenGraph:\s*(\{)?\s*([^\s,}]*)/g)]
    .filter((m) => m[1] === "{" && !m[2].startsWith("...ROOT_OPEN_GRAPH"));
  const sites: string[] = [];
  const bad: string[] = [];
  for (const f of walk(APP)) {
    const src = decomment(readFileSync(f, "utf8"));
    if (!/\bopenGraph:/.test(src)) continue;
    sites.push(rel(f));
    if (bare(src).length) bad.push(rel(f));
  }
  console.log(`     routes with openGraph: ${sites.join(", ")}`);
  check("1.1 ⛔ no route writes a bare openGraph object (each spreads ...ROOT_OPEN_GRAPH first)", bad.length === 0, bad.join(", "));
  check("1.2 the market page — the one every share links to — is among them",
    sites.includes("src/app/markets/[id]/page.tsx"));
  check("1.1-control a bare object IS detected", bare("openGraph: { title, description: desc }").length === 1
    && bare("openGraph: { ...ROOT_OPEN_GRAPH, title }").length === 0);
}

// ── 2 · the rule ─────────────────────────────────────────────────────────────────────────────────
console.log("\n── 2 · what the preview may say about a price");
{
  const s = (y: number, n: number, p = 1) => JSON.stringify(sharePreviewPrice(y, n, p));
  check("2.1 nobody ever bet → 'No bets yet', no price", s(0, 0, 0) === '{"kind":"none","label":"No bets yet"}', s(0, 0, 0));
  check("2.2 a pool emptied by a cash-out → 'No pool yet' (somebody did bet)", s(0, 0, 3) === '{"kind":"none","label":"No pool yet"}', s(0, 0, 3));
  check("2.3 money on one side → 'One side only', no price", s(5_000, 0) === '{"kind":"oneSided","label":"One side only"}'
    && s(0, 5_000) === '{"kind":"oneSided","label":"One side only"}', `${s(5_000, 0)} ${s(0, 5_000)}`);
  check("2.4 ⛔ a lopsided two-sided pool is 99/1, never 100/0", s(25_000, 100) === '{"kind":"priced","yesPct":99,"noPct":1,"lean":"leans yes"}', s(25_000, 100));
  check("2.5 …and its mirror image 1/99", s(100, 25_000) === '{"kind":"priced","yesPct":1,"noPct":99,"lean":"leans no"}', s(100, 25_000));
  check("2.6 an even pool is a real 50/50 'tipping'", s(5_000, 5_000) === '{"kind":"priced","yesPct":50,"noPct":50,"lean":"tipping"}', s(5_000, 5_000));
  const descs = [[0, 0, 0], [0, 0, 3], [5_000, 0, 1], [0, 5_000, 1], [25_000, 100, 2], [100, 25_000, 2], [199, 1, 2], [5_000, 5_000, 2]]
    .map(([y, n, p]) => sharePreviewDescription(sharePreviewPrice(y, n, p)));
  check("2.7 ⛔ no preview description states a 0% or 100% price", !descs.some((d) => /(?:^|[^\d.])(?:0|100)%/.test(d)), descs.join(" | "));
  check("2.8 a no-price description carries no percentage at all",
    !/%/.test(descs[0] + descs[1] + descs[2] + descs[3]), descs.slice(0, 4).join(" | "));
  check("2.9 a priced description states both sides", descs[7] === "YES 50% · NO 50%. Predict on 50pick.", descs[7]);
  // ⭐ CONTROL — the rounding the clamp corrects is real.
  check("2.4-control the raw share of 25,000 vs 100 DOES round to 100", Math.round((25_000 / 25_100) * 100) === 100);
}

// ── 3 · the wiring ───────────────────────────────────────────────────────────────────────────────
console.log("\n── 3 · the image and the description read the one rule");
{
  const route = decomment(readFileSync(join(APP, "api/og/market/[id]/route.tsx"), "utf8"));
  const page = decomment(readFileSync(join(APP, "markets/[id]/page.tsx"), "utf8"));
  check("3.1 the og image reads sharePreviewPrice", /sharePreviewPrice\(m\.yesPool, m\.noPool, m\.predictorCount\)/.test(route));
  check("3.2 ⛔ …and no longer reads impliedYesPct", !/impliedYesPct/.test(route));
  check("3.3 og:description comes from the same rule (and the settled one, C1)", /sharePreviewDescription\(preview, settled\)/.test(page)
    && /const preview = sharePreviewPrice\(m\.yesPool, m\.noPool, m\.predictorCount\);/.test(page));
  check("3.4 the image draws no split on a market without a price", /price\.kind === "priced" \?/.test(route));
  check("3.2-control the route scan is the real file (it renders an ImageResponse)", /new ImageResponse\(/.test(route));
}

// ── 4 · a SETTLED market's preview: the result first, the final pool, no price (landing v3 C1, commit E) ──
console.log("\n── 4 · the settled preview");
{
  check("4.1 an open or closed-but-unresolved market gets no settled preview",
    sharePreviewSettled("LIVE", null, "MARKET") === null && sharePreviewSettled("CLOSED", null, "MARKET") === null);
  const no = sharePreviewSettled("RESOLVED", "NO", "MARKET");
  check("4.2 a NO result leads with NO, in the NO tone, and reads its split as the final pool",
    no?.tone === "NO" && no.word === "NO" && no.caption === "Result" && no.poolCaption === "Final pool", JSON.stringify(no));
  const v = sharePreviewSettled("VOIDED", null, "MARKET");
  check("4.3 a VOIDED market with no stored verdict reads 'Void'", v?.tone === "VOID" && v.word === "Void", JSON.stringify(v));
  const unknown = sharePreviewSettled("RESOLVED", null, "MARKET");
  check("4.4 ⛔ RESOLVED with no recorded verdict: the word 'Resolved' and NO tone (no side beats a wrong side)",
    unknown?.tone === null && unknown.word === "Resolved", JSON.stringify(unknown));
  const up = sharePreviewSettled("RESOLVED", "YES", "UPDOWN");
  check("4.5 an Up & Down round speaks its own vocabulary: YES is 'Up'", up?.word === "Up" && up.tone === "YES", JSON.stringify(up));
  const oneSided = sharePreviewDescription(sharePreviewPrice(35_000, 0, 2), sharePreviewSettled("RESOLVED", "YES", "MARKET"));
  check("4.6 a settled one-sided market: 'Result: YES. One side only. Predict on 50pick.' — and no percentage",
    oneSided === "Result: YES. One side only. Predict on 50pick." && !/%/.test(oneSided), oneSided);
  const priced = sharePreviewDescription(sharePreviewPrice(20_000, 5_000, 4), sharePreviewSettled("RESOLVED", "NO", "MARKET"));
  check("4.7 a settled priced market: 'Result: NO. Predict on 50pick.' — the result, never a price", priced === "Result: NO. Predict on 50pick.", priced);
  check("4.7-control an OPEN priced market still states its price", sharePreviewDescription(sharePreviewPrice(20_000, 5_000, 4)) === "YES 80% · NO 20%. Predict on 50pick.");
  const route = decomment(readFileSync(join(APP, "api/og/market/[id]/route.tsx"), "utf8"));
  check("4.8 the og image reads the settled rule and draws the final pool, not a lean, once settled",
    /sharePreviewSettled\(m\.status, m\.resolvedOutcome, m\.productLine\)/.test(route) && /settled \? settled\.poolCaption : price\.lean/.test(route));
}

console.log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — share preview`);
process.exit(fail === 0 ? 0 : 1);
