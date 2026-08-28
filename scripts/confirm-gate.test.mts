/**
 * THE HARD CONFIRM GATE IS ARMED, OR IT IS NOT THERE AT ALL.
 *
 * 🔴 THE DEFECT THIS LOCKS SHUT (S-17, scan #1, 2026-08-28). `ConfirmModal` computed
 * `const isHard = tier === "hard" && !!typedWord`. So `tier="hard"` passed WITHOUT a
 * `typedWord` did not fail, did not warn, and did not render a gate — it produced an
 * ordinary one-click confirm wearing the claret tone, the eyebrow and the styling of a hard
 * gate. It failed in the direction of LOOKING SAFE, which is the only direction that matters
 * for a control whose entire purpose is to be hard to fire by accident.
 *
 * Four live call sites did exactly that, and three were RBAC-destructive on /admin/staff and
 * /admin/roles — the two OWNER_ONLY_PREFIXES. The most privileged surface in the product was
 * where the gate silently wasn't.
 *
 * ⛔ THE OBVIOUS GUARD IS THE USELESS ONE, and the scan said so before this file existed:
 * grepping for `tier="hard"` and counting passes on exactly the broken shape, because the
 * string WAS present — it was the PAIRING that was absent. So this asserts the pairing.
 *
 * ⚠️ AND WHY A TEXT GUARD AT ALL, WHEN THE TYPE NOW FORBIDS IT. `ConfirmModalProps` is a
 * discriminated union, so `tsc` rejects the broken pair and is the primary enforcement. But a
 * type is only load-bearing while nobody routes around it: `as never`, `as any`, a spread of a
 * loosely-typed object, or a future revert of the union to two optionals all restore the
 * defect with a green typecheck. §1 reads the rendered TEXT and cannot be cast away; §3 pins
 * the union itself so a revert is caught rather than inferred.
 *
 * Run: npm run test:confirm-gate
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const MODAL = "src/components/ui/modal.tsx";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

function walk(dir: string, re: RegExp): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, re));
    else if (re.test(e)) out.push(p);
  }
  return out;
}

/**
 * The props text of one `<ConfirmModal …/>` element.
 *
 * ⛔ NOT A REGEX. `body={…}` routinely holds nested JSX and ternaries, so `[^<]` (the class
 * §5/§6 of search-adoption had to adopt) cannot survive here, and a lazy `[\s\S]*?/>` stops at
 * the first `/>` INSIDE the body — which on these dialogs is usually a `<br />` or an icon,
 * i.e. it would silently truncate the element before ever reaching `typedWord`. Depth-aware
 * scanning is the only honest reader: the element ends at the first `/>` seen at brace depth 0.
 */
function elementAt(src: string, start: number): string | null {
  let depth = 0;
  for (let i = start; i < src.length - 1; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === "/" && src[i + 1] === ">" && depth === 0) return src.slice(start, i);
    else if (c === ">" && depth === 0 && src[i - 1] !== "/" && i > start + 13) return src.slice(start, i);
  }
  return null;
}

const files = walk(SRC, /\.tsx?$/);

// ── 1 · EVERY HARD TIER CARRIES ITS WORD, IN THE SAME ELEMENT ────────────────
const unarmed: string[] = [];
let hardElements = 0;
let parsedElements = 0;
let rawOccurrences = 0;

for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  if (rel === MODAL) continue; // the primitive DEFINES the props; it is not a call site
  const src = decomment(readFileSync(f, "utf8"));

  for (const m of src.matchAll(/<ConfirmModal\b/g)) {
    rawOccurrences++;
    const el = elementAt(src, m.index!);
    if (el === null) continue;
    parsedElements++;
    // "hard" reaches the component three ways: a literal prop, a spread object key, or a
    // correlated ternary inside a spread. All three are just text in the element.
    if (!/\bhard\b/.test(el)) continue;
    hardElements++;
    if (!/\btypedWord\b/.test(el)) {
      unarmed.push(`${rel} — a ConfirmModal reaches tier "hard" with no typedWord in the same element`);
    }
  }
}
ok("1: 🔴 every ConfirmModal that can reach tier=\"hard\" carries a typedWord",
   unarmed.length === 0, unarmed.join(" · "));

/**
 * ⛔ RECONCILIATION. §1 is a loop that can only report what it parsed, so both ways of seeing
 * nothing are asserted: the element reader must have kept up with every `<ConfirmModal` in the
 * tree, and at least one hard gate must actually exist. Without these, deleting the last hard
 * gate — or breaking the parser on a reformat — reads exactly like "all gates are armed".
 */
ok("1: …and the element reader kept up with every <ConfirmModal in the tree",
   parsedElements === rawOccurrences, `${parsedElements} parsed vs ${rawOccurrences} found`);
ok("1: …and at least one hard gate exists, so §1 is not vacuous",
   hardElements > 0, `${hardElements} hard elements`);

// ── 2 · THE TWO /admin/roles RESETS DO NOT SHARE A WORD ──────────────────────
/**
 * These two dialogs are adjacent tabs of one screen with the same tone, the same confirm
 * label, and one word of difference in the title. A shared typed word would arm whichever
 * happened to be open — which is precisely the muscle memory the gate exists to interrupt.
 * Typing the specific thing is the whole mechanism; a generic "RESET" on both throws it away.
 */
{
  const words = ["roles-matrix", "read-tiers-matrix"].map((n) => {
    const src = decomment(readFileSync(join(SRC, "app/admin/roles", `${n}.tsx`), "utf8"));
    return src.match(/typedWord="([^"]+)"/)?.[1] ?? "";
  });
  ok("2: both /admin/roles reset dialogs declare a typed word",
     words.every(Boolean), JSON.stringify(words));
  ok("2: ⛔ …and they are DIFFERENT words, so the wrong tab cannot be armed by muscle memory",
     words[0] !== words[1], JSON.stringify(words));
}

// ── 3 · THE UNION ITSELF — the pairing is unrepresentable, not merely unused ──
/**
 * §1 proves no call site is currently broken. This proves the shape that stops the NEXT one:
 * the type must still have a hard arm requiring the word, and a non-hard arm forbidding it.
 * `typedWord?: never` is the half people delete as "redundant" — without it, the medium arm
 * accepts a stray word and a correlated ternary starts type-checking again.
 */
{
  const modal = readFileSync(join(ROOT, MODAL), "utf8");
  ok("3: the hard arm REQUIRES the word",
     /\{\s*tier:\s*"hard";\s*typedWord:\s*string\s*\}/.test(modal));
  ok("3: ⛔ …and the non-hard arm FORBIDS it (`typedWord?: never`)",
     /typedWord\?:\s*never/.test(modal));
  ok("3: the gate FAILS CLOSED — an empty word disarms rather than waving through",
     /gateWord\s*!==\s*""/.test(modal),
     "armed must require a non-empty word; without this an empty typedWord arms on empty input");
  ok("3: ⛔ …and `isHard` no longer depends on the word being truthy",
     !/isHard\s*=\s*tier === "hard"\s*&&\s*!!typedWord/.test(modal),
     "that expression is the original defect: a missing word silently downgraded the tier");
}

console.log(`\nconfirm-gate: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
