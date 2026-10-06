/**
 * test:enter-where-pressed — A DIALOG ACTS ON ENTER ONLY WHERE IT IS PRESSED (the Vodacom plan S6 A8i, 2026-10-06).
 *
 *   npm run test:enter-where-pressed     (in predeploy)
 *   npm run red:enter-where-pressed      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * The live defect it closes, for every player: the bet confirm, the Sell confirm and the result dialog each listened for
 * Enter on the WINDOW and did their primary act whatever had focus. The listener cancelled the focused button's own
 * press, so a keyboard player who tabbed to "Ghairi" and pressed Enter placed the bet (or sold), and Enter on a dialog
 * opened on top — the win seal, the reality check — acted in the dialog underneath. And, found while reading it: a key
 * HELD on the bet dial opened the confirm and its auto-repeat then pressed Confirm, which takes focus 30 ms after opening.
 *
 *   §1 THE HELD-KEY RULE (`src/lib/held-key.ts`, run by `Modal` on every keydown while a dialog is open) — a key's
 *      auto-repeat presses nothing; a first press is untouched; typing is untouched.
 *   §2 THE DIALOGS — (2.1) no file in `src/` listens for Enter on the window or the document, by a census of every such
 *      listener with its handler resolved; (2.2) each money dialog opens with focus on its primary, whose click IS the
 *      act, so Enter-to-confirm still works where it is pressed; (2.3) each way out is a real button with its own act;
 *      (2.4) `Modal` runs the rule first, and swallows; (2.5) the rule is pure.
 *   §3 THE DIAL — its keys only OPEN the confirm; the bet is placed by the confirm's own button.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written. The real-browser half is `qa:enter-where-pressed`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { decomment, blankLiterals } from "./lib/decomment.mts";
import * as HK from "../src/lib/held-key.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const readRaw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const BET = "src/components/markets/bet-confirm-modal.tsx";
const SELL = "src/components/markets/sell-confirm-modal.tsx";
const ORM = "src/components/markets/operation-result-modal.tsx";
const MODAL = "src/components/ui/modal.tsx";
const RULE = "src/lib/held-key.ts";
const DIAL = "src/components/markets/conviction-dial.tsx";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(relative(ROOT, p).split(sep).join("/"));
  }
  return out;
}
const SRC = walk(join(ROOT, "src"));

type Rule = typeof HK.swallowsHeldKey;
type World = { rule: Rule; read: (rel: string) => string };
const REAL: World = { rule: HK.swallowsHeldKey, read: readRaw };

// ── the census ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Where the bracket opened at `at` closes, on literal-blanked text (so a brace inside a string never counts). */
function closer(b: string, at: number): number {
  const open = b[at], close = open === "(" ? ")" : open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = at; i < b.length; i++) {
    if (b[i] === open) depth++;
    else if (b[i] === close && --depth === 0) return i;
  }
  return -1;
}
/** Where the statement that starts at `at` ends: the first `;` or newline outside every bracket. */
function statementEnd(b: string, at: number): number {
  let depth = 0;
  for (let i = at; i < b.length; i++) {
    const c = b[i];
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") depth--;
    else if (depth === 0 && (c === ";" || c === "\n") && i > at) return i;
  }
  return b.length;
}

const LISTEN = /\b(?:window|document|globalThis|self)\s*\.\s*addEventListener\(\s*(["'`])keydown\1\s*,\s*/g;
const ENTER = /(["'`])Enter\1/;
/**
 * A handler that RETURNS unless the key was pressed in its own control (a `.contains(` test on the key's target, before
 * it ever reads Enter) acts where the key is pressed — `select.tsx`'s list is one: focus stays on its trigger while the
 * list is open. Anything else that reads Enter from the window acts wherever Enter is pressed.
 */
function scopedToItsControl(handler: string): boolean {
  const i = handler.search(ENTER);
  const head = i < 0 ? handler : handler.slice(0, i);
  return /\.contains\(/.test(head) && /\breturn\b/.test(head) && /\.target\b/.test(head);
}
export type Listener = { file: string; line: number; handler: string | null; enter: boolean };

/** Every window- or document-level keydown listener in one file, its handler resolved to text in the same file. */
function listenersIn(file: string, raw: string): Listener[] {
  const code = decomment(raw);
  const b = blankLiterals(code);
  const out: Listener[] = [];
  for (const m of code.matchAll(LISTEN)) {
    const at = m.index!;
    const line = code.slice(0, at).split("\n").length;
    const argAt = at + m[0].length;
    const name = /^([A-Za-z_$][\w$]*)\s*[,)]/.exec(code.slice(argAt))?.[1];
    let handler: string | null = null;
    if (!name) {
      const callOpen = code.indexOf("(", at);
      const end = closer(b, callOpen);
      handler = end < 0 ? null : code.slice(argAt, end);
    } else {
      const def = new RegExp(`(?:\\b(?:const|let|var)\\s+${name}\\s*(?::[^=\\n]+)?=\\s*)|(?:\\bfunction\\s+${name}\\s*\\()`).exec(code);
      if (def) {
        if (def[0].startsWith("function")) {
          const params = def.index + def[0].length - 1;
          const bodyOpen = b.indexOf("{", closer(b, params));
          const end = bodyOpen < 0 ? -1 : closer(b, bodyOpen);
          handler = end < 0 ? null : code.slice(def.index, end + 1);
        } else {
          handler = code.slice(def.index, statementEnd(b, def.index + def[0].length));
        }
      }
    }
    out.push({ file, line, handler, enter: handler !== null && ENTER.test(handler) && !scopedToItsControl(handler) });
  }
  return out;
}

const baseCensus = new Map<string, { raw: string; found: Listener[] }>();
/** The census over all of `src/`, reusing each file's result while its text is the one already scanned. */
function census(w: World): Listener[] {
  const all: Listener[] = [];
  for (const f of SRC) {
    const raw = w.read(f);
    let hit = baseCensus.get(f);
    if (!hit || hit.raw !== raw) {
      hit = { raw, found: raw.includes("addEventListener") ? listenersIn(f, raw) : [] };
      if (w === REAL) baseCensus.set(f, hit);
    }
    all.push(...hit.found);
  }
  return all;
}

/** The `<button …>…</button>` element that carries `marker`, or null. */
function buttonWith(code: string, marker: string): string | null {
  const at = code.indexOf(marker);
  if (at < 0) return null;
  const start = code.lastIndexOf("<button", at), end = code.indexOf("</button>", at);
  return start < 0 || end < 0 ? null : code.slice(start, end);
}
const count = (s: string, needle: string) => s.split(needle).length - 1;

// ── the checks ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const el = (tag: string, extra: Partial<HK.KeyTarget> = {}): HK.KeyTarget => ({ tag, type: null, role: null, editable: false, ...extra });
const BTN = el("BUTTON");

function run(w: World, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const R = (key: string, repeat: boolean, t: HK.KeyTarget | null) => { try { return w.rule(key, repeat, t); } catch { return null; } };

  log("§1 · the held-key rule");
  ok("1.1 · a held Enter on a button is swallowed, and the first Enter on it is not (Enter-to-confirm still works)",
    R("Enter", true, BTN) === true && R("Enter", false, BTN) === false);
  const enterHeld = [el("A"), el("INPUT", { type: "text" }), el("INPUT", { type: "checkbox" }), el("BODY"), null];
  ok("1.2 · a held Enter on a link, a text field (it submits its form), a checkbox and the page itself is swallowed",
    enterHeld.every((t) => R("Enter", true, t) === true), JSON.stringify(enterHeld.map((t) => R("Enter", true, t))));
  ok("1.3 · a held Enter in a textarea or an editable region passes — it types new lines",
    R("Enter", true, el("TEXTAREA")) === false && R("Enter", true, el("DIV", { editable: true })) === false);
  const spaceHeld = [BTN, el("SUMMARY"), el("INPUT", { type: "checkbox" }), el("INPUT", { type: "radio" }), el("INPUT", { type: "submit" }),
    el("DIV", { role: "button" }), el("SPAN", { role: "switch" }), el("DIV", { role: "tab" })];
  ok("1.4 · a held Space on a button, a summary, a checkbox, a radio, a submit and role=button/switch/tab is swallowed; the first Space is not",
    spaceHeld.every((t) => R(" ", true, t) === true) && spaceHeld.every((t) => R(" ", false, t) === false),
    JSON.stringify(spaceHeld.map((t) => [t.tag, t.role, R(" ", true, t), R(" ", false, t)])));
  const spaceTyping = [el("INPUT", { type: "text" }), el("INPUT", { type: "search" }), el("INPUT"), el("TEXTAREA"), el("SELECT"),
    el("DIV", { editable: true }), el("A"), el("DIV"), null];
  ok("1.5 · a held Space in a text field, a search field, a textarea, a select or an editable region, on a link or on plain text passes",
    spaceTyping.every((t) => R(" ", true, t) === false), JSON.stringify(spaceTyping.map((t) => R(" ", true, t))));
  const others = ["Escape", "Tab", "ArrowDown", "a", "Backspace"];
  ok("1.6 · any other key held (Escape, Tab, an arrow, a letter, Backspace) passes, and no first press is ever swallowed",
    others.every((k) => R(k, true, BTN) === false)
      && [...enterHeld, ...spaceHeld, ...spaceTyping, BTN].every((t) => R("Enter", false, t) === false && R(" ", false, t) === false));

  log("§2 · the dialogs");
  const found = census(w);
  const enter = found.filter((l) => l.enter);
  const unresolved = found.filter((l) => l.handler === null);
  const control = listenersIn("control.tsx",
    "useEffect(() => {\n  const onKey = (e: KeyboardEvent) => {\n    if (e.key === \"Enter\") { e.preventDefault(); onConfirm(); }\n  };\n  window.addEventListener(\"keydown\", onKey);\n}, [open]);\n"
    + "useEffect(() => {\n  const onList = (e: KeyboardEvent) => {\n    if (!listRef.current?.contains(e.target as Node)) return;\n    if (e.key === \"Enter\") pick();\n  };\n  window.addEventListener(\"keydown\", onList);\n}, [open]);\n");
  ok("2.0 · fixture · the census finds the window/document keydown listeners in src/, resolves every handler, flags a planted Enter one and passes one scoped to its own control",
    found.length >= 10 && unresolved.length === 0 && control.length === 2 && control[0].enter && !control[1].enter,
    `${found.length} listeners · unresolved: ${unresolved.map((l) => `${l.file}:${l.line}`).join(", ") || "none"} · control: ${JSON.stringify(control.map((l) => l.enter))}`);
  ok("2.1 · ★ no file in src/ acts on Enter from the window or the document, unless it first returns for a key pressed outside its own control",
    enter.length === 0, enter.map((l) => `${l.file}:${l.line}`).join(", "));

  const bet = decomment(w.read(BET)), sell = decomment(w.read(SELL)), orm = decomment(w.read(ORM));
  const betConfirm = buttonWith(bet, "ref={confirmRef}") ?? "", sellConfirm = buttonWith(sell, "ref={confirmRef}") ?? "";
  const ormPrimary = buttonWith(orm, "ref={primaryRef}") ?? "";
  ok("2.2 · each money dialog opens with focus on its primary, whose click IS the act — bet: onConfirm, sell: onConfirm, result: onPrimary else onClose",
    /initialFocus=\{confirmRef\}/.test(bet) && /onConfirm\(\)/.test(betConfirm) && !/onCancel/.test(betConfirm)
      && /initialFocus=\{confirmRef\}/.test(sell) && /onConfirm\(\)/.test(sellConfirm) && !/onCancel/.test(sellConfirm)
      && /initialFocus=\{primaryRef\}/.test(orm) && /if \(onPrimary\) onPrimary\(\); else onClose\(\)/.test(ormPrimary),
    JSON.stringify({ bet: betConfirm.slice(0, 80), sell: sellConfirm.slice(0, 80), orm: ormPrimary.slice(0, 80) }));
  const ormSecondary = buttonWith(orm, "if (onSecondary) onSecondary(); else onClose()") ?? "";
  ok("2.3 · each way out is a real button with its own act — the bet's ✕ and Cancel, the Sell's keep, the result's secondary",
    count(bet, "onClick={onCancel}") >= 2 && count(sell, "onClick={onCancel}") >= 1
      && [bet, sell].every((s) => !/onClick=\{onConfirm\}/.test(s)) && /type="button"/.test(ormSecondary),
    JSON.stringify({ betCancels: count(bet, "onClick={onCancel}"), sellCancels: count(sell, "onClick={onCancel}") }));

  const modal = decomment(w.read(MODAL));
  const keyAt = modal.indexOf("const onKey = (e: KeyboardEvent) => {");
  const bodyOpen = keyAt < 0 ? -1 : modal.indexOf("{", keyAt + "const onKey = (e: KeyboardEvent) =>".length);
  const body = bodyOpen < 0 ? "" : modal.slice(bodyOpen + 1, closer(blankLiterals(modal), bodyOpen));
  ok("2.4 · Modal's key handler runs the held-key rule FIRST and swallows (preventDefault) — and is the window listener of its open effect",
    /from "@\/lib\/held-key"/.test(modal)
      && body.trimStart().startsWith("if (swallowsHeldKey(e.key, e.repeat, keyTargetOf(e.target))) { e.preventDefault(); return; }")
      && /window\.addEventListener\("keydown", onKey\)/.test(modal),
    body.trimStart().slice(0, 110));
  ok("2.5 · the rule is pure — held-key.ts imports nothing, so the guard runs the very rule the dialog runs",
    !/^\s*import\b/m.test(decomment(w.read(RULE))) && /export function swallowsHeldKey\(/.test(w.read(RULE)));

  log("§3 · the dial");
  const dial = decomment(w.read(DIAL));
  const kd = dial.indexOf("const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {");
  const kdOpen = kd < 0 ? -1 : dial.indexOf("{", kd + "const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) =>".length);
  const kdBody = kdOpen < 0 ? "" : dial.slice(kdOpen, closer(blankLiterals(dial), kdOpen) + 1);
  ok("3.1 · the dial's Enter and Space only OPEN the confirm — the bet is placed by the confirm's own button",
    count(kdBody, "openConfirm()") >= 2 && !/\bsubmit\(|onConfirm\(|placeBet/.test(kdBody), kdBody.slice(0, 80));
  return failed;
}

// ── the run ────────────────────────────────────────────────────────────────────────────────────────────────────────────

if (!PROVE_RED) {
  console.log("enter-where-pressed — the Vodacom plan S6 A8i");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`\nENTER WHERE PRESSED — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  /** The real tree with one file's text replaced: `from` must occur exactly once, so a plant can never land twice. */
  const plantIn = (file: string, from: string, to: string): World => {
    const raw = readRaw(file);
    const n = raw.split(from).length - 1;
    if (n !== 1) throw new Error(`plant anchor in ${file} occurs ${n} times, not once: ${JSON.stringify(from.slice(0, 60))}`);
    const planted = raw.replace(from, to);
    return { ...REAL, read: (rel) => (rel === file ? planted : readRaw(rel)) };
  };
  const OLD_BET = "\n  useEffect(() => {\n    if (!open) return;\n    const onKey = (e: KeyboardEvent) => {\n      if (e.key === \"Enter\" && !pendingRef.current) { e.preventDefault(); onConfirm(); }\n    };\n    window.addEventListener(\"keydown\", onKey);\n    return () => window.removeEventListener(\"keydown\", onKey);\n  }, [open]);\n";
  const rule = (f: Rule): World => ({ ...REAL, rule: f });
  const H = HK.swallowsHeldKey;
  type Plant = { name: string; expect: RegExp; world: () => World };
  const plants: Plant[] = [
    { name: "the repeat ignored — a held Enter presses the Confirm it lands on (the defect)", expect: /^1\.1 /,
      world: () => rule((k, r, t) => (k === "Enter" ? false : H(k, r, t))) },
    { name: "every Enter swallowed, the first press too — Enter-to-confirm broken", expect: /^1\.(1|6) /,
      world: () => rule((k, r, t) => (k === "Enter" ? true : H(k, r, t))) },
    { name: "a held Enter swallowed in a textarea — new lines broken", expect: /^1\.3 /,
      world: () => rule((k, r, t) => (k === "Enter" && r ? true : H(k, r, t))) },
    { name: "a held Space on a button passes — released on Confirm, it presses it", expect: /^1\.4 /,
      world: () => rule((k, r, t) => (k === " " ? false : H(k, r, t))) },
    { name: "a held Space swallowed in a text field — typing broken", expect: /^1\.5 /,
      world: () => rule((k, r, t) => (k === " " && r ? true : H(k, r, t))) },
    { name: "a held Escape swallowed", expect: /^1\.6 /,
      world: () => rule((k, r, t) => (k === "Escape" && r ? true : H(k, r, t))) },
    { name: "the bet confirm's window Enter listener restored (Enter on \"Ghairi\" places the bet)", expect: /^2\.1 /,
      world: () => plantIn(BET, "  const confirmRef = useRef<HTMLButtonElement>(null);\n", `  const confirmRef = useRef<HTMLButtonElement>(null);\n${OLD_BET}`) },
    { name: "the Sell confirm's window Enter listener restored (Enter on the win seal sells underneath)", expect: /^2\.1 /,
      world: () => plantIn(SELL, "  const confirmRef = useRef<HTMLButtonElement>(null);\n", `  const confirmRef = useRef<HTMLButtonElement>(null);\n${OLD_BET.replace("!pendingRef.current", "!pending")}`) },
    { name: "the result dialog's window Enter listener restored (Enter on \"View positions\" does the primary)", expect: /^2\.1 /,
      world: () => plantIn(ORM, "  const primaryRef = useRef<HTMLButtonElement>(null);\n",
        "  const primaryRef = useRef<HTMLButtonElement>(null);\n  useEffect(() => {\n    if (!open) return;\n    const onKey = (e: KeyboardEvent) => {\n      if (e.key === 'Enter') { e.preventDefault(); (onPrimary ?? closeRef.current)(); }\n    };\n    window.addEventListener('keydown', onKey);\n    return () => window.removeEventListener('keydown', onKey);\n  }, [open, onPrimary]);\n") },
    { name: "the listener restored on the document, its handler a function declaration", expect: /^2\.1 /,
      world: () => plantIn(SELL, "  const confirmRef = useRef<HTMLButtonElement>(null);\n",
        "  const confirmRef = useRef<HTMLButtonElement>(null);\n  useEffect(() => {\n    function onEnter(e: KeyboardEvent) { if (e.key === \"Enter\") onConfirm(); }\n    document.addEventListener(\"keydown\", onEnter);\n    return () => document.removeEventListener(\"keydown\", onEnter);\n  }, [open]);\n") },
    { name: "the dropdown's list takes keys pressed anywhere again (Enter on a seal opened over it picks an option)", expect: /^2\.1 /,
      world: () => plantIn("src/components/ui/select.tsx",
        "      if (at !== document.body && !triggerRef.current?.contains(at) && !listRef.current?.contains(at)) return;\n", "") },
    { name: "the listener restored as an inline arrow on the window", expect: /^2\.1 /,
      world: () => plantIn(BET, "  const confirmRef = useRef<HTMLButtonElement>(null);\n",
        "  const confirmRef = useRef<HTMLButtonElement>(null);\n  useEffect(() => { window.addEventListener(\"keydown\", (e) => { if (e.key === `Enter`) onConfirm(); }); }, []);\n") },
    { name: "the bet confirm opens with focus off Confirm (the keyboard path to confirm lost)", expect: /^2\.2 /,
      world: () => plantIn(BET, "      initialFocus={confirmRef}\n", "") },
    { name: "the Sell confirm opens with focus off its sell button", expect: /^2\.2 /,
      world: () => plantIn(SELL, "      initialFocus={confirmRef}\n", "") },
    { name: "the result's primary click drops onPrimary (Enter and click no longer the act)", expect: /^2\.2 /,
      world: () => plantIn(ORM, "onClick={() => { if (onPrimary) onPrimary(); else onClose(); }}", "onClick={() => { onClose(); }}") },
    { name: "the bet confirm's Cancel made to confirm", expect: /^2\.3 /,
      world: () => plantIn(BET, "            onClick={onCancel}\n            disabled={pending}", "            onClick={onConfirm}\n            disabled={pending}") },
    { name: "Modal's held-key rule removed", expect: /^2\.4 /,
      world: () => plantIn(MODAL, "      if (swallowsHeldKey(e.key, e.repeat, keyTargetOf(e.target))) { e.preventDefault(); return; }\n", "") },
    { name: "Modal's held-key rule run without preventDefault (it decides and swallows nothing)", expect: /^2\.4 /,
      world: () => plantIn(MODAL, "keyTargetOf(e.target))) { e.preventDefault(); return; }", "keyTargetOf(e.target))) { return; }") },
    { name: "the rule made impure (it imports)", expect: /^2\.5 /,
      world: () => plantIn(RULE, "/** What the rule needs to know about the element a key went to. */", "import { haptics } from \"./haptics\";\n/** What the rule needs to know about the element a key went to. */") },
    { name: "the dial's Enter places the bet itself", expect: /^3\.1 /,
      world: () => plantIn(DIAL, "if (e.key === \" \" || e.key === \"Enter\") { e.preventDefault(); openConfirm(); return; }",
        "if (e.key === \" \" || e.key === \"Enter\") { e.preventDefault(); submit(); return; }") },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const quiet = () => {};
  const clean = run(REAL, quiet);
  ok("the REAL tree passes every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    let failures: string[];
    try { failures = run(p.world(), quiet); } catch (e) { failures = []; ok(p.name, false, `the plant could not be made: ${(e as Error).message}`); continue; }
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
