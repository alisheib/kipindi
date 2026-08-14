/**
 * C5 · RED HARNESS — the refusals that explained nothing, and the ways of over-explaining.
 *
 *   node scripts/failure-reasons-red.mjs      (npm run red:failure-reasons)
 *
 * ⭐ MUTATION 1 IS THE SHIPPED SOURCE AT d175cd01, VERBATIM: the stake-bounds refusal with
 * no `reason` and no `detail`. Against it, `docs/RULES.md` §2.3 is unmet on BOTH products —
 * a poll player who typed 999 read "That didn't go through" and an Up & Down player read
 * "The bet was refused — check the amount and your balance". Neither named the minimum,
 * although the SERVER's own sentence did.
 *
 * ⭐ MUTATION 4 IS THE DEFECT ONLY READING THE OUTPUT FOUND. `String.replace` with a STRING
 * pattern substitutes the FIRST occurrence only, and the copy uses `{min}` twice — so the
 * sentence rendered "Minimum bet is TZS 1,000. Enter {min} or more and try again.", with a
 * literal placeholder in front of the player. Every "does it name the minimum" assertion was
 * GREEN in all three languages. §1.5b and §2.render are what see it.
 *
 * ⚠️ MUTATIONS 6 AND 7 ARE THE OPPOSITE FAILURE — a refusal that is louder than it should
 * be. A fixable problem shown as a red error, or a gold toast on a money refusal, are both
 * regressions, and a suite that only checks "a sentence appeared" is green on them.
 *
 * ⚠️ CRLF-aware, anchors re-read from disk after writing, positive control first.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const MARKET = new URL("../src/lib/server/market-service.ts", import.meta.url);
const REASONS = new URL("../src/lib/failure-reasons.ts", import.meta.url);
const DICT = new URL("../src/lib/i18n-dict.ts", import.meta.url);
const PAGE = new URL("../src/app/markets/[id]/page.tsx", import.meta.url);
const originals = new Map([
  [MARKET, readFileSync(MARKET, "utf8")],
  [REASONS, readFileSync(REASONS, "utf8")],
  [DICT, readFileSync(DICT, "utf8")],
  [PAGE, readFileSync(PAGE, "utf8")],
]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try { execSync("npx tsx scripts/failure-reasons.test.mts", { cwd: CWD, stdio: "pipe" }); return false; }
  catch { return true; }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  console.error("  A red below would be indistinguishable from red-on-everything. Fix the suite first.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

const MUTATIONS = [
  {
    name: "bounds-refusal-carries-no-reason",
    why: "⭐ THE SHIPPED SOURCE — the stake-bounds refusal with no reason and no detail. RULES.md §2.3 is unmet on BOTH products: the server names the minimum and neither surface shows it",
    file: MARKET,
    from: `      reason: !Number.isInteger(opts.stake) ? "stake_not_whole" : opts.stake < minStake ? "stake_below_min" : "stake_above_max",\n      detail: { min: minStake, max: maxStake },`,
    to: `      // no reason`,
  },
  {
    name: "bounds-refusal-carries-a-reason-but-no-figures",
    why: "the reason is there and the FIGURES are not, so the copy interpolates a literal dash — the modern form of a message that does not name the minimum",
    file: MARKET,
    from: `      detail: { min: minStake, max: maxStake },`,
    to: `      detail: {},`,
  },
  {
    name: "always-the-below-min-reason",
    why: "⚠️ the reason stops branching, so an OVER-max stake is refused with the MINIMUM's sentence — a right-shaped message about the wrong bound",
    file: MARKET,
    from: `      reason: !Number.isInteger(opts.stake) ? "stake_not_whole" : opts.stake < minStake ? "stake_below_min" : "stake_above_max",`,
    to: `      reason: "stake_below_min" as const,`,
  },
  {
    name: "first-occurrence-only-substitution",
    why: "⭐ THE DEFECT ONLY READING THE OUTPUT FOUND — String.replace on a STRING pattern fills the FIRST {min} and leaves the second as a literal placeholder in front of the player. Every 'names the minimum' assertion stays GREEN",
    file: REASONS,
    from: `  const body = template.replace(/\\{(\\w+)\\}/g, (whole, key: string) =>\n    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : whole);`,
    to: `  const body = Object.entries(values).reduce((acc, [k, v]) => acc.replace(\`{\${k}}\`, v), template);`,
  },
  {
    name: "renderer-falls-back-to-the-server-string",
    why: "the unreasoned case renders `r.error` — English audit prose as a headline, which is how a Swahili or Chinese player got an English sentence at the moment their money was refused",
    file: REASONS,
    from: `    return { severity: "warning", channel: "toast", body: fallback, reason: null };`,
    to: `    return { severity: "warning", channel: "toast", body: (r as { error?: string })?.error || fallback, reason: null };`,
  },
  {
    name: "a-fixable-problem-becomes-an-error",
    why: "⚠️ THE OPPOSITE FAILURE — a stake below the minimum is rendered as a red ERROR. The player can fix it in two seconds; shouting at them for it is a regression a 'a sentence appeared' check cannot see",
    file: REASONS,
    from: `  stake_below_min:      { severity: "warning", channel: "inline", key: "failStakeBelowMin", needs: ["min"] },`,
    to: `  stake_below_min:      { severity: "error", channel: "modal", key: "failStakeBelowMin", needs: ["min"] },`,
  },
  {
    name: "busy-and-broken-say-the-same-thing",
    why: "⭐ C4 RESTORED — an unexpected throw claims the stake did not move, which nobody checked. A genuine server crash reads to the player as ordinary load",
    file: DICT,
    from: `      failSystemError: "Something went wrong at our end. Check your wallet before retrying — if the bet is there, it went through.",`,
    to: `      failSystemError: "We’re busy right now. Your stake has NOT moved — try again in a moment.",`,
  },
  {
    name: "max-stake-copy-implies-a-cap-on-total-exposure",
    why: "⚠️ the sentence drops 'you can place more than one bet' — docs/RULES.md §1 records that no surface may state the maximum in words implying it bounds TOTAL exposure on a market",
    file: DICT,
    from: `      failStakeAboveMax: "Maximum for a single bet is {max}. You can place more than one bet on this market.",`,
    to: `      failStakeAboveMax: "Maximum stake on this market is {max}.",`,
  },
  {
    name: "a-reason-loses-its-copy",
    why: "a reason ships with no dictionary entry — the guard must fail the BUILD rather than let a blank screen reach a player",
    file: DICT,
    from: `      failCashoutValueZero: "There’s nothing on the other side yet, so this bet has no sell value.",`,
    to: `      // copy removed`,
  },
  {
    name: "bonus-warning-shown-to-everyone-who-hedges",
    why: "⚠️ B2 · the warning loses its grant gate, so every player taking the other side is told their bonus will not advance — most of them have no bonus. A warning shown to people it does not apply to is noise, and noise is how a real warning stops being read",
    file: PAGE,
    from: "      if (b.activeCount > 0 && b.activeWagerRemainingTzs > 0) {",
    to: "      if (true) {",
  },
  {
    name: "bonus-warning-loses-the-figure",
    why: "⭐ B2 · the {remaining} detail goes, so the sentence tells a player only one side counts toward \"—\". The rule the copy exists to explain is the AMOUNT they still owe",
    file: PAGE,
    from: "          { ok: false, error: \"\", reason: \"bonus_wagering_one_side\", detail: { remaining: b.activeWagerRemainingTzs } },",
    to: "          { ok: false, error: \"\", reason: \"bonus_wagering_one_side\" },",
  },
];

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(m.file, "utf8");
  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) { problems.push(`${m.name} — HARNESS ERROR: anchor not found`); continue; }

  writeFileSync(m.file, src.replace(anchor, anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to));
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`); continue;
  }

  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
