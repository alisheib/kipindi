/**
 * test:guest-sheet — the journey's guest bet sheet (the Vodacom plan S10, `docs/VODACOM-PLAN.md` §3.7;
 * `docs/design-system/v5-2026-09-29-simplified-journey/S10-PLAN.md` WP1, with its amendments).
 *
 *   npm run test:guest-sheet     (in test:all)
 *   npm run red:guest-sheet      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * What it holds `src/lib/journey/guest-sheet.ts`, `betReturnPath` (pending-bet.ts) and `doorHrefsFor` (auth-landing.ts) to:
 *   §1 THE GUEST'S FRAME — S8's frame with no viewer half: on the deck's Dodoma pools and every estimate state its stake,
 *      bounds, chips and estimate are the money face's; only edit and closed ever draw; the CTA and both quotes withheld.
 *   §2 WHAT A DOOR CARRIES — the bet (a stake only inside the bounds), a keyless, ownerless marker with the page's codes,
 *      the address left behind (every parameter kept) and the `next` (the return page and the bet, nothing else).
 *   §3 THE DOOR'S TAIL — `next` refused unless bounded, `ref` and `invite` normalised or dropped, never cut, never inside
 *      `next`; and the classic question page's guest panel builds its two doors through it (Point for Ali 4, A8).
 *   §4 WHAT AN ADDRESS OPENS — a forwarded stake opens at the minimum; only this tab's ownerless, keyless, fresh marker
 *      lets the stake through; nothing off the journey's pick pages or for a round.
 *   §5 ONE COUNT PER VISITOR OPEN — `returnedOpen` and `countsSheetOpen`.
 *   §6 THE SOURCE — the module imports only sheet-state.ts and pending-bet.ts; no clock, timer, window, document, storage
 *      or fetch; no money figure, rate or multiple typed; client-safe.
 *   §7–§10 THE GUEST HOST (WP4; S10-PLAN A10–A13), its actual callbacks bound from its source against a controlled world:
 *      §7 a tap — the money host's own table, row for row; §8 the doors — a press writes one keyless, ownerless marker
 *      (archiving a legacy envelope first, A7), Next's navigation leaves the carried bet in the address and closes the
 *      sheet, a storage refusal stops nothing; §9 the census — no Server Action, money action or private read anywhere
 *      in its module graph, no key, owner, account store or reload, the public half its only read; §10 an ended
 *      session's flight opens nothing from the address, AppShell's one slot, and the picks' dialog popup.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written, so `test:red-anchors` counts the twin as in-process.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as GS from "../src/lib/journey/guest-sheet.ts";
import * as SS from "../src/lib/journey/sheet-state.ts";
import * as PB from "../src/lib/journey/pending-bet.ts";
import * as AL from "../src/lib/auth-landing.ts";
import { decomment } from "./lib/decomment.mts";
import ts from "typescript";
import { parseSheetSeed } from "../src/lib/journey/sheet-seed.ts";
import { saveSheetSelection } from "../src/lib/journey/sheet-owned-storage.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const PROVE_RED = process.argv.includes("--prove-red");

type Impl = {
  frame: typeof GS.guestFrame; carried: typeof GS.carriedStake; carry: typeof GS.guestCarry; opens: typeof GS.guestOpensFrom;
  returned: typeof GS.returnedOpen; counts: typeof GS.countsSheetOpen; doors: typeof AL.doorHrefsFor; ret: typeof PB.betReturnPath;
  src: string;
  /** src/app/markets/[id]/page.tsx — the classic guest panel's doors (Point for Ali 4). */
  page: string;
  /** §7–§10 · the guest host, the money host and their mount, as written. */
  hostWorld: HostWorld;
};
const SOURCE = read("src/lib/journey/guest-sheet.ts");
const PAGE_SRC = read("src/app/markets/[id]/page.tsx");
const REAL: Impl = {
  frame: GS.guestFrame, carried: GS.carriedStake, carry: GS.guestCarry, opens: GS.guestOpensFrom, returned: GS.returnedOpen,
  counts: GS.countsSheetOpen, doors: AL.doorHrefsFor, ret: PB.betReturnPath, src: SOURCE, page: PAGE_SRC, hostWorld: undefined as unknown as HostWorld,
};

/* ─── The world: the deck's Dodoma pools (VODACOM-PLAN §3.1's goldens) ───────────────────────────────────────── */
const NOW = Date.UTC(2026, 9, 14, 9, 0);
const HOUR = 3_600_000;
const RATES = { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, showEstimatedWinnings: true } as const;
const MKT = "mkt_dodoma01", OTHER = "mkt_mbeya02";
const MIN = 500, MAX = 1_000_000;
const KEY = "0f8b6a52-3c1d-4e7a-9b2f-5d6c7e8f9a01";
function seed(o: Partial<SS.SheetSeed> = {}): SS.SheetSeed {
  return { v: 1, id: MKT, yesPool: 24_825, noPool: 50_462, rates: { ...RATES }, feePct: 13, min: MIN, max: MAX, closesAt: new Date(NOW + HOUR).toISOString(), serverNow: NOW, bettable: true, ...o };
}
const bet = (stake: number | null, id = MKT, side: "YES" | "NO" = "YES"): PB.PendingBet => ({ kind: "market", id, side, stake });
/** A signed-in viewer at TZS 0 — only the red twin's "a guest shown the low frame" plant draws with it. */
const ZERO_WALLET: SS.SheetFacts = {
  maintenance: false, lockout: null, session: null, account: { status: "ACTIVE", coolingOffUntil: null },
  wallet: { status: "ACTIVE", balance: 0, bonusBalance: 0 }, loss: { dailyLossLimit: null, lossToday: 0 }, pendingDeposit: null,
  deposit: { limits: { daily: null, weekly: null, monthly: null }, usage: { day: 0, week: 0, month: 0 }, sof: { accepted: true, singleTxn: 1_000_000, rolling30d: 5_000_000 }, railsOpen: true },
};

/* ─── §7–§10 · the guest host (S10 WP4): its actual callbacks, bound from its source, against a controlled world ─── */

const HOST_PATH = "src/components/journey/bet-sheet/guest-sheet-host.tsx";
const MONEY_HOST_PATH = "src/components/journey/bet-sheet/bet-sheet-host.tsx";
type HostWorld = {
  /** guest-sheet-host.tsx, as written. */
  host: string;
  /** bet-sheet-host.tsx, as written — the tap table's reference. */
  money: string;
  shell: string;
  lazy: string;
  card: string;
  buttons: string;
};
const HOST_WORLD: HostWorld = {
  host: read(HOST_PATH), money: read(MONEY_HOST_PATH), shell: read("src/components/layout/app-shell.tsx"),
  lazy: read("src/components/layout/shell-lazy.tsx"), card: read("src/components/journey/cards/journey-card.tsx"),
  buttons: read("src/components/journey/question/journey-bet-buttons.tsx"),
};

/** The arrow a `const <name> = useCallback(<arrow>, …)` or `const <name> = <arrow>` declares — the ONE in the file. */
function arrowOf(source: string, name: string): string {
  const file = ts.createSourceFile("host.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === name && node.initializer) {
      const init = node.initializer;
      if (ts.isArrowFunction(init)) found.push(init.getText(file));
      else if (ts.isCallExpression(init) && init.arguments[0] && ts.isArrowFunction(init.arguments[0])) found.push(init.arguments[0].getText(file));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (found.length !== 1) throw new Error(`${found.length} declarations of ${name} in the host`);
  return found[0];
}
/** The actual callback, transpiled and bound to the given world — nothing of the host's code is copied here. */
function bindArrow(source: string, name: string, deps: Record<string, unknown>): (...args: unknown[]) => unknown {
  const js = ts.transpileModule(`const callback = ${arrowOf(source, name)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(deps), `${js}\nreturn callback;`)(...Object.values(deps)) as (...args: unknown[]) => unknown;
}
/** A module-level string constant, read from the source as written (the guest host's pick selector). */
const constOf = (source: string, name: string) => new RegExp(`const ${name} = "([^"]+)";`).exec(source)?.[1] ?? null;

/* A fake DOM that reads exactly the selectors the hosts ask, and refuses any other (a plant that changes one fails loudly). */
const ORIGIN = "https://www.50pick.tz";
class FakeElement {
  constructor(public tag: string, public attrs: Record<string, string> = {}, public parent: FakeElement | null = null) {}
  getAttribute(n: string) { return Object.hasOwn(this.attrs, n) ? this.attrs[n] : null; }
  get dataset() {
    const d: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.attrs)) if (k.startsWith("data-")) d[k.slice(5).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
    return d;
  }
  get href() { return this.attrs.href === undefined ? "" : new URL(this.attrs.href, `${ORIGIN}/`).href; }
  get target() { return this.attrs.target ?? ""; }
  matches(sel: string): boolean {
    if (sel === "a[data-bet-side]") return this.tag === "a" && Object.hasOwn(this.attrs, "data-bet-side");
    if (sel === "[data-sheet]") return Object.hasOwn(this.attrs, "data-sheet");
    if (sel === "[data-sheet] a[data-bet-side]") {
      if (!this.matches("a[data-bet-side]")) return false;
      for (let p = this.parent; p; p = p.parent) if (p.matches("[data-sheet]")) return true;
      return false;
    }
    throw new Error(`a selector the fake DOM does not read: ${sel}`);
  }
  closest<T = FakeElement>(sel: string): T | null { for (let n: FakeElement | null = this; n; n = n.parent) if (n.matches(sel)) return n as T; return null; }
}

type TapRow = { name: string; path: string; target: FakeElement; mods?: Partial<Record<"metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented", boolean>>; button?: number };
/** One world of picks: an open card, a card whose seed is not taking bets, a round row with no seed, a card's own link. */
function tapWorld() {
  const seedJson = (o: Partial<SS.SheetSeed> = {}) => JSON.stringify(seed(o));
  const card = new FakeElement("article", { "data-sheet": seedJson(), "data-sheet-title": "Je, Dodoma itanyesha?", "data-sheet-origin": "home" });
  const yes = new FakeElement("a", { href: `/markets/${MKT}?side=YES&from=home`, "data-bet-side": "YES" }, card);
  const yesWord = new FakeElement("span", {}, yes);
  const no = new FakeElement("a", { href: `/markets/${MKT}?side=NO&from=home`, "data-bet-side": "NO" }, card);
  const open = new FakeElement("a", { href: `/markets/${MKT}` }, card);
  const shut = new FakeElement("article", { "data-sheet": seedJson({ bettable: false }) });
  const shutPick = new FakeElement("a", { href: `/markets/${MKT}?side=YES`, "data-bet-side": "YES" }, shut);
  const round = new FakeElement("article", {});
  const roundPick = new FakeElement("a", { href: "/updown/udr_4f1c09aa2d", "data-bet-side": "YES" }, round);
  const odd = new FakeElement("a", { href: `/markets/${MKT}?side=YES`, "data-bet-side": "MAYBE" }, card);
  const away = new FakeElement("a", { href: "https://evil.example/markets", "data-bet-side": "YES" }, card);
  const blank = new FakeElement("a", { href: `/markets/${MKT}?side=YES`, "data-bet-side": "YES", target: "_blank" }, card);
  const button = new FakeElement("div", { "data-sheet": seedJson(), "data-sheet-title": "Je, Dodoma itanyesha?", "data-sheet-origin": "market" });
  const big = new FakeElement("a", { href: `/markets/${MKT}?side=NO`, "data-bet-side": "NO" }, button);
  const rows: TapRow[] = [
    { name: "a plain YES on a home card", path: "/", target: yes }, { name: "the word inside the pick", path: "/", target: yesWord },
    { name: "a plain NO", path: "/live", target: no }, { name: "a question's big button", path: `/markets/${MKT}`, target: big },
    { name: "the card's own link", path: "/", target: open }, { name: "a seed not taking bets", path: "/", target: shutPick },
    { name: "a round row (no seed)", path: "/live", target: roundPick }, { name: "a side that is not YES or NO", path: "/", target: odd },
    { name: "another origin", path: "/", target: away }, { name: "a new-tab target", path: "/", target: blank },
    { name: "a page with no picks (/wallet)", path: "/wallet", target: yes }, { name: "/positions", path: "/positions", target: yes },
    { name: "meta", path: "/", target: yes, mods: { metaKey: true } }, { name: "ctrl", path: "/", target: yes, mods: { ctrlKey: true } },
    { name: "shift", path: "/", target: yes, mods: { shiftKey: true } }, { name: "alt", path: "/", target: yes, mods: { altKey: true } },
    { name: "already prevented", path: "/", target: yes, mods: { defaultPrevented: true } }, { name: "a middle button", path: "/", target: yes, button: 1 },
  ];
  return rows;
}
/** Every row through one host's actual `click`: what it prevented, pushed and opened. */
function tapTable(source: string, extra: Record<string, unknown> = {}): string[] {
  return tapWorld().map((row) => {
    const log: { prevented: boolean; pushed: string | null; opened: unknown[] | null; popped: number } = { prevented: false, pushed: null, opened: null, popped: 0 };
    const window = {
      location: { pathname: row.path, search: "?cat=weather", hash: "", href: `${ORIGIN}${row.path}?cat=weather`, origin: ORIGIN },
      history: { pushState: (_: unknown, __: unknown, url: string) => { log.pushed = url; } },
    };
    try {
      const click = bindArrow(source, "click", { parseSheetSeed, sheetOpensOn: SS.sheetOpensOn, withBet: SS.withBet, playPressPop: () => { log.popped++; },
        // The guest's `open` takes a seventh argument, the stake an address allows (null for a tap): the table compares
        // the six both hosts share — the seed, the side, the title, pushed, dropSide and the origin.
        flushSync: (work: () => void) => work(), open: (...args: unknown[]) => { log.opened = args.slice(0, 6); }, window, Element: FakeElement, ...extra });
      click({ ...{ defaultPrevented: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }, ...row.mods, button: row.button ?? 0, target: row.target,
        preventDefault: () => { log.prevented = true; } });
      return `${row.name}: ${JSON.stringify(log)}`;
    } catch (e) { return `${row.name}: THREW ${String(e).slice(0, 80)}`; }
  });
}

/* The storage, the history and the clock the doors write to. */
function doorWorld(o: { stakeText: string; search: string; storage?: Record<string, string>; storageThrows?: boolean }) {
  const store = new Map(Object.entries(o.storage ?? {}));
  const writes: string[] = [], history: string[] = [];
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { writes.push(k); store.set(k, v); },
    removeItem: (k: string) => { writes.push(`-${k}`); store.delete(k); },
  };
  const window = {
    get sessionStorage() { if (o.storageThrows) throw new Error("SecurityError: storage is disabled"); return sessionStorage; },
    location: { pathname: "/", search: o.search, hash: "#top" },
    history: { replaceState: (_: unknown, __: unknown, url: string) => history.push(`replace ${url}`), pushState: (_: unknown, __: unknown, url: string) => history.push(`push ${url}`), back: () => history.push("back") },
  };
  const active = { seed: seed(), side: "YES" as const, title: "Je, Dodoma itanyesha?", stakeText: o.stakeText, offset: 0, serial: 1, pathname: "/", pushed: true, dropSide: false, estimateUpdated: false };
  const shown: unknown[] = [];
  /** The host's actual `carryNow`, `press` and `leave`, bound to this world; `press` then `leave`, as Next calls a door's
   *  onClick and then its onNavigate. */
  const run = (host: string, which: "both" | "press" = "both") => {
    const carryNow = bindArrow(host, "carryNow", { current: { current: active }, Date: { now: () => NOW }, guestFrame: GS.guestFrame, guestCarry: GS.guestCarry, carriedStake: GS.carriedStake, window });
    bindArrow(host, "press", { carryNow, saveSheetSelection, window })();
    if (which === "both") bindArrow(host, "leave", { carryNow, mounted: { current: true }, window, generation: { current: 0 }, stopWaiting: () => {}, show: (v: unknown) => shown.push(v) })();
  };
  return { store, writes, history, shown, run };
}

function hostChecks(impl: Impl, w: HostWorld, ok: (label: string, cond: boolean, extra?: string) => void) {
  const j = (v: unknown) => JSON.stringify(v);
  const host = decomment(w.host), money = decomment(w.money);

  /* §7 · a tap: the money host's own table, row for row */
  const pick = constOf(host, "PICK");
  const guestTaps = tapTable(host, { PICK: pick }), moneyTaps = tapTable(money);
  const opened = guestTaps.filter((r) => r.includes('"opened":["') || r.includes('"opened":[{'));
  ok("7.tap · the guest host takes exactly the taps the money host takes (18 rows: a plain pick on a card or a big button, the word inside it — and never the card's own link, a seed not taking bets, a round, an odd side, another origin, a new tab, a page with no picks, a modifier, a prevented click or a middle button), with S8's moves: preventDefault, the press pop, ?bet=<id>.<side> pushed, the sheet opened on the tap frame",
    pick === "[data-sheet] a[data-bet-side]" && j(guestTaps) === j(moneyTaps) && guestTaps.length === 18 && opened.length === 4
      && guestTaps[0].includes(`"pushed":"/?cat=weather&bet=${MKT}.YES"`) && guestTaps[0].includes('"prevented":true') && guestTaps[0].includes('"popped":1'),
    j(guestTaps.filter((r, i) => r !== moneyTaps[i]).slice(0, 3)));

  /* §8 · the doors: a press writes the marker; Next's navigation of this tab leaves the address and closes the sheet */
  const SEARCH = `?cat=weather&ref=50pick-ag-abc123&invite=inv-9&utm_source=agency&bet=${MKT}.YES`;
  const inBounds = doorWorld({ stakeText: "2500", search: SEARCH });
  try { inBounds.run(host); } catch (e) { inBounds.history.push(`THREW ${String(e).slice(0, 60)}`); }
  const marker = PB.readMarker(inBounds.store.get(PB.PENDING_BET_KEY), NOW);
  ok("8.doors · a press writes ONE key, kp-pending-bet: the bet at the carried stake with the page's codes, no request key, no owner; then Next's navigation replaces the address with that bet (every parameter and the hash kept), closes the sheet and never goes back or pushes",
    j(inBounds.writes) === j([PB.PENDING_BET_KEY]) && marker?.bet === `${MKT}.YES.2500` && marker.k === undefined && marker.owner === undefined
      && marker.ref === "50PICK-AG-ABC123" && marker.invite === "INV-9" && marker.at === NOW
      && j(inBounds.history) === j([`replace /?cat=weather&ref=50pick-ag-abc123&invite=inv-9&utm_source=agency&bet=${MKT}.YES.2500#top`])
      && j(inBounds.shown) === j([null]), j({ writes: inBounds.writes, marker, history: inBounds.history, shown: inBounds.shown }));
  const below = doorWorld({ stakeText: "499", search: SEARCH });
  try { below.run(host); } catch { below.history.push("THREW"); }
  ok("8.outside · a stake outside the bounds carries the side alone: the marker and the address name id.side, never 499 (Open point 6)",
    PB.readMarker(below.store.get(PB.PENDING_BET_KEY), NOW)?.bet === `${MKT}.YES` && below.history.length === 1 && below.history[0].endsWith(`&bet=${MKT}.YES#top`),
    j({ marker: below.store.get(PB.PENDING_BET_KEY), history: below.history }));
  const legacyRaw = JSON.stringify({ bet: `${MKT}.NO.3000`, at: NOW - 60_000, k: "0f8b6a52-3c1d-4e7a-9b2f-5d6c7e8f9a01" });
  const legacy = doorWorld({ stakeText: "2500", search: SEARCH, storage: { [PB.PENDING_BET_KEY]: legacyRaw } });
  try { legacy.run(host, "press"); } catch { legacy.writes.push("THREW"); }
  const archive = legacy.store.get("kp-sheet-intents:legacy:v1") ?? "";
  ok("8.legacy · a keyed envelope an earlier signed-in request left is archived first (kp-sheet-intents:legacy:v1), never destroyed, and only then replaced by the guest's keyless choice (A7)",
    j(legacy.writes) === j(["kp-sheet-intents:legacy:v1", PB.PENDING_BET_KEY]) && archive.includes(JSON.stringify(legacyRaw).slice(1, -1))
      && PB.readMarker(legacy.store.get(PB.PENDING_BET_KEY), NOW)?.bet === `${MKT}.YES.2500`, j({ writes: legacy.writes, archive: archive.slice(0, 120) }));
  const refused = doorWorld({ stakeText: "2500", search: SEARCH, storageThrows: true });
  let refusedThrew = false;
  try { refused.run(host); } catch { refusedThrew = true; }
  ok("8.refusal · storage that refuses never stops the visitor: the press throws nothing and the door still leaves (Open point 7)",
    !refusedThrew && refused.history.length === 1 && refused.history[0].startsWith("replace "), j({ refusedThrew, history: refused.history }));

  /* §9 · the census: no money code reaches a guest */
  const graph = importGraph(w.host, HOST_PATH);
  // A money action is a Server Action: a "use server" module, any import from @/app, or a call of one by its name (a
  // dictionary KEY that happens to share a name — `journey.depositAction: "+ Weka pesa"` — is no call).
  const moneyInGraph = graph.files.filter(([, src]) => /^\s*["']use server["']/m.test(src) || /from\s+"@\/app\//.test(src)
    || /\b(?:buyPositionAction|sellPositionAction|cashOutAction|depositAction|withdrawAction)\s*\(/.test(decomment(src)));
  ok("9.graph · the guest host's whole module graph reaches no Server Action, no @/app module and no money action",
    graph.files.length >= 12 && moneyInGraph.length === 0 && graph.unresolved.length === 0, j({ files: graph.files.length, moneyInGraph: moneyInGraph.map(([p]) => p), unresolved: graph.unresolved }));
  const never = ["me=1", "\"me\"", "crypto.randomUUID", "mintIntentKey", "saveOwnedSheet", "resolveLegacySheet", "kp-sheet-intents", "sheetOwnerKey", "location.reload",
    "quarantineLegacySheet", "writeMarker", "viewerId", "localStorage", "requestFor"].filter((n) => host.includes(n));
  ok("9.never · it names no private read, request key, owner, account store, legacy resolver, reload, marker writer or local storage — its one storage name is PENDING_BET_KEY and its one write saveSheetSelection",
    never.length === 0 && (host.match(/saveSheetSelection\(/g) ?? []).length === 1 && (host.match(/sessionStorage\.(?:setItem|removeItem)/g) ?? []).length === 0
      && (host.match(/sessionStorage\.getItem\(PENDING_BET_KEY\)/g) ?? []).length === 1, j(never));
  const fetches = [...host.matchAll(/fetch\((`[^`]*`|"[^"]*")/g)].map((m) => m[1]);
  ok("9.fetch · its only reads are the public half of the sheet route (no query at all) and the client-error report",
    j(fetches) === j(['"/api/client-error"', "`/api/markets/${encodeURIComponent(before.seed.id)}/sheet`"]), j(fetches));

  /* §10 · the mount, the ended session and the picks' popup */
  const watched: string[] = [];
  const endedOpen = bindArrow(host, "openAddress", { ended: { current: true }, window: { location: { pathname: "/", search: `?bet=${MKT}.YES.2500` } }, markerRaw: () => null,
    guestOpensFrom: (...a: unknown[]) => { watched.push("read"); return (GS.guestOpensFrom as (...x: unknown[]) => unknown)(...a); }, current: { current: null },
    stopWaiting: () => watched.push("stop"), generation: { current: 0 }, document: { querySelectorAll: () => { watched.push("dom"); return []; } },
    open: () => watched.push("open"), MutationObserver: class { observe() { watched.push("observe"); } disconnect() {} }, waiting: { current: null }, sameSheet: () => false,
    parseSheetSeed, SEED_WAIT_MS: 5_000, mounted: { current: true } });
  try { endedOpen(); } catch { watched.push("THREW"); }
  ok("10.ended · on a flight that ended a session the address opens nothing — not read, not looked for, not waited for — the session-ended notice speaks (Open point 20)",
    watched.length === 0, j(watched));
  const shellNow = decomment(w.shell);
  ok("10.slot · AppShell's one host slot: a journey request gets the money host with the session's own id when signed in and the guest host (told whether this flight ended a session) when not, each the one child of its own boundary; a classic request still renders one false; shell-lazy loads it like every part",
    shellNow.includes("{journeyShown && (session ? <Suspense fallback={null}><LazyBetSheetHost key={session.userId} viewerId={session.userId} /></Suspense> : <Suspense fallback={null}><LazyGuestSheetHost sessionEnded={endedNotice !== null} /></Suspense>)}")
      && !shellNow.includes("journeyShown && session && <Suspense")
      && decomment(w.lazy).includes('export const LazyGuestSheetHost = dynamic(() => import("@/components/journey/bet-sheet/guest-sheet-host").then((m) => m.GuestSheetHost).catch(nothingIfLost));'),
    "");
  const card = decomment(w.card), buttons = decomment(w.buttons);
  ok("10.popup · every journey pick that opens the sheet says so (aria-haspopup=\"dialog\", S8-PLAN A22 item 9), exactly where it carries data-bet-side: the card's picks (only while their seed is open) and the question's big buttons",
    card.includes('data-bet-side={openSheet ? side : undefined}') && card.includes('aria-haspopup={openSheet ? "dialog" : undefined}')
      && buttons.includes('data-bet-side={side} data-bet-origin="market" aria-haspopup="dialog"'), "");
}

/** The module graph from a source, resolved against src/: every file it reaches through `@/` and relative imports. */
function importGraph(entry: string, entryPath: string): { files: Array<[string, string]>; unresolved: string[] } {
  const files = new Map<string, string>(), unresolved: string[] = [];
  const resolve = (spec: string, from: string): string | null => {
    const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? join(dirname(from), spec).replace(/\\/g, "/") : null;
    if (base === null || /\.(css|json|svg)$/.test(base)) return null;
    for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) { try { readFileSync(join(ROOT, base + ext)); if (!/\.(ts|tsx)$/.test(base + ext)) continue; return base + ext; } catch { /* next */ } }
    unresolved.push(`${spec} (from ${from})`); return null;
  };
  const walk = (path: string, src: string) => {
    if (files.has(path)) return;
    files.set(path, src);
    for (const m of decomment(src).matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)) {
      const next = resolve(m[1], path);
      if (next && !files.has(next)) walk(next, read(next));
    }
  };
  walk(entryPath, entry);
  return { files: [...files.entries()], unresolved };
}
REAL.hostWorld = HOST_WORLD;

function run(impl: Impl, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const j = (v: unknown) => JSON.stringify(v);
  const safe = <T,>(f: () => T): T | "threw" => { try { return f(); } catch { return "threw"; } };

  /* §1 · the guest's frame */
  const money = (o: Partial<SS.SheetFrameInput> = {}) => SS.sheetFrame({ seed: seed(), side: "YES", stakeText: "5000", viewer: { state: "failed" }, nowMs: NOW, intent: null, settled: null, ...o });
  const guest = (o: Partial<GS.GuestFrameInput> = {}) => safe(() => impl.frame({ seed: seed(), side: "YES", stakeText: "5000", nowMs: NOW, ...o }));
  const SAME = ["frame", "bounds", "stake", "breaks", "stakeInvalid", "attention", "chips", "estimate", "showEstimate", "holder", "lines", "closedBody", "low", "pending", "lossRoom", "receipt", "block"] as const;
  const same = (g: SS.SheetFrame | "threw", m: SS.SheetFrame) => g !== "threw" && SAME.every((k) => j(g[k]) === j(m[k]));
  const withheld = (g: SS.SheetFrame | "threw") => g !== "threw" && g.cta === null && g.quote === null && g.betInsteadQuote === null && SS.quoteAt(g) === null && SS.quoteAt(g, "betInstead") === null;
  const deck = [guest({ stakeText: "1000" }), guest({ stakeText: "5000" })];
  ok("1.deck · Dodoma at TZS 1,000 → TZS 2,700 ≈2.7×; at 5,000 → TZS 12,360 ≈2.5× — the money face's own estimate, its stake, bounds and chips, with the CTA and both quotes withheld",
    deck.every((g) => g !== "threw" && g.frame === "edit") && j(deck.map((g) => g !== "threw" && g.estimate && [g.estimate.payout, g.estimate.multText])) === j([[2_700, "2.7"], [12_360, "2.5"]])
      && same(deck[0], money({ stakeText: "1000" })) && same(deck[1], money()) && deck.every(withheld)
      && deck[1] !== "threw" && j(deck[1].chips) === j([500, 1_000, 2_500, 5_000]), j(deck));
  const stateCases: Array<[string, Partial<SS.SheetSeed>, string]> = [
    ["priced", {}, "priced"], ["fills an empty side", { yesPool: 0, noPool: 3_000 }, "fillsEmptySide"],
    ["one side refunded", { yesPool: 3_000, noPool: 0 }, "oneSidedRefund"], ["an empty pool", { yesPool: 0, noPool: 0 }, "emptyPool"],
    ["a legacy capped fee", { rates: { feeModel: "capped-commission", commissionRate: 0.1, feeCeilingRate: 0.333 } }, "hidden"],
    ["over the cap", { yesPool: 1_000, noPool: 500_000 }, "priced"], ["thin", { yesPool: 500_000, noPool: 20_000 }, "priced"],
  ];
  const states = stateCases.map(([name, s]) => ({ name, g: guest({ seed: seed(s), stakeText: String(MIN) }), m: money({ seed: seed(s), stakeText: String(MIN) }) }));
  ok("1.states · priced, an empty side, one side refunded, an empty pool, a legacy fee, over the cap and thin: each the money face's own estimate, never a figure of the guest's",
    states.every(({ g, m }, i) => same(g, m) && g !== "threw" && g.estimate?.state === stateCases[i][2] && withheld(g))
      && states[5].g !== "threw" && states[5].g.estimate?.overCap === true && states[6].g !== "threw" && states[6].g.estimate?.lean === "thin",
    j(states.filter(({ g, m }, i) => !(same(g, m) && g !== "threw" && g.estimate?.state === stateCases[i][2])).map((x) => x.name)));
  const bounds = ["", "12.5", "499", String(MAX + 1)].map((s) => ({ s, g: guest({ stakeText: s }), m: money({ stakeText: s }) }));
  ok("1.bounds · empty, not whole, below and above: the edit frame naming its break, as the money face reads it, with nothing to commit",
    j(bounds.map((b) => b.g !== "threw" && [b.g.frame, b.g.breaks])) === j([["edit", "empty"], ["edit", "notWhole"], ["edit", "below"], ["edit", "above"]])
      && bounds.every((b) => same(b.g, b.m) && withheld(b.g)), j(bounds.map((b) => b.g !== "threw" && [b.g.frame, b.g.breaks])));
  const shut = [guest({ seed: seed({ bettable: false }) }), guest({ nowMs: NOW + HOUR - 30_000, offsetMs: 60_000 }), guest({ nowMs: NOW + HOUR - 60_000, offsetMs: 0 })];
  ok("1.closed · a seed not taking bets is closed; a phone clock 30 s behind the close on a server one minute ahead is closed; one minute before on the server's clock is still open",
    shut[0] !== "threw" && shut[0].frame === "closed" && shut[1] !== "threw" && shut[1].frame === "closed" && shut[2] !== "threw" && shut[2].frame === "edit"
      && shut.every(withheld), j(shut.map((g) => g !== "threw" && g.frame)));
  const sweep: string[] = [];
  for (const s of [seed(), seed({ bettable: false }), seed({ yesPool: 0, noPool: 0 }), seed({ closesAt: null }), seed({ closesAt: new Date(NOW - 1).toISOString() })])
    for (const text of ["", "0", "1", "499", "500", "5000", "5,000", "TZS 5000", "1000000", "1000001", "12.5", "5000.00", "abc", "-5"])
      for (const side of ["YES", "NO"] as const) {
        const g = guest({ seed: s, stakeText: text, side });
        if (g === "threw" || !["edit", "closed"].includes(g.frame) || !withheld(g) || g.balance.kind === "known" || g.low !== null || g.pending !== null || g.block !== null) sweep.push(`${s.bettable}/${text}/${side}`);
      }
  ok("1.only · across 140 seeds, stakes and sides only edit and closed ever draw: never low, pending, blocked, placing, in doubt or a receipt, never a balance figure, never a commit",
    sweep.length === 0, j(sweep.slice(0, 6)));

  /* §2 · what a door carries */
  const carriedOf = (text: string, s = seed()) => { const g = guest({ seed: s, stakeText: text }); return g === "threw" ? "threw" : safe(() => impl.carried(g)); };
  ok("2.carried · a stake inside the bounds is carried; empty, not whole, below, above and a closed question carry none (Open point 6)",
    j(["5000", "500", String(MAX), "", "12.5", "499", String(MAX + 1)].map((t) => carriedOf(t))) === j([5_000, 500, MAX, null, null, null, null])
      && carriedOf("5000", seed({ bettable: false })) === null);
  const PAGE = `?cat=weather&q=rain&page=2&from=home&ref=50pick-ag-abc123&invite=inv-9&utm_source=agency&utm_campaign=launch&gclid=zz`;
  const carry = safe(() => impl.carry({ pathname: "/", search: PAGE, seedId: MKT, side: "YES", stake: 5_000, nowMs: NOW }));
  const marker = carry && carry !== "threw" ? (JSON.parse(carry.markerRaw) as Record<string, unknown>) : null;
  ok("2.carry · inside the bounds the bet is id.side.stake; the marker is exactly that bet, its time and the page's codes — never a key, never an owner",
    carry !== null && carry !== "threw" && PB.formatBetParam(carry.bet) === `${MKT}.YES.5000` && marker !== null
      && j(Object.keys(marker).sort()) === j(["at", "bet", "invite", "ref", "utm"]) && marker.bet === `${MKT}.YES.5000` && marker.at === NOW
      && marker.ref === "50PICK-AG-ABC123" && marker.invite === "INV-9" && j(marker.utm) === j({ utm_source: "agency", utm_campaign: "launch" })
      && PB.readMarker(carry.markerRaw, NOW)?.k === undefined && PB.readMarker(carry.markerRaw, NOW)?.owner === undefined
      && PB.stakeFromUrl(carry.bet, carry.markerRaw, NOW) === 5_000, j({ carry, marker }));
  ok("2.address · the address left behind is the page with the bet set and every other parameter kept (cat, q, page, from and the codes)",
    carry !== null && carry !== "threw" && carry.address.startsWith("/?")
      && (() => { const q = new URLSearchParams(carry.address.slice(1)); return q.get("bet") === `${MKT}.YES.5000` && q.get("cat") === "weather" && q.get("q") === "rain" && q.get("page") === "2" && q.get("from") === "home" && q.get("ref") === "50pick-ag-abc123" && q.get("invite") === "inv-9"; })(),
    j(carry));
  const nexts = ([["/", MKT], ["/live", MKT], ["/watchlist", MKT], [`/markets/${MKT}`, MKT], [`/markets/${OTHER}`, MKT], ["/positions", MKT]] as const)
    .map(([p, id]) => { const c = safe(() => impl.carry({ pathname: p, search: PAGE, seedId: id, side: "NO", stake: null, nowMs: NOW })); return c && c !== "threw" ? c.next : c; });
  ok("2.next · `next` is the return page and the bet alone: the home, /live, /watchlist and the bet's own page keep their page; a similar-rail tap on question A returns to B's own page (Open point 13); no code, filter or campaign tag rides inside it",
    j(nexts) === j([`/?bet=${MKT}.NO`, `/live?bet=${MKT}.NO`, `/watchlist?bet=${MKT}.NO`, `/markets/${MKT}?bet=${MKT}.NO`, `/markets/${MKT}?bet=${MKT}.NO`, `/markets/${MKT}?bet=${MKT}.NO`]), j(nexts));
  const outside = safe(() => impl.carry({ pathname: "/", search: "", seedId: MKT, side: "YES", stake: null, nowMs: NOW }));
  const refused = [safe(() => impl.carry({ pathname: "/", search: "", seedId: "evil.YES", side: "YES", stake: 5_000, nowMs: NOW })),
    safe(() => impl.carry({ pathname: "/", search: "", seedId: MKT, side: "UP" as never, stake: 5_000, nowMs: NOW }))];
  const oddStakes = [0, -5, 12.5, 1_234_567_890].map((s) => { const c = safe(() => impl.carry({ pathname: "/", search: "", seedId: MKT, side: "YES", stake: s, nowMs: NOW })); return c && c !== "threw" ? PB.formatBetParam(c.bet) : c; });
  ok("2.refuse · outside the bounds the doors carry the side alone; a stake no bet can hold is dropped to the side; a seed id or side the grammar refuses carries nothing",
    outside !== null && outside !== "threw" && PB.formatBetParam(outside.bet) === `${MKT}.YES` && refused.every((r) => r === null)
      && oddStakes.every((s) => s === `${MKT}.YES`), j({ outside, refused, oddStakes }));
  const returns = ([["/", bet(1)], ["/live", bet(1)], ["/watchlist", bet(1)], [`/markets/${MKT}`, bet(1)], [`/markets/${OTHER}`, bet(1)], ["/positions", bet(1)],
    ["/live/", bet(1)], [`/markets/${MKT}?x=1#h`, bet(1)], ["/", { kind: "round", id: "udr_1", side: "UP", stake: null }]] as const)
    .map(([p, b]) => safe(() => impl.ret(p, b as PB.PendingBet)));
  ok("2.return · betReturnPath: the home, /live, /watchlist and the bet's own page are kept; any other page, a trailing slash or a rail's question returns to the bet's own page; a round to its own",
    j(returns) === j(["/", "/live", "/watchlist", `/markets/${MKT}`, `/markets/${MKT}`, `/markets/${MKT}`, `/markets/${MKT}`, `/markets/${MKT}`, "/updown/udr_1"])
      && j(PB.BET_RETURN_PAGES) === j(["/", "/live", "/watchlist"]) && PB.BET_RETURN_PAGES.every((p) => SS.sheetOpensOn(p)), j(returns));

  /* §3 · the door's tail */
  const tail = (next: string, q: string) => { const d = safe(() => impl.doors(next, new URLSearchParams(q))); return d === "threw" ? d : `${d.signIn} | ${d.signUp}`; };
  const both = (t: string) => `/auth/login${t} | /auth/register${t}`;
  const N = `/markets/${MKT}?bet=${MKT}.YES.5000`;
  const rows: Array<[[string, string], string]> = [
    [[N, "ref=50pick-ag-abc123&invite=inv-9"], both(`?next=${encodeURIComponent(N)}&ref=50PICK-AG-ABC123&invite=INV-9`)],
    [[N, "invite=a b"], both(`?next=${encodeURIComponent(N)}&invite=A+B`)],
    [[N, `invite=${"X".repeat(25)}&ref=abc_123`], both(`?next=${encodeURIComponent(N)}`)],
    [[N, "invite=A%00B"], both(`?next=${encodeURIComponent(N)}`)],
    [["/" + "a".repeat(600), "ref=ab12cd"], both("?ref=AB12CD")],
    [["/auth/login", "invite=inv-9"], both("?invite=INV-9")],
    [["//evil.example", ""], both("")],
    [["/\t/evil.example", ""], both("")],
    [["/positions", "ref=ab12cd&invite=inv-9&utm_source=x"], both("?next=%2Fpositions&ref=AB12CD&invite=INV-9")],
  ];
  const tails = rows.map(([[n, q]]) => tail(n, q));
  ok("3.tail · doorHrefsFor: next kept only when bounded (over 512, an /auth page, //evil or a tab trick is dropped, never cut); ref and invite normalised beside it, a spaced invite URL-encoded, an over-long, control-bearing or malformed code dropped; nothing else rides",
    rows.every(([, want], i) => tails[i] === want), j(rows.map(([i, w], k) => [i, w, tails[k]]).filter(([, w, g]) => w !== g)));

  // 3.question-panel · Point for Ali 4 (A8): the classic question page's guest panel ("Ingia ili kutabiri") builds its
  // two doors through the one tail, with the page's own ref AND invite; with no invite its hrefs are byte for byte
  // the ones it built before (the old formula, recomputed here), so a classic guest without a campaign gets the same page.
  const panelAt = decomment(impl.page).indexOf("const betNext = ");
  const panel = panelAt < 0 ? "" : decomment(impl.page).slice(panelAt, decomment(impl.page).indexOf("})()}", panelAt));
  const oldFormula = (next: string, ref: string | null) => `?next=${encodeURIComponent(next)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;
  const QN = `/markets/${MKT}?side=YES`;
  const before = safe(() => impl.doors(QN, new URLSearchParams("ref=50pick-ag-abc123")));
  const withInvite = safe(() => impl.doors(QN, new URLSearchParams("ref=50pick-ag-abc123&invite=inv-9")));
  ok("3.question-panel · the classic question page's guest panel builds both doors through doorHrefsFor with the page's own ref and invite (Point for Ali 4); with no invite its hrefs are exactly the old ones",
    panel.includes("const doors = doorHrefsFor(betNext, codes);") && panel.includes('if (typeof sp.ref === "string") codes.set("ref", sp.ref);')
      && panel.includes('if (typeof sp.invite === "string") codes.set("invite", sp.invite);')
      && panel.includes("href={doors.signUp as never}") && panel.includes("href={doors.signIn as never}")
      && !panel.includes("encodeURIComponent(") && !panel.includes("?next=")
      && before !== "threw" && before.signUp === `/auth/register${oldFormula(QN, "50PICK-AG-ABC123")}` && before.signIn === `/auth/login${oldFormula(QN, "50PICK-AG-ABC123")}`
      && withInvite !== "threw" && withInvite.signUp === `/auth/register${oldFormula(QN, "50PICK-AG-ABC123")}&invite=INV-9`,
    j({ panel: panel.length, before, withInvite }));

  /* §4 · what an address opens */
  const own = (stake: number | null, o: { at?: number; owner?: string; key?: string; id?: string } = {}) =>
    PB.writeMarker(bet(stake, o.id ?? MKT), o.at ?? NOW - HOUR, {}, o.key, o.owner);
  const at = (path: string, q: string, markerRaw: string | null) => safe(() => impl.opens(path, q, markerRaw, NOW));
  const opened = {
    forwarded: at("/", `bet=${MKT}.YES.50000`, null),
    mine: at("/", `bet=${MKT}.YES.5000`, own(5_000)),
    stamped: at("/", `bet=${MKT}.YES.5000`, own(5_000, { owner: "usr_someone" })),
    keyed: at("/", `bet=${MKT}.YES.5000`, own(5_000, { key: KEY })),
    stale: at("/", `bet=${MKT}.YES.5000`, own(5_000, { at: NOW - 24 * HOUR })),
    future: at("/", `bet=${MKT}.YES.5000`, own(5_000, { at: NOW + HOUR })),
    otherStake: at("/", `bet=${MKT}.YES.9000`, own(5_000)),
    side: at(`/markets/${MKT}`, "side=NO&utm_source=agency", null),
  };
  ok("4.opens · a forwarded stake opens at the minimum; this tab's own ownerless, keyless marker under 24 hours old naming the same bet opens at its stake; an owner-stamped, keyed, stale, future-dated or different-stake marker opens at the minimum",
    j(Object.values(opened).map((o) => o !== null && o !== "threw" ? o.stake : o)) === j([null, 5_000, null, null, null, null, null, null]), j(opened));
  ok("4.side · a campaign link's ?side= on a question's own page opens that side at the minimum and closing strips side; ?bet= does not",
    opened.side !== null && opened.side !== "threw" && j(opened.side.bet) === j(bet(null, MKT, "NO")) && opened.side.dropSide === true
      && opened.mine !== null && opened.mine !== "threw" && opened.mine.dropSide === false, j(opened.side));
  const nothing = [at("/wallet/deposit", `bet=${MKT}.YES.5000`, own(5_000)), at("/auth/register", `bet=${MKT}.YES.5000`, null), at("/", "bet=udr_4f1c09aa2d.UP.5000", null),
    at("/", "bet=nonsense", null), at("/", "side=YES", null), at("/positions", `bet=${MKT}.YES`, null)];
  ok("4.nothing · /wallet/*, /auth/*, /positions, a round, a malformed bet and a bare ?side= off a question's page open nothing", nothing.every((n) => n === null), j(nothing));

  /* §5 · one count per visitor open */
  const returned = {
    door: safe(() => impl.returned(own(5_000), bet(5_000), NOW)),
    stamped: safe(() => impl.returned(own(5_000, { owner: "usr_someone" }), bet(5_000), NOW)),
    stakeless: safe(() => impl.returned(own(5_000), bet(null), NOW)),
    keyed: safe(() => impl.returned(own(5_000, { key: KEY }), bet(5_000), NOW)),
    stale: safe(() => impl.returned(own(5_000, { at: NOW - 24 * HOUR }), bet(5_000), NOW)),
    otherBet: safe(() => impl.returned(own(5_000, { id: OTHER }), bet(5_000), NOW)),
    none: safe(() => impl.returned(null, bet(5_000), NOW)),
  };
  ok("5.returned · only a guest door's own marker (ownerless, keyless, under 24 hours, naming the address's bet with its stake) continues a counted open",
    j(Object.values(returned)) === j([true, false, false, false, false, false, false]), j(returned));
  const counts = [
    safe(() => impl.counts({ tapped: true, markerRaw: own(5_000), bet: bet(5_000), nowMs: NOW })),
    safe(() => impl.counts({ tapped: false, markerRaw: own(5_000), bet: bet(5_000), nowMs: NOW })),
    safe(() => impl.counts({ tapped: false, markerRaw: own(5_000, { owner: "usr_someone" }), bet: bet(5_000), nowMs: NOW })),
    safe(() => impl.counts({ tapped: false, markerRaw: null, bet: bet(null), nowMs: NOW })),
  ];
  ok("5.counts · a tap always counts; the return to a visitor's own counted bet does not count twice; a signed-in player's own address open and a reload count as S8 counts them",
    j(counts) === j([true, false, true, true]), j(counts));

  /* §6 · the source */
  const code = decomment(impl.src);
  const imports = [...code.matchAll(/^import[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
  ok("6.imports · guest-sheet.ts imports only ./sheet-state and ./pending-bet", j([...new Set(imports)].sort()) === j(["./pending-bet", "./sheet-state"]), j(imports));
  const clocks = [...code.matchAll(/Date\.now\(|new Date\(|performance\.now|setTimeout|setInterval|\bwindow\b|\bdocument\b|sessionStorage|localStorage|\bfetch\(/g)].map((m) => m[0]);
  ok("6.clock · no clock but the caller's, no timer, window, document, storage or fetch", clocks.length === 0, j(clocks));
  const typed = code.split("\n").filter((l) => {
    const bare = l.replace(/"[^"]*"/g, '""');
    return /%|×/.test(bare) || [...bare.matchAll(/(?<![\w.])(\d[\d_]*)(?![\w.])/g)].some((m) => Number(m[1].replace(/_/g, "")) >= 500);
  });
  ok("6.typed · no rate, multiple or shilling amount is typed: every figure is the engine's", typed.length === 0, j(typed));
  ok("6.client-safe · no server module, server-only, Server Action or Next import", !/from\s+"@\/lib\/server|server-only|"use server"|from\s+"next\//.test(code));

  /* §7–§10 · the guest host */
  hostChecks(impl, impl.hostWorld, ok);
  return failed;
}

if (!PROVE_RED) {
  console.log("guest-sheet — the Vodacom plan S10 WP1 (pure)");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`\nGUEST SHEET — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  type Plant = { name: string; expect: RegExp; impl: Impl };
  /** One defect in a copy of a host-world file; an anchor that does not resolve exactly once is a broken plant. */
  const hostPlant = (k: keyof HostWorld, from: string, to: string): Impl => {
    const n = HOST_WORLD[k].split(from).length - 1;
    if (n !== 1) throw new Error(`the plant's anchor resolves ${n} times in ${k}, not once: ${from.slice(0, 60)}`);
    return { ...REAL, hostWorld: { ...HOST_WORLD, [k]: HOST_WORLD[k].replace(from, () => to) } };
  };
  const plants: Plant[] = [
    // §7 · a tap
    { name: "the guest host takes a modified click", expect: /^7\.tap /, impl: hostPlant("host", "event.metaKey || ", "") },
    { name: "the guest host opens a seed that is not taking bets", expect: /^7\.tap /, impl: hostPlant("host", "!seed.bettable || ", "") },
    { name: "the guest host pushes no address for its sheet", expect: /^7\.tap /, impl: hostPlant("host", 'window.history.pushState(null, "", window.location.pathname + withBet(window.location.search, bet) + window.location.hash);', "") },
    { name: "the guest host takes a pick off the journey's pages", expect: /^7\.tap /, impl: hostPlant("host", " || !sheetOpensOn(window.location.pathname)) return;", ") return;") },
    // §8 · the doors
    { name: "a press stamps an owner on the guest's marker", expect: /^8\.doors /, impl: hostPlant("host", "saveSheetSelection(window.sessionStorage, carry.markerRaw)", 'saveSheetSelection(window.sessionStorage, JSON.stringify({ ...JSON.parse(carry.markerRaw), owner: "usr_guest" }))') },
    { name: "the door's leave goes back in history instead of leaving the address", expect: /^8\.doors /, impl: hostPlant("host", 'window.history.replaceState(null, "", carry.address + window.location.hash);', "window.history.back();") },
    { name: "the door's leave leaves the sheet open over the sign-in page", expect: /^8\.doors /, impl: hostPlant("host", "++generation.current; stopWaiting(); show(null);", "++generation.current; stopWaiting();") },
    { name: "the doors carry a stake outside the bounds", expect: /^8\.outside /, impl: hostPlant("host", "stake: carriedStake(frame)", "stake: Number(a.stakeText)") },
    { name: "a press writes past the legacy archive", expect: /^8\.legacy /, impl: hostPlant("host", "saveSheetSelection(window.sessionStorage, carry.markerRaw)", 'window.sessionStorage.setItem("kp-pending-bet", carry.markerRaw)') },
    { name: "a storage refusal stops the door", expect: /^8\.refusal /, impl: hostPlant("host", "try { if (carry) saveSheetSelection(window.sessionStorage, carry.markerRaw); } catch { /* the door still navigates */ }", "if (carry) saveSheetSelection(window.sessionStorage, carry.markerRaw);") },
    // §9 · the census
    { name: "a money action imported into the guest host", expect: /^9\.graph /, impl: hostPlant("host", 'import { useT } from "@/lib/i18n";', 'import { useT } from "@/lib/i18n";\nimport { buyPositionAction } from "@/app/markets/actions";') },
    { name: "the guest host reads the private half", expect: /^9\.never /, impl: hostPlant("host", "/sheet`, { cache", "/sheet?me=1`, { cache") },
    { name: "the guest host reaches an account's store", expect: /^9\.never /, impl: hostPlant("host", 'import { saveSheetSelection } from "@/lib/journey/sheet-owned-storage";', 'import { saveOwnedSheet, saveSheetSelection } from "@/lib/journey/sheet-owned-storage";') },
    { name: "a second read the census does not know", expect: /^9\.fetch /, impl: { ...REAL, hostWorld: { ...HOST_WORLD, host: HOST_WORLD.host + '\nconst stray = () => fetch("/api/wallet/balance");\n' } } },
    // §10 · the mount, the ended session, the popup
    { name: "an ended session's flight opens the guest sheet from the address", expect: /^10\.ended /, impl: hostPlant("host", "if (ended.current) return;", "") },
    { name: "AppShell hands a guest the money host", expect: /^10\.slot /, impl: hostPlant("shell", "<LazyGuestSheetHost sessionEnded={endedNotice !== null} />", '<LazyBetSheetHost viewerId="" />') },
    { name: "the guest host's loader line lost", expect: /^10\.slot /, impl: hostPlant("lazy", 'export const LazyGuestSheetHost = dynamic(() => import("@/components/journey/bet-sheet/guest-sheet-host").then((m) => m.GuestSheetHost).catch(nothingIfLost));', "") },
    { name: "the big buttons say nothing of their dialog", expect: /^10\.popup /, impl: hostPlant("buttons", ' aria-haspopup="dialog"', "") },
    { name: "every card pick claims a dialog, an open seed or not", expect: /^10\.popup /, impl: hostPlant("card", 'aria-haspopup={openSheet ? "dialog" : undefined}', 'aria-haspopup="dialog"') },
    // §1
    { name: "the guest's estimate computed by a second formula (stake × the card's multiple)", expect: /^1\.deck /,
      impl: { ...REAL, frame: (i) => { const f = GS.guestFrame(i); return f.estimate && f.stake ? { ...f, estimate: { ...f.estimate, payout: Math.round(f.stake * 2.8) } } : f; } } },
    { name: "the guest frame keeps the money face's commit", expect: /^1\.deck /,
      impl: { ...REAL, frame: (i) => SS.sheetFrame({ ...i, viewer: { state: "failed" }, intent: null, settled: null }) } },
    { name: "an empty side read as no figure for a guest", expect: /^1\.states /,
      impl: { ...REAL, frame: (i) => { const f = GS.guestFrame(i); return f.estimate?.state === "fillsEmptySide" ? { ...f, estimate: { ...f.estimate, payout: null } } : f; } } },
    { name: "a fractional stake rounded to a whole one for a guest", expect: /^1\.bounds /,
      impl: { ...REAL, frame: (i) => GS.guestFrame({ ...i, stakeText: i.stakeText.replace(/\.\d+$/, "") }) } },
    { name: "the guest's closed flip on the phone's clock", expect: /^1\.closed /,
      impl: { ...REAL, frame: (i) => GS.guestFrame({ ...i, offsetMs: 0 }) } },
    { name: "a guest shown the low frame at a zero balance", expect: /^1\.only /,
      impl: { ...REAL, frame: (i) => { const f = SS.sheetFrame({ ...i, viewer: { state: "read", viewer: { spendable: 0, heldSides: [], bonusWager: null, facts: ZERO_WALLET } }, intent: null, settled: null }); return { ...f, cta: null, quote: null, betInsteadQuote: null }; } } },
    // §2
    { name: "a stake below the minimum carried", expect: /^2\.carried /,
      impl: { ...REAL, carried: (f) => (f.frame === "edit" ? f.stake : null) } },
    { name: "the marker stamped with an owner", expect: /^2\.carry /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry(i); return c && { ...c, markerRaw: PB.writeMarker(c.bet, i.nowMs, PB.attributionFrom(new URLSearchParams(i.search)), undefined, "usr_guest") }; } } },
    { name: "the marker carrying a request key", expect: /^2\.carry /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry(i); return c && { ...c, markerRaw: PB.writeMarker(c.bet, i.nowMs, {}, KEY) }; } } },
    { name: "the address rebuilt from the bet alone (the home's filter and page lost)", expect: /^2\.address /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry(i); return c && { ...c, address: `${i.pathname}?bet=${PB.formatBetParam(c.bet)}` }; } } },
    { name: "next keeps the page's whole query (the codes ride inside next)", expect: /^2\.next /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry(i); return c && { ...c, next: c.address }; } } },
    { name: "a similar-rail tap returns to question A, not B's own page", expect: /^2\.next /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry(i); return c && { ...c, next: PB.pendingBetUrl(i.pathname, c.bet) }; } } },
    { name: "a stake no bet can hold written into the bet", expect: /^2\.refuse /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry({ ...i, stake: null }); return c && i.stake !== null && i.stake !== 0 ? { ...c, bet: { ...c.bet, stake: i.stake } } : c; } } },
    { name: "betReturnPath keeps every page (a rail tap stays on question A)", expect: /^2\.return /,
      impl: { ...REAL, ret: (p) => String(p).split("?")[0].split("#")[0] } },
    // §3
    { name: "the tail cuts an over-long next instead of refusing it", expect: /^3\.tail /,
      impl: { ...REAL, doors: (n, s) => AL.doorHrefsFor(n.slice(0, 512), s) } },
    { name: "the tail passes the invite un-normalised", expect: /^3\.tail /,
      impl: { ...REAL, doors: (n, s) => { const d = AL.doorHrefsFor(n, s); const raw = s.get("invite"); if (raw === null) return d; const fix = (h: string) => { const at = h.indexOf("?"); const q = new URLSearchParams(at < 0 ? "" : h.slice(at + 1)); q.set("invite", raw); return `${at < 0 ? h : h.slice(0, at)}?${q}`; }; return { signIn: fix(d.signIn), signUp: fix(d.signUp) }; } } },
    { name: "the classic question panel drops the invite again", expect: /^3\.question-panel /,
      impl: { ...REAL, page: PAGE_SRC.replace('if (typeof sp.invite === "string") codes.set("invite", sp.invite);', "") } },
    { name: "the classic question panel hand-builds its query again", expect: /^3\.question-panel /,
      impl: { ...REAL, page: PAGE_SRC.replace("href={doors.signUp as never}", "href={`/auth/register?next=${encodeURIComponent(betNext)}` as never}") } },
    { name: "the tail encodes next differently from the classic panel's old bytes", expect: /^3\.question-panel /,
      impl: { ...REAL, doors: (n, q) => { const d = AL.doorHrefsFor(n, q); return { signIn: d.signIn.replaceAll("%2F", "/"), signUp: d.signUp.replaceAll("%2F", "/") }; } } },
    { name: "the tail forgets the invite", expect: /^3\.tail /,
      impl: { ...REAL, doors: (n, s) => { const q = new URLSearchParams(s); q.delete("invite"); return AL.doorHrefsFor(n, q); } } },
    // §4
    { name: "a forwarded link's stake prefilled (a shared link sets the stake)", expect: /^4\.opens /,
      impl: { ...REAL, opens: (p, s, m, n) => { const o = GS.guestOpensFrom(p, s, m, n); return o && { ...o, stake: o.bet.stake }; } } },
    { name: "a signed-in account's own marker prefills a guest", expect: /^4\.opens /,
      impl: { ...REAL, opens: (p, s, m, n) => { const o = GS.guestOpensFrom(p, s, m, n); const r = PB.readMarker(m, n); return o && r && !r.k && r.bet === PB.formatBetParam(o.bet) ? { ...o, stake: o.bet.stake } : o; } } },
    { name: "closing a campaign link's sheet leaves ?side= behind", expect: /^4\.side /,
      impl: { ...REAL, opens: (p, s, m, n) => { const o = GS.guestOpensFrom(p, s, m, n); return o && { ...o, dropSide: false }; } } },
    { name: "?bet= opens a sheet on /wallet/deposit", expect: /^4\.nothing /,
      impl: { ...REAL, opens: (p, s, m, n) => GS.guestOpensFrom(p.startsWith("/wallet") ? "/" : p, s, m, n) } },
    // §5
    { name: "an owner-stamped marker read as a visitor's return (a signed-in open never counted)", expect: /^5\.returned /,
      impl: { ...REAL, returned: (m, b, n) => { const r = PB.readMarker(m, n); return !!b && b.stake !== null && !!r && !r.k && r.bet === PB.formatBetParam(b); } } },
    { name: "the return counted twice", expect: /^5\.counts /,
      impl: { ...REAL, counts: () => true } },
    // §6
    { name: "a storage read inside the pure module", expect: /^6\.clock /,
      impl: { ...REAL, src: SOURCE + "\nexport const peek = () => sessionStorage.getItem(\"kp-pending-bet\");\n" } },
    { name: "a server import in the pure module", expect: /^6\.client-safe /,
      impl: { ...REAL, src: SOURCE.replace('from "./pending-bet";', 'from "./pending-bet";\nimport { db } from "@/lib/server/store";') } },
    { name: "a shilling amount typed into the module", expect: /^6\.typed /,
      impl: { ...REAL, src: SOURCE + "\nexport const GUEST_MIN = 1_000;\n" } },
    { name: "a third import in the pure module", expect: /^6\.imports /,
      impl: { ...REAL, src: SOURCE.replace('from "./pending-bet";', 'from "./pending-bet";\nimport { sendFunnel } from "./funnel-beacon";') } },
  ];
  let caught = 0, failN = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) failN++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = run(REAL, quiet);
  ok("the REAL module passes every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = run(p.impl, quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  const labels: string[] = [];
  run(REAL, (l) => { const m = /^\s+PASS (\S+)/.exec(l); if (m) labels.push(m[1]); });
  const planted = new Set(plants.map((p) => p.expect.source.replace(/^\^/, "").replace(/\\\./g, ".").replace(/ $/, "")));
  const orphans = labels.filter((l) => !planted.has(l));
  ok(`every one of the ${labels.length} checks has a plant`, orphans.length === 0, orphans.join(", "));
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${failN === 0 ? "" : ` · ${failN} FAILED`}\n`);
  process.exitCode = failN === 0 ? 0 : 1;
}
