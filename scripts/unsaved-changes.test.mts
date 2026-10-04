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
  // ⭐ STRONGER THAN THE REST OF CLASS ①, and worth the extra words because the difference is
  //    the thing a reviewer would otherwise re-check: this modal sets `closeOnScrim={false}`,
  //    so a stray click cannot dismiss it at all, AND the typed note is deliberately NOT
  //    cleared on Cancel — only after a successful hold — so reopening the dialog restores
  //    what the officer wrote. There is no state in which the work is lost.
  "app/admin/settlement/hold-button.tsx": "① fields open inside <Modal>, scrim-close disabled, and the note survives Cancel",
  "app/admin/objections/objection-decision.tsx": "① fields open inside <Modal>",
  /* ⭐ THE SAME STRONGER FORM AS `hold-button.tsx`, and it is worth the extra words for the same reason. The desk's
   *    master-switch ceremony (C7-SPEC ruling 415) opens its reason field and its typed arming word inside a
   *    <Modal> that sets `closeOnScrim={!pending && !dirty}` — so once ANYTHING has been typed a stray click on the
   *    scrim cannot dismiss it, and while the request is in flight neither the scrim, Esc nor ✕ can. There is no
   *    navigation to guard: the only exits are Cancel and the confirm, and Cancel discards a CONFIRMATION rather
   *    than work in progress. */
  "app/admin/desk/switch-ceremony.tsx": "① the reason and the typed word open inside <Modal>, with scrim-close disabled once anything is typed",
  /* ⭐ THE SAME FORM, AND ONE FIELD STRONGER STILL. The account's action row (C7-SPEC ruling 415) opens its
   *    reason, the holder's password and the typed word inside a <Modal> with the same
   *    `closeOnScrim={!pending && !dirty}`, and it CLEARS the password on every exit including the refusal path —
   *    the one value on that page belonging to somebody else must not sit on screen waiting for a stray Enter.
   *    There is nothing to carry across a navigation, because there is no navigation: Cancel and the confirm are
   *    the only exits, and Cancel discards a CONFIRMATION rather than work in progress. */
  "app/admin/desk/[id]/account-actions.tsx": "① the reason, the holder's password and the typed word open inside <Modal>, with scrim-close disabled once anything is typed",
  /* ⭐ THE SAME STRONGER FORM AS THE DESK CEREMONY, read 2026-09-26. The Owner's Payable / Not payable switch
   *    (`payable-switch.tsx`) renders no typed control on the page itself: its reason <Textarea>, the typed words
   *    <Input> and the "what pays from now" radios exist only inside a <Modal role="alertdialog"> that sets
   *    `closeOnScrim={!pending && !dirty}` and `closeOnEsc={!pending && !dirty}`, where `dirty` is true once ANY
   *    field is entered or the choice moves. So a stray click or key cannot dismiss typed work, and while the
   *    request is in flight nothing can. ⚠️ THREE exits, not two (corrected 2026-09-27): Cancel, the confirm, AND
   *    the dialog's own ✕ (`showClose={!pending}` — shown whenever nothing is sending, dirty or not), which runs
   *    the same `close` as Cancel. Cancel and ✕ are each a deliberate press that discards a CONFIRMATION rather
   *    than work in progress; neither can fire by a stray click on the scrim or a stray Escape. The
   *    reward-settings editor on the same page is a different file, and it is not covered by this entry. */
  "app/admin/affiliate/payable-switch.tsx": "① the reason, the typed words and the choice open inside <Modal>, with scrim-close and Escape disabled once anything is entered; Cancel and ✕ are the deliberate exits",
  /* The new journey's console (Vodacom plan S1, 2026-09-30) — the payable switch's form, one file per ceremony. */
  "app/admin/journey/rollout-control.tsx": "① the reason opens inside <Modal role=alertdialog>, with scrim-close and Escape disabled once anything is typed; Cancel and ✕ are the deliberate exits",
  "app/admin/journey/preview-links.tsx": "① the label and reason (create) and the reason (revoke) open only inside <Modal>, with scrim-close and Escape disabled once anything is typed; Cancel and ✕ are the deliberate exits",
  "app/admin/journey/page.tsx": "nothing can be typed: its only <input>s are type=hidden fields of the two native POST forms to /preview (intent, back)",
  /* ✅ vb7 review m5a (2026-10-03): U22's contact form LEFT this list — it renders <UnsavedChangesGuard> now, over its four
   *    free fields (never the number alone, so a duplicate's "Open the existing contact" asks nothing when only the
   *    number was typed), beside its own in-dialog ask on ✕ and Cancel. The list only shrinks. */
  "app/admin/payments/reconcile-controls.tsx": "① fields open inside <Modal>",
  "app/admin/payments/stuck-payout-controls.tsx": "① fields open inside <Modal>",
  "app/admin/players/[id]/balance-adjust-controls.tsx": "① fields open inside <Modal>",
  "app/admin/players/[id]/force-reverify-controls.tsx": "① fields open inside <Modal>",
  "app/admin/players/[id]/wallet-freeze-controls.tsx": "① fields open inside <Modal> (the reason for a freeze, an unfreeze or a stale identity-hold lift)",
  "app/admin/kyc/[id]/reopen-refusal-control.tsx": "① fields open inside <Modal> (the reason for re-opening a final refusal)",
  "app/admin/players/[id]/suspend-controls.tsx": "① fields open inside <Modal>",
  "app/admin/updown/rounds/void-round-control.tsx": "① fields open inside <Modal>",
  "app/admin/privacy/dsar-controls.tsx": "① the ERASURE/CORRECTION radio is in a <ConfirmDialog> body",
  // ② a GET filter — the state is in the URL
  "app/admin/ai-usage/page.tsx": "② range filter, submitted as searchParams",
  "app/admin/markets/page.tsx": "② status/category filter, submitted as searchParams",
  "app/admin/markets/[id]/page.tsx": "② side/status filter, submitted as searchParams",
  "app/admin/players/page.tsx": "② player search + filter, submitted as searchParams",
  "app/admin/agents/page.tsx": "② application + roster search, submitted as searchParams",
  "app/admin/resolver-queue/page.tsx": "② window/category filter, submitted as searchParams",
  "app/admin/transactions/page.tsx": "② range/from/to filter, submitted as searchParams",
  /* The tax report's period picker (2026-10-04): a month navigates on selection, a typed day or custom window on Go /
     Apply — the destination is built by the page's own link builder, so the period lives in the URL and comes back
     with Back. A date typed and not applied is a picker position, not work. */
  "app/admin/tax/period-jump.tsx": "② the period picker navigates — the period is in the URL (month on selection, day or window on Go/Apply)",
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

console.log("");
console.log("§3 · a draft carries every typed control, and restores into a React-controlled field (vb6)");

/**
 * ⭐ STAND-INS THAT BEHAVE LIKE THE BROWSER WHERE IT MATTERS, AND NOWHERE ELSE. A real control keeps `value` as an
 * accessor on its PROTOTYPE. React, on mount, redefines `value` on the ELEMENT, so every assignment through the element
 * also updates React's record of "the last value I saw", and on an `input` event it calls `onChange` only when the
 * element's value differs from that record. That is the whole mechanism by which a `.value =` restore was swallowed —
 * the field showed the draft until its next render painted the old state back — so it is reproduced exactly.
 * ⛔ Each judge also runs on a PLANTED COPY of the kit's draft helpers — the defect put back into the source, the copy
 * built in memory with esbuild, nothing written — and must go red there; the same copy with nothing planted passes.
 * ⚠️ The kit module is imported from the REAL tree, never from `KP_SRC`: a copy in a temp directory cannot resolve
 * `react`. The planted copies and §3.4 read the source from `SRC`, so a mutated tree is still judged on its own code.
 */
class StandIn {
  readonly events: string[] = [];
  checked = false;
  onEvent: ((e: Event) => void) | null = null;
  #value: string;
  constructor(readonly tagName: string, readonly name: string, readonly type: string, value: string) { this.#value = value; }
  get value(): string { return this.#value; }
  set value(v: string) { this.#value = String(v); }
  dispatchEvent(e: Event): boolean { this.events.push(e.type); this.onEvent?.(e); return true; }
}

/** What React installs on a controlled field (see above), with the field's `onChange`. */
function controlledLikeReact(node: StandIn, onChange: (v: string) => void): void {
  const proto = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), "value");
  if (!proto?.get || !proto.set) throw new Error("the stand-in lost its prototype accessor");
  const get = proto.get, set = proto.set;
  let seen = String(get.call(node));
  Object.defineProperty(node, "value", {
    configurable: true,
    get() { return get.call(this); },
    set(v: string) { seen = String(v); set.call(this, v); },
  });
  node.onEvent = (e) => {
    if (e.type !== "input") return;
    const now = String(get.call(node));
    if (now !== seen) { seen = now; onChange(now); }
  };
}

type Draft = { values: Record<string, string>; flags: Record<string, boolean> };
type DraftKit = { draftValuesOf: (els: Iterable<unknown>) => unknown; restoreDraftInto: (els: Iterable<unknown>, d: Draft) => number };

/* The three judges — each takes the helpers it judges, so the shipped ones and a planted copy face the same test. */
const carries = (k: DraftKit) => {
  const els = [
    new StandIn("INPUT", "amount", "text", "12500"),
    new StandIn("TEXTAREA", "notes", "textarea", "Called twice, no answer"),
    new StandIn("SELECT", "list", "select-one", "vip"),
    new StandIn("INPUT", "pin", "password", "1234"),
    new StandIn("INPUT", "doc", "file", "C:/fakepath/id.png"),
    new StandIn("INPUT", "side", "radio", "yes"),
    Object.assign(new StandIn("INPUT", "agree", "checkbox", "on"), { checked: true }),
    new StandIn("SELECT", "tags", "select-multiple", "a"),
    new StandIn("TEXTAREA", "", "textarea", "a control with no name posts nothing"),
  ];
  const got = JSON.stringify(k.draftValuesOf(els));
  const want = JSON.stringify({ values: { amount: "12500", notes: "Called twice, no answer", list: "vip" }, flags: { agree: true } });
  return { pass: got === want, detail: got };
};
const DRAFT = "Draft note from before the session expired";
const restoresControlled = (k: DraftKit) => {
  let state = "Old note";
  const notes = new StandIn("TEXTAREA", "notes", "textarea", state);
  controlledLikeReact(notes, (v) => { state = v; });
  k.restoreDraftInto([notes], { values: { notes: DRAFT }, flags: {} });
  const seen = { state, shown: notes.value, events: notes.events.join(",") };
  return { pass: seen.state === DRAFT && seen.shown === DRAFT && seen.events === "input", detail: JSON.stringify(seen) };
};
const selectHearsChange = (k: DraftKit) => {
  let picked = "none";
  const list = new StandIn("SELECT", "list", "select-one", "vip");
  list.onEvent = (e) => { if (e.type === "change") picked = list.value; };
  const moved = k.restoreDraftInto([list], { values: { list: "new-joiners" }, flags: {} });
  return { pass: moved === 1 && picked === "new-joiners" && list.events.join(",") === "input,change", detail: JSON.stringify({ moved, picked, events: list.events }) };
};

let kitDraft: DraftKit | null = null;
try {
  kitDraft = await import("../src/components/ui/unsaved-changes.tsx");
} catch (e) {
  ok("3.0 the kit's draft helpers load outside the app", false, String((e as Error)?.message ?? e));
}

/** The kit's draft helpers, cut from `SRC`'s unsaved-changes.tsx with each [from, to] planted (every `from` exactly
 *  once), built with esbuild and evaluated in memory. */
async function plantedDraftKit(plants: Array<[string, string]>): Promise<DraftKit> {
  let src = prim;
  for (const [from, to] of plants) {
    const parts = src.split(from);
    if (parts.length !== 2) throw new Error(`the plant's anchor occurs ${parts.length - 1} times, not once: ${from}`);
    src = parts.join(to);
  }
  const start = src.indexOf("type DraftValues = ");
  const end = src.indexOf("export function useFormDraft(");
  if (start < 0 || end <= start) throw new Error("the draft helpers were not found between `type DraftValues` and useFormDraft");
  const { transform } = await import("esbuild");
  const code = (await transform(src.slice(start, end), { loader: "ts", format: "cjs", target: "es2022", charset: "utf8" })).code;
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  new Function("module", "exports", code)(mod, mod.exports);
  return mod.exports as unknown as DraftKit;
}
const tryDraft = async (plants: Array<[string, string]>) => {
  try { return { k: await plantedDraftKit(plants), why: "" }; } catch (e) { return { k: null, why: String((e as Error)?.message ?? e) }; }
};

if (kitDraft) {
  const c = carries(kitDraft);
  ok("3.1 a draft carries named inputs, textareas and single selects — never a password, a file, a radio, a multi-select or a nameless control",
     c.pass, c.detail);
  const r = restoresControlled(kitDraft);
  ok("3.2 ⭐ a textarea's draft restores INTO A CONTROLLED FIELD — its onChange receives the draft, so the next render keeps it",
     r.pass, r.detail);
  const s = selectHearsChange(kitDraft);
  ok("3.3 a select's draft is written and raises `change` — the event React's onChange for a select listens to", s.pass, s.detail);

  const copy = await tryDraft([]);
  ok("3.0b the in-memory copy of the draft helpers with NOTHING planted passes 3.1–3.3 — so a red plant below is the plant",
     copy.k !== null && carries(copy.k).pass && restoresControlled(copy.k).pass && selectHearsChange(copy.k).pass, copy.why);
  const PLANTS: Array<{ label: string; judge: (k: DraftKit) => { pass: boolean }; plant: [string, string] }> = [
    { label: "3.1c CONTROL · a copy whose draft skips the textarea (the pre-fix inputs-only draft) fails 3.1",
      judge: carries, plant: ['if (tag === "TEXTAREA") return "value";', ""] },
    { label: "3.2c CONTROL · a copy that restores through the element (`.value =`, the pre-fix restore) leaves the controlled field on its old text — 3.2 refuses it",
      judge: restoresControlled, plant: ["setNativeValue(node, want);", "(node as { value: string }).value = want;"] },
    { label: "3.3c CONTROL · a copy that never tells a select `change` fails 3.3",
      judge: selectHearsChange, plant: ['if (String(node.tagName).toUpperCase() === "SELECT") dispatch("change");', ""] },
  ];
  for (const p of PLANTS) {
    const t = await tryDraft([p.plant]);
    ok(p.label, t.k !== null && !p.judge(t.k).pass, t.why || "the planted copy still passes");
  }
}

/* ⛔ AND THE HOOK USES THEM — read from `SRC`, so the call site that ships is the one judged. */
const draftHook = (() => { const at = prim.search(/export function useFormDraft\s*\(/); return at < 0 ? "" : prim.slice(at); })();
const draftWired = (hook: string) => ({
  reads: /draftValuesOf\(form\.elements\)/.test(hook),
  restores: /restoreDraftInto\(form\.elements, e\)/.test(hook),
  noBareAssign: !/(?<![\w.$])el\.value\s*=(?!=)/.test(hook),
});
const wiredNow = draftWired(draftHook);
ok("3.4 useFormDraft writes its draft with draftValuesOf(form.elements) and restores it with restoreDraftInto(form.elements, …)",
   draftHook !== "" && wiredNow.reads && wiredNow.restores && wiredNow.noBareAssign, JSON.stringify(wiredNow));
const wiredPlanted = draftWired(draftHook.replace("restoreDraftInto(form.elements, e)", "void form"));
ok("3.4c CONTROL · a hook that no longer restores through restoreDraftInto is reported", !wiredPlanted.restores, JSON.stringify(wiredPlanted));

console.log(`\n${fail ? `🔴 ${fail} failing` : "✅ every admin form that can lose work guards all three exits"}`);
process.exit(fail ? 1 : 0);
