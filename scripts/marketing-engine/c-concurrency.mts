/**
 * test:marketing-engine §C — U43b-2's guard: CONCURRENCY, the plan's RED (ENGINE-SPEC §4.13 tests §C; E10 · E6 · U43a's
 * claim door). Five drivers at once over 1,000 people: with the process single-flight BYPASSED (each driver a process of
 * its own — the deploy overlap), the claim's compare-and-set alone keeps every send single; with it ON, the same 1,000
 * and never two slices at once.
 *
 * ⚠️ A SECTION MODULE, run by `scripts/marketing-engine.test.mts`. ⭐ DRIVEN: `runCampaignSlice` from five concurrent
 * loops on the memory twin — the REAL claim, re-read and settle doors and the REAL `dispatchSlice`; the gate clears all and
 * the token door answers one fixed token (this section is about who sends, not about consent), and the stub wire YIELDS
 * inside every send so the loops truly interleave.
 * ⛔ IN-PROCESS: every plant is a dependency swapped in memory; no SMS, no file, no database. ⛔ No backslash.
 */
import * as ENGINE from "../../src/lib/server/marketing/engine.ts";
import type { EngineDeps, EngineProcessState } from "../../src/lib/server/marketing/engine.ts";
import type { StoredSmsCampaignRecipient } from "../../src/lib/server/store.ts";
import {
  CLEARS_ALL, campaignOf, claim, engineDeps, freshState, keyIn, mem, nextRun, rowsOn, runningCampaign, seat, stubWire,
} from "./engine-world.mts";
import type { Check, Seat, Wire } from "./engine-world.mts";
import type { EngineSection, EnginePlant } from "./f-credit.mts";

const L = {
  c0: "C0 · CONTROL — the five loops truly run slices at the same time when the single-flight is bypassed (two or more slices in flight at once), and 1,000 people are on the list",
  c1: "C1 · ⭐ FIVE CONCURRENT DRIVERS, THE SINGLE-FLIGHT BYPASSED, OVER 1,000 PEOPLE (the plan's RED) — EXACTLY 1,000 messages on the wire, every number exactly once, every row SENT, and the campaign DONE",
  c2: "C2 · ⭐ …WITH THE SINGLE-FLIGHT ON (one process) — the same 1,000 messages, every number once, every row SENT, the campaign DONE — and NEVER two slices in flight at once",
} as const;

export type CImpl = {
  step: typeof ENGINE.runCampaignSlice;
  deps: (d: EngineDeps) => EngineDeps;
  /** The seed door the world is written through. */
  seat: (campaignId: string, seats: readonly Seat[]) => Promise<void>;
  /** One process state per driver (`bypass`) or one for all. */
  stateFor: (shared: EngineProcessState, bypass: boolean) => EngineProcessState;
};
export const C_REAL: CImpl = {
  step: ENGINE.runCampaignSlice,
  deps: (d) => d,
  seat,
  stateFor: (shared, bypass) => (bypass ? freshState() : shared),
};

const PEOPLE = 1000;
const DRIVERS = 5;
const pad = (n: number, w: number): string => String(n).padStart(w, "0");
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type Drive = { wire: Wire; maxInFlight: number; ids: string[]; cid: string; endings: string[] };

/** §C's own drive counter — a drive takes 10,000 numbers of NDC 72, so the shared run counter (which climbs past a
 *  thousand across a red run) would overflow the seven digits a key holds. */
let C_DRIVES = 0;

/** ⭐ One campaign of 1,000 people, driven by five loops at once until each sees the campaign leave RUNNING. */
async function fiveDrivers(impl: CImpl, bypass: boolean): Promise<Drive> {
  const drive = ++C_DRIVES;
  const run = nextRun();
  const cid = `cmp_c_${run}`;
  await runningCampaign(cid, { count: PEOPLE });
  const ids = Array.from({ length: PEOPLE }, (_, i) => `rcp_c_${pad(run, 5)}_${pad(i, 4)}`);
  await impl.seat(cid, ids.map((id, i) => ({ id, key: keyIn("72", drive * 10_000 + i) })));
  const wire = stubWire({ delayMs: 1 });
  const shared = freshState();
  let inFlight = 0;
  let maxInFlight = 0;
  const endings: string[] = [];
  const loop = async (): Promise<void> => {
    const base = engineDeps(impl.stateFor(shared, bypass), wire, {
      gate: CLEARS_ALL,
      ensureToken: async () => "CCCCDDDD",
    });
    const d = impl.deps({
      ...base,
      dispatch: async (rows, sd) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        try {
          return await base.dispatch(rows, sd);
        } finally {
          inFlight--;
        }
      },
    });
    for (let i = 0; i < 600; i++) {
      // More messages than people have gone out: a duplicate is certain, and C1/C2 already fail — stop churning.
      if (wire.sent.length > PEOPLE) {
        endings.push("over-sent");
        return;
      }
      const r = await impl.step(cid, d);
      if (r.kind === "finished" || r.kind === "paused" || r.kind === "not_running") {
        endings.push(r.kind === "paused" ? `paused ${r.reason}` : r.kind);
        return;
      }
      if (r.kind === "waiting") await sleep(1);
    }
    endings.push("ran out of steps");
  };
  await Promise.all(Array.from({ length: DRIVERS }, () => loop()));
  return { wire, maxInFlight, ids, cid, endings };
}

/** Every number on the wire exactly once, 1,000 of them; every row SENT; the campaign DONE. */
async function single(d: Drive): Promise<[boolean, string]> {
  const counts = new Map<string, number>();
  for (const m of d.wire.sent) counts.set(m.to, (counts.get(m.to) ?? 0) + 1);
  const twice = [...counts.values()].filter((n) => n > 1).length;
  const rows: StoredSmsCampaignRecipient[] = rowsOn(d.cid);
  const sent = rows.filter((r) => r.status === "SENT").length;
  const c = await campaignOf(d.cid);
  const holds = d.wire.sent.length === PEOPLE && counts.size === PEOPLE && twice === 0 && sent === PEOPLE && rows.length === PEOPLE && c?.status === "DONE";
  return [holds, `${d.wire.sent.length} messages, ${counts.size} numbers, ${twice} twice · ${sent}/${rows.length} rows SENT · campaign ${c?.status} · max in flight ${d.maxInFlight} · endings ${[...new Set(d.endings)].join(",")}`];
}

async function runSectionC(impl: CImpl, ok: Check): Promise<void> {
  let bypassed: Drive | null = null;
  await claim(ok, L.c0, async () => {
    bypassed = await fiveDrivers(C_REAL, true);
    return [bypassed.maxInFlight >= 2 && bypassed.ids.length === PEOPLE, `max in flight ${bypassed.maxInFlight} · people ${bypassed.ids.length}`];
  });
  await claim(ok, L.c1, async () => single(await fiveDrivers(impl, true)));
  await claim(ok, L.c2, async () => {
    const d = await fiveDrivers(impl, false);
    const [holds, detail] = await single(d);
    return [holds && d.maxInFlight === 1, detail];
  });
}

export const C_PLANTS: ReadonlyArray<EnginePlant<CImpl>> = [
  {
    // The memory twin's claim WITHOUT `claimToken === null`: a driver takes rows another holds mid-send, and its own re-read
    // then finds them under its token — both send them.
    name: "R-C1 (the spec's) · an unconditional claim — PENDING rows taken whatever claim they carry, so five drivers send duplicates",
    expect: [L.c1],
    impl: () => ({
      deps: (d) => ({
        ...d,
        recipients: {
          ...d.recipients,
          claim: async (campaignId, limit, token, at) => {
            const free = [...mem().smsCampaignRecipients.values()]
              .filter((r) => r.campaignId === campaignId && r.status === "PENDING")
              .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
              .slice(0, limit);
            for (const r of free) {
              r.claimToken = token;
              r.claimedAt = at;
              r.updatedAt = at;
            }
            return free.map((r) => ({ ...r }));
          },
        },
      }),
    }),
  },
  {
    // dal-parity's own plant, at the door the world is written through: ten people put on the list twice — and counted
    // twice by the confirmation too (the same walk), so the list is within its count and only the key could stop it.
    name: "R-C2 (the spec's) · the unique key ignored at the seed door — a person on the list twice is messaged twice",
    expect: [L.c1, L.c2],
    impl: () => ({
      seat: async (campaignId, seats) => {
        await seat(campaignId, seats);
        const store = mem().smsCampaignRecipients;
        for (const s of seats.slice(0, 10)) {
          const twin = store.get(s.id);
          if (twin !== undefined) store.set(`${s.id}_again`, { ...twin, id: `${s.id}_again` });
        }
        const campaigns = (mem() as unknown as { smsCampaigns: Map<string, { audienceCount: number | null }> }).smsCampaigns;
        const c = campaigns.get(campaignId);
        if (c !== undefined && c.audienceCount !== null) c.audienceCount += 10;
      },
    }),
  },
  {
    name: "R-C3 · the single-flight bypassed in one process (each driver its own flight)",
    expect: [L.c2],
    impl: () => ({ stateFor: () => freshState() }),
  },
];

/** ⭐ §C, as a host runs it. */
export const SECTION_C: EngineSection<CImpl> = {
  id: "C",
  title: "§C · U43b-2 · concurrency",
  labels: Object.values(L),
  real: C_REAL,
  run: runSectionC,
  plants: C_PLANTS,
};
