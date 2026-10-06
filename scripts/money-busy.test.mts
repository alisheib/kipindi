/**
 * test:money-busy — U43y's guard (ENGINE-SPEC §4.11, E12): the ONE busy signal a marketing send reads before it claims
 * anyone, the three money files that feed it, and the one declaration that types it.
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script: two REAL module instances of money-busy.ts (loaded
 * twice, as `test:rbac` §14 loads a second rbac); the REAL bet admission gate, every slot held and then one bet queued;
 * the REAL market fire gate and the REAL Up & Down chain gate, each in two REAL module instances; and the eight mirror
 * statements EXECUTED exactly as their files spell them — each read from the source beside its flip and run in strict
 * mode, as the ES module runs it, a gate's release inside the same function scope as its acquire, as the file's own
 * closure runs it. Then the source, for what only the source can show: where each mirror sits, who names the signal,
 * and which TypeScript programs can see its type.
 *
 * §Y1 two instances, one signal · §Y2 each source alone, with its why, and the default clock · §Y3 the stale rule ·
 * §Y4 where the mirrors sit · §Y5 fires are sums of their own starts · §Y6 the writers and the declaration are pinned ·
 * §Y7 a mirror cannot throw, the reader cannot write · §Y8 the wiring · Y0 every assertion ran.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION (ENGINE-SPEC §5.3). `--prove-red` plants each defect IN MEMORY — a source text, a reader,
 * the src population, a tsconfig, the wiring — and requires the MATCHING assertion to fail. This file writes no file,
 * opens no database, sends nothing and moves no money: the admission slots it holds run no bet, the fire slots settle
 * no market and the chain slots advance no chain.
 * ⛔ It holds no backslash and no regular expression (the tools that write this repository decode escapes): characters
 * are built with String.fromCharCode.
 *
 * Run:  npm run test:money-busy
 * Red:  npm run red:money-busy
 */
process.exitCode = 1;

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment, blankLiterals } from "./lib/decomment.mts";
import * as M1 from "../src/lib/server/money-busy.ts";
import type { MoneyBusy, MoneyBusyWhy, MoneyChore, MoneyChoresView } from "../src/lib/server/money-busy.ts";
import { admissionSnapshot, withAdmission, __resetAdmission } from "../src/lib/server/admission.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const lf = (s: string): string => s.split(CR).join("");
const readRaw = (rel: string): string => lf(readFileSync(join(ROOT, rel), "utf8"));
const MIN = 60_000;

const TOKEN = "__50PICK_MONEY_CHORES";
const LIFECYCLE = "src/lib/server/lifecycle.ts";
const SCHEDULER = "src/lib/server/market-scheduler.ts";
const UPDOWN = "src/lib/server/updown-scheduler.ts";
const MONEY_BUSY = "src/lib/server/money-busy.ts";
const DECLARATION = "src/lib/server/money-chores.d.ts";

/**
 * ⛔ THE FILES ALLOWED TO WRITE THE SIGNAL — exactly three: the two ENGINE-SPEC §4.11 D1 names, and the Up & Down chain
 * gate U43y's review added (U43Y-SM-01). A further file that names it, in any form this text pin can see (an assignment,
 * a computed key spelled out), fails §Y6.1. A dev toggle for the live page's drive (U47b) must hold a REAL slot instead —
 * `withFireSlot`, `withChainSlot` or `withAdmission` from a dev-only route — so a real writer feeds the signal and
 * nothing new writes it.
 */
export const MONEY_CHORES_WRITERS: readonly string[] = [LIFECYCLE, SCHEDULER, UPDOWN];
/** The one file that may name the signal to read it: its reader (§Y6.3 counts its one mention). */
export const MONEY_CHORES_READER = MONEY_BUSY;
/** The one file that declares the signal's type (§Y6.5) — it imports nothing, so any TypeScript program can hold it. */
export const MONEY_CHORES_DECLARATION = DECLARATION;

/* ═══ THE EIGHT MIRRORS — byte for byte as their files spell them. §Y4 holds each beside its flip; §Y1, §Y2, §Y5 and
   §Y7 EXECUTE whatever sits beside the flip, so a red case that edits a mirror's text is executed as edited. ═══ */

type WriterFile = "lifecycle" | "scheduler" | "updown";
type MirrorSpec = { id: string; file: WriterFile; flip: string; text: string };
type MirrorKey =
  | "lifecycleSet" | "lifecycleClear" | "depositsSet" | "depositsClear"
  | "fireAcquire" | "fireRelease" | "chainAcquire" | "chainRelease";
const MIRRORS: Record<MirrorKey, MirrorSpec> = {
  lifecycleSet: {
    id: "lifecycle.set", file: "lifecycle", flip: "running = true;",
    text: "try { (globalThis.__50PICK_MONEY_CHORES ??= {}).lifecycleSince = Date.now(); } catch { /* U43y mirror — never stops the pass */ }",
  },
  lifecycleClear: {
    id: "lifecycle.clear", file: "lifecycle", flip: "running = false;",
    text: "try { (globalThis.__50PICK_MONEY_CHORES ??= {}).lifecycleSince = 0; } catch { /* U43y mirror */ }",
  },
  depositsSet: {
    id: "deposits.set", file: "lifecycle", flip: "depositPolling = true;",
    text: "try { (globalThis.__50PICK_MONEY_CHORES ??= {}).depositsSince = Date.now(); } catch { /* U43y mirror — never stops the poll */ }",
  },
  depositsClear: {
    id: "deposits.clear", file: "lifecycle", flip: "depositPolling = false;",
    text: "try { (globalThis.__50PICK_MONEY_CHORES ??= {}).depositsSince = 0; } catch { /* U43y mirror */ }",
  },
  fireAcquire: {
    id: "fires.acquire", file: "scheduler", flip: "firesInFlight++;",
    text: "let firedAt = 0; try { firedAt = Date.now(); ((globalThis.__50PICK_MONEY_CHORES ??= {}).marketFires ??= []).push(firedAt); } catch { /* U43y mirror — never leaks a slot */ }",
  },
  fireRelease: {
    id: "fires.release", file: "scheduler", flip: "firesInFlight--;",
    text: "try { const fires = globalThis.__50PICK_MONEY_CHORES?.marketFires; const own = fires ? fires.indexOf(firedAt) : -1; if (fires && own >= 0) fires.splice(own, 1); } catch { /* U43y mirror — never strands a waiter */ }",
  },
  chainAcquire: {
    id: "chains.acquire", file: "updown", flip: "inFlight++;",
    text: "let firedAt = 0; try { firedAt = Date.now(); ((globalThis.__50PICK_MONEY_CHORES ??= {}).updownFires ??= []).push(firedAt); } catch { /* U43y mirror — never leaks a slot */ }",
  },
  chainRelease: {
    id: "chains.release", file: "updown", flip: "inFlight--;",
    text: "try { const fires = globalThis.__50PICK_MONEY_CHORES?.updownFires; const own = fires ? fires.indexOf(firedAt) : -1; if (fires && own >= 0) fires.splice(own, 1); } catch { /* U43y mirror — never strands a waiter */ }",
  },
};

/* ═══ THE WORLD — the readers, the source texts, the tsconfigs, the src population and the wiring, each swappable by a
   red case ═══ */

type Reader = (nowMs: number) => MoneyBusy;
type Impl = {
  /** Two module instances' readers — §Y1 asks both. */
  readers: readonly [Reader, Reader];
  /** The reader every other section asks. */
  read: Reader;
  /** Both instances asked with NO argument — the production call, on the default clock (§Y2.8). */
  readDefault: readonly [() => MoneyBusy, () => MoneyBusy];
  view: () => MoneyChoresView;
  src: Record<WriterFile | "moneyBusy" | "declaration", string>;
  /** Every tsconfig*.json at the repository root, as text (§Y6.5). */
  tsconfigs: ReadonlyArray<{ path: string; text: string }>;
  population: ReadonlyArray<{ path: string; code: string }>;
  wiring: { predeploy: string; test: string | null; red: string | null };
};

/** Every src file that names the signal or a lifecycle runner, decommented — the §Y4.5 and §Y6 population. */
const NEEDLES = [TOKEN, "runLifecyclePass", "startLifecycleTicker"];
const SRC_EXT = [".ts", ".tsx", ".mts", ".js", ".mjs", ".cjs"];
function srcPopulation(): Array<{ path: string; code: string }> {
  const out: Array<{ path: string; code: string }> = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const at = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") walk(at); continue; }
      if (!SRC_EXT.some((x) => e.name.endsWith(x))) continue;
      const text = lf(readFileSync(at, "utf8"));
      if (!NEEDLES.some((n) => text.includes(n))) continue;
      out.push({ path: relative(ROOT, at).split(sep).join("/"), code: decomment(text) });
    }
  };
  walk(join(ROOT, "src"));
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function readWiring(): Impl["wiring"] {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts?: Record<string, string> };
    const s = pkg.scripts ?? {};
    return { predeploy: s.predeploy ?? "", test: s["test:money-busy"] ?? null, red: s["red:money-busy"] ?? null };
  } catch {
    return { predeploy: "", test: null, red: null };
  }
}

/** Every tsconfig*.json at the repository root — each is a TypeScript program some command type-checks. */
function readTsconfigs(): Array<{ path: string; text: string }> {
  return readdirSync(ROOT)
    .filter((n) => n.startsWith("tsconfig") && n.endsWith(".json"))
    .sort()
    .map((n) => ({ path: n, text: lf(readFileSync(join(ROOT, n), "utf8")) }));
}

// The SECOND module instance of money-busy.ts — a distinct module URL, which is exactly what a second bundle is.
const M2 = (await import(new URL("../src/lib/server/money-busy.ts", import.meta.url).href + "?instance=second-bundle")) as typeof M1;

// Two REAL module instances of each gate (§Y5.2, §Y5.4). Their graphs read these lazily; set as `test:settlement-gate`
// and `test:updown-tick-cadence` set them.
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";
type Scheduler = typeof import("../src/lib/server/market-scheduler.ts");
const schedulerUrl = new URL("../src/lib/server/market-scheduler.ts", import.meta.url).href;
const S1 = (await import(schedulerUrl)) as Scheduler;
const S2 = (await import(schedulerUrl + "?instance=second-bundle")) as Scheduler;
type Chains = typeof import("../src/lib/server/updown-scheduler.ts");
const chainsUrl = new URL("../src/lib/server/updown-scheduler.ts", import.meta.url).href;
const U1 = (await import(chainsUrl)) as Chains;
const U2 = (await import(chainsUrl + "?instance=second-bundle")) as Chains;

const REAL: Impl = {
  readers: [M1.moneyBusy, M2.moneyBusy],
  read: M1.moneyBusy,
  readDefault: [() => M1.moneyBusy(), () => M2.moneyBusy()],
  view: M1.readMoneyChores,
  src: {
    lifecycle: readRaw(LIFECYCLE),
    scheduler: readRaw(SCHEDULER),
    updown: readRaw(UPDOWN),
    moneyBusy: readRaw(MONEY_BUSY),
    declaration: readRaw(DECLARATION),
  },
  tsconfigs: readTsconfigs(),
  population: srcPopulation(),
  wiring: readWiring(),
};

/* ═══ THE MACHINERY ═══ */

const signalSlot = globalThis as unknown as Record<string, unknown>;
/** The suite as a FIXTURE writer (§Y3, §Y7): scripts are not production, and §Y6 pins src only. */
const plantSignal = (v: unknown): void => { signalSlot[TOKEN] = v; };
const resetSignal = (): void => { signalSlot[TOKEN] = undefined; };
type SignalShape = { lifecycleSince?: number; depositsSince?: number; marketFires?: number[]; updownFires?: number[] };
/** The signal as the writers left it — the object itself, not a copy. */
const current = (): SignalShape | undefined => signalSlot[TOKEN] as SignalShape | undefined;

type Located = { line: number; statement: string | null; adjacent: string };
/**
 * The code line right after a mirror's flip. `statement` is that line as the file spells it when it is a mirror (it
 * names the signal, or a module-scope stand-in a red case plants) and null otherwise — a mirror that is not there
 * writes nothing. `line` is -1 unless the flip is found exactly once in code (a comment does not count).
 */
function locate(src: string, m: MirrorSpec): Located {
  const raw = src.split(LF);
  const code = decomment(src).split(LF);
  const flips: number[] = [];
  code.forEach((l, i) => { if (l.trim() === m.flip) flips.push(i); });
  if (flips.length !== 1) return { line: -1, statement: null, adjacent: `${flips.length} line(s) read "${m.flip}"` };
  let j = flips[0] + 1;
  while (j < code.length && code[j].trim() === "") j++;
  const adjacent = (raw[j] ?? "").trim();
  const isMirror = adjacent.includes(TOKEN) || adjacent.includes("moduleChores");
  return { line: j, statement: isMirror ? adjacent : null, adjacent };
}

type Scope = { firesInFlight: number; inFlight: number; moduleChores: Record<string, unknown> };
/** One writer MODULE INSTANCE: its own gate counts and its own module scope. */
const scope = (): Scope => ({ firesInFlight: 0, inFlight: 0, moduleChores: {} });
/** What a mirror's `Date.now()` reads: the real clock, or one set by hand (§Y5.3). */
type Clock = { now: () => number };
const REAL_CLOCK: Clock = { now: () => Date.now() };

/**
 * Run mirror text as its file spells it — in STRICT mode, as the ES module runs it — inside one writer instance:
 * `firesInFlight` and `inFlight` are that instance's own counts (read after the ++ or --, where the statement sits),
 * `moduleChores` its own module scope, and `Date` the clock. The real statements touch none of the counts or the scope;
 * a planted one may. `tail` runs after it, in the SAME function scope.
 */
function run(statement: string | null, s: Scope, clock: Clock, tail = ""): unknown {
  const body = "'use strict';" + LF + (statement ?? "") + LF + tail;
  return new Function("firesInFlight", "inFlight", "moduleChores", "Date", body)(s.firesInFlight, s.inFlight, s.moduleChores, clock);
}
const stmt = (impl: Impl, m: MirrorSpec): string | null => locate(impl.src[m.file], m).statement;

type Release = () => void;
/**
 * Take one slot of a gate as its money file takes it: the count goes up, the acquire mirror runs, and the release
 * closure is made IN THE SAME FUNCTION SCOPE — as `acquireFireSlot` and the chain gate's `acquire` make theirs — so the
 * start an acquire keeps is the one its release sees. What it returns lowers the count and runs the release mirror.
 */
function slot(impl: Impl, s: Scope, clock: Clock, gate: "fire" | "chain"): Release {
  const acquire = gate === "fire" ? MIRRORS.fireAcquire : MIRRORS.chainAcquire;
  const release = gate === "fire" ? MIRRORS.fireRelease : MIRRORS.chainRelease;
  const count: "firesInFlight" | "inFlight" = gate === "fire" ? "firesInFlight" : "inFlight";
  s[count]++;
  const tail = "return (firesInFlight, inFlight) => {" + LF + (stmt(impl, release) ?? "") + LF + "};";
  const onRelease = run(stmt(impl, acquire), s, clock, tail) as (firesInFlight: number, inFlight: number) => void;
  return () => { s[count]--; onRelease(s.firesInFlight, s.inFlight); };
}

/** The flips, as each money file makes them — then whatever mirror sits beside each flip. */
const W = {
  passStart: (impl: Impl, s: Scope, clock: Clock = REAL_CLOCK): void => { run(stmt(impl, MIRRORS.lifecycleSet), s, clock); },
  passEnd: (impl: Impl, s: Scope, clock: Clock = REAL_CLOCK): void => { run(stmt(impl, MIRRORS.lifecycleClear), s, clock); },
  pollStart: (impl: Impl, s: Scope, clock: Clock = REAL_CLOCK): void => { run(stmt(impl, MIRRORS.depositsSet), s, clock); },
  pollEnd: (impl: Impl, s: Scope, clock: Clock = REAL_CLOCK): void => { run(stmt(impl, MIRRORS.depositsClear), s, clock); },
  /** A market fire takes a slot; call what it returns to release it. */
  fire: (impl: Impl, s: Scope, clock: Clock = REAL_CLOCK): Release => slot(impl, s, clock, "fire"),
  /** An Up & Down chain fire takes a slot; call what it returns to release it. */
  chain: (impl: Impl, s: Scope, clock: Clock = REAL_CLOCK): Release => slot(impl, s, clock, "chain"),
};

/** One spelling of a verdict, so a comparison is one string. ⛔ ONE definition. */
const k = (why: MoneyBusyWhy | null, ...stale: MoneyChore[]): string => `${why ? `busy:${why}` : "idle"} stale(${stale.join(",")})`;
const key = (r: MoneyBusy): string => k(r.busy ? r.why : null, ...r.stale);

/** A promise that resolves when told to — a bet or a fire held open. */
const held = (): { wait: Promise<void>; open: () => void } => {
  let open: () => void = () => {};
  const wait = new Promise<void>((resolve) => { open = resolve; });
  return { wait, open: () => open() };
};

/** Wait until the clock has passed `at`, so the next start is a different number — bounded, it never hangs. */
const pastMs = async (at: number): Promise<void> => {
  for (let i = 0; i < 200 && Date.now() <= at; i++) await new Promise<void>((resolve) => setTimeout(resolve, 2));
};

const QUOTES = ['"', "'", "`"];
/**
 * Every module specifier a code text names — `from`, `import(`, `require(` and a bare side-effect `import` — in ANY of
 * the three quotes (U43Y-SM-08: a single-quoted import is still an import). ⛔ ONE definition: §Y6.4 and §Y6.5 call it.
 */
function importsOf(code: string): string[] {
  const out: string[] = [];
  for (const lead of ["from ", "import(", "require(", "import "]) {
    for (let i = code.indexOf(lead); i >= 0; i = code.indexOf(lead, i + lead.length)) {
      let at = i + lead.length;
      while (code[at] === " ") at++;
      const quote = code[at];
      if (!QUOTES.includes(quote)) continue;
      const end = code.indexOf(quote, at + 1);
      if (end > at) out.push(code.slice(at + 1, end));
    }
  }
  return out;
}

const identChar = (c: string | undefined): boolean =>
  c !== undefined && c.length === 1 && ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_" || c === "$");
/** Does `code` name `name` as a whole word — a call, a reference handed on, an import aliased or not (U43Y-SM-09)? */
function namesWord(code: string, name: string): boolean {
  for (let i = code.indexOf(name); i >= 0; i = code.indexOf(name, i + 1)) {
    if (!identChar(code[i - 1]) && !identChar(code[i + name.length])) return true;
  }
  return false;
}

/**
 * Does one tsconfig's own program hold the declaration — by name, or through a glob over `src`? A config that sets
 * neither `include` nor `files` inherits its base's, or TypeScript's default of the whole tree, so it sees it too. A
 * config that cannot be read is blind, loudly.
 */
function seesDeclaration(text: string): boolean {
  let cfg: { include?: unknown; files?: unknown };
  try {
    cfg = JSON.parse(decomment(text)) as typeof cfg;
  } catch {
    return false;
  }
  if (cfg.include === undefined && cfg.files === undefined) return true;
  const listed = [cfg.include, cfg.files].flatMap((x) => (Array.isArray(x) ? x.map(String) : []));
  const covering = [DECLARATION, "./" + DECLARATION, "src/**/*.ts", "./src/**/*.ts", "src/**/*", "./src/**/*", "**/*", "**/*.ts"];
  return listed.some((x) => covering.includes(x));
}

let pass = 0, fail = 0;
const failed: string[] = [];
const seen = new Set<string>();
const ok = (label: string, cond: boolean, detail = ""): void => {
  seen.add(label);
  if (cond) pass++; else { fail++; failed.push(label); }
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};

/** Every label, once — the red cases name the one they must turn. */
const L = {
  y1control: "Y1 · CONTROL · the second import of money-busy.ts IS a separate module instance (its functions are not the first's) — else Y1 proves nothing",
  y1: "Y1 ⭐ two module instances read ONE signal — a lifecycle pass and a market fire, each mirrored by ANOTHER module instance exactly as its file spells it, make both say busy with the right why, and both idle again after",
  y2lifecycle: "Y2.1 a lifecycle pass alone makes marketing wait (why lifecycle), and its clear lets it go",
  y2deposits: "Y2.2 the deposit/payout poll alone makes marketing wait (why deposits), and its clear lets it go",
  y2fires: "Y2.3 a market fire alone makes marketing wait (why market_fires), and its release lets it go",
  y2chains: "Y2.4 an Up & Down chain fire alone makes marketing wait (why updown_fires), and its release lets it go — a RUNNING chain settles its rounds there (U43Y-SM-01)",
  y2full: "Y2.5 the REAL bet admission gate at its ceiling — every slot held, nobody queued — makes marketing wait (why admission_full)",
  y2bets: "Y2.6 ⭐ one bet queued behind the full gate makes marketing wait (why bets_waiting — bets are reported first)",
  y2idle: "Y2.7 every bet through and every chore idle: marketing may claim (not busy, nothing stale)",
  y2clock: "Y2.8 moneyBusy() with NO argument — the production call — judges by the real clock: a pass begun now reads busy (why lifecycle) in both instances, and idle once it ends (U43Y-SM-06)",
  y3old: "Y3.1 ⭐ a chore flag older than 10 minutes is IGNORED and reported stale — at exactly 10 minutes it still holds marketing",
  y3fires: "Y3.2 fire starts are judged ONE BY ONE, market and Up & Down alike: busy while ANY start is within 10 minutes, every other start ignored and reported stale — all old → not busy; one fresh beside an old one, or beside one dated far AHEAD, → busy, the other one said",
  y3mixed: "Y3.3 a stale flag never hides a live one — a stale deposit poll beside a live market fire still waits (why market_fires, stale deposits)",
  y3ahead: "Y3.4 a flag dated more than 10 minutes AHEAD is ignored and reported stale too — a clock step cannot hold marketing off",
  y4mirrors: "Y4.1 ⭐ each of the eight mirrors is the code line right after its flip, byte for byte, and appears once",
  y4finally: "Y4.2 ⭐ both clears sit inside the SAME finally as their flip — a pass or a poll that throws still clears its flag",
  y4lease: "Y4.3 the lifecycle mirror is set only after the leadership lease — a standby container never reads busy",
  y4gate: "Y4.4 in BOTH gates the acquire mirror comes after the wait (a queued fire is not in flight) and the release mirror after the released guard (a double release cannot take back twice)",
  y4premise: "Y4.5 ONE module instance runs the lifecycle chores — outside lifecycle.ts, startLifecycleTicker is named only by instrumentation.ts and runLifecyclePass by nobody, as a call, a reference handed on or an import aliased or not — the premise that makes a since-stamp exact (U43Y-SM-09)",
  y5sum: "Y5.1 ⭐ market fires and Up & Down chain fires are SUMS across module instances — two writer instances in flight read 2; one released, the other still reads busy",
  y5real: "Y5.2 ⭐ the REAL market fire gate in two REAL module instances — the signal counts both fires, then one (the later one's release took back its OWN start), then none; a fire waiting at the cap is not counted; drained to 0",
  y5own: "Y5.3 ⭐ each release takes back its OWN start — a fire that never finishes, market or Up & Down, goes stale ten minutes after its own start while other fires keep starting and finishing beside it (U43Y-MPS-2)",
  y5chains: "Y5.4 the REAL Up & Down chain gate in two REAL module instances — the signal counts both, then one (its own start taken back), then none; a chain fire waiting at the cap is not counted; drained to 0",
  y6pop: "Y6.1 ⛔ the signal is named by exactly five src files — its three writers (lifecycle.ts, market-scheduler.ts, updown-scheduler.ts), its reader (money-busy.ts) and its declaration (money-chores.d.ts)",
  y6count: "Y6.2 each writer names it only in its mirrors — lifecycle.ts 4 times, market-scheduler.ts twice, updown-scheduler.ts twice",
  y6reader: "Y6.3 ⛔ money-busy.ts names it ONCE — one plain read — it never declares, creates, writes or freezes the signal",
  y6imports: "Y6.4 money-busy.ts imports only admission (never a writer), and no money file imports money-busy or the declaration, in any quote — a money path never depends on the marketing side",
  y6decl: "Y6.5 ⛔ the global's TYPE lives in money-chores.d.ts — declared once, importing nothing — and every tsconfig at the root sees it, by name or through a glob over src, so no TypeScript program that loads a writer can miss it (U43Y-MPS-1: test:backup's program reached market-scheduler.ts without it)",
  y7throw: "Y7.1 ⭐ no mirror can throw — each of the eight, executed as written against hostile signals (a number, a string, frozen, a frozen list, a list that is not one, throwing accessors, a throwing proxy, a frozen list holding a release's own start), returns quietly",
  y7ro: "Y7.2 ⭐ the reader changes nothing — the same object, the same lists in the same order, the same values — and an absent signal stays absent",
  y7copy: "Y7.3 the view is a copy — changing it changes nothing the writers keep",
  y7malformed: "Y7.4 a malformed signal reads as nothing running and never throws; a fire whose start cannot be read is ignored and reported stale",
  y8: "Y8 ⭐ test:money-busy runs this file and is on the predeploy chain; red:money-busy runs it with --prove-red — a gate outside the pipeline is not a gate",
  y0: "Y0 · every labelled assertion above ran — a section that stops running is not a section that passes",
};

/* ═══ THE ASSERTIONS ═══ */

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (l: string): string => tag + l;
  /** A section that throws fails every label it had not reached — never the whole run. */
  const section = async (labels: string[], body: () => Promise<void> | void): Promise<void> => {
    try {
      await body();
    } catch (e) {
      for (const l of labels) if (!seen.has(p(l))) ok(p(l), false, `the section threw: ${(e as Error)?.message ?? String(e)}`);
    } finally {
      resetSignal();
    }
  };
  resetSignal();
  __resetAdmission();

  // ── §Y1 · two module instances, one signal ──────────────────────────────────────────────────────────────────────
  await section([L.y1control, L.y1], () => {
    const [r1, r2] = impl.readers;
    ok(p(L.y1control), r1 !== r2 && M2.moneyBusy !== M1.moneyBusy && M2.readMoneyChores !== M1.readMoneyChores);
    const both = (): string => `${key(r1(Date.now()))} | ${key(r2(Date.now()))}`;
    const steps: string[] = [both()];
    const ticker = scope(); // instrumentation's instance of lifecycle.ts
    W.passStart(impl, ticker); steps.push(both());
    W.passEnd(impl, ticker); steps.push(both());
    const action = scope(); // a server action's instance of market-scheduler.ts
    const release = W.fire(impl, action); steps.push(both());
    release(); steps.push(both());
    const pair = (s: string): string => `${s} | ${s}`;
    const want = [pair(k(null)), pair(k("lifecycle")), pair(k(null)), pair(k("market_fires")), pair(k(null))];
    ok(p(L.y1), steps.join(" → ") === want.join(" → "), steps.join(" → "));
  });

  // ── §Y2 · each source alone makes it busy, with its why ─────────────────────────────────────────────────────────
  await section([L.y2lifecycle, L.y2deposits, L.y2fires, L.y2chains, L.y2full, L.y2bets, L.y2idle, L.y2clock], async () => {
    const at = (): string => key(impl.read(Date.now()));
    const s = scope();
    W.passStart(impl, s); const lcOn = at(); W.passEnd(impl, s); const lcOff = at();
    ok(p(L.y2lifecycle), lcOn === k("lifecycle") && lcOff === k(null), `${lcOn} → ${lcOff}`);
    W.pollStart(impl, s); const dOn = at(); W.pollEnd(impl, s); const dOff = at();
    ok(p(L.y2deposits), dOn === k("deposits") && dOff === k(null), `${dOn} → ${dOff}`);
    const fire = W.fire(impl, s); const fOn = at(); fire(); const fOff = at();
    ok(p(L.y2fires), fOn === k("market_fires") && fOff === k(null), `${fOn} → ${fOff}`);
    const chain = W.chain(impl, s); const cOn = at(); chain(); const cOff = at();
    ok(p(L.y2chains), cOn === k("updown_fires") && cOff === k(null), `${cOn} → ${cOff}`);

    // The REAL admission gate: every slot taken by a bet that waits on `gate`, then one more that must queue.
    __resetAdmission();
    const cap = admissionSnapshot().limits.maxInFlight;
    const gate = held();
    const bets: Array<Promise<unknown>> = [];
    try {
      for (let i = 0; i < cap; i++) bets.push(withAdmission(() => gate.wait));
      const sf = admissionSnapshot();
      const full = at();
      ok(p(L.y2full), full === k("admission_full") && sf.inFlight === cap && sf.queueDepth === 0,
        `${full} · ${sf.inFlight}/${cap} in flight, ${sf.queueDepth} queued`);
      bets.push(withAdmission(() => gate.wait));
      const sq = admissionSnapshot();
      const queued = at();
      ok(p(L.y2bets), queued === k("bets_waiting") && sq.queueDepth === 1,
        `${queued} · ${sq.inFlight}/${cap} in flight, ${sq.queueDepth} queued`);
    } finally {
      gate.open();
      await Promise.allSettled(bets);
    }
    const sa = admissionSnapshot();
    const idle = at();
    ok(p(L.y2idle), idle === k(null) && sa.inFlight === 0 && sa.queueDepth === 0, `${idle} · ${sa.inFlight} in flight, ${sa.queueDepth} queued`);
    __resetAdmission();

    // The production call takes NO argument: a pass begun now must read busy by the real clock, in both instances.
    W.passStart(impl, s);
    const on = impl.readDefault.map((r) => key(r()));
    W.passEnd(impl, s);
    const off = impl.readDefault.map((r) => key(r()));
    ok(p(L.y2clock), on.join(" | ") === `${k("lifecycle")} | ${k("lifecycle")}` && off.join(" | ") === `${k(null)} | ${k(null)}`,
      `${on.join(" | ")} → ${off.join(" | ")}`);
  });

  // ── §Y3 · the stale rule ────────────────────────────────────────────────────────────────────────────────────────
  await section([L.y3old, L.y3fires, L.y3mixed, L.y3ahead], () => {
    const t0 = Date.now();
    const S = M1.MONEY_CHORE_STALE_MS;
    const read = (signal: unknown, atMs: number): string => { plantSignal(signal); return key(impl.read(atMs)); };
    const lcEdge = read({ lifecycleSince: t0 }, t0 + S);
    const lcOld = read({ lifecycleSince: t0 }, t0 + S + 1);
    const dOld = read({ depositsSince: t0 }, t0 + S + 1);
    ok(p(L.y3old), S === 10 * MIN && lcEdge === k("lifecycle") && lcOld === k(null, "lifecycle") && dOld === k(null, "deposits"),
      `limit ${S / MIN} min · a pass at 10:00 ${lcEdge} · at 10:00.001 ${lcOld} · a poll at 10:00.001 ${dOld}`);
    const allOld = read({ marketFires: [t0 - 20 * MIN, t0 - 11 * MIN] }, t0);
    const besideOld = read({ marketFires: [t0 - 20 * MIN, t0 - MIN] }, t0);
    const besideAhead = read({ marketFires: [t0 + 20 * MIN, t0 - 1000] }, t0);
    const chainsOld = read({ updownFires: [t0 - 11 * MIN] }, t0);
    const chainsBesideOld = read({ updownFires: [t0 - 20 * MIN, t0 - MIN] }, t0);
    ok(p(L.y3fires),
      allOld === k(null, "market_fires") && besideOld === k("market_fires", "market_fires")
        && besideAhead === k("market_fires", "market_fires")
        && chainsOld === k(null, "updown_fires") && chainsBesideOld === k("updown_fires", "updown_fires"),
      `all old ${allOld} · fresh beside old ${besideOld} · fresh beside one 20 min ahead ${besideAhead} · chains old ${chainsOld} · chains fresh beside old ${chainsBesideOld}`);
    const mixed = read({ depositsSince: t0 - 11 * MIN, marketFires: [t0 - 1000] }, t0);
    ok(p(L.y3mixed), mixed === k("market_fires", "deposits"), mixed);
    const ahead = read({ lifecycleSince: t0 + 11 * MIN }, t0);
    const nearAhead = read({ lifecycleSince: t0 + 1000 }, t0);
    ok(p(L.y3ahead), ahead === k(null, "lifecycle") && nearAhead === k("lifecycle"), `${ahead} · ${nearAhead}`);
  });

  // ── §Y4 · where the mirrors sit ─────────────────────────────────────────────────────────────────────────────────
  await section([L.y4mirrors, L.y4finally, L.y4lease, L.y4gate, L.y4premise], () => {
    const rows = Object.values(MIRRORS).map((m) => {
      const src = impl.src[m.file];
      const at = locate(src, m);
      const count = src.split(m.text).length - 1;
      return { m, at, count, good: at.line >= 0 && at.adjacent === m.text && count === 1 };
    });
    const bad = rows.filter((r) => !r.good).map((r) => `${r.m.id}: beside "${r.m.flip}" reads "${r.at.adjacent}" · spelled ${r.count}×`);
    ok(p(L.y4mirrors), bad.length === 0, bad.join(" | ") || `${rows.length} mirrors, each beside its flip`);

    /** Null when the mirror sits at the top level of the `finally` its flip sits in; else why not. */
    const inFinally = (src: string, m: MirrorSpec): string | null => {
      const code = blankLiterals(decomment(src));
      const lines = code.split(LF);
      const flipLine = lines.findIndex((l) => l.trim() === m.flip);
      const mirrorLine = src.split(LF).findIndex((l) => l.trim() === m.text);
      if (flipLine < 0 || mirrorLine < 0) return `flip at line ${flipLine + 1}, mirror at line ${mirrorLine + 1}`;
      const offsetOf = (line: number): number => lines.slice(0, line).reduce((n, l) => n + l.length + 1, 0);
      const opener = code.lastIndexOf("finally {", offsetOf(flipLine));
      if (opener < 0) return "no finally before the flip";
      if (code.lastIndexOf("finally {", offsetOf(mirrorLine)) !== opener) return "the mirror is not under the flip's finally";
      const depthAt = (to: number): number | null => {
        let d = 0;
        for (let i = opener + "finally {".length; i < to; i++) {
          if (code[i] === "{") d++;
          else if (code[i] === "}") { d--; if (d < 0) return null; }
        }
        return d;
      };
      if (depthAt(offsetOf(flipLine)) !== 0) return "the flip is not at the top of its finally";
      if (depthAt(offsetOf(mirrorLine)) !== 0) return "the mirror is outside the flip's finally";
      return null;
    };
    const fin = [MIRRORS.lifecycleClear, MIRRORS.depositsClear].map((m) => ({ id: m.id, why: inFinally(impl.src.lifecycle, m) }));
    const finBad = fin.filter((f) => f.why !== null).map((f) => `${f.id}: ${f.why}`);
    ok(p(L.y4finally), finBad.length === 0, finBad.join(" | ") || "both clears at the top of their flip's finally");

    const lineOf = (lines: string[], pred: (l: string) => boolean): number => lines.findIndex(pred);
    const lcCode = decomment(impl.src.lifecycle).split(LF);
    const lcRaw = impl.src.lifecycle.split(LF);
    const leaseLine = lineOf(lcCode, (l) => l.includes("acquireLeadership(LIFECYCLE_TASK)"));
    const setLine = lineOf(lcRaw, (l) => l.trim() === MIRRORS.lifecycleSet.text);
    ok(p(L.y4lease), leaseLine >= 0 && setLine > leaseLine, `lease at line ${leaseLine + 1}, the mirror at line ${setLine + 1}`);

    /** One gate's order, top to bottom: the wait loop, the ++, the acquire mirror, the released guard, the --, the
     *  release mirror. */
    type GateLines = { wait: string; inc: string; acquire: string; guard: string; dec: string; release: string };
    const gateOrder = (src: string, g: GateLines): { good: boolean; detail: string } => {
      const code = decomment(src).split(LF);
      const raw = src.split(LF);
      const wait = lineOf(code, (l) => l.trim().startsWith(g.wait));
      const inc = lineOf(code, (l) => l.trim() === g.inc);
      const acq = lineOf(raw, (l) => l.trim() === g.acquire);
      const guard = lineOf(code, (l) => l.trim().startsWith(g.guard));
      const dec = lineOf(code, (l) => l.trim() === g.dec);
      const rel = lineOf(raw, (l) => l.trim() === g.release);
      return {
        good: wait >= 0 && wait < inc && inc < acq && acq < guard && guard < dec && dec < rel,
        detail: `wait ${wait + 1} · ++ ${inc + 1} · acquire ${acq + 1} · guard ${guard + 1} · -- ${dec + 1} · release ${rel + 1}`,
      };
    };
    const fireGate = gateOrder(impl.src.scheduler, {
      wait: "while (firesInFlight >= MAX_CONCURRENT_FIRES)", inc: "firesInFlight++;", acquire: MIRRORS.fireAcquire.text,
      guard: "if (released) return;", dec: "firesInFlight--;", release: MIRRORS.fireRelease.text,
    });
    const chainGate = gateOrder(impl.src.updown, {
      wait: "while (inFlight >= MAX_CONCURRENT)", inc: "inFlight++;", acquire: MIRRORS.chainAcquire.text,
      guard: "if (released) return;", dec: "inFlight--;", release: MIRRORS.chainRelease.text,
    });
    ok(p(L.y4gate), fireGate.good && chainGate.good, `market-scheduler.ts ${fireGate.detail} | updown-scheduler.ts ${chainGate.detail}`);

    /** The files OTHER than lifecycle.ts that name `name` at all. Only a name built from parts escapes a text pin. */
    const namers = (name: string): string[] => impl.population
      .filter((f) => f.path !== LIFECYCLE && namesWord(f.code, name))
      .map((f) => f.path);
    const tickers = namers("startLifecycleTicker");
    const passes = namers("runLifecyclePass");
    const home = impl.population.find((f) => f.path === LIFECYCLE);
    const control = home !== undefined && namesWord(home.code, "runLifecyclePass") && namesWord(home.code, "startLifecycleTicker");
    ok(p(L.y4premise), control && tickers.join(",") === "src/instrumentation.ts" && passes.length === 0,
      `outside lifecycle.ts: startLifecycleTicker named by ${tickers.join(", ") || "nobody"} · runLifecyclePass by ${passes.join(", ") || "nobody"} · CONTROL lifecycle.ts names both ${control}`);
  });

  // ── §Y5 · fires are SUMS of their own starts ────────────────────────────────────────────────────────────────────
  await section([L.y5sum], () => {
    const at = (): string => key(impl.read(Date.now()));
    const trail = (gate: "fire" | "chain"): string => {
      const open = gate === "fire" ? W.fire : W.chain;
      const len = (): number => (gate === "fire" ? impl.view().marketFires : impl.view().updownFires).length;
      const a = scope(); // one module instance of the gate…
      const b = scope(); // …and another, each with its own count
      const steps: string[] = [];
      const releaseA = open(impl, a);
      const releaseB = open(impl, b);
      steps.push(`${len()} ${at()}`);
      releaseB(); steps.push(`${len()} ${at()}`);
      releaseA(); steps.push(`${len()} ${at()}`);
      return steps.join(" → ");
    };
    const want = (why: MoneyChore): string => [`2 ${k(why)}`, `1 ${k(why)}`, `0 ${k(null)}`].join(" → ");
    const fires = trail("fire");
    resetSignal();
    const chains = trail("chain");
    ok(p(L.y5sum), fires === want("market_fires") && chains === want("updown_fires"), `market fires ${fires} | Up & Down chains ${chains}`);
  });

  await section([L.y5real], async () => {
    const len = (): number => impl.view().marketFires.length;
    const at = (): string => key(impl.read(Date.now()));
    const control = S2.withFireSlot !== S1.withFireSlot && S2.fireGateState !== S1.fireGateState;
    const g1 = held();
    const g2 = held();
    const g3 = held();
    const fires: Array<Promise<unknown>> = [];
    let two = "", own = "", one = "", kept = false, none = "", atCap = "", cap = 0;
    try {
      const f1 = S1.withFireSlot(() => g1.wait);
      fires.push(f1);
      const first = impl.view().marketFires.join(","); // the earlier fire's own start
      await pastMs(Math.max(0, ...impl.view().marketFires)); // so the later fire's start is a different number
      const f2 = S2.withFireSlot(() => g2.wait);
      fires.push(f2);
      two = `${len()} ${at()}`;
      // Shown, not asserted: each instance's gate counts only its own fire — the per-instance cap the manifest records.
      own = `${S1.fireGateState().inFlight}+${S2.fireGateState().inFlight}`;
      g2.open(); await f2;
      one = `${len()} ${at()}`;
      // ⭐ The LATER fire released, so the start left must be the EARLIER fire's own; taking the oldest would leave the later one's.
      kept = first !== "" && impl.view().marketFires.join(",") === first;
      g1.open(); await f1;
      none = `${len()} ${at()}`;
      cap = S1.fireGateState().max;
      for (let i = 0; i < cap; i++) fires.push(S1.withFireSlot(() => g3.wait));
      fires.push(S1.withFireSlot(async () => {})); // the cap is reached: this one waits
      atCap = `${len()}/${cap} with ${S1.fireGateState().queued} waiting`;
    } finally {
      // Every slot is handed back on every path, so no later run inherits a held gate.
      g1.open(); g2.open(); g3.open();
      await Promise.allSettled(fires);
    }
    const drained = len();
    ok(p(L.y5real),
      control && two === `2 ${k("market_fires")}` && one === `1 ${k("market_fires")}` && kept && none === `0 ${k(null)}`
        && atCap === `${cap}/${cap} with 1 waiting` && drained === 0,
      `separate instances ${control} · both held ${two} (each gate's own count ${own}) · the later one released ${one}, the earlier one's own start kept ${kept} · both released ${none} · at the cap ${atCap} · drained ${drained}`);
  });

  await section([L.y5own], () => {
    const t0 = Date.now();
    let now = t0;
    const clock: Clock = { now: () => now };
    /** One fire takes a slot at minute 0 and never gives it back; others start and finish at minutes 5, 10 and 15. */
    const story = (gate: "fire" | "chain"): string => {
      resetSignal();
      const open = gate === "fire" ? W.fire : W.chain;
      const starts = (): string => {
        const v = impl.view();
        const list = gate === "fire" ? v.marketFires : v.updownFires;
        return list.map((at) => String(Math.round((at - t0) / MIN))).join("+") || "none";
      };
      const s = scope();
      const steps: string[] = [];
      now = t0;
      const hung = open(impl, s, clock);
      for (const minute of [5, 10, 15]) {
        now = t0 + minute * MIN;
        const other = open(impl, s, clock); // another fire starts…
        if (minute === 15) steps.push(`${starts()} ${key(impl.read(now))}`); // …and while it runs, marketing waits
        other(); // …and finishes
        steps.push(`${starts()} ${key(impl.read(now))}`);
      }
      hung();
      steps.push(`${starts()} ${key(impl.read(now))}`);
      return steps.join(" → ");
    };
    // Minutes 5 and 10: only the hung start is left, still fresh (10 minutes exactly still holds). Minute 15: a live fire
    // beside it waits, the hung start said stale; once that one finishes, only the stale start is left — not busy.
    const want = (why: MoneyChore): string =>
      [`0 ${k(why)}`, `0 ${k(why)}`, `0+15 ${k(why, why)}`, `0 ${k(null, why)}`, `none ${k(null)}`].join(" → ");
    const fires = story("fire");
    const chains = story("chain");
    ok(p(L.y5own), fires === want("market_fires") && chains === want("updown_fires"), `market fires ${fires} | Up & Down chains ${chains}`);
  });

  await section([L.y5chains], async () => {
    const len = (): number => impl.view().updownFires.length;
    const at = (): string => key(impl.read(Date.now()));
    const control = U2.withChainSlot !== U1.withChainSlot && U2.chainGateState !== U1.chainGateState;
    const g1 = held();
    const g2 = held();
    const g3 = held();
    const chains: Array<Promise<unknown>> = [];
    let two = "", own = "", one = "", kept = false, none = "", atCap = "", cap = 0;
    try {
      const c1 = U1.withChainSlot(() => g1.wait);
      chains.push(c1);
      const first = impl.view().updownFires.join(",");
      await pastMs(Math.max(0, ...impl.view().updownFires));
      const c2 = U2.withChainSlot(() => g2.wait);
      chains.push(c2);
      two = `${len()} ${at()}`;
      own = `${U1.chainGateState().inFlight}+${U2.chainGateState().inFlight}`;
      g2.open(); await c2;
      one = `${len()} ${at()}`;
      kept = first !== "" && impl.view().updownFires.join(",") === first;
      g1.open(); await c1;
      none = `${len()} ${at()}`;
      cap = U1.chainGateState().max;
      for (let i = 0; i < cap; i++) chains.push(U1.withChainSlot(() => g3.wait));
      chains.push(U1.withChainSlot(async () => {})); // the cap is reached: this one waits
      atCap = `${len()}/${cap} with ${U1.chainGateState().queued} waiting`;
    } finally {
      g1.open(); g2.open(); g3.open();
      await Promise.allSettled(chains);
    }
    const drained = len();
    ok(p(L.y5chains),
      control && two === `2 ${k("updown_fires")}` && one === `1 ${k("updown_fires")}` && kept && none === `0 ${k(null)}`
        && atCap === `${cap}/${cap} with 1 waiting` && drained === 0,
      `separate instances ${control} · both held ${two} (each gate's own count ${own}) · the later one released ${one}, the earlier one's own start kept ${kept} · both released ${none} · at the cap ${atCap} · drained ${drained}`);
  });

  // ── §Y6 · the writers and the declaration are pinned ───────────────────────────────────────────────────────────
  await section([L.y6pop, L.y6count, L.y6reader, L.y6imports, L.y6decl], () => {
    const naming = impl.population.filter((f) => f.code.includes(TOKEN)).map((f) => f.path).sort();
    const want = [...MONEY_CHORES_WRITERS, MONEY_CHORES_READER, MONEY_CHORES_DECLARATION].sort();
    ok(p(L.y6pop), naming.join(",") === want.join(","), naming.join(", ") || "nobody");

    const mentions = (code: string): number => code.split(TOKEN).length - 1;
    const lc = mentions(decomment(impl.src.lifecycle));
    const sc = mentions(decomment(impl.src.scheduler));
    const ud = mentions(decomment(impl.src.updown));
    ok(p(L.y6count), lc === 4 && sc === 2 && ud === 2, `lifecycle.ts ${lc} · market-scheduler.ts ${sc} · updown-scheduler.ts ${ud}`);

    const mb = decomment(impl.src.moneyBusy);
    const plainRead = mb.includes("= globalThis.__50PICK_MONEY_CHORES;");
    ok(p(L.y6reader), mentions(mb) === 1 && plainRead, `${mentions(mb)} mention(s) · one plain read ${plainRead}`);

    const mbImports = importsOf(mb);
    const writerImports = [impl.src.lifecycle, impl.src.scheduler, impl.src.updown]
      .flatMap((s) => importsOf(decomment(s)))
      .filter((x) => x.includes("money-busy") || x.includes("money-chores"));
    ok(p(L.y6imports), mbImports.join(",") === "./admission" && writerImports.length === 0,
      `money-busy.ts imports ${mbImports.join(", ") || "nothing"} · a writer imports ${writerImports.join(", ") || "neither"}`);

    const decl = decomment(impl.src.declaration);
    const declared = mentions(decl) === 1 && decl.includes("var __50PICK_MONEY_CHORES:");
    const declImports = importsOf(decl);
    const names = impl.tsconfigs.map((t) => t.path);
    const found = names.includes("tsconfig.json") && names.includes("tsconfig.backup.json");
    const blind = impl.tsconfigs.filter((t) => !seesDeclaration(t.text)).map((t) => t.path);
    ok(p(L.y6decl), declared && declImports.length === 0 && found && blind.length === 0,
      `money-chores.d.ts declares it once ${declared} · imports ${declImports.join(", ") || "nothing"} · tsconfigs ${names.join(", ") || "none found"} · blind to it ${blind.join(", ") || "none"}`);
  });

  // ── §Y7 · a mirror cannot throw; the reader cannot write ────────────────────────────────────────────────────────
  await section([L.y7throw, L.y7ro, L.y7copy, L.y7malformed], () => {
    const throwingAccessors = (): object => {
      const o = {};
      for (const f of ["lifecycleSince", "depositsSince", "marketFires", "updownFires"]) {
        Object.defineProperty(o, f, {
          get() { throw new Error("planted: a throwing getter"); },
          set() { throw new Error("planted: a throwing setter"); },
          enumerable: true,
        });
      }
      return o;
    };
    const HOSTILE: Array<[string, () => unknown]> = [
      ["a number", () => 7],
      ["a string", () => "busy"],
      ["null", () => null],
      ["a frozen object", () => Object.freeze({})],
      ["frozen lists of fires", () => Object.freeze({
        lifecycleSince: 1, depositsSince: 1, marketFires: Object.freeze([1, 2]), updownFires: Object.freeze([1, 2]),
      })],
      ["fires that are not a list", () => ({ marketFires: "not a list", updownFires: "not a list" })],
      ["throwing accessors", throwingAccessors],
      ["a proxy that throws on every touch", () => new Proxy({}, {
        get() { throw new Error("planted: proxy get"); },
        set() { throw new Error("planted: proxy set"); },
        has() { throw new Error("planted: proxy has"); },
      })],
    ];
    const escapes: string[] = [];
    const attempt = (what: string, body: () => void): void => {
      try { body(); } catch (e) { escapes.push(`${what}: ${(e as Error)?.message ?? String(e)}`); }
    };
    // The four flag mirrors, each alone.
    for (const m of [MIRRORS.lifecycleSet, MIRRORS.lifecycleClear, MIRRORS.depositsSet, MIRRORS.depositsClear]) {
      const statement = stmt(impl, m);
      if (statement === null) { escapes.push(`${m.id}: no mirror beside its flip to run`); continue; }
      for (const [name, make] of HOSTILE) {
        plantSignal(make());
        attempt(`${m.id} over ${name}`, () => { run(statement, scope(), REAL_CLOCK); });
      }
      resetSignal();
    }
    // The two gates' pairs: the acquire runs, then its release, both over the same hostile signal…
    const gates: Array<["fire" | "chain", MirrorSpec, MirrorSpec]> = [
      ["fire", MIRRORS.fireAcquire, MIRRORS.fireRelease],
      ["chain", MIRRORS.chainAcquire, MIRRORS.chainRelease],
    ];
    for (const [gate, acquire, release] of gates) {
      const open = gate === "fire" ? W.fire : W.chain;
      if (stmt(impl, acquire) === null || stmt(impl, release) === null) {
        escapes.push(`${acquire.id} / ${release.id}: no mirror beside a flip to run`);
        continue;
      }
      for (const [name, make] of HOSTILE) {
        plantSignal(make());
        attempt(`${acquire.id} + ${release.id} over ${name}`, () => { const done = open(impl, scope(), REAL_CLOCK); done(); });
      }
      // …and the release over a FROZEN list that holds its own start, so the taking-back itself is what fails.
      resetSignal();
      attempt(`${release.id} over a frozen list holding its own start`, () => {
        const done = open(impl, scope(), REAL_CLOCK);
        const live = current();
        plantSignal(Object.freeze({
          marketFires: Object.freeze([...(live?.marketFires ?? [])]),
          updownFires: Object.freeze([...(live?.updownFires ?? [])]),
        }));
        done();
      });
      resetSignal();
    }
    ok(p(L.y7throw), escapes.length === 0, escapes.slice(0, 4).join(" | ") || `8 mirrors × ${HOSTILE.length} hostile signals, and each release over a frozen list of its own — nothing escaped`);

    const t0 = Date.now();
    const STATES: Array<[string, () => unknown]> = [
      ["absent", () => undefined],
      ["a live mix, the fires out of order", () => ({
        lifecycleSince: t0 - 1000, depositsSince: 0, marketFires: [t0 - 2000, t0 - 9000, t0 - 500], updownFires: [t0 - 300, t0 - 7000],
      })],
      ["stale flags", () => ({
        lifecycleSince: t0 - 11 * MIN, depositsSince: t0 - 12 * MIN, marketFires: [t0 - 13 * MIN, t0 - 14 * MIN], updownFires: [t0 - 15 * MIN],
      })],
    ];
    const changed: string[] = [];
    for (const [name, make] of STATES) {
      plantSignal(make());
      const before = current();
      const json = JSON.stringify(before);
      const lists = [before?.marketFires, before?.updownFires];
      const orders = lists.map((l) => (l ? l.join(",") : ""));
      impl.read(t0);
      impl.readers[0](t0);
      impl.readers[1](t0);
      impl.readDefault[0]();
      impl.readDefault[1]();
      impl.view();
      const after = current();
      const afterLists = [after?.marketFires, after?.updownFires];
      const same = after === before && JSON.stringify(after) === json
        && lists.every((l, i) => l === undefined || (afterLists[i] === l && l.join(",") === orders[i]));
      if (!same) changed.push(`${name}: ${json ?? "absent"} → ${JSON.stringify(after) ?? "absent"}`);
    }
    ok(p(L.y7ro), changed.length === 0, changed.join(" | ") || `${STATES.length} states read by every reader, each left exactly as found`);

    plantSignal({ lifecycleSince: t0, marketFires: [t0], updownFires: [t0] });
    const v = impl.view();
    v.marketFires.push(1);
    v.marketFires[0] = 2;
    v.updownFires.push(1);
    v.updownFires[0] = 2;
    v.lifecycleSince = 3;
    const kept = current();
    const again = impl.view();
    ok(p(L.y7copy),
      kept?.lifecycleSince === t0 && kept.marketFires?.length === 1 && kept.marketFires[0] === t0
        && kept.updownFires?.length === 1 && kept.updownFires[0] === t0
        && again.lifecycleSince === t0 && again.marketFires.join(",") === String(t0) && again.updownFires.join(",") === String(t0),
      JSON.stringify(kept));

    const MALFORMED: Array<[string, unknown]> = [
      ["a number", 7], ["a string", "busy"], ["null", null], ["true", true],
      ["a since in words", { lifecycleSince: "soon" }], ["a since of NaN", { depositsSince: Number.NaN }],
      ["a negative since", { lifecycleSince: -5 }], ["an infinite since", { depositsSince: Number.POSITIVE_INFINITY }],
      ["fires in words", { marketFires: "three" }], ["fires as an object", { marketFires: { length: 3 } }],
      ["chain fires in words", { updownFires: "three" }],
    ];
    const wrong: string[] = [];
    for (const [name, v2] of MALFORMED) {
      plantSignal(v2);
      try {
        const r = impl.read(Date.now());
        if (r.busy || r.stale.length > 0) wrong.push(`${name}: ${key(r)}`);
      } catch (e) {
        wrong.push(`${name} threw: ${(e as Error)?.message ?? String(e)}`);
      }
    }
    plantSignal({ marketFires: [null, "x"], updownFires: [Number.NaN] });
    const undatable = key(impl.read(Date.now()));
    ok(p(L.y7malformed), wrong.length === 0 && undatable === k(null, "market_fires", "updown_fires"),
      wrong.join(" | ") || `${MALFORMED.length} malformed signals read as nothing running · fires with no readable start ${undatable}`);
  });

  // ── §Y8 · the wiring ────────────────────────────────────────────────────────────────────────────────────────────
  await section([L.y8], () => {
    const chain = impl.wiring.predeploy.split("&&").map((s) => s.trim());
    const onChain = chain.includes("npm run test:money-busy");
    ok(p(L.y8),
      impl.wiring.test === "tsx scripts/money-busy.test.mts" && impl.wiring.red === "tsx scripts/money-busy.test.mts --prove-red" && onChain,
      `test ${impl.wiring.test ?? "MISSING"} · red ${impl.wiring.red ?? "MISSING"} · on predeploy ${onChain}`);
  });

  // ── Y0 · nothing silently stopped running ───────────────────────────────────────────────────────────────────────
  const missing = Object.values(L).filter((l) => l !== L.y0 && !seen.has(p(l)));
  ok(p(L.y0), missing.length === 0, missing.join(" | ") || `${Object.keys(L).length - 1} labelled assertions ran`);
  resetSignal();
  __resetAdmission();
}

/* ═══ THE RUN ═══ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`${LF}money-busy: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`${LF}§0 baseline: ${pass} passed, ${fail} failed${LF}`);

  /** Replace one exact text that must occur exactly once — a plant whose anchor moved is a harness error, not a pass. */
  const swap = (src: string, from: string, to: string): string => {
    const parts = src.split(from);
    if (parts.length !== 2) throw new Error(`plant anchor found ${parts.length - 1}× — "${from.slice(0, 70)}"`);
    return parts.join(to);
  };
  const withSrc = (patch: Partial<Impl["src"]>): Impl => ({ ...REAL, src: { ...REAL.src, ...patch } });
  /** A planted reader, as two distinct functions (two instances), so Y1's control still holds. */
  const withReader = (make: () => Reader): Impl => {
    const r1 = make();
    return { ...REAL, readers: [r1, make()], read: r1 };
  };
  const T = MIRRORS;
  const GUARD = "    if (released) return; // idempotent — a double release would corrupt the count";

  const CASES: Array<{ name: string; expect: string[]; impl: () => Impl }> = [
    {
      name: "R1 (ENGINE-SPEC's plant) · the mirror written to a module let — the writer's own module scope, which no other instance sees",
      expect: [L.y1],
      impl: () => withSrc({
        lifecycle: swap(
          swap(REAL.src.lifecycle, T.lifecycleSet.text, "try { moduleChores.lifecycleSince = Date.now(); } catch { /* planted: a module-scope mirror */ }"),
          T.lifecycleClear.text, "try { moduleChores.lifecycleSince = 0; } catch { /* planted */ }"),
      }),
    },
    {
      name: "R2 (ENGINE-SPEC's plant) · the stale rule removed — a pass that died outside its finally holds marketing off for ever",
      expect: [L.y3old],
      impl: () => withReader(() => (now) => M1.decideMoneyBusy(admissionSnapshot(), M1.readMoneyChores(), now, Number.POSITIVE_INFINITY)),
    },
    {
      name: "R3 (ENGINE-SPEC's plant) · the lifecycle clear moved out of the finally — a pass that throws leaves its flag set",
      expect: [L.y4finally],
      impl: () => withSrc({
        lifecycle: swap(REAL.src.lifecycle,
          "    running = false;" + LF + "    " + T.lifecycleClear.text + LF + "  }",
          "    running = false;" + LF + "  }" + LF + "  " + T.lifecycleClear.text),
      }),
    },
    {
      name: "R4 · a further writer appears — a dev toggle that writes the signal directly",
      expect: [L.y6pop],
      impl: () => ({
        ...REAL,
        population: [...REAL.population, {
          path: "src/app/admin/system/money-busy-toggle.ts",
          code: "export function holdMarketing(): void { globalThis.__50PICK_MONEY_CHORES = { lifecycleSince: Date.now() }; }",
        }],
      }),
    },
    {
      name: "R5 · a mirror removed — the market fire release no longer takes its start back",
      expect: [L.y4mirrors],
      impl: () => withSrc({ scheduler: swap(REAL.src.scheduler, LF + "    " + T.fireRelease.text, "") }),
    },
    {
      name: "R6 · the reader creates the signal it reads",
      expect: [L.y6reader],
      impl: () => withSrc({
        moneyBusy: swap(REAL.src.moneyBusy, "const signal = globalThis.__50PICK_MONEY_CHORES;", "const signal = (globalThis.__50PICK_MONEY_CHORES ??= {});"),
      }),
    },
    {
      name: "R7 · the reader sorts the writers' list in place",
      expect: [L.y7ro],
      impl: () => withReader(() => (now) => {
        current()?.marketFires?.sort((x, y) => x - y);
        return M1.moneyBusy(now);
      }),
    },
    {
      name: "R8 · the reader pins an empty signal when none exists",
      expect: [L.y7ro],
      impl: () => withReader(() => (now) => {
        signalSlot[TOKEN] ??= {};
        return M1.moneyBusy(now);
      }),
    },
    {
      name: "R9 · a mirror without its try — it can throw into the lifecycle pass and leave `running` stuck",
      expect: [L.y7throw],
      impl: () => withSrc({
        lifecycle: swap(REAL.src.lifecycle, T.lifecycleSet.text, "(globalThis.__50PICK_MONEY_CHORES ??= {}).lifecycleSince = Date.now();"),
      }),
    },
    {
      name: "R10 · market fires COPIED from one instance's count instead of summed",
      expect: [L.y5sum],
      impl: () => {
        const copy = "try { (globalThis.__50PICK_MONEY_CHORES ??= {}).marketFires = Array.from({ length: firesInFlight }, () => Date.now()); } catch { /* planted: one instance's count */ }";
        return withSrc({ scheduler: swap(swap(REAL.src.scheduler, T.fireAcquire.text, copy), T.fireRelease.text, copy) });
      },
    },
    {
      name: "R11 · the market fire mirror acquired before the gate's wait — a queued fire counts as in flight",
      expect: [L.y4gate],
      impl: () => withSrc({
        scheduler: swap(swap(REAL.src.scheduler, LF + "  " + T.fireAcquire.text, ""),
          "  while (firesInFlight >= MAX_CONCURRENT_FIRES) {",
          "  " + T.fireAcquire.text + LF + "  while (firesInFlight >= MAX_CONCURRENT_FIRES) {"),
      }),
    },
    {
      name: "R12 · the market fire release mirrored before the released guard — a double release takes back twice",
      expect: [L.y4gate],
      impl: () => withSrc({
        scheduler: swap(swap(REAL.src.scheduler, LF + "    " + T.fireRelease.text, ""), GUARD, "    " + T.fireRelease.text + LF + GUARD),
      }),
    },
    {
      name: "R13 · the bet queue ignored",
      expect: [L.y2bets],
      impl: () => withReader(() => (now) => M1.decideMoneyBusy({ ...admissionSnapshot(), queueDepth: 0 }, M1.readMoneyChores(), now)),
    },
    {
      name: "R14 · the admission ceiling compared with > instead of ≥",
      expect: [L.y2full],
      impl: () => withReader(() => (now) => {
        const a = admissionSnapshot();
        return M1.decideMoneyBusy({ ...a, limits: { ...a.limits, maxInFlight: a.limits.maxInFlight + 1 } }, M1.readMoneyChores(), now);
      }),
    },
    {
      name: "R15 · the deposit/payout poll not read",
      expect: [L.y2deposits],
      impl: () => withReader(() => (now) => M1.decideMoneyBusy(admissionSnapshot(), { ...M1.readMoneyChores(), depositsSince: 0 }, now)),
    },
    {
      name: "R16 · the lifecycle mirror set before the leadership lease — a standby container reads busy",
      expect: [L.y4lease],
      impl: () => withSrc({
        lifecycle: swap(swap(REAL.src.lifecycle, LF + "  " + T.lifecycleSet.text, ""),
          "  if (!(await acquireLeadership(LIFECYCLE_TASK))) {",
          "  " + T.lifecycleSet.text + LF + "  if (!(await acquireLeadership(LIFECYCLE_TASK))) {"),
      }),
    },
    {
      name: "R17 · a second runner of the lifecycle chores — a server action that runs a pass in its own module instance",
      expect: [L.y4premise],
      impl: () => ({
        ...REAL,
        population: [...REAL.population, {
          path: "src/app/admin/system/run-chores-action.ts",
          code: "export async function runChoresNow(): Promise<void> { await runLifecyclePass(); }",
        }],
      }),
    },
    {
      name: "R18 · the suite drops out of predeploy",
      expect: [L.y8],
      impl: () => ({ ...REAL, wiring: { ...REAL.wiring, predeploy: REAL.wiring.predeploy.split("npm run test:money-busy").join("npm run test:bet-admission") } }),
    },
    {
      name: "R19 · a stale flag hides a live one — any stale chore answers idle",
      expect: [L.y3mixed],
      impl: () => withReader(() => (now) => {
        const r = M1.moneyBusy(now);
        return r.stale.length > 0 ? { busy: false, stale: r.stale } : r;
      }),
    },
    {
      name: "R20 · money-busy.ts imports the lifecycle module — the F3 shortcut back",
      expect: [L.y6imports],
      impl: () => withSrc({
        moneyBusy: swap(REAL.src.moneyBusy,
          'import { admissionSnapshot, type AdmissionSnapshot } from "./admission";',
          'import { admissionSnapshot, type AdmissionSnapshot } from "./admission";' + LF + 'import { lifecycleTickerHealth } from "./lifecycle";'),
      }),
    },
    {
      name: "R21 · a money file imports money-busy — the scheduler now loads the marketing side",
      expect: [L.y6imports],
      impl: () => withSrc({
        scheduler: swap(REAL.src.scheduler,
          'import { marketStore } from "./market-dal";',
          'import { marketStore } from "./market-dal";' + LF + 'import { moneyBusy } from "./money-busy";'),
      }),
    },
    {
      name: "R22 · the view hands out the writers' own list",
      expect: [L.y7copy],
      impl: () => ({
        ...REAL,
        view: () => {
          const v = M1.readMoneyChores();
          const list = current()?.marketFires;
          return Array.isArray(list) ? { ...v, marketFires: list } : v;
        },
      }),
    },
    {
      name: "R23 · a market fire's release takes back the OLDEST start, not its own — a fire that never finishes is re-dated by every fire after it and never goes stale (U43Y-MPS-2, as it shipped)",
      expect: [L.y5own],
      impl: () => withSrc({
        scheduler: swap(REAL.src.scheduler, T.fireRelease.text, "try { globalThis.__50PICK_MONEY_CHORES?.marketFires?.shift(); } catch { /* planted: the oldest start */ }"),
      }),
    },
    {
      name: "R24 · an Up & Down chain release takes back the OLDEST start, not its own",
      expect: [L.y5own],
      impl: () => withSrc({
        updown: swap(REAL.src.updown, T.chainRelease.text, "try { globalThis.__50PICK_MONEY_CHORES?.updownFires?.shift(); } catch { /* planted: the oldest start */ }"),
      }),
    },
    {
      name: "R25 · fires dated by their NEWEST start only — one start dated far ahead hides a fire running now, and an old start beside a fresh one goes unsaid",
      expect: [L.y3fires],
      impl: () => withReader(() => (now) => {
        const v = M1.readMoneyChores();
        const newest = (l: number[]): number[] => (l.length > 0 ? [l.reduce((m, at) => (at > m ? at : m), 0)] : l);
        return M1.decideMoneyBusy(admissionSnapshot(), { ...v, marketFires: newest(v.marketFires), updownFires: newest(v.updownFires) }, now);
      }),
    },
    {
      name: "R26 · the Up & Down chain gate unmirrored — its acquire writes nothing (U43Y-SM-01)",
      expect: [L.y2chains],
      impl: () => withSrc({ updown: swap(REAL.src.updown, LF + "  " + T.chainAcquire.text, "") }),
    },
    {
      name: "R27 · the Up & Down chain release mirrored before the released guard — a double release takes back twice",
      expect: [L.y4gate],
      impl: () => withSrc({
        updown: swap(swap(REAL.src.updown, LF + "    " + T.chainRelease.text, ""), GUARD, "    " + T.chainRelease.text + LF + GUARD),
      }),
    },
    {
      name: "R28 · the reader ignores the Up & Down chain fires",
      expect: [L.y2chains],
      impl: () => withReader(() => (now) => M1.decideMoneyBusy(admissionSnapshot(), { ...M1.readMoneyChores(), updownFires: [] }, now)),
    },
    {
      name: "R29 · the default clock broken — moneyBusy() with no argument judges against 0 (U43Y-SM-06)",
      expect: [L.y2clock],
      impl: () => ({ ...REAL, readDefault: [() => M1.moneyBusy(0), () => M2.moneyBusy(0)] }),
    },
    {
      name: "R30 · tsconfig.backup.json no longer holds the declaration — test:backup's program loads market-scheduler.ts blind to the global (U43Y-MPS-1, as it shipped)",
      expect: [L.y6decl],
      impl: () => ({
        ...REAL,
        tsconfigs: REAL.tsconfigs.map((t) => (t.path === "tsconfig.backup.json"
          ? { ...t, text: swap(t.text, '"' + DECLARATION + '"', '"src/lib/server/backup/**/*.d.ts"') }
          : t)),
      }),
    },
    {
      name: "R31 · the declaration imports its type from money-busy.ts — it can no longer join a program alone",
      expect: [L.y6decl],
      impl: () => withSrc({ declaration: swap(REAL.src.declaration, "export {};", 'import type { MoneyBusy } from "./money-busy";' + LF + "export {};") }),
    },
    {
      name: "R32 · a second lifecycle runner that hands the pass on by reference — a server action's own timer (U43Y-SM-09)",
      expect: [L.y4premise],
      impl: () => ({
        ...REAL,
        population: [...REAL.population, {
          path: "src/app/admin/system/chores-timer.ts",
          code: 'import { runLifecyclePass } from "@/lib/server/lifecycle";' + LF + "export function keepChoresRunning(): void { setInterval(runLifecyclePass, 60_000); }",
        }],
      }),
    },
    {
      name: "R33 · a second lifecycle runner imported under another name (U43Y-SM-09)",
      expect: [L.y4premise],
      impl: () => ({
        ...REAL,
        population: [...REAL.population, {
          path: "src/app/admin/system/run-chores-alias.ts",
          code: 'import { runLifecyclePass as pass } from "@/lib/server/lifecycle";' + LF + "export async function runChoresNow(): Promise<void> { await pass(); }",
        }],
      }),
    },
    {
      name: "R34 · money-busy.ts imports the lifecycle module in SINGLE quotes (U43Y-SM-08)",
      expect: [L.y6imports],
      impl: () => withSrc({
        moneyBusy: swap(REAL.src.moneyBusy,
          'import { admissionSnapshot, type AdmissionSnapshot } from "./admission";',
          'import { admissionSnapshot, type AdmissionSnapshot } from "./admission";' + LF + "import { lifecycleTickerHealth } from './lifecycle';"),
      }),
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    let impl: Impl;
    try {
      impl = c.impl();
    } catch (e) {
      problems.push(`case ${i + 1} (${c.name}): the plant did not apply — ${(e as Error)?.message ?? String(e)}`);
      continue;
    }
    await runAssertions(impl, tag);
    const missed = c.expect.filter((e) => !failed.includes(`${tag}${e}`));
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (missed.length) problems.push(`case ${i + 1} (${c.name}): red, but not on "${missed.join(" + ")}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect.join(" + ")}${LF}`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`${LF}${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log(`${LF}PROBLEMS:`);
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
resetSignal();
__resetAdmission();
// ⛔ Explicit: a lingering handle in an imported module (the gates' graphs) must never hang the predeploy chain.
process.exit(Number(process.exitCode ?? 1));
