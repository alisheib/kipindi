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
import {
  pickCriterion, pickLocalized, criterionTranslationIssue, normaliseCriterionTranslation,
} from "../src/lib/localized.ts";
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
  // 🔴 THE ORACLE IS COMPUTED FROM THE INPUTS, NOT FROM THE RESULT — and the first
  // version of this was VACUOUS, which an audit proved by planting a `pickCriterion`
  // that never reads `sw`/`zh` at all. That version derived "the fact" from `r.text`
  // itself, so a helper which always returned English was INTERNALLY CONSISTENT
  // (English text + fellBack for every non-en locale) and the agreement passed with
  // "0 disagreed". ⛔ A check that derives the expectation from the answer is the
  // guard-agrees-with-itself shape — it can only catch a helper that contradicts
  // itself, never one that is uniformly wrong.
  const usable = (v: string | null | undefined) => (v && v.trim() ? v : null);
  let agree = 0, disagree = 0;
  for (const loc of locales) {
    for (const [sw, zh] of rows) {
      // What a correct implementation MUST return, derived only from the arguments.
      const want = loc === "sw" ? usable(sw) : loc === "zh" ? usable(zh) : null;
      const expectText = want ?? EN;
      const expectFellBack = loc !== "en" && want === null;
      const expectShownIn = want ? loc : "en";

      const r = pickCriterion(loc, EN, sw, zh);
      if (r.text === expectText && r.fellBack === expectFellBack && r.shownIn === expectShownIn) agree++;
      else disagree++;
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
  // ⛔ AND THE NEGATIVE, WHICH THIS SECTION'S OWN TITLE PROMISES AND DID NOT ASSERT.
  // "the raw column must not reach the page" was only ever checked positively — a
  // page that rendered BOTH `{criterion.text}` and a bare `{m.resolutionCriterion}`
  // paragraph would have passed. The one legitimate raw render is the English
  // original inside the `<details>` disclosure, so the negative is scoped to exclude
  // that: outside `<details>`, the bare column must not appear.
  const withoutDetails = section.replace(/<details[\s\S]*?<\/details>/g, "");
  ok("3: …and the RAW column appears nowhere outside the English-original disclosure",
     !/\{m\.resolutionCriterion\}/.test(withoutDetails));
  ok("3: while the disclosure itself DOES carry it (else the negative above is vacuous)",
     /\{m\.resolutionCriterion\}/.test(section));

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

// ── 6 · F6b · what may be STORED as a translation ────────────────────────────
// Two ways a "translation" is worse than none, and the second is the one with a
// history: writing the English into the Swahili column is exactly F8
// (`proposal-publish-bakes-english-into-the-swahili-column`), which makes
// "untranslated" and "translated identically" permanently indistinguishable.
{
  for (const [name, v] of [["undefined", undefined], ["null", null], ["empty", ""], ["whitespace", "   "]] as const) {
    ok(`6: an ${name} translation is legitimate — no issue, stores null`,
       criterionTranslationIssue(v, EN) === null && normaliseCriterionTranslation(v, EN) === null);
  }
  ok("6: a stub is refused as TOO_SHORT", criterionTranslationIssue("TODO", EN) === "TOO_SHORT");
  ok("6: …and is never stored", normaliseCriterionTranslation("TODO", EN) === null);
  ok("6: the English itself is refused as SAME_AS_ENGLISH", criterionTranslationIssue(EN, EN) === "SAME_AS_ENGLISH");
  ok("6: …and is never stored", normaliseCriterionTranslation(EN, EN) === null);

  // ⭐ THE PASTE-AND-TWEAK CASE, which a naive `!==` misses entirely. An officer who
  // pastes the English and re-cases or re-spaces it has still stored the English.
  ok("6: the English re-cased is still the English",
     criterionTranslationIssue(EN.toUpperCase(), EN) === "SAME_AS_ENGLISH");
  ok("6: the English re-spaced is still the English",
     criterionTranslationIssue(`  ${EN.replace(/ /g, "  ")}  `, EN) === "SAME_AS_ENGLISH");

  ok("6: a real translation is accepted", criterionTranslationIssue(SW, EN) === null);
  ok("6: …and stored trimmed", normaliseCriterionTranslation(`  ${SW}  `, EN) === SW);
  ok("6: a Chinese translation is accepted despite being far shorter than the English",
     criterionTranslationIssue(ZH, EN) === null && ZH.length < EN.length);

  // ⛔ THE GUARANTEE, STATED AS A PROPERTY RATHER THAN A LIST OF CASES. Whatever is
  // fed in, what comes out is never the English wearing different whitespace or case.
  // This is the one assertion that would survive someone rewriting the helper.
  const flat = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const hostile = [EN, ` ${EN} `, EN.toUpperCase(), EN.replace(/ /g, "\n"), "TODO", "-", "", "   ", SW, ZH];
  const leaked = hostile.filter((h) => {
    const stored = normaliseCriterionTranslation(h, EN);
    return stored !== null && flat(stored) === flat(EN);
  });
  ok(`6: PROPERTY — across ${hostile.length} hostile inputs, the English is never stored as a translation`,
     leaked.length === 0, leaked.length ? `${leaked.length} leaked` : "");
  ok("6: …and the sweep is not vacuous — some of those inputs DO store",
     hostile.some((h) => normaliseCriterionTranslation(h, EN) !== null));
}

// ── 7 · F6b · the write path, end to end, ONE policy on both sides ───────────
{
  const wizard = decomment(read("src/app/admin/markets/new/wizard.tsx"));
  const action = decomment(read("src/app/markets/actions.ts"));
  const svc = decomment(read("src/lib/server/market-service.ts"));

  ok("7: the wizard sends both translations",
     /fd\.set\(\s*["']resolutionCriterionSw["']\s*,\s*criterionSw\s*\)/.test(wizard) &&
     /fd\.set\(\s*["']resolutionCriterionZh["']\s*,\s*criterionZh\s*\)/.test(wizard));

  // ⛔ ONE POLICY, BOTH SIDES — the E-145 shape. A client that accepts what the
  // server refuses lights up Submit on a value that is about to be rejected. Both
  // files must call the SAME imported symbol, not two copies of the same idea.
  const importsRule = (s: string) => /import\s*\{[^}]*criterionTranslationIssue[^}]*\}\s*from\s*["']@\/lib\/localized["']/.test(s);
  ok("7: the wizard imports the shared rule", importsRule(wizard));
  ok("7: the action imports the SAME shared rule", importsRule(action));
  ok("7: and neither re-implements it locally",
     !/function\s+criterionTranslationIssue/.test(wizard) && !/function\s+criterionTranslationIssue/.test(action));

  ok("7: the wizard blocks step 2 on either issue",
     /criterion\.length\s*>=\s*30\s*&&\s*!swIssue\s*&&\s*!zhIssue/.test(wizard));
  ok("7: and it evaluates the rule against the ENGLISH criterion, not against nothing",
     /swIssue\s*=\s*criterionTranslationIssue\(\s*criterionSw\s*,\s*criterion\s*\)/.test(wizard) &&
     /zhIssue\s*=\s*criterionTranslationIssue\(\s*criterionZh\s*,\s*criterion\s*\)/.test(wizard));

  ok("7: the action reads both fields off the form",
     /formData\.get\(["']resolutionCriterionSw["']\)/.test(action) &&
     /formData\.get\(["']resolutionCriterionZh["']\)/.test(action));
  ok("7: the action REFUSES rather than silently correcting",
     /criterionTranslationIssue\(/.test(action) && /SAME_AS_ENGLISH/.test(action) && /TOO_SHORT/.test(action));
  ok("7: and it passes both into CreateMarketInput",
     /resolutionCriterionSw:\s*criterionSwRaw\s*\|\|\s*null/.test(action) &&
     /resolutionCriterionZh:\s*criterionZhRaw\s*\|\|\s*null/.test(action));

  // The storage guarantee at the one place a market is born.
  ok("7: createMarket normalises both columns",
     /resolutionCriterionSw:\s*normaliseCriterionTranslation\(/.test(svc) &&
     /resolutionCriterionZh:\s*normaliseCriterionTranslation\(/.test(svc));
  // ⛔ AND THE F8 SHAPE IS NAMED AND FORBIDDEN. `?? input.resolutionCriterion` is the
  // one-character version of this whole defect; it must never appear on these columns.
  ok("7: and NEITHER falls back to the English criterion",
     !/resolutionCriterionSw:[^,\n]*\?\?\s*input\.resolutionCriterion/.test(svc) &&
     !/resolutionCriterionZh:[^,\n]*\?\?\s*input\.resolutionCriterion/.test(svc));
}

// ── 8 · F6c · the AI pipeline, GENERATE → STORE → PUBLISH ────────────────────
// ⛔ THE CHAIN IS THE ASSERTION, NOT ANY LINK IN IT. A model that generates a Swahili
// criterion, a column that stores it, and an officer screen that shows it are worth
// nothing if `publishPoll` drops it at `createMarket` — the poll would carry a real
// translation while the player is told there isn't one. That is a WRITE-ONLY FIELD,
// a defect class this campaign has already filed once, so it is asserted end to end.
{
  const claude = decomment(read("src/lib/server/ai-provider-claude.ts"));
  const gen = decomment(read("src/lib/server/ai-poll-generation.ts"));
  const cand = decomment(read("src/lib/server/market-candidate.ts"));
  // ⚠️ RE-ANCHORED 2026-08-14. The AI-poll publish chain moved OUT of
  // `src/app/admin/ai-polls/actions.ts` into `src/lib/server/ai-poll-publish.ts` (D1 — a
  // "use server" action cannot be executed by a test, so the one chain that puts a LIVE
  // market on the board was covered by nothing that ran it). This guard went red on the
  // move, which is exactly right: it is anchored on WHERE the calls are, and they moved.
  // ⛔ A guard whose anchor has gone stale is an ABSENT guard, not a failing one — so the
  // anchor is corrected here, never relaxed, and `pollAction` below asserts the action
  // still delegates to this module. Without that, a later refactor could move the calls
  // back and leave this section reading a file nothing invokes.
  const pollPub = decomment(read("src/lib/server/ai-poll-publish.ts"));
  const pollAction = decomment(read("src/app/admin/ai-polls/actions.ts"));
  const candPub = decomment(read("src/app/admin/candidates/actions.ts"));

  // ① ASKED FOR — in the tool schema the model actually answers.
  ok("8: the provider tool schema asks for both translations",
     /resolutionCriterionSw:\s*\{\s*type:\s*"string"/.test(claude) &&
     /resolutionCriterionZh:\s*\{\s*type:\s*"string"/.test(claude));
  // ⭐ AND DELIBERATELY *NOT* REQUIRED. A model forced to fill the field will invent a
  // translation, and a criterion that drifts from the English describes a DIFFERENT
  // BET while being read as the rule that decides the money. Absent is disclosed;
  // wrong is not. This asserts the omission is intentional rather than forgotten.
  // ⛔ THE *OUTER* `required`, PICKED BY WHAT IT CONTAINS. This file has more than one
  // — the `sources` sub-schema carries `required: ["url", "publisher"]`, and it comes
  // FIRST, so a plain `.match()` grabbed that one and the check failed over correct
  // code. Same shape as the two locator mistakes already recorded in this file:
  // an anchor that matches in more than one place is not an anchor.
  // ⚠️ AND THE TOKENS ARE PARSED, NOT SUBSTRING-MATCHED. `"resolutionCriterion"` is a
  // PREFIX of `"resolutionCriterionSw"`, so `includes()` cannot tell "the English is
  // required" from "the Swahili is required" — the check would have been unable to
  // fail in the direction that matters. This file's whole subject is one name being
  // mistaken for another.
  const requiredSets = [...claude.matchAll(/required:\s*\[([^\]]*)\]/g)]
    .map((m) => m[1].split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean));
  const required = requiredSets.find((set) => set.includes("resolutionCriterion")) ?? [];
  ok("8: the outer tool-schema `required` was located", required.length > 0,
     `${requiredSets.length} required-array(s) in file`);
  // ⛔ COUPLED TO EXISTENCE, because on its own this cannot fail in the direction the
  // RED run was meant to demonstrate. "Sw/Zh are absent from `required`" is ALSO true
  // when the fields do not exist at all — the pre-F6c state — so it passed in the
  // 16-failure RED run and proved nothing there. It distinguishes "deliberately
  // optional" from "wrongly required", never from "never added". The existence check
  // above is what supplies the missing half, so they are asserted together.
  const declared = /resolutionCriterionSw:\s*\{\s*type:\s*"string"/.test(claude) &&
                   /resolutionCriterionZh:\s*\{\s*type:\s*"string"/.test(claude);
  ok("8: …both are DECLARED and neither is REQUIRED — omitting beats guessing",
     declared && required.length > 0 &&
     !required.includes("resolutionCriterionSw") && !required.includes("resolutionCriterionZh"),
     declared ? "" : "fields are not declared at all");
  ok("8: the prompt tells the model to OMIT rather than guess, and never to copy the English",
     /OMIT the field entirely/i.test(claude) && /[Nn]ever copy the English/.test(claude));

  // ② STORED — and through the same rule every other writer uses.
  ok("8: the generation copies both onto the poll THROUGH the shared normaliser",
     /poll\.resolutionCriterionSw\s*=\s*normaliseCriterionTranslation\(/.test(gen) &&
     /poll\.resolutionCriterionZh\s*=\s*normaliseCriterionTranslation\(/.test(gen));
  ok("8: the officer's edit applies the same rule",
     /opts\.resolutionCriterionSw\s*!==\s*undefined/.test(gen) &&
     /opts\.resolutionCriterionZh\s*!==\s*undefined/.test(gen));
  // ⚠️ BOTH COLUMNS, BOTH DIRECTIONS — and the first version tested only `Sw` in both
  // conjuncts while its label said "both directions". Deleting the Chinese mapping
  // left it green. A label is not an assertion.
  ok("8: the AIPoll row carries BOTH columns in BOTH directions",
     /resolutionCriterionSw:\s*r\.resolutionCriterionSw\s*\?\?\s*null/.test(gen) &&
     /resolutionCriterionZh:\s*r\.resolutionCriterionZh\s*\?\?\s*null/.test(gen) &&
     /resolutionCriterionSw:\s*p\.resolutionCriterionSw/.test(gen) &&
     /resolutionCriterionZh:\s*p\.resolutionCriterionZh/.test(gen));

  // The candidate record, whose upsert duplicates its column list across two arms.
  // ⚠️ Same correction: "normalises both" tested ONE column, so the exact F8 shape
  // this file forbids could be reintroduced on the Chinese column with the guard green.
  ok("8: ingestCandidate normalises BOTH columns",
     /resolutionCriterionSw:\s*normaliseCriterionTranslation\(/.test(cand) &&
     /resolutionCriterionZh:\s*normaliseCriterionTranslation\(/.test(cand));
  for (const col of ["resolutionCriterionSw", "resolutionCriterionZh"]) {
    const n = (cand.match(new RegExp(`${col}:\\s*c\\.${col}\\s*\\?\\?\\s*null`, "g")) ?? []).length;
    ok(`8: ${col} is written in BOTH arms of the candidate upsert`, n === 2, `${n} arm(s)`);
  }

  // ③ PUBLISHED — the link that makes the other two matter.
  //
  // 🔴 SCOPED TO THE CALL, AND THIS ONE WAS VACUOUS UNTIL AN AUDIT CAUGHT IT.
  // `ai-polls/actions.ts` contains `resolutionCriterionSw: poll.resolutionCriterionSw`
  // TWICE — once in `ingestCandidate(...)` and once in `createMarket(...)`. A
  // file-wide regex therefore stayed GREEN when the `createMarket` pair was deleted,
  // which is precisely the defect this assertion claims to catch: the translation
  // stored on the poll and dropped at the one boundary that reaches a player. The
  // check named "the chain" did not test the chain.
  // ⛔ Fifth ambiguous anchor of this session — an anchor that matches in more than
  // one place is not an anchor. Each call's argument object is now extracted first.
  // ⚠️ BRACE-MATCHED, not indentation-guessed. The first version looked for the
  // literal `\n  });`, which is the closing indentation in ai-polls/actions.ts but
  // NOT in candidates/actions.ts, where the call sits inside a `try` — so it
  // extracted 0 characters there and "failed" an assertion about a call it had never
  // read. Same class as every other locator mistake in this session: an anchor that
  // depends on incidental formatting is not an anchor.
  const callBody = (src: string, fn: string) => {
    const at = src.indexOf(`await ${fn}({`);
    if (at < 0) return "";
    let depth = 0;
    for (let i = src.indexOf("{", at); i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(at, i + 1); }
    }
    return "";
  };
  const pollCreate = callBody(pollPub, "createMarket");
  const pollIngest = callBody(pollPub, "ingestCandidate");
  const candCreate = callBody(candPub, "createMarket");
  ok("8: the two calls in ai-poll-publish.ts were located SEPARATELY",
     pollCreate.length > 100 && pollIngest.length > 100 && pollCreate !== pollIngest,
     `create=${pollCreate.length} ingest=${pollIngest.length}`);
  ok("8: the candidates createMarket call was located", candCreate.length > 100, `${candCreate.length}`);
  // ⛔ AND THE MODULE THIS SECTION READS IS THE ONE THE OFFICER'S BUTTON ACTUALLY RUNS.
  // Re-anchoring a guard onto a new file is only sound while that file is still on the
  // path; otherwise the section becomes a reading of dead code that can never fail.
  ok("8: …and publishPollAction still delegates to that module, so this is live code",
     /publishApprovedPoll\s*\(/.test(pollAction) && /ai-poll-publish/.test(pollAction));

  ok("8: publishing an AI poll carries both into THE createMarket CALL",
     /resolutionCriterionSw:\s*poll\.resolutionCriterionSw/.test(pollCreate) &&
     /resolutionCriterionZh:\s*poll\.resolutionCriterionZh/.test(pollCreate));
  ok("8: publishing a CANDIDATE carries both too — the second, easily-missed path",
     /resolutionCriterionSw:\s*c\.resolutionCriterionSw/.test(candCreate) &&
     /resolutionCriterionZh:\s*c\.resolutionCriterionZh/.test(candCreate));
  ok("8: and the candidate RECORD gets them at ingest — a SEPARATE claim, separately located",
     /resolutionCriterionSw:\s*poll\.resolutionCriterionSw/.test(pollIngest) &&
     /resolutionCriterionZh:\s*poll\.resolutionCriterionZh/.test(pollIngest));

  // ⚠️ AND THE STRUCTURAL CHECK IS NOT THE EVIDENCE. `test:criterion-chain` and
  // `test:criterion-ai-publish` EXECUTE these hops with real data; this section only
  // proves the wiring is still present. Both are named here so the pair cannot drift
  // apart, and so nobody reads a green §8 as proof the value arrives.
  const wired = read("package.json");
  ok("8: the EXECUTING companions are wired, because a grep is not a proof",
     /"test:criterion-chain"/.test(wired) && /"test:criterion-ai-publish"/.test(wired));

  // ④ VISIBLE TO THE OFFICER — a translation stored and never shown is write-only,
  // and this is the sentence the payout turns on. Both a read and an edit surface.
  const detail = decomment(read("src/app/admin/ai-polls/[id]/page.tsx"));
  const editor = decomment(read("src/app/admin/ai-polls/poll-actions.tsx"));
  ok("8: the officer's review page RENDERS both translations",
     /poll\.resolutionCriterionSw/.test(detail) && /poll\.resolutionCriterionZh/.test(detail));
  ok("8: …and says what a missing one means rather than leaving a blank row",
     /No translation — players see the English/.test(detail));
  ok("8: the officer can EDIT both, under the same imported rule",
     /criterionSw/.test(editor) && /criterionZh/.test(editor) &&
     /import\s*\{[^}]*criterionTranslationIssue[^}]*\}\s*from\s*["']@\/lib\/localized["']/.test(editor));

  // 🔴 AND THE PANEL MUST *REFUSE*, NOT JUST WARN — a real defect this guard did not
  // have. The edit panel computed `swIssue`/`zhIssue` and rendered a red alert, then
  // submitted anyway: the server dropped the value and the officer got
  // "Poll updated · Changes saved". A SUCCESS TOAST OVER A DISCARDED TRANSLATION is
  // precisely the state this whole finding is about. The wizard blocks its Continue
  // on the same rule; the panel had the rule and never used it.
  // ⛔ Asserted inside `submit()`, not file-wide — the issues are *computed* elsewhere
  // in the file, so a page-wide grep would pass on the broken version.
  // ⛔ AND THERE ARE **TWO** `const submit = () => {` IN THIS FILE. Taking the first
  // grabbed the OTHER form's handler and reported "the panel does not refuse" over a
  // panel that does — the sixth ambiguous anchor of this session, in the assertion
  // written to catch the sixth defect. The right one is selected by CONTENT: the
  // handler that submits the criterion fields.
  const submitBody = (() => {
    const bodies: string[] = [];
    for (let at = editor.indexOf("const submit = () => {"); at >= 0; at = editor.indexOf("const submit = () => {", at + 1)) {
      let depth = 0;
      for (let i = editor.indexOf("{", at); i < editor.length; i++) {
        if (editor[i] === "{") depth++;
        else if (editor[i] === "}") { depth--; if (depth === 0) { bodies.push(editor.slice(at, i + 1)); break; } }
      }
    }
    return bodies.find((b) => b.includes("resolutionCriterionSw")) ?? "";
  })();
  ok("8: the edit panel's submit() was located", submitBody.length > 300, `${submitBody.length}`);
  ok("8: …and it REFUSES to save while a translation issue stands",
     /if\s*\(\s*swIssue\s*\|\|\s*zhIssue\s*\)/.test(submitBody) && /return;/.test(submitBody));

  // ⑤ The schema half, both models, both nullable and additive.
  const schema = read("prisma/schema.prisma");
  for (const model of ["AIPoll", "MarketCandidate"]) {
    const m = schema.match(new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
    ok(`8: ${model} declares both columns NULLABLE`,
       /resolutionCriterionSw\s+String\?/.test(m) && /resolutionCriterionZh\s+String\?/.test(m),
       m.length ? "" : "model not located");
  }
  let mig = "";
  try { mig = read("prisma/migrations/20260811150000_ai_resolution_criterion_i18n/migration.sql"); } catch { /* reported */ }
  ok("8: the AI migration exists and touches both tables",
     /ALTER TABLE "AIPoll"/.test(mig) && /ALTER TABLE "MarketCandidate"/.test(mig));
  ok("8: and is purely additive", mig.length > 0 && !/NOT\s+NULL/i.test(mig) && !/\bDROP\b/i.test(mig) && !/\bUPDATE\b/i.test(mig));
}

console.log(`\ncriterion-i18n: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
