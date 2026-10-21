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
  ok("7.2 · …at the slip's own measure (640px) and with no switcher box (the page draws one only for a second ticket)",
    g.includes("max-w-[640px]") && !g.includes("millionea-ticket-drafts"));
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
  ok("9.2 · motion M4 · \"View ticket\" starts the progress bar before it navigates (§F10's `50pick:navigating`)",
    /onPrimary=\{\(\) => \{[\s\S]*?navigate\(\(\) => router\.push\(/.test(client) && client.includes('window.dispatchEvent(new Event("50pick:navigating"));'));
  ok("9.3 · motion M3 · the stamp keeps its words through its exit: its content is the last cut shown (`shownCut`), and closing clears only `cut`",
    client.includes("const stamp = shownCut;") && client.includes("onClose={() => setCut(null)}") && !/setShownCut\(null\)/.test(client));
  ok("9.4 · M10 · a block on the money path stays until read (`durationMs: 0` for `danger`)",
    client.includes('...(variant === "danger" ? { durationMs: 0 } : {})'));
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

console.log(`\n${"═".repeat(70)}\n  MASWALI SLIP DESIGN: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run printed. */
const MIN_ASSERTIONS = 72;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
