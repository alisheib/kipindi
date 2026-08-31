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

  ok("§5.5 …and the remedy is a route the console can navigate to",
    r?.refusal?.fix?.href === "/admin/ai-usage#ai-credit-budget");

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
  const EMITTERS = ["src/lib/server/ai-usage.ts"];
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
  const aiUsage = src("src/lib/server/ai-usage.ts");
  const hrefs = [...aiUsage.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
  ok("§6.3 every refusal in ai-usage carries a fix link", hrefs.length === Object.keys(ADMIN_REFUSALS).length,
    `${hrefs.length} links for ${Object.keys(ADMIN_REFUSALS).length} reasons`);

  for (const href of hrefs) {
    const [route, anchor] = href.split("#");
    const page = join("src/app", route, "page.tsx");
    ok(`§6.4 ${href} → the route exists`, existsSync(join(ROOT, page)), page);
    if (anchor && existsSync(join(ROOT, page))) {
      ok(`§6.5 ${href} → #${anchor} is rendered on that page`,
        raw(page).includes(`id="${anchor}"`),
        "the anchor must exist or the button lands at the top of a long page");
    }
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

  await setCreditLimit(spentNow * 1.05);        // now spend sits above 80% but below 100%
  ok("§7.2 a ceiling that puts spend past 80% lands on 'warn', not 'none'",
    (await getCreditConfig()).alertedLevel === "warn");

  await setCreditLimit(spentNow * 0.5);         // lower it BELOW current spend
  ok("§7.3 lowering below spend lands on 'limit' — it does not re-announce what was told",
    (await getCreditConfig()).alertedLevel === "limit");

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
  for (const rung of ["text-micro", "text-label"]) {
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

console.error = realError;
console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
