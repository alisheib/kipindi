/**
 * OPERATOR_ERROR — a refusal the operator can act on must REACH the operator, AS DATA.
 *
 * 🔴 THE INCIDENT THIS PINS (production, 2026-08-31). Poll generation was refused by our own AI
 * spend cap. `describeAiBudgetBlock()` produced the sentence naming the cause AND the fix —
 * *"AI credit limit reached ($20.56 of $20.00 this top-up window). Raise the limit, or start a
 * new top-up window after adding credit, under Admin → AI usage."* — and the operator never saw
 * one word of it. `safeError` returned `"Generation failed"`; the console discarded even that
 * and rendered *"The AI could not produce a valid poll. Try again."* So the screen instructed a
 * retry against a ceiling that can never yield, and the retries happened.
 *
 * ⭐ AND THEN THE SECOND LESSON, WHICH IS WHY §6 EXISTS. The first repair passed the ENGLISH
 * SENTENCE through. The owner read that sentence — which NAMES the screen that lifts the block
 * — and still had to ask *"where do I fix it, which screen?"* Prose that names a destination
 * cannot LINK to one. `src/lib/failure-reasons.ts` had already settled the shape for the player
 * surface: **the server says why in a machine token and carries the figures as data**. §6 is
 * what makes that shape checkable rather than merely intended.
 *
 * ⛔ §1b IS THE POINT OF THE SUITE, NOT A FOOTNOTE. `safeError` exists to redact — raw messages
 * carry SQL, paths and stacks. Showing operator refusals is only correct if crashes stay hidden,
 * so every pass-through assertion is PAIRED with a crash that must still come back as the bare
 * fallback. Without that pair, "the message reaches the UI" is satisfied by deleting the sanitiser.
 *
 * ⛔ §2/§3 DECOMMENT FIRST. The fix's own comments quote the dead strings verbatim, so a guard
 * grepping raw text matches the paragraph explaining the repair and passes for ever. That is this
 * repo's `E-186` shape; `scripts/lib/decomment.mts` is the one stripper.
 *
 * §1 the sanitiser + its redaction control · §2 the server call sites · §3 the console ·
 * §4 positive controls · §5 the chain driven for real · §6 the catalogue, both directions, and
 * every fix link resolved · §7 raising a limit must RE-ARM its alerts · §8 the fix outranks retry.
 *
 * Run: npm run test:operator-error
 */
/**
 * 🔴 FORCE THE IN-MEMORY DAL BEFORE ANYTHING BINDS TO A DATABASE. §5 and §7 WRITE: §5 calls
 * `recordAiUsage` (a real row) and §7 calls `setCreditLimit` (a real SystemConfig write). Run with
 * `DATABASE_URL` set — a `railway run`, a shell that sourced the wrong `.env` — this suite would
 * inject ~$3.50 of PHANTOM SPEND into the production usage ledger and then rewrite the LIVE AI
 * credit limit to BELOW current spend, blocking poll generation, market resolution and the Up &
 * Down oracle on a real-money platform. A test that can do that is more dangerous than the bug it
 * guards.
 *
 * ⛔ THIS IS THE REPO'S EXISTING CONVENTION AND I SIMPLY DID NOT FOLLOW IT — `ai-usage.test.mts:8`
 * has carried these three lines all along. The §0 assertion below is the part that convention
 * lacks: env-setting is silent if a module has already bound, so the suite also PROVES it is on
 * the memory store before it writes anything.
 */
process.env.USE_PRISMA_DAL = "false";
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { OperatorError, safeError, safeRefusal, refuseFrom } from "../src/lib/server/safe-error.ts";
import { ADMIN_REFUSALS, isKnownRefusal, refusalFigures } from "../src/lib/operator-refusal.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const src = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8"));
const raw = (p: string) => readFileSync(join(ROOT, p), "utf8");

// `safeError` logs the raw message; silence it so the suite output stays readable.
const realError = console.error;
console.error = () => {};

/* ───────── §0 the premise: this suite may NOT touch a real database ───────── */
// ⛔ FAIL-FAST, BEFORE ANY WRITE. Setting env is silent if a module bound earlier, so the guard
// asserts the OUTCOME rather than trusting the intent. If this ever goes red, stop — do not
// "fix" it by deleting the check; §5 and §7 write, and the target would be production.
{
  const { hasDatabase } = await import("../src/lib/server/prisma.ts");
  if (hasDatabase()) {
    console.error = realError;
    console.error("\n⛔ ABORT — a DATABASE is reachable. §5 records usage and §7 rewrites the AI\n" +
      "   credit limit; against a real database that is phantom spend in the ledger and a live\n" +
      "   money control silently changed. Unset DATABASE_URL and re-run.\n");
    process.exit(1);
  }
  ok("§0 the suite is on the in-memory store — it cannot reach production", true);
}

/* ─────────────────────── §1 the sanitiser ─────────────────────── */

// The exact sentence production refused with on 2026-08-31.
const BUDGET = "AI credit limit reached ($20.56 of $20.00 this top-up window). " +
  "Raise the limit, or start a new top-up window after adding credit, under Admin → AI usage.";
const REF = { reason: "ai_budget_exhausted", detail: { spentUsd: 20.5573, limitUsd: 20 },
  fix: { label: "Open AI usage → Credit budget", href: "/admin/ai-usage#ai-credit-budget" } } as const;

ok("§1.1 an OperatorError reaches the operator verbatim",
  safeError(new OperatorError(BUDGET), "Generation failed") === BUDGET);

ok("§1.2 …including the number and the place to change it",
  (() => { const s = safeError(new OperatorError(BUDGET), "Generation failed");
    return s.includes("$20.00") && s.includes("Admin → AI usage"); })());

// ⛔ THE CONTROL. The only assertion standing between this seam and a sanitiser that no longer
// sanitises. If it ever goes green by accident the whole suite is worthless.
ok("§1b.1 a REAL crash is still redacted to the bare fallback",
  safeError(new Error('relation "AiUsageEvent" does not exist at C:/app/src/lib/db.ts:88'),
    "Generation failed") === "Generation failed");

ok("§1b.2 …and leaks neither SQL nor a path",
  (() => { const s = safeError(new Error('relation "AiUsageEvent" does not exist at C:/app/src/lib/db.ts:88'),
    "Generation failed");
    return !s.includes("AiUsageEvent") && !s.includes("C:/app"); })());

// 🔴 THE DISCRIMINATOR IS THE TYPE, NOT THE TEXT. A plain Error whose message happens to read
// like operator prose must stay redacted — otherwise the rule is "nice-sounding errors leak",
// which is not a rule anybody can apply.
ok("§1b.3 a plain Error that merely LOOKS operator-facing stays redacted",
  safeError(new Error(BUDGET), "Generation failed") === "Generation failed");

ok("§1b.4 a thrown non-Error stays redacted",
  safeError("boom", "Generation failed") === "Generation failed");

ok("§1.3 an empty OperatorError falls back rather than showing nothing",
  safeError(new OperatorError(""), "Generation failed") === "Generation failed");

/* §1c the STRUCTURED half */

ok("§1c.1 safeRefusal returns the payload for an OperatorError",
  safeRefusal(new OperatorError(BUDGET, REF))?.reason === "ai_budget_exhausted");

ok("§1c.2 …and nothing for a crash, so a caller may spread it unconditionally",
  safeRefusal(new Error("boom")) === undefined && safeRefusal(new OperatorError(BUDGET)) === undefined);

ok("§1c.3 refuseFrom carries BOTH halves in one call",
  (() => { const r = refuseFrom(new OperatorError(BUDGET, REF), "Generation failed");
    return r.ok === false && r.error === BUDGET && r.refusal?.detail?.limitUsd === 20; })());

// ⛔ A surface that has not been taught this reason must still have a sentence. This is what
// makes adding a reason safe.
ok("§1c.4 …and a crash still yields the fallback sentence with NO refusal",
  (() => { const r = refuseFrom(new Error("SELECT * FROM x"), "Generation failed");
    return r.error === "Generation failed" && r.refusal === undefined; })());

ok("§1c.5 the refusal is JSON-serialisable — it crosses the action boundary",
  (() => { const r = refuseFrom(new OperatorError(BUDGET, REF), "Generation failed");
    return JSON.parse(JSON.stringify(r)).refusal.fix.href === REF.fix.href; })());

/* ──────────────────── §2 the server call sites ──────────────────── */

const gen = src("src/lib/server/ai-poll-generation.ts");

ok("§2.1 no budget gate throws a bare Error any more",
  !/throw new Error\(describeAiBudgetBlock/.test(gen),
  "a plain Error here is redacted and the operator is back to guessing");

ok("§2.2 both budget gates (single + batch) throw OperatorError WITH the refusal",
  (gen.match(/throw new OperatorError\(describeAiBudgetBlock\([a-zA-Z]+\), aiBudgetRefusal\(/g) ?? []).length === 2,
  `found ${(gen.match(/throw new OperatorError\(describeAiBudgetBlock\([a-zA-Z]+\), aiBudgetRefusal\(/g) ?? []).length}`);

ok("§2.3 …and both symbols are actually imported",
  /import \{ OperatorError \} from "\.\/safe-error"/.test(gen) && /aiBudgetRefusal/.test(gen));

// The MIDDLE of the chain. §1 proves the sanitiser and §2 the gate, but both are satisfied while
// the action in between drops the structured half on the floor.
const act = src("src/app/admin/ai-polls/actions.ts");
ok("§2.4 both actions return the refusal, via the one shared builder",
  (act.match(/refuseFrom\(err, "(Generation|Batch generation) failed"\)/g) ?? []).length === 2);

/* ────────────────────────── §3 the console ────────────────────────── */

const con = src("src/app/admin/ai-polls/poll-actions.tsx");

ok("§3.1 Regenerate passes the server's sentence AND the refusal",
  /overlay\.fail\("Regeneration failed", r\.error, r\.refusal\)/.test(con));

ok("§3.2 the retry-forever sentence is gone from the console",
  !con.includes("could not produce a valid poll"),
  "the exact string shown to the operator while the spend cap refused");

ok("§3.3 Generate carries the refusal into its result",
  /refusal: r\.ok \? undefined : r\.refusal/.test(con));

ok("§3.4 the failure branch no longer asserts a provider fault",
  !/text-no-300">AI provider error</.test(con),
  "our own spend cap refused before Anthropic was ever called");

ok("§3.5 the figures render from DATA, not from the sentence",
  /refusalRows\(result\.refusal\)/.test(con) && !/result\.message\.match|\.exec\(result\.message/.test(con));

// 🔴 The other half of the incident: correcting the words while leaving a retry button under
// them still invites the loop.
ok("§3.6 a known refusal replaces 'Generate another' with the remedy",
  /refusalFix\(result\.refusal\) \?/.test(con) && /Generate another/.test(con),
  "both branches must exist — the remedy when known, the retry when not");

/* ───────────────────── §4 positive controls ───────────────────── */
// §3 is largely absence checks, and absence checks are satisfied by deletion. These pin what must
// SURVIVE, so "delete the console" cannot turn this suite green.

ok("§4.1 provider_error is still a real filter-reason label",
  /provider_error: "AI provider error"/.test(con), "a genuine provider fault must stay nameable");

ok("§4.2 the quality-filter branch is untouched",
  con.includes("Didn't pass quality checks") || con.includes("Didn&apos;t pass quality checks"));

ok("§4.3 the success path still reports quality", con.includes("Poll ready for review"));

ok("§4.4 the one sentence is still defined once, in ai-usage",
  /export function describeAiBudgetBlock/.test(src("src/lib/server/ai-usage.ts")));

/* ───────────────── §5 the chain, driven for real ───────────────── */
// ⭐ §1–§4 are behavioural plus static, and static assertions prove a shape, not a journey. This
// drives the ACTUAL production gate with a genuinely exhausted budget and hands what it throws to
// the REAL `refuseFrom`. It is the only assertion that would survive somebody re-implementing the
// path elsewhere, and the only one proving the refusal happens BEFORE Anthropic is called (there
// is no API key in this process; a gate that let the call through would fail differently).
{
  const { recordAiUsage } = await import("../src/lib/server/ai-usage.ts");
  const { aiUsageDal } = await import("../src/lib/server/ai-usage-dal.ts");
  const { generateAIPoll } = await import("../src/lib/server/ai-poll-generation.ts");

  globalThis.__50PICK_AI_CREDIT = {
    limitUsd: 0.5,
    topUpWindowStartIso: new Date(Date.now() - 60_000).toISOString(),
    alertedLevel: "none",
  };
  // ⛔ COST IS COMPUTED FROM TOKENS (`costOf`), NOT PASSED IN. The first draft of this block
  // handed `recordAiUsage` a `costUsd` field that does not exist, spent ~$0.09 against a $0.50
  // ceiling, and the gate correctly did not fire — a test that had decided what it was measuring
  // without measuring it. §5.0 is the repair: assert the overspend BEFORE asking the gate.
  await recordAiUsage({
    feature: "polls", model: "claude-opus-5", inputTokens: 200_000, outputTokens: 100_000,
    ok: true, subjectType: "poll", detail: "operator-error.test.mts — synthetic overspend",
  });

  const spent = await aiUsageDal.sumCostSince(globalThis.__50PICK_AI_CREDIT!.topUpWindowStartIso);
  ok("§5.0 the window is genuinely over its limit before the gate is asked",
    spent >= 0.5, `spent $${spent.toFixed(4)} of $0.50 — if this fails the rest proves nothing`);

  let thrown: unknown = null;
  try { await generateAIPoll({ category: "sports", actorId: "test-officer" }); }
  catch (e) { thrown = e; }

  ok("§5.1 the real gate refused", thrown !== null,
    "if this passes through, the budget cap is not enforcing at all");

  const r = thrown === null ? null : refuseFrom(thrown, "Generation failed");

  ok("§5.2 …the sentence names the credit limit",
    !!r && r.error.includes("AI credit limit reached"), r?.error.slice(0, 90));

  ok("§5.3 …the machine token is carried, not inferred from the prose",
    r?.refusal?.reason === "ai_budget_exhausted", String(r?.refusal?.reason));

  ok("§5.4 …the FIGURES are numbers, matching what was actually spent",
    typeof r?.refusal?.detail?.spentUsd === "number"
    && Math.abs(Number(r?.refusal?.detail?.spentUsd) - spent) < 1e-6
    && Number(r?.refusal?.detail?.limitUsd) === 0.5,
    JSON.stringify(r?.refusal?.detail));

  /**
   * ⚠️ THE LITERAL CHANGED ON 2026-09-02, AND CHANGING A PINNED ASSERTION DESERVES A REASON.
   * `/admin/ai-usage` gained a section rail, which moved the Credit budget card onto the
   * `settings` tab — so `?tab=settings` is not decoration here, it is the difference between a
   * remedy button that lands on the control and one that lands on a section where the anchor is
   * not rendered at all. The assertion is pinned to the WHOLE href on purpose: this is the one
   * link an operator follows while the platform is refusing to spend, and a silent drift in it
   * would only ever be discovered by someone already blocked.
   */
  ok("§5.5 …and the remedy is a route the console can navigate to",
    r?.refusal?.fix?.href === "/admin/ai-usage?tab=settings#ai-credit-budget",
    String(r?.refusal?.fix?.href));

  // The renderer, on the real payload — proves the figures survive formatting.
  const rows = refusalFigures(r!.refusal!);
  ok("§5.6 the rendered figures show real money, not '$undefined'",
    rows.length === 2 && rows.every((x) => /^\$\d/.test(x.value)), JSON.stringify(rows));
}

/* ───────── §6 the catalogue, both directions, links resolved ───────── */
// ⛔ `docs/FAILURE-INVENTORY.md` §3.12 deleted six `REASON_BY_CODE` rows that NOTHING emitted, and
// §3.10 found a dead phrase test hiding a live wrong heading. A catalogue only helps if BOTH
// directions are checked: an unemitted row is dead copy, an unrostered reason renders as nothing.
{
  // ⛔ SCAN THE BODIES OF FUNCTIONS RETURNING `OperatorRefusal`, NOT EVERY `reason:` IN THE FILE.
  // The first draft did the latter and reported `budget` and `cycle` as unrostered reasons — they
  // are `AiBudgetBlock.reason`, an INTERNAL vocabulary that happens to share the field name. Two
  // meanings of one word in one file is this repo's `E-179`; the guard has to know which one it
  // is reading, or it fails on correct code and gets "fixed" by loosening it.
  // ⚠️ EVERY file that builds an `OperatorRefusal`. This listed only `ai-usage.ts`, so the moment
  // a second gate started emitting one (the AI-toolkit kill-switch, in `ai-controls.ts`) §6.1
  // reported its catalogue row as dead copy — the guard was measuring a subset of the emitters
  // and calling it the whole population.
  const EMITTERS = ["src/lib/server/ai-usage.ts", "src/lib/server/ai-controls.ts"];
  const emitted = new Set<string>();
  for (const f of EMITTERS) {
    const text = src(f);
    for (const m of text.matchAll(/function\s+\w+\([^)]*\):\s*OperatorRefusal\s*\{/g)) {
      const body = text.slice(m.index!, text.indexOf("\n}", m.index!));
      for (const r of body.matchAll(/reason: "([a-z0-9_]+)"/g)) emitted.add(r[1]);
    }
  }
  ok("§6.0 the emitter scan found something — an empty set passes §6.2 vacuously",
    emitted.size > 0, `${emitted.size} reasons emitted`);

  for (const key of Object.keys(ADMIN_REFUSALS)) {
    ok(`§6.1 catalogue row '${key}' is actually emitted`, emitted.has(key),
      "a row nothing emits is dead copy that will rot");
  }
  for (const e of emitted) {
    ok(`§6.2 emitted reason '${e}' has a catalogue row`, Object.prototype.hasOwnProperty.call(ADMIN_REFUSALS, e),
      "an unrostered reason renders as the bare sentence with no figures and no remedy");
  }

  // ⛔ A BUTTON THAT GOES NOWHERE IS WORSE THAN THE SENTENCE IT REPLACED. Resolve every fix link
  // to a real page file, and every #anchor to an `id` actually rendered on THAT page.
  /**
   * ⛔ A REASON MAY BE LINK-LESS, BUT ONLY DELIBERATELY. `ai_pollgen_disabled` has no `fix`
   * because the AI toolkit is a POPOVER IN THE ADMIN HEADER, not a route — inventing an href to
   * have a button would be a button that goes nowhere. Everything else must carry one.
   * ⚠️ This assertion used to be `hrefs.length === reasons.length`, which broke the moment a
   * legitimately link-less reason existed and would have been "fixed" by loosening it.
   */
  const LINKLESS = new Set(["ai_pollgen_disabled"]);
  const emitterSrc = EMITTERS.map(src).join("\n");
  const hrefs = [...emitterSrc.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
  const needLinks = Object.keys(ADMIN_REFUSALS).filter((r) => !LINKLESS.has(r));
  ok("§6.3 every reason that should carry a fix link has one",
    hrefs.length === needLinks.length,
    `${hrefs.length} links for ${needLinks.length} linkable reasons (${[...LINKLESS].join(", ")} link-less by design)`);

  // …and the link-less one is link-less ON PURPOSE, not by omission.
  for (const r of LINKLESS) {
    ok(`§6.3b '${r}' is emitted without a fix, deliberately`,
      new RegExp(`reason: "${r}"(?![^}]*fix:)`).test(emitterSrc),
      "if this reason ever gains a route, remove it from LINKLESS rather than widening §6.3");
  }

  for (const href of hrefs) {
    /**
     * ⛔ THE QUERY IS STRIPPED TOO, AND IT WAS NOT UNTIL 2026-09-02. This split only removed the
     * `#anchor`, so the first remedy href to carry a query — `/admin/ai-usage?tab=settings
     * #ai-credit-budget`, needed once that page gained a section rail and the Credit budget card
     * moved onto a tab — was resolved to the literal path
     * `src/app/admin/ai-usage?tab=settings/page.tsx` and reported as a route that does not exist.
     * ⭐ The href was CORRECT and the gate was one level too shallow, which is the more dangerous
     * direction only because it is the one that gets "fixed" by weakening the href: dropping the
     * query to make the gate green would have shipped a remedy button that lands on the wrong
     * section. A route is its path; the query and the hash are arguments to it.
     */
    const [pathAndQuery, anchor] = href.split("#");
    const route = pathAndQuery.split("?")[0];
    const page = join("src/app", route, "page.tsx");
    ok(`§6.4 ${href} → the route exists`, existsSync(join(ROOT, page)), page);
    if (anchor && existsSync(join(ROOT, page))) {
      const pageSrc = raw(page);
      ok(`§6.5 ${href} → #${anchor} is rendered on that page`,
        pageSrc.includes(`id="${anchor}"`),
        "the anchor must exist or the button lands at the top of a long page");

      /**
       * ⛔ AN ANCHOR THAT EXISTS IS NOT AN ANCHOR THAT HELPS, and §6.5 alone let a real defect
       * through. `ai_cycle_ended` pointed at `#ai-cycles` — a card that RENDERS cycle history and
       * contains no control. The only thing that lifts that refusal, `StartCycleControl`, sits in
       * the paused-gate banner ABOVE it, so following the remedy scrolled the button the operator
       * needed off the top of the screen. §6.5 passed the whole time: the id was there.
       * An adversarial audit found it, not this suite. So the anchored region must now contain
       * something the operator can actually operate.
       */
      // ⚠️ 6000 chars, not 2500: this repo writes long explanatory comments INSIDE its markup, and
      // `#ai-credit-budget` sits 44 lines above its own `<CreditControls>` — almost all of it
      // prose. A window tuned to line count rather than to this repo's actual density reported a
      // correct card as control-less on the first run.
      const at = pageSrc.indexOf(`id="${anchor}"`);
      const region = at >= 0 ? pageSrc.slice(at, at + 6000) : "";
      ok(`§6.5b ${href} → #${anchor} actually CONTAINS a control`,
        /<(Button|button|form|Link|input|select)\b/.test(region) || /<[A-Z]\w*(Control|Controls)\b/.test(region),
        "scrolling to a read-only card leaves the operator exactly where they were stuck");
    }
  }

  /**
   * ⛔ THE THREE HALVES OF A FIGURE MUST AGREE, and nothing checked that. A row names its
   * `figures`; `format` says how to render each; `FIGURE_LABELS` supplies the word the operator
   * reads. Miss the format and a dollar amount prints as a bare number; miss the label and the
   * RAW KEY (`spentUsd`) appears on screen in front of an officer. Both are silent.
   */
  const refusalSrc = src("src/lib/operator-refusal.ts");
  const labelled = new Set([...refusalSrc.matchAll(/^\s{2}(\w+):\s*"/gm)].map((m) => m[1]));
  for (const [key, spec] of Object.entries(ADMIN_REFUSALS)) {
    const s = spec as unknown as { figures: readonly string[]; format: Record<string, string> };
    for (const fig of s.figures) {
      ok(`§6.8 ${key}.${fig} has a format`, typeof s.format[fig] === "string", `format=${s.format[fig]}`);
      ok(`§6.8b ${key}.${fig} has an operator-facing label`, labelled.has(fig),
        "without one the raw key is what the officer reads");
    }
  }

  // ⭐ EXERCISE THE OTHER ROW END-TO-END. §5 drives `ai_budget_exhausted` through the real gate;
  // `ai_cycle_ended` was only ever asserted as a shape, so a broken figure in it would ship.
  {
    const { aiBudgetRefusal } = await import("../src/lib/server/ai-usage.ts");
    const cyc = aiBudgetRefusal({ ok: false, reason: "cycle", spentUsd: 0, limitUsd: 0, lastClosedIndex: 7 } as never);
    const rows = refusalFigures(cyc);
    ok("§6.9 ai_cycle_ended renders real figures, not '$undefined'",
      cyc.reason === "ai_cycle_ended" && rows.length === 2
      && rows[0].value === "7" && rows[1].value === "8"
      && !JSON.stringify(rows).includes("undefined"),
      JSON.stringify(rows));
    ok("§6.9b …and its remedy points at the control that lifts it",
      cyc.fix?.href === "/admin/ai-usage#ai-cycle-gate" && cyc.fix?.domain === "ops");
  }

  ok("§6.6 an unknown reason degrades to the sentence, it does not blank the card",
    !isKnownRefusal({ reason: "reason_from_a_newer_server" }) && refusalFigures({ reason: "nope" }).length === 0);

  ok("§6.7 a missing figure is omitted, never rendered as 'undefined'",
    (() => { const rows = refusalFigures({ reason: "ai_budget_exhausted", detail: { spentUsd: 5 } });
      return rows.length === 1 && !JSON.stringify(rows).includes("undefined"); })());
}

/* ───────── §7 raising a limit must RE-ARM its own alerts ───────── */
// 🔴 MEASURED ON PRODUCTION 2026-08-31, not reasoned about: the stored row was
// {limitUsd:20, alertedLevel:"limit"} with $20.5573 spent. Raising the ceiling to $70 carried
// `alertedLevel:"limit"` across, and `checkLimitAndAlert` only ESCALATES — so warn (1 ≤ 2) and
// limit (2 ≤ 2) would both return early and NEITHER alert would ever fire again in that window.
// The operator would cross $49 of spend and hit a hard block with no warning: the same silent
// wall as the incident, one ceiling later.
{
  const { setCreditLimit, getCreditConfig, recordAiUsage } = await import("../src/lib/server/ai-usage.ts");

  globalThis.__50PICK_AI_CREDIT = {
    limitUsd: 20, topUpWindowStartIso: new Date(Date.now() - 60_000).toISOString(), alertedLevel: "limit",
  };
  await recordAiUsage({ feature: "polls", model: "claude-haiku-4-5", inputTokens: 1_000_000,
    outputTokens: 1_000_000, ok: true, subjectType: "poll", detail: "§7 spend" });
  const spent7 = (await (await import("../src/lib/server/ai-usage-dal.ts")).aiUsageDal)
    .sumCostSince(globalThis.__50PICK_AI_CREDIT!.topUpWindowStartIso);
  const spentNow = await spent7;

  await setCreditLimit(spentNow * 3);           // raise well clear of current spend
  const after = await getCreditConfig();
  ok("§7.1 raising the ceiling clear of spend RE-ARMS both alerts",
    after.alertedLevel === "none",
    `spent $${spentNow.toFixed(4)}, new limit $${after.limitUsd.toFixed(4)}, level ${after.alertedLevel}`);

  // 🔴 THESE TWO ASSERTED THE BUG. They required `alertedLevel` to RISE to match the new ceiling —
  // "reached" — when the field means "already ANNOUNCED". Raising it marks an email as sent that
  // nobody sent, so the operator silently loses the very warning the Credit budget card promises.
  // A green suite over a real defect, written by the same hand that wrote the defect.
  await setCreditLimit(spentNow * 1.05);        // spend now sits above 80% but below 100%
  ok("§7.2 lowering into the 80% band does NOT mark the unsent warning as already sent",
    (await getCreditConfig()).alertedLevel === "none",
    "warn was never announced, so it must still be allowed to fire");

  await setCreditLimit(spentNow * 0.5);         // lower it BELOW current spend
  ok("§7.3 lowering below spend still leaves the limit alert free to fire",
    (await getCreditConfig()).alertedLevel === "none");

  // …and the no-duplicate half of the same rule: a level ALREADY announced is never re-armed by a
  // further lowering, or the operator gets the same alert twice.
  globalThis.__50PICK_AI_CREDIT = { ...(await getCreditConfig()), alertedLevel: "limit" };
  await setCreditLimit(spentNow * 0.4);
  ok("§7.3b an ALREADY-announced level survives a further lowering — no duplicate alert",
    (await getCreditConfig()).alertedLevel === "limit");

  // And a broken meter must not lose the ceiling change (assertAiBudget fails open; so must this).
  const dal = (await import("../src/lib/server/ai-usage-dal.ts")).aiUsageDal as { sumCostSince: (s: string) => Promise<number> };
  const realSum = dal.sumCostSince;
  dal.sumCostSince = async () => { throw new Error("meter unavailable"); };
  let threw = false;
  try { await setCreditLimit(123.45); } catch { threw = true; }
  dal.sumCostSince = realSum;
  ok("§7.3c a broken meter cannot block a ceiling change",
    !threw && (await getCreditConfig()).limitUsd === 123.45, threw ? "setCreditLimit threw" : "");

  ok("§7.4 the threshold formula is defined ONCE and shared",
    (src("src/lib/server/ai-usage.ts").match(/function alertLevelFor\(/g) ?? []).length === 1
    && (src("src/lib/server/ai-usage.ts").match(/alertLevelFor\(/g) ?? []).length >= 3,
    "checkLimitAndAlert and setCreditLimit must not carry separate copies");
}

/* ───────── §8 the shared overlay, and who wins the one slot ───────── */
{
  const ov = src("src/components/admin/action-overlay.tsx");

  ok("§8.1 the overlay accepts a refusal as a third, optional argument",
    /fail = useCallback\(\(title: string, message: string, refusal\?: OperatorRefusal\)/.test(ov),
    "optional, so all fourteen existing call sites are untouched");

  ok("§8.2 the fix OUTRANKS the retry in the single secondary slot",
    /const secondaryLabel = fix \? fix\.label : \(onRetry/.test(ov),
    "offering 'Try again' against a spend ceiling is what the incident did to the operator");

  ok("§8.3 the figures reach the result card as data",
    /details=\{figures\.length > 0 \? figures : undefined\}/.test(ov));

  ok("§8.4 an unknown reason still renders the action's own title",
    /known \? ADMIN_REFUSALS\[known\.reason\]\.title : /.test(ov));

  ok("§8.5 the client does NOT import the contract from lib/server",
    !/from "@\/lib\/server\//.test(ov) && /from "@\/lib\/operator-refusal"/.test(ov),
    "a client file reaching into lib/server is how server code lands in the browser bundle");
}

/* ───────── §9 the bench measures the PRODUCT, not a lookalike ───────── */
/**
 * ⛔ `qa:refusal` RENDERS A COPY OF THE PRODUCT'S MARKUP, and a copy drifts. That is the one
 * structural weakness of a static bench: it can go on passing perfectly against markup nobody
 * ships, which is this programme's signature failure — a true measurement over the wrong
 * population. Its own header already records two versions of exactly that (a container pinned at
 * `max-width:420px` with no `w-[90vw]`, and a modal footer modelled as a two-up row when the real
 * one stacks `w-full`).
 *
 * ⭐ SO THE COPY IS PINNED TO THE ORIGINAL HERE. These are cheap string assertions, and each one
 * fails the moment the product moves and the bench does not.
 */
{
  const bench = src("scripts/design-gate/refusal-bench.mjs");
  const usage = src("src/lib/server/ai-usage.ts");

  // The label the bench measures must be the label the server actually sends.
  const shipped = /label: "([^"]*Credit budget[^"]*)"/.exec(usage)?.[1] ?? "";
  ok("§9.1 the bench measures the label the server really emits",
    shipped.length > 0 && bench.includes(`: "${shipped}"`), `server="${shipped}"`);

  // The row and button classes the bench measures must be the ones the console really renders.
  ok("§9.2 the bench's action row matches the console's",
    con.includes('className="flex flex-wrap gap-2 pt-1"') && bench.includes('"flex flex-wrap gap-2 pt-1"'));

  ok("§9.3 the bench's button basis matches the console's",
    con.includes("basis-[8rem]") && bench.includes("basis-[8rem]"));

  // ⛔ THE FIGURE RUNGS TOO — and this one was MISSED first time round, which is the lesson.
  // §9 pinned the row, the basis and the container, then the type-scale ratchet moved the figure
  // classes from `text-[10px]/text-[12px]` to `text-micro/text-label` and the bench went on
  // measuring the OLD literals. `text-micro` carries `letterSpacing: 0.4px` that a bare
  // `text-[10px]` does not, so the bench was measuring narrower text than the product renders.
  // A pin that covers most of a specimen still lets the rest drift.
  // ⚠️ `text-body-sm`, not `text-label`, for the VALUE — `text-label` is 12px and §T4's reading
  // floor is 12.5px, so `test:type-scale` §3 counted the figure value as sub-floor reading copy
  // (751 against a ratchet of 750). 13px also matches what the shared OperationResultModal already
  // renders its details at, so the two surfaces now agree on the figure size as well as the order.
  for (const rung of ["text-micro", "text-body-sm"]) {
    ok(`§9.3b the bench uses the console's ${rung} rung`,
      con.includes(rung) && bench.includes(rung),
      "a rung carries tracking and line-height a bare px literal does not");
  }
  ok("§9.3c …and neither still carries the retired px literals",
    !bench.includes('text-[10px]') && !bench.includes('text-[12px]'));

  // The container the bench pins its card in must be the shell the console actually opens in.
  const shell = src("src/components/ui/ai-progress.tsx");
  ok("§9.4 the bench's card container matches AiOverlayShell",
    shell.includes("w-[90vw] max-w-[420px]") && bench.includes("w-[90vw] max-w-[420px]"),
    "a fixed width here invents an overflow the product does not have");

  // ⛔ AND THE CONTROL IS NOT A `red:*`. That namespace means a harness that MUTATES REAL SOURCE
  // and proves a guard catches it — which is what `test:red-anchors` §4 audits, and it correctly
  // reported this control as an undeclared 68th when it squatted there. It mutates nothing.
  const pkgJson = JSON.parse(raw("package.json")) as { scripts: Record<string, string> };
  ok("§9.5 the bench control does not squat the red:* namespace",
    !Object.keys(pkgJson.scripts).some((k) => k.startsWith("red:") && k.includes("refusal"))
    && typeof pkgJson.scripts["qa:refusal-control"] === "string");

  ok("§9.6 …and it is still reachable as a script",
    (pkgJson.scripts["qa:refusal-control"] ?? "").includes("--prove-red"));
}

/* ───────── §10 the remedy must be reachable BY THE VIEWER ───────── */
// 🔴 THE DEAD END THIS PINS. `/admin/ai-polls` is the `trading` domain; the remedy lives in `ops`.
// MODERATOR — the role that actually operates poll generation — is granted `overview` and
// `trading` only, and `defaultGrant` returns {canView:false} for any unlisted pair. So the refusal
// handed that role a button to a page it cannot open, in the slot that had been holding
// "Try again": a more complete dead end than the sentence this seam replaced.
{
  const { defaultGrant } = await import("../src/lib/server/roles.ts");

  // The PREMISE. If grants ever change so that MODERATOR can view `ops`, this goes red and the
  // scoping below becomes unnecessary — which is a thing worth being told, not silently carrying.
  ok("§10.1 MODERATOR genuinely cannot view the `ops` domain the remedy lives in",
    defaultGrant("MODERATOR", "ops").canView === false);
  ok("§10.2 …while it CAN act in `trading`, which is what lets it hit the refusal at all",
    defaultGrant("MODERATOR", "trading").canAct === true);

  // Every catalogue fix must declare the domain, or the scoping silently no-ops.
  const usage = src("src/lib/server/ai-usage.ts");
  const fixes = [...usage.matchAll(/fix: \{[^}]*\}/g)].map((m) => m[0]);
  ok("§10.3 every emitted fix declares the domain it lives in",
    fixes.length > 0 && fixes.every((f) => /domain: "/.test(f)),
    `${fixes.filter((f) => /domain: "/.test(f)).length}/${fixes.length} carry a domain`);

  const acts = src("src/app/admin/ai-polls/actions.ts");
  ok("§10.4 BOTH generate actions scope the refusal to the viewer",
    (acts.match(/scopeRefusalToViewer\(r\.refusal, officerId\)/g) ?? []).length === 2,
    "the batch path reaches the same budget gate as the single generator");

  const guard = src("src/lib/server/rbac-guard.ts");
  ok("§10.5 the scoper drops the LINK and keeps the rest of the refusal",
    /fix: undefined/.test(guard) && !/return undefined/.test(guard.slice(guard.indexOf("scopeRefusalToViewer"))),
    "a refusal with no fix still shows its title, figures and escalate line");
  ok("§10.6 …and fails towards the truthful card, never towards showing a dead link",
    /catch \{[\s\S]{0,400}fix: undefined/.test(guard));

  // The copy the viewer gets INSTEAD of the link must exist for every reason.
  for (const [key, spec] of Object.entries(ADMIN_REFUSALS)) {
    ok(`§10.7 '${key}' has an escalate line for a viewer who cannot act`,
      typeof (spec as { escalate?: string }).escalate === "string" && (spec as { escalate: string }).escalate.length > 10);
  }

  const con10 = src("src/app/admin/ai-polls/poll-actions.tsx");
  ok("§10.8 the console shows `escalate` when the remedy was withheld",
    /r\.fix \? ADMIN_REFUSALS\[r\.reason\]\.body : ADMIN_REFUSALS\[r\.reason\]\.escalate/.test(con10));
  const ov10 = src("src/components/admin/action-overlay.tsx");
  ok("§10.9 …and so does the shared overlay",
    /known\.fix \? ADMIN_REFUSALS\[known\.reason\]\.body : ADMIN_REFUSALS\[known\.reason\]\.escalate/.test(ov10));
}

console.error = realError;
console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
