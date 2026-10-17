/**
 * test:maswali-close-race's cases — R2 (the adversarial review of S3, 2026-10-17), ON BOTH STORES: the close against a
 * purchase or a cancel in flight. Both commit inside `market:<id>`; the close must wait for that lock, so it lists the live
 * tickets only once the purchase or cancel has committed — never a LIVE ticket outside the Merkle root, never a count the
 * settlement refuses for good (`computeSettlement` checks S three ways and the count).
 *
 * ⭐ THE INTERLEAVING IS MADE, NOT HOPED FOR. A case holds `market:<id>` exactly as an in-flight purchase does, starts the
 *    close OUTSIDE that lock (`runOutsideLock`: a second contender, on either store), then makes the purchase or the
 *    cancel inside it (the bet path joins the held lock, as the purchase holding it would). While the lock is held the
 *    week must still read OPEN; once it is let go, the close must count exactly what committed.
 *   §1 a purchase in flight at the close is counted: in the count, in the sales, in the root
 *   §2 a cancel in flight at the close is not
 *   §3 the control: a purchase after the close is refused as closed and moves nothing
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-close-race-session-secret-0123456789abcdef";

const { loadMaswaliWorld } = await import("./maswali-money-world.mts");
const W = await loadMaswaliWorld();
const { svc: market } = W.w;
const { dal } = W;
const { withLock, runOutsideLock } = await import("../../src/lib/server/locks.ts");
const { merkleRoot } = await import("../../src/lib/maswali-commitment.ts");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const NL = String.fromCharCode(10);
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

await W.setup({ guarantee: 10_000_000 });

/** The week as the close left it, against its own live tickets: the count, the sales and the root from one set. */
async function agrees(weekId: string, price: number) {
  const week = await dal.weekStore.get(weekId);
  const live = await dal.ticketStore.listForWeek(weekId, { status: "LIVE" });
  const root = merkleRoot(live.map((t: any) => ({ ticketId: t.id, leaf: t.selectionsHash })));
  return {
    state: week.state, live: live.length, ticketCount: week.ticketCount, salesAtClose: week.salesAtClose,
    ok: week.state === "CLOSED" && week.ticketCount === live.length && week.salesAtClose === live.length * price && week.ticketMerkleRoot === root,
  };
}

/** Hold `market:<id>` as an in-flight purchase or cancel does; start the close outside it; run `inside` within it. */
async function closeAgainst(week: any, inside: () => Promise<any>) {
  const closeAt = new Date(Date.parse(week.closesAt) + 60_000);
  let close: Promise<any> | null = null;
  let did: any = null, held: any = null;
  await withLock(`market:${week.marketId}`, async () => {
    close = runOutsideLock(() => W.svc.closeWeek({ weekId: week.id, now: closeAt }));
    did = await inside();
    await pause(400); // the close has had every chance to run past the lock, were it not waiting for it
    held = await dal.weekStore.get(week.id);
  });
  return { did, heldState: held?.state, closed: await close! };
}

// ── §1 · a purchase in flight at the close ──────────────────────────────────────────────────────────
console.log(`${NL}§1 · a purchase in flight at the close is counted`);
const w1 = (await W.openWeek({ weeksAhead: 2 })).week;
const price = W.svc.frozenRules(w1).ticketPriceTzs as number;
const buyer = await W.user({ balance: 50_000 });
{
  const r = await closeAgainst(w1, () => W.buy(buyer, w1.id, [W.WIN, W.LOSE]));
  ok("1.1 · the purchase inside the held market lock went through", r.did?.ok === true, J(r.did?.ok ? r.did.data?.maswali?.tickets?.length : r.did));
  ok("1.2 · ⭐ the close WAITED while the purchase held the market lock", r.heldState === "OPEN", `the week read ${r.heldState} while the lock was held`);
  ok("1.3 · …then closed the week once the purchase committed", r.closed?.ok === true && r.closed.already !== true, J(r.closed?.ok ? r.closed.week?.state : r.closed));
  const a = await agrees(w1.id, price);
  ok("1.4 · ⭐ the purchase is IN the close: the count, the sales and the root all from the same two live tickets", a.ok && a.live === 2, J(a));
  ok("1.5 · the buyer paid once for both tickets", (await W.bal(buyer)).balance === 50_000 - 2 * price, J(await W.bal(buyer)));
}

// ── §2 · a cancel in flight at the close ────────────────────────────────────────────────────────────
console.log(`${NL}§2 · a cancel in flight at the close is not counted`);
const w2 = (await W.openWeek({ weeksAhead: 3 })).week;
const canceller = await W.user({ balance: 50_000 });
{
  const b = await W.buy(canceller, w2.id, [W.WIN, W.LOSE]);
  ok("2.0 · two tickets bought before the close", b.ok === true && b.data?.maswali?.tickets?.length === 2, J(b.ok ? b.data?.maswali?.tickets?.length : b));
  const first = b.ok ? b.data.maswali.tickets[0] : null;
  const r = await closeAgainst(w2, () => market.cashOutPosition(canceller, first?.positionId));
  ok("2.1 · the cancel inside the held market lock went through", r.did?.ok === true, J(r.did));
  ok("2.2 · ⭐ the close WAITED while the cancel held the market lock", r.heldState === "OPEN", `the week read ${r.heldState} while the lock was held`);
  ok("2.3 · …then closed the week once the cancel committed", r.closed?.ok === true && r.closed.already !== true, J(r.closed?.ok ? r.closed.week?.state : r.closed));
  const a = await agrees(w2.id, price);
  ok("2.4 · ⭐ the cancelled ticket is NOT in the close: one live ticket, counted once, in the root", a.ok && a.live === 1, J(a));
  ok("2.5 · the cancel refunded its ticket in full", (await W.bal(canceller)).balance === 50_000 - price, J(await W.bal(canceller)));
}

// ── §3 · the control ────────────────────────────────────────────────────────────────────────────────
console.log(`${NL}§3 · the control: after the close, a purchase is refused and moves nothing`);
{
  const late = await W.user({ balance: 50_000 });
  const before = await agrees(w1.id, price);
  const r = await W.buy(late, w1.id, [W.WIN]);
  ok("3.1 · a purchase after the close is refused as closed", r.ok === false && r.reason === "millionea_sales_closed", J(r));
  const after = await agrees(w1.id, price);
  ok("3.2 · …and moved nothing: the buyer's balance and the closed week as they were",
    (await W.bal(late)).balance === 50_000 && after.ok && after.live === before.live && after.ticketCount === before.ticketCount, J({ before, after }));
}

console.log(`${NL}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
