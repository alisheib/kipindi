/**
 * RED anchors for `npm run red:house-page` — the control for `test:house-page`.
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE, so `red-anchors.test.mts` §3 can audit every declared
 * anchor WITHOUT running the injection. Same law as the anchor files beside it.
 *
 * ⛔ EVERY ANCHOR MUST RESOLVE EXACTLY ONCE — `resolveAnchor` refuses both zero matches (a
 * rotted anchor proves nothing) and two or more (an ambiguous one proves the wrong thing).
 *
 * Each mutation below is a way `/admin/house` could go quietly wrong with `tsc` clean, the
 * build green and every money suite passing. That is the whole reason this guard reads source
 * rather than calling a function: none of these is a value anything returns.
 */

export const MUTATIONS = [
  {
    // ⭐ THE PRODUCT-LINE TRAP. Up & Down is 353 of the 467 named markets that have moved money
    // on production, so one bare `listMarkets()` here deletes three quarters of the owner's
    // revenue — and every number still reconciles with itself, which is why nothing else notices.
    name: "house/page.tsx — reach for listMarkets (three quarters of the book silently deleted)",
    file: "src/app/admin/house/page.tsx",
    from: `  const meta = gameRows ? await marketStore.bookByIds(ids).catch(() => null) : null;`,
    to: `  const meta = gameRows ? await listMarkets().then((ms) => new Map(ms.map((m) => [m.id, m]))).catch(() => null) : null;`,
    expect: "2.1",
  },
  {
    // The same damage from the other end: give the safe read the parameter that makes it unsafe.
    name: "market-dal.ts — give bookByIds a productLine filter (the safety was structural)",
    file: "src/lib/server/market-dal.ts",
    from: `      where: { id: { in: [...ids] } },
      select: {
        id: true, titleEn: true, productLine: true, status: true,`,
    to: `      where: { id: { in: [...ids] }, productLine: "MARKET" },
      select: {
        id: true, titleEn: true, productLine: true, status: true,`,
    expect: "2.4",
  },
  {
    // ⭐ A-5, AND THE ONE THIS GUARD ALREADY CAUGHT ONCE FOR REAL. Rendering the variance as
    // `?? 0` prints "TZS 0 · the books reconcile" on a window where the check could not be RUN.
    name: "house/page.tsx — render the reconciliation variance as `?? 0` (a failed check reads as a clean one)",
    file: "src/app/admin/house/page.tsx",
    from: `                          <Amt v={recon.variance} />`,
    to: `                          <Amt v={recon.variance ?? 0} />`,
    expect: "3.1",
  },
  {
    // Compute the solvency line from whatever arrived. A missing read becomes an invented zero
    // inside a subtraction, and the owner reads a confident number built on nothing.
    name: "house/page.tsx — compute the position from partial reads (a fabricated zero inside a subtraction)",
    file: "src/app/admin/house/page.tsx",
    from: `  const position = accounts && cash && liability !== null && adjBacked !== null`,
    to: `  const position = accounts && cash`,
    expect: "3.3",
  },
  {
    // ⭐ THE BLUR. `<Stat money>` routes through the PLAYER's balance-privacy toggle, and the
    // console has no unmask control — the owner's own book would read `TZS •••••` with no way out.
    name: "house/page.tsx — route money through Stat/Cash (the owner's book behind a player toggle)",
    file: "src/app/admin/house/page.tsx",
    from: `import { Tabs } from "@/components/ui/tabs";`,
    to: `import { Tabs } from "@/components/ui/tabs";
import { Cash } from "@/components/ui/cash";`,
    expect: "4.1",
  },
  {
    // ⭐ §K RULE 7d — a tab may hide a detail, never a STATE. Moving the solvency line into the
    // POSITION tab is exactly the tidy-up somebody will propose, and it is how an owner stops
    // seeing the one line the page exists for.
    // The rail moves UP, above the solvency band — so the two free-cash tiles land inside a tab
    // and vanish from two screens out of three. This is the tidy-up somebody will propose.
    name: "house/page.tsx — move the rail above the free-cash tiles (the solvency line becomes hideable)",
    file: "src/app/admin/house/page.tsx",
    from: `        <KpiGrid cols="4">
          <AdminKpi label="Custodial cash" sw="Fedha tulizonazo"`,
    to: `        <Tabs variant="line" value={tab} ariaLabel="House sections" tabs={[]} />
        <KpiGrid cols="4">
          <AdminKpi label="Custodial cash" sw="Fedha tulizonazo"`,
    expect: "10.1",
  },
  {
    // ⭐ THE KIND LIE. Show the flattering figure whenever the honest one is ugly.
    name: "house/page.tsx — substitute the ex-adjustments figure when the strict line is negative",
    file: "src/app/admin/house/page.tsx",
    from: `            value={position ? formatTzs(position.freeHouseCash) : ""} unavailable={position === null}
            tone={position && position.freeHouseCash < 0 ? "danger" : undefined}`,
    to: `            value={position ? formatTzs(position.freeHouseCash < 0 ? position.freeHouseCashExAdjustments : position.freeHouseCash) : ""} unavailable={position === null}
            tone={position && position.freeHouseCash < 0 ? "danger" : undefined}`,
    expect: "10.2",
  },
  {
    // ⛔ `poolFee` under capped-commission IGNORES the winning side, so a VOID market — every
    // stake refunded, nothing booked — comes back with a real fee and invents a variance.
    name: "house/[marketId] — recompute a VOID's fee (a disagreement manufactured on a correct book)",
    file: "src/app/admin/house/[marketId]/page.tsx",
    from: `  const winner = outcome === "YES" || outcome === "NO" ? outcome : null;`,
    to: `  const winner = outcome as "YES" | "NO" | null;`,
    expect: "6.1",
  },
  {
    // Reconcile the WHOLE fee against a formula that does not model an early exit — a variance
    // equal to every cash-out fee the game ever charged, on a perfectly correct book.
    name: "house/[marketId] — reconcile the whole fee, early-exit included (poolFee does not model an exit)",
    file: "src/app/admin/house/[marketId]/page.tsx",
    from: `  const rec = computed === null ? null : reconcile(totals.settlementFee, computed);`,
    to: `  const rec = computed === null ? null : reconcile(totals.feeBooked, computed);`,
    expect: "6.2",
  },
  {
    // ⭐ THE EPSILON. "Within a shilling is fine" is how seven production pools finished
    // NEGATIVE at net −6 TZS while every money suite stayed green.
    name: "house/[marketId] — absorb a one-shilling variance (the epsilon that hid seven negative pools)",
    file: "src/app/admin/house/[marketId]/page.tsx",
    from: `              {!rec.clean && (`,
    to: `              {!rec.clean && Math.abs(rec.variance) > 1 && (`,
    expect: "6.4",
  },
  {
    // ⭐ `stampedAt === "legacy"` is produced by TWO paths — including a genuine snapshot that
    // merely predates the field — so this labels a correctly frozen game as never frozen.
    name: "house/[marketId] — badge provenance off stampedAt (a frozen game reported as legacy)",
    file: "src/app/admin/house/[marketId]/page.tsx",
    from: `  const own = meta ? hasOwnSnapshot(meta.feeSnapshot) : false;`,
    to: `  const own = meta ? rates?.stampedAt !== "legacy" : false;`,
    expect: "7.1",
  },
  {
    // …and the same hole from inside the module: re-type the predicate instead of calling it,
    // so the badge and the maths get two authors and one of them will drift.
    name: "market-config.ts — re-type the snapshot predicate instead of calling it (two authors, one answer)",
    file: "src/lib/server/market-config.ts",
    from: `  if (hasOwnSnapshot(raw) && s) {`,
    to: `  if (s && Number.isFinite(s.commissionRate) && Number.isFinite(s.feeCeilingRate)) {`,
    expect: "7.3",
  },
  {
    // ⭐ 121 ledger marketIds have no market row on production and carry 54,650 of real fees —
    // one is the SECOND-largest earner in the whole book. Dropping them breaks the identity
    // above by exactly that much, silently.
    name: "house/page.tsx — drop rows whose market is gone (real money vanishes, and so does the identity)",
    file: "src/app/admin/house/page.tsx",
    from: `    ? gameRows.map((r) => {`,
    to: `    ? gameRows.filter((r) => meta.has(r.marketId)).map((r) => {`,
    expect: "9.1",
  },
  {
    // The subtotals move with the filter, so they only ever agree with themselves — and an
    // accountant reconciling a product against the whole book gets a number that cannot tie.
    name: "house/page.tsx — take the product subtotals over the FILTERED set",
    file: "src/app/admin/house/page.tsx",
    from: `        const set = rows.filter((r) => r.productLine === pl);`,
    to: `        const set = rows.filter((r) => r.productLine === pl && (!sp.product || r.productLine === sp.product));`,
    expect: "11.5",
  },
  {
    // ⛔ A ledger figure under a rail heading. `railFloat` exists precisely so a number and its
    // provenance travel together; printing a zero on failure is how the two come apart.
    name: "house/page.tsx — print a zero when the payout float cannot be read",
    file: "src/app/admin/house/page.tsx",
    from: `              <p className="text-body-sm text-text-secondary">
                Unavailable — {floatReason ?? float.reason}
              </p>`,
    to: `              <p className="text-body-sm text-text-secondary">
                <span className="amount">{formatTzs(0)}</span>
              </p>`,
    expect: "12.2",
  },
  {
    // ⛔ Up & Down stores YES/NO and a reader must see Up and Down. Dropping the product line
    // makes every Up & Down round read as a YES/NO poll on the owner's own revenue table.
    name: "house/page.tsx — spell the outcome without the product line (an Up round reads as YES)",
    file: "src/app/admin/house/page.tsx",
    from: `                              : <>{outcomeWordIn("en", r.outcome, r.productLine)}{r.noFee && <span className="text-text-tertiary"> · no fee</span>}</>}`,
    to: `                              : <>{outcomeWordIn("en", r.outcome, "MARKET")}{r.noFee && <span className="text-text-tertiary"> · no fee</span>}</>}`,
    expect: "13.2",
  },
];
