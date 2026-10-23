/**
 * test:maswali-share-payout — OD-13, ON BOTH STORES: a share owed to a winner whose account cannot sign in is paid by a
 * Compliance officer to the registered number, at the holder's request (MASWALI-BUILD S6-MONEY; the lead's ruling (k) of
 * 2026-10-22; `src/lib/server/maswali-share-payout.ts`, `withdraw`'s `lockedWinnerShare`).
 *
 *   npx tsx scripts/maswali-share-payout.test.mts     (npm run test:maswali-share-payout)
 *
 *   §A ⭐ one self-excluded winner: the share stranded (the player's own withdrawal refused), listed with why it cannot be
 *      paid yet; the act's own refusals; the identity and email rules unchanged (each refused, nothing moved); then the
 *      payment — the share to the shilling, the live fee, the registered number — the freeze NOT lifted for anything
 *      else, the record read back, a second press paying nothing, and (Postgres) the ledger balancing
 *   §B ⭐ the races and the holds: two officers at once pay once; a held share and a forfeited one are not paid; a share
 *      forfeited between the act's read and its money is refused inside the locks; an account that can sign in is not
 *      this act's; an officer's hold stops the money (the act, and `withdraw`'s own gate); a closed payout rail stops it;
 *      the money waits for the Millionea chain lock (the platform's order)
 *   §C ⭐ a share above the per-withdrawal maximum is paid in equal parts that sum to it; a payment the rail refused gives
 *      its money back and is retried under the next key, never while one is in flight; a closed account's released share
 *      leaves through its closed wallet, which stays closed; the holder's own withdrawal attempts, used up, neither refuse
 *      nor count against the officer's payment (C.4)
 *
 * ⛔ Every week, ticket, hold, release and forfeit goes through the product's own doors (`maswali-money-world.mts`);
 *    a self-exclusion through `selfExclude`. ⚠️ FIXTURES, DECLARED: identity approval is written as the KYC row an
 *    officer's approval leaves (`db.kyc.upsert`), an email confirmation as the account's stamp, a closure as the account's
 *    and the wallet's CLOSED (the closure door ends a browser session, which a suite has none of), and an officer's hold
 *    through `addWalletFreeze` — each the state the platform's own act leaves, on the suite's own accounts.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-share-payout-session-secret-0123456789abcdef";
delete process.env.PAYMENTS_DEMO_ASYNC; // the mock rail answers at once unless a case says otherwise (§C)

const { loadMaswaliWorld, OWNER } = await import("./maswali-money-world.mts");
const W = await loadMaswaliWorld();
const { dal, settle } = W;
const pay = await import("../../src/lib/server/maswali-share-payout.ts");
const walletSvc = await import("../../src/lib/server/wallet-service.ts");
const rg = await import("../../src/lib/server/responsible-gambling.ts");
const { addWalletFreeze } = await import("../../src/lib/server/wallet-freeze.ts");
const { withLock } = await import("../../src/lib/server/locks.ts");
const { MASWALI_CHAIN_LOCK } = await import("../../src/lib/server/maswali-service.ts");
const { getAuditForTargetDurable, auditFlush } = await import("../../src/lib/server/audit.ts");
const { computeWithdrawalFee } = await import("../../src/lib/payout.ts");
const { getEffectiveConfig } = await import("../../src/lib/server/market-config.ts");
const { WITHDRAW_MAX_TZS } = await import("../../src/lib/server/validators.ts");
const { normalizeTzLocalDigits } = await import("../../src/lib/phone-normalize.ts");
const cfgMod = await import("../../src/lib/server/maswali-config.ts");
const { rateCheckAsync } = await import("../../src/lib/server/rate-limit.ts");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const errOf = (r: { ok: boolean; error?: string }) => (r.ok ? "" : String(r.error));
const iso = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** Compliance officers (ids only: the act's role is the action's to check, `test:maswali-rbac`). */
const OFFICER = "usr_mln_compliance_1", OFFICER_2 = "usr_mln_compliance_2";
const REQUEST = "The holder phoned the desk and asked to be paid to their registered number.";
const rate = (await getEffectiveConfig()).withdrawalFeeRate as number;
const bal = async (u: string) => (await W.bal(u)) as any;
const phoneOf = async (u: string) => ((await W.db.user.findById(u)) as any).phoneE164 as string;
/** Every withdrawal on the account, newest first. */
const withdrawalsOf = async (u: string) => ((await W.db.txn.findByUser(u, 500)) as any[]).filter((t) => t.type === "WITHDRAWAL");
/** One share's payments as the act keys them, read until the first key with none. */
const paymentsOf = async (ticketId: string) => {
  const out: any[] = [];
  for (let n = 0; n < 50; n++) {
    const t = await W.db.txn.findByIdempotencyKey(pay.paymentKey(ticketId, n));
    if (!t) break;
    out.push(t);
  }
  return out;
};
const paidRecords = async (ticketId: string) => {
  await auditFlush();
  return (await getAuditForTargetDurable("MaswaliTicket", ticketId, { limit: 50 })).entries.filter((e: any) => e.action === pay.SHARE_PAID_LOCKED_ACTION);
};

let kycSeq = 0;
/** Identity approved once — the KYC row an officer's approval leaves (the fixture the header declares). */
async function approveIdentity(u: string): Promise<void> {
  await W.db.kyc.upsert({
    id: `kyc_${u}`, userId: u, status: "APPROVED", rejectReason: null, rejectNote: null, idType: "NIDA",
    idNumber: `19900101${String(++kycSeq).padStart(12, "0")}`, idExpiry: null, idVerifiedAt: iso(), fullName: "Test Winner", dob: "1990-01-01",
    documents: [], reviewerId: null, reviewedAt: iso(), submittedAt: iso(), approvedAt: iso(), createdAt: iso(), updatedAt: iso(),
  } as never);
}
const confirmEmail = (u: string) => W.setUserFields(u, { email: `${u}@winner.test`, emailVerifiedAt: iso() });
/** A funded holder-to-be; `ready` approves the identity and confirms the email (the withdrawal rules' two gates). */
async function holder(o: { balance?: number; ready?: boolean } = {}): Promise<string> {
  const u = await W.user({ balance: o.balance ?? 50_000 });
  await W.setUserFields(u, { email: `${u}@winner.test`, emailVerifiedAt: null });
  if (o.ready !== false) { await approveIdentity(u); await confirmEmail(u); }
  return u;
}

await W.setup({ guarantee: 40_000_000 });
const fillers: string[] = [];
for (let i = 0; i < 12; i++) fillers.push(await W.user({ balance: 300_000 }));
let ahead = 2;

/** A week in which each of `winners` holds one winning ticket, filled to ten tickets with losing ones; `before` runs for
 *  each winner after their purchase (a self-exclusion, a closure); then closed, sealed and released. */
async function settledWeek(winners: string[], before: (u: string) => Promise<void>): Promise<{ week: any }> {
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  for (const u of winners) {
    const b = await W.buy(u, week.id, [W.WIN]);
    if (!b.ok) throw new Error(`settledWeek: a winner's purchase was refused: ${b.error}`);
  }
  await W.sell(week.id, 10 - winners.length, W.LOSE, fillers);
  for (const u of winners) await before(u);
  const at = await W.closeAndSeal(week, start);
  const r = await W.release(week.id, at);
  if (!r.ok) throw new Error(`settledWeek: the release was refused: ${r.error}`);
  return { week: r.week };
}
const winningTicket = async (weekId: string, u: string) => (await dal.ticketStore.listForWeek(weekId)).find((t: any) => t.userId === u && t.won) as any;
const selfExclude = (u: string) => rg.selfExclude(u, "6m");
const act = (ticketId: string, o: { officer?: string; typed?: string; request?: string; provider?: string; payoutStatus?: () => Promise<any> } = {}) =>
  pay.payLockedWinnerShare({ ticketId, officerId: o.officer ?? OFFICER, typed: o.typed ?? pay.PAY_SHARE_WORD, request: o.request ?? REQUEST,
    provider: o.provider ?? "MPESA", ...(o.payoutStatus ? { payoutStatus: o.payoutStatus } : {}) });

// ═══ §A · one self-excluded winner ═══════════════════════════════════════════════════════════════════════════════
console.log("\n§A · a self-excluded winner: the share stranded, the rules unchanged, one payment of the share, the freeze kept");
{
  const P = await holder({ ready: false });
  const { week } = await settledWeek([P], selfExclude);
  const t = await winningTicket(week.id, P);
  const share = week.sharePerTicket as number;
  const w0 = await bal(P);
  ok("A.0 · premise: the week paid its one winner the floor share, free, into the wallet the self-exclusion froze",
    share === 870_000 && !!t && t.payout === share && t.frozenReason === null && (await W.db.user.findById(P) as any).status === "SELF_EXCLUDED"
      && w0.status === "FROZEN" && J(w0.freezeReasons) === J(["SELF_EXCLUSION"]) && w0.balance === 50_000 - 1_000 + share,
    J({ share, payout: t?.payout, frozenReason: t?.frozenReason, wallet: { status: w0.status, reasons: w0.freezeReasons, balance: w0.balance } }));

  const listed = (await pay.lockedWinnerShares()).find((s: any) => s.ticketId === t.id);
  ok("A.1 · the console lists the share — owed in full, the account self-excluded — and says why it cannot be paid yet: the identity was never verified",
    !!listed && listed.share === share && listed.paid === 0 && listed.left === share && listed.standing === "SELF_EXCLUDED"
      && /identity has never been verified/.test(listed.blocked ?? "") && listed.next === 0, J(listed));

  const noWord = await act(t.id, { typed: "PAY" });
  const noRequest = await act(t.id, { request: "hi" });
  const noNetwork = await act(t.id, { provider: "PAYPAL" });
  ok("A.2 · ⛔ the act refuses without its typed word, the holder's request or the network — and nothing moves",
    !noWord.ok && /Type PAY SHARE/.test(errOf(noWord)) && !noRequest.ok && /5–300/.test(errOf(noRequest)) && !noNetwork.ok && /network/.test(errOf(noNetwork))
      && (await bal(P)).balance === w0.balance && (await withdrawalsOf(P)).length === 0, J([errOf(noWord), errOf(noRequest), errOf(noNetwork)]));

  const noId = await act(t.id);
  ok("A.3 · ⛔ the identity rule is unchanged (OD-13): never verified, the payment is refused — nothing moves, no withdrawal row",
    !noId.ok && /Identity not verified/.test(errOf(noId)) && (await bal(P)).balance === w0.balance && (await withdrawalsOf(P)).length === 0, errOf(noId));
  await approveIdentity(P);

  const noMail = await act(t.id);
  const listedMail = (await pay.lockedWinnerShares()).find((s: any) => s.ticketId === t.id);
  ok("A.4 · ⛔ the email rule is unchanged (OD-13): no confirmed address, the payment is refused — nothing moves — and the console says why",
    !noMail.ok && /Confirm your email|confirm it before you withdraw/.test(errOf(noMail)) && (await bal(P)).balance === w0.balance
      && (await withdrawalsOf(P)).length === 0 && /no confirmed email/.test(listedMail?.blocked ?? ""), J({ err: errOf(noMail), blocked: listedMail?.blocked }));
  await confirmEmail(P);

  const own = await walletSvc.withdraw(P, { provider: "MPESA", amount: 100_000, msisdn: normalizeTzLocalDigits(await phoneOf(P)) });
  ok("A.5 · ⛔ premise of the act: the holder's own withdrawal is refused — the self-exclusion's freeze stops it",
    !own.ok && /Wallet frozen/.test(errOf(own)) && (await bal(P)).balance === w0.balance, errOf(own));

  const ready = (await pay.lockedWinnerShares()).find((s: any) => s.ticketId === t.id);
  const fee = computeWithdrawalFee(share, rate);
  ok("A.5b · …and once both rules are met, the console offers the payment: the whole share, its fee at today's rate, what arrives",
    !!ready && ready.blocked === null && ready.next === share && ready.fee === fee && ready.net === share - fee, J(ready));

  const r: any = await act(t.id);
  const rows = await withdrawalsOf(P);
  const w1 = await bal(P);
  ok("A.6 · ⭐ the act pays the share to the shilling: one withdrawal of exactly the share, at the live fee, to the number registered on the account, confirmed",
    r.ok && !r.already && r.status === "CONFIRMED" && r.amount === share && r.fee === fee && r.net === share - fee && r.left === 0
      && rows.length === 1 && rows[0].amount === -share && rows[0].fee === fee && rows[0].status === "CONFIRMED"
      && rows[0].idempotencyKey === pay.paymentKey(t.id, 0) && rows[0].msisdn === (await phoneOf(P))
      && w1.balance === w0.balance - share && w1.hold === 0, J({ r, rows: rows.map((x: any) => ({ amount: x.amount, fee: x.fee, status: x.status, key: x.idempotencyKey })), w1: { balance: w1.balance, hold: w1.hold } }));
  const ownAfter = await walletSvc.withdraw(P, { provider: "MPESA", amount: 20_000, msisdn: normalizeTzLocalDigits(await phoneOf(P)) });
  ok("A.7 · ⭐ the freeze is not lifted for anything else: the wallet stays FROZEN by the self-exclusion, the account self-excluded, and the holder's own withdrawal of what remains is still refused",
    w1.status === "FROZEN" && J(w1.freezeReasons) === J(["SELF_EXCLUSION"]) && (await W.db.user.findById(P) as any).status === "SELF_EXCLUDED"
      && !ownAfter.ok && /Wallet frozen/.test(errOf(ownAfter)) && (await bal(P)).balance === w1.balance, J({ wallet: { status: w1.status, reasons: w1.freezeReasons }, own: errOf(ownAfter) }));
  const recs = await paidRecords(t.id);
  ok("A.8 · ⭐ recorded and read back: one COMPLIANCE row on the ticket naming the payment, its amount, fee and status and the officer — and the act said it landed",
    r.recorded === true && recs.length === 1 && recs[0].category === "COMPLIANCE" && recs[0].actorId === OFFICER && recs[0].payload?.txnId === r.txnId
      && recs[0].payload?.amount === share && recs[0].payload?.fee === fee && recs[0].payload?.status === "CONFIRMED" && recs[0].payload?.left === 0
      && recs[0].payload?.request === REQUEST && !("last4" in (recs[0].payload ?? {})), J(recs.map((e: any) => e.payload)));
  const again: any = await act(t.id, { officer: OFFICER_2 });
  ok("A.9 · ⭐ a second press pays nothing: answered as paid in full, still one withdrawal, the wallet unchanged, no second record",
    again.ok && again.already === true && (await withdrawalsOf(P)).length === 1 && (await paymentsOf(t.id)).length === 1
      && (await bal(P)).balance === w1.balance && (await paidRecords(t.id)).length === 1, J(again));
  if (W.onPostgres) {
    const { prisma } = await import("../../src/lib/server/prisma.ts");
    const { trialBalance } = await import("../../src/lib/server/ledger.ts");
    const lines = await prisma()!.ledgerEntry.findMany({ where: { groupId: `wdr_${r.txnId}` } });
    const sum = lines.reduce((s: number, l: any) => s + Number(l.amount), 0);
    const player = lines.filter((l: any) => l.account === `PLAYER:${P}`).reduce((s: number, l: any) => s + Number(l.amount), 0);
    const tb = await trialBalance();
    ok("A.10 · ⭐ (Postgres) the ledger balances: the payment's group nets to 0 and takes exactly the share from the winner's account; the winner's ledger equals the wallet; the books' global sum is 0",
      lines.length >= 2 && sum === 0 && player === -share && !tb.drift.some((d: any) => d.userId === P) && tb.globalBalanced,
      J({ lines: lines.length, sum, player, drift: tb.drift.filter((d: any) => d.userId === P), global: tb.globalSum }));
  } else {
    ok("A.10m · (memory, which keeps no ledger) the payment conserves: fee + what arrives = the share, and its row names the wallet's balance after it",
      rows[0].fee + (Math.abs(rows[0].amount) - rows[0].fee) === share && rows[0].balanceAfter === w1.balance, J(rows[0]));
  }
  ok("A.11 · the share leaves the console's list once paid in full", !(await pay.lockedWinnerShares()).some((s: any) => s.ticketId === t.id));
}

// ═══ §B · the races and the holds ════════════════════════════════════════════════════════════════════════════════
console.log("\n§B · two officers at once, a held share, a forfeited one, a share forfeited mid-act, an officer's hold, a closed rail, the chain lock");
{
  const Q1 = await holder(), Q2 = await holder(), Q3 = await holder({ balance: 2_000_000 }), Q4 = await holder(), Q5 = await holder(), Q8 = await holder();
  const excludedHere = new Set([Q1, Q2, Q3, Q5, Q8]);
  const { week } = await settledWeek([Q1, Q2, Q3, Q4, Q5, Q8], async (u) => { if (excludedHere.has(u)) await selfExclude(u); });
  const share = week.sharePerTicket as number;
  const [t1, t2, t3, t4, t5, t8] = await Promise.all([Q1, Q2, Q3, Q4, Q5, Q8].map((u) => winningTicket(week.id, u)));
  ok("B.0 · premise: six winners each paid an equal share, none held", share === Math.floor(870_000 / 6) && [t1, t2, t3, t4, t5, t8].every((t: any) => t?.payout === share && !t.frozenReason), J({ share }));

  // B.1 · two officers at once.
  const before1 = (await bal(Q1)).balance;
  const [ra, rb]: any[] = await Promise.all([act(t1.id, { officer: OFFICER }), act(t1.id, { officer: OFFICER_2 })]);
  const p1 = await paymentsOf(t1.id);
  ok("B.1 · ⭐ two officers at once pay once: one withdrawal of the share, the wallet down by exactly one share, one record — the other officer told nothing was paid again",
    ra.ok && rb.ok && p1.length === 1 && (await withdrawalsOf(Q1)).length === 1 && (await bal(Q1)).balance === before1 - share
      && [ra, rb].filter((x) => x.replayed === true || x.already === true).length === 1 && (await paidRecords(t1.id)).length === 1,
    J({ a: { replayed: ra.replayed, already: ra.already, status: ra.status }, b: { replayed: rb.replayed, already: rb.already, status: rb.status }, payments: p1.length }));

  // B.2/B.3 · a held share, then forfeited.
  const held = await settle.holdMaswaliShare({ ticketId: t2.id, officerId: OFFICER, reason: "a reversed deposit may have bought it" });
  const before2 = (await bal(Q2)).balance;
  const onHeld = await act(t2.id);
  ok("B.2 · ⛔ a share held for Compliance's decision is not paid — decided first — and nothing moves",
    held.ok && !onHeld.ok && /held for Compliance's decision/.test(errOf(onHeld)) && (await bal(Q2)).balance === before2 && (await withdrawalsOf(Q2)).length === 0, errOf(onHeld));
  const forfeited = await settle.forfeitMaswaliShare({ ticketId: t2.id, officerId: OFFICER, typed: settle.FORFEIT_SHARE_WORD, reason: "the deposit was reversed" });
  const after2 = (await bal(Q2)).balance;
  const onForfeited = await act(t2.id);
  ok("B.3 · ⛔ a forfeited share is not paid: there is nothing to pay — and nothing moves",
    forfeited.ok && !onForfeited.ok && /forfeited/.test(errOf(onForfeited)) && (await bal(Q2)).balance === after2 && (await withdrawalsOf(Q2)).length === 0, errOf(onForfeited));

  // B.4 · a share forfeited between the act's read and its money: the in-lock recheck refuses it.
  const before3 = (await bal(Q3)).balance;
  pay.__setSharePayoutSeamsForTests({
    beforePayment: async () => {
      pay.__setSharePayoutSeamsForTests(null);
      const h = await settle.holdMaswaliShare({ ticketId: t3.id, officerId: OFFICER_2, reason: "a finding surfaced late" });
      const f = await settle.forfeitMaswaliShare({ ticketId: t3.id, officerId: OFFICER_2, typed: settle.FORFEIT_SHARE_WORD, reason: "the finding stands" });
      if (!h.ok || !f.ok) throw new Error(`B.4: the mid-act hold/forfeit was refused: ${errOf(h)} ${errOf(f)}`);
    },
  });
  const mid = await act(t3.id);
  pay.__setSharePayoutSeamsForTests(null);
  const w3 = await bal(Q3);
  ok("B.4 · ⭐ a share forfeited between the act's read and its money is refused inside the chain and wallet locks: no withdrawal, and the wallet keeps every shilling it held after the forfeit",
    !mid.ok && /forfeited/.test(errOf(mid)) && (await withdrawalsOf(Q3)).length === 0 && w3.balance === before3 - share && w3.hold === 0,
    J({ err: errOf(mid), balance: w3.balance, expected: before3 - share }));

  // B.5 · an account that can sign in.
  const onActive = await act(t4.id);
  ok("B.5 · ⛔ a winner whose account can sign in is not this act's: they withdraw it themselves — nothing moves",
    !onActive.ok && /can sign in/.test(errOf(onActive)) && (await withdrawalsOf(Q4)).length === 0, errOf(onActive));

  // B.6 · an officer's hold on a self-excluded winner's wallet.
  await addWalletFreeze(Q5, "OFFICER", { actorId: OFFICER_2, note: "TEST · an officer's do-not-pay hold" });
  const before5 = (await bal(Q5)).balance;
  const listed5 = (await pay.lockedWinnerShares()).find((s: any) => s.ticketId === t5.id);
  const onOfficerHold = await act(t5.id);
  ok("B.6 · ⛔ an officer's hold stops the payment: the console names the hold, the act refuses, and nothing moves",
    /Officer freeze/.test(listed5?.blocked ?? "") && !onOfficerHold.ok && /held for: Officer freeze/.test(errOf(onOfficerHold))
      && (await bal(Q5)).balance === before5 && (await withdrawalsOf(Q5)).length === 0, J({ blocked: listed5?.blocked, err: errOf(onOfficerHold) }));
  const direct = await walletSvc.withdraw(Q5, { provider: "MPESA", amount: share, msisdn: normalizeTzLocalDigits(await phoneOf(Q5)) }, pay.paymentKey(t5.id, 0), OFFICER,
    { lockedWinnerShare: { ticketId: t5.id, outerLock: MASWALI_CHAIN_LOCK, recheck: async () => null } });
  ok("B.6b · ⭐ …and withdraw's own gate refuses it too: a locked winner's payment passes the self-exclusion's freeze only while no other hold stands",
    !direct.ok && /Wallet frozen/.test(errOf(direct)) && (await bal(Q5)).balance === before5 && (await withdrawalsOf(Q5)).length === 0, errOf(direct));

  // B.7 · the payout rail closed.
  const before8 = (await bal(Q8)).balance;
  const onClosedRail = await act(t8.id, { payoutStatus: async () => "unavailable" });
  ok("B.7 · ⛔ a payout rail not accepting requests stops the payment before anything moves",
    !onClosedRail.ok && /not accepting requests/.test(errOf(onClosedRail)) && (await bal(Q8)).balance === before8 && (await withdrawalsOf(Q8)).length === 0, errOf(onClosedRail));

  // B.8 · the chain lock first: while another act holds `maswali:chain`, the payment's money does not move.
  let letGo!: () => void;
  const gate = new Promise<void>((res) => { letGo = res; });
  let reached!: () => void;
  const atLock = new Promise<void>((res) => { reached = res; });
  const holding = withLock(MASWALI_CHAIN_LOCK, async () => { await gate; });
  await sleep(50);
  pay.__setSharePayoutSeamsForTests({ beforePayment: async () => { reached(); } });
  const pending = act(t8.id);
  await atLock;
  await sleep(1_500); // the act's own pre-lock reads, then the wait for the chain lock
  const midBal = (await bal(Q8)).balance, midRows = (await withdrawalsOf(Q8)).length;
  letGo();
  await holding;
  const late: any = await pending;
  pay.__setSharePayoutSeamsForTests(null);
  ok("B.8 · ⭐ the payment's money waits for the Millionea chain lock (the platform's chain → wallet order): nothing moved while another act held it; once let go, the share was paid",
    midBal === before8 && midRows === 0 && late.ok && late.status === "CONFIRMED" && (await bal(Q8)).balance === before8 - share,
    J({ midBal, before8, midRows, late: { ok: late.ok, status: late.status, err: errOf(late) } }));
}

// ═══ §C · a share above the maximum, a refused payment retried, a closed account ═════════════════════════════════
console.log("\n§C · equal parts above the per-withdrawal maximum; a refused payment retried under the next key; a closed account; the holder's own attempts");
{
  // C.1 · a floor of 10,000,000 for one week (the Owner's rules, saved through the form's own door, then put back).
  const floor0 = cfgMod.getMaswaliConfig().floorTzs;
  const saved = await cfgMod.saveMaswaliConfig({ floorTzs: 10_000_000 }, OWNER);
  if (!saved.ok) throw new Error(`C.1: the floor could not be raised: ${saved.error}`);
  const R = await holder();
  const { week } = await settledWeek([R], selfExclude);
  const back = await cfgMod.saveMaswaliConfig({ floorTzs: floor0 }, OWNER);
  if (!back.ok) throw new Error(`C.1: the floor could not be put back: ${back.error}`);
  const t = await winningTicket(week.id, R);
  const share = week.sharePerTicket as number;
  const w0 = (await bal(R)).balance;
  const first: any = await act(t.id);
  const second: any = await act(t.id);
  const third: any = await act(t.id);
  const parts = await paymentsOf(t.id);
  ok("C.1 · ⭐ a share above the per-withdrawal maximum is paid in equal parts, each within it, that sum to the share to the shilling — then nothing more",
    share === 8_700_000 && share > WITHDRAW_MAX_TZS && first.ok && second.ok && third.ok && third.already === true
      && parts.length === 2 && parts.every((x: any) => x.status === "CONFIRMED" && Math.abs(x.amount) <= WITHDRAW_MAX_TZS)
      && parts.reduce((s: number, x: any) => s + Math.abs(x.amount), 0) === share && Math.abs(parts[0].amount) === Math.abs(parts[1].amount)
      && first.left === share - Math.abs(parts[0].amount) && second.left === 0 && (await bal(R)).balance === w0 - share,
    J({ share, parts: parts.map((x: any) => x.amount), first: first.left, second: second.left, third: third.already }));
  ok("C.1b · the parts are the pure rule's: all of what is left when it fits, else the fewest equal parts that fit",
    pay.nextPayment(WITHDRAW_MAX_TZS) === WITHDRAW_MAX_TZS && pay.nextPayment(WITHDRAW_MAX_TZS + 1) === Math.ceil((WITHDRAW_MAX_TZS + 1) / 2)
      && pay.nextPayment(8_700_000) === 4_350_000 && pay.nextPayment(0) === 0);

  // C.2 · a payment the rail refused: in flight first, then FAILED (its money back), then retried under the next key.
  const S = await holder();
  const { week: w2 } = await settledWeek([S], selfExclude);
  const t2 = await winningTicket(w2.id, S);
  const share2 = w2.sharePerTicket as number;
  const s0 = (await bal(S)).balance;
  process.env.PAYMENTS_DEMO_ASYNC = "true";
  let flying: any;
  try { flying = await act(t2.id); } finally { delete process.env.PAYMENTS_DEMO_ASYNC; }
  const whileFlying = await act(t2.id, { officer: OFFICER_2 });
  ok("C.2 · a payment the rail has not answered is in flight: its money is held, and the console's next act waits for it",
    flying.ok && flying.status === "PROCESSING" && (await bal(S)).hold === share2 && (await bal(S)).balance === s0 - share2, J({ flying, wallet: await bal(S) }));
  ok("C.2b · ⛔ …never a second payment while one is in flight: refused, saying so",
    !whileFlying.ok && /in flight/.test(errOf(whileFlying)) && (await paymentsOf(t2.id)).length === 1, errOf(whileFlying));
  await walletSvc.settleWithdrawalFailed(flying.txnId, "TEST · the rail refused the payment");
  const refusedBack = await bal(S);
  const retry: any = await act(t2.id);
  const p2 = await paymentsOf(t2.id);
  ok("C.2c · ⭐ the refused payment gave its money back, and the next act pays under the next key: the share paid once, to the shilling",
    refusedBack.balance === s0 && refusedBack.hold === 0 && retry.ok && retry.status === "CONFIRMED" && p2.length === 2
      && p2[0].status === "FAILED" && p2[1].status === "CONFIRMED" && p2[1].idempotencyKey === pay.paymentKey(t2.id, 1)
      && Math.abs(p2[1].amount) === share2 && (await bal(S)).balance === s0 - share2 && (await paidRecords(t2.id)).length === 2,
    J({ back: refusedBack.balance, s0, retry: retry.status, payments: p2.map((x: any) => [x.status, x.amount]) }));

  // C.3 · a closed account's share: held at the settlement, released by Compliance, paid through the closed wallet.
  const C = await holder();
  const close = async (u: string) => {
    await W.setUserFields(u, { status: "CLOSED", closedAt: iso() });
    const wl = await bal(u);
    await W.db.wallet.update(wl.id, { status: "CLOSED" });
  };
  const { week: w3 } = await settledWeek([C], close);
  const t3 = await winningTicket(w3.id, C);
  const share3 = w3.sharePerTicket as number;
  const heldAtSettle = t3?.frozenReason === "account closed";
  const released = await settle.releaseMaswaliShare({ ticketId: t3.id, officerId: OFFICER, note: "the closure was the holder's own choice" });
  const c0 = await bal(C);
  const paidClosed: any = await act(t3.id);
  const c1 = await bal(C);
  ok("C.3 · ⭐ a closed account's share — held at the settlement, released by Compliance — leaves through the closed wallet, which stays closed: the share to the shilling, nothing else",
    heldAtSettle && released.ok && c0.status === "CLOSED" && paidClosed.ok && paidClosed.status === "CONFIRMED" && paidClosed.amount === share3
      && c1.status === "CLOSED" && c1.balance === c0.balance - share3 && (await withdrawalsOf(C)).length === 1,
    J({ heldAtSettle, released: errOf(released), c0: { status: c0.status, balance: c0.balance }, paid: { ok: paidClosed.ok, status: paidClosed.status, err: errOf(paidClosed) }, c1: { status: c1.status, balance: c1.balance } }));

  // C.4 · the officer's payment is the officer's act: the holder's own withdrawal attempts neither refuse nor count it.
  const B = await holder();
  const { week: w4 } = await settledWeek([B], selfExclude);
  const t4 = await winningTicket(w4.id, B);
  const share4 = w4.sharePerTicket as number;
  let spent = 0;
  for (; spent < 200 && (await rateCheckAsync(B, "wallet.withdraw")).allowed; spent++) { /* the holder's own attempts, used up */ }
  const own4 = await walletSvc.withdraw(B, { provider: "MPESA", amount: 20_000, msisdn: normalizeTzLocalDigits(await phoneOf(B)) });
  const b0 = (await bal(B)).balance;
  const paidB: any = await act(t4.id);
  ok("C.4 · ⭐ the holder's own withdrawal attempts, used up, neither refuse nor count against the officer's payment: the share paid to the shilling",
    spent > 0 && spent < 200 && !own4.ok && /Too many withdrawal attempts/.test(errOf(own4)) && paidB.ok && paidB.status === "CONFIRMED"
      && paidB.amount === share4 && (await bal(B)).balance === b0 - share4 && (await withdrawalsOf(B)).length === 1,
    J({ spent: spent > 0 && spent < 200, own: errOf(own4), paid: { ok: paidB.ok, status: paidB.status, err: errOf(paidB) } }));
}

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
