/**
 * THE DRY-FIRE HARNESS'S CORE — the context every scenario and every invariant shares: the run's options and seams, the fake
 * carrier, the virtual clock, the owner's switch, the officer, the PROCESSES that drive a campaign (each its own engine state and
 * step flights — a tab shares one, a deploy's overlap is two), the acts an officer makes (logged, so the audit can be held to
 * them), and the observations of every step (so the numbers and the monotonic checks have a record).
 *
 * ⭐ EVERYTHING THE HARNESS BUILDS IS THE PRODUCTION CODE'S OWN DEPENDENCY SET with the fewest changes the run needs:
 *   · the engine's deps are `ENGINE_DEPS` with `state` (this process's), `liveSwitch` (the owner's switch, modelled — the memory
 *     twin has no config store), `clock` (the virtual monotonic clock, so a slow gate is seen as slow) and `dispatch` (handed the
 *     same clock for its window re-check). The gate, the send, the credit reads, the window, the money signal, the code-failure
 *     mark, the renderer, the token door, the reaper, the rules and the audit are the shipped ones.
 *   · the services' deps are `CONTROL_DEPS` with the step, the reaper, the enqueue and the view built over the above and
 *     RECORDED, and the flights of this process.
 * ⭐ THE SEAMS (`Seams`) are where a red control plants a defect: one function per dependency set, applied to EVERY set the
 * harness builds. A run with no seams is the production code; a run with a seam is the same run with one piece swapped.
 *
 * ⛔ This file holds no backslash (an editing tool decodes them).
 */
import type {
  EngineDeps, EngineProcessState, SliceStepResult,
} from "../../../src/lib/server/marketing/engine.ts";
import type { EnqueueDeps, EnqueueStepResult } from "../../../src/lib/server/marketing/enqueue.ts";
import type { ControlActor, ControlDeps, DriverStep, StepFlights, StepActionResult } from "../../../src/lib/server/marketing/campaign-control.ts";
import type { LiveViewDeps, LiveViewer, CampaignLiveView } from "../../../src/lib/server/marketing/campaign-live.ts";
import type { StartCheckDeps } from "../../../src/lib/server/marketing/start-check.ts";
import type { MarketingGateVerdict } from "../../../src/lib/server/marketing/consent.ts";
import type { MarketingLiveSwitch } from "../../../src/lib/server/marketing/live-switch.ts";
import type { SmsCampaignStatus } from "../../../src/lib/server/store.ts";
import type { Server } from "./server.mts";
import type { Clock, ConsoleTap, Rng } from "./kit.mts";
import { MIN } from "./kit.mts";
import type { Carrier, Plan } from "./carrier.mts";
import {
  FAKE_BALANCE_ENDPOINT, FAKE_CLIENT_ID, FAKE_CLIENT_SECRET, FAKE_ENDPOINT,
} from "./carrier.mts";
import type { Mode, Reader } from "./store-io.mts";
import type { World } from "./world.mts";

/* ══ THE OPTIONS, THE SEAMS, THE REPORT'S SHAPES ════════════════════════════════════════════════════════════════════ */

export type GateFn = (msisdn: string) => Promise<MarketingGateVerdict>;

/** ⭐ Where a red control plants a defect. Each function receives the dependency set the harness built and returns the one it
 *  will use. Absent = the production code, untouched. */
export type Seams = {
  engine?: (d: EngineDeps) => EngineDeps;
  control?: (d: ControlDeps) => ControlDeps;
  enqueue?: (d: EnqueueDeps) => EnqueueDeps;
  view?: (d: LiveViewDeps) => LiveViewDeps;
  startCheck?: (d: StartCheckDeps) => StartCheckDeps;
  /** The plan the fake carrier follows, given the scenario's own (or null). */
  carrierPlan?: (inner: Plan | null) => Plan | null;
  /** The receipt door's POST, given the route's own. */
  receipt?: (post: (req: Request) => Promise<Response>) => (req: Request) => Promise<Response>;
  /** The gate the engine is handed, given the shipped one. */
  gate?: (real: GateFn) => GateFn;
  /** Runs once before the first scenario; returns the function that puts back whatever it changed (a store door, for one). */
  store?: (h: Harness) => () => void;
};

export type RunOptions = {
  seed: number;
  /** The SCALE scenario's audience size; the others derive theirs from it. */
  n: number;
  pg: boolean;
  /** Scenario numbers to run (null = all seven), always in numeric order. */
  only: number[] | null;
  /** Where progress lines go (stdout in the CLI, nowhere in the suites). */
  log: (line: string) => void;
  seams: Seams;
};

/** One check of a scenario. `known` names an ENGINE FINDING the harness has already reported to the lead (F-1 …): while the engine
 *  still has it the claim's failure is a KNOWN FINDING — printed and reported, never a failed run — and the moment the engine is
 *  fixed the claim simply passes (then the pin is deleted, one line, and the claim is strict). */
export type Claim = { id: string; label: string; ok: boolean; detail: string; known?: string };

/** One officer act the harness made (the audit is held to this list). */
export type ActRecord = {
  kind: "start" | "pause" | "resume" | "stop";
  campaignId: string;
  ok: boolean;
  reason: string | null;
  at: number;
};

export type SliceObs = { proc: string; campaignId: string; result: SliceStepResult; realMs: number; at: number };
export type EnqueueObs = { proc: string; campaignId: string; result: EnqueueStepResult; realMs: number };
export type StepObs = {
  proc: string;
  campaignId: string;
  step: DriverStep | null;
  said: string | null;
  status: SmsCampaignStatus | null;
  progress: { phase: string; value: number; max: number } | null;
  rows: number;
  /** The rows the page's own KPIs say are decided (on campaign − waiting) — an independent reading of what the bar's value must be. */
  kpiSettled: number | null;
  realMs: number;
};

export type CampaignRef = { id: string; scn: number; label: string; world: World | null };

/* ══ THE OWNER'S SWITCH ═════════════════════════════════════════════════════════════════════════════════════════════ */

export type SwitchModel = {
  read(): Promise<MarketingLiveSwitch>;
  /** Open from now for `ms` of virtual time. */
  openFor(ms: number): void;
  close(): void;
  isOpen(): boolean;
};

function makeSwitch(clock: Clock): SwitchModel {
  let opened: { enabledAt: number; closesAt: number } | null = null;
  const stateNow = (): MarketingLiveSwitch => {
    if (opened === null) return { state: "closed", why: "absent" };
    if (clock.now() >= opened.closesAt) return { state: "closed", why: "expired", closedAt: new Date(opened.closesAt).toISOString() };
    return { state: "open", enabledBy: "the dry-fire owner", enabledAt: new Date(opened.enabledAt).toISOString(), closesAt: new Date(opened.closesAt).toISOString() };
  };
  return {
    read: async () => stateNow(),
    openFor: (ms) => { opened = { enabledAt: clock.now(), closesAt: clock.now() + ms }; },
    close: () => { opened = null; },
    isOpen: () => stateNow().state === "open",
  };
}

/* ══ THE PROCESS ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** One server process: its own engine state and step flights. Two tabs of one officer share a process; a deploy's overlap is two. */
export type Process = {
  name: string;
  state: EngineProcessState;
  flights: StepFlights;
  /** Scenario tweaks to the engine's deps (a slow gate, a send that throws) — applied under the seams. */
  over: Partial<EngineDeps>;
  control: ControlDeps;
  engine(): EngineDeps;
  enqueueDeps(): EnqueueDeps;
  viewDeps(): LiveViewDeps;
  startDeps(): StartCheckDeps;
  /** Set `over` for a while; the returned function puts the previous back. */
  tweak(over: Partial<EngineDeps>): () => void;
  /** Scenario tweaks to Start's and Resume's deps (the price, the settings) — applied under the seams. */
  startOver: Partial<StartCheckDeps>;
  startTweak(over: Partial<StartCheckDeps>): () => void;
};

export type Observations = {
  slices: SliceObs[];
  enqueues: EnqueueObs[];
  steps: StepObs[];
  /** Slices running at once, across the whole run. */
  slicesInFlight: number;
  maxSlicesInFlight: number;
  /** Every engine or enqueue pause the steps reported: the audit must hold exactly one SYSTEM row for each. */
  pauses: { campaignId: string; reason: string }[];
  finishes: { campaignId: string }[];
  enqueueFinishes: { campaignId: string }[];
  unexpectedErrors: string[];
};

export type Harness = {
  S: Server;
  opts: RunOptions;
  mode: Mode;
  seed: number;
  rng: Rng;
  clock: Clock;
  carrier: Carrier;
  reader: Reader;
  tap: ConsoleTap;
  officer: { id: string; name: string };
  actor: ControlActor;
  viewer: LiveViewer;
  sw: SwitchModel;
  /** A number unique to this run — in every id, so two runs in one process never meet. */
  runId: number;
  /** Virtual time the run proper began, after its setup (the audit scans read from here). */
  startedAt: number;
  /** Where the console tap stood when the setup ended: the log scans read the lines printed since. */
  tapMark: number;
  campaigns: CampaignRef[];
  acts: ActRecord[];
  obs: Observations;
  seams: Seams;
  /** Every phone number the run made up, in every spelling the log scans look for. */
  numbers: Set<string>;
  /** RG refusals a crashed step acted on (an audit line written) whose person was then gated again after the reaper released them:
   *  each owes one extra RG line (the refusal was acted on twice). Set by the crash scenario. */
  rgRegated: number;
  /** The scenario now running, and its claims. */
  scn: number;
  claims: Claim[];
  proc(name?: string): Process;
  fresh(name: string): Process;
  /** The next number block (1–99): one per world of the run, in the order the worlds are made. */
  nextBlock(): number;
  log(line: string): void;
};

export const WEBHOOK_SECRET = "dry-fire-webhook-secret-0123456789";

/** The rail the run installs: Blackball selected with DUMMY keys at an address that cannot resolve, `fetch` replaced by the
 *  fake carrier. The environment it found is put back afterwards. ⛔ Called only after `guardEnvironment` passed. */
export function installFakeRail(carrier: Carrier): () => void {
  const names = [
    "SMS_PROVIDER", "BLACKBALL_CLIENT_ID", "BLACKBALL_CLIENT_SECRET", "SMS_SENDER_ID", "BLACKBALL_API_URL", "BLACKBALL_WEBHOOK_SECRET",
    "SESSION_SECRET", "OTP_PEPPER", "REDIS_URL", "REDIS_ENABLED",
  ];
  const saved = names.map((k) => [k, process.env[k]] as const);
  const realFetch = globalThis.fetch;
  process.env.SMS_PROVIDER = "blackball";
  process.env.BLACKBALL_CLIENT_ID = FAKE_CLIENT_ID;
  process.env.BLACKBALL_CLIENT_SECRET = FAKE_CLIENT_SECRET;
  process.env.SMS_SENDER_ID = "50PICK";
  process.env.BLACKBALL_API_URL = FAKE_ENDPOINT;
  process.env.BLACKBALL_WEBHOOK_SECRET = WEBHOOK_SECRET;
  if ((process.env.SESSION_SECRET ?? "").length < 32) process.env.SESSION_SECRET = "dry-fire-session-secret-0123456789abcdef";
  if ((process.env.OTP_PEPPER ?? "").length < 16) process.env.OTP_PEPPER = "dry-fire-pepper-0123456789";
  delete process.env.REDIS_URL;
  delete process.env.REDIS_ENABLED;
  globalThis.fetch = carrier.fetch;
  return () => {
    globalThis.fetch = realFetch;
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
}

/** Is the rail really the fake? Asked right after it is installed: a fetch to the carrier's balance address must come back
 *  stamped by the fake, with the dummy key. ⛔ A rail that fails this stops the run before anything is sent. */
export async function assertRailIsFake(): Promise<void> {
  const res = await globalThis.fetch(FAKE_BALANCE_ENDPOINT, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ auth: { clientId: FAKE_CLIENT_ID, clientSecret: FAKE_CLIENT_SECRET } }),
  });
  if (res.headers.get("x-dry-fire") !== "1") throw new Error("dry-fire REFUSED: fetch is not the fake carrier — nothing was sent");
  if (process.env.BLACKBALL_API_URL !== FAKE_ENDPOINT || process.env.BLACKBALL_CLIENT_ID !== FAKE_CLIENT_ID) {
    throw new Error("dry-fire REFUSED: the rail's credentials are not the dummies — nothing was sent");
  }
}

/* ══ BUILDING THE HARNESS ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type HarnessInit = Pick<
  Harness,
  "S" | "opts" | "mode" | "seed" | "rng" | "clock" | "carrier" | "reader" | "tap" | "officer" | "actor" | "viewer" | "runId" | "startedAt" | "seams"
>;

export function makeHarness(p: HarnessInit): Harness {
  const procs = new Map<string, Process>();
  let blocks = 0;
  const h: Harness = {
    ...p,
    sw: makeSwitch(p.clock),
    obs: {
      slices: [], enqueues: [], steps: [], slicesInFlight: 0, maxSlicesInFlight: 0, pauses: [], finishes: [], enqueueFinishes: [],
      unexpectedErrors: [],
    },
    campaigns: [],
    acts: [],
    numbers: new Set(),
    rgRegated: 0,
    tapMark: 0,
    scn: 0,
    claims: [],
    log: (line) => p.opts.log(line),
    proc: (name = "A") => procs.get(name) ?? h.fresh(name),
    nextBlock: () => {
      blocks += 1;
      if (blocks > 99) throw new Error("dry-fire: more than 99 worlds in one run");
      return blocks;
    },
    fresh: (name) => {
      const proc = makeProcess(h, name);
      procs.set(name, proc);
      return proc;
    },
  };
  return h;
}

/** A process: its own state and flights, its dependency sets built over the harness's. */
export function makeProcess(h: Harness, name: string): Process {
  const S = h.S;
  const state: EngineProcessState = { flight: null, ticket: 0, sliceSize: S.engine.SLICE_START, gateMsAvg: null, unanswered: {}, tooSlow: {} };
  const flights: StepFlights = { flights: new Map(), ticket: 0 };
  const proc: Process = {
    name, state, flights, over: {}, startOver: {}, control: null as unknown as ControlDeps,
    engine: () => engineDeps(),
    enqueueDeps: () => enqueueDeps(),
    viewDeps: () => viewDeps(),
    startDeps: () => startDeps(),
    tweak: (over) => {
      const was = proc.over;
      const next: Partial<EngineDeps> = { ...was, ...over };
      // a key tweaked to `undefined` is REMOVED, not set: `{ send: undefined }` must put the shipped send back
      for (const k of Object.keys(next) as (keyof EngineDeps)[]) if (next[k] === undefined) delete next[k];
      proc.over = next;
      return () => { proc.over = was; };
    },
    startTweak: (over) => {
      const was = proc.startOver;
      const next: Partial<StartCheckDeps> = { ...was, ...over };
      for (const k of Object.keys(next) as (keyof StartCheckDeps)[]) if (next[k] === undefined) delete next[k];
      proc.startOver = next;
      return () => { proc.startOver = was; };
    },
  };

  function engineDeps(): EngineDeps {
    const real = S.engine.ENGINE_DEPS;
    const mono = () => h.clock.mono();
    let d: EngineDeps = {
      ...real,
      state: () => state,
      liveSwitch: () => h.sw.read(),
      clock: mono,
      dispatch: (rows, sd) => real.dispatch(rows, { clock: mono, ...sd }),
      ...proc.over,
    };
    if (h.seams.gate) {
      const inner: GateFn = (d.gate ?? ((m: string) => S.consent.mayReceiveMarketingSms(m))) as GateFn;
      d = { ...d, gate: h.seams.gate(inner) };
    }
    return h.seams.engine ? h.seams.engine(d) : d;
  }

  function enqueueDeps(): EnqueueDeps {
    const d: EnqueueDeps = { ...S.enqueue.ENQUEUE_DEPS };
    return h.seams.enqueue ? h.seams.enqueue(d) : d;
  }

  function viewDeps(): LiveViewDeps {
    const d: LiveViewDeps = { ...S.live.LIVE_VIEW_DEPS, liveSwitch: () => h.sw.read() };
    return h.seams.view ? h.seams.view(d) : d;
  }

  function startDeps(): StartCheckDeps {
    const d: StartCheckDeps = { ...S.startCheck.START_CHECK_DEPS, liveSwitch: () => h.sw.read(), ...proc.startOver };
    return h.seams.startCheck ? h.seams.startCheck(d) : d;
  }

  const base: ControlDeps = {
    ...S.control.CONTROL_DEPS,
    check: (c) => S.startCheck.checkStart(c, proc.startDeps()),
    resumeCheck: (c, counts) => S.startCheck.resumeRefusal(c, counts, proc.startDeps()),
    flights: () => flights,
    view: (id, v) => S.live.campaignLiveView(id, v, proc.viewDeps()),
    slice: async (id) => {
      h.obs.slicesInFlight += 1;
      h.obs.maxSlicesInFlight = Math.max(h.obs.maxSlicesInFlight, h.obs.slicesInFlight);
      const t0 = h.clock.real();
      try {
        const result = await S.engine.runCampaignSlice(id, proc.engine());
        h.obs.slices.push({ proc: name, campaignId: id, result, realMs: h.clock.real() - t0, at: h.clock.now() });
        if (result.kind === "paused") h.obs.pauses.push({ campaignId: id, reason: result.reason });
        if (result.kind === "finished") h.obs.finishes.push({ campaignId: id });
        return result;
      } finally {
        h.obs.slicesInFlight -= 1;
      }
    },
    reap: (id) => S.engine.reapStrandedClaims(id, proc.engine()),
    enqueue: async (id) => {
      const t0 = h.clock.real();
      const result = await S.enqueue.enqueueStep(id, proc.enqueueDeps());
      h.obs.enqueues.push({ proc: name, campaignId: id, result, realMs: h.clock.real() - t0 });
      if (result.kind === "paused") h.obs.pauses.push({ campaignId: id, reason: result.reason });
      if (result.kind === "done") h.obs.enqueueFinishes.push({ campaignId: id });
      return result;
    },
  };
  proc.control = h.seams.control ? h.seams.control(base) : base;
  return proc;
}

/* ══ ACTS AND STEPS ═════════════════════════════════════════════════════════════════════════════════════════════════ */

type ActResult = { ok: boolean; reason?: string; message: string; recorded?: boolean };

async function act(h: Harness, proc: Process, kind: ActRecord["kind"], campaignId: string): Promise<ActResult> {
  const C = h.S.control;
  const run = kind === "start" ? C.startCampaign : kind === "pause" ? C.pauseCampaign : kind === "resume" ? C.resumeCampaign : C.stopCampaign;
  const r = (await run(campaignId, h.actor, proc.control)) as ActResult;
  h.acts.push({ kind, campaignId, ok: r.ok === true, reason: r.ok === true ? null : String(r.reason ?? "refused"), at: h.clock.now() });
  return r;
}
export const start = (h: Harness, proc: Process, id: string): Promise<ActResult> => act(h, proc, "start", id);
export const pause = (h: Harness, proc: Process, id: string): Promise<ActResult> => act(h, proc, "pause", id);
export const resume = (h: Harness, proc: Process, id: string): Promise<ActResult> => act(h, proc, "resume", id);
export const stop = (h: Harness, proc: Process, id: string): Promise<ActResult> => act(h, proc, "stop", id);

/** One driver call, recorded. A step that throws is recorded and re-thrown (the driver stops, as the page's would). */
export async function step(h: Harness, proc: Process, campaignId: string, driver: string = proc.name): Promise<StepActionResult> {
  const t0 = h.clock.real();
  let r: StepActionResult;
  try {
    r = await h.S.control.campaignStep(campaignId, h.viewer, proc.control);
  } catch (err) {
    h.obs.unexpectedErrors.push(`${driver}: ${String((err as Error)?.message ?? err).slice(0, 200)}`);
    throw err;
  }
  const view: CampaignLiveView | null = r.ok ? r.view : null;
  h.obs.steps.push({
    proc: driver, campaignId, step: r.ok ? r.step : null, said: r.ok ? r.said : null, status: view?.status ?? null,
    progress: view?.progress ? { phase: view.progress.phase, value: view.progress.value, max: view.progress.max } : null,
    rows: view?.kpis.onCampaign ?? 0, kpiSettled: view && view.kpis.waiting !== null ? view.kpis.onCampaign - view.kpis.waiting : null, realMs: h.clock.real() - t0,
  });
  return r;
}

/** The campaign's view as the officer sees it now (no step taken). */
export async function viewOf(h: Harness, proc: Process, campaignId: string): Promise<CampaignLiveView> {
  const v = await h.S.live.campaignLiveView(campaignId, h.viewer, proc.viewDeps());
  if (v === null) throw new Error(`the view of ${campaignId} answered null`);
  return v;
}

export type DriveOpts = {
  /** Stop when this answers true after a step (checked with the step's view). */
  until?: (r: Extract<StepActionResult, { ok: true }>) => boolean | Promise<boolean>;
  /** The most steps to take. */
  max?: number;
  /** After each step. */
  after?: (r: Extract<StepActionResult, { ok: true }>, n: number) => Promise<void> | void;
  /** What to do on a wait that is not `busy` (default: stop — a scenario that expects a wait asserts it). */
  onWait?: "stop" | "continue";
  /** Yield the event loop after a busy answer (two tabs). */
  yieldOnBusy?: boolean;
  /** Yield the event loop after EVERY step (two drivers take turns instead of one running to the end). */
  yieldAfterStep?: boolean;
  /** The driver's own name in the observations (two tabs of one process are two drivers); default the process's. */
  driver?: string;
};
export type DriveEnd = "terminal" | "paused" | "waiting" | "until" | "max" | "not_ok";
export type DriveResult = { steps: number; end: DriveEnd; last: StepActionResult | null; kinds: Record<string, number> };

/** Step a campaign until it is DONE or CANCELLED, a step pauses it, a wait stops it, `until` holds or `max` steps were taken. */
export async function drive(h: Harness, proc: Process, campaignId: string, o: DriveOpts = {}): Promise<DriveResult> {
  const max = o.max ?? 5000;
  const kinds: Record<string, number> = {};
  let last: StepActionResult | null = null;
  let busyRun = 0;
  // a polite spin against a campaign another tab holds is not a step of work: against a database it takes real time (the other slice's
  // queries), so spins are bounded by the clock and do not count against `max`
  let spins = 0;
  const began = performance.now();
  for (let n = 1; n - spins <= max; n++) {
    const r = await step(h, proc, campaignId, o.driver);
    last = r;
    if (!r.ok) return { steps: n, end: "not_ok", last, kinds };
    kinds[r.step.kind] = (kinds[r.step.kind] ?? 0) + 1;
    if (o.after) await o.after(r, n);
    if (o.yieldAfterStep) await new Promise<void>((resolve) => setImmediate(resolve));
    if (r.view.status === "DONE" || r.view.status === "CANCELLED") return { steps: n, end: "terminal", last, kinds };
    if (r.step.kind === "paused" || r.view.status === "PAUSED") return { steps: n, end: "paused", last, kinds };
    if (o.until && (await o.until(r))) return { steps: n, end: "until", last, kinds };
    if (r.step.kind === "waiting") {
      if (r.step.busy) {
        // Another step of this campaign holds it. Two tabs yield the event loop and try again; a lone driver that is told
        // "busy" more than a few hundred times running is waiting on a stranded claim only the reaper's clock will free.
        busyRun += 1;
        if (!o.yieldOnBusy && busyRun > 200) return { steps: n, end: "waiting", last, kinds };
        if (o.yieldOnBusy) {
          if (performance.now() - began > 600_000) return { steps: n, end: "waiting", last, kinds };
          spins += 1;
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
        continue;
      }
      if (o.onWait !== "continue") return { steps: n, end: "waiting", last, kinds };
    }
    busyRun = 0;
  }
  return { steps: max, end: "max", last, kinds };
}

/** Step until the list is written and the campaign is RUNNING (the enqueue chunks), then stop. */
export async function enqueueAll(h: Harness, proc: Process, campaignId: string): Promise<DriveResult> {
  return drive(h, proc, campaignId, { until: (r) => r.view.status === "RUNNING", max: 200 });
}

/* ══ RECEIPTS THROUGH THE REAL DOOR ═════════════════════════════════════════════════════════════════════════════════ */

export type ReceiptLine = Record<string, string>;
export type PostResult = { status: number; body: string };

/** POST a callback to the REAL route (`/api/webhooks/blackball`) — token in the query, as the vendor's registered URL carries
 *  it. The seam may wrap the route's POST. */
export async function postReceipts(h: Harness, lines: readonly ReceiptLine[], o: { token?: string | null; raw?: string } = {}): Promise<PostResult> {
  const post = h.seams.receipt ? h.seams.receipt(h.S.route.POST) : h.S.route.POST;
  const token = o.token === undefined ? WEBHOOK_SECRET : o.token;
  const url = `http://dry-fire.invalid/api/webhooks/blackball${token === null ? "" : `?token=${token}`}`;
  const res = await post(new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: o.raw ?? JSON.stringify({ statuses: lines }) }));
  return { status: res.status, body: await res.text() };
}

/* ══ CLAIMS ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Record one claim of the scenario now running. A body that throws is that claim's failure, never the run's end. */
export async function claim(h: Harness, id: string, label: string, body: () => Promise<[boolean, string]>, known?: string): Promise<void> {
  try {
    const [ok, detail] = await body();
    h.claims.push({ id, label, ok, detail, ...(known === undefined ? {} : { known }) });
  } catch (err) {
    h.claims.push({ id, label, ok: false, detail: `threw: ${String((err as Error)?.message ?? err).slice(0, 240)}` });
  }
}
export function claimNow(h: Harness, id: string, label: string, ok: boolean, detail: string, known?: string): void {
  h.claims.push({ id, label, ok, detail, ...(known === undefined ? {} : { known }) });
}

/** The send-age bound and the reaper's age, restated (ENGINE-SPEC §4.13) — the harness reads them from the engine itself. */
export function bounds(h: Harness): { claimSendMaxMs: number; reapAfterMs: number; sliceMax: number; sliceMin: number; sliceStart: number } {
  const E = h.S.engine;
  return { claimSendMaxMs: E.CLAIM_SEND_MAX_AGE_MS, reapAfterMs: E.REAP_AFTER_MS, sliceMax: E.SLICE_MAX, sliceMin: E.SLICE_MIN, sliceStart: E.SLICE_START };
}

export const TEN_MIN = 10 * MIN;
