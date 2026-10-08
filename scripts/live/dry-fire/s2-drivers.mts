/**
 * SCENARIO 2 · TWO DRIVERS — the same campaign driven by two drivers at once, interleaved step for step: never a double send.
 *
 *   2a TWO TABS of one officer's browser: one server process, so the per-campaign step flight (E10 widened, U47b-1) must give the
 *      second tab `waiting busy` while the first is mid-step — never two slices of one campaign at once.
 *   2b TWO PROCESSES (a deploy's overlap, or two containers): each its own flight and its own engine state, so nothing but the
 *      claim's compare-and-set stands between them — they must take disjoint rows, and no person is sent to twice.
 * The carrier yields inside every request and the gate yields every few people, so the drivers truly take turns inside a slice.
 */
import { claimNow, drive } from "./core.mts";
import type { Harness, Process } from "./core.mts";
import { launch, statusCounts, statusLine, sum } from "./helpers.mts";
import { json, num, yieldTurn } from "./kit.mts";

/** The shipped gate, yielding the event loop every `every` people — so a second driver runs while this one is mid-slice. */
function yieldingGate(h: Harness, every: number) {
  let n = 0;
  return async (msisdn: string) => {
    n += 1;
    if (n % every === 0) await yieldTurn();
    return h.S.consent.mayReceiveMarketingSms(msisdn);
  };
}

async function oneCampaign(h: Harness, label: "tabs" | "procs", key: string, n: number, procs: Process[], drivers: string[]) {
  const { S } = h;
  const L = await launch(h, procs[0], { key, scn: 2, label: label === "tabs" ? "two tabs" : "two processes", n });
  const id = L.campaign.id;
  claimNow(h, `S2.${label}.start`, "the campaign starts and its list is written (RUNNING) before the drivers meet", L.started.ok && (await S.db.smsCampaign.find(id))?.status === "RUNNING", L.started.ok ? "started" : `refused ${L.started.reason}`);
  const sendable = L.world.people.filter((p) => p.expect.send);
  h.obs.maxSlicesInFlight = 0;
  const stepsFrom = h.obs.steps.length;
  const slicesFrom = h.obs.slices.length;
  const restores = procs.map((p) => p.tweak({ gate: yieldingGate(h, 7) }));
  const ends = await Promise.all(drivers.map((d, i) => drive(h, procs[label === "tabs" ? 0 : i], id, { driver: d, yieldOnBusy: true, yieldAfterStep: true })));
  for (const r of restores) r();
  const rows = await h.reader.recipients(id);
  const counts = statusCounts(rows);
  const fin = await S.db.smsCampaign.find(id);
  const handed = h.carrier.handedBy(id);
  const sentKeys = new Set(sendable.map((p) => p.key));
  const stray = [...handed.keys()].filter((k) => !sentKeys.has(k));
  const missed = sendable.filter((p) => (handed.get(p.key) ?? 0) !== 1);
  const steps = h.obs.steps.slice(stepsFrom).filter((s) => s.campaignId === id);
  const busy = Object.fromEntries(drivers.map((d) => [d, steps.filter((s) => s.proc === d && s.step?.kind === "waiting" && s.step.busy).length]));
  const worked = Object.fromEntries(drivers.map((d) => [d, steps.filter((s) => s.proc === d && s.step?.kind === "sent").length]));
  const slices = h.obs.slices.slice(slicesFrom).filter((s) => s.campaignId === id && s.result.kind === "sent");
  const handedOver = sum(slices.map((s) => (s.result.kind === "sent" ? s.result.handedOver : 0)));
  claimNow(h, `S2.${label}.done`, "both drivers see the campaign DONE: no pause, ONE finish, every driver's loop ended", fin?.status === "DONE" && ends.every((e) => e.end === "terminal")
    && h.obs.pauses.filter((p) => p.campaignId === id).length === 0 && h.obs.finishes.filter((f) => f.campaignId === id).length === 1,
  `${drivers.map((d, i) => `${d}: ${ends[i].steps} steps ${json(ends[i].kinds)}`).join(" · ")} · campaign ${fin?.status}`);
  claimNow(h, `S2.${label}.once`, "every sendable person is sent to EXACTLY once and nobody else is", missed.length === 0 && stray.length === 0 && counts.SENT === sendable.length,
    `${num(sendable.length)} sendable → ${num(counts.SENT)} SENT, ${num(handed.size)} numbers on the wire (${stray.length} stray, ${missed.length} not exactly once) · ${statusLine(counts)}`);
  if (label === "tabs") {
    claimNow(h, "S2.tabs.flight", "the two tabs never ran two slices at once (max in flight 1), they truly overlapped (a busy answer each side or the other), and both did work",
      h.obs.maxSlicesInFlight === 1 && sum(Object.values(busy)) > 0 && sum(Object.values(worked)) === slices.length,
      `max slices in flight ${h.obs.maxSlicesInFlight} · busy answers ${json(busy)} · slices run ${json(worked)}`);
  } else {
    const bySlice = worked;
    claimNow(h, "S2.procs.overlap", "the two processes really ran slices at the same time (max in flight ≥ 2), both took rows, and the rows they took are disjoint (their hand-overs add up to the sendable)",
      h.obs.maxSlicesInFlight >= 2 && Object.values(bySlice).every((c) => c > 0) && handedOver === sendable.length && procs.every((p) => p.state.flight === null),
      `max slices in flight ${h.obs.maxSlicesInFlight} · slices by process ${json(bySlice)} · handed over ${num(handedOver)} of ${num(sendable.length)} · busy ${json(busy)}`);
  }
  return { id, rows: rows.length, counts, maxInFlight: h.obs.maxSlicesInFlight, busy, worked, steps: steps.length, slices: slices.length };
}

export async function drivers(h: Harness, n: number): Promise<Record<string, unknown>> {
  h.carrier.setBalance(2_000_000);
  h.carrier.setYield(true);
  try {
    const A = h.fresh("A");
    const tabs = await oneCampaign(h, "tabs", "s2a", n, [A], ["tab1", "tab2"]);
    const P1 = h.fresh("P1");
    const P2 = h.fresh("P2");
    const procs = await oneCampaign(h, "procs", "s2b", n, [P1, P2], ["P1", "P2"]);
    return { tabs, procs };
  } finally {
    h.carrier.setYield(false);
  }
}
