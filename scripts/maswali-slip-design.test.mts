/**
 * THE SLIP'S DESIGN PASS (MASWALI-BUILD S5-DESIGN-SLIP; Ali 2026-10-21: "if you think anything regarding design, animations, or
 * progress of the Maswali game is not 10/10 … move it to 10/10") — each finding of the slip critic and the motion critic's
 * slip items held by a case that reads the RENDERED value, beside a plant that proves the case can fail.
 *
 *   npx tsx scripts/maswali-slip-design.test.mts        (npm run test:maswali-slip-design)
 *
 *   §1 THE KIT'S HAND-OFF OPTIONS ARE INERT UNLESS ASKED FOR — Modal (`handoff`, `panelDelay`), ConfirmModal
 *      (`panelClassName`, `handoff`, `panelDelay`) and OperationResultModal (`handoff`, `panelDelay`): for every caller that
 *      passes none of them, the markup is BYTE-IDENTICAL to the components at the lane's base (cdb4bf46e) — open and
 *      leaving, in sw, en and zh — rendered from the base blobs and the working tree alike, with the same two mechanical
 *      substitutions on both sides (the portal drawn in place, the mount answered: a server renderer reaches neither) and
 *      the leaving phase forced the same way. Asked for, they change exactly what they name. A plant that makes either
 *      unconditional breaks the parity.
 *   §2 the meter (H1) · §3 the slip's rows, rail and panel (M1, M2, M7, M8, H3, H6, M1-panel, LOW: rule once, phone facts) ·
 *   §4 the closing pill seeded from the server (motion M8) · §5 the confirm sheet (H5, H6, M3, M4, M5, M6, L4, M9 caret,
 *   EAT, the en buy words) · §6 the deposit offer from the shortfall plan (H4) · §7 the ghost (M13, motion M6) ·
 *   §8 the decided words in three languages (the lead's rulings: the en buy words; zh ordinals unspaced) · §9 the batch
 *   stamp's dwell lives in `feedback-timing.ts`.
 *   ROUND 2: §11 the composer's pills (ruling (a)) · §12 the stamp's note of each free cancel for the ticket's drawing, and
 *   TICKETS' cancel confirm handing its dim to its result.
 * ⛔ It READS, compiles and renders in memory; it writes nothing.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import NodeModule from "node:module";
import ts from "typescript";
import { dict } from "../src/lib/i18n-dict.ts";
import { fill } from "../src/lib/utils.ts";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
const raw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const code = (rel: string) => decomment(raw(rel));
const j = (v: unknown) => JSON.stringify(v);
const LOCALES = ["sw", "en", "zh"] as const;
type L3 = (typeof LOCALES)[number];
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s}`);

const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: L3; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (l: L3, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: "/" }, h(I18nProvider as never, { initial: l } as never, el as never))));
const textOf = (m: string) => m.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/* ══ §1 · THE KIT'S HAND-OFF OPTIONS, INERT UNLESS ASKED FOR ══════════════════════════════════════════════════════════════ */
section("§1 · Modal, ConfirmModal and OperationResultModal render byte-identically for every caller that asks for none of the new options");
const BASE = "cdb4bf46e";
const MODAL = "src/components/ui/modal.tsx", ORM = "src/components/markets/operation-result-modal.tsx";
const atBase = (rel: string) => execFileSync("git", ["show", `${BASE}:${rel}`], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n");
/** The two substitutions a server renderer needs to draw a dialog — its portal in place, its mount answered — and the third
 *  that forces the leaving phase on a flag. Applied to BOTH sides alike, each found exactly once (else the premise fails). */
const RENDERABLE: Array<[string, string]> = [
  ['import { createPortal } from "react-dom";', "const createPortal = (node: unknown, _target?: unknown) => node;"],
  ["    document.body,\n  );", "    null,\n  );"],
  ["const [mounted, setMounted] = React.useState(false);", "const [mounted, setMounted] = React.useState(true);"],
  ['const { present, exiting } = useExitPhase(open, "--t-quick");',
    'const { present, exiting } = (globalThis as { __forceExit?: boolean }).__forceExit ? { present: true, exiting: true } : useExitPhase(open, "--t-quick");'],
];
const renderable = (src: string, label: string) => {
  let out = src;
  for (const [from, to] of RENDERABLE) {
    const n = out.split(from).length - 1;
    if (n !== 1) throw new Error(`PREMISE ABSENT — ${label}: "${from.slice(0, 50)}…" found ${n} times`);
    out = out.replace(from, to);
  }
  return out;
};
const compileAt = (rel: string, source: string, deps: Record<string, unknown> = {}) => {
  const path = join(ROOT, rel);
  const out = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const live = req.resolve(`../${rel}`);
  const m = new NodeModule(live) as NodeModule & { _compile(s: string, f: string): void };
  m.filename = live;
  m.paths = (NodeModule as unknown as { _nodeModulePaths(d: string): string[] })._nodeModulePaths(dirname(live));
  const own = m.require.bind(m);
  m.require = ((id: string) => (id in deps ? deps[id] : own(id))) as NodeJS.Require;
  m._compile(out, live);
  return m.exports as Record<string, unknown>;
};
const baseModal = compileAt(MODAL, renderable(atBase(MODAL), "base modal"));
const nowModalSrc = renderable(raw(MODAL), "working-tree modal");
const nowModal = compileAt(MODAL, nowModalSrc);
const forceExit = (on: boolean) => { (globalThis as { __forceExit?: boolean }).__forceExit = on; };
const draw = (component: unknown, l: L3, props: Record<string, unknown>, leaving = false) => {
  forceExit(leaving);
  try { return inApp(l, h(component as never, props as never)); } finally { forceExit(false); }
};
const body = h("p", null, "Body");
const MODAL_CASES: Array<[string, Record<string, unknown>]> = [
  ["a centred dialog", { ariaLabel: "A", children: body }],
  ["its ✕ withheld, a panel class", { ariaLabel: "A", showClose: false, panelClassName: "kp-wsheet extra", children: body }],
  ["an alert dialog, described, busy", { ariaLabel: "A", role: "alertdialog", describedBy: "d1", ariaBusy: true, children: body }],
  ["a sheet", { ariaLabel: "A", sheet: true, children: body }],
  ["a sheet kept to 1023px", { ariaLabel: "A", sheet: true, sheetUntil: "lg", maxWidth: 480, children: body }],
  ["anchored under its chip", { ariaLabel: "A", sheet: true, sheetUntil: "lg", anchorRef: { current: null }, children: body }],
  ["labelled by its heading, above the toasts, must decide", { labelledBy: "h1", zIndex: 1700, closeOnScrim: false, closeOnEsc: false, refocusKey: 2, children: body }],
];
const CONFIRM_CASES: Array<[string, Record<string, unknown>]> = [
  ["medium claret", { title: "Settle YES now?", body: "Body" }],
  ["brand lg with its glyph and labels", { tone: "brand", size: "lg", icon: h("span", null, "i"), eyebrow: "E", confirmLabel: "Yes", cancelLabel: "No" }],
  ["the hard tier", { title: "Seal?", body: "Body", tier: "hard", typedWord: "SEAL" }],
  ["a count gate", { title: "Send?", body: "Body", tier: "hard", typedWord: "2981", typedInputMode: "numeric" }],
  ["in flight", { title: "Send?", body: "Body", loading: true }],
  ["held, re-armed", { title: "Send?", body: "Body", confirmHeld: true, armKey: 3, maxWidth: 440 }],
];
const parity = (A: unknown, B: unknown, cases: Array<[string, Record<string, unknown>]>, base: Record<string, unknown>) =>
  LOCALES.flatMap((l) => cases.flatMap(([name, p]) => [false, true].flatMap((leaving) => {
    const props = { open: !leaving, onClose() {}, onConfirm() {}, title: "T", body: "B", ...base, ...p };
    const a = draw(A, l, props, leaving), b = draw(B, l, props, leaving);
    return a === b ? [] : [`${l}/${name}${leaving ? " (leaving)" : ""}: first differing byte ${[...a].findIndex((ch, i) => ch !== b[i])}`];
  })));
{
  const m = parity(baseModal.Modal, nowModal.Modal, MODAL_CASES, {});
  ok(`1.1 · Modal: ${MODAL_CASES.length} callers' props × open and leaving × sw/en/zh render byte-identically to the base when neither \`handoff\` nor \`panelDelay\` is passed`,
    m.length === 0, j(m));
  const c = parity(baseModal.ConfirmModal, nowModal.ConfirmModal, CONFIRM_CASES, {});
  ok(`1.2 · ConfirmModal: ${CONFIRM_CASES.length} callers' props × open and leaving × sw/en/zh render byte-identically when \`panelClassName\`, \`handoff\` and \`panelDelay\` are not passed`,
    c.length === 0, j(c));
  const open = draw(nowModal.Modal, "en", { open: true, onClose() {}, ariaLabel: "A", children: body });
  const held = draw(nowModal.Modal, "en", { open: true, onClose() {}, ariaLabel: "A", handoff: true, children: body });
  const late = draw(nowModal.Modal, "en", { open: true, onClose() {}, ariaLabel: "A", panelDelay: true, children: body });
  const scrimOf = (mk: string) => /<button[^>]*tabindex="-1"[^>]*class="([^"]*)"[^>]*>/.exec(mk)?.[0] ?? "";
  ok("1.3 · asked for, `handoff` holds the dim from the first frame: the scrim wears no `.m-scrim` fade, keeps the blur, and nothing else of the dialog moves",
    scrimOf(open).includes("m-scrim ") && !scrimOf(held).includes("m-scrim") && scrimOf(held).includes("backdrop-filter:blur(var(--m-blur-behind))")
      && held.replace(scrimOf(held), "") === open.replace(scrimOf(open), ""), j({ open: scrimOf(open), held: scrimOf(held) }));
  ok("1.4 · asked for, `panelDelay` makes the panel's entrance wait `--t-quick` — the clamps zero `animation-delay` — and changes nothing else",
    late.includes("animation-delay:var(--t-quick)") && !open.includes("animation-delay") && late.replace(";animation-delay:var(--t-quick)", "") === open, "");
  const zh = draw(nowModal.ConfirmModal, "en", { open: true, onClose() {}, onConfirm() {}, title: "T", body: "B", panelClassName: "kp-mln-zh" });
  ok("1.5 · asked for, ConfirmModal's `panelClassName` lands on the panel itself (a portalled dialog carries Millionea's Chinese rule)",
    /data-rung="modal"[^>]*class="[^"]* kp-mln-zh"/.test(zh), /data-rung="modal"[^>]*class="([^"]*)"/.exec(zh)?.[1] ?? "");
  // The result modal, each side on its own Modal: base result over the base Modal, the tree's over the tree's.
  const baseResult = compileAt(ORM, atBase(ORM), { "@/components/ui/modal": baseModal }).OperationResultModal;
  const nowResult = compileAt(ORM, raw(ORM), { "@/components/ui/modal": nowModal }).OperationResultModal;
  const RESULT_CASES: Array<[string, Record<string, unknown>]> = [
    ["poll bet", { variant: "success", stripTone: "yes", eyebrow: "Bet placed", title: "YES · TZS 1,000", subtitle: "Your pick is in", primaryLabel: "Keep predicting", secondaryLabel: "View positions" }],
    ["Up & Down receipt", { variant: "success", stripTone: "no", title: "CHINI · TZS 1,000", compactOnPhone: true, details: [{ label: "Stake", value: "TZS 1,000" }] }],
    ["Up & Down refusal", { variant: "danger", eyebrow: "Could not place", title: "Balance too low", subtitle: "Add TZS 500 to continue", primaryLabel: "Close" }],
    ["sell result", { variant: "success", stripTone: "gold", title: "TZS 9,000 returned", details: [{ label: "Ticket", value: "pos_1" }, { label: "Fee", value: "TZS 100", tone: "bad" }], footnote: "Receipt in history" }],
    ["wallet result", { variant: "neutral", title: "Deposit reversed", details: [{ label: "Reference", value: "txn_123456789" }], footnote: "See wallet history" }],
    ["admin success", { variant: "success", eyebrow: "Done", title: "Saved", autoCloseMs: 2_000 }],
    ["agent application", { variant: "warning", title: "More information needed", subtitle: "Check the document", primaryLabel: "Review" }],
    ["a Millionea stamp without the hand-off", { variant: "success", stamp: true, titleFace: "mono", className: "kp-mln-zh", title: "MLN-2026-W49-000041", details: [{ label: "Price", value: "TZS 1,000" }] }],
  ];
  const r = parity(baseResult, nowResult, RESULT_CASES, { variant: "success" });
  ok(`1.6 · OperationResultModal on its own Modal: ${RESULT_CASES.length} callers' props × open and leaving × sw/en/zh render byte-identically to the base when neither \`handoff\` nor \`panelDelay\` is passed (the reduced-motion strip rule draws nothing: it is the strip's rAF loop alone, held in §1.8)`,
    r.length === 0, j(r));
  // PLANTS: an always-on hand-off, or an always-late panel, breaks the parity of every caller.
  const plantedHeld = compileAt(MODAL, nowModalSrc.replace('dimHeld ? "" : "m-scrim "', '""'));
  const plantedLate = compileAt(MODAL, nowModalSrc.replace('...(panelDelay && !exiting ? { animationDelay: "var(--t-quick)" } : null),', '...({ animationDelay: "var(--t-quick)" }),'));
  ok("1.1′ PLANT · a hand-off that holds every dialog's dim, and a panel that always waits, each break the parity",
    parity(baseModal.Modal, plantedHeld.Modal, MODAL_CASES.slice(0, 1), {}).length > 0 && parity(baseModal.Modal, plantedLate.Modal, MODAL_CASES.slice(0, 1), {}).length > 0);
  // The strip rule's code: both its branches read the one still-flag, and without a clamp it computes exactly the old figure.
  const ormSrc = code(ORM);
  ok("1.7 · the strip's two ticks — running and held — both read `still`: under a clamp the strip holds full (scaleX 1), otherwise the old figure, unchanged",
    ormSrc.includes("const still = stripStill();")
      && ormSrc.includes("stripRef.current.style.transform = `scaleX(${still ? 1 : Math.max(0, Math.min(1, banked / closeMs))})`;")
      && ormSrc.includes("const pct = still ? 1 : Math.max(0, Math.min(1, remaining / closeMs));"));
  const gates = /function stripStill\(\): boolean \{([\s\S]*?)\n\}/.exec(ormSrc)?.[1] ?? "";
  ok("1.8 · …and the still-flag reads the three gates of §M6 (the OS preference, the in-app switch, the `minimal` tier) — never the `reduced` throttle",
    gates.includes('"(prefers-reduced-motion: reduce)"') && gates.includes('classList.contains("kp-reduce-motion")') && gates.includes('getAttribute("data-motion") === "minimal"') && !gates.includes('"reduced"'));
  // Round 2 (the lead's ruling): the primary as the kit's Link (`primaryHref`). Omitted, 1.6 holds every caller byte for byte;
  // asked for, the primary — and only it — is drawn as a link to the address, with the button's own classes and label.
  const STAMP = { open: true, onClose() {}, variant: "success", stamp: true, title: "MLN-2026-W49-000041", primaryLabel: "View ticket" };
  const HREF = "/millionea/tickets/MLN-2026-W49-000041";
  const asLink = draw(nowResult, "en", { ...STAMP, primaryHref: HREF }), asButton = draw(nowResult, "en", STAMP);
  const primaryOf = (m: string) => /<div class="orm-actions[^"]*">(<(a|button)\b[^>]*>[^<]*<\/(?:a|button)>)/.exec(m);
  const classOf = (tag: string) => /class="([^"]*)"/.exec(tag)?.[1] ?? "";
  const pl = primaryOf(asLink), pb = primaryOf(asButton);
  ok("1.11 · asked for, `primaryHref` draws the primary — and only it — as the kit's Link to that address, with the button's own classes and label; the rest of the result is byte for byte the same",
    !!pl && !!pb && pl[2] === "a" && pb[2] === "button" && classOf(pl[1]) === classOf(pb[1]) && pl[1].includes(`href="${HREF}"`) && pl[1].endsWith(">View ticket</a>")
      && asLink.replace(pl[1], "") === asButton.replace(pb[1], ""), j({ link: pl?.[1], button: pb?.[1] }));
  // PLANT: the Link drawn for every caller (the option no longer asked for) breaks the parity of each.
  const alwaysLink = compileAt(ORM, raw(ORM).replace("{primaryHref ? (", "{true ? (").replace("href={primaryHref as never}", 'href={(primaryHref ?? "/") as never}'),
    { "@/components/ui/modal": nowModal }).OperationResultModal;
  ok("1.11′ PLANT · a primary drawn as a link for every caller (asked for or not) breaks the parity",
    raw(ORM).includes("{primaryHref ? (") && parity(baseResult, alwaysLink, RESULT_CASES.slice(0, 1), { variant: "success" }).length > 0);
}
// Round 2 (the lead's ruling (a)): the kit Tabs gains an option's own accessible name, `TabItem.ariaLabel`. Omitted, every
// current caller's markup is the round-2 base's (7e9a314f0), byte for byte: line, segmented and pill, buttons and links,
// with a glyph, a count and Millionea's ink.
const R2_BASE = "7e9a314f0", TABS = "src/components/ui/tabs.tsx";
const atR2Base = (rel: string) => execFileSync("git", ["show", `${R2_BASE}:${rel}`], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n");
const baseTabs = compileAt(TABS, atR2Base(TABS)).Tabs;
const nowTabsSrc = raw(TABS);
const nowTabs = compileAt(TABS, nowTabsSrc).Tabs;
const tabsOf = (...labels: string[]) => labels.map((labelEn, i) => ({ value: String(i), labelEn }));
const TAB_CASES: Array<[string, Record<string, unknown>]> = [
  ["a section rail of buttons, a count", { tabs: [{ value: "a", labelEn: "Alpha" }, { value: "b", labelEn: "Beta", count: 3 }], value: "a", onChange() {}, ariaLabel: "Sections" }],
  ["a section rail of links, a glyph", { tabs: [{ value: "a", labelEn: "Alpha", href: "/a" }, { value: "b", labelEn: "Beta", href: "/b", glyph: h("svg", { "aria-hidden": "true" }) }], value: "b", ariaLabel: "Pages" }],
  ["segmented", { variant: "segmented", tabs: tabsOf("Day", "Week", "Month"), value: "1", onChange() {}, ariaLabel: "Range" }],
  ["pills of buttons", { variant: "pill", tabs: tabsOf("Ticket 1 · 15/15", "Ticket 2 · 7/15"), value: "0", onChange() {}, ariaLabel: "Tickets" }],
  ["pills of links, Millionea's ink", { variant: "pill", tabs: [{ value: "m", labelEn: "Millionea", href: "/millionea/tickets", ink: "millionea" }, { value: "p", labelEn: "Markets", href: "/positions" }], value: "m", ariaLabel: "Kinds" }],
];
{
  const diffs = LOCALES.flatMap((l) => TAB_CASES.flatMap(([name, p]) => {
    const a = inApp(l, h(baseTabs as never, p as never)), b = inApp(l, h(nowTabs as never, p as never));
    return a === b ? [] : [`${l}/${name}: first differing byte ${[...a].findIndex((ch, i) => ch !== b[i])}`];
  }));
  ok(`1.9 · round 2 · the kit Tabs: ${TAB_CASES.length} callers' shapes × sw/en/zh render byte-identically to ${R2_BASE} when \`ariaLabel\` is not passed`, diffs.length === 0, j(diffs));
  const named = inApp("en", h(nowTabs as never, { variant: "pill", tabs: [{ value: "0", labelEn: "1 · 15/15", ariaLabel: "Ticket 1 · 15/15" }], value: "0", onChange() {}, ariaLabel: "Tickets" } as never));
  ok("1.10 · …and passed, it names the option and nothing else moves (the label still drawn)",
    named.includes('aria-pressed="true" aria-label="Ticket 1 · 15/15"') && textOf(named) === "1 · 15/15", named.slice(0, 240));
  const always = compileAt(TABS, nowTabsSrc.replace('aria-pressed={active} aria-label={item.ariaLabel}', 'aria-pressed={active} aria-label={item.ariaLabel ?? item.labelEn}')).Tabs;
  ok("1.9′ PLANT · a name written for every caller (`?? labelEn`) breaks the parity",
    inApp("en", h(baseTabs as never, TAB_CASES[0][1] as never)) !== inApp("en", h(always as never, TAB_CASES[0][1] as never)));
}

/* ══ §2 · THE METER (H1) ════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§2 · the meter: an empty step hollow, a done step solid, filled on the control's beat");
const css = raw("src/app/globals.css");
const lumOf = (token: string): number => {
  const alias = new RegExp(`${token.replace(/[-]/g, "\\-")}:\\s*var\\((--[a-z0-9-]+)\\)`).exec(css);
  if (alias) return lumOf(alias[1]);
  const m = new RegExp(`${token.replace(/[-]/g, "\\-")}:\\s*oklch\\(([0-9.]+)% ([0-9.]+) ([0-9.]+)\\)`).exec(css);
  if (!m) return Number.NaN;
  const [L, C, H] = [Number(m[1]) / 100, Number(m[2]), (Number(m[3]) * Math.PI) / 180];
  const a = C * Math.cos(H), b = C * Math.sin(H);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const rgb = [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_]
    .map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
const contrast = (a: string, b: string) => { const [x, y] = [lumOf(a), lumOf(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
{
  const { SteppedProgress } = req("../src/components/markets/stepped-progress.tsx") as { SteppedProgress: (p: Record<string, unknown>) => unknown };
  const meter = renderToStaticMarkup(h(SteppedProgress as never, { groups: [{ steps: 10, done: 3 }, { steps: 5, done: 0 }] } as never));
  const steps = [...meter.matchAll(/<span( data-done="")? class="([^"]+)" style="([^"]+)"><\/span>/g)].map((m) => ({ done: !!m[1], cls: m[2], style: m[3] }));
  const done = steps.filter((s) => s.done), empty = steps.filter((s) => !s.done);
  ok(`2.1 · 15 steps drawn, 3 done: each done step SOLID --royal-400, each of the 12 empty ones a HOLLOW well (--bg-sunken inside a 1px --border-control ring), 6px tall`,
    steps.length === 15 && done.length === 3 && done.every((s) => s.style.includes("background:var(--royal-400)") && s.style.includes("inset 0 0 0 1px var(--royal-400)"))
      && empty.every((s) => s.style.includes("background:var(--bg-sunken)") && s.style.includes("box-shadow:inset 0 0 0 1px var(--border-control)"))
      && steps.every((s) => s.cls.split(" ").includes("h-[6px]")), j(steps.slice(2, 4)));
  ok(`2.2 · the empty step's ring is seen on the rail (--border-control ${contrast("--border-control", "--panel").toFixed(2)}:1 on --panel, the 3:1 a non-text mark needs) and its well is darker than the rail (${contrast("--bg-sunken", "--panel").toFixed(2)}:1), so 0/15 reads as empty`,
    contrast("--border-control", "--panel") >= 3 && contrast("--bg-sunken", "--panel") < 1.2 && lumOf("--bg-sunken") < lumOf("--panel"));
  ok("2.3 · a step fills over the control's own beat — `--t-quick`, linear — so the pick's fill and its step land together (motion M1)",
    steps.every((s) => s.style.includes("transition:background var(--t-quick) linear, box-shadow var(--t-quick) linear")));
  ok("2.3′ CONTROL · VIS-P's solid empty step (--border-strong) stood under 2.4:1 from done — the read the critic made",
    contrast("--royal-400", "--border-strong") < 2.4);
}

/* ══ §3 · THE SLIP ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§3 · the slip: rows, rail and panel");
// The kit's dialog, drawn in place (the working tree's own, with §1's substitutions), so the confirm renders as received.
{
  const at = req.resolve("../src/components/ui/modal.tsx");
  const stub = new NodeModule(at) as NodeModule & { loaded: boolean };
  stub.filename = at; stub.loaded = true;
  stub.exports = nowModal;
  (req.cache as Record<string, unknown>)[at] = stub;
}
const SLIP = req("../src/components/maswali/maswali-slip.tsx") as Record<string, (p: Record<string, unknown>) => unknown> & {
  slipProgress: (p: ReadonlyArray<string | null>, qs: unknown[]) => { ready: boolean };
};
type Q = { role: "MAIN" | "RESERVE"; ordinal: number; category: string; text: string; source: string; eventAt: number | null };
const EVENT = Date.parse("2026-12-05T06:00:00.000Z"), CLOSE = Date.parse("2026-12-04T15:00:00.000Z"), NOW = Date.parse("2026-12-01T09:00:00.000Z");
const QS: Q[] = Array.from({ length: 15 }, (_, i) => ({
  role: i < 10 ? "MAIN" : "RESERVE", ordinal: i < 10 ? i + 1 : i - 9, category: "Sports", text: `Will event ${i + 1} happen?`, source: "www.nbc.co.tz", eventAt: EVENT + i * 3_600_000,
}));
const picksWith = (n: number): Array<"YES" | "NO" | null> => Array.from({ length: 15 }, (_, i) => (i < n ? (i % 2 ? "NO" : "YES") : null));
const slipOf = (l: L3, p: Record<string, unknown> = {}) => inApp(l, h(SLIP.MaswaliSlip as never, {
  week: 49, questions: QS, picks: picksWith(0), onPick() {}, closesAt: CLOSE, firstEventAt: EVENT, serverNow: NOW, price: 1_000, cap: 10, ticketNumber: 1,
  refused: false, onRefuse() {}, onContinue() {}, followHref: "/millionea", ...p,
} as never));
const payOf = (m: string) => [...m.matchAll(/<button[^>]*data-testid="millionea-slip-pay"[^>]*>([\s\S]*?)<\/button>/g)].map((x) => ({ tag: x[0].slice(0, x[0].indexOf(">") + 1), text: textOf(x[1]) }));
{
  const fresh = slipOf("en"), some = slipOf("en", { picks: picksWith(12) }), all = slipOf("en", { picks: picksWith(15) });
  const finish = slipOf("en", { picks: picksWith(15), finish: { label: fill(dict.en.millionea.finishTicketN, { n: 2 }), onPress() {} } });
  ok("3.1 · M8 · the pay control counts down: \"Answer all 15\" untouched, \"Answer 3 more\" at 12, \"Continue · TZS 1,000\" armed at 15 — rail and panel alike",
    payOf(fresh).every((b) => b.text === "Answer all 15") && payOf(some).every((b) => b.text === "Answer 3 more")
      && payOf(all).every((b) => b.text === "Continue · TZS 1,000" && b.tag.includes('data-armed="true"')) && payOf(all).length === 2,
    j([payOf(fresh), payOf(some), payOf(all)].map((x) => x.map((b) => b.text))));
  ok("3.2 · H3 · another ticket incomplete: the control reads \"Finish ticket 2\" and is NOT armed (a ghost), though this ticket is complete",
    payOf(finish).every((b) => b.text === "Finish ticket 2" && !b.tag.includes("data-armed") && b.tag.includes("btn-ghost")), j(payOf(finish)));
  ok("3.2′ CONTROL · …while with every ticket answered the same control is the brand primary", payOf(all).every((b) => b.tag.includes("btn-primary")));
  const refused = slipOf("en", { picks: picksWith(12), refused: true });
  const flagged = [...refused.matchAll(/<li id="q-([^"]+)" data-flagged="true"/g)].map((m) => m[1]);
  const lines = [...refused.matchAll(/data-testid="millionea-slip-refusal">([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
  ok("3.3 · M2 · refused: the unanswered rows are marked IN THEIR EYEBROW (\"Sports · Unanswered\" — a row never changes height) and ONE line above each pay control says which",
    j(flagged) === j(["A3", "A4", "A5"]) && (textOf(refused).match(/Unanswered/g) ?? []).length === 3
      && lines.length === 2 && lines.every((l) => l === "3 questions unanswered: numbers A3, A4, and A5." || l === "3 questions unanswered: numbers A3, A4 and A5."), j({ flagged, lines }));
  ok("3.3′ CONTROL · not refused: no row is marked and no line is drawn", !slipOf("en", { picks: picksWith(12) }).includes("data-flagged") && !slipOf("en", { picks: picksWith(12) }).includes("millionea-slip-refusal"));
  const rows = [...fresh.matchAll(/<div role="radiogroup"[\s\S]*?<\/div>/g)].map((m) => m[0]);
  const lit = slipOf("en", { picks: picksWith(1) });
  const firstGroup = /<div role="radiogroup"[\s\S]*?<\/div>/.exec(lit)?.[0] ?? "";
  ok("3.4 · M1 · both answers hold the check's slot from the first frame (drawn `invisible` until lit) and both wear the lit side's type (`.kp-mln-answer`): a pick changes the ink, never the word's place",
    rows.length === 15 && rows.every((g) => (g.match(/<svg/g) ?? []).length === 2 && (g.match(/invisible/g) ?? []).length === 2 && (g.match(/kp-mln-answer/g) ?? []).length === 2)
      && (firstGroup.match(/invisible/g) ?? []).length === 1, j(rows[0]?.slice(0, 300)));
  ok("3.5 · LOW · every row's source and event are the phone layout's facts (one per line below 768): no row in one line and the next in two",
    (fresh.match(/kp-mln-facts kp-mln-facts--phone/g) ?? []).length === 15);
  const en = dict.en.millionea;
  ok("3.6 · M7 · the price is said before any answer, at every width: the rules' first line reads \"TZS 1,000 a ticket · main balance only\"",
    textOf(fresh).includes("TZS 1,000 a ticket · main balance only") && !textOf(fresh).includes("Main balance only"));
  const priceItem = /<li class="([^"]*)"><span aria-hidden="true" class="([^"]*)">·<\/span><span class="min-w-0">(?:(?!<\/li>)[\s\S])*?a ticket/.exec(fresh);
  ok("3.6′ · from 1280 the price stands in the rules box alone (the cap is the panel's there), and a list of one draws no marker: no lone \"·\" before it (tiles empty-*-1280)",
    !!priceItem && priceItem[1].includes("xl:grid-cols-1") && priceItem[2].split(" ").includes("xl:hidden"), j(priceItem?.slice(1, 3)));
  ok("3.7 · LOW · the reserves' rule is said ONCE, in the reserves' own head (it stood in the rules box too)",
    textOf(fresh).split(en.reserveRule).length - 1 === 1);
  ok("3.8 · M1 (panel) · the 1280 panel stands under the top bar (`top-[72px]`: the bar's 56 and the market aside's 16)",
    /<aside class="[^"]*sticky top-\[72px\][^"]*xl:flex"/.test(fresh));
  ok("3.9 · LOW · the head's times carry their zone: \"Sales close: Friday 18:00 EAT\", \"First event: Saturday 09:00 EAT\"",
    textOf(fresh).includes("Sales close: Friday 18:00 EAT") && textOf(fresh).includes("First event: Saturday 09:00 EAT"));
  const closed = slipOf("en", { picks: picksWith(7), closed: true });
  const closedSlot = [...closed.matchAll(/data-testid="millionea-slip-closed">([\s\S]*?)<\/a>/g)].map((m) => m[1]);
  ok("3.10 · H6 · closed: the pay control's place (rail and panel) holds the closed statement — \"Sales closed · Friday 18:00 EAT\" — with its way on, \"Follow the results\" to the hub; no pay control; every answer rests",
    closedSlot.length === 2 && closedSlot.every((s) => textOf(s).includes("Sales closed · Friday 18:00 EAT") && s.includes('href="/millionea"') && textOf(s).includes("Follow the results"))
      && payOf(closed).length === 0 && [...closed.matchAll(/<button[^>]*>/g)].map((x) => x[0]).filter((b) => b.includes('role="radio"')).filter((b) => b.includes('disabled=""')).length === 30,
    j(closedSlot.map((s) => textOf(s))));
  // The statement's flex basis is a WIDTH only where it shares a row with its way on (the rail); in the panel's column a
  // basis is a HEIGHT — 14rem stood between "Sales closed" and "Follow the results" (the motion run's close-rest-en-1280).
  const statementOf = (s: string) => /<p class="([^"]*)">/.exec(s)?.[1] ?? "";
  ok("3.10′ · …the panel's statement is a line of its own (no basis in its column); the rail's shares its row with the way on",
    closedSlot.length === 2 && !statementOf(closedSlot[0]).includes("basis-") && statementOf(closedSlot[1]).includes("basis-[14rem]"),
    j(closedSlot.map(statementOf)));
  const tail = fresh.slice(fresh.indexOf('data-testid="millionea-slip-live"'));
  ok("3.11 · M2 · no refusal box at the list's end any more (the kit Callout moved the rows and the control when it came and went)",
    !/role="note"/.test(tail.slice(0, tail.indexOf("</aside>"))));
  ok("3.12 · H3 · the counts lead with the ticket being answered when the purchase holds several",
    textOf(slipOf("en", { picks: picksWith(3), ticketName: "Ticket 2" })).includes("Ticket 2 · Main 3/10 · Reserve 0/5"));
}

/* ══ §4 · THE CLOSING PILL, SEEDED ═══════════════════════════════════════════════════════════════════════════════════════════ */
section("§4 · the closing pill is drawn by the server's own render (no pop-in after hydration)");
{
  const pill = (closesAt: number) => inApp("en", h(SLIP.MaswaliClosingPill as never, { closesAt, serverNow: NOW, compact: true } as never));
  ok("4.1 · motion M8 · in the last hour the server's own render already holds the pill (\"45 min\", its words for a screen reader) — nothing grows after hydration",
    textOf(pill(NOW + 45 * 60_000)).includes("45") && pill(NOW + 45 * 60_000).includes("closing-pill") && pill(NOW + 45 * 60_000).includes("sr-only"));
  ok("4.2 · …and outside the last hour it draws nothing", pill(NOW + 2 * 3_600_000) === "");
  ok("4.3 · the rail and the panel give it a place in the meter's row from the first frame (`h-5`), so its arrival adds no row",
    (raw("src/components/maswali/maswali-slip.tsx").match(/<div className="flex h-5 items-center gap-2">\n\s*<SteppedProgress groups=\{groups\} className="min-w-0 flex-1" \/>/g) ?? []).length === 2);
}

/* ══ §5 · THE CONFIRM SHEET ══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§5 · the confirm sheet");
{
  const sheet = (l: L3, p: Record<string, unknown> = {}) => inApp(l, h(SLIP.MaswaliSlipConfirm as never, {
    open: true, onClose() {}, week: 49, questions: QS, picks: picksWith(15), total: 1_000, balance: 50_000, ticketNumber: 1, cap: 10,
    closesAt: CLOSE, serverNow: NOW, freeCancelMinutes: 5, pct: 13, onCommit() {}, ...p,
  } as never));
  const m = sheet("en");
  const panel = /data-dock="lg"[^>]*class="([^"]*)"/.exec(m)?.[1] ?? "";
  ok("5.1 · L4 + M3 · the platform's sheet below 1024 (`sheetUntil=\"lg\"`, the bet sheet's and the Wallet's) on the platform sheet's panel, carrying Millionea's Chinese rule",
    m.includes('data-dock-wrap="lg"') && panel.includes("kp-wsheet") && panel.includes("kp-mln-confirm") && panel.includes("kp-mln-zh"), panel);
  const bodyAt = m.indexOf("kp-mln-confirm__body"), footAt = m.indexOf("kp-mln-confirm__foot");
  ok("5.2 · M3 · the bet confirm's column: the picks and facts in a body that scrolls, the money and the two answers pinned in a foot under it",
    bodyAt > 0 && footAt > bodyAt && m.slice(footAt).includes("millionea-confirm-commit") && /max-height: calc\(100dvh - 40px\)/.test(css.slice(css.indexOf(".kp-mln-confirm {"))));
  const commit = /<button[^>]*data-testid="millionea-confirm-commit"[^>]*>/.exec(m)?.[0] ?? "";
  const back = [...m.slice(footAt).matchAll(/<button[^>]*class="([^"]*)"[^>]*>([^<]*)</g)].find((x) => x[2] === "Back")?.[1] ?? "";
  ok("5.3 · M3 + LOW · the commit and its way back are twins (both `btn-lg`), and the way back says \"Back\" — never \"Cancel\" under \"Free cancel until…\"",
    commit.includes("btn-lg") && back.includes("btn-lg") && !textOf(m.slice(footAt)).includes("Cancel"), j({ commit, back }));
  const money = /data-testid="millionea-confirm-money">([\s\S]*?)<\/div><\/div><\/div>/.exec(m)?.[1] ?? "";
  ok("5.4 · M5 · the money is the platform's money-confirm rows (the kit ReceiptBox and ReceiptRow, as the deposit and withdraw confirms): \"Price\" with THE commit figure in bold mono (`amount`), then the main balance's row",
    money.includes("rounded-md border border-border bg-bg-overlay/60 p-3 space-y-1.5") && /<span class="font-mono text-\[16px\] font-bold tabular-nums text-text">TZS 1,000<\/span>/.test(money)
      && textOf(money).startsWith("Price") && textOf(money).includes("Main balance") && textOf(money).includes("TZS 50,000"), textOf(money));
  ok("5.5 · M5 · each pick is in its side's ink (the bet confirm's sideTone.fg): YES --yes-300, NO --no-300",
    (m.match(/color:var\(--yes-300\)/g) ?? []).length === 8 && (m.match(/color:var\(--no-300\)/g) ?? []).length === 7);
  ok("5.6 · M6 · the rule names its subject: \"Jackpot shared equally by every 10/10 ticket · 13% fee at payout\"",
    textOf(m).includes("Jackpot shared equally by every 10/10 ticket · 13% fee at payout"));
  const lines = /<div class="flex flex-col gap-1 border-t border-border pt-2 text-body-sm text-text-muted">([\s\S]*?)<\/div><\/div>/.exec(m)?.[1] ?? "";
  const digits = textOf(lines).match(/\d+(?:[.,:/–-]\d+)*%?/g) ?? [];
  const mono = [...lines.matchAll(/<span class="font-mono tabular-nums">([^<]+)<\/span>/g)].map((x) => x[1]);
  ok("5.7 · M5 · every numeral in the sheet's facts is mono (§T5): \"1\", \"10\", \"10/10\", \"13%\" each in the numeral face",
    digits.length >= 4 && digits.every((d) => mono.includes(d)), j({ digits, mono }));
  ok("5.8 · the English buy words (the lead's ruling): \"Buy ticket · TZS 1,000\"", textOf(commit ? m.slice(m.indexOf(commit)) : "").startsWith("Buy ticket · TZS 1,000"));
  const unknown = sheet("en", { balance: null });
  ok("5.9 · H5 · an unread balance is never TZS 0: the row reads \"—\" and \"Temporarily unavailable\"",
    textOf(unknown).includes("Temporarily unavailable") && !textOf(unknown).includes("TZS 0") && /<span aria-hidden="true">—<\/span><span>Temporarily unavailable<\/span>/.test(unknown));
  const low = sheet("en", { balance: 400, lowBalance: true, deposit: h("button", { "data-testid": "door" }, "Deposit TZS 1,000") });
  ok("5.10 · M4 · a short main balance is the bet sheet's low frame: the kit's info notice with its alert glyph and the journey's title, Millionea's words, and the deposit door in the commit's place",
    low.includes("border-info-border bg-info-bg") && textOf(low).includes("Not enough balance") && textOf(low).includes("Main balance TZS 400 is below TZS 1,000. Bonus money does not count here.")
      && low.includes('data-testid="door"') && !low.includes("millionea-confirm-commit"));
  const shut = sheet("en", { closed: true }), flying = sheet("en", { closed: true, pending: true });
  ok("5.11 · H6 · sales closing while it is open keep it open on its closed frame — \"Sales closed · Friday 18:00 EAT\" and one \"Got it\" — unless the cut is in flight, which the server answers first",
    textOf(shut).includes("Sales closed · Friday 18:00 EAT") && textOf(shut).includes("Got it") && !shut.includes("millionea-confirm-commit")
      && flying.includes("millionea-confirm-commit") && !textOf(flying).includes("Got it"));
  const many = sheet("en", { slips: [picksWith(15), picksWith(15)], total: 2_000 });
  ok("5.12 · M9 · several tickets fold, each under the family caret (`.kp-mln-caret`, turned by the one caret rule's selector list)",
    (many.match(/kp-mln-ticket/g) ?? []).length === 2 && (many.match(/kp-mln-caret/g) ?? []).length === 2
      && css.includes(".kp-menu-caret, .kp-fsheet-caret, .kp-mln-caret { transition: transform var(--t-quick) ease-out; }")
      && css.includes(".kp-mln-ticket[open] > summary .kp-mln-caret { transform: rotate(180deg); }"));
  ok("5.13 · the free cancel, when one is promised, is said with its zone in every language (\"… 14:07 EAT\")",
    LOCALES.every((l) => fill(dict[l].millionea.cancelFreeUntil, { time: "14:07" }).endsWith("14:07 EAT")));
}

/* ══ §6 · THE DEPOSIT OFFER, FROM THE SHORTFALL PLAN (H4) ═══════════════════════════════════════════════════════════════════ */
section("§6 · the short main balance asks the bet sheet's own plan");
{
  const MONEY = req("../src/lib/millionea-slip-money.ts") as {
    slipShortfall: (f: unknown, main: number | null, total: number, now: number) => { kind: string; options?: Array<{ kind: string; amount?: number; chips?: number[]; belowDepositMin?: boolean; leftAfter?: number }>; depositRefusal?: string } | null;
    slipFallbackDeposit: (main: number | null, total: number) => number;
  };
  const { DEPOSIT_MIN_TZS } = req("../src/lib/server/validators.ts") as { DEPOSIT_MIN_TZS: number };
  const facts = (over: Record<string, unknown> = {}) => ({
    walletStatus: "ACTIVE", pendingDeposit: null,
    deposit: { limits: { daily: null, weekly: null, monthly: null }, usage: { day: 0, week: 0, month: 0 }, sof: { accepted: false, singleTxn: 5_000_000, rolling30d: 20_000_000 }, railsOpen: true, railNames: ["M-Pesa"] },
    ...over,
  });
  const p = MONEY.slipShortfall(facts(), 400, 1_000, NOW);
  const dep = p?.options?.find((o) => o.kind === "deposit");
  ok(`6.1 · H4 · a main balance of TZS 400 for a TZS 1,000 ticket is offered the minimum deposit, TZS ${DEPOSIT_MIN_TZS.toLocaleString("en")} (never the raw TZS 600 the deposit refuses), with its ladder and the minimum's note`,
    p?.kind === "short" && dep?.amount === Math.max(600, DEPOSIT_MIN_TZS) && dep?.belowDepositMin === true && j(dep?.chips) === j([1_000, 5_000, 10_000]) && dep?.leftAfter === 400, j(p));
  ok("6.2 · H4 · a deposit still on its way: no second offer, the pending deposit instead",
    MONEY.slipShortfall(facts({ pendingDeposit: { amount: 2_000, txnId: "txn_1", createdAt: null } }), 400, 1_000, NOW)?.kind === "pending");
  const paused = MONEY.slipShortfall(facts({ deposit: { ...facts().deposit, railsOpen: false, railNames: [] } }), 400, 1_000, NOW);
  ok("6.3 · H4 · every rail paused: no deposit offered, and why", paused?.kind === "short" && !paused.options?.some((o) => o.kind === "deposit") && paused.depositRefusal === "rails_paused");
  const capped = MONEY.slipShortfall(facts({ deposit: { ...facts().deposit, limits: { daily: 4_000, weekly: null, monthly: null } } }), 400, 1_000, NOW)?.options?.find((o) => o.kind === "deposit");
  ok("6.4 · H4 · the chips stop at the player's own deposit limit (TZS 4,000 a day: 1,000 alone)", j(capped?.chips) === j([1_000]), j(capped));
  ok("6.5 · H5 · unknown is not zero: no facts or no balance, no plan; the door then keeps only the minimum (or the whole total when the balance is unknown)",
    MONEY.slipShortfall(null, 400, 1_000, NOW) === null && MONEY.slipShortfall(facts(), null, 1_000, NOW) === null
      && MONEY.slipFallbackDeposit(400, 1_000) === DEPOSIT_MIN_TZS && MONEY.slipFallbackDeposit(null, 2_000) === 2_000);
  ok("6.6 · MR-10 · bonus money never buys a ticket: the plan is asked with a bonus of nothing",
    code("src/lib/millionea-slip-money.ts").includes("wallet: { status: facts.walletStatus, balance: main, bonusBalance: 0 },"));
  const client = code("src/app/millionea/slip/slip-client.tsx");
  ok("6.7 · H4 · the door goes where the bet sheet's goes, tagged as a low-balance deposit, the progress bar first (§F10)",
    client.includes('`/wallet/deposit?${new URLSearchParams({ amount: String(amount), from: "low-balance" })}`') && client.includes('window.dispatchEvent(new Event("50pick:navigating"));'));
  ok("6.1′ CONTROL · the raw shortfall the old door offered is under the minimum the deposit takes", 600 < DEPOSIT_MIN_TZS);
}

/* ══ §7 · THE GHOST ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§7 · the loading ghost draws the page it stands for");
{
  const { MillioneaSlipGhost } = req("../src/app/millionea/slip/slip-ghost.tsx") as { MillioneaSlipGhost: () => unknown };
  const g = inApp("sw", h(MillioneaSlipGhost as never));
  ok("7.1 · M13 + motion M6 · the ghost draws the rail below 1280 (docked where the page's docks), the panel under the top bar from 1280, and controls on the controls' radius — never pills",
    g.includes("kp-mln-rail sticky bottom-[calc(65px+env(safe-area-inset-bottom,0px))]") && /sticky top-\[72px\][^"]*xl:block/.test(g)
      && (g.match(/h-\[var\(--h-control-md\)\][^"]*rounded-control/g) ?? []).length >= 9 && !/h-\[var\(--h-control-md\)\][^"]*rounded-pill/.test(g));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-22 (S5-R2-SLIP, `test:measure`'s release red): the measure is the kit's form tier, never
  // a hand-typed 640px — the column `max-w-form` and its grid track `var(--w-form)`, read in the ghost AND the page it stands
  // for (one measure, so nothing moves when the page lands), and the token's value read from the stylesheet.
  const page = slipOf("sw");
  const MEASURE = ["xl:grid-cols-[minmax(0,var(--w-form))_400px]", "flex min-w-0 max-w-form flex-col gap-4"];
  const wForm = /--w-form:\s*([0-9]+)px;/.exec(css)?.[1];
  ok("7.2 · …at the slip's own measure — the form tier (column `max-w-form`, grid track `var(--w-form)`, 640px), the page's own — with no hand-typed width, and with no switcher box (the page draws one only for a second ticket)",
    MEASURE.every((c) => g.includes(c) && page.includes(c)) && wForm === "640" && !/max-w-\[[0-9]+px\]/.test(g) && !g.includes("millionea-ticket-drafts"),
    j({ wForm, ghost: MEASURE.map((c) => g.includes(c)), page: MEASURE.map((c) => page.includes(c)) }));
  // 7.3 · round 2 (the lead, for REGISTER's `qa:millionea-ghost-hops`, which tells loading drawings apart by the page each
  // names and reports any bar outside a named root as UNMARKED): the drawing names its page — a value, never a product word —
  // on ONE box-less wrapper (`contents`) that is the page container's whole content: the back link, the busy root (its test
  // id kept) and the docked rail, which stand outside the busy root, all inside it.
  const GHOST = "src/app/millionea/slip/slip-ghost.tsx";
  /** The index just past the `</div>` that closes the `<div` opening at `at` (divs counted, the markup React writes). */
  const closeOf = (m: string, at: number) => {
    let depth = 0;
    for (const t of m.slice(at).matchAll(/<div\b|<\/div>/g)) {
      depth += t[0] === "</div>" ? -1 : 1;
      if (depth === 0) return at + (t.index ?? 0) + t[0].length;
    }
    return -1;
  };
  const namedWhole = (m: string) => {
    const pc = /<div data-measure="reading"[^>]*>/.exec(m);
    const wrap = '<div class="contents" data-ghost-page="slip">';
    if (!pc) return { ok: false, why: "no page container" };
    const at = (pc.index ?? 0) + pc[0].length;
    if (!m.startsWith(wrap, at)) return { ok: false, why: "the container's first child is not the named wrapper" };
    const end = closeOf(m, at), inner = m.slice(at, end);
    const whole = end > 0 && m.startsWith("</div>", end) && closeOf(m, pc.index ?? 0) === end + "</div>".length;
    const holds = inner.includes('data-testid="slip-ghost"') && inner.includes("kp-mln-rail") && /aria-busy="true"/.test(inner);
    const names = (m.match(/data-ghost-page="/g) ?? []).length;
    return { ok: whole && holds && names === 1, why: JSON.stringify({ whole, holds, names }) };
  };
  const named = namedWhole(g);
  ok("7.3 · the drawing names its page once, on a box-less wrapper (`contents`, data-ghost-page=\"slip\") that is the page container's whole content — back link, busy root and docked rail inside it — so no bar of it is unnamed in a hop",
    named.ok, named.why);
  // PLANT: the name back on the busy root alone (the rail and the back link outside it, unnamed — the defect the lead found).
  const busyOnly = compileAt(GHOST, raw(GHOST).replace('<div className="contents" data-ghost-page="slip">', '<div className="contents">')
    .replace(' data-testid="slip-ghost">', ' data-testid="slip-ghost" data-ghost-page="slip">')) as { MillioneaSlipGhost: () => unknown };
  const bo = namedWhole(inApp("sw", h(busyOnly.MillioneaSlipGhost as never)));
  ok("7.3′ PLANT · the name on the busy root alone (the docked rail and the back link outside any named root) is caught",
    raw(GHOST).includes('<div className="contents" data-ghost-page="slip">') && !bo.ok, bo.why);
}

/* ══ §8 · THE DECIDED WORDS ══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§8 · the words, in three languages");
{
  const W: Record<string, [string, string, string]> = {
    cutTicket: ["Buy ticket · {price}", "Kata tiketi · {price}", "出票 · {price}"],
    cutTickets: ["Buy {n} tickets · {price}", "Kata tiketi zote {n} · {price}", "出票 {n} 张 · {price}"],
    // A Swahili count of tickets says "zote": a bare "tiketi 2" also names the second ticket (the switcher's "Tiketi 2").
    confirmTickets: ["Confirm {n} tickets", "Thibitisha tiketi zote {n}", "确认 {n} 张彩票"],
    continueTicketsAt: ["Continue · {n} tickets · {price}", "Endelea · tiketi zote {n} · {price}", "继续 · {n} 张彩票 · {price}"],
    inFlight: ["Buying…", "Inakatwa…", "出票中…"],
    ticketCut: ["Ticket bought", "Tiketi imekatwa", "已出票"],
    ticketsCut: ["{n} tickets bought", "Tiketi {n} zimekatwa", "已出票 {n} 张"],
    addTicket: ["Add another ticket", "Ongeza tiketi nyingine", "再添加一张彩票"],
    answerMore: ["Answer {n} more", "Jibu {n} zaidi", "还需回答 {n} 题"],
    finishTicketN: ["Finish ticket {n}", "Kamilisha tiketi {n}", "完成第{n}张彩票"],
    priceMainOnly: ["{price} a ticket · main balance only", "{price} kwa tiketi · salio kuu pekee", "每张 {price} · 仅限主余额"],
    ruleSharedJackpot: ["Jackpot shared equally by every 10/10 ticket · {pct}% fee at payout", "Jackpot inagawanywa sawa kwa kila tiketi ya 10/10 · ada {pct}% wakati wa malipo", "大奖由所有 10/10 彩票平分 · 派奖时扣除 {pct}% 费用"],
    refusalIncompleteBody: ["{n} questions unanswered: numbers {list}.", "Maswali {n} hayajajibiwa: namba {list}.", "{n} 题未作答：第{list}题。"],
  };
  const ORDER = ["en", "sw", "zh"] as const;
  const off = Object.entries(W).flatMap(([k, words]) => ORDER.filter((l, i) => (dict[l].millionea as unknown as Record<string, string>)[k] !== words[i]).map((l) => `${l}.${k}`));
  ok(`8.1 · the decided words (${Object.keys(W).length} keys × 3): the lead's English buy words ("Buy ticket", "Ticket bought", "Buying…"; sw "Kata tiketi", zh 出票 unchanged), the critic's words for the price line, the countdown, "Finish ticket n", "Add another ticket" and the jackpot's rule`,
    off.length === 0, j(off));
  const NEW = ["priceMainOnly", "answerMore", "finishTicketN", "removeTicketTitle", "removeTicketBody", "totalRow", "mainBalanceRow", "cancelFreeLabel", "ruleSharedJackpot", "payoutWhenSettled"];
  const holes = NEW.filter((k) => LOCALES.some((l) => typeof (dict[l].millionea as unknown as Record<string, unknown>)[k] !== "string"));
  const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  const drift = [...NEW, ...Object.keys(W)].filter((k) => new Set(LOCALES.map((l) => ph((dict[l].millionea as unknown as Record<string, string>)[k] ?? ""))).size !== 1);
  ok("8.2 · every new key exists in en, sw and zh with identical placeholders", holes.length === 0 && drift.length === 0, j({ holes, drift }));
  const zhOrdinals = Object.entries(dict.zh.millionea as unknown as Record<string, unknown>).filter(([, v]) => typeof v === "string" && /第 |\{[a-z]+\} 题。$|第\{[a-z]+\} /.test(v as string)).map(([k]) => k);
  ok("8.3 · zh ordinals unspaced (the lead's 2026-10-19 ruling, \"第{week}周\"): no \"第 \" in any Millionea string", zhOrdinals.length === 0, j(zhOrdinals));
  const gone = ["mainOnly", "finishTicket", "fromMain", "resultDetails", "resultDetailsNoCancel", "picksSoFar", "jumpTo"].filter((k) => LOCALES.some((l) => k in (dict[l].millionea as object)));
  ok("8.4 · the words the slip no longer says left the dictionary (no dead string to drift)", gone.length === 0, j(gone));
  ok("8.5 · the head's times and the free cancel carry their zone in every language",
    LOCALES.every((l) => ["salesCloseColon", "firstEventAt"].every((k) => fill((dict[l].millionea as unknown as Record<string, string>)[k], { when: "X" }).endsWith("X EAT"))));
}

/* ══ §9 · THE BATCH STAMP'S DWELL ════════════════════════════════════════════════════════════════════════════════════════════ */
section("§9 · the batch stamp's dwell lives with every other dwell");
{
  const timing = code("src/lib/feedback-timing.ts"), client = code("src/app/millionea/slip/slip-client.tsx");
  ok("9.1 · LOW · `DWELL_MILLIONEA_BATCH_STAMP_MS` is 60s in feedback-timing.ts (§F8: values live there and nowhere else), and the composer reads it — no literal at the call site",
    /export const DWELL_MILLIONEA_BATCH_STAMP_MS = 60_000;/.test(timing) && client.includes("autoCloseMs={many ? DWELL_MILLIONEA_BATCH_STAMP_MS : undefined}") && !/60_?000/.test(client));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-22 (S5-R2-SLIP, the lead's ruling): "View ticket" is the kit's Link (`primaryHref`; the
  // values in §1.11 and §12.4), and NavProgress starts on its press as on every internal link (its own capture-phase listener,
  // §F10) — so the stamp no longer raises `50pick:navigating` itself. The slip's one programmatic move, the deposit door, does.
  const nav = code("src/components/ui/nav-progress.tsx");
  ok("9.2 · motion M4 · \"View ticket\" starts the progress bar on its press — it is the kit's Link, which NavProgress's own listener starts on (§F10) — and the deposit door, a programmatic move, still raises `50pick:navigating`",
    client.includes("primaryHref={stamp ? (many ? MILLIONEA_HREF.tickets : millioneaTicketHref(stamp.serials[0])) : undefined}")
      && nav.includes('document.addEventListener("click", onClick, { capture: true });') && nav.includes('closest("a[href]")')
      && /onDeposit=\{\(amount\) => navigate\(\(\) => router\.push\(/.test(client) && client.includes('window.dispatchEvent(new Event("50pick:navigating"));'));
  ok("9.3 · motion M3 · the stamp keeps its words through its exit: its content is the last cut shown (`shownCut`), and closing clears only `cut`",
    client.includes("const stamp = shownCut;") && client.includes("onClose={() => setCut(null)}") && !/setShownCut\(null\)/.test(client));
  ok("9.4 · M10 · a block on the money path stays until read (`durationMs: 0` for `danger`)",
    client.includes('...(variant === "danger" ? { durationMs: 0 } : {})'));
  // The page under the sheet and the stamp. The dialog's way back never scrolls (the kit's `PAGE.focus`, the lead's ruling
  // of 2026-10-21 — the runtime proof is `qa:dialog-way-back`); the one move the slip makes on purpose is a purchase's:
  // the top of the fresh slip, in the commit the sheet closes into the stamp.
  const modal = code("src/components/ui/modal.tsx");
  ok("9.5 · motion H1 · the page stays where the player left it: the dialog's way back focuses the opener without scrolling (`preventScroll`), and only a purchase moves the page — to the top of the fresh slip, in the landing's own commit",
    modal.includes("focus: (node) => { if (node instanceof HTMLElement) node.focus({ preventScroll: true }); },")
      && client.includes("landedRef.current = true;\n          setCut(landed);")
      && client.includes("if (cut === null || !landedRef.current) return;")
      && (client.match(/window\.scrollTo\(/g) ?? []).length === 1 && !client.includes("sheetY"));
}

/* ══ §10 · THE PLANTS ════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§10 · each fix undone in memory is caught by its case (the source planted, compiled and drawn as above)");
{
  const SLIP_PATH = "src/components/maswali/maswali-slip.tsx", METER_PATH = "src/components/markets/stepped-progress.tsx";
  const planted = (from: string, to: string) => {
    const src = raw(SLIP_PATH);
    if (src.split(from).length - 1 !== 1) throw new Error(`PLANT TARGET ABSENT — ${from.slice(0, 60)}`);
    return compileAt(SLIP_PATH, src.replace(from, to), { "@/components/ui/modal": nowModal }) as Record<string, (p: Record<string, unknown>) => unknown>;
  };
  const drawSlip = (mod: Record<string, (p: Record<string, unknown>) => unknown>, p: Record<string, unknown>) => inApp("en", h(mod.MaswaliSlip as never, {
    week: 49, questions: QS, picks: picksWith(0), onPick() {}, closesAt: CLOSE, firstEventAt: EVENT, serverNow: NOW, price: 1_000, cap: 10, ticketNumber: 1,
    refused: false, onRefuse() {}, onContinue() {}, followHref: "/millionea", ...p,
  } as never));
  const drawSheet = (mod: Record<string, (p: Record<string, unknown>) => unknown>, p: Record<string, unknown>) => inApp("en", h(mod.MaswaliSlipConfirm as never, {
    open: true, onClose() {}, week: 49, questions: QS, picks: picksWith(15), total: 1_000, balance: 50_000, ticketNumber: 1, cap: 10,
    closesAt: CLOSE, serverNow: NOW, freeCancelMinutes: 5, pct: 13, onCommit() {}, ...p,
  } as never));
  // M8 · the count-down undone: 3.1's words fall back to the static "Answer all".
  const staticPay = planted("fill(t.millionea.answerMore, { n: formatNumber(asked - answered) })", "fill(t.millionea.answerAll, { n: formatNumber(asked) })");
  ok("10.1 PLANT · M8 · the pay control's count-down undone is caught (\"Answer all 15\" at 12 answered)",
    payOf(drawSlip(staticPay, { picks: picksWith(12) })).every((b) => b.text === "Answer all 15"));
  // H3 · arming on the active ticket alone: the control arms while another ticket is incomplete.
  const armsEarly = planted("const armed = progress.ready && !finish;", "const armed = progress.ready;");
  ok("10.2 PLANT · H3 · arming on the active ticket alone is caught (armed under \"Finish ticket 2\")",
    payOf(drawSlip(armsEarly, { picks: picksWith(15), finish: { label: "Finish ticket 2", onPress() {} } })).some((b) => b.tag.includes('data-armed="true"')));
  // M2 · the eyebrow mark undone: refused rows carry no "Unanswered".
  const noMark = planted("flagged={showRefusal && !picks[slotOfQ(q) - 1]}", "flagged={false}");
  ok("10.3 PLANT · M2 · the unanswered rows left unmarked is caught", !textOf(drawSlip(noMark, { picks: picksWith(12), refused: true })).includes("Unanswered"));
  // H5 · the fabricated zero put back.
  const zero = planted("value={balance === null\n                  ? <span className=\"flex flex-col items-end gap-0.5 text-right\"><span aria-hidden>—</span><span>{t.common.temporarilyUnavailable}</span></span>\n                  : <span className=\"amount\">{formatTzs(balance)}</span>} />",
    "value={<span className=\"amount\">{formatTzs(balance ?? 0)}</span>} />");
  ok("10.4 PLANT · H5 · an unread balance printed as TZS 0 is caught", textOf(drawSheet(zero, { balance: null })).includes("TZS 0"));
  // H6 · the sheet's closed frame undone: a closed week keeps offering the commit.
  const noShut = planted("const shut = !!closed && !pending;", "const shut = false;");
  ok("10.5 PLANT · H6 · the confirm ignoring the close is caught (the commit still offered)", drawSheet(noShut, { closed: true }).includes("millionea-confirm-commit"));
  // M1 · the check's slot dropped from an unlit answer: the word moves when a pick lights it.
  const noSlot = planted('leading={<I.check s={16} className={yesLit ? undefined : "invisible"} />}', "leading={yesLit ? <I.check s={16} /> : undefined}");
  const g0 = /<div role="radiogroup"[\s\S]*?<\/div>/.exec(drawSlip(noSlot, {}))?.[0] ?? "";
  ok("10.6 PLANT · M1 · an unlit answer without the check's slot is caught (one glyph where two stood)", (g0.match(/<svg/g) ?? []).length === 1);
  // Motion M8 · the pill unseeded: the server's render draws no pill in the last hour.
  const unseeded = planted("useTickSeconds(closesAt, serverNow, true, serverNow)", "useTickSeconds(closesAt, serverNow, true, null)");
  ok("10.7 PLANT · motion M8 · the pill unseeded is caught (the server's render draws nothing in the last hour)",
    inApp("en", h(unseeded.MaswaliClosingPill as never, { closesAt: NOW + 45 * 60_000, serverNow: NOW, compact: true } as never)) === "");
  // H1 · the meter's empty step solid again (VIS-P's recipe).
  const meterSrc = raw(METER_PATH);
  const solid = compileAt(METER_PATH, meterSrc.replace('const EMPTY_STEP = { background: "var(--bg-sunken)", boxShadow: "inset 0 0 0 1px var(--border-control)", transition: STEP_FILL } as const;',
    'const EMPTY_STEP = { background: "var(--border-strong)", boxShadow: "none", transition: STEP_FILL } as const;')) as { SteppedProgress: (p: Record<string, unknown>) => unknown };
  const solidMeter = renderToStaticMarkup(h(solid.SteppedProgress as never, { groups: [{ steps: 10, done: 3 }, { steps: 5, done: 0 }] } as never));
  ok("10.8 PLANT · H1 · VIS-P's solid empty step put back is caught (no hollow ring)", !solidMeter.includes("var(--border-control)") && solidMeter.includes("background:var(--border-strong)"));
  // The lone marker: the price drawn with its "·" from 1280 again.
  const lone = planted('{ key: "price", node: priceLine, soleFromXl: true }', '{ key: "price", node: priceLine }');
  const loneItem = /<li class="([^"]*)"><span aria-hidden="true" class="([^"]*)">·<\/span><span class="min-w-0">(?:(?!<\/li>)[\s\S])*?a ticket/.exec(drawSlip(lone, {}));
  ok("10.9 PLANT · the price's lone \"·\" from 1280 put back is caught", !!loneItem && !loneItem[2].split(" ").includes("xl:hidden"));
}

/* ══ §11 · ROUND 2 · THE COMPOSER'S PILLS (the lead's ruling (a)) ══════════════════════════════════════════════════════════ */
section("§11 · round 2 · the composer says the noun once, as the switcher's label; each pill its number and progress, named with the noun");
{
  // The composer drawn by the server with two tickets in its draft (the tab's kept draft arrives after hydration, so the
  // render is handed it the way `useExitPhase` is forced above: one mechanical substitution, found exactly once), its
  // server action answered by a stub.
  const CLIENT = "src/app/millionea/slip/slip-client.tsx";
  const SEED_FROM = "useState<MillioneaSlipDraft>(() => newSlipDraft(hiddenSlots, VOIDED_ROW_FILL))";
  const seeded = (src: string) => {
    if (src.split(SEED_FROM).length - 1 !== 1) throw new Error("PREMISE ABSENT — the composer's draft seed");
    return src.replace(SEED_FROM, "useState<MillioneaSlipDraft>(() => (globalThis as { __draft?: MillioneaSlipDraft }).__draft ?? newSlipDraft(hiddenSlots, VOIDED_ROW_FILL))");
  };
  const ACTIONS = { "../actions": { buyMillioneaTicketsAction: async () => ({ ok: false, error: "stub" }) } };
  const composerOf = (src: string) => compileAt(CLIENT, seeded(src), ACTIONS).SlipClient;
  const ALL = Array.from({ length: 15 }, () => "YES" as const);
  const SEVEN = ALL.map((p, i) => (i < 7 ? p : null));
  const drawComposer = (component: unknown, l: L3) => {
    (globalThis as { __draft?: unknown }).__draft = { v: 2, active: 1, slips: [ALL, SEVEN] };
    try {
      return inApp(l, h(component as never, {
        userId: "u1", weekId: "w1", weekNumber: 49, closesAt: CLOSE, firstEventAt: EVENT, serverNow: NOW, questions: QS, hiddenSlots: [],
        price: 1_000, cap: 10, held: 0, balance: 50_000, freeCancelMinutes: 5, pct: 13, depositFacts: null,
      } as never));
    } finally { delete (globalThis as { __draft?: unknown }).__draft; }
  };
  const pillsOf = (m: string) => {
    const box = /data-testid="millionea-ticket-drafts"[^>]*>([\s\S]*?)<\/section>/.exec(m)?.[1] ?? "";
    return {
      label: textOf(/<span aria-hidden="true" class="[^"]*eyebrow[^"]*">([^<]*)<\/span>/.exec(box)?.[1] ?? ""),
      pills: [...box.matchAll(/<button type="button" aria-pressed="(true|false)" aria-label="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g)].map((x) => ({ pressed: x[1], name: textOf(x[2]), text: textOf(x[3]) })),
    };
  };
  const composer = composerOf(raw(CLIENT));
  const seen = LOCALES.map((l) => ({ l, ...pillsOf(drawComposer(composer, l)) }));
  const want = (l: L3, n: number, p: string) => `${fill(dict[l].millionea.draftTicket, { n })} · ${p}`;
  ok("11.1 · ruling (a) · the switcher's visible label is the noun, once (\"Tiketi\" / \"Tickets\" / 彩票), and each pill says only its number and progress — \"1 · 15/15\", \"2 · 7/15\" — in sw, en and zh",
    seen.every(({ l, label, pills }) => label === dict[l].millionea.draftTicketsNoun && pills.length === 2 && pills[0].text === "1 · 15/15" && pills[1].text === "2 · 7/15"),
    j(seen.map(({ l, label, pills }) => ({ l, label, texts: pills.map((p) => p.text) }))));
  ok("11.2 · …and each pill is NAMED with the noun and the count — \"Tiketi 1 · 15/15\", \"Ticket 2 · 7/15\", \"彩票 1 · 15/15\" — the pressed one the ticket being answered",
    seen.every(({ l, pills }) => pills.length === 2 && pills[0].name === want(l, 1, "15/15") && pills[1].name === want(l, 2, "7/15") && pills[1].pressed === "true"),
    j(seen.map(({ l, pills }) => ({ l, names: pills.map((p) => p.name) }))));
  // PLANT: the name left off the pills — a reader hears "1 · 15/15" and no ticket.
  const unnamed = composerOf(raw(CLIENT).replace(", ariaLabel: `${nameOf(i)} · ${progress}` };", " };"));
  const lostHtml = drawComposer(unnamed, "sw");
  const lostBox = /data-testid="millionea-ticket-drafts"[^>]*>([\s\S]*?)<\/section>/.exec(lostHtml)?.[1] ?? "";
  ok("11.2′ PLANT · pills drawn without their names are caught (both pills still there, the noun gone from what a reader hears)",
    (lostBox.match(/aria-pressed="/g) ?? []).length === 2 && pillsOf(lostHtml).pills.length === 0);
}

/* ══ §12 · ROUND 2 · THE WIRING ROUND 2 ADDED (S5-R2-SLIP 2 and 3) ═══════════════════════════════════════════════════════ */
section("§12 · round 2 · the stamp notes each ticket's free cancel for its drawing; TICKETS' cancel confirm hands its dim to its result");
{
  // 12.1 · "View ticket" opens a ticket whose free cancel is open: the stamp notes the window (TICKETS' `MaswaliGhostHint`)
  // for every serial of the purchase while the window is known, so the ticket's loading drawing holds the cancel's band and
  // the clauses land where it drew them. Drawn by the server with a landed cut in its state (one substitution, found once),
  // the hint stubbed to draw what it is handed.
  const CLIENT = "src/app/millionea/slip/slip-client.tsx";
  // The landing sets both: `cut` (the stamp is up) and `shownCut` (the words it shows, kept through its exit — M3).
  const CUT_FROM = "const [cut, setCut] = useState<Cut | null>(null);", SHOWN_FROM = "const [shownCut, setShownCut] = useState<Cut | null>(null);";
  const withCut = (src: string) => {
    for (const a of [CUT_FROM, SHOWN_FROM]) if (src.split(a).length - 1 !== 1) throw new Error(`PREMISE ABSENT — the stamp's "${a.slice(0, 30)}…"`);
    return src.replace(CUT_FROM, "const [cut, setCut] = useState<Cut | null>(() => (globalThis as { __cut?: Cut }).__cut ?? null);")
      .replace(SHOWN_FROM, "const [shownCut, setShownCut] = useState<Cut | null>(() => (globalThis as { __cut?: Cut }).__cut ?? null);");
  };
  const STUBS = {
    "../actions": { buyMillioneaTicketsAction: async () => ({ ok: false, error: "stub" }) },
    "@/components/maswali/maswali-ghost-hint": {
      MaswaliGhostHint: (p: { serial: string; cancelUntil: number }) => h("i", { "data-hint": p.serial, "data-until": String(p.cancelUntil) }),
    },
  };
  const stampOf = (src: string) => compileAt(CLIENT, withCut(src), STUBS).SlipClient;
  const drawWith = (component: unknown, cut: unknown) => {
    (globalThis as { __cut?: unknown }).__cut = cut;
    try {
      return inApp("sw", h(component as never, {
        userId: "u1", weekId: "w1", weekNumber: 49, closesAt: CLOSE, firstEventAt: EVENT, serverNow: NOW, questions: QS, hiddenSlots: [],
        price: 1_000, cap: 10, held: 0, balance: 50_000, freeCancelMinutes: 5, pct: 13, depositFacts: null,
      } as never));
    } finally { delete (globalThis as { __cut?: unknown }).__cut; }
  };
  const hints = (m: string) => [...m.matchAll(/<i data-hint="([^"]*)" data-until="([^"]*)"><\/i>/g)].map((x) => ({ serial: x[1], until: Number(x[2]) }));
  const UNTIL = "2026-12-01T09:05:00.000Z";
  const two = { serials: ["MLN-2026-W49-000041", "MLN-2026-W49-000042"], firstTicketNumber: 1, weekNumber: 49, cancelUntil: UNTIL, total: 2_000 };
  const stamp = stampOf(raw(CLIENT));
  const open2 = hints(drawWith(stamp, two)), unknown = hints(drawWith(stamp, { ...two, cancelUntil: null })), none = hints(drawWith(stamp, null));
  ok("12.1 · the stamp notes the free cancel of every ticket it names, at the window's own end — so \"View ticket\" lands on a drawing that holds the cancel's band — and notes nothing when the window is not known, nor with no stamp up",
    j(open2) === j(two.serials.map((serial) => ({ serial, until: Date.parse(UNTIL) }))) && unknown.length === 0 && none.length === 0, j({ open2, unknown, none }));
  const HINT_LINE = '{cut && cut.cancelUntil !== null ? cut.serials.map((serial) => <MaswaliGhostHint key={serial} serial={serial} cancelUntil={Date.parse(cut.cancelUntil ?? "")} />) : null}';
  const noHint = raw(CLIENT).replace(HINT_LINE, "{null}");
  ok("12.1′ PLANT · the stamp's note taken out is caught (the ticket's drawing would hold no band, and the clauses land a band lower than drawn)",
    noHint !== raw(CLIENT) && hints(drawWith(stampOf(noHint), two)).length === 0);

  // 12.4 · "View ticket" is the kit's Link (the lead's ruling): the stamp hands the kit the ticket's address — a batch, the
  // list's — and its press only closes the stamp: the Link moves (production prefetches the ticket's loading drawing while the
  // stamp is up), so the press pushes nothing itself. The result modal stubbed to keep what it is handed; the router's push
  // counted. (A press after the server's render is a no-op state update; the old press raised a window event and pushed.)
  const stampProps: Record<string, unknown>[] = [];
  const RESULT_STUB = { ...STUBS, "@/components/markets/operation-result-modal": { OperationResultModal: (p: Record<string, unknown>) => { stampProps.push(p); return null; } } };
  const linkOf = (src: string, cut: unknown) => {
    stampProps.length = 0;
    drawWith(compileAt(CLIENT, withCut(src), RESULT_STUB).SlipClient, cut);
    const p = stampProps.at(-1) ?? {};
    let pushes = 0, threw = "";
    const push = ROUTER.push;
    ROUTER.push = () => { pushes++; };
    try { (p.onPrimary as (() => void) | undefined)?.(); } catch (e) { threw = String(e).slice(0, 80); } finally { ROUTER.push = push; }
    return { href: p.primaryHref, pushes, threw };
  };
  const one = { ...two, serials: [two.serials[0]] };
  const single = linkOf(raw(CLIENT), one), batch = linkOf(raw(CLIENT), two);
  ok("12.4 · the stamp's \"View ticket\" is the kit's Link to the ticket (a batch's: to the list), and its press only closes the stamp — it pushes nothing itself",
    single.href === `/millionea/tickets/${one.serials[0]}` && batch.href === "/millionea/tickets" && single.pushes === 0 && batch.pushes === 0 && !single.threw && !batch.threw,
    j({ single, batch }));
  const OLD_PRESS = 'onPrimary={() => {\n          const c = stamp;\n          setCut(null);\n          if (c) navigate(() => router.push(c.serials.length > 1 ? MILLIONEA_HREF.tickets as never : millioneaTicketHref(c.serials[0]) as never));\n        }}';
  const oldPress = raw(CLIENT).replace(/\n {8}primaryHref=\{[^\n]*\n/, "\n").replace("onPrimary={() => setCut(null)}", OLD_PRESS);
  const was = linkOf(oldPress, one);
  ok("12.4′ PLANT · the stamp as it was (a button whose press raised the progress event and pushed) is caught — no address handed, a push or a throw on press",
    oldPress !== raw(CLIENT) && was.href === undefined && (was.pushes > 0 || was.threw !== ""), j(was));

  // 12.2 · TICKETS' free cancel wears the slip's kit options (round 2, agreed with TICKETS): the confirm Millionea's panel class
  // (kp-mln-zh) and the hand-off's closing edge, the result the opening edge (`handoff={open}`) with its panel a beat late
  // (`panelDelay`). Drawn by the server with the two dialogs stubbed to draw what they are handed, and the two states the
  // page reaches by a press seeded (one substitution each, found once): the result up, the confirm closing into it.
  const ACTS = "src/app/millionea/tickets/[serial]/ticket-acts.tsx";
  const HOST_OPEN = "  const [open, setOpen] = useState(false);\n  const [shown, setShown] = useState(0);";
  const OUT_FROM = "const [handoffOut, setHandoffOut] = useState(false);";
  const seededActs = (src: string) => {
    for (const a of [HOST_OPEN, OUT_FROM]) if (src.split(a).length - 1 !== 1) throw new Error(`PREMISE ABSENT — ticket-acts: "${a.trim().slice(0, 40)}…"`);
    return src
      .replace(HOST_OPEN, "  const [open, setOpen] = useState(() => (globalThis as { __hostOpen?: boolean }).__hostOpen === true);\n  const [shown, setShown] = useState(0);")
      .replace(OUT_FROM, "const [handoffOut, setHandoffOut] = useState(() => (globalThis as { __handoffOut?: boolean }).__handoffOut === true);");
  };
  const handed = (p: Record<string, unknown>) => ({ "data-open": String(p.open), "data-panel": String(p.panelClassName ?? ""), "data-handoff": String(p.handoff), "data-delay": String(p.panelDelay) });
  const ACT_STUBS = {
    "../../actions": { cancelMillioneaTicketAction: async () => ({ ok: false, error: "stub" }), markMillioneaTicketSeenAction: async () => undefined },
    "@/components/ui/modal": { ConfirmModal: (p: Record<string, unknown>) => h("i", { "data-dialog": "confirm", ...handed(p) }) },
    "@/components/markets/operation-result-modal": { OperationResultModal: (p: Record<string, unknown>) => h("i", { "data-dialog": "result", ...handed(p) }) },
    "@/components/maswali/maswali-ticket-cancel": { MaswaliCancelButton: () => null },
    "@/components/maswali/maswali-moment": { MaswaliMomentsHost: (p: { children: unknown }) => p.children },
    "@/components/markets/win-celebration": { dispatchWinCelebration() {} },
    "@/components/ui/toast": { useToast: () => ({ toast() {} }) },
  };
  const actsOf = (src: string) => compileAt(ACTS, seededActs(src), ACT_STUBS) as { TicketHost: unknown; TicketCancel: unknown };
  const SERIAL = "MLN-2026-W49-000041";
  const drawActs = (A: { TicketHost: unknown; TicketCancel: unknown }, hostOpen: boolean, handoffOut: boolean) => {
    const g = globalThis as { __hostOpen?: boolean; __handoffOut?: boolean };
    g.__hostOpen = hostOpen; g.__handoffOut = handoffOut;
    try {
      const m = inApp("sw", h(A.TicketHost as never, { serial: SERIAL, through: "2026-12-01T09:00:00.000Z" } as never,
        h(A.TicketCancel as never, { serial: SERIAL, ownerId: "u1", until: NOW + 5 * 60_000, serverNow: NOW, price: 1_000, cap: 10, windowMins: 5 } as never)));
      const read = (kind: string) => {
        const tag = new RegExp(`<i data-dialog="${kind}"([^>]*)><\\/i>`).exec(m)?.[1] ?? "";
        return Object.fromEntries([...tag.matchAll(/data-([a-z]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
      };
      return { confirm: read("confirm"), result: read("result") };
    } finally { delete g.__hostOpen; delete g.__handoffOut; }
  };
  const acts = actsOf(raw(ACTS));
  const atRest = drawActs(acts, false, false), resultUp = drawActs(acts, true, false), closingInto = drawActs(acts, false, true);
  ok("12.2 · TICKETS' cancel confirm wears Millionea's panel (kp-mln-zh) and hands its dim on exactly when its state says (false at rest, true closing into the result); the result holds the dim from its first frame exactly while it is up (`handoff` = `open`) and always rises a beat late",
    [atRest, resultUp, closingInto].every((s) => s.confirm.panel === "kp-mln-zh" && s.result.delay === "true" && s.result.handoff === s.result.open)
      && atRest.confirm.handoff === "false" && closingInto.confirm.handoff === "true" && atRest.result.open === "false" && resultUp.result.open === "true",
    j({ atRest, resultUp, closingInto }));
  // PLANTS: the confirm keeping its own dim (no hand-off), and the result fading a new dim in (no hand-off on its side).
  const ownDim = actsOf(raw(ACTS).replace("handoff={handoffOut}", "handoff={false}"));
  const fadeIn = actsOf(raw(ACTS).replace("handoff={open}", "handoff={false}"));
  ok("12.2′ PLANT · the confirm keeping its own dim, or the result fading a new dim in, is caught (the dim would lift between the two)",
    drawActs(ownDim, false, true).confirm.handoff === "false" && drawActs(fadeIn, true, false).result.handoff === "false");
  // 12.3 · the order the dim needs (as 4.P1 holds the slip's): a landed cancel sets the hand-off and closes the confirm in the
  // same continuation that opens the result — one commit, so the dim never lifts between them — and the door re-arms it to
  // false each time it opens the confirm (a refused cancel closes with its own dim, the toast over the page).
  const cancelDefects = (src: string) => {
    const s = decomment(src).replace(/\s+/g, " ");
    const d: string[] = [];
    const landed = s.indexOf("const r = await cancelMillioneaTicketAction(fd);"), refusal = s.indexOf("const failure = r as ReasonedFailure;");
    const branch = landed >= 0 && refusal > landed ? s.slice(landed, refusal) : "";
    const set = branch.indexOf("setHandoffOut(r.ok && !!r.data);"), close = branch.indexOf("setOpen(false);"), show = branch.indexOf("showResult?.(r.data.refunded);");
    if (!(set >= 0 && close > set && show > close)) d.push("a landed cancel does not hand its dim on, close the confirm and open the result in one continuation");
    if (!s.includes("onPress={() => { setHandoffOut(false); setOpen(true); }}")) d.push("the door does not re-arm the hand-off when it opens the confirm");
    return d;
  };
  const cd = cancelDefects(raw(ACTS));
  ok("12.3 · a landed cancel hands the dim on and closes its confirm in the continuation that opens the result (one commit); the door re-arms the hand-off each time it opens the confirm", cd.length === 0, cd.join(" | "));
  const late = raw(ACTS).replace("      setHandoffOut(r.ok && !!r.data);\n      setOpen(false);", "      setOpen(false);\n      await Promise.resolve();\n      setHandoffOut(r.ok && !!r.data);");
  ok("12.3′ PLANT · the hand-off set after the confirm closed (a later continuation) is caught", late !== raw(ACTS) && cancelDefects(late).length > 0);
}

console.log(`\n${"═".repeat(70)}\n  MASWALI SLIP DESIGN: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run printed. */
const MIN_ASSERTIONS = 92;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
