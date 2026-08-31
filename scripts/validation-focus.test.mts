/**
 * test:validation-focus — DG-S-05 + DG-S-06 (DESIGN-GATE-2026-08-28 step 5), §K rule 7d.
 *
 *   "Validation takes you to the place where the missing item is." — Ali, 2026-08-29
 *
 * ⛔ THE TWO HALVES RUN IN ORDER AND THE GATE CHECKS BOTH, because half of this is useless.
 * DG-S-06's focus helper cannot work unless DG-S-05's refusal NAMES a field: if the server says
 * "this is wrong" without an address, no client code can take anyone anywhere. So §1 proves the
 * address surface exists, §2 proves the helper is correct, and §3 proves nobody has re-grown a
 * private copy of the helper beside it.
 *
 * ⚠️ WHAT THIS GATE DOES NOT PROVE, said out loud: it is static, and it does NOT assert that
 * every admin action names a field. 34 files carry `"use server"` and the migration is
 * deliberately per-action — several are money-adjacent, and a blind sweep over an action that
 * moves money is how a correct control breaks. Asserting full adoption today would mean either
 * a red gate nobody can land or an allowlist of 30-odd filenames, which §A1 forbids. The
 * remainder is carried in the planner, in writing, where a number can be checked.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = process.env.KP_SRC || join(here, "..", "src");

let fail = 0;
const ok = (name: string, pass: boolean, detail = "") => {
  console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${pass || !detail ? "" : ` — ${detail}`}`);
  if (!pass) fail++;
};

/**
 * ⛔ Comments stripped — this repo's files quote the idioms its gates hunt, at length — and
 * through the SHARED `decomment`, never a private copy. `test:decomment` ratchets private
 * strippers downward because this helper was once pasted into 40 files in four spellings (the
 * E-108 shape), and a pair of regexes has an ORDER that is a choice between two measured
 * blindnesses. The shared one also leaves `://` alone and stops an unmatched quote at end of
 * line, so a lone backtick cannot open a template that swallows the rest of the file as code.
 */
import { decomment } from "./lib/decomment.mts";

function walk(dir: string, ext = ".tsx"): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full, ext));
    else if (e.endsWith(ext)) out.push(full);
  }
  return out;
}
const read = (p: string) => { try { return decomment(readFileSync(p, "utf8")); } catch { return ""; } };

console.log("──────────────────────────────────────────────────────────────────────");
console.log("§K rule 7d · VALIDATION TAKES YOU THERE (DG-S-05 + DG-S-06)");
console.log("──────────────────────────────────────────────────────────────────────");

console.log("\n§1 · DG-S-05 — a refusal can name its field");
const surface = read(join(SRC, "lib", "server", "field-error.ts"));
ok("1.1 the field-error surface exists", surface.length > 0);
ok("1.2 it exports a fieldError() helper", /export function fieldError\s*\(/.test(surface));
ok("1.3 the failure type carries an optional `field`", /field\?\s*:\s*string/.test(surface),
   "optional, so every existing { ok:false, error } still type-checks — additive, not a sweep");
const wrapper = read(join(SRC, "lib", "client", "run-admin-action.ts"));
ok("1.4 the client wrapper preserves `field` on the way back", /field\?\s*:\s*string/.test(wrapper),
   "runAdminAction is every admin mutation's return path; if it drops the field, the address never arrives");

console.log("\n§2 · DG-S-06 — the helper takes you to the RIGHT place, and says when it cannot");
const helper = read(join(SRC, "lib", "client", "focus-first-invalid.ts"));
ok("2.1 the helper exists", helper.length > 0);
ok("2.2 it picks by DOCUMENT order, not error order", /querySelectorAll<[^>]*>\("\[data-field\]"\)/.test(helper),
   "Object.keys(errs)[0] is the validator's order — it can scroll PAST the first empty field");
ok("2.3 it focuses any control, not only <input>", /textarea/.test(helper) && /select/.test(helper),
   "22 textareas and 41 selects under src/app/admin would get a scroll and no keyboard");
/* 🔴 KEYED ON THE RETURN, NOT THE TYPE — AND IT TOOK THE CONTROL TWICE TO GET THERE.
   Draft 1 matched the bare string `"not-rendered"`; draft 2 matched `reason: "not-rendered"`.
   BOTH still matched the RESULT UNION at the top of this helper, which declares the very same
   pair — so gutting the actual return left the type behind and the gate passed over a helper
   that had stopped refusing. §M4's shape twice over: a guard reading the SPELLING of a thing
   rather than the thing.
   ⭐ The discriminator is punctuation: a TYPE member ends `;`, a returned PROPERTY ends `,`.
   ⚠️ That is narrow, and narrow is the point — a wider match is what was wrong. If this ever
   goes red after a reformat, re-read the helper before relaxing it. */
ok("2.4 it REFUSES LOUDLY when the field is not rendered", /reason:\s*"not-rendered"\s*,/.test(helper),
   "§K rule 7d's named defect: a field on an unrendered tab returned null and nothing said why");
ok("2.5 …and it names the tab that owns it", /data-section-rail/.test(helper),
   "so a caller can switch tab BEFORE focusing, which is what 7d requires");
ok("2.6 it honours BOTH motion tiers (§M6)", /prefers-reduced-motion/.test(helper) && /data-motion/.test(helper),
   "the in-app tier is not the OS setting; checking one obeys half the readers");
ok("2.7 it does not race its own scroll with a timeout", !/setTimeout/.test(helper),
   "a fixed delay against an animation resolves differently on a slow machine");

console.log("\n§3 · nobody keeps a private copy beside it");
/**
 * POPULATION — every `.tsx` that scrolls to something error-shaped. ⛔ A second hand-rolled
 * scroll-to-error is how the four defects DG-S-06 fixed got written in the first place; the
 * point of a kit helper is that the next form does not re-derive them.
 */
const clients = walk(join(SRC, "app")).concat(walk(join(SRC, "components")));
const rogue = clients.filter((f) => {
  const s = read(f);
  if (!/scrollIntoView/.test(s)) return false;
  // Error-shaped: it scrolls in the same file that talks about invalid fields.
  return /\[data-field=|firstError|invalidField|errs\[|fieldErrors/.test(s);
}).filter((f) => !f.endsWith("focus-first-invalid.ts"));
const rel = (f: string) => f.slice(SRC.length + 1).replace(/\\/g, "/");
ok("3.1 no file hand-rolls a scroll-to-first-error", rogue.length === 0, rogue.map(rel).join(", "));

// ===========================================================================
console.log("\n§4 · DG-S-05 — every address a REFUSAL names must EXIST on the screen");
// ===========================================================================
/**
 * 🔴 THIS IS THE ONE HOLE `field-error.ts` DOCUMENTS AS UNCHECKABLE. Its own header says the
 * address *"MUST MATCH A RENDERED `data-field`, and nothing can check that for you across the
 * server/client boundary — a typo here degrades to 'no focus happens'"*. That is true at
 * runtime and it is exactly why the failure is dangerous: a misspelt address does not throw, it
 * silently reverts to the behaviour this whole row existed to replace, and the wire still LOOKS
 * connected in review. Nothing can check it inside one request; something can check it across
 * the tree, which is what this does.
 *
 * ⛔ ONE DIRECTION ONLY, and the asymmetry is the point. Every literal address a server NAMES
 * must be rendered somewhere. The reverse is NOT required: a `data-field` with no `fieldError`
 * naming it is legitimate — a client-side rule may own that field (`ai-polls` validates
 * `title`/`selDate`/`resDate` in the browser), and `sources` computes its address at runtime
 * (`fieldError(firstEmpty, …)`), so its three names are rendered and never appear as literals.
 *
 * ⚠️ WHAT IT CANNOT SEE, stated plainly: both sides are matched as STRING LITERALS. An address
 * built by interpolation on either side is invisible here, and would pass. It reads the source
 * tree, not the DOM, so it cannot know whether the element is ever actually rendered on the
 * route that refuses — only that the name exists somewhere. That is strictly more than nothing,
 * and strictly less than a drive.
 */
{
  /* ⛔ BOTH EXTENSIONS. The server half lives in `.ts` action files and the client half in
     `.tsx`; walking only one is how this check would have read half its own population. */
  const allFiles = [...walk(SRC, ".ts"), ...walk(SRC, ".tsx")];
  const named = new Map<string, string[]>();
  const rendered = new Set<string>();
  for (const f of allFiles) {
    const s = decomment(readFileSync(f, "utf8"));
    for (const m of s.matchAll(/fieldError\(\s*"([^"]+)"/g)) {
      if (!named.has(m[1])) named.set(m[1], []);
      named.get(m[1])!.push(rel(f));
    }
    for (const m of s.matchAll(/data-field=\{?"([^"]+)"/g)) rendered.add(m[1]);
    for (const m of s.matchAll(/dataField=\{?"([^"]+)"/g)) rendered.add(m[1]);
  }
  const missing = [...named.keys()].filter((k) => !rendered.has(k));
  ok(`4.1 every literal address a refusal names is rendered as a data-field (${named.size} named · ${rendered.size} rendered)`,
    missing.length === 0,
    missing.map((k) => `"${k}" named by ${named.get(k)!.join(", ")} but rendered nowhere`).join(" · "));

  /* ⛔ A COVERAGE FLOOR. 4.1 passes trivially over an empty set, and this row's whole history is
     instruments that went green because the population shrank. If the scan stops finding
     addresses at all, that is a broken reader, not a clean tree. */
  ok("4.2 CONTROL — the address population is non-empty, so a pass means resolved and not unread",
    named.size >= 15 && rendered.size >= 15,
    `named ${named.size}, rendered ${rendered.size} — the scan has lost its subject set`);
}

console.log(`\n${fail ? `🔴 ${fail} failing` : "✅ a refusal can name its field, the helper takes you there or says why not, and every address it names exists"}`);
process.exit(fail ? 1 : 0);
