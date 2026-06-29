/**
 * trilingual-titles.test.mts — functional validation of the EN/SW/ZH title
 * behavior end to end (in-memory; no DATABASE_URL, no API key → mock provider).
 *
 * Answers the real questions: a market is generated with up to three titles;
 * a player switches language repeatedly; some markets are missing translations
 * (mixed). What renders? This proves:
 *   A. pickLocalized: every locale × every data shape (present / null / empty /
 *      whitespace), repeated switching, mixed lists, idempotency, bad-locale.
 *   B. Persistence round-trip: createMarket(titleZh) → getMarket → render in
 *      all three languages; and a market missing titleZh falls back to English.
 *   C. Generation pipeline: a generated poll carries a titleZh field; controlled
 *      mode pins the operator's exact English title.
 *
 * Run: npm run test:trilingual
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY; // force the mock provider
delete process.env.DATABASE_URL;      // force the in-memory store

import { pickLocalized } from "../src/lib/localized.ts";
import type { Locale } from "../src/lib/i18n-dict.ts";
import { createMarket, getMarket } from "../src/lib/server/market-service.ts";
import { generateAIPoll } from "../src/lib/server/ai-poll-generation.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
function eq(label: string, got: unknown, want: unknown) {
  ok(label, got === want, `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

console.log("trilingual-titles\n");

/* ── A. pickLocalized matrix ─────────────────────────────────────────────── */
console.log("A. pickLocalized — locale × data-shape matrix");
const EN = "Will Simba win the league?";
const SW = "Je, Simba itashinda ligi?";
const ZH = "辛巴会赢得联赛吗？";

// full — every locale shows its own language
eq("full · en", pickLocalized("en", EN, SW, ZH), EN);
eq("full · sw", pickLocalized("sw", EN, SW, ZH), SW);
eq("full · zh", pickLocalized("zh", EN, SW, ZH), ZH);

// missing zh → zh falls back to English, sw still Swahili
eq("noZh · zh→en", pickLocalized("zh", EN, SW, null), EN);
eq("noZh · sw", pickLocalized("sw", EN, SW, null), SW);

// missing sw → sw falls back, zh still Chinese
eq("noSw · sw→en", pickLocalized("sw", EN, null, ZH), EN);
eq("noSw · zh", pickLocalized("zh", EN, null, ZH), ZH);

// English-only legacy row → every locale shows English
eq("enOnly · sw→en", pickLocalized("sw", EN, null, null), EN);
eq("enOnly · zh→en", pickLocalized("zh", EN, null, null), EN);
eq("enOnly · undefined args", pickLocalized("zh", EN), EN);

// empty string and whitespace-only are treated as absent (never blank)
eq("empty · sw→en", pickLocalized("sw", EN, "", ""), EN);
eq("empty · zh→en", pickLocalized("zh", EN, "", ""), EN);
eq("whitespace · sw→en", pickLocalized("sw", EN, "   ", "  \t "), EN);
eq("whitespace · zh→en", pickLocalized("zh", EN, "   ", "  \t "), EN);
ok("never returns blank/whitespace", [
  pickLocalized("zh", EN, "  ", "  "),
  pickLocalized("sw", EN, "", null),
  pickLocalized("en", EN, ZH, SW),
].every((s) => s.trim().length > 0));

// real text with surrounding spaces is preserved (only whitespace-ONLY falls back)
eq("padded real zh preserved", pickLocalized("zh", EN, SW, "  你好  "), "  你好  ");

// bad/unknown locale (defensive — type says it can't happen) → English
eq("unknown locale → en", pickLocalized("fr" as Locale, EN, SW, ZH), EN);

/* ── A2. switch language many times — pure & idempotent ──────────────────── */
console.log("\nA2. switching language repeatedly (idempotency)");
const sequence: Locale[] = ["en", "sw", "zh", "en", "zh", "sw", "en", "zh", "sw"];
const expected = [EN, SW, ZH, EN, ZH, SW, EN, ZH, SW];
const rendered = sequence.map((loc) => pickLocalized(loc, EN, SW, ZH));
ok("9 flips back-and-forth all correct", JSON.stringify(rendered) === JSON.stringify(expected),
  `got ${JSON.stringify(rendered)}`);
// same inputs → same output every time (no hidden state)
ok("pure: 1000 repeat calls stable", Array.from({ length: 1000 },
  () => pickLocalized("zh", EN, SW, ZH)).every((s) => s === ZH));

/* ── A3. mixed list — markets with different translation coverage ────────── */
console.log("\nA3. mixed board (some markets missing translations)");
const board = [
  { en: "A-en", sw: "A-sw", zh: "A-zh" },   // full
  { en: "B-en", sw: "B-sw", zh: null },      // no zh
  { en: "C-en", sw: null, zh: null },        // en only
  { en: "D-en", sw: null, zh: "D-zh" },      // no sw
];
const view = (loc: Locale) => board.map((m) => pickLocalized(loc, m.en, m.sw, m.zh));
eq("board · zh", JSON.stringify(view("zh")), JSON.stringify(["A-zh", "B-en", "C-en", "D-zh"]));
eq("board · sw", JSON.stringify(view("sw")), JSON.stringify(["A-sw", "B-sw", "C-en", "D-en"]));
eq("board · en", JSON.stringify(view("en")), JSON.stringify(["A-en", "B-en", "C-en", "D-en"]));
// flip the whole board back to zh — identical to the first zh render (stable)
eq("board · zh again (stable)", JSON.stringify(view("zh")), JSON.stringify(["A-zh", "B-en", "C-en", "D-zh"]));

/* ── B. persistence round-trip via createMarket → getMarket ──────────────── */
async function partB() {
  console.log("\nB. createMarket → getMarket → render in 3 languages");
  const future = new Date(Date.now() + 30 * 86_400_000).toISOString();

  const withZh = await createMarket({
    titleEn: EN, titleSw: SW, titleZh: ZH,
    category: "sports", sourceUrl: "https://example.org/x",
    resolutionCriterion: "Resolves from the official league table on the date.",
    resolutionAt: future, proposedBy: "tester",
  });
  const m1 = await getMarket(withZh.id);
  ok("market persisted", !!m1);
  eq("titleZh round-trips", m1!.titleZh, ZH);
  eq("titleSw round-trips", m1!.titleSw, SW);
  eq("render zh", pickLocalized("zh", m1!.titleEn, m1!.titleSw, m1!.titleZh), ZH);
  eq("render sw", pickLocalized("sw", m1!.titleEn, m1!.titleSw, m1!.titleZh), SW);
  eq("render en", pickLocalized("en", m1!.titleEn, m1!.titleSw, m1!.titleZh), EN);
  // switch sequence on the persisted record
  const persistedFlips = (["zh", "en", "sw", "zh"] as Locale[])
    .map((l) => pickLocalized(l, m1!.titleEn, m1!.titleSw, m1!.titleZh));
  eq("persisted flips", JSON.stringify(persistedFlips), JSON.stringify([ZH, EN, SW, ZH]));

  // a market created WITHOUT a Chinese title → zh player sees English (mixed)
  const noZh = await createMarket({
    titleEn: EN, titleSw: SW,
    category: "macro", sourceUrl: "https://example.org/y",
    resolutionCriterion: "Resolves from the official source on the date.",
    resolutionAt: future, proposedBy: "tester",
  });
  const m2 = await getMarket(noZh.id);
  eq("legacy market titleZh is null", m2!.titleZh, null);
  eq("legacy market · zh→en fallback", pickLocalized("zh", m2!.titleEn, m2!.titleSw, m2!.titleZh), EN);
  eq("legacy market · sw still Swahili", pickLocalized("sw", m2!.titleEn, m2!.titleSw, m2!.titleZh), SW);
}

/* ── C. generation pipeline carries titleZh + controlled pin ─────────────── */
async function partC() {
  console.log("\nC. generation pipeline (mock provider)");
  const poll = await generateAIPoll({ category: "sports", actorId: "tester" });
  ok("generated poll has a titleZh field (string)", typeof poll.titleZh === "string");
  ok("generated poll has titleEn", !!poll.titleEn);

  // controlled mode: the operator's exact English title is pinned verbatim
  const fixed = "Will the operator-pinned exact question resolve YES by 2026?";
  const controlled = await generateAIPoll({ category: "sports", controlledTitle: fixed, actorId: "tester" });
  eq("controlled mode pins titleEn verbatim", controlled.titleEn, fixed);
}

async function main() {
  await partB();
  await partC();
  console.log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
