/**
 * SCENARIO 5 · CRASH AND REAP — a server step dies after it claimed people, and the reaper (E6) settles them from the evidence
 * once their claim is old enough, on a fake clock. Three ways to die, twice over:
 *
 *   c1  after the claim, before a single person was checked or any message was written  → no evidence: the people were provably
 *       never handed over, so they are RELEASED (an attempt counted) and sent ONCE;
 *   c2  with the batch's rows written and the request on the carrier, the reply never read (the process is gone)  → the rows
 *       exist, the wire may have been reached: UNCONFIRMED, NEVER re-sent;
 *   c3  after the carrier ACCEPTED and `sendBatch` finished, before the settle  → the message rows say ACCEPTED: SENT from the
 *       evidence, NEVER re-sent.
 * Round A is watched step by step on a PAUSED campaign (what the page's reap-only step does on mount), including that a claim
 * younger than ten minutes is left alone; round B is the common path — the reaper inside a RUNNING campaign's next slice.
 * A crashed step's own promise never settles (its process is gone); a second process takes over.
 */
import { claimNow, drive, pause, resume, step } from "./core.mts";
import type { Harness } from "./core.mts";
import { launch, statusCounts, statusLine } from "./helpers.mts";
import { MIN, num, yieldTurn } from "./kit.mts";
import type { Person } from "./world.mts";
import type { StoredSmsCampaignRecipient, StoredSmsMessage } from "../../../src/lib/server/store.ts";

class CrashError extends Error {}

type Group = { rows: StoredSmsCampaignRecipient[]; messages: Map<string, StoredSmsMessage> };
type Round = { c1: Group; c2: Group; c3: Group };

async function until(cond: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 20_000; i++) {
    if (cond()) return;
    await yieldTurn();
  }
  throw new Error(`dry-fire crash: gave up waiting for ${what}`);
}

/** Three steps that die in three different places, each after claiming its people. */
async function crashRound(h: Harness, id: string, tag: string): Promise<Round> {
  const { S } = h;
  // this round's claims are the ones taken from here on: an earlier round's claim that a broken reaper never settled is not one of them
  const roundStart = h.clock.now();
  const real = S.engine.ENGINE_DEPS;
  // c1 · dies after the claim, before the gate
  const X1 = h.fresh(`${tag}1`);
  X1.tweak({ dispatch: async () => { throw new CrashError("the process died after claiming (dry-fire)"); } });
  const died1 = await X1.control.slice(id).then(() => null, (e: unknown) => e);
  // c2 · dies with its request on the carrier, the reply never read
  const X2 = h.fresh(`${tag}2`);
  const requestsBefore = h.carrier.requests.length;
  const doomed = h.carrier.requests.filter((q) => q.messages.some((w) => w.campaignId === id)).length + 1;
  h.carrier.setPlan(({ nth }) => (nth(id) === doomed ? { kind: "die", carrierHasIt: true } : null));
  void X2.control.slice(id).catch(() => undefined);
  await until(() => h.carrier.requests.length > requestsBefore, "the doomed step's request to reach the carrier");
  h.carrier.setPlan(null);
  // its process is gone: the slice it was running will never finish, so it no longer counts as in flight
  h.obs.slicesInFlight -= 1;
  // c3 · dies after the carrier accepted and sendBatch finished, before the settle
  const X3 = h.fresh(`${tag}3`);
  X3.tweak({ recipients: { ...real.recipients, settle: async () => { throw new CrashError("the process died before the settle (dry-fire)"); } } });
  const died3 = await X3.control.slice(id).then(() => null, (e: unknown) => e);
  if (!(died1 instanceof CrashError) || !(died3 instanceof CrashError)) throw new Error("dry-fire crash: a doomed step did not die where it was meant to");
  const stranded = (await h.reader.recipients(id)).filter((r) => r.status === "PENDING" && r.claimToken !== null && Date.parse(r.claimedAt ?? "") >= roundStart);
  const tokens = [...new Set(stranded.sort((a, b) => Date.parse(a.claimedAt ?? "") - Date.parse(b.claimedAt ?? "") || (a.id < b.id ? -1 : 1)).map((r) => r.claimToken as string))];
  if (tokens.length !== 3) throw new Error(`dry-fire crash: expected three stranded claims, found ${tokens.length}`);
  const msgs = await h.reader.messagesOf(stranded.map((r) => r.id));
  const byRow = new Map(msgs.map((m) => [m.targetId as string, m]));
  const group = (t: string): Group => ({ rows: stranded.filter((r) => r.claimToken === t), messages: byRow });
  return { c1: group(tokens[0]), c2: group(tokens[1]), c3: group(tokens[2]) };
}

export async function crash(h: Harness, n: number): Promise<Record<string, unknown>> {
  const { S } = h;
  h.carrier.setBalance(2_000_000);
  const R = h.fresh("R");
  const L = await launch(h, R, { key: "s5", scn: 5, label: "crash and reap", n });
  const id = L.campaign.id;
  const world = L.world;
  const personOf = (r: StoredSmsCampaignRecipient): Person => world.byKey.get(r.msisdn) as Person;
  const reapAfter = S.engine.REAP_AFTER_MS;

  // ── ROUND A: three crashes, then the page's reap-only steps on a PAUSED campaign ──
  const A = await crashRound(h, id, "XA");
  const strandedA = [...A.c1.rows, ...A.c2.rows, ...A.c3.rows];
  const haveMsg = (g: Group, r: StoredSmsCampaignRecipient): StoredSmsMessage | undefined => g.messages.get(r.id);
  claimNow(h, "S5.crash", "three steps died holding claims: c1 with no message at all, c2 with QUEUED message rows (the carrier holds the batch), c3 with ACCEPTED message rows (the carrier answered)",
    A.c1.rows.length > 0 && A.c1.rows.every((r) => !haveMsg(A.c1, r)) && A.c2.rows.some((r) => haveMsg(A.c2, r)?.status === "QUEUED") && A.c2.rows.every((r) => haveMsg(A.c2, r) === undefined || haveMsg(A.c2, r)?.status === "QUEUED")
    && A.c3.rows.some((r) => haveMsg(A.c3, r)?.status === "ACCEPTED") && A.c3.rows.every((r) => haveMsg(A.c3, r) === undefined || haveMsg(A.c3, r)?.status === "ACCEPTED"),
    `claims of ${A.c1.rows.length} + ${A.c2.rows.length} + ${A.c3.rows.length} people; messages: c2 ${[...new Set(A.c2.rows.map((r) => haveMsg(A.c2, r)?.status ?? "none"))].join("/")}, c3 ${[...new Set(A.c3.rows.map((r) => haveMsg(A.c3, r)?.status ?? "none"))].join("/")}`);

  await pause(h, R, id);
  h.clock.advance(reapAfter - MIN);
  const youngBefore = JSON.stringify(strandedA.map((r) => [r.id, r.status, r.claimToken, r.attempts]));
  for (let i = 0; i < 3; i++) await step(h, R, id);
  const youngAfter = JSON.stringify((await h.reader.recipients(id)).filter((r) => strandedA.some((s) => s.id === r.id)).map((r) => [r.id, r.status, r.claimToken, r.attempts]));
  const reapedAudit0 = (await h.reader.audit(h.startedAt)).filter((e) => e.action === "marketing.campaign_reaped" && e.targetId === id).length;
  claimNow(h, "S5.young", "a claim younger than ten minutes is never reaped: nine minutes on, three reap-only driver calls leave all the stranded people exactly as they were and write no reaper audit row",
    youngBefore === youngAfter && reapedAudit0 === 0, `${strandedA.length} stranded people at ${(reapAfter - MIN) / MIN} min: unchanged ${youngBefore === youngAfter}; reaped audit rows ${reapedAudit0}`);

  h.clock.advance(2 * MIN);
  const reapStep = await step(h, R, id);
  const afterReap = await h.reader.recipients(id);
  const byId = new Map(afterReap.map((r) => [r.id, r]));
  const noMessage = strandedA.filter((r) => !haveMsg(A.c1, r) && !haveMsg(A.c2, r) && !haveMsg(A.c3, r));
  const queued = [...A.c2.rows].filter((r) => haveMsg(A.c2, r)?.status === "QUEUED");
  const accepted = [...A.c3.rows].filter((r) => haveMsg(A.c3, r)?.status === "ACCEPTED");
  const reapRows = (await h.reader.audit(h.startedAt)).filter((e) => e.action === "marketing.campaign_reaped" && e.targetId === id);
  const reapPayload = (reapRows[0]?.payload ?? {}) as Record<string, number>;
  const releasedOk = noMessage.every((r) => { const x = byId.get(r.id); return x !== undefined && x.status === "PENDING" && x.claimToken === null && x.attempts === 1; });
  const queuedOk = queued.every((r) => { const x = byId.get(r.id); return x !== undefined && x.status === "UNCONFIRMED" && x.smsReference === haveMsg(A.c2, r)?.reference; });
  const acceptedOk = accepted.every((r) => { const x = byId.get(r.id); const m = haveMsg(A.c3, r); return x !== undefined && x.status === "SENT" && x.smsReference === m?.reference && x.sentAt === m?.sentAt; });
  claimNow(h, "S5.reap", "eleven minutes on, one reap-only call settles every stranded claim from the evidence: no message → released (PENDING, an attempt counted); QUEUED → UNCONFIRMED (its reference kept); ACCEPTED → SENT (its instant kept) — ONE audit row with the five counts",
    reapStep.ok && reapStep.step.kind === "reaped" && releasedOk && queuedOk && acceptedOk && reapRows.length === 1 && reapPayload.toPending === noMessage.length && reapPayload.toUnconfirmed === queued.length
    && reapPayload.toSent === accepted.length && reapPayload.reaped === noMessage.length + queued.length + accepted.length,
    `${noMessage.length} released · ${queued.length} UNCONFIRMED · ${accepted.length} SENT; audit ${JSON.stringify(reapPayload)}`);
  await resume(h, R, id);
  await step(h, R, id);

  // ── ROUND B: the common path — the reaper inside a RUNNING campaign's slice ──
  const B = await crashRound(h, id, "XB");
  const strandedB = [...B.c1.rows, ...B.c2.rows, ...B.c3.rows];
  h.clock.advance(reapAfter + MIN);
  const end = await drive(h, R, id, {});
  const rows = await h.reader.recipients(id);
  const counts = statusCounts(rows);
  const byKey = new Map(rows.map((r) => [r.msisdn, r]));
  const camp = await S.db.smsCampaign.find(id);
  const handed = h.carrier.handedBy(id);

  // every sendable person ends as the evidence says, and nobody is handed to the carrier twice
  const wrong: string[] = [];
  const hadMsg = (g: Group[], r: StoredSmsCampaignRecipient): StoredSmsMessage | undefined => g.map((x) => x.messages.get(r.id)).find((m) => m !== undefined);
  const groupsAll = [A.c1, A.c2, A.c3, B.c1, B.c2, B.c3];
  // a person whose batch the doomed c2 step had written (QUEUED rows) is UNCONFIRMED by the evidence; everyone else sendable is SENT
  const unconfirmedByEvidence = new Set([...A.c2.rows, ...B.c2.rows].filter((r) => hadMsg(groupsAll, r)?.status === "QUEUED").map((r) => r.msisdn));
  for (const p of world.people) {
    const r = byKey.get(p.key);
    if (r === undefined) continue;
    const times = handed.get(p.key) ?? 0;
    if (p.expect.send) {
      const expect = unconfirmedByEvidence.has(p.key) ? "UNCONFIRMED" : "SENT";
      if (r.status !== expect) wrong.push(`${p.cls} ${p.key.slice(-4)} ended ${r.status}, the evidence says ${expect}`);
      if (times !== 1) wrong.push(`${p.cls} ${p.key.slice(-4)} reached the carrier ${times} times`);
    } else if (times !== 0) {
      wrong.push(`${p.cls} ${p.key.slice(-4)} was sent to`);
    }
  }
  claimNow(h, "S5.once", "after both rounds every sendable person reached the carrier EXACTLY once — released people are sent once, UNCONFIRMED people are never re-sent, SENT-from-evidence people never again — and everyone refused stayed refused",
    wrong.length === 0 && camp?.status === "DONE" && end.end === "terminal", wrong.length === 0 ? `${statusLine(counts)}; ${num(handed.size)} numbers handed once` : wrong.slice(0, 4).join("; "));

  // the RG lines of people a crashed step had already refused (its gate ran and wrote the line, its settle never came) are one more than
  // their rows: written once at the crash and again when the reaper has released them and they are gated again — a refusal acted on twice
  const regated = [...A.c2.rows, ...A.c3.rows, ...B.c2.rows, ...B.c3.rows].filter((r) => {
    const p = personOf(r);
    return !p.expect.send && "reason" in p.expect && p.expect.reason.startsWith("rg_") && !hadMsg(groupsAll, r);
  }).length;
  h.rgRegated += regated;
  void strandedB;
  return {
    people: world.people.length, rows: rows.length, strandedRoundA: strandedA.length, strandedRoundB: strandedB.length,
    released: noMessage.length, unconfirmedFromEvidence: queued.length, sentFromEvidence: accepted.length, final: statusLine(counts),
    reapAfterMs: reapAfter, rgActedOnTwice: regated,
  };
}
