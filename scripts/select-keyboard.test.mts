/**
 * ⛔ THE KEYBOARD CHOOSES — the kit `<Select>`'s key contract, as a gate (2026-09-27).
 *
 *   npx tsx scripts/select-keyboard.test.mts     (npm run test:select-keyboard)
 *
 * Measured on production and on a local server on 2026-09-27: a keyboard could not choose ANY option of the
 * kit Select — every Select in the app, the Responsible Gambling break length among them. Focus stays on the
 * trigger while the list is open (aria-activedescendant), so each key reached the trigger's handler AND the
 * list's window listener. The trigger re-opened the list on every key, resetting the highlight to the current
 * value, so Enter committed the value already there; and the opening key also reached the listener, so
 * ArrowDown opened the list AND moved one row.
 *
 * WHAT IT HOLDS — read from the component's own source, decommented:
 *   §1 the trigger's key handler acts only while the list is CLOSED (its first statement returns when open)
 *   §2 the key that opens the list is stopped there, so it never reaches the list's window listener
 *   §3 the list commits on Enter AND Space, and Space is not a type-to-search key
 *   §4 CONTROLS — each defect planted back into the real source is reported by its own check, and only by it
 *
 * POPULATION: every Select in the app is this one component (`src/components/ui/select.tsx`); §0 asserts the
 * trigger has exactly one key handler and the list exactly one window listener, so nothing reads keys unseen.
 * ⚠️ WHAT IT CANNOT SEE: it reads the source, not React. The keys themselves are driven by
 * `npm run qa:select-keyboard` against a local dev server, which must be green after any change here.
 *
 * `KP_SRC` points it at a COPY of the tree; unset, it reads `src/`.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.KP_SRC || join(ROOT, "src");
const KIT = join(SRC, "components", "ui", "select.tsx");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && detail ? ` — ${detail}` : ""}`);
  return cond;
};

/** The body of `const <name> = (…) => { … }`, from after its opening brace to its matching close. */
function arrowBody(src: string, name: string): string | null {
  const m = new RegExp(`const\\s+${name}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`).exec(src);
  if (!m) return null;
  let depth = 0;
  for (let i = m.index + m[0].length - 1; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(m.index + m[0].length, i);
  }
  return null;
}

type Verdict = { closedOnly: boolean; stopsOpeningKey: boolean; spaceCommits: boolean; spaceNotSearch: boolean };
function judge(raw: string): Verdict {
  const src = decomment(raw);
  const trigger = arrowBody(src, "onTriggerKey") ?? "";
  const list = arrowBody(src, "onKey") ?? "";
  return {
    closedOnly: /^\s*if\s*\(\s*open\s*\)\s*return\s*;/.test(trigger),
    stopsOpeningKey: /\be\.stopPropagation\(\)/.test(trigger) && /\bopenDropdown\(\)/.test(trigger),
    spaceCommits: /if\s*\(\s*e\.key\s*===\s*"Enter"\s*\|\|\s*e\.key\s*===\s*" "\s*\)\s*\{[^}]*\bpick\(/.test(list),
    spaceNotSearch: /if\s*\(\s*e\.key\s*!==\s*" "\s*&&\s*e\.key\.length\s*===\s*1\b/.test(list),
  };
}

console.log(`kit: ${KIT}${process.env.KP_SRC ? "   (KP_SRC override)" : ""}`);
const raw = existsSync(KIT) ? readFileSync(KIT, "utf8").replace(/\r\n/g, "\n") : "";
if (!ok("0.0 the kit Select exists", raw.length > 0, KIT)) { console.log(`\nselect-keyboard: ${pass} passed, ${fail} failed`); process.exit(1); }
const code = decomment(raw);

console.log("\n§0 · the population: one key handler on the trigger, one window listener for the list");
ok("0.1 exactly one `onKeyDown={onTriggerKey}` on the trigger", (code.match(/onKeyDown=\{onTriggerKey\}/g) ?? []).length === 1);
ok("0.2 exactly one window keydown listener, and it is the list's `onKey`",
  (code.match(/window\.addEventListener\(\s*"keydown"/g) ?? []).length === 1 && /window\.addEventListener\(\s*"keydown",\s*onKey\s*\)/.test(code));
ok("0.3 both handlers were found, so §1–§3 read real bodies", arrowBody(code, "onTriggerKey") !== null && arrowBody(code, "onKey") !== null);

const v = judge(raw);
console.log("\n§1 · the trigger acts only while the list is closed");
ok("1.1 onTriggerKey returns at once while the list is open — so a key can never re-open it and reset the highlight", v.closedOnly);
console.log("\n§2 · the opening key stops at the trigger");
ok("2.1 the key that opens the list is stopped (stopPropagation) — so it cannot also move the new list's highlight", v.stopsOpeningKey);
console.log("\n§3 · the list commits on Enter and on Space");
ok("3.1 Enter and Space both commit the highlighted option (APG select-only combobox)", v.spaceCommits);
ok("3.2 Space is not a type-to-search key", v.spaceNotSearch);

console.log("\n§4 · CONTROLS — each defect planted into the real source is reported by its own check, and only by it");
const plant = (from: string, to: string) => {
  const n = raw.split(from).length - 1;
  return n === 1 ? raw.replace(from, to) : null;
};
const controls: { name: string; src: string | null; owns: keyof Verdict }[] = [
  { name: "the open-guard removed (every key re-opens the list)", src: plant("    if (open) return;\n", ""), owns: "closedOnly" },
  { name: "the opening key no longer stopped (ArrowDown opens AND moves)", src: plant("      e.stopPropagation();\n", ""), owns: "stopsOpeningKey" },
  { name: "Space no longer commits", src: plant('if (e.key === "Enter" || e.key === " ") {', 'if (e.key === "Enter") {'), owns: "spaceCommits" },
  { name: "Space back in type-to-search", src: plant('if (e.key !== " " && e.key.length === 1', "if (e.key.length === 1"), owns: "spaceNotSearch" },
];
for (const c of controls) {
  if (!ok(`4.${c.owns} · PLANTED — ${c.name}: the anchor is found exactly once`, c.src !== null)) continue;
  const p = judge(c.src!);
  const others = (Object.keys(p) as (keyof Verdict)[]).filter((k) => k !== c.owns);
  ok(`4.${c.owns} · …and ONLY ${c.owns} goes red`, p[c.owns] === false && others.every((k) => p[k] === true), JSON.stringify(p));
}

console.log(`\nselect-keyboard: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
