/**
 * Anchors for `red:fee-law-switch` (programme FEE-TAX-2026-10, release R5; Ali's go-live answer of 2026-10-24: the
 * release itself switches the new fee law on) — each puts back one way the one-time switch could be built wrong, in the
 * real source, and names the assertion of `test:fee-law-switch` (`scripts/fee-law-switch.test.mts`, the memory store)
 * that must turn red. DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once.
 *
 *   (g) the gate dropped — the act runs in a build whose gate is shut;
 *   (r) a rollback dropped — the polls, or the banner, left switched after a later step failed;
 *   (c) the claim broken — a fresh claim of another container overrun, a done record run again, an unreadable row overwritten;
 *   (f) a ruled figure wrong — the tax not 15%, a stored 13% split not kept, the banner's day not East Africa Time;
 *   (u) Up & Down skipped — the act records done while every chain stays on the old law.
 * `expect` is the start of the assertion's own label: any other red is WRONG-ASSERTION.
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const SWITCH = "src/lib/server/fee-law-switch.ts";

export const MUTATIONS = [
  { name: "(g) the gate is not asked: the act runs while the new law is shut", file: SWITCH,
    from: `  if (!feeLawLive()) return { ran: false, state: "gate-shut" };`, to: ``, expect: "0.1 ·", suite: "switch" },
  { name: "(r1) a failure after the polls' save leaves the polls on the new law", file: SWITCH,
    from: `    if (before && done.includes("polls")) {`, to: `    if (false) {`, expect: "1.3 ·", suite: "switch" },
  { name: "(r2) a failure after the banner leaves the banner up", file: SWITCH,
    from: `    if (before && done.includes("banner")) {`, to: `    if (false) {`, expect: "1.2 ·", suite: "switch" },
  { name: "(c1) a fresh claim of another container is overrun", file: SWITCH,
    from: `  if (state === "claimed" && nowMs - Date.parse((cur.value as ClaimRow).claimedAt) < CLAIM_STALE_MS) {`, to: `  if (false) {`, expect: "4.1 ·", suite: "switch" },
  { name: "(c2) a done record is run again", file: SWITCH,
    from: `  if (state === "done") return { ok: false, outcome: { ran: false, state: "done", at: parseFeeSwitchRecord(cur.value)!.at } };`, to: ``, expect: "3.1 ·", suite: "switch" },
  { name: "(c3) a row this release cannot read is overwritten", file: SWITCH,
    from: `  if (state === "unreadable") {`, to: `  if (false) {`, expect: "4.3 ·", suite: "switch" },
  { name: "(f1) the winnings tax applied is not the ruled 15%", file: SWITCH,
    from: `const RULED_WINNINGS_TAX_BP = 1_500;`, to: `const RULED_WINNINGS_TAX_BP = 1_600;`, expect: "2.2 ·", suite: "switch" },
  { name: "(f2) a stored 13% split is replaced by 3% + 10%", file: SWITCH,
    from: `    return { platformFeeRate: rateBp(platformFeeRate) / 10_000, operatorFeeRate: rateBp(operatorFeeRate) / 10_000, kept: true };`,
    to: `    return { platformFeeRate: USUAL_SPLIT_BP.platform / 10_000, operatorFeeRate: USUAL_SPLIT_BP.operator / 10_000, kept: true };`, expect: "5.1 ·", suite: "switch" },
  { name: "(f3) the banner is dated in UTC, not East Africa Time", file: SWITCH,
    from: `export function switchBannerText(at: Date, rates: { stakeFeeRate: number; winningsTaxRate: number }, timeZone = "Africa/Dar_es_Salaam"): string {`,
    to: `export function switchBannerText(at: Date, rates: { stakeFeeRate: number; winningsTaxRate: number }, timeZone = "UTC"): string {`, expect: "5.2 ·", suite: "switch" },
  { name: "(u) Up & Down is skipped: the record says done while every chain stays on the old law", file: SWITCH,
    from: `    const u = await W.applyUpDown(profile.profile);`, to: `    const u = { ok: true as const, actId: null, total: 0, moved: 0 };`, expect: "2.3 ·", suite: "switch" },
];
