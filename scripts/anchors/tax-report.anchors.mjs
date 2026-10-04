/**
 * RED anchors for `npm run red:tax-report` — the control for `test:tax-report`.
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE, so `red-anchors.test.mts` §3 can audit every declared anchor
 * WITHOUT running the injection. Same law as the anchor files beside it.
 *
 * ⛔ EVERY ANCHOR MUST RESOLVE EXACTLY ONCE — `red-anchor.mjs`'s `resolveAnchor` refuses both zero
 * matches (a rotted anchor proves nothing) and two or more (an ambiguous one proves the wrong thing).
 *
 * Each mutation is a way the Government Tax Report could state a wrong figure to the regulator, or
 * call wrong books right. `expect` is the check in `test:tax-report` that must go red.
 * ⛔ No anchor carries a backslash: the editing tools decode escape text, and an anchor that changed
 * on the way to disk would resolve zero times and prove nothing.
 */

export const MUTATIONS = [
  // ── the engine: the plan's formula and its rounding ──────────────────────────────────────────
  {
    name: "tax-report.ts — Commission on the wrong scale (cents taken for shillings)",
    file: "src/lib/tax-report.ts",
    from: "BigInt(100 * BP_WHOLE)));",
    to: "BigInt(BP_WHOLE)));",
    expect: "2.1",
  },
  {
    // ⭐ The plan says "standard rounding": 6.5 → 7. Half-down passes every whole-number case.
    name: "tax-report.ts — a half rounds DOWN (GBT 6.5 → 6)",
    file: "src/lib/tax-report.ts",
    from: "  if ((a % den) * BigInt(2) >= den) q += BigInt(1);",
    to: "  if ((a % den) * BigInt(2) > den) q += BigInt(1);",
    expect: "3.2",
  },
  {
    // ⭐ The plan's rule with the brought-forward term dropped: every period after the first fails its check.
    name: "tax-report.ts — the check forgets the stakes brought forward",
    file: "src/lib/tax-report.ts",
    from: "r.feeKeptCents - r.broughtForwardCents;",
    to: "r.feeKeptCents;",
    expect: "2.7",
  },
  {
    name: "tax-report.ts — the check forgets the platform fee kept",
    file: "src/lib/tax-report.ts",
    from: "r.refundsCents + r.feeKeptCents - r.broughtForwardCents;",
    to: "r.refundsCents - r.broughtForwardCents;",
    expect: "2.7",
  },
  {
    name: "tax-report.ts — a rate above 100% is accepted from the form",
    file: "src/lib/tax-report.ts",
    from: "  return isValidBp(bp) ? bp : null;",
    to: "  return bp;",
    expect: "4.1",
  },
  {
    name: "tax-report.ts — a rate label keeps its trailing zero (12.50%)",
    file: "src/lib/tax-report.ts",
    from: '.padStart(2, "0").replace(/0$/, "")',
    to: '.padStart(2, "0")',
    expect: "4.2",
  },
  {
    name: "tax-report.ts — a same-day rate correction is ignored (the FIRST recorded wins)",
    file: "src/lib/tax-report.ts",
    from: '(a.recordedAt ?? "").localeCompare(b.recordedAt ?? "")',
    to: '(b.recordedAt ?? "").localeCompare(a.recordedAt ?? "")',
    expect: "5.6",
  },
  {
    // ⭐ A rate change that re-prices the whole period, including the days before it.
    name: "tax-report.ts — a period is never split at a rate change",
    file: "src/lib/tax-report.ts",
    from: ".filter((t) => t > startMs && t < endMs);",
    to: ".filter(() => false);",
    expect: "5.4",
  },
  {
    // ⭐ A UTC month: three hours of every month-end filed in the wrong month.
    name: "tax-report.ts — the month starts at UTC midnight, not EAT",
    file: "src/lib/tax-report.ts",
    from: "const startMs = Date.UTC(y, m - 1, 1) - EAT_OFFSET_MS;",
    to: "const startMs = Date.UTC(y, m - 1, 1);",
    expect: "6.1",
  },
  {
    name: "tax-report.ts — the week starts on Sunday",
    file: "src/lib/tax-report.ts",
    from: "const startMs = dayStart - ((wd + 6) % 7) * DAY_MS;",
    to: "const startMs = dayStart - wd * DAY_MS;",
    expect: "6.2",
  },
  {
    name: "tax-report.ts — a period can be locked the instant it closes (no settle grace)",
    file: "src/lib/tax-report.ts",
    from: 'return p.kind !== "custom" && p.endMs + LOCK_GRACE_MS <= nowMs;',
    to: 'return p.kind !== "custom" && p.endMs <= nowMs;',
    expect: "6.13",
  },
  {
    name: "tax-report.ts — a voided round's refund is filed as a one-sided bet",
    file: "src/lib/tax-report.ts",
    from: 'if (input.verdict === "VOID") return "ROUND_CANCELLED";',
    to: 'if (input.verdict === "VOID") return "ONE_SIDED_BET";',
    expect: "8.3",
  },
  // ── the reader: three sources, read as they are ───────────────────────────────────────────────
  {
    // ⭐ THE EXISTING REPORTS' DEFINITION — and the wrong one here: a free exit is not winnings.
    name: "tax-report-data.ts — a cash-out counted as Payout (taxed as winnings)",
    file: "src/lib/server/tax-report-data.ts",
    from: "else { refundsCents += amountCents; exitFeeCents += feeCents;",
    to: "else { payoutCents += amountCents; exitFeeCents += feeCents;",
    expect: "9.2",
  },
  {
    // ⭐ PLAN FR-3: "structurally impossible to include withdrawals in Payout".
    name: "tax-report-data.ts — withdrawals read into the bet money (FR-3 broken)",
    file: "src/lib/server/tax-report-data.ts",
    from: 'const BET_TYPES = new Set(["BET_PLACED", "BET_PAYOUT", "BET_REFUND", "CASHOUT"]);',
    to: 'const BET_TYPES = new Set(["BET_PLACED", "BET_PAYOUT", "BET_REFUND", "CASHOUT", "WITHDRAWAL"]);',
    expect: "10.1",
  },
  {
    // ⭐ "On hold" read from today's status: a September report run in October forgets September's open bets.
    name: "tax-report-data.ts — On hold is the open set NOW, not at the cut-off",
    file: "src/lib/server/tax-report-data.ts",
    from: "  return left === null || left >= t;",
    to: "  return left === null;",
    expect: "9.5",
  },
  {
    name: "tax-report-data.ts — the stakes brought forward are not counted",
    file: "src/lib/server/tax-report-data.ts",
    from: "if (bf) { counts.betsBroughtForward++; broughtForwardCents += stake; }",
    to: "if (bf) { counts.betsBroughtForward++; }",
    expect: "11.1",
  },
  {
    // The shilling a fractional fee leaves in the pool: drop it and every such period is out by a shilling.
    name: "tax-report-data.ts — the fee kept forgets the rounding left in the pool",
    file: "src/lib/server/tax-report-data.ts",
    from: "const keepCents = poolCents - expectedWinningsTzs * 100;",
    to: "const keepCents = bookedFeeTzs * 100;",
    expect: "12.6",
  },
  {
    name: "tax-report-data.ts — a money record with no bet is left out of the exceptions",
    file: "src/lib/server/tax-report-data.ts",
    from: "    if (contribution === 0) continue;",
    to: "    continue;",
    expect: "12.9",
  },
  {
    name: "tax-report-data.ts — the exceptions' parts are not summed",
    file: "src/lib/server/tax-report-data.ts",
    from: "const push = (e: ReconException, part: keyof DifferenceParts) => { exceptions.push(e); parts[part] += e.contributionCents; };",
    to: "const push = (e: ReconException, part: keyof DifferenceParts) => { exceptions.push(e); parts[part] += 0; };",
    expect: "12.11",
  },
  {
    name: "tax-report-data.ts — the product filter is ignored",
    file: "src/lib/server/tax-report-data.ts",
    from: 'return filter === "ALL" || prod === filter;',
    to: "return true;",
    expect: "12.1",
  },
  // ── the documents ────────────────────────────────────────────────────────────────────────────
  {
    name: "tax-report-doc.ts — Report 1 renames the plan's first line",
    file: "src/lib/server/tax-report-doc.ts",
    from: '    { line: "Sales", cents: r.salesCents,',
    to: '    { line: "Gross sales", cents: r.salesCents,',
    expect: "13.9",
  },
  {
    // A quoted number is TEXT to a spreadsheet: the CSV could not be summed.
    name: "tax-report-doc.ts — the CSV writes amounts as quoted text",
    file: "src/lib/server/tax-report-doc.ts",
    from: '"n" in c ? c.n : csvCell(c.s)',
    to: '"n" in c ? csvCell(c.n) : csvCell(c.s)',
    expect: "13.14",
  },
  {
    name: "tax-report-doc.ts — a custom window is dressed as a filing",
    file: "src/lib/server/tax-report-doc.ts",
    from: '  if (d.period.kind === "custom") {',
    to: '  if (d.period.kind === "custom" && false) {',
    expect: "13.12",
  },
  // ── locks and the view ───────────────────────────────────────────────────────────────────────
  {
    name: "tax-locks.ts — two live locks on one period",
    file: "src/lib/server/tax-locks.ts",
    from: "    if (memory.some((l) => l.periodKind === input.periodKind",
    to: "    if (false && memory.some((l) => l.periodKind === input.periodKind",
    expect: "13.2",
  },
  {
    name: "tax-locks.ts — the snapshot hash depends on key order (a jsonb round trip breaks it)",
    file: "src/lib/server/tax-locks.ts",
    from: ".filter((k) => o[k] !== undefined).sort();",
    to: ".filter((k) => o[k] !== undefined);",
    expect: "13.1",
  },
  {
    // ⭐ A locked period printing LIVE figures under its "locked" badge.
    name: "tax-report-view.ts — a locked period shows the live books",
    file: "src/lib/server/tax-report-view.ts",
    from: "data: lock ? lock.snapshot : live.data,",
    to: "data: live.data,",
    expect: "13.5",
  },
  {
    name: "tax-report-view.ts — the books moving under a lock goes unsaid",
    file: "src/lib/server/tax-report-view.ts",
    from: "const out = lines.filter((l) => l.locked !== l.live);",
    to: "const out: DriftLine[] = [];",
    expect: "13.6",
  },

  // ── the review's protections (2026-10-03): each one a way a wrong filing could go out ───────────
  {
    // ⛔ THE LOOPHOLE: a single product balances on its own while the whole book behind it is out.
    name: "tax-report-data.ts — a single-product view drops the whole book's check",
    file: "src/lib/server/tax-report-data.ts",
    from: "wholeBook: whole ? { differenceCents: whole.differenceCents, balanced: whole.balanced } : null,",
    to: "wholeBook: null,",
    expect: "12.12",
  },
  {
    name: "tax-report-doc.ts — a single-product document files around the whole book",
    file: "src/lib/server/tax-report-doc.ts",
    from: "if (d.wholeBook && !d.wholeBook.balanced) {",
    to: "if (false) {",
    expect: "13.12h",
  },
  {
    // The Owner's acknowledged override, filed WITHOUT the difference or the reason — a clean-looking filing of an out book.
    name: "tax-report-doc.ts — an acknowledged whole-book lock prints neither the difference nor the reason",
    file: "src/lib/server/tax-report-doc.ts",
    from: 'headline: `Locked while ${whole}',
    to: 'headline: `` && `Locked while ${whole}',
    expect: "13.12i",
  },
  {
    // An acknowledged filing whose title reads like a clean one: the acknowledgement only in a note at the end.
    name: "tax-report-doc.ts — a lock acknowledged out of balance is titled like a clean filing",
    file: "src/lib/server/tax-report-doc.ts",
    from: 'titleSuffix: " — EXCEPTIONS ACKNOWLEDGED", headline: `Locked OUT OF BALANCE',
    to: 'titleSuffix: "", headline: `Locked OUT OF BALANCE',
    expect: "13.12k",
  },
  {
    // Four tiles across split a ten-digit figure mid-digit in the signed PDF.
    name: "tax-report-doc.ts — the KPI tiles go back to four across",
    file: "src/lib/server/tax-report-doc.ts",
    from: "summaryColumns: 3,",
    to: "summaryColumns: 4,",
    expect: "13.27",
  },
  {
    // A 28-character record id split across two lines in the exceptions the regulator reads.
    name: "tax-report-doc.ts — the exceptions' Reference column is too narrow for a record id",
    file: "src/lib/server/tax-report-doc.ts",
    from: '{ header: "Reference", key: "ref", width: 34 },',
    to: '{ header: "Reference", key: "ref", width: 20 },',
    expect: "13.27",
  },
  {
    // A fingerprint that hashes the moment of reading refuses every lock — the officer can never file.
    name: "tax-locks.ts — the lock fingerprint includes the moment it was read",
    file: "src/lib/server/tax-locks.ts",
    from: "return snapshotHash({ ...d, generatedAtMs: 0 });",
    to: "return snapshotHash(d);",
    expect: "13.23",
  },
  {
    // A running period's window printed to "now" while its figures stop a minute earlier.
    name: "tax-report-doc.ts — a running period's window ends at the moment of reading, not the cut-off",
    file: "src/lib/server/tax-report-doc.ts",
    from: "${eatDateTimeLabel(d.cutoffMs)} EAT (period in progress)",
    to: "${eatDateTimeLabel(d.generatedAtMs)} EAT (period in progress)",
    expect: "13.26",
  },
  {
    // A bet stamped inside the period can commit a transaction-timeout later: a copy taken then is not the filing.
    name: "tax-report-doc.ts — a month read moments after it closed is dressed as the filing",
    file: "src/lib/server/tax-report-doc.ts",
    from: "if (!lock && d.period.endMs + LOCK_GRACE_MS > d.generatedAtMs) {",
    to: "if (false) {",
    expect: "13.12e",
  },
  {
    // The week of Monday 14 Sep and the day 14 Sep share the key "2026-09-14".
    name: "tax-report-doc.ts — the file name forgets the period type (a week overwrites its Monday)",
    file: "src/lib/server/tax-report-doc.ts",
    from: "`government-tax-report-${d.period.kind}-${key}-",
    to: "`government-tax-report-${key}-",
    expect: "13.18",
  },
  {
    name: "tax-report-doc.ts — the reference forgets the period type",
    file: "src/lib/server/tax-report-doc.ts",
    from: "return `TAX-${KIND_WORD[d.period.kind]}-${key}-",
    to: "return `TAX-${key}-",
    expect: "13.19",
  },
  {
    name: "tax-report-doc.ts — a locked CSV hides that the live books moved",
    file: "src/lib/server/tax-report-doc.ts",
    from: '    rows.push([S("Moved since the lock"), ',
    to: '    void ([S("Moved since the lock"), ',
    expect: "13.20",
  },
  {
    // A rate version that changes nothing must not split the period: each split rounds on its own.
    name: "tax-report.ts — an unchanged rate version splits the period",
    file: "src/lib/tax-report.ts",
    from: "if (prev && sameRates(prev.version.rates, version.rates)) {",
    to: "if (prev && false) {",
    expect: "5.8",
  },
  {
    // A link naming only a week was read as the default month — the wrong period, silently.
    name: "tax-report.ts — a link naming only a week, a day or a window reads as the month",
    file: "src/lib/tax-report.ts",
    from: '|| (params.week ? "week" : params.day ? "day" : params.from || params.to ? "custom" : "");',
    to: '|| "";',
    expect: "6.17",
  },
  {
    // A running period read to the very millisecond counts a bet whose stake has not committed yet.
    name: "tax-report.ts — a running period is read to the very millisecond",
    file: "src/lib/tax-report.ts",
    from: "cutoffMs: Math.max(p.startMs, nowMs - RUNNING_MARGIN_MS)",
    to: "cutoffMs: nowMs",
    expect: "6.12",
  },
  // ── day by day: each day its own report, the days adding up to the period ─────────────────────
  {
    // An edge AT the window's end is pushed twice: an empty last day, and a month of 31 slices for 30 days.
    name: "tax-report.ts — the day edges run one past the window's end",
    file: "src/lib/tax-report.ts",
    from: "; next < endMs; next += DAY_MS) edges.push(next);",
    to: "; next <= endMs; next += DAY_MS) edges.push(next);",
    expect: "14.1",
  },
  {
    // A row's link must open exactly its day — not the rest of the window from that day on.
    name: "tax-report.ts — a day's link opens the rest of the window, not the day",
    file: "src/lib/tax-report.ts",
    from: "  const endMs = Math.min(dayEnd, windowEndMs);",
    to: "  const endMs = windowEndMs;",
    expect: "14.4",
  },
  {
    // Measured on the cut-off, a month on its first morning has "one day" and shows no days at all.
    name: "tax-report-data.ts — whether a window has days is measured on the cut-off, not the window",
    file: "src/lib/server/tax-report-data.ts",
    from: "  if (dayEdges(period.startMs, period.endMs).length <= 2) return null;",
    to: "  if (dayEdges(L.S, L.E).length <= 2) return null;",
    expect: "14.26",
  },
  {
    // A stake placed on the stroke of midnight belongs to the NEW day; strictly-less files it under the old one.
    name: "tax-report-data.ts — an instant exactly at midnight is filed under the day before",
    file: "src/lib/server/tax-report-data.ts",
    from: "if (edges[mid] <= t) lo = mid; else hi = mid - 1;",
    to: "if (edges[mid] < t) lo = mid; else hi = mid - 1;",
    expect: "14.9",
  },
  {
    // A stake placed before the window and still waiting is brought forward into its first day.
    name: "tax-report-data.ts — a day forgets the stakes placed before the window",
    file: "src/lib/server/tax-report-data.ts",
    from: "    if (!(placed < L.E)) continue;",
    to: "    if (!(placed >= L.S && placed < L.E)) continue;",
    expect: "14.21",
  },
  {
    // A losing bet leaves no money record: dropped from the day it resulted on, its round no longer closes.
    name: "tax-report-data.ts — a bet is dropped from the day it left on hold",
    file: "src/lib/server/tax-report-data.ts",
    from: ": sliceOf(left);",
    to: ": sliceOf(left) - 1;",
    expect: "14.8",
  },
  {
    // A payout on a bet that left the day before: the Day view finds its bet by id, and so must the row.
    name: "tax-report-data.ts — a day drops the bets its own money records name",
    file: "src/lib/server/tax-report-data.ts",
    from: "      if (p) bets[i].set(p.id, p);",
    to: "      void p;",
    expect: "14.27",
  },
  {
    name: "tax-report-doc.ts — the day note never says when the days' tax differs from Report 2's",
    file: "src/lib/server/tax-report-doc.ts",
    from: '(dayTax === f.tax.total ? "" :',
    to: '(true ? "" :',
    expect: "14.30",
  },
  {
    // A filing locked before daily figures existed must say it holds none, not print as if days were empty.
    name: "tax-report-doc.ts — an old filing's missing day table goes unsaid",
    file: "src/lib/server/tax-report-doc.ts",
    from: '    if (d.byDay === undefined && d.period.kind !== "day") notes.push(NO_DAYS_IN_LOCK);',
    to: "    void NO_DAYS_IN_LOCK;",
    expect: "14.41",
  },
  {
    // Two days of .50 make a whole period: rounded to shillings, the printed days no longer add up.
    name: "tax-report-doc.ts — a day's cents are rounded away when the period's are whole",
    file: "src/lib/server/tax-report-doc.ts",
    from: "|| (d.byDay ?? []).some((x) => Object.values(x.report1).some(cents) || cents(x.differenceCents));",
    to: "|| false;",
    expect: "14.40",
  },
  {
    name: "tax-report-doc.ts — the workbook adds the stakes brought forward instead of subtracting them",
    file: "src/lib/server/tax-report-doc.ts",
    from: "bf: money(-x.report1.broughtForwardCents || 0),",
    to: "bf: money(x.report1.broughtForwardCents),",
    expect: "14.36",
  },
  {
    // A day that closed seconds ago read to its end disagrees with the running month that cuts a minute back.
    name: "tax-report.ts — a period that ended seconds ago is read to its end, not a minute back",
    file: "src/lib/tax-report.ts",
    from: "if (p.endMs > nowMs - RUNNING_MARGIN_MS) return",
    to: "if (p.endMs > nowMs) return",
    expect: "14.26b",
  },
  {
    name: "tax-report-view.ts — money moved between days goes unnamed while the period lines agree",
    file: "src/lib/server/tax-report-view.ts",
    from: "  if (locked.byDay && live.byDay) {",
    to: "  if (false) {",
    expect: "14.48",
  },
  {
    name: "tax-report-doc.ts — the printed page hides a day that is out of balance",
    file: "src/lib/server/tax-report-doc.ts",
    from: 'o.print && !x.balanced ? "out of balance" : null',
    to: "null",
    expect: "14.34",
  },
];
