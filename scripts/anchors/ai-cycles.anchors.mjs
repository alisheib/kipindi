/**
 * Mutation anchors for `red:ai-cycles`.
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` audits declared anchors without
 * executing the harness, and holds a ceiling of undeclared harnesses that may only shrink.
 * Three inline anchors in `updown-push-red.mjs` rotted silently against rewritten code on
 * 2026-08-22; that is what this shape prevents.
 *
 * Each entry names the CHECK it must redden. "Exited non-zero" is not evidence: the harness
 * requires that exact check to be among the failures, and requires the gate to have reported
 * reading the mutant tree.
 *
 * ⭐ THE ONE TO READ FIRST is `pause-mode-splits-the-straddling-call`. That defect was REAL
 * and shipped in the first draft of the meter: a call that fills a cycle and has money left
 * over opened the successor, so `cycleGate` never saw a moment with no open cycle and Ali's
 * pause fired ZERO times out of six boundaries. It was found because a fixture's float dust
 * made §6 fail for what looked like the wrong reason — ⭐ a red that MISSES, or lands
 * oddly, is a finding.
 */
const METER = "src/lib/server/ai-usage.ts";
const CYCLES = "src/lib/server/ai-cycles.ts";
const RULES = "src/lib/ai-cycle-rules.ts";
const CYCLE_DAL = "src/lib/server/ai-cycle-dal.ts";

export const MUTATIONS = [
  // ── the meter ───────────────────────────────────────────────────────────────────
  {
    name: "one-call-can-only-close-one-cycle",
    why: "§5's `while` replaced by a single pass. The count is then silently capped and every "
       + "downstream figure reads cheaper than it is.",
    file: METER,
    // ⚠️ A single-pass FOR, not an `if`. The loop body uses `continue`, which is a SYNTAX
    // ERROR outside a loop — so the obvious `if` mutation made the file un-parseable and the
    // harness correctly reported it as proving NOTHING. A mutation has to compile to be a test.
    from: "    while (remaining > CYCLE_EPS) {",
    to: "    for (let onlyOnce = 0; onlyOnce < 1 && remaining > CYCLE_EPS; onlyOnce++) {",
    check: "4.1 ⛔ one call closed 30 cycles — a single `if` would have closed 1",
  },
  {
    name: "pause-mode-splits-the-straddling-call",
    why: "⭐ THE REAL BUG. Without the absorb rule the remainder opens a successor, so there is "
       + "never a moment with no open cycle and the checkpoint never fires. 0 pauses in 6 boundaries.",
    file: METER,
    from: "      if (!cfg.autoRoll && remaining > CYCLE_EPS && remaining < cycle.sizeUsd) {",
    to: "      if (false && !cfg.autoRoll && remaining > CYCLE_EPS && remaining < cycle.sizeUsd) {",
    check: "6.10 🔴 a call that STRADDLES the boundary still pauses — it does not roll over",
  },
  {
    name: "the-absorb-rule-eats-a-whole-cycle",
    why: "Dropping the `remaining < sizeUsd` guard makes one large call collapse into ONE cycle. "
       + "The denomination — the entire feature — is destroyed by a single expensive call.",
    file: METER,
    from: "      if (!cfg.autoRoll && remaining > CYCLE_EPS && remaining < cycle.sizeUsd) {",
    to: "      if (!cfg.autoRoll && remaining > CYCLE_EPS) {",
    check: "6.13 ⛔ a call worth 30 cycles still makes 30 — the absorb rule never eats a full cycle",
  },
  {
    name: "the-size-is-not-the-one-that-was-configured",
    why: "§8.4. A cycle must stamp the size in force WHEN IT OPENED. Stamping a constant makes "
       + "every historical count meaningless the moment Ali retunes the denomination.",
    file: METER,
    from: String.raw`    sizeUsd,` + "\n" + String.raw`    priceRev: PRICE_REV,`,
    to: String.raw`    sizeUsd: CYCLE_DEFAULTS.sizeUsd,` + "\n" + String.raw`    priceRev: PRICE_REV,`,
    check: "3.0 ⭐ CONTROL: cycles closed at the ORIGINAL size",
  },
  {
    name: "the-yearly-total-is-double-counted",
    why: "'Cycles this year' and its spend are the figures Ali reads by year. A silently wrong "
       + "total there is the whole failure mode of this build.",
    file: CYCLES,
    from: "    row.costUsd = round6(row.costUsd + c.costUsd);",
    to: "    row.costUsd = round6(row.costUsd + c.costUsd * 2);",
    check: "10.1 2025 closed 2 cycles totalling $100",
  },
  {
    name: "spend-is-never-denominated-at-all",
    why: "⭐ THE CONTROL OF §1. If the meter simply did nothing, a conservation check comparing "
       + "two empty sums would pass. §1.0 and §1.3 are what stop that.",
    file: METER,
    from: "  if (!(costUsd > CYCLE_EPS)) return;",
    to: "  if (true) return;",
    check: "1.0 ⭐ CONTROL: the corpus is non-empty — this section measured something",
  },
  {
    name: "a-closed-cycle-can-close-before-it-opened",
    why: "§10r. Clock skew would write a negative duration into the one figure Ali asked for by "
       + "name — how long each cycle lasted.",
    file: METER,
    from: "      const closedAt = Date.parse(atIso) >= Date.parse(cycle.openedAt) ? atIso : cycle.openedAt;",
    to: "      const closedAt = new Date(Date.parse(cycle.openedAt) - 60_000).toISOString();",
    check: "2.5 ⛔ closedAt is never BEFORE openedAt (clock skew would make durations negative)",
  },

  // ── the gate ────────────────────────────────────────────────────────────────────
  {
    name: "the-cycle-gate-never-blocks",
    why: "The checkpoint silently becomes decoration: a finished cycle would let calls straight "
       + "through and Ali would never be asked to start the next one.",
    file: METER,
    from: "  if (highest === 0) return { blocked: false }; // nothing has ever been metered\n  return { blocked: true, lastClosedIndex: highest };",
    to: "  if (highest === 0) return { blocked: false }; // nothing has ever been metered\n  return { blocked: false };",
    check: "6.2 ⛔ a FINISHED cycle blocks the next call",
  },
  {
    name: "an-empty-ledger-blocks-everything",
    why: "⛔ THE DEPLOY HAZARD. If a ledger with no cycles counted as 'blocked', shipping this "
       + "would pause every AI call on the platform the moment it deployed.",
    file: METER,
    from: "  if (highest === 0) return { blocked: false }; // nothing has ever been metered",
    to: "  if (highest === 0) return { blocked: true, lastClosedIndex: 0 };",
    check: "6.0 ⭐ CONTROL: an EMPTY ledger never blocks — deploying this must not pause the platform",
  },
  {
    name: "two-cycles-can-be-open-at-once",
    why: "The ledger's whole invariant is one OPEN row. Two would double-count every accrual "
       + "and make 'which cycle am I in' unanswerable.",
    file: METER,
    from: "    if (await aiCycleDal.openCycle()) return null;",
    to: "    if (false) return null;",
    check: "6.7 ⛔ starting a SECOND cycle while one is open is refused — never two OPEN rows",
  },
  {
    name: "the-budget-stops-being-the-senior-reason",
    why: "§8.6. If the checkpoint were consulted first, an exhausted BUDGET would be reported as "
       + "a cycle boundary and an operator would start a cycle instead of adding credit.",
    file: METER,
    from: "    const gate = await cycleGate();\n    if (gate.blocked) {",
    to: "    const gate = await cycleGate();\n    if (gate.blocked && false) {",
    check: "6.4 assertAiBudget refuses, and names the CYCLE as the reason",
  },
  {
    name: "a-broken-cycle-store-breaks-the-ai-call",
    why: "⛔ THE SENTINEL RESOLVES REAL-MONEY MARKETS. A metering failure that propagates would "
       + "stop settlement. The swallow is the point; this proves it is there.",
    file: METER,
    from: "  } catch { /* metering is best-effort — never break an AI call */ }",
    to: "  } catch (e) { throw e; }",
    check: "13.1 ⛔ a failing cycle store does NOT throw out of recordAiUsage",
  },

  // ── the ledger's own constraint ─────────────────────────────────────────────────
  {
    name: "the-unique-index-stops-being-enforced",
    why: "`withLock` serialises the meter; the unique index is what makes a LOST lock LOUD. "
       + "Without it a duplicate is written silently and every count downstream is wrong.",
    file: CYCLE_DAL,
    from: "    if (mem.some((x) => x.index === c.index)) throw new DuplicateCycleIndexError(c.index);",
    to: "    if (false) throw new DuplicateCycleIndexError(c.index);",
    check: "2.6 ⛔ a DUPLICATE index is refused — a lost lock is loud, not silent",
  },

  // ── the read model ──────────────────────────────────────────────────────────────
  {
    name: "the-projection-ignores-its-own-floor",
    why: "§9.1. A year extrapolated from three hours looks exactly like a year extrapolated from "
       + "three years, and Ali would price from it.",
    file: CYCLES,
    from: "  if (observedDays < minDays) {",
    to: "  if (false) {",
    check: "8.2 ⛔ 2 days observed against a 14-day floor → refused, and it says how many days it has",
  },
  {
    name: "the-yearly-rate-counts-ROWS-instead-of-SPEND",
    why: "🔴 REAL. An officer closing the books early leaves a CLOSED ROW with nothing in it. "
       + "Counting rows lets bookkeeping triple the number Ali prices from without a cent more "
       + "being spent — the live drive's own close/start left five $0.00 cycles in the ledger.",
    file: CYCLES,
    from: "  const cyclesPerDay = cyclesConsumed / observedDays;",
    to: "  const cyclesPerDay = closed.length / observedDays;",
    check: "8.6 🔴 three EMPTY hand-closed cycles do NOT raise the rate — spend drives it, not rows",
  },
  {
    name: "the-open-cycle-drags-the-rate-down",
    why: "§9.2. Measuring the span to NOW instead of to the last close counts the open cycle's "
       + "elapsed time without its spend — a rate biased low, in the direction that flatters us.",
    file: CYCLES,
    from: "  const lastClose = Math.max(...closed.map((c) => Date.parse(c.closedAt as string)));",
    to: "  const lastClose = Date.now();",
    check: "8.5 ⛔ the OPEN cycle contributes NEITHER its spend NOR its elapsed time",
  },
  {
    name: "a-zero-divisor-returns-Infinity",
    why: "§9.3. A window with no settled markets is normal, and must read `—`, never `Infinity`.",
    file: CYCLES,
    from: "  if (!Number.isFinite(numerator) || !Number.isFinite(divisor) || Math.abs(divisor) < CYCLE_EPS) return null;",
    to: "  if (!Number.isFinite(numerator)) return null;",
    check: "9.1 ⛔ a zero divisor returns null, never Infinity",
  },
  {
    name: "shillings-are-invented-from-an-unset-rate",
    why: "§9.4 and the platform's own A-5 no-fabrication rule. A converted figure with no rate "
       + "behind it is a fabricated number wearing a currency symbol.",
    file: CYCLES,
    from: "  if (!(cfg.fxTzsPerUsd > 0) || !cfg.fxAsOfIso) return null;",
    to: "  if (!(cfg.fxTzsPerUsd > 0)) return null;",
    check: "9.6 a rate WITHOUT a date is still refused — an unverifiable rate is not a rate",
  },
  {
    name: "the-year-boundary-is-read-in-raw-UTC",
    why: "§10g. At UTC+3 a cycle closing at 01:00 EAT on 1 January is filed under the PREVIOUS "
       + "year — on the single figure Ali reads by year.",
    file: CYCLES,
    from: "  const shifted = new Date(atMs + tzOffsetMsAt(tz, atMs));",
    to: "  const shifted = new Date(atMs);",
    check: "10.7 ⛔ 22:00 UTC on 31 Dec is 01:00 EAT on 1 Jan → counted in 2026, not 2025",
  },

  // ── validation ──────────────────────────────────────────────────────────────────
  {
    name: "the-parser-reverts-to-parseFloat",
    why: "`parseFloat(\"0.1.2\")` is 0.1 — it accepts a typo as a number. A mistyped cycle size "
       + "silently redefines the denomination every figure is counted in.",
    file: RULES,
    from: "  const v = Number(t);",
    to: "  const v = parseFloat(t);",
    check: "11.8 ⛔ \"0.1.2\" → NaN (parseFloat would have accepted 0.1) is refused, on the right field",
  },
  {
    name: "an-empty-field-becomes-zero",
    why: "`Number(\"\")` is 0, not NaN. A blank cycle size would mean infinitely many cycles and "
       + "a divide-by-zero on every figure on the page.",
    file: RULES,
    from: "  if (t === \"\") return { ok: false, field, error: emptyMsg };",
    to: "  if (false) return { ok: false, field, error: emptyMsg };",
    check: "11.30 🔴 an EMPTY margin is refused, not silently read as 0% — the field where blank is legal",
  },
  {
    name: "the-switch-is-read-as-truthiness",
    why: "An unchecked box posts nothing. Truthiness would turn a stray \"0\" or \"false\" into ON — "
       + "silently removing the pause Ali asked for.",
    file: RULES,
    from: "  if (rollRaw === \"\" || rollRaw === \"false\" || rollRaw === \"off\" || rollRaw === \"0\") autoRoll = false;",
    to: "  if (!rollRaw) autoRoll = false;",
    check: `11.32 🔴 "false" is accepted and means OFF — not an error, not ON`,
  },
  {
    name: "a-future-dated-fx-rate-is-accepted",
    why: "A rate cannot have been taken at a time that has not happened. Accepting one hides a "
       + "typo in the single number every shilling figure is multiplied by.",
    file: RULES,
    from: "    if (asOfMs > nowMs) {",
    to: "    if (false) {",
    check: "11.23 ⛔ a rate dated in the FUTURE is refused, on the right field",
  },
  // ── the second adversarial pass: defects found by re-reading my own work ────────
  {
    name: "a-feature-falls-between-the-product-lines",
    why: "🔴 REAL. `other` was in NO line, so spend under it counted toward the page total and "
       + "toward conservation while appearing in no row of the cost table — the lines silently "
       + "failed to sum to the total and nothing said so.",
    file: CYCLES,
    from: "  chat: [\"chat\"],\n  other: [\"other\"],",
    to: "  chat: [\"chat\"],",
    check: "14.1 ⛔ every AiFeature appears in some product line",
  },
  {
    name: "a-feature-is-counted-under-two-lines",
    why: "The other direction: double-counting a feature makes Σ(lines) exceed Σ(spend), which "
       + "reads as the product costing more than it does.",
    file: CYCLES,
    from: "  updown: [\"updown\"],",
    to: "  updown: [\"updown\", \"chat\"],",
    check: "14.2 ⛔ …and in exactly ONE — a feature in two lines is counted twice",
  },
  {
    name: "conservation-goes-back-to-comparing-unequal-spans",
    why: "🔴 REAL, and DATED. Cycles are never pruned; events are, at 180 days. The naive "
       + "comparison would have reported a growing false drift from 2026-12-23 on the ledger "
       + "backfilled 2026-08-23 — a reconciliation that cries wolf on a schedule.",
    file: CYCLES,
    from: "  const anchor = cycles.slice().sort((a, b) => a.index - b.index).find((c) => c.openedAt >= retentionCutoffIso);",
    to: "  const anchor = cycles.slice().sort((a, b) => a.index - b.index)[0];",
    check: "15.3 🔴 the PRODUCT reconciles to zero — retention no longer looks like drift",
  },
  {
    name: "the-projection-floor-stops-being-clamped",
    why: "A hand-edited SystemConfig of 0 makes `observedDays < minDays` false for a zero-length "
       + "history, and the next line divides by it — Infinity cycles per year, on the one figure "
       + "Ali prices from.",
    file: METER,
    from: "  return Math.min(CYCLE_BOUNDS.minDaysForProjection.max,\n    Math.max(CYCLE_BOUNDS.minDaysForProjection.min, Math.round(days)));",
    to: "  return Math.round(days);",
    check: "16.1 ⛔ a zero projection floor is clamped, never divided by",
  },
  {
    name: "the-meter-clamp-lets-a-zero-size-through",
    why: "§10b. A size of 0 means infinitely many cycles and a divide-by-zero everywhere "
       + "downstream. The form refuses it; this is the last line of defence.",
    file: METER,
    from: "  if (!Number.isFinite(sizeUsd) || sizeUsd <= 0) return CYCLE_DEFAULTS.sizeUsd;",
    to: "  if (!Number.isFinite(sizeUsd)) return CYCLE_DEFAULTS.sizeUsd;",
    check: "12.1 ⛔ a zero size reaching the meter is clamped, never divided by",
  },
];
