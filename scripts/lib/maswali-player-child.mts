/**
 * test:maswali-player — WHAT A PLAYER SEES AND WHAT A PLAYER DOES, ON BOTH STORES (MASWALI-BUILD S5; MASWALI-PLAN §7b S5
 * items 1, 2, 4–10; the S5 review's second round, M1–M3 and L1–L8).
 *
 *   npx tsx scripts/maswali-player.test.mts     (npm run test:maswali-player)
 *
 *   §1 the gate: WITHDRAWN nobody · STAFF_PREVIEW staff and pass holders · ACTIVE everyone; the route's 404
 *   §2 how to play: the frozen rules (the coming week's before any opens) and the worked examples, at every allowed floor
 *   §3 the hub: the week, the headline (DESIGN_AUTHORITY §M8a item 9), the price, the viewer's own count and cap
 *   §4 the slip: fifteen questions, no figure a ticket might win, the refusal it would meet
 *   §5 the acts: buy (one request id per submit, the slip validated on the server) and the free cancel — at every rollout
 *      state (L5); every refusal a registered reason
 *   §6 the viewer's tickets: the list, one by serial (owner only; a stranger's serial answers as a missing one), the
 *      closure screen
 *   §7 the live frame (`maswali:pool`, coalesced) and its audience, driven through the route's own forwarding (M1, L8);
 *      the seen mark through the rendered instant (L7); then the carry pending on an earlier week
 *   §8 a settled week: the win ledger, the loss line (no score, no amount), the register, the seen state, the notices
 *   §9 a week nobody won: the rollover notice and the carried figure
 *   §10 a week voided whole: its refunds held at the void's own lock — pending everywhere — then landed (M3)
 *   §11 the exclusions (the board's scored positions, achievements), the wiring (surfaces, the permalink), the floor, the
 *      seen marks' rate limit (L7)
 *   §12 a won share as Compliance leaves it: held, forfeited, released (M2)
 *   §12b the re-review (RR1–RR8): weeks in CALENDAR order, never the drafting order (R3.1's own fixture: the later week
 *      drafted first); the register and Tiketi zangu paged with a total; a forfeited or held share is not `won`; the seen
 *      mark forward-only, at every rollout state, and never throwing; the cancel's own session check
 *   §13 by state, never newest-N (L1); the floor fails closed on unreadable rules (L3); the hub while Millionea ends (L2)
 *   §14 the final week (RR2): a miss is not "cannot win" there — and released, the top score wins
 *
 * ⏱ The weeks are the money world's: two and more weeks ahead, opened, closed and sealed on their own clocks; money reads
 * the real clock. ⛔ Every week and ticket goes through the product's own doors. The two FIXTURES OF A FAULT — §11's
 * guarantee drained below its requirement and §13's frozen rules re-stamped as a version this build cannot read — are
 * labelled where they are made, and undone there. §10's pending refunds are no fault: the void is held at its own lock.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-player-session-secret-0123456789abcdef";

const { loadMaswaliWorld, SEALER, DRAFTER, READER, OWNER } = await import("./maswali-money-world.mts");
const W: any = await loadMaswaliWorld();
const { svc: market } = W.w;
const { dal, money, ledger, acct } = W;
const P: any = await import("../../src/lib/server/maswali-player.ts");
const CACHE: any = await import("../../src/lib/server/maswali-register-cache.ts");
const ACT: any = await import("../../src/lib/server/maswali-player-acts.ts");
const FEED: any = await import("../../src/lib/server/maswali-pool-feed.ts");
const BUS: any = await import("../../src/lib/server/event-bus.ts");
const PREVIEW: any = await import("../../src/lib/server/millionea-preview.ts");
const { resolveMillioneaFor } = PREVIEW;
const SURF: any = await import("../../src/lib/surfaces.ts");
const { positionPermalink, millioneaTicketHref }: any = await import("../../src/lib/position-permalink.ts");
const { REASONS }: any = await import("../../src/lib/failure-reasons.ts");
const { RATE_RULES }: any = await import("../../src/lib/server/rate-limit.ts");
const { scoredPositions, SCORED_LINES }: any = await import("../../src/lib/leaderboard/board.ts");
const LABEL: any = await import("../../src/lib/maswali-week-label.ts");
const { settleArithmetic, guaranteeRequirement }: any = await import("../../src/lib/maswali-money.ts");
const { snapshotOrLegacy }: any = await import("../../src/lib/server/market-config.ts");
const { getMaswaliConfig }: any = await import("../../src/lib/server/maswali-config.ts");
const { withLock }: any = await import("../../src/lib/server/locks.ts");
const { readFileSync } = await import("node:fs");
const FREE_CANCEL: any = await import("../../src/lib/millionea-free-cancel.ts");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const NL = String.fromCharCode(10);
const section = (title: string) => console.log(`${NL}${title}`);
const J = (x: unknown) => JSON.stringify(x);
const why = (r: any) => (r?.ok ? "ok" : `${r?.reason ?? "-"}: ${r?.error}`);
const DAY = 86_400_000;
/** A form as an action receives it: `get` answers null for a field that was not sent, as FormData does. */
const form = (o: Record<string, unknown>) => ({ get: (k: string) => (k in o ? o[k] : null) });
const at = (state: string) => ({ deps: { stateNow: async () => state } });
const ACTIVE = at("ACTIVE");
const viewer = (userId: string | null, state = "ACTIVE") => ({ userId, state });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Every refusal an act returned in this run, to check the failure shape of all of them at once (§5.19). */
const refusals: any[] = [];
const seen = (r: any) => { if (r && r.ok === false) refusals.push(r); return r; };
const SERIAL = /^MLN-\d{4}-W\d{2}-\d{6,}$/;
/** The not-found refusal, written out here — never read back from the module that returns it (5.13). */
const NOT_FOUND_SHAPE = J({ ok: false, code: "NOT_FOUND", reason: "not_found", keys: ["code", "error", "ok", "reason"] });
const shapeOf = (r: any) => J({ ok: r?.ok, code: r?.code, reason: r?.reason, keys: Object.keys(r ?? {}).sort() });

await W.setup({ guarantee: 20_000_000 });

// ── §1 · the gate ─────────────────────────────────────────────────────────────────────────────────────────────────
section("§1 · the gate: who may see Millionea");
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
  // (The 404 itself is `next/navigation`'s and needs Next's runtime: the two wiring lines are pinned, the decision above
  // is driven.)
  const gate = readFileSync("src/lib/server/millionea-gate.ts", "utf8");
  ok("1.6 · the route gate asks the rollout's one answer and turns 'not visible' into the 404 a missing page gives",
    /const r = await resolveMillionea\(\);/.test(gate) && /if \(!r\.visible\) notFound\(\);/.test(gate));
  const route = readFileSync("src/app/positions/[positionId]/page.tsx", "utf8");
  // RE-PINNED (MASWALI-BUILD S5 pages, the lead's decision L5 of 2026-10-17): a kill hides the product, never a player's
  // own tickets — the permalink names its OWN ticket's page at every rollout state, and still 404s a stranger's position.
  ok("1.7 · the position permalink names the viewer's own ticket's page at every rollout state (L5: the MASWALI arm asks no rollout), and still 404s a stranger's position",
    /if \(productLine === "MASWALI"\) \{\s*ticketSerial = \(await ticketStore\.getByPositionId\(position\.id\)/.test(route)
      && !/resolveMillionea/.test(route) && /position\.userId !== session\.userId\) notFound\(\);/.test(route));
}

// ── §2 · how to play, before any week ─────────────────────────────────────────────────────────────────────────────
section("§2 · how to play: the frozen rules");
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
  const shared = ex.shared ? settleArithmetic({ rolloverIn: 0, sales: ex.shared.sales, winners: 3, floor, feeRate, rates }) : null;
  ok("2.3 · the worked examples are the settlement's own arithmetic over those rules: a shared week, and a floor week",
    !!ex.shared && !!ex.floorWeek && J(ex.shared.figures) === J(shared) && ex.shared.figures.kind === "PAYOUT" && ex.floorWeek.figures.kind === "PAYOUT"
      && ex.floorWeek.figures.J === floor && ex.floorWeek.sales < floor && ex.shared.sales >= floor, J(ex));

  // L4 · every floor an admin may set: 0, or at least one ticket's price (maswali-config's own rule).
  const rulesAt = (f: number) => ({ ticketPrice: price, floor: f, feeRate, traRate: rates.traTaxOnCommissionRate, gbtRate: rates.gbtLevyOnCommissionRate });
  const again = (e: any, f: number) => J(settleArithmetic({ rolloverIn: 0, sales: e.sales, winners: e.winners, floor: f, feeRate, rates })) === J(e.figures);
  const holds = (f: number) => {
    const { shared: s, floorWeek: w } = P.millioneaExamplesFor(rulesAt(f));
    const sharedOk = s === null || (s.winners === 3 && s.tickets >= 3 && s.sales === s.tickets * price && s.sales >= f
      && s.figures.U === 0 && s.figures.J === s.sales && again(s, f));
    const floorOk = w === null || (w.winners === 1 && w.tickets >= 1 && w.sales === w.tickets * price && w.sales < f
      && w.figures.J === f && w.figures.U > 0 && again(w, f));
    return { f, shared: s !== null, floorWeek: w !== null, ok: sharedOk && floorOk };
  };
  const byFloor = [0, price, price + 1, 2 * price, 3 * price, 10 * price, 20 * price, 1000 * price, cfg.floorTzs].map(holds);
  ok("2.4 · ⭐ L4 · at every floor an admin may set, each worked example either holds — its figures say what its words say (three real winners at or above the floor and no top-up; one winner below it, topped up to the floor) — or is left out",
    byFloor.every((x) => x.ok), J(byFloor));
  ok("2.5 · ⛔ L4 · a floor of 0 and a floor of one ticket's price show neither example (one ticket is never three winners, and no sales stay below one ticket); two tickets' floor shows the floor week only; a real floor shows both",
    !byFloor[0].shared && !byFloor[0].floorWeek && !byFloor[1].shared && !byFloor[1].floorWeek && !byFloor[3].shared && byFloor[3].floorWeek
      && byFloor[4].shared && byFloor[4].floorWeek && byFloor[8].shared && byFloor[8].floorWeek, J(byFloor));
}

// ── §3 · the hub ──────────────────────────────────────────────────────────────────────────────────────────────────
section("§3 · the hub");
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
  ok("3.10 · a held ticket shows no amount: running, nothing paid, no share and no refund",
    rows.every((r: any) => r.shown === "running" && r.paid === null && r.share === null && r.refund === null), J(rows.map((r: any) => [r.shown, r.paid, r.share, r.refund])));
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
section("§4 · the slip");
{
  const s = await P.millioneaSlip(viewer(P1));
  ok("4.1 · the slip is the week on sale's fifteen, its price and cap, and the viewer's count", !!s && s.week.id === A.id && s.questions.length === 15
    && s.ticketPrice === price && s.ticketCap === cap && s.held === 3 && s.feeRate === feeRate, J(s && { held: s.held, cap: s.ticketCap }));
  ok("4.2 · the MAIN balance it pays from (bonus never buys a ticket)", s?.balance === (await W.bal(P1)).balance, `${s?.balance}`);
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-FIX-PLAYER P1): the slip hands the week's frozen grace, and the confirm sheet asks
  // the one rule of NOW on every tick — never a free cancel fixed at the page's render (`cancelIfBoughtNow` is gone).
  const nowMs = Date.now(), closeMs = s ? Date.parse(s.week.closesAt) : NaN;
  const until = s ? FREE_CANCEL.millioneaFreeCancelEnd(nowMs, closeMs, closeMs, s.freeCancelMinutes) : null;
  ok("4.3 · ⭐ P1 · the slip hands the week's frozen free-cancel grace (RULES §2.6), and a ticket cut now carries its free cancel by the one rule: ahead, and inside the grace — nothing fixed at the render",
    s?.freeCancelMinutes === feesA.freeExitGraceMinutes && until !== null && until > nowMs && until <= nowMs + feesA.freeExitGraceMinutes * 60_000 && !("cancelIfBoughtNow" in (s ?? {})),
    J({ grace: s?.freeCancelMinutes, until }));
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
section("§5 · the acts: buy and the free cancel");
const { week: D } = await W.openWeek({ weeksAhead: 2, visibility: "DRIVE" });
const P2 = await W.user({ balance: 50_000 });
const buyForm = (o: Record<string, unknown> = {}) =>
  form({ expectedOwnerId: P2, weekId: A.id, idempotencyKey: "act-p2-a-0001", slips: J([W.WIN, W.LOSE]), ...o });
let p2Serials: string[] = [];
{
  const before = (await W.bal(P2)).balance;
  const changed = seen(await ACT.buyMillioneaFromForm(P2, buyForm({ expectedOwnerId: P1 }), ACTIVE));
  const missing = seen(await ACT.buyMillioneaFromForm(P2, form({ weekId: A.id, idempotencyKey: "act-p2-a-0009", slips: J([W.WIN]) }), ACTIVE));
  ok("5.1 · ⛔ L6 · a page drawn for another account never debits this one — refused with its own reason (the player IS signed in: reload, never 'sign in'), and a form naming none is refused alike",
    !changed.ok && changed.reason === "session_changed" && changed.code === "CONFLICT" && !missing.ok && missing.reason === "session_changed"
      && !!REASONS.session_changed && REASONS.session_changed.key !== REASONS.signin_required.key, `${why(changed)} · ${why(missing)}`);
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
  ok("5.9 · ⭐ a good submit buys every slip: two serials, the week, the balance the purchase's own debit left, not a replay",
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
  const p1Before = (await W.bal(P1)).balance;
  const asked = [cform("../../etc"), cform(`${A.code}-999999`), cform(p1Serial)];
  const alike: any[] = [];
  for (const f of asked) alike.push(seen(await ACT.cancelMillioneaFromForm(stranger, f)));
  ok("5.13 · ⛔ MB-95 · ONE caller asks three serials — a malformed one, one nobody holds, another player's real one — and gets three answers byte-for-byte alike, each the not-found refusal as written out here; the real ticket and its owner's money are untouched",
    alike.every((r: any) => shapeOf(r) === NOT_FOUND_SHAPE) && new Set(alike.map((r: any) => J(r))).size === 1
      && (await dal.ticketStore.getBySerial(p1Serial)).status === "LIVE" && (await W.bal(P1)).balance === p1Before, J(alike));
  const poolBefore = (await P.maswaliPoolFigure(A.id)).sales;
  const c = await ACT.cancelMillioneaFromForm(P2, cform(p2Serials[0].toLowerCase()));
  ok("5.14 · ⭐ the owner's own ticket, inside its window, is cancelled in full — the serial read case-blind", c.ok && c.data.serial === p2Serials[0]
    && c.data.refunded === price && c.data.balance === after + price && (await W.bal(P2)).balance === after + price, why(c));
  ok("5.15 · …the ticket is CANCELLED and the headline's sales went down by a ticket (MR-28)",
    (await dal.ticketStore.getBySerial(p2Serials[0])).status === "CANCELLED" && (await P.maswaliPoolFigure(A.id)).sales === poolBefore - price);
  const twice = seen(await ACT.cancelMillioneaFromForm(P2, cform(p2Serials[0])));
  ok("5.16 · ⛔ a ticket is cancelled once", !twice.ok && twice.reason === "position_not_open" && (await W.bal(P2)).balance === after + price, why(twice));
  const late = await ACT.buyMillioneaFromForm(P2, buyForm({ idempotencyKey: "act-p2-a-0002", slips: J([W.LOSE]) }), ACTIVE);
  const lateSerial = late.ok ? late.data.tickets[0].serial : "";
  await W.backdate(late.ok ? late.data.tickets[0].positionId : "", 60 * 60_000);
  const shut = seen(await ACT.cancelMillioneaFromForm(P2, cform(lateSerial)));
  ok("5.17 · ⛔ past its free window a ticket rides to the result — and there is no paid exit (MB-50)",
    late.ok && !shut.ok && shut.reason === "exit_window_closed" && (await dal.ticketStore.getBySerial(lateSerial)).status === "LIVE", why(shut));
  // L5 · the lead's decision: a kill hides the product, never a player's free exit. The REAL switch is lowered here (the
  // ceiling, as production lowers it), so nothing injected could be hiding a rollout read.
  const keep = await ACT.buyMillioneaFromForm(P2, buyForm({ idempotencyKey: "act-p2-a-0003", slips: J([W.WIN]) }), ACTIVE);
  const keepSerial = keep.ok ? keep.data.tickets[0].serial : "";
  process.env.FEATURE_MILLIONEA = "WITHDRAWN";
  const killed = await resolveMillioneaFor({ sessionUserId: P2 });
  const balKilled = (await W.bal(P2)).balance;
  const strangerKilled = seen(await ACT.cancelMillioneaFromForm(stranger, cform(keepSerial)));
  const exit = await ACT.cancelMillioneaFromForm(P2, cform(keepSerial));
  process.env.FEATURE_MILLIONEA = "ACTIVE";
  ok("5.18 · ⭐ L5 · with Millionea WITHDRAWN (hidden from this very player), the owner's ticket inside its free window still comes back in full, and a stranger still meets the one not-found refusal — owner-only and the window rules, at every rollout state",
    keep.ok && killed.visible === false && killed.state === "WITHDRAWN" && exit.ok && exit.data.refunded === price && (await W.bal(P2)).balance === balKilled + price
      && (await dal.ticketStore.getBySerial(keepSerial)).status === "CANCELLED" && shapeOf(strangerKilled) === NOT_FOUND_SHAPE,
    `${why(keep)} · ${J(killed)} · ${why(exit)} · ${why(strangerKilled)}`);
  ok("5.19 · ⭐ THE PLATFORM'S FAILURE SHAPE: every refusal in §5 carries a registered reason, so a screen renders its copy, never the server's sentence",
    refusals.length >= 20 && refusals.every((r: any) => typeof r.reason === "string" && !!REASONS[r.reason]), J(refusals.filter((r: any) => !REASONS[r.reason]).map(why)));
}

// ── §6 · the viewer's tickets ─────────────────────────────────────────────────────────────────────────────────────
section("§6 · the viewer's tickets");
const p1Tickets = (await dal.ticketStore.listForUser(P1, { cycleId: A.id })).sort((a: any, b: any) => a.serial.localeCompare(b.serial));
const [p1Win1, p1Win2, p1Lose] = p1Tickets;
{
  const mine = await P.millioneaMyTickets(P1, { perPage: 12 });
  const list = mine.rows;
  ok("6.1 · Tiketi zangu, Millionea: the week first, its three tickets in sale order, each with its fifteen sockets",
    mine.total === 1 && list.length === 1 && list[0].week.id === A.id && list[0].tickets.map((t: any) => t.serial).join() === p1Tickets.map((t: any) => t.serial).join()
      && list[0].tickets.every((t: any) => t.slots.length === 15 && t.shown === "running"), J(list.map((w: any) => w.week.code)));
  const v = await P.millioneaTicket(P1, p1Win1.serial);
  ok("6.2 · ⭐ one ticket for its owner: its picks, its stub and salt (shown to the owner only, MB-32), its anchor id",
    !!v && v.serial === p1Win1.serial && v.positionId === p1Win1.positionId && v.stub.salt === p1Win1.salt && v.stub.selectionsHash === p1Win1.selectionsHash
      && v.stub.price === price && v.slots.every((s: any) => s.pick === p1Win1.selections[s.slot - 1]), J(v && { serial: v.serial }));
  ok("6.3 · a held ticket's page: its free cancel open, no result, no win ledger, no loss line, ⛔ no jackpot or pool figure",
    !!v && Date.parse(v.cancelUntil) > Date.now() && v.win === null && v.loss === null && v.weekVoid === null && v.cannotWinSoFar === false && !/jackpot|"pool"/i.test(J(v)), J(v && { cancelUntil: v.cancelUntil }));
  ok("6.4 · the facts so far: the cut alone, unseen — one fact performs; a backlog does not rest yet; the view's instant is the cut's",
    !!v && v.seen.lastViewedAt === null && J(v.seen.unseen.map((f: any) => f.kind)) === J(["cut"]) && v.seen.backlogRests === false && v.seen.through === v.boughtAt, J(v?.seen));
  const stranger = await W.user({ balance: 0 });
  const nulls = await Promise.all([
    P.millioneaTicket(stranger, p1Win1.serial), P.millioneaTicket(P1, "not-a-serial"), P.millioneaTicket(P1, `${A.code}-999999`), P.millioneaTicket(P1, ""),
  ]);
  ok("6.5 · ⛔ a stranger's serial, a malformed one, one nobody holds and an empty one all answer null — the route's same 404", nulls.every((x: any) => x === null), J(nulls.map((x: any) => x === null)));
  ok("6.6 · the serial is read case-blind for its owner", (await P.millioneaTicket(P1, p1Win1.serial.toLowerCase()))?.serial === p1Win1.serial);
  const closure = await P.millioneaClosureTickets(P1);
  ok("6.7 · ⭐ the account-closure screen lists the account's open tickets (MB-44)",
    closure.length === 3 && closure.every((t: any) => t.weekCode === A.code && t.shown === "running" && !t.heldForReview && t.refundPending === false), J(closure));
  const p2Closure = await P.millioneaClosureTickets(P2);
  ok("6.8 · …and never a cancelled one", p2Closure.length === 2 && !p2Closure.some((t: any) => t.serial === p2Serials[0]), J(p2Closure.map((t: any) => t.serial)));
}

// ── §7 · the live frame, its audience, the seen mark, then the carry pending ───────────────────────────────────────
section("§7 · the live frame (maswali:pool) and who hears it; the seen mark; the carry pending on an earlier week");
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
  ok("7.3 · ⛔ the frame carries public figures and its week's line only: no ticket, pick, holder or count of who is still in",
    // Re-pinned in the open (S5-FIX-PLAYER P9): the figure names the week its carry came from (a public week code).
    !!frame && Object.keys(frame).sort().join(",") === "atLeast,carryFromCode,carryIn,carryPendingCode,code,feeRate,floor,jackpot,sales,state,visibility,weekId"
      && frame.visibility === "PUBLIC", J(frame && Object.keys(frame)));
  const replay = await W.buy(P5, A.id, [W.LOSE], { key: "player-p5-a-0001" });
  ok("7.4 · a replay moved nothing, so it arms nothing", replay.ok && replay.data.replayed === true && !FEED.__pendingPoolFrames().includes(A.id), J(FEED.__pendingPoolFrames()));
  const p5Serial = b.ok ? b.data.maswali.tickets[0].serial : "";
  const rendered = await P.millioneaTicket(P5, p5Serial);
  await sleep(5);
  const c = await ACT.cancelMillioneaFromForm(P5, form({ serial: p5Serial }));
  await sleep(100);
  ok("7.5 · a free cancel arms a frame too, once its money has committed", c.ok && FEED.__pendingPoolFrames().includes(A.id), `${why(c)} · ${J(FEED.__pendingPoolFrames())}`);
  await FEED.__flushPoolFramesForTests();
  stop();

  // L7 · the seen mark records the instant the page RENDERED: the view above held the cut alone; the cancel landed after it.
  const early = await ACT.markMillioneaTicketSeenFor(P5, p5Serial, rendered?.seen.through);
  const next = await P.millioneaTicket(P5, p5Serial);
  ok("7.5a · ⭐ L7 · marked through the instant the page rendered (its newest fact, the cut), the cancel that landed after the render still performs — the server's clock at the mark would have put it to rest unseen",
    early === true && rendered?.seen.through === rendered?.boughtAt && J(next?.seen.unseen.map((f: any) => f.kind)) === J(["cancel"]),
    J({ early, through: rendered?.seen.through, unseen: next?.seen.unseen }));
  const forged = await ACT.markMillioneaTicketSeenFor(P5, p5Serial, new Date(Date.parse(next.seen.through) + 1).toISOString());
  const junk = await ACT.markMillioneaTicketSeenFor(P5, p5Serial, "yesterday");
  const caughtUp = await ACT.markMillioneaTicketSeenFor(P5, p5Serial, next.seen.through);
  const rested = await P.millioneaTicket(P5, p5Serial);
  ok("7.5b · ⛔ L7 · an instant that is none of the ticket's facts, or no instant at all, records nothing; the newer view's own instant brings every fact to rest",
    forged === false && junk === false && caughtUp === true && rested.seen.unseen.length === 0, J({ forged, junk, caughtUp, unseen: rested.seen.unseen }));

  // M1 · L8 · the stream's audience, driven through the route's own forwarding (`forwardMillioneaPool`): real figures of
  // the public week and the drive week, put on the bus as the feed puts them.
  const fA = await P.maswaliPoolFigure(A.id);
  const fD = await P.maswaliPoolFigure(D.id);
  ok("7.6 · ⭐ M1 · a frame names its week's line: the public week PUBLIC, the drive week DRIVE", fA?.visibility === "PUBLIC" && fD?.visibility === "DRIVE", J([fA?.visibility, fD?.visibility]));
  const people: Record<string, { role: string; status: string }> = { staffU: { role: "ADMIN", status: "ACTIVE" }, playerU: { role: "PLAYER", status: "ACTIVE" } };
  let state = "ACTIVE", clock = 1_000_000, reads = 0;
  const deps = { stateNow: async () => state, findUser: async (id: string) => { reads++; return people[id] ?? null; }, nowMs: () => clock };
  const got: Record<string, any[]> = { staff: [], player: [], guest: [] };
  const offs = [
    PREVIEW.forwardMillioneaPool("staffU", (p: string) => got.staff.push(JSON.parse(p)), deps),
    PREVIEW.forwardMillioneaPool("playerU", (p: string) => got.player.push(JSON.parse(p)), deps),
    PREVIEW.forwardMillioneaPool(null, (p: string) => got.guest.push(JSON.parse(p)), deps),
  ];
  const { visibility: _line, ...shapeless } = fA;
  void _line;
  const round = async (s: string) => {
    state = s;
    for (const k of Object.keys(got)) got[k].length = 0;
    BUS.emit("maswali:pool", fA);
    BUS.emit("maswali:pool", fD);
    BUS.emit("maswali:pool", { ...fA, visibility: "ELSEWHERE" });
    BUS.emit("maswali:pool", shapeless);
    await sleep(40);
    return Object.fromEntries(Object.entries(got).map(([k, v]) => [k, v.map((f: any) => `${f.type}:${f.data.visibility}`)]));
  };
  const active = await round("ACTIVE");
  ok("7.6a · ⭐ M1 · at ACTIVE every stream hears the public week's frame and ⛔ none hears the drive week's — staff included; a frame naming no known line goes nowhere",
    J(active) === J({ staff: ["maswali:pool:PUBLIC"], player: ["maswali:pool:PUBLIC"], guest: ["maswali:pool:PUBLIC"] }), J(active));
  reads = 0;
  const preview = await round("STAFF_PREVIEW");
  ok("7.6b · ⭐ M1 · at STAFF_PREVIEW only stored staff hear either week — the drive week's frame among them; a player and a guest hear nothing",
    J(preview) === J({ staff: ["maswali:pool:PUBLIC", "maswali:pool:DRIVE"], player: [], guest: [] }), J(preview));
  const firstReads = reads;
  await round("STAFF_PREVIEW");
  ok("7.6c · ⭐ L8 · the staff standing is read once per stream, not per frame: eight frames over two rounds cost one user read per signed-in stream (a guest's stream needs none)",
    firstReads === 2 && reads === 2, J({ firstReads, reads }));
  people.staffU = { role: "PLAYER", status: "ACTIVE" };
  const cached = await round("STAFF_PREVIEW");
  clock += 30_001;
  const demoted = await round("STAFF_PREVIEW");
  ok("7.6d · L8 · a demotion is heard within the standing's window: trusted inside it, and once the standing is old the stream re-reads the account and stops — the drive week's frame with it",
    J(cached.staff) === J(["maswali:pool:PUBLIC", "maswali:pool:DRIVE"]) && J(demoted.staff) === J([]) && reads === 4, J({ cached: cached.staff, demoted: demoted.staff, reads }));
  const withdrawn = await round("WITHDRAWN");
  ok("7.6e · ⛔ WITHDRAWN: no stream hears any week", J(withdrawn) === J({ staff: [], player: [], guest: [] }), J(withdrawn));
  offs.forEach((off: () => void) => off());
  const sse = readFileSync("src/app/api/events/route.ts", "utf8");
  const allEvents = /const ALL_EVENTS: SseEventType\[\] = \[([^\]]*)\]/.exec(sse)?.[1] ?? "";
  ok("7.6f · the route's whole Millionea wiring is that one forwarding (the stream's own user and sender) — ⛔ no frame subscribed past it, and kept out of the broadcast list",
    /unsubscribes\.push\(forwardMillioneaPool\(userId, send\)\);/.test(sse) && !/subscribe\("maswali:pool"/.test(sse)
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
  // S5-FIX-PLAYER P5 · the ticket's "next event" on the closed, unsealed week, at three instants of its own clock.
  const events = (await dal.questionStore.listForWeek(A.id)).map((q: any) => q.eventStartsAt).sort();
  const at = (ms: number) => P.millioneaTicket(P1, p1Win1.serial, new Date(ms));
  const [before, between, after] = await Promise.all([
    at(Date.parse(events[0]) - 60_000), at(Date.parse(events[0]) + 60_000), at(Date.parse(events[events.length - 1]) + 60_000),
  ]);
  // S5-FIX-PLAYER P7 · the open week's "results and payout" end: its latest void deadline plus its frozen window (no window yet).
  const qB = await dal.questionStore.listForWeek(B.id);
  const lastVoid = Math.max(...qB.map((q: any) => Date.parse(q.voidDeadlineAt)));
  const wantBy = new Date(P.millioneaResultsBy(null, lastVoid, W.svc.frozenRules(B))).toISOString();
  ok("7.11 · ⭐ P7 · the week on sale's results and payout end at its latest void deadline plus its frozen objection window (never before its EAT floor) — the strip's end, How to play's own rule",
    h.week?.resultsBy === wantBy && Date.parse(wantBy) > lastVoid, J({ resultsBy: h.week?.resultsBy, want: wantBy }));
  ok("7.10 · ⭐ P5 · the ticket's next event is the first unsealed event still AHEAD — and none once every unsealed event has begun, never one already past",
    before?.nextResultAt === events[0] && between?.nextResultAt === events.find((e: string) => Date.parse(e) >= Date.parse(events[0]) + 60_000)
      && between.nextResultAt !== events[0] && after?.resultsOut === 0 && after.nextResultAt === null,
    J({ before: before?.nextResultAt, between: between?.nextResultAt, after: after?.nextResultAt, first: events[0] }));
}

// ── §8 · a settled week ───────────────────────────────────────────────────────────────────────────────────────────
section("§8 · a settled week: the win ledger, the loss line, the register, the seen state, the notices");
const objectionsDone = await W.closeAndSeal(A, aStart);
{
  // S5-FIX-PLAYER P6 · the graded set final and the window stamped: the hub's grading week and the ticket view carry both
  // instants (ISO), and the one phase reads them — the objection window until its end, then settling.
  const VIEW: any = await import("../../src/app/millionea/millionea-view.ts");
  const stored = await dal.weekStore.get(A.id);
  const hg = (await P.millioneaHub(viewer(P1))).grading;
  const tv = await P.millioneaTicket(P1, p1Lose.serial);
  const end = Date.parse(stored.objectionsCloseAt);
  const phaseAt = (ms: number) => VIEW.millioneaWeekPhase(hg, ms);
  ok("8.0 · ⭐ P6 · the graded set final: the hub's grading week and the ticket view carry gradedSetFinalAt and objectionsCloseAt as the store stamped them, and the phase is the objection window until its end, then settling",
    !!stored.gradedSetFinalAt && !!stored.objectionsCloseAt && hg?.id === A.id && hg.gradedSetFinalAt === stored.gradedSetFinalAt && hg.objectionsCloseAt === stored.objectionsCloseAt
      && tv?.week.gradedSetFinalAt === stored.gradedSetFinalAt && tv.week.objectionsCloseAt === stored.objectionsCloseAt
      // P7 · and once the window is stamped, the week's results and payout end at it
      && hg.resultsBy === new Date(end).toISOString()
      && J(phaseAt(end - 1)) === J({ kind: "objections", objectionsUntil: end }) && J(phaseAt(end)) === J({ kind: "settling", objectionsUntil: null }),
    J({ stored: [stored.gradedSetFinalAt, stored.objectionsCloseAt], hub: hg && [hg.gradedSetFinalAt, hg.objectionsCloseAt], before: phaseAt(end - 1), at: phaseAt(end) }));
}
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
  ok("8.4 · ⭐ a won ticket: the word, its share the player's own (paid), and the amount paid — its share, to the shilling",
    v.shown === "won" && v.share === "paid" && v.paid === expectA.share, `${v.shown} ${v.share} ${v.paid} vs ${expectA.share}`);
  ok("8.5 · ⭐ the win ledger: jackpot, the fee, to the winners, the equal share, ×2 for the viewer's two, the top-up — every figure the settlement's; no share held or forfeited",
    J(v.win) === J({
      jackpot: expectA.J, fee: expectA.F, traLevy: expectA.tra, gbtLevy: expectA.gbt, toWinners: expectA.J - expectA.F, winners: 2, share: expectA.share,
      paid: expectA.paid, remainder: expectA.dust, topUp: expectA.U, yourWinningTickets: 2, yourTotal: 2 * expectA.share,
      yourHeldTickets: 0, yourForfeitedTickets: 0, basis: "TEN_OF_TEN", winningScore: 10,
    }), J(v.win));
  const l = await P.millioneaTicket(P1, p1Lose.serial);
  ok("8.6 · ⛔ a ticket that did not win: the week's line only — no score, no amount, no carried figure (§10 3.14, OD-24)",
    l.shown === "lost" && l.paid === null && l.share === null && l.win === null && J(l.loss) === J({ winners: 2, carriedForward: false, nextWeekCode: B.code })
      && !/"score"|carried(Out|Forward)":\s*\d/.test(J(l)), J(l.loss));
  // (The presses carry the week's own seal clock, which the money world runs weeks ahead; the result, the real one.)
  const kinds = v.seen.unseen.map((f: any) => f.kind);
  ok("8.7 · ⭐ a backlog rests: the cut, fifteen presses and the result unseen at once — more than four, so none animates",
    v.seen.unseen.length === 17 && v.seen.backlogRests === true && kinds.filter((k: string) => k === "press").length === 15
      && kinds.includes("cut") && kinds.includes("result"), J(kinds));
  const marked = await ACT.markMillioneaTicketSeenFor(P1, p1Win1.serial, v.seen.through);
  const after = await P.millioneaTicket(P1, p1Win1.serial);
  ok("8.8 · seen by its owner through the view's own instant, every fact rests: nothing unseen, and the backlog no longer matters",
    marked === true && after.seen.unseen.length === 0 && after.seen.backlogRests === false && Date.parse(after.seen.lastViewedAt) === Date.parse(v.seen.through), J(after.seen));
  const back = await ACT.markMillioneaTicketSeenFor(P1, p1Win1.serial, v.boughtAt);
  const w2 = await P.millioneaTicket(P1, p1Win2.serial);
  const stranger = await ACT.markMillioneaTicketSeenFor(P2, p1Win2.serial, w2.seen.through);
  // (L5 · the mark asks no rollout: §12b drives the owner's mark with Millionea hidden.)
  ok("8.9 · ⛔ the stamp only moves forward (an older fact's instant records nothing); nobody else marks a ticket seen",
    back === false && stranger === false && (await dal.ticketStore.getBySerial(p1Win2.serial)).lastViewedAt === null, J([back, stranger]));

  const r = await P.millioneaRegisterWeek(A.code.toLowerCase());
  ok("8.10 · ⭐ the register's week: public, final, every figure the settlement's own (the case of the code does not matter)",
    !!r && r.state === "SETTLED" && r.jackpot === expectA.J && r.fee === expectA.F && r.winners === 2 && r.share === expectA.share && r.topUp === expectA.U
      // S5-FIX-PLAYER P3 · "To winners" is J − F, the win ledger's own figure (8.5) — never k × share.
      && r.toWinners === expectA.J - expectA.F
      && r.paid === expectA.paid && r.remainder === expectA.dust && r.carriedForward === expectA.carryOut && r.questionSetHash === A.questionSetHash
      && r.tickets === salesA / price && r.refundsPending === false, J(r && { J: r.jackpot, k: r.winners }));
  ok("8.11 · the fifteen with their results, no substitutions in a week with no void, basis 10 of 10, one officer's seals",
    !!r && r.questions.length === 15 && r.questions.every((q: any) => q.outcome === "YES" && !!q.sealedAt) && r.substitutions.length === 0
      && r.basis === "TEN_OF_TEN" && r.winningScore === 10 && r.resolution === "single", J(r && { basis: r.basis, subs: r.substitutions }));
  const graded = salesA / price;
  ok("8.12 · after settlement only: the standing history over the ten counted results, and the anonymised graded table",
    !!r && r.standing.length === 10 && r.standing.at(-1).ticketsWithoutAMiss === 2 && r.scores.length === 11 && r.scores[10] === 2
      && r.scores.reduce((s: number, n: number) => s + n, 0) === graded, J(r && { standing: r.standing.map((s: any) => s.ticketsWithoutAMiss), scores: r.scores }));
  ok("8.13 · ⛔ no names on the register: no account id, phone or display name anywhere in it",
    !!r && !J(r).includes(P1) && !J(r).includes(P2) && !/phoneE164|displayName|userId/.test(J(r)));
  // The seed's clocks are ahead of the wall clock; inject an instant after its recorded close for the cache policy only.
  const afterClose = () => Date.parse(r.closedAt) + DAY;
  let projections = 0;
  const project = async () => { projections++; return P.millioneaRegisterWeek(A.code); };
  const readHead = () => dal.weekStore.getByCode(A.code);
  const cached1 = await CACHE.readCachedMillioneaRegisterWeek(A.code, readHead, project, afterClose);
  const cached2 = await CACHE.readCachedMillioneaRegisterWeek(A.code, readHead, project, afterClose);
  ok("8.13a · the actual PUBLIC settled projection is cached after its close on this store",
    !!cached1 && cached1 === cached2 && cached1.id === A.id && cached1.jackpot === expectA.J && projections === 1,
    J({ projections, code: cached1?.code }));
  CACHE.invalidateMillioneaRegisterWeek(A.code.toLowerCase());
  const cached3 = await CACHE.readCachedMillioneaRegisterWeek(A.code, readHead, project, afterClose);
  ok("8.13b · explicit invalidation reads the current store again, even for a lower-case action code",
    !!cached3 && cached3 !== cached2 && cached3.jackpot === expectA.J && projections === 2, J({ projections }));
  const hidden = await CACHE.readCachedMillioneaRegisterWeek(A.code,
    async () => ({ ...(await readHead()), visibility: "DRIVE" }), project, afterClose);
  ok("8.13c · a request whose current week is DRIVE cannot reuse the PUBLIC projection",
    hidden === null && projections === 2, J({ hidden, projections }));
  const nulls = await Promise.all([P.millioneaRegisterWeek(B.code), P.millioneaRegisterWeek(D.code), P.millioneaRegisterWeek("MLN-1999-W01"), P.millioneaRegisterWeek("<script>")]);
  ok("8.14 · ⛔ never a week still selling, never a drive week, never a code that is not a week", nulls.every((x: any) => x === null), J(nulls.map((x: any) => x === null)));
  const reg = await P.millioneaRegister({ perPage: 12 });
  const list = reg.rows;
  ok("8.15 · the register's list: the settled week, and only final public weeks", reg.total === 1 && list.length === 1 && list[0].id === A.id && list.every((w: any) => w.state === "SETTLED" || w.state === "VOIDED"),
    J(list.map((w: any) => w.code)));
  const { millioneaSitemap } = await import("../../src/lib/maswali-sitemap.ts");
  const siteRows = await dal.weekStore.list({ visibility: "PUBLIC", states: ["SETTLED"] });
  const site = millioneaSitemap("ACTIVE", siteRows, "https://www.50pick.tz");
  const settledA = await dal.weekStore.get(A.id);
  ok("8.15a · the real store's settled public week enters discovery, never an open or DRIVE week",
    site.some((entry: any) => entry.url.endsWith(`/millionea/register/${A.code}`) && entry.lastModified instanceof Date && entry.lastModified.toISOString() === settledA?.settledAt)
      && !site.some((entry: any) => entry.url.endsWith(`/millionea/register/${B.code}`) || entry.url.endsWith(`/millionea/register/${D.code}`)));
  const fB = await P.maswaliPoolFigure(B.id);
  ok("8.16 · ⭐ once N settled, N+1's carry is known: what the claim reads (N's remainder), no longer pending",
    fB.carryIn === expectA.carryOut && fB.carryPendingCode === null && fB.atLeast === false && fB.jackpot === Math.max(floor, fB.carryIn + fB.sales), J(fB));

  const notices = await P.millioneaNotices(P1);
  const result = notices.find((n: any) => n.notice === "RESULT");
  ok("8.17 · ⭐ one seal per player per week: the holder's RESULT notice, won, with their two paid tickets' total (§M8a item 10); nothing held or forfeited",
    J(result) === J({ notice: "RESULT", weekId: A.id, code: A.code, won: true, winningTickets: 2, total: 2 * expectA.share, held: 0, forfeited: 0 }), J(notices));
  const p2Notice = (await P.millioneaNotices(P2)).find((n: any) => n.notice === "RESULT");
  ok("8.18 · a holder who did not win gets the calm line: no amount", p2Notice?.won === false && p2Notice.total === null && p2Notice.winningTickets === 0, J(p2Notice));
  ok("8.19 · ⛔ a player who held nothing in the week gets no result notice", !(await P.millioneaNotices(await W.user({ balance: 0 }))).some((n: any) => n.notice === "RESULT"));
  const asOf = (await P.millioneaHub(viewer(P1))).asOf;
  const m1 = await ACT.markMillioneaNoticeSeenFor(P1, A.id, "RESULT", asOf, ACTIVE);
  const m2 = await ACT.markMillioneaNoticeSeenFor(P1, A.id, "RESULT", asOf, ACTIVE);
  const odd = await ACT.markMillioneaNoticeSeenFor(P1, A.id, "SOMETHING_ELSE", asOf, ACTIVE);
  const noWeek = await ACT.markMillioneaNoticeSeenFor(P1, "mlw_not_a_week", "RESULT", asOf, ACTIVE);
  const ahead = await ACT.markMillioneaNoticeSeenFor(P2, A.id, "RESULT", new Date(Date.now() + DAY).toISOString(), ACTIVE);
  const noInstant = await ACT.markMillioneaNoticeSeenFor(P2, A.id, "RESULT", undefined, ACTIVE);
  ok("8.20 · ⭐ seen once, it rests: the first mark records, the second does not (first seen wins); an unknown notice or week, an instant still ahead of the server's clock, or none at all, records nothing",
    m1 === true && m2 === false && odd === false && noWeek === false && ahead === false && noInstant === false
      && !(await P.millioneaNotices(P1)).some((n: any) => n.notice === "RESULT") && (await P.millioneaNotices(P2)).some((n: any) => n.notice === "RESULT"),
    J([m1, m2, odd, noWeek, ahead, noInstant]));
  const h = await P.millioneaHub(viewer(P1));
  ok("8.21 · the hub: the week on sale, and the settled week as its 'last week' row — the week right before it in the calendar (P8: `lastWeekIsPrevious`)", h.week?.id === B.id && h.grading === null && h.lastWeek?.id === A.id
    && h.lastWeekIsPrevious === true && h.lastWeek.winners === 2 && h.lastWeek.share === expectA.share && h.lastWeek.refundsPending === false, J(h.lastWeek));
  ok("8.22 · MB-90 · /results' Millionea section is the register's latest final weeks", J(await P.millioneaResultsSection(4)) === J(list.slice(0, 4)));
}

// ── §9 · a week nobody won ────────────────────────────────────────────────────────────────────────────────────────
section("§9 · a week nobody won: the rollover");
const P3 = await W.user({ balance: 20_000 });
const b3 = await W.buy(P3, B.id, [W.LOSE, W.LOSE], { key: "player-p3-b-0001" });
const salesB = (await P.maswaliPoolFigure(B.id)).sales;
const carryB = (await P.maswaliPoolFigure(B.id)).carryIn;
const releasedB = await W.release(B.id, await W.closeAndSeal(B, bStart));
ok("9.1 · the week settled with no ten of ten", b3.ok && releasedB.ok && (await dal.weekStore.get(B.id)).winningTickets === 0, `${why(b3)} · ${why(releasedB)}`);
{
  const r = (await P.millioneaRegister({ perPage: 12 })).rows.find((w: any) => w.id === B.id);
  ok("9.2 · ⭐ the register states what was carried to the next week: R + S, the whole pool, and no fee (MR-21, MR-28)",
    !!r && r.winners === 0 && r.jackpot === null && r.fee === 0 && r.carriedForward === carryB + salesB, J(r));
  const roll = (await P.millioneaNotices(P1)).find((n: any) => n.notice === "ROLLOVER");
  ok("9.3 · the hub's rollover notice, past tense, to every reader once (M7): the week, the amount, no next week opened yet",
    J(roll) === J({ notice: "ROLLOVER", weekId: B.id, code: B.code, carriedForward: carryB + salesB, nextWeekCode: null }), J(roll));
  const v = await P.millioneaTicket(P3, b3.data.maswali.tickets[0].serial);
  ok("9.4 · ⛔ the losing ticket says the pool was carried, never how much (OD-24: the figure lives on the public week page)",
    v.shown === "lost" && J(v.loss) === J({ winners: 0, carriedForward: true, nextWeekCode: null }) && v.win === null && v.paid === null && v.share === null
      && !("carriedOut" in v) && !("jackpot" in v), J(v.loss));
  const marked = await ACT.markMillioneaNoticeSeenFor(P1, B.id, "ROLLOVER", (await P.millioneaHub(viewer(P1))).asOf, ACTIVE);
  ok("9.5 · seen, the rollover notice rests for that reader", marked === true && !(await P.millioneaNotices(P1)).some((n: any) => n.notice === "ROLLOVER")
    && (await P.millioneaNotices(P3)).some((n: any) => n.notice === "ROLLOVER"));
  const h = await P.millioneaHub(viewer(P1));
  ok("9.6 · with no public week on sale, the hub states when the next one opens by the template — and has no pre-sale (MB-84)",
    h.week === null && typeof h.nextOpensAt === "string" && Date.parse(h.nextOpensAt) > Date.now() && h.lastWeek?.id === B.id, J({ next: h.nextOpensAt }));
}

// ── §10 · a week voided whole ─────────────────────────────────────────────────────────────────────────────────────
section("§10 · a week voided whole: its refunds pending, then landed");
const { week: V, start: vStart } = await W.openWeek({ weeksAhead: 4 });
const P4 = await W.user({ balance: 20_000 });
const b4 = await W.buy(P4, V.id, [W.WIN, W.LOSE], { key: "player-p4-v-0001" });
const v4Serial: string = b4.ok ? b4.data.maswali.tickets[0].serial : "";
await W.svc.closeWeek({ weekId: V.id, now: new Date(Date.parse(V.closesAt) + 60_000) });
for (let slot = 1; slot <= 15; slot++) {
  await W.svc.sealQuestion({ weekId: V.id, slot, outcome: "VOID", voidReason: "not_played", evidence: `Event ${slot} was not played at all`, officerId: SEALER, now: new Date(vStart + 9 * DAY) });
}
// ⏸ THE VOID HELD AT ITS REFUNDS, BY ITS OWN LOCK — no row is forged. The void stamps the week VOIDED under the chain lock,
// then takes the week's market lock to refund; this suite holds that lock first, so the stamp commits and every refund
// waits — exactly a void whose refunds have not run yet (the void lane retries them). Released, the void completes.
let releaseRefunds!: () => void;
const refundsGate = new Promise<void>((r) => { releaseRefunds = r; });
let lockTaken!: () => void;
const lockHeld = new Promise<void>((r) => { lockTaken = r; });
const holding = withLock(`market:${V.marketId}`, async () => { lockTaken(); await refundsGate; });
await lockHeld;
const voiding = W.svc.voidWeek({ weekId: V.id, now: new Date(Date.parse((await dal.weekStore.get(V.id)).objectionsCloseAt) + 60_000) });
for (let i = 0; i < 500 && (await dal.weekStore.get(V.id)).state !== "VOIDED"; i++) await sleep(10);
{
  const stamped = (await dal.weekStore.get(V.id)).state;
  const v = await P.millioneaTicket(P4, v4Serial);
  ok("10.0a · the population is real: the week is stamped VOIDED while its refunds wait, and the ticket's position is still open",
    stamped === "VOIDED" && (await W.w.mdal.positionStore.get(v?.positionId))?.status === "OPEN", stamped);
  ok("10.0b · ⭐ M3 · the ticket does NOT claim a refund from the week's stamp: it reads Pending ('running'), its refund pending, no refund fact, nothing it could still win",
    !!v && v.shown === "running" && J(v.refund) === J({ state: "pending" }) && !v.seen.unseen.some((f: any) => f.kind === "refund")
      && v.cannotWinSoFar === false && J(v.weekVoid) === J({ voidedMains: 10, usableReserves: 0, price }), J(v && { shown: v.shown, refund: v.refund }));
  const rows = (await P.millioneaMyTickets(P4, { perPage: 12 })).rows.find((w: any) => w.week.id === V.id)?.tickets ?? [];
  ok("10.0c · ⭐ M3 · …and so does every row of Tiketi zangu", rows.length === 2 && rows.every((r: any) => r.shown === "running" && r.refund?.state === "pending"), J(rows.map((r: any) => [r.shown, r.refund])));
  const due = await P.millioneaNotices(P4);
  const tooEarly = await ACT.markMillioneaNoticeSeenFor(P4, V.id, "WEEK_VOID", new Date().toISOString(), ACTIVE);
  ok("10.0d · ⛔ M3 · no week-void notice while a refund is pending (it says the tickets came back), and it cannot be put to rest before it is true",
    !due.some((n: any) => n.notice === "WEEK_VOID") && tooEarly === false, J({ due, tooEarly }));
  const closure = await P.millioneaClosureTickets(P4);
  ok("10.0e · ⭐ M3 · the closure screen lists both tickets as money still out: refund pending",
    closure.length === 2 && closure.every((t: any) => t.weekState === "VOIDED" && t.refundPending === true && t.shown === "running"), J(closure));
  const reg = (await P.millioneaRegister({ perPage: 12 })).rows.find((w: any) => w.id === V.id);
  const hubV = await P.millioneaHub(viewer(P4));
  ok("10.0f · ⭐ M3 · the register and the hub's last week say the week's refunds are pending — never 'every ticket refunded' before it is so",
    reg?.state === "VOIDED" && reg.refundsPending === true && hubV.lastWeek?.id === V.id && hubV.lastWeek.refundsPending === true, J({ reg, last: hubV.lastWeek }));
}
releaseRefunds();
await holding;
const voided = await voiding;
ok("10.1 · released, the week voided whole (MR-18)", b4.ok && voided.ok && voided.week.state === "VOIDED", voided.ok ? voided.week.state : voided.error);
{
  const v = await P.millioneaTicket(P4, v4Serial);
  ok("10.2 · ⭐ the ticket reads refunded once THIS refund landed: what came back and when, the refund fact unseen, why the week voided",
    v.shown === "refunded" && v.refund?.state === "landed" && v.refund.amount === price && !!v.refund.at && J(v.weekVoid) === J({ voidedMains: 10, usableReserves: 0, price })
      && v.seen.unseen.some((f: any) => f.kind === "refund") && v.win === null && v.loss === null, J({ refund: v.refund, weekVoid: v.weekVoid }));
  const n = (await P.millioneaNotices(P4)).find((x: any) => x.notice === "WEEK_VOID");
  ok("10.3 · the holder's week-void notice, now true: the tickets, and the whole price of each, landed", J(n) === J({ notice: "WEEK_VOID", weekId: V.id, code: V.code, tickets: 2, refunded: 2 * price }), J(n));
  const r = (await P.millioneaRegister({ perPage: 12 })).rows.find((w: any) => w.id === V.id);
  ok("10.4 · the register lists the voided week with no money figures and its refunds done: the carry is untouched and waits for the next week",
    !!r && r.state === "VOIDED" && r.carriedForward === null && r.jackpot === null && r.winners === null && r.refundsPending === false, J(r));
  ok("10.5 · ⛔ the closure screen no longer lists a refunded ticket (its money is back)", (await P.millioneaClosureTickets(P4)).length === 0);
  const rows = (await P.millioneaMyTickets(P4, { perPage: 12 })).rows.find((w: any) => w.week.id === V.id)?.tickets ?? [];
  ok("10.6 · …and every row of Tiketi zangu reads refunded, each with its own landed refund", rows.length === 2
    && rows.every((x: any) => x.shown === "refunded" && x.refund?.state === "landed" && x.refund.amount === price), J(rows.map((x: any) => [x.shown, x.refund])));
}

// ── §11 · the exclusions, the wiring, the floor, the seen marks' budget ───────────────────────────────────────────
section("§11 · the exclusions, the wiring, the floor, the seen marks' budget");
{
  const ticketsOfP1 = await market.listPositionsForUser(P1, 200, "MASWALI");
  ok("11.1 · the population is real: an account's tickets are positions on the MASWALI line — exactly its three (both stores)",
    ticketsOfP1.length === 3 && ticketsOfP1.every((p: any) => p1Tickets.some((t: any) => t.positionId === p.id)), J(ticketsOfP1.map((p: any) => p.id)));
  const { computeAchievementShelf }: any = await import("../../src/lib/server/achievements.ts");
  const shelf = await computeAchievementShelf(P1);
  const state = (id: string) => shelf.find((b: any) => b.achievement === id)?.state;
  ok("11.3 · ⭐ achievements: two jackpot shares are not a 'First Win' and three tickets are not a 'First Prediction' (MB-90)",
    state("first-win") === "locked" && state("first-prediction") === "locked", J(shelf.map((b: any) => [b.achievement, b.state])));
  const P6 = await W.user({ balance: 50_000 });
  const poll = await W.w.poll({ graceMin: 5 });
  const bet = await market.buyPosition(P6, { marketId: poll.id, side: "YES", stake: 1_000 });
  const t6 = await W.buy(P6, D.id, [W.LOSE], { key: "player-p6-d-0001" });
  // The board's per-row reads, as the page makes them on the "all" lens, on this store: each scored line, directly.
  const readsOf = (userId: string, bound: number) => Promise.all(SCORED_LINES.map((l: string) => market.listPositionsForUser(userId, bound, l)));
  const scored = scoredPositions(await readsOf(P6, 200), 200);
  const betId = bet.ok ? bet.data.positionId : "";
  const polls6 = await market.listPositionsForUser(P6, 200, "MARKET");
  ok("11.2 · ⭐ the board's streak and sparkline walk the scored lines — every line but Millionea's, read directly: a player with a poll bet and a ticket is scored on the bet alone; a failed read leaves the row undecorated; a single-product lens passes through",
    bet.ok && t6.ok && !SCORED_LINES.includes("MASWALI") && SCORED_LINES.includes("MARKET") && SCORED_LINES.includes("UPDOWN")
      && J(scored.map((p: any) => p.id)) === J([betId]) && J(scoredPositions([polls6, null], 200)) === J([]) && J(scoredPositions([polls6], 200)) === J(polls6),
    J({ lines: SCORED_LINES, scored: scored.map((p: any) => p.id) }));
  const board = readFileSync("src/app/leaderboard/page.tsx", "utf8");
  const shelfSrc = readFileSync("src/lib/server/achievements.ts", "utf8");
  // ⚠️ RE-PINNED, MASWALI-BUILD S5-FIX-PLATFORM D7 (2026-10-21): the board makes ONE read per row — on "all" the store's
  // scored read (`listScoredForUser`: tickets left out by the read, before its bound; 11.2e drives it on this store), on a
  // lens its one line — where it made one per scored line (up to twice main's rows). The shelf keeps its direct lines.
  ok("11.2a · …and that read is what the page hands its streak and its sparkline, and what the shelf counts (the wiring): one scored read per board row at its bound, each scored line for the shelf, and ⛔ no ticket read left to subtract",
    board.includes('positions: await Promise.resolve(lens === "ALL" ? positionStore.listScoredForUser(r.userId, ROW_RECENT) : listPositionsForUser(r.userId, ROW_RECENT, lens)).catch(() => null),')
      && board.includes("const positions = detail[i].positions ?? [];")
      && board.includes('for (const p of positions.filter((p) => p.status !== "OPEN"))') && board.includes("spark: dailyStakes(positions, 14)")
      && shelfSrc.includes("const positions = scoredPositions(await Promise.all(SCORED_LINES.map((l) => listPositionsForUser(userId, SHELF_RECENT, l))), SHELF_RECENT);")
      && !board.includes('"MASWALI"') && !shelfSrc.includes('"MASWALI"'));
  // RR8 · the window a page of every line less its tickets lost: an account whose newest positions are all tickets. At a
  // bound of two (the board's 200 and the shelf's 500 at their own sizes): an older poll bet, then two newer tickets.
  const PW = await W.user({ balance: 50_000 });
  const pollW = await W.w.poll({ graceMin: 5 });
  const betW = await market.buyPosition(PW, { marketId: pollW.id, side: "YES", stake: 1_000 });
  const betWId = betW.ok ? betW.data.positionId : "";
  if (betW.ok) await W.backdate(betWId, 60 * 60_000);
  const tW = await W.buy(PW, D.id, [W.LOSE, W.LOSE], { key: "player-pw-d-0001" });
  const everyLine = await market.listPositionsForUser(PW, 2, "ALL");
  const ticketIdsW = new Set((await market.listPositionsForUser(PW, 2, "MASWALI")).map((p: any) => p.id));
  const bySubtraction = everyLine.filter((p: any) => !ticketIdsW.has(p.id));
  const directW = scoredPositions(await readsOf(PW, 2), 2);
  ok("11.2b · ⭐ RR8 · an account whose newest positions are all tickets keeps its prediction: every line less its tickets held nothing at the bound (the population is real), the direct read of the scored lines holds the older poll bet",
    betW.ok && tW.ok && everyLine.length === 2 && everyLine.every((p: any) => ticketIdsW.has(p.id)) && bySubtraction.length === 0
      && J(directW.map((p: any) => p.id)) === J([betWId]),
    J({ everyLine: everyLine.map((p: any) => p.id), direct: directW.map((p: any) => p.id) }));
  // RR8 · the control: an account with no tickets reads exactly its old every-line page, so nothing it shows moves.
  const PN = await W.user({ balance: 50_000 });
  const pollN1 = await W.w.poll({ graceMin: 5 }), pollN2 = await W.w.poll({ graceMin: 5 });
  const n1 = await market.buyPosition(PN, { marketId: pollN1.id, side: "YES", stake: 1_000 });
  await sleep(5);
  const n2 = await market.buyPosition(PN, { marketId: pollN2.id, side: "NO", stake: 1_000 });
  const oldBoard = await market.listPositionsForUser(PN, 200, "ALL");
  const oldShelf = await market.listPositionsForUser(PN, 500);
  ok("11.2c · ⭐ RR8 · the control: for an account with no tickets the direct read IS its old every-line page, row for row — the board's 200 and the shelf's 500 alike — so its streak, sparkline and badges are byte-identical",
    n1.ok && n2.ok && oldBoard.length === 2 && J(scoredPositions(await readsOf(PN, 200), 200)) === J(oldBoard)
      && J(scoredPositions(await readsOf(PN, 500), 500)) === J(oldShelf), J({ old: oldBoard.map((p: any) => p.id) }));
  // S5-FIX-PLATFORM D7 · the board's ONE read, on this store: the same answers as the per-line reads above, in one query.
  {
    const { positionStore }: any = await import("../../src/lib/server/market-dal.ts");
    const one6 = await positionStore.listScoredForUser(P6, 200);
    const oneW = await positionStore.listScoredForUser(PW, 2);
    const oneN = await positionStore.listScoredForUser(PN, 200);
    ok("11.2e · ⭐ the store's scored read (the board's one read per row): a bet and a ticket give the bet alone; RR8's newest-tickets account keeps its older poll bet at a bound of two (the tickets are left out BEFORE the bound); an account with no tickets reads its every-line page row for row (main's read) — each equal to the per-line reads it replaces",
      bet.ok && betW.ok && J(one6.map((p: any) => p.id)) === J([betId]) && J(one6) === J(scored)
        && J(oneW.map((p: any) => p.id)) === J([betWId]) && J(oneW) === J(directW)
        && J(oneN) === J(oldBoard),
      J({ p6: one6.map((p: any) => p.id), pw: oneW.map((p: any) => p.id), pn: oneN.map((p: any) => p.id), old: oldBoard.map((p: any) => p.id) }));
  }
  const pos = (id: string, ms: number) => ({ id, placedAt: new Date(Date.UTC(2026, 9, 1) + ms).toISOString() });
  ok("11.2d · RR8 · the lines' reads merge newest first and are cut at the bound — the account's newest scored positions across lines",
    J(scoredPositions([[pos("m3", 30), pos("m1", 10)], [pos("u4", 40), pos("u2", 20)]], 3).map((p: any) => p.id)) === J(["u4", "m3", "u2"]));
  const shelf6 = await computeAchievementShelf(P6);
  ok("11.4 · …while a Yes/No bet still is a first prediction, a ticket beside it notwithstanding (the control)",
    bet.ok && shelf6.find((b: any) => b.achievement === "first-prediction")?.state === "unlocked", why(bet));

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

  // ── the floor (MB-56), with a FIXTURE OF A FAULT: the guarantee drained below its requirement by the return
  // ceremony's own ledger lines, its requirement check skipped — the state no product door can reach, made to prove the
  // headline fails closed in it, and funded back at once.
  const fD = await P.maswaliPoolFigure(D.id);
  ok("11.10 · the drive week's headline: its own jackpot (OD-21), the floor shown while the guarantee covers every unsettled week",
    !!fD && fD.floor === floor && fD.jackpot === Math.max(floor, (fD.carryIn ?? 0) + fD.sales) && fD.atLeast === false, J(fD));
  const held = await W.balanceOf(acct.maswaliGuarantee);
  const unsettled = await dal.weekStore.list({ states: ["OPEN", "CLOSED", "RESOLVING"] });
  const need = guaranteeRequirement(unsettled.map((w: any) => ({ floor: W.svc.frozenRules(w)?.floorTzs ?? 0, confirmedCarryIn: w.rolloverIn })));
  const drain = held - (need - 1);
  await withLock("maswali:chain", () => ledger.withMoneyTx(async (tx: any) => money.postMaswaliLines("maswali_test_drain_player",
    ledger.maswaliGuaranteeReturnEntries({ amount: drain, reference: "TEST-FAULT-DRAIN", actorId: OWNER }), tx)));
  const short = await P.maswaliPoolFigure(D.id);
  ok("11.11 · ⛔ a guarantee short of its requirement shows no floor: the headline falls to R + S (MB-56, fail closed)",
    (await W.balanceOf(acct.maswaliGuarantee)) === need - 1 && !!short && short.floor === null && short.jackpot === (short.carryIn ?? 0) + short.sales, J(short));
  const refund = await money.fundMaswaliGuarantee({ amount: drain, reference: "TEST-FAULT-REFILL", typed: money.GUARANTEE_FUND_WORD, ownerId: OWNER });
  ok("11.12 · …and funded again, the floor returns", refund.ok && (await P.maswaliPoolFigure(D.id))?.floor === floor, why(refund));

  // ── L7 · the seen marks are rate-limited per account, like every other player act.
  const budget: number = RATE_RULES["millionea.seen"]?.capacity ?? 0;
  const PR = await W.user({ balance: 20_000 });
  const PQ = await W.user({ balance: 20_000 });
  const br = await W.buy(PR, D.id, [W.LOSE, W.LOSE], { key: "player-pr-d-0001" });
  const bq = await W.buy(PQ, D.id, [W.LOSE], { key: "player-pq-d-0001" });
  const [rx, ry] = br.ok ? br.data.maswali.tickets.map((t: any) => t.serial) : ["", ""];
  const vx = await P.millioneaTicket(PR, rx);
  const first = await ACT.markMillioneaTicketSeenFor(PR, rx, vx?.seen.through);
  for (let i = 0; i < budget + 2; i++) await ACT.markMillioneaTicketSeenFor(PR, "nope", "x");
  const vy = await P.millioneaTicket(PR, ry);
  const throttled = await ACT.markMillioneaTicketSeenFor(PR, ry, vy?.seen.through);
  const throttledNotice = await ACT.markMillioneaNoticeSeenFor(PR, V.id, "WEEK_VOID", new Date().toISOString(), ACTIVE);
  ok("11.15 · ⭐ L7 · the seen marks spend a per-account budget (a declared rule): the account's own good mark records, and once its budget is spent the next good mark records nothing — the fact simply performs again next time",
    budget > 0 && br.ok && first === true && throttled === false && throttledNotice === false && (await dal.ticketStore.getBySerial(ry)).lastViewedAt === null,
    J({ budget, first, throttled, throttledNotice }));
  const qSerial = bq.ok ? bq.data.maswali.tickets[0].serial : "";
  const vq = await P.millioneaTicket(PQ, qSerial);
  ok("11.16 · …and the budget is the account's own: another account's good mark still records (the control)",
    bq.ok && (await ACT.markMillioneaTicketSeenFor(PQ, qSerial, vq?.seen.through)) === true, why(bq));
}

// ── a held share reaches the closure screen (it holds the winner's wallet, so it runs after §11's purchases) ──────────
{
  const hold = await W.settle.holdMaswaliShare({ ticketId: p1Win1.id, officerId: "usr_mln_compliance", reason: "player suite review of a share" });
  const closure = await P.millioneaClosureTickets(P1);
  ok("11.13 · ⭐ the closure screen lists a winning share held for review — money the account still has riding (MB-44)",
    hold.ok && closure.length === 1 && closure[0].serial === p1Win1.serial && closure[0].heldForReview === true && closure[0].shown === "won"
      && closure[0].refundPending === false, J(closure));
}

// ── side-label's MASWALI arm (reads the `millionea` dictionary namespace, mln-s5-ui's) ───────────────────────────────
{
  const { positionStatusWord, positionOutcomeWord }: any = await import("../../src/lib/side-label.ts");
  const { dict }: any = await import("../../src/lib/i18n-dict.ts");
  let words: any[] = [];
  try {
    words = ["en", "sw", "zh"].map((l) => ({
      want: dict[l].millionea?.ticketCancelled, cashedOut: dict[l].common.cashedOut,
      chip: positionStatusWord(dict[l], "CASHED_OUT", "MASWALI"), pill: positionOutcomeWord(dict[l], "CASHED_OUT", "MASWALI"),
      poll: positionStatusWord(dict[l], "CASHED_OUT", "MARKET"),
      open: positionStatusWord(dict[l], "OPEN", "MASWALI"), pollOpen: positionStatusWord(dict[l], "OPEN", "MARKET"),
    }));
  } catch (e) { words = [{ threw: String(e) }]; }
  ok("11.14 · side-label's MASWALI arm: a cancelled ticket reads Millionea's own word in every language (v6 manifest L11) — chip and pill alike — while a poll keeps 'cashed out' and every other state stays the poll's",
    words.length === 3 && words.every((w: any) => typeof w.want === "string" && w.want.length > 0 && w.chip === w.want && w.pill === w.want
      && w.poll === w.cashedOut && w.open === w.pollOpen), J(words));
}

// ── §12 · a won share as Compliance leaves it (M2) ─────────────────────────────────────────────────────────────────
section("§12 · a won share: held, forfeited, released");
const { week: H, start: hStart } = await W.openWeek({ weeksAhead: 5 });
{
  // S5-FIX-PLAYER P9 · H's carry came from B, across the voided V (MR-18: V handed nothing on): the chain's week, never H − 1.
  const fH = await P.maswaliPoolFigure(H.id);
  ok("12.0 · ⭐ P9 · the week after a voided one names its carry's true source: H's pool carried in from B (V, between them, voided)",
    !!fH && (fH.carryIn ?? 0) > 0 && fH.carryPendingCode === null && fH.carryFromCode === B.code, J(fH && { carryIn: fH.carryIn, from: fH.carryFromCode, B: B.code, V: V.code }));
}
const PH = await W.user({ balance: 50_000 });
const PL = await W.user({ balance: 10_000 });
const bh = await W.buy(PH, H.id, [W.WIN, W.WIN, W.WIN], { key: "player-ph-h-0001" });
const bl = await W.buy(PL, H.id, [W.LOSE], { key: "player-pl-h-0001" });
const releasedH = await W.release(H.id, await W.closeAndSeal(H, hStart));
const [h1, h2, h3] = (await dal.ticketStore.listForUser(PH, { cycleId: H.id })).sort((a: any, b: any) => a.serial.localeCompare(b.serial));
const shareH: number = (await dal.weekStore.get(H.id))?.sharePerTicket ?? 0;
ok("12.1 · the week settled with three winning tickets, all one player's", bh.ok && bl.ok && releasedH.ok && [h1, h2, h3].every((t: any) => t?.won === true) && shareH > 0,
  `${why(bh)} · ${why(releasedH)} · ${shareH}`);
const hold1 = await W.settle.holdMaswaliShare({ ticketId: h1.id, officerId: "usr_mln_compliance", reason: "player suite holds a share" });
const hold2 = await W.settle.holdMaswaliShare({ ticketId: h2.id, officerId: "usr_mln_compliance", reason: "player suite holds a second share" });
const forfeit2 = await W.settle.forfeitMaswaliShare({ ticketId: h2.id, officerId: "usr_mln_compliance", typed: W.settle.FORFEIT_SHARE_WORD, reason: "player suite forfeits the second share" });
{
  const rows = (await P.millioneaMyTickets(PH, { perPage: 12 })).rows.find((w: any) => w.week.id === H.id)?.tickets ?? [];
  const row = (serial: string) => rows.find((r: any) => r.serial === serial);
  ok("12.2 · ⭐ M2 · a held share shows its hold mark — never gold: no `paid` figure", hold1.ok && row(h1.serial)?.shown === "won" && row(h1.serial)?.share === "held" && row(h1.serial)?.paid === null,
    J(row(h1.serial) && { shown: row(h1.serial).shown, share: row(h1.serial).share, paid: row(h1.serial).paid }));
  ok("12.3 · ⭐ M2 · a forfeited share shows no gold and no `paid`", hold2.ok && forfeit2.ok && row(h2.serial)?.share === "forfeited" && row(h2.serial)?.paid === null,
    `${why(forfeit2)} · ${J(row(h2.serial) && { share: row(h2.serial).share, paid: row(h2.serial).paid })}`);
  ok("12.4 · …while the untouched share is the player's: paid, to the shilling", row(h3.serial)?.share === "paid" && row(h3.serial)?.paid === shareH, J(row(h3.serial)?.paid));
  const v3 = await P.millioneaTicket(PH, h3.serial);
  ok("12.5 · ⭐ M2 · the win ledger's own lines leave both out: one winning ticket of the player's own, its share alone as the total — and one held, one forfeited, with no amount",
    v3.win?.yourWinningTickets === 1 && v3.win.yourTotal === shareH && v3.win.yourHeldTickets === 1 && v3.win.yourForfeitedTickets === 1, J(v3.win));
  const n = (await P.millioneaNotices(PH)).find((x: any) => x.notice === "RESULT" && x.weekId === H.id);
  ok("12.6 · ⭐ M2 · the week's RESULT notice too: won, one paid ticket and its total — the held and the forfeited counted apart, with no amount",
    J(n) === J({ notice: "RESULT", weekId: H.id, code: H.code, won: true, winningTickets: 1, total: shareH, held: 1, forfeited: 1 }), J(n));
  ok("12.7 · ⛔ the officer's reasons never reach the player's surfaces", ![J(rows), J(v3), J(n)].some((s) => s.includes("player suite")));
}
const release1 = await W.settle.releaseMaswaliShare({ ticketId: h1.id, officerId: "usr_mln_compliance", note: "player suite releases the first share" });
{
  const rows = (await P.millioneaMyTickets(PH, { perPage: 12 })).rows.find((w: any) => w.week.id === H.id)?.tickets ?? [];
  const r1 = rows.find((r: any) => r.serial === h1.serial);
  const v1 = await P.millioneaTicket(PH, h1.serial);
  const n = (await P.millioneaNotices(PH)).find((x: any) => x.notice === "RESULT" && x.weekId === H.id);
  ok("12.8 · ⭐ M2 · released, the share is the player's: paid, gold, and back in every total — the forfeited one still out",
    release1.ok && r1?.share === "paid" && r1.paid === shareH && v1.win?.yourWinningTickets === 2 && v1.win.yourTotal === 2 * shareH
      && v1.win.yourHeldTickets === 0 && v1.win.yourForfeitedTickets === 1 && n?.winningTickets === 2 && n.total === 2 * shareH && n.held === 0 && n.forfeited === 1,
    `${why(release1)} · ${J({ share: r1?.share, win: v1.win, n })}`);
}

{
  // P9 · the register names the chain's weeks: B's pool went to H (V skipped), V's untouched carry waited for H, H's came from B.
  const [rB, rV, rH] = await Promise.all([P.millioneaRegisterWeek(B.code), P.millioneaRegisterWeek(V.code), P.millioneaRegisterWeek(H.code)]);
  ok("12.9 · ⭐ P9 · the register's carry weeks are the calendar chain's: B carried forward to H and V's carry waited for H (never the voided V, never B + 1), and H carried in from B",
    rB?.carryToCode === H.code && rV?.carryToCode === H.code && rH?.carryFromCode === B.code && (rH?.carryIn ?? 0) > 0,
    J({ B: rB?.carryToCode, V: rV?.carryToCode, H: rH?.carryFromCode, codes: [B.code, V.code, H.code] }));
}

// ── §12b · the re-review: the calendar, never the drafting order (RR1); a held or forfeited share is not `won` (RR3);
//    pages with a total (RR4); the seen mark forward-only (RR5), never throwing (RR6), at every rollout state (L5); the
//    cancel's own session check (RR7) ─────────────────────────────────────────────────────────────────────────────────
section("§12b · the re-review: calendar order, pages with a total, held and forfeited shares, the seen mark, the cancel's session");
// R3.1's own fixture, through the product's own doors: the LATER calendar week is drafted FIRST (the lower `seq`), the
// earlier one second. The earlier opens, sells and closes; then the later one opens and sells; both are sealed.
const startE = W.weekStartAhead(7), startL = W.weekStartAhead(8);
const draftAttested = async (start: number) => {
  const c = await W.svc.createWeek({ weekStartMs: start, questions: W.questions(start), officerId: DRAFTER, now: new Date(start - 3 * DAY) });
  if (!c.ok) throw new Error(`§12b: the draft was refused: ${c.error}`);
  const a = await W.svc.attestParity({ weekId: c.week.id, officerId: READER, readVersion: await W.svc.readDraftVersion(c.week.id) });
  if (!a.ok) throw new Error(`§12b: the attestation was refused: ${a.error}`);
  return c.week;
};
const opened = async (week: any, start: number) => {
  const o = await W.svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(start + 60_000) });
  if (!o.ok) throw new Error(`§12b: the week did not open: ${o.error}`);
  return o.week;
};
const lateDraft = await draftAttested(startL);
const earlyDraft = await draftAttested(startE);
const E = await opened(earlyDraft, startE);
const priceE: number = W.svc.frozenRules(E).ticketPriceTzs;
const PX = await W.user({ balance: 50_000 }), PS = await W.user({ balance: 20_000 }), PF = await W.user({ balance: 20_000 });
const PK = await W.user({ balance: 20_000 }), PC = await W.user({ balance: 20_000 }), PZ = await W.user({ balance: 20_000 });
const bxE = await W.buy(PX, E.id, [W.WIN, W.LOSE], { key: "player-px-e-0001" });
const bsE = await W.buy(PS, E.id, [W.LOSE], { key: "player-ps-e-0001" });
const bfE = await W.buy(PF, E.id, [W.WIN], { key: "player-pf-e-0001" });
const bkE = await W.buy(PK, E.id, [W.WIN], { key: "player-pk-e-0001" });
const bcE = await W.buy(PC, E.id, [W.LOSE], { key: "player-pc-e-0001" });
const cSerial: string = bcE.ok ? bcE.data.maswali.tickets[0].serial : "";
{
  // RR7 · while the earlier week sells: a page drawn for PC, posted from another account's session.
  const strangerC = await W.user({ balance: 0 });
  const balC = (await W.bal(PC)).balance;
  const changed = await ACT.cancelMillioneaFromForm(strangerC, form({ serial: cSerial, expectedOwnerId: PC }));
  const nobodys = await ACT.cancelMillioneaFromForm(strangerC, form({ serial: `${E.code}-999999`, expectedOwnerId: PC }));
  ok("12b.1 · ⭐ RR7 · a cancel posted from a page drawn for another account answers the buy's own session_changed — reload, never 'we couldn't find that ticket' — asked before any ticket is read (a serial nobody holds answers alike), the ticket and its money untouched",
    bcE.ok && !changed.ok && changed.reason === "session_changed" && changed.code === "CONFLICT" && J(nobodys) === J(changed)
      && (await dal.ticketStore.getBySerial(cSerial)).status === "LIVE" && (await W.bal(PC)).balance === balC, `${why(changed)} · ${why(nobodys)}`);
  const strangerOwn = await ACT.cancelMillioneaFromForm(strangerC, form({ serial: cSerial, expectedOwnerId: strangerC }));
  const own = await ACT.cancelMillioneaFromForm(PC, form({ serial: cSerial, expectedOwnerId: PC }));
  ok("12b.2 · …the control: the field naming the session itself changes nothing — a stranger still meets the one not-found refusal (MB-95), and the owner's cancel lands in full",
    shapeOf(strangerOwn) === NOT_FOUND_SHAPE && own.ok && own.data.refunded === priceE && (await W.bal(PC)).balance === balC + priceE
      && (await dal.ticketStore.getBySerial(cSerial)).status === "CANCELLED", `${why(strangerOwn)} · ${why(own)}`);
}
await W.svc.closeWeek({ weekId: E.id, now: new Date(Date.parse(E.closesAt) + 60_000) });
const L = await opened(lateDraft, startL);
const bxL = await W.buy(PX, L.id, [W.LOSE], { key: "player-px-l-0001" });
const bzL = await W.buy(PZ, L.id, [W.LOSE], { key: "player-pz-l-0001" });
const atE = await W.closeAndSeal(E, startE);
const atL = await W.closeAndSeal(L, startL);
{
  const hub = await P.millioneaHub(viewer(PX));
  const how = await P.millioneaHowTo(viewer(null));
  ok("12b.3 · the population is real: the later week was drafted first (the lower seq), both weeks are being graded, and no public week sells",
    bxE.ok && bsE.ok && bfE.ok && bkE.ok && bxL.ok && bzL.ok && lateDraft.seq < earlyDraft.seq
      && (await dal.weekStore.get(E.id)).state === "RESOLVING" && (await dal.weekStore.get(L.id)).state === "RESOLVING" && (await dal.weekStore.openFor("PUBLIC")) === null,
    J({ lateSeq: lateDraft.seq, earlySeq: earlyDraft.seq }));
  ok("12b.4 · ⭐ RR1 · with two weeks being graded, the hub leads with the newest IN THE CALENDAR and the how-to reads that week's frozen rules — never the one drafted last",
    hub.week?.id === L.id && how.source === "WEEK" && how.weekCode === L.code, J({ hub: hub.week?.code, how: how.weekCode }));
  ok("12b.4a · ⭐ P8 · the newest final week (H) is NOT \"last week\" while the week right before the hub's own (E) is still being graded",
    hub.lastWeek?.id === H.id && hub.lastWeekIsPrevious === false, J({ last: hub.lastWeek?.code, previous: hub.lastWeekIsPrevious }));
  const vL = await P.millioneaTicket(PX, (await dal.ticketStore.listForUser(PX, { cycleId: L.id }))[0].serial);
  ok("12b.5 · RR2's control: outside the final week, a ticket with a miss reads 'cannot win on the results so far' (provisional)",
    vL.week.isFinal === false && vL.shown === "running" && vL.cannotWinSoFar === true, J({ isFinal: vL.week.isFinal, cannot: vL.cannotWinSoFar }));
}
const rE = await W.release(E.id, atE);
const rL = await W.release(L.id, atL);
// RR3 · Compliance leaves PK's only winning share HELD, and FORFEITS PF's only one (OD-07).
const tPK = (await dal.ticketStore.listForUser(PK, { cycleId: E.id }))[0];
const tPF = (await dal.ticketStore.listForUser(PF, { cycleId: E.id }))[0];
const holdK = await W.settle.holdMaswaliShare({ ticketId: tPK.id, officerId: "usr_mln_compliance", reason: "player suite holds the only share" });
const holdF = await W.settle.holdMaswaliShare({ ticketId: tPF.id, officerId: "usr_mln_compliance", reason: "player suite holds a share to forfeit" });
const forfeitF = await W.settle.forfeitMaswaliShare({ ticketId: tPF.id, officerId: "usr_mln_compliance", typed: W.settle.FORFEIT_SHARE_WORD, reason: "player suite forfeits the only share" });
{
  const Ls = await dal.weekStore.get(L.id);
  const pxE = await dal.ticketStore.listForUser(PX, { cycleId: E.id });
  const exLose = pxE.find((t: any) => t.won === false);
  const lxSerial = (await dal.ticketStore.listForUser(PX, { cycleId: L.id }))[0].serial;
  const lossE = (await P.millioneaTicket(PX, exLose.serial)).loss;
  const lossL = (await P.millioneaTicket(PX, lxSerial)).loss;
  ok("12b.6 · ⭐ RR1 · a losing ticket's line names the NEXT week in the calendar: the earlier week's names the later one; the later week's, with no week after it opened, names none — never the week before it, already settled",
    rE.ok && rL.ok && J(lossE) === J({ winners: 3, carriedForward: false, nextWeekCode: L.code }) && J(lossL) === J({ winners: 0, carriedForward: true, nextWeekCode: null }),
    `${why(rE)} · ${why(rL)} · ${J({ lossE, lossL })}`);
  const nx = await P.millioneaNotices(PX);
  ok("12b.7 · ⭐ RR1 · the rollover notice speaks of the latest week IN THE CALENDAR — the later week, which nobody won — and names no next week yet; the notices run newest week first",
    J(nx.find((n: any) => n.notice === "ROLLOVER")) === J({ notice: "ROLLOVER", weekId: L.id, code: L.code, carriedForward: (Ls.rolloverIn ?? 0) + (Ls.carryOut ?? 0), nextWeekCode: null })
      && J(nx.map((n: any) => [n.notice, n.code])) === J([["ROLLOVER", L.code], ["RESULT", L.code], ["RESULT", E.code]]), J(nx));
  const hub = await P.millioneaHub(viewer(PX));
  ok("12b.8 · ⭐ RR1 · the hub's 'last week' is the newest final week in the calendar, never the one drafted last", hub.week === null && hub.lastWeek?.id === L.id,
    J({ last: hub.lastWeek?.code }));
  const codes = (p: any) => p.rows.map((w: any) => w.code);
  const p1 = await P.millioneaRegister({ page: 1, perPage: 4 });
  const p2 = await P.millioneaRegister({ page: 2, perPage: 4 });
  const p9 = await P.millioneaRegister({ page: 9, perPage: 4 });
  ok("12b.9 · ⭐ RR1 · RR4 · the register runs newest first in the calendar, a page at a time with its total: every final public week exactly once across the pages, and a page past the end is the last page",
    p1.total === 6 && p1.page === 1 && p1.perPage === 4 && J(codes(p1)) === J([L.code, E.code, H.code, V.code])
      && p2.total === 6 && p2.page === 2 && J(codes(p2)) === J([B.code, A.code]) && p9.page === 2 && J(codes(p9)) === J(codes(p2)),
    J({ p1: codes(p1), p2: codes(p2), p9: [p9.page, codes(p9)] }));
  const nL = (await dal.ticketStore.listForUser(PX, { cycleId: L.id })).length, nE = pxE.length;
  const t1 = await P.millioneaMyTickets(PX, { page: 1, perPage: 1 });
  const t2 = await P.millioneaMyTickets(PX, { page: 2, perPage: 1 });
  const tAll = await P.millioneaMyTickets(PX, { perPage: 12 });
  const oneE = await P.millioneaMyTicketsWeek(PX, E.id);
  ok("12b.10 · ⭐ RR1 · RR4 · Tiketi zangu pages by WEEK, newest first in the calendar, with its total — every ticket of each week shown read by its week; a page that names its week reads that week alone",
    t1.total === 2 && t1.page === 1 && t1.rows.length === 1 && t1.rows[0].week.id === L.id && t2.page === 2 && t2.rows[0]?.week.id === E.id
      && J(tAll.rows.map((g: any) => g.week.id)) === J([L.id, E.id]) && tAll.rows[0].tickets.length === nL && tAll.rows[1].tickets.length === nE
      && J(oneE) === J(t2.rows[0]) && (await P.millioneaMyTicketsWeek(PX, H.id)) === null,
    J({ t1: t1.rows.map((g: any) => g.week.code), t2: t2.rows.map((g: any) => g.week.code), total: t1.total }));
  const shareE: number = (await dal.weekStore.get(E.id)).sharePerTicket;
  const resultOf = async (u: string) => (await P.millioneaNotices(u)).find((n: any) => n.notice === "RESULT" && n.weekId === E.id);
  const nK = await resultOf(PK), nF = await resultOf(PF);
  const earlyK = await ACT.markMillioneaNoticeSeenFor(PK, E.id, "RESULT", new Date().toISOString(), ACTIVE);
  ok("12b.11 · ⭐ RR3 · a week whose only win was FORFEITED is not `won` on its RESULT notice (the seal is earned money) and counts the share apart, with no amount; one whose only win is HELD has no RESULT yet — it waits on the decision, as a week void's notice waits on its refunds (M3) — and cannot be put to rest before it comes",
    holdK.ok && holdF.ok && forfeitF.ok && nK === undefined && earlyK === false
      && J(nF) === J({ notice: "RESULT", weekId: E.id, code: E.code, won: false, winningTickets: 0, total: null, held: 0, forfeited: 1 }),
    `${why(holdK)} · ${why(forfeitF)} · ${J({ nK, nF, earlyK })}`);
  ok("12b.12 · …the control: a PAID share is `won`, with its count and its amount",
    J(nx.find((n: any) => n.notice === "RESULT" && n.weekId === E.id)) === J({ notice: "RESULT", weekId: E.id, code: E.code, won: true, winningTickets: 1, total: shareE, held: 0, forfeited: 0 }),
    J(nx));
  const rowF = (await P.millioneaMyTicketsWeek(PF, E.id))?.tickets[0];
  const vF = await P.millioneaTicket(PF, tPF.serial);
  ok("12b.13 · ⭐ RR3 · a forfeited share reads its own word, never 'won' — on its row and its page, from the ticket's own mark (the word's key is the composition's `shareForfeited`); the page keeps the week's ledger with the share counted apart, no amount; the officer's reason stays on the server",
    rowF?.shown === "forfeited" && rowF.share === "forfeited" && rowF.paid === null && vF?.shown === "forfeited" && vF.loss === null
      && vF.win?.yourForfeitedTickets === 1 && vF.win.yourWinningTickets === 0 && vF.win.yourTotal === 0 && LABEL.TICKET_SHOWN_KEY.forfeited === "shareForfeited"
      && LABEL.ticketShown({ status: "SETTLED", won: true, frozenReason: `${LABEL.FORFEITED_SHARE_MARK}a reason` }, "SETTLED") === "forfeited"
      && ![J(rowF), J(vF), J(nF)].some((s) => s.includes("player suite")),
    J({ row: rowF && [rowF.shown, rowF.share, rowF.paid], win: vF?.win }));
  const rowK = (await P.millioneaMyTicketsWeek(PK, E.id))?.tickets[0];
  ok("12b.14 · …the control: a share HELD for review still won (its hold mark is its `share`), as a held mark and no mark both read",
    rowK?.shown === "won" && rowK.share === "held" && rowK.paid === null
      && LABEL.ticketShown({ status: "SETTLED", won: true, frozenReason: "compliance · a reason" }, "SETTLED") === "won"
      && LABEL.ticketShown({ status: "SETTLED", won: true, frozenReason: null }, "SETTLED") === "won",
    J({ row: rowK && [rowK.shown, rowK.share, rowK.paid] }));
  const releaseK = await W.settle.releaseMaswaliShare({ ticketId: tPK.id, officerId: "usr_mln_compliance", note: "player suite releases the only share" });
  ok("12b.14b · …and released, the share is paid and its RESULT comes now, true: `won`, with its count and its amount — the seal the release earned, never spent before it",
    releaseK.ok && J(await resultOf(PK)) === J({ notice: "RESULT", weekId: E.id, code: E.code, won: true, winningTickets: 1, total: shareE, held: 0, forfeited: 0 }),
    `${why(releaseK)} · ${J(await resultOf(PK))}`);
}
{
  // L5 · a holder keeps their own tickets at a kill, so the owner's seen mark asks no rollout. The REAL switch is lowered
  // (the ceiling, as production lowers it), as 5.18 lowers it for the free cancel.
  const vC = await P.millioneaTicket(PC, cSerial);
  process.env.FEATURE_MILLIONEA = "WITHDRAWN";
  const killedC = await resolveMillioneaFor({ sessionUserId: PC });
  const strangerMark = await ACT.markMillioneaTicketSeenFor(PS, cSerial, vC?.seen.through);
  const ownerMark = await ACT.markMillioneaTicketSeenFor(PC, cSerial, vC?.seen.through);
  process.env.FEATURE_MILLIONEA = "ACTIVE";
  ok("12b.15 · ⭐ L5 · with Millionea WITHDRAWN (hidden from this very player), the owner's seen mark still records — their ticket is theirs at every rollout state — and a stranger's records nothing",
    killedC.visible === false && strangerMark === false && ownerMark === true
      && Date.parse((await dal.ticketStore.getBySerial(cSerial)).lastViewedAt) === Date.parse(vC.seen.through), J({ killedC, strangerMark, ownerMark }));
  // RR5 · two marks in flight on one ticket: the newer and an older one, both started before either wrote.
  const tPS = (await dal.ticketStore.listForUser(PS, { cycleId: E.id }))[0];
  const vS = await P.millioneaTicket(PS, tPS.serial);
  const [newer, older] = await Promise.all([
    ACT.markMillioneaTicketSeenFor(PS, tPS.serial, vS.seen.through), ACT.markMillioneaTicketSeenFor(PS, tPS.serial, vS.boughtAt),
  ]);
  const markS = (await dal.ticketStore.getBySerial(tPS.serial)).lastViewedAt;
  ok("12b.16 · ⭐ RR5 · two seen marks in flight — the newer and an older one, both read before either wrote — leave the NEWER standing: the write itself is conditional, so the older can never land over it",
    Date.parse(vS.boughtAt) < Date.parse(vS.seen.through) && newer === true && Date.parse(markS) === Date.parse(vS.seen.through), J({ newer, older, markS }));
  let blind = "";
  try { await dal.ticketStore.patch(tPS.id, { lastViewedAt: vS.boughtAt }); } catch (e) { blind = String((e as Error)?.message ?? e); }
  ok("12b.17 · RR5 · …and the blind door is shut on both stores: a plain patch can no longer write the seen mark, so nothing can move it back",
    blind.includes("'lastViewedAt' is not a patchable column") && Date.parse((await dal.ticketStore.getBySerial(tPS.serial)).lastViewedAt) === Date.parse(vS.seen.through), blind);
  // RR6 · ⚠️ FIXTURES OF A FAULT, each undone at once: the store's writes, and the notice mark's week read, made to throw,
  // as a database that refuses them. Pending pool frames are fired first, so none reads a faulted store in the window.
  const lz = (await dal.ticketStore.listForUser(PZ, { cycleId: L.id }))[0];
  const vZ = await P.millioneaTicket(PZ, lz.serial);
  const asOfZ = (await P.millioneaHub(viewer(PZ))).asOf;
  await FEED.__flushPoolFramesForTests();
  const refused = async () => { throw new Error("TEST-FAULT · the database refused it"); };
  const attempt = async (f: () => Promise<unknown>) => { try { return [false, await f()]; } catch (e) { return [true, String(e)]; } };
  const realTicket = { patch: dal.ticketStore.patch, markViewed: dal.ticketStore.markViewed };
  dal.ticketStore.patch = refused; dal.ticketStore.markViewed = refused;
  const ticketWrite = await attempt(() => ACT.markMillioneaTicketSeenFor(PZ, lz.serial, vZ.seen.through));
  dal.ticketStore.patch = realTicket.patch; dal.ticketStore.markViewed = realTicket.markViewed;
  const realMarkSeen = dal.noticeStore.markSeen;
  dal.noticeStore.markSeen = refused;
  const noticeWrite = await attempt(() => ACT.markMillioneaNoticeSeenFor(PZ, L.id, "RESULT", asOfZ, ACTIVE));
  dal.noticeStore.markSeen = realMarkSeen;
  const realWeekGet = dal.weekStore.get;
  dal.weekStore.get = refused;
  const weekRead = await attempt(() => ACT.markMillioneaNoticeSeenFor(PZ, L.id, "RESULT", asOfZ, ACTIVE));
  dal.weekStore.get = realWeekGet;
  ok("12b.18 · ⭐ RR6 · a seen mark whose write fails — the ticket's or the notice's — or whose week read fails answers false, never throws, and records nothing",
    J([ticketWrite, noticeWrite, weekRead]) === J([[false, false], [false, false], [false, false]])
      && (await dal.ticketStore.getBySerial(lz.serial)).lastViewedAt === null
      && (await P.millioneaNotices(PZ)).some((n: any) => n.notice === "RESULT" && n.weekId === L.id), J({ ticketWrite, noticeWrite, weekRead }));
  const ticketAgain = await ACT.markMillioneaTicketSeenFor(PZ, lz.serial, vZ.seen.through);
  const noticeAgain = await ACT.markMillioneaNoticeSeenFor(PZ, L.id, "RESULT", asOfZ, ACTIVE);
  ok("12b.19 · …the control: the store restored, the same two marks record",
    ticketAgain === true && noticeAgain === true && !(await P.millioneaNotices(PZ)).some((n: any) => n.notice === "RESULT" && n.weekId === L.id),
    J({ ticketAgain, noticeAgain }));
  // RR1 · a voided week never takes the carry (MR-18): its R is untouched and waits for the week after it.
  const vB = await P.millioneaTicket(P3, b3.data.maswali.tickets[0].serial);
  ok("12b.20 · ⭐ RR1 · the loss line skips a voided week: the pool of the week before the void went to the week after it, in the calendar (its R waits through the void, MR-18)",
    J(vB.loss) === J({ winners: 0, carriedForward: true, nextWeekCode: H.code }), J(vB.loss));
}

// ── §13 · by state, never newest-N (L1); the floor fails closed on unreadable rules (L3); the hub while Millionea ends (L2)
section("§13 · by state, never newest-N; unreadable rules; the hub while Millionea ends");
{
  // L1 · thirteen later drafts of the drive line, through the product's own door: the drive line's newest twelve rows
  // are then drafts only — the page a newest-N read would have searched for the week on sale.
  const drafted: boolean[] = [];
  for (let i = 0; i < 13; i++) {
    const start = W.weekStartAhead(10 + i);
    const c = await W.svc.createWeek({ weekStartMs: start, visibility: "DRIVE", questions: W.questions(start), officerId: DRAFTER, now: new Date(start - 3 * DAY) });
    drafted.push(c.ok === true);
  }
  const newest = await dal.weekStore.list({ visibility: "DRIVE", limit: 12 });
  ok("13.1 · L1 · the population is real: the drive line's newest twelve weeks are drafts only", drafted.every(Boolean) && newest.length === 12 && newest.every((w: any) => w.state === "DRAFT"),
    J({ drafted, states: newest.map((w: any) => w.state) }));
  const hub = await P.millioneaHub(viewer(null, "STAFF_PREVIEW"));
  const how = await P.millioneaHowTo(viewer(null, "STAFF_PREVIEW"));
  ok("13.2 · ⭐ L1 · …and the hub still leads with the selling drive week and the how-to still reads its frozen rules: both find it by its state",
    hub.week?.id === D.id && hub.week.state === "OPEN" && how.source === "WEEK" && how.weekCode === D.code, J({ hub: hub.week?.code, how: [how.source, how.weekCode] }));
}
// (After §12b's two weeks in the calendar: a week never opens before one of its line that already opened, R3.)
const { week: F, start: fStart } = await W.openWeek({ weeksAhead: 9 });
// RR2 · one ticket in what becomes the final week, its first main to miss (§14).
const PT = await W.user({ balance: 20_000 });
const bT = await W.buy(PT, F.id, [W.LOSE], { key: "player-pt-f-0001" });
{
  // ⚠️ A FIXTURE OF A FAULT, undone below: the drive week's frozen rules re-stamped as a version this build cannot read —
  // what a week frozen by a newer build looks like to an older container in a rolling deploy.
  const restamp = async (weekId: string, v: number) => {
    if (W.onPostgres) {
      await W.prisma().$executeRawUnsafe(`UPDATE "MaswaliCycle" SET "rulesSnapshot" = jsonb_set("rulesSnapshot", '{v}', $1::jsonb) WHERE "id" = $2`, String(v), weekId);
    } else {
      (globalThis as any).__50PICK_MLN_WEEKS.get(weekId).rulesSnapshot.v = v;
    }
  };
  const before = await P.maswaliPoolFigure(F.id);
  await restamp(D.id, 2);
  const unreadable = W.svc.frozenRules(await dal.weekStore.get(D.id)) === null;
  const blind = await P.maswaliPoolFigure(F.id);
  const dBlind = await P.maswaliPoolFigure(D.id);
  await restamp(D.id, 1);
  const after = await P.maswaliPoolFigure(F.id);
  ok("13.3 · ⛔ L3 · an unsettled week whose frozen rules cannot be read leaves the requirement unknown, so no week shows its floor (fail closed) — and restored, the floor returns",
    before?.floor === floor && unreadable && dBlind === null && !!blind && blind.floor === null && blind.jackpot === (blind.carryIn ?? 0) + blind.sales && after?.floor === floor,
    J({ before: before?.floor, unreadable, blind: blind && { floor: blind.floor, jackpot: blind.jackpot }, after: after?.floor }));
}
{
  // S5-FIX-PLAYER P10 · a question sealed VOID before the close (MB-15) on the selling drive week: a ticket cut BEFORE the void
  // answered it; one cut AFTER it was filled by the slip, and its owner answered nothing there.
  const PV1 = await W.user({ balance: 10_000 }), PV2 = await W.user({ balance: 10_000 });
  const early = await W.buy(PV1, D.id, [W.WIN], { key: "player-pv1-d-0001", state: "STAFF_PREVIEW" });
  await sleep(5);
  const voided = await W.svc.sealQuestion({ weekId: D.id, slot: 3, outcome: "VOID", voidReason: "criterion_wrong", evidence: "The criterion named the wrong fixture (player suite, P10)", officerId: SEALER });
  await sleep(5);
  const late = await W.buy(PV2, D.id, [W.WIN], { key: "player-pv2-d-0001", state: "STAFF_PREVIEW" });
  const slip = await P.millioneaSlip(viewer(PV2, "STAFF_PREVIEW"));
  const vEarly = early.ok ? await P.millioneaTicket(PV1, early.data.maswali.tickets[0].serial) : null;
  const vLate = late.ok ? await P.millioneaTicket(PV2, late.data.maswali.tickets[0].serial) : null;
  ok("13.3a · ⭐ P10 · the slip fills a question voided before the close itself (MB-15), so the ticket cut after the void shows no pick there (`slipFilled` [3]); the ticket cut before it answered it and keeps its pick",
    early.ok && voided.ok && late.ok && slip?.questions.find((q: any) => q.slot === 3)?.outcome === "VOID"
      && J(vLate?.slipFilled) === J([3]) && J(vEarly?.slipFilled) === J([]) && vLate?.slots.find((x: any) => x.slot === 3)?.pick === "YES",
    `${why(early)} · ${why(voided)} · ${why(late)} · ${J({ late: vLate?.slipFilled, early: vEarly?.slipFilled })}`);
}
{
  const closedF = await W.svc.closeWeek({ weekId: F.id, now: new Date(Date.parse(F.closesAt) + 60_000) });
  const live = await P.millioneaHub(viewer(P3));
  ok("13.4 · L2 · the control: no public week on sale and Millionea LIVE — the hub states when the next week opens",
    closedF.ok && live.life === "LIVE" && live.week?.id === F.id && typeof live.nextOpensAt === "string", J({ life: live.life, next: live.nextOpensAt }));
  const sunset = await W.svc.sunsetMaswali({ weekId: F.id, ownerId: OWNER, typed: W.svc.SUNSET_WORD, reason: "player suite ends Millionea" });
  const ending = await P.millioneaHub(viewer(P3));
  ok("13.5 · ⛔ L2 · while Millionea is ENDING (a final week runs, nothing opens after it), no 'next opens' line",
    sunset.ok && ending.life === "ENDING" && ending.week?.id === F.id && ending.nextOpensAt === null, `${why(sunset)} · ${J({ life: ending.life, next: ending.nextOpensAt })}`);
}

// ── §14 · the final week (RR2): a miss is not "cannot win" there — and released, the top score wins ──────────────────
section("§14 · the final week: no 'cannot win' line, and the top score wins");
{
  const atF = await W.closeAndSeal(F, fStart);
  const tT = (await dal.ticketStore.listForUser(PT, { cycleId: F.id }))[0];
  const vT = await P.millioneaTicket(PT, tT.serial);
  ok("14.1 · ⭐ RR2 · in the final week a ticket with a miss is NOT 'cannot win': with no 10 of 10 the top score shares the jackpot (MR-30), so the provisional line is never drawn there",
    bT.ok && vT.week.isFinal === true && vT.shown === "running" && vT.slots[0].mark === "missed" && vT.cannotWinSoFar === false,
    J({ isFinal: vT.week.isFinal, mark: vT.slots[0].mark, cannot: vT.cannotWinSoFar }));
  const relF = await W.release(F.id, atF);
  const wT = await P.millioneaTicket(PT, tT.serial);
  ok("14.2 · …the proof: released, the final week pays its top score — that very ticket won, its share paid, on 9 of 10 (TOP_SCORE)",
    relF.ok && wT.shown === "won" && wT.share === "paid" && wT.win?.basis === "TOP_SCORE" && wT.win.winningScore === 9, `${why(relF)} · ${J(wT?.win)}`);
}

console.log(`${NL}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
