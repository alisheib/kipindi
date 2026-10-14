/**
 * RED PROOF for D2 as amended by the owner on 2026-10-14 — Up and Down only on the choices, the pool's money at the
 * commit, the empty side said iff it is true.
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report ≥1 failure, and every mutation is a REVERT verified byte-for-byte.
 *
 * ⭐ THE ONES THAT MATTER MOST:
 *  · `flat-constant-returns` restores D2's first defect: one number for both sides, whatever the
 *    pool holds — on the projection the confirm panel and the receipt still state.
 *  · the three `prints a multiple again` mutations restore what Ali's ruling of 2026-10-14 removed
 *    — a `× N` on the board card's Up button, on the shared controls' Up button, and beside the
 *    confirm panel's projection. If any is MISSED this guard has stopped guarding the ruling.
 *  · `empty-side-silent` / `card-drops-the-sentence` remove the sentence — the round then refunds
 *    a player who was never told it might — and `sentence-on-a-two-sided-round` shows it where it is
 *    false: the two directions of the empty-side INVARIANT (standards §5b rule 9).
 *  · `warns-the-filler` is the subtle one: warn the player who is about to FILL the empty side
 *    and the sentence becomes false the instant they tap.
 *
 *   npm run red:updown-pricing
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const PRICING = "src/lib/updown-pricing.ts";
const BOARD = "src/lib/server/updown-board.ts";
const CARD = "src/components/updown/updown-card.tsx";
const CONTROLS = "src/components/updown/updown-stake-controls.tsx";
const PANEL = "src/components/updown/round-stake-panel.tsx";
const DICT = "src/lib/i18n-dict.ts";
const RULES = "src/app/legal/rules/_content-up-down.tsx";
const SUITE = "scripts/updown-pricing.test.mts";

const MUTATIONS = [
  {
    name: "⭐ flat-constant-returns — D2'S FIRST DEFECT: one number for both sides, whatever the pool holds",
    file: PRICING,
    find: `    const ratio = payout / stake;`,
    with: `    const ratio = 1.5; void payout;`,
  },
  {
    name: "⭐ empty-side-silent — the round stops naming the side nobody has backed",
    file: PRICING,
    find: `  if (up <= 0 && down <= 0) return "BOTH";`,
    with: `  if (true) return null;\n  if (up <= 0 && down <= 0) return "BOTH";`,
  },
  {
    name: "⭐ warns-the-filler — the player about to FILL the empty side is told their stake comes back",
    file: PRICING,
    find: `  return empty === side ? null : empty;`,
    with: `  return empty;`,
  },
  {
    // ⚠️ REPLACES `rounds-up` (2026-10-14): `formatMultiplier` — whose floor that mutation broke — was deleted with the
    // last surface that printed a multiple. What must now hold is that the printer stays gone.
    name: "⭐ the multiple-printer comes back — `formatMultiplier` re-exported by the pricing module",
    file: PRICING,
    find: `export function projectedReturn(`,
    with: `export function formatMultiplier(m: number): string { return m.toFixed(2); }\n\nexport function projectedReturn(`,
  },
  {
    name: "pools-from-the-rounded-percentage — 0 and 400 on a 100,000 pool become the same number",
    file: BOARD,
    find: `      upPool: m.yesPool,`,
    with: `      upPool: Math.round((m.yesPool + m.noPool) * impliedYesPct(m) / 100),`,
  },
  {
    name: "live-rates-instead-of-the-round's-frozen-snapshot (a retune would reprice a placed bet)",
    file: BOARD,
    find: `        feeModel: rates.feeModel,`,
    with: `        feeModel: "capped-commission" as const,`,
  },
  {
    name: "the display switch is assumed ON rather than read from the poll",
    file: BOARD,
    find: `      show: rates.showEstimatedWinnings === true,`,
    with: `      show: true,`,
  },
  {
    // ⚠️ REPLACES `both buttons share ONE multiplier` (2026-10-14): the buttons hold no multiplier to share.
    name: "⭐ the board card's signed-out Up button prints a multiple again (the owner's ruling of 2026-10-14)",
    file: CARD,
    find: `<I.trendingUp s={14} edge="start" className={GLYPH_NO_SHRINK} /> {t.market.udUp}`,
    with: `<I.trendingUp s={14} edge="start" className={GLYPH_NO_SHRINK} /> {t.market.udUp}\n                  <span className="font-mono text-[12.5px]">× {(1.26).toFixed(2)}</span>`,
  },
  {
    name: "⭐ the shared controls' Up button prints a multiple again (the authed card and the round page's two-way control)",
    file: CONTROLS,
    find: `<I.trendingUp s={compact ? 14 : 15} className={GLYPH_NO_SHRINK} />} {t.market.udUp}`,
    with: `<I.trendingUp s={compact ? 14 : 15} className={GLYPH_NO_SHRINK} />} {t.market.udUp}\n          <span className="font-mono text-[12.5px]">× {(1.26).toFixed(2)}</span>`,
  },
  {
    name: "⭐ the confirm panel prints the card's multiple again beside its projection",
    file: PANEL,
    find: `<span className="amount text-body-sm font-semibold text-text-muted">{formatTzs(projected)}</span>`,
    with: `<span className="amount text-body-sm font-semibold text-text-muted">{formatTzs(projected)}</span>\n            <span className="font-mono text-[11px] tabular-nums text-text-faint">× {(1.26).toFixed(2)}</span>`,
  },
  {
    name: "⭐ sentence-on-a-two-sided-round — the card says a side is empty when both hold money (a lie)",
    file: CARD,
    find: `  const outEmpty = emptySideOf(pricing);`,
    with: `  const outEmpty = emptySideOf(pricing) ?? "BOTH";`,
  },
  {
    name: "⭐ card-drops-the-sentence — a one-sided round refunds a visitor who was never told",
    file: CARD,
    find: `              {outEmptyCopy && (`,
    with: `              {false && outEmptyCopy && (`,
  },
  {
    name: "the estimate note comes back under the card's buttons (it explained the removed multiple)",
    file: CARD,
    find: `                  <span>{noticeBody(outEmptyCopy)}</span>\n                </p>\n              )}\n            </>`,
    with: `                  <span>{noticeBody(outEmptyCopy)}</span>\n                </p>\n              )}\n              <p className="mt-1 text-body-sm text-text-faint">{t.market.udEstimateNote}</p>\n            </>`,
  },
  {
    name: "the round panel projects from a rate again instead of the pool",
    file: PANEL,
    find: `  const projected = bet.stakeReady ? projectedReturn(pricing, lockedSide, bet.stake) : null;`,
    with: `  const projected = bet.stakeReady ? Math.round(bet.stake * 1.5) : null;`,
  },
  {
    name: "the panel uses the round-wide rule instead of the side-aware one",
    file: PANEL,
    find: `  const warn = refundWarningFor(pricing, lockedSide);`,
    with: `  const warn = refundWarningFor(pricing, lockedSide === "UP" ? "UP" : "UP");`,
    // ⚠️ §5.11 asserts the CALL SHAPE `refundWarningFor(pricing, lockedSide` and this mutation keeps a `lockedSide`
    // token inside the parentheses, so until 2026-10-14 it was a DOCUMENTED MISS. It is required now: the RENDERED
    // confirm panel (§8.4) reads the warning a DOWN backer of a DOWN-empty round gets, and this mutation hands them
    // "Nobody has backed Down yet" — a false warning the render reports.
  },
  {
    name: "the projection's qualifier stops travelling with the figure (shown under a panel that states none)",
    file: PANEL,
    find: `      {projected != null && (\n        <p className="mt-2 flex items-start gap-1 text-body-sm leading-[1.45] text-text-faint">`,
    with: `      {true && (\n        <p className="mt-2 flex items-start gap-1 text-body-sm leading-[1.45] text-text-faint">`,
  },
  {
    name: "⭐ the binding Up & Down rules describe a displayed multiplier again (the ruling not reflected where it should be)",
    file: RULES,
    find: `<strong className="text-text">The projected return moves.</strong> The projected return shown when you place a stake reflects the live pools, not fixed odds.`,
    with: `<strong className="text-text">The multiplier moves.</strong> The displayed multiplier reflects the live pools, not fixed odds.`,
  },
  {
    // ⚠️ RE-AIMED 2026-10-14. This used to plant gold on the `× N` span of the controls' Up button; the ruling removed
    // that span. The figure left on a pre-result surface is the confirm panel's projected return.
    name: "⭐ the projected return escapes into gold — earned-money ink on an unplaced bet (RG)",
    file: PANEL,
    find: `<span className="amount text-body-sm font-semibold text-text-muted">{formatTzs(projected)}</span>`,
    with: `<span className="amount text-body-sm font-semibold text-text-muted" style={{ color: "var(--gold-300)" }}>{formatTzs(projected)}</span>`,
  },
  {
    name: "the qualifier opens on × again — naming a multiple no surface prints",
    file: DICT,
    find: `      udEstimateNote: "The projected return moves with every bet — it is priced from this pool right now, not from fixed odds. When betting closes it becomes your exact payout.",`,
    with: `      udEstimateNote: "× moves with every bet — it is this pool right now, not fixed odds. When betting closes it becomes your exact payout.",`,
  },
  {
    name: "⭐ stripComments returns EMPTY — every absence check would pass over \"\"",
    file: SUITE,
    find: `function stripComments(src: string): string {\n  return src`,
    with: `function stripComments(src: string): string {\n  return "" && src`,
  },
];

function resolve(text, needle) {
  if (text.includes(needle)) return needle;
  const crlf = needle.replace(/\n/g, "\r\n");
  if (text.includes(crlf)) return crlf;
  return null;
}

const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

console.log("── the suite on the FIXED tree (must be green) ──");
const before = run();
console.log(`   exit=${before.status}  ${before.stdout.match(/\d+ passed, \d+ failed/)?.[0] ?? ""}`);
if (before.status !== 0) { console.error("   ✗ not green to begin with"); process.exit(2); }

let proven = 0, documented = 0, stale = 0;
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  const original = readFileSync(m.file, "utf8");
  const find = resolve(original, m.find);
  if (!find) { console.error(`   ✗ ANCHOR NOT FOUND in ${m.file} — THIS MUTATION PROVES NOTHING.`); stale++; continue; }
  const mutated = original.replace(find, m.with.replace(/\n/g, find.includes("\r\n") ? "\r\n" : "\n"));
  if (mutated === original) { console.error(`   ✗ FILE UNCHANGED — PROVES NOTHING.`); stale++; continue; }
  writeFileSync(m.file, mutated, "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const failed = Number(out.match(/^updown-pricing: (\d+) passed, (\d+) failed$/m)?.[2] ?? 0);
  const caught = r.status !== 0 && failed >= 1;
  console.log(`   exit=${r.status}  failures=${failed}  ${m.expectMiss ? (caught ? "⚠️ CAUGHT (better than documented)" : "· missed, AS DOCUMENTED") : caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const line of out.split(/\r?\n/).filter((l) => l.includes("FAIL")).slice(0, 3)) console.log(`     ${line.trim()}`);
  writeFileSync(m.file, original, "utf8");
  if (readFileSync(m.file, "utf8") !== original) { console.error("   🔴 REVERT FAILED"); process.exit(2); }
  if (m.expectMiss) documented++; else if (caught) proven++;
}

const required = MUTATIONS.filter((m) => !m.expectMiss).length;
console.log(`\n${proven}/${required} required mutations caught (+${documented} documented-miss${stale ? `, ${stale} STALE ANCHOR(S)` : ""}) — files restored byte-for-byte.`);
process.exit(proven === required && stale === 0 ? 0 : 1);
