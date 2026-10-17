/**
 * test:maswali-player — WHAT A PLAYER SEES AND WHAT A PLAYER DOES, ON BOTH STORES (MASWALI-BUILD S5; MASWALI-PLAN §7b S5
 * items 1, 2, 4–10).
 *
 *   npx tsx scripts/maswali-player.test.mts     (npm run test:maswali-player)
 *
 *   §1 the gate: WITHDRAWN nobody · STAFF_PREVIEW staff and pass holders · ACTIVE everyone; the route's 404
 *   §2 how to play: the frozen rules (the coming week's before any opens) and the worked examples
 *   §3 the hub: the week, the headline (DESIGN_AUTHORITY §M8a item 9), the price, the viewer's own count and cap
 *   §4 the slip: fifteen questions, no figure a ticket might win, the refusal it would meet
 *   §5 the acts: buy (one request id per submit, the slip validated on the server) and the free cancel; every refusal a
 *      registered reason
 *   §6 the viewer's tickets: the list, one by serial (owner only; a stranger's serial answers as a missing one), the
 *      closure screen
 *   §7 the live frame (`maswali:pool`, coalesced), then the carry pending on an earlier week
 *   §8 a settled week: the win ledger, the loss line (no score, no amount), the register, the seen state, the notices
 *   §9 a week nobody won: the rollover notice and the carried figure
 *   §10 a week voided whole: the refund, its notice, the closure screen
 *   §11 the exclusions (leaderboard streaks, achievements), the wiring (surfaces, the bus, the permalink), the floor
 *
 * ⏱ The weeks are the money world's: two and more weeks ahead, opened, closed and sealed on their own clocks; money reads
 * the real clock. ⛔ Every week and ticket goes through the product's own doors; the one fixture of a FAULT (§11's
 * guarantee drained below its requirement) is labelled where it is made.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-player-session-secret-0123456789abcdef";

const { loadMaswaliWorld, SEALER } = await import("./maswali-money-world.mts");
const W: any = await loadMaswaliWorld();
const { svc: market } = W.w;
const { dal, money, ledger, acct } = W;
const P: any = await import("../../src/lib/server/maswali-player.ts");
const ACT: any = await import("../../src/lib/server/maswali-player-acts.ts");
const FEED: any = await import("../../src/lib/server/maswali-pool-feed.ts");
const BUS: any = await import("../../src/lib/server/event-bus.ts");
const { resolveMillioneaFor }: any = await import("../../src/lib/server/millionea-preview.ts");
const SURF: any = await import("../../src/lib/surfaces.ts");
const { positionPermalink, millioneaTicketHref }: any = await import("../../src/lib/position-permalink.ts");
const { REASONS }: any = await import("../../src/lib/failure-reasons.ts");
const { settleArithmetic, guaranteeRequirement }: any = await import("../../src/lib/maswali-money.ts");
const { snapshotOrLegacy }: any = await import("../../src/lib/server/market-config.ts");
const { getMaswaliConfig }: any = await import("../../src/lib/server/maswali-config.ts");
const { withLock }: any = await import("../../src/lib/server/locks.ts");
const { readFileSync } = await import("node:fs");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const why = (r: any) => (r?.ok ? "ok" : `${r?.reason ?? "-"}: ${r?.error}`);
const DAY = 86_400_000;
/** A form as an action receives it: `get` answers null for a field that was not sent, as FormData does. */
const form = (o: Record<string, unknown>) => ({ get: (k: string) => (k in o ? o[k] : null) });
const at = (state: string) => ({ deps: { stateNow: async () => state } });
const ACTIVE = at("ACTIVE");
const viewer = (userId: string | null, state = "ACTIVE") => ({ userId, state });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Every refusal an act returned in this run, to check the failure shape of all of them at once (§5.13). */
const refusals: any[] = [];
const seen = (r: any) => { if (r && r.ok === false) refusals.push(r); return r; };
const SERIAL = /^MLN-\d{4}-W\d{2}-\d{6,}$/;

await W.setup({ guarantee: 20_000_000 });

// ── §1 · the gate ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · the gate: who may see Millionea");
{
  const users: Record<string, { role: string; status: string }> = {
    staff: { role: "ADMIN", status: "ACTIVE" }, player: { role: "PLAYER", status: "ACTIVE" }, gone: { role: "ADMIN", status: "CLOSED" },
  };
  const deps = (state: string) => ({ stateNow: async () => state, findUser: async (id: string) => users[id] ?? null });
  const see = async (state: string, who: string | null, pass = false) => resolveMillioneaFor({ sessionUserId: who, pass }, deps(state));
  const w = await Promise.all([see("WITHDRAWN", "staff"), see("WITHDRAWN", "player"), see("WITHDRAWN", null), see("WITHDRAWN", "player", true)]);
  ok("1.1 · ⛔ WITHDRAWN: nobody — staff, a player, a guest, even a preview pass", w.every((r: any) => r.visible === false), J(w));
  const [staff, player, guest, gone, holder] = await Promise.all([
    see("STAFF_PREVIEW", "staff"), see("STAFF_PREVIEW", "player"), see("STAFF_PREVIEW", null), see("STAFF_PREVIEW", "gone"), see("STAFF_PREVIEW", "player", true),
  ]);
  ok("1.2 · STAFF_PREVIEW: a staff session sees it, under the preview mark", staff.visible === true && staff.preview === true, J(staff));
  ok("1.3 · STAFF_PREVIEW: ⛔ a player and a guest do not; a staff role on a closed account does not", !player.visible && !guest.visible && !gone.visible, J({ player, guest, gone }));
  ok("1.4 · STAFF_PREVIEW: a preview-pass holder does", holder.visible === true && holder.preview === true, J(holder));
  const a = await Promise.all([see("ACTIVE", "player"), see("ACTIVE", null), see("ACTIVE", "staff")]);
  ok("1.5 · ACTIVE: everyone, with no preview mark", a.every((r: any) => r.visible === true && r.preview === false), J(a));
  const gate = readFileSync("src/lib/server/millionea-gate.ts", "utf8");
  ok("1.6 · the route gate asks the rollout's one answer and turns 'not visible' into the 404 a missing page gives",
    /const r = await resolveMillionea\(\);/.test(gate) && /if \(!r\.visible\) notFound\(\);/.test(gate));
  const route = readFileSync("src/app/positions/[positionId]/page.tsx", "utf8");
  ok("1.7 · the position permalink asks the same gate before it names a ticket's page, and still 404s a stranger's position",
    /if \(productLine === "MASWALI"\) \{\s*if \(!\(await resolveMillionea\(\)\)\.visible\) notFound\(\);/.test(route)
      && /ticketStore\.getByPositionId\(position\.id\)/.test(route) && /position\.userId !== session\.userId\) notFound\(\);/.test(route));
}

// ── §2 · how to play, before any week ─────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · how to play: the frozen rules");
const cfg = getMaswaliConfig();
{
  const h = await P.millioneaHowTo(viewer(null));
  ok("2.1 · with no week current, the rules the next week will freeze (CONFIG), every figure from the config",
    h.source === "CONFIG" && h.weekCode === null && h.ticketPrice === cfg.ticketPriceTzs && h.floor === cfg.floorTzs
      && h.feeRate === cfg.jackpotFeeRate && h.ticketCap === cfg.ticketCapPerWeek && h.closeAt === cfg.closeAt, J(h));
}

const { week: A, start: aStart } = await W.openWeek({ weeksAhead: 2 });
const rulesA = W.svc.frozenRules(A);
const price: number = rulesA.ticketPriceTzs, cap: number = rulesA.ticketCapPerWeek, floor: number = rulesA.floorTzs;
const feesA = snapshotOrLegacy((await market.getMarket(A.marketId)).feeSnapshot);
const feeRate: number = feesA.jackpotFeeRate;
const rates = { traTaxOnCommissionRate: feesA.traTaxOnCommissionRate, gbtLevyOnCommissionRate: feesA.gbtLevyOnCommissionRate };
{
  const h = await P.millioneaHowTo(viewer(null));
  ok("2.2 · with a week on sale, THAT week's frozen rules (WEEK), its fee from its own market",
    h.source === "WEEK" && h.weekCode === A.code && h.ticketPrice === price && h.floor === floor && h.ticketCap === cap
      && h.feeRate === feeRate && h.freeCancelMinutes === feesA.freeExitGraceMinutes, J(h));
  const ex = h.examples;
  const shared = ex ? settleArithmetic({ rolloverIn: 0, sales: ex.shared.sales, winners: 3, floor, feeRate, rates }) : null;
  ok("2.3 · the worked examples are the settlement's own arithmetic over those rules: a shared week, and a floor week",
    !!ex && J(ex.shared.figures) === J(shared) && ex.shared.figures.kind === "PAYOUT" && ex.floorWeek.figures.kind === "PAYOUT"
      && ex.floorWeek.figures.J === floor && ex.floorWeek.sales < floor && ex.shared.sales >= floor, J(ex));
}

// ── §3 · the hub ──────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · the hub");
const P1 = await W.user({ balance: 100_000 });
{
  const h = await P.millioneaHub(viewer(P1));
  const wk = h.week;
  ok("3.1 · the hub leads with the week on sale: its state, close, price and cap from its frozen rules",
    !!wk && wk.id === A.id && wk.state === "OPEN" && wk.closesAt === A.closesAt && wk.ticketPrice === price && wk.ticketCap === cap && wk.selling === true,
    J(wk && { id: wk.id, state: wk.state, selling: wk.selling }));
  ok("3.2 · ⭐ the headline before a sale is the funded floor: R = 0 and known, S = 0, X = max(floor, R + S), {pct} the week's own",
    !!wk?.pool && wk.pool.sales === 0 && wk.pool.carryIn === 0 && wk.pool.atLeast === false && wk.pool.carryPendingCode === null
      && wk.pool.floor === floor && wk.pool.jackpot === floor && wk.pool.feeRate === feeRate, J(wk?.pool));
  ok("3.3 · the viewer's own count against the cap: none held yet", J(wk?.mine) === J({ held: 0, cap, tickets: [] }), J(wk?.mine));
  ok("3.4 · the fifteen public questions, M1…M10 then A1…A5, with no pick on any of them",
    wk?.questions.length === 15 && wk.questions.map((q: any) => q.label).join(",") === "M1,M2,M3,M4,M5,M6,M7,M8,M9,M10,A1,A2,A3,A4,A5"
      && wk.questions.every((q: any) => !("pick" in q) && q.outcome === null));
  ok("3.5 · a week on sale has no 'next opens' line, no week grading beside it and no last week yet",
    h.nextOpensAt === null && h.grading === null && h.lastWeek === null && h.paused === false && h.life === "LIVE", J({ n: h.nextOpensAt, l: h.lastWeek }));
}
const b1 = await W.buy(P1, A.id, [W.WIN, W.WIN, W.LOSE], { key: "player-p1-a-0001" });
ok("3.6 · three tickets bought through the one bet path", b1.ok, why(b1));
{
  const h = await P.millioneaHub(viewer(P1));
  const wk = h.week;
  const rows = wk.mine.tickets;
  ok("3.7 · ⭐ the headline moved with the sale, read from the week's POOL ledger: S = 3 × price, X = max(floor, S)",
    wk.pool.sales === 3 * price && wk.pool.jackpot === Math.max(floor, 3 * price), J(wk.pool));
  ok("3.8 · the viewer's three, in sale order, against the cap", wk.mine.held === 3 && wk.mine.cap === cap && rows.length === 3
    && rows.map((r: any) => r.serial).join() === [...rows.map((r: any) => r.serial)].sort().join() && rows.every((r: any) => SERIAL.test(r.serial)), J(rows.map((r: any) => r.serial)));
  ok("3.9 · OD-24 · the second ticket with the very same fifteen answers names the first; the different one names none",
    rows[0].samePicksAs === null && rows[1].samePicksAs === rows[0].serial && rows[2].samePicksAs === null, J(rows.map((r: any) => r.samePicksAs)));
  ok("3.10 · a held ticket shows no amount: running, nothing paid", rows.every((r: any) => r.shown === "running" && r.paid === null), J(rows.map((r: any) => [r.shown, r.paid])));
  ok("3.11 · ⭐ the Seal Line before any result: every main awaiting, every reserve standing by — no carry before the record is final",
    rows[0].slots.length === 15 && rows[0].slots.slice(0, 10).every((s: any) => s.mark === "awaiting" && s.carried === null)
      && rows[0].slots.slice(10).every((s: any) => s.mark === "standby" && s.standsInFor === null) && rows[0].slots.every((s: any) => s.pick === "YES"),
    J(rows[0].slots.map((s: any) => s.mark)));
  ok("3.12 · ⛔ nothing on the hub counts picks, the tickets still in, or what a ticket might win",
    !/alive|pickCount|picksSplit|potentialPayout|payoutIfWin/i.test(J(h)));
  const guest = await P.millioneaHub(viewer(null));
  ok("3.13 · a signed-out reader sees the week and its headline, and no 'mine'", guest.week?.id === A.id && guest.week.mine === null && !!guest.week.pool);
  const preview = await P.millioneaHub(viewer(null, "STAFF_PREVIEW"));
  ok("3.14 · at STAFF_PREVIEW a public week is shown but does not sell (a public week sells from ACTIVE)", preview.week?.id === A.id && preview.week.selling === false,
    J(preview.week && { selling: preview.week.selling }));
}

// ── §4 · the slip ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · the slip");
{
  const s = await P.millioneaSlip(viewer(P1));
  ok("4.1 · the slip is the week on sale's fifteen, its price and cap, and the viewer's count", !!s && s.week.id === A.id && s.questions.length === 15
    && s.ticketPrice === price && s.ticketCap === cap && s.held === 3 && s.feeRate === feeRate, J(s && { held: s.held, cap: s.ticketCap }));
  ok("4.2 · the MAIN balance it pays from (bonus never buys a ticket)", s?.balance === (await W.bal(P1)).balance, `${s?.balance}`);
  const until = s?.cancelIfBoughtNow ? Date.parse(s.cancelIfBoughtNow) : NaN;
  ok("4.3 · a ticket bought now carries its free cancel: ahead, and inside the grace (RULES §2.6)", until > Date.now() && until <= Date.now() + feesA.freeExitGraceMinutes * 60_000 + 5_000,
    s?.cancelIfBoughtNow ?? "none");
  ok("4.4 · ⛔ no jackpot, pool or payout figure on the slip, and nothing refuses this viewer", !/jackpot|pool|potentialPayout|payoutIfWin/i.test(J(s)) && s?.refusal === null, J(Object.keys(s ?? {})));
  const staff = await W.user({ balance: 50_000, role: "ADMIN" });
  ok("4.5 · a staff viewer meets the staff refusal before filling fifteen picks", (await P.millioneaSlip(viewer(staff)))?.refusal === "millionea_staff_barred");
  ok("4.6 · at STAFF_PREVIEW a public week's slip says Millionea is not available yet", (await P.millioneaSlip(viewer(null, "STAFF_PREVIEW")))?.refusal === "millionea_not_available");
  const full = await W.user({ balance: 100_000 });
  const fb = await W.buy(full, A.id, Array.from({ length: cap }, () => W.LOSE), { key: "player-full-a-0001" });
  ok("4.7 · a viewer holding the cap meets the cap before filling the slip", fb.ok && (await P.millioneaSlip(viewer(full)))?.refusal === "millionea_cap_reached", why(fb));
  const pause: any = await import("../../src/lib/server/maswali-pause.ts");
  await pause.pauseMaswaliSales({ officerId: "usr_mln_compliance", reason: "player suite pause check" });
  const paused = await P.millioneaSlip(viewer(P1));
  const pausedHub = await P.millioneaHub(viewer(P1));
  await pause.resumeMaswaliSales({ officerId: "usr_mln_compliance", note: "player suite resumes" });
  ok("4.8 · a pause reaches the slip as its reason and the hub as a flag — ⛔ never the officer's own words",
    paused?.refusal === "millionea_paused" && pausedHub.paused === true && pausedHub.week?.selling === false && !J(pausedHub).includes("player suite pause check"),
    J({ refusal: paused?.refusal, paused: pausedHub.paused }));
  const guest = await P.millioneaSlip(viewer(null));
  ok("4.9 · a signed-out reader gets the slip with no count and no balance", guest?.held === null && guest.balance === null && guest.refusal === null);
}

// ── §5 · the acts ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§5 · the acts: buy and the free cancel");
const { week: D } = await W.openWeek({ weeksAhead: 2, visibility: "DRIVE" });
const P2 = await W.user({ balance: 50_000 });
const buyForm = (o: Record<string, unknown> = {}) =>
  form({ expectedOwnerId: P2, weekId: A.id, idempotencyKey: "act-p2-a-0001", slips: J([W.WIN, W.LOSE]), ...o });
let p2Serials: string[] = [];
{
  const before = (await W.bal(P2)).balance;
  const changed = seen(await ACT.buyMillioneaFromForm(P2, buyForm({ expectedOwnerId: P1 }), ACTIVE));
  const missing = seen(await ACT.buyMillioneaFromForm(P2, form({ weekId: A.id, idempotencyKey: "act-p2-a-0009", slips: J([W.WIN]) }), ACTIVE));
  ok("5.1 · ⛔ a page drawn for another account never debits this one (and a form naming none is refused too)",
    !changed.ok && changed.reason === "signin_required" && !missing.ok && missing.reason === "signin_required", `${why(changed)} · ${why(missing)}`);
  const hidden = seen(await ACT.buyMillioneaFromForm(P2, buyForm(), at("WITHDRAWN")));
  ok("5.2 · ⛔ a hidden product's action answers as the route does: not available", !hidden.ok && hidden.reason === "millionea_not_available", why(hidden));
  const noKey = seen(await ACT.buyMillioneaFromForm(P2, buyForm({ idempotencyKey: null }), ACTIVE));
  const shortKey = seen(await ACT.buyMillioneaFromForm(P2, buyForm({ idempotencyKey: "short" }), ACTIVE));
  const hashKey = seen(await ACT.buyMillioneaFromForm(P2, buyForm({ idempotencyKey: "act-p2#0-forged" }), ACTIVE));
  const houseKey = seen(await ACT.buyMillioneaFromForm(P2, buyForm({ idempotencyKey: "hb:intent-forged" }), ACTIVE));
  ok("5.3 · ⛔ one request id per submit: none, a malformed one or one carrying '#' is refused; a house key is reserved",
    noKey.reason === "unknown_failure" && shortKey.reason === "unknown_failure" && hashKey.reason === "unknown_failure" && houseKey.reason === "idempotency_key_conflict",
    J([noKey.reason, shortKey.reason, hashKey.reason, houseKey.reason]));
  const bad = await Promise.all([
    ACT.buyMillioneaFromForm(P2, buyForm({ slips: J([W.WIN.slice(0, 14)]) }), ACTIVE),
    ACT.buyMillioneaFromForm(P2, buyForm({ slips: J([[...W.WIN.slice(0, 14), "MAYBE"]]) }), ACTIVE),
    ACT.buyMillioneaFromForm(P2, buyForm({ slips: "not json" }), ACTIVE),
    ACT.buyMillioneaFromForm(P2, buyForm({ slips: "[]" }), ACTIVE),
    ACT.buyMillioneaFromForm(P2, buyForm({ slips: J({ 0: W.WIN }) }), ACTIVE),
  ]);
  bad.forEach(seen);
  ok("5.4 · ⛔ the slip is validated on the server: fourteen answers, a 'MAYBE', no JSON, no slip, not a list — each refused as incomplete",
    bad.every((r: any) => !r.ok && r.reason === "millionea_picks_incomplete"), J(bad.map((r: any) => r.reason)));
  const over = seen(await ACT.buyMillioneaFromForm(P2, buyForm({ slips: J(Array.from({ length: cap + 1 }, () => W.LOSE)) }), ACTIVE));
  ok("5.5 · ⛔ more slips than the week's frozen cap are refused before the money path, naming the cap", !over.ok && over.reason === "millionea_cap_reached" && over.detail?.ticketCap === cap, why(over));
  const unknown = seen(await ACT.buyMillioneaFromForm(P2, buyForm({ weekId: "mlw_not_a_week" }), ACTIVE));
  const drive = seen(await ACT.buyMillioneaFromForm(P2, buyForm({ weekId: D.id }), ACTIVE));
  ok("5.6 · ⛔ only a week of the line this rollout sells: an unknown week, and a private drive week at ACTIVE (OD-21), are not open",
    !unknown.ok && unknown.reason === "millionea_week_not_open" && !drive.ok && drive.reason === "millionea_week_not_open", `${why(unknown)} · ${why(drive)}`);
  const previewPlayer = seen(await ACT.buyMillioneaFromForm(P2, buyForm({ weekId: D.id }), at("STAFF_PREVIEW")));
  ok("5.7 · ⛔ at STAFF_PREVIEW a player without a pass cannot reach the drive week's action either", !previewPlayer.ok && previewPlayer.reason === "millionea_not_available", why(previewPlayer));
  ok("5.8 · …and none of 5.1–5.7 moved a shilling or wrote a ticket", (await W.bal(P2)).balance === before && (await dal.ticketStore.listForUser(P2)).length === 0);

  const good = await ACT.buyMillioneaFromForm(P2, buyForm(), ACTIVE);
  p2Serials = good.ok ? good.data.tickets.map((t: any) => t.serial) : [];
  const after = (await W.bal(P2)).balance;
  ok("5.9 · ⭐ a good submit buys every slip: two serials, the week, the balance after the purchase committed, not a replay",
    good.ok && good.data.weekId === A.id && good.data.weekCode === A.code && good.data.tickets.length === 2 && p2Serials.every((s) => SERIAL.test(s))
      && good.data.balance === after && after === before - 2 * price && good.data.replayed === false, why(good));
  ok("5.10 · the receipt carries the free cancel's end ('Ghairi hadi …') and no figure a ticket might win",
    good.ok && Date.parse(good.data.cancelUntil) > Date.now() && !/payoutIfWin|potentialPayout|jackpot/i.test(J(good.data)), J(good.ok && good.data));
  const again = await ACT.buyMillioneaFromForm(P2, buyForm(), ACTIVE);
  ok("5.11 · the same request id again is the same purchase: its receipt, replayed, nothing charged twice",
    again.ok && again.data.replayed === true && J(again.data.tickets) === J(good.data.tickets) && (await W.bal(P2)).balance === after, why(again));
  const other = seen(await ACT.buyMillioneaFromForm(P2, buyForm({ slips: J([W.LOSE, W.LOSE]) }), ACTIVE));
  ok("5.12 · ⛔ the same request id with other picks is a conflict, never the old receipt (MB-51)", !other.ok && other.reason === "idempotency_key_conflict", why(other));

  // ── the free cancel
  const cform = (serial: unknown) => form({ serial });
  const stranger = await W.user({ balance: 10_000 });
  const p1Serial = (await dal.ticketStore.listForUser(P1, { cycleId: A.id }))[0].serial;
  const garbage = seen(await ACT.cancelMillioneaFromForm(P2, cform("../../etc"), ACTIVE));
  const madeUp = seen(await ACT.cancelMillioneaFromForm(P2, cform(`${A.code}-999999`), ACTIVE));
  const theirs = seen(await ACT.cancelMillioneaFromForm(stranger, cform(p1Serial), ACTIVE));
  ok("5.13 · ⛔ a malformed serial, a serial nobody holds and another player's serial answer exactly alike (MB-95)",
    [garbage, madeUp, theirs].every((r: any) => !r.ok && r.reason === "not_found") && J({ ...madeUp }) === J({ ...theirs }), J([garbage, madeUp, theirs].map(why)));
  const poolBefore = (await P.maswaliPoolFigure(A.id)).sales;
  const c = await ACT.cancelMillioneaFromForm(P2, cform(p2Serials[0].toLowerCase()), ACTIVE);
  ok("5.14 · ⭐ the owner's own ticket, inside its window, is cancelled in full — the serial read case-blind", c.ok && c.data.serial === p2Serials[0]
    && c.data.refunded === price && c.data.balance === after + price && (await W.bal(P2)).balance === after + price, why(c));
  ok("5.15 · …the ticket is CANCELLED and the headline's sales went down by a ticket (MR-28)",
    (await dal.ticketStore.getBySerial(p2Serials[0])).status === "CANCELLED" && (await P.maswaliPoolFigure(A.id)).sales === poolBefore - price);
  const twice = seen(await ACT.cancelMillioneaFromForm(P2, cform(p2Serials[0]), ACTIVE));
  ok("5.16 · ⛔ a ticket is cancelled once", !twice.ok && twice.reason === "position_not_open" && (await W.bal(P2)).balance === after + price, why(twice));
  const late = await ACT.buyMillioneaFromForm(P2, buyForm({ idempotencyKey: "act-p2-a-0002", slips: J([W.LOSE]) }), ACTIVE);
  const lateSerial = late.ok ? late.data.tickets[0].serial : "";
  await W.backdate(late.ok ? late.data.tickets[0].positionId : "", 60 * 60_000);
  const shut = seen(await ACT.cancelMillioneaFromForm(P2, cform(lateSerial), ACTIVE));
  ok("5.17 · ⛔ past its free window a ticket rides to the result — and there is no paid exit (MB-50)",
    late.ok && !shut.ok && shut.reason === "exit_window_closed" && (await dal.ticketStore.getBySerial(lateSerial)).status === "LIVE", why(shut));
  const hiddenCancel = seen(await ACT.cancelMillioneaFromForm(P2, cform(p2Serials[1]), at("WITHDRAWN")));
  ok("5.18 · ⛔ a hidden product's cancel answers not available, and the ticket stands", !hiddenCancel.ok && hiddenCancel.reason === "millionea_not_available"
    && (await dal.ticketStore.getBySerial(p2Serials[1])).status === "LIVE", why(hiddenCancel));
  ok("5.19 · ⭐ THE PLATFORM'S FAILURE SHAPE: every refusal in §5 carries a registered reason, so a screen renders its copy, never the server's sentence",
    refusals.length >= 20 && refusals.every((r: any) => typeof r.reason === "string" && !!REASONS[r.reason]), J(refusals.filter((r: any) => !REASONS[r.reason]).map(why)));
}

// ── §6 · the viewer's tickets ─────────────────────────────────────────────────────────────────────────────────────
console.log("\n§6 · the viewer's tickets");
const p1Tickets = (await dal.ticketStore.listForUser(P1, { cycleId: A.id })).sort((a: any, b: any) => a.serial.localeCompare(b.serial));
const [p1Win1, p1Win2, p1Lose] = p1Tickets;
{
  const list = await P.millioneaMyTickets(P1);
  ok("6.1 · Tiketi zangu, Millionea: the week first, its three tickets in sale order, each with its fifteen sockets",
    list.length === 1 && list[0].week.id === A.id && list[0].tickets.map((t: any) => t.serial).join() === p1Tickets.map((t: any) => t.serial).join()
      && list[0].tickets.every((t: any) => t.slots.length === 15 && t.shown === "running"), J(list.map((w: any) => w.week.code)));
  const v = await P.millioneaTicket(P1, p1Win1.serial);
  ok("6.2 · ⭐ one ticket for its owner: its picks, its stub and salt (shown to the owner only, MB-32), its anchor id",
    !!v && v.serial === p1Win1.serial && v.positionId === p1Win1.positionId && v.stub.salt === p1Win1.salt && v.stub.selectionsHash === p1Win1.selectionsHash
      && v.stub.price === price && v.slots.every((s: any) => s.pick === p1Win1.selections[s.slot - 1]), J(v && { serial: v.serial }));
  ok("6.3 · a held ticket's page: its free cancel open, no result, no win ledger, no loss line, ⛔ no jackpot or pool figure",
    !!v && Date.parse(v.cancelUntil) > Date.now() && v.win === null && v.loss === null && v.weekVoid === null && v.cannotWinSoFar === false && !/jackpot|"pool"/i.test(J(v)), J(v && { cancelUntil: v.cancelUntil }));
  ok("6.4 · the facts so far: the cut alone, unseen — one fact performs; a backlog does not rest yet",
    !!v && v.seen.lastViewedAt === null && J(v.seen.unseen.map((f: any) => f.kind)) === J(["cut"]) && v.seen.backlogRests === false, J(v?.seen));
  const stranger = await W.user({ balance: 0 });
  const nulls = await Promise.all([
    P.millioneaTicket(stranger, p1Win1.serial), P.millioneaTicket(P1, "not-a-serial"), P.millioneaTicket(P1, `${A.code}-999999`), P.millioneaTicket(P1, ""),
  ]);
  ok("6.5 · ⛔ a stranger's serial, a malformed one, one nobody holds and an empty one all answer null — the route's same 404", nulls.every((x: any) => x === null), J(nulls.map((x: any) => x === null)));
  ok("6.6 · the serial is read case-blind for its owner", (await P.millioneaTicket(P1, p1Win1.serial.toLowerCase()))?.serial === p1Win1.serial);
  const closure = await P.millioneaClosureTickets(P1);
  ok("6.7 · ⭐ the account-closure screen lists the account's open tickets (MB-44)", closure.length === 3 && closure.every((t: any) => t.weekCode === A.code && t.shown === "running" && !t.heldForReview),
    J(closure));
  const p2Closure = await P.millioneaClosureTickets(P2);
  ok("6.8 · …and never a cancelled one", p2Closure.length === 2 && !p2Closure.some((t: any) => t.serial === p2Serials[0]), J(p2Closure.map((t: any) => t.serial)));
}

// ── §7 · the live frame, then the carry pending ───────────────────────────────────────────────────────────────────
console.log("\n§7 · the live frame (maswali:pool), and the carry pending on an earlier week");
{
  const frames: any[] = [];
  const stop = BUS.subscribe("maswali:pool", (d: any) => frames.push(d));
  await FEED.__flushPoolFramesForTests();
  frames.length = 0;
  const P5 = await W.user({ balance: 20_000 });
  const b = await W.buy(P5, A.id, [W.LOSE], { key: "player-p5-a-0001" });
  ok("7.1 · a sale arms one frame for its week (coalesced: it fires once for the burst)", b.ok && FEED.__pendingPoolFrames().includes(A.id), J(FEED.__pendingPoolFrames()));
  await FEED.__flushPoolFramesForTests();
  const frame = frames.find((f) => f.weekId === A.id);
  ok("7.2 · ⭐ the frame is the figure derived on the server at its moment — the same as the hub's — never a stored one",
    !!frame && J(frame) === J(await P.maswaliPoolFigure(A.id)), J(frame));
  ok("7.3 · ⛔ the frame carries public figures only: no ticket, pick, holder or count of who is still in",
    !!frame && Object.keys(frame).sort().join(",") === "atLeast,carryIn,carryPendingCode,code,feeRate,floor,jackpot,sales,state,weekId", J(frame && Object.keys(frame)));
  const replay = await W.buy(P5, A.id, [W.LOSE], { key: "player-p5-a-0001" });
  ok("7.4 · a replay moved nothing, so it arms nothing", replay.ok && replay.data.replayed === true && !FEED.__pendingPoolFrames().includes(A.id), J(FEED.__pendingPoolFrames()));
  const p5Serial = b.ok ? b.data.maswali.tickets[0].serial : "";
  const c = await ACT.cancelMillioneaFromForm(P5, form({ serial: p5Serial }), ACTIVE);
  await sleep(100);
  ok("7.5 · a free cancel arms a frame too, once its money has committed", c.ok && FEED.__pendingPoolFrames().includes(A.id), `${why(c)} · ${J(FEED.__pendingPoolFrames())}`);
  await FEED.__flushPoolFramesForTests();
  stop();
  const sse = readFileSync("src/app/api/events/route.ts", "utf8");
  const allEvents = /const ALL_EVENTS: SseEventType\[\] = \[([^\]]*)\]/.exec(sse)?.[1] ?? "";
  ok("7.6 · /api/events forwards a frame only to a viewer the rollout admits — ⛔ kept out of the broadcast list",
    /subscribe\("maswali:pool"/.test(sse) && /resolveMillioneaFor\(\{ sessionUserId: userId \}\)[\s\S]{0,80}if \(m\.visible\) send\(/.test(sse)
      && allEvents.length > 0 && !allEvents.includes("maswali:pool"), allEvents.replace(/\s+/g, " "));
  const bus = readFileSync("src/lib/server/event-bus.ts", "utf8");
  const hook = readFileSync("src/lib/use-event-stream.ts", "utf8");
  ok("7.7 · the bus types it and accepts it off the Redis wire; the browser bridge names its window event",
    /"maswali:pool":\s+MaswaliPoolFigure;/.test(bus) && /KNOWN_EVENTS[\s\S]*"maswali:pool",\s*\]\);/.test(bus) && /"maswali:pool":\s+"50pick:sse:maswali-pool",/.test(hook));
}
const closeA = new Date(Date.parse(A.closesAt) + 60_000);
const closedA = await W.svc.closeWeek({ weekId: A.id, now: closeA });
const { week: B, start: bStart } = await W.openWeek({ weeksAhead: 3 });
{
  const f = await P.maswaliPoolFigure(B.id);
  ok("7.8 · ⭐ while week N is unsettled, N+1's carry is pending ON N: the figure says so and is a lower bound (§M8a item 9)",
    closedA.ok && !!f && f.carryIn === null && f.carryPendingCode === A.code && f.atLeast === true && f.jackpot === Math.max(floor, f.sales), J(f));
  const h = await P.millioneaHub(viewer(P1));
  ok("7.9 · the hub leads with the week on sale and shows the week still being graded beside it (MR-3)",
    h.week?.id === B.id && h.grading?.id === A.id && h.grading.selling === false && h.grading.mine.held === 3, J({ week: h.week?.code, grading: h.grading?.code }));
}

// ── §8 · a settled week ───────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§8 · a settled week: the win ledger, the loss line, the register, the seen state, the notices");
const objectionsDone = await W.closeAndSeal(A, aStart);
{
  const lose = await P.millioneaTicket(P1, p1Lose.serial);
  const win = await P.millioneaTicket(P1, p1Win1.serial);
  ok("8.1 · every result out, the record final: the mains matched or missed, the unused reserves closed — still no carry and no score",
    lose.resultsOut === 15 && lose.slots[0].mark === "missed" && lose.slots.slice(1, 10).every((s: any) => s.mark === "matched")
      && lose.slots.slice(10).every((s: any) => s.mark === "unused") && !("score" in lose), J(lose.slots.map((s: any) => s.mark)));
  ok("8.2 · 'on the results so far this ticket cannot win' — provisional, for the missed ticket only, while the week is graded",
    lose.shown === "running" && lose.cannotWinSoFar === true && win.cannotWinSoFar === false, J({ lose: lose.cannotWinSoFar, win: win.cannotWinSoFar }));
}
const salesA = (await P.maswaliPoolFigure(A.id)).sales;
const releasedA = await W.release(A.id, objectionsDone);
const expectA = settleArithmetic({ rolloverIn: 0, sales: salesA, winners: 2, floor, feeRate, rates });
ok("8.3 · the week settled: two tickets of ten of ten", releasedA.ok && (await dal.weekStore.get(A.id)).state === "SETTLED" && expectA.kind === "PAYOUT", why(releasedA));
{
  const v = await P.millioneaTicket(P1, p1Win1.serial);
  ok("8.4 · ⭐ a won ticket: the word, and the amount paid — its share, to the shilling", v.shown === "won" && v.paid === expectA.share, `${v.shown} ${v.paid} vs ${expectA.share}`);
  ok("8.5 · ⭐ the win ledger: jackpot, the fee, to the winners, the equal share, ×2 for the viewer's two, the top-up — every figure the settlement's",
    J(v.win) === J({
      jackpot: expectA.J, fee: expectA.F, traLevy: expectA.tra, gbtLevy: expectA.gbt, toWinners: expectA.J - expectA.F, winners: 2, share: expectA.share,
      paid: expectA.paid, remainder: expectA.dust, topUp: expectA.U, yourWinningTickets: 2, yourTotal: 2 * expectA.share, basis: "TEN_OF_TEN", winningScore: 10,
    }), J(v.win));
  const l = await P.millioneaTicket(P1, p1Lose.serial);
  ok("8.6 · ⛔ a ticket that did not win: the week's line only — no score, no amount, no carried figure (§10 3.14, OD-24)",
    l.shown === "lost" && l.paid === null && l.win === null && J(l.loss) === J({ winners: 2, carriedForward: false, nextWeekCode: B.code })
      && !/"score"|carried(Out|Forward)":\s*\d/.test(J(l)), J(l.loss));
  // (The presses carry the week's own seal clock, which the money world runs weeks ahead; the result, the real one.)
  const kinds = v.seen.unseen.map((f: any) => f.kind);
  ok("8.7 · ⭐ a backlog rests: the cut, fifteen presses and the result unseen at once — more than four, so none animates",
    v.seen.unseen.length === 17 && v.seen.backlogRests === true && kinds.filter((k: string) => k === "press").length === 15
      && kinds.includes("cut") && kinds.includes("result"), J(kinds));
  const later = new Date(aStart + 60 * DAY);
  const marked = await ACT.markMillioneaTicketSeenFor(P1, p1Win1.serial, { at: later, ...ACTIVE });
  const after = await P.millioneaTicket(P1, p1Win1.serial);
  ok("8.8 · seen by its owner, every fact rests: nothing unseen, and the backlog no longer matters", marked === true && after.seen.unseen.length === 0
    && after.seen.backlogRests === false && after.seen.lastViewedAt === later.toISOString(), J(after.seen));
  const back = await ACT.markMillioneaTicketSeenFor(P1, p1Win1.serial, { at: new Date(), ...ACTIVE });
  const stranger = await ACT.markMillioneaTicketSeenFor(P2, p1Win2.serial, ACTIVE);
  const hidden = await ACT.markMillioneaTicketSeenFor(P1, p1Win2.serial, at("WITHDRAWN"));
  ok("8.9 · ⛔ the stamp only moves forward; nobody else marks a ticket seen; a hidden product records nothing",
    back === false && stranger === false && hidden === false && (await dal.ticketStore.getBySerial(p1Win2.serial)).lastViewedAt === null, J([back, stranger, hidden]));

  const r = await P.millioneaRegisterWeek(A.code.toLowerCase());
  ok("8.10 · ⭐ the register's week: public, final, every figure the settlement's own (the case of the code does not matter)",
    !!r && r.state === "SETTLED" && r.jackpot === expectA.J && r.fee === expectA.F && r.winners === 2 && r.share === expectA.share && r.topUp === expectA.U
      && r.paid === expectA.paid && r.remainder === expectA.dust && r.carriedForward === expectA.carryOut && r.questionSetHash === A.questionSetHash
      && r.tickets === salesA / price, J(r && { J: r.jackpot, k: r.winners }));
  ok("8.11 · the fifteen with their results, no substitutions in a week with no void, basis 10 of 10, one officer's seals",
    !!r && r.questions.length === 15 && r.questions.every((q: any) => q.outcome === "YES" && !!q.sealedAt) && r.substitutions.length === 0
      && r.basis === "TEN_OF_TEN" && r.winningScore === 10 && r.resolution === "single", J(r && { basis: r.basis, subs: r.substitutions }));
  const graded = salesA / price;
  ok("8.12 · after settlement only: the standing history over the ten counted results, and the anonymised graded table",
    !!r && r.standing.length === 10 && r.standing.at(-1).ticketsWithoutAMiss === 2 && r.scores.length === 11 && r.scores[10] === 2
      && r.scores.reduce((s: number, n: number) => s + n, 0) === graded, J(r && { standing: r.standing.map((s: any) => s.ticketsWithoutAMiss), scores: r.scores }));
  ok("8.13 · ⛔ no names on the register: no account id, phone or display name anywhere in it",
    !!r && !J(r).includes(P1) && !J(r).includes(P2) && !/phoneE164|displayName|userId/.test(J(r)));
  const nulls = await Promise.all([P.millioneaRegisterWeek(B.code), P.millioneaRegisterWeek(D.code), P.millioneaRegisterWeek("MLN-1999-W01"), P.millioneaRegisterWeek("<script>")]);
  ok("8.14 · ⛔ never a week still selling, never a drive week, never a code that is not a week", nulls.every((x: any) => x === null), J(nulls.map((x: any) => x === null)));
  const list = await P.millioneaRegister();
  ok("8.15 · the register's list: the settled week, and only final public weeks", list.length === 1 && list[0].id === A.id && list.every((w: any) => w.state === "SETTLED" || w.state === "VOIDED"),
    J(list.map((w: any) => w.code)));
  const fB = await P.maswaliPoolFigure(B.id);
  ok("8.16 · ⭐ once N settled, N+1's carry is known: what the claim reads (N's remainder), no longer pending",
    fB.carryIn === expectA.carryOut && fB.carryPendingCode === null && fB.atLeast === false && fB.jackpot === Math.max(floor, fB.carryIn + fB.sales), J(fB));

  const notices = await P.millioneaNotices(P1);
  const result = notices.find((n: any) => n.notice === "RESULT");
  ok("8.17 · ⭐ one seal per player per week: the holder's RESULT notice, won, with their two tickets' total (§M8a item 10)",
    J(result) === J({ notice: "RESULT", weekId: A.id, code: A.code, won: true, winningTickets: 2, total: 2 * expectA.share }), J(notices));
  const p2Notice = (await P.millioneaNotices(P2)).find((n: any) => n.notice === "RESULT");
  ok("8.18 · a holder who did not win gets the calm line: no amount", p2Notice?.won === false && p2Notice.total === null && p2Notice.winningTickets === 0, J(p2Notice));
  ok("8.19 · ⛔ a player who held nothing in the week gets no result notice", !(await P.millioneaNotices(await W.user({ balance: 0 }))).some((n: any) => n.notice === "RESULT"));
  const m1 = await ACT.markMillioneaNoticeSeenFor(P1, A.id, "RESULT", ACTIVE);
  const m2 = await ACT.markMillioneaNoticeSeenFor(P1, A.id, "RESULT", ACTIVE);
  const odd = await ACT.markMillioneaNoticeSeenFor(P1, A.id, "SOMETHING_ELSE", ACTIVE);
  const noWeek = await ACT.markMillioneaNoticeSeenFor(P1, "mlw_not_a_week", "RESULT", ACTIVE);
  ok("8.20 · ⭐ seen once, it rests: the first mark records, the second does not (first seen wins); an unknown notice or week records nothing",
    m1 === true && m2 === false && odd === false && noWeek === false && !(await P.millioneaNotices(P1)).some((n: any) => n.notice === "RESULT"), J([m1, m2, odd, noWeek]));
  const h = await P.millioneaHub(viewer(P1));
  ok("8.21 · the hub: the week on sale, and the settled week as its 'last week' row", h.week?.id === B.id && h.grading === null && h.lastWeek?.id === A.id
    && h.lastWeek.winners === 2 && h.lastWeek.share === expectA.share, J(h.lastWeek));
  ok("8.22 · MB-90 · /results' Millionea section is the register's latest final weeks", J(await P.millioneaResultsSection(4)) === J(list.slice(0, 4)));
}

// ── §9 · a week nobody won ────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§9 · a week nobody won: the rollover");
const P3 = await W.user({ balance: 20_000 });
const b3 = await W.buy(P3, B.id, [W.LOSE, W.LOSE], { key: "player-p3-b-0001" });
const salesB = (await P.maswaliPoolFigure(B.id)).sales;
const carryB = (await P.maswaliPoolFigure(B.id)).carryIn;
const releasedB = await W.release(B.id, await W.closeAndSeal(B, bStart));
ok("9.1 · the week settled with no ten of ten", b3.ok && releasedB.ok && (await dal.weekStore.get(B.id)).winningTickets === 0, `${why(b3)} · ${why(releasedB)}`);
{
  const r = (await P.millioneaRegister()).find((w: any) => w.id === B.id);
  ok("9.2 · ⭐ the register states what was carried to the next week: R + S, the whole pool, and no fee (MR-21, MR-28)",
    !!r && r.winners === 0 && r.jackpot === null && r.fee === 0 && r.carriedForward === carryB + salesB, J(r));
  const roll = (await P.millioneaNotices(P1)).find((n: any) => n.notice === "ROLLOVER");
  ok("9.3 · the hub's rollover notice, past tense, to every reader once (M7): the week, the amount, no next week opened yet",
    J(roll) === J({ notice: "ROLLOVER", weekId: B.id, code: B.code, carriedForward: carryB + salesB, nextWeekCode: null }), J(roll));
  const v = await P.millioneaTicket(P3, b3.data.maswali.tickets[0].serial);
  ok("9.4 · ⛔ the losing ticket says the pool was carried, never how much (OD-24: the figure lives on the public week page)",
    v.shown === "lost" && J(v.loss) === J({ winners: 0, carriedForward: true, nextWeekCode: null }) && v.win === null && v.paid === null
      && !("carriedOut" in v) && !("jackpot" in v), J(v.loss));
  await ACT.markMillioneaNoticeSeenFor(P1, B.id, "ROLLOVER", ACTIVE);
  ok("9.5 · seen, the rollover notice rests for that reader", !(await P.millioneaNotices(P1)).some((n: any) => n.notice === "ROLLOVER")
    && (await P.millioneaNotices(P3)).some((n: any) => n.notice === "ROLLOVER"));
  const h = await P.millioneaHub(viewer(P1));
  ok("9.6 · with no public week on sale, the hub states when the next one opens by the template — and has no pre-sale (MB-84)",
    h.week === null && typeof h.nextOpensAt === "string" && Date.parse(h.nextOpensAt) > Date.now() && h.lastWeek?.id === B.id, J({ next: h.nextOpensAt }));
}

// ── §10 · a week voided whole ─────────────────────────────────────────────────────────────────────────────────────
console.log("\n§10 · a week voided whole");
const { week: V, start: vStart } = await W.openWeek({ weeksAhead: 4 });
const P4 = await W.user({ balance: 20_000 });
const b4 = await W.buy(P4, V.id, [W.WIN, W.LOSE], { key: "player-p4-v-0001" });
await W.svc.closeWeek({ weekId: V.id, now: new Date(Date.parse(V.closesAt) + 60_000) });
for (let slot = 1; slot <= 15; slot++) {
  await W.svc.sealQuestion({ weekId: V.id, slot, outcome: "VOID", voidReason: "not_played", evidence: `Event ${slot} was not played at all`, officerId: SEALER, now: new Date(vStart + 9 * DAY) });
}
const voided = await W.svc.voidWeek({ weekId: V.id, now: new Date(Date.parse((await dal.weekStore.get(V.id)).objectionsCloseAt) + 60_000) });
ok("10.1 · the week voided whole (MR-18)", b4.ok && voided.ok && voided.week.state === "VOIDED", voided.ok ? voided.week.state : voided.error);
{
  const v = await P.millioneaTicket(P4, b4.data.maswali.tickets[0].serial);
  ok("10.2 · ⭐ the ticket reads refunded, with why and when THIS refund landed — never a refund claimed before it happened",
    v.shown === "refunded" && v.weekVoid.voidedMains === 10 && v.weekVoid.usableReserves === 0 && v.weekVoid.refunded === price && !!v.weekVoid.refundedAt
      && v.seen.unseen.some((f: any) => f.kind === "refund") && v.win === null && v.loss === null, J(v.weekVoid));
  const n = (await P.millioneaNotices(P4)).find((x: any) => x.notice === "WEEK_VOID");
  ok("10.3 · the holder's week-void notice: the tickets and the whole price back", J(n) === J({ notice: "WEEK_VOID", weekId: V.id, code: V.code, tickets: 2, refunded: 2 * price }), J(n));
  const r = (await P.millioneaRegister()).find((w: any) => w.id === V.id);
  ok("10.4 · the register lists the voided week with no money figures: the carry is untouched and waits for the next week",
    !!r && r.state === "VOIDED" && r.carriedForward === null && r.jackpot === null && r.winners === null, J(r));
  ok("10.5 · ⛔ the closure screen does not list a refunded ticket (its money is back)", (await P.millioneaClosureTickets(P4)).length === 0);
}

// ── §11 · the exclusions, the wiring, the floor ───────────────────────────────────────────────────────────────────
console.log("\n§11 · the exclusions, the wiring, the floor");
{
  const ticketsOfP1 = await market.listPositionsForUser(P1, 200, "MASWALI");
  ok("11.1 · the per-row read the leaderboard subtracts names exactly the account's ticket positions (both stores)",
    ticketsOfP1.length === 3 && ticketsOfP1.every((p: any) => p1Tickets.some((t: any) => t.positionId === p.id)), J(ticketsOfP1.map((p: any) => p.id)));
  const board = readFileSync("src/app/leaderboard/page.tsx", "utf8");
  ok("11.2 · the leaderboard's streak and sparkline walk the row's positions with its tickets removed on the 'all' lens",
    /tickets: leaderProduct\(state\) === "ALL"\s*\?\s*await Promise\.resolve\(listPositionsForUser\(r\.userId, 200, "MASWALI"\)\)/.test(board)
      && /for \(const p of positions\.filter\(\(p\) => p\.status !== "OPEN"\)\)/.test(board) && /spark: dailyStakes\(positions, 14\)/.test(board));
  const { computeAchievementShelf }: any = await import("../../src/lib/server/achievements.ts");
  const shelf = await computeAchievementShelf(P1);
  const state = (id: string) => shelf.find((b: any) => b.achievement === id)?.state;
  ok("11.3 · ⭐ achievements: two jackpot shares are not a 'First Win' and three tickets are not a 'First Prediction' (MB-90)",
    state("first-win") === "locked" && state("first-prediction") === "locked", J(shelf.map((b: any) => [b.achievement, b.state])));
  const P6 = await W.user({ balance: 50_000 });
  const poll = await W.w.poll({ graceMin: 5 });
  const bet = await market.buyPosition(P6, { marketId: poll.id, side: "YES", stake: 1_000 });
  const shelf6 = await computeAchievementShelf(P6);
  ok("11.4 · …while a Yes/No bet still is a first prediction (the control)", bet.ok && shelf6.find((b: any) => b.achievement === "first-prediction")?.state === "unlocked", why(bet));

  ok("11.5 · surfaces: the slip and a ticket carry a money control (COMMIT_ROUTE); the hub, the list and How do not",
    SURF.isCommitSurface("/millionea/slip") && SURF.isCommitSurface(`/millionea/tickets/${A.code}-000001`)
      && !SURF.isCommitSurface("/millionea/tickets") && !SURF.isCommitSurface("/millionea") && !SURF.isCommitSurface("/millionea/how"));
  ok("11.6 · ⛔ the slip is NOT a money surface (the recorded decision: MONEY_ROUTE is pinned and hides the Needle platform-wide)",
    !SURF.isMoneySurface("/millionea/slip") && !SURF.isMoneySurface("/millionea"));
  ok("11.7 · the journey's own Millionea pages (JOURNEY_ROUTE): the hub, the slip, Tiketi zangu and a ticket — not How, not the register",
    ["/millionea", "/millionea/slip", "/millionea/tickets", `/millionea/tickets/${A.code}-000001`].every((p) => SURF.isJourneySurface(p))
      && !["/millionea/how", "/millionea/register", `/millionea/register/${A.code}`, "/millionea/slip/x", "/millioneax"].some((p) => SURF.isJourneySurface(p)));
  const link = positionPermalink({ positionId: "pos_x", productLine: "MASWALI", marketId: "mkt_x", ticketSerial: `${A.code}-000417` });
  const list = positionPermalink({ positionId: "pos_x", productLine: "MASWALI", marketId: "mkt_x" });
  ok("11.8 · ⭐ the position permalink lands a ticket on its own page by serial; without one it says it fell back to the list",
    link.href === `/millionea/tickets/${A.code}-000417#pos_x` && link.surface === "millionea-ticket" && link.isFallback === false
      && list.href === "/millionea/tickets#pos_x" && list.isFallback === true && millioneaTicketHref("a b") === "/millionea/tickets/a%20b", J({ link, list }));
  ok("11.9 · the line a viewer is shown: the drive at STAFF_PREVIEW while it sells, the public line otherwise",
    (await P.millioneaLineFor("STAFF_PREVIEW")) === "DRIVE" && (await P.millioneaLineFor("ACTIVE")) === "PUBLIC"
      && (await P.millioneaHub(viewer(null, "STAFF_PREVIEW"))).week?.id === D.id);

  // ── the floor (MB-56), with ONE FIXTURE OF A FAULT: the guarantee drained below its requirement by the return
  // ceremony's own ledger lines, its requirement check skipped — the state no product door can reach, made to prove the
  // headline fails closed in it.
  const fD = await P.maswaliPoolFigure(D.id);
  ok("11.10 · the drive week's headline: its own jackpot (OD-21), the floor shown while the guarantee covers every unsettled week",
    !!fD && fD.floor === floor && fD.jackpot === Math.max(floor, (fD.carryIn ?? 0) + fD.sales) && fD.atLeast === false, J(fD));
  const held = await W.balanceOf(acct.maswaliGuarantee);
  const unsettled = await dal.weekStore.list({ states: ["OPEN", "CLOSED", "RESOLVING"] });
  const need = guaranteeRequirement(unsettled.map((w: any) => ({ floor: W.svc.frozenRules(w)?.floorTzs ?? 0, confirmedCarryIn: w.rolloverIn })));
  const drain = held - (need - 1);
  await withLock("maswali:chain", () => ledger.withMoneyTx(async (tx: any) => money.postMaswaliLines("maswali_test_drain_player",
    ledger.maswaliGuaranteeReturnEntries({ amount: drain, reference: "TEST-FAULT-DRAIN", actorId: "usr_mln_owner" }), tx)));
  const short = await P.maswaliPoolFigure(D.id);
  ok("11.11 · ⛔ a guarantee short of its requirement shows no floor: the headline falls to R + S (MB-56, fail closed)",
    (await W.balanceOf(acct.maswaliGuarantee)) === need - 1 && !!short && short.floor === null && short.jackpot === (short.carryIn ?? 0) + short.sales, J(short));
  const refund = await money.fundMaswaliGuarantee({ amount: drain, reference: "TEST-FAULT-REFILL", typed: money.GUARANTEE_FUND_WORD, ownerId: "usr_mln_owner" });
  ok("11.12 · …and funded again, the floor returns", refund.ok && (await P.maswaliPoolFigure(D.id))?.floor === floor, why(refund));
}

// ── a held share reaches the closure screen (last: it holds the winner's wallet) ─────────────────────────────────
{
  const hold = await W.settle.holdMaswaliShare({ ticketId: p1Win1.id, officerId: "usr_mln_compliance", reason: "player suite review of a share" });
  const closure = await P.millioneaClosureTickets(P1);
  ok("11.13 · ⭐ the closure screen lists a winning share held for review — money the account still has riding (MB-44)",
    hold.ok && closure.length === 1 && closure[0].serial === p1Win1.serial && closure[0].heldForReview === true && closure[0].shown === "won", J(closure));
}

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
