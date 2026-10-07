/**
 * test:marketing-engine §R — U43b-2's guard: THE REAPER (ENGINE-SPEC §4.13 decision 2 step 3, E6, DC-1, E24, and §3.3: a
 * PAUSED, CANCELLED or DONE campaign is only reaped).
 *
 * ⚠️ A SECTION MODULE, run by `scripts/marketing-engine.test.mts`. ⭐ DRIVEN: `reapStrandedClaims` and `runCampaignSlice`
 * on the memory twin over stranded claims (rows claimed through the REAL claim door at an instant in the past) and the
 * evidence `sendBatch` would have written (`SmsMessage` rows naming them) — the REAL stranded read, evidence read and settle
 * door — and the pure table (`reapVerdict`) row by row.
 * ⛔ IN-PROCESS: every plant is a dependency or a rule swapped in memory; no SMS, no file, no database. ⛔ No backslash.
 */
import * as ENGINE from "../../src/lib/server/marketing/engine.ts";
import type { EngineDeps, SliceStepResult } from "../../src/lib/server/marketing/engine.ts";
import * as RULES from "../../src/lib/marketing/engine-rules.ts";
import type { ReapEvidence } from "../../src/lib/marketing/engine-rules.ts";
import { DISPATCH_TARGET_TYPE } from "../../src/lib/server/marketing/dispatch.ts";
import { db } from "../../src/lib/server/store.ts";
import type { SmsStatus, StoredSmsCampaignRecipient, StoredSmsMessage } from "../../src/lib/server/store.ts";
import {
  CLEARS_ALL, auditRows, campaignOf, claim, engineDeps, freshState, json, keyIn, moveCampaign, nextRun, rowOf, runningCampaign,
  said, seat, stubWire,
} from "./engine-world.mts";
import type { Check } from "./engine-world.mts";
import type { EngineSection, EnginePlant } from "./f-credit.mts";

/* ══ THE LABELS ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

const L = {
  r1: "R1 · ⭐ EVERY ROW OF THE REAP TABLE (E6), pure and driven — no message → PENDING with attempts + 1 and the claim cleared; QUEUED and UNKNOWN → UNCONFIRMED with the reference kept; ACCEPTED → SENT dated by the message's own hand-over instant; DELIVERED → DELIVERED at the message's instant; a FAILED the wire wrote → FAILED class FAILED with its words, one a receipt wrote → FAILED class receipt:<token> with the receipt's words; each with a reaper's trail; and the result counts each kind",
  r2: "R2 · ⭐ E6's DOUBLE-SEND GUARD — a stalled claimant whose claims were reaped while it gated resumes, beforeSend keeps NONE of them, and the wire is called ZERO times: the rows stay where the reaper put them",
  r3: "R3 · a claim YOUNGER than REAP_AFTER_MS is never reaped — nor one exactly ten minutes old (strictly older than the cutoff); one a millisecond older is",
  r4: "R4 · THE REAPER RUNS FOR A PAUSED AND A CANCELLED CAMPAIGN (§3.3: they are only reaped) — their stranded claims settled from the evidence, so a stopped campaign never shows not sent for a message that went",
  r5: "R5 · ⭐ DC-1 · A MESSAGE MADE BEFORE THE CLAIM IS NO EVIDENCE FOR IT — an earlier attempt's FAILED (a refused chunk E7 released) leaves the row PENDING (+1), never FAILED for a message this claim never sent; the same message made after the claim is the claim's",
  r6: "R6 · E24 · ONE SYSTEM marketing.campaign_reaped ROW per reap that settled anybody, carrying the five reap counts and their sum — and none for a reap that settled nobody",
  r7: "R7 · EVIDENCE THAT CANNOT BE READ WHOLE NEVER RE-SENDS — an ACCEPTED message with no hand-over instant, a DELIVERED one with no delivery instant and a status the table does not know are UNCONFIRMED; a message whose own instant cannot be read is read as this claim's",
  r8: "R8 · THE REAPER RUNS FIRST IN A RUNNING CAMPAIGN'S STEP — the stranded claim settled from its evidence (counted in the step's result), then the free rows claimed and sent",
} as const;

/* ══ THE IMPLEMENTATION UNDER TEST ═════════════════════════════════════════════════════════════════════════════════ */

export type RImpl = {
  reap: typeof ENGINE.reapStrandedClaims;
  step: typeof ENGINE.runCampaignSlice;
  verdict: typeof RULES.reapVerdict;
  deps: (d: EngineDeps) => EngineDeps;
};
export const R_REAL: RImpl = { reap: ENGINE.reapStrandedClaims, step: ENGINE.runCampaignSlice, verdict: RULES.reapVerdict, deps: (d) => d };

/* ══ THE FIXTURE WORLD ═════════════════════════════════════════════════════════════════════════════════════════════ */

const T = Date.parse("2026-10-07T09:00:00.000Z");
const MIN = 60_000;
const iso = (ms: number): string => new Date(ms).toISOString();
const pad = (n: number, w: number): string => String(n).padStart(w, "0");

function worldOf(prefix: string) {
  const run = nextRun();
  return {
    run,
    key: (i: number) => keyIn("67", run * 1000 + i),
    cid: `cmp_${prefix}_${run}`,
    rid: (i: number) => `rcp_${prefix}_${pad(run, 5)}_${pad(i, 3)}`,
    token: `rtok_${prefix}_${run}`,
  };
}

/** `n` rows on a fresh RUNNING campaign, ALL claimed under one token at `claimedAt`, through the REAL claim door. */
async function stranded(w: ReturnType<typeof worldOf>, n: number, claimedAt: number, free = 0): Promise<string[]> {
  await runningCampaign(w.cid, { count: n + free });
  const ids = Array.from({ length: n + free }, (_, i) => w.rid(i));
  await seat(w.cid, ids.map((id, i) => ({ id, key: w.key(i) })));
  if (n > 0) {
    const won = await db.smsCampaignRecipient.claim(w.cid, n, w.token, iso(claimedAt));
    if (won.length !== n) throw new Error(`fixture: claimed ${won.length} of ${n}`);
  }
  return ids;
}

let REFS = 0;
/** The message `sendBatch` (or a receipt) would have left naming a row — written straight into the store, as evidence. */
async function evidence(rowId: string, key: string, status: SmsStatus, o: Partial<StoredSmsMessage> & { createdAt: string }): Promise<string> {
  const reference = `sms_reap_${pad(++REFS, 8)}_evidence`;
  await Promise.resolve(db.smsMessage.create({
    reference, msisdn: key, purpose: "MARKETING", provider: "blackball", senderId: "50PICK", bodyLen: 80, status, providerMsg: null,
    dlrStatus: null, dlrDesc: null, balanceTzs: null, attempts: 1, targetType: DISPATCH_TARGET_TYPE, targetId: rowId,
    sentAt: null, deliveredAt: null, failedAt: null, ...o,
  }));
  return reference;
}

const depsAt = (now: number, over: Partial<EngineDeps> = {}): EngineDeps =>
  engineDeps(freshState(), stubWire(), { now: () => new Date(now), gate: CLEARS_ALL, ...over });

const statusOf = async (ids: readonly string[]): Promise<string> => (await Promise.all(ids.map((id) => rowOf(id)))).map((r) => r?.status ?? "none").join(",");

/* ══ THE SECTION ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

async function runSectionR(impl: RImpl, ok: Check): Promise<void> {
  // ── R1 · every row of the reap table, pure and driven ──
  await claim(ok, L.r1, async () => {
    // pure: one stranded row, every kind of evidence
    const row = { id: "rcp_r1_pure", campaignId: "cmp_r1", msisdn: keyIn("67", 1), contactId: null, userId: null, status: "PENDING", smsReference: null,
      optOutToken: null, locale: null, failureClass: null, error: null, skipReason: null, skipDetail: null, claimToken: "rtok_r1_pure", claimedAt: iso(T - 15 * MIN),
      attempts: 0, segments: null, bodyLen: null, costTzs: null, gateTrail: null, createdAt: iso(T - 20 * MIN), updatedAt: iso(T - 15 * MIN), sentAt: null,
      deliveredAt: null, failedAt: null } as StoredSmsCampaignRecipient;
    const ev = (status: SmsStatus, o: Partial<NonNullable<ReapEvidence>> = {}): ReapEvidence =>
      ({ reference: "sms_r1_pure_reference_0001", status, createdAt: iso(T - 14 * MIN), sentAt: null, deliveredAt: null, failedAt: null, providerMsg: null, dlrStatus: null, dlrDesc: null, ...o });
    const v = (e: ReapEvidence) => impl.verdict(row, e, iso(T));
    const none = v(null);
    const q = v(ev("QUEUED"));
    const u = v(ev("UNKNOWN"));
    const a = v(ev("ACCEPTED", { sentAt: iso(T - 14 * MIN + 500) }));
    const d = v(ev("DELIVERED", { sentAt: iso(T - 14 * MIN + 500), deliveredAt: iso(T - 13 * MIN) }));
    const fw = v(ev("FAILED", { failedAt: iso(T - 14 * MIN + 600), providerMsg: "Invalid credentials" }));
    const fr = v(ev("FAILED", { failedAt: iso(T - 12 * MIN), dlrStatus: "UNDELIV", dlrDesc: "absent subscriber" }));
    const pure = none.to === "PENDING" && none.attemptsDelta === 1 && none.claimToken === "rtok_r1_pure"
      && q.to === "UNCONFIRMED" && q.smsReference === "sms_r1_pure_reference_0001" && u.to === "UNCONFIRMED"
      && a.to === "SENT" && a.sentAt === iso(T - 14 * MIN + 500) && d.to === "DELIVERED" && d.deliveredAt === iso(T - 13 * MIN)
      && fw.to === "FAILED" && fw.failureClass === "FAILED" && fw.error === "Invalid credentials" && fw.failedAt === iso(T - 14 * MIN + 600)
      && fr.to === "FAILED" && fr.failureClass === "receipt:UNDELIV" && fr.error === "absent subscriber"
      && [q, u, a, d, fw, fr].every((p) => "gateTrail" in p && p.gateTrail[0]?.check === "reaper");
    // driven: seven stranded claims and their evidence, through the REAL doors
    const w = worldOf("r1");
    const ids = await stranded(w, 7, T - 15 * MIN);
    const after = T - 14 * MIN;
    const refQ = await evidence(ids[1], w.key(1), "QUEUED", { createdAt: iso(after) });
    await evidence(ids[2], w.key(2), "UNKNOWN", { createdAt: iso(after) });
    await evidence(ids[3], w.key(3), "ACCEPTED", { createdAt: iso(after), sentAt: iso(after + 400) });
    await evidence(ids[4], w.key(4), "DELIVERED", { createdAt: iso(after), sentAt: iso(after + 400), deliveredAt: iso(after + 9_000) });
    await evidence(ids[5], w.key(5), "FAILED", { createdAt: iso(after), failedAt: iso(after + 400), providerMsg: "Invalid credentials" });
    await evidence(ids[6], w.key(6), "FAILED", { createdAt: iso(after), failedAt: iso(after + 9_000), dlrStatus: "UNDELIV", dlrDesc: "absent subscriber" });
    const result = await impl.reap(w.cid, impl.deps(depsAt(T)));
    const rows = await Promise.all(ids.map((id) => rowOf(id)));
    const driven = rows[0]?.status === "PENDING" && rows[0].attempts === 1 && rows[0].claimToken === null
      && rows[1]?.status === "UNCONFIRMED" && rows[1].smsReference === refQ && rows[2]?.status === "UNCONFIRMED"
      && rows[3]?.status === "SENT" && rows[3].sentAt === iso(after + 400) && rows[4]?.status === "DELIVERED" && rows[4].deliveredAt === iso(after + 9_000)
      && rows[5]?.status === "FAILED" && rows[5].failureClass === "FAILED" && rows[6]?.status === "FAILED" && rows[6].failureClass === "receipt:UNDELIV"
      && json(result) === json({ reaped: 7, toPending: 1, toSent: 1, toUnconfirmed: 2, toFailed: 2, toDelivered: 1 });
    return [pure && driven, `pure ${pure} · driven rows ${rows.map((r) => r?.status).join(",")} · result ${json(result)}`];
  });

  // ── R2 · the stalled claimant: its claims reaped while it gated, it sends nothing ──
  await claim(ok, L.r2, async () => {
    const w = worldOf("r2");
    await runningCampaign(w.cid, { count: 2 });
    await seat(w.cid, [{ id: w.rid(0), key: w.key(0) }, { id: w.rid(1), key: w.key(1) }]);
    let reaped: Awaited<ReturnType<typeof ENGINE.reapStrandedClaims>> | null = null;
    const stall: EngineDeps["gate"] = async (m) => {
      // ⭐ The slice stalls here, and eleven minutes later another step's reaper finds its claims stranded.
      if (reaped === null) reaped = await impl.reap(w.cid, impl.deps(depsAt(T + 11 * MIN)));
      return CLEARS_ALL(m);
    };
    const wire = stubWire();
    const r = await impl.step(w.cid, impl.deps(engineDeps(freshState(), wire, { now: () => new Date(T), gate: stall })));
    const rows = await Promise.all([rowOf(w.rid(0)), rowOf(w.rid(1))]);
    return [wire.calls === 0 && rows.every((x) => x?.status === "PENDING" && x.claimToken === null && x.attempts === 1)
      && (reaped as { toPending: number } | null)?.toPending === 2,
      `${said(r)} · wire calls ${wire.calls} · rows ${rows.map((x) => `${x?.status}/${x?.attempts}`).join(",")} · reaped ${json(reaped)}`];
  });

  // ── R3 · young claims are never reaped ──
  await claim(ok, L.r3, async () => {
    const out: string[] = [];
    let holds = true;
    for (const [age, want] of [[9 * MIN + 59_000, 0], [10 * MIN, 0], [10 * MIN + 1, 1]] as const) {
      const w = worldOf("r3");
      await stranded(w, 1, T - age);
      const r = await impl.reap(w.cid, impl.deps(depsAt(T)));
      holds = holds && r.reaped === want;
      out.push(`${age} ms old: reaped ${r.reaped}`);
    }
    return [holds, out.join(" · ")];
  });

  // ── R4 · PAUSED and CANCELLED campaigns are reaped ──
  await claim(ok, L.r4, async () => {
    const out: string[] = [];
    let holds = true;
    for (const status of ["PAUSED", "CANCELLED"] as const) {
      const w = worldOf("r4");
      const ids = await stranded(w, 2, T - 15 * MIN);
      await evidence(ids[0], w.key(0), "ACCEPTED", { createdAt: iso(T - 14 * MIN), sentAt: iso(T - 14 * MIN + 300) });
      await moveCampaign(w.cid, ["RUNNING"], status, status === "PAUSED" ? { pausedAt: iso(T - 12 * MIN), stopReason: "officer_paused" } : { finishedAt: iso(T - 12 * MIN), stopReason: "officer_stopped" });
      const r = await impl.reap(w.cid, impl.deps(depsAt(T)));
      const st = await statusOf(ids);
      const c = await campaignOf(w.cid);
      holds = holds && r.reaped === 2 && r.toSent === 1 && r.toPending === 1 && st === "SENT,PENDING" && c?.status === status;
      out.push(`${status}: ${json(r)} rows ${st}`);
    }
    return [holds, out.join(" · ")];
  });

  // ── R5 · DC-1 ──
  await claim(ok, L.r5, async () => {
    const w = worldOf("r5");
    const ids = await stranded(w, 2, T - 15 * MIN);
    // row 0: a FAILED message made a minute BEFORE this claim — an earlier attempt's; row 1: the same, made after it
    await evidence(ids[0], w.key(0), "FAILED", { createdAt: iso(T - 16 * MIN), failedAt: iso(T - 16 * MIN + 300), providerMsg: "Invalid credentials" });
    await evidence(ids[1], w.key(1), "FAILED", { createdAt: iso(T - 14 * MIN), failedAt: iso(T - 14 * MIN + 300), providerMsg: "Invalid credentials" });
    const r = await impl.reap(w.cid, impl.deps(depsAt(T)));
    const rows = await Promise.all(ids.map((id) => rowOf(id)));
    return [rows[0]?.status === "PENDING" && rows[0].attempts === 1 && rows[1]?.status === "FAILED" && r.toPending === 1 && r.toFailed === 1,
      `earlier attempt's: ${rows[0]?.status}/${rows[0]?.attempts} · this claim's: ${rows[1]?.status} · ${json(r)}`];
  });

  // ── R6 · the reaped row ──
  await claim(ok, L.r6, async () => {
    const w = worldOf("r6");
    const ids = await stranded(w, 3, T - 15 * MIN);
    await evidence(ids[0], w.key(0), "QUEUED", { createdAt: iso(T - 14 * MIN) });
    const r = await impl.reap(w.cid, impl.deps(depsAt(T)));
    const rows = await auditRows(ENGINE.ENGINE_REAPED_ACTION, w.cid);
    const p = (rows[0]?.payload ?? {}) as Record<string, unknown>;
    const v = worldOf("r6b");
    await stranded(v, 1, T - 2 * MIN);
    const nobody = await impl.reap(v.cid, impl.deps(depsAt(T)));
    const none = await auditRows(ENGINE.ENGINE_REAPED_ACTION, v.cid);
    return [rows.length === 1 && rows[0].category === "SYSTEM" && rows[0].actorId === null && p.reaped === 3 && p.toUnconfirmed === 1 && p.toPending === 2
      && p.toSent === 0 && p.toFailed === 0 && p.toDelivered === 0 && nobody.reaped === 0 && none.length === 0,
      `${json(r)} · rows ${rows.length} ${json(p)} · a reap of nobody: ${json(nobody)} rows ${none.length}`];
  });

  // ── R7 · evidence that cannot be read whole never re-sends ──
  await claim(ok, L.r7, async () => {
    const w = worldOf("r7");
    const ids = await stranded(w, 4, T - 15 * MIN);
    await evidence(ids[0], w.key(0), "ACCEPTED", { createdAt: iso(T - 14 * MIN), sentAt: null });
    await evidence(ids[1], w.key(1), "DELIVERED", { createdAt: iso(T - 14 * MIN), sentAt: iso(T - 14 * MIN + 300), deliveredAt: null });
    await evidence(ids[2], w.key(2), "MYSTERY" as SmsStatus, { createdAt: iso(T - 14 * MIN) });
    await evidence(ids[3], w.key(3), "QUEUED", { createdAt: "not an instant" });
    const r = await impl.reap(w.cid, impl.deps(depsAt(T)));
    const st = await statusOf(ids);
    return [st === "UNCONFIRMED,UNCONFIRMED,UNCONFIRMED,UNCONFIRMED" && r.toPending === 0, `rows ${st} · ${json(r)}`];
  });

  // ── R8 · the reaper first, inside a running campaign's step ──
  await claim(ok, L.r8, async () => {
    const w = worldOf("r8");
    const ids = await stranded(w, 1, T - 15 * MIN, 2);
    const ref = await evidence(ids[0], w.key(0), "QUEUED", { createdAt: iso(T - 14 * MIN) });
    const wire = stubWire();
    const r: SliceStepResult = await impl.step(w.cid, impl.deps(engineDeps(freshState(), wire, { now: () => new Date(T), gate: CLEARS_ALL })));
    const rows = await Promise.all(ids.map((id) => rowOf(id)));
    return [r.kind === "sent" && r.reaped === 1 && r.claimed === 2 && rows[0]?.status === "UNCONFIRMED" && rows[0].smsReference === ref
      && rows[1]?.status === "SENT" && rows[2]?.status === "SENT" && wire.sent.every((m) => m.targetId !== ids[0]),
      `${said(r)} reaped ${r.kind === "sent" ? r.reaped : "-"} · rows ${rows.map((x) => x?.status).join(",")}`];
  });
}

/* ══ THE PLANTS ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

export const R_PLANTS: ReadonlyArray<EnginePlant<RImpl>> = [
  {
    name: "R-R1 (the spec's) · a QUEUED stranded claim returned to PENDING — a message that may have gone is sent again",
    expect: [L.r1, L.r6, L.r7, L.r8],
    impl: () => {
      const queuedToPending: typeof RULES.reapVerdict = (row, e, at) => (e !== null && (e.status === "QUEUED" || e.status === "UNKNOWN")
        ? { id: row.id, claimToken: row.claimToken ?? "", to: "PENDING", attemptsDelta: 1 }
        : RULES.reapVerdict(row, e, at));
      return { verdict: queuedToPending, deps: (d) => ({ ...d, rules: { ...d.rules, reapVerdict: queuedToPending } }) };
    },
  },
  {
    name: "R-R2 (the spec's) · beforeSend trusting the claim it took at the start — a stalled claimant sends what was reaped from under it",
    expect: [L.r2],
    impl: () => ({
      deps: (d) => {
        const taken = new Map<string, StoredSmsCampaignRecipient[]>();
        return {
          ...d,
          recipients: {
            ...d.recipients,
            claim: async (c, l, t, a) => { const won = await d.recipients.claim(c, l, t, a); taken.set(t, won); return won; },
            claimedBy: async (_c, t) => taken.get(t) ?? [],
          },
        };
      },
    }),
  },
  {
    name: "R-R3 · the cutoff taken as at-or-before — a claim exactly ten minutes old is reaped",
    expect: [L.r3],
    impl: () => ({
      deps: (d) => ({ ...d, recipients: { ...d.recipients, findStranded: (c, cutoff, limit) => d.recipients.findStranded(c, iso(Date.parse(cutoff) + 1), limit) } }),
    }),
  },
  {
    name: "R-R4 · the reaper only for a RUNNING campaign — a stopped campaign keeps its stranded claims, and shows not sent for a message that went",
    expect: [L.r4],
    impl: () => ({
      reap: async (id, d) => ((await db.smsCampaign.find(id))?.status === "RUNNING" ? ENGINE.reapStrandedClaims(id, d)
        : { reaped: 0, toPending: 0, toSent: 0, toUnconfirmed: 0, toFailed: 0, toDelivered: 0 }),
    }),
  },
  {
    name: "R-R5 · DC-1 ignored — an earlier attempt's FAILED read as this claim's, so a person never sent to is settled FAILED with no retry",
    expect: [L.r5],
    impl: () => {
      const blind: typeof RULES.reapVerdict = (row, e, at) => RULES.reapVerdict({ ...row, claimedAt: null }, e, at);
      return { verdict: blind, deps: (d) => ({ ...d, rules: { ...d.rules, reapVerdict: blind } }) };
    },
  },
  {
    name: "R-R6 · a reaped row written for every reap, nobody settled or not",
    expect: [L.r6],
    impl: () => ({
      reap: async (id, d) => {
        const r = await ENGINE.reapStrandedClaims(id, d);
        if (r.reaped === 0) await d.audit({ category: "SYSTEM", action: ENGINE.ENGINE_REAPED_ACTION, actorId: null, targetType: "SmsCampaign", targetId: id, payload: { ...r } });
        return r;
      },
    }),
  },
  {
    name: "R-R7 · evidence that cannot be read whole read as never sent (an ACCEPTED message without its instant goes back to PENDING)",
    expect: [L.r7],
    impl: () => {
      const careless: typeof RULES.reapVerdict = (row, e, at) => (e !== null && e.status === "ACCEPTED" && e.sentAt === null
        ? { id: row.id, claimToken: row.claimToken ?? "", to: "PENDING", attemptsDelta: 1 }
        : RULES.reapVerdict(row, e, at));
      return { verdict: careless, deps: (d) => ({ ...d, rules: { ...d.rules, reapVerdict: careless } }) };
    },
  },
  {
    name: "R-R8 · the step skips its reaper (a stranded claim waits for ever, its row PENDING under a dead claim)",
    expect: [L.r8],
    impl: () => ({ step: (id, d) => ENGINE.runCampaignSlice(id, { ...d, recipients: { ...d.recipients, findStranded: async () => [] } }) }),
  },
];

/** ⭐ §R, as a host runs it. */
export const SECTION_R: EngineSection<RImpl> = {
  id: "R",
  title: "§R · U43b-2 · the reaper",
  labels: Object.values(L),
  real: R_REAL,
  run: runSectionR,
  plants: R_PLANTS,
};
