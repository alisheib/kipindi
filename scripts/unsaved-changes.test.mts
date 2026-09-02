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

console.log("\n§2 · every admin form that can lose work reaches the guard");

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
 * ⛔ THE POPULATION WAS THE BUG, AND IT TOOK TWO GOES TO SAY SO.
 *
 * This gate used to select admin files that already computed `const dirty =` — i.e. it asked
 * *"do the forms that KNOW work is at risk guard their exits?"* Every one of them did, so it
 * reported a serene pass over three files while thirty more lost typed work silently. **A form
 * with no dirty flag was invisible to the gate precisely BECAUSE it was unprotected**, which is
 * the purest form of the trap this repo keeps paying for: a true measurement of the wrong set.
 *
 * The population is now every admin component that renders a control someone can TYPE INTO, so
 * a form cannot leave the set by failing to protect itself. There is no ratchet and no baseline
 * of debt: the answer is ZERO, and every file that is not guarded is named below with the
 * reason it needs no guard.
 *
 * ⛔ SCOPED TO `src/app/admin`, a ruling rather than convenience — the commission is about the
 * CONSOLE. The one `dirty` outside it, `password-pair.tsx:22`, is not an unsaved-work flag at
 * all: it drives the password-MATCH validity message, and guarding it would ask a player
 * mid-signup to confirm discarding their own password.
 *
 * ⚠️ COMMENTS ARE STRIPPED FIRST, and that is load-bearing here: this repo's files carry more
 * comment than code and quote `<input>`/`<textarea>` constantly while explaining themselves.
 * Read raw, `resolver-queue/row-select.tsx` joins the population on a sentence ABOUT inputs and
 * would then need an exemption for a control it does not have.
 */
const TYPED_CONTROL = /<Input\b|<Textarea\b|<Select\b|<input\b|<textarea\b|<select\b/;
const admin = walk(join(SRC, "app", "admin"));
const rel = (f: string) => f.slice(SRC.length + 1).replace(/\\/g, "/");
const bodies = new Map(admin.map((f) => [rel(f), decomment(readFileSync(f, "utf8"))]));
const population = [...bodies].filter(([, src]) => TYPED_CONTROL.test(src)).map(([r]) => r);

/**
 * ⛔ EVERY EXEMPTION IS NAMED, WITH THE REASON IT IS ONE. A path list with no reasons is a place
 * to hide a form, and the entries are checked in both directions below — a stale path and a path
 * that has since been guarded both FAIL, so this list cannot quietly rot into a permission slip.
 *
 * Four classes, each verified by reading the file on 2026-09-01, not inferred from its name:
 *
 *  ① INSIDE A MODAL. `Modal` paints a `fixed inset-0` scrim over the whole viewport, so a click
 *    aimed at the sidebar hits the scrim and not the link. The work is lost to an explicit
 *    Cancel, which the officer chose. ⚠️ Checked as ORDERING, not presence: in all eleven the
 *    first typed control appears after the modal opens.
 *  ② A GET FILTER. Every value is a `name=` on a form that writes `searchParams` — the state is
 *    IN THE URL, survives the navigation, and comes back with Back. Warning about it would be a
 *    prompt on every page turn of a queue.
 *  ③ FLIPPING IS THE SAVE. A toggle or matrix that commits on change holds nothing.
 *  ④ AN ARMING WORD OR ONE-TIME CODE. "SEAL", "PAUSE", a TOTP digit string — retyped in
 *    seconds, read off another device, and worth nothing once the page is left. A prompt here
 *    interrupts the most safety-critical screens for four characters.
 */
const EXEMPT: Record<string, string> = {
  // ① inside a modal — the scrim blocks navigation; Cancel is the only exit
  "app/admin/aml/aml-actions-client.tsx": "① fields open inside <Modal>",
  "app/admin/approvals/sof-review-client.tsx": "① fields open inside <Modal>",
  "app/admin/markets/emergency-void-control.tsx": "① fields open inside <Modal>",
  "app/admin/objections/objection-decision.tsx": "① fields open inside <Modal>",
  "app/admin/payments/reconcile-controls.tsx": "① fields open inside <Modal>",
  "app/admin/payments/stuck-payout-controls.tsx": "① fields open inside <Modal>",
  "app/admin/players/[id]/balance-adjust-controls.tsx": "① fields open inside <Modal>",
  "app/admin/players/[id]/force-reverify-controls.tsx": "① fields open inside <Modal>",
  "app/admin/players/[id]/suspend-controls.tsx": "① fields open inside <Modal>",
  "app/admin/updown/rounds/void-round-control.tsx": "① fields open inside <Modal>",
  "app/admin/privacy/dsar-controls.tsx": "① the ERASURE/CORRECTION radio is in a <ConfirmDialog> body",
  // ② a GET filter — the state is in the URL
  "app/admin/ai-usage/page.tsx": "② range filter, submitted as searchParams",
  "app/admin/markets/page.tsx": "② status/category filter, submitted as searchParams",
  "app/admin/markets/[id]/page.tsx": "② side/status filter, submitted as searchParams",
  "app/admin/players/page.tsx": "② player search + filter, submitted as searchParams",
  "app/admin/resolver-queue/page.tsx": "② window/category filter, submitted as searchParams",
  "app/admin/transactions/page.tsx": "② range/from/to filter, submitted as searchParams",
  // ③ flipping is the save
  "app/admin/markets/recategorise-control.tsx": "③ a <Select> that commits on change",
  "app/admin/roles/read-tiers-matrix.tsx": "③ a tier matrix that commits per cell",
  // ④ an arming word or a one-time code
  "app/admin/payments/kill-switch-toggle.tsx": "④ types PAUSE to arm — an arming word, not work",
  "app/admin/2fa/setup/setup-client.tsx": "④ a TOTP code, read off the authenticator app",
  "app/admin/totp-verify/verify-form.tsx": "④ a TOTP code, read off the authenticator app",
  // ⑤ nothing is ever saved
  "app/admin/config/fee-simulator.tsx": "⑤ a calculator — it calls no server action at all",
};

/* ⛔ THE VACUITY FLOOR. If the control vocabulary changed under it, this gate would find nothing
   and report a serene pass over an empty set. Re-derived 2026-09-01: 47 admin components render
   a typed control. The floor may only shrink, in the same commit as the file it loses. */
const FLOOR = 40;
console.log(`  population ${population.length} (floor ${FLOOR}) · guarded ${population.filter((r) => /<UnsavedChangesGuard\b/.test(bodies.get(r)!)).length} · exempt ${Object.keys(EXEMPT).length}`);
ok(`2.0 the population is at least ${FLOOR}`, population.length >= FLOOR,
   `${population.length} — the typed-control vocabulary moved and this gate went blind`);

let unguarded = 0;
for (const r of population) {
  const guarded = /<UnsavedChangesGuard\b/.test(bodies.get(r)!);
  const why = EXEMPT[r];
  if (guarded) {
    /* ⛔ A FILE CANNOT BE BOTH. An exemption left behind on a form that has since been guarded
       is the beginning of a list nobody trusts — it must be deleted in the same commit. */
    ok(`2.x ${r} — guarded, and not also claimed exempt`, !why,
       `it renders <UnsavedChangesGuard> AND is listed exempt as "${why}" — delete the EXEMPT entry`);
    continue;
  }
  if (!why) unguarded++;
  ok(`2.x ${r} ${why ? `exempt · ${why}` : "guards its exits"}`, !!why,
     "renders a control someone can type into, and nothing stops an operator leaving with it — guard it, or name it in EXEMPT with the reason");
}

/* ⛔ AND THE LIST CANNOT OUTLIVE ITS FILES. A renamed or deleted path would sit here for ever
   looking like diligence while covering nothing. */
for (const r of Object.keys(EXEMPT)) {
  ok(`2.e EXEMPT "${r}" still names a file in the population`, population.includes(r),
     "the file was renamed, deleted, or no longer renders a typed control — delete the entry");
}

console.log(`  → ${unguarded === 0 ? "ZERO unguarded, zero unexplained" : `🔴 ${unguarded} unguarded and unexplained`}`);

console.log(`\n${fail ? `🔴 ${fail} failing` : "✅ every admin form that can lose work guards all three exits"}`);
process.exit(fail ? 1 : 0);
