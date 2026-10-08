/**
 * SCENARIO 3 · PAUSE / RESUME / STOP MID-RUN — an officer's three controls, pressed at the awkward moments:
 *
 *   · PAUSE at about 30 % settled: nothing new may START sending — the claim, the wire and the rows stay exactly as they were
 *     while the page keeps asking for steps;
 *   · RESUME: the campaign goes on, and the HELD rows (none here) start over;
 *   · PAUSE LANDING MID-SLICE (after the third person of a group was gated): the group still gating is vetoed by its own re-read
 *     before the wire — zero requests, its rows released as they were;
 *   · STOP at about 70 %, pressed WHILE a group is in flight on the carrier: that one group, already past its last check, still
 *     goes (counted, and never more than one slice); nothing after it; the headline says the true number left unmessaged; the rows
 *     the stop left are untouched (E25) and nobody among them has a message.
 */
import { claimNow, drive, pause, resume, start, step, stop, viewOf } from "./core.mts";
import type { Harness } from "./core.mts";
import { launch, settledOf, statusCounts, statusLine } from "./helpers.mts";
import { num } from "./kit.mts";

async function snap(h: Harness, id: string) {
  const rows = await h.reader.recipients(id);
  const counts = statusCounts(rows);
  return {
    rows, counts,
    claimed: rows.filter((r) => r.status === "PENDING" && r.claimToken !== null).length,
    requests: h.carrier.requests.length,
    messages: h.carrier.requests.reduce((n, r) => n + r.messages.length, 0),
    last: await Promise.resolve(h.S.db.smsCampaignRecipient.lastActivity(id)),
  };
}

export async function controls(h: Harness, n: number): Promise<Record<string, unknown>> {
  const { S } = h;
  const A = h.fresh("A");
  h.carrier.setBalance(2_000_000);
  const L = await launch(h, A, { key: "s3", scn: 3, label: "pause resume stop", n });
  const id = L.campaign.id;
  const rowsN = L.world.expectedRows;
  const thirty = Math.ceil(rowsN * 0.3);
  const fortyFive = Math.ceil(rowsN * 0.45);
  const seventy = Math.ceil(rowsN * 0.7);
  claimNow(h, "S3.start", "the campaign starts and its list is written", L.started.ok && (await S.db.smsCampaign.find(id))?.status === "RUNNING", `${num(rowsN)} rows`);

  // ── 30 %: PAUSE — nothing new starts ──
  await drive(h, A, id, { until: (r) => r.view.progress?.phase === "sending" && r.view.progress.value >= thirty });
  const atPause = await snap(h, id);
  const p = await pause(h, A, id);
  const afterPause = await S.db.smsCampaign.find(id);
  const pausedView = await viewOf(h, A, id);
  const pct = (c: ReturnType<typeof statusCounts>): string => `${Math.round((settledOf(c) / Math.max(1, rowsN)) * 100)} %`;
  claimNow(h, "S3.pause", "Pause: PREPARING/RUNNING → PAUSED with the officer's reason, the page names who, no row left claimed",
    p.ok && afterPause?.status === "PAUSED" && afterPause.stopReason === "officer_paused" && afterPause.pausedAt !== null && pausedView.stopSentence?.includes("Amina") === true && (await snap(h, id)).claimed === 0,
    `paused at ${pct(atPause.counts)} settled · "${pausedView.stopSentence ?? ""}"`);
  const reqBefore = h.carrier.requests.length;
  const idle: string[] = [];
  for (let i = 0; i < 6; i++) {
    const r = await step(h, A, id);
    idle.push(r.ok ? `${r.step.kind}/${r.view.status}` : "refused");
  }
  const whilePaused = await snap(h, id);
  const sameRows = JSON.stringify(atPause.rows.map((r) => [r.id, r.status, r.attempts, r.claimToken])) === JSON.stringify(whilePaused.rows.map((r) => [r.id, r.status, r.attempts, r.claimToken]));
  claimNow(h, "S3.pause.veto", "while PAUSED six more driver calls start nothing: no request on the carrier, no claim, no row moved, the newest-claim instant unchanged",
    h.carrier.requests.length === reqBefore && whilePaused.claimed === 0 && sameRows && whilePaused.last === atPause.last && idle.every((x) => x.endsWith("/PAUSED")),
    `6 steps → ${[...new Set(idle)].join(", ")}; requests ${reqBefore} → ${h.carrier.requests.length}; rows unchanged ${sameRows}`);

  // ── RESUME ──
  const again = await resume(h, A, id);
  const resumed = await S.db.smsCampaign.find(id);
  const twice = await resume(h, A, id);
  claimNow(h, "S3.resume", "Resume: PAUSED → RUNNING with the reason cleared; a second Resume is refused (not paused)",
    again.ok && resumed?.status === "RUNNING" && resumed.stopReason === null && !twice.ok && twice.reason === "not_paused", `${again.message.slice(0, 60)} · second: ${twice.reason ?? "ok"}`);

  // ── 45 %: a Pause LANDS while a group is still being gated ──
  await drive(h, A, id, { until: (r) => r.view.progress?.phase === "sending" && r.view.progress.value >= fortyFive });
  const beforeMid = await snap(h, id);
  let gateCalls = 0;
  let fired = false;
  const restore = A.tweak({
    gate: async (msisdn: string) => {
      gateCalls += 1;
      if (!fired && gateCalls === 3) {
        fired = true;
        await pause(h, A, id);
      }
      return S.consent.mayReceiveMarketingSms(msisdn);
    },
  });
  const mid = await step(h, A, id);
  restore();
  const afterMid = await snap(h, id);
  const changed = afterMid.rows.filter((r, i) => r.status !== beforeMid.rows[i].status || r.attempts !== beforeMid.rows[i].attempts);
  const onlySkips = changed.every((r, i) => r.status === "SKIPPED");
  const midState = await S.db.smsCampaign.find(id);
  claimNow(h, "S3.midslice", "a Pause landing while a group is being gated vetoes that group: ZERO requests, no row left claimed, no row sent or failed, none charged an attempt (only people the gate refused are settled)",
    fired && afterMid.requests === beforeMid.requests && afterMid.claimed === 0 && onlySkips && midState?.status === "PAUSED" && midState.stopReason === "officer_paused"
    && mid.ok && mid.step.kind === "not_running",
    `the pause fired at gate call 3; step → ${mid.ok ? mid.step.kind : "refused"}; requests ${beforeMid.requests} → ${afterMid.requests}; ${changed.length} rows moved, all SKIPPED: ${onlySkips}`);
  const again2 = await resume(h, A, id);

  // ── 70 %: STOP, pressed while a group is in flight on the carrier ──
  await drive(h, A, id, { until: (r) => r.view.progress?.phase === "sending" && r.view.progress.value >= seventy });
  let stopSeq = -1;
  let atStop: Awaited<ReturnType<typeof snap>> | null = null;
  let stopRes: Awaited<ReturnType<typeof stop>> | null = null;
  h.carrier.onRequest = async (rec) => {
    if (stopSeq !== -1 || !rec.messages.some((m) => m.campaignId === id)) return;
    stopSeq = rec.seq;
    atStop = await snap(h, id);
    stopRes = await stop(h, A, id);
  };
  const finish = await drive(h, A, id, {});
  h.carrier.onRequest = null;
  const reqAfterStop = h.carrier.requests.length;
  for (let i = 0; i < 5; i++) await step(h, A, id);
  const end = await snap(h, id);
  const fin = await S.db.smsCampaign.find(id);
  const group = h.carrier.requests.find((r) => r.seq === stopSeq);
  const groupKeys = new Set((group?.messages ?? []).map((m) => m.msisdn));
  const groupRows = end.rows.filter((r) => groupKeys.has(r.msisdn));
  const later = h.carrier.requests.filter((r) => r.seq > stopSeq).length;
  const sliceMax = S.engine.SLICE_MAX;
  claimNow(h, "S3.stop.inflight", "Stop pressed while a group is in flight: that ONE group (never more than one slice) still goes and is settled; no request after it, five more driver calls included",
    stopRes !== null && (stopRes as { ok: boolean }).ok && fin?.status === "CANCELLED" && fin.stopReason === "officer_stopped" && group !== undefined && group.messages.length <= sliceMax
    && groupRows.length === group.messages.length && groupRows.every((r) => r.status === "SENT") && later === 0 && h.carrier.requests.length === reqAfterStop && finish.end === "terminal",
    `stopped at ${atStop ? pct((atStop as { counts: ReturnType<typeof statusCounts> }).counts) : "?"} settled during request ${stopSeq}; messages sent after the stop: ${group?.messages.length ?? "?"} (that one group, ≤ ${sliceMax}); requests after it: ${later}`);

  const left = end.counts.PENDING + end.counts.HELD;
  const stopAudit = (await h.reader.audit(h.startedAt)).filter((e) => e.action === "marketing.campaign_stopped" && e.targetId === id);
  const outstanding = (stopAudit[0]?.payload as { outstanding?: number } | undefined)?.outstanding;
  const stopCounts = atStop ? (atStop as { counts: ReturnType<typeof statusCounts> }).counts : null;
  const settledAfter = stopCounts === null ? NaN : settledOf(end.counts) - settledOf(stopCounts);
  claimNow(h, "S3.stop.books", "Stop's audit row counts what was left at the stop, and nothing is lost or invented after it: left now + settled since the stop = what the stop recorded",
    stopAudit.length === 1 && stopCounts !== null && outstanding === stopCounts.PENDING + stopCounts.HELD && left + settledAfter === outstanding,
    `audit says ${outstanding} outstanding at the stop; now ${num(left)} left + ${settledAfter} settled by the in-flight group = ${left + settledAfter}`);

  const view = await viewOf(h, A, id);
  const headline = view.headline;
  const said = left === 0 ? headline.includes("nobody on it was left to message") : headline.includes(`${S.liveCopy.peopleCount(left)} ${left === 1 ? "was" : "were"} not messaged`);
  claimNow(h, "S3.stop.headline", "the stopped headline is true: it names the officer and says the exact number of people left unmessaged",
    headline.startsWith("Stopped by Amina") && said && view.statusLabel === "Stopped" && view.kpis.waiting === left, `"${headline}" (rows left: ${left})`);

  const untouched = end.rows.filter((r) => r.status === "PENDING" || r.status === "HELD");
  const wasBefore = new Map((atStop ? (atStop as { rows: typeof end.rows }).rows : []).map((r) => [r.id, r]));
  const reached = untouched.filter((r) => h.carrier.requestsFor(id, r.msisdn).length > 0);
  const rewritten = untouched.filter((r) => {
    const w = wasBefore.get(r.id);
    return r.claimToken !== null || (w !== undefined && (w.attempts !== r.attempts || w.status !== r.status));
  });
  claimNow(h, "S3.stop.untouched", "E25: a Stop rewrites nothing — the people it left stay PENDING and unclaimed, with their attempts as they were, and none of them was ever messaged",
    untouched.length === left && reached.length === 0 && rewritten.length === 0, `${num(untouched.length)} rows left; ${reached.length} reached the carrier; ${rewritten.length} rewritten`);

  const rs = await resume(h, A, id);
  const ps = await pause(h, A, id);
  const st = await start(h, A, id);
  claimNow(h, "S3.stop.final", "a stopped campaign cannot be resumed, paused or started again", !rs.ok && rs.reason === "not_paused" && !ps.ok && !st.ok, `resume → ${rs.reason}, pause → ${ps.reason}, start → ${st.reason}`);

  return {
    rows: rowsN, pausedAtPercent: pct(atPause.counts), midSlicePausedAt: pct(beforeMid.counts), stoppedAtPercent: stopCounts ? pct(stopCounts) : null,
    inFlightGroup: group?.messages.length ?? null, requestsAfterStop: later, leftUnmessaged: left, final: statusLine(end.counts),
    resumedTwice: again.ok && again2.ok,
  };
}
