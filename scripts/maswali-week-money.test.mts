/**
 * test:maswali-week-money — THE ONE CORE OF A FINAL WEEK'S MONEY, ON EITHER LINE (MASWALI-BUILD S5-DESIGN-REGISTER; the
 * lead's ruling of 2026-10-21 for the TICKETS lane: the ticket page draws its win ledger from the register's own rows, and
 * a DRIVE week's winning ticket — the private line, S8 / OD-12 — must get the same ledger without a second copy of the
 * money logic).
 *
 *   npx tsx scripts/maswali-week-money.test.mts               (npm run test:maswali-week-money)
 *   npx tsx scripts/maswali-week-money.test.mts --prove-red   (npm run red:maswali-week-money)
 *
 *   §1 THE PUBLIC READ STILL REFUSES A DRIVE WEEK — by its code in any case, through the register's cache and through the
 *      register's record read — while the core (`millioneaWeekMoneyRecord`) reads each one; the core states money only once
 *      a week is final (a selling week, a week being graded, an id that is no week: null); and both of the public read's
 *      refusals stand on their own (the code's public shape, and the week's visibility behind it), the core keeping neither.
 *   §2 FOR A PUBLIC WEEK THE CORE AND THE PUBLIC READ AGREE — every money field, and the ledger's rows rendered in en, sw and
 *      zh — in every week a settlement can close (nobody won, topped up to the floor with a carry in, won with a remainder,
 *      voided); the public projection is the one before the split BYTE FOR BYTE (maswali-player.ts at 26503c06c,
 *      blob-pinned); and the public ledger's rows are byte-identical to the builder's before its `links` option.
 *   §3 A DRIVE WEEK'S CORE RECORD SATISFIES MR-26 — money in = money out, from its fields and on the rendered rows — rolled,
 *      won with a carry in and a remainder, voided; its carries follow the DRIVE line's own chain (never a public week);
 *      and `links: false` opens no page while every label and figure stays the default call's.
 *
 * ⛔ IN-PROCESS, ON THE MEMORY STORE (`DATABASE_URL` unset). Every week and ticket goes through the product's own doors —
 *    the money world (`scripts/lib/maswali-money-world.mts`): the licence and guarantee ceremonies, createWeek →
 *    attestParity → openWeek, purchases through the one bet path, closeWeek, sealQuestion, the settlement's release, the
 *    void. ⚠️ ONE DECLARED FIXTURE: the floor is set to TZS 20,000 through the admin's own door (`saveMaswaliConfig`; admins
 *    can change every rule, manifest L2) before the first week opens, so each kind of week needs a few tickets, not a
 *    thousand.
 * ⛔ `--prove-red` plants each defect in an IN-MEMORY COPY of maswali-player.ts or register-parts.tsx, compiled at the file's
 *    own path (its imports resolve as the file's do; the stores are the process's own), and requires the check it targets to
 *    fail; a plant whose text is not in its file exactly once is INCONCLUSIVE, never a pass. No file is written.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
delete process.env.DATABASE_URL;
process.env.USE_PRISMA_DAL = "false";
process.env.SESSION_SECRET ??= "maswali-week-money-session-secret-0123456789abcdef";

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import NodeModule from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

process.exitCode = 1;
const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
const raw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const j = (v: unknown) => JSON.stringify(v);

/* ── the world: weeks through the product's own doors, on the memory store ─────────────────────────────────────────────── */
const { loadMaswaliWorld, OWNER } = (await import("./lib/maswali-money-world.mts")) as any;
const W: any = await loadMaswaliWorld();
await W.setup({ guarantee: 20_000_000 });
const { saveMaswaliConfig }: any = await import("../src/lib/server/maswali-config.ts");
const fixture = await saveMaswaliConfig({ floorTzs: 20_000 }, OWNER);
if (!fixture.ok) throw new Error(`the declared fixture (floor TZS 20,000) was refused: ${fixture.error}`);

const players: string[] = [];
for (let i = 0; i < 12; i++) players.push(await W.user({ balance: 200_000 }));
/** Sell a week: `winners` all-YES tickets (each its own account), then losers. */
async function sellWeek(weekId: string, total: number, winners: number): Promise<void> {
  for (const u of players.slice(0, winners)) {
    const r = await W.buy(u, weekId, [W.WIN]);
    if (!r.ok) throw new Error(`sellWeek: a winner's purchase was refused: ${r.error}`);
  }
  if (total > winners) await W.sell(weekId, total - winners, W.LOSE, players.slice(winners));
}
/** A week sold, closed, sealed and released (or, `voided`, every question VOID and the week voided whole after its window). */
async function finalWeek(o: { ahead: number; line: "PUBLIC" | "DRIVE"; tickets: number; winners: number; voided?: boolean }): Promise<any> {
  const { week, start } = await W.openWeek({ weeksAhead: o.ahead, visibility: o.line });
  await sellWeek(week.id, o.tickets, o.winners);
  if (o.voided) {
    const at = await W.closeAndSeal(week, start, Array.from({ length: 15 }, () => ({ void: "not_played" })));
    const v = await W.svc.voidWeek({ weekId: week.id, now: at });
    if (!v.ok) throw new Error(`finalWeek: the void was refused: ${v.error}`);
  } else {
    const r = await W.release(week.id, await W.closeAndSeal(week, start));
    if (!r.ok) throw new Error(`finalWeek: the release was refused: ${r.error}`);
  }
  return W.dal.weekStore.get(week.id);
}
// PUBLIC: nobody won → topped up to the floor with that carry in → won with a remainder (no top-up) → voided whole.
const PA = await finalWeek({ ahead: 2, line: "PUBLIC", tickets: 5, winners: 0 });
const DA = await finalWeek({ ahead: 2, line: "DRIVE", tickets: 4, winners: 0 });
const PB = await finalWeek({ ahead: 3, line: "PUBLIC", tickets: 10, winners: 3 });
const DB = await finalWeek({ ahead: 3, line: "DRIVE", tickets: 19, winners: 7 });
const PC = await finalWeek({ ahead: 4, line: "PUBLIC", tickets: 23, winners: 7 });
const DC = await finalWeek({ ahead: 4, line: "DRIVE", tickets: 2, winners: 0, voided: true });
const PD = await finalWeek({ ahead: 5, line: "PUBLIC", tickets: 2, winners: 0, voided: true });
// Two weeks that are not final: one selling, one being graded.
const { week: selling } = await W.openWeek({ weeksAhead: 6, visibility: "DRIVE" });
const { week: graded, start: gStart } = await W.openWeek({ weeksAhead: 6 });
await sellWeek(graded.id, 2, 0);
await W.closeAndSeal(graded, gStart);
const PUBLIC_WEEKS = { PA, PB, PC, PD } as Record<string, any>;
const DRIVE_WEEKS = { DA, DB, DC } as Record<string, any>;
// The population is real: each week is the kind its case says, or nothing below proves anything.
const population = {
  PA: PA.state === "SETTLED" && PA.winningTickets === 0 && (PA.carryOut ?? 0) > 0,
  PB: PB.state === "SETTLED" && PB.winningTickets === 3 && (PB.topUp ?? 0) > 0 && (PB.rolloverIn ?? 0) > 0,
  PC: PC.state === "SETTLED" && PC.winningTickets === 7 && (PC.topUp ?? 0) === 0 && (PC.jackpot - PC.fee - PC.paidTotal) > 0,
  PD: PD.state === "VOIDED",
  DA: DA.state === "SETTLED" && DA.winningTickets === 0 && (DA.carryOut ?? 0) > 0 && DA.visibility === "DRIVE",
  DB: DB.state === "SETTLED" && DB.winningTickets === 7 && (DB.rolloverIn ?? 0) > 0 && (DB.jackpot - DB.fee - DB.paidTotal) > 0 && DB.visibility === "DRIVE",
  DC: DC.state === "VOIDED" && DC.visibility === "DRIVE",
  open: (await W.dal.weekStore.get(selling.id)).state === "OPEN" && ["CLOSED", "RESOLVING"].includes((await W.dal.weekStore.get(graded.id)).state),
};
if (!Object.values(population).every(Boolean)) {
  console.log(`INCONCLUSIVE: the fixture weeks are not the cases they claim to be — ${j(population)}`);
  process.exit(1);
}

/* ── the units: compiled through CommonJS at their own paths (a plant compiles a copy the same way) ────────────────────── */
type Locale = "en" | "sw" | "zh";
const LOCALES: Locale[] = ["en", "sw", "zh"];
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Locale, any> };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Locale; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (l: Locale, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: "/" }, h(I18nProvider as never, { initial: l } as never, el as never))));
const { MaswaliLedger } = req("../src/components/maswali/maswali-ledger.tsx") as { MaswaliLedger: (p: { rows: unknown[] }) => unknown };
const textOf = (m: string) => m.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

/** A module compiled from SOURCE TEXT at a real file's path (its imports resolve as that file's would). */
function compileAt(rel: string, source: string): any {
  const at = req.resolve(`../${rel}`);
  const live = (req.cache as Record<string, NodeModule>)[at] ?? (req(at), (req.cache as Record<string, NodeModule>)[at]);
  const compiled = ts.transpileModule(source, {
    fileName: at,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const m = new NodeModule(at);
  m.filename = at;
  m.paths = live.paths;
  (m as NodeModule & { _compile(source: string, filename: string): void })._compile(compiled, at);
  return m.exports;
}

const FILES = { player: "src/lib/server/maswali-player.ts", parts: "src/app/millionea/register/register-parts.tsx" } as const;
type FileKey = keyof typeof FILES;
/** The public read and the ledger builder before the split: 26503c06c, the branch's head before this commit, at its blobs. */
const BEFORE = "26503c06c";
const BEFORE_BLOBS = { player: "2b20ef09f88076c6448556f67e823a77d686c852", parts: "e4cf33a25b16383cff76fa8ca4a2de671a64cfdc" } as const;
const beforeBlobs = { player: "", parts: "" };
const beforeSrc = { player: "", parts: "" };
for (const k of Object.keys(FILES) as FileKey[]) {
  beforeBlobs[k] = execFileSync("git", ["rev-parse", `${BEFORE}:${FILES[k]}`], { cwd: ROOT, encoding: "utf8" }).trim();
  beforeSrc[k] = execFileSync("git", ["show", `${BEFORE}:${FILES[k]}`], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n");
}
const OLD_PLAYER = compileAt(FILES.player, beforeSrc.player);
const OLD_PARTS = compileAt(FILES.parts, beforeSrc.parts);

/** Everything a check may look at — the real units, or copies with one defect planted. */
type World = { player: any; parts: any; src: Record<FileKey, string> };
const realSrc = { player: raw(FILES.player), parts: raw(FILES.parts) };
const REAL: World = { player: req(`../${FILES.player}`), parts: req(`../${FILES.parts}`), src: realSrc };

type Check = { id: string; label: string; run: (w: World) => Promise<[boolean, string]> };
const CHECKS: Check[] = [];
const check = (id: string, label: string, run: (w: World) => Promise<[boolean, string]>) => CHECKS.push({ id, label, run });

/** The money fields the core states (`MillioneaWeekMoney`): the summary's, then the register's money. */
const MONEY_KEYS = ["id", "code", "state", "isFinal", "closedAt", "settledAt", "tickets", "sales", "carryIn", "jackpot", "winners", "share", "fee",
  "topUp", "paid", "carriedForward", "refundsPending", "carryFromCode", "carryToCode", "ticketPrice", "floor", "feeRate", "traLevy", "gbtLevy",
  "toWinners", "remainder", "basis", "winningScore"];
const pick = (o: any) => Object.fromEntries(MONEY_KEYS.map((k) => [k, o?.[k]]));
const rowsMarkup = (w: World, l: Locale, rec: any, o?: unknown) => inApp(l, h(MaswaliLedger, { rows: w.parts.registerLedgerRows(dict[l], l, rec, o) }));
/** A rendered ledger's two totals, as the reader reads them: each total row's figure — the last amount in its row, after any
 *  amounts its note states. */
const totals = (markup: string) => {
  const figure = (key: string) => {
    const row = markup.split('data-ledger-row="').find((s) => s.startsWith(`${key}"`));
    const amounts = row ? [...row.matchAll(/<span class="amount">([^<]*)<\/span>/g)].map((x) => x[1]) : [];
    return amounts.length ? amounts[amounts.length - 1] : null;
  };
  return { moneyIn: figure("moneyIn"), moneyOut: figure("moneyOut") };
};

// ── §1 · the public read refuses a DRIVE week; the core states money once final ─────────────────────────────────────────
check("1.1", "⛔ the public read refuses every DRIVE week — by its code in any case, through the register's cache and its record read — while the core reads each one", async (w) => {
  const off: string[] = [];
  for (const [name, wk] of Object.entries(DRIVE_WEEKS)) {
    const reads = await Promise.all([w.player.millioneaRegisterWeek(wk.code), w.player.millioneaRegisterWeek(wk.code.toLowerCase()),
      w.player.cachedMillioneaRegisterWeek(wk.code), w.player.millioneaRegisterRecord(wk.code)]);
    if (reads.some((r) => r !== null)) off.push(`${name}: a public read answered ${j(reads.map((r) => r?.code ?? null))}`);
    const core = await w.player.millioneaWeekMoneyRecord(wk.id);
    if (core?.id !== wk.id) off.push(`${name}: the core answered ${j(core?.id ?? null)}`);
  }
  return [off.length === 0, off.join(" | ")];
});
check("1.2", "money only once final: the core answers null for a week still selling, a week being graded, and an id that is no week", async (w) => {
  const got = await Promise.all([w.player.millioneaWeekMoneyRecord(selling.id), w.player.millioneaWeekMoneyRecord(graded.id), w.player.millioneaWeekMoneyRecord("mlw_no_such_week")]);
  return [got.every((r) => r === null), j(got.map((r) => r?.code ?? null))];
});
// 1.1 drives the refusal; a DRIVE week's code is already refused by its shape (MLD-…), so the visibility refusal behind it —
// the defence in depth that holds if a code scheme ever changes — is pinned in the source, each layer on its own.
check("1.3", "the public read keeps BOTH refusals — a code of the public line's shape only (MLN-…), and a week that is not PUBLIC — and the core keeps neither (no visibility filter, by the lead's ruling: its caller is the gate)", async (w) => {
  const s = w.src.player;
  const read = s.slice(s.indexOf("export async function millioneaRegisterWeek("), s.indexOf("export async function cachedMillioneaRegisterWeek("));
  const from = s.indexOf("export async function millioneaWeekMoneyRecord(");
  const tail = from >= 0 ? s.slice(from) : "";
  const core = tail.indexOf("\n}\n") >= 0 ? tail.slice(0, tail.indexOf("\n}\n")) : tail;
  const visibility = read.includes('if (!week || week.visibility !== "PUBLIC" || !TERMINAL.includes(week.state)) return null;');
  const shape = s.includes("return /^MLN-\\d{4}-W\\d{2}$/.test(s) ? s : null;");
  const open = core.length > 0 && !/visibility|PUBLIC|DRIVE/.test(core);
  return [visibility && shape && open, j({ visibility, shape, open })];
});

// ── §2 · a PUBLIC week: the core and the public read agree; the projection is the one before, byte for byte ────────────
check("2.1", "for every PUBLIC week (nobody won, topped up with a carry in, won with a remainder, voided) the core's money fields are the public record's, key for key", async (w) => {
  const off: string[] = [];
  for (const [name, wk] of Object.entries(PUBLIC_WEEKS)) {
    const pub = await w.player.millioneaRegisterWeek(wk.code), core = await w.player.millioneaWeekMoneyRecord(wk.id);
    const keys = core ? Object.keys(core).sort() : [];
    if (!pub || !core || j(keys) !== j([...MONEY_KEYS].sort()) || j(pick(pub)) !== j(pick(core))) off.push(`${name}: ${j({ keys, pub: pick(pub), core: pick(core) })}`);
  }
  return [off.length === 0, off.join(" | ")];
});
check("2.2", "…and the ledger drawn from each is the same, row for row, rendered in en, sw and zh — the builder reads nothing but the money", async (w) => {
  const off: string[] = [];
  for (const [name, wk] of Object.entries(PUBLIC_WEEKS)) {
    const pub = await w.player.millioneaRegisterWeek(wk.code), core = await w.player.millioneaWeekMoneyRecord(wk.id);
    for (const l of LOCALES) if (rowsMarkup(w, l, pub) !== rowsMarkup(w, l, core)) off.push(`${name}/${l}`);
  }
  return [off.length === 0, off.join(" | ")];
});
check("2.3", "the public projection is the one before the split BYTE FOR BYTE (maswali-player.ts at 26503c06c, blob-pinned) — every field, in its order, for every PUBLIC week", async (w) => {
  const pinned = beforeBlobs.player === BEFORE_BLOBS.player && !beforeSrc.player.includes("millioneaWeekMoneyRecord");
  const off: string[] = [];
  for (const [name, wk] of Object.entries(PUBLIC_WEEKS)) {
    const now = j(await w.player.millioneaRegisterWeek(wk.code)), before = j(await OLD_PLAYER.millioneaRegisterWeek(wk.code));
    if (now !== before || now === "null") off.push(`${name}: ${now.slice(0, 160)} ≠ ${before.slice(0, 160)}`);
  }
  return [pinned && off.length === 0, j({ pinned, off })];
});
check("2.4", "the public ledger's rows are the builder's before its `links` option, byte for byte (register-parts at 26503c06c, blob-pinned), in en, sw and zh — a carry still opens its week's page", async (w) => {
  const pinned = beforeBlobs.parts === BEFORE_BLOBS.parts && !beforeSrc.parts.includes("links");
  const off: string[] = [];
  let linked = false;
  for (const [name, wk] of Object.entries(PUBLIC_WEEKS)) {
    const pub = await w.player.millioneaRegisterWeek(wk.code);
    for (const l of LOCALES) {
      const now = rowsMarkup(w, l, pub), before = inApp(l, h(MaswaliLedger, { rows: OLD_PARTS.registerLedgerRows(dict[l], l, pub) }));
      if (now !== before) off.push(`${name}/${l}`);
      if (name === "PB" && now.includes(`href="/millionea/register/${PA.code}"`)) linked = true;
    }
  }
  return [pinned && off.length === 0 && linked, j({ pinned, off, linked })];
});

// ── §3 · a DRIVE week's money, through the core ─────────────────────────────────────────────────────────────────────────
check("3.1", "MR-26 on a DRIVE week's core record: money in (carry in + sales + top-up) = money out (fee + paid + carried forward; a voided week: refunds + the carry handed on) — from its fields, and on its rendered rows in en, sw and zh", async (w) => {
  const off: string[] = [];
  for (const [name, wk] of Object.entries(DRIVE_WEEKS)) {
    const m = await w.player.millioneaWeekMoneyRecord(wk.id);
    if (!m) { off.push(`${name}: no record`); continue; }
    const into = (m.carryIn ?? 0) + (m.sales ?? 0) + (m.topUp ?? 0);
    const out = m.state === "VOIDED" ? (m.sales ?? 0) + (m.carryIn ?? 0) : (m.fee ?? 0) + (m.paid ?? 0) + (m.carriedForward ?? 0);
    const drawn = LOCALES.map((l) => totals(rowsMarkup(w, l, m, { links: false })));
    if (into !== out || into <= 0 || drawn.some((d) => d.moneyIn === null || d.moneyIn !== d.moneyOut)) off.push(`${name}: ${j({ into, out, drawn })}`);
  }
  return [off.length === 0, off.join(" | ")];
});
check("3.2", "a DRIVE week's carries follow the DRIVE line's own chain — the rolled week hands on to the next drive week, which names it as its carry's source — and never a public week", async (w) => {
  const [a, b, c] = await Promise.all([DA, DB, DC].map((x) => w.player.millioneaWeekMoneyRecord(x.id)));
  const chain = a?.carryToCode === DB.code && b?.carryFromCode === DA.code;
  const codes = [a, b, c].flatMap((x) => [x?.carryFromCode, x?.carryToCode]).filter((x) => x != null);
  const privateOnly = codes.every((x: string) => x.startsWith("MLD-"));
  return [chain && privateOnly, j({ a: [a?.carryFromCode, a?.carryToCode], b: [b?.carryFromCode, b?.carryToCode], c: [c?.carryFromCode, c?.carryToCode] })];
});
check("3.3", "`links: false` opens no page — every label and figure stays the default call's (only the links differ) — on every DRIVE week, in en, sw and zh", async (w) => {
  const off: string[] = [];
  for (const [name, wk] of Object.entries(DRIVE_WEEKS)) {
    const m = await w.player.millioneaWeekMoneyRecord(wk.id);
    for (const l of LOCALES) {
      const closed = rowsMarkup(w, l, m, { links: false }), open = rowsMarkup(w, l, m);
      if (closed.includes("href=") || textOf(closed) !== textOf(open)) off.push(`${name}/${l}: ${closed.includes("href=") ? "a link" : "the words differ"}`);
    }
  }
  const b = await w.player.millioneaWeekMoneyRecord(DB.id);
  const defaultLinks = rowsMarkup(w, "en", b).includes("href=");
  return [off.length === 0 && defaultLinks, j({ off, defaultLinks })];
});

// ── the run ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function runAll(w: World, quiet: boolean): Promise<{ pass: number; fail: number; failed: string[] }> {
  let pass = 0, fail = 0;
  const failed: string[] = [];
  for (const c of CHECKS) {
    let ok = false, detail = "";
    try { [ok, detail] = await c.run(w); } catch (e) { detail = `threw: ${String((e as Error).message ?? e)}`; }
    if (ok) pass++; else { fail++; failed.push(c.id); }
    if (!quiet) console.log(`${ok ? "PASS" : "FAIL"} ${c.id} · ${c.label}${ok ? "" : ` — ${detail}`}`);
  }
  return { pass, fail, failed };
}

if (!PROVE_RED) {
  const { pass, fail } = await runAll(REAL, false);
  console.log(`\n${"═".repeat(70)}\n  MASWALI WEEK MONEY: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
  /** The floor is the count a green run PRINTS; it only rises, to a printed number. */
  const MIN_ASSERTIONS = 10;
  if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
  process.exit(fail === 0 ? 0 : 1);
}

// ── --prove-red: every check must be able to fail. Each plant is a compiled in-memory copy. ─────────────────────────────
const base = await runAll(REAL, true);
if (base.fail !== 0) { console.log(`INCONCLUSIVE: the real tree already fails ${base.failed.join(", ")}`); process.exit(1); }
const problems: string[] = [];
/** A copy of the world with each `from` replaced by its `to` in one file, compiled at its path — inconclusive unless every
 *  `from` is there exactly once. */
const plant = (k: FileKey, ...edits: Array<[string, string]>): World | null => {
  let text = realSrc[k];
  for (const [from, to] of edits) {
    const n = text.split(from).length - 1;
    if (n !== 1) { problems.push(`PLANT MISSED in ${FILES[k]}: ${j(from.slice(0, 90))} is there ${n} times, not once`); return null; }
    text = text.replace(from, to);
  }
  const src = { ...realSrc, [k]: text };
  return { ...REAL, src, [k]: compileAt(FILES[k], text) } as World;
};
const plant1 = (k: FileKey, from: string, to: string): World | null => plant(k, [from, to]);
const REFUSAL: [string, string] = ['if (!week || week.visibility !== "PUBLIC" || !TERMINAL.includes(week.state)) return null;\n  const rules = frozenRules(week);\n  if (!rules) return null;\n  const qs', "if (!week || !TERMINAL.includes(week.state)) return null;\n  const rules = frozenRules(week);\n  if (!rules) return null;\n  const qs"];
const SHAPE: [string, string] = ["return /^MLN-\\d{4}-W\\d{2}$/.test(s) ? s : null;", "return /^ML[ND]-\\d{4}-W\\d{2}$/.test(s) ? s : null;"];
const PLANTS: Array<[string, string, World | null]> = [
  // §1
  ["the public read without its PUBLIC refusal, a code of either line accepted", "1.1", plant("player", REFUSAL, SHAPE)],
  ["the public read without its PUBLIC refusal (the code's shape alone left to refuse a drive week)", "1.3", plant("player", REFUSAL)],
  ["a code of either line accepted (the visibility alone left to refuse a drive week)", "1.3", plant("player", SHAPE)],
  ["the core given the public register's refusal (a DRIVE week's ticket gets no ledger)", "1.1", plant1("player", "  const week = await weekStore.get(weekId);\n  if (!week || !TERMINAL.includes(week.state)) return null;", '  const week = await weekStore.get(weekId);\n  if (!week || week.visibility !== "PUBLIC" || !TERMINAL.includes(week.state)) return null;')],
  ["the core stating money before the week is final", "1.2", plant1("player", "  const week = await weekStore.get(weekId);\n  if (!week || !TERMINAL.includes(week.state)) return null;", "  const week = await weekStore.get(weekId);\n  if (!week) return null;")],
  // §2
  ["the core reading no tickets (how the winners were found lost)", "2.1", plant1("player", 'return weekMoneyOf(week, rules, week.state === "SETTLED" ? await ticketStore.listForWeek(week.id, { status: "SETTLED" }) : null);', "return weekMoneyOf(week, rules, null);")],
  ["the ledger builder reading a field that is not money (the core's ledger differs)", "2.2", plant1("parts", 'floor: kind === "voided" || w.basis === "TOP_SCORE" ? null : w.floor,', 'floor: kind === "voided" || w.basis === "TOP_SCORE" || !(w as { questions?: unknown }).questions ? null : w.floor,')],
  ["the public record's fields laid back in another order", "2.3", plant1("player", "    ...summary,\n    opensAt: week.opensAt, closesAt: week.closesAt, questionSetHash: week.questionSetHash, ticketMerkleRoot: week.ticketMerkleRoot,\n    carryFromCode, carryToCode,", "    opensAt: week.opensAt, closesAt: week.closesAt, questionSetHash: week.questionSetHash, ticketMerkleRoot: week.ticketMerkleRoot,\n    ...summary,\n    carryFromCode, carryToCode,")],
  ["the core's J − F changed (both reads agree, and both are wrong)", "2.3", plant1("player", "    toWinners: settled && week.jackpot != null && (week.winningTickets ?? 0) > 0 ? week.jackpot - (week.fee ?? 0) : null,\n    remainder: settled && week.jackpot != null ? week.jackpot - (week.fee ?? 0) - (week.paidTotal ?? 0) : null,\n    basis:", "    toWinners: settled && week.jackpot != null && (week.winningTickets ?? 0) > 0 ? week.paidTotal : null,\n    remainder: settled && week.jackpot != null ? week.jackpot - (week.fee ?? 0) - (week.paidTotal ?? 0) : null,\n    basis:")],
  ["the builder's carries opening no page by default", "2.4", plant1("parts", "{ links = true }: { links?: boolean } = {}", "{ links = false }: { links?: boolean } = {}")],
  // §3
  ["the core dropping a DRIVE week's carry in", "3.1", plant1("player", "    ...(await summaryOf(week)),\n    carryFromCode:", '    ...(await summaryOf(week)), carryIn: week.visibility === "DRIVE" ? 0 : week.rolloverIn,\n    carryFromCode:')],
  ["the carry's chain read from the public line, whatever the week's", "3.2", plant1("player", "  const later = (await weekStore.list({ visibility: week.visibility }))", '  const later = (await weekStore.list({ visibility: "PUBLIC" }))')],
  ["`links: false` ignored — a DRIVE week's carry opens a public page that does not exist", "3.3", plant1("parts", "const pageOf = (code: string | null) => (links && code ? registerWeekHref(code) : null);", "const pageOf = (code: string | null) => (code ? registerWeekHref(code) : null);")],
];
let caught = 0;
for (const [name, target, world] of PLANTS) {
  if (!world) { console.log(`INCONCLUSIVE (plant did not apply)  ${name}`); continue; }
  const r = await runAll(world, true);
  const hit = r.failed.includes(target);
  if (hit) caught++; else problems.push(`BLIND: ${target} stayed green with "${name}" planted`);
  console.log(`${(hit ? "PROVED" : "BLIND").padEnd(36)} ${target} · ${name}`);
}
for (const p of problems) console.log(`!! ${p}`);
const untested = CHECKS.map((c) => c.id).filter((id) => !PLANTS.some(([, t]) => t === id));
if (untested.length) console.log(`!! checks with no plant: ${untested.join(", ")}`);
console.log(`\n${caught}/${PLANTS.length} caught`);
process.exit(caught === PLANTS.length && problems.length === 0 && untested.length === 0 ? 0 : 1);
