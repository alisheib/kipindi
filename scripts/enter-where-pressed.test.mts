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
 *   §1 THE HELD-KEY RULE (`src/lib/held-key.ts`, run by the key guard on every keydown of the page, first) — a key's
 *      auto-repeat presses nothing; a first press is untouched; typing is untouched; Space on the bet dial is a press;
 *      (1.7) `keyTargetOf` reads a real element as the rule needs it; (1.8) the press test is the rule without the repeat.
 *   §2 THE DIALOGS — (2.0, 2.0b) the census reads every key listener on the window, the document or the page: a handler
 *      resolved where its listener stands (a name nothing reaches is unread, never judged by a namesake), a cast read
 *      through, a member — or an inline handler acting through one — failing it, Enter or Space in any spelling and
 *      through any helper, a namespace import's too; (2.1) no file in `src/` reads a press there but two named, pinned
 *      readers; (2.2) each money dialog opens with focus on its primary, whose click IS the act, so Enter-to-confirm still
 *      works where it is pressed; (2.3) each way out is a real button with its own act; (2.5) the rule is pure; (2.6) no
 *      file that draws a dialog reads a press from a React key prop, or one the census cannot read; (2.7) the stack is
 *      browser-free; (2.8) every key event named in src/ belongs to a listener the census reads.
 *   §3 THE DIAL — its keys only OPEN the confirm; the bet is placed by the confirm's own button.
 *   §4 THE KEY GUARD (S6 A8i-2, `src/components/ui/key-guard.tsx`) — the rule runs once, app-wide, first, in the capture
 *      phase, and a swallowed key is prevented AND stopped; AppShell and every Modal install it; a Space presses only
 *      where it went down; and (4.4) the guard itself, built from its text and RUN on fired keys.
 *   §5 THE DIALOG STACK (S6 A8i-2, `src/lib/modal-stack.ts`) — which dialog is on top; where a key lands; nothing behind
 *      the top dialog takes Enter or Space, and a held key presses once wherever it lands; the arming beat; where focus
 *      goes when a dialog closes, and the hand-off; the beat's length against the win seal's queue; Modal standing on it;
 *      (5.9) leaving, built from its text and RUN on W2, the lapse under the seal, the receipt, the page itself and a
 *      covered dialog's focus; (5.10) every money confirm names its way out.
 *   §6 THE FIRST FOCUS (S6 A8i-2) — a dialog's first focus never lands on a button that cannot be pressed.
 *
 * And the holes A8i left (S6 A8i-2, 2026-10-07), found by its five-lens review and two of them proven in a real browser:
 * outside a dialog nothing held a key (Up & Down's UP bet on every repeat; Enter held on "Hifadhi nafasi" closed the Sell
 * confirm and its repeats opened it again); focus was handed back, or taken, behind the win seal (a second Enter 60 ms
 * after the seal closed SOLD the ticket); one Escape closed every dialog; and the census passed what it could not read.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written. The real-browser half is `qa:enter-where-pressed`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { transformSync } from "esbuild";
import { decomment, blankLiterals } from "./lib/decomment.mts";
import * as HK from "../src/lib/held-key.ts";
import * as MS from "../src/lib/modal-stack.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const readRaw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const BET = "src/components/markets/bet-confirm-modal.tsx";
const SELL = "src/components/markets/sell-confirm-modal.tsx";
const ORM = "src/components/markets/operation-result-modal.tsx";
const MODAL = "src/components/ui/modal.tsx";
const RULE = "src/lib/held-key.ts";
const DIAL = "src/components/markets/conviction-dial.tsx";
/* ⭐ A8i-2 — the key guard, the shell that mounts it, the dialog stack, the win seal (its queue gap), and the dropdown. */
const GUARD = "src/components/ui/key-guard.tsx";
const SHELL = "src/components/layout/app-shell.tsx";
const STACK = "src/lib/modal-stack.ts";
const SEAL = "src/components/markets/win-celebration.tsx";
const SELECT = "src/components/ui/select.tsx";

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
/**
 * ⭐ A8i-2 · WHAT A RUN READS, so the red twin can plant a defect in any part of it IN MEMORY: the held-key rule (`rule`),
 * the element reader (`kto`), the press test (`presses`), the dialog stack's rules (`ms`), how the census reads a listener
 * (`census`), and the files (`read`, each read from disk once).
 */
type World = {
  rule: Rule; kto: typeof HK.keyTargetOf; presses: typeof HK.pressesSomething; ms: typeof MS; census: CensusRules;
  read: (rel: string) => string;
};
const FILES = new Map<string, string>();
function readOnce(rel: string): string {
  const known = FILES.get(rel);
  if (known !== undefined) return known;
  const text = readRaw(rel);
  FILES.set(rel, text);
  return text;
}
const REAL: World = {
  rule: HK.swallowsHeldKey, kto: HK.keyTargetOf, presses: HK.pressesSomething, ms: MS,
  census: { press: readsPress, reach: definitionAt, arg: readArg, helpers: true, more: true, named: true, ns: true, allowed: pressReaderAllowed },
  read: readOnce,
};

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
 * it ever reads Enter). Since A8i-2 this is HALF of the dropdown's pin (`pressReaderAllowed`, with its scope line
 * verbatim), and no exemption on its own: alone it passed a dialog-scoped listener, an inverted scope and an unrelated
 * early return.
 */
function scopedToItsControl(handler: string): boolean {
  const i = handler.search(ENTER);
  const head = i < 0 ? handler : handler.slice(0, i);
  return /\.contains\(/.test(head) && /\breturn\b/.test(head) && /\.target\b/.test(head);
}
// ── ⭐ A8i-2 · WHAT THE CENSUS READS NOW (review 2026-10-07) ─────────────────────────────────────────────────────────────
//
// 🔴 THE A8i CENSUS FAILED OPEN FOUR WAYS, each found by the review and each planted in the red twin: a listener "scoped to
// its own control" passed on any `.contains(`, `return` and `.target` before its first Enter (a dialog-scoped listener, an
// inverted scope and an unrelated early return all did); every handler of one name was judged by the FIRST definition of
// that name in its file; a handler it could not read (a cast, a member, a wrapper) passed as text with no Enter in it; and
// only a quoted "Enter", on a keydown on the window or the document, counted at all. Each is closed below, and the census's
// rules sit in the world (`CensusRules`), so the red twin can weaken each one and watch 2.0b see it. Whitespace and quotes
// are character classes built from their codes, as `source-bytes.test.mts` builds the characters it hunts.

const NL = String.fromCharCode(10);
/** One whitespace character, as a regex class: a space, a tab, a line feed, a carriage return. */
const SPACE = "[ " + String.fromCharCode(9, 10, 13) + "]";
const S = SPACE + "*", S1 = SPACE + "+";
/** Any quote a literal opens with; and anything but one. */
const QUOTE = "[" + String.fromCharCode(34, 39, 96) + "]";
const NOT_QUOTE = "[^" + String.fromCharCode(34, 39, 96) + "]";
const NAME = "[A-Za-z_$][A-Za-z0-9_$]*";
/** Where a bare name starts: not inside a longer name, and not after a dot. */
const BARE_START = "(?<![A-Za-z0-9_$.])";
/** The key listeners the A8i reader never looked at: keyup and keypress on the window or the document, any of the three on
 *  the body or the root element, and an `on…` handler assigned on any of them. */
const MORE_LISTEN = new RegExp(BARE_START + "(?:"
  + "(?:window|document|globalThis|self)" + S + "[.]" + S + "addEventListener[(]" + S + QUOTE + "(?:keyup|keypress)" + QUOTE + S + "," + S
  + "|document" + S + "[.]" + S + "(?:body|documentElement)" + S + "[.]" + S + "addEventListener[(]" + S + QUOTE + "(?:keydown|keyup|keypress)" + QUOTE + S + "," + S
  + "|(?:window|document|globalThis|self|document" + S + "[.]" + S + "(?:body|documentElement))" + S + "[.]" + S + "on(?:keydown|keyup|keypress)" + S + "=(?![=>])" + S
  + ")", "g");
/** A key that presses, in the spellings the A8i census missed: the numpad's Enter, Space by name or as " ", and either by
 *  its code (13, 32). `ENTER` above is the quoted "Enter". */
const PRESS_MORE = [
  new RegExp(QUOTE + "NumpadEnter" + QUOTE),
  new RegExp(QUOTE + "(?:Space|Spacebar)" + QUOTE),
  new RegExp("(?:keyCode|which|charCode)" + S + "[!=]==?" + S + "(?:13|32)(?![0-9])"),
  new RegExp("(?<![0-9])(?:13|32)" + S + "[!=]==?" + S + "[A-Za-z_$.?]*(?:keyCode|which|charCode)"),
  new RegExp("key" + S + "[!=]==?" + S + QUOTE + " " + QUOTE),
  new RegExp(QUOTE + " " + QUOTE + S + "[!=]==?" + S + "[A-Za-z_$.?]*key(?![A-Za-z])"),
];
/** A listener's argument read as a cast, a bare name, a member, or an arrow that only calls something. */
const CAST = new RegExp("^(" + NAME + ")" + S1 + "as" + S1 + "[A-Za-z_$][A-Za-z0-9_$.<>, ]*$");
const BARE = new RegExp("^" + NAME + "$");
const MEMBER = new RegExp("^" + NAME + "(?:" + S + "[?]?[.]" + S + NAME + ")+$");
const WRAPPER = new RegExp("^(?:async" + S1 + ")?(?:[(][^()]*[)]|" + NAME + ")" + S + "=>" + S + "(?:[{]" + S + "(?:return" + S1 + ")?)?("
  + NAME + "(?:" + S + "[?]?[.]" + S + NAME + ")*)" + S + "[(][^()]*[)]" + S + ";?" + S + "[}]?$");
/** A bare call (`isConfirmKey(`), and any call by its own name (`e.preventDefault(` reads as `preventDefault`). */
const CALL = new RegExp(BARE_START + "(" + NAME + ")" + S + "[(]", "g");
const ANY_CALL = new RegExp("(?<![A-Za-z0-9_$])(" + NAME + ")" + S + "[(]", "g");
const IMPORT = new RegExp("import" + S1 + "(?:type" + S1 + ")?[{]([^}]*)[}]" + S + "from" + S + QUOTE + "(" + NOT_QUOTE + "+)" + QUOTE, "g");
const AS = new RegExp(S1 + "as" + S1);
const SPACE_RUN = new RegExp(SPACE + "+", "g");
const KEY_PROP = new RegExp(BARE_START + "onKey(?:Down|Up|Press)(?:Capture)?=[{]", "g");
/** Keywords a call-shaped name can be: no helper of the file. */
const NOT_HELPERS = new Set(["if", "for", "while", "switch", "return", "typeof", "function", "catch", "new", "await", "void", "super", "import"]);

/** A listener's place, and the census's rules: what every reader below takes. */
type Ctx = { file: string; code: string; b: string; at: number; read: (rel: string) => string; c: CensusRules };
/** ⭐ How the census reads, in the world, so the red twin can weaken each part and watch 2.0b see the weakness. */
type CensusRules = {
  /** Does this text read a key that presses? */
  press: (text: string) => boolean;
  /** The definition of `name` that a reference at `at` reaches. */
  reach: (code: string, b: string, name: string, at: number) => RegExpMatchArray | null;
  /** A listener's argument, read to its handler's text; null when it cannot be read. */
  arg: (x: Ctx, from: number, to: number) => string | null;
  /** Read the functions a handler calls along with it. */
  helpers: boolean;
  /** Look past keydown on the window and the document. */
  more: boolean;
  /** A window or document key listener's inline handler is read only when it reads a press (`inlineNamed`). */
  named: boolean;
  /** Follow a helper called through a namespace import (`K.isConfirmKey(e)`). */
  ns: boolean;
  /** May this file's handler read a press? */
  allowed: (x: Ctx, handler: string) => boolean;
};

/** Reads a key that presses: Enter or Space, in any spelling. */
function readsPress(text: string): boolean {
  return ENTER.test(text) || PRESS_MORE.some((re) => re.test(text));
}

/** Every definition of `name` in `code`: `const|let|var name =` and `function name(`, where each starts. */
function definitionsOf(code: string, name: string): RegExpMatchArray[] {
  const n = name.split("$").join("[$]");
  const re = new RegExp(BARE_START + "(?:(?:const|let|var)" + S1 + n + S + "(?::[^=" + NL + "]+)?=" + S
    + "|(?:export" + S1 + ")?(?:async" + S1 + ")?function" + S1 + n + S + "[(])", "g");
  return [...code.matchAll(re)];
}

/** The innermost `{` still open at `pos`, on literal-blanked text, or -1 at the top level. */
function openBraceAt(b: string, pos: number): number {
  const open: number[] = [];
  for (let i = 0; i < pos; i++) {
    if (b[i] === "{") open.push(i);
    else if (b[i] === "}") open.pop();
  }
  return open.length > 0 ? open[open.length - 1] : -1;
}

/**
 * The definition a reference at `at` reaches: the last one before it whose block still holds `at`, else the first such one
 * after it (a function declared below its listener). At `at` = -1 (a module read for a helper), its first top-level one.
 */
function definitionAt(code: string, b: string, name: string, at: number): RegExpMatchArray | null {
  const holds = (d: RegExpMatchArray) => {
    const o = openBraceAt(b, d.index ?? 0);
    return o < 0 || (o < at && closer(b, o) > at);
  };
  const all = definitionsOf(code, name).filter(holds);
  const before = all.filter((d) => (d.index ?? 0) < at);
  return before.length > 0 ? before[before.length - 1] : all.find((d) => (d.index ?? 0) > at) ?? null;
}

/** A definition's text: a function from its name to its closing brace, a binding to the end of its statement. */
function definitionText(code: string, b: string, d: RegExpMatchArray): string | null {
  const at = d.index ?? 0;
  if (d[0].trimEnd().endsWith("(")) {
    const params = at + d[0].length - 1;
    const bodyOpen = b.indexOf("{", closer(b, params));
    const end = bodyOpen < 0 ? -1 : closer(b, bodyOpen);
    return end < 0 ? null : code.slice(at, end + 1);
  }
  return code.slice(at, statementEnd(b, at + d[0].length));
}

/** The handler a name stands for where the listener is, as text; null when the file defines no such name. */
function namedIn(x: Ctx, name: string): string | null {
  const d = x.c.reach(x.code, x.b, name, x.at);
  return d ? definitionText(x.code, x.b, d) : null;
}

/**
 * A listener's argument (from `from` to `to`, its first argument only), read to its handler's text: a cast is read through
 * to its name, a bare name to its definition, an arrow that only calls a name to that name's definition. A member, or an
 * arrow that only calls one, is UNREADABLE: null, so 2.0 fails until the census can read it. Anything else is an inline
 * handler, read as written (`inlineNamed`, below, is what a window or document listener's inline handler must also pass).
 */
/** A call's first argument (from `from` to `to`), as written: up to the first comma outside every bracket. */
function firstArg(x: Ctx, from: number, to: number): string {
  let depth = 0, stop = to;
  for (let i = from; i < to; i++) {
    const ch = x.b[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (ch === "," && depth === 0) { stop = i; break; }
  }
  return x.code.slice(from, stop).trim();
}

function readArg(x: Ctx, from: number, to: number): string | null {
  const text = firstArg(x, from, to);
  const cast = CAST.exec(text);
  if (cast) return namedIn(x, cast[1]);
  if (BARE.test(text)) return namedIn(x, text);
  if (MEMBER.test(text)) return null;
  const wrap = WRAPPER.exec(text);
  if (wrap) return wrap[1].includes(".") ? null : namedIn(x, wrap[1]);
  return text;
}

/**
 * ⭐ A8i-2 · A WINDOW OR DOCUMENT KEY LISTENER'S INLINE HANDLER IS READ ONLY WHEN IT READS A PRESS (review 2026-10-07).
 * Inline, it may act through what it calls — `(e) => onKeyRef.current?.(e)`, `(e) => void keys.onKey(e)`,
 * `(e) => { e.stopPropagation(); keys.onKey(e); }` — and the census cannot follow a member, so one that reads no press
 * itself is UNREAD (2.0 fails), and one that reads a press is read (2.1 fails on it). Every key listener in src/ is a
 * named function (2026-10-07): a new one gets a name, and the census reads it. A React key prop is not held to this
 * (2.6 reads it as written): it sits on an element, and acts only on keys pressed inside it.
 */
function inlineNamed(x: Ctx, from: number, to: number, handler: string | null): string | null {
  if (handler === null) return null;
  const text = firstArg(x, from, to);
  const viaName = CAST.test(text) || BARE.test(text) || MEMBER.test(text) || WRAPPER.test(text);
  return viaName || x.c.press(withHelpers(x, handler)) ? handler : null;
}

/** The src module `spec` names from `x`'s file, read; null when it is not a module in src. */
function moduleAt(x: Ctx, spec: string): Ctx | null {
  const base = spec.startsWith("@/") ? "src/" + spec.slice(2) : spec.startsWith(".") ? posix.join(posix.dirname(x.file), spec) : null;
  if (base === null) return null;
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    let theirs = "";
    try { theirs = decomment(x.read(base + ext)); } catch { continue; }
    if (theirs === "") continue;
    return { file: base + ext, code: theirs, b: blankLiterals(theirs), at: -1, read: x.read, c: x.c };
  }
  return null;
}

/** The module a file imports `name` from, read, and the name's text there; null when it is not imported from src. */
function importedFrom(x: Ctx, name: string): { y: Ctx; text: string } | null {
  for (const m of x.code.matchAll(IMPORT)) {
    for (const part of m[1].split(",")) {
      const words = part.trim().replace(/^type /, "").split(AS);
      const exported = (words[0] ?? "").trim(), local = (words[1] ?? words[0] ?? "").trim();
      if (local !== name || exported === "") continue;
      const y = moduleAt(x, m[2]);
      const text = y === null ? null : namedIn(y, exported);
      return y === null || text === null ? null : { y, text };
    }
  }
  return null;
}

/** ⭐ A8i-2 · a namespace import (`import * as K from "@/lib/keys"`) and a call through it (`K.isConfirmKey(e)`): the
 *  helper is read in its module like any other (review 2026-10-07: the A8i-2 draft followed only `{ named }` imports). */
const NS_IMPORT = new RegExp("import" + S1 + "[*]" + S1 + "as" + S1 + "(" + NAME + ")" + S1 + "from" + S + QUOTE + "(" + NOT_QUOTE + "+)" + QUOTE, "g");
const NS_CALL = new RegExp(BARE_START + "(" + NAME + ")" + S + "[.]" + S + "(" + NAME + ")" + S + "[(]", "g");
function throughNamespace(x: Ctx, ns: string, name: string): { y: Ctx; text: string } | null {
  for (const m of x.code.matchAll(NS_IMPORT)) {
    if (m[1] !== ns) continue;
    const y = moduleAt(x, m[2]);
    const text = y === null ? null : namedIn(y, name);
    return y === null || text === null ? null : { y, text };
  }
  return null;
}

/**
 * ⭐ THE KEY TEST BEHIND A HELPER. A handler that asks `isConfirmKey(e)` reads Enter all the same: every function it calls by
 * name, defined in its own file or imported from one in src, is read along with it, and theirs, three calls deep.
 */
function withHelpers(x: Ctx, text: string, depth = 3, seen: Set<string> = new Set()): string {
  if (!x.c.helpers || depth === 0) return text;
  let out = text;
  for (const m of blankLiterals(text).matchAll(CALL)) {
    const name = m[1];
    if (NOT_HELPERS.has(name) || seen.has(x.file + ":" + name)) continue;
    seen.add(x.file + ":" + name);
    const own = namedIn(x, name);
    if (own !== null) { out += NL + withHelpers(x, own, depth - 1, seen); continue; }
    const from = importedFrom(x, name);
    if (from) out += NL + withHelpers(from.y, from.text, depth - 1, seen);
  }
  if (x.c.ns) for (const m of blankLiterals(text).matchAll(NS_CALL)) {
    const key = x.file + ":" + m[1] + "." + m[2];
    if (seen.has(key)) continue;
    seen.add(key);
    const from = throughNamespace(x, m[1], m[2]);
    if (from) out += NL + withHelpers(from.y, from.text, depth - 1, seen);
  }
  return out;
}

/** The calls a handler's body makes, by name (a method by its own name). */
function callsIn(handler: string): string[] {
  const body = handler.slice(handler.indexOf("{") + 1);
  return [...blankLiterals(body).matchAll(ANY_CALL)].map((m) => m[1]).filter((n) => !NOT_HELPERS.has(n));
}

/** Whitespace runs to one space: how a pinned line is compared. */
const squashed = (s: string) => s.replace(SPACE_RUN, " ").trim();

/** The dropdown's scope line, and the calls the key guard's handlers may make. */
const SELECT_SCOPE = "if (at !== document.body && !triggerRef.current?.contains(at) && !listRef.current?.contains(at)) return;";
const GUARD_CALLS = new Set(["keyTargetOf", "whereIs", "openLayers", "swallowsKey", "swallowsSpaceUp", "inBeat", "currentBeat", "now", "preventDefault", "stopPropagation"]);

/**
 * ⭐ THE TWO WINDOW LISTENERS ALLOWED TO READ A PRESS, NAMED, EACH PINNED TO WHAT MAKES IT SAFE (this replaces A8i's
 * "returns first for a key pressed outside its own control", which any `.contains(` satisfied):
 *   · the dropdown's open list (`select.tsx`): its scope line, verbatim, and the return before any Enter;
 *   · the key guard (`key-guard.tsx`): its handlers call nothing but the decision, `preventDefault` and `stopPropagation`
 *     — and what that decision does with the key it is handed is run, not read, in §4 (4.4).
 * Any other listener anywhere that reads Enter or Space fails 2.1, whatever it checks first. (Modal's own held-key line,
 * the third until A8i-2's review, is gone: the key guard swallows a held key first, page-wide.)
 */
function pressReaderAllowed(x: Ctx, handler: string): boolean {
  const h = squashed(handler);
  if (x.file === SELECT) return h.includes(SELECT_SCOPE) && scopedToItsControl(handler);
  if (x.file === GUARD) return callsIn(handler).every((n) => GUARD_CALLS.has(n));
  return false;
}

/** ⭐ 2.0b's fixture: each shape the A8i census passed, in a file of its own, and what the census must say of each of its
 *  listeners: [its handler read, it reads a press]. */
const SHAPES: Record<string, { want: Array<[boolean, boolean]>; code: string[] }> = {
  "src/zz/cast.tsx": { want: [[true, true]], code: [
    "useEffect(() => {",
    '  const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") onConfirm(); };',
    "  window.addEventListener('keydown', onKey as EventListener);",
    "}, []);",
  ] },
  "src/zz/member.tsx": { want: [[false, false]], code: [
    "useEffect(() => { window.addEventListener('keydown', handlers.onKey); }, []);",
  ] },
  "src/zz/wrap-member.tsx": { want: [[false, false]], code: [
    "useEffect(() => { window.addEventListener('keydown', (e) => onKeyRef.current(e)); }, []);",
  ] },
  "src/zz/wrap-name.tsx": { want: [[true, true]], code: [
    'function onEnterKey(e: KeyboardEvent) { if (e.key === "Enter") go(); }',
    "useEffect(() => { window.addEventListener('keydown', (e) => onEnterKey(e)); }, []);",
  ] },
  "src/zz/shadow.tsx": { want: [[true, false], [true, true]], code: [
    "function First() {",
    "  useEffect(() => {",
    '    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };',
    "    window.addEventListener('keydown', onKey);",
    "  }, []);",
    "}",
    "function Second() {",
    "  useEffect(() => {",
    '    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") fire(); };',
    "    window.addEventListener('keydown', onKey);",
    "  }, []);",
    "}",
  ] },
  "src/zz/keycode.tsx": { want: [[true, true]], code: [
    "const onKey = (e: KeyboardEvent) => { if (e.keyCode === 13) onConfirm(); };",
    "document.addEventListener('keydown', onKey);",
  ] },
  "src/zz/helper.tsx": { want: [[true, true]], code: [
    'const isConfirmKey = (e: KeyboardEvent) => e.key === "Enter";',
    "const onKey = (e: KeyboardEvent) => { if (isConfirmKey(e)) onConfirm(); };",
    "window.addEventListener('keydown', onKey);",
  ] },
  "src/zz/imported.tsx": { want: [[true, true]], code: [
    'import { isConfirmKey } from "@/lib/zz-keys";',
    "const onKey = (e: KeyboardEvent) => { if (isConfirmKey(e)) onConfirm(); };",
    "window.addEventListener('keydown', onKey);",
  ] },
  "src/zz/keyup.tsx": { want: [[true, true]], code: [
    'const onUp = (e: KeyboardEvent) => { if (e.key === "Enter") fire(); };',
    "window.addEventListener('keyup', onUp);",
  ] },
  "src/zz/assigned.tsx": { want: [[true, true]], code: [
    'window.onkeydown = (e) => { if (e.key === " ") fire(); };',
  ] },
  "src/zz/body.tsx": { want: [[true, false]], code: [
    'const onBody = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };',
    "document.body.addEventListener('keydown', onBody);",
  ] },
  "src/zz/scoped.tsx": { want: [[true, true]], code: [
    "const onKey = (e: KeyboardEvent) => {",
    "  if (!panelRef.current?.contains(e.target as Node)) return;",
    '  if (e.key === "Enter" && !pending) { e.preventDefault(); onConfirm(); }',
    "};",
    "window.addEventListener('keydown', onKey);",
  ] },
  /* ⭐ A8i-2 review (2026-10-07) — shapes the draft's census still passed: inline handlers that act through a member, a
     helper behind a namespace import, and a handler that is a parameter (judged by another definition of its name). */
  "src/zz/wrap-optional.tsx": { want: [[false, false]], code: [
    "useEffect(() => { window.addEventListener('keydown', (e) => onKeyRef.current?.(e)); }, []);",
  ] },
  "src/zz/void-call.tsx": { want: [[false, false]], code: [
    "useEffect(() => { window.addEventListener('keydown', (e) => void keys.onKey(e)); }, []);",
  ] },
  "src/zz/two-statements.tsx": { want: [[false, false]], code: [
    "useEffect(() => { window.addEventListener('keydown', (e) => { e.stopPropagation(); keys.onKey(e); }); }, []);",
  ] },
  "src/zz/namespace.tsx": { want: [[true, true]], code: [
    'import * as K from "@/lib/zz-keys";',
    "const onKey = (e: KeyboardEvent) => { if (K.isConfirmKey(e)) onConfirm(); };",
    "window.addEventListener('keydown', onKey);",
  ] },
  "src/zz/param.tsx": { want: [[true, false], [false, false]], code: [
    "function First() {",
    "  useEffect(() => {",
    '    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };',
    "    window.addEventListener('keydown', onKey);",
    "  }, []);",
    "}",
    "function useWindowKey(onKey: (e: KeyboardEvent) => void) {",
    "  useEffect(() => { window.addEventListener('keydown', onKey); }, [onKey]);",
    "}",
  ] },
};
/** The src/lib helper the imported shape reads its key test from. */
const SHAPE_LIB: Record<string, string> = { "src/lib/zz-keys.ts": 'export function isConfirmKey(e: KeyboardEvent) { return e.key === "Enter"; }' };

/** 2.0b: the census over the fixture, in this world's reading. */
function censusShapes(w: World): { got: Record<string, Array<[boolean, boolean]>>; want: Record<string, Array<[boolean, boolean]>> } {
  const files: Record<string, string> = { ...SHAPE_LIB };
  for (const [f, s] of Object.entries(SHAPES)) files[f] = s.code.join(NL);
  const fw: World = { ...w, read: (rel) => { const t = files[rel]; if (t === undefined) throw new Error("no fixture " + rel); return t; } };
  const got: Record<string, Array<[boolean, boolean]>> = {}, want: Record<string, Array<[boolean, boolean]>> = {};
  for (const [f, s] of Object.entries(SHAPES)) {
    got[f] = listenersIn(f, files[f], fw).map((l): [boolean, boolean] => [l.handler !== null, l.enter]);
    want[f] = s.want;
  }
  return { got, want };
}

/** 2.6: every React key prop in a file whose handler reads a press — or cannot be read (A8i-2: `onKeyDown={keys.onKeyDown}`
 *  passed as text with no Enter in it) — as "file:line". */
function reactKeyPressProps(file: string, w: World): string[] {
  const code = decomment(w.read(file)), b = blankLiterals(code);
  const out: string[] = [];
  for (const m of code.matchAll(KEY_PROP)) {
    const open = (m.index ?? 0) + m[0].length - 1;
    const end = closer(b, open);
    const line = code.slice(0, open).split(NL).length;
    if (end < 0) { out.push(`${file}:${line} (unread)`); continue; }
    const x: Ctx = { file, code, b, at: open, read: w.read, c: w.census };
    const text = w.census.arg(x, open + 1, end);
    if (text === null) out.push(`${file}:${line} (unread)`);
    else if (w.census.press(withHelpers(x, text))) out.push(`${file}:${line}`);
  }
  return out;
}
/** The files that draw a dialog (`Modal`, `ConfirmModal`, `ConfirmDialog`): 2.6 reads their React key props. */
const DIALOG_TAG = /<(?:Modal|ConfirmModal|ConfirmDialog)\b/;

/** The first definition of `name` in decommented `code`, as text, or "": what a check reads of a named function. */
function definitionNamed(code: string, name: string): string {
  const d = definitionsOf(code, name)[0];
  return d ? definitionText(code, blankLiterals(code), d) ?? "" : "";
}

/** Runs `f`, or answers null when it throws: a planted rule that throws is a failed check, never a crashed run. */
function safely<T>(f: () => T): T | null {
  try { return f(); } catch { return null; }
}

// ── ⭐ A8i-2 · THE GUARD AND THE STACK, BUILT FROM THEIR TEXT AND RUN (review 2026-10-07) ────────────────────────────────
//
// 🔴 The A8i-2 draft held the key guard's inputs and the close's wiring by TEXT: a review deleted the line that arms the
// confirm the seal uncovers (W2's whole mechanism), the hand-off, the arming of a first focus, and fed the guard `false`
// for the repeat — each kept every check green. So the guard (`key-guard.tsx`) and leaving (`leaveLayer`,
// `modal-stack.ts`) are now BUILT FROM THE WORLD'S TEXT (esbuild, in memory) and RUN on stand-ins: a plant that edits
// either file edits the code that runs, and 4.4 and 5.9 see what it does.

type Mod = Record<string, any>;
const builtCode = new Map<string, string>();
/** `text` (a `.ts`/`.tsx` module) built and evaluated in memory: its imports from `deps`, its free globals from `globals`. */
function buildModule(file: string, text: string, deps: Record<string, unknown>, globals: Record<string, unknown> = {}): Mod {
  let code = builtCode.get(text);
  if (code === undefined) {
    code = transformSync(text, { loader: file.endsWith(".tsx") ? "tsx" : "ts", format: "cjs", target: "es2022" }).code;
    builtCode.set(text, code);
  }
  const mod: { exports: Mod } = { exports: {} };
  const need = (spec: string) => {
    if (spec in deps) return deps[spec];
    throw new Error(`${file} imports ${spec}, which this suite does not provide`);
  };
  const names = Object.keys(globals);
  new Function("require", "module", "exports", ...names, code)(need, mod, mod.exports, ...names.map((n) => globals[n]));
  return mod.exports;
}
/** A fresh held-key rule and dialog stack (its registry empty, its beat unarmed), built from the world's text. */
function freshStack(w: World): { hk: Mod; ms: Mod } {
  const hk = buildModule(RULE, w.read(RULE), {});
  const ms = buildModule(STACK, w.read(STACK), { "./held-key": hk });
  return { hk, ms };
}
/** An element as `keyTargetOf` reads one. */
const stand = (tagName: string, attrs: Record<string, string> = {}) =>
  ({ tagName, localName: tagName.toLowerCase(), isContentEditable: false, getAttribute: (n: string) => attrs[n] ?? null, name: tagName + JSON.stringify(attrs) });

/**
 * 4.4 · THE KEY GUARD, RUN: `key-guard.tsx` built from the world's text against a window that records its listeners and a
 * clock the run moves, then keys fired through the very handlers it installed. Each answer is whether the key was
 * prevented AND stopped ("swallowed") or touched not at all ("passed").
 */
function guardRun(w: World): Record<string, boolean> | null {
  return safely(() => {
    const { hk, ms } = freshStack(w);
    const added: Array<{ type: string; fn: (e: unknown) => void; capture: unknown }> = [];
    let clock = 1000;
    const win = { addEventListener: (type: string, fn: (e: unknown) => void, capture?: unknown) => { added.push({ type, fn, capture }); } };
    const kg = buildModule(GUARD, w.read(GUARD), { react: { useEffect: () => {} }, "@/lib/held-key": hk, "@/lib/modal-stack": ms },
      { window: win, performance: { now: () => clock } });
    kg.installKeyGuard();
    kg.installKeyGuard();
    const down = added.find((a) => a.type === "keydown"), up = added.find((a) => a.type === "keyup");
    if (!down || !up) return { listens: false };
    const fire = (fn: (e: unknown) => void, key: string, target: unknown, repeat = false, composing = false) => {
      let prevented = false, stopped = false;
      fn({ key, repeat, target, isComposing: composing, keyCode: composing ? 229 : key === "Enter" ? 13 : 32,
        preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; } });
      return prevented && stopped ? "swallowed" : !prevented && !stopped ? "passed" : "half";
    };
    const button = stand("BUTTON"), dial = stand("DIV", { role: "slider" }), field = stand("INPUT", { type: "text" });
    const area = stand("TEXTAREA"), ok = stand("BUTTON"), page = stand("BODY");
    const pos = new Map<unknown, number>([[button, 1], [dial, 2], [field, 3], [ok, 10]]);
    const box = { contains: (n: unknown) => n === ok, compareDocumentPosition: (n: unknown) => ((pos.get(n) ?? -1) > 10 ? 4 : 2) };
    const r: Record<string, boolean> = {};
    r.listens = added.length === 2 && down.capture === true && up.capture === true;
    // No dialog open: a held key presses once — its repeats are swallowed wherever they land; a fresh press is untouched.
    r.heldOnButton = fire(down.fn, "Enter", button, true) === "swallowed" && fire(down.fn, " ", button, true) === "swallowed";
    r.heldOnDial = fire(down.fn, " ", dial, true) === "swallowed";
    r.freshPasses = fire(down.fn, "Enter", button) === "passed" && fire(down.fn, "Enter", page) === "passed";
    r.typingPasses = fire(down.fn, " ", field, true) === "passed" && fire(down.fn, "Enter", area, true) === "passed";
    r.composingPasses = fire(down.fn, "Enter", field, true, true) === "passed";
    r.otherKeysPass = fire(down.fn, "Escape", button, true) === "passed";
    // A dialog open: a fresh press behind it is swallowed, one in it is not — until it takes focus and arms its beat.
    const layer = { z: 100, seq: 1, root: () => box, restoreTo: button, focusIn: () => {} };
    ms.openLayer(layer);
    r.behindSwallowed = fire(down.fn, "Enter", button) === "swallowed" && fire(down.fn, " ", dial) === "swallowed";
    r.topPasses = fire(down.fn, "Enter", ok) === "passed";
    ms.armBeat(box, clock);
    clock += 100;
    r.beatSwallows = fire(down.fn, "Enter", ok) === "swallowed";
    clock += ms.ARMING_MS;
    r.beatEnds = fire(down.fn, "Enter", ok) === "passed";
    ms.closeLayer(layer);
    // A Space presses only where it went down.
    r.spaceUpElsewhere = fire(down.fn, " ", dial) === "passed" && fire(up.fn, " ", ok) === "swallowed";
    r.spaceUpHere = fire(down.fn, " ", button) === "passed" && fire(up.fn, " ", button) === "passed";
    return r;
  });
}

/**
 * 5.9 · LEAVING, RUN: `leaveLayer` built from the world's text, on stand-in dialogs and a page that records where focus
 * went — the five closes A8i-2 is for. Each scenario starts on a fresh stack.
 */
function leaveRun(w: World): Record<string, boolean> | null {
  return safely(() => {
    const r: Record<string, boolean> = {};
    const pos = new Map<unknown, number>();
    /** A control: it contains itself (an element's `contains` is inclusive) and knows its place in the page. */
    const el = (name: string, p: number) => {
      const n = { name, contains: (o: unknown) => o === n, compareDocumentPosition: (o: unknown) => ((pos.get(o) ?? -1) > p ? 4 : 2) };
      pos.set(n, p);
      return n;
    };
    const boxOf = (p: number, inside: unknown[]) => ({
      contains: (n: unknown) => inside.includes(n),
      compareDocumentPosition: (n: unknown) => ((pos.get(n) ?? -1) > p ? 4 : 2),
    });
    const body = el("the page itself", 0);
    const pageAt = (start: unknown, clock: { t: number }) => {
      const page = { active: start, focused: [] as unknown[] };
      return Object.assign(page, {
        activeElement: () => page.active,
        isNowhere: (n: unknown) => n === null || n === undefined || n === body,
        focus: (n: unknown) => { page.focused.push(n); page.active = n; },
        now: () => clock.t,
      });
    };
    type L = { z: number; seq: number; root: () => unknown; restoreTo: unknown; focusIn: () => void; safe?: () => unknown };
    const layer = (z: number, seq: number, root: unknown, restoreTo: unknown, safe?: unknown): L & { focusedIn: number } => {
      const l = { z, seq, root: () => root, restoreTo, focusedIn: 0, focusIn: () => { l.focusedIn += 1; } } as L & { focusedIn: number };
      if (safe !== undefined) l.safe = () => safe;
      return l;
    };

    // W2 — the Sell confirm open (focus on its money button, "Uza"), the win seal over it, Enter on the seal's "Endelea".
    {
      const { ms } = freshStack(w);
      const clock = { t: 5000 };
      const sellNow = el("Sell now", 1), uza = el("Uza", 10), keep = el("Hifadhi nafasi", 11), endelea = el("Endelea", 20);
      const confirmBox = boxOf(10, [uza, keep]), sealBox = boxOf(20, [endelea]);
      const confirm = layer(100, 1, confirmBox, sellNow, keep), seal = layer(1700, 2, sealBox, uza);
      ms.openLayer(confirm); ms.openLayer(seal);
      const page = pageAt(endelea, clock);
      ms.leaveLayer(seal, page);
      const beat = ms.currentBeat();
      r.w2WayOut = page.focused.length === 1 && page.focused[0] === keep;
      r.w2Armed = ms.inBeat(beat, keep, clock.t + 60) === true && ms.inBeat(beat, uza, clock.t + 60) === true && ms.inBeat(beat, keep, clock.t + ms.ARMING_MS) === false;
      r.w2Off = ms.openLayers().length === 1 && ms.isTopLayer(confirm) === true;
    }
    // The same close over a dialog that names no way out: focus goes back where it was, and that dialog is armed.
    {
      const { ms } = freshStack(w);
      const clock = { t: 5000 };
      const back = el("a button in the dialog", 10), cont = el("Endelea", 20);
      const lowerBox = boxOf(10, [back]), sealBox = boxOf(20, [cont]);
      const lower = layer(100, 1, lowerBox, null), seal = layer(1700, 2, sealBox, back);
      ms.openLayer(lower); ms.openLayer(seal);
      const page = pageAt(cont, clock);
      ms.leaveLayer(seal, page);
      r.noWayOutBack = page.focused.length === 1 && page.focused[0] === back && ms.inBeat(ms.currentBeat(), back, clock.t + 60) === true;
    }
    // SL — the bet confirm's quote lapses UNDER the seal (focus in the seal), then the seal closes.
    {
      const { ms } = freshStack(w);
      const clock = { t: 5000 };
      const dial = el("the dial", 1), confirmBtn = el("Thibitisha", 10), cancel = el("Ghairi", 11), endelea = el("Endelea", 20);
      const confirmBox = boxOf(10, [confirmBtn, cancel]), sealBox = boxOf(20, [endelea]);
      const confirm = layer(100, 1, confirmBox, dial, cancel), seal = layer(1700, 2, sealBox, confirmBtn);
      ms.openLayer(confirm); ms.openLayer(seal);
      const page = pageAt(endelea, clock);
      ms.leaveLayer(confirm, page);
      r.slLapseMovesNothing = page.focused.length === 0 && seal.restoreTo === dial;
      clock.t += 2000;
      ms.leaveLayer(seal, page);
      r.slBackToDialArmed = page.focused.length === 1 && page.focused[0] === dial && ms.inBeat(ms.currentBeat(), dial, clock.t + 60) === true;
    }
    // The receipt closes with nothing left open: focus back to UP, armed — a double Enter is one bet.
    {
      const { ms } = freshStack(w);
      const clock = { t: 5000 };
      const upBtn = el("UP", 1), keepPlaying = el("Keep playing", 10);
      const receipt = layer(100, 1, boxOf(10, [keepPlaying]), upBtn);
      ms.openLayer(receipt);
      const page = pageAt(keepPlaying, clock);
      ms.leaveLayer(receipt, page);
      r.receiptBackArmed = page.focused.length === 1 && page.focused[0] === upBtn && ms.inBeat(ms.currentBeat(), upBtn, clock.t + 60) === true
        && ms.inBeat(ms.currentBeat(), upBtn, clock.t + ms.ARMING_MS) === false;
    }
    // The seal opened with focus on the page itself (a poll tick) closes: focus goes nowhere, and nothing is armed.
    {
      const { ms } = freshStack(w);
      const clock = { t: 5000 };
      const endelea = el("Endelea", 20), somewhere = el("a button on the page", 1);
      const seal = layer(1700, 1, boxOf(20, [endelea]), body);
      ms.openLayer(seal);
      const page = pageAt(endelea, clock);
      ms.leaveLayer(seal, page);
      r.pageItselfArmsNothing = page.focused.length === 0 && ms.inBeat(ms.currentBeat(), somewhere, clock.t + 60) === false;
    }
    // A covered dialog that still held focus closes (it opened a moment before the seal over it): the seal takes focus.
    {
      const { ms } = freshStack(w);
      const clock = { t: 5000 };
      const inLower = el("a button under the seal", 10), endelea = el("Endelea", 20);
      const lower = layer(100, 1, boxOf(10, [inLower]), null), seal = layer(1700, 2, boxOf(20, [endelea]), inLower);
      ms.openLayer(lower); ms.openLayer(seal);
      const page = pageAt(inLower, clock);
      ms.leaveLayer(lower, page);
      r.coveredHandsToTop = seal.focusedIn === 1 && page.focused.length === 0;
    }
    return r;
  });
}

/**
 * ⭐ A8i-2 · 2.8: EVERY KEY EVENT NAMED IN src/ IS ONE THE CENSUS READS (review 2026-10-07). The census reads key
 * listeners on the window, the document and the page; one added through a helper (`on(t, "keydown", h)`), on a variable
 * target, under a constant, or on an element inside a money dialog, it never saw. Every one of them names its event
 * somewhere, so the names are counted instead: each literal "keydown", "keyup" or "keypress" in src/ must be the first
 * argument of an add/removeEventListener on the window, the document or the page, or one of the element listeners named
 * below, on a control of its own, which act only on a key pressed on it. Returns the names that are neither, as
 * "file:line: text".
 */
const ELEMENT_KEY_LISTENERS: Array<{ file: string; text: string; why: string }> = [
  { file: "src/components/layout/needle.tsx", text: 'on(hit, "keydown",',
    why: "the needle's own hit area: Enter and Space there kick the needle (no money), and only a key pressed on it reaches it" },
];
const KEY_EVENT_NAME = new RegExp(QUOTE + "(?:keydown|keyup|keypress)" + QUOTE, "g");
const READ_TARGET = new RegExp("(?:window|document|globalThis|self|document" + S + "[.]" + S + "(?:body|documentElement))" + S + "[.]" + S
  + "(?:add|remove)EventListener[(]" + S + "$");
const ON_ASSIGN = new RegExp("[.]" + S + "on(?:keydown|keyup|keypress)" + S + "=(?![=>])", "g");
const READ_ASSIGN = new RegExp("(?:window|document|globalThis|self|document" + S + "[.]" + S + "(?:body|documentElement))" + S + "$");
function unreadKeyEvents(w: World): string[] {
  const out: string[] = [];
  for (const f of SRC) {
    const raw = w.read(f);
    if (!/key(?:down|up|press)/.test(raw)) continue;
    const code = decomment(raw);
    const lineOf = (at: number) => code.slice(0, at).split(NL).length;
    const textAt = (at: number) => squashed(code.slice(code.lastIndexOf(NL, at) + 1, code.indexOf(NL, at) < 0 ? code.length : code.indexOf(NL, at)));
    for (const m of code.matchAll(KEY_EVENT_NAME)) {
      const at = m.index ?? 0;
      if (READ_TARGET.test(code.slice(Math.max(0, at - 160), at))) continue;
      const text = textAt(at);
      if (ELEMENT_KEY_LISTENERS.some((e) => e.file === f && text.includes(e.text))) continue;
      out.push(`${f}:${lineOf(at)}: ${text.slice(0, 90)}`);
    }
    for (const m of code.matchAll(ON_ASSIGN)) {
      const at = m.index ?? 0;
      if (READ_ASSIGN.test(code.slice(Math.max(0, at - 80), at))) continue;
      out.push(`${f}:${lineOf(at)}: ${textAt(at).slice(0, 90)}`);
    }
  }
  return out;
}

export type Listener = { file: string; line: number; handler: string | null; enter: boolean };

/** Every key listener on the window, the document or the page in one file, its handler resolved to text in the same file,
 *  as this world's census reads it (A8i-2). */
function listenersIn(file: string, raw: string, w: World = REAL): Listener[] {
  const code = decomment(raw);
  const b = blankLiterals(code);
  const out: Listener[] = [];
  for (const m of [...code.matchAll(LISTEN), ...(w.census.more ? code.matchAll(MORE_LISTEN) : [])]) {
    const at = m.index!;
    const line = code.slice(0, at).split("\n").length;
    const argAt = at + m[0].length;
    const name = /^([A-Za-z_$][\w$]*)\s*[,)]/.exec(code.slice(argAt))?.[1];
    let handler: string | null = null;
    if (!name) {
      /* ⭐ A8i-2 · an `on…` assignment's handler runs to the end of its statement, a call's to its closing bracket; the
         argument is read by the world's reader (`readArg`), which fails closed on what it cannot read. */
      const assigned = m[0].trimEnd().endsWith("=");
      const end = assigned ? statementEnd(b, argAt) : closer(b, code.indexOf("(", at));
      const x0: Ctx = { file, code, b, at, read: w.read, c: w.census };
      handler = end < 0 ? null : w.census.arg(x0, argAt, end);
      if (w.census.named && end >= 0) handler = inlineNamed(x0, argAt, end, handler);
    } else {
      /* ⭐ A8i-2 · THE NAME IS READ WHERE THE LISTENER STANDS (review 2026-10-07: every `onKey` in a file was judged by the
         first `onKey` in it, so a second component's Enter handler of that name was never read). The definition the
         listener reaches is read (`definitionAt`): the last one before it whose block still holds it. A name no definition
         reaches — a parameter, an import — is UNREAD, and fails 2.0: it is never judged by another definition of its name. */
      const reached = w.census.reach(code, b, name, at);
      if (reached) handler = definitionText(code, b, reached);
    }
    /* ⭐ A8i-2 · a press is Enter or Space in any spelling, read through the handler's helpers (`withHelpers`), and only
       the three named readers may read one (`pressReaderAllowed`). */
    const x: Ctx = { file, code, b, at, read: w.read, c: w.census };
    out.push({ file, line, handler, enter: handler !== null && w.census.press(withHelpers(x, handler)) && !w.census.allowed(x, handler) });
  }
  return out;
}

const baseCensus = new Map<string, { raw: string; found: Listener[] }>();
/** The census over all of `src/`, reusing each file's result while its text is the one already scanned. */
function census(w: World): Listener[] {
  const all: Listener[] = [];
  for (const f of SRC) {
    const raw = w.read(f);
    /* ⭐ A8i-2 · only the real tree's results are reused: a listener's reading now follows its helpers into other files,
       so a plant in one of those changes it although the listener's own file is unchanged. */
    let hit = w === REAL ? baseCensus.get(f) : undefined;
    if (!hit || hit.raw !== raw) {
      hit = { raw, found: /addEventListener|[.]onkey/.test(raw) ? listenersIn(f, raw, w) : [] };
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
    el("DIV", { role: "button" }), el("SPAN", { role: "switch" }), el("DIV", { role: "tab" }), el("DIV", { role: "slider" })];
  ok("1.4 · a held Space on a button, a summary, a checkbox, a radio, a submit and role=button/switch/tab/slider is swallowed (the bet dial is a slider, and Space on it opens the confirm — A8i-2); the first Space is not",
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

  /* ⭐ A8i-2 · 1.7 — keyTargetOf was never run (review 2026-10-07): a lowercase tag, a dropped role or a null answer would
     have let a held Space on the dial press Confirm on release with every check green. It runs here on element-shaped
     stand-ins, through the rule, as the guard runs it. */
  const elem = (tagName: string, attrs: Record<string, string> = {}, editable = false) =>
    ({ tagName, localName: tagName.toLowerCase(), isContentEditable: editable, getAttribute: (n: string) => attrs[n] ?? null }) as unknown as EventTarget;
  const T = (x: EventTarget | null) => { try { return w.kto(x); } catch { return null; } };
  const heldSpace = [elem("BUTTON"), elem("INPUT", { type: "checkbox" }), elem("DIV", { role: "switch" }), elem("SUMMARY")];
  const heldSpacePasses = [elem("INPUT", { type: "text" }), elem("DIV", {}, true), elem("A", { href: "/x" }), elem("TEXTAREA")];
  ok("1.7 · keyTargetOf reads a real element as the rule needs it: a held Space on a button, a checkbox, a role=switch and a summary is swallowed; in a text field, an editable region, on a link and in a textarea it passes; a held Enter in an editable region passes; what is no element reads as none",
    heldSpace.every((t) => R(" ", true, T(t)) === true) && heldSpacePasses.every((t) => R(" ", true, T(t)) === false)
      && R("Enter", true, T(elem("DIV", {}, true))) === false && T(null) === null && T({} as EventTarget) === null,
    JSON.stringify([...heldSpace, ...heldSpacePasses].map((t) => T(t))));
  const P = (key: string, t: HK.KeyTarget | null) => { try { return w.presses(key, t); } catch { return null; } };
  const grid = [BTN, el("A"), el("BODY"), el("TEXTAREA"), el("DIV", { editable: true }), el("INPUT", { type: "text" }),
    el("INPUT", { type: "checkbox" }), el("DIV", { role: "tab" }), null];
  ok("1.8 · the press test (pressesSomething) is the held-key rule without the repeat — Enter presses anywhere but where it types a new line, Space only what Space presses, no other key presses — so the guard's other rules refuse exactly what a held repeat would press",
    ["Enter", " ", "Escape", "a"].every((k) => grid.every((t) => P(k, t) === R(k, true, t)))
      && P("Enter", el("TEXTAREA")) === false && P(" ", el("A")) === false && P("Enter", BTN) === true && P("Tab", BTN) === false,
    JSON.stringify(grid.map((t) => [P("Enter", t), P(" ", t)])));

  log("§2 · the dialogs");
  const found = census(w);
  const enter = found.filter((l) => l.enter);
  const unresolved = found.filter((l) => l.handler === null);
  const control = listenersIn("control.tsx",
    "useEffect(() => {\n  const onKey = (e: KeyboardEvent) => {\n    if (e.key === \"Enter\") { e.preventDefault(); onConfirm(); }\n  };\n  window.addEventListener(\"keydown\", onKey);\n}, [open]);\n"
    + "useEffect(() => {\n  const onList = (e: KeyboardEvent) => {\n    if (!listRef.current?.contains(e.target as Node)) return;\n    if (e.key === \"Enter\") pick();\n  };\n  window.addEventListener(\"keydown\", onList);\n}, [open]);\n");
  ok("2.0 · fixture · the census finds the key listeners in src/, resolves every handler, and flags a planted Enter one — and one scoped to its own control too: outside the two named readers a scope is no exemption (A8i-2)",
    found.length >= 10 && unresolved.length === 0 && control.length === 2 && control[0].enter && control[1].enter,
    `${found.length} listeners · unresolved: ${unresolved.map((l) => `${l.file}:${l.line}`).join(", ") || "none"} · control: ${JSON.stringify(control.map((l) => l.enter))}`);
  ok("2.1 · ★ no key listener on the window, the document or the page reads Enter or Space — in any spelling, through any helper the census can follow — save the two named readers, each pinned to what makes it safe: the dropdown's open list (it returns first for a key pressed outside it) and the key guard (it only swallows, and 4.4 runs it)",
    enter.length === 0, enter.map((l) => `${l.file}:${l.line}`).join(", "));

  /* ⭐ A8i-2 · 2.0b — the census's own control: each shape the A8i census passed, in a file of its own, read now. */
  const shapes = censusShapes(w);
  ok("2.0b · fixture · the census reads what A8i's passed — a cast handler, an arrow that calls a name, a second component's handler of the same name, keyCode 13, a key test in a helper of the file, of src/lib or behind a namespace import, a keyup listener, an on-handler assignment acting on Space, a listener on the body, a listener scoped to its own panel — and fails closed on a member, an arrow that calls one, an inline handler that acts through what it calls (an optional call, a void call, two statements), and a handler that is a parameter",
    JSON.stringify(shapes.got) === JSON.stringify(shapes.want), JSON.stringify(shapes.got));
  const dialogHosts = SRC.filter((f) => DIALOG_TAG.test(w.read(f)));
  const keyProps = dialogHosts.flatMap((f) => reactKeyPressProps(f, w));
  ok("2.6 · no file that draws a dialog reads a press from a React key prop (onKeyDown, onKeyUp, onKeyPress), and none it cannot read: Enter on Cancel would reach it through React and act there, whatever the window rule says (A8i-2: every dialog-drawing file, not only the three money dialogs; an unreadable handler is a finding)",
    keyProps.length === 0 && dialogHosts.length >= 20 && [BET, SELL, ORM].every((f) => dialogHosts.includes(f)),
    `${dialogHosts.length} files · ${keyProps.join(", ") || "none"}`);
  const stackSrc = decomment(w.read(STACK));
  const stackImports = [...stackSrc.matchAll(/^import .*$/gm)].map((m) => m[0]);
  ok("2.7 · the stack is browser-free: modal-stack.ts imports the held-key rule and nothing else, reads no browser global and keeps no clock or timer of its own (leaving acts on the page only through the `Page` Modal hands it), so this suite runs the very rules the dialogs and the guard run",
    stackImports.length === 1 && stackImports[0].endsWith('from "./held-key";')
      && !/(?<![A-Za-z0-9_$.])(?:document|window|navigator|performance|globalThis|localStorage|sessionStorage)[.]/.test(stackSrc)
      && !/(?<![A-Za-z0-9_$.])(?:Date[.]now|setTimeout|setInterval|requestAnimationFrame|queueMicrotask)[(]/.test(stackSrc),
    JSON.stringify(stackImports));
  const unread = unreadKeyEvents(w);
  ok("2.8 · ★ every key event named in src/ is one the census reads: each literal keydown, keyup or keypress is the event of a listener on the window, the document or the page, or one of the element listeners named here, on a control of its own (the needle's hit area) — a listener added through a helper, on a variable target, under a constant or on an element inside a money dialog never escapes the census again (A8i-2)",
    unread.length === 0, unread.join(" | "));
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

  ok("2.5 · the rule is pure — held-key.ts imports nothing, so the guard runs the very rule the dialog runs",
    !/^\s*import\b/m.test(decomment(w.read(RULE))) && /export function swallowsHeldKey\(/.test(w.read(RULE)));

  log("§3 · the dial");
  const dial = decomment(w.read(DIAL));
  const kd = dial.indexOf("const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {");
  const kdOpen = kd < 0 ? -1 : dial.indexOf("{", kd + "const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) =>".length);
  const kdBody = kdOpen < 0 ? "" : dial.slice(kdOpen, closer(blankLiterals(dial), kdOpen) + 1);
  ok("3.1 · the dial's Enter and Space only OPEN the confirm — the bet is placed by the confirm's own button",
    count(kdBody, "openConfirm()") >= 2 && !/\bsubmit\(|onConfirm\(|placeBet/.test(kdBody), kdBody.slice(0, 80));
  log("§4 · the key guard (A8i-2)");
  const guardSrc = decomment(w.read(GUARD)), shellSrc = decomment(w.read(SHELL)), modalSrc = decomment(w.read(MODAL));
  const down = definitionNamed(guardSrc, "onKeyDown"), up = definitionNamed(guardSrc, "onKeyUp");
  ok("4.1 · ★ the held-key rule runs once, app-wide, FIRST: the key guard listens on the window in the CAPTURE phase for keydown and keyup, and a key it swallows is prevented AND stopped, so no element, React handler or bubbling listener acts on it (the board card's controls stopped Enter on its way up, and a dialog's own listener never heard its receipt's repeats); its decision is the stack's whole one; a key that is composing text is left alone",
    guardSrc.includes('window.addEventListener("keydown", onKeyDown, true);') && guardSrc.includes('window.addEventListener("keyup", onKeyUp, true);')
      && down.includes("swallowsKey(") && down.includes("e.preventDefault();") && down.includes("e.stopPropagation();") && down.includes("e.isComposing")
      && up.includes("swallowsSpaceUp(") && up.includes("e.preventDefault();") && up.includes("e.stopPropagation();"),
    JSON.stringify({ down: squashed(down).slice(0, 160), up: squashed(up).slice(0, 120) }));
  const install = definitionNamed(guardSrc, "installKeyGuard");
  ok("4.2 · the guard is installed once per page: by AppShell on every player page, and by every Modal when it mounts, open or not, so a page outside the shell (the console) has it wherever a dialog can open",
    install.includes('if (installed || typeof window === "undefined") return;') && install.includes("installed = true;")
      && count(shellSrc, "<KeyGuard />") === 1 && shellSrc.includes('import { KeyGuard } from "@/components/ui/key-guard";')
      && modalSrc.includes("React.useEffect(() => { installKeyGuard(); }, []);"),
    JSON.stringify({ shellTags: count(shellSrc, "<KeyGuard />"), modal: modalSrc.includes("installKeyGuard();") }));
  const U = (key: string, t: HK.KeyTarget | null, here: boolean) => safely(() => w.ms.swallowsSpaceUp(key, t, here));
  ok("4.3 · a Space presses only where it went down: released on a control it did not go down on (held on the dial while the confirm took focus) or after it was swallowed, it presses nothing; released where it went down, it presses once; a release in a text field and any other key's release pass",
    U(" ", BTN, false) === true && U(" ", el("INPUT", { type: "checkbox" }), false) === true && U(" ", BTN, true) === false
      && U(" ", el("INPUT", { type: "text" }), false) === false && U("Enter", BTN, false) === false && U(" ", null, false) === false
      && down.includes('if (e.key === " " && !e.repeat) spacePressedOn = swallow ? null : e.target;'),
    JSON.stringify([U(" ", BTN, false), U(" ", BTN, true)]));

  const g = guardRun(w);
  const gOk = (k: string) => g !== null && g[k] === true;
  ok("4.4 · ★ THE KEY GUARD, RUN (built from its text, its own handlers fired): it listens on the window in the capture phase, once however often it is installed; with no dialog open a held Enter or Space is swallowed (prevented AND stopped) wherever it lands — on a button, on the bet dial — while a fresh press, typing, a composing key and every other key pass untouched; with a dialog open a fresh press behind it is swallowed and one in it passes, until the dialog takes focus: then a press in its beat is swallowed, and one after the beat passes; and a Space presses only where it went down",
    ["listens", "heldOnButton", "heldOnDial", "freshPasses", "typingPasses", "composingPasses", "otherKeysPass", "behindSwallowed", "topPasses",
      "beatSwallows", "beatEnds", "spaceUpElsewhere", "spaceUpHere"].every(gOk),
    g === null ? "the guard could not be built or run" : Object.entries(g).filter(([, v]) => !v).map(([k]) => k).join(", "));

  log("§5 · the dialog stack (A8i-2)");
  const M = w.ms;
  // A page with its Sell button; a Sell confirm (z 100) holding its money and keep buttons; the win seal (z 1700) opened over
  // it, with its Continue; and a list the seal opened, put in the page after it.
  const pos = new Map<object, number>();
  const node = (p: number, name: string) => { const n = { name }; pos.set(n, p); return n; };
  const box = (p: number, inside: object[]) => ({
    contains: (n: unknown) => inside.includes(n as object),
    compareDocumentPosition: (n: unknown) => ((pos.get(n as object) ?? -1) > p ? 4 : 2),
  });
  const sellNow = node(1, "Sell now"), uza = node(10, "Uza"), keep = node(10, "Keep"), endelea = node(20, "Endelea"), list = node(30, "a list");
  const confirmBox = box(10, [uza, keep]), sealBox = box(20, [endelea]);
  const layer = (z: number, seq: number, root: ReturnType<typeof box> | null, restoreTo: unknown) => ({ z, seq, root: () => root, restoreTo, focusIn: () => {} });
  const confirm = layer(100, 2, confirmBox, sellNow), seal = layer(1700, 1, sealBox, uza);
  const pair = [layer(100, 1, confirmBox, sellNow), layer(100, 2, sealBox, uza)];
  ok("5.1 · the top dialog is the highest zIndex, and of two at one z the later one: the win seal stays on top of a confirm that opened after it, and of two confirms the second is on top",
    safely(() => M.topOf([confirm, seal])) === seal && safely(() => M.topOf([seal, confirm])) === seal
      && safely(() => M.topOf(pair)) === pair[1] && safely(() => M.topOf([])) === null
      && JSON.stringify(safely(() => M.ordered([seal, confirm]).map((l) => l.z))) === "[100,1700]",
    "");
  const where = (n: unknown, nowhere = false) => safely(() => M.whereIs([confirm, seal], n, nowhere));
  ok("5.2 · where a key or a focus lands, seen from the top dialog: in the seal, top; in the confirm under it, or on the page under the scrim, behind; in a list the seal opened (put in the page after it), above; on the page itself, nowhere; and with no dialog open, free",
    where(endelea) === "top" && where(uza) === "behind" && where(sellNow) === "behind" && where(list) === "above" && where(null, true) === "nowhere"
      && safely(() => M.whereIs([], sellNow, false)) === "free" && safely(() => M.whereIs([confirm], uza, false)) === "top",
    JSON.stringify([where(endelea), where(uza), where(sellNow), where(list), where(null, true)]));
  const K = (key: string, repeat: boolean, t: HK.KeyTarget | null, place: MS.Where, beat: boolean) => safely(() => M.swallowsKey(key, repeat, t, place, beat));
  const fresh = (t: HK.KeyTarget | null) => [K("Enter", false, t, "behind", false), K(" ", false, t, "behind", false)];
  ok("5.3 · ★ nothing behind the top dialog takes Enter or Space — the covered confirm's money button, a control on the page under the scrim, even a field there — while a first press anywhere else is untouched, and every other key behind it passes (the top dialog's own Escape and Tab answer those)",
    [BTN, el("A"), el("INPUT", { type: "text" }), el("TEXTAREA")].every((t) => fresh(t).every((v) => v === true))
      && (["top", "above", "free", "nowhere"] as const).every((p) => K("Enter", false, BTN, p, false) === false && K(" ", false, BTN, p, false) === false)
      && ["Escape", "Tab", "ArrowDown", "a"].every((k) => K(k, false, BTN, "behind", false) === false),
    "");
  ok("5.3b · ★ the stack's decision keeps the held-key rule, wherever the key lands: a held Enter or Space on a button is swallowed with no dialog open, in the top dialog, over it and on the page itself — the Up & Down burst — while a held Enter in a textarea still types",
    (["free", "top", "above", "nowhere"] as const).every((p) => K("Enter", true, BTN, p, false) === true && K(" ", true, BTN, p, false) === true)
      && K("Enter", true, el("TEXTAREA"), "free", false) === false && K(" ", true, el("INPUT", { type: "text" }), "free", false) === false,
    "");
  const beat = { until: 1400, within: confirmBox };
  const B = (n: unknown, now: number) => safely(() => M.inBeat(beat, n, now));
  ok("5.4 · ★ the arming beat: a fresh Enter or Space that would press something, in a dialog that took focus a moment ago (or on what a closing one just gave focus back to), presses nothing — a double press, key chatter or the seal's auto-dismiss racing a press cannot confirm money; typing is untouched, the beat ends on time, and it holds only where it was armed",
    K("Enter", false, BTN, "top", true) === true && K(" ", false, BTN, "top", true) === true && K("Enter", false, BTN, "free", true) === true
      && K("Enter", false, el("TEXTAREA"), "top", true) === false && K(" ", false, el("INPUT", { type: "text" }), "top", true) === false
      && K("Enter", false, BTN, "top", false) === false
      && B(uza, 1399) === true && B(uza, 1400) === false && B(sellNow, 1000) === false && safely(() => M.inBeat(null, uza, 0)) === false,
    "");
  const plan = (wasTop: boolean, focus: "inside" | "nowhere" | "elsewhere", back: MS.Where) => JSON.stringify(safely(() => M.closePlan(wasTop, focus, back)));
  const is = (move: string, arm: string) => JSON.stringify({ move, arm });
  ok("5.5 · ★ where focus goes when a dialog closes: the seal closing over a confirm gives it back into the confirm, which is armed, and never behind it; with nothing left open, back to the control that opened it, armed; a covered dialog closing (a quote lapsing under the seal) moves nobody's focus unless it held it; and focus that is somewhere real stays",
    plan(true, "inside", "top") === is("back", "top") && plan(true, "inside", "above") === is("back", "top")
      && plan(true, "inside", "behind") === is("top", "top") && plan(true, "nowhere", "behind") === is("top", "top") && plan(true, "inside", "nowhere") === is("top", "top")
      && plan(true, "inside", "free") === is("back", "back") && plan(true, "nowhere", "free") === is("back", "back")
      && plan(false, "elsewhere", "top") === is("none", "none") && plan(false, "nowhere", "free") === is("none", "none") && plan(false, "inside", "top") === is("top", "top")
      && plan(true, "elsewhere", "free") === is("none", "none"),
    plan(true, "inside", "top"));
  const still = [seal, layer(1700, 3, sealBox, sellNow)];
  ok("5.6 · ★ the hand-off: when the confirm under the seal closes (its quote lapsing), a dialog still open whose way back lay inside it takes the confirm's way back instead, so the seal's close can never aim focus into a dialog that has gone; nobody else's way back changes",
    JSON.stringify(safely(() => M.heirsOf(confirmBox, still).map((l) => still.indexOf(l)))) === "[0]" && JSON.stringify(safely(() => M.heirsOf(null, still))) === "[]",
    "");
  const gap = Number(/setTimeout[(]present, ([0-9]+)[)]/.exec(decomment(w.read(SEAL)))?.[1] ?? Number.NaN);
  ok(`5.7 · the arming beat (${M.ARMING_MS} ms) outlasts the gap before a queued second win seal (${gap} ms, win-celebration.tsx), so no press lands on the confirm between two seals, and stays at most 600 ms, so a press that follows reading the confirm is never refused`,
    Number.isFinite(gap) && M.ARMING_MS > gap && M.ARMING_MS <= 600, "");
  const focusInText = definitionNamed(modalSrc, "focusIn"), keyText = definitionNamed(modalSrc, "onKey");
  const pageText = squashed(modalSrc.slice(modalSrc.indexOf("const PAGE: Page = {"), modalSrc.indexOf("};", modalSrc.indexOf("const PAGE: Page = {")) + 2));
  const TOP = "if (!isTopLayer(layer)) return;";
  const escAt = keyText.indexOf('"Escape"');
  ok("5.8 · Modal stands on the stack: every opening is laid on it IN THE SAME COMMIT AS ITS PAGE (a layout effect: the second of two queued win seals is on the stack from its first drawn frame) and every close leaves it through `leaveLayer`, on the page itself; a dialog takes focus only while it is the top one (one opened beneath waits), and each focus it takes arms its beat; only the top one answers Escape and Tab, an Escape a dialog above has answered closes nothing more, focus outside its panel is brought in both ways, and an Escape on an open list (focused or not) or in a surface over it is that surface's; and its leaving ghost is inert",
    squashed(modalSrc).includes("React.useLayoutEffect(() => { if (!open) return;") && modalSrc.includes("openLayer(layer);") && modalSrc.includes("leaveLayer(layer, PAGE);")
      && pageText.includes("activeElement: () => document.activeElement,") && pageText.includes("focus: (node) => { if (node instanceof HTMLElement) node.focus(); },")
      && pageText.includes("now: () => performance.now(),") && pageText.includes("isNowhere,")
      && focusInText.includes(TOP) && focusInText.includes("target?.focus();") && focusInText.includes("armBeat(rootRef.current, performance.now());")
      && squashed(modalSrc).includes("safe: () => safeFocusRef.current?.current ?? null,")
      && keyText.includes(TOP) && keyText.indexOf(TOP) < escAt && escAt >= 0
      && keyText.indexOf("if (e.defaultPrevented) return;") > escAt && keyText.indexOf("if (e.defaultPrevented) return;") < keyText.indexOf("onCloseRef.current()")
      && keyText.includes("openList(") && keyText.includes("querySelector(OPEN_LIST)") && keyText.includes('"above"')
      && keyText.includes("(e.shiftKey ? last : first).focus();") && modalSrc.includes("inert={exiting || undefined}"),
    JSON.stringify({ focusIn: squashed(focusInText).slice(0, 90), onKey: squashed(keyText).slice(0, 200) }));
  const lv = leaveRun(w);
  const lvOk = (k: string) => lv !== null && lv[k] === true;
  ok("5.9 · ★ LEAVING, RUN (`leaveLayer` built from its text, on stand-in dialogs): W2 — the seal closing over the Sell confirm lands on its way out (\"Hifadhi nafasi\", never the money button) and arms the confirm for the beat, then disarms; a dialog naming no way out gets focus back where it was, armed; SL — a quote lapsing under the seal moves nobody's focus and hands its way back on, so the seal's close lands on the dial, armed; the receipt's close lands on UP, armed (a double Enter is one bet); a seal opened with focus on the page itself gives focus to nothing and arms nothing; and a covered dialog that held focus hands it to the dialog on top",
    ["w2WayOut", "w2Armed", "w2Off", "noWayOutBack", "slLapseMovesNothing", "slBackToDialArmed", "receiptBackArmed", "pageItselfArmsNothing", "coveredHandsToTop"].every(lvOk),
    lv === null ? "leaving could not be built or run" : Object.entries(lv).filter(([, v]) => !v).map(([k]) => k).join(", "));
  const betSrc = decomment(w.read(BET)), sellSrc = decomment(w.read(SELL));
  const cmText = modalSrc.slice(modalSrc.indexOf("export function ConfirmModal("));
  const betWayOut = buttonWith(betSrc, "ref={cancelRef}") ?? "", sellWayOut = buttonWith(sellSrc, "ref={keepRef}") ?? "", cmWayOut = buttonWith(cmText, "ref={cancelRef}") ?? "";
  ok("5.10 · ★ every money confirm names its way out (`safeFocus`), and it is the button that leaves: the bet confirm's \"Ghairi\", the Sell confirm's \"Hifadhi nafasi\", and ConfirmModal's Cancel (deposit, withdraw and every officer's money confirm) — so an Enter meant for a dialog drawn over them can at worst close them",
    betSrc.includes("safeFocus={cancelRef}") && /onClick=\{onCancel\}/.test(betWayOut) && !/onConfirm/.test(betWayOut)
      && sellSrc.includes("safeFocus={keepRef}") && /onClick=\{onCancel\}/.test(sellWayOut) && !/onConfirm/.test(sellWayOut)
      && cmText.includes("safeFocus={cancelRef}") && /onClick=\{onClose\}/.test(cmWayOut) && !/onConfirm/.test(cmWayOut),
    JSON.stringify({ bet: squashed(betWayOut).slice(0, 60), sell: squashed(sellWayOut).slice(0, 60), cm: squashed(cmWayOut).slice(0, 60) }));

  log("§6 · the first focus (A8i-2)");
  ok("6.1 · a dialog whose first target cannot take focus (disabled, or gone) gives focus to its first control that can — never to a dead button, which left focus behind the scrim",
    focusInText.includes('!want.matches(":disabled")') && focusInText.includes("want.isConnected") && focusInText.includes("focusables()[0]")
      && !focusInText.includes("requestAnimationFrame("),
    squashed(focusInText).slice(0, 160));
  return failed;
}

// ── the run ────────────────────────────────────────────────────────────────────────────────────────────────────────────

if (!PROVE_RED) {
  console.log("enter-where-pressed — the Vodacom plan S6 A8i and A8i-2");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`\nENTER WHERE PRESSED — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  /** The real tree (or `base`, A8i-2: so two files can be planted) with one file's text replaced: `from` must occur exactly
   *  once, so a plant can never land twice. */
  const plantIn = (file: string, from: string, to: string, base: World = REAL): World => {
    const raw = base.read(file);
    const n = raw.split(from).length - 1;
    if (n !== 1) throw new Error(`plant anchor in ${file} occurs ${n} times, not once: ${JSON.stringify(from.slice(0, 60))}`);
    const planted = raw.replace(from, to);
    return { ...base, read: (rel) => (rel === file ? planted : base.read(rel)) };
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
    { name: "the rule made impure (it imports)", expect: /^2\.5 /,
      world: () => plantIn(RULE, "/** What the rule needs to know about the element a key went to. */", "import { haptics } from \"./haptics\";\n/** What the rule needs to know about the element a key went to. */") },
    { name: "the dial's Enter places the bet itself", expect: /^3\.1 /,
      world: () => plantIn(DIAL, "if (e.key === \" \" || e.key === \"Enter\") { e.preventDefault(); openConfirm(); return; }",
        "if (e.key === \" \" || e.key === \"Enter\") { e.preventDefault(); submit(); return; }") },
  ];
  /* ⭐ A8i-2 — every new check with the defect it is there for, planted in memory; and the shapes the A8i census passed,
     planted in the real tree, each caught by 2.1 (or by 2.0, for the handler it cannot read). */
  const CONFIRM_REF = "  const confirmRef = useRef<HTMLButtonElement>(null);" + NL;
  const PRIMARY_REF = "  const primaryRef = useRef<HTMLButtonElement>(null);" + NL;
  /** `lines` as an effect, planted right after `anchor` (which stays). */
  const after = (anchor: string, ...lines: string[]) => anchor + ["  useEffect(() => {", ...lines.map((l) => "    " + l), "  }, [open]);", ""].join(NL);
  const swap = (over: Partial<typeof MS>): World => ({ ...REAL, ms: { ...MS, ...over } });
  const reading = (over: Partial<CensusRules>): World => ({ ...REAL, census: { ...REAL.census, ...over } });
  const bySeq = (ls: readonly MS.Layer[]) => [...ls].sort((a, b) => a.seq - b.seq);
  plants.push(
    // §1 · keyTargetOf, run at last (1.7), and the press test (1.8)
    { name: "keyTargetOf reads the tag in lower case (a held Space on the dial presses Confirm when it is let go)", expect: /^1[.]7 /,
      world: () => ({ ...REAL, kto: (x) => { const t = HK.keyTargetOf(x); return t && { ...t, tag: t.tag.toLowerCase() }; } }) },
    { name: "keyTargetOf drops the role (a held Space on a role=switch presses it)", expect: /^1[.]7 /,
      world: () => ({ ...REAL, kto: (x) => { const t = HK.keyTargetOf(x); return t && { ...t, role: null }; } }) },
    { name: "keyTargetOf answers nothing (a held Space is never swallowed)", expect: /^1[.]7 /,
      world: () => ({ ...REAL, kto: () => null }) },
    { name: "keyTargetOf drops the editable flag (a held Enter in an editable region is swallowed: new lines broken)", expect: /^1[.]7 /,
      world: () => ({ ...REAL, kto: (x) => { const t = HK.keyTargetOf(x); return t && { ...t, editable: false }; } }) },
    { name: "the press test says everything presses (the beat would swallow a new line in a textarea)", expect: /^1[.]8 /,
      world: () => ({ ...REAL, presses: () => true }) },
    { name: "the press test forgets Space (a Space behind the seal or in the beat would press)", expect: /^1[.]8 /,
      world: () => ({ ...REAL, presses: (k, t) => k === "Enter" && HK.pressesSomething(k, t) }) },
    // §2 · the census reads what it used to pass (2.0b), and those shapes planted in the real tree (2.0, 2.1)
    { name: "the census reads Enter only as a quoted literal again (keyCode 13, Space and a helper's key test unseen)", expect: /^2[.]0b /,
      world: () => reading({ press: (t) => ENTER.test(t), helpers: false }) },
    { name: "the census judges every handler by the first definition of its name in its file again", expect: /^2[.]0b /,
      world: () => reading({ reach: (code, _b, name) => definitionsOf(code, name)[0] ?? null }) },
    { name: "the census passes a handler it cannot read (a cast, a member, a wrapper) as plain text again", expect: /^2[.]0b /,
      world: () => reading({ arg: (x, from, to) => x.code.slice(from, to) }) },
    { name: "the census looks only at keydown on the window and the document again", expect: /^2[.]0b /,
      world: () => reading({ more: false }) },
    { name: "the census exempts any listener that returns for a key outside its own control again", expect: /^2[.]0b /,
      world: () => reading({ allowed: (_x, h) => scopedToItsControl(h) }) },
    { name: "a dialog-scoped window Enter listener in the bet confirm (Enter on Ghairi, inside the dialog, places the bet)", expect: /^2[.]1 /,
      world: () => plantIn(BET, CONFIRM_REF, after(CONFIRM_REF,
        "const onKey = (e: KeyboardEvent) => {",
        "  if (!confirmRef.current?.parentElement?.contains(e.target as Node)) return;",
        '  if (e.key === "Enter" && !pending) { e.preventDefault(); onConfirm(); }',
        "};",
        'window.addEventListener("keydown", onKey);',
        'return () => window.removeEventListener("keydown", onKey);')) },
    { name: "an inverted scope in the Sell confirm (Enter pressed anywhere but in the dialog sells: the A8i defect itself)", expect: /^2[.]1 /,
      world: () => plantIn(SELL, CONFIRM_REF, after(CONFIRM_REF,
        "const onKey = (e: KeyboardEvent) => {",
        "  if (confirmRef.current?.parentElement?.contains(e.target as Node)) return;",
        '  if (e.key === "Enter") onConfirm();',
        "};",
        'window.addEventListener("keydown", onKey);')) },
    { name: "an unrelated early return and a contains test before the result dialog's Enter (Enter anywhere does the primary)", expect: /^2[.]1 /,
      world: () => plantIn(ORM, PRIMARY_REF, after(PRIMARY_REF,
        "if (!open) return;",
        "const onKey = (e: KeyboardEvent) => {",
        "  if (!open) return;",
        "  const inside = primaryRef.current?.contains(e.target as Node);",
        '  if (e.key === "Enter") (onPrimary ?? onClose)();',
        "};",
        'window.addEventListener("keydown", onKey);')) },
    { name: "a second component in modal.tsx with an Enter handler of the same name (ConfirmModal settling on Enter, read as Modal's)", expect: /^2[.]1 /,
      world: () => plantIn(MODAL, "  const cancelRef = React.useRef<HTMLButtonElement>(null);" + NL, "  const cancelRef = React.useRef<HTMLButtonElement>(null);" + NL + [
        "  React.useEffect(() => {",
        "    if (!open) return;",
        '    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" && armed && !loading) { e.preventDefault(); fire(); } };',
        '    window.addEventListener("keydown", onKey);',
        '    return () => window.removeEventListener("keydown", onKey);',
        "  }, [open]);",
        ""].join(NL)) },
    { name: "a cast handler in the Sell confirm (onKey as EventListener: the A8i census read the cast as text with no Enter in it)", expect: /^2[.]1 /,
      world: () => plantIn(SELL, CONFIRM_REF, after(CONFIRM_REF,
        'const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") onConfirm(); };',
        'window.addEventListener("keydown", onKey as EventListener);')) },
    { name: "the bet confirm confirming on keyCode 13", expect: /^2[.]1 /,
      world: () => plantIn(BET, CONFIRM_REF, after(CONFIRM_REF,
        "const onKey = (e: KeyboardEvent) => { if (e.keyCode === 13 && !pending) onConfirm(); };",
        'window.addEventListener("keydown", onKey);')) },
    { name: "a keyup listener in the Sell confirm (the seal's button closes on keydown, the keyup sells underneath)", expect: /^2[.]1 /,
      world: () => plantIn(SELL, CONFIRM_REF, after(CONFIRM_REF,
        'const onUp = (e: KeyboardEvent) => { if (e.key === "Enter") onConfirm(); };',
        'window.addEventListener("keyup", onUp);')) },
    { name: "an onkeydown assignment in the bet confirm that confirms on Space", expect: /^2[.]1 /,
      world: () => plantIn(BET, CONFIRM_REF, after(CONFIRM_REF,
        'window.onkeydown = (e) => { if (e.key === " " && !pending) onConfirm(); };')) },
    { name: "a key test moved into a helper of the Sell confirm's own file", expect: /^2[.]1 /,
      world: () => plantIn(SELL, CONFIRM_REF, after(CONFIRM_REF,
        'const isConfirmKey = (e: KeyboardEvent) => e.key === "Enter";',
        "const onKey = (e: KeyboardEvent) => { if (isConfirmKey(e)) onConfirm(); };",
        'window.addEventListener("keydown", onKey);')) },
    { name: "a key test moved into a helper in src/lib (the pure-helper pattern held-key.ts itself uses)", expect: /^2[.]1 /,
      world: () => plantIn(BET, CONFIRM_REF, after(CONFIRM_REF,
          "const onKey = (e: KeyboardEvent) => { if (isConfirmKey(e) && !pending) onConfirm(); };",
          'window.addEventListener("keydown", onKey);'),
        plantIn(BET, 'import { formatTzs, formatNumber } from "@/lib/utils";', 'import { formatTzs, formatNumber, isConfirmKey } from "@/lib/utils";',
          plantIn("src/lib/utils.ts", "export function formatNumber(value: number): string {",
            'export function isConfirmKey(e: KeyboardEvent): boolean { return e.key === "Enter"; }' + NL + "export function formatNumber(value: number): string {"))) },
    { name: "a listener on the page body in the Sell confirm", expect: /^2[.]1 /,
      world: () => plantIn(SELL, CONFIRM_REF, after(CONFIRM_REF,
        'const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") onConfirm(); };',
        'document.body.addEventListener("keydown", onKey);')) },
    { name: "a member handler on the window (the census cannot read its body: it must say so, not pass it)", expect: /^2[.]0 /,
      world: () => plantIn(BET, CONFIRM_REF, after(CONFIRM_REF,
        'window.addEventListener("keydown", keys.onKey);')) },
    { name: "the bet confirm's buttons wrapped in a div that confirms on Enter (Enter on Cancel reaches it through React)", expect: /^2[.]6 /,
      world: () => plantIn(BET, '        <div className="mt-5 flex flex-col gap-2">',
        '        <div className="mt-5 flex flex-col gap-2" onKeyDown={(e) => { if (e.key === "Enter" && !pending) { e.preventDefault(); onConfirm(); } }}>') },
    { name: "the stack's rules import something else", expect: /^2[.]7 /,
      world: () => plantIn(STACK, 'import { pressesSomething, swallowsHeldKey, type KeyTarget } from "./held-key";',
        'import { pressesSomething, swallowsHeldKey, type KeyTarget } from "./held-key";' + NL + 'import { haptics } from "./haptics";') },
    { name: "the stack's rules read the page", expect: /^2[.]7 /,
      world: () => plantIn(STACK, '  if (!top) return "free";', '  if (!top || document.hidden) return "free";') },
    { name: "the stack keeps a clock of its own (the beat no longer runs on the clock it is handed)", expect: /^2[.]7 /,
      world: () => plantIn(STACK, "  armed = { until: now + ARMING_MS, within };", "  armed = { until: Date.now() + ARMING_MS, within };") },
    // §1.4 / §2 · A8i-2's review
    { name: "Space on the bet dial is no press again (a held Space's repeats there open confirm after confirm)", expect: /^4[.]4 /,
      world: () => plantIn(RULE, '"tab", "slider",', '"tab",') },
    { name: "the census passes an inline handler that acts through what it calls again", expect: /^2[.]0b /,
      world: () => reading({ named: false }) },
    { name: "the census stops at a namespace import again (K.isConfirmKey(e) unread)", expect: /^2[.]0b /,
      world: () => reading({ ns: false }) },
    { name: "an unreadable React key prop on the Sell confirm's buttons (it passed as text with no Enter in it)", expect: /^2[.]6 /,
      world: () => plantIn(SELL, '      <div className="mt-5 flex flex-col gap-2">', '      <div className="mt-5 flex flex-col gap-2" onKeyDown={keys.onKeyDown}>') },
    { name: "an officer's dialog file whose React key prop acts on Enter (2.6 read only the three money dialogs)", expect: /^2[.]6 /,
      world: () => plantIn("src/app/admin/resolver-queue/bulk-resolve-bar.tsx", "onKeyDownCapture={() => { /* header has no range semantics */ }}",
        'onKeyDownCapture={(e) => { if (e.key === "Enter") setAll(true); }}') },
    { name: "the needle's keydown moved onto the window through its own helper (the census never saw it)", expect: /^2[.]8 /,
      world: () => plantIn("src/components/layout/needle.tsx", 'on(hit, "keydown",', 'on(window, "keydown",') },
    { name: "a key event named under a constant (a listener the census cannot see)", expect: /^2[.]8 /,
      world: () => plantIn(GUARD, "let installed = false;", "let installed = false;" + NL + 'const PRESS_EVENT = "keydown";') },
    // §4 · the key guard
    { name: "the key guard listens in the bubble phase (the board card's controls stop Enter before it)", expect: /^4[.]1 /,
      world: () => plantIn(GUARD, 'window.addEventListener("keydown", onKeyDown, true);', 'window.addEventListener("keydown", onKeyDown);') },
    { name: "the key guard prevents a swallowed key but does not stop it (a React handler still acts on it)", expect: /^4[.]1 /,
      world: () => plantIn(GUARD, "  if (!swallow) return;" + NL + "  e.preventDefault();" + NL + "  e.stopPropagation();", "  if (!swallow) return;" + NL + "  e.preventDefault();") },
    { name: "the key guard decides with the held-key rule alone (nothing behind the top dialog refused, and no beat)", expect: /^4[.]1 /,
      world: () => plantIn(GUARD, "const swallow = swallowsKey(", "const swallow = swallowsHeldKey(") },
    { name: "the key guard swallows a composing key (an input method's Enter)", expect: /^4[.]1 /,
      world: () => plantIn(GUARD, "  if (e.isComposing || e.keyCode === 229) return;" + NL, "") },
    { name: "AppShell no longer mounts the key guard", expect: /^4[.]2 /,
      world: () => plantIn(SHELL, "      <KeyGuard />" + NL, "") },
    { name: "Modal no longer installs the key guard (the console has none)", expect: /^4[.]2 /,
      world: () => plantIn(MODAL, "  React.useEffect(() => { installKeyGuard(); }, []);" + NL, "") },
    { name: "the key guard installs itself on every call (a second set of listeners)", expect: /^4[.]2 /,
      world: () => plantIn(GUARD, '  if (installed || typeof window === "undefined") return;', '  if (typeof window === "undefined") return;') },
    { name: "a Space released anywhere presses what it lands on", expect: /^4[.]3 /,
      world: () => swap({ swallowsSpaceUp: () => false }) },
    { name: "the key guard forgets where a Space went down", expect: /^4[.]3 /,
      world: () => plantIn(GUARD, '  if (e.key === " " && !e.repeat) spacePressedOn = swallow ? null : e.target;' + NL, "") },
    // §4.4 · the key guard, run (each plant edits key-guard.tsx's text: the code 4.4 builds and fires keys through)
    { name: "the key guard swallows what it should let through, and lets through what it should swallow", expect: /^4[.]4 /,
      world: () => plantIn(GUARD, "  if (!swallow) return;", "  if (swallow) return;") },
    { name: "the stack's decision drops the held-key rule (text: the guard built from it lets a held Enter bet on every repeat)", expect: /^4[.]4 /,
      world: () => plantIn(STACK, "  if (swallowsHeldKey(key, repeat, target)) return true;" + NL, "") },
    { name: "the stack's decision drops the held-key rule (the rule itself: a held Enter on UP passes with no dialog open)", expect: /^5[.]3b /,
      world: () => swap({ swallowsKey: (key, repeat, target, where, beat) => (key === "Enter" || key === " ") && (where === "behind" || (!repeat && beat && HK.pressesSomething(key, target))) }) },
    { name: "the key guard is handed no repeat (Up & Down's UP bets on every repeat again: the 13-bet burst)", expect: /^4[.]4 /,
      world: () => plantIn(GUARD, "swallowsKey(e.key, e.repeat, t,", "swallowsKey(e.key, false, t,") },
    { name: "the key guard is handed an empty stack (a press behind the seal confirms the bet under it)", expect: /^4[.]4 /,
      world: () => plantIn(GUARD, "whereIs(openLayers(), e.target,", "whereIs([], e.target,") },
    { name: "the key guard is told no beat is armed (W2's second Enter sells)", expect: /^4[.]4 /,
      world: () => plantIn(GUARD, "inBeat(currentBeat(), e.target, performance.now())", "false") },
    { name: "the key guard decides a Space's release by where the last key went, not the last Space", expect: /^4[.]4 /,
      world: () => plantIn(GUARD, "  const pressedHere = e.target === spacePressedOn;", "  const pressedHere = true;") },
    // §5 · the dialog stack
    { name: "the stack orders by open order alone (a confirm opened after the seal would be on top of it)", expect: /^5[.]1 /,
      world: () => swap({ ordered: (ls) => bySeq(ls), topOf: (ls) => { const o = bySeq(ls); return o.length > 0 ? o[o.length - 1] : null; } }) },
    { name: "of two dialogs at one z, the earlier is taken for the top", expect: /^5[.]1 /,
      world: () => swap({ topOf: (ls) => { const o = [...ls].sort((a, b) => a.z - b.z || b.seq - a.seq); return o.length > 0 ? o[o.length - 1] : null; } }) },
    { name: "nothing is ever above the top dialog (a calendar it opened would lose its keys)", expect: /^5[.]2 /,
      world: () => swap({ whereIs: (ls, n, nw) => { const r = MS.whereIs(ls, n, nw); return r === "above" ? "behind" : r; } }) },
    { name: "a covered dialog is taken for the top one (the confirm under the seal takes keys)", expect: /^5[.]2 /,
      world: () => swap({ whereIs: (ls, n, nw) => { const r = MS.whereIs(ls, n, nw); return r === "behind" && ls.some((l) => l.root()?.contains(n)) ? "top" : r; } }) },
    { name: "a press behind the top dialog presses (Enter meant for the seal confirms the bet under it)", expect: /^5[.]3 /,
      world: () => swap({ swallowsKey: (k, r, t, p, beat) => MS.swallowsKey(k, r, t, p === "behind" ? "top" : p, beat) }) },
    { name: "no arming beat (a second Enter 60 ms after the seal closes sells: W2)", expect: /^5[.]4 /,
      world: () => swap({ swallowsKey: (k, r, t, p) => MS.swallowsKey(k, r, t, p, false) }) },
    { name: "the arming beat swallows typing too (a new line in a dialog's textarea lost)", expect: /^5[.]4 /,
      world: () => swap({ swallowsKey: (k, r, t, p, beat) => (beat && !r && (k === "Enter" || k === " ")) || MS.swallowsKey(k, r, t, p, beat) }) },
    { name: "the arming beat never ends", expect: /^5[.]4 /,
      world: () => swap({ inBeat: (b, n) => b !== null && b.within !== null && b.within.contains(n) }) },
    { name: "a closing dialog always gives focus back where it was (the A8i Modal: behind the seal, or onto Uza unarmed)", expect: /^5[.]5 /,
      world: () => swap({ closePlan: () => ({ move: "back", arm: "none" }) }) },
    { name: "a closing dialog never moves focus (the confirm the seal uncovers has none)", expect: /^5[.]5 /,
      world: () => swap({ closePlan: () => ({ move: "none", arm: "none" }) }) },
    { name: "no hand-off (the seal closing aims focus into a confirm that has gone)", expect: /^5[.]6 /,
      world: () => swap({ heirsOf: () => [] }) },
    { name: "an arming beat shorter than the gap between two seals (200 ms)", expect: /^5[.]7 /,
      world: () => swap({ ARMING_MS: 200 }) },
    { name: "two queued seals 500 ms apart, past the arming beat", expect: /^5[.]7 /,
      world: () => plantIn(SEAL, "setTimeout(present, 350)", "setTimeout(present, 500)") },
    { name: "Modal's key handler answers as a covered dialog too (one Escape closes every dialog)", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, "      if (!isTopLayer(layer)) return;" + NL + "      /* ⛔ Escape obeys", "      /* ⛔ Escape obeys") },
    { name: "a dialog opened beneath the seal takes focus all the same", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, "      if (!isTopLayer(layer)) return;" + NL + "      const want = initialFocusRef.current?.current ?? null;", "      const want = initialFocusRef.current?.current ?? null;") },
    { name: "an Escape on an open dropdown inside a dialog closes the dialog too", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, '        if (openList(e.target) || panelRef.current?.querySelector(OPEN_LIST) || whereIs(openLayers(), e.target, isNowhere(e.target)) === "above") return;' + NL, "") },
    { name: "an Escape with a dropdown open in the dialog but focus on the page (a click in Safari) closes the dialog too", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, " || panelRef.current?.querySelector(OPEN_LIST)", "") },
    { name: "one Escape closes a dialog and then the one under it (its listener runs after the top one closed)", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, "        if (e.defaultPrevented) return;" + NL, "") },
    { name: "the open effect is passive again (a timer-opened seal is drawn before it is on the stack)", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, "  React.useLayoutEffect(() => {" + NL + "    if (!open) return;", "  React.useEffect(() => {" + NL + "    if (!open) return;") },
    { name: "a dialog's first focus is not armed (a double press on the dial confirms: DD)", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, "      armBeat(rootRef.current, performance.now());" + NL, "") },
    { name: "the page Modal hands to leaving moves no focus", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, "focus: (node) => { if (node instanceof HTMLElement) node.focus(); },", "focus: () => {},") },
    { name: "Modal's layer names no way out (its safeFocus never reaches the stack)", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, "      safe: () => safeFocusRef.current?.current ?? null," + NL, "") },
    { name: "a plain Tab from behind the dialog walks the page behind its scrim again", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, "      if (!panelRef.current?.contains(active)) {" + NL + "        e.preventDefault(); (e.shiftKey ? last : first).focus();" + NL + "      } else if (e.shiftKey && active === first) {",
        "      if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {") },
    { name: "the leaving ghost is no longer inert (its Confirm can take focus and a key)", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, "      inert={exiting || undefined}" + NL, "") },
    { name: "Modal gives focus back without the plan (the A8i one-liner)", expect: /^5[.]8 /,
      world: () => plantIn(MODAL, "      leaveLayer(layer, PAGE);", "      (layer.restoreTo as HTMLElement | null)?.focus?.();") },
    // §5.9 · leaving, run (each plant edits modal-stack.ts's text: the code 5.9 builds and runs)
    { name: "no hand-off (the seal's close aims focus into a confirm whose quote lapsed under it: SL)", expect: /^5[.]9 /,
      world: () => plantIn(STACK, "  for (const heir of heirsOf(box, rest)) heir.restoreTo = layer.restoreTo;" + NL, "") },
    { name: "an uncovered confirm takes focus on its money button again (W2's second Enter, or a second seal's, sells)", expect: /^5[.]9 /,
      world: () => plantIn(STACK, "    const safe = top.safe?.() ?? null;", "    const safe = null;") },
    { name: "the confirm the seal uncovers is not armed", expect: /^5[.]9 /,
      world: () => plantIn(STACK, "      armBeat(top.root(), now);" + NL, "") },
    { name: "what a closing dialog gives focus back to is not armed (the receipt's double Enter bets twice)", expect: /^5[.]9 /,
      world: () => plantIn(STACK, '  armBeat(plan.arm === "top" ? (top?.root() ?? null) : (back as Box), now);' + NL, "") },
    { name: "a seal opened with focus on the page arms the whole page when it closes", expect: /^5[.]9 /,
      world: () => plantIn(STACK, "  const back = page.isNowhere(layer.restoreTo) ? null : layer.restoreTo;", "  const back = layer.restoreTo;") },
    { name: "a covered dialog that held focus closes and nobody takes it", expect: /^5[.]9 /,
      world: () => plantIn(STACK, "    top?.focusIn();" + NL, "") },
    // §5.10 · the way out
    { name: "the Sell confirm names no way out (the seal's close hands focus to its sell button)", expect: /^5[.]10 /,
      world: () => plantIn(SELL, "      safeFocus={keepRef}" + NL, "") },
    { name: "the bet confirm's way out is not its Cancel button", expect: /^5[.]10 /,
      world: () => plantIn(BET, "            ref={cancelRef}" + NL, "") },
    { name: "ConfirmModal names no way out (a seal over a withdrawal confirm hands focus back to Send funds)", expect: /^5[.]10 /,
      world: () => plantIn(MODAL, "      safeFocus={cancelRef}" + NL, "") },
    // §6 · the first focus
    { name: "a disabled first target is given focus all the same (focus stays behind the scrim)", expect: /^6[.]1 /,
      world: () => plantIn(MODAL, '!want.matches(":disabled")', "true") },
  );
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
