/**
 * test:howto — HOW TO PLAY, COMPLETE: the auto-open, the deep link, the seen key and the consent wait (the Vodacom plan
 * S11 WP4; VODACOM-PLAN §3.8 "Auto-open"; `docs/design-system/v5-2026-09-29-simplified-journey/S11-PLAN.md` WP4, its Open
 * points 3-11 and Amendments B5 and B10).
 *
 *   npm run test:howto     (in predeploy)
 *   npm run red:howto      (--prove-red: every defect below is planted IN MEMORY, and each must turn its own check red)
 *
 * ⭐ EVERY SUBJECT THAT RUNS IS BUILT FROM ITS TEXT (esbuild, in memory) AND RUN — the `test:enter-where-pressed` method —
 * so a plant that edits a file edits the code that runs, never a copy of it. Its hooks run on `scripts/lib/hooks-host.mts`
 * as React's development build runs them (StrictMode's double run included), on a fake clock, in a stand-in browser.
 *   §1 THE DECISION (`how-to-open.ts`): `howToDecision` over a table of landings — each rule, and the order the rules are
 *      asked in: a bet link, an open dialog and a break before the deep link; the deep link before automation and the seen
 *      key; `howToRoute` (exactly the four routes); `withoutHowTo` (every other parameter kept in its order, the hash kept).
 *   §2 THE HOST (`how-to-host.tsx`): `useHowToLanding`, run — one timer per landing at 700 ms; a route change cancels it; a
 *      declined landing is not retried on its page; never armed off the four routes; the deep link opens over the seen key
 *      and automation, strips `howto` alone with `replaceState`, is decided once, and stays shut on a break or a bet link;
 *      the opt-in on the automation term, `navigator.webdriver` in it; storage that throws counts as seen; the break read
 *      when the timer fires; a route change while it is open closes it and writes the key. And its source: the render asks
 *      the route rule too (the stacking contract's 8.1 lesson); the route rule and the decision ask HIDE_ON and SUPPRESS_ON
 *      (unreachable on the four routes, so held in source); no storage call outside `primer-keys.ts`; the primer's inline UA
 *      pattern equal to `AUTOMATION_UA` (Amendment B10); the primer's 700 ms beat; the chunk marker unique in src/.
 *   §3 THE SHEET'S ONE WAY OUT (`how-to-play-sheet.tsx`), built and run open: the Modal's onClose (✕, scrim, Escape), the
 *      CTA and Weka mipaka each write the seen key and THEN call the opener, once; drawing it, open or shut, writes nothing.
 *   §4 THE CONSENT WAIT (`invitation-slot.ts`): the sheet's own claim, as it makes it — zone "bottom", below the consent
 *      prompt's priority, eligible exactly while open — run against the consent prompt's claim (read from its source,
 *      verbatim): consent is not held while the sheet is open, is held the moment it closes, and is released to consent if
 *      the sheet's host unmounts while open (the slot's cleanup).
 *   §5 THE MOUNT (`app-shell.tsx`, `shell-lazy.tsx`): the journey-only slot beside the bare flag, the host in a Suspense
 *      boundary of its own, its props AppShell's own reads; its loader one line ending in the guard; shell-lazy its one
 *      importer; never in the opt-out shell; client code over two pure modules.
 * ⛔ No backslash in this file: an editing tool decodes them (`test:source-bytes`). Patterns use character classes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { transformSync } from "esbuild";
import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
import { decomment } from "./lib/decomment.mts";
import { REPO_ROOT, srcFiles } from "./lib/tracked-files.mts";
import { isDirective } from "./lib/is-directive.mts";
import { fakeClock, mountHook, type FakeClock, type MountedHook } from "./lib/hooks-host.mts";
import { dict } from "../src/lib/i18n-dict.ts";
import * as Utils from "../src/lib/utils.ts";
import * as SideLabel from "../src/lib/side-label.ts";
import * as Estimate from "../src/lib/markets/estimate.ts";
import * as Payout from "../src/lib/payout.ts";
import * as KeepRun from "../src/components/ui/keep-run.tsx";
import * as EmptyStateText from "../src/components/ui/empty-state-text.ts";

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const PROVE_RED = process.argv.includes("--prove-red");
const j = (x: unknown) => JSON.stringify(x);
const read = (rel: string) => readFileSync(join(REPO_ROOT, rel), "utf8").split(CR + LF).join(LF);
const count = (s: string, t: string) => (t ? s.split(t).length - 1 : 0);
/** Whitespace runs as one space — a check reads a statement, not its line breaks. */
const TAB = String.fromCharCode(9);
const WS = new RegExp(`[ ]*[${LF}${CR}${TAB}][${LF}${CR}${TAB} ]*`, "g");
const squash = (s: string) => s.replace(WS, " ");

const F = {
  open: "src/lib/onboarding/how-to-open.ts",
  keys: "src/lib/onboarding/primer-keys.ts",
  host: "src/components/onboarding/how-to-host.tsx",
  sheet: "src/components/onboarding/how-to-play-sheet.tsx",
  slot: "src/lib/invitation-slot.ts",
  consent: "src/components/analytics/consent-prompt.tsx",
  shell: "src/components/layout/app-shell.tsx",
  lazy: "src/components/layout/shell-lazy.tsx",
  primer: "src/components/onboarding/first-visit-primer.tsx",
} as const;
type Key = keyof typeof F;
/** The texts under test, and every OTHER src file that names the host's module or its marker (a plant may add one). */
type World = { files: Record<Key, string>; others: Map<string, string>; srcCount: number };

const HOST_SPECS = ["@/components/onboarding/how-to-host", "./how-to-host", "../onboarding/how-to-host"];
const MARKER = `HowToHost.displayName = "JourneyShell.HowToHost";`;
const SEEN = "50pick-howto-seen";
const ROUTES = ["/", "/live", "/results", "/watchlist"];
/** Routes the plan names where it must never open by itself (S11-PLAN WP10 A), plus near misses of the four. */
const NEVER = ["/markets", "/markets/abc", "/updown", "/updown/r1", "/wallet", "/wallet/deposit", "/profile/responsible-gambling",
  "/legal/responsible-gambling", "/account", "/help", "/auth/login", "/s", "/s/TOKEN1", "/live/x", "/positions", "/results/x"];

function load(): World {
  const files = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, read(f)])) as Record<Key, string>;
  const all = srcFiles();
  const mine = new Set<string>(Object.values(F));
  const others = new Map<string, string>();
  for (const f of all) {
    if (mine.has(f)) continue;
    const s = read(f);
    if (HOST_SPECS.some((spec) => s.includes(spec)) || s.includes("JourneyShell.HowToHost")) others.set(f, s);
  }
  return { files, others, srcCount: all.length };
}

/* ══ BUILDING A WORLD'S CODE ═════════════════════════════════════════════════════════════════════════════════════════ */

type Mod = Record<string, any>;
const builtCode = new Map<string, string>();
/** `text` built (esbuild, in memory) and evaluated: its imports from `deps`, its free globals from `globals`. */
function buildModule(file: string, text: string, deps: Record<string, unknown>, globals: Record<string, unknown> = {}): Mod {
  const cacheKey = file + LF + text;
  let code = builtCode.get(cacheKey);
  if (code === undefined) {
    code = transformSync(text, { loader: file.endsWith(".tsx") ? "tsx" : "ts", format: "cjs", target: "es2022", jsx: "automatic" }).code;
    builtCode.set(cacheKey, code);
  }
  const mod: { exports: Mod } = { exports: {} };
  const need = (spec: string) => {
    if (spec in deps) return deps[spec];
    throw new Error(`${file} imports ${spec}, which test:howto does not provide`);
  };
  const names = Object.keys(globals);
  new Function("require", "module", "exports", ...names, code)(need, mod, mod.exports, ...names.map((n) => globals[n]));
  return mod.exports;
}

/** The stand-in browser: the address, storage, the user agent, what is open on screen — and what the code did to it. */
type Env = {
  path: string; search: string; hash: string;
  store: Map<string, string> | "throws";
  ua: string; webdriver: boolean | undefined;
  dialogDom: boolean; layers: number;
  replaced: string[]; armed: number[];
};
const NORMAL_UA = "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const freshEnv = (over: Partial<Env> = {}): Env => ({
  path: "/", search: "", hash: "", store: new Map(), ua: NORMAL_UA, webdriver: undefined, dialogDom: false, layers: 0,
  replaced: [], armed: [], ...over,
});
let env: Env = freshEnv();
const storage = {
  getItem: (k: string) => { if (env.store === "throws") throw new Error("SecurityError: storage refused"); return env.store.get(k) ?? null; },
  setItem: (k: string, v: string) => { if (env.store === "throws") throw new Error("SecurityError: storage refused"); env.store.set(k, String(v)); },
};
const stdWindow = {
  get location() { return { pathname: env.path, search: env.search, hash: env.hash }; },
  history: {
    replaceState: (_state: unknown, _title: unknown, url: string) => {
      env.replaced.push(url);
      const u = new URL(url, "https://www.50pick.tz");
      env.path = u.pathname; env.search = u.search; env.hash = u.hash;
    },
  },
  get localStorage() { return storage; },
  setTimeout: (fn: () => void, ms: number) => { env.armed.push(ms); return globalThis.setTimeout(fn, ms); },
  clearTimeout: (id: unknown) => globalThis.clearTimeout(id as Parameters<typeof clearTimeout>[0]),
};
const stdNavigator = { get userAgent() { return env.ua; }, get webdriver() { return env.webdriver; } };
const seenNow = () => (env.store === "throws" ? null : env.store.get(SEEN) ?? null);

function ModalStub() { return null; }
function ButtonStub() { return null; }
function LinkStub() { return null; }
function CalloutStub() { return null; }
function SheetStub() { return null; }

type Built = { keys: Mod; open: Mod; host: Mod; sheet: Mod; slot: Mod; sheetSlot: Mod; decisions: { n: number }; slotCalls: unknown[][] };
function build(w: World): Built {
  const keys = buildModule(F.keys, w.files.keys, {}, { window: stdWindow });
  const open = buildModule(F.open, w.files.open, { "./primer-keys": keys });
  const decisions = { n: 0 };
  const counted = { ...open, howToDecision: (facts: unknown) => { decisions.n++; return open.howToDecision(facts); } };
  const host = buildModule(F.host, w.files.host, {
    react: React, "react/jsx-runtime": JsxRuntime,
    "next/navigation": { usePathname: () => env.path, useSearchParams: () => new URLSearchParams(env.search) },
    "./how-to-play-sheet": { HowToPlaySheet: SheetStub },
    "@/lib/modal-open": { isModalDialogOpen: () => env.dialogDom },
    "@/lib/modal-stack": { openLayers: () => Array.from({ length: env.layers }, () => ({})) },
    "@/lib/onboarding/primer-keys": keys,
    "@/lib/onboarding/how-to-open": counted,
  }, { window: stdWindow, navigator: stdNavigator });
  // The sheet claims through a spy over a slot of its own; §4 runs a second, fresh slot with the claim the sheet made.
  const sheetSlot = buildModule(F.slot, w.files.slot, { react: React });
  const slotCalls: unknown[][] = [];
  const spySlot = { ...sheetSlot, useInvitationSlot: (...a: unknown[]) => { slotCalls.push(a); return sheetSlot.useInvitationSlot(...a); } };
  const sheet = buildModule(F.sheet, w.files.sheet, {
    react: React, "react/jsx-runtime": JsxRuntime,
    "next/link": { __esModule: true, default: LinkStub },
    "@/components/ui/modal": { Modal: ModalStub },
    "@/components/ui/button": { Button: ButtonStub },
    "@/components/ui/callout": { Callout: CalloutStub },
    // S8 owns the shared scroll-edge hook and proves its edge behavior separately;
    // this host exercises the How-to sheet's exits and invitation-slot claim.
    "@/components/ui/scroll-edges": { useBlockScrollEdges: () => {} },
    "@/components/ui/keep-run": KeepRun,
    "@/components/ui/empty-state-text": EmptyStateText,
    "@/lib/i18n": { useT: () => ({ t: dict.sw, locale: "sw" }) },
    "@/lib/utils": Utils, "@/lib/side-label": SideLabel, "@/lib/markets/estimate": Estimate, "@/lib/payout": Payout,
    "@/lib/invitation-slot": spySlot,
    "@/lib/onboarding/primer-keys": keys,
  });
  const slot = buildModule(F.slot, w.files.slot, { react: React });
  return { keys, open, host, sheet, slot, sheetSlot, decisions, slotCalls };
}

/* ══ THE CHECKS ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

type Ok = (id: string, label: string, cond: boolean, detail?: string) => void;
type Landing = { open: boolean; close: () => void };
type LP = { path: string; deep: boolean; onBreak: boolean };

/** §1 — the decision, a table of landings. */
function s1(b: Built, ok: Ok) {
  const D = b.open.howToDecision as (f: Record<string, unknown>) => { open: string | null; reason: string };
  const base = { pathname: "/", search: "", seen: false, onBreak: false, dialogOpen: false, automated: false, forced: false };
  const rows: Array<[string, Record<string, unknown>, string | null, string]> = [
    ["a fresh browser on /", {}, "auto", "auto"],
    ...ROUTES.map((p): [string, Record<string, unknown>, string | null, string] => [`a fresh browser on ${p}`, { pathname: p }, "auto", "auto"]),
    ...NEVER.map((p): [string, Record<string, unknown>, string | null, string] => [`${p} (not one of the four)`, { pathname: p }, null, "route"]),
    ["?howto=1 on / over the seen key", { search: "?howto=1", seen: true }, "deep", "deep"],
    ["?howto=1 on /results under automation", { pathname: "/results", search: "?howto=1", automated: true }, "deep", "deep"],
    ["?howto=1 on a route that is not one of the four", { pathname: "/wallet", search: "?howto=1" }, null, "route"],
    ["?howto=0 is not the deep link", { search: "?howto=0" }, "auto", "auto"],
    ["?howto=0 with the key set", { search: "?howto=0", seen: true }, null, "seen"],
    ["a bet link", { search: "?bet=mkt_a.YES" }, null, "bet-link"],
    ["a side link", { search: "?side=YES" }, null, "bet-link"],
    ["a bet link and the deep link", { search: "?howto=1&bet=mkt_a.YES" }, null, "bet-link"],
    ["a side link and the deep link", { search: "?side=NO&howto=1" }, null, "bet-link"],
    ["another dialog open", { dialogOpen: true }, null, "dialog"],
    ["another dialog open and the deep link", { dialogOpen: true, search: "?howto=1" }, null, "dialog"],
    ["a bet link and a dialog", { dialogOpen: true, search: "?bet=x.NO" }, null, "bet-link"],
    ["a break", { onBreak: true }, null, "break"],
    ["a break and the deep link", { onBreak: true, search: "?howto=1" }, null, "break"],
    ["a dialog and a break", { onBreak: true, dialogOpen: true }, null, "dialog"],
    ["automation", { automated: true }, null, "automation"],
    ["automation with the opt-in", { automated: true, forced: true }, "auto", "auto"],
    ["automation with the opt-in, already seen", { automated: true, forced: true, seen: true }, null, "seen"],
    ["the opt-in without automation, seen", { forced: true, seen: true }, null, "seen"],
    ["seen (or storage that cannot say)", { seen: true }, null, "seen"],
    ["seen under automation", { seen: true, automated: true }, null, "automation"],
  ];
  const wrong = rows.flatMap(([name, over, want, why]) => {
    const got = D({ ...base, ...over });
    return got.open === want && got.reason === why ? [] : [`${name}: ${j(got)}, want ${j({ open: want, reason: why })}`];
  });
  ok("1.table", `howToDecision answers ${rows.length} landings with the rule that decides each, in §3.8's order (bet link, dialog, break, deep link, automation, seen)`,
    wrong.length === 0, wrong.slice(0, 4).join(" | "));
  const R = b.open.howToRoute as (p: string) => boolean;
  const routes = { yes: ROUTES.filter((p) => !R(p)), no: NEVER.filter((p) => R(p)), list: b.open.HOWTO_ROUTES };
  ok("1.routes", "the route rule is the four routes exactly — /, /live, /results, /watchlist — and nothing under or beside them",
    routes.yes.length === 0 && routes.no.length === 0 && j(routes.list) === j(ROUTES), j(routes));
  const S = b.open.withoutHowTo as (p: string, s: string, h: string) => string;
  const strips: Array<[[string, string, string], string]> = [
    [["/", "?howto=1", ""], "/"],
    [["/", "?howto=1&cat=sports", ""], "/?cat=sports"],
    [["/", "?cat=sports&howto=1&q=yanga", "#top"], "/?cat=sports&q=yanga#top"],
    [["/live", "?a=1&howto=1&howto=2&b=2", ""], "/live?a=1&b=2"],
    [["/results", "", "#x"], "/results#x"],
  ];
  const stripWrong = strips.filter(([a, want]) => S(...a) !== want).map(([a, want]) => `${j(a)} → ${S(...a)}, want ${want}`);
  ok("1.strip", "withoutHowTo drops every `howto` and keeps every other parameter in its order, and the hash",
    stripWrong.length === 0, stripWrong.join(" | "));
}

/** One mounted landing on the stand-in browser, with its clock; the clock is always put back. */
async function onLanding(b: Built, setup: Partial<Env>, start: Partial<LP>, steps: (h: MountedHook<Landing>, c: FakeClock) => Promise<string[]>,
  strict = true): Promise<string[]> {
  env = freshEnv(setup);
  b.decisions.n = 0;
  const clock = fakeClock();
  let h: MountedHook<Landing> | null = null;
  try {
    const props: LP = { path: env.path, deep: new URLSearchParams(env.search).get("howto") === "1", onBreak: false, ...start };
    h = mountHook((p: LP) => b.host.useHowToLanding(p.path, p.deep, p.onBreak) as Landing, props, { strict });
    return await steps(h, clock);
  } catch (e) {
    return [`threw: ${(e as Error).message}`];
  } finally {
    h?.unmount();
    clock.restore();
  }
}
/** The router's view after the address changed under the hook: a re-render with the new path and deep flag. */
function navigate(h: MountedHook<Landing>, path: string, search = "", onBreak = false) {
  env.path = path; env.search = search;
  h.rerender({ path, deep: new URLSearchParams(search).get("howto") === "1", onBreak });
}

async function s2(w: World, b: Built, ok: Ok) {
  // 2.b.auto — one timer, 700 ms in; the address untouched; nothing written on open.
  const auto = await onLanding(b, {}, {}, async (h, c) => {
    const d: string[] = [];
    await c.advance(699);
    if (h.result().open) d.push("open before 700 ms");
    await c.advance(1);
    if (!h.result().open) d.push("not open at 700 ms");
    if (b.decisions.n !== 1) d.push(`decided ${b.decisions.n} times`);
    if (env.replaced.length) d.push(`the address changed on an auto-open: ${j(env.replaced)}`);
    if (seenNow() !== null) d.push("the seen key was written on open");
    if (c.pending() !== 0) d.push(`${c.pending()} timer(s) still pending`);
    return d;
  });
  ok("2.b.auto", "a fresh browser on / opens it once, 700 ms after the landing (StrictMode's double run included), with the address untouched and nothing written",
    auto.length === 0, auto.join("; "));
  const plain = await onLanding(b, {}, {}, async (h, c) => {
    await c.advance(700);
    return h.result().open && b.decisions.n === 1 ? [] : [`open ${h.result().open}, decided ${b.decisions.n}`];
  }, false);
  ok("2.b.plain", "the same without StrictMode: one decision, open at 700 ms", plain.length === 0, plain.join("; "));
  // 2.b.routes — on each of the four; never armed anywhere else.
  const routes: string[] = [];
  for (const p of ROUTES) {
    const r = await onLanding(b, { path: p }, {}, async (h, c) => { await c.advance(700); return h.result().open ? [] : [`${p} did not open`]; });
    routes.push(...r);
  }
  for (const p of NEVER) {
    const r = await onLanding(b, { path: p }, {}, async (h, c) => {
      await c.advance(3_000);
      const d: string[] = [];
      if (h.result().open) d.push(`${p} opened`);
      if (env.armed.length) d.push(`${p} armed ${j(env.armed)}`);
      return d;
    });
    routes.push(...r);
  }
  ok("2.b.routes", `it opens on each of the four routes, and on ${NEVER.length} others it never even arms a timer`, routes.length === 0, routes.join("; "));
  // 2.b.leave — a route change cancels the pending landing; the new landing has its own 700.
  const leave = await onLanding(b, {}, {}, async (h, c) => {
    const d: string[] = [];
    await c.advance(300);
    navigate(h, "/live");
    await c.advance(400);
    if (h.result().open || b.decisions.n !== 0) d.push(`at 700 ms (the first landing's time): open ${h.result().open}, decided ${b.decisions.n}`);
    await c.advance(300);
    if (!h.result().open || b.decisions.n !== 1) d.push(`at 1,000 ms (the second landing's 700): open ${h.result().open}, decided ${b.decisions.n}`);
    return d;
  });
  ok("2.b.leave", "leaving / before 700 ms cancels its timer; /live, landed on at 300 ms, decides once at 1,000 ms", leave.length === 0, leave.join("; "));
  // 2.b.declined — a landing blocked by a dialog is skipped, not retried on its page.
  const declined = await onLanding(b, { dialogDom: true }, {}, async (h, c) => {
    const d: string[] = [];
    await c.advance(700);
    if (h.result().open) d.push("opened over a dialog");
    env.dialogDom = false;
    h.rerender({ path: "/", deep: false, onBreak: false });
    navigate(h, "/", "?cat=sports");
    await c.advance(5_000);
    if (h.result().open || b.decisions.n !== 1) d.push(`after the dialog closed and a chip changed the query: open ${h.result().open}, decided ${b.decisions.n}`);
    return d;
  });
  ok("2.b.declined", "a landing an open dialog declines is not retried on its page — not when the dialog closes, not when a chip changes the query",
    declined.length === 0, declined.join("; "));
  const layer = await onLanding(b, { layers: 1 }, {}, async (h, c) => { await c.advance(700); return h.result().open ? ["opened over a layer on the dialog stack"] : []; });
  ok("2.b.layer", "a dialog on the stack (Modal's registry) declines it even where the DOM read sees none", layer.length === 0, layer.join("; "));
  // 2.b.seen / 2.b.once
  const seen = await onLanding(b, { store: new Map([[SEEN, "1"]]) }, {}, async (h, c) => { await c.advance(2_000); return h.result().open ? ["opened with the key set"] : []; });
  ok("2.b.seen", "a browser holding 50pick-howto-seen = 1 is never auto-opened", seen.length === 0, seen.join("; "));
  const once = await onLanding(b, {}, {}, async (h, c) => {
    const d: string[] = [];
    await c.advance(700);
    if (!h.result().open) return ["never opened"];
    b.keys.markSeen(b.keys.HOWTO_SEEN_KEY);
    h.result().close();
    await h.flush();
    if (h.result().open) d.push("still open after its close");
    navigate(h, "/live");
    await c.advance(2_000);
    navigate(h, "/");
    await c.advance(2_000);
    if (h.result().open) d.push("opened again after an exit wrote the key");
    return d;
  });
  ok("2.b.once", "once an exit has written the key, no later landing opens it", once.length === 0, once.join("; "));
  // 2.b.deep — over the seen key and automation; strips howto alone; one decision.
  const deep = await onLanding(b, { search: "?cat=sports&howto=1", hash: "#x", store: new Map([[SEEN, "1"]]), webdriver: true }, {}, async (h, c) => {
    const d: string[] = [];
    await c.advance(700);
    if (!h.result().open) d.push("the deep link did not open it");
    if (j(env.replaced) !== j(["/?cat=sports#x"])) d.push(`the address became ${j(env.replaced)}, want ["/?cat=sports#x"]`);
    navigate(h, "/", "?cat=sports");
    await c.advance(5_000);
    if (b.decisions.n !== 1) d.push(`decided ${b.decisions.n} times (the strip is not a landing)`);
    if (!h.result().open) d.push("closed by its own strip");
    return d;
  });
  ok("2.b.deep", "/?cat=sports&howto=1#x opens it over the seen key and automation, becomes /?cat=sports#x, and is decided once",
    deep.length === 0, deep.join("; "));
  const deepLater = await onLanding(b, { store: new Map([[SEEN, "1"]]) }, {}, async (h, c) => {
    const d: string[] = [];
    await c.advance(700);
    if (h.result().open) d.push("opened with the key set");
    navigate(h, "/", "?howto=1");
    await c.advance(700);
    if (!h.result().open) d.push("a deep link followed on the same page did not open it");
    if (j(env.replaced) !== j(["/"])) d.push(`the address became ${j(env.replaced)}`);
    return d;
  });
  ok("2.b.deep.same", "a link to /?howto=1 followed from / itself is a landing of its own (the chat's citation)", deepLater.length === 0, deepLater.join("; "));
  const deepBet = await onLanding(b, { search: "?howto=1&bet=mkt_a.YES" }, {}, async (h, c) => {
    await c.advance(3_000);
    return h.result().open || env.replaced.length ? [`open ${h.result().open}, address ${j(env.replaced)}`] : [];
  });
  ok("2.b.deep.bet", "/?howto=1&bet=… opens only the bet sheet: the How-to stays shut and the address is the bet host's", deepBet.length === 0, deepBet.join("; "));
  // 2.b.automation — the UA test, navigator.webdriver, and the opt-in.
  const auto2: string[] = [];
  const cells: Array<[string, Partial<Env>, boolean]> = [
    ["HeadlessChrome", { ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36" }, false],
    ["a Playwright user agent", { ua: "Mozilla/5.0 Playwright/1.56" }, false],
    ["navigator.webdriver (Firefox and WebKit drives)", { webdriver: true }, false],
    ["navigator.webdriver with kp-primer-force", { webdriver: true, store: new Map([["kp-primer-force", "1"]]) }, true],
    ["navigator.webdriver with ?primer=1", { webdriver: true, search: "?primer=1" }, true],
    ["HeadlessChrome with ?primer=1", { ua: "HeadlessChrome/141", search: "?primer=1" }, true],
  ];
  for (const [name, setup, want] of cells) {
    const r = await onLanding(b, setup, {}, async (h, c) => { await c.advance(2_000); return h.result().open === want ? [] : [`${name}: open ${h.result().open}`]; });
    auto2.push(...r);
  }
  ok("2.b.automation", "automation never auto-opens it — by its UA or by navigator.webdriver — unless it asks (?primer=1 or kp-primer-force)",
    auto2.length === 0, auto2.join("; "));
  // 2.b.unreadable — storage that throws counts as seen; the deep link still opens.
  const unread = await onLanding(b, { store: "throws" }, {}, async (h, c) => { await c.advance(2_000); return h.result().open ? ["auto-opened with storage refused"] : []; });
  const unreadDeep = await onLanding(b, { store: "throws", search: "?howto=1" }, {}, async (h, c) => { await c.advance(700); return h.result().open ? [] : ["the deep link did not open with storage refused"]; });
  ok("2.b.unreadable", "storage that throws counts as seen (no auto-open, as the primer); the deep link still opens", unread.length + unreadDeep.length === 0, [...unread, ...unreadDeep].join("; "));
  // 2.b.break / 2.b.bet
  const brk = await onLanding(b, {}, { onBreak: true }, async (h, c) => { await c.advance(2_000); return h.result().open ? ["opened on a break"] : []; });
  const brkDeep = await onLanding(b, { search: "?howto=1" }, { onBreak: true }, async (h, c) => { await c.advance(2_000); return h.result().open ? ["the deep link opened on a break"] : []; });
  const brkLate = await onLanding(b, {}, {}, async (h, c) => {
    await c.advance(300);
    h.rerender({ path: "/", deep: false, onBreak: true });
    await c.advance(1_000);
    return h.result().open ? ["a break that began before the timer fired did not stop it"] : [];
  });
  ok("2.b.break", "a break keeps it shut — the auto-open and the deep link — and the break is read when the timer fires", brk.length + brkDeep.length + brkLate.length === 0,
    [...brk, ...brkDeep, ...brkLate].join("; "));
  const bets: string[] = [];
  for (const search of ["?bet=mkt_a.YES", "?side=NO", "?side=YES&cat=sports"]) {
    const r = await onLanding(b, { search }, {}, async (h, c) => { await c.advance(2_000); return h.result().open ? [`${search} opened it`] : []; });
    bets.push(...r);
  }
  ok("2.b.bet", "a landing with `bet` or `side` in the address never opens it", bets.length === 0, bets.join("; "));
  // 2.b.exit — a route change while it is open closes it, and writes the key.
  const exit = await onLanding(b, {}, {}, async (h, c) => {
    const d: string[] = [];
    await c.advance(700);
    if (!h.result().open) return ["never opened"];
    navigate(h, "/results");
    await h.flush();
    if (h.result().open) d.push("still open on /results");
    if (seenNow() !== "1") d.push(`the key is ${j(seenNow())} after the route change, want "1"`);
    await c.advance(2_000);
    if (h.result().open) d.push("/results opened it again");
    return d;
  });
  ok("2.b.exit", "leaving the page while it is open (Back, a link) closes it and counts as an exit: the key is written", exit.length === 0, exit.join("; "));

  // ── the host's source ──
  const host = decomment(w.files.host);
  const at = host.indexOf("export function HowToHost(");
  const body = at < 0 ? "" : host.slice(at, host.indexOf(LF + "}" + LF, at));
  const guardAt = body.indexOf("if (!howToRoute(pathname)) return null;");
  const order = { landing: body.indexOf("useHowToLanding("), guard: guardAt, ret: body.indexOf("return <HowToPlaySheet") };
  ok("2.s.render", "the host's render asks the route rule before it draws the sheet, after every hook (the stacking contract's 8.1 lesson: the effect cannot take down a sheet already open)",
    order.landing > 0 && order.guard > order.landing && order.ret > order.guard && count(body, "return null;") === 1, j(order));
  const open = decomment(w.files.open);
  const fnBody = (src: string, name: string) => { const i = src.indexOf(`export function ${name}(`); return i < 0 ? "" : src.slice(i, src.indexOf(LF + "}" + LF, i)); };
  const route = fnBody(open, "howToRoute"), decision = fnBody(open, "howToDecision");
  const asks = {
    route: ["HOWTO_ROUTES.includes(pathname)", "!HIDE_ON.test(pathname)", "!SUPPRESS_ON.test(pathname)"].every((t) => route.includes(t)),
    decision: ["HIDE_ON.test(f.pathname)", "SUPPRESS_ON.test(f.pathname)"].every((t) => decision.includes(t)),
    imported: /import [{] HIDE_ON, SUPPRESS_ON [}] from "[.][/]primer-keys";/.test(open),
  };
  ok("2.s.rules", "the route rule and the decision both ask the primer's HIDE_ON and SUPPRESS_ON, imported from primer-keys (unreachable on the four routes, so held in source)",
    asks.route && asks.decision && asks.imported, j(asks));
  const STORES = ["localStorage", "sessionStorage", "document.cookie", "indexedDB"];
  const direct = [["host", host], ["open", open]].flatMap(([n, s]) => STORES.filter((x) => s.includes(x)).map((x) => `${n}: ${x}`));
  const marks = [...host.matchAll(/markSeen[(]([^)]*)[)]/g)].map((m) => m[1].trim());
  ok("2.s.storage", "the host and the decision write no storage themselves: the host's one write is markSeen(HOWTO_SEEN_KEY), the route-change exit",
    direct.length === 0 && j(marks) === j(["HOWTO_SEEN_KEY"]), j({ direct, marks }));
  const primerUa = (w.files.primer.split(LF).find((l) => l.includes("HeadlessChrome") && l.includes("navigator.userAgent")) ?? "");
  const s = primerUa.indexOf("/HeadlessChrome"), e = s < 0 ? -1 : primerUa.indexOf("/", s + 1);
  const inline = s < 0 || e < 0 ? null : { source: primerUa.slice(s + 1, e), flags: (primerUa.slice(e + 1).match(/^[a-z]*/) ?? [""])[0] };
  const shared = b.keys.AUTOMATION_UA as RegExp;
  ok("2.s.ua", "the primer's inline UA pattern and primer-keys' AUTOMATION_UA are one pattern (Amendment B10: two spellings, held equal)",
    inline !== null && inline.source === shared.source && inline.flags === shared.flags, j({ inline, shared: { source: shared.source, flags: shared.flags } }));
  ok("2.s.delay", "the host's beat is the primer's: 700 ms (HOWTO_DELAY_MS; the primer's own `setTimeout(() => setOpen(true), 700)`)",
    b.open.HOWTO_DELAY_MS === 700 && count(w.files.primer, "window.setTimeout(() => setOpen(true), 700)") === 1, j(b.open.HOWTO_DELAY_MS));
  const holders = [...w.others].filter(([, t]) => t.includes("JourneyShell.HowToHost")).map(([f]) => f);
  ok("2.s.marker", "the host's chunk marker (its displayName) is held by the host alone in src/ — qa:first-load's HowToHost row",
    count(w.files.host, MARKER) === 1 && holders.length === 0, j(holders));
}

/** Every element of `type` in a tree of React elements (a child component is never called: its element is enough). */
function elementsOf(node: unknown, type: unknown, out: Array<{ props: Record<string, any> }> = []): Array<{ props: Record<string, any> }> {
  if (Array.isArray(node)) { for (const n of node) elementsOf(n, type, out); return out; }
  if (node && typeof node === "object" && "type" in node && "props" in node) {
    const el = node as { type: unknown; props: Record<string, any> };
    if (el.type === type) out.push(el);
    elementsOf(el.props.children, type, out);
  }
  return out;
}

async function s3(b: Built, ok: Ok) {
  const Sheet = b.sheet.HowToPlaySheet as (p: Record<string, unknown>) => unknown;
  type Exit = { name: string; type: unknown; prop: string };
  const exits: Exit[] = [
    { name: "the Modal's onClose (the ✕, the scrim, Escape)", type: ModalStub, prop: "onClose" },
    { name: "the CTA, Nimeelewa, anza", type: ButtonStub, prop: "onClick" },
    { name: "Weka mipaka", type: LinkStub, prop: "onClick" },
  ];
  const d: string[] = [];
  const drawn: string[] = [];
  for (const x of exits) {
    env = freshEnv();
    const calls: Array<string | null> = [];
    const h = mountHook((p: Record<string, unknown>) => Sheet(p), { open: true, signedIn: true, onClose: () => { calls.push(seenNow()); } }, { strict: true });
    try {
      await h.flush();
      if (seenNow() !== null) drawn.push(`drawing it open wrote ${j(seenNow())}`);
      const els = elementsOf(h.result(), x.type);
      const handler = els.length === 1 ? els[0].props[x.prop] : undefined;
      if (typeof handler !== "function") { d.push(`${x.name}: ${els.length} element(s), no ${x.prop}`); continue; }
      handler();
      if (j(calls) !== j(["1"])) d.push(`${x.name}: the opener was called ${calls.length} time(s), seeing the key as ${j(calls)} (want once, after the key)`);
    } finally { h.unmount(); }
  }
  ok("3.exits", "every way out of the sheet — the Modal's onClose, the CTA, Weka mipaka — writes 50pick-howto-seen and THEN calls the opener, once",
    d.length === 0, d.join("; "));
  env = freshEnv();
  const shut = mountHook((p: Record<string, unknown>) => Sheet(p), { open: false, signedIn: false, onClose: () => {} }, { strict: true });
  await shut.flush();
  shut.rerender({ open: true, signedIn: false, onClose: () => {} });
  await shut.flush();
  shut.unmount();
  if (seenNow() !== null) drawn.push(`drawing it shut, then open, wrote ${j(seenNow())}`);
  ok("3.open", "drawing the sheet — shut, then open — writes nothing: only an exit writes the key", drawn.length === 0, drawn.join("; "));
}

async function s4(w: World, b: Built, ok: Ok) {
  // The claim the sheet makes, as it makes it (the spy in `build`): shut, then open.
  b.slotCalls.length = 0;
  env = freshEnv();
  const Sheet = b.sheet.HowToPlaySheet as (p: Record<string, unknown>) => unknown;
  const h = mountHook((p: Record<string, unknown>) => Sheet(p), { open: false, signedIn: true, onClose: () => {} });
  const shut = b.slotCalls.at(-1);
  h.rerender({ open: true, signedIn: true, onClose: () => {} });
  const opened = b.slotCalls.at(-1);
  h.unmount();
  const consentLine = `const holdsSlot = useInvitationSlot("analytics-consent", "bottom", 0, eligible);`;
  const consentPrio = 0;
  const claim = { shut, opened };
  const claimOk = Array.isArray(shut) && Array.isArray(opened) && shut[0] === opened[0] && opened[1] === "bottom" && typeof opened[2] === "number"
    && (opened[2] as number) < consentPrio && shut[3] === false && opened[3] === true && shut[2] === opened[2];
  ok("4.claim", "the sheet claims the bottom invitation slot below the consent prompt's priority, and only while it is open",
    claimOk, j(claim));
  ok("4.consent", "the consent prompt's claim is today's, verbatim — bottom, priority 0, its own eligibility (its code untouched by S11)",
    count(w.files.consent, consentLine) === 1, consentLine);
  if (!claimOk || !Array.isArray(opened)) { ok("4.wait", "the consent card waits while the sheet is open and appears once it closes", false, "no claim to run"); return; }
  const [id, zone, prio] = opened as [string, string, number];
  const U = b.slot.useInvitationSlot as (id: string, zone: string, p: number, e: boolean) => boolean;
  const consent = mountHook((p: { e: boolean }) => U("analytics-consent", "bottom", consentPrio, p.e), { e: true });
  const sheet = mountHook((p: { open: boolean }) => U(id, zone, prio, p.open), { open: false });
  const steps: Array<[string, boolean]> = [];
  try {
    await consent.flush(); await sheet.flush();
    steps.push(["before", consent.result()]);
    sheet.rerender({ open: true }); await sheet.flush(); await consent.flush();
    steps.push(["sheet open", consent.result()]);
    sheet.rerender({ open: false }); await sheet.flush(); await consent.flush();
    steps.push(["sheet closed", consent.result()]);
    sheet.rerender({ open: true }); await sheet.flush(); await consent.flush();
    steps.push(["open again", consent.result()]);
    sheet.unmount(); await consent.flush();
    steps.push(["host gone while open", consent.result()]);
  } finally { consent.unmount(); }
  const want = j([["before", true], ["sheet open", false], ["sheet closed", true], ["open again", false], ["host gone while open", true]]);
  ok("4.wait", "run on the real slot: the consent card is not held while the sheet is open, is held the moment it closes, and is released to it if the sheet's host goes while open",
    j(steps) === want, j(steps));
}

function s5(w: World, ok: Ok) {
  const shell = w.files.shell, lazy = w.files.lazy;
  const MOUNT = "{journeyShown && <><LazyJourneyFlag /><Suspense fallback={null}><LazyHowToHost signedIn={!!session} onBreak={promoSuppressed} /></Suspense></>}";
  const slot = { mount: count(shell, MOUNT), hosts: count(shell, "<LazyHowToHost"), flags: count(shell, "<LazyJourneyFlag") };
  ok("5.slot", "AppShell mounts the host in the journey's own slot, beside the bare flag, in a Suspense boundary of its own; S9 also mounts a flag in its focused payment arm",
    slot.mount === 1 && slot.hosts === 1 && slot.flags === 2, j(slot));
  const flat = squash(decomment(shell));
  const reads = {
    session: count(flat, "const session = await getSession();") === 1,
    declared: count(flat, "let promoSuppressed = false;") === 1,
    assigned: count(flat, "promoSuppressed = until(rg?.selfExclusionUntil) > now || until(rg?.coolingOffUntil) > now;") === 1,
  };
  ok("5.reads", "its two props are AppShell's own reads: the session, and promoSuppressed from the limits row in hand", Object.values(reads).every(Boolean), j(reads));
  const optout = shell.slice(Math.max(0, shell.indexOf("function OptOutShell")));
  ok("5.optout", "the opt-out page's minimal shell never renders it (D6)", shell.includes("function OptOutShell") && !optout.includes("HowToHost"), "");
  const LOADER = `export const LazyHowToHost = dynamic(() => import("@/components/onboarding/how-to-host").then((m) => m.HowToHost).catch(nothingIfLost));`;
  const importsLazy = /import [{][^}]*[^A-Za-z]LazyHowToHost[^A-Za-z][^}]*[}] from "[.][/]shell-lazy";/.test(shell);
  ok("5.loader", "its loader is one next/dynamic line in shell-lazy, no option object, ending in the app's lost-chunk guard; AppShell imports it from there",
    count(lazy, LOADER) === 1 && count(lazy, "LazyHowToHost") === 1 && importsLazy, j({ loader: count(lazy, LOADER), importsLazy }));
  const pool: Array<[string, string]> = [...Object.entries(F).map(([k, f]): [string, string] => [f, w.files[k as Key]]), ...w.others];
  const importers = pool.filter(([f, t]) => f !== F.host && HOST_SPECS.some((spec) => t.includes(`"${spec}"`))).map(([f]) => f).sort();
  ok("5.importers", `shell-lazy is the host's one importer in src/ (${w.srcCount} files read) — no page or component reaches its code around the journey-only loader`,
    j(importers) === j([F.lazy]) && w.srcCount > 1_000, j(importers));
  const openImports = [...w.files.open.matchAll(/^import [^;]* from "([^"]+)";/gm)].map((m) => m[1]);
  const keysImports = [...w.files.keys.matchAll(/^import [^;]* from "([^"]+)";/gm)].map((m) => m[1]);
  const client = { host: isDirective(w.files.host, "use client"), open: !isDirective(w.files.open, "use client"), keys: !isDirective(w.files.keys, "use client"), openImports, keysImports };
  ok("5.client", "the host is client code; the decision and the keys are pure — no directive, the decision importing only ./primer-keys, the keys nothing",
    client.host && client.open && client.keys && j(openImports) === j(["./primer-keys"]) && keysImports.length === 0, j(client));
}

async function run(w: World, log: (l: string) => void): Promise<string[]> {
  const failures: string[] = [];
  const ok: Ok = (id, label, cond, detail = "") => {
    if (!cond) failures.push(`${id} · ${label}`);
    log(`${cond ? "PASS" : "FAIL"} ${id} · ${label}${!cond && detail ? ` — ${detail}` : ""}`);
  };
  let b: Built;
  try { b = build(w); } catch (e) { ok("0.build", "every subject builds from its text", false, (e as Error).message); return failures; }
  log("§1 · the decision");
  s1(b, ok);
  log("§2 · the host");
  await s2(w, b, ok);
  log("§3 · the sheet's one way out");
  await s3(b, ok);
  log("§4 · the consent wait");
  await s4(w, b, ok);
  log("§5 · the mount");
  s5(w, ok);
  return failures;
}

/* ══ THE PLANTS — one defect each, in memory ═════════════════════════════════════════════════════════════════════════ */

type Plant = { name: string; expect: RegExp; plant: (w: World) => World; alone?: boolean };
function swap(text: string, from: string, to: string): string {
  const n = count(text, from);
  if (n !== 1) throw new Error(`the anchor ${j(from.slice(0, 70))} occurs ${n} times`);
  return text.replace(from, () => to);
}
const edit = (k: Key, from: string, to: string) => (w: World): World => ({ ...w, files: { ...w.files, [k]: swap(w.files[k], from, to) } });

const PLANTS: Plant[] = [
  // §1
  { name: "the bet-link rule dropped", expect: /^(1[.]table|2[.]b[.](bet|deep[.]bet)) /,
    plant: edit("open", `if (query.has("bet") || query.has("side")) return { open: null, reason: "bet-link" };`, "") },
  { name: "`side` no longer a bet link", expect: /^(1[.]table|2[.]b[.]bet) /,
    plant: edit("open", `query.has("bet") || query.has("side")`, `query.has("bet")`) },
  { name: "the deep link asked before the break (a campaign link opens during a break)", expect: /^1[.]table /,
    plant: edit("open", `  if (f.onBreak) return { open: null, reason: "break" };${LF}  if (query.get(HOWTO_PARAM) === "1") return { open: "deep", reason: "deep" };`,
      `  if (query.get(HOWTO_PARAM) === "1") return { open: "deep", reason: "deep" };${LF}  if (f.onBreak) return { open: null, reason: "break" };`) },
  { name: "the deep link asked before an open dialog", expect: /^1[.]table /, alone: true,
    plant: edit("open", `  if (f.dialogOpen) return { open: null, reason: "dialog" };${LF}  if (f.onBreak) return { open: null, reason: "break" };${LF}  if (query.get(HOWTO_PARAM) === "1") return { open: "deep", reason: "deep" };`,
      `  if (f.onBreak) return { open: null, reason: "break" };${LF}  if (query.get(HOWTO_PARAM) === "1") return { open: "deep", reason: "deep" };${LF}  if (f.dialogOpen) return { open: null, reason: "dialog" };`) },
  { name: "automation ignores its opt-in", expect: /^(1[.]table|2[.]b[.]automation) /,
    plant: edit("open", "if (f.automated && !f.forced)", "if (f.automated)") },
  { name: "the seen key ignored", expect: /^(1[.]table|2[.]b[.](seen|once|unreadable)) /,
    plant: edit("open", `  if (f.seen) return { open: null, reason: "seen" };${LF}`, "") },
  { name: "the deep link gives way to the seen key", expect: /^(1[.]table|2[.]b[.]deep) /,
    plant: edit("open", `  if (query.get(HOWTO_PARAM) === "1") return { open: "deep", reason: "deep" };${LF}  if (f.automated && !f.forced) return { open: null, reason: "automation" };${LF}  if (f.seen) return { open: null, reason: "seen" };`,
      `  if (f.seen) return { open: null, reason: "seen" };${LF}  if (query.get(HOWTO_PARAM) === "1") return { open: "deep", reason: "deep" };${LF}  if (f.automated && !f.forced) return { open: null, reason: "automation" };`) },
  { name: "a fifth route (/markets)", expect: /^(1[.](table|routes)|2[.]b[.]routes) /,
    plant: edit("open", `["/", "/live", "/results", "/watchlist"]`, `["/", "/live", "/results", "/watchlist", "/markets"]`) },
  { name: "the routes matched as prefixes (/live/x would open it)", expect: /^(1[.](table|routes)|2[.]b[.]routes) /,
    plant: edit("open", "if (!HOWTO_ROUTES.includes(f.pathname))", `if (!HOWTO_ROUTES.some((r) => f.pathname === r || f.pathname.startsWith(r + "/")))`) },
  { name: "howto=0 taken for the deep link", expect: /^1[.]table /, alone: true,
    plant: edit("open", `if (query.get(HOWTO_PARAM) === "1")`, "if (query.has(HOWTO_PARAM))") },
  { name: "the strip drops every other parameter", expect: /^(1[.]strip|2[.]b[.]deep) /,
    plant: edit("open", "  const rest = query.toString();", `  const rest = "";`) },
  { name: "the strip drops the hash", expect: /^(1[.]strip|2[.]b[.]deep) /,
    plant: edit("open", 'return `${pathname}${rest ? `?${rest}` : ""}${hash}`;', 'return `${pathname}${rest ? `?${rest}` : ""}`;') },
  // §2
  { name: "the beat moved to 1,200 ms", expect: /^2[.](b[.]auto|b[.]plain|b[.]leave|s[.]delay|b[.]deep|b[.]exit|b[.]once|b[.]routes) /,
    plant: edit("open", "export const HOWTO_DELAY_MS = 700;", "export const HOWTO_DELAY_MS = 1200;") },
  { name: "the landing's timer is never cleared (a route change no longer cancels it)", expect: /^2[.]b[.]leave /,
    plant: edit("host", "    return () => window.clearTimeout(timer);" + LF + "  }, [pathname, deepAsked]);", "  }, [pathname, deepAsked]);") },
  { name: "the deep link is not a landing on the same page (deps lose deepAsked)", expect: /^2[.]b[.]deep[.]same /,
    plant: edit("host", "  }, [pathname, deepAsked]);", "    // eslint-disable-next-line react-hooks/exhaustive-deps" + LF + "  }, [pathname]);") },
  { name: "the deep link leaves `howto` in the address (Back and a reload would open it again)", expect: /^2[.]b[.]deep(|[.]same) /,
    plant: edit("host", '        window.history.replaceState(null, "", withoutHowTo(window.location.pathname, window.location.search, window.location.hash));', "") },
  { name: "the address rewritten on an auto-open too", expect: /^2[.]b[.]auto /,
    plant: edit("host", `if (decided.open === "deep") {`, "if (decided.open !== null) {") },
  { name: "navigator.webdriver dropped from the automation test", expect: /^2[.]b[.]automation /, alone: true,
    plant: edit("keys", " || nav.webdriver === true", "") },
  { name: "the opt-in no longer read on the automation line", expect: /^2[.]b[.]automation /, alone: true,
    plant: edit("host", "        forced: primerForced(),", "        forced: false,") },
  { name: "storage that throws read as unseen", expect: /^2[.]b[.]unreadable /, alone: true,
    plant: edit("keys", '    return window.localStorage.getItem(key) === "1";' + LF + "  } catch {" + LF + "    return true;", '    return window.localStorage.getItem(key) === "1";' + LF + "  } catch {" + LF + "    return false;") },
  { name: "a route change while open writes no key", expect: /^2[.](b[.]exit|s[.]storage) /,
    plant: edit("host", "    markSeen(HOWTO_SEEN_KEY);" + LF + "    setOpenOn(null);", "    setOpenOn(null);") },
  { name: "the strip taken for a new landing (decided twice)", expect: /^2[.]b[.]deep /, alone: true,
    plant: edit("host", "    if (was !== null && was.path === pathname && was.deep && !deepAsked) return;" + LF, "") },
  { name: "a 'decided' flag that StrictMode's double run defeats", expect: /^2[.]b[.](auto|routes|leave|once|deep|exit|automation|break|bet) /,
    plant: edit("host", "    if (was !== null && was.path === pathname && was.deep && !deepAsked) return;", "    if (was !== null && was.path === pathname && !deepAsked) return;") },
  { name: "the break read at the landing, not when the timer fires", expect: /^2[.]b[.]break /, alone: true,
    plant: edit("host", "        onBreak: breakNow.current,", "        onBreak: false,") },
  { name: "the dialog stack ignored (DOM only)", expect: /^2[.]b[.]layer /, alone: true,
    plant: edit("host", "dialogOpen: isModalDialogOpen() || openLayers().length > 0,", "dialogOpen: isModalDialogOpen(),") },
  { name: "the render guard dropped", expect: /^2[.]s[.]render /, alone: true,
    plant: edit("host", "  if (!howToRoute(pathname)) return null;" + LF, "") },
  { name: "the route rule stops asking HIDE_ON", expect: /^2[.]s[.]rules /, alone: true,
    plant: edit("open", " && !HIDE_ON.test(pathname)", "") },
  { name: "a direct storage write in the host", expect: /^2[.]s[.]storage /,
    plant: edit("host", "    markSeen(HOWTO_SEEN_KEY);" + LF + "    setOpenOn(null);", '    window.localStorage.setItem(HOWTO_SEEN_KEY, "1");' + LF + "    setOpenOn(null);") },
  { name: "the shared UA pattern drifts from the primer's", expect: /^2[.](s[.]ua|b[.]automation) /,
    plant: edit("keys", "export const AUTOMATION_UA = /HeadlessChrome|Playwright/i;", "export const AUTOMATION_UA = /HeadlessChrome/i;") },
  { name: "the marker renamed", expect: /^2[.]s[.]marker /, alone: true,
    plant: edit("host", MARKER, `HowToHost.displayName = "HowToHost";`) },
  { name: "a second holder of the marker in src/", expect: /^2[.]s[.]marker /, alone: true,
    plant: (w) => ({ ...w, others: new Map(w.others).set("src/components/journey/home/journey-home.tsx", `const x = "JourneyShell.HowToHost";`) }) },
  // §3
  { name: "the CTA calls the opener directly (no key)", expect: /^3[.]exits /, alone: true,
    plant: edit("sheet", `className="kp-wsheet__act" onClick={close}>`, `className="kp-wsheet__act" onClick={onClose}>`) },
  { name: "Weka mipaka navigates without the key", expect: /^3[.]exits /, alone: true,
    plant: edit("sheet", `onClick={close} className="kp-wsheet__link"`, `onClick={onClose} className="kp-wsheet__link"`) },
  { name: "the Modal's ✕, scrim and Escape skip the key", expect: /^3[.]exits /, alone: true,
    plant: edit("sheet", "      onClose={close}" + LF, "      onClose={onClose}" + LF) },
  { name: "the key written after the opener's close", expect: /^3[.]exits /, alone: true,
    plant: edit("sheet", "    markSeen(HOWTO_SEEN_KEY);" + LF + "    onClose();", "    onClose();" + LF + "    markSeen(HOWTO_SEEN_KEY);") },
  { name: "the key written when the sheet is drawn", expect: /^3[.](open|exits) /,
    plant: edit("sheet", "  const titleId = useId();", "  const titleId = useId();" + LF + "  if (open) markSeen(HOWTO_SEEN_KEY);") },
  // §4
  { name: "the sheet claims above the consent prompt (+1)", expect: /^4[.](claim|wait) /,
    plant: edit("sheet", "const HOWTO_SLOT_PRIORITY = -1;", "const HOWTO_SLOT_PRIORITY = 1;") },
  { name: "the sheet claims the slot while shut too", expect: /^4[.](claim|wait) /,
    plant: edit("sheet", `useInvitationSlot("howto", "bottom", HOWTO_SLOT_PRIORITY, open);`, `useInvitationSlot("howto", "bottom", HOWTO_SLOT_PRIORITY, true);`) },
  { name: "the sheet claims another zone", expect: /^4[.](claim|wait) /,
    plant: edit("sheet", `useInvitationSlot("howto", "bottom", HOWTO_SLOT_PRIORITY, open);`, `useInvitationSlot("howto", "top-right", HOWTO_SLOT_PRIORITY, open);`) },
  { name: "the consent prompt's claim edited", expect: /^4[.]consent /, alone: true,
    plant: edit("consent", `useInvitationSlot("analytics-consent", "bottom", 0, eligible)`, `useInvitationSlot("analytics-consent", "bottom", -2, eligible)`) },
  { name: "the slot never released (no cleanup)", expect: /^4[.]wait /,
    plant: edit("slot", "    return () => {" + LF + "      claims = claims.filter((c) => c.id !== id);" + LF + "      emit();" + LF + "    };" + LF, "") },
  // §5
  { name: "the host mounted for every request (outside the journey's slot)", expect: /^5[.]slot /,
    plant: (w) => edit("shell", "{journeyShown && <><LazyJourneyFlag /><Suspense fallback={null}><LazyHowToHost signedIn={!!session} onBreak={promoSuppressed} /></Suspense></>}",
      "{journeyShown && <LazyJourneyFlag />}<Suspense fallback={null}><LazyHowToHost signedIn={!!session} onBreak={promoSuppressed} /></Suspense>")(w) },
  { name: "the flag moved into the host's Suspense boundary", expect: /^5[.]slot /, alone: true,
    plant: edit("shell", "<><LazyJourneyFlag /><Suspense fallback={null}><LazyHowToHost", "<><Suspense fallback={null}><LazyJourneyFlag /><LazyHowToHost") },
  { name: "the break handed in as false", expect: /^5[.]slot /, alone: true,
    plant: edit("shell", "<LazyHowToHost signedIn={!!session} onBreak={promoSuppressed} />", "<LazyHowToHost signedIn={!!session} onBreak={false} />") },
  { name: "the opt-out shell renders it", expect: /^5[.](optout|slot) /,
    plant: edit("shell", "      <MainLandmark>{children}</MainLandmark>" + LF + "      <footer", "      <MainLandmark>{children}</MainLandmark>" + LF + "      <LazyHowToHost signedIn={false} onBreak={false} />" + LF + "      <footer") },
  { name: "its loader loses the lost-chunk guard", expect: /^5[.]loader /, alone: true,
    plant: edit("lazy", ".then((m) => m.HowToHost).catch(nothingIfLost));", ".then((m) => m.HowToHost));") },
  { name: "a second importer of the host (the home imports it statically)", expect: /^5[.]importers /, alone: true,
    plant: (w) => ({ ...w, others: new Map(w.others).set("src/components/journey/home/journey-home.tsx", `import { HowToHost } from "@/components/onboarding/how-to-host";`) }) },
  { name: "the host loses its use client", expect: /^5[.]client /,
    plant: edit("host", `"use client";`, "") },
];

const REAL = load();
if (!PROVE_RED) {
  console.log(`howto — How to Play, complete (the Vodacom plan S11 WP4) · src/ read: ${REAL.srcCount} files`);
  const failed = await run(REAL, (l) => console.log(l));
  console.log(`${LF}HOWTO — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}${LF}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  let caught = 0, fail = 0;
  const say = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const judge = (failures: string[], p: Pick<Plant, "expect" | "alone">) => {
    const hit = failures.some((f) => p.expect.test(f));
    const beside = p.alone ? failures.filter((f) => !p.expect.test(f)) : [];
    return { proved: hit && beside.length === 0, hit, beside };
  };
  {
    const lone = { expect: /^2[.]b[.]auto /, alone: true };
    const cases: Array<[string[], boolean]> = [[["2.b.auto · x"], true], [["2.b.auto · x", "2.b.plain · y"], false], [["2.b.autox · x"], false], [[], false]];
    const wrong = cases.filter(([f, want]) => judge(f, lone).proved !== want);
    say("the verdict's control: a lone failure of the check proves it; a second failure beside it, a neighbouring id or nothing does not", wrong.length === 0, j(wrong));
  }
  const clean = await run(REAL, quiet);
  say("the REAL tree passes every check", clean.length === 0, clean.join(" | "));
  for (const p of PLANTS) {
    let failures: string[];
    try { failures = await run(p.plant(REAL), quiet); }
    catch (e) { say(p.name, false, `the plant is broken: ${(e as Error).message}`); continue; }
    const { proved, hit, beside } = judge(failures, p);
    if (proved) caught++;
    say(p.name, proved, proved ? ""
      : !hit ? (failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`)
      : `its check failed, but so did another, so the check is not proved to catch it alone: ${beside.slice(0, 2).join(" | ")}`);
  }
  console.log(`${LF}RED CONTROL — ${caught}/${PLANTS.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}${LF}`);
  process.exitCode = fail === 0 ? 0 : 1;
}
