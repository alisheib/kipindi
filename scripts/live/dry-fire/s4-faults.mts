/**
 * SCENARIO 4 · FAULTS — the carrier, the server and the shop misbehave, one fault at a time, each on a small campaign of its own
 * (every person sendable, so the only thing in the way is the fault):
 *
 *   4a REFUSED BATCH   the gateway says no (`status:false`): ONE pause `gateway_refused`, the whole batch back on the list with an
 *                      attempt counted, NOBODY settled FAILED row by row (E7), nothing charged; Resume sends them once
 *   4b A THROW         `send` dies before it wrote anything (everyone certainly unsent → released, pause `send_error`, one log line),
 *                      and after the batch was handed over (everyone may have it → UNCONFIRMED, never re-sent, same pause)
 *   4c LOST REPLIES    a timeout, an HTML 504, a body that dies mid-read, a request that never arrived: UNCONFIRMED each time, pause
 *                      `gateway_unanswered`, NEVER sent again by itself
 *   4d SLOW            beyond the send-age bound: the GATE route (a slow gate: wait, the group shrinks 20 → 10 → 5, three at the
 *                      smallest pause `slice_too_slow`), and the SEND route (a stall before sendBatch writes; a stall after it wrote
 *                      the rows): waits, three in a row pause at ANY size — and nothing reaches the carrier
 *   4e MONEY FIRST     the money signal busy: the step waits and claims nobody; a flag older than ten minutes is ignored
 *   4f SEND WINDOW     closed at night: waits until it opens (a fake clock jumps there); a slice judged open at 19:59:30 that reaches
 *                      the wire after 20:00 is held, nothing leaves
 *   4g CODE FAILURE    a login code just failed on the shared rail: marketing steps aside two minutes
 *   4h HELD            a gate that cannot answer for five people: three tries each, then HELD; only HELD left → pause `held_rows`;
 *                      Resume starts them over
 *   4i SWITCH SHUT     the owner closes the live switch mid-run: the next step pauses `live_switch_closed`; Resume says why until it opens
 */
import { claimNow, drive, pause, resume, step } from "./core.mts";
import type { Harness, Process } from "./core.mts";
import { launch, statusCounts, statusLine, sum } from "./helpers.mts";
import type { Launch } from "./helpers.mts";
import { HOUR, MIN, json, num } from "./kit.mts";
import { OPS_NUMBER } from "./world.mts";

const MINI = { player_book: 1 } as const;
const SLOW_GATE_MS = (bound: number, min: number): number => Math.ceil((1.2 * bound) / min);

async function mini(h: Harness, proc: Process, key: string, n: number, extra: Partial<Launch> = {}) {
  h.clock.alignToWindow();
  h.sw.openFor(6 * HOUR);
  h.carrier.setBalance(2_000_000);
  const L = await launch(h, proc, { key, scn: 4, label: key, n, mix: MINI, duplicates: 0, oldTokens: 0, ...extra });
  if (!L.started.ok) throw new Error(`${key}: Start was refused (${L.started.reason}) — ${L.started.message.slice(0, 160)}`);
  return L;
}

const pauseRows = async (h: Harness, id: string) =>
  (await h.reader.audit(h.startedAt)).filter((e) => e.action === "marketing.campaign_paused" && e.targetId === id && e.category === "SYSTEM");

/** Everything is sent, once: every person SENT (or UNCONFIRMED where said), the campaign DONE. */
async function finish(h: Harness, proc: Process, id: string) {
  const r = await drive(h, proc, id, {});
  const rows = await h.reader.recipients(id);
  return { r, rows, counts: statusCounts(rows), campaign: await h.S.db.smsCampaign.find(id) };
}

/* ══ 4a · A REFUSED BATCH ═══════════════════════════════════════════════════════════════════════════════════════════ */

async function refusal(h: Harness, n: number) {
  const { S } = h;
  const A = h.fresh("A");
  const L = await mini(h, A, "s4a", n);
  const id = L.campaign.id;
  h.carrier.setPlan(({ nth }) => (nth(id) === 1 ? { kind: "refuse", message: "Invalid credentials" } : null));
  const r1 = await step(h, A, id);
  const rows1 = await h.reader.recipients(id);
  const c1 = statusCounts(rows1);
  const camp = await S.db.smsCampaign.find(id);
  const released = rows1.filter((r) => r.attempts === 1);
  const msgs = await h.reader.messagesOf(rows1.map((r) => r.id));
  const pauses = await pauseRows(h, id);
  const detail = String((pauses[0]?.payload as { detail?: unknown } | undefined)?.detail ?? "");
  claimNow(h, "S4.refuse.pause", "the gateway refuses a whole batch → ONE pause `gateway_refused` with the gateway's own words, ONE audit row",
    r1.ok && r1.step.kind === "paused" && camp?.status === "PAUSED" && camp.stopReason === "gateway_refused" && pauses.length === 1 && detail.includes("Invalid credentials"),
    `step → ${r1.ok ? r1.step.kind : "refused"}; ${camp?.status}/${camp?.stopReason}; ${pauses.length} audit row(s), detail "${detail.slice(0, 50)}"`);
  claimNow(h, "S4.refuse.rows", "E7: nobody is settled FAILED row by row for a shop-wide refusal — the whole batch is back on the list (PENDING, unclaimed, one attempt counted), its message rows are FAILED without a receipt, nothing was charged",
    c1.FAILED === 0 && c1.SENT === 0 && c1.UNCONFIRMED === 0 && released.length === S.engine.SLICE_START && released.every((r) => r.status === "PENDING" && r.claimToken === null)
    && msgs.length === released.length && msgs.every((m) => m.status === "FAILED" && !m.dlrStatus) && h.carrier.requestsOf(id).length === 1 && h.carrier.requestsOf(id)[0].answered === "refused" && h.carrier.billedFor(id) === 0,
    `${statusLine(c1)}; ${released.length} released with attempts 1; ${msgs.length} message rows FAILED; billed TZS ${h.carrier.billedFor(id)}`);
  h.carrier.setPlan(null);
  const rs = await resume(h, A, id);
  const end = await finish(h, A, id);
  const once = L.world.people.every((p) => {
    const asks = h.carrier.requestsFor(id, p.key).length;
    const wasReleased = released.some((r) => r.msisdn === p.key);
    return h.carrier.handedBy(id).get(p.key) === 1 && asks === (wasReleased ? 2 : 1);
  });
  claimNow(h, "S4.refuse.resume", "Resume sends the refused batch again: everyone ends SENT, each handed to the carrier exactly once — the released people were asked for twice (one refusal, one hand-over), nobody else more than once",
    rs.ok && end.campaign?.status === "DONE" && end.counts.SENT === n && once, `${statusLine(end.counts)}; released people kept attempts ${end.rows.filter((r) => r.attempts === 1).length}/${released.length}`);
  return { refusedBatch: released.length, requests: h.carrier.requestsFor(id, L.world.people[0].key).length };
}

/* ══ 4b · A THROW ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

async function thrown(h: Harness, n: number) {
  const { S } = h;
  const real = S.engine.engineSend;
  // (i) the send dies BEFORE it wrote a thing
  {
    const A = h.fresh("A");
    const L = await mini(h, A, "s4b1", n);
    const id = L.campaign.id;
    let armed = true;
    A.tweak({ send: async (m, o) => { if (armed) { armed = false; throw new Error("the message rows could not be written (dry-fire)"); } return real(m, o); } });
    const mark = h.tap.mark();
    const r = await step(h, A, id);
    const rows = await h.reader.recipients(id);
    const c = statusCounts(rows);
    const camp = await S.db.smsCampaign.find(id);
    const msgs = await h.reader.messagesOf(rows.map((x) => x.id));
    const pauses = await pauseRows(h, id);
    const log = h.tap.since(mark).filter((l) => l.includes("paused send_error") && l.includes(id));
    claimNow(h, "S4.throw.before", "a send that threw before writing anything: everyone certainly unsent goes back on the list (an attempt counted), the campaign pauses `send_error` ONCE, one audit row, ONE log line naming the campaign — and nothing reached the carrier",
      r.ok && r.step.kind === "paused" && camp?.stopReason === "send_error" && c.PENDING === n && rows.filter((x) => x.attempts === 1).length === S.engine.SLICE_START && msgs.length === 0
      && h.carrier.requests.filter((q) => q.messages.some((w) => w.campaignId === id)).length === 0 && pauses.length === 1 && log.length === 1,
      `${statusLine(c)}; ${msgs.length} message rows; ${log.length} log line(s); ${pauses.length} audit row(s)`);
    A.tweak({ send: undefined });
    await resume(h, A, id);
    const end = await finish(h, A, id);
    claimNow(h, "S4.throw.before.resume", "after Resume everyone is sent exactly once", end.campaign?.status === "DONE" && end.counts.SENT === n && [...h.carrier.handedBy(id).values()].every((k) => k === 1), statusLine(end.counts));
  }
  // (ii) the send dies AFTER the batch was handed over
  {
    const A = h.fresh("A");
    const L = await mini(h, A, "s4b2", n);
    const id = L.campaign.id;
    let armed = true;
    A.tweak({ send: async (m, o) => { const out = await real(m, o); if (armed) { armed = false; throw new Error("the process lost the reply (dry-fire)"); } return out; } });
    const r = await step(h, A, id);
    const rows = await h.reader.recipients(id);
    const c = statusCounts(rows);
    const camp = await S.db.smsCampaign.find(id);
    const msgs = await h.reader.messagesOf(rows.map((x) => x.id));
    const maybe = rows.filter((x) => x.status === "UNCONFIRMED");
    claimNow(h, "S4.throw.after", "a send that threw AFTER the batch was handed over: everyone it may have reached is UNCONFIRMED (never PENDING, never FAILED), pause `send_error`, and the carrier holds each of them once",
      r.ok && r.step.kind === "paused" && camp?.stopReason === "send_error" && maybe.length === S.engine.SLICE_START && c.PENDING === n - maybe.length && c.FAILED === 0
      && msgs.length === maybe.length && msgs.every((m) => m.status === "ACCEPTED") && maybe.every((x) => (h.carrier.handedBy(id).get(x.msisdn) ?? 0) === 1),
      `${statusLine(c)}; ${msgs.length} message rows ${[...new Set(msgs.map((m) => m.status))].join("/")}`);
    A.tweak({ send: undefined });
    await resume(h, A, id);
    const end = await finish(h, A, id);
    claimNow(h, "S4.throw.after.resume", "after Resume the rest are sent and the UNCONFIRMED stay UNCONFIRMED — nobody is handed to the carrier twice",
      end.campaign?.status === "DONE" && end.counts.UNCONFIRMED === maybe.length && end.counts.SENT === n - maybe.length && [...h.carrier.handedBy(id).values()].every((k) => k === 1), statusLine(end.counts));
  }
}

/* ══ 4c · LOST REPLIES ══════════════════════════════════════════════════════════════════════════════════════════════ */

async function lost(h: Harness, n: number) {
  const A = h.fresh("A");
  const L = await mini(h, A, "s4c", n);
  const id = L.campaign.id;
  h.carrier.setPlan(({ nth }) => {
    const k = nth(id);
    if (k === 1) return { kind: "lost", carrierHasIt: true };
    if (k === 2) return { kind: "http5xx", carrierHasIt: true };
    if (k === 3) return { kind: "body_dead" };
    if (k === 4) return { kind: "lost", carrierHasIt: false };
    return null;
  });
  const reasons: string[] = [];
  const sizes: number[] = [];
  for (let cycle = 1; cycle <= 4; cycle++) {
    const r = await drive(h, A, id, {});
    reasons.push(`${r.end}/${(await h.S.db.smsCampaign.find(id))?.stopReason ?? "-"}`);
    sizes.push(h.carrier.requests.filter((q) => q.messages.some((w) => w.campaignId === id))[cycle - 1]?.messages.length ?? 0);
    await resume(h, A, id);
  }
  const end = await finish(h, A, id);
  const msgs = await h.reader.messagesOf(end.rows.map((x) => x.id));
  const unconfirmed = end.rows.filter((r) => r.status === "UNCONFIRMED");
  const kinds = h.carrier.requests.filter((q) => q.messages.some((w) => w.campaignId === id)).slice(0, 4).map((q) => q.answered);
  const pauses = h.obs.pauses.filter((p) => p.campaignId === id);
  claimNow(h, "S4.lost.unconfirmed", "four different lost replies (a timeout, an HTML 504, a body that died, a request that never arrived): each batch's people are UNCONFIRMED with their reference kept and their message rows UNKNOWN, each pause is `gateway_unanswered`",
    reasons.every((x) => x === "paused/gateway_unanswered") && pauses.filter((p) => p.reason === "gateway_unanswered").length === 4 && unconfirmed.length === sum(sizes)
    && unconfirmed.every((r) => r.smsReference !== null && r.smsReference.startsWith("sms_")) && msgs.filter((m) => unconfirmed.some((u) => u.smsReference === m.reference)).every((m) => m.status === "UNKNOWN"),
    `answers ${kinds.join(",")}; pauses ${reasons.join(" ")}; ${unconfirmed.length} UNCONFIRMED = batches ${sizes.join("+")}`);
  claimNow(h, "S4.lost.never", "an unanswered batch is NEVER sent again by itself, even after Resume: every number reaches the carrier once, the rest are SENT, the campaign finishes",
    end.campaign?.status === "DONE" && end.counts.SENT === n - unconfirmed.length && [...h.carrier.handedBy(id).values()].every((k) => k === 1) && h.carrier.handedBy(id).size === n,
    `${statusLine(end.counts)}; ${h.carrier.handedBy(id).size} numbers handed once; billed TZS ${h.carrier.billedFor(id)}`);
}

/* ══ 4d · SLOW BEYOND THE SEND-AGE BOUND ════════════════════════════════════════════════════════════════════════════ */

async function slow(h: Harness, n: number) {
  const { S } = h;
  const bound = S.engine.CLAIM_SEND_MAX_AGE_MS;
  const min = S.engine.SLICE_MIN;
  const real = S.engine.engineSend;
  // (i) THE GATE ROUTE
  {
    const A = h.fresh("A");
    const L = await mini(h, A, "s4d1", n);
    const id = L.campaign.id;
    const perPerson = SLOW_GATE_MS(bound, min);
    const slowGate = async (m: string) => { h.clock.advance(perPerson); return S.consent.mayReceiveMarketingSms(m); };
    const restore = A.tweak({ gate: slowGate });
    const sizes: number[] = [];
    const kinds: string[] = [];
    for (let i = 0; i < 8; i++) {
      sizes.push(A.state.sliceSize);
      const r = await step(h, A, id);
      kinds.push(r.ok ? (r.step.kind === "waiting" ? "wait" : r.step.kind) : "refused");
      if (r.ok && r.step.kind === "paused") break;
    }
    const camp = await S.db.smsCampaign.find(id);
    const rows = await h.reader.recipients(id);
    const pauses = await pauseRows(h, id);
    const reqs = h.carrier.requests.filter((q) => q.messages.some((w) => w.campaignId === id)).length;
    claimNow(h, "S4.slow.gate", "a slow GATE: the group shrinks 20 → 10 → 5 (each wait puts the people back as they were), three waits at the smallest group PAUSE `slice_too_slow` — and NOTHING reaches the carrier",
      json(sizes) === json([20, 10, 5, 5, 5]) && json(kinds) === json(["wait", "wait", "wait", "wait", "paused"]) && camp?.stopReason === "slice_too_slow" && pauses.length === 1
      && reqs === 0 && rows.every((r) => r.status === "PENDING" && r.attempts === 0 && r.claimToken === null),
      `group sizes ${sizes.join("→")}; steps ${kinds.join(",")}; ${perPerson / 1000} s per person; requests ${reqs}; every row PENDING attempts 0`);
    restore();
    await resume(h, A, id);
    const end = await finish(h, A, id);
    claimNow(h, "S4.slow.gate.resume", "once the gate is fast again Resume carries on and everyone is sent exactly once", end.campaign?.status === "DONE" && end.counts.SENT === n && [...h.carrier.handedBy(id).values()].every((k) => k === 1), statusLine(end.counts));
  }
  // (ii) THE SEND ROUTE — a stall between the last check and sendBatch's first write
  {
    const A = h.fresh("A");
    const L = await mini(h, A, "s4d2", n);
    const id = L.campaign.id;
    const restore = A.tweak({ send: async (m, o) => { h.clock.advance(bound + MIN); return real(m, o); } });
    const kinds: string[] = [];
    const sizes: number[] = [];
    for (let i = 0; i < 6; i++) {
      sizes.push(A.state.sliceSize);
      const r = await step(h, A, id);
      kinds.push(r.ok ? (r.step.kind === "waiting" ? "wait" : r.step.kind) : "refused");
      if (r.ok && r.step.kind === "paused") break;
    }
    const camp = await S.db.smsCampaign.find(id);
    const rows = await h.reader.recipients(id);
    const msgs = await h.reader.messagesOf(rows.map((x) => x.id));
    const reqs = h.carrier.requests.filter((q) => q.messages.some((w) => w.campaignId === id)).length;
    claimNow(h, "S4.slow.send", "a slow SEND (a stall before sendBatch writes a row): the deadline refuses the batch whole — nothing written, nothing sent; three waits in a row pause `slice_too_slow` at ANY group size — here a group far above the smallest (no smaller group cures a stalled write)",
      json(kinds) === json(["wait", "wait", "paused"]) && camp?.stopReason === "slice_too_slow" && reqs === 0 && msgs.length === 0 && sizes[sizes.length - 1] > S.engine.SLICE_MIN
      && rows.every((r) => r.status === "PENDING" && r.attempts === 0 && r.claimToken === null),
      `steps ${kinds.join(",")} at group sizes ${sizes.join("→")} (smallest ${S.engine.SLICE_MIN}); requests ${reqs}; message rows ${msgs.length}`);
    restore();
    await resume(h, A, id);
    const end = await finish(h, A, id);
    claimNow(h, "S4.slow.send.resume", "after Resume everyone is sent exactly once", end.campaign?.status === "DONE" && end.counts.SENT === n && [...h.carrier.handedBy(id).values()].every((k) => k === 1), statusLine(end.counts));
  }
  // (iii) THE SEND ROUTE — a stall AFTER the rows were written, before the request
  {
    const A = h.fresh("A");
    const L = await mini(h, A, "s4d3", n);
    const id = L.campaign.id;
    const table = S.db.smsMessage as unknown as { createMany: (rows: unknown[]) => Promise<unknown> };
    const original = table.createMany;
    let stall = true;
    table.createMany = async function (this: unknown, rows: unknown[]) {
      const out = await original.call(table, rows);
      if (stall) h.clock.advance(bound + MIN);
      return out;
    };
    const kinds: string[] = [];
    try {
      for (let i = 0; i < 6; i++) {
        const r = await step(h, A, id);
        kinds.push(r.ok ? (r.step.kind === "waiting" ? "wait" : r.step.kind) : "refused");
        if (r.ok && r.step.kind === "paused") break;
      }
      const camp = await S.db.smsCampaign.find(id);
      const rows = await h.reader.recipients(id);
      const msgs = await h.reader.messagesOf(rows.map((x) => x.id));
      const reqs = h.carrier.requests.filter((q) => q.messages.some((w) => w.campaignId === id)).length;
      claimNow(h, "S4.slow.write", "a stall AFTER the rows were written: no request is made, those rows are FAILED with no receipt (so the reaper would release them), the people are back as they were, three in a row pause `slice_too_slow`",
        json(kinds) === json(["wait", "wait", "paused"]) && camp?.stopReason === "slice_too_slow" && reqs === 0 && msgs.length > 0 && msgs.every((m) => m.status === "FAILED" && !m.dlrStatus)
        && rows.every((r) => r.status === "PENDING" && r.attempts === 0 && r.claimToken === null),
        `steps ${kinds.join(",")}; requests ${reqs}; ${msgs.length} message rows, all FAILED with no receipt`);
      stall = false;
    } finally {
      table.createMany = original;
    }
    await resume(h, A, id);
    const end = await finish(h, A, id);
    claimNow(h, "S4.slow.write.resume", "after Resume everyone is sent exactly once; the earlier FAILED message rows (never handed over) do not count as a second send",
      end.campaign?.status === "DONE" && end.counts.SENT === n && [...h.carrier.handedBy(id).values()].every((k) => k === 1), statusLine(end.counts));
  }
}

/* ══ 4e · MONEY FIRST ═══════════════════════════════════════════════════════════════════════════════════════════════ */

async function money(h: Harness, n: number) {
  const A = h.fresh("A");
  const L = await mini(h, A, "s4e", n);
  const id = L.campaign.id;
  const g = globalThis as { __50PICK_MONEY_CHORES?: unknown };
  g.__50PICK_MONEY_CHORES = { lifecycleSince: Date.now(), depositsSince: 0, marketFires: [], updownFires: [] };
  const said: string[] = [];
  for (let i = 0; i < 4; i++) {
    const r = await step(h, A, id);
    said.push(r.ok && r.step.kind === "waiting" ? `wait:${r.said?.includes("money always goes first") ? "money" : r.said}` : r.ok ? r.step.kind : "refused");
  }
  const rows = await h.reader.recipients(id);
  const claimedEver = rows.filter((r) => r.claimedAt !== null).length;
  const reqs = h.carrier.requests.filter((q) => q.messages.some((w) => w.campaignId === id)).length;
  claimNow(h, "S4.money.waits", "money first: while a lifecycle pass is running the step WAITS and claims nobody — four driver calls, no claim, no request, no pause",
    said.every((x) => x === "wait:money") && claimedEver === 0 && reqs === 0 && h.obs.pauses.filter((p) => p.campaignId === id).length === 0, `${said.join(" ")}; rows ever claimed ${claimedEver}; requests ${reqs}`);
  // a flag older than ten minutes is ignored (a pass that died must not hold marketing off for ever)
  g.__50PICK_MONEY_CHORES = { lifecycleSince: Date.now() - 11 * MIN, depositsSince: 0, marketFires: [], updownFires: [] };
  const after = await step(h, A, id);
  claimNow(h, "S4.money.stale", "a chore flag older than ten minutes is ignored: the very next step claims and sends", after.ok && after.step.kind === "sent", after.ok ? after.step.kind : "refused");
  delete g.__50PICK_MONEY_CHORES;
  const end = await finish(h, A, id);
  claimNow(h, "S4.money.done", "…and the campaign finishes with everyone sent once", end.campaign?.status === "DONE" && end.counts.SENT === n && [...h.carrier.handedBy(id).values()].every((k) => k === 1), statusLine(end.counts));
}

/* ══ 4f · THE SEND WINDOW ═══════════════════════════════════════════════════════════════════════════════════════════ */

const nextEat = (h: Harness, hour: number, minute: number): number => {
  const today = h.clock.eat(0, hour, minute);
  return today > h.clock.now() ? today : h.clock.eat(1, hour, minute);
};

async function window(h: Harness, n: number) {
  const { S } = h;
  // (i) closed at night
  {
    const A = h.fresh("A");
    const L = await mini(h, A, "s4f1", n);
    const id = L.campaign.id;
    h.sw.openFor(48 * HOUR);
    const night = nextEat(h, 21, 0);
    h.clock.jumpTo(night);
    const opens = night + 11 * HOUR;
    const waits: string[] = [];
    let untilOk = true;
    for (let i = 0; i < 4; i++) {
      const r = await step(h, A, id);
      waits.push(r.ok ? r.step.kind : "refused");
      if (r.ok && r.step.kind === "waiting" && r.step.until !== new Date(opens).toISOString()) untilOk = false;
    }
    const rows = await h.reader.recipients(id);
    const reqs = h.carrier.requests.filter((q) => q.messages.some((w) => w.campaignId === id)).length;
    claimNow(h, "S4.window.closed", "at 21:00 EAT the step WAITS (quiet hours) until exactly 08:00 EAT next day, claims nobody, sends nothing and pauses nothing",
      waits.every((x) => x === "waiting") && untilOk && rows.every((r) => r.claimedAt === null) && reqs === 0 && h.obs.pauses.filter((p) => p.campaignId === id).length === 0,
      `4 steps → ${[...new Set(waits)].join(",")} until ${new Date(opens).toISOString().slice(0, 16)}Z; requests ${reqs}`);
    h.clock.jumpTo(opens);
    const open = await step(h, A, id);
    claimNow(h, "S4.window.opens", "the moment the window opens the very next step sends", open.ok && open.step.kind === "sent", open.ok ? open.step.kind : "refused");
    const end = await finish(h, A, id);
    claimNow(h, "S4.window.done", "…and the campaign finishes with everyone sent once", end.campaign?.status === "DONE" && end.counts.SENT === n && [...h.carrier.handedBy(id).values()].every((k) => k === 1), statusLine(end.counts));
  }
  // (ii) judged open at 19:59:30, reaching the wire after 20:00
  {
    const A = h.fresh("A");
    const L = await mini(h, A, "s4f2", n);
    const id = L.campaign.id;
    h.sw.openFor(48 * HOUR);
    h.clock.jumpTo(nextEat(h, 19, 59) + 30_000);
    const restore = A.tweak({ gate: async (m: string) => { h.clock.advance(4_000); return S.consent.mayReceiveMarketingSms(m); } });
    const r = await step(h, A, id);
    restore();
    const rows = await h.reader.recipients(id);
    const reqs = h.carrier.requests.filter((q) => q.messages.some((w) => w.campaignId === id)).length;
    const until = r.ok && r.step.kind === "waiting" ? r.step.until : null;
    claimNow(h, "S4.window.edge", "a slice judged open at 19:59:30 whose gating runs past 20:00 is held at the wire: the step waits for 08:00, ZERO requests, the people back as they were",
      r.ok && r.step.kind === "waiting" && until !== null && h.clock.eatMinutes(Date.parse(until)) === 480 && reqs === 0 && rows.every((x) => x.status === "PENDING" && x.attempts === 0 && x.claimToken === null),
      `step → ${r.ok ? r.step.kind : "refused"} until ${until?.slice(0, 16) ?? "-"}Z; requests ${reqs}`);
    if (until !== null) h.clock.jumpTo(Date.parse(until));
    const end = await finish(h, A, id);
    claimNow(h, "S4.window.edge.done", "…then the campaign finishes with everyone sent once", end.campaign?.status === "DONE" && end.counts.SENT === n && [...h.carrier.handedBy(id).values()].every((k) => k === 1), statusLine(end.counts));
  }
}

/* ══ 4g · A LOGIN CODE JUST FAILED ══════════════════════════════════════════════════════════════════════════════════ */

async function otp(h: Harness, n: number) {
  const { S } = h;
  const A = h.fresh("A");
  const L = await mini(h, A, "s4g", n);
  const id = L.campaign.id;
  // the shared rail refuses ONE login code (an OTP-purpose message, through the same sendBatch)
  h.carrier.setPlan(({ messages }) => (messages.some((m) => m.purpose === "OTP") ? { kind: "refuse", message: "Invalid credentials" } : null));
  const code = await S.sms.sendBatch([{ to: OPS_NUMBER, body: "50pick code: 123456. Valid 5 min. Don't share.", purpose: "OTP" }]);
  h.carrier.setPlan(null);
  const mark = (globalThis as { __50PICK_OTP_LAST_FAILURE_AT?: number }).__50PICK_OTP_LAST_FAILURE_AT;
  const wantUntil = typeof mark === "number" ? new Date(mark + S.engine.OTP_FAILURE_WAIT_MS).toISOString() : "";
  const seen: string[] = [];
  let untilOk = true;
  for (let i = 0; i < 3; i++) {
    const r = await step(h, A, id);
    seen.push(r.ok ? r.step.kind : "refused");
    if (r.ok && r.step.kind === "waiting" && r.step.until !== wantUntil) untilOk = false;
  }
  const rows = await h.reader.recipients(id);
  const reqs = h.carrier.requests.filter((q) => q.messages.some((w) => w.campaignId === id)).length;
  claimNow(h, "S4.otp.waits", "a login code failed on the shared rail → marketing steps aside: the step waits until exactly two minutes after the failure, claims nobody, sends nothing",
    code.results[0]?.ok === false && typeof mark === "number" && seen.every((x) => x === "waiting") && untilOk && rows.every((r) => r.claimedAt === null) && reqs === 0,
    `code refused: ${code.results[0]?.ok === false}; 3 steps → ${[...new Set(seen)].join(",")} until ${wantUntil.slice(11, 19)}Z; requests ${reqs}`);
  h.clock.advance(S.engine.OTP_FAILURE_WAIT_MS + 1_000);
  const after = await step(h, A, id);
  claimNow(h, "S4.otp.resumes", "two minutes on, the next step claims and sends", after.ok && after.step.kind === "sent", after.ok ? after.step.kind : "refused");
  const end = await finish(h, A, id);
  claimNow(h, "S4.otp.done", "…and the campaign finishes with everyone sent once", end.campaign?.status === "DONE" && end.counts.SENT === n && [...h.carrier.handedBy(id).values()].every((k) => k === 1), statusLine(end.counts));
}

/* ══ 4h · PEOPLE THE GATE CANNOT ANSWER FOR ═════════════════════════════════════════════════════════════════════════ */

async function held(h: Harness, n: number) {
  const { S } = h;
  const A = h.fresh("A");
  const L = await mini(h, A, "s4h", n);
  const id = L.campaign.id;
  const blind = new Set(L.world.people.slice(0, 5).map((p) => p.key));
  const restore = A.tweak({
    gate: async (m: string) => {
      if (blind.has(m)) throw new Error("the consent check cannot answer (dry-fire)");
      return S.consent.mayReceiveMarketingSms(m);
    },
  });
  const run = await drive(h, A, id, {});
  const rows = await h.reader.recipients(id);
  const c = statusCounts(rows);
  const camp = await S.db.smsCampaign.find(id);
  const heldRows = rows.filter((r) => r.status === "HELD");
  const view = run.last && run.last.ok ? run.last.view : null;
  claimNow(h, "S4.held.pause", "a person the gate cannot answer for is tried three times, then HELD; with only HELD people left the campaign PAUSES `held_rows` — it never finishes with them outstanding",
    run.end === "paused" && camp?.status === "PAUSED" && camp.stopReason === "held_rows" && heldRows.length === 5 && heldRows.every((r) => r.attempts === S.engine.MAX_ROW_ATTEMPTS && blind.has(r.msisdn))
    && c.SENT === n - 5 && [...blind].every((k) => h.carrier.requestsFor(id, k).length === 0),
    `${statusLine(c)}; the 5 held people each tried ${S.engine.MAX_ROW_ATTEMPTS} times; none on the wire`);
  claimNow(h, "S4.held.bar", "HELD is outstanding on the page: the bar and 'waiting' say n − 5 done and 5 waiting, never n of n", view !== null && view.progress?.value === n - 5 && view.progress.max === n && view.kpis.waiting === 5, view ? `bar ${view.progress?.value} of ${view.progress?.max}, waiting ${view.kpis.waiting}` : "no view");
  restore();
  const rs = await resume(h, A, id);
  const end = await finish(h, A, id);
  const resumedAudit = (await h.reader.audit(h.startedAt)).filter((e) => e.action === "marketing.campaign_resumed" && e.targetId === id);
  claimNow(h, "S4.held.resume", "Resume starts the HELD people over (PENDING, attempts 0 — the audit row says 5), the gate answers, they are sent once, the campaign finishes",
    rs.ok && end.campaign?.status === "DONE" && end.counts.SENT === n && end.counts.HELD === 0 && [...h.carrier.handedBy(id).values()].every((k) => k === 1)
    && (resumedAudit[0]?.payload as { requeuedHeld?: number } | undefined)?.requeuedHeld === 5, `${statusLine(end.counts)}; resumed audit requeuedHeld ${(resumedAudit[0]?.payload as { requeuedHeld?: number } | undefined)?.requeuedHeld}`);
}

/* ══ 4i · THE OWNER SHUTS THE SWITCH ════════════════════════════════════════════════════════════════════════════════ */

async function switchShut(h: Harness, n: number) {
  const A = h.fresh("A");
  const L = await mini(h, A, "s4i", n);
  const id = L.campaign.id;
  await drive(h, A, id, { until: (r) => (r.view.progress?.phase === "sending" && r.view.progress.value >= Math.ceil(n * 0.3)) });
  const before = h.carrier.requests.length;
  h.sw.close();
  const r = await step(h, A, id);
  const during = h.carrier.requests.length;
  const camp = await h.S.db.smsCampaign.find(id);
  const refused = await resume(h, A, id);
  h.sw.openFor(6 * HOUR);
  const rs = await resume(h, A, id);
  const end = await finish(h, A, id);
  claimNow(h, "S4.switch", "the owner closes the live switch mid-run: the next step pauses `live_switch_closed` before it claims anybody, Resume is refused while it is shut (and says why), and works once it is open",
    r.ok && r.step.kind === "paused" && camp?.stopReason === "live_switch_closed" && during === before && !refused.ok && refused.reason === "switch_closed" && rs.ok
    && end.campaign?.status === "DONE" && end.counts.SENT === n && [...h.carrier.handedBy(id).values()].every((k) => k === 1),
    `step → ${r.ok ? r.step.kind : "refused"}/${camp?.stopReason}; resume while shut → ${refused.reason}; ${statusLine(end.counts)}`);
}

/* ══ THE SCENARIO ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

export async function faults(h: Harness, n: number): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  out.refusal = await refusal(h, n);
  await thrown(h, n);
  await lost(h, Math.max(n, 160));
  await slow(h, n);
  await money(h, n);
  await window(h, n);
  await otp(h, n);
  await held(h, n);
  await switchShut(h, n);
  out.campaigns = h.campaigns.filter((c) => c.scn === 4).length;
  out.requests = h.carrier.requests.length;
  void num;
  return out;
}
