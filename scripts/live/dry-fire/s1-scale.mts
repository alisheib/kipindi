/**
 * SCENARIO 1 · SCALE — one campaign over a made-up audience of N people (default 3,000), driven to DONE by ONE driver.
 *
 * The audience is both populations at once (`population: "both"` — the contact book, then the player accounts the book does not
 * hold): consenting players with a registration row, players the book does not hold, contacts with a first-party attestation,
 * and every kind of person the gate must refuse (see `world.mts`), plus numbers the numbering plan refuses and second contact
 * rows holding an already-listed number. The real confirmed count, the real Start, the real enqueue in chunks of 1,000, the
 * real slices over the real gate and the real `sendBatch` over the fake carrier. Part-way through, people tap their stop links.
 * It reports what the owner asked: slices, their sizes, the per-slice gate and send times (min / median / p95 / max), the total.
 */
import { claim, claimNow, drive, enqueueAll, start } from "./core.mts";
import type { Harness } from "./core.mts";
import { SENDABLE, SOURCE_LINE, FALLBACK_EN, FALLBACK_SW, applyLateStops, buildWorld, confirmedCampaign } from "./world.mts";
import { classTable, rowOf, settledOf, sliceFigures, statusCounts, statusLine, sum } from "./helpers.mts";
import { json, ms, num } from "./kit.mts";

export async function scale(h: Harness, n: number): Promise<Record<string, unknown>> {
  const { S } = h;
  const proc = h.proc("A");
  const bounds = { max: S.engine.SLICE_MAX, min: S.engine.SLICE_MIN, start: S.engine.SLICE_START };
  h.carrier.setBalance(2_000_000);
  h.sw.openFor(6 * 3_600_000);

  const tBuild = h.clock.real();
  const world = await buildWorld(h, { id: "s1", n, population: "both" });
  const buildMs = h.clock.real() - tBuild;
  const camp = await confirmedCampaign(h, { key: "s1", filter: world.filter, name: "Dry-fire SCALE" });
  h.campaigns.push({ id: camp.id, scn: 1, label: "scale", world });
  const sendable = world.people.filter((p) => p.expect.send);

  // ── Start (the real check), then the enqueue in chunks ──
  const started = await start(h, proc, camp.id);
  const afterStart = await S.db.smsCampaign.find(camp.id);
  claimNow(h, "S1.start", "Start passes U49a's whole list and moves CONFIRMED → PREPARING with nothing written", started.ok && afterStart?.status === "PREPARING" && afterStart.startedAt !== null, started.ok ? "started" : `refused: ${started.reason} — ${started.message.slice(0, 120)}`);
  const tEnqueue = h.clock.real();
  const enq = await enqueueAll(h, proc, camp.id);
  const enqueueMs = h.clock.real() - tEnqueue;
  const rowsAfterEnqueue = await h.reader.recipients(camp.id);
  const enqObs = h.obs.enqueues.filter((o) => o.campaignId === camp.id);
  const wrote = enqObs.flatMap((o) => (o.result.kind === "wrote" ? [o.result] : []));
  const done = enqObs.flatMap((o) => (o.result.kind === "done" ? [o.result] : []));
  const audit = await h.reader.audit(h.startedAt);
  const enqueuedRow = audit.filter((e) => e.action === "marketing.campaign_enqueued" && e.targetId === camp.id);
  const lastStep = (enqueuedRow[0]?.payload ?? {}) as { rows?: number; confirmed?: number; lastStep?: { unusable?: number; duplicates?: number } };
  const insertedTotal = sum(wrote.map((w) => w.inserted)) + (done[0] ? Math.max(0, done[0].total - sum(wrote.map((w) => w.inserted))) : 0);
  const duplicatesTotal = sum(wrote.map((w) => w.duplicates)) + (lastStep.lastStep?.duplicates ?? 0);
  const unusableTotal = sum(wrote.map((w) => w.unusable)) + (done[0]?.unusable ?? 0);
  claimNow(h, "S1.enqueue", "the real enqueue writes exactly one row per usable person (rows = walk − duplicates − unusable), skips the duplicate rows by the unique key and counts the unusable numbers, then moves the campaign to RUNNING with ONE audit row", enq.end === "until"
    && rowsAfterEnqueue.length === world.expectedRows && insertedTotal === world.expectedRows && duplicatesTotal === world.duplicates && unusableTotal === world.unusable
    && enqueuedRow.length === 1 && lastStep.rows === world.expectedRows && lastStep.confirmed === camp.audienceCount && camp.audienceCount === world.walkRows,
  `walk ${num(world.walkRows)} (confirmed ${num(camp.audienceCount ?? 0)}) → rows ${num(rowsAfterEnqueue.length)} (expected ${num(world.expectedRows)}), duplicates skipped ${duplicatesTotal}/${world.duplicates}, unusable ${unusableTotal}/${world.unusable}, ${enqObs.length} enqueue step(s) in ${ms(enqueueMs)}`);

  // ── the slices, one driver; a few people tap their stop link a quarter of the way ──
  const stopAt = Math.floor(world.expectedRows * 0.25);
  let stopped = false;
  let stopsApplied = 0;
  const sliceFrom = h.obs.slices.length;
  const tDrive = h.clock.real();
  const run = await drive(h, proc, camp.id, {
    after: async (r) => {
      if (stopped || r.view.progress === null || r.view.progress.phase !== "sending" || r.view.progress.value < stopAt) return;
      stopped = true;
      stopsApplied = await applyLateStops(h, world, camp.id, Math.max(3, Math.ceil(sendable.length * 0.01)));
    },
  });
  const driveMs = h.clock.real() - tDrive;
  const fin = await S.db.smsCampaign.find(camp.id);
  const rows = await h.reader.recipients(camp.id);
  const counts = statusCounts(rows);
  const figs = sliceFigures(h, camp.id, sliceFrom);
  claimNow(h, "S1.done", "ONE driver takes the campaign to DONE: no pause, every step answered, ONE finish", run.end === "terminal" && fin?.status === "DONE" && h.obs.pauses.filter((p) => p.campaignId === camp.id).length === 0
    && h.obs.finishes.filter((f) => f.campaignId === camp.id).length === 1,
  `${run.steps} steps (${json(run.kinds)}), ends ${run.end}, campaign ${fin?.status}, ${statusLine(counts)}`);

  // ── outcomes against the oracle ──
  const byKey = rowOf(rows);
  const table = classTable(world, rows);
  const wrong: string[] = [];
  let sentRight = 0;
  for (const p of world.people) {
    const r = byKey.get(p.key);
    if ("unusable" in p.expect) { if (r !== undefined) wrong.push(`${p.cls} ${p.key.slice(-4)} became a row`); continue; }
    if (r === undefined) { wrong.push(`${p.cls} ${p.key.slice(-4)} has no row`); continue; }
    if (p.expect.send) {
      if (r.status === "SENT") sentRight += 1;
      else wrong.push(`${p.cls} ${p.key.slice(-4)} ended ${r.status}`);
    } else if (r.status !== "SKIPPED" || r.skipReason !== p.expect.reason) {
      wrong.push(`${p.cls} ${p.key.slice(-4)} ended ${r.status}/${r.skipReason ?? "-"}, owed SKIPPED/${p.expect.reason}`);
    }
  }
  claimNow(h, "S1.outcomes", "every person ends as the gate owes: the sendable SENT, every other kind SKIPPED with its own reason, the unusable never a row", wrong.length === 0, wrong.length === 0 ? `${num(sentRight)} SENT, ${num(counts.SKIPPED)} SKIPPED, ${statusLine(counts)}` : wrong.slice(0, 4).join("; "));

  // ── the wire ──
  const mine = h.carrier.requestsOf(camp.id);
  const wireMessages = sum(mine.map((r) => r.messages.length));
  const oversize = mine.filter((r) => r.messages.length > bounds.max);
  claimNow(h, "S1.wire", "the carrier saw exactly the sendable, each once, in requests of at most 50, all accepted, billed at 1 segment each", wireMessages === sendable.length - stopsApplied && oversize.length === 0
    && mine.every((r) => r.answered === "accepted") && h.carrier.handedBy(camp.id).size === wireMessages && h.carrier.billedFor(camp.id) === wireMessages * h.carrier.pricePerSegment,
  `${num(wireMessages)} messages in ${mine.length} requests (largest ${Math.max(0, ...mine.map((r) => r.messages.length))}); sendable ${num(sendable.length)} − ${stopsApplied} who stopped; billed TZS ${num(h.carrier.billedFor(camp.id))}`);

  // ── what each message said (E17: the origin is who holds the number now) ──
  const texts = h.carrier.texts;
  const bad: string[] = [];
  let checked = 0;
  for (const r of rows) {
    if (r.status !== "SENT") continue;
    const p = world.byKey.get(r.msisdn);
    const text = texts.get(r.msisdn);
    if (p === undefined || text === undefined) { bad.push("a SENT row has no recorded text"); continue; }
    checked += 1;
    const account = p.userId !== null;
    const en = account && p.locale === "EN";
    const first = (p.name ?? "").split(" ")[0];
    // ⛔ The owner's ruling of 2026-10-09: the message is the officer's text alone — the row keeps its stop token (for the
    // stop page), and no message carries a link, a token or the source line.
    if (!r.optOutToken) bad.push(`${p.cls}: the row keeps no stop token`);
    if (text.includes("/s/") || (r.optOutToken && text.includes(r.optOutToken))) bad.push(`${p.cls}: the message carries a stop link`);
    if (text.includes(SOURCE_LINE)) bad.push(`${p.cls}: the message carries the source line`);
    if (en ? !text.includes("today's offer") : !text.includes("ofa ya leo")) bad.push(`${p.cls}: the wrong language (${en ? "EN" : "SW"} owed)`);
    if (r.locale !== (en ? "EN" : "SW")) bad.push(`${p.cls}: the row says locale ${r.locale}`);
    const greeted = account && first !== "" ? first : en ? FALLBACK_EN : FALLBACK_SW;
    if (!text.includes(greeted)) bad.push(`${p.cls}: greeted by the wrong name`);
    if (!account && p.name !== null && first !== "" && text.includes(first) && first !== FALLBACK_SW) bad.push(`${p.cls}: a book contact's stored name was printed`);
  }
  claimNow(h, "S1.messages", "each message is the officer's text alone — no stop link, no source line (the row keeps its stop token) — in the right language, greeted by the account's own name (a contact the fallback)", bad.length === 0 && checked > 0, `${num(checked)} messages read; ${bad.length === 0 ? "all true" : bad.slice(0, 3).join("; ")}`);

  // ── E1: a refused person is never given a permanent link ──
  const skippedNew = rows.filter((r) => r.status === "SKIPPED" && !(world.byKey.get(r.msisdn)?.oldToken));
  const tokenOf = await h.reader.tokenCounts([...skippedNew.map((r) => r.msisdn), ...rows.filter((r) => r.status === "SENT").map((r) => r.msisdn)]);
  const refusedWithToken = skippedNew.filter((r) => (tokenOf.get(r.msisdn) ?? 0) > 0);
  const sentWithout = rows.filter((r) => r.status === "SENT" && (tokenOf.get(r.msisdn) ?? 0) === 0);
  claimNow(h, "S1.tokens", "E1: the stop link is made only for a person the gate cleared — no refused person holds a token row, every person sent to holds one", refusedWithToken.length === 0 && sentWithout.length === 0,
    `${skippedNew.length} refused people checked (${refusedWithToken.length} hold a token), ${rows.filter((r) => r.status === "SENT").length} sent (${sentWithout.length} without)`);

  // ── mid-run stop links ──
  const stoppedPeople = world.people.filter((p) => p.lateStopAt !== null);
  const stoppedOk = stoppedPeople.every((p) => {
    const r = byKey.get(p.key);
    return r !== undefined && r.status === "SKIPPED" && r.skipReason === "suppressed" && h.carrier.requestsFor(camp.id, p.key).length === 0;
  });
  claimNow(h, "S1.stops", "people who tap their stop link mid-run are refused at their own slice — SKIPPED suppressed, nothing on the wire, before or after", stoppedOk && stoppedPeople.length >= (sendable.length >= 200 ? 3 : 0),
    `${stoppedPeople.length} stopped after ${num(stopAt)} rows were settled; all SKIPPED suppressed with 0 carrier requests: ${stoppedOk}`);

  // ── the slices ──
  // the size is an AIM: every group but the last is between the floor and the ceiling; the last takes whoever is left, even two people
  const body = figs.allSizes.slice(0, -1);
  const tail = figs.allSizes[figs.allSizes.length - 1] ?? 0;
  const sizesOk = figs.sizes.count > 0 && body.every((k) => k >= bounds.min && k <= bounds.max) && tail >= 1 && tail <= bounds.max && figs.firstSizes[0] === bounds.start;
  claimNow(h, "S1.slices", `every group but the last is between ${bounds.min} and ${bounds.max} people (the last takes whoever is left), the first is ${bounds.start} (E11), and together they claimed everybody the campaign settled`, sizesOk && figs.sizes.sum >= settledOf(counts),
    `${figs.slices} slices; sizes min ${figs.sizes.min} median ${figs.sizes.median} p95 ${figs.sizes.p95} max ${figs.sizes.max}; first ${figs.firstSizes.join(",")}`);

  return {
    people: world.people.length, walkRows: world.walkRows, rows: rows.length, classes: world.counts, classOutcomes: table,
    buildMs: Math.round(buildMs), enqueueMs: Math.round(enqueueMs), enqueueSteps: enqObs.length, driveMs: Math.round(driveMs),
    totalMs: Math.round(buildMs + enqueueMs + driveMs), steps: run.steps,
    slices: figs.slices, sizes: figs.sizes, firstSizes: figs.firstSizes, gateMs: figs.gateMs, sendMs: figs.sendMs, waits: figs.waits,
    carrierRequests: mine.length, carrierMessages: wireMessages, billedTzs: h.carrier.billedFor(camp.id),
    recipientsPerSecond: driveMs > 0 ? Math.round((rows.length / driveMs) * 1000) : null,
    sendableStopped: stoppedPeople.length,
  };
}
