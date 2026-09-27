/**
 * ⛔ "SAVED" IS JUDGED WHEN THE SAVE ENDS — as a gate that fails, not a comment a refactor can outlive.
 *
 *   npx tsx scripts/save-cycle.test.mts     (npm run test:save-cycle)
 *
 * The owner, 2026-09-26: *"users are confused whether the save worked or not"*. The pending-changes bar
 * answers with "Saved" — and a "Saved" that is sometimes a lie is worse than none. The first version
 * decided it when the form went CLEAN while saving, so an officer who typed the old values back mid-save
 * got "Saved" before the result, and — if the save then failed — beside its own "Couldn't save".
 * 🔴 AND NOTHING FAILED WHEN IT DID (review, 2026-09-26): every gate reads the bar's SHAPE, none its
 * timing, so reverting to the clean-while-saving rule passed them all. This file is the gate that bites.
 *
 * WHAT IT HOLDS
 *   §0 the decision it drives IS the shipped one: `decideSaveCycle` is read out of the kit itself, and
 *      `PendingChangesBar` calls it, stores its cycle and obeys its verdict — with no private copy of
 *      the rules left in the component (so this file cannot go green over a function nobody calls)
 *   §1 the save cycles, one commit at a time, each asserted verdict by verdict
 *   §2 a control — every verdict the bar can reach was reached, so §1 is not a pass over one branch
 *
 * ⚠️ WHAT IT CANNOT SEE, stated so nobody reads it as more. It drives the DECISION, not React: that the
 * layout effect runs on the commits the scenarios model, that the page-wide edit count really counts
 * trusted input/change/click, and what paints, are the live drive's (`npm run qa:single-save`).
 *
 * `KP_SRC` points it at a COPY of the tree (a mutated kit, for the control); unset, it reads `src/`.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { endOfBracket } from "./lib/jsx-open-tag.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.KP_SRC || join(ROOT, "src");
const KIT = join(SRC, "components", "ui", "unsaved-changes.tsx");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "", why = "") => {
  cond ? pass++ : fail++;
  const tail = cond ? why : detail;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${tail ? ` — ${tail}` : ""}`);
  return cond;
};
let scratch: string | null = null;
const finish = (): never => {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};

console.log(`kit: ${KIT}${process.env.KP_SRC ? "   (KP_SRC override)" : ""}`);

// ===========================================================================
console.log("\n§0 · the decision this file drives is the one the bar ships");
// ===========================================================================
const kit = existsSync(KIT) ? decomment(readFileSync(KIT, "utf8")) : "";
if (!ok("0.0 the kit exists", kit.length > 0, KIT)) finish();

const defs = [...kit.matchAll(/\bexport\s+function\s+decideSaveCycle\s*\(/g)];
const defAt = defs[0]?.index ?? -1;
const paramsOpen = defAt < 0 ? -1 : kit.indexOf("(", defAt);
const paramsClose = paramsOpen < 0 ? -1 : endOfBracket(kit, paramsOpen);
const bodyOpen = paramsClose < 0 ? -1 : kit.indexOf("{", paramsClose);
const bodyClose = bodyOpen < 0 ? -1 : endOfBracket(kit, bodyOpen);
const fnSrc = bodyClose < 0 ? "" : kit.slice(defAt, bodyClose + 1);
ok("0.1 the kit exports exactly one `decideSaveCycle`, read to its closing brace",
   defs.length === 1 && fnSrc.length > 0,
   defs.length !== 1 ? `${defs.length} definitions found` : "its body could not be closed — the reader lost sync",
   `${fnSrc.split("\n").length} lines`);

const landing = /\bconst\s+LANDING_MS\s*=\s*([\d_]+)\s*;/.exec(kit);
ok("0.2 the landing window `LANDING_MS` is a number the kit names", !!landing,
   "no `const LANDING_MS = <number>;` — the window the decision reads cannot be carried with it",
   landing ? `${landing[1]} ms` : "");

/* The component — from its own `export function` to the next one, so a JSX lexing limit cannot lose it. */
const compAt = kit.search(/\bexport\s+function\s+PendingChangesBar\s*\(/);
const compEnd = compAt < 0 ? -1 : kit.indexOf("\nexport function ", compAt + 1);
const comp = compAt < 0 ? "" : kit.slice(compAt, compEnd < 0 ? kit.length : compEnd);
const calls = [...kit.matchAll(/\bdecideSaveCycle\s*\(/g)]
  .map((m) => m.index ?? 0)
  .filter((i) => !(i >= defAt && i <= bodyClose));
const inComp = calls.filter((i) => i > compAt && (compEnd < 0 || i < compEnd));
ok("0.3 ⭐ `PendingChangesBar` CALLS it — outside the function's own definition",
   comp.length > 0 && inComp.length >= 1,
   comp.length === 0 ? "no `export function PendingChangesBar(` in the kit"
     : calls.length === 0 ? "nothing calls `decideSaveCycle` — the tested rules would not be the shipped ones"
     : "it is called, but not from `PendingChangesBar`",
   `${inComp.length} call(s) in the component`);

const callAt = inComp[0] ?? -1;
const callArgs = callAt < 0 ? "" : (() => {
  const o = kit.indexOf("(", callAt);
  const c = endOfBracket(kit, o);
  return c < 0 ? "" : kit.slice(o, c + 1);
})();
ok("0.4 the call passes the page-wide edit count and the clock",
   /\beditEpoch\b/.test(callArgs) && /\bDate\.now\(\s*\)/.test(callArgs),
   `the call reads ${JSON.stringify(callArgs.replace(/\s+/g, " ").slice(0, 160))} — without both, an edit mid-save or a late landing cannot be told apart`);

const storesCycle = /\.current\s*=\s*[A-Za-z_$][\w$]*\s*\.\s*cycle\b/.test(comp);
const reads = ["saved", "hold", "dirty"].filter((s) => !new RegExp(`\\.show\\s*===\\s*"${s}"`).test(comp));
ok("0.5 the component stores the verdict's cycle and obeys every verdict it can act on",
   storesCycle && reads.length === 0,
   !storesCycle ? "the verdict's `cycle` is never stored back — every commit would be judged as the first, and nothing could ever land"
     : `the component never tests \`show === "${reads.join('" / "')}"\` — a verdict it ignores is a rule that does not ship`);

const privateCopy = ["LANDING_MS", "landUntil", "startedDirty"].filter((w) => new RegExp(`\\b${w}\\b`).test(comp));
ok("0.6 the component keeps no private copy of the rules",
   privateCopy.length === 0,
   `the component itself reads ${privateCopy.join(", ")} — the cycle's internals belong to decideSaveCycle alone, or the tested logic is not the shipped logic`);

const others = /\bconst\s+others\s*=\s*([^;]+);/.exec(comp)?.[1] ?? "";
ok("0.7 \"+N more unsaved\" counts only entries that are dirty — a HELD entry is clean",
   /\.props\.current\.dirty\b/.test(others),
   others ? `others = ${others.replace(/\s+/g, " ")} — a held save would read as "+1 more unsaved change"` : "no `const others = …;` in the component");

if (fail) finish();

/* ⭐ THE SHIPPED FUNCTION, LOADED AS IT IS WRITTEN. The kit is a client component (JSX, React, the path
   alias) and cannot be imported here, so the function's own source — plus the one constant it reads — is
   written to a scratch module and imported. Types are erased on import, never checked, never edited. */
type Commit = { dirty: boolean; saving: boolean; hasSave: boolean; savedLabel: string | false; editEpoch: number; now: number };
type Verdict = { cycle: unknown; show: "dirty" | "hold" | "none" } | { cycle: unknown; show: "saved"; text: string };
type Decide = (prev: unknown, next: Commit) => Verdict;
let decide: Decide | null = null;
try {
  scratch = mkdtempSync(join(tmpdir(), "kp-save-cycle-"));
  const file = join(scratch, "decide-save-cycle.mts");
  writeFileSync(file, `const LANDING_MS = ${landing?.[1]};\n${fnSrc}\n`);
  const mod = (await import(pathToFileURL(file).href)) as { decideSaveCycle?: Decide };
  decide = typeof mod.decideSaveCycle === "function" ? mod.decideSaveCycle : null;
} catch (e) {
  console.log(`     load error: ${(e as Error).message}`);
}
if (!ok("0.8 the extracted function loads on its own (it reads nothing but its inputs and LANDING_MS)", decide !== null,
        "it could not be imported — it reaches for something outside itself, so it is not the pure decision")) finish();

// ===========================================================================
console.log("\n§1 · the save cycles, one commit at a time");
// ===========================================================================
/**
 * One bar's life. The first commit is the mount (`prev` = null); each step is one later commit and
 * changes only what it names. A verdict prints as its show, and "saved" with the words it would say.
 */
type Step = (c: Commit) => Partial<Commit>;
const MOUNT: Commit = { dirty: false, saving: false, hasSave: true, savedLabel: "Saved", editEpoch: 0, now: 0 };
const seen = new Set<string>();
function drive(steps: Step[], mount: Partial<Commit> = {}): string[] {
  const f = decide as Decide;
  let c: Commit = { ...MOUNT, ...mount };
  let v = f(null, c);
  const out = [v.show === "saved" ? `saved:${v.text}` : v.show];
  for (const s of steps) {
    c = { ...c, ...s(c) };
    v = f(v.cycle, c);
    out.push(v.show === "saved" ? `saved:${v.text}` : v.show);
  }
  for (const x of out) seen.add(x.split(":")[0]);
  return out;
}
/* The officer's and the form's moves. ⚠️ Every trusted input, change or click bumps the page-wide count —
   including the click on Save itself, which the capture listener counts BEFORE `saving` rises, so it is
   inside the cycle's baseline and never reads as an edit made during the save. */
const edit: Step = (c) => ({ dirty: true, editEpoch: c.editEpoch + 1 });
const typeBack: Step = (c) => ({ dirty: false, editEpoch: c.editEpoch + 1 });
const discard: Step = (c) => ({ dirty: false, editEpoch: c.editEpoch + 1 });
const clickSave: Step = (c) => ({ saving: true, editEpoch: c.editEpoch + 1 });
const markSaved: Step = () => ({ dirty: false });
const pendingEnds: Step = () => ({ saving: false });
const refused: Step = () => ({ saving: false });
const landsClean: Step = () => ({ saving: false, dirty: false });
const propsArrive: Step = () => ({ dirty: false });
const withdrawSave: Step = () => ({ hasSave: false });
const both = (...s: Step[]): Step => (c) => s.reduce((acc, f) => ({ ...acc, ...f({ ...c, ...acc }) }), {} as Partial<Commit>);
const after = (ms: number, s: Step): Step => (c) => ({ ...s(c), now: c.now + ms });

let n = 0;
function scenario(label: string, got: string[], want: string[], why: string) {
  const same = got.length === want.length && got.every((x, i) => x === want[i]);
  ok(`1.${++n} ${label}`, same, `got [${got.join(", ")}], want [${want.join(", ")}] — ${why}`, `[${got.join(", ")}]`);
}

scenario("markSaved inside the transition, then the pending ends → HOLD, then Saved",
  drive([edit, clickSave, markSaved, pendingEnds]),
  ["none", "dirty", "dirty", "hold", "saved:Saved"],
  "a form clean before its save ends must keep the bar (spinner and all) and say Saved only when it ends");

scenario("clean in the same commit as `saving` falls → Saved",
  drive([edit, clickSave, landsClean]),
  ["none", "dirty", "dirty", "saved:Saved"],
  "the plainest landed save");

scenario("the save ends still dirty and refreshed props clean it 1.4 s later → Saved",
  drive([edit, clickSave, after(300, pendingEnds), after(1_400, propsArrive)]),
  ["none", "dirty", "dirty", "dirty", "saved:Saved"],
  "props that arrive inside the landing window are that save landing");

scenario("…but 2 s later → no Saved",
  drive([edit, clickSave, after(300, pendingEnds), after(2_000, propsArrive)]),
  ["none", "dirty", "dirty", "dirty", "none"],
  "past the window, a clean is not evidence of this save");

scenario("a refused save stays dirty, then Discard inside the window → no Saved",
  drive([edit, clickSave, after(300, refused), after(200, discard)]),
  ["none", "dirty", "dirty", "dirty", "none"],
  "Discard is a click, so it is an edit, and a refusal followed by Discard must never read as a save");

scenario("⭐ typed back to the old values mid-save, then the save fails → not held, no Saved",
  drive([edit, clickSave, typeBack, refused]),
  ["none", "dirty", "dirty", "none", "none"],
  "the defect this file exists for: the clean came from the officer, not the save");

scenario("`savedLabel={false}` → held, but never Saved",
  drive([edit, clickSave, markSaved, pendingEnds], { savedLabel: false }),
  ["none", "dirty", "dirty", "hold", "none"],
  "false turns the words off, not the hold");

scenario("a form whose save is an addition says its own words",
  drive([edit, clickSave, landsClean], { savedLabel: "Staff added" }),
  ["none", "dirty", "dirty", "saved:Staff added"],
  "the verdict carries the caller's label");

scenario("no Save offered (a decision bar) → never held, never Saved",
  drive([edit, clickSave, markSaved, pendingEnds], { hasSave: false }),
  ["none", "dirty", "dirty", "none", "none"],
  "a bar that offered no Save cannot claim one landed");

scenario("the save began on a clean form → nothing",
  drive([clickSave, pendingEnds]),
  ["none", "none", "none"],
  "nothing was unsaved, so nothing was saved");

scenario("a plain Discard → nothing",
  drive([edit, discard]),
  ["none", "dirty", "none"],
  "Discard never sets saving");

scenario("a Discard after an earlier save landed → nothing",
  drive([edit, clickSave, landsClean, after(500, edit), after(100, discard)]),
  ["none", "dirty", "dirty", "saved:Saved", "dirty", "none"],
  "the earlier cycle is spent; its window must not carry over");

scenario("a Save offered when the save began and withdrawn by the end → Saved",
  drive([edit, clickSave, both(markSaved, withdrawSave), pendingEnds]),
  ["none", "dirty", "dirty", "hold", "saved:Saved"],
  "a form whose onSave exists only while dirty withdraws it the moment it is clean; what counts is the offer at the start");

scenario("a new edit ends Saved — and the clean after it is not a second Saved",
  drive([edit, clickSave, landsClean, edit, typeBack]),
  ["none", "dirty", "dirty", "saved:Saved", "dirty", "none"],
  "the bar ends this form's Saved on a dirty verdict; typing back afterwards saved nothing");

scenario("⭐ a trusted edit mid-save, then markSaved and the pending ends → no hold, no Saved",
  drive([edit, clickSave, edit, markSaved, pendingEnds]),
  ["none", "dirty", "dirty", "dirty", "none", "none"],
  "what was saved is not what is on screen, so the save cannot vouch for it");

scenario("a trusted edit mid-save, then a clean landing in one commit → no Saved",
  drive([edit, clickSave, edit, landsClean]),
  ["none", "dirty", "dirty", "dirty", "none"],
  "the same, when the result and the clean arrive together");

// ===========================================================================
console.log("\n§2 · control — the scenarios reached every verdict");
// ===========================================================================
const missing = ["dirty", "hold", "saved", "none"].filter((s) => !seen.has(s));
ok("2.1 CONTROL — every verdict the bar acts on was produced at least once", missing.length === 0,
   `never produced: ${missing.join(", ")} — the scenarios stopped reaching a branch`, `${n} scenarios`);

finish();
