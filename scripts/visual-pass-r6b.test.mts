/**
 * ROUND 6 OF THE VISUAL PASS, FIXER B (2026-10-09) — the runtime, security and text findings two independent reviewers
 * found and verified (review 6, B-1…B-4 and A5…A7). Every fix is held beside a control or a planted defect that proves the
 * check can fail; where a fix is behaviour, the very code is BUILT FROM ITS TEXT (esbuild, in memory) and RUN on
 * stand-ins, so a plant that edits the file edits what runs.
 *
 *   npx tsx scripts/visual-pass-r6b.test.mts            (npm run test:visual-pass-r6b)
 *
 * The owner's rule (Ali, 2026-10-09): consistency and perfection in each move — a finding is fixed on every surface that
 * shares its pattern, and a sibling that legitimately differs is named with why.
 *   §1 B-1 the in-flight focus trap: Tab never leaves a money confirm whose every control is disabled (modal.tsx's onKey,
 *          RUN); the panel takes script focus; a way out that cannot take focus hands it to the panel (`safe`, RUN)
 *   §2 B-2 the chart's retries (terminal-chart.tsx's data effect, RUN on a virtual clock): a hung request no longer holds
 *          the poll; a late answer, a slow body, a drawn chart and a verified empty answer keep R5-A's rules
 *   §3 B-3 three text readers are linear and EXACTLY what they replaced (a 30,000-string corpus; timings)
 *   §4 B-4 a name's cut is decided once, on the server, and handed to the client that draws it again
 *   §5 A5  the old template's ".." is mended where it put it, and nowhere else
 *   §6 A6  an Up & Down round is named in its page's own words: its <title>, and /positions/performance's rows
 *   §7 A7  the win notice cuts its market's name as every sibling cuts it
 * (A4, the proxy's favicons and the static security headers on every response, is proved by test:proxy-scope and
 * test:static-cache-scope alone, so that it can be cherry-picked onto main as one change.)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement as h, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformSync } from "esbuild";
import { decomment, blankLiterals } from "./lib/decomment.mts";
import { dict as DICTS } from "../src/lib/i18n-dict.ts";
import { CloseX, ConfirmModal } from "../src/components/ui/modal.tsx";
import { SellConfirmModal } from "../src/components/markets/sell-confirm-modal.tsx";
import { BetConfirmModal } from "../src/components/markets/bet-confirm-modal.tsx";
import { lastTwoWordsAt, moneySentence } from "../src/lib/fill-nodes.tsx";
import { hyphenParts, KeepHyphenated } from "../src/app/live/pulse-grid.tsx";
import { clipQuote, endClause, readableNotificationBody } from "../src/lib/notification-text.ts";
import { keepNameEnd, nameEndAt, nameWithEnd } from "../src/components/ui/keep-words.tsx";
import { roundName, storedRound } from "../src/lib/updown-round-name.ts";
import { pickLocalized } from "../src/lib/localized.ts";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
// Source through the shared scanner (scripts/lib/decomment.mts) — never a private stripper.
const code = (p: string) => decomment(read(p));
const show = (x: unknown) => JSON.stringify(x);
/** A node's markup. */
const html = (n: unknown) => renderToStaticMarkup(h("div", null, n as never)).replace(/^<div>|<\/div>$/g, "");
type Mod = Record<string, unknown>;

/**
 * A function's text from `start` (its `function`, its `const x =`, or its parameter list): past its parameters, through
 * the brace that closes its body — literals blanked for the count, so a brace in a string or a template never counts.
 * An arrow whose body is an expression ends at its line's end (its trailing comma or semicolon left out).
 */
function fnText(src: string, start: number): string {
  if (start < 0) return "";
  const blank = blankLiterals(src, { regex: true });
  let i = blank.indexOf("(", start), depth = 0;
  if (i < 0) return "";
  for (; i < blank.length; i++) { if (blank[i] === "(") depth++; else if (blank[i] === ")" && --depth === 0) break; }
  const arrow = blank.indexOf("=>", i), brace = blank.indexOf("{", i);
  let open = brace;
  if (arrow >= 0 && (brace < 0 || arrow < brace)) {
    const k = arrow + 2 + blank.slice(arrow + 2).search(/\S/);
    if (blank[k] !== "{") { const nl = src.indexOf("\n", k); return src.slice(start, nl < 0 ? src.length : nl).replace(/[,;]\s*$/, ""); }
    open = k;
  }
  if (open < 0) return "";
  depth = 0;
  for (let p = open; p < blank.length; p++) { if (blank[p] === "{") depth++; else if (blank[p] === "}" && --depth === 0) return src.slice(start, p + 1); }
  return "";
}
/** `body` (TypeScript: a function's text plus the statements that return it) built and run in memory with `env`'s names. */
function build<T>(names: string[], body: string): (env: Record<string, unknown>) => T {
  const js = transformSync(`function make(env) { const { ${names.join(", ")} } = env; ${body} }`, { loader: "ts", target: "es2022" }).code;
  return new Function(`${js}; return make;`)() as (env: Record<string, unknown>) => T;
}
/** Runs `f`, or answers null when it throws: a planted text that cannot build or run is a failed check, never a crash. */
function safely<T>(f: () => T): T | null { try { return f(); } catch { return null; } }
/** One replacement that must land exactly once — a plant can never land twice or nowhere. */
function swap(text: string, from: string | RegExp, to: string): string {
  const n = typeof from === "string" ? text.split(from).length - 1 : (text.match(new RegExp(from.source, from.flags.includes("g") ? from.flags : from.flags + "g")) ?? []).length;
  if (n !== 1) throw new Error(`plant anchor occurs ${n} times: ${String(from).slice(0, 80)}`);
  return text.replace(from, to);
}

/* ══ §1 · B-1 THE IN-FLIGHT FOCUS TRAP ═══════════════════════════════════════════════════════════════════════════════ */
section("1 · B-1 focus never leaves a money confirm while its request is in flight (modal.tsx)");
const MODAL = "src/components/ui/modal.tsx";
const modal = code(MODAL);
{
  // The trap's list, as modal.tsx defines it — and the markup scanner below models exactly that selector.
  const SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  ok("1.1 · the trap's FOCUSABLE list is the selector this suite reads markup by (so what it counts is what the trap finds)",
    modal.includes(`const FOCUSABLE =\n  '${SELECTOR}';`));
  const TAG = /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*\/?>/g;
  const ATTR = /\s+([^\s=>/]+)(?:="([^"]*)")?/g;
  const focusables = (markup: string) => [...markup.matchAll(TAG)].filter((m) => {
    const tag = m[1].toLowerCase();
    const attrs = new Map<string, string>();
    for (const a of (m[2] ?? "").matchAll(ATTR)) attrs.set(a[1].toLowerCase(), a[2] ?? "");
    const disabled = attrs.has("disabled");
    return (tag === "button" && !disabled) || attrs.has("href") || (["input", "select", "textarea"].includes(tag) && !disabled)
      || (attrs.has("tabindex") && attrs.get("tabindex") !== "-1");
  }).length;
  /** The REAL dialog's panel content: the component's Modal element, drawn as Modal's panel draws it (its corner ✕ when
   *  shown, then its children) — Modal itself draws nothing on a server (it waits for a mount and a portal). */
  function PanelOf({ C, p }: { C: (p: never) => ReactNode; p: Record<string, unknown> }) {
    const el = C(p as never) as ReactElement<{ children?: ReactNode; showClose?: boolean; onClose: () => void }>;
    return h("div", { "data-panel": "" },
      el.props.showClose === false ? null : h(CloseX, { onClick: el.props.onClose, label: "Funga", className: "absolute right-3 top-3" }),
      el.props.children);
  }
  const noop = () => {};
  const panel = (C: unknown, p: Record<string, unknown>) => renderToStaticMarkup(h(PanelOf, { C: C as never, p }));
  const sell = (pending: boolean) => panel(SellConfirmModal, { open: true, pending, stake: 5000, value: 6100, positionId: "pos_0123456789abcdef", onConfirm: noop, onCancel: noop });
  const bet = (pending: boolean) => panel(BetConfirmModal, { open: true, pending, side: "YES", stake: 5000, multiplier: 1, lean: "fair", isOneSided: false, marketTitle: "Simba watashinda?", onConfirm: noop, onCancel: noop });
  const confirm = (loading: boolean) => panel(ConfirmModal, { open: true, onClose: noop, onConfirm: noop, title: "Thibitisha", body: "Una uhakika?", loading });
  const counts = { sellIdle: focusables(sell(false)), sellBusy: focusables(sell(true)), betIdle: focusables(bet(false)), betBusy: focusables(bet(true)),
    confirmIdle: focusables(confirm(false)), confirmBusy: focusables(confirm(true)) };
  ok(`1.2 · the condition, on the REAL panels: in flight, the Sell confirm, the bet confirm and ConfirmModal's medium tier each hold ${counts.sellBusy}/${counts.betBusy}/${counts.confirmBusy} controls the trap can focus (every one disabled, the ✕ withheld) — idle, ${counts.sellIdle}/${counts.betIdle}/${counts.confirmIdle}`,
    counts.sellBusy === 0 && counts.betBusy === 0 && counts.confirmBusy === 0 && counts.sellIdle >= 2 && counts.betIdle >= 2 && counts.confirmIdle >= 2, show(counts));

  // The trap itself: modal.tsx's onKey, built from its text and run on stand-ins.
  const ONKEY_NAMES = ["isTopLayer", "layer", "openList", "panelRef", "OPEN_LIST", "whereIs", "openLayers", "isNowhere", "closeOnEscRef", "onCloseRef", "focusables", "document"];
  const onKeyText = (src: string) => fnText(src, src.indexOf("const onKey = (e: KeyboardEvent) => {"));
  type Node = { name: string; focus(): void; contains(o: unknown): boolean };
  type Press = { prevented: boolean; to: string };
  /** Tab (or Shift+Tab) pressed with focus on `at`, the panel holding `controls`; where focus went, and whether the
   *  browser's own move was stopped. `where` is the dialog stack's answer for the focused node. */
  function press(src: string, o: { controls: number; at: "panel" | "inside-disabled" | "outside" | "first" | "middle" | "last"; shift: boolean; where?: string; top?: boolean }): Press | null {
    return safely(() => {
      let active: Node | null = null;
      const node = (name: string, kids: Node[] = []): Node => { const n: Node = { name, focus() { active = n; }, contains: (x) => x === n || kids.some((k) => k.contains(x)) }; return n; };
      const controls = Array.from({ length: o.controls }, (_, i) => node(`control${i + 1}`));
      const disabled = node("disabled-button");
      const pnl = node("panel", [...controls, disabled]);
      const outside = node("page-behind");
      active = o.at === "panel" ? pnl : o.at === "inside-disabled" ? disabled : o.at === "outside" ? outside
        : o.at === "first" ? controls[0] : o.at === "last" ? controls[controls.length - 1] : controls[1];
      const onKey = build<(e: unknown) => void>(ONKEY_NAMES, `${onKeyText(src)}; return onKey;`)({
        isTopLayer: () => o.top ?? true, layer: {}, openList: () => false, panelRef: { current: pnl }, OPEN_LIST: "[x]",
        whereIs: () => o.where ?? (pnl.contains(active) ? "top" : "behind"), openLayers: () => [], isNowhere: () => false,
        closeOnEscRef: { current: true }, onCloseRef: { current: () => {} }, focusables: () => controls,
        document: { get activeElement() { return active; } },
      });
      const e = { key: "Tab", shiftKey: o.shift, defaultPrevented: false, target: active, prevented: false, preventDefault() { e.prevented = true; } };
      onKey(e);
      return { prevented: e.prevented, to: (active as Node | null)?.name ?? "nowhere" };
    });
  }
  const P = (r: Press | null) => (r === null ? "could not run" : `${r.prevented ? "held" : "browser's"} → ${r.to}`);
  const trapRuns = (src: string) => ({
    busyTab: press(src, { controls: 0, at: "inside-disabled", shift: false }),
    busyShift: press(src, { controls: 0, at: "inside-disabled", shift: true }),
    busyNowhere: press(src, { controls: 0, at: "outside", shift: false, where: "nowhere" }),
    busyAbove: press(src, { controls: 0, at: "outside", shift: false, where: "above" }),
    busyCovered: press(src, { controls: 0, at: "inside-disabled", shift: false, top: false }),
    panelTab: press(src, { controls: 3, at: "panel", shift: false }),
    panelShift: press(src, { controls: 3, at: "panel", shift: true }),
    outsideTab: press(src, { controls: 3, at: "outside", shift: false }),
    outsideShift: press(src, { controls: 3, at: "outside", shift: true }),
    lastTab: press(src, { controls: 3, at: "last", shift: false }),
    firstShift: press(src, { controls: 3, at: "first", shift: true }),
    middleTab: press(src, { controls: 3, at: "middle", shift: false }),
  });
  const held = (r: Press | null, to: string) => r !== null && r.prevented && r.to === to;
  const free = (r: Press | null, at: string) => r !== null && !r.prevented && r.to === at;
  const t = trapRuns(modal);
  const inFlightHeld = (x: typeof t) => held(x.busyTab, "panel") && held(x.busyShift, "panel") && held(x.busyNowhere, "panel");
  ok("1.3 · ★ RUN · in flight (no control can take focus), Tab and Shift+Tab stay in the dialog — the panel itself holds focus — from a disabled button inside and from nowhere alike",
    inFlightHeld(t), `${P(t.busyTab)} · ${P(t.busyShift)} · ${P(t.busyNowhere)}`);
  ok("1.4 · RUN · …and a surface drawn over the dialog keeps its own Tab, and a dialog covered by another answers no key (S6 A8i-2, as before)",
    free(t.busyAbove, "page-behind") && free(t.busyCovered, "disabled-button"), `${P(t.busyAbove)} · ${P(t.busyCovered)}`);
  ok("1.5 · RUN · from the panel itself (once the answer has come and its controls are back), Tab goes to the first control and Shift+Tab to the last — the browser's own Shift+Tab from the panel would walk out behind the scrim",
    held(t.panelTab, "control1") && held(t.panelShift, "control3"), `${P(t.panelTab)} · ${P(t.panelShift)}`);
  ok("1.6 · RUN · the trap as it was: focus outside is brought in both ways, the ends wrap, and a Tab between two controls is the browser's own",
    held(t.outsideTab, "control1") && held(t.outsideShift, "control3") && held(t.lastTab, "control1") && held(t.firstShift, "control3") && free(t.middleTab, "control2"),
    `${P(t.outsideTab)} · ${P(t.outsideShift)} · ${P(t.lastTab)} · ${P(t.firstShift)} · ${P(t.middleTab)}`);
  const round5 = safely(() => swap(modal, "if (f.length === 0) { e.preventDefault(); panelRef.current?.focus(); return; }", "if (f.length === 0) return;"));
  const r5 = round5 === null ? null : trapRuns(round5);
  ok("1.7 CONTROL · round 5's trap (`if (f.length === 0) return;`): in flight, Tab was the browser's own — focus left the aria-modal dialog for the page behind the scrim (the reviewer's 0 focusables at the tip)",
    r5 !== null && !r5.busyTab?.prevented && !inFlightHeld(r5), r5 === null ? "plant failed" : P(r5.busyTab));
  const noPanelCase = safely(() => swap(modal, " || active === panelRef.current) {", ") {"));
  const np = noPanelCase === null ? null : trapRuns(noPanelCase);
  ok("1.7′ PLANT · focus on the panel treated as inside (the Shift+Tab from it the browser's) is reported by 1.5",
    np !== null && !(held(np.panelShift, "control3")), np === null ? "plant failed" : P(np.panelShift));

  // The panel takes script focus; the opening's fallback reaches it.
  ok("1.8 · the panel is focusable from script alone (`tabIndex={-1}`: out of the Tab order and out of FOCUSABLE) and draws no ring of its own (`outline-none`, as the repo's other script-only focus targets)",
    /ref=\{panelRef\}\s*tabIndex=\{-1\}/.test(modal) && modal.includes("mat-modal relative w-full p-5 lg:p-6 outline-none ${"));
  ok("1.9 · the opening's own fallback (`focusIn`: its first target, else its first control, else the panel) — dead while the panel took no focus — now lands",
    /\?\? focusables\(\)\[0\] \?\? panelRef\.current;\s*target\?\.focus\(\);/.test(modal));

  // The uncovering: a way out that cannot take focus hands it to the panel.
  const safeText = (src: string) => { const at = src.indexOf("safe: () =>"); return at < 0 ? "" : fnText(src, at + "safe: ".length); };
  type Way = { name: string; isConnected: boolean; matches(s: string): boolean } | null;
  const wayOf = (src: string, way: Way | undefined) => safely(() => {
    const text = safeText(src);
    const pnl = { name: "panel" };
    const r = build<() => { name?: string } | null>(["safeFocusRef", "panelRef"], `return (${text});`)({
      safeFocusRef: { current: way === undefined ? undefined : { current: way } }, panelRef: { current: pnl } })();
    return r === null ? "none" : (r as { name: string }).name;
  });
  const button = (disabled: boolean, connected = true): Way => ({ name: disabled ? "disabled Cancel" : "Cancel", isConnected: connected, matches: (s) => s === ":disabled" && disabled });
  const safeRuns = (src: string) => ({ live: wayOf(src, button(false)), disabled: wayOf(src, button(true)), gone: wayOf(src, button(false, false)), unnamed: wayOf(src, undefined), nullWay: wayOf(src, null) });
  const s = safeRuns(modal);
  ok("1.10 · ★ RUN · the dialog drawn over a confirm closing hands focus to the confirm's way out — and when that way out is disabled (its request in flight) or gone, to the panel: inside the dialog, never its money button, never nowhere; a dialog naming no way out is as before",
    s.live === "Cancel" && s.disabled === "panel" && s.gone === "panel" && s.unnamed === "none" && s.nullWay === "none", show(s));
  const oldSafe = safely(() => swap(modal, /safe: \(\) => \{[\s\S]*?panelRef\.current;\s*\},/, "safe: () => safeFocusRef.current?.current ?? null,"));
  const os = oldSafe === null ? null : safeRuns(oldSafe);
  ok("1.10′ CONTROL · round 5's `safe` handed focus to the disabled Cancel — a focus that goes nowhere", os !== null && os.disabled === "disabled Cancel", show(os));

  // The siblings: the two other focus traps keep `if (f.length === 0) return;` — and can never reach it.
  const notif = code("src/components/layout/notifications-panel.tsx"), sheet = code("src/components/markets/filter-sheet.tsx");
  // The bell's ✕, the whole element (its onClick holds an arrow, so no `[^>]*` reading of the tag would do).
  const notifClose = /<button\s+type="button"\s+aria-label=\{t\.common\.close\}[\s\S]*?<\/button>/.exec(notif)?.[0] ?? "";
  const sheetClose = /<CloseX onClick=\{close\} label=\{closeLabel\}[^>]*\/>/.exec(sheet)?.[0] ?? "";
  ok("1.11 · the siblings legitimately differ: the bell's panel (frozen classic chrome) and the filter sheet trap the same way, but their ✕ is never disabled nor withheld, so their list is never empty and the line is unreachable — both containers already take script focus (`tabIndex={-1}`)",
    /if \(f\.length === 0\) return;/.test(notif) && /if \(f\.length === 0\) return;/.test(sheet) && notifClose !== "" && !/disabled/.test(notifClose)
      && sheetClose !== "" && !/withheld|disabled/.test(sheetClose) && /tabIndex=\{-1\}/.test(notif) && /tabIndex=\{-1\}/.test(sheet),
    show({ notifClose: notifClose.slice(0, 80), sheetClose }));
  console.log("       browser check for the lock turn: throttle the network, press Confirm on the bet (and the Sell) confirm, press Tab —");
  console.log("       document.activeElement stays inside [role=dialog] (on its panel), and Shift+Tab too; when the answer comes, Tab reaches its first control.");
}

/* ══ §2 · B-2 THE CHART'S RETRIES ═══════════════════════════════════════════════════════════════════════════════════ */
section("2 · B-2 a hung request no longer holds the chart's poll (terminal-chart.tsx's data effect, run on a virtual clock)");
{
  const TC = "src/components/charts/terminal-chart.tsx";
  const tc = code(TC);
  const DEADLINE = Number(/export const HISTORY_DEADLINE_MS = ([0-9_]+);/.exec(tc)?.[1]?.replace(/_/g, ""));
  /** The data effect's arrow, as written: the useEffect whose body opens with `let alive = true;`. */
  const effectText = (src: string) => { const at = src.indexOf("let alive = true;"); const start = src.lastIndexOf("useEffect(() => {", at); return fnText(src, src.indexOf("() => {", start)); };
  const NAMES = ["setTimeout", "clearTimeout", "fetch", "document", "AbortController", "setFeed", "setStatus", "seqRef", "lastRawRef", "cadenceRef",
    "decimalsRef", "rangeRef", "HISTORY_DEADLINE_MS", "pollMs", "assetKey", "range", "style"];
  const FEED = JSON.stringify({ series: { mode: "line", points: [{ t: 1, price: 100 }] }, livePrice: 100, sourceQuotedAt: null, liveStale: false, medianDeltaMs: null, decimals: 2 });
  const EMPTY = JSON.stringify({ series: { mode: "line", points: [] }, livePrice: null, sourceQuotedAt: null, liveStale: false, medianDeltaMs: null, decimals: 2 });
  type Answer = { headersAt: number; ok?: boolean; status?: number; bodyAt?: number; body?: string };
  type Signal = { aborted: boolean; listeners: Set<() => void>; addEventListener(t: string, f: () => void): void; removeEventListener(t: string, f: () => void): void };
  type Run = { requests: number[]; aborted: boolean[]; maxLive: number; statuses: Array<[number, string]>; status: string; feedAt: number | null;
    effectListeners: number; midListeners: number | null; afterClose: number };
  /** One scenario: the effect built from `src`, each request answered as `plan` says, the clock run to `until` (ms). */
  async function scenario(src: string, plan: (i: number) => Answer, o: { until: number; closeAt?: number; probeAt?: number }): Promise<Run | null> {
    try {
      let now = 0, nextId = 0;
      const timers = new Map<number, { at: number; fn: () => void }>();
      const setT = (fn: () => void, ms: number) => { const id = ++nextId; timers.set(id, { at: now + Math.max(0, ms), fn }); return id; };
      const clearT = (id: number | null | undefined) => { if (id != null) timers.delete(id); };
      const settle = async () => { for (let k = 0; k < 6; k++) await new Promise((r) => setImmediate(r)); };
      async function runUntil(end: number) {
        for (;;) {
          await settle();
          let best: [number, { at: number; fn: () => void }] | null = null;
          for (const e of timers) if (e[1].at <= end && (!best || e[1].at < best[1].at)) best = e;
          if (!best) { now = end; await settle(); return; }
          timers.delete(best[0]); now = best[1].at; best[1].fn();
        }
      }
      const controllers: Array<{ signal: Signal }> = [];
      class AC {
        signal: Signal = { aborted: false, listeners: new Set(), addEventListener(_t, f) { this.listeners.add(f); }, removeEventListener(_t, f) { this.listeners.delete(f); } };
        constructor() { controllers.push(this); }
        abort() { if (this.signal.aborted) return; this.signal.aborted = true; for (const f of [...this.signal.listeners]) f(); }
      }
      const reqs: Array<{ at: number; done: boolean; aborted: boolean }> = [];
      let live = 0, maxLive = 0;
      const end = (r: { done: boolean }, aborted = false) => { if (r.done) return; r.done = true; live--; if (aborted) (r as { aborted: boolean }).aborted = true; };
      const fetch = (_url: string, init: { signal: Signal }) => {
        const a = plan(reqs.length);
        const r = { at: now, done: false, aborted: false };
        reqs.push(r); live++; maxLive = Math.max(maxLive, live);
        return new Promise((resolve, reject) => {
          const tHead = setT(() => {
            if (a.ok === false) end(r);
            resolve({ ok: a.ok ?? true, status: a.status ?? 200, text: () => new Promise((res2, rej2) => {
              const tBody = setT(() => { end(r); res2(a.body ?? FEED); }, Math.max(0, (a.bodyAt ?? a.headersAt) - a.headersAt));
              init.signal.addEventListener("abort", () => { clearT(tBody); end(r, true); rej2(new Error("aborted")); });
            }) });
          }, a.headersAt);
          init.signal.addEventListener("abort", () => { clearT(tHead); end(r, true); reject(new Error("aborted")); });
        });
      };
      let status = "loading", feedAt: number | null = null, closed = false, afterClose = 0;
      const statuses: Array<[number, string]> = [];
      const make = build<() => () => void>(NAMES, `return (${effectText(src)});`);
      const effect = make({
        setTimeout: setT, clearTimeout: clearT, fetch, document: { visibilityState: "visible", addEventListener() {}, removeEventListener() {} }, AbortController: AC,
        setFeed: (v: unknown) => { if (closed) afterClose++; if (v && feedAt === null) feedAt = now; },
        setStatus: (v: string | ((s: string) => string)) => { if (closed) afterClose++; const n = typeof v === "function" ? v(status) : v; if (n !== status) statuses.push([now, n]); status = n; },
        seqRef: { current: 0 }, lastRawRef: { current: "" }, cadenceRef: { current: null }, decimalsRef: { current: 2 }, rangeRef: { current: "1H" },
        HISTORY_DEADLINE_MS: DEADLINE, pollMs: 30_000, assetKey: "btc", range: "1H", style: "line",
      });
      const cleanup = effect();
      let midListeners: number | null = null;
      if (o.probeAt !== undefined) { await runUntil(o.probeAt); midListeners = controllers[0].signal.listeners.size; }
      if (o.closeAt !== undefined) { await runUntil(o.closeAt); cleanup(); closed = true; }
      await runUntil(o.until);
      return { requests: reqs.map((r) => r.at / 1000), aborted: reqs.map((r) => r.aborted), maxLive, statuses, status, feedAt, effectListeners: controllers[0].signal.listeners.size, midListeners, afterClose };
    } catch { return null; }
  }
  const stall: (i: number) => Answer = () => ({ headersAt: 100_000, ok: false, status: 524 }); // Cloudflare's 524 after its 100s origin timeout
  const fast: Answer = { headersAt: 400 };
  const runs = async (src: string) => ({
    stall: await scenario(src, stall, { until: 299_000 }),
    cold: await scenario(src, (i) => (i === 0 ? { headersAt: 20_000 } : fast), { until: 90_000 }),
    drawn: await scenario(src, (i) => (i === 0 ? { headersAt: 1_000 } : { headersAt: 100_000, ok: false, status: 524 }), { until: 299_000 }),
    empty: await scenario(src, () => ({ headersAt: 800, body: EMPTY }), { until: 20_000 }),
    refused: await scenario(src, () => ({ headersAt: 800, ok: false, status: 524 }), { until: 20_000 }),
    slow: await scenario(src, (i) => (i === 0 ? { headersAt: 5_000, bodyAt: 45_000 } : fast), { until: 89_000 }),
    closed: await scenario(src, stall, { until: 200_000, closeAt: 10_000 }),
    steady: await scenario(src, () => fast, { until: 299_000, probeAt: 200 }),
  });
  const R = await runs(tc);
  const every30 = Array.from({ length: 10 }, (_, i) => i * 30);
  const stallOk = (r: Run | null) => r !== null && show(r.requests) === show(every30) && r.maxLive === 1 && r.aborted.slice(0, -1).every(Boolean)
    && show(r.statuses) === show([[DEADLINE, "error"]]);
  ok(`2.1 · ★ RUN · a route that stalls 100s (Cloudflare's 524): the pane says "unavailable — retrying" at ${DEADLINE / 1000}s, and it IS retrying — a fresh request every 30s (${R.stall?.requests.join(", ")}s), each one that never began to answer aborted, never two at once`,
    stallOk(R.stall), show(R.stall));
  const lateOk = (r: Run | null) => r !== null && show(r.statuses) === show([[DEADLINE, "error"], [20_000, "ok"]]) && r.feedAt === 20_000;
  ok("2.2 · RUN · a late answer still draws: a cold start that answers at 20s turns the pane from \"unavailable\" to the chart at 20s", lateOk(R.cold), show(R.cold?.statuses));
  ok("2.3 · RUN · a drawn chart is never replaced: drawn at 1s, then every request stalls — the pane keeps the chart for five minutes (F3)",
    R.drawn !== null && show(R.drawn.statuses) === show([[1_000, "ok"]]) && R.drawn.status === "ok", show(R.drawn?.statuses));
  ok("2.4 · RUN · only a VERIFIED empty answer says \"no reads\"; a refused one says \"unavailable\"",
    R.empty !== null && show(R.empty.statuses) === show([[800, "empty"]]) && R.refused !== null && show(R.refused.statuses) === show([[800, "error"]]),
    show({ empty: R.empty?.statuses, refused: R.refused?.statuses }));
  const slowOk = (r: Run | null) => r !== null && show(r.requests) === show([0, 60]) && !r.aborted[0] && show(r.statuses) === show([[DEADLINE, "error"], [45_000, "ok"]]);
  ok("2.5 · RUN · a body slow to arrive (headers at 5s, the last byte at 45s, a 2G phone) is waited for — the 30s poll sends no second download beside it — and draws at 45s; the next request goes at 60s",
    slowOk(R.slow), show({ requests: R.slow?.requests, aborted: R.slow?.aborted, statuses: R.slow?.statuses }));
  const closedOk = (r: Run | null) => r !== null && show(r.requests) === show([0]) && r.aborted[0] === true && r.afterClose === 0;
  ok("2.6 · RUN · closing the chart (a new window, a page left) aborts the request in flight — through the effect's abort, to which each request is chained — and nothing is set after",
    closedOk(R.closed), show(R.closed));
  ok("2.7 · RUN · each request leaves the effect's abort when it settles: one listener while a request is in flight, none after ten — they never pile up over hours of polling",
    R.steady !== null && R.steady.midListeners === 1 && R.steady.effectListeners === 0 && R.steady.requests.length === 10 && R.steady.maxLive === 1, show({ mid: R.steady?.midListeners, end: R.steady?.effectListeners, n: R.steady?.requests.length }));
  // CONTROL and PLANTS: each a text the effect is built from, run on the same clock.
  const ROUND5_TICK = "timer = setTimeout(async () => { await load(); if (alive) paceNext(); }, wait);";
  const plant = (from: string | RegExp, to: string) => safely(() => swap(tc, from, to));
  const control = plant(/timer = setTimeout\(\(\) => \{\s*if \(inFlight === null[^\n]*\n\s*if \(alive\) paceNext\(\);\s*\}, wait\);/, ROUND5_TICK);
  const cR = control === null ? null : await scenario(control, stall, { until: 299_000 });
  ok(`2.8 CONTROL · round 5's poll (it awaited each request): against the same stall the requests went out at ${cR?.requests.join(", ")}s — the reviewer's 0, 30, 160, 290 — while the pane said "retrying"`,
    cR !== null && show(cR.requests) === show([0, 30, 160, 290]) && !stallOk(cR), show(cR?.requests));
  const pAnswering = plant("mine.answering = true;", "");
  const pA = pAnswering === null ? null : await scenario(pAnswering, (i) => (i === 0 ? { headersAt: 5_000, bodyAt: 45_000 } : fast), { until: 89_000 });
  ok("2.9 PLANT · the answer's start no longer marked (a slow body replaced at the next poll, so it never draws) is reported by 2.5", pA !== null && !slowOk(pA), show(pA?.requests));
  const pOverdue = plant("mine.overdue = true;", "");
  const pO = pOverdue === null ? null : await scenario(pOverdue, stall, { until: 299_000 });
  ok("2.9′ PLANT · the deadline no longer marking its request overdue (the poll waits the stall out again) is reported by 2.1", pO !== null && !stallOk(pO), show(pO?.requests));
  const pPrev = plant("inFlight?.abort.abort();", "");
  const pP = pPrev === null ? null : await scenario(pPrev, stall, { until: 299_000 });
  ok("2.9″ PLANT · a new request no longer aborting the hung one (they pile up behind the stall) is reported by 2.1", pP !== null && !stallOk(pP) && pP.maxLive > 1, show({ maxLive: pP?.maxLive }));
  const pChain = plant('ac.signal.addEventListener("abort", chained);', "");
  const pC = pChain === null ? null : await scenario(pChain, stall, { until: 200_000, closeAt: 10_000 });
  ok("2.9‴ PLANT · a request no longer chained to the effect's abort (a closed chart's request runs on) is reported by 2.6", pC !== null && !closedOk(pC), show(pC?.aborted));
}

/* ══ §3 · B-3 THREE TEXT READERS, LINEAR AND EXACT ═══════════════════════════════════════════════════════════════════ */
section("3 · B-3 moneySentence's last two words, /live's hyphen tokens and endClause: linear, and exactly what they replaced");
{
  const OLD_LAST_TWO = /\S+\s+\S+\s*$/;
  const OLD_HYPHEN = /([^\s\p{Script=Han}]*(?:\p{L}-[\p{L}\p{N}]|\p{N}-\p{L})[^\s\p{Script=Han}]*)/u;
  const oldEndClause = (text: string, stop: "." | "。") => { const t = text.trimEnd(); if (/[!?！？…]$/.test(t)) return t; return `${t.replace(/[.。]+$/, "")}${stop}`; };
  const c = (n: number) => String.fromCodePoint(n);
  // Built to hit the edges: letters (astral, decomposed), numbers of three kinds, hyphens and dashes, every kind of space,
  // Han (BMP, astral, Unicode 15.1's Extension I), Chinese and Latin stops, joiners, marks, lone surrogates.
  const TOK = ["a", "Z", "é", "e\u0301", c(0x1d400), "Ж", "1", "2026", "٣", "²", "Ⅻ", "-", "--", "‐", "–", "—", "-a", "a-", "1-", "-1",
    " ", "  ", "\t", "\n", c(0xa0), c(0x3000), c(0x2003), c(0x202f), "中", "国", c(0x20000), c(0x2ebf0), "。", "？", ",", "?", "!", "(", ")", "/", ".", "..", "…",
    "😀", "\u200d", "\u0301", "month-end?", "30-day", "Man-City", "2026-27", "中-a", "a-中", "1-中", "中-1", "TZS", "4,200", "dakika", "\ud800", "\udc00"];
  let seed = 61009; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; };
  const diffs: Record<string, string[]> = { lastTwo: [], hyphen: [], endClause: [] };
  let n = 0;
  for (let i = 0; i < 30_000; i++) {
    let s = ""; const k = Math.floor(rnd() * 12);
    for (let j = 0; j < k; j++) s += TOK[Math.floor(rnd() * TOK.length)];
    n++;
    if (s.search(OLD_LAST_TWO) !== lastTwoWordsAt(s)) diffs.lastTwo.push(s);
    if (show(s.split(OLD_HYPHEN)) !== show(hyphenParts(s))) diffs.hyphen.push(s);
    for (const stop of [".", "。"] as const) if (oldEndClause(s, stop) !== endClause(s, stop)) diffs.endClause.push(s);
  }
  ok(`3.1 · ★ EXACT · over ${n.toLocaleString("en")} seeded strings, lastTwoWordsAt is \`/\\S+\\s+\\S+\\s*$/\`'s search, hyphenParts is the old split's very array, and endClause cuts as \`/[.。]+$/\` did (both stops): ${diffs.lastTwo.length + diffs.hyphen.length + diffs.endClause.length} differences`,
    diffs.lastTwo.length === 0 && diffs.hyphen.length === 0 && diffs.endClause.length === 0, show({ lastTwo: diffs.lastTwo.slice(0, 2), hyphen: diffs.hyphen.slice(0, 2), endClause: diffs.endClause.slice(0, 2) }));
  const time = (f: () => unknown) => { const t0 = performance.now(); f(); return performance.now() - t0; };
  const LONG = ["x".repeat(20_000), "x".repeat(20_000) + " ", "a-".repeat(10_000), "中".repeat(20_000), ".".repeat(20_000) + "x", "。".repeat(20_000)];
  const took = time(() => { for (const s of LONG) { lastTwoWordsAt(s); hyphenParts(s); endClause(s, "."); moneySentence(s); } });
  ok(`3.2 · linear, whatever the text: six adversarial 20,000-character texts through all three readers (and moneySentence) take ${took.toFixed(0)}ms together`, took < 300, `${took.toFixed(0)} ms`);
  const word = "x".repeat(10_000), dots = ".".repeat(10_000) + "x";
  const oldTook = time(() => { word.search(OLD_LAST_TWO); word.split(OLD_HYPHEN); oldEndClause(dots, "."); });
  const newTook = time(() => { lastTwoWordsAt(word); hyphenParts(word); endClause(dots, "."); });
  ok(`3.3 CONTROL · the three patterns they replaced take ${oldTook.toFixed(0)}ms on 10,000 characters (the readers ${newTook.toFixed(1)}ms) — the square of the length`,
    oldTook > 10 * newTook && oldTook > 20, `${oldTook.toFixed(1)} vs ${newTook.toFixed(1)} ms`);
  const fill = code("src/lib/fill-nodes.tsx"), grid = code("src/app/live/pulse-grid.tsx"), nt = code("src/lib/notification-text.ts");
  ok("3.4 · the three draw through them: moneySentence reads `lastTwoWordsAt`, KeepHyphenated `hyphenParts`, endClause its backward strip — no quadratic pattern is left in any of the three",
    fill.includes("lastTwoWordsAt(text)") && !fill.includes(".search(") && grid.includes("const parts = hyphenParts(text);") && !/text\.split\(/.test(grid)
      && /while \(end > 0 && \(t\[end - 1\] === "\." \|\| t\[end - 1\] === "。"\)\) end--;/.test(nt) && !/\[\.。\]\+\$/.test(nt));
  ok("3.5 · /live's wall draws as before: \"30-day\" and \"month-end?\" whole, the Chinese title in short tokens, \"2026-27\" left to keepFigures",
    show(hyphenParts("Will Ethereum hit a new 30-day high before month-end?").filter((_, i) => i % 2 === 1)) === show(["30-day", "month-end?"])
      && html(h(KeepHyphenated, { text: "辛巴俱乐部赢得2026-27赛季NBC超级联赛" })).includes('<span class="whitespace-nowrap">2026-27赛季</span>'));
}

/* ══ §4 · B-4 A NAME'S CUT, DECIDED ONCE ═════════════════════════════════════════════════════════════════════════════ */
section("4 · B-4 a name's cut is decided once, on the server, and handed to the client that draws it again");
{
  const names = ["Neema Juma", "Juma K", "AB", "A", "", "   ", "欧阳慕容百里呼延", "Neema 👩\u200d💻", "🇹🇿🇰🇪", "a\u0301b\u0301c\u0301", "Mwanaisha Khamis",
    "AB" + "\u3000".repeat(37) + "C", "Neema Juma\u0897", "x".repeat(40), "क्षत्रिय", "한국어", "Neema  Juma"];
  const same = names.filter((s) => html(keepNameEnd(s)) === html(nameWithEnd(s, nameEndAt(s))));
  ok(`4.1 · keepNameEnd is the two halves together — the cut (nameEndAt) and the drawing (nameWithEnd) — byte for byte, over ${names.length} names (marks, joiners, flags, conjuncts, jamo, a wide gap)`,
    same.length === names.length, names.filter((s) => !same.includes(s)).map((s) => show(s)).join(" "));
  ok("4.2 · nameWithEnd draws the name as it came for a cut that cuts nothing (−1, 0, the end, outside, not a whole index)",
    ["Neema Juma"].every((s) => [-1, 0, s.length, s.length + 3, 2.5, Number.NaN].every((at) => nameWithEnd(s, at) === s)));
  // The defect, as the reviewer measured it: U+0897 ARABIC PEPET is a mark from Unicode 16; an engine whose tables are
  // older reads it as an unassigned character — exactly as this engine reads U+0378, unassigned in every version.
  const name = "Neema Juma\u0897", older = "Neema Juma\u0378";
  const nodeCut = nameEndAt(name), olderCut = nameEndAt(older);
  ok(`4.3 CONTROL · the same pattern, two Unicode versions: Node cuts "Neema Juma"+U+0897 at ${nodeCut}, an engine with Unicode 15 tables at ${olderCut} — a client that re-derived the cut drew another span than the server's HTML (a hydration mismatch)`,
    nodeCut !== olderCut && nodeCut > 0 && olderCut > 0, show({ nodeCut, olderCut }));
  ok("4.4 · ★ …and with the cut handed down, the client draws the server's markup whatever its own tables: nameWithEnd(name, the server's cut) IS the server's keepNameEnd",
    html(nameWithEnd(name, nodeCut)) === html(keepNameEnd(name)));
  const editor = code("src/components/profile/name-editor.tsx"), page = code("src/app/profile/page.tsx"), hub = read("src/app/account/page.tsx");
  const editorOk = (s: string) => /\? nameWithEnd\(currentName, currentNameEnd\) :/.test(s) && s.includes('import { nameWithEnd } from "@/components/ui/keep-words";')
    && !/\b(?:keepNameEnd|nameEndAt|characterSpans)\b/.test(s) && /currentNameEnd: number;/.test(s);
  ok("4.5 · /profile: the server page decides the cut (`nameEndAt`) and hands it down; the editor — a client component — draws it with `nameWithEnd` and holds no cut-deriving code at all",
    editorOk(editor) && page.includes('currentNameEnd={nameEndAt(user.displayName ?? "")}') && !/^\s*["']use client["']/.test(page));
  ok("4.5′ PLANT · the editor re-deriving its cut (`keepNameEnd(currentName)`, round 5) is reported",
    !editorOk(editor.replace("nameWithEnd(currentName, currentNameEnd)", "keepNameEnd(currentName)").replace("import { nameWithEnd }", "import { keepNameEnd }")));
  ok("4.6 · the hub keeps keepNameEnd: account/page.tsx is a server component, its name drawn once", !/^\s*["']use client["']/.test(hub) && hub.includes("{keepNameEnd(viewer.name)}"));
  // The siblings: every client component that reads a Unicode property while it draws (a cut a browser could re-derive).
  const SRC = "src";
  const walk = (d: string): string[] => readdirSync(d).flatMap((x) => { const p = join(d, x); return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mts)$/.test(x) ? [p.split("\\").join("/")] : []; });
  // A client module's first statement is its directive (comments before it go through the shared scanner — a pattern
  // that skipped comments itself backtracked without end on a file opening with several of them).
  const client = (s: string) => /^["']use client["']/.test(decomment(s).trimStart());
  const CUT = /\b(?:keepNameEnd|nameEndAt|characterSpans)\(/;
  const CLASSIFIED: Record<string, string> = {
    "src/app/live/pulse-grid.tsx": "KeepHyphenated (hyphenParts) splits a market title by \\p{Script=Han}, \\p{L}, \\p{N}: the same mechanism, on officer- or AI-written titles in sw/en/zh — a mismatch needs a character newer than the browser's tables inside a hyphen token or at a Han boundary; named for the integrator (/live's first paint would take the server's parts)",
    "src/app/global-error.tsx": "REGULATOR_NAME's optional \\p{Cf} between two fixed strings — the regulator's name, fixed copy: no character there is newer than any engine's tables",
  };
  const found = walk(SRC).filter((f) => {
    const s = read(f);
    if (!s.includes("\\p{") && !CUT.test(s)) return false;
    return client(s) && (s.includes("\\p{") || CUT.test(decomment(s)));
  });
  const unclassified = found.filter((f) => !(f in CLASSIFIED)), stale = Object.keys(CLASSIFIED).filter((f) => !found.includes(f));
  ok(`4.7 · the census: ${found.length} client components read a Unicode property (or derive a name's cut) while they draw, each classified — and none derives a name's cut`,
    unclassified.length === 0 && stale.length === 0 && !found.some((f) => CUT.test(code(f))), show({ unclassified, stale }));
  const editorRaw = read("src/components/profile/name-editor.tsx");
  const plantedEditor = editorRaw.replace("nameWithEnd(currentName, currentNameEnd)", "keepNameEnd(currentName)");
  ok("4.7′ PLANT · a client component deriving a name's cut again (the editor as round 5 left it) is found by the census, and is no classified exception",
    plantedEditor !== editorRaw && client(plantedEditor) && CUT.test(decomment(plantedEditor)) && !("src/components/profile/name-editor.tsx" in CLASSIFIED));
  for (const [f, why] of Object.entries(CLASSIFIED)) console.log(`       ${f}: ${why}`);
}

/* ══ §5 · A5 THE OLD ".." ALONE ══════════════════════════════════════════════════════════════════════════════════════ */
section("5 · A5 the old template's doubled stop is mended where it put it, and nowhere else");
{
  const tile = "\"Je, S&P 500 itafungwa juu wiki hii?\" limefutwa: Dev fixture — source withdrawn before settlement.. Dau lako lote limerejeshwa kwenye pochi yako. · pos_34d10350dfa7510cfad5";
  const mended = {
    tile: readableNotificationBody(tile) === "\"Je, S&P 500 itafungwa juu wiki hii?\" limefutwa: Dev fixture — source withdrawn before settlement. Dau lako lote limerejeshwa kwenye pochi yako.",
    end: readableNotificationBody("\"Kura\" — reason: Source withdrawn..") === "\"Kura\" — reason: Source withdrawn.",
    line: readableNotificationBody("Sababu: x..\nDau") === "Sababu: x.\nDau",
    zh: readableNotificationBody("已取消：来源已撤回.。您的本金") === "已取消：来源已撤回。您的本金",
  };
  ok("5.1 · the old shapes are mended: a reason's \"..\" before the next sentence's space or at the body's end, and \".。\" before the Chinese template's next sentence",
    Object.values(mended).every(Boolean), show(mended));
  const KEEP = ["range 1..2 here", "v1..v2", "see 4.2..4.5 inclusive", "Subiri...", "wait... ok", "ids a..b", "1..2", "x..y."];
  const kept = KEEP.filter((s) => readableNotificationBody(s) === s);
  ok(`5.2 · ★ free text a notice quotes keeps its dots: ${KEEP.map((s) => `"${s}"`).join(", ")} pass through unchanged`, kept.length === KEEP.length, show(KEEP.filter((s) => !kept.includes(s)).map((s) => [s, readableNotificationBody(s)])));
  const round5 = (body: string) => body.replace(/ · pos_[A-Za-z0-9_]+(?=$|[\s.,;:!?。，])/g, "").replace(/(^|[^.])\.\.(?!\.)/g, "$1.").replace(/\.。/g, "。");
  ok("5.3 CONTROL · round 5's rule mended \"..\" anywhere: \"range 1..2 here\" read \"range 1.2 here\"", round5("range 1..2 here") === "range 1.2 here" && round5(tile) === readableNotificationBody(tile));
  const nt = code("src/lib/notification-text.ts");
  ok("5.4 · the rule as written: `(^|[^.])\\.\\.(?=\\s|$)` — and both readers (the bell, /notifications) read every body through it",
    nt.includes(".replace(/(^|[^.])\\.\\.(?=\\s|$)/g, \"$1.\")") && code("src/components/layout/notifications-panel.tsx").includes("readableNotificationBody(")
      && code("src/app/notifications/page.tsx").includes("readableNotificationBody("));
}

/* ══ §6 · A6 A ROUND IN ITS PAGE'S WORDS ═════════════════════════════════════════════════════════════════════════════ */
section("6 · A6 an Up & Down round is named in its page's own words — its <title>, and /positions/performance's rows");
{
  const LOCALES = ["sw", "en", "zh"] as const;
  type L = (typeof LOCALES)[number];
  const D = DICTS as unknown as Record<L, { market: { udTitle: string; udMin: string } }>;
  // roundTitle, built from updown-service.ts's own text (the module itself opens the database).
  const svc = code("src/lib/server/updown-service.ts");
  const rtText = fnText(svc, svc.indexOf("export function roundTitle(")).replace(/^export /, "");
  const roundTitle = safely(() => build<(a: Mod, d: number, l: string) => string>([], `${rtText}; return roundTitle;`)({}));
  const ASSETS = [
    { nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币" }, { nameEn: "Gold", nameSw: "Dhahabu", nameZh: "黄金" },
    { nameEn: "S&P 500", nameSw: "S&P 500", nameZh: "" }, { nameEn: "Brent Oil", nameSw: "Mafuta ya Brent", nameZh: null },
  ];
  const MINUTES = [1, 3, 5, 15, 60];
  const misread: string[] = [];
  for (const a of ASSETS) for (const m of MINUTES) {
    if (!roundTitle) break;
    const stored = { titleEn: roundTitle(a, m, "en"), titleSw: roundTitle(a, m, "sw"), titleZh: roundTitle(a, m, "zh") };
    const r = storedRound(stored);
    for (const l of LOCALES) {
      const asPage = roundName(D[l], pickLocalized(l, a.nameEn, a.nameSw, a.nameZh), m);
      const asRead = r ? roundName(D[l], pickLocalized(l, r.nameEn, r.nameSw, r.nameZh), r.minutes) : "(not read)";
      if (asPage !== asRead) misread.push(`${l} ${a.nameEn} ${m}: ${asRead} ≠ ${asPage}`);
    }
  }
  ok(`6.1 · ★ every stored round title (roundTitle, run from its own text) reads back to the name its page gives it — ${ASSETS.length} assets × ${MINUTES.length} durations × 3 languages, an empty and a missing Chinese name among them`,
    roundTitle !== null && misread.length === 0, misread.slice(0, 3).join(" | "));
  ok("6.2 · …and anything else is shown as stored: a long-form question, or round titles that disagree with each other, read as no round",
    storedRound({ titleEn: "Will Simba win the league?", titleSw: "Je, Simba itashinda ligi?", titleZh: null }) === null
      && storedRound({ titleEn: "Bitcoin Up or Down · 15 min", titleSw: "Bitcoin Juu au Chini · dakika 5", titleZh: null }) === null
      && storedRound({ titleEn: "Bitcoin Up or Down · 15 min", titleSw: "Kitu kingine", titleZh: null }) === null);
  const words = LOCALES.map((l) => roundName(D[l], l === "zh" ? "比特币" : "Bitcoin", 15));
  ok(`6.3 · the words are the page's: ${words.map((w) => `"${w}"`).join(", ")} — the h1's name and game, then its chip's minutes, as the Up & Down card names a round`,
    words[0] === `Bitcoin ${D.sw.market.udTitle} · 15 ${D.sw.market.udMin}` && code("src/components/updown/updown-card.tsx").includes("aria-label={`${assetName} ${t.market.udTitle} · ${durationMinutes} ${t.market.udMin}`}")
      && code("src/app/updown/[roundId]/page.tsx").includes('{name}{" "}<span className="whitespace-nowrap">{t.market.udTitle}</span>')
      && code("src/app/updown/[roundId]/page.tsx").includes("<Chip>{round.durationMinutes} {t.market.udMin}</Chip>"));
  const storedSw = roundTitle ? roundTitle(ASSETS[0], 15, "sw") : "";
  ok(`6.4 CONTROL · the stored title is a third name for the game: "${storedSw}" beside the page's "${D.sw.market.udTitle}" — and round 5's <title> was the English stored title in every language`,
    storedSw.includes("Juu au Chini") && !storedSw.includes(D.sw.market.udTitle));
  const rp = code("src/app/updown/[roundId]/page.tsx");
  const meta = fnText(rp, rp.indexOf("export async function generateMetadata("));
  ok("6.5 · the round page's <title>, for a round that is there: `roundName` over the asset's name in the reader's language and the round's minutes — never the stored English title; a failed read and a missing round as R5-D left them",
    meta.includes("return { title: roundName(t, pickLocalized(locale, d.asset.nameEn, d.asset.nameSw, d.asset.nameZh), d.round.durationMinutes) };")
      && !/title: d\.titleEn/.test(meta) && meta.includes("catch { return { title: t.market.udTitle }; }") && meta.includes("if (!d) return notFoundMetadata();"));
  const perf = code("src/app/positions/performance/page.tsx");
  const perfOk = (s: string) => s.includes("const round = m.productLine === \"UPDOWN\" ? storedRound(m) : null;") && s.includes("title: m ? titleOf(m) : p.marketId.slice(0, 8),")
    && s.includes("bestTitle = titleOf(m);") && (s.match(/pickLocalized\(locale, m\.titleEn, m\.titleSw, m\.titleZh\)/g) ?? []).length === 1;
  ok("6.6 · /positions/performance (every product line): its recent rows and its best-win caption name a round in the page's words, through one `titleOf`; a long-form market keeps its question",
    perfOk(perf));
  ok("6.6′ PLANT · a recent row back on the stored title is reported", !perfOk(perf.replace("title: m ? titleOf(m) : p.marketId.slice(0, 8),", "title: m ? pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh) : p.marketId.slice(0, 8),")));
  // The siblings outside this fixer's area that still show a round's stored title: named for the integrator.
  const NAMED = [
    ["src/app/live/pulse-grid.tsx", "const title = pickLocalized(locale, market.titleEn, market.titleSw, market.titleZh);", "/live's wall: an Up & Down card's title (under its own \"Juu na Chini\" tag)"],
    ["src/app/live/page.tsx", "title: pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh), yesPct,", "/live's featured list"],
    ["src/app/results/page.tsx", "title: pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh),", "/results' rows (both product lines)"],
    ["src/app/fairness/page.tsx", "const titleOf = (r: AttestationRow) => pickLocalized(locale, r.titleEn, r.titleSw, r.titleZh);", "/fairness' attestation archive (99% rounds)"],
    ["src/lib/server/market-service.ts", "marketTitle: localizedText(m.titleEn, m.titleSw, m.titleZh),", "the Up & Down result notices (a writer: new notices quote the stored title)"],
  ] as const;
  const named = NAMED.filter(([f, s]) => code(f).includes(s));
  ok(`6.7 · the siblings outside this area still read a round's stored title (named for the integrator, \`roundName\` + \`storedRound\` ready for them): ${named.length} of ${NAMED.length} found as named`,
    named.length === NAMED.length, NAMED.filter((x) => !named.includes(x)).map(([f]) => f).join(", "));
  for (const [f, , why] of NAMED) console.log(`       ${f}: ${why}`);
}

/* ══ §7 · A7 THE WIN NOTICE'S CUT ════════════════════════════════════════════════════════════════════════════════════ */
section("7 · A7 the win notice cuts its market's name as every sibling cuts it");
{
  const ns = code("src/lib/server/notification-service.ts");
  const win = fnText(ns, ns.indexOf("export function notifyWin("));
  const winOk = (s: string) => s.includes("bodyEn: `${clipQuote(label.en, 70)} paid out. Tap to view.`,") && s.includes("bodySw: `${clipQuote(label.sw, 70)} kimelipa. Bonyeza kuona.`,")
    && s.includes("bodyZh: `${clipQuote(label.zh, 50)} 已赔付。点击查看。`,") && !/\$\{label\.(?:en|sw|zh)\}/.test(s);
  ok("7.1 · notifyWin quotes its market through clipQuote at 70 / 70 / 50 — no market title reaches a notice whole", winOk(win));
  ok("7.1′ PLANT · the title quoted whole again (round 5) is reported", !winOk(win.replace("${clipQuote(label.sw, 70)} kimelipa", "${label.sw} kimelipa")));
  // The rooms each emitter quotes a market title in (`opts.marketTitle` or `label`, per language).
  const roomsOf = (fn: string, src = ns) => {
    const body = fnText(src, src.indexOf(`export function ${fn}(`));
    const r = (l: string) => [...new Set([...body.matchAll(new RegExp(`clipQuote\\((?:opts\\.marketTitle|label)\\.${l}, (\\d+)\\)`, "g"))].map((m) => Number(m[1])))].join("/") || "—";
    return `${r("en")} · ${r("sw")} · ${r("zh")}`;
  };
  // A family is the notices one event sends, their sentences alike in length: one room each. (Across families the rooms
  // are each family's own — the lengths R5-B kept from the old `.slice`, shorter where the sentence after the title is
  // longer: the bet receipt's free-exit terms, the one-sided refund's explanation, the cancellation's reason.)
  const FAMILIES: Array<[string, string[], string]> = [
    ["a settled long-form market's result (the win, the loss, the void refund)", ["notifyWin", "notifyLoss", "notifyRefund"], "70 · 70 · 50"],
    ["an Up & Down round's result (the win, the loss, the void and one-sided refunds)", ["notifyUpDownWin", "notifyUpDownLoss", "notifyUpDownRefund", "notifyUpDownOneSidedRefund"], "70 · 50 · 50"],
    ["a watched market (closing soon, settled)", ["notifyWatchedClosingSoon", "notifyWatchedSettled"], "70 · 50 · 50"],
  ];
  const offIn = (src: string) => FAMILIES.flatMap(([, fns, want]) => fns.filter((f) => roomsOf(f, src) !== want).map((f) => `${f} ${roomsOf(f, src)} ≠ ${want}`));
  const off = offIn(ns);
  ok(`7.2 · ★ each family of notices quotes its market at one room per language — ${FAMILIES.map(([name, , want]) => `${name}: ${want}`).join("; ")} — the win now with its own family`,
    off.length === 0, off.join(" | "));
  const plantedLoss = safely(() => swap(ns, "${clipQuote(opts.marketTitle.sw, 70)} · Upande wako haukushinda.", "${clipQuote(opts.marketTitle.sw, 50)} · Upande wako haukushinda."));
  ok("7.2′ PLANT · a family split — the loss's Swahili cut at 50 while its win and refund cut at 70 — is reported by 7.2",
    plantedLoss !== null && offIn(plantedLoss).some((x) => x.startsWith("notifyLoss")), plantedLoss === null ? "plant failed" : offIn(plantedLoss).join(" | "));
  for (const fn of ["notifyBetPlaced", "notifySelectionClosed", "notifyMarketCancelled", "notifyCashout", "notifyOneSidedRefund"]) console.log(`       ${fn}: ${roomsOf(fn)} (its own sentence)`);
  const longSw = "Je, Simba SC watakuwa juu ya jedwali la NBC Premier League ifikapo raundi ya 20 ya msimu wa 2026-27?";
  const now = `${clipQuote(longSw, 70)} kimelipa. Bonyeza kuona.`, before = `${longSw} kimelipa. Bonyeza kuona.`;
  ok(`7.3 · the news comes before the push is cut: "kimelipa" at character ${now.indexOf("kimelipa")} (round 5: ${before.indexOf("kimelipa")}, after the whole question)`,
    now.indexOf("kimelipa") <= 72 && before.indexOf("kimelipa") > 100 && now.includes("…"));
}

/* ══ the end ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
console.log(`\nvisual-pass-r6b: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
