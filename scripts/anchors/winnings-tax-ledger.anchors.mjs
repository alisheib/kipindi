/**
 * The defects `red:winnings-tax-ledger` plants (FEE-TAX-2026-10, R2b), each in the real source, each required to turn
 * `test:winnings-tax-ledger`'s memory child red ON ITS OWN ASSERTION (`expect`, matched as `FAIL [memory] <expect>`).
 * Every one leaves every ledger group BALANCED — which is the point: a balance check alone is blind to all of them (the
 * child's §2.2 proves that too). An entry with `combineInto` is applied TOGETHER with the entry it names, never alone.
 */
const LEDGER = "src/lib/server/ledger.ts";
const SERVICE = "src/lib/server/market-service.ts";
const POOL_AND_PLAYER = "  const lines: LedgerLine[] = [\n    { account: acct.pool(opts.marketId), entryType: \"PAYOUT_CREDIT\", amount: -totalCredits, userId: opts.userId, marketId: opts.marketId, memo: `Settlement debit` },\n    { account: acct.player(opts.userId), entryType: \"PAYOUT_CREDIT\", amount: netPayout,";
const LEFT_IN_POOL = "the winnings tax is left in POOL by the builder: the pool debit stops at payout + commission";

export const MUTATIONS = [
  {
    name: "the winnings tax is booked from the PLAYER account: the pool debit stops at payout + commission and the player line pays the tax",
    file: LEDGER,
    from: `  const totalCredits = netPayout + commAmt + taxAmt;\n\n${POOL_AND_PLAYER}`,
    to: `  const totalCredits = netPayout + commAmt;\n\n${POOL_AND_PLAYER.replace("amount: netPayout,", "amount: netPayout - taxAmt,")}`,
    expect: "1.3 · ★ every group balances",
  },
  {
    name: "the winnings tax is booked to HOUSE:TRA_LEVY — filed as a levy on revenue 50pick never earned",
    file: LEDGER,
    from: `lines.push({ account: acct.winningsTax, entryType: "SETTLEMENT_WINNINGS_TAX",`,
    to: `lines.push({ account: acct.traLevy, entryType: "SETTLEMENT_WINNINGS_TAX",`,
    expect: "1.3 · ★ every group balances",
  },
  {
    name: LEFT_IN_POOL,
    file: LEDGER,
    from: "  const totalCredits = netPayout + commAmt + taxAmt;",
    to: "  const totalCredits = netPayout + commAmt;",
    expect: "1.3 · ★ every group balances",
  },
  {
    // Alone, the line above would IMBALANCE the group (the tax account still credited), which `postLedgerEntries` refuses
    // outright; with the tax line dropped as well the group balances and the tax simply never leaves the pool.
    name: "…and its tax line is dropped",
    combineInto: LEFT_IN_POOL,
    file: LEDGER,
    from: "  if (taxAmt > 0) {\n    // ⭐ The winner's withheld tax, owed to TRA.",
    to: "  if (false) {\n    // ⭐ The winner's withheld tax, owed to TRA.",
    expect: "1.3 · ★ every group balances",
  },
  {
    name: "settlement stops handing the split's tax to the ledger — the tax stays in POOL on every real settlement",
    file: SERVICE,
    from: "            ...(sharePart ? { winningsTaxAmount: sharePart.tax, txnId: payoutTxnId } : {}),\n",
    to: "",
    expect: "2b.1 · settleMarket passes `winningsTaxAmount: sharePart.tax`",
  },
  {
    name: "the winner is credited the GROSS payout (net + tax) instead of the net",
    file: SERVICE,
    from: "payoutByPos = new Map([...shareSplit.perWinner].map(([id, part]) => [id, part.payout] as const));",
    to: "payoutByPos = new Map([...shareSplit.perWinner].map(([id, part]) => [id, part.payout + part.tax] as const));",
    expect: "2b.2 · …and credits the wallet with the split's NET payout",
  },
];
