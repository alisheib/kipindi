/**
 * ⭐ AN ADMIN CONTROL THAT EXISTS ONLY IN CODE IS NOT A CONTROL AN OPERATOR HAS.
 *
 *   npx tsx scripts/orphan-actions.test.mts     (npm run test:orphan-actions)
 *
 * 🔴 THE FINDING, TWICE (live QA campaign, production).
 *
 *   E-23 (2026-08-01) — `voidRoundByOperator` was the operator's only remedy for a stuck
 *   Up & Down round. It existed, it took an officer id, it audited, it refunded every
 *   stake. `grep -rn` found exactly one reference: its own definition. So when E-24
 *   stranded real player money, **nobody on the platform could release it through the
 *   product** — the 1,395 historical `operator` voids must have come from a hand-run
 *   script. A remedy that only exists in a script is not a remedy an operator has.
 *
 *   E-31 (2026-08-02) — the lesson was recorded and not generalised, so it recurred, and
 *   this time on the critical path of the campaign's #1 blocker. `updateAssetAction` and
 *   `updateChainAction` are both gated, both audited, and both had **zero callers**.
 *   Consequences, hit live while driving the price feed on:
 *     · an asset's PRICE SOURCE — the link real money settles against — could not be
 *       repointed through the product **at all**, so the live GOLD asset is stuck on an
 *       HTML page the feed reader can never quote, and the only alternative would have
 *       been hand-writing the live database on that exact control;
 *     · a chain's MARGIN could not be changed after creation, which is what turns the
 *       E-32 pricing decision into a delete-and-recreate.
 *
 * ⛔ WHY A SOURCE SCAN IS THE RIGHT SHAPE HERE, unusually. Normally a source scan is the
 * weakest evidence (E-4's lesson) — but the defect IS a source-level fact. "No file
 * references this symbol" is not a proxy for unreachability; it is unreachability, for a
 * `"use server"` export whose only entry point is an import. There is nothing stronger to
 * measure, and a runtime test cannot observe a button that was never written.
 *
 * THE INVARIANT: every exported `*Action` in an admin actions file is referenced from at
 * least one OTHER file under `src/`, or is listed in `KNOWN_ORPHANS` with a written
 * reason. That list is a RATCHET, exactly like `UNPAGED_DEBT` in `grid-paging`:
 * adding to it fails, and leaving an entry behind after the action gains a caller fails
 * too — so a stale exemption cannot quietly become permission.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment as stripComments } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

/**
 * Actions that are knowingly unreachable, each with the reason and what closing it needs.
 * ⛔ Adding a row here is a decision, not a formality — read E-23 first.
 */
const KNOWN_ORPHANS: Record<string, string> = {
  // Superseded by `addContactsStructuredAction` immediately below it in the same file,
  // which IS wired. A leftover twin, not a missing capability — the operator can add
  // contacts. Delete when someone confirms nothing external posts to it.
  addContactsAction:
    "superseded by addContactsStructuredAction in the same file, which is wired",
  // A read-only `hasTotp` lookup. The 2FA setup page resolves enrolment server-side, so
  // this client entry point buys nothing. Mutates nothing, so it is dead weight rather
  // than a missing control.
  checkTotpAction:
    "read-only TOTP-enrolment lookup; the setup page resolves it server-side instead",
  // ✅ E-33 IS CLOSED (2026-08-21) and its entry is GONE from this list, in the same commit
  // as its first caller — which is what this suite's §2 ratchet demands: an entry that is no
  // longer true fails as loudly as a missing one, with "it now HAS a caller".
  //
  // For the record, because the shape recurs: `fileDsarAction` was RBAC-gated, audited and
  // correct from the day it was written, and it was reachable from nothing. `/admin/privacy`
  // rendered "No data-subject access requests are on file" permanently — not because nobody
  // had asked, but because asking was unrecordable, and the statutory clock runs from the ask.
  // The blocker was recorded here as "needs a compliance decision, not wiring", and that was
  // true: Ali answered it on 2026-08-21 (COMPLIANCE-DECISIONS item 2) and the wiring took an
  // afternoon. ⛔ A declared orphan is a decision waiting for an owner, not a dead line.
  // Callers now: `FileDsarOnBehalfButton` (officer, on a player's behalf) and, for the player's
  // own door, `filePrivacyRequestAction` in src/app/profile/account/actions.ts.
};

// ── collect ──────────────────────────────────────────────────────────────────
const files: string[] = [];
(function walk(d: string) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e)) files.push(p);
  }
})(SRC);

/**
 * ⚠️ COMMENTS ARE STRIPPED BEFORE ANY CALLER SEARCH (2026-08-20).
 *
 * This suite decides "is X still orphaned?" with `new RegExp(\`\b${name}\b\`)` over whole
 * files. Without stripping, a file that merely NAMES an action in prose counts as a caller —
 * and on 2026-08-20 that is exactly what happened: a comment in `privacy.ts` explaining *why*
 * `fileDsarAction` is a declared orphan (E-33) made this suite report that it "now HAS a
 * caller", i.e. the explanation of the defect was read as the defect being fixed.
 *
 * ⛔ Do not solve that by rewording the comment. The repo has already been here once —
 * `admin-2fa-honesty.test.mts` carries the note "that is the third time in this session a
 * guard of mine read prose instead of code" and strips comments for the same reason. A guard
 * that cannot be written about is a guard that stops being documented.
 */
const text = new Map(files.map((f) => [f, stripComments(readFileSync(f, "utf8"))]));
const actionFiles = files.filter((f) => /[\\/]admin[\\/].*action.*\.ts$/i.test(f));

console.log(`\n§1 · every gated admin action is reachable from the product (${actionFiles.length} action files)`);

const found: string[] = [];
const orphaned: string[] = [];
for (const f of actionFiles.sort()) {
  const src = text.get(f)!;
  for (const m of src.matchAll(/^export async function (\w+Action)\s*\(/gm)) {
    const name = m[1];
    found.push(name);
    const callers = files.filter((g) => g !== f && new RegExp(`\\b${name}\\b`).test(text.get(g)!));
    if (callers.length > 0) continue;
    orphaned.push(name);
    ok(`1.x ${name} is referenced by a page or component`, name in KNOWN_ORPHANS,
       `no caller outside ${relative(ROOT, f)}${name in KNOWN_ORPHANS ? "" : " — wire it, or add it to KNOWN_ORPHANS with a reason"}`);
  }
}
ok("1.1 the scan actually found admin actions", found.length > 50, `found ${found.length}`);
ok("1.2 no undeclared orphan", orphaned.every((n) => n in KNOWN_ORPHANS),
   `orphans: ${orphaned.join(", ") || "none"}`);

// ── the ratchet, the half that is easy to forget ─────────────────────────────
console.log("\n§2 · the KNOWN_ORPHANS list is a ratchet, not a parking space");
for (const name of Object.keys(KNOWN_ORPHANS)) {
  ok(`2.x ${name} is still genuinely orphaned`, orphaned.includes(name),
     orphaned.includes(name) ? "" : "it now HAS a caller — delete its KNOWN_ORPHANS entry");
}
ok("2.1 every exemption carries a written reason",
   Object.values(KNOWN_ORPHANS).every((r) => r.trim().length > 20));

// ── §3 · the two E-31 actions specifically, because they are the money ones ──
console.log("\n§3 · E-31 · the price source and the margin are editable through the product");
for (const name of ["updateAssetAction", "updateChainAction"]) {
  const callers = files.filter((g) => !/[\\/]admin[\\/]updown[\\/]actions\.ts$/.test(g) && new RegExp(`\\b${name}\\b`).test(text.get(g)!));
  ok(`3.x ${name} has a UI caller`, callers.length > 0,
     callers.length ? relative(ROOT, callers[0]) : "ZERO callers — E-31 has regressed");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
