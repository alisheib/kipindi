/**
 * OPERATOR_ERROR — a refusal the operator can act on must REACH the operator.
 *
 * 🔴 THE INCIDENT THIS PINS (production, 2026-08-31). Poll generation was refused by our own
 * AI spend cap. `describeAiBudgetBlock()` produced the sentence that names the cause AND the
 * fix — *"AI credit limit reached ($20.56 of $20.00 this top-up window). Raise the limit, or
 * start a new top-up window after adding credit, under Admin → AI usage."* — and the operator
 * never saw one word of it. `safeError` returned `"Generation failed"`; the console then
 * discarded even that and rendered *"The AI could not produce a valid poll. Try again."* So the
 * screen instructed a retry against a ceiling that can never yield, and the retries happened.
 *
 * ⭐ WHAT MAKES THIS SUITE DIFFERENT FROM ITS OWN SUBJECT. `ai-usage.ts` ALREADY carries a
 * paragraph warning that "a refusal that names the wrong cause sends an operator to raise a
 * limit that was never the problem", and the sentence was ALREADY defined once to prevent it.
 * Prose did not hold; the transport layer deleted the sentence anyway. So §1 asserts BEHAVIOUR
 * and §2 asserts the CALL SITES — because a green helper test proves nothing while the gate
 * that calls it still throws a plain `Error`. Measuring the helper is measuring the wrong
 * population.
 *
 * ⛔ §1b IS THE POINT OF THE SUITE, NOT A FOOTNOTE. `safeError` exists to redact — raw
 * messages carry SQL, paths and stacks. A change that shows operator refusals is only correct
 * if crashes stay hidden, so every pass-through assertion below is PAIRED with a crash that
 * must still come back as the bare fallback. Without that pair, "the message reaches the UI"
 * is satisfied by deleting the sanitiser.
 *
 * ⛔ §2/§3 DECOMMENT FIRST. The fix's own comments quote the dead strings verbatim, so a guard
 * grepping raw text matches the paragraph explaining the repair and passes for ever. That is
 * this repo's `E-186` shape; `scripts/lib/decomment.mts` is the one stripper.
 *
 * §1 behaviour + the redaction control · §2 the server call sites · §3 the console ·
 * §4 positive controls, so §3 cannot pass by deleting things.
 *
 * Run: npm run test:operator-error
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { OperatorError, safeError } from "../src/lib/server/safe-error.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const src = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8"));

// `safeError` logs the raw message; silence it so the suite output stays readable.
const realError = console.error;
console.error = () => {};

/* ─────────────────────────── §1 behaviour ─────────────────────────── */

// The exact sentence production refused with on 2026-08-31.
const BUDGET = "AI credit limit reached ($20.56 of $20.00 this top-up window). " +
  "Raise the limit, or start a new top-up window after adding credit, under Admin → AI usage.";

ok("§1.1 an OperatorError reaches the operator verbatim",
  safeError(new OperatorError(BUDGET), "Generation failed") === BUDGET);

ok("§1.2 …including the number and the place to change it",
  (() => { const s = safeError(new OperatorError(BUDGET), "Generation failed");
    return s.includes("$20.00") && s.includes("Admin → AI usage"); })());

// ⛔ THE CONTROL. If this ever goes green-by-accident the suite is worthless: it is the only
// assertion standing between the fix and a sanitiser that no longer sanitises.
ok("§1b.1 a REAL crash is still redacted to the bare fallback",
  safeError(new Error('relation "AiUsageEvent" does not exist at C:/app/src/lib/db.ts:88'),
    "Generation failed") === "Generation failed");

ok("§1b.2 …and leaks neither SQL nor a path",
  (() => { const s = safeError(new Error('relation "AiUsageEvent" does not exist at C:/app/src/lib/db.ts:88'),
    "Generation failed");
    return !s.includes("AiUsageEvent") && !s.includes("C:/app"); })());

// 🔴 The DISCRIMINATOR IS THE TYPE, NOT THE TEXT. A plain Error whose message happens to read
// like operator prose must stay redacted — otherwise the rule is "nice-sounding errors leak",
// which is not a rule anybody can apply.
ok("§1b.3 a plain Error that merely LOOKS operator-facing stays redacted",
  safeError(new Error(BUDGET), "Generation failed") === "Generation failed");

ok("§1b.4 a thrown non-Error stays redacted",
  safeError("boom", "Generation failed") === "Generation failed");

// An OperatorError with nothing to say must not blank the UI.
ok("§1.3 an empty OperatorError falls back rather than showing nothing",
  safeError(new OperatorError(""), "Generation failed") === "Generation failed");

/* ──────────────────── §2 the server call sites ──────────────────── */

const gen = src("src/lib/server/ai-poll-generation.ts");

ok("§2.1 no budget gate throws a bare Error any more",
  !/throw new Error\(describeAiBudgetBlock/.test(gen),
  "a plain Error here is redacted and the operator is back to guessing");

ok("§2.2 both budget gates (single + batch) throw OperatorError",
  (gen.match(/throw new OperatorError\(describeAiBudgetBlock/g) ?? []).length === 2,
  `found ${(gen.match(/throw new OperatorError\(describeAiBudgetBlock/g) ?? []).length}`);

ok("§2.3 …and the class is actually imported",
  /import \{ OperatorError \} from "\.\/safe-error"/.test(gen));

// The MIDDLE of the chain. §1 proves the sanitiser passes it and §2 proves the gate throws it,
// but both are satisfied while the action in between returns a hardcoded string.
ok("§2.4 the action still routes the failure through safeError",
  /safeError\(err, "Generation failed"\)/.test(src("src/app/admin/ai-polls/actions.ts")));

/* ────────────────────────── §3 the console ────────────────────────── */

const con = src("src/app/admin/ai-polls/poll-actions.tsx");

ok("§3.1 Regenerate shows the server's sentence, not a hardcoded cause",
  /overlay\.fail\("Regeneration failed", r\.error\)/.test(con));

ok("§3.2 the retry-forever sentence is gone from the console",
  !con.includes("could not produce a valid poll"),
  "this is the exact string the operator was shown while the spend cap refused");

ok("§3.3 Generate renders the server's message in the failure branch",
  /result\.message && \(/.test(con) && /\{result\.message\}/.test(con));

ok("§3.4 the failure branch no longer asserts a provider fault",
  !/text-no-300">AI provider error</.test(con),
  "our own spend cap refused before Anthropic was ever called");

ok("§3.5 the failure result carries the server's error, not a synthetic label",
  /message: r\.ok \? undefined : r\.error/.test(con) && !con.includes('reasons: ["Server error"]'));

/* ───────────────────── §4 positive controls ───────────────────── */
// §3 is a set of absence checks, and absence checks are satisfied by deletion. These pin the
// things that must SURVIVE, so "delete the console" cannot turn this suite green.

ok("§4.1 provider_error is still a real filter-reason label",
  /provider_error: "AI provider error"/.test(con),
  "a genuine provider fault must still be nameable");

ok("§4.2 the quality-filter branch is untouched",
  con.includes("Didn't pass quality checks") || con.includes("Didn&apos;t pass quality checks"));

ok("§4.3 the success path still reports quality",
  con.includes("Poll ready for review"));

ok("§4.4 the one sentence is still defined once, in ai-usage",
  /export function describeAiBudgetBlock/.test(src("src/lib/server/ai-usage.ts")));

/* ───────────────── §5 the chain, driven for real ───────────────── */
// ⭐ §1–§4 are a behavioural test plus four static ones, and static assertions prove a shape,
// not a journey. This drives the ACTUAL production gate — `generateAIPoll` at
// ai-poll-generation.ts:841 — with a genuinely exhausted budget, and hands whatever it throws
// to the REAL `safeError`. It is the only assertion here that would survive somebody
// re-implementing the path somewhere else, and the only one that proves the refusal happens
// BEFORE Anthropic is called (there is no API key in this process; a gate that let the call
// through would fail with a provider error instead of the sentence).
{
  const { recordAiUsage } = await import("../src/lib/server/ai-usage.ts");
  const { generateAIPoll } = await import("../src/lib/server/ai-poll-generation.ts");

  // No DATABASE_URL here, so the credit config is a process global and the usage store is
  // in-memory — set a $0.50 ceiling, then spend past it.
  globalThis.__50PICK_AI_CREDIT = {
    limitUsd: 0.5,
    topUpWindowStartIso: new Date(Date.now() - 60_000).toISOString(),
    alertedLevel: "none",
  };
  // ⛔ COST IS COMPUTED FROM TOKENS (`costOf`), NOT PASSED IN. The first draft of this block
  // handed `recordAiUsage` a `costUsd` field that does not exist in its input, spent about
  // $0.09 against a $0.50 ceiling, and the gate correctly did not fire — a test that had
  // decided what it was measuring without measuring it. Hence the read-back below: the
  // overspend is ASSERTED before the gate is asked to react to it.
  await recordAiUsage({
    feature: "polls", model: "claude-opus-5", inputTokens: 200_000, outputTokens: 100_000,
    ok: true, subjectType: "poll", detail: "operator-error.test.mts — synthetic overspend",
  });

  const { aiUsageDal } = await import("../src/lib/server/ai-usage-dal.ts");
  const spent = await aiUsageDal.sumCostSince(globalThis.__50PICK_AI_CREDIT!.topUpWindowStartIso);
  ok("§5.0 the window is genuinely over its limit before the gate is asked",
    spent >= 0.5, `spent $${spent.toFixed(4)} of $0.50 — if this fails the rest proves nothing`);

  let thrown: unknown = null;
  try {
    await generateAIPoll({ category: "sports", actorId: "test-officer" });
  } catch (e) { thrown = e; }

  ok("§5.1 the real gate refused", thrown !== null,
    "if this passes through, the budget cap is not enforcing at all");

  const shown = thrown === null ? "" : safeError(thrown, "Generation failed");

  ok("§5.2 …and what the operator would see names the credit limit",
    shown.includes("AI credit limit reached"), shown.slice(0, 120));

  ok("§5.3 …with the real numbers, not the fallback",
    shown.includes("$0.50") && shown !== "Generation failed", shown.slice(0, 120));

  ok("§5.4 …and tells them where to fix it",
    shown.includes("Admin → AI usage"), shown.slice(0, 120));
}

console.error = realError;
console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
