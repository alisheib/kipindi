/**
 * THE RULE THE PAYOUT TURNS ON, IN A LANGUAGE THE PLAYER READS.
 *
 * THE DEFECT (F6, `resolution-criterion-english-only`, docs/POLL-OPEN-FINDINGS.md):
 * `PredictionMarket.resolutionCriterion` was ONE column, written in English by the
 * wizard and rendered RAW into every locale. A Swahili or Chinese player read the
 * sentence that decides their money in a language they may not have — and nothing on
 * the page said so, so an English paragraph under a Swahili heading read as the
 * product's considered wording rather than as a missing translation.
 *
 * ⛔ WHY THIS IS A MONEY GUARD. A player who cannot read the criterion cannot check
 * whether the rule that took their stake is the rule they agreed to. That is the
 * whole basis of a pari-mutuel bet being fair rather than merely correct.
 *
 * ⭐ WHAT IT ASSERTS, AND WHY IT IS NOT "the column exists". Two facts have to AGREE:
 * the text on screen, and the claim the page makes about which language that text is
 * in. Either alone is satisfiable by a lie — a `resolutionCriterionSw` column that is
 * never read, or a "shown in English" note printed over a Swahili paragraph. §2 pins
 * them together; §3 pins the surface to the helper so the page cannot drift back to
 * rendering the raw column.
 *
 * Run: npm run test:criterion-i18n
 */
import { pickCriterion, pickLocalized } from "../src/lib/localized.ts";
import type { Locale } from "../src/lib/i18n-dict.ts";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
/** Comments are prose, not behaviour — a claim in a `//` line must never satisfy a check. */
const decomment = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const EN = "Resolves YES if the BoT mid-rate on the last business day is below the first.";
const SW = "Inatatuliwa NDIYO iwapo kiwango cha BoT siku ya mwisho ya kazi kiko chini.";
const ZH = "若坦桑尼亚银行最后一个营业日的中间价低于首日，则结算为“是”。";

// ── 1 · The helper's truth table ─────────────────────────────────────────────
// Absence has FOUR shapes in this data (undefined, null, "", "   ") and all four
// must behave identically. A whitespace-only column is the dangerous one: it would
// render a BLANK rule while reporting a successful translation.
{
  ok("1: en gets English and is not a fallback",
     pickCriterion("en", EN, SW, ZH).text === EN && pickCriterion("en", EN, SW, ZH).fellBack === false);
  ok("1: sw gets the Swahili", pickCriterion("sw", EN, SW, ZH).text === SW);
  ok("1: zh gets the Chinese", pickCriterion("zh", EN, SW, ZH).text === ZH);

  for (const [name, v] of [["undefined", undefined], ["null", null], ["empty", ""], ["whitespace", "   \n "]] as const) {
    const r = pickCriterion("sw", EN, v, ZH);
    ok(`1: sw with a ${name} translation falls back to English, and SAYS so`,
       r.text === EN && r.shownIn === "en" && r.fellBack === true);
  }
  const z = pickCriterion("zh", EN, SW, "  ");
  ok("1: zh with a whitespace translation does the same",
     z.text === EN && z.shownIn === "en" && z.fellBack === true);

  // en can never "fall back" — it is the canonical language, so there is nothing to
  // fall back TO. A true here would print a disclosure to a reader who needs none.
  for (const v of [undefined, null, "", SW] as const) {
    ok("1: en never reports a fallback", pickCriterion("en", EN, v as string | null, ZH).fellBack === false);
  }
}

// ── 2 · ⭐ THE AGREEMENT — the assertion the defect actually fails ────────────
// `fellBack` is not decoration: it is the page's CLAIM about the text beside it.
// Asserted as an equivalence over every locale × every data shape, so neither half
// can be satisfied on its own. A helper that always returned `fellBack: false`
// (i.e. today's silent `pickLocalized` behaviour) fails this and nothing else.
{
  const locales: Locale[] = ["en", "sw", "zh"];
  const rows: Array<[string | null | undefined, string | null | undefined]> = [
    [SW, ZH], [SW, null], [null, ZH], [null, null], ["  ", "  "], ["", ZH],
  ];
  let agree = 0, disagree = 0;
  for (const loc of locales) {
    for (const [sw, zh] of rows) {
      const r = pickCriterion(loc, EN, sw, zh);
      // The claim must match the observable fact, in BOTH directions.
      const isEnglishText = r.text === EN;
      const claimsFallback = r.fellBack;
      const factIsFallback = isEnglishText && loc !== "en";
      // And `shownIn` must name the language the text is genuinely written in.
      const shownInHonest = r.shownIn === (isEnglishText ? "en" : loc);
      if (claimsFallback === factIsFallback && shownInHonest) agree++; else disagree++;
    }
  }
  ok(`2: the fallback claim matches the rendered text in all ${agree + disagree} locale × data cases`,
     disagree === 0, `${disagree} disagreed`);
  // ⚠️ THE VACUITY CHECK MUST NOT BE COUPLED TO THE VERDICT. This once read
  // `agree >= 12`, so planting the defect failed it too — a "the sweep ran" check
  // that goes red because the PRODUCT is broken tells you nothing you did not
  // already know, and would go green again for the wrong reason if the sweep ever
  // shrank to zero cases. It asserts the sweep's SHAPE: every cell was visited, and
  // the data covers translated and untranslated alike.
  ok("2: and the sweep is not vacuous — every cell ran, both arms present",
     agree + disagree === locales.length * rows.length &&
     rows.some(([sw]) => !!sw && sw.trim()) && rows.some(([sw]) => !sw || !sw.trim()),
     `${agree + disagree} cells`);

  // ⛔ THE CONTROL. `pickLocalized` picks the same TEXT for every one of these
  // inputs — that is why the defect was invisible for so long. The difference
  // between the two helpers is the fact, not the string. If this ever fails, the
  // two have diverged on text and one of them is wrong.
  let sameText = 0;
  for (const loc of locales) for (const [sw, zh] of rows) {
    if (pickCriterion(loc, EN, sw, zh).text === pickLocalized(loc, EN, sw, zh)) sameText++;
  }
  ok("2: CONTROL — pickCriterion picks the same TEXT as pickLocalized; only the disclosure is new",
     sameText === locales.length * rows.length, `${sameText}/${locales.length * rows.length}`);
}

// ── 3 · The player surface — the raw column must not reach the page ──────────
// Assert the CALL SITE, not the symbol: `pickCriterion` being imported proves
// nothing if the paragraph still prints `{m.resolutionCriterion}`.
{
  const page = decomment(read("src/app/markets/[id]/page.tsx"));

  ok("3: the market page renders the criterion through pickCriterion",
     /pickCriterion\(\s*locale\s*,\s*m\.resolutionCriterion\s*,\s*m\.resolutionCriterionSw\s*,\s*m\.resolutionCriterionZh\s*\)/.test(page));

  // The ONE render of the criterion body that is allowed to be raw is the English
  // original inside the disclosure — and that one is explicitly opt-in, behind a
  // `<details>`. So: the criterion SECTION must not print the bare column as its
  // main paragraph. Anchored on the paragraph, not on the file.
  //
  // ⛔ THE LOCATOR IS ANCHORED ON THE HEADING KEY, NOT ON THE `{/* 5. … */}` COMMENT
  // THAT SITS ABOVE IT — and that is not a style preference. The first version of
  // this check anchored on the comment, which `decomment()` (four lines up, and
  // rightly) had already deleted: it located 0 characters and then "failed" every
  // assertion inside a section it had never read. A guard whose own preprocessing
  // destroys its anchor reports the INSTRUMENT, not the product
  // ([[an-instrument-reports-its-own-staleness]]).
  const anchor = page.indexOf("t.market.resolutionCriterion");
  const open = anchor < 0 ? -1 : page.lastIndexOf("<section", anchor);
  const close = anchor < 0 ? -1 : page.indexOf("</section>", anchor);
  const section = open >= 0 && close > open ? page.slice(open, close + 10) : "";
  // ⭐ AND ASSERT THAT WHAT WAS FOUND IS WHAT WAS MEANT. A slice that ran past its
  // closing tag would stitch two sections together and could satisfy the checks
  // below out of a neighbouring block — the shape that kept `test:search-adoption`
  // green over a planted drift ([[guards-that-agree-and-are-both-wrong]]).
  ok("3: the criterion section was located", section.length > 200, `${section.length} chars`);
  ok("3: …and it is the RIGHT section — heading + source link, and it did not run away",
     section.includes("t.market.resolutionCriterion") && section.includes("m.sourceUrl") &&
     section.length < 2500 && (section.match(/<section/g) ?? []).length === 1,
     `${section.length} chars, ${(section.match(/<section/g) ?? []).length} <section>`);
  ok("3: its BODY paragraph is the localised text, not the raw column",
     /<p[^>]*>\{criterion\.text\}<\/p>/.test(section));

  // ⛔ ASSERT THE NESTING, NOT THE OPERATOR. The first version of this check required
  // a literal `criterion.fellBack &&` and failed over a correct ternary — it was
  // testing which JSX idiom the author happened to pick, which is not a fact about
  // the product. What actually matters is that the "no translation" note lives INSIDE
  // the branch the fallback fact opens: printed unconditionally it would tell a reader
  // looking at a real Swahili translation that there isn't one, which is the same
  // class of lie as the defect, pointed the other way.
  const iFact = section.indexOf("criterion.fellBack");
  const iNone = section.indexOf("criterionNoTranslation");
  const iBind = section.indexOf("criterionEnglishBinding");
  ok("3: the page branches on the fallback FACT", iFact >= 0);
  ok("3: and the 'no translation' note sits inside that branch, not unconditionally",
     iFact >= 0 && iNone > iFact && iNone - iFact < 400, `gap ${iNone - iFact}`);
  ok("3: the note is rendered exactly once — not in both arms",
     (section.match(/criterionNoTranslation/g) ?? []).length === 1);
  ok("3: and English-is-binding is the OTHER arm, after it",
     iBind > iNone, `bind@${iBind} none@${iNone}`);
}

// ── 4 · The disclosure exists in all three locales, and is not English ────────
// ⛔ A ZH key still holding the English sentence is this finding wearing a smaller
// hat, so "the key exists" is not the assertion — "the key differs" is.
{
  const dict = read("src/lib/i18n-dict.ts");
  const KEYS = ["criterionNoTranslation", "criterionEnglishBinding", "criterionShowEnglish"];
  for (const k of KEYS) {
    const vals = [...dict.matchAll(new RegExp(`\\b${k}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g"))].map((m) => m[1]);
    ok(`4: ${k} is defined in all three locales`, vals.length === 3, `found ${vals.length}`);
    ok(`4: ${k} is non-empty in all three`, vals.length === 3 && vals.every((v) => v.trim().length > 0));
    ok(`4: ${k} is genuinely translated — three DISTINCT strings`,
       vals.length === 3 && new Set(vals).size === 3, vals.length === 3 ? `${new Set(vals).size} distinct` : "");
  }
  // The SW and ZH copies must actually be in those scripts, not English pasted twice.
  const zhOf = (k: string) => [...dict.matchAll(new RegExp(`\\b${k}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g"))].map((m) => m[1])[2];
  for (const k of KEYS) {
    ok(`4: the ZH ${k} contains Han characters`, /[一-鿿]/.test(zhOf(k) ?? ""));
  }
}

// ── 5 · The columns survive a write — BOTH arms of the upsert ────────────────
// ⚠️ `marketStore.set` duplicates its whole column list across `create` and
// `update`. A field added to one arm only is silently dropped on every subsequent
// write of an existing poll, which is a data-loss bug that reads as green
// everywhere: the market is created with its translations and loses them the first
// time anything touches it.
{
  const schema = read("prisma/schema.prisma");
  const pm = schema.match(/model PredictionMarket \{[\s\S]*?\n\}/)?.[0] ?? "";
  ok("5: the PredictionMarket model was located", pm.length > 500);
  ok("5: resolutionCriterionSw is declared NULLABLE (additive)", /resolutionCriterionSw\s+String\?/.test(pm));
  ok("5: resolutionCriterionZh is declared NULLABLE (additive)", /resolutionCriterionZh\s+String\?/.test(pm));

  const dal = decomment(read("src/lib/server/market-dal.ts"));
  ok("5: toStoredMarket reads both columns",
     /resolutionCriterionSw:\s*r\.resolutionCriterionSw\s*\?\?\s*null/.test(dal) &&
     /resolutionCriterionZh:\s*r\.resolutionCriterionZh\s*\?\?\s*null/.test(dal));

  // Count WRITES, not mentions. `set()` is the only upsert here; both of its arms
  // must carry each column, so the expected count is exactly two per column.
  const setBody = dal.match(/async set\(m, tx\) \{[\s\S]*?\n  \},/)?.[0] ?? "";
  ok("5: marketStore.set was located", setBody.length > 500, `${setBody.length} chars`);
  for (const col of ["resolutionCriterionSw", "resolutionCriterionZh"]) {
    const n = (setBody.match(new RegExp(`${col}:\\s*m\\.${col}`, "g")) ?? []).length;
    ok(`5: ${col} is written in BOTH arms of the upsert (create + update)`, n === 2, `${n} arm(s)`);
  }

  // The migration must be additive: nullable, no NOT NULL, no DEFAULT rewrite.
  // Read defensively — a missing file is a FAILING assertion, never a stack trace
  // that kills the remaining checks and takes `test:all` down with it.
  let mig = "";
  try { mig = read("prisma/migrations/20260811120000_market_resolution_criterion_i18n/migration.sql"); } catch { /* reported below */ }
  ok("5: the migration file exists", mig.length > 0);
  ok("5: the migration adds both columns", /"resolutionCriterionSw"\s+TEXT/.test(mig) && /"resolutionCriterionZh"\s+TEXT/.test(mig));
  ok("5: and is purely additive — no NOT NULL, no DROP, no data rewrite",
     !/NOT\s+NULL/i.test(mig) && !/\bDROP\b/i.test(mig) && !/\bUPDATE\b/i.test(mig));
}

console.log(`\ncriterion-i18n: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
