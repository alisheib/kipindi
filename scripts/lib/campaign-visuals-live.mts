/**
 * test:campaign-visuals §live — the U47b-2 REVIEW'S FIX ROUND: the claims that EXECUTE what the first round only read.
 *
 *   V12 ⭐ THE STEP DOOR (`POST /api/admin/campaigns/<id>/step`) — POST only, never cross-site (asked before the session is read),
 *       the guard the first thing that touches anything, nothing read on a refusal, the STORED role and not the cookie, a lapsed
 *       or never-set-up second factor refused in words and a visitor with no session told in words (never a redirect), the answer
 *       the service's own as JSON, an unexpected throw a typed `unfinished` (never a 500 page), no phone number and no money word
 *       for a viewer who may not read one; and the route that wraps it, called as Next calls it (no-store, no body read);
 *   V13 ⭐ THE DRIVER'S HOOK, EXECUTED — the real `useLiveDriver` on a minimal hooks host with a fake clock: the cadence, React's
 *       development double-run making ONE step, a page that leaves (no call, no state, no timer), a watcher, a flip, Try again;
 *   V14 ⭐ THE PRESSES, EXECUTED — the real `useLivePresses`: no double press, per-control pending (Stop is pressable while Pause
 *       waits), a landed act's toast (a warning STAYS), a refusal until the next press, a copy that never takes a driving page away;
 *   V15 ⭐ WHAT THE PAGE SAYS AND WHEN — the pure decisions the components call, the one live region saying a status CHANGE, and
 *       every disabled control described by an element that is in the markup;
 *   V16 ⭐ THE DEV SEED — the money-busy hold is re-entrant, the campaign makers refuse unless the rail is the console stub, and
 *       every sentence the drive asserts against is served by `?words=`.
 *
 * ⭐ HOW THE PLANTS REACH A MODULE. A hook (or a route) imported as a module cannot be swapped by a wrapper, so its plant is its
 * SOURCE with one defect written in, compiled by esbuild and evaluated with only the imports the file really has (`evalModule`)
 * — and the planted source is ALSO handed to the claims that scan it (`sources`), so one defect in a file is one defect everywhere.
 * ⛔ "The claim ran a compiled copy" could itself be wrong, so every executing claim also runs the COMPILED REAL SOURCE as a
 * control and requires it green: a compile path that broke would turn every plant red for the wrong reason, and the baseline of
 * `--prove-red` (real code green) would not hold.
 * ⛔ This file holds no backslash (an editing tool decodes them): newlines are `NL`, a double quote is `DQ`, patterns use classes.
 */
import React from "react";
import { transformSync } from "esbuild";
import { mountHook, fakeClock } from "./hooks-host.mts";
import type { FakeClock, HostOptions } from "./hooks-host.mts";
import {
  LABELS as PAGE_LABELS, REAL_PAGE, REAL_SOURCES, PATHS, ACTS, bodyOf, plantIn, tagAt, attrOf, textOfHtml, unescapeHtml, viewAt, OK_STEP, OK_VIEW,
} from "./campaign-visuals-page.mts";
import type { PageHarness, PageImpl, PageSources } from "./campaign-visuals-page.mts";

const NL = String.fromCharCode(10);
const DQ = String.fromCharCode(34);
const json = (v: unknown): string => JSON.stringify(v);

const COPY = await import("../../src/app/admin/campaigns/[id]/live-copy.ts");
const VIEWER = await import("../../src/app/admin/campaigns/[id]/live-viewer.ts");
const RUN = await import("../../src/app/admin/campaigns/[id]/live-run.ts");
const GUARD = await import("../../src/lib/server/rbac-guard.ts");
const RBAC = await import("../../src/lib/server/rbac.ts");
const CTRL = await import("../../src/lib/server/marketing/campaign-control.ts");
const STATUS = await import("../../src/lib/marketing/campaign-status.ts");
const DOORS = await import("../../src/lib/server/journey-preview-doors.ts");
const NAVGROUPS = await import("../../src/components/admin/admin-nav-groups.ts");
const RUNADMIN = await import("../../src/lib/client/run-admin-action.ts");
const NEXT = await import("next/server");
const ADMISSION = await import("../../src/lib/server/admission.ts");
const RATELIMIT = await import("../../src/lib/server/rate-limit.ts");
const { db } = await import("../../src/lib/server/store.ts");
const { getAuditPage, auditFlush } = await import("../../src/lib/server/audit.ts");

type CampaignLiveView = import("../../src/lib/server/marketing/campaign-live.ts").CampaignLiveView;
type LiveViewer = import("../../src/lib/server/marketing/campaign-live.ts").LiveViewer;
type StoredUser = import("../../src/lib/server/store.ts").StoredUser;
type LiveActAnswer = import("../../src/app/admin/campaigns/[id]/live-run.ts").LiveActAnswer;
type Mods = PageImpl["mods"];

/* ══ THE LABELS ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

export const LIVE_LABELS = {
  v12: "V12 · ⭐ THE STEP DOOR (the review's MAJOR) — POST /api/admin/campaigns/<id>/step takes the driver's step out of Next's one-at-a-time action queue and is built as a DOOR: POST only (any other method a 405 naming POST), never cross-site (Sec-Fetch-Site from anywhere but this origin a 403, asked before the session is read; a client that sends none is let through that check) and carrying the page's own X-Kp-Step: 1 (absent or wrong a 403 that asks nothing of the session, the viewer or the service — the very header postLiveStep sends, held to the door by the seam between them), the id from the path with the body never read, the guard (softCheckStaff, growth, the stored role's ACT grant) the first thing that touches anything — viewer and service not asked on any refusal — the STORED role and not the cookie's claim, a lapsed or never-set-up second factor refused IN WORDS with the step-up link, a visitor with no session told in words (401 signed_out with the sign-in address) and never redirected, the answer the service's own as JSON (identical, role-shaped: no money for GROWTH, no phone number anywhere), an unexpected throw — the guard's or the step's — a typed unfinished (500, never a page; the production log names the error's TYPE alone — never its message, which can hold a number), an unknown campaign 404 not_found; production's dependencies frozen with the guard and service by identity; and the route called as Next calls it: 405 + Allow, 403, a typed JSON answer for every other request, Cache-Control no-store on each, the body never consumed, no export but POST",
  v13: "V13 · ⭐ THE DRIVER'S HOOK, EXECUTED (the review's MINOR 3) — the real useLiveDriver on a minimal hooks host with a fake clock: it steps at once, again after 2 s when work was done, after the wait's until (12 s here) and after 5 s when another step held the flight, and ends on DONE with no timer left; React's development double-run makes ONE step call, not two; a page that leaves while a step is in flight makes no further call and sets no state, and one that leaves while the loop sleeps leaves no timer behind; a viewer who may not act polls every 10 s and makes no step call; a status that keeps the mode (PREPARING → RUNNING) does not restart the loop and skip the gap; a flip to another mode starts exactly one loop and does not run the reaper again; a stopped driver stays stopped until Try again; refresh reads the campaign at once; and the compiled real source passes the same scenarios (the control)",
  v14: "V14 · ⭐ THE PRESSES, EXECUTED (the review's MAJOR and MINORS 1, 2, 6) — the real useLivePresses: two clicks in one tick make ONE call (the guard is a ref, not state), a press in flight disables its own control only (Stop is pressable while Pause waits), a viewer who may not act presses nothing, a landed act sets the campaign it answered with (or asks for it when the answer had none), its toast fades when it is the act's plain sentence and STAYS (warning, durationMs 0) when it carries a warning or advice, a refusal stays until the next press clears it, an act that threw is unfinished with the reload words and a request for the campaign, a copy never takes a DRIVING page away (a link for a new tab) and navigates any other — but never once the page has been left (the answer skips only the navigate; React's development double-run still ends mounted) — the link a copy leaves behind stays through every other press and goes with the next Make a copy, the mode read is the latest when the answer lands, a throw out of a setter leaves no control pending for good, and the compiled real source passes the same scenarios (the control)",
  v15: "V15 · ⭐ WHAT THE PAGE SAYS AND WHEN (the review's MINORS 1, 2, 4, 5, 8) — the pure decisions the components call: liveMay needs both the server and the console's gate; a control's state is its view's AND its own press in flight, never another's; the reasons PRINTED are a role's once for all five, the status's expected control's, and any that is not the plain 'not in this state' — the rest named to assistive technology — and every disabled control's aria-describedby names an element that is in the markup, carrying its reason; 'Nobody is sending' reaches an actor only after its own driver stopped (never above 'Keep this page open' on a first paint) and a watcher whenever it is the data's fact, PREPARING's in its own words; the closed send window and the switch's closing time reach a viewer who is not driving; a stopped driver's wait is gone; the toast of a plain act fades and every other stays; a copy while driving is a link; the page's ONE live region is always mounted, polite, and says the headline when the status CHANGES — never on mount, never for a headline that moved without it; the dialog a settled press closes is that press's own (a Pause answering leaves the Stop dialog, a refused Start leaves no dialog over its refusal — dialogAfterSettled, which the Provider calls); every callout of the controls card — a driver stop of each of its seven kinds (the step-up page at both of its addresses), a press's refusal and a copy's link — is drawn alone and read: its sentence, its one way on (the step-up link with the right text, Try again, Reload), target=_blank with rel=noopener noreferrer on every link that opens another tab, role=alert on every alert; the trail names the campaign (AdminCrumbLabel) and the ghost's buttons keep the kit's --tap-min; the components call these functions and make no such decision inline; and the compiled real source passes the same (the control)",
  v16: "V16 · ⭐ THE DEV SEED (the review's MINOR 9 and NIT) — ?busy= is re-entrant: two holds, then ?busy=0, put the admission gate's limits back exactly (a second hold never records the first's raised limits as the original); ?run= and ?stages= refuse (409) and make nothing unless the rail is the console stub, and make their campaign when it is; and every sentence the drive asserts against (each W.<path> its source names) is served by ?words=; and the compiled real source passes the same (the control)",
  v17: "V17 · THE COPY SPENDS THE OFFICER'S SAVE BUDGET (the first round's leftover) — Make a copy IS a saved draft: the copy action, compiled and run with stand-ins, asks the budget exactly once — for this officer, on the real marketing.campaignSave rule (a bucket the rate limiter does not know fails OPEN) — AFTER its guard and BEFORE the service, answers rate_limited with copyRateLimitedSentence(retryAfterSec) and runs nothing when it is refused, does not ask at all when the guard refuses, and no other press and not the poll spends it; and the compiled real source passes the same (the control)",
} as const;
export type LiveLabel = (typeof LIVE_LABELS)[keyof typeof LIVE_LABELS];

/* ══ THE SOURCES, COMPILED — a hook's plant is its source with one defect, evaluated like the module ═════════════════════ */

/** Compile a TypeScript source (CommonJS) and evaluate it with ONLY the imports it is given. A module that asks for anything
 *  else throws — a plant never reaches past what the file imports, and a new import is a decision made here. */
export function evalModule(source: string, requires: Record<string, unknown>): Record<string, unknown> {
  const out = transformSync(source, { loader: "ts", format: "cjs", target: "es2022", sourcefile: "planted.ts" });
  const mod = { exports: {} as Record<string, unknown> };
  const req = (spec: string): unknown => {
    if (Object.prototype.hasOwnProperty.call(requires, spec)) return requires[spec];
    throw new Error(`the planted module asked for ${spec}`);
  };
  new Function("require", "module", "exports", out.code)(req, mod, mod.exports);
  return mod.exports;
}
/** The value imports of a decommented source (an `import type` is erased and not asked for). */
const IMPORT_FROM = /^import (?!type )[^;]*? from "([^"]+)";/gm;
const valueImportSpecs = (src: string): string[] => Array.from(src.matchAll(IMPORT_FROM), (m) => m[1]);

const SEED_REQUIRES: Record<string, unknown> = {};
for (const spec of valueImportSpecs(REAL_SOURCES.seed)) SEED_REQUIRES[spec] = await import(spec);

const compiledDriver = (src: string): Mods["driver"] => evalModule(src, { react: React }) as unknown as Mods["driver"];
const compiledDecide = (src: string): Mods["decide"] => evalModule(src, { "./live-copy": COPY }) as unknown as Mods["decide"];
const compiledPresses = (src: string, decide: Mods["decide"]): Mods["presses"] =>
  evalModule(src, { react: React, "@/lib/client/run-admin-action": RUNADMIN, "./live-copy": COPY, "./live-decide": decide }) as unknown as Mods["presses"];
const compiledAnnounce = (src: string, decide: Mods["decide"]): Mods["announce"] =>
  evalModule(src, { react: React, "./live-decide": decide }) as unknown as Mods["announce"];
const compiledDoor = (src: string): Mods["door"] =>
  evalModule(src, {
    "@/lib/server/rbac-guard": GUARD, "@/lib/server/journey-preview-doors": DOORS, "@/lib/server/marketing/campaign-control": CTRL,
    "@/lib/marketing/campaign-status": STATUS, "@/components/admin/admin-nav-groups": NAVGROUPS, "./live-viewer": VIEWER, "./live-run": RUN, "./live-copy": COPY,
  }) as unknown as Mods["door"];
const compiledRoute = (src: string, door: Mods["door"]): Mods["route"] =>
  evalModule(src, { "next/server": NEXT, "@/app/admin/campaigns/[id]/live-step-door": door }) as unknown as Mods["route"];
const compiledSeed = (src: string): Mods["seed"] => evalModule(src, SEED_REQUIRES) as unknown as Mods["seed"];

/** The real sources, compiled and evaluated: the control every executing claim also runs. */
let CONTROL: Mods | null = null;
function controlMods(): Mods {
  if (CONTROL !== null) return CONTROL;
  const S = REAL_SOURCES;
  const decide = compiledDecide(S.decide);
  const door = compiledDoor(S.door);
  CONTROL = {
    driver: compiledDriver(S.driver), presses: compiledPresses(S.presses, decide), announce: compiledAnnounce(S.announce, decide),
    decide, door, route: compiledRoute(S.route, door), seed: compiledSeed(S.seed),
  };
  return CONTROL;
}

/* ══ SMALL TOOLS ════════════════════════════════════════════════════════════════════════════════════════════════════ */

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };
const defer = <T,>(): Deferred<T> => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
};
const flushAll = async (): Promise<void> => { for (let i = 0; i < 6; i++) await new Promise<void>((resolve) => setImmediate(resolve)); };
async function withClock(run: (clock: FakeClock) => Promise<void>): Promise<void> {
  const clock = fakeClock();
  try { await run(clock); } finally { clock.restore(); }
}
/** Run `run` with the process's unhandled rejections collected instead of fatal — a hook that lets a host's throw surface
 *  (React would log it) must not end the suite. */
async function collectingRejections<T>(run: () => Promise<T>): Promise<{ value: T; rejected: unknown[] }> {
  const rejected: unknown[] = [];
  const onRejected = (reason: unknown): void => { rejected.push(reason); };
  process.on("unhandledRejection", onRejected);
  try {
    const value = await run();
    await flushAll();
    return { value, rejected };
  } finally {
    process.off("unhandledRejection", onRejected);
  }
}
const errorName = (err: unknown): string => (err instanceof Error && err.name !== "" ? err.name : "error");
/** Scenarios that start work no one awaits (a hook's effect, a press): a throw out of it is an unhandled rejection, which ends the
 *  process — so it is collected, and reported as what it is: something wrong in the hook under test. `allowed` are the messages a
 *  scenario throws on purpose. */
async function guarded(run: () => Promise<string[]>, allowed: readonly string[] = []): Promise<string[]> {
  const { value, rejected } = await collectingRejections(run);
  const stray = rejected.map((r) => String((r as Error)?.message ?? r)).filter((m) => !allowed.includes(m));
  return [...value, ...stray.map((m) => `an unhandled rejection escaped the hook: ${m.slice(0, 120)}`)];
}

/** Stand-in calls for the driver: a queue of answers per kind (a value, an Error to throw, or a function evaluated when called). */
function stand() {
  const queue = { step: [] as unknown[], poll: [] as unknown[] };
  const n = { steps: 0, polls: 0 };
  let inFlight = 0;
  let overlap = false;
  const ask = (kind: "step" | "poll") => async (): Promise<never> => {
    n[kind === "step" ? "steps" : "polls"]++;
    if (++inFlight > 1) overlap = true;
    try {
      let next = queue[kind].shift();
      if (typeof next === "function") next = await (next as () => unknown)();
      if (next instanceof Error) throw next;
      if (next === undefined) throw new Error(`the stand-in has no ${kind} answer left`);
      return next as never;
    } finally {
      inFlight--;
    }
  };
  return { queue, n, step: ask("step"), poll: ask("poll"), overlap: () => overlap };
}

/* ══ V12 · THE STEP DOOR ════════════════════════════════════════════════════════════════════════════════════════════ */

type DoorFx = { ids: { aud: string; sup: string; adm: string; grw: string }; campaignId: string; goneId: string };

const sessionOf = (userId: string, role: string) =>
  ({ userId, sessionId: `s_${userId}`, phoneE164: "+255680000000", role, kycStatus: "NOT_STARTED", iat: 0, exp: Date.now() + 3_600_000, lastSeenAt: 0 });

/** Every V12 check, against one door (and its route). Returns what went wrong, in words. */
async function doorChecks(M: Mods, S: PageSources, fx: DoorFx, h: PageHarness): Promise<string[]> {
  const wrong: string[] = [];
  const door = M.door.campaignStepDoor;
  type Sess = ReturnType<typeof sessionOf> | null;
  const spy = { guard: 0, viewer: 0, step: 0, logs: [] as string[] };
  const reset = () => { spy.guard = 0; spy.viewer = 0; spy.step = 0; spy.logs.length = 0; };
  const depsFor = (s: Sess, factor = "ok", over: Record<string, unknown> = {}) => ({
    guard: (d: never, a: string, r: string) => {
      spy.guard++;
      return GUARD.softCheckStaff(d, a, r, { session: async () => s, secondFactor: async () => factor } as never);
    },
    viewer: async (id: string) => { spy.viewer++; return VIEWER.liveViewerFor(id); },
    step: async (id: string, v: LiveViewer) => { spy.step++; return CTRL.campaignStep(id, v, h.ctrlDeps()); },
    log: (err: unknown) => { spy.logs.push(errorName(err)); },
    ...over,
  }) as never;
  const post = (id: unknown, site: string | null = "same-origin", method = "POST", header: string | null = "1") =>
    ({ method, secFetchSite: site, stepHeader: header, campaignId: id });
  const roundTrip = (v: unknown): string => json(JSON.parse(json(v)));
  const ACTION = "marketing.campaign.step";
  // ⭐ The security rows this door's refusals wrote, BY IDENTITY: the in-memory audit log is a ring of 10,000 entries (all categories), and a
  // count taken before and after stops moving by one once the ring is full — the oldest row falls out as the new one comes in. A red run
  // of ~175 worlds fills it. The rows that are NEW are the ones whose id was not there before.
  const blockedIds = async (): Promise<Set<string>> => {
    await auditFlush();
    return new Set(getAuditPage({ category: "SECURITY", limit: 10_000 }).filter((e) => e.action === "privilege_escalation_blocked" && e.targetId === ACTION).map((e) => e.id));
  };
  const noisy = console.error;
  console.error = () => {};
  try {
    // 1 · the answer is the service's own, as JSON — for a GROWTH officer and for the Owner, each role-shaped
    const expectGrowth = roundTrip(await CTRL.campaignStep(fx.campaignId, await VIEWER.liveViewerFor(fx.ids.grw), h.ctrlDeps()));
    const expectOwner = roundTrip(await CTRL.campaignStep(fx.campaignId, await VIEWER.liveViewerFor(fx.ids.adm), h.ctrlDeps()));
    const okGrowth = await door(post(fx.campaignId), depsFor(sessionOf(fx.ids.grw, "GROWTH")));
    const growthSpy = { guard: spy.guard, viewer: spy.viewer, step: spy.step };
    reset();
    const okOwner = await door(post(fx.campaignId), depsFor(sessionOf(fx.ids.adm, "ADMIN")));
    reset();
    const same = okGrowth.status === 200 && roundTrip(okGrowth.body) === expectGrowth && okOwner.status === 200 && roundTrip(okOwner.body) === expectOwner
      && expectGrowth !== expectOwner && growthSpy.guard === 1 && growthSpy.viewer === 1 && growthSpy.step === 1;
    if (!same) wrong.push(`the answer: GROWTH ${okGrowth.status} identical ${roundTrip(okGrowth.body) === expectGrowth}, Owner ${okOwner.status} identical ${roundTrip(okOwner.body) === expectOwner}, role-shaped ${expectGrowth !== expectOwner}, calls ${json(growthSpy)}`);
    // …role-shaped means: no money for GROWTH, no phone number for anyone
    const growthBody = okGrowth.body !== null && okGrowth.body.ok ? okGrowth.body : null;
    const ownerBody = okOwner.body !== null && okOwner.body.ok ? okOwner.body : null;
    const clean = growthBody !== null && growthBody.view.money === null && !json(okGrowth.body).includes("TZS") && ownerBody !== null && ownerBody.view.money !== null
      && ![okGrowth.body, okOwner.body].some((b) => /255[0-9]{9}/.test(json(b)) || json(b).includes("+255"));
    h.see(json(okGrowth.body));
    h.see(json(okOwner.body));
    if (!clean) wrong.push(`privacy: GROWTH money ${json(growthBody?.view.money)}, Owner money ${json(ownerBody?.view.money)}`);

    // 2 · POST only, and never cross-site — refused BEFORE the guard (the session is not even read)
    for (const method of ["GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
      reset();
      const a = await door(post(fx.campaignId, "same-origin", method), depsFor(sessionOf(fx.ids.grw, "GROWTH")));
      if (!(a.status === 405 && a.body === null && a.allow === "POST" && spy.guard === 0 && spy.viewer === 0 && spy.step === 0)) wrong.push(`${method}: ${a.status} allow ${a.allow} body ${json(a.body)} guard ${spy.guard}`);
    }
    for (const site of ["cross-site", "same-site", "none"]) {
      reset();
      const a = await door(post(fx.campaignId, site), depsFor(sessionOf(fx.ids.grw, "GROWTH")));
      if (!(a.status === 403 && a.body === null && spy.guard === 0 && spy.viewer === 0 && spy.step === 0)) wrong.push(`Sec-Fetch-Site ${site}: ${a.status} body ${json(a.body)} guard ${spy.guard}`);
    }
    reset();
    const headerless = await door(post(fx.campaignId, null), depsFor(sessionOf(fx.ids.grw, "GROWTH")));
    if (headerless.status !== 200) wrong.push(`a client that sends no Sec-Fetch-Site was refused (${headerless.status})`);

    // 2b · …but never without the page's OWN header (the checker's NIT — the belt for exactly that client): absent or wrong, a 403 that asks
    // nothing of the session, the viewer or the service; present with same-origin, the step is asked
    for (const header of [null, "", "0", "true", "2", "yes", "1 "]) {
      reset();
      const a = await door(post(fx.campaignId, "same-origin", "POST", header), depsFor(sessionOf(fx.ids.grw, "GROWTH")));
      if (!(a.status === 403 && a.body === null && spy.guard === 0 && spy.viewer === 0 && spy.step === 0)) wrong.push(`X-Kp-Step ${json(header)}: ${a.status} body ${json(a.body)} guard ${spy.guard}, viewer ${spy.viewer}, step ${spy.step}`);
    }
    reset();
    const bare2 = await door(post(fx.campaignId, null, "POST", null), depsFor(sessionOf(fx.ids.grw, "GROWTH")));
    if (!(bare2.status === 403 && bare2.body === null && spy.guard === 0 && spy.step === 0)) wrong.push(`no Sec-Fetch-Site and no X-Kp-Step: ${bare2.status}, guard ${spy.guard}, step ${spy.step}`);
    reset();
    const marked = await door(post(fx.campaignId, "same-origin", "POST", "1"), depsFor(sessionOf(fx.ids.grw, "GROWTH")));
    if (!(marked.status === 200 && spy.guard === 1 && spy.viewer === 1 && spy.step === 1)) wrong.push(`same-origin with the header: ${marked.status}, guard ${spy.guard}, viewer ${spy.viewer}, step ${spy.step}`);
    // the SEAM: what the driver's client sends is what the door accepts (a header the client dropped or renamed is a page that cannot step)
    let sent: Record<string, string> = {};
    const recordingFetch = (async (_input: unknown, init?: { headers?: Record<string, string> }) => {
      sent = { ...(init?.headers ?? {}) };
      return { status: 200, json: async () => JSON.parse(json(okGrowth.body)) } as unknown as Response;
    }) as unknown as typeof fetch;
    await M.driver.postLiveStep(fx.campaignId, recordingFetch);
    const sentName = Object.keys(sent).find((k) => k.toLowerCase() === "x-kp-step") ?? null;
    reset();
    const viaClient = await door(post(fx.campaignId, "same-origin", "POST", sentName === null ? null : sent[sentName]), depsFor(sessionOf(fx.ids.grw, "GROWTH")));
    if (!(sentName !== null && viaClient.status === 200 && spy.step === 1)) wrong.push(`the driver's request carries ${json(sent)}; the door answered it ${viaClient.status} (step calls ${spy.step})`);
    reset();

    // 3 · the guard first; the viewer and the service are not asked on ANY refusal; the STORED role decides
    const refusals: Array<[string, Sess, string, number, string]> = [
      ["a role with Growth VIEW alone", sessionOf(fx.ids.aud, "AUDITOR"), "ok", 403, "role"],
      ["a role with no Growth grant", sessionOf(fx.ids.sup, "SUPPORT"), "ok", 403, "role"],
      ["a cookie that claims ADMIN over a stored SUPPORT", sessionOf(fx.ids.sup, "ADMIN"), "ok", 403, "role"],
      ["a 2-step sign-in that lapsed", sessionOf(fx.ids.grw, "GROWTH"), "unverified", 403, "second_factor"],
      ["a 2-step sign-in never set up", sessionOf(fx.ids.adm, "ADMIN"), "not-enrolled", 403, "second_factor"],
      ["no session at all", null, "ok", 401, "signed_out"],
    ];
    for (const [name, s, factor, status, reason] of refusals) {
      reset();
      const before = await blockedIds();
      let threw: string | null = null;
      let a: Awaited<ReturnType<typeof door>> | null = null;
      try { a = await door(post(fx.campaignId), depsFor(s, factor)); } catch (err) { threw = errorName(err); }
      const body = a?.body ?? null;
      const recorded = [...(await blockedIds())].filter((id) => !before.has(id)).length;
      const rowOk = reason === "role" ? recorded === 1 : recorded === 0;
      if (!(threw === null && a !== null && a.status === status && body !== null && !body.ok && body.reason === reason && spy.guard === 1 && spy.viewer === 0 && spy.step === 0 && rowOk)) {
        wrong.push(`${name}: ${a?.status ?? `threw ${threw}`} ${json(body)} guard ${spy.guard}, viewer ${spy.viewer}, step ${spy.step}, security rows ${recorded}`);
      }
    }
    reset();
    const lapsed = await door(post(fx.campaignId), depsFor(sessionOf(fx.ids.grw, "GROWTH"), "unverified"));
    const unset = await door(post(fx.campaignId), depsFor(sessionOf(fx.ids.adm, "ADMIN"), "not-enrolled"));
    const out = await door(post(fx.campaignId), depsFor(null));
    const links = lapsed.body !== null && !lapsed.body.ok && lapsed.body.reason === "second_factor" && lapsed.body.href === "/admin/totp-verify" && lapsed.body.error === GUARD.SECOND_FACTOR_LAPSED
      && unset.body !== null && !unset.body.ok && unset.body.reason === "second_factor" && unset.body.href === "/admin/2fa/setup" && unset.body.error === GUARD.SECOND_FACTOR_NOT_SET_UP
      && out.body !== null && !out.body.ok && out.body.reason === "signed_out" && out.body.error === COPY.LIVE_SIGNED_OUT
      // the way back is the console's own (ruling 551(a)): the SECTION, never the record's id
      && out.body.href === `/auth/admin?next=${encodeURIComponent("/admin/campaigns")}` && !out.body.href.includes(fx.campaignId);
    if (!links) wrong.push(`the words and links: ${json([lapsed.body, unset.body, out.body])}`);

    // 4 · a campaign that is not there; a viewer the service refuses; a throw is a typed answer, never a page
    reset();
    const missing = await door(post(fx.goneId), depsFor(sessionOf(fx.ids.grw, "GROWTH")));
    const closed = await door(post(fx.campaignId), depsFor(sessionOf(fx.ids.grw, "GROWTH"), "ok", { viewer: async (id: string) => ({ userId: id, mayAct: false, reads: false, money: false }) }));
    const notFound = missing.status === 404 && missing.body !== null && !missing.body.ok && missing.body.reason === "not_found";
    const roleFromService = closed.status === 403 && closed.body !== null && !closed.body.ok && closed.body.reason === "role";
    if (!(notFound && roleFromService)) wrong.push(`a missing campaign ${missing.status} ${json(missing.body)}; a viewer the service refuses ${closed.status} ${json(closed.body)}`);
    reset();
    const boom = await door(post(fx.campaignId), depsFor(sessionOf(fx.ids.grw, "GROWTH"), "ok", { step: async () => { spy.step++; throw new TypeError("the database dropped the connection"); } }));
    const afterBoom = { logs: [...spy.logs] };
    reset();
    let guardEscaped: string | null = null;
    let guardBoom: Awaited<ReturnType<typeof door>> | null = null;
    try { guardBoom = await door(post(fx.campaignId), depsFor(sessionOf(fx.ids.grw, "GROWTH"), "ok", { guard: async () => { spy.guard++; throw new RangeError("the session store is down"); } })); } catch (err) { guardEscaped = errorName(err); }
    const afterGuardBoom = { step: spy.step, first: spy.logs[0] };
    let stepEscaped: string | null = null;
    try { await door(post(fx.campaignId), depsFor(sessionOf(fx.ids.grw, "GROWTH"), "ok", { step: async () => { throw new TypeError("again"); } })); } catch (err) { stepEscaped = errorName(err); }
    const thrown = boom.status === 500 && boom.body !== null && !boom.body.ok && boom.body.reason === "unfinished" && boom.body.error === COPY.LIVE_STEP_UNFINISHED && json(afterBoom.logs) === json(["TypeError"])
      && guardEscaped === null && guardBoom !== null && guardBoom.status === 500 && guardBoom.body !== null && !guardBoom.body.ok && guardBoom.body.reason === "unfinished"
      // a guard that could not answer asked nothing of the campaign: its own words, never "a group may have gone out"
      && guardBoom.body.error === COPY.LIVE_STEP_GUARD_FAILED && !guardBoom.body.error.includes("may or may not have gone out")
      && afterGuardBoom.step === 0 && afterGuardBoom.first === "RangeError" && stepEscaped === null;
    if (!thrown) wrong.push(`a throw: step ${boom.status} ${json(boom.body)} logs ${json(afterBoom.logs)}; guard ${guardBoom?.status ?? `escaped ${guardEscaped}`} ${json(guardBoom?.body)} step calls ${afterGuardBoom.step}; step escaped ${stepEscaped}`);

    // 4b · the SEAM with the driver's client: every body the door answered above — a step, a role, a lapsed and a never-set-up
    // 2-step, no session, no campaign, a throw — is one `postLiveStep` accepts (anything else would read "out of date" and stop)
    const bodies = [okGrowth.body, okOwner.body, lapsed.body, unset.body, out.body, missing.body, closed.body, boom.body, guardBoom?.body ?? null].filter((b) => b !== null);
    const unknownToDriver = bodies.filter((b) => !M.driver.isStepAnswer(JSON.parse(json(b)))).map((b) => json(b).slice(0, 80));
    if (bodies.length !== 9 || unknownToDriver.length > 0) wrong.push(`the driver's client does not know ${unknownToDriver.length} of the door's ${bodies.length} answers: ${unknownToDriver.join(" | ")}`);

    // 5 · production's dependencies: frozen, the guard and the service by identity
    const D = M.door.LIVE_STEP_DOOR_DEPS;
    const wired = Object.isFrozen(D) && D.guard === GUARD.softCheckStaff && D.step === CTRL.campaignStep;
    if (!wired) wrong.push(`production's deps: frozen ${Object.isFrozen(D)}, guard is softCheckStaff ${D.guard === GUARD.softCheckStaff}, step is campaignStep ${D.step === CTRL.campaignStep}`);
    // 5b · the production log names the error's TYPE alone — the message can carry a number, and none is ever printed (the checker's NIT; M28)
    const printed: string[] = [];
    const quiet = console.error;
    console.error = (...args: unknown[]) => { printed.push(args.map((x) => (typeof x === "string" ? x : json(x))).join(" ")); };
    try {
      D.log(new TypeError("the database said +255712345678 could not be found"));
    } finally {
      console.error = quiet;
    }
    const line = printed.join(" | ");
    if (!(printed.length === 1 && line.includes("TypeError") && !line.includes("255712345678") && !line.includes("could not be found") && !line.includes("database"))) wrong.push(`the production log printed ${json(printed)} (want the error's type alone)`);

    // 6 · the door's source: the two request checks, then the guard — and nothing is asked before it
    const body = bodyOf(S.door, "campaignStepDoor") ?? "";
    const at1 = body.indexOf('if (req.method !== "POST")');
    const at2 = body.indexOf("if (!sameOriginRequest(req.secFetchSite))");
    const atHeader = body.indexOf('if (req.stepHeader !== "1")');
    const atGuard = body.indexOf('deps.guard("growth", "marketing.campaign.step", LIVE_ROLE_REFUSAL)');
    const atViewer = body.indexOf("deps.viewer(");
    const atStep = body.indexOf("deps.step(");
    const order = at1 >= 0 && at2 > at1 && atHeader > at2 && atGuard > atHeader && atViewer > atGuard && atStep > atViewer && !body.slice(0, atGuard).includes("deps.viewer") && !body.slice(0, atGuard).includes("deps.step");
    if (!order) wrong.push(`the door's order: method ${at1}, site ${at2}, header ${atHeader}, guard ${atGuard}, viewer ${atViewer}, step ${atStep}`);

    // 7 · the route, called as Next calls it: a typed answer for every request, no-store on each, the body never consumed
    const route = M.route;
    const ctx = { params: Promise.resolve({ id: fx.campaignId }) };
    const url = `http://localhost/api/admin/campaigns/${fx.campaignId}/step`;
    const wrongMethod = await route.POST(new Request(url, { method: "GET" }), ctx);
    const crossSite = await route.POST(new Request(url, { method: "POST", headers: { "sec-fetch-site": "cross-site", "x-kp-step": "1" } }), ctx);
    // the page's own header, handed from the request to the door: without it a same-origin POST is refused empty; with it the guard is reached
    const unmarked = await route.POST(new Request(url, { method: "POST", headers: { "sec-fetch-site": "same-origin" } }), ctx);
    const withBody = new Request(url, { method: "POST", headers: { "sec-fetch-site": "same-origin", "x-kp-step": "1" }, body: json({ userId: "usr_posted", mayAct: true }) });
    // no request scope here, so the real guard cannot read a cookie: the route must still answer — typed, as JSON — and not throw
    let bare: Response | null = null;
    let bareText = "";
    let bareThrew: string | null = null;
    try {
      bare = await route.POST(withBody, ctx);
      bareText = await bare.clone().text();
    } catch (err) {
      bareThrew = errorName(err);
    }
    const noStore = (r: Response | null) => r !== null && /no-store/.test(r.headers.get("cache-control") ?? "");
    const typed = (() => {
      try {
        const j = JSON.parse(bareText) as { ok?: boolean; reason?: string };
        return j.ok === false && typeof j.reason === "string";
      } catch { return false; }
    })();
    const exported = Object.keys(route).filter((k) => k !== "default" && k !== "__esModule").sort().join();
    const routeOk = wrongMethod.status === 405 && wrongMethod.headers.get("allow") === "POST" && noStore(wrongMethod)
      && crossSite.status === 403 && noStore(crossSite) && (await crossSite.text()) === ""
      && unmarked.status === 403 && noStore(unmarked) && (await unmarked.text()) === ""
      && bareThrew === null && bare !== null && [401, 403, 500].includes(bare.status) && noStore(bare) && /application[/]json/.test(bare.headers.get("content-type") ?? "") && typed
      && withBody.bodyUsed === false && exported === "POST,dynamic,runtime";
    if (!routeOk) wrong.push(`the route: GET ${wrongMethod.status} allow ${wrongMethod.headers.get("allow")}, cross-site ${crossSite.status}, no header ${unmarked.status}, with the header and no scope ${bareThrew ?? bare?.status} ${bareText.slice(0, 80)} no-store ${noStore(bare)}, body used ${withBody.bodyUsed}, exports ${exported}`);
    const rsrc = S.route;
    // the request's own body or query: `req.json()`, `request.text()`, `req.body` … (NextResponse.json is the RESPONSE, and fine)
    const BODY_READ = new RegExp("(^|[^A-Za-z0-9_])(req|request)[.](json|text|formData|arrayBuffer|blob|body)([^A-Za-z0-9_]|$)");
    const readsBody = BODY_READ.test(rsrc) || rsrc.includes("searchParams");
    if (readsBody || !rsrc.includes("campaignStepDoor(") || !rsrc.includes("LIVE_STEP_DOOR_DEPS") || !/no-store/.test(rsrc) || !rsrc.includes('headers.get("x-kp-step")')) wrong.push(`the route's source: reads a body or a query ${readsBody}, no-store ${/no-store/.test(rsrc)}, hands the page's header to the door ${rsrc.includes('headers.get("x-kp-step")')}`);
  } finally {
    console.error = noisy;
  }
  return wrong;
}

async function doorFixture(h: PageHarness): Promise<DoorFx> {
  const at = "2026-10-08T08:00:00.000Z";
  const user = async (id: string, role: StoredUser["role"], n: number) => {
    if (!(await db.user.findById(id))) {
      await db.user.create({
        id, phoneE164: `+255682${String(h.run).padStart(3, "0").slice(-3)}${String(n).padStart(3, "0")}`, email: null, passwordHash: null, passwordSalt: null,
        failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "SW", displayName: `V12 ${role}`, dob: "1990-01-01", region: null,
        acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
        createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
      } as StoredUser);
    }
    return id;
  };
  const ids = {
    aud: await user(`usr_u47b2_d12_aud_${h.run}`, "AUDITOR", 1), sup: await user(`usr_u47b2_d12_sup_${h.run}`, "SUPPORT", 2),
    adm: await user(`usr_u47b2_d12_adm_${h.run}`, "ADMIN", 3), grw: await user(`usr_u47b2_d12_grw_${h.run}`, "GROWTH", 4),
  };
  const c = await h.campaign("pv12", { path: PATHS.PAUSED, count: 12, estimateTzs: 9624, budgetTzs: 10_000 });
  return { ids, campaignId: c.id, goneId: `cmp_u47b2_nobody_${h.run}` };
}

/* ══ V13 · THE DRIVER'S HOOK ════════════════════════════════════════════════════════════════════════════════════════ */

/** Every V13 scenario, run against one driver module. Returns what went wrong, in words. */
async function driverScenarios(D: Mods["driver"]): Promise<string[]> {
  const wrong: string[] = [];
  const props = (c: ReturnType<typeof stand>, mayAct: boolean, status: string) => ({ id: "cmp_x", mayAct, initial: viewAt(status), step: c.step, poll: c.poll });
  const sent = { kind: "sent" };

  // ── A · the cadence: at once · 2 s after work · the wait's until · 5 s when busy · the end ──
  await withClock(async (clock) => {
    const c = stand();
    c.queue.step = [
      OK_STEP("RUNNING", sent),
      () => OK_STEP("RUNNING", { kind: "waiting", busy: false, until: new Date(Date.now() + 12_000).toISOString() }, "Waiting for the send window."),
      OK_STEP("RUNNING", { kind: "waiting", busy: true, until: null }, "Another step is running."),
      OK_STEP("DONE", { kind: "finished" }),
    ];
    const m = mountHook(D.useLiveDriver, props(c, true, "RUNNING"));
    const t0 = clock.now();
    const marks: Array<[number, number, string | null]> = [];
    const mark = async (ms: number) => { await clock.advance(ms); marks.push([clock.now() - t0, c.n.steps, m.result().said]); };
    for (const ms of [0, 1_999, 1, 11_999, 1, 4_999, 1, 120_000]) await mark(ms);
    const want = [[0, 1, null], [1_999, 1, null], [2_000, 2, "Waiting for the send window."], [13_999, 2, "Waiting for the send window."], [14_000, 3, "Another step is running."],
      [18_999, 3, "Another step is running."], [19_000, 4, null], [139_000, 4, null]];
    if (json(marks) !== json(want)) wrong.push(`the cadence: ${json(marks)}`);
    const r = m.result();
    if (!(r.steps === 4 && r.polls === 0 && r.ran === true && r.stop === null && r.mode === "off" && r.view.status === "DONE")) wrong.push(`the end: ${json({ steps: r.steps, polls: r.polls, ran: r.ran, stop: r.stop, mode: r.mode, status: r.view.status })}`);
    if (clock.pending() !== 0 || c.overlap()) wrong.push(`a finished campaign left ${clock.pending()} timer(s), overlap ${c.overlap()}`);
  });

  // ── B · React's development double-run makes ONE step, not two ──
  await withClock(async (clock) => {
    const c = stand();
    c.queue.step = [OK_STEP("RUNNING", sent), OK_STEP("RUNNING", sent), OK_STEP("RUNNING", sent)];
    const m = mountHook(D.useLiveDriver, props(c, true, "RUNNING"), { strict: true });
    await clock.advance(0);
    const atOnce = c.n.steps;
    await clock.advance(2_000);
    const later = c.n.steps;
    m.unmount();
    if (atOnce !== 1 || later !== 2) wrong.push(`StrictMode's double-run: ${atOnce} step call(s) at once (want 1), ${later} after 2 s (want 2)`);
  });

  // ── C · the page leaves while a step is in flight: no further call, no state set, no timer ──
  await withClock(async (clock) => {
    const c = stand();
    const gate = defer<unknown>();
    c.queue.step = [() => gate.promise, OK_STEP("RUNNING", sent), OK_STEP("RUNNING", sent)];
    const m = mountHook(D.useLiveDriver, props(c, true, "RUNNING"));
    await clock.advance(0);
    m.unmount();
    gate.resolve(OK_STEP("RUNNING", sent));
    await clock.advance(120_000);
    if (c.n.steps !== 1) wrong.push(`${c.n.steps} step calls after the page left with one in flight (want that one)`);
    if (m.staleSets() !== 0) wrong.push(`${m.staleSets()} state set(s) after the page left`);
    if (clock.pending() !== 0) wrong.push(`${clock.pending()} timer(s) left behind by a page that left`);
  });

  // ── D · the page leaves while the loop sleeps: the cleanup wakes it and no timer stays ──
  await withClock(async (clock) => {
    const c = stand();
    c.queue.step = [OK_STEP("RUNNING", sent), OK_STEP("RUNNING", sent)];
    const m = mountHook(D.useLiveDriver, props(c, true, "RUNNING"));
    await clock.advance(0);
    const sleeping = clock.pending();
    m.unmount();
    const afterLeaving = clock.pending();
    await clock.advance(60_000);
    if (!(sleeping === 1 && afterLeaving === 0 && c.n.steps === 1)) wrong.push(`a sleeping loop: ${sleeping} timer while it slept, ${afterLeaving} after the page left, ${c.n.steps} step call(s) (want 1, 0, 1)`);
  });

  // ── D2 · the page leaves before the loop's first tick: nothing was started and no timer is left for it ──
  await withClock(async (clock) => {
    const c = stand();
    c.queue.step = [OK_STEP("RUNNING", sent)];
    const m = mountHook(D.useLiveDriver, props(c, true, "RUNNING"));
    const scheduled = clock.pending();
    m.unmount();
    const left = clock.pending();
    await clock.advance(60_000);
    if (!(scheduled === 1 && left === 0 && c.n.steps === 0 && c.n.polls === 0 && m.staleSets() === 0)) {
      wrong.push(`a page that left before the first tick: ${scheduled} timer(s) scheduled, ${left} left after it left, ${c.n.steps} step(s), ${c.n.polls} poll(s), ${m.staleSets()} stale set(s) (want 1, 0, 0, 0, 0)`);
    }
  });

  // ── E · a viewer who may not act polls every 10 s and never steps ──
  await withClock(async (clock) => {
    const c = stand();
    c.queue.poll = [OK_VIEW("RUNNING"), OK_VIEW("RUNNING"), OK_VIEW("RUNNING"), OK_VIEW("RUNNING")];
    const m = mountHook(D.useLiveDriver, props(c, false, "RUNNING"));
    await clock.advance(35_000);
    const r = m.result();
    if (!(c.n.steps === 0 && c.n.polls === 3 && r.mode === "watch" && r.steps === 0 && r.polls === 3)) wrong.push(`a watcher in 35 s: ${c.n.steps} step(s), ${c.n.polls} poll(s), mode ${r.mode} (want 0, 3, watch)`);
    m.unmount();
  });

  // ── F · a pause flips the mode: ONE new loop, polling, and the reaper does not run again ──
  await withClock(async (clock) => {
    const c = stand();
    c.queue.step = [OK_STEP("PAUSED", { kind: "paused" }), OK_STEP("PAUSED", { kind: "reaped" })];
    c.queue.poll = [OK_VIEW("PAUSED"), OK_VIEW("PAUSED"), OK_VIEW("PAUSED")];
    const m = mountHook(D.useLiveDriver, props(c, true, "RUNNING"));
    await clock.advance(0);
    const r = m.result();
    const afterPause = { steps: c.n.steps, polls: c.n.polls };
    await clock.advance(9_999);
    const quiet = { steps: c.n.steps, polls: c.n.polls };
    await clock.advance(1);
    const polled = { steps: c.n.steps, polls: c.n.polls };
    await clock.advance(60_000);
    if (!(r.view.status === "PAUSED" && r.mode === "watch")) wrong.push(`after a pause the mode is ${r.mode} on ${r.view.status} (want watch on PAUSED)`);
    if (json(afterPause) !== json({ steps: 1, polls: 0 }) || json(quiet) !== json({ steps: 1, polls: 0 }) || json(polled) !== json({ steps: 1, polls: 1 }) || c.n.steps !== 1) {
      wrong.push(`after a pause: ${json(afterPause)} then ${json(quiet)} then ${json(polled)}, ${c.n.steps} step(s) in the end (want one step, no reaper, then a poll every 10 s)`);
    }
    if (c.overlap()) wrong.push("two calls were in flight at once across a flip");
    m.unmount();
  });

  // ── G · opened on a PAUSED campaign: the reaper steps ONCE, then the page watches ──
  await withClock(async (clock) => {
    const c = stand();
    c.queue.step = [OK_STEP("PAUSED", { kind: "reaped" }), OK_STEP("PAUSED", { kind: "reaped" })];
    c.queue.poll = [OK_VIEW("PAUSED"), OK_VIEW("PAUSED"), OK_VIEW("PAUSED"), OK_VIEW("PAUSED"), OK_VIEW("PAUSED"), OK_VIEW("PAUSED"), OK_VIEW("PAUSED")];
    const m = mountHook(D.useLiveDriver, props(c, true, "PAUSED"));
    await clock.advance(0);
    const mounted = c.n.steps;
    await clock.advance(10_000);
    const polled = c.n.polls;
    await clock.advance(60_000);
    if (!(mounted === 1 && polled === 1 && c.n.steps === 1)) wrong.push(`opened on PAUSED: ${mounted} step(s) at once, ${polled} poll(s) at 10 s, ${c.n.steps} step(s) in the end (want 1, 1, 1)`);
    m.unmount();
  });

  // ── H · a stopped driver stays stopped; Try again starts it ──
  await withClock(async (clock) => {
    const c = stand();
    c.queue.step = [{ ok: false, reason: "second_factor", error: "lapsed", href: "/admin/totp-verify" }, OK_STEP("RUNNING", sent), OK_STEP("RUNNING", sent)];
    const m = mountHook(D.useLiveDriver, props(c, true, "RUNNING"));
    await clock.advance(0);
    const stopped = m.result().stop;
    await clock.advance(60_000);
    const idle = { steps: c.n.steps, timers: clock.pending() };
    m.result().retry();
    await clock.advance(0);
    const again = { steps: c.n.steps, stop: m.result().stop };
    if (!(stopped !== null && stopped.kind === "second_factor" && json(idle) === json({ steps: 1, timers: 0 }) && json(again) === json({ steps: 2, stop: null }))) {
      wrong.push(`a stopped driver: stop ${json(stopped)}, idle ${json(idle)}, after Try again ${json(again)}`);
    }
    m.unmount();
  });

  // ── I · refresh reads the campaign at once (a watcher's first poll is NOT after 10 s) ──
  await withClock(async (clock) => {
    const c = stand();
    c.queue.poll = [OK_VIEW("RUNNING"), OK_VIEW("RUNNING")];
    const m = mountHook(D.useLiveDriver, props(c, false, "RUNNING"));
    await clock.advance(0);
    const before = c.n.polls;
    m.result().refresh();
    await clock.advance(0);
    if (!(before === 0 && c.n.polls === 1)) wrong.push(`refresh: ${before} poll(s) before, ${c.n.polls} after (want 0, then 1 at once)`);
    m.unmount();
  });

  // ── J · PREPARING → RUNNING keeps the mode: the loop is NOT restarted and the gap after the step that did the work is kept ──
  await withClock(async (clock) => {
    const c = stand();
    c.queue.step = [OK_STEP("RUNNING", { kind: "wrote" }), OK_STEP("RUNNING", sent), OK_STEP("RUNNING", sent)];
    const m = mountHook(D.useLiveDriver, props(c, true, "PREPARING"));
    await clock.advance(0);
    const first = c.n.steps;
    await clock.advance(1_999);
    const held = c.n.steps;
    await clock.advance(1);
    if (!(first === 1 && held === 1 && c.n.steps === 2)) wrong.push(`PREPARING → RUNNING: ${first} step(s) at once, ${held} at 1.999 s, ${c.n.steps} at 2 s (want 1, 1, 2 — the gap kept)`);
    m.unmount();
  });
  return wrong;
}

/* ══ V14 · THE PRESSES ══════════════════════════════════════════════════════════════════════════════════════════════ */

type ToastSpec = { title: string; variant: string; durationMs?: number };

/** A landed answer, as the services give one. */
const landed = (message: string, view: CampaignLiveView | null = viewAt("RUNNING"), over: Record<string, unknown> = {}): LiveActAnswer =>
  ({ ok: true, message, recorded: true, href: null, view, ...over }) as LiveActAnswer;

async function pressScenarios(Pm: Mods["presses"]): Promise<string[]> {
  const wrong: string[] = [];
  const mk = (over: Record<string, unknown> = {}, opts: HostOptions = {}) => {
    const log = { calls: [] as string[], views: [] as string[], refreshes: 0, toasts: [] as ToastSpec[], navigated: [] as string[], settled: [] as string[] };
    const answers: Record<string, () => Promise<LiveActAnswer>> = {};
    const calls = Object.fromEntries(ACTS.map((a) => [a, async (id: string) => { log.calls.push(`${a}:${id}`); return answers[a] ? answers[a]() : landed(`${a} done`); }]));
    const host = {
      id: "cmp_x", may: true, mode: "watch", calls,
      setView: (v: CampaignLiveView | undefined) => { log.views.push(v === undefined || v === null ? String(v) : v.status); },
      refresh: () => { log.refreshes++; },
      toast: (t: ToastSpec) => { log.toasts.push(t); },
      navigate: (href: string) => { log.navigated.push(href); },
      onSettled: (a: string) => { log.settled.push(a); },
      ...over,
    };
    return { m: mountHook(Pm.useLivePresses, host as never, opts), log, answers, host };
  };

  // ── no double press: two clicks in one tick make ONE call; the next press, once it answered, is allowed ──
  {
    const { m, log, answers } = mk();
    const gate = defer<LiveActAnswer>();
    answers.pause = () => gate.promise;
    m.result().press("pause");
    m.result().press("pause");
    await flushAll();
    const duringPause = [...m.result().pending];
    gate.resolve(landed("Paused."));
    await flushAll();
    const afterPause = [...m.result().pending];
    answers.pause = async () => landed("Paused again.");
    m.result().press("pause");
    await flushAll();
    const pauseCalls = log.calls.filter((c) => c.startsWith("pause")).length;
    if (!(duringPause.join() === "pause" && afterPause.length === 0 && pauseCalls === 2)) wrong.push(`two clicks in one tick: pending ${json(duringPause)} then ${json(afterPause)}, ${pauseCalls} Pause call(s) in all (want pause, none, 2)`);
  }

  // ── per-control pending: Stop is pressable while Pause waits ──
  {
    const { m, log, answers } = mk();
    const pauseGate = defer<LiveActAnswer>();
    const stopGate = defer<LiveActAnswer>();
    answers.pause = () => pauseGate.promise;
    answers.stop = () => stopGate.promise;
    m.result().press("pause");
    await flushAll();
    m.result().press("stop");
    await flushAll();
    const both = [...m.result().pending].sort().join();
    stopGate.resolve(landed(COPY.LIVE_DONE.stop, viewAt("CANCELLED")));
    await flushAll();
    const afterStop = [...m.result().pending].join();
    pauseGate.resolve(landed(COPY.LIVE_DONE.pause, viewAt("PAUSED")));
    await flushAll();
    const rest = [...m.result().pending].join();
    if (!(log.calls.join() === "pause:cmp_x,stop:cmp_x" && both === "pause,stop" && afterStop === "pause" && rest === "")) wrong.push(`Stop while Pause waits: calls ${json(log.calls)}, pending ${both}, then ${afterStop}, then [${rest}] (want both called, pause+stop, pause, none)`);
  }

  // ── a viewer who may not act presses nothing ──
  {
    const { m, log } = mk({ may: false });
    for (const a of ACTS) m.result().press(a);
    await flushAll();
    if (log.calls.length !== 0 || m.result().pending.size !== 0) wrong.push(`a viewer who may not act made ${log.calls.length} call(s)`);
  }

  // ── a landed act: the campaign it answered with, a toast that fades when plain and stays when it carries a warning ──
  {
    const { m, log, answers } = mk();
    answers.pause = async () => landed(COPY.LIVE_DONE.pause, viewAt("PAUSED"));
    m.result().press("pause");
    await flushAll();
    answers.resume = async () => landed(`${COPY.LIVE_DONE.resume} ${COPY.LIVE_NOT_RECORDED}`, viewAt("RUNNING"), { recorded: false });
    m.result().press("resume");
    await flushAll();
    answers.stop = async () => landed(COPY.LIVE_CHANGED.stoppedAfterResume, viewAt("CANCELLED"));
    m.result().press("stop");
    await flushAll();
    const [t1, t2, t3] = log.toasts;
    const ok = json(log.views) === json(["PAUSED", "RUNNING", "CANCELLED"]) && log.settled.join() === "pause,resume,stop" && log.refreshes === 0
      && t1?.variant === "success" && t1.durationMs === undefined && t1.title === COPY.LIVE_DONE.pause
      && t2?.variant === "warning" && t2.durationMs === 0 && t3?.variant === "warning" && t3.durationMs === 0;
    if (!ok) wrong.push(`landed acts: views ${json(log.views)}, settled ${log.settled.join()}, toasts ${json(log.toasts.map((t) => [t.variant, t.durationMs]))}`);
  }

  // ── an answer with no view asks for it ──
  {
    const { m, log, answers } = mk();
    answers.start = async () => landed("Started.", null);
    m.result().press("start");
    await flushAll();
    if (!(log.refreshes === 1 && log.views.length === 0)) wrong.push(`an answer with no view: ${log.refreshes} request(s) for it, ${log.views.length} view(s) set (want 1, 0)`);
  }

  // ── a refusal stays until the NEXT press clears it ──
  {
    const { m, log, answers } = mk();
    answers.start = async () => ({ ok: false, reason: "switch_closed", message: "Marketing SMS are switched off.", view: viewAt("CONFIRMED"), href: null }) as LiveActAnswer;
    m.result().press("start");
    await flushAll();
    const shown = m.result().refusal;
    const gate = defer<LiveActAnswer>();
    answers.pause = () => gate.promise;
    m.result().press("pause");
    await flushAll();
    const cleared = m.result().refusal;
    gate.resolve(landed("Paused."));
    await flushAll();
    if (!(shown !== null && shown.act === "start" && shown.reason === "switch_closed" && shown.message === "Marketing SMS are switched off." && cleared === null && log.toasts.length === 1)) {
      wrong.push(`a refusal: shown ${json(shown)}, after the next press began ${json(cleared)}, ${log.toasts.length} toast(s) (want the refusal, then none, one toast for the Pause)`);
    }
  }

  // ── a copy never takes a DRIVING page away; any other it takes to the draft ──
  {
    const href = "/admin/campaigns/new?draft=cmp_new";
    const drive = mk({ mode: "drive" });
    drive.answers.copy = async () => landed("A copy was made as a new draft.", viewAt("RUNNING"), { href });
    drive.m.result().press("copy");
    await flushAll();
    const watch = mk({ mode: "watch" });
    watch.answers.copy = async () => landed("A copy was made as a new draft.", viewAt("DONE"), { href });
    watch.m.result().press("copy");
    await flushAll();
    // the mode read is the LATEST when the answer lands: pressed on a watching page that became a driving one meanwhile
    const late = mk({ mode: "watch" });
    const gate = defer<LiveActAnswer>();
    late.answers.copy = () => gate.promise;
    late.m.result().press("copy");
    await flushAll();
    late.m.rerender({ ...late.host, mode: "drive" });
    gate.resolve(landed("A copy was made as a new draft.", viewAt("RUNNING"), { href: "/admin/campaigns/new?draft=cmp_late" }));
    await flushAll();
    const ok = drive.log.navigated.length === 0 && drive.m.result().copyLink === href
      && watch.log.navigated.join() === href && watch.m.result().copyLink === null
      && late.log.navigated.length === 0 && late.m.result().copyLink === "/admin/campaigns/new?draft=cmp_late";
    if (!ok) wrong.push(`a copy: while driving navigated ${json(drive.log.navigated)} link ${json(drive.m.result().copyLink)}; while watching navigated ${json(watch.log.navigated)}; mode changed meanwhile navigated ${json(late.log.navigated)} link ${json(late.m.result().copyLink)}`);
    // …the link a copy leaves behind STAYS through every other press (the checker's NIT: it is no refusal, and a Pause pressed beside it
    // has no business taking it down) …
    drive.answers.pause = async () => landed("Paused.", viewAt("PAUSED"));
    drive.m.result().press("pause");
    await flushAll();
    const keptThroughPause = drive.m.result().copyLink === href;
    // …and goes with the next Make a copy: gone while that press is in flight, replaced by its own link when it lands
    const second = defer<LiveActAnswer>();
    drive.answers.copy = () => second.promise;
    drive.m.result().press("copy");
    await flushAll();
    const goneWhilePending = drive.m.result().copyLink === null;
    second.resolve(landed("A copy was made as a new draft.", viewAt("RUNNING"), { href: "/admin/campaigns/new?draft=cmp_again" }));
    await flushAll();
    const replaced = drive.m.result().copyLink === "/admin/campaigns/new?draft=cmp_again";
    if (!(keptThroughPause && goneWhilePending && replaced)) wrong.push(`the link a copy leaves behind: kept through a Pause ${keptThroughPause}, gone while the next copy is in flight ${goneWhilePending}, replaced by that copy's link ${replaced}`);
  }

  // ── an answer that lands after the page was LEFT does not navigate — and skips nothing else; React's development double-run ends MOUNTED ──
  {
    const href = "/admin/campaigns/new?draft=cmp_late";
    const left = mk({ mode: "watch" });
    const gate = defer<LiveActAnswer>();
    left.answers.copy = () => gate.promise;
    left.m.result().press("copy");
    await flushAll();
    left.m.unmount();
    gate.resolve(landed("A copy was made as a new draft.", viewAt("DONE"), { href }));
    await flushAll();
    const strict = mk({ mode: "watch" }, { strict: true });
    strict.answers.copy = async () => landed("A copy was made as a new draft.", viewAt("DONE"), { href });
    strict.m.result().press("copy");
    await flushAll();
    const skippedOnlyTheNavigate = left.log.navigated.length === 0 && left.log.toasts.length === 1 && left.log.views.join() === "DONE" && left.log.settled.join() === "copy";
    const mountedUnderStrictMode = strict.log.navigated.join() === href;
    if (!(skippedOnlyTheNavigate && mountedUnderStrictMode)) {
      wrong.push(`a copy answered after the page left: navigated ${json(left.log.navigated)}, ${left.log.toasts.length} toast(s), views ${json(left.log.views)}, settled ${json(left.log.settled)} (want [], 1, ["DONE"], ["copy"]); under React's double-run a page that stayed navigated ${json(strict.log.navigated)} (want [${href}])`);
    }
  }

  // ── an act that threw: unfinished, the reload words, and a request for the campaign ──
  {
    const { m, log, answers } = mk();
    answers.stop = async () => { throw new Error("Server error — nothing may have applied."); };
    m.result().press("stop");
    await flushAll();
    const r = m.result().refusal;
    if (!(r !== null && r.reason === "unfinished" && r.message === COPY.LIVE_ACT_UNFINISHED_NO_VIEW && log.refreshes === 1 && m.result().pending.size === 0)) {
      wrong.push(`an act that threw: ${json(r)}, ${log.refreshes} request(s) for the campaign, pending ${m.result().pending.size} (want unfinished with the reload words, 1, 0)`);
    }
  }

  // ── a throw out of the page's own setters leaves no control pending for good ──
  {
    let first = true;
    const { m, log } = mk({ toast: () => { if (first) { first = false; throw new Error("the toast is broken"); } } });
    const { rejected } = await collectingRejections(async () => {
      m.result().press("pause");
      await flushAll();
    });
    const stuck = m.result().pending.size;
    m.result().press("pause");
    await flushAll();
    if (!(stuck === 0 && log.calls.filter((c) => c.startsWith("pause")).length === 2)) wrong.push(`a setter that threw: ${stuck} control(s) pending afterwards, ${log.calls.length} call(s), ${rejected.length} rejection(s) surfaced (want 0, and a second press allowed)`);
  }
  return wrong;
}

/* ══ V15 · WHAT THE PAGE SAYS AND WHEN ══════════════════════════════════════════════════════════════════════════════ */

const OPEN_WINDOW = { open: true, opensAt: "", closesAt: "", label: "08:00–20:00 EAT", opensAtTime: "08:00", reason: null };
const SHUT_WINDOW = { open: false, opensAt: "2026-10-09T05:00:00.000Z", closesAt: "", label: "08:00–20:00 EAT", opensAtTime: "08:00", reason: "quiet_hours" };
type Standing = CampaignLiveView["standing"];
type Control = { enabled: boolean; reason: string | null };

/** A view with only what the decisions read: the status, the words of the headline, the standing facts and the five controls. */
const synth = (status: string, o: { standing?: Partial<Standing>; controls?: Record<string, Control>; headline?: string; stopSentence?: string | null } = {}): CampaignLiveView =>
  ({
    status, headline: o.headline ?? "", stopSentence: o.stopSentence ?? null,
    standing: { switchOpen: true, switchClosesAt: null, window: OPEN_WINDOW, lastStepAt: null, nobodyDriving: false, keepOpen: false, ...o.standing },
    controls: { ...Object.fromEntries(ACTS.map((a) => [a, { enabled: true, reason: null }])), ...o.controls },
  }) as unknown as CampaignLiveView;

/** The text of the element (`needle` in its opening tag) up to its closing tag; null when it is not in the markup. */
function textOfElement(html: string, needle: string, close = "</span>"): string | null {
  const tag = tagAt(html, needle);
  if (tag === null) return null;
  const from = html.indexOf(tag) + tag.length;
  return unescapeHtml(textOfHtml(html.slice(from, html.indexOf(close, from))));
}

/** The pure decisions and the announcement hook, against one set of modules. */
async function decisionChecks(M: Mods, S: PageSources, h: PageHarness, tag: string): Promise<string[]> {
  const wrong: string[] = [];
  const Dm = M.decide;
  const D = COPY.LIVE_DISABLED;

  // who may act
  const may = [Dm.liveMay(true, true), Dm.liveMay(true, false), Dm.liveMay(false, true), Dm.liveMay(false, false)];
  if (json(may) !== json([true, false, false, false])) wrong.push(`liveMay(server, gate): ${json(may)} (want true, false, false, false)`);

  // which dialog is open once a press has been answered: only the one that press belongs to closes (M22: any closes · M23: none does)
  const dialogs = [
    Dm.dialogAfterSettled("stop", "pause"), Dm.dialogAfterSettled("start", "start"), Dm.dialogAfterSettled("stop", "stop"), Dm.dialogAfterSettled(null, "start"),
    Dm.dialogAfterSettled("start", "resume"), Dm.dialogAfterSettled("stop", "copy"), Dm.dialogAfterSettled("start", "pause"),
  ];
  if (json(dialogs) !== json(["stop", null, null, null, "start", "stop", "start"])) wrong.push(`dialogAfterSettled: ${json(dialogs)} (want a Pause leaves the Stop dialog, a settled Start closes the Start dialog, a settled Stop closes the Stop dialog, and nothing open stays shut)`);

  // a control's state: its view's AND its own press — never another's
  const real = await h.campaign(`pv15${tag}r`, { path: PATHS.RUNNING, count: 12 });
  const realView = await h.view(real.id, h.GROWTH);
  const none = new Set<never>() as ReadonlySet<never>;
  const pausing = new Set<never>(["pause" as never]) as ReadonlySet<never>;
  const st = (act: string, pending: ReadonlySet<never>, mayAct = true) => Dm.controlState(realView, act as never, mayAct, pending);
  if (!(st("pause", pausing).enabled === false && st("stop", pausing).enabled === true && st("pause", none).enabled === true && st("stop", none, false).enabled === false)) {
    wrong.push("a control's state is not (the view's AND its own press in flight, never another's)");
  }

  // the reasons printed: a role's once for all five; the expected control's; any that is not the plain 'not in this state'
  const roleModel = Dm.reasonModel(synth("RUNNING", { controls: Object.fromEntries(ACTS.map((a) => [a, { enabled: false, reason: D.role }])) }), false);
  if (!(roleModel.lines.length === 1 && roleModel.lines[0].acts.length === 5 && roleModel.lines[0].text === D.role && roleModel.quiet.length === 0)) wrong.push(`a role that may only look must read ONE line for all five (${json(roleModel.lines)})`);
  const off = (reason: string): Control => ({ enabled: false, reason });
  const cases: Array<[string, CampaignLiveView, string[], string[]]> = [
    // [name, view, acts printed, acts only named to assistive technology]
    ["CONFIRMED", synth("CONFIRMED", { controls: { pause: off(D.pause), resume: off(D.resume) } }), [], ["pause", "resume"]],
    ["CONFIRMED with the switch off", synth("CONFIRMED", { controls: { start: off(D.startSwitchOff), pause: off(D.pause), resume: off(D.resume) } }), ["start"], ["pause", "resume"]],
    ["PAUSED with Resume refused", synth("PAUSED", { controls: { resume: off("Resume is refused: the credit is below its floor."), start: off(D.start), pause: off(D.pause) } }), ["resume"], ["start", "pause"]],
    ["RUNNING with a copy that cannot be made", synth("RUNNING", { controls: { start: off(D.start), resume: off(D.resume), copy: off(COPY.copyCantTravelSentence("none")) } }), ["copy"], ["start", "resume"]],
    ["CANCELLED", synth("CANCELLED", { controls: { start: off(D.start), pause: off(D.pause), resume: off(D.resume), stop: off(D.stop) } }), [], ["start", "pause", "resume", "stop"]],
  ];
  for (const [name, v, printed, quiet] of cases) {
    const model = Dm.reasonModel(v, true);
    const gotPrinted = model.lines.flatMap((l) => l.acts).sort().join();
    const gotQuiet = model.quiet.map((q) => q.act).sort().join();
    if (gotPrinted !== [...printed].sort().join() || gotQuiet !== [...quiet].sort().join()) wrong.push(`${name}: printed [${gotPrinted}] quiet [${gotQuiet}] (want [${[...printed].sort().join()}] and [${[...quiet].sort().join()}])`);
    // every disabled control resolves to an element that carries its reason — a printed line's or its own quiet one
    for (const act of ACTS) {
      const c = v.controls[act as "start"];
      if (c.enabled) continue;
      const id = Dm.reasonIdFor(model, act as never);
      const text = model.lines.find((l) => l.id === id)?.text ?? model.quiet.find((q) => q.id === id)?.text ?? null;
      if (id === undefined || text !== c.reason) wrong.push(`${name}/${act}: described by ${json(id)} carrying ${json(text)}, not its reason`);
    }
  }
  // equal reasons are said once
  const twice = Dm.reasonModel(synth("CONFIRMED", { controls: { start: off(D.startSwitchOff), copy: off(D.startSwitchOff) } }), true);
  if (!(twice.lines.length === 1 && twice.lines[0].acts.join() === "start,copy")) wrong.push(`two equal reasons are not said once (${json(twice.lines)})`);

  // every callout's condition
  const callouts = (v: CampaignLiveView, o: { mayAct: boolean; mode: string; stop: unknown; said?: string | null; refusal?: boolean; copyLink?: boolean }) =>
    Dm.calloutsFor({ view: v, mayAct: o.mayAct, mode: o.mode as never, stop: o.stop as never, said: o.said ?? null, refusal: o.refusal ?? false, copyLink: o.copyLink ?? false });
  const quietV = synth("RUNNING", { standing: { nobodyDriving: true, keepOpen: true } });
  const actorFirstPaint = callouts(quietV, { mayAct: true, mode: "drive", stop: null });
  const actorStopped = callouts(quietV, { mayAct: true, mode: "drive", stop: { kind: "out_of_date" } });
  const watcherSees = callouts(quietV, { mayAct: false, mode: "watch", stop: null });
  if (!(actorFirstPaint.nobody === false && actorFirstPaint.keepOpen === true && actorStopped.nobody === true && watcherSees.nobody === true)) wrong.push(`"Nobody is sending": an actor's first paint ${actorFirstPaint.nobody}, after its driver stopped ${actorStopped.nobody}, a watcher ${watcherSees.nobody} (want false, true, true)`);
  const shut = synth("RUNNING", { standing: { window: SHUT_WINDOW as never, switchOpen: true, switchClosesAt: "2026-10-08T11:00:00.000Z", keepOpen: true } });
  const driving = callouts(shut, { mayAct: true, mode: "drive", stop: null });
  const watching = callouts(shut, { mayAct: false, mode: "watch", stop: null });
  const stoppedDriver = callouts(shut, { mayAct: true, mode: "drive", stop: { kind: "role", sentence: "x" } });
  const windowWords = "Waiting for the send window — sending resumes at 08:00 EAT.";
  const closesWords = "Marketing SMS stay switched on until 14:00 EAT on 8 Oct 2026, then sending waits until the owner switches them on again.";
  if (!(driving.window === null && driving.switchCloses === null && watching.window === windowWords && watching.switchCloses === closesWords && stoppedDriver.window === windowWords && stoppedDriver.switchCloses === closesWords)) {
    wrong.push(`the closed window and the switch: a driver ${json([driving.window, driving.switchCloses])}, a watcher ${json([watching.window, watching.switchCloses])}, a stopped driver ${json([stoppedDriver.window, stoppedDriver.switchCloses])}`);
  }
  const openWindow = callouts(synth("RUNNING"), { mayAct: false, mode: "watch", stop: null });
  const pausedWatch = callouts(synth("PAUSED", { standing: { window: SHUT_WINDOW as never } }), { mayAct: false, mode: "watch", stop: null });
  const doneWatch = callouts(synth("DONE", { standing: { switchClosesAt: "2026-10-08T11:00:00.000Z" } }), { mayAct: false, mode: "off", stop: null });
  if (!(openWindow.window === null && pausedWatch.window === null && doneWatch.switchCloses === null)) wrong.push("the send window is said when it is open or for a campaign that is not RUNNING, or the switch's closing for a finished one");
  const staleWait = callouts(synth("RUNNING"), { mayAct: true, mode: "drive", stop: { kind: "out_of_date" }, said: "Waiting for the send window." });
  const liveWait = callouts(synth("RUNNING"), { mayAct: true, mode: "drive", stop: null, said: "Waiting for the send window." });
  if (!(staleWait.said === false && liveWait.said === true && staleWait.stop === true && liveWait.stop === false)) wrong.push(`a stopped driver's wait: ${staleWait.said}, a running one's ${liveWait.said}`);
  const switchedOff = callouts(synth("RUNNING", { standing: { switchOpen: false } }), { mayAct: true, mode: "drive", stop: null });
  const finished = callouts(synth("DONE", { standing: { switchOpen: false } }), { mayAct: true, mode: "off", stop: null });
  const both = callouts(synth("RUNNING"), { mayAct: true, mode: "drive", stop: null, refusal: true, copyLink: true });
  if (!(switchedOff.switchOff === true && finished.switchOff === false && both.refusal === true && both.copyLink === true)) wrong.push("the switch-off, refusal or copy-link callout's condition is wrong");

  // what a landed act does
  const plain = [
    COPY.LIVE_DONE.start, COPY.LIVE_DONE.pause, COPY.LIVE_DONE.pauseBeforeSending, COPY.LIVE_DONE.resume, COPY.LIVE_DONE.resumePreparing, COPY.LIVE_DONE.stop,
    COPY.LIVE_DONE.stopBeforeSending, COPY.copyDoneSentence("none"),
  ];
  const advice = [
    `${COPY.LIVE_DONE.pause} ${COPY.LIVE_NOT_RECORDED}`, COPY.copyDoneSentence("reached"), COPY.copyDoneSentence("hidden"), COPY.LIVE_CHANGED.stoppedAfterResume,
    COPY.LIVE_CHANGED.pausedAfterResume, COPY.LIVE_CHANGED.finishedAfterResume, `${COPY.LIVE_DONE.resume} ${COPY.LIVE_REQUEUE_FAILED}`, `${COPY.LIVE_DONE.resume} ${COPY.LIVE_REQUEUE_FAILED_HIDDEN}`,
  ];
  const ans = (message: string): LiveActAnswer => ({ ok: true, message, recorded: true, href: null, view: null }) as LiveActAnswer;
  const fades = plain.every((m) => { const t = Dm.toastFor(ans(m)); return t !== null && t.variant === "success" && t.durationMs === undefined && t.title === m; });
  const stays = advice.every((m) => { const t = Dm.toastFor(ans(m)); return t !== null && t.variant === "warning" && t.durationMs === 0 && t.title === m; });
  const refusalToast = Dm.toastFor({ ok: false, reason: "role", message: "no", view: null, href: null } as LiveActAnswer);
  if (!(fades && stays && refusalToast === null)) wrong.push(`toasts: the plain sentences fade ${fades}, a warning or advice stays ${stays}, a refusal is no toast ${refusalToast === null}`);
  const here = Dm.copyDestination("/x", "drive");
  const there = Dm.copyDestination("/x", "watch");
  const gone = Dm.copyDestination("/x", "off");
  if (!(json(here) === json({ kind: "link", href: "/x" }) && json(there) === json({ kind: "navigate", href: "/x" }) && json(gone) === json({ kind: "navigate", href: "/x" }) && Dm.copyDestination(null, "drive") === null && Dm.copyDestination("", "watch") === null)) {
    wrong.push(`where a copy goes: ${json([here, there, gone])}`);
  }

  // the live region: it says a CHANGE of status — never the mount, never a headline that moved with the status unchanged
  const view = (status: string, headline: string, stopSentence: string | null) => ({ status, headline, stopSentence }) as never;
  const m = mountHook(M.announce.useStatusAnnouncement, view("RUNNING", "Sending — 4 of 10 done.", null));
  await m.flush();
  const onMount = m.result();
  m.rerender(view("RUNNING", "Sending — 5 of 10 done.", null));
  await m.flush();
  const sameStatus = m.result();
  m.rerender(view("PAUSED", "Paused.", "Paused by Amina at 14:10 EAT."));
  await m.flush();
  const moved = m.result();
  m.rerender(view("PAUSED", "Paused.", "Paused by Amina at 14:10 EAT. (again)"));
  await m.flush();
  const unchanged = m.result();
  m.unmount();
  if (!(onMount === "" && sameStatus === "" && moved === "Paused. Paused by Amina at 14:10 EAT." && unchanged === moved)) wrong.push(`the live region said ${json([onMount, sameStatus, moved, unchanged])} (want nothing on mount, nothing for a headline that moved with the status, the headline when the status moved, and no repeat)`);

  // the components CALL these functions and decide none of this inline
  const calls = ["liveMay(", "controlState(", "reasonModel(", "reasonIdFor(", "calloutsFor(", "dialogAfterSettled(", "useLivePresses(", "useStatusAnnouncement(", "postLiveStep"].filter((t) => !S.client.includes(t));
  const ACTING = new RegExp("[^A-Za-z]acting[^A-Za-z]");
  const inline = ["standing.nobodyDriving", "standing.window", "standing.switchOpen", "standing.switchClosesAt", "standing.keepOpen", "durationMs", "useTransition", "isPending", "driver.ran"].filter((t) => S.client.includes(t));
  if (ACTING.test(S.client)) inline.push("acting");
  const statusRoles = S.client.split(`role=${DQ}status${DQ}`).length - 1;
  if (calls.length > 0 || inline.length > 0 || statusRoles !== 1) wrong.push(`the client: does not call [${calls.join(", ")}], decides inline [${inline.join(", ")}], role="status" written ${statusRoles} time(s) (want exactly one — the live region)`);
  // the Provider's glue: a settled press closes ITS OWN dialog, through the decision V15 just ran (M22: onSettled closes any · M23: onSettled does nothing)
  if (!S.client.includes("onSettled: (act) => setDialog((open) => dialogAfterSettled(open, act)),")) wrong.push("the Provider's onSettled does not close a settled press's own dialog through dialogAfterSettled");
  // the trail names the campaign, not its cmp_ id (M15), and the ghost's buttons keep the kit's tap size (M16)
  const crumb = S.page.includes('import { AdminCrumbLabel } from "@/components/admin/admin-crumbs";')
    && S.page.includes("<AdminCrumbLabel segment={load.view.id} label={load.view.name.trim() === " + DQ + DQ + " ? CAMPAIGNS_UNTITLED : load.view.name} />");
  const ghostTap = S.loading.includes('{BUTTON_W.map((w, i) => <SkBar key={i} className={`h-[var(--tap-min)] rounded-md ${w}`} />)}');
  if (!crumb || !ghostTap) wrong.push(`the page names the campaign in the trail ${crumb}; the ghost's buttons take the kit's --tap-min ${ghostTap}`);
  // `may` is wired: the driver and the presses get the server's decision AND the console's gate (liveMay), never the server's alone
  const PRESSES_MAY = new RegExp("useLivePresses[(][{][^}]*[ ]may,");
  if (!S.client.includes("useLiveDriver({ id: initial.id, mayAct: may,") || !PRESSES_MAY.test(S.client) || !S.client.includes("const may = liveMay(mayAct, shellMayAct);")) {
    wrong.push("the client does not hand the driver and the presses `may` = liveMay(the server's decision, the console's gate)");
  }
  return wrong;
}

/**
 * ⭐ THE CHECKER'S MINOR · EVERY CALLOUT OF THE CONTROLS CARD, DRAWN ALONE WITH THE REAL COMPONENT AND READ: a driver stop of each of
 * its seven kinds (the step-up page at both of its addresses, so nine drawings), a press's refusal and a copy's link. What each must
 * say, and the one way on that can work: a lapsed 2-step its step-up link and Try again; a sign-in that ended the SIGN-IN link
 * (never the step-up one) and Try again; every other stop a Reload and no retry. ⛔ A link that opens ANOTHER tab opens it with
 * `target=_blank` and `rel="noopener noreferrer"` — the page keeps its place, and the new tab gets no handle on it. Every alert
 * is `role=alert`; the copy's link is a note.
 */
function calloutChecks(P: PageImpl, h: PageHarness): string[] {
  const wrong: string[] = [];
  const count = (html: string, part: string): number => html.split(part).length - 1;
  const alerts = (html: string): number => count(html, ` role=${DQ}alert${DQ}`);
  const VERIFY = "/admin/totp-verify";
  const SETUP = "/admin/2fa/setup";
  const SIGN_IN = "/auth/admin?next=%2Fadmin%2Fcampaigns";
  /** A link that opens another tab: where it goes, what it says, and how it opens. */
  const newTabLink = (html: string, stamp: string, href: string, text: string): string | null => {
    const tag = tagAt(html, stamp);
    const said = textOfElement(html, stamp, "</a>");
    if (tag === null || attrOf(tag, "href") !== href || said !== text) return `its link ${json({ href: attrOf(tag, "href"), text: said })} (want ${json({ href, text })})`;
    if (attrOf(tag, "target") !== "_blank") return `its link opens ${json(attrOf(tag, "target"))}, not a new tab`;
    if (attrOf(tag, "rel") !== "noopener noreferrer") return `its link has rel ${json(attrOf(tag, "rel"))}, not "noopener noreferrer"`;
    return null;
  };
  const button = (html: string, stamp: string, text: string): boolean => html.includes(stamp) && textOfElement(html, stamp, "</button>") === text;

  // ── every driver stop ──
  type Stop = { kind: string; sentence?: string; href?: string };
  const stops: Array<[string, Stop, string]> = [
    ["out_of_date", { kind: "out_of_date" }, COPY.LIVE_OUT_OF_DATE],
    ["second_factor (lapsed)", { kind: "second_factor", sentence: "Your 2-step sign-in has lapsed.", href: VERIFY }, "Your 2-step sign-in has lapsed."],
    ["second_factor (never set up)", { kind: "second_factor", sentence: "Set up 2-step sign-in first.", href: SETUP }, "Set up 2-step sign-in first."],
    ["signed_out", { kind: "signed_out", sentence: COPY.LIVE_SIGNED_OUT, href: SIGN_IN }, COPY.LIVE_SIGNED_OUT],
    ["role", { kind: "role", sentence: "Your role can no longer act on campaigns." }, "Your role can no longer act on campaigns."],
    ["view_refused", { kind: "view_refused", sentence: "Your role can no longer view campaigns." }, "Your role can no longer view campaigns."],
    ["gone", { kind: "gone", sentence: COPY.LIVE_MISSING }, COPY.LIVE_MISSING],
    ["unfinished", { kind: "unfinished", sentence: COPY.LIVE_STEP_UNFINISHED }, COPY.LIVE_STEP_UNFINISHED],
  ];
  for (const [name, stop, sentence] of stops) {
    const html = P.callouts.stop(stop as never);
    h.see(html);
    const problems: string[] = [];
    if (alerts(html) !== 1) problems.push(`${alerts(html)} element(s) marked role=alert (want exactly one)`);
    if (textOfElement(html, `data-live-stopped=${DQ}${stop.kind}${DQ}`) !== sentence) problems.push(`its sentence is ${json(textOfElement(html, "data-live-stopped"))}`);
    const asksFactor = stop.kind === "second_factor" || stop.kind === "signed_out";
    if (asksFactor) {
      const bad = newTabLink(html, "data-live-factor-link", stop.href ?? "", stop.kind === "signed_out" ? COPY.LIVE_SIGN_IN_LINK : COPY.LIVE_FACTOR_LINK);
      if (bad !== null) problems.push(bad);
      if (!button(html, "data-live-try-again", COPY.LIVE_TRY_AGAIN)) problems.push("no Try again");
      if (html.includes("data-live-reload")) problems.push("a Reload beside a link that can work");
    } else {
      if (!button(html, "data-live-reload", COPY.LIVE_RELOAD)) problems.push("no Reload");
      if (html.includes("data-live-factor-link") || html.includes("data-live-try-again")) problems.push("a retry that cannot work");
    }
    if (problems.length > 0) wrong.push(`the stop ${name}: ${problems.join("; ")}`);
  }

  // ── a press's refusal ──
  const refusals: Array<[string, { act: string; reason: string; message: string; href: string | null }]> = [
    ["a refusal with no way on", { act: "start", reason: "switch_closed", message: "Marketing SMS are switched off.", href: null }],
    ["a lapsed 2-step", { act: "pause", reason: "second_factor", message: "Your 2-step sign-in has lapsed.", href: VERIFY }],
    ["a 2-step never set up", { act: "stop", reason: "second_factor", message: "Set up 2-step sign-in first.", href: SETUP }],
    ["an act that threw", { act: "resume", reason: "unfinished", message: COPY.LIVE_ACT_UNFINISHED_NO_VIEW, href: null }],
    ["a copy refused for the save budget", { act: "copy", reason: "rate_limited", message: COPY.copyRateLimitedSentence(120), href: null }],
  ];
  for (const [name, r] of refusals) {
    const html = P.callouts.refusal(r as never);
    h.see(html);
    const problems: string[] = [];
    if (alerts(html) !== 1) problems.push(`${alerts(html)} element(s) marked role=alert (want exactly one)`);
    const tag = tagAt(html, "data-live-refusal=");
    if (attrOf(tag, "data-live-refusal") !== r.act || attrOf(tag, "data-live-refusal-reason") !== r.reason || textOfElement(html, "data-live-refusal=") !== r.message) problems.push(`its stamp or sentence ${json([attrOf(tag, "data-live-refusal"), attrOf(tag, "data-live-refusal-reason"), textOfElement(html, "data-live-refusal=")])}`);
    if (r.reason === "second_factor") {
      const bad = newTabLink(html, "data-live-refusal-link", r.href ?? "", COPY.LIVE_FACTOR_LINK);
      if (bad !== null) problems.push(bad);
    } else if (html.includes("data-live-refusal-link")) problems.push("a step-up link on a refusal that is not the second factor");
    if (r.reason === "unfinished") {
      if (!button(html, "data-live-reload", COPY.LIVE_RELOAD)) problems.push("no Reload");
    } else if (html.includes("data-live-reload")) problems.push("a Reload on a refusal that is not unfinished");
    if (problems.length > 0) wrong.push(`the refusal (${name}): ${problems.join("; ")}`);
  }

  // ── a copy's link ──
  const href = "/admin/campaigns/new?draft=cmp_new";
  const copy = P.callouts.copyLink(href);
  h.see(copy);
  const copyProblems: string[] = [];
  if (textOfElement(copy, "data-live-copy-elsewhere") !== COPY.LIVE_COPY_ELSEWHERE) copyProblems.push(`its sentence is ${json(textOfElement(copy, "data-live-copy-elsewhere"))}`);
  const bad = newTabLink(copy, "data-live-copy-link", href, COPY.LIVE_COPY_OPEN_DRAFT);
  if (bad !== null) copyProblems.push(bad);
  if (alerts(copy) !== 0 || count(copy, ` role=${DQ}note${DQ}`) !== 1) copyProblems.push(`it is ${alerts(copy)} alert(s) and ${count(copy, ` role=${DQ}note${DQ}`)} note(s) (want a note — a copy was made, nothing is wrong)`);
  if (copyProblems.length > 0) wrong.push(`the copy's link: ${copyProblems.join("; ")}`);
  return wrong;
}

/** The real client's markup, for the decisions that reach the page (rendered with the real components and the real decisions). */
async function markupChecks(P: PageImpl, h: PageHarness): Promise<string[]> {
  const wrong: string[] = [];
  const Dm = P.mods.decide;
  const { READER, GROWTH, WATCHER } = h;
  const viewers: Array<[string, LiveViewer]> = [["reader", READER], ["growth", GROWTH], ["watcher", WATCHER]];

  // every disabled control is described by an element that is in the markup and carries its reason; an enabled one by none
  let described = 0;
  for (const status of Object.keys(PATHS).filter((s) => s !== "DRAFT")) {
    const cmp = await h.campaign(`pv15m${status.toLowerCase()}`, { path: PATHS[status], count: 12 });
    for (const [who, v] of viewers) {
      const vw = await h.view(cmp.id, v);
      const html = P.render(vw, { mayAct: v.mayAct });
      h.see(html);
      const model = Dm.reasonModel(vw, v.mayAct);
      for (const a of ACTS) {
        const btn = tagAt(html, `data-live-control=${DQ}${a}${DQ}`);
        if (btn === null) { wrong.push(`${status}/${who}/${a}: not drawn`); continue; }
        const by = attrOf(btn, "aria-describedby");
        if (attrOf(btn, "disabled") !== null) {
          described++;
          const reason = vw.controls[a as "start"].reason;
          const el = by === null ? null : textOfElement(html, ` id=${DQ}${by}${DQ}`, "</");
          if (by === null || reason === null || el === null || !el.includes(reason)) wrong.push(`${status}/${who}/${a}: disabled, described by ${json(by)} carrying ${json(el)} (its reason is ${json(reason)})`);
          if (by !== null && by !== Dm.reasonIdFor(model, a as never)) wrong.push(`${status}/${who}/${a}: the markup describes it by ${by}, the decision by ${Dm.reasonIdFor(model, a as never)}`);
        } else if (by !== null) wrong.push(`${status}/${who}/${a}: enabled but described`);
      }
    }
  }
  if (described < 55) wrong.push(`only ${described} disabled controls were checked (the population shrank)`);

  wrong.push(...calloutChecks(P, h));

  // MINORS 4 and 5, on the page: what a first paint says to an actor and to a watcher, in its own words
  const prep = await h.campaign("pv15mprep", { path: PATHS.PREPARING, count: 12 });
  const run = await h.campaign("pv15mrun", { path: PATHS.RUNNING, count: 12 });
  const last = "2026-10-08T10:20:00.000Z";
  const withStanding = (v: CampaignLiveView, s: Partial<Standing>): CampaignLiveView => ({ ...v, standing: { ...v.standing, ...s } });
  const prepNobody = withStanding(await h.view(prep.id, WATCHER), { nobodyDriving: true, lastStepAt: last });
  const runNobody = withStanding(await h.view(run.id, WATCHER), { nobodyDriving: true, lastStepAt: last });
  const watchPrep = P.render(prepNobody, { mayAct: false });
  const watchRun = P.render(runNobody, { mayAct: false });
  const actorRun = P.render(withStanding(await h.view(run.id, GROWTH), { nobodyDriving: true, lastStepAt: last }), { mayAct: true });
  h.see(watchPrep); h.see(watchRun); h.see(actorRun);
  const saidPrep = textOfElement(watchPrep, "data-live-nobody");
  const saidRun = textOfElement(watchRun, "data-live-nobody");
  if (!(saidPrep !== null && saidPrep.includes("Nobody is preparing this campaign's list right now") && saidPrep.includes("(Last step 13:20 EAT.)")
    && saidRun !== null && saidRun.includes("Nobody is sending this campaign right now"))) wrong.push(`a watcher's "nobody" lines: PREPARING ${json(saidPrep)}, RUNNING ${json(saidRun)}`);
  if (actorRun.includes("data-live-nobody") || !actorRun.includes("data-live-keep-open")) wrong.push("an actor's first paint says 'nobody is sending' (or lacks 'keep this page open')");
  const closed = { window: SHUT_WINDOW as never, switchOpen: true, switchClosesAt: "2026-10-08T11:00:00.000Z" };
  const watchShut = P.render(withStanding(await h.view(run.id, WATCHER), closed), { mayAct: false });
  const actorShut = P.render(withStanding(await h.view(run.id, GROWTH), closed), { mayAct: true });
  h.see(watchShut); h.see(actorShut);
  const windowLine = textOfElement(watchShut, "data-live-window");
  const closesLine = textOfElement(watchShut, "data-live-switch-closes");
  if (!(windowLine === "Waiting for the send window — sending resumes at 08:00 EAT." && closesLine !== null && closesLine.startsWith("Marketing SMS stay switched on until 14:00 EAT on 8 Oct 2026"))) wrong.push(`a watcher's closed-window lines: ${json([windowLine, closesLine])}`);
  if (actorShut.includes("data-live-window") || actorShut.includes("data-live-switch-closes")) wrong.push("a driving actor's first paint carries the closed window or the switch's closing time");

  // the page's ONE live region: always mounted, polite, atomic; and no other element is marked role=status
  const regions = watchRun.split("data-live-announce").length - 1;
  const regionTag = tagAt(watchRun, "data-live-announce");
  const statusRoles = watchRun.split(` role=${DQ}status${DQ}`).length - 1;
  const regionOk = regions === 1 && regionTag !== null && attrOf(regionTag, "role") === "status" && attrOf(regionTag, "aria-live") === "polite" && attrOf(regionTag, "aria-atomic") === "true" && statusRoles === 1;
  if (!regionOk) wrong.push(`the live region: ${regions} in the markup, role ${attrOf(regionTag, "role")}, aria-live ${attrOf(regionTag, "aria-live")}, atomic ${attrOf(regionTag, "aria-atomic")}, role="status" written ${statusRoles} time(s)`);
  if (textOfElement(watchRun, "data-live-announce", "</div>") !== "") wrong.push("the live region says something on the first paint");
  return wrong;
}

/* ══ V16 · THE DEV SEED ═════════════════════════════════════════════════════════════════════════════════════════════ */

/** Every V16 check, against one seed module and the drive's source. */
async function seedChecks(M: Mods, S: PageSources, h: PageHarness): Promise<string[]> {
  const wrong: string[] = [];
  const call = async (q: string) => {
    const r = await M.seed.POST(new Request(`http://localhost/api/dev-test/marketing-live-seed?${q}`, { method: "POST" }));
    return { status: r.status, body: await r.json() as Record<string, unknown> };
  };
  const before = { ...ADMISSION.getAdmissionLimits() };
  const settle = async (): Promise<typeof before> => {
    let now = { ...ADMISSION.getAdmissionLimits() };
    for (let i = 0; i < 80 && json(now) !== json(before); i++) { await new Promise<void>((r) => setTimeout(r, 25)); now = { ...ADMISSION.getAdmissionLimits() }; }
    return now;
  };
  try {
    // ?busy= is re-entrant: two holds, then ?busy=0, put the limits back exactly
    await call("busy=5000");
    const during1 = ADMISSION.getAdmissionLimits().maxInFlight;
    await call("busy=5000");
    const during2 = ADMISSION.getAdmissionLimits().maxInFlight;
    await call("busy=0");
    const after = await settle();
    if (!(during1 === 1 && during2 === 1 && json(after) === json(before) && before.maxInFlight !== 1)) wrong.push(`a double hold: the gate held ${during1}/${during2}, then restored ${json(after)} (want ${json(before)})`);
    // the campaign makers refuse unless the rail is the console stub
    const rail = process.env.SMS_PROVIDER;
    const made = () => (globalThis as unknown as { __50PICK_STORE?: { smsCampaigns?: Map<string, unknown> } }).__50PICK_STORE?.smsCampaigns?.size ?? 0;
    try {
      process.env.SMS_PROVIDER = "blackball";
      const n0 = made();
      const refusedRun = await call(`run=r16x${h.run}`);
      const refusedStages = await call(`stages=r16x${h.run}`);
      process.env.SMS_PROVIDER = "blackbal";
      const refusedTypo = await call(`run=r16y${h.run}`);
      const refusedAll = [refusedRun, refusedStages, refusedTypo].every((r) => r.status === 409 && r.body.ok === false);
      if (!(refusedAll && made() === n0)) wrong.push(`on a real rail: ${json([refusedRun.status, refusedStages.status, refusedTypo.status])}, campaigns made ${made() - n0} (want 409 x3 and none)`);
    } finally {
      if (rail === undefined) delete process.env.SMS_PROVIDER; else process.env.SMS_PROVIDER = rail;
    }
    const stub = await call(`run=r16z${h.run}`);
    if (!(stub.status === 200 && stub.body.ok === true && typeof stub.body.campaignId === "string")) wrong.push(`on the console stub ?run= answered ${stub.status} ${json(stub.body).slice(0, 100)}`);
    // every sentence the drive asserts against is served
    const words = ((await call("words=1")).body.words ?? {}) as Record<string, unknown>;
    const paths = [...new Set(Array.from(S.drive.matchAll(/[^A-Za-z0-9_.]W[.]([A-Za-z0-9_]+(?:[.][A-Za-z0-9_]+)*)/g), (x) => x[1]))].filter((p) => !p.endsWith(".slice"));
    const missing = paths.filter((p) => {
      let node: unknown = words;
      for (const part of p.split(".")) {
        if (node === null || typeof node !== "object" || !(part in (node as Record<string, unknown>))) return true;
        node = (node as Record<string, unknown>)[part];
      }
      return node === undefined || node === null || node === "";
    });
    if (!(paths.length >= 40 && missing.length === 0)) wrong.push(`the drive asks ?words= for ${paths.length} path(s); not served: [${missing.join(", ")}]`);
  } finally {
    // whatever happened above, the rest of the suite runs on the gate it started with
    await settle();
    ADMISSION.setAdmissionLimits(before);
  }
  return wrong;
}

/* ══ V17 · THE COPY SPENDS THE OFFICER'S SAVE BUDGET ════════════════════════════════════════════════════════════════ */

type ActionsFx = { ran: string[]; budget: { allowed: boolean; retryAfterSec: number }; guard: { ok: boolean } };

/** `actions.ts` compiled with stand-ins for everything it reaches: the guards (they answer who they were told to), the save budget
 *  (it records its ask and answers as told), the services and the runner (they record what they were handed). Every call lands in
 *  `ran`, in order — so "after the guard and before the service" is a fact about a list, not about a layout. */
function compiledActions(src: string, fx: ActionsFx): Record<string, (campaignId: string) => Promise<Record<string, unknown>>> {
  const guard = async (_domain: string, action: string) => {
    fx.ran.push(`guard:${action}`);
    return fx.guard.ok ? { ok: true as const, userId: "usr_v17", sessionId: "s_v17" } : { ok: false as const, error: "no" };
  };
  const service = (name: string) => async (id: string) => { fx.ran.push(`service:${name}:${id}`); return { ok: true as const, message: name, recorded: true }; };
  return evalModule(src, {
    "@/lib/server/rbac-guard": { softCheckStaff: guard, softRequireStaff: guard, softViewStaff: guard },
    "@/lib/server/rate-limit": {
      rateCheckAsync: async (user: string, bucket: string) => {
        fx.ran.push(`budget:${user}:${bucket}`);
        return fx.budget.allowed ? { allowed: true, remaining: 29, retryAfterSec: 0 } : { allowed: false, remaining: 0, retryAfterSec: fx.budget.retryAfterSec };
      },
    },
    "@/lib/server/marketing/campaign-control": {
      copyCampaign: service("copy"), pauseCampaign: service("pause"), resumeCampaign: service("resume"), startCampaign: service("start"), stopCampaign: service("stop"),
    },
    "@/lib/server/marketing/campaign-live": { campaignLiveView: async () => null },
    "./live-viewer": { liveViewerFor: async () => ({ userId: "usr_v17", mayAct: true, reads: true, money: true }) },
    "./live-run": {
      actRefused: RUN.actRefused, actRefusedBy: RUN.actRefusedBy, refusedBy: RUN.refusedBy, resumeWithRetry: RUN.resumeWithRetry,
      runAct: async (id: string, _user: string, tag: string) => { fx.ran.push(`runAct:${tag}:${id}`); return { ok: true, message: tag, recorded: true, href: null, view: null }; },
    },
    "./live-copy": COPY,
  }) as unknown as Record<string, (campaignId: string) => Promise<Record<string, unknown>>>;
}

/** Every V17 check, against one source of `actions.ts`. Returns what went wrong, in words. */
async function copyBudgetChecks(src: string): Promise<string[]> {
  const wrong: string[] = [];
  const fresh = (over: Partial<ActionsFx> = {}): ActionsFx => ({ ran: [], budget: { allowed: true, retryAfterSec: 0 }, guard: { ok: true }, ...over });
  const BUCKET = "marketing.campaignSave";
  // 1 · the budget allows: the guard, then the budget (THIS officer, the real rule), then the service — in that order
  const a = fresh();
  const allowed = await compiledActions(src, a).copyCampaignAction("cmp_x");
  const wanted = ["guard:marketing.campaign.copy", `budget:usr_v17:${BUCKET}`, "runAct:copy:cmp_x"];
  if (json(a.ran) !== json(wanted) || allowed.ok !== true) wrong.push(`a copy with budget: ${json(a.ran)} (want ${json(wanted)}), answer ${json(allowed)}`);
  // …on a rule the rate limiter KNOWS: a bucket it does not know fails OPEN — every copy allowed, whatever the officer has spent
  if (!(BUCKET in RATELIMIT.RATE_RULES)) wrong.push(`${BUCKET} is no rule of the rate limiter (it would let every copy through)`);
  // 2 · the budget spent: the rate-limited refusal in its sentence, and the service is never asked
  const b = fresh({ budget: { allowed: false, retryAfterSec: 130 } });
  const refused = await compiledActions(src, b).copyCampaignAction("cmp_x");
  if (!(json(b.ran) === json([wanted[0], wanted[1]]) && refused.ok === false && refused.reason === "rate_limited" && refused.message === COPY.copyRateLimitedSentence(130) && refused.view === null && refused.href === null)) {
    wrong.push(`a copy with the budget spent: ${json(b.ran)} (want the guard and the budget only), answer ${json(refused)}`);
  }
  // 3 · the guard comes first: an officer it refuses spends nothing
  const c = fresh({ guard: { ok: false } });
  const barred = await compiledActions(src, c).copyCampaignAction("cmp_x");
  if (!(json(c.ran) === json([wanted[0]]) && barred.ok === false && barred.reason === "role")) wrong.push(`a copy by a refused officer: ${json(c.ran)} (want the guard alone), answer ${json(barred)}`);
  // 4 · no other press, and not the poll, spends the save budget
  for (const name of ["startCampaignAction", "pauseCampaignAction", "resumeCampaignAction", "stopCampaignAction", "campaignViewAction"]) {
    const other = fresh();
    await compiledActions(src, other)[name]("cmp_x");
    if (other.ran.some((x) => x.startsWith("budget:"))) wrong.push(`${name} spends the save budget (${json(other.ran)})`);
  }
  return wrong;
}

/* ══ THE CLAIMS ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

export async function liveClaims(impl: PageImpl, h: PageHarness): Promise<void> {
  const L = LIVE_LABELS;
  const P = impl;
  const S = P.sources;
  const verdict = (wrong: string[], control: string[], ok: string): [boolean, string] => {
    const green = wrong.length === 0 && control.length === 0;
    return [green, green ? ok : `${wrong.join(" | ")}${control.length > 0 ? ` · CONTROL (the compiled real source) failed: ${control.join(" | ")}` : ""}`];
  };

  /* ── V12 · the step door ── */
  await h.claim(L.v12, async () => {
    const fx = await doorFixture(h);
    try {
      await RBAC.setRoleGrant("AUDITOR", "growth", true, false, fx.ids.adm);
      const wrong = await doorChecks(P.mods, S, fx, h);
      const control = await doorChecks(controlMods(), REAL_SOURCES, fx, h);
      return verdict(wrong, control, "POST only · never cross-site · guard first, nothing read on a refusal · the stored role · lapsed and signed-out in words · the service's own answer, role-shaped · a throw typed · frozen deps · the route no-store with its body untouched");
    } finally {
      await RBAC.resetRoleGrantsToDefaults();
    }
  });

  /* ── V13 · the driver's hook, executed ── */
  await h.claim(L.v13, async () => {
    const wrong = await guarded(() => driverScenarios(P.mods.driver));
    const control = await guarded(() => driverScenarios(controlMods().driver));
    return verdict(wrong, control, "the cadence · the double-run's one step · a page that left (no call, no state, no timer) · a watcher · a flip · Try again · refresh · the mode kept");
  });

  /* ── V14 · the presses, executed ── */
  await h.claim(L.v14, async () => {
    // (the one throw on purpose: the page's own toast setter breaking, in the scenario that holds no control is left pending)
    const wrong = await guarded(() => pressScenarios(P.mods.presses), ["the toast is broken"]);
    const control = await guarded(() => pressScenarios(controlMods().presses), ["the toast is broken"]);
    return verdict(wrong, control, "no double press · per-control pending · a viewer who may not act · toasts fade or stay · a refusal until the next press · an act that threw · a copy never takes a driving page away · the latest mode · a setter that throws");
  });

  /* ── V15 · what the page says and when ── */
  await h.claim(L.v15, async () => {
    const wrong = [...await decisionChecks(P.mods, S, h, "a"), ...await markupChecks(P, h)];
    const control = await decisionChecks(controlMods(), REAL_SOURCES, h, "c");
    return verdict(wrong, control, "liveMay · a control's own pending · the reasons printed and every disabled control described · every callout's condition · toasts that fade and stay · a copy's destination · one live region saying a change — and the components call them");
  });

  /* ── V16 · the dev seed ── */
  await h.claim(L.v16, async () => {
    const wrong = await seedChecks(P.mods, S, h);
    const control = await seedChecks(controlMods(), REAL_SOURCES, h);
    return verdict(wrong, control, "?busy= re-entrant · the rail guard on ?run= and ?stages= · every sentence path the drive asks is served");
  });

  /* ── V17 · the copy spends the officer's save budget ── */
  await h.claim(L.v17, async () => {
    const wrong = await copyBudgetChecks(S.actions);
    const control = await copyBudgetChecks(REAL_SOURCES.actions);
    return verdict(wrong, control, "the budget asked once, for this officer, on a real rule, after the guard and before the service · refused with copyRateLimitedSentence and nothing run · not asked when the guard refuses · no other press and not the poll spends it");
  });
}

/* ══ THE PLANTS ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

export type LivePlant = { name: string; expect: string[]; impl: () => { page: PageImpl } };

/** Page-library plants that ALSO turn a live claim red, by the plant's name prefix: the live claims EXECUTE the page those plants
 *  break (the library cannot name a live label — this one imports it). */
const ALSO_FAILS: ReadonlyArray<readonly [string, readonly string[]]> = [
  // the rendered row loses a disabled Stop → V15's markup check finds the control gone
  ["R-V4b ", [LIVE_LABELS.v15]],
];
export const alsoFails = (name: string): string[] => ALSO_FAILS.filter(([prefix]) => name.startsWith(prefix)).flatMap(([, labels]) => [...labels]);

type Kind = "driver" | "presses" | "announce" | "decide" | "door" | "route" | "seed";
type Edit = readonly [string, string];

/** A page whose `kind` file has the edits written in: the module compiled from that source, every claim that scans the file
 *  handed the same source, and every module that imports it rebuilt on top of it. */
function planted(kind: Kind, edits: readonly Edit[]): { page: PageImpl } {
  const base = REAL_PAGE;
  const S = REAL_SOURCES;
  let src = S[kind];
  for (const [from, to] of edits) src = plantIn(src, from, to);
  const mods = { ...base.mods };
  const page: PageImpl = { ...base, sources: { ...S, [kind]: src }, mods };
  switch (kind) {
    case "driver": {
      const m = compiledDriver(src);
      mods.driver = m;
      page.loop = m.runLiveLoop; page.gap = m.stepGap; page.mode = m.driverMode; page.postStep = m.postLiveStep;
      break;
    }
    case "decide": {
      const m = compiledDecide(src);
      mods.decide = m;
      mods.presses = compiledPresses(S.presses, m);
      mods.announce = compiledAnnounce(S.announce, m);
      break;
    }
    case "presses": mods.presses = compiledPresses(src, base.mods.decide); break;
    case "announce": mods.announce = compiledAnnounce(src, base.mods.decide); break;
    case "door": {
      const m = compiledDoor(src);
      mods.door = m;
      mods.route = compiledRoute(S.route, m);
      break;
    }
    case "route": mods.route = compiledRoute(src, base.mods.door); break;
    case "seed": mods.seed = compiledSeed(src); break;
  }
  return { page };
}

export function livePlants(): LivePlant[] {
  const L = LIVE_LABELS;
  const V6 = PAGE_LABELS.v6;
  const edit = (kind: Kind, ...edits: Edit[]) => () => planted(kind, edits);
  const clientEdit = (from: string, to: string) => () => ({ page: { ...REAL_PAGE, sources: { ...REAL_SOURCES, client: plantIn(REAL_SOURCES.client, from, to) } } });
  /** A page whose `file` source has one edit written in (a file only SCANNED by the claims, not compiled). */
  const sourceEdit = (file: "page" | "loading" | "actions", from: string, to: string) => () =>
    ({ page: { ...REAL_PAGE, sources: { ...REAL_SOURCES, [file]: plantIn(REAL_SOURCES[file], from, to) } } });
  /** The markup with one element cut out — from the start of the tag holding `stamp` to the end of its closing tag. */
  const dropElement = (html: string, stamp: string, close: string): string => {
    const tag = tagAt(html, stamp);
    if (tag === null) throw new Error(`plant anchor not found: ${stamp}`);
    const from = html.indexOf(tag);
    return html.slice(0, from) + html.slice(html.indexOf(close, from) + close.length);
  };
  /** The markup without a piece of it (an attribute, a role). */
  const without = (html: string, part: string): string => {
    if (!html.includes(part)) throw new Error(`plant anchor not found: ${part}`);
    return html.split(part).join("");
  };
  /** A page whose callouts are the real components' markup with one defect written in. */
  const withCallouts = (over: Partial<PageImpl["callouts"]>) => () => ({ page: { ...REAL_PAGE, callouts: { ...REAL_PAGE.callouts, ...over } } });
  const real = REAL_PAGE.callouts;
  const FINALLY = ["      } finally {", "        inFlight.current.delete(act);", "        setPending(new Set(inFlight.current));", "      }"].join(NL);
  const NO_FINALLY = ["      } catch (err) { throw err; }", "      inFlight.current.delete(act);", "      setPending(new Set(inFlight.current));"].join(NL);
  return [
    /* ── V12 · the door ── */
    { name: "R-V12 · the door answers a GET — a link anyone can make an officer's browser follow starts a step", expect: [L.v12],
      impl: edit("door", ['if (req.method !== "POST") return { status: 405, body: null, allow: "POST" };', "void 0;"]) },
    { name: "R-V12b · a cross-site POST is let through — another site's page steps a campaign in the officer's name", expect: [L.v12],
      impl: edit("door", ["if (!sameOriginRequest(req.secFetchSite)) return { status: 403, body: null };", "void sameOriginRequest;"]) },
    { name: "R-V12c · the service is asked before the guard — a refused request still runs a group", expect: [L.v12],
      impl: edit("door", ['const id = typeof req.campaignId === "string" ? req.campaignId : "";',
        `const id = typeof req.campaignId === "string" ? req.campaignId : "";${NL}  await deps.step(id, { userId: "usr_x", mayAct: true, reads: false, money: false } as never);`]) },
    { name: "R-V12d · the viewer is built from the browser's word, not the stored role — a GROWTH officer is handed the money", expect: [L.v12],
      impl: edit("door", ["const viewer = await deps.viewer(g.userId);", "const viewer = { userId: g.userId, mayAct: true, reads: true, money: true };"]) },
    { name: "R-V12e · a signed-out visitor is redirected, not told — the guard's redirect escapes the door", expect: [L.v12],
      impl: edit("door", ["if (isRedirect(err)) return {", `if (isRedirect(err)) throw err;${NL}    if (false) return {`]) },
    { name: "R-V12e2 · the sign-in way back carries the campaign's id — the record's id in a URL the officer may screenshot (ruling 551(a))", expect: [L.v12],
      impl: edit("door", ["encodeURIComponent(adminNextDest(campaignDetailHref(id)))", "encodeURIComponent(campaignDetailHref(id))"]) },
    { name: "R-V12f · a throw in the guard escapes the door — a 500 page, not a typed answer", expect: [L.v12],
      impl: edit("door", ["deps.log(err);", "throw err;"]) },
    { name: "R-V12f2 · a guard that failed says a group may have gone out — nothing was asked of the campaign, so it is untrue", expect: [L.v12],
      impl: edit("door", ['reason: "unfinished", error: LIVE_STEP_GUARD_FAILED }', 'reason: "unfinished", error: LIVE_STEP_UNFINISHED }']) },
    { name: "R-V12g · a throw in the step escapes the door — a group may have gone out and the driver is told nothing", expect: [L.v12],
      impl: edit("door", [`} catch (err) {${NL}    deps.log(err);`, `} catch (err) {${NL}    throw err;${NL}    deps.log(err);`]) },
    { name: "R-V12h · the answer is changed on its way out — not the service's own", expect: [L.v12],
      impl: edit("door", ["if (r.ok) return { status: 200, body: r };", `if (r.ok) return { status: 200, body: { ...r, said: r.said ?? ${DQ}${DQ} } };`]) },
    { name: "R-V12i · production's guard is not the guard — a stand-in that answers 'ok' sits in the door's dependencies", expect: [L.v12],
      impl: edit("door", ["guard: softCheckStaff,", 'guard: async () => ({ ok: true as const, userId: "usr_x", sessionId: "s_x" }),']) },
    { name: "R-V12n · the 404 loses its words — a body the driver's client does not know, so a missing campaign reads 'out of date'", expect: [L.v12],
      impl: edit("door", ['body: { ok: false, reason: "not_found", error: r.error || LIVE_MISSING }', 'body: { ok: false, reason: "not_found" } as never']) },
    { name: "R-V12j · the route reads the body — the browser says something about who is acting", expect: [L.v12],
      impl: edit("route", ["const { id } = await params;", `const { id } = await params;${NL}  void (await req.text());`]) },
    { name: "R-V12k · the route answers without no-store — a proxy may keep an officer's answer", expect: [L.v12],
      impl: edit("route", ['res.headers.set("Cache-Control", "private, no-store, max-age=0");', 'res.headers.set("Cache-Control", "private, max-age=60");']) },
    { name: "R-V12l · the route grows a GET — the step is a link", expect: [L.v12],
      impl: edit("route", ["export async function POST(", `export async function GET() { return new Response(null); }${NL}export async function POST(`]) },
    { name: "R-V12m · the route forgets Allow — a 405 that does not name POST", expect: [L.v12],
      impl: edit("route", ['if (door.allow !== undefined) res.headers.set("Allow", door.allow);', "void 0;"]) },
    /* ── V13 · the driver's hook ── */
    { name: "R-V13 · the loop never sees that its page left — the cleanup does not cancel it (a step after unmount)", expect: [L.v13],
      impl: edit("driver", ["cancelled: () => !live,", "cancelled: () => false,"]) },
    { name: "R-V13b · the cleanup does not wake a sleeping loop — a timer is left behind by a page that left", expect: [L.v13],
      impl: edit("driver", ["for (const wake of wakers) wake();", "void wakers;"]) },
    { name: "R-V13i · the cleanup never says the page left — the loop wakes and carries on stepping after the page is gone", expect: [L.v13],
      impl: edit("driver", ["    live = false;", "    void 0;"]) },
    { name: "R-V13j · the cleanup leaves the loop's first tick scheduled — a page that left before it starts a loop for nobody", expect: [L.v13],
      impl: edit("driver", ["clearTimeout(starter);", "void starter;"]) },
    { name: "R-V13c · the loop starts in the effect, not on a tick — React's development double-run makes two steps", expect: [L.v13],
      impl: edit("driver", ["const starter = setTimeout(() => {", "const starter = ((run: () => void) => { run(); return 0 as unknown as ReturnType<typeof setTimeout>; })(() => {"]) },
    { name: "R-V13d · the loop is re-keyed on every status — PREPARING → RUNNING restarts it and skips the gap", expect: [L.v13, V6],
      impl: edit("driver", ["[id, mode, mayAct, step, poll, attempt, stop]", "[id, mode, mayAct, step, poll, attempt, stop, view.status]"]) },
    { name: "R-V13e · the reaper runs on every start — a pause is followed by a step", expect: [L.v13, V6],
      impl: edit("driver", ["const reap = mayAct && fresh.current && reapsOnMount(statusRef.current);", "const reap = mayAct && reapsOnMount(statusRef.current);"]) },
    { name: "R-V13f · Try again does not start the driver — a stopped page stays stopped", expect: [L.v13, V6],
      impl: edit("driver", ["const retry = useCallback(() => { fresh.current = true; setStop(null); setAttempt((n) => n + 1); }, []);", "const retry = useCallback(() => { fresh.current = true; }, []);"]) },
    { name: "R-V13g · refresh waits a full gap — an act's answer with no campaign is read ten seconds late", expect: [L.v13],
      impl: edit("driver", ["const refresh = useCallback(() => { pollNow.current = true; setAttempt((n) => n + 1); }, []);", "const refresh = useCallback(() => { setAttempt((n) => n + 1); }, []);"]) },
    { name: "R-V13h · a watcher is driven — the page steps for a role that may not act", expect: [L.v13, V6],
      impl: edit("driver", ['return mayAct && (status === "PREPARING" || status === "RUNNING") ? "drive" : "watch";', 'return status === "PREPARING" || status === "RUNNING" ? "drive" : "watch";']) },
    /* ── V14 · the presses ── */
    { name: "R-V14 · no guard against a double click — two clicks in one tick make two calls", expect: [L.v14],
      impl: edit("presses", ["if (!h.may || inFlight.current.has(act)) return;", "if (!h.may) return;"]) },
    { name: "R-V14b · one press holds every control — Stop cannot be pressed while Pause waits", expect: [L.v14],
      impl: edit("presses", ["if (!h.may || inFlight.current.has(act)) return;", "if (!h.may || inFlight.current.size > 0) return;"]) },
    { name: "R-V14c · a viewer who may not act presses — the console's gate is ignored", expect: [L.v14],
      impl: edit("presses", ["if (!h.may || inFlight.current.has(act)) return;", "if (inFlight.current.has(act)) return;"]) },
    { name: "R-V14d · a refusal outlives the next press", expect: [L.v14],
      impl: edit("presses", ["setRefusal(null);", "void 0;"]) },
    { name: "R-V14e · a copy always leaves the page — a driving tab navigates away and the only driver ends", expect: [L.v14],
      impl: edit("presses", ['if (settled.copy.kind === "navigate") { if (mounted.current) now.navigate(settled.copy.href); }', "if (true) now.navigate(settled.copy.href);"]) },
    { name: "R-V14f · the mode is read when the press began — a copy decided on a stale mode", expect: [L.v14],
      impl: edit("presses", ["hostRef.current.mode);", "h.mode);"]) },
    { name: "R-V14g · a thrown action is taken for an answer — the officer sees nothing and the page learns nothing", expect: [L.v14],
      impl: edit("presses", ['return "error" in r ? { ok: false, reason: "unfinished", message: LIVE_ACT_UNFINISHED_NO_VIEW, view: null, href: null } : r;', "return r as LiveActAnswer;"]) },
    { name: "R-V14h · a control is left pending for good when a setter throws — no finally", expect: [L.v14],
      impl: edit("presses", [FINALLY, NO_FINALLY]) },
    /* ── V15 · what the page says ── */
    { name: "R-V15 · the console's gate alone decides who acts", expect: [L.v15],
      impl: edit("decide", ["return serverMay === true && gateMay === true;", "return gateMay === true;"]) },
    { name: "R-V15b · one press disables every control — the brake is held off by another press", expect: [L.v15],
      impl: edit("decide", ["return { enabled: c.enabled && !pending.has(act), reason: c.enabled ? null : c.reason };", "return { enabled: c.enabled && pending.size === 0, reason: c.enabled ? null : c.reason };"]) },
    { name: "R-V15c · only the status's expected control's reason is printed — Make a copy's stays in its title", expect: [L.v15],
      impl: edit("decide", ["if (act === expected || !PLAIN_STATE_REASONS.includes(s.reason)) printed.push({ act, text: s.reason });", "if (act === expected) printed.push({ act, text: s.reason });"]) },
    { name: "R-V15d · 'Nobody is sending' reaches an actor on its first paint, above 'Keep this page open'", expect: [L.v15],
      impl: edit("decide", ["nobody: view.standing.nobodyDriving && (!i.mayAct || i.stop !== null),", "nobody: view.standing.nobodyDriving,"]) },
    { name: "R-V15e · a watcher is not told the send window is shut", expect: [L.v15],
      impl: edit("decide", ['window: !driving && view.status === "RUNNING" ? liveWindowSentence(view.standing.window) : null,', "window: null,"]) },
    { name: "R-V15f · the send window is said for a campaign that is not being sent", expect: [L.v15],
      impl: edit("decide", ['window: !driving && view.status === "RUNNING" ?', "window: !driving ?"]) },
    { name: "R-V15g · the switch's closing time is said to the page that is driving, beside its own wait", expect: [L.v15],
      impl: edit("decide", ["switchCloses: !driving && !terminal && view.standing.switchOpen", "switchCloses: !terminal && view.standing.switchOpen"]) },
    { name: "R-V15h · a stopped driver's last wait stays on screen beside its stop", expect: [L.v15],
      impl: edit("decide", ["said: i.said !== null && i.stop === null,", "said: i.said !== null,"]) },
    { name: "R-V15i · every toast fades — a warning or advice is gone in four seconds", expect: [L.v14, L.v15],
      impl: edit("decide", [': { title: answer.message, variant: "warning", durationMs: 0 };', ': { title: answer.message, variant: "success" };']) },
    { name: "R-V15j · a copy always navigates — a driving page leaves", expect: [L.v14, L.v15],
      impl: edit("decide", ['return { kind: mode === "drive" ? "link" : "navigate", href };', 'return { kind: "navigate", href };']) },
    { name: "R-V15k · the live region announces the page on mount", expect: [L.v15],
      impl: edit("announce", ["const previous = useRef<string>(view.status);", 'const previous = useRef<string>("");']) },
    { name: "R-V15l · the live region announces every change of the view, not only the status — every two seconds", expect: [L.v15],
      impl: edit("announce", ["if (next !== null) setSaid(next);", "setSaid(view.headline);"], ["}, [view.status]);", "});"]) },
    { name: "R-V15m · a second live region — a callout marked role=status", expect: [L.v15],
      impl: clientEdit('<Callout tone="info" role="note">', '<Callout tone="info" role="status">') },
    { name: "R-V15o · the driver is handed the server's decision alone — a page the console's gate refuses still steps", expect: [L.v15],
      impl: clientEdit("useLiveDriver({ id: initial.id, mayAct: may,", "useLiveDriver({ id: initial.id, mayAct,") },
    { name: "R-V15n · the client decides a callout inline — the first build's condition, back", expect: [L.v15],
      impl: () => ({ page: { ...REAL_PAGE, sources: { ...REAL_SOURCES, client: `${REAL_SOURCES.client}${NL}const inlineNobody = view.standing.nobodyDriving && !driver.ran;` } } }) },
    /* ── V16 · the seed ── */
    { name: "R-V16 · the busy hold records the limits at every hold — a second hold's 'original' is the first's raised limits", expect: [L.v16],
      impl: edit("seed", ["if (holds.size === 0) {", "if (true) {"]) },
    { name: "R-V16b · the campaign makers go ahead on a real rail — made-up numbers handed to the provider", expect: [L.v16],
      impl: edit("seed", ["&& !railIsConsole()) {", "&& false) {"]) },
    { name: "R-V16c · a sentence the drive asserts is not served — the drive reads undefined", expect: [L.v16],
      impl: edit("seed", ["outOfDate: LIVE_OUT_OF_DATE,", ""]) },
    { name: "R-V16d · the drive asks for a sentence the seed does not serve", expect: [L.v16],
      impl: () => ({ page: { ...REAL_PAGE, sources: { ...REAL_SOURCES, drive: `${REAL_SOURCES.drive}${NL}const stray = W.noSuchSentence.here;` } } }) },
    /* ══ THE CHECKER'S ROUND (S14 2026-10-08) — what it found no light claim for, and the claim that now holds each ══ */
    /* ── V12 · the page's own header (a CSRF belt), the seam with the client, the production log ── */
    { name: "R-V12o · the door needs no header from the page — a request without X-Kp-Step is let through", expect: [L.v12],
      impl: edit("door", ['  if (req.stepHeader !== "1") return { status: 403, body: null };', "  void 0;"]) },
    { name: "R-V12p · the door takes ANY header — a present X-Kp-Step is enough, whatever it says", expect: [L.v12],
      impl: edit("door", ['if (req.stepHeader !== "1")', "if (req.stepHeader === null)"]) },
    { name: "R-V12q · the route does not hand the page's header to the door — every same-origin step is refused", expect: [L.v12],
      impl: edit("route", ['stepHeader: req.headers.get("x-kp-step"),', "stepHeader: null,"]) },
    { name: "R-V12r · the header is checked AFTER the guard — a request without it still asks the session", expect: [L.v12],
      impl: edit("door", [`  if (req.stepHeader !== "1") return { status: 403, body: null };${NL}`, ""],
        ["  if (!g.ok) return { status: 403, body: refusedBy(g) };", `  if (req.stepHeader !== "1") return { status: 403, body: null };${NL}  if (!g.ok) return { status: 403, body: refusedBy(g) };`]) },
    { name: "R-V12s · the driver's request carries no X-Kp-Step — every step the page asks is refused", expect: [L.v12],
      impl: edit("driver", [', "X-Kp-Step": "1" }', " }"]) },
    { name: "R-V12t · the production log prints the whole error (M28: String(err)) — a message that holds a number is written to the log", expect: [L.v12],
      impl: edit("door", ['threw:", errorName(err));', 'threw:", String(err));']) },
    /* ── V14 · an answer after the page left, and the link a copy leaves ── */
    { name: "R-V14i · an answer that lands after the page was left still navigates — the push pulls the officer back", expect: [L.v14],
      impl: edit("presses", ['{ if (mounted.current) now.navigate(settled.copy.href); }', "{ now.navigate(settled.copy.href); }"]) },
    { name: "R-V14j · the mounted ref is cleared by the cleanup and never set again — under React's double-run no copy ever navigates", expect: [L.v14],
      impl: edit("presses", ["useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);", "useEffect(() => () => { mounted.current = false; }, []);"]) },
    { name: "R-V14k · every press clears the link a copy left — a Pause takes the new draft's link down", expect: [L.v14],
      impl: edit("presses", ['if (act === "copy") setCopyLink(null);', "setCopyLink(null);"]) },
    { name: "R-V14l · no press clears the link a copy left — the next copy shows the old draft's link beside the new", expect: [L.v14],
      impl: edit("presses", ['if (act === "copy") setCopyLink(null);', "void 0;"]) },
    /* ── V15 · the dialogs, the Pause sentence, the callouts, the trail and the ghost ── */
    { name: "R-V15p · M22 — a settled press closes ANY dialog: a Pause answering closes the Stop dialog the officer is reading", expect: [L.v15],
      impl: edit("decide", ["return open === act ? null : open;", "return null;"]) },
    { name: "R-V15q · M23 — a settled press closes NO dialog: a refused Start leaves its dialog over the refusal", expect: [L.v15],
      impl: edit("decide", ["return open === act ? null : open;", "return open;"]) },
    { name: "R-V15r · M22 in the Provider — onSettled closes whatever dialog is open", expect: [L.v15],
      impl: clientEdit("onSettled: (act) => setDialog((open) => dialogAfterSettled(open, act)),", "onSettled: () => setDialog(null),") },
    { name: "R-V15s · M23 in the Provider — onSettled does nothing", expect: [L.v15],
      impl: clientEdit("onSettled: (act) => setDialog((open) => dialogAfterSettled(open, act)),", "onSettled: () => {},") },
    { name: "R-V15t · the Pause of a campaign that had not begun sending is not in the plain list — its toast stays on screen as a warning", expect: [L.v15],
      impl: () => {
        const base = REAL_PAGE;
        const S = REAL_SOURCES;
        const copy = { ...COPY, liveDoneIsPlain: (m: string) => m !== COPY.LIVE_DONE.pauseBeforeSending && COPY.liveDoneIsPlain(m) };
        const decide = evalModule(S.decide, { "./live-copy": copy }) as unknown as Mods["decide"];
        return { page: { ...base, mods: { ...base.mods, decide, presses: compiledPresses(S.presses, decide), announce: compiledAnnounce(S.announce, decide) } } };
      } },
    { name: "R-V15u · M15 — the page does not name the campaign in the trail (the cmp_ id is what the crumb reads)", expect: [L.v15],
      impl: sourceEdit("page", "<AdminCrumbLabel segment={load.view.id}", "<AdminCrumbLabel segment={load.view.name}") },
    { name: "R-V15v · M16 — the ghost's buttons invent a height of their own instead of the kit's --tap-min", expect: [L.v15],
      impl: sourceEdit("loading", "className={`h-[var(--tap-min)] rounded-md ${w}`}", "className={`h-[44px] rounded-md ${w}`}") },
    { name: "R-V15w · a lapsed 2-step stops the driver and shows no step-up link — the officer is told and cannot act on it", expect: [L.v15],
      impl: withCallouts({ stop: (s) => (s.kind === "second_factor" ? dropElement(real.stop(s), "data-live-factor-link", "</a>") : real.stop(s)) }) },
    { name: "R-V15x · a sign-in that ended offers the 2-step link's words — 'Open the 2-step sign-in' to a visitor who must sign in again", expect: [L.v15],
      impl: withCallouts({ stop: (s) => (s.kind === "signed_out" ? real.stop(s).split(COPY.LIVE_SIGN_IN_LINK).join(COPY.LIVE_FACTOR_LINK) : real.stop(s)) }) },
    { name: "R-V15y · an out-of-date page has no Reload — nothing can work", expect: [L.v15],
      impl: withCallouts({ stop: (s) => (s.kind === "out_of_date" ? dropElement(real.stop(s), "data-live-reload", "</button>") : real.stop(s)) }) },
    { name: "R-V15z · the step-up link of a stop opens with a handle on the page — no rel=noopener", expect: [L.v15],
      impl: withCallouts({ stop: (s) => (s.kind === "second_factor" || s.kind === "signed_out" ? without(real.stop(s), ` rel=${DQ}noopener noreferrer${DQ}`) : real.stop(s)) }) },
    { name: "R-V15aa · a driver stop is not an alert — a screen reader is not told the page stopped", expect: [L.v15],
      impl: withCallouts({ stop: (s) => without(real.stop(s), ` role=${DQ}alert${DQ}`) }) },
    { name: "R-V15ab · a second-factor refusal shows no step-up link", expect: [L.v15],
      impl: withCallouts({ refusal: (r) => (r.reason === "second_factor" ? dropElement(real.refusal(r), "data-live-refusal-link", "</a>") : real.refusal(r)) }) },
    { name: "R-V15ac · the refusal's step-up link replaces this tab — the page keeps no place (no target=_blank)", expect: [L.v15],
      impl: withCallouts({ refusal: (r) => (r.reason === "second_factor" ? without(real.refusal(r), ` target=${DQ}_blank${DQ}`) : real.refusal(r)) }) },
    { name: "R-V15ad · the refusal's step-up link opens with a handle on the page — no rel=noopener", expect: [L.v15],
      impl: withCallouts({ refusal: (r) => (r.reason === "second_factor" ? without(real.refusal(r), ` rel=${DQ}noopener noreferrer${DQ}`) : real.refusal(r)) }) },
    { name: "R-V15ae · a refusal is not an alert — a screen reader is not told a press was refused", expect: [L.v15],
      impl: withCallouts({ refusal: (r) => without(real.refusal(r), ` role=${DQ}alert${DQ}`) }) },
    { name: "R-V15af · the copy's link replaces this tab — the only driver ends (no target=_blank)", expect: [L.v15],
      impl: withCallouts({ copyLink: (href) => without(real.copyLink(href), ` target=${DQ}_blank${DQ}`) }) },
    { name: "R-V15ag · the copy's link opens with a handle on the page — no rel=noopener", expect: [L.v15],
      impl: withCallouts({ copyLink: (href) => without(real.copyLink(href), ` rel=${DQ}noopener noreferrer${DQ}`) }) },
    /* ── V17 · the copy spends the save budget ── */
    { name: "R-V17 · the copy spends no budget — the rateCheckAsync(marketing.campaignSave) lines are gone from the action", expect: [L.v17],
      impl: sourceEdit("actions", ['  const rate = await rateCheckAsync(g.userId, "marketing.campaignSave");', '  if (!rate.allowed) return actRefused("rate_limited", copyRateLimitedSentence(rate.retryAfterSec));'].join(NL) + NL, "") },
    { name: "R-V17b · the budget is asked and its refusal ignored — a copy past the budget is made anyway", expect: [L.v17],
      impl: sourceEdit("actions", 'if (!rate.allowed) return actRefused(', 'if (false) return actRefused(') },
    { name: "R-V17c · the bucket is one the rate limiter does not know — it fails OPEN and every copy is allowed", expect: [L.v17],
      impl: sourceEdit("actions", '"marketing.campaignSave"', '"marketing.campaignSav"') },
  ];
}
