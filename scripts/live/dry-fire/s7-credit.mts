/**
 * SCENARIO 7 · CREDIT — the two lines the owner drew: the credit KEPT FOR LOGIN CODES (TZS 20,000 by default) and the most ONE
 * CAMPAIGN may spend (the limit frozen at its confirmation). A campaign that would cross either must stop BEFORE it does:
 *
 *   7a THE LIMIT   the price moved up after the confirmation, so today's cost is strictly above the frozen limit → Start refuses
 *                  `over_budget` and writes nothing; at exactly the limit it starts, and the campaign never bills past it;
 *   7b THE RESERVE at Start: credit minus the campaign's cost one shilling under the reserve → `credit_low` with the exact figures,
 *                  nothing written; topped up to exactly reserve + cost it starts, runs to DONE and ends AT the reserve, not under it;
 *   7c UNREADABLE  credit that cannot be read → Start refuses, and a running campaign pauses `credit_unreadable` before it claims
 *                  anybody (fail closed — for marketing only), Resume refuses while it is unreadable;
 *   7d MID-RUN     the shared credit drains while the campaign runs (login codes, another job): the slice that would take the credit
 *                  below the reserve is not sent — `marketing_floor` — and a top-up plus Resume finishes it;
 *   7e LATE BILLING the same drain with each charge landing 6 s after its reply (per-delivered-message billing) and the rail's
 *                  production window (30 s): the credit kept for login codes is still never gone into once billing catches up.
 * The carrier bills 6 TZS a segment and, like the real gateway, reports the PRE-charge balance on an accepted reply.
 */
import { claimNow, drive, resume, start, step } from "./core.mts";
import type { Harness } from "./core.mts";
import { launch, statusCounts, statusLine } from "./helpers.mts";
import { num } from "./kit.mts";

const MINI = { player_book: 1 } as const;

const forgetBalance = (): void => {
  const g = globalThis as { __50PICK_SMS_BALANCE?: unknown; __50PICK_SMS_BALANCE_READ?: unknown };
  delete g.__50PICK_SMS_BALANCE;
  delete g.__50PICK_SMS_BALANCE_READ;
};

export async function credit(h: Harness, n: number): Promise<Record<string, unknown>> {
  const { S } = h;
  const reserve = S.settingsPure.MARKETING_SMS_SETTINGS_DEFAULTS.codesReserveTzs as number;
  const price = 6;
  const m = Math.min(n, 180);
  const cost = m * price;
  const out: Record<string, unknown> = { reserveTzs: reserve, priceTzs: price, people: m, costTzs: cost };
  const money = async (key: string, extra: { budgetTzs?: number; noStart?: boolean; noEnqueue?: boolean } = {}) => {
    const A = h.fresh("A");
    h.clock.alignToWindow();
    h.sw.openFor(6 * 3_600_000);
    const L = await launch(h, A, { key, scn: 7, label: key, n: m, mix: MINI, duplicates: 0, oldTokens: 0, priceTzs: price, ...extra });
    return { A, L, id: L.campaign.id };
  };
  const requestsFor = (id: string): number => h.carrier.requestsOf(id).length;
  const startRefusalRows = async (id: string) => (await h.reader.audit(h.startedAt)).filter((e) => e.action === "marketing.campaign_start_refused" && e.targetId === id);

  // ── 7a · THE LIMIT ──
  {
    h.carrier.setBalance(5_000_000);
    forgetBalance();
    const { A, L, id } = await money("s7a", { budgetTzs: cost, noStart: true });
    const budget = L.campaign.budgetTzs ?? 0;
    const restore = A.startTweak({ cost: async () => ({ kind: "configured", tzsPerSegment: price + 1 }) });
    const refused = await start(h, A, id);
    restore();
    const camp = await S.db.smsCampaign.find(id);
    const rows = await h.reader.recipients(id);
    const audit = await startRefusalRows(id);
    const payload = (audit[0]?.payload ?? {}) as Record<string, unknown>;
    claimNow(h, "S7.limit.over", "the price moved up after the confirmation: today's cost strictly above the frozen limit → Start refuses `over_budget` with the two figures, the campaign stays CONFIRMED, nothing is written, nothing is sent",
      !refused.ok && refused.reason === "over_budget" && camp?.status === "CONFIRMED" && rows.length === 0 && requestsFor(id) === 0 && audit.length === 1
      && payload.costTzs === m * (price + 1) && payload.budgetTzs === budget && Object.keys(payload).sort().join() === "budgetTzs,costTzs,reason",
      `limit ${num(budget)}, today's cost ${num(m * (price + 1))}: ${refused.ok ? "STARTED" : refused.reason}; ${rows.length} rows; audit ${JSON.stringify(payload)}`);
    const okAtLimit = await start(h, A, id);
    await drive(h, A, id, {});
    const rowsEnd = await h.reader.recipients(id);
    const c = statusCounts(rowsEnd);
    const spent = [...h.carrier.handedBy(id).values()].reduce((a, b) => a + b, 0) * price;
    claimNow(h, "S7.limit.edge", "at exactly the limit Start goes ahead (only strictly above refuses), and the campaign never bills past the limit — one message a row, rows no more than confirmed",
      okAtLimit.ok && (await S.db.smsCampaign.find(id))?.status === "DONE" && spent <= budget && rowsEnd.length <= (L.campaign.audienceCount ?? 0) && c.SENT === rowsEnd.length - c.SKIPPED,
      `limit ${num(budget)}; billed ${num(spent)}; ${statusLine(c)}`);
    out.limit = { budget, spent };
  }

  // ── 7b · THE RESERVE, AT START ──
  {
    const { A, L, id } = await money("s7b", { noStart: true });
    h.carrier.setBalance(reserve + cost - 1);
    forgetBalance();
    const low = await start(h, A, id);
    const camp = await S.db.smsCampaign.find(id);
    const audit = await startRefusalRows(id);
    const payload = (audit[0]?.payload ?? {}) as Record<string, unknown>;
    claimNow(h, "S7.credit.low", "credit minus the campaign's cost one shilling under the reserve → Start refuses `credit_low` with the exact figures; nothing is written or sent",
      !low.ok && low.reason === "credit_low" && camp?.status === "CONFIRMED" && requestsFor(id) === 0 && (await h.reader.recipients(id)).length === 0 && payload.balanceTzs === reserve + cost - 1 && payload.costTzs === cost && payload.reserveTzs === reserve,
      `credit ${num(reserve + cost - 1)}, cost ${num(cost)}, reserve ${num(reserve)}: ${low.ok ? "STARTED" : low.reason}`);
    h.carrier.setBalance(reserve + cost);
    forgetBalance();
    h.clock.advance(61_000);
    const okStart = await start(h, A, id);
    const run = okStart.ok ? await drive(h, A, id, {}) : null;
    const end = await S.db.smsCampaign.find(id);
    const c = statusCounts(await h.reader.recipients(id));
    claimNow(h, "S7.credit.edge", "topped up to exactly reserve + cost, Start goes ahead and EVERYONE is sent, and the credit ends exactly AT the reserve — never under it",
      okStart.ok && c.SENT === L.world.expectedRows && L.world.expectedRows === m && h.carrier.balance() === reserve && [...h.carrier.handedBy(id).values()].every((k) => k === 1),
      `final credit ${num(h.carrier.balance())} vs reserve ${num(reserve)}; ${statusLine(c)}`);
    claimNow(h, "S7.credit.edge.done", "…and with nobody left to message the campaign ends DONE — it does not pause `marketing_floor` for a slice that has no people in it",
      end?.status === "DONE", `campaign ${end?.status}${end?.stopReason ? ` (${end.stopReason})` : ""} with ${c.PENDING + c.HELD} people waiting`);
    if (end?.status === "PAUSED") {
      // U49a's Resume lets a campaign with nobody left resume without a credit read ("the step finds nothing owed and finishes")…
      const back = await resume(h, A, id);
      const fin = await drive(h, A, id, {});
      const after = await S.db.smsCampaign.find(id);
      claimNow(h, "S7.credit.edge.resume", "…and Resume of such a campaign (nobody left) then FINISHES it — the step finds nothing owed — with no top-up",
        back.ok && fin.end === "terminal" && after?.status === "DONE", `resume ${back.ok ? "ok" : back.reason}; the next step ended ${fin.end}, campaign ${after?.status}${after?.stopReason ? ` (${after.stopReason})` : ""}`);
      if (after?.status !== "DONE") {
        // the way out the page names: top up, then Resume
        h.carrier.setBalance(reserve + 10_000);
        forgetBalance();
        h.clock.advance(61_000);
        const topped = await resume(h, A, id);
        const done = await drive(h, A, id, {});
        claimNow(h, "S7.credit.edge.topup", "a top-up and Resume finish it: DONE, every person still sent exactly once", topped.ok && done.end === "terminal" && (await S.db.smsCampaign.find(id))?.status === "DONE" && [...h.carrier.handedBy(id).values()].every((k) => k === 1), `${done.end}`);
      }
    }
  }

  // ── 7c · CREDIT THAT CANNOT BE READ ──
  {
    h.carrier.setBalance(reserve + cost + 1_000);
    forgetBalance();
    const { A, id } = await money("s7c", { noStart: true });
    h.carrier.setBalancePlan("error");
    const refused = await start(h, A, id);
    claimNow(h, "S7.credit.unread.start", "credit that cannot be read → Start refuses `credit_unreadable` (fail closed); nothing is written", !refused.ok && refused.reason === "credit_unreadable" && (await h.reader.recipients(id)).length === 0, `${refused.ok ? "STARTED" : refused.reason}`);
    h.carrier.setBalancePlan("ok");
    forgetBalance();
    h.clock.advance(61_000);
    const ok = await start(h, A, id);
    await drive(h, A, id, { until: (r) => r.view.progress?.phase === "sending" && r.view.progress.value >= 30 });
    const before = requestsFor(id);
    h.carrier.setBalancePlan("error");
    forgetBalance();
    h.clock.advance(61_000);
    const r = await step(h, A, id);
    const camp = await S.db.smsCampaign.find(id);
    const rows = await h.reader.recipients(id);
    const rs = await resume(h, A, id);
    claimNow(h, "S7.credit.unread.run", "credit unreadable mid-run → the next step pauses `credit_unreadable` BEFORE it claims anybody (no claim, no request), and Resume refuses while it is unreadable",
      ok.ok && r.ok && r.step.kind === "paused" && camp?.stopReason === "credit_unreadable" && requestsFor(id) === before && rows.every((x) => !(x.status === "PENDING" && x.claimToken !== null)) && !rs.ok && rs.reason === "credit_unreadable",
      `step → ${r.ok ? r.step.kind : "refused"}/${camp?.stopReason}; resume → ${rs.ok ? "ok" : rs.reason}`);
    h.carrier.setBalancePlan("ok");
    forgetBalance();
    h.clock.advance(61_000);
    await resume(h, A, id);
    await drive(h, A, id, {});
    claimNow(h, "S7.credit.unread.done", "…once the credit reads again, Resume finishes the campaign with everyone sent once", (await S.db.smsCampaign.find(id))?.status === "DONE" && [...h.carrier.handedBy(id).values()].every((k) => k === 1), "");
  }

  // ── 7d · THE CREDIT DRAINS WHILE IT RUNS ──
  {
    h.carrier.setBalance(reserve + cost + 500);
    forgetBalance();
    const { A, L, id } = await money("s7d");
    claimNow(h, "S7.credit.mid.start", "with credit above reserve + cost the campaign starts", L.started.ok, L.started.ok ? "started" : `${L.started.reason}`);
    await drive(h, A, id, { until: (r) => r.view.progress?.phase === "sending" && r.view.progress.value >= 60 });
    const sentBefore = [...h.carrier.handedBy(id).values()].length;
    // another consumer (login codes, another job) drains the credit to reserve + 410 — and the rail's reading is refreshed
    h.carrier.setBalance(reserve + 410);
    forgetBalance();
    h.clock.advance(61_000);
    const reqBefore = requestsFor(id);
    const run = await drive(h, A, id, {});
    const camp = await S.db.smsCampaign.find(id);
    const rows = await h.reader.recipients(id);
    const trueBalance = h.carrier.balance();
    const shortfall = Math.max(0, reserve - trueBalance);
    const oneSlice = S.engine.SLICE_MAX * price;
    claimNow(h, "S7.credit.mid.pause", "the shared credit drains mid-run: the campaign PAUSES `marketing_floor` with people still waiting, none claimed, and the credit never falls more than ONE slice's cost under the reserve",
      run.end === "paused" && camp?.stopReason === "marketing_floor" && rows.some((x) => x.status === "PENDING") && rows.every((x) => !(x.status === "PENDING" && x.claimToken !== null)) && shortfall <= oneSlice,
      `paused ${camp?.stopReason}; credit now ${num(trueBalance)} against reserve ${num(reserve)} (under by ${num(shortfall)} ≤ one slice ${num(oneSlice)}); ${requestsFor(id) - reqBefore} more request(s) after the drain; ${statusLine(statusCounts(rows))}`);
    claimNow(h, "S7.credit.mid.strict", "…and not at all: the credit kept for login codes is never gone into — a slice whose send would take it under is not sent",
      shortfall === 0, `credit ${num(trueBalance)} against reserve ${num(reserve)}: under by ${num(shortfall)}`);
    out.midRun = { reserve, creditAtPause: trueBalance, shortfall, sentBeforeDrain: sentBefore };
    // a top-up, and Resume finishes it
    h.carrier.setBalance(trueBalance + 10_000);
    forgetBalance();
    h.clock.advance(61_000);
    const rs = await resume(h, A, id);
    const end = await drive(h, A, id, {});
    const c = statusCounts(await h.reader.recipients(id));
    const budget = L.campaign.budgetTzs ?? 0;
    const spent = [...h.carrier.handedBy(id).values()].reduce((a, b) => a + b, 0) * price;
    claimNow(h, "S7.credit.mid.done", "a top-up and Resume finish the campaign: everyone sent once, the bill within the frozen limit, the credit at or above the reserve again",
      rs.ok && end.end === "terminal" && c.SENT === m && [...h.carrier.handedBy(id).values()].every((k) => k === 1) && spent <= budget && h.carrier.balance() >= reserve,
      `${statusLine(c)}; billed ${num(spent)} ≤ limit ${num(budget)}; credit ${num(h.carrier.balance())}`);
  }

  // ── 7e · BILLING THAT LAGS (the credit fix's review, 2026-10-08) — each charge lands 6 s after its reply, as Blackball's
  //    per-delivered-message billing can; the rail counts what its readings may not hold yet for its production window (30 s) ──
  {
    const lagWas = process.env.SMS_BILLING_LAG_MS;
    delete process.env.SMS_BILLING_LAG_MS;
    h.carrier.setBillLag(6_000);
    try {
      // what 7d sent ages out of the window first, so this campaign starts on its own figures
      h.clock.advance(61_000);
      h.carrier.setBalance(reserve + cost + 500);
      forgetBalance();
      const { A, L, id } = await money("s7e");
      await drive(h, A, id, { until: (r) => r.view.progress?.phase === "sending" && r.view.progress.value >= 60 });
      // another consumer spends the credit down — and what is still to be billed lands on top of it
      h.carrier.drainTo(reserve + 410);
      forgetBalance();
      const run = await drive(h, A, id, {});
      h.clock.advance(60_000);
      const after = h.carrier.eventualBalance();
      const camp = await S.db.smsCampaign.find(id);
      const shortfall = Math.max(0, reserve - after);
      claimNow(h, "S7.credit.lag.strict", "⭐ with each charge landing 6 s after its reply, a campaign the shared credit drains still PAUSES `marketing_floor` before the credit kept for login codes is gone into, once every charge has landed — the rail counts each send its readings may not hold yet",
        L.started.ok && run.end === "paused" && camp?.stopReason === "marketing_floor" && shortfall === 0,
        `${L.started.ok ? "started" : `not started (${L.started.reason})`}; paused ${camp?.stopReason}; once billing caught up the credit is ${num(after)} against reserve ${num(reserve)} (under by ${num(shortfall)})`);
      out.lateBilling = { lagMs: 6_000, creditAfterBilling: after, shortfall };
    } finally {
      h.carrier.setBillLag(0);
      if (lagWas === undefined) delete process.env.SMS_BILLING_LAG_MS;
      else process.env.SMS_BILLING_LAG_MS = lagWas;
    }
  }
  return out;
}
