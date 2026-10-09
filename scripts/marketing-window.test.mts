/**
 * test:marketing-window — U13's guard: THE SEND WINDOW, 08:00–20:00 EAT (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.8;
 * decisions D13 · OQ5 · E2c · E9 · E14 · F9 · F10 · K1 · M12).
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script — the window's rule (`src/lib/marketing/window.ts`), the
 * send path's reader (`liveSendWindow`, over injected settings reads AND over the real settings store built by its own
 * `makeStore`), the send loop (`dispatchSlice`) and the officer's test send (`sendCampaignTest`, on the memory twin with the
 * console stub) — each at FIXED instants, never the hour this suite happens to run at:
 *   W0  controls — the fixed instants are the EAT times they claim; the memory twin is loaded; the dev clock seam is live;
 *   W1  open or closed at 07:59:59 · 08:00:00 · 19:59:59 · 20:00:00 · 03:00 EAT for the default and for a saved 09:00–18:00
 *       (each at its own edges and at the other's); no hours given IS `SEND_WINDOW_EAT` — one constant, re-exported;
 *   W1b ⛔ FAIL CLOSED — hours the settings rule refuses and an instant that is no date are closed `window_unreadable`,
 *       saying nothing about when it opens; the live reader is closed for a read that failed, a row it could not read in
 *       full and a read that throws — through the real store too — and obeys the hours a readable row holds, or the
 *       default when no row is stored;
 *   W2  `opensAt` is today's start before it and tomorrow's from it on, `closesAt` today's end before it and tomorrow's
 *       after — at every quarter hour across two EAT days and at each edge, for both windows: never in the past, never
 *       more than a day ahead, always at the window's own hour; and across EAT midnight, where the UTC day is yesterday;
 *   W3  ⭐ outside the window `dispatchSlice` holds EVERY row `quiet_hours` — the gate asked ZERO times (a counting gate),
 *       the wire called ZERO times, no RG line written; an unreadable, throwing or shapeless window holds them
 *       `window_unreadable`; the same rows go out inside it (the control); and the DEFAULT window (no `deps.window`) is the
 *       live one, judged by the dev clock seam at 03:00 and at noon;
 *   W4  the test send outside → refused `held` with the window's sentence word for word, the officer's own and a typed
 *       one, before a token, a row, the gate or the wire; the masked row says `held: quiet_hours`; inside, the same test is
 *       handed over (the control); a window that closes between the check and the send still holds it; an unreadable one
 *       is said as unreadable; saved hours are said in their own words; and the composer's note, word for word;
 *   W5  the window is read ONCE per slice — not per row — open or closed; the test send reads it twice (its own check, and
 *       dispatch's read immediately before the wire);
 *   W6  the wiring — the shipped test send reads the live window and hands it on; dispatch reads `deps.window`, else the
 *       live one, before its loop; the live reader reads the settings fresh; the composer's note reads the same window;
 *       the dev clock is a no-op in production; `window.ts` holds no copy of the hours and is pinned client-safe; the
 *       scripts and predeploy.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` first proves the baseline green, then plants each defect IN MEMORY and
 * requires the claim that names it to turn red. No file on disk is touched. No database is touched: the database
 * variables are removed below, before the first server module loads, so the store picks its memory twin.
 *
 * Run: `npm run test:marketing-window` · Red: `npm run red:marketing-window`
 */
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;
delete process.env.REDIS_ENABLED;
process.env.SMS_PROVIDER = "console";
process.exitCode = 1;

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const PROVE_RED = process.argv.includes("--prove-red");

const W = await import("../src/lib/marketing/window.ts");
const PURE = await import("../src/lib/marketing/sms-settings.ts");
const SETTINGS = await import("../src/lib/server/marketing/sms-settings.ts");
const D = await import("../src/lib/server/marketing/dispatch.ts");
const CLOCK = await import("../src/lib/server/marketing/send-window-clock.ts");
const TEST = await import("../src/lib/server/marketing/campaign-test-send.ts");
const COPY = await import("../src/app/admin/campaigns/new/composer-copy.ts");
const { EAT_OFFSET_MS } = await import("../src/lib/eat-day.ts");
const { db } = await import("../src/lib/server/store.ts");
const { mayReceiveMarketingSms, recordPlayerMarketingChoice } = await import("../src/lib/server/marketing/consent.ts");
const { selfExclude } = await import("../src/lib/server/responsible-gambling.ts");
const { auditFlush, getAuditPage } = await import("../src/lib/server/audit.ts");
const { ALWAYS_OPEN, ALWAYS_CLOSED, NOON_EAT_MS, NIGHT_EAT_MS } = await import("./lib/send-window.mts");

type SendWindowState = ReturnType<typeof W.sendWindowState>;
type SendWindowHours = { windowStartMinute: number; windowEndMinute: number };
type SliceRecipient = Parameters<typeof D.dispatchSlice>[0][number];
type SliceDeps = Parameters<typeof D.dispatchSlice>[1];
type SliceOutcome = Awaited<ReturnType<typeof D.dispatchSlice>>[number];
type TestDeps = typeof TEST.CAMPAIGN_TEST_DEPS;
type TestInput = Parameters<typeof TEST.sendCampaignTest>[0];
type TestResult = Awaited<ReturnType<typeof TEST.sendCampaignTest>>;
type SettingsReload = Awaited<ReturnType<typeof SETTINGS.reloadMarketingSmsSettings>>;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CR = String.fromCharCode(13);
/** A line break built from its code — this file holds no backslash escape (an editing tool decodes them). */
const NL = String.fromCharCode(10);
const read =(rel: string): string => readFileSync(join(ROOT, rel), "utf8").split(CR).join("");
const code = (rel: string): string => decomment(read(rel));

/* ══ THE LABELS — each once, so a red case names exactly the claim it must turn red ═════════════════════════════════ */

const L = {
  w0: "W0 · controls — every fixed instant is the EAT time it claims (03:00 and noon on 7 October 2026, 08:00 that day, and 00:30 on the 8th while UTC is still the 7th); the memory twin is loaded; and this process is not production, so the dev clock seam this suite drives is live",
  w1: "W1 · open or closed at 07:59:59 · 08:00:00 · 19:59:59 · 20:00:00 · 03:00 EAT for the default, and at 08:59:59 · 09:00:00 · 17:59:59 · 18:00:00 · 03:00 for a saved 09:00–18:00 (and at each other's edges), to the millisecond either side; a closed window says quiet_hours and an open one nothing; the labels are the hours'; and no hours given IS SEND_WINDOW_EAT — the one constant, re-exported from the settings module, 08:00–20:00",
  w1b: "W1b · ⛔ FAIL CLOSED — hours the settings rule refuses (off the quarter, under 2 h, reversed, before 07:00, after 21:00, a string, a fraction, NaN, null, an array, an empty object) and an instant that is no date are closed window_unreadable with nothing said about when it opens; the live reader is closed window_unreadable for a read that failed, a row it could not read in full, a read that throws and a readable row whose hours the rule refuses — through the real settings store too (another shape, a window under 2 h) — and obeys the hours a readable row holds (09:00–18:00: closed at 08:30, open at noon) and the default when no row is stored",
  w2: "W2 · opensAt is today's start before it and tomorrow's from it on, closesAt today's end before it and tomorrow's from it on — at every quarter hour across two EAT days and at each edge to the millisecond, for the default and a saved 09:00–18:00: never in the past, never more than a day ahead, always at the window's own hour — and across EAT midnight (00:30 EAT on the 8th, the UTC day still the 7th) the next opening is the 8th's 08:00",
  w3: "W3 · ⭐ OUTSIDE THE WINDOW dispatchSlice holds EVERY row quiet_hours — a consenting player, a self-excluded one and an unsendable number — with the gate asked ZERO times, the wire called ZERO times and no RG line written; an unreadable, a throwing or a shapeless window holds them window_unreadable, the gate and the wire untouched; inside it the same rows are handed over, skipped rg_self_excluded (with its one RG line) and skipped bad_msisdn; and with NO deps.window the live window is read — every row held at 03:00 and handed over at noon, by the dev clock",
  w4: "W4 · the test send outside the window is refused held with the window's sentence word for word — the officer's own and a typed one (a COMPLIANCE officer's: a typed test is for ADMIN and COMPLIANCE only, 2026-10-09) — with no token minted, no SmsMessage row, no gate asked, no outreach record read and no typed budget spent, and its masked row says held: quiet_hours; inside it the same test is handed over with one row (the control); a window that closes between the check and the send still holds it, with no row; an unreadable or throwing window is refused in the unreadable sentence (held: window_unreadable) with no token; a saved 09:00–18:00 is said in its own hours; and the composer's note says it up front, word for word",
  w3c: "W3c · ⛔ THE WIRE RE-CHECK (the U13 review's SP-1) — a slice judged open at 19:59:58 EAT whose gate loop takes three seconds reaches the wire after 20:00: every cleared row is held quiet_hours and the wire is never called; the same slice that takes one second (19:59:59) is handed over — the slice's own elapsed time, added to the instant its window was judged at, never the wall clock against a fixed suite window",
  w5: "W5 · the window is read ONCE per slice, never per row — open or closed, for five rows — and the test send reads it exactly twice: its own check, and dispatch's read immediately before the wire",
  w6: "W6 · the wiring — every suite under scripts/ that drives a send path (imports or awaits dispatchSlice, calls sendCampaignTest, spreads CAMPAIGN_TEST_DEPS) imports the fixed windows of scripts/lib/send-window.mts (SP-4); the shipped test send's window IS liveSendWindow, it is checked before the token and the typed checks, and handed to dispatchSlice; dispatchSlice reads deps.window, else liveSendWindow, and holds BEFORE its per-recipient loop; the live reader re-reads the settings and refuses an unreadable row; the composer's note reads the same live window; the dev clock lives in its own module (dispatch.ts holds no hook, only its reader) and is a no-op in production; window.ts imports only eat-day and the settings module, carries no directive and holds no copy of the hours; client-graph-safe pins it; test:/red:marketing-window resolve and predeploy runs the suite once, right after test:marketing-settings",
} as const;

let pass = 0;
let fail = 0;
const failed: string[] = [];
const ok = (label: string, cond: boolean, detail = ""): void => {
  if (cond) pass++;
  else { fail++; failed.push(label); }
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
/** One claim: its body answers [holds, detail]; a throw is a failure with its message, never a crash. */
async function claim(label: string, body: () => Promise<[boolean, string]>): Promise<void> {
  try {
    const [cond, detail] = await body();
    ok(label, cond, detail);
  } catch (err) {
    ok(label, false, `threw: ${(err as Error)?.message ?? String(err)}`);
  }
}

/* ══ FIXTURES ════════════════════════════════════════════════════════════════════════════════════════════════════ */

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
/** An instant at hh:mm:ss EAT on the given October 2026 day (the 7th unless said). */
const eat = (hh: number, mm: number, ss = 0, day = 7): number => Date.UTC(2026, 9, day, hh, mm, ss) - EAT_OFFSET_MS;
/** The EAT day number, time since EAT midnight and clock of an instant — re-derived here from the offset alone. */
const eatDayOf = (ms: number): number => Math.floor((ms + EAT_OFFSET_MS) / DAY);
const sinceEatMidnight = (ms: number): number => (((ms + EAT_OFFSET_MS) % DAY) + DAY) % DAY;
const eatClockOf = (ms: number): string => new Date(ms + EAT_OFFSET_MS).toISOString().slice(11, 19);
/** The default hours as the spec states them (08:00–20:00), and a saved 09:00–18:00. */
const DEFAULT_HOURS: SendWindowHours = { windowStartMinute: 480, windowEndMinute: 1200 };
const SAVED: SendWindowHours = { windowStartMinute: 540, windowEndMinute: 1080 };
const QUIET = "It's outside the send window (08:00–20:00 EAT), so no test can be sent now — try again at 08:00.";
const QUIET_SAVED = "It's outside the send window (09:00–18:00 EAT), so no test can be sent now — try again at 09:00.";
const NOTE = "Outside the send window (08:00–20:00 EAT) — a test can be sent from 08:00.";
const NOTE_SAVED = "Outside the send window (09:00–18:00 EAT) — a test can be sent from 09:00.";
const ALLOW = async () => ({ allowed: true, remaining: 3, retryAfterSec: 0 });
const CLEARED = async () => ({ ok: true as const, basis: "CONSENT" as const, basisRef: "consent:fixture" });

let RUN = 0;
/** A fresh NDC-71 key per run and slot (`25571` and seven digits) — no run ever meets another's rows. */
const keyOf = (run: number, slot: number): string => `25571${String(5_100_000 + run * 50 + slot)}`;

/** A consenting account — its consent given the way a person gives it (the profile switch's writer). ⛔ 2026-10-09 · a
 *  test to a TYPED number is for ADMIN and COMPLIANCE only (the owner's ruling), so W4's typed half is a COMPLIANCE one. */
async function person(run: number, slot: number, role: "PLAYER" | "GROWTH" | "COMPLIANCE" = "PLAYER"): Promise<{ id: string; key: string }> {
  const key = keyOf(run, slot);
  const id = `usr_u13_${run}_${slot}`;
  const at = new Date().toISOString();
  await db.user.create({
    id, phoneE164: `+${key}`, email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "EN", displayName: "Asha Mwita", dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1",
    acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, emailVerifiedAt: null,
    createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
  });
  const r = await recordPlayerMarketingChoice({ userId: id, marketingOptIn: true, locale: "EN" });
  if (!r.ok) throw new Error(`fixture ${id}: the consent did not record`);
  return { id, key };
}

/** A transport stand-in that takes every message and counts its calls. */
type Wire = { calls: number; send: SliceDeps["send"] };
function wireOf(): Wire {
  const w: Wire = { calls: 0, send: async () => ({ results: [], balanceTzs: null }) };
  w.send = async (messages) => {
    w.calls++;
    return {
      results: messages.map((m) => ({ reference: `ref_${m.targetId}`, to: m.to, ok: true, targetType: m.targetType, targetId: m.targetId })),
      balanceTzs: 100,
    };
  };
  return w;
}

/** The RG COMPLIANCE lines written against one account. */
async function rgRowsFor(userId: string): Promise<number> {
  await auditFlush();
  return getAuditPage({ category: "COMPLIANCE", limit: 5000 }).filter((e) => e.action === D.MARKETING_RG_SUPPRESSED_ACTION && e.targetId === userId).length;
}

/** The memory twin's SmsMessage rows for one target — -1 while the twin is not loaded (W0 holds that it is). */
type MemStore = { smsMessages?: Map<string, { targetId: string | null }> };
function smsRowsFor(targetId: string): number {
  const s = (globalThis as unknown as { __50PICK_STORE?: MemStore }).__50PICK_STORE;
  return s?.smsMessages instanceof Map ? [...s.smsMessages.values()].filter((m) => m.targetId === targetId).length : -1;
}
const tokenCount = async (key: string): Promise<number> => (await db.marketingOptOutToken.listFor(key)).length;

/** A saved DRAFT as the store returns one — handed to the test send through its `campaigns` dependency. */
const draftRow = (id: string) => ({
  id, status: "DRAFT", draftRevision: 0, name: "U13 window", bodySw: "50pick: Habari {jina}, mechi kubwa leo.", bodyEn: null,
  nameFallbackSw: "Rafiki", nameFallbackEn: "Friend", sourcePhrase: "Namba yako ipo orodhani kwetu.", audienceFilter: "{}",
});

type AuditRow = { action: string; actorId: string | null; payload?: Record<string, unknown> };
type Counters = { mints: number; outreach: number; typedBudget: number; audits: AuditRow[] };
/** The SHIPPED test send's dependencies, with this suite's draft, open budgets, counters on what must not be spent — and
 *  a FIXED open window unless a claim closes it. */
function testWorld(over: Partial<TestDeps> = {}): { deps: TestDeps; n: Counters } {
  const n: Counters = { mints: 0, outreach: 0, typedBudget: 0, audits: [] };
  const shipped = TEST.CAMPAIGN_TEST_DEPS;
  const deps = {
    ...shipped,
    campaigns: { find: async (id: string) => (id.startsWith("cmp_u13_") ? draftRow(id) : null) },
    rate: ALLOW,
    rateTyped: async () => { n.typedBudget++; return ALLOW(); },
    rateTo: async () => { n.typedBudget++; return ALLOW(); },
    gateReads: { ...shipped.gateReads, outreach: () => { n.outreach++; return shipped.gateReads.outreach(); } },
    ensureToken: async (raw: string) => { n.mints++; return shipped.ensureToken(raw); },
    audit: async (e: AuditRow) => { n.audits.push(e); return {}; },
    sleep: async () => {},
    window: ALWAYS_OPEN,
    ...over,
  } as unknown as TestDeps;
  return { deps, n };
}
const heldAs = (r: TestResult, sentence: string): boolean => !r.ok && r.outcome === "refused" && r.reason === "held" && r.error === sentence;
const auditedHeld = (rows: AuditRow[], why: string): boolean => rows.length >= 1
  && rows.every((a) => a.action === TEST.CAMPAIGN_TEST_ACTION && a.payload?.outcome === "refused" && a.payload?.reason === "held" && a.payload?.held === why);
const said = (r: TestResult): string => (r.ok ? `HANDED OVER via ${r.via}` : r.outcome === "refused" ? `${r.reason}: ${r.error}` : `${r.outcome}: ${r.error}`);

/* ══ THE IMPLEMENTATION UNDER TEST — each member swappable by one plant ══════════════════════════════════════════ */

type Impl = {
  readonly state: typeof W.sendWindowState;
  readonly live: typeof D.liveSendWindow;
  readonly dispatch: typeof D.dispatchSlice;
  readonly test: typeof TEST.sendCampaignTest;
  /** The window the SHIPPED test send reads (`CAMPAIGN_TEST_DEPS.window`). */
  readonly shippedWindow: unknown;
  readonly sources: Readonly<{
    dispatch: string; testSend: string; loader: string; window: string; graphSafe: string; pkg: string;
    /** Every suite and drive under scripts/ (this file and the window fixtures excepted) — W6 walks them for send-path
     *  drivers that were not handed a fixed window (the U13 review's SP-4). */
    callers: ReadonlyArray<{ rel: string; text: string }>;
  }>;
};
/** Every .mts and .mjs file under scripts/, by repo path — read once, as text. */
function scriptFiles(dir: string, rel: string): Array<{ rel: string; text: string }> {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const at = `${rel}/${e.name}`;
    if (e.isDirectory()) return e.name === "node_modules" ? [] : scriptFiles(`${dir}/${e.name}`, at);
    return /[.]m[tj]s$/.test(e.name) ? [{ rel: at, text: read(at) }] : [];
  });
}
const CALLERS = scriptFiles("scripts", "scripts")
  .filter((f) => f.rel !== "scripts/lib/send-window.mts" && f.rel !== "scripts/marketing-window.test.mts");
const REAL: Impl = {
  state: W.sendWindowState,
  live: D.liveSendWindow,
  dispatch: D.dispatchSlice,
  test: TEST.sendCampaignTest,
  shippedWindow: TEST.CAMPAIGN_TEST_DEPS.window,
  sources: {
    dispatch: code("src/lib/server/marketing/dispatch.ts"),
    testSend: code("src/lib/server/marketing/campaign-test-send.ts"),
    loader: code("src/app/admin/campaigns/new/composer-loader.ts"),
    window: code("src/lib/marketing/window.ts"),
    graphSafe: read("scripts/client-graph-safe.test.mjs"),
    pkg: read("package.json"),
    callers: CALLERS,
  },
};

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (label: string): string => `${tag}${label}`;
  const run = ++RUN;

  /* ── W0 · controls ── */
  await claim(p(L.w0), async () => {
    const clocks = {
      night: eatClockOf(NIGHT_EAT_MS) === "03:00:00" && eatClockOf(eat(3, 0)) === "03:00:00" && eat(3, 0) === NIGHT_EAT_MS,
      noon: eatClockOf(NOON_EAT_MS) === "12:00:00" && eat(12, 0) === NOON_EAT_MS,
      eight: eatClockOf(eat(8, 0)) === "08:00:00" && eatDayOf(eat(8, 0)) === eatDayOf(NIGHT_EAT_MS),
      midnight: eatClockOf(eat(0, 30, 0, 8)) === "00:30:00" && new Date(eat(0, 30, 0, 8)).toISOString().slice(0, 10) === "2026-10-07",
    };
    const twin = smsRowsFor("cmp_u13_none") === 0;
    const dev = process.env.NODE_ENV !== "production";
    return [Object.values(clocks).every(Boolean) && twin && dev, `${JSON.stringify(clocks)} · twin ${twin} · NODE_ENV ${process.env.NODE_ENV ?? "(unset)"}`];
  });

  /* ── W1 · open or closed at the edges ── */
  await claim(p(L.w1), async () => {
    const cases: Array<[string, number, SendWindowHours | undefined, boolean]> = [
      ["default 07:59:59", eat(7, 59, 59), undefined, false], ["default 08:00:00", eat(8, 0), undefined, true],
      ["default 19:59:59", eat(19, 59, 59), undefined, true], ["default 20:00:00", eat(20, 0), undefined, false],
      ["default 03:00", eat(3, 0), undefined, false], ["default 08:00 less 1 ms", eat(8, 0) - 1, undefined, false],
      ["default 20:00 less 1 ms", eat(20, 0) - 1, undefined, true],
      ["saved 08:59:59", eat(8, 59, 59), SAVED, false], ["saved 09:00:00", eat(9, 0), SAVED, true],
      ["saved 17:59:59", eat(17, 59, 59), SAVED, true], ["saved 18:00:00", eat(18, 0), SAVED, false],
      ["saved 03:00", eat(3, 0), SAVED, false], ["saved 09:00 less 1 ms", eat(9, 0) - 1, SAVED, false],
      ["saved 18:00 less 1 ms", eat(18, 0) - 1, SAVED, true],
      ["saved at the default's 08:00", eat(8, 0), SAVED, false], ["saved at the default's 19:59:59", eat(19, 59, 59), SAVED, false],
      ["default at the saved 09:00", eat(9, 0), undefined, true], ["default at the saved 18:00", eat(18, 0), undefined, true],
    ];
    const wrong = cases.filter(([, t, h, want]) => {
      const s = impl.state(t, h);
      return s.open !== want || s.reason !== (want ? null : "quiet_hours");
    }).map(([name, t, h]) => `${name} read ${impl.state(t, h).open ? "open" : "closed"}`);
    const d = impl.state(NOON_EAT_MS);
    const s = impl.state(NOON_EAT_MS, SAVED);
    const labels = d.label === "08:00–20:00 EAT" && d.opensAtTime === "08:00" && s.label === "09:00–18:00 EAT" && s.opensAtTime === "09:00";
    const constant = W.SEND_WINDOW_EAT === PURE.SEND_WINDOW_EAT && PURE.SEND_WINDOW_EAT.startMinute === 480 && PURE.SEND_WINDOW_EAT.endMinute === 1200
      && PURE.MARKETING_SMS_SETTINGS_DEFAULTS.windowStartMinute === 480 && PURE.MARKETING_SMS_SETTINGS_DEFAULTS.windowEndMinute === 1200;
    const fromConstant: SendWindowHours = { windowStartMinute: W.SEND_WINDOW_EAT.startMinute, windowEndMinute: W.SEND_WINDOW_EAT.endMinute };
    const sameDefault = cases.every(([, t]) => JSON.stringify(impl.state(t)) === JSON.stringify(impl.state(t, fromConstant))
      && JSON.stringify(impl.state(t)) === JSON.stringify(impl.state(t, DEFAULT_HOURS)));
    return [wrong.length === 0 && labels && constant && sameDefault,
      `${wrong.join(" | ") || "every edge right"} · labels ${labels} · one constant ${constant} · no hours = the constant ${sameDefault}`];
  });

  /* ── W1b · fail closed ── */
  await claim(p(L.w1b), async () => {
    const blank = (s: SendWindowState): boolean => s.open === false && s.reason === "window_unreadable"
      && s.opensAt === "" && s.closesAt === "" && s.label === "" && s.opensAtTime === "";
    const BAD: unknown[] = [
      { windowStartMinute: 481, windowEndMinute: 1200 }, { windowStartMinute: 480, windowEndMinute: 540 },
      { windowStartMinute: 1200, windowEndMinute: 480 }, { windowStartMinute: 405, windowEndMinute: 1200 },
      { windowStartMinute: 480, windowEndMinute: 1275 }, { windowStartMinute: "480", windowEndMinute: 1200 },
      { windowStartMinute: 480.5, windowEndMinute: 1200 }, { windowStartMinute: Number.NaN, windowEndMinute: 1200 },
      null, [], {},
    ];
    const openedBad = BAD.filter((h) => !blank(impl.state(NOON_EAT_MS, h as SendWindowHours))).map((h) => JSON.stringify(h));
    const openedInstant = [Number.NaN, Number.POSITIVE_INFINITY, 1e20].filter((t) => !blank(impl.state(t))).map(String);
    const at = (ms: number) => () => ms;
    const answer = (r: unknown) => async () => r as SettingsReload;
    const DEFS = { ...PURE.MARKETING_SMS_SETTINGS_DEFAULTS };
    const savedRow = { ok: true, settings: { ...DEFS, windowStartMinute: 540, windowEndMinute: 1080 }, stored: true, readable: true };
    const noRow = { ok: true, settings: DEFS, stored: false, readable: true };
    const injected = {
      failed: blank(await impl.live(answer({ ok: false, error: "the read did not answer (fixture)" }), at(NOON_EAT_MS))),
      halfRead: blank(await impl.live(answer({ ok: true, settings: DEFS, stored: true, readable: false }), at(NOON_EAT_MS))),
      threw: blank(await impl.live(async () => { throw new Error("the store threw (fixture)"); }, at(NOON_EAT_MS))),
      badHours: blank(await impl.live(answer({ ok: true, settings: { ...DEFS, windowStartMinute: 481 }, stored: true, readable: true }), at(NOON_EAT_MS))),
      savedEarly: (await impl.live(answer(savedRow), at(eat(8, 30)))).reason === "quiet_hours",
      savedNoon: (await impl.live(answer(savedRow), at(NOON_EAT_MS))).open === true,
      savedLabel: (await impl.live(answer(savedRow), at(NOON_EAT_MS))).label === "09:00–18:00 EAT",
      noRowNight: (await impl.live(answer(noRow), at(NIGHT_EAT_MS))).reason === "quiet_hours",
      noRowNoon: (await impl.live(answer(noRow), at(NOON_EAT_MS))).open === true,
    };
    // Through the REAL settings store (its own row reader and its readable flag), over an in-memory row.
    const rowStore = (row: unknown) => SETTINGS.__marketingSmsSettingsForTest({
      floorTzs: () => 50,
      factoryDeps: {
        hasDatabase: () => true,
        loadConfigResult: async () => ({ ok: true as const, value: row === null ? null : JSON.parse(JSON.stringify(row)) }),
        saveConfig: async () => {},
      },
    });
    const goodRow = { v: 1, pricePerSegmentTzs: 6, codesReserveTzs: 20_000, campaignLimitTzs: 10_000, windowStartMinute: 540, windowEndMinute: 1080 };
    const viaStore = async (row: unknown): Promise<[SendWindowState, SendWindowState]> => {
      const s = rowStore(row);
      return [await impl.live(() => s.reload(), at(eat(8, 30))), await impl.live(() => s.reload(), at(NOON_EAT_MS))];
    };
    const [goodEarly, goodNoon] = await viaStore(goodRow);
    const [otherEarly, otherNoon] = await viaStore({ ...goodRow, v: 2 });
    const [shortEarly, shortNoon] = await viaStore({ ...goodRow, windowEndMinute: 600 });
    const [noneEarly, noneNoon] = await viaStore(null);
    const store = {
      good: goodEarly.reason === "quiet_hours" && goodNoon.open === true,
      otherShape: blank(otherEarly) && blank(otherNoon),
      underTwoHours: blank(shortEarly) && blank(shortNoon),
      noRow: noneEarly.open === true && noneNoon.open === true,
    };
    return [openedBad.length === 0 && openedInstant.length === 0 && Object.values(injected).every(Boolean) && Object.values(store).every(Boolean),
      `hours read open [${openedBad.join(" | ")}] · instants read open [${openedInstant.join(", ")}] · injected ${JSON.stringify(injected)} · store ${JSON.stringify(store)}`];
  });

  /* ── W2 · the next opening and closing ── */
  await claim(p(L.w2), async () => {
    const windows: Array<{ name: string; hours: SendWindowHours | undefined; start: number; end: number }> = [
      { name: "default", hours: undefined, start: 480 * MIN, end: 1200 * MIN },
      { name: "09:00–18:00", hours: SAVED, start: 540 * MIN, end: 1080 * MIN },
    ];
    const instants: number[] = [];
    for (let m = 0; m < 2 * 24 * 60; m += 15) instants.push(eat(0, 0, 0, 7) + m * MIN);
    for (const w of windows) {
      for (const edge of [w.start, w.end]) {
        for (const day of [7, 8]) {
          const t = eat(0, 0, 0, day) + edge;
          instants.push(t - 1, t, t + 1);
        }
      }
    }
    instants.push(eat(0, 30, 0, 8), eat(2, 59, 59, 8));
    const wrong: string[] = [];
    for (const w of windows) {
      for (const t of instants) {
        const s = impl.state(t, w.hours);
        const since = sinceEatMidnight(t);
        const opensAt = Date.parse(s.opensAt);
        const closesAt = Date.parse(s.closesAt);
        const good = s.open === (since >= w.start && since < w.end)
          && opensAt > t && closesAt > t && opensAt - t <= DAY && closesAt - t <= DAY
          && sinceEatMidnight(opensAt) === w.start && sinceEatMidnight(closesAt) === w.end
          && eatDayOf(opensAt) === eatDayOf(t) + (since < w.start ? 0 : 1)
          && eatDayOf(closesAt) === eatDayOf(t) + (since < w.end ? 0 : 1);
        if (!good) wrong.push(`${w.name} at ${new Date(t).toISOString()} → open ${s.open} · opens ${s.opensAt} · closes ${s.closesAt}`);
      }
    }
    const pinned = {
      threeAm: impl.state(eat(3, 0)).opensAt === "2026-10-07T05:00:00.000Z" && impl.state(eat(3, 0)).closesAt === "2026-10-07T17:00:00.000Z",
      eightPm: impl.state(eat(20, 0)).opensAt === "2026-10-08T05:00:00.000Z" && impl.state(eat(20, 0)).closesAt === "2026-10-08T17:00:00.000Z",
      afterMidnight: impl.state(eat(0, 30, 0, 8)).opensAt === "2026-10-08T05:00:00.000Z",
    };
    return [wrong.length === 0 && Object.values(pinned).every(Boolean),
      `${wrong.length} wrong of ${instants.length * windows.length}${wrong.length ? `: ${wrong.slice(0, 3).join(" | ")}` : ""} · ${JSON.stringify(pinned)}`];
  });

  /* ── W3 · the slice outside the window ── */
  await claim(p(L.w3), async () => {
    const A = await person(run, 0);
    const B = await person(run, 1);
    await selfExclude(B.id, "24h");
    const rows = (t: string): SliceRecipient[] => [
      { ref: `w3_${run}_${t}_a`, msisdn: A.key, body: "50pick: tangazo." },
      { ref: `w3_${run}_${t}_b`, msisdn: B.key, body: "50pick: tangazo." },
      { ref: `w3_${run}_${t}_x`, msisdn: "12345", body: "50pick: tangazo." },
    ];
    let asked = 0;
    const counting = async (m: string) => { asked++; return mayReceiveMarketingSms(m); };
    const allHeld = (outs: SliceOutcome[], why: string): boolean => outs.length === 3 && outs.every((o) => o.outcome === "held" && o.reason === why);
    const rgBefore = await rgRowsFor(B.id);

    const nightWire = wireOf();
    const night = await impl.dispatch(rows("night"), { send: nightWire.send, gate: counting, window: ALWAYS_CLOSED });
    const askedNight = asked;
    const rgNight = await rgRowsFor(B.id);

    const blindWire = wireOf();
    const unread = await impl.dispatch(rows("unread"), { send: blindWire.send, gate: counting, window: () => W.sendWindowUnreadable() });
    const threw = await impl.dispatch(rows("threw"), { send: blindWire.send, gate: counting, window: () => { throw new Error("the window threw (fixture)"); } });
    const shapeless = await impl.dispatch(rows("shape"), { send: blindWire.send, gate: counting, window: (() => ({})) as unknown as SliceDeps["window"] });
    const askedBlind = asked - askedNight;

    // The control: the same rows inside the window — the gate asked for each, the wire once, the RG line written.
    asked = 0;
    const dayWire = wireOf();
    const day = await impl.dispatch(rows("day"), { send: dayWire.send, gate: counting, window: ALWAYS_OPEN });
    const askedDay = asked;
    const rgDay = await rgRowsFor(B.id);

    // No deps.window: the live window, judged by the dev clock seam — 03:00, then noon, then the real clock back.
    let defNight: SliceOutcome[] = [];
    let defDay: SliceOutcome[] = [];
    CLOCK.__setSendWindowClockForDev(NIGHT_EAT_MS);
    try {
      defNight = await impl.dispatch(rows("defnight"), { send: wireOf().send, gate: CLEARED });
      CLOCK.__setSendWindowClockForDev(NOON_EAT_MS);
      defDay = await impl.dispatch(rows("defday"), { send: wireOf().send, gate: CLEARED });
    } finally {
      CLOCK.__setSendWindowClockForDev(null);
    }
    const conds = {
      night: allHeld(night, "quiet_hours") && askedNight === 0 && nightWire.calls === 0 && rgNight === rgBefore,
      unreadable: allHeld(unread, "window_unreadable") && allHeld(threw, "window_unreadable") && allHeld(shapeless, "window_unreadable")
        && askedBlind === 0 && blindWire.calls === 0,
      day: day[0]?.outcome === "handed_over" && day[1]?.outcome === "skipped" && day[1].skipReason === "rg_self_excluded"
        && day[2]?.outcome === "skipped" && day[2].skipReason === "bad_msisdn" && askedDay === 3 && dayWire.calls === 1 && rgDay === rgNight + 1,
      defaultNight: allHeld(defNight, "quiet_hours"),
      defaultDay: defDay[0]?.outcome === "handed_over" && defDay[1]?.outcome === "handed_over",
    };
    const show = (outs: SliceOutcome[]) => outs.map((o) => `${o.outcome}${o.outcome === "held" ? `:${o.reason}` : o.outcome === "skipped" ? `:${o.skipReason}` : ""}`).join(",");
    return [Object.values(conds).every(Boolean),
      `${JSON.stringify(conds)} · night [${show(night)}] asked ${askedNight} wire ${nightWire.calls} · blind asked ${askedBlind} · day [${show(day)}] asked ${askedDay} wire ${dayWire.calls} · RG ${rgBefore}→${rgNight}→${rgDay} · default [${show(defNight)}] / [${show(defDay)}]`];
  });

  /* ── W4 · the test send outside the window ── */
  const officer = await person(run, 10, "GROWTH");
  // ⛔ 2026-10-09 · the typed test's officer: a role that may type a number (a GROWTH one is refused typed_role first).
  const typist = await person(run, 12, "COMPLIANCE");
  const cmp = (t: string): string => `cmp_u13_${run}_${t}`;
  const ownInput = (id: string): TestInput => ({ campaignId: id, variant: "SW" });
  const typedInput = (id: string, key: string): TestInput =>
    ({ campaignId: id, variant: "SW", recipient: { kind: "typed", number: `+${key}`, adultAttested: true, attestedVersion: 1 } }) as TestInput;
  await claim(p(L.w4), async () => {
    let gates = 0;
    const counting = async (m: string) => { gates++; return mayReceiveMarketingSms(m); };
    // Outside — the officer's own number, then a typed one — BEFORE anything has minted the officer's token.
    const night = testWorld({ window: ALWAYS_CLOSED, gate: counting });
    const own = await impl.test(ownInput(cmp("own")), officer.id, night.deps);
    const typedKey = keyOf(run, 11);
    const typed = await impl.test(typedInput(cmp("typed"), typedKey), typist.id, night.deps);
    const tokens = (await tokenCount(officer.key)) + (await tokenCount(typedKey)) + (await tokenCount(typist.key));
    const rowsClosed = smsRowsFor(cmp("own")) + smsRowsFor(cmp("typed"));
    // The control: inside the window the same test is handed over, through the real send, with its one row.
    const open = testWorld();
    const control = await impl.test(ownInput(cmp("open")), officer.id, open.deps);
    // A window that closes between the check (open) and the send (closed): dispatch's own read holds it.
    let reads = 0;
    const closing = testWorld({ window: () => (++reads === 1 ? ALWAYS_OPEN() : ALWAYS_CLOSED()) });
    const late = await impl.test(ownInput(cmp("late")), officer.id, closing.deps);
    // Hours that could not be read, and a window that throws: closed, and said as such.
    const blind = testWorld({ window: () => W.sendWindowUnreadable() });
    const unread = await impl.test(ownInput(cmp("unread")), officer.id, blind.deps);
    const thrown = testWorld({ window: () => { throw new Error("the window threw (fixture)"); } });
    const threw = await impl.test(ownInput(cmp("threw")), officer.id, thrown.deps);
    // Saved hours are said in their own words.
    const savedNight = W.sendWindowState(NIGHT_EAT_MS, SAVED);
    const saved = await impl.test(ownInput(cmp("saved")), officer.id, testWorld({ window: () => savedNight }).deps);
    const conds = {
      own: heldAs(own, QUIET) && own.target === "own",
      typed: heldAs(typed, QUIET) && typed.target === "typed",
      sentence: QUIET === TEST.testQuietHours(ALWAYS_CLOSED()),
      nothingSpent: night.n.mints === 0 && night.n.outreach === 0 && night.n.typedBudget === 0 && gates === 0,
      noToken: tokens === 0,
      noRow: rowsClosed === 0,
      audited: night.n.audits.length === 2 && auditedHeld(night.n.audits, "quiet_hours"),
      control: control.ok && control.outcome === "handed_over" && smsRowsFor(cmp("open")) === 1 && open.n.mints === 1,
      late: heldAs(late, QUIET) && smsRowsFor(cmp("late")) === 0 && reads === 2 && auditedHeld(closing.n.audits, "quiet_hours"),
      unreadable: heldAs(unread, TEST.TEST_WINDOW_UNREADABLE) && heldAs(threw, TEST.TEST_WINDOW_UNREADABLE)
        && auditedHeld(blind.n.audits, "window_unreadable") && auditedHeld(thrown.n.audits, "window_unreadable")
        && blind.n.mints === 0 && thrown.n.mints === 0,
      saved: heldAs(saved, QUIET_SAVED),
      note: COPY.composeTestWindowNote(ALWAYS_CLOSED()) === NOTE && COPY.composeTestWindowNote(ALWAYS_OPEN()) === null
        && COPY.composeTestWindowNote(W.sendWindowUnreadable()) === COPY.COMPOSE_TEST_WINDOW_UNREADABLE
        && COPY.composeTestWindowNote(savedNight) === NOTE_SAVED,
    };
    return [Object.values(conds).every(Boolean),
      `${JSON.stringify(conds)} · own ${said(own)} · typed ${said(typed)} · control ${said(control)} · late ${said(late)} · unreadable ${said(unread)} · gate asked ${gates} · tokens ${tokens} · rows ${rowsClosed}`];
  });

  /* ── W3c · SP-1 · the slice that crosses the close while its gates are asked ── */
  await claim(p(L.w3c), async () => {
    const late = W.sendWindowState(eat(19, 59, 58));
    /** A clock that reads 0 at the slice's start and `ms` at the wire — the time the gate loop took. */
    const elapsed = (ms: number) => { let n = 0; return () => (n++ === 0 ? 0 : ms); };
    const row = (t: string): SliceRecipient[] => [{ ref: `w3c_${run}_${t}`, msisdn: "255715100009", body: "50pick: tangazo." }];
    const slowWire = wireOf();
    const slow = await impl.dispatch(row("slow"), { send: slowWire.send, gate: CLEARED, window: () => late, clock: elapsed(3000) });
    const quickWire = wireOf();
    const quick = await impl.dispatch(row("quick"), { send: quickWire.send, gate: CLEARED, window: () => late, clock: elapsed(1000) });
    return [late.open && late.judgedAt === new Date(eat(19, 59, 58)).toISOString()
      && slow.length === 1 && slow[0].outcome === "held" && (slow[0] as { reason?: string }).reason === "quiet_hours" && slowWire.calls === 0
      && quick.length === 1 && quick[0].outcome === "handed_over" && quickWire.calls === 1,
      `judged ${late.judgedAt} open ${late.open} · three seconds: ${JSON.stringify(slow[0])}, wire ${slowWire.calls} · one second: ${quick[0]?.outcome}, wire ${quickWire.calls}`];
  });

  /* ── W5 · once per slice ── */
  await claim(p(L.w5), async () => {
    let reads = 0;
    const counted = (w: () => SendWindowState) => () => { reads++; return w(); };
    const five = (t: string): SliceRecipient[] => [0, 1, 2, 3, 4].map((i) => ({ ref: `w5_${run}_${t}_${i}`, msisdn: keyOf(run, 30 + i), body: "50pick: tangazo." }));
    await impl.dispatch(five("open"), { send: wireOf().send, gate: CLEARED, window: counted(ALWAYS_OPEN) });
    const openReads = reads;
    reads = 0;
    await impl.dispatch(five("closed"), { send: wireOf().send, gate: CLEARED, window: counted(ALWAYS_CLOSED) });
    const closedReads = reads;
    reads = 0;
    const handed = await impl.test(ownInput(cmp("w5")), officer.id, testWorld({ window: counted(ALWAYS_OPEN) }).deps);
    const testReads = reads;
    return [openReads === 1 && closedReads === 1 && handed.ok && testReads === 2,
      `open slice read it ${openReads}× · closed slice ${closedReads}× · the test send ${testReads}× (${said(handed)})`];
  });

  /* ── W6 · the wiring ── */
  await claim(p(L.w6), async () => {
    const src = impl.sources;
    const at = src.dispatch.indexOf("export async function dispatchSlice(");
    const body = at < 0 ? "" : src.dispatch.slice(at);
    const iRead = body.indexOf("await (deps.window ?? liveSendWindow)()");
    const iHold = body.indexOf("if (sendWindow?.open !== true)");
    const iLoop = body.indexOf("for (const row of rows)");
    const liveAt = src.dispatch.indexOf("export async function liveSendWindow(");
    const liveBody = liveAt < 0 ? "" : src.dispatch.slice(liveAt, at > liveAt ? at : undefined);
    const fnAt = src.testSend.indexOf("export async function sendCampaignTest(");
    const fn = fnAt < 0 ? "" : src.testSend.slice(fnAt);
    const iCheck = fn.indexOf("const sendWindow = await windowOf(deps);");
    const specifiers = src.window.split('from "').slice(1).map((s) => s.split('"')[0]).sort();
    // The production check flips NODE_ENV for two calls only, and always puts it back.
    const before = process.env.NODE_ENV;
    const setNodeEnv = (v: string | undefined): void => {
      const env = process.env as Record<string, string | undefined>;
      if (v === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = v;
    };
    let devSees = false;
    let prodIgnores = false;
    let prodCannotPin = false;
    try {
      CLOCK.__setSendWindowClockForDev(NIGHT_EAT_MS);
      devSees = CLOCK.sendWindowNow() === NIGHT_EAT_MS;
      setNodeEnv("production");
      const seen = CLOCK.sendWindowNow();
      prodIgnores = seen !== NIGHT_EAT_MS && Math.abs(seen - Date.now()) < MIN;
      CLOCK.__setSendWindowClockForDev(NOON_EAT_MS);
      setNodeEnv(before);
      prodCannotPin = CLOCK.sendWindowNow() === NIGHT_EAT_MS;
    } finally {
      setNodeEnv(before);
      CLOCK.__setSendWindowClockForDev(null);
    }
    let scripts: Record<string, string> = {};
    try { scripts = (JSON.parse(src.pkg) as { scripts?: Record<string, string> }).scripts ?? {}; } catch { scripts = {}; }
    const chain = (scripts.predeploy ?? "").split(" && ");
    // SP-4 · every suite that DRIVES a send path — imports dispatchSlice as a value (a destructured name: awaited, or handed
    // on as a driver), awaits it, calls sendCampaignTest or spreads the shipped test deps — imports the suites' fixed
    // windows, or it is green by day and red at night (and its red proof refuses at night).
    const DRIVES = [
      /[{][^}]*[^A-Za-z0-9_.]dispatchSlice[^A-Za-z0-9_][^}]*[}] (?:= await import|from )/, // an import of the value
      /await (?:[A-Za-z_]+[.])?dispatchSlice[(]/, /sendCampaignTest[(]/, /CAMPAIGN_TEST_DEPS/,
    ];
    const drivers = src.callers.filter((c) => DRIVES.some((r) => r.test(c.text)));
    const unpinned = drivers.filter((c) => !c.text.includes("./lib/send-window.mts")).map((c) => c.rel);
    const wiring = {
      shipped: impl.shippedWindow === D.liveSendWindow,
      checkedFirst: iCheck > 0 && fn.indexOf("deps.ensureToken(key)") > iCheck && fn.indexOf("deps.gateReads.outreach()") > iCheck
        && fn.indexOf("deps.rateTyped(officerId)") > iCheck,
      handedOn: fn.includes("{ send: deps.send, gate, window: deps.window,"),
      dispatchFirst: iRead > 0 && iHold > iRead && iLoop > iHold && src.dispatch.includes("window?: () => SendWindowState | Promise<SendWindowState>;"),
      liveFresh: liveBody.includes("read: () => Promise<SettingsReload> = reloadMarketingSmsSettings") && liveBody.includes("r.ok && r.readable")
        && liveBody.includes("sendWindowUnreadable()") && liveBody.includes("sendWindowState(now(), hours)"),
      note: src.loader.includes("windowNote: composeTestWindowNote(await liveSendWindow()),"),
      devClock: devSees && prodIgnores && prodCannotPin
        && src.dispatch.includes('import { sendWindowNow } from "@/lib/server/marketing/send-window-clock";')
        && !src.dispatch.includes("__50PICK_SEND_WINDOW_AT_MS") && !src.dispatch.includes("__setSendWindowClockForDev")
        && !src.dispatch.includes("globalThis"),
      windowPure: specifiers.join(",") === "@/lib/eat-day,@/lib/marketing/sms-settings" && !src.window.includes('"use client"')
        && !src.window.includes('"use server"') && !src.window.includes("480") && !src.window.includes("1200"),
      pinned: src.graphSafe.includes('"lib/marketing/window.ts"'),
      callersPinned: drivers.length >= 4 && unpinned.length === 0,
      scripts: scripts["test:marketing-window"] === "tsx scripts/marketing-window.test.mts"
        && scripts["red:marketing-window"] === "tsx scripts/marketing-window.test.mts --prove-red"
        && chain.filter((x) => x === "npm run test:marketing-window").length === 1
        && chain.indexOf("npm run test:marketing-window") === chain.indexOf("npm run test:marketing-settings") + 1,
    };
    return [Object.values(wiring).every(Boolean),
      `${JSON.stringify(wiring)} · window.ts imports [${specifiers.join(", ")}] · ${drivers.length} send-path drivers, unpinned [${unpinned.join(", ")}]`];
  });
}

/* ══ THE RUN ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`${NL}marketing-window: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  /* ── THE BASELINE — a plant can only "hold" against claims the real code PASSES ── */
  {
    const log = console.log;
    console.log = () => {};
    try { await runAssertions(REAL, ""); } finally { console.log = log; }
    if (fail > 0) {
      console.log(`RED CONTROL — NOT RUN: the baseline is not green (${fail} claim(s) fail for the REAL code):${NL}  ${failed.join(`${NL}  `)}`);
      process.exit(1);
    }
    console.log(`RED CONTROL — baseline green (${pass} claims pass for the real code)${NL}`);
  }

  /* ── THE PLANTS — each a defect this unit could really ship, planted in memory ── */
  /** R-W1 · the end taken inclusive: open AT 20:00:00.000 (`<=`). */
  const endInclusive: typeof W.sendWindowState = (nowMs, hours) => {
    const real = W.sendWindowState(nowMs, hours);
    const h = W.sendWindowHoursOf(hours ?? DEFAULT_HOURS);
    if (h === null || !Number.isFinite(nowMs)) return real;
    return sinceEatMidnight(nowMs) === h.windowEndMinute * MIN ? { ...real, open: true, reason: null } : real;
  };
  /** R-W1b · fails OPEN: a read that failed, or a row it could not read in full, obeyed as the default hours. */
  const failsOpen: typeof D.liveSendWindow = (readFn, now) => D.liveSendWindow(async () => {
    const stand = { ok: true as const, settings: { ...PURE.MARKETING_SMS_SETTINGS_DEFAULTS }, stored: false, readable: true };
    try {
      const r = await (readFn ?? SETTINGS.reloadMarketingSmsSettings)();
      return r.ok ? { ...r, readable: true } : stand;
    } catch {
      return stand;
    }
  }, now);
  /** R-W2 · "today" taken as the UTC day: between EAT midnight and 03:00 the next opening names a morning already past. */
  const utcDay: typeof W.sendWindowState = (nowMs, hours) => {
    const real = W.sendWindowState(nowMs, hours);
    const h = W.sendWindowHoursOf(hours ?? DEFAULT_HOURS);
    if (h === null || real.reason !== "quiet_hours") return real;
    const utcToday = Math.floor(nowMs / DAY) * DAY - EAT_OFFSET_MS + h.windowStartMinute * MIN;
    const opensAt = sinceEatMidnight(nowMs) < h.windowStartMinute * MIN ? utcToday : utcToday + DAY;
    return { ...real, opensAt: new Date(opensAt).toISOString() };
  };
  /** R-W3 · the window asked AFTER the gate: every recipient's gate asked first, then the slice held. */
  const windowAfterGate: typeof D.dispatchSlice = async (rows, deps) => {
    const ask = deps.gate ?? mayReceiveMarketingSms;
    for (const r of rows) {
      try { await ask(r.msisdn); } catch { /* the plant only asks */ }
    }
    return D.dispatchSlice(rows, deps);
  };
  /** R-W4 · the test send ignores its window — a test goes out at any hour. */
  const ignoresWindow: typeof TEST.sendCampaignTest = (input, officerId, deps = TEST.CAMPAIGN_TEST_DEPS, options) =>
    TEST.sendCampaignTest(input, officerId, { ...deps, window: ALWAYS_OPEN }, options);
  /** R-W3c · the wire re-check blind to time: the slice's clock never moves, so a slice that crossed 20:00 still sends. */
  const stoppedClock: typeof D.dispatchSlice = (rows, deps) => D.dispatchSlice(rows, { ...deps, clock: () => 0 });
  /** R-W5 · the window read per recipient, not once per slice. */
  const perRow: typeof D.dispatchSlice = async (rows, deps) => {
    for (let i = 0; i < rows.length; i++) await deps.window?.();
    return D.dispatchSlice(rows, deps);
  };

  type Plant = { name: string; expect: RegExp; impl: Impl; landed: () => Promise<boolean>; landedAs: string };
  const plants: Plant[] = [
    { name: "R-W1 · an off-by-one at 20:00 (the end taken with <=)", expect: /^W1 ·/, impl: { ...REAL, state: endInclusive },
      landed: async () => endInclusive(eat(20, 0)).open && !W.sendWindowState(eat(20, 0)).open, landedAs: "20:00:00.000 reads open" },
    { name: "R-W1b · the live reader fails OPEN — an unreadable row obeyed as the default hours", expect: /^W1b ·/, impl: { ...REAL, live: failsOpen },
      landed: async () => (await failsOpen(async () => ({ ok: false as const, error: "fixture" }), () => NOON_EAT_MS)).open === true,
      landedAs: "a read that failed reads open at noon" },
    { name: "R-W2 · the next opening taken on the UTC day", expect: /^W2 ·/, impl: { ...REAL, state: utcDay },
      landed: async () => Date.parse(utcDay(eat(0, 30, 0, 8)).opensAt) < eat(0, 30, 0, 8), landedAs: "at 00:30 EAT the opening is already past" },
    { name: "R-W3 · the window asked after the gate", expect: /^W3 ·/, impl: { ...REAL, dispatch: windowAfterGate },
      landed: async () => {
        let asked = 0;
        const counting = async () => { asked++; return CLEARED(); };
        await windowAfterGate([{ ref: "rw3", msisdn: "255715100000", body: "50pick: x" }], { send: wireOf().send, gate: counting, window: ALWAYS_CLOSED });
        return asked === 1;
      },
      landedAs: "a closed window still has the gate asked" },
    { name: "R-W4 · the test send ignores deps.window", expect: /^W4 ·/, impl: { ...REAL, test: ignoresWindow },
      landed: async () => {
        const o = await person(++RUN, 40, "GROWTH");
        const r = await ignoresWindow({ campaignId: `cmp_u13_${RUN}_landed`, variant: "SW" }, o.id, testWorld({ window: ALWAYS_CLOSED, send: wireOf().send }).deps);
        return r.ok;
      },
      landedAs: "with the window closed the plant hands a test over" },
    { name: "R-W3c · the wire re-check blind to the slice's elapsed time — a slice judged at 19:59:58 sends at 20:00:01", expect: /^W3c ·/, impl: { ...REAL, dispatch: stoppedClock },
      landed: async () => {
        const w = wireOf();
        let n = 0;
        await stoppedClock([{ ref: "rw3c", msisdn: "255715100008", body: "50pick: x" }],
          { send: w.send, gate: CLEARED, window: () => W.sendWindowState(eat(19, 59, 58)), clock: () => (n++ === 0 ? 0 : 3000) });
        return w.calls === 1;
      },
      landedAs: "a slice three seconds past the close still reaches the wire" },
    { name: "R-W5 · the window read per row", expect: /^W5 ·/, impl: { ...REAL, dispatch: perRow },
      landed: async () => {
        let n = 0;
        await perRow([{ ref: "rw5a", msisdn: "255715100001", body: "50pick: x" }, { ref: "rw5b", msisdn: "255715100002", body: "50pick: x" }],
          { send: wireOf().send, gate: CLEARED, window: () => { n++; return ALWAYS_OPEN(); } });
        return n === 3;
      },
      landedAs: "two rows read the window three times" },
    { name: "R-W6b · SP-4 · a suite drives dispatchSlice with no fixed window — green by day, red at night", expect: /^W6 ·/,
      impl: { ...REAL, sources: { ...REAL.sources, callers: REAL.sources.callers.map((c) => c.rel === "scripts/campaign-privacy.test.mts"
        ? { ...c, text: c.text.split("./lib/send-window.mts").join("./lib/no-window.mts") } : c) } },
      landed: async () => REAL.sources.callers.some((c) => c.rel === "scripts/campaign-privacy.test.mts" && c.text.includes("./lib/send-window.mts")),
      landedAs: "the privacy suite's window import is gone from the walk" },
    { name: "R-W6 · the shipped test send wired to an always-open window", expect: /^W6 ·/, impl: { ...REAL, shippedWindow: ALWAYS_OPEN },
      landed: async () => REAL.shippedWindow === D.liveSendWindow && (ALWAYS_OPEN as unknown) !== D.liveSendWindow,
      landedAs: "the shipped wire is the live reader, and the plant's is not" },
  ];

  console.log(`RED CONTROL — each defect planted in memory must fire its own claim${NL}`);
  let held = 0;
  const missed: string[] = [];
  for (const plant of plants) {
    let landed = false;
    try { landed = await plant.landed(); } catch { landed = false; }
    pass = 0; fail = 0; failed.length = 0;
    const log = console.log;
    console.log = () => {};
    try { await runAssertions(plant.impl, ""); } finally { console.log = log; }
    const fired = failed.some((l) => plant.expect.test(l));
    if (landed && fired) { held++; console.log(`  held  ${plant.name}`); }
    else {
      missed.push(plant.name);
      console.log(`  FAIL  ${plant.name} — ${landed ? `${plant.expect} did not fire (failed: ${failed.join(" | ") || "nothing"})` : `the plant did not land (${plant.landedAs})`}`);
    }
  }
  console.log(`${NL}RED CONTROL — ${held} of ${plants.length} proofs held${missed.length ? `; ${missed.length} FAILED` : ""}`);
  process.exitCode = missed.length === 0 ? 0 : 1;
}
