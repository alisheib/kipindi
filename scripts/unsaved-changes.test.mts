/**
 * test:unsaved-changes — DG-S-04 (DESIGN-GATE-2026-08-28 step 5), §K rule 7d.
 *
 *   "A form that can lose work guards all three of its exits."
 *
 * ⛔ TWO ASSERTIONS, AND THE SECOND IS THE ONE THAT MATTERS. Checking only that call sites
 * render `<UnsavedChangesGuard>` would pass over a primitive whose body had been emptied —
 * adoption of a no-op is the vacuous pass this programme keeps paying for. So §1 proves the
 * PRIMITIVE still installs the exits it claims, and §2 proves the call sites reach it.
 *
 * ⚠️ WHAT THIS GATE DOES NOT PROVE, said out loud: it is static. It cannot prove the browser
 * actually shows the prompt, only that the listeners are installed and the modal is wired. The
 * rendered proof is a drive, and a drive cannot be run for `beforeunload` at all — no engine
 * lets script observe its own unload dialog. That limit is the reason §1 reads the source.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
/**
 * 🔴 COMMENTS ARE STRIPPED BEFORE ANYTHING HERE IS READ — and the first draft did not, so §1.6
 * FAILED ON ITS OWN DOCUMENTATION. That check forbids `window.confirm`; the primitive's header
 * forbids it too, in those words, and the gate matched the prohibition and convicted the file
 * for obeying it. ⛔ A guard that reads source must read CODE: this repo's files carry more
 * comment than code by design, and every one of them quotes the idioms the gates hunt.
 *
 * ⛔ THROUGH THE SHARED `decomment`, NEVER A PRIVATE COPY — the second draft hand-rolled three
 * `.replace()` calls and `test:decomment` was right to refuse it. That ratchet exists because
 * this helper was once pasted into 40 files in four spellings (the E-108 shape), and a regex
 * pair has an ORDER that is a choice between two measured blindnesses. The shared one also
 * leaves `://` alone so an unquoted URL survives, and stops an unmatched quote at end of line
 * so a lone backtick cannot open a template literal that swallows the rest of the file.
 */
import { decomment } from "./lib/decomment.mts";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = process.env.KP_SRC || join(here, "..", "src");
const PRIMITIVE = join(SRC, "components", "ui", "unsaved-changes.tsx");

let fail = 0;
const ok = (name: string, pass: boolean, detail = "") => {
  console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${pass || !detail ? "" : ` — ${detail}`}`);
  if (!pass) fail++;
};

console.log("──────────────────────────────────────────────────────────────────────");
console.log("§K rule 7d · UNSAVED CHANGES — a form that can lose work guards its exits");
console.log("──────────────────────────────────────────────────────────────────────");
console.log("\n§1 · the primitive still does what its call sites believe");

let prim = "";
try { prim = decomment(readFileSync(PRIMITIVE, "utf8")); } catch { /* reported below */ }
ok("1.1 the primitive exists", prim.length > 0, PRIMITIVE);

// ① the tab closes.
ok("1.2 exit ① · it installs a beforeunload listener", /addEventListener\(\s*["']beforeunload["']/.test(prim));
ok("1.3 exit ① · …and sets returnValue, which legacy engines require", /returnValue\s*=/.test(prim));
// ② an in-app link, which is also a section-rail tab (§K rule 7d: "a tab switch is an EXIT").
ok("1.4 exit ② · it intercepts clicks in the CAPTURE phase", /addEventListener\(\s*["']click["'][^)]*,\s*true\s*\)/.test(prim),
   "next/link handles clicks on bubble, so a bubble-phase guard runs after the router was already told to go");
ok("1.5 exit ② · …and it can actually stop one", /preventDefault\(\)/.test(prim));
// The prompt is the kit's, not the browser's.
ok("1.6 the prompt is the kit ConfirmModal, never window.confirm", /ConfirmModal/.test(prim) && !/window\.confirm|[^.\w]confirm\s*\(/.test(prim),
   "a native confirm is a second dialog language (§B10) and cannot carry the §A3 ring");

console.log("\n§2 · every admin form with a dirty flag reaches it");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (e.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * POPULATION — admin components that compute a `dirty` boolean, i.e. that KNOW work is at risk.
 *
 * ⛔ SCOPED TO `src/app/admin`, and the reason is a ruling rather than convenience. Ali's
 * commission is about the CONSOLE ("admin pages n tabs … of course keep applying the
 * unsaved-changes detection per page"). The one `dirty` outside it — `password-pair.tsx:22`,
 * `confirm.length > 0` — is not an unsaved-work flag at all: it drives the password-MATCH
 * validity message. Guarding it would prompt "discard changes?" at a player mid-signup, which
 * is a worse product, not a safer one. Named here rather than silently excluded by a path.
 */
const admin = walk(join(SRC, "app", "admin"));
const population = admin.filter((f) => /const\s+dirty\s*=/.test(readFileSync(f, "utf8")));
const rel = (f: string) => f.slice(SRC.length + 1).replace(/\\/g, "/");

/* ⛔ THE VACUITY FLOOR. Re-derived 2026-08-31: three admin components compute a `dirty`. If a
   refactor renames the idiom, this gate would find nothing and report a serene pass over an
   empty set — so it exits non-zero instead. This constant may only shrink, in the same commit
   as the form it loses. */
const FLOOR = 3;
console.log(`  population ${population.length} (floor ${FLOOR}) — ${population.map(rel).join(", ")}`);
ok(`2.0 the population is at least ${FLOOR}`, population.length >= FLOOR,
   `${population.length} — the dirty idiom moved and this gate went blind`);

for (const f of population) {
  const src = readFileSync(f, "utf8");
  ok(`2.x ${rel(f)} guards its exits`, /<UnsavedChangesGuard\b/.test(src),
     "computes `dirty` but nothing stops an operator leaving with it");
}

console.log(`\n${fail ? `🔴 ${fail} failing` : "✅ every admin form that can lose work guards all three exits"}`);
process.exit(fail ? 1 : 0);
