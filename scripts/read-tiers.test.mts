/**
 * READ_TIERS — the SECOND permission axis: not "may this role reach this ROUTE?" but
 * "may this role read this FIELD?"  Design + rulings: docs/READ-TIERS.md.
 *
 * ⭐ WHAT THIS SUITE IS FOR, stated as the thing it must not become. §5 of the design is
 * explicit: "a permission surface that only ever tests the allow path is an absent test."
 * So every refusal below is paired with a POSITIVE CONTROL, and two of the controls are on
 * the SAME ROLE — because "SUPPORT sees nothing" would otherwise pass every refusal here.
 *
 * ⛔ THE HARDEST PART IS THAT AT REST EVERY ROLE RENDERS THE SAME TEXT. Ruling §4c defines
 * `read` as "masked at rest, MAY reveal" rather than "sees it", so ADMIN and SUPPORT both
 * show `••••` on a balance. A suite comparing rendered strings would therefore prove nothing.
 * The property that actually separates them is `canReveal`, and that is what is asserted.
 *
 * §1 pure model · §2 the rulings, each pinned to the ruling that decided it · §3 fail-closed ·
 * §4 completeness + drift.
 *
 * Run: npm run test:read-tiers
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const R = await import("../src/lib/server/roles.ts");
const {
  READ_CLASSES, MASKABLE_CLASSES, DEFAULT_READ_GRANTS, STAFF_ROLES,
  canRead, canReveal, isReadable, isMaskable, defaultReadGrant,
  READ_CLASS_LABEL, READ_CLASS_SUMMARY, READ_CELL_LABEL,
} = R as any;

const rolesSrc = decomment(readFileSync(join(ROOT, "src/lib/server/roles.ts"), "utf8"));

console.log("\n§1 · the model itself");

ok("1.1 there are exactly FOUR read classes — a fifth must DISPLACE one (§3.1)",
   READ_CLASSES.length === 4, READ_CLASSES.join(", "));

ok("1.2 every STAFF role has a complete row — no role can fall through to an implicit default",
   STAFF_ROLES.every((r: string) => {
     const row = (DEFAULT_READ_GRANTS as any)[r];
     return row && READ_CLASSES.every((c: string) => typeof row[c] === "string");
   }),
   STAFF_ROLES.join(","));

ok("1.3 every cell is one of the three legal values",
   STAFF_ROLES.every((r: string) =>
     READ_CLASSES.every((c: string) => ["read", "masked", "none"].includes((DEFAULT_READ_GRANTS as any)[r][c]))));

// ⚠️ A class that is not maskable has NO middle value to reach — asserting that keeps a future
// `history.activity: "masked"` from being written and silently meaning nothing.
ok("1.4 `history.activity` is NOT maskable — a list of a player's own bets has no useful masked form",
   !isMaskable("history.activity") && MASKABLE_CLASSES.size === 3,
   `maskable = ${[...MASKABLE_CLASSES].join(", ")}`);

ok("1.5 no role is granted `masked` on a NON-maskable class — that cell would be undefined behaviour",
   STAFF_ROLES.every((r: string) =>
     READ_CLASSES.every((c: string) => isMaskable(c) || (DEFAULT_READ_GRANTS as any)[r][c] !== "masked")));

console.log("\n§2 · the rulings — each pinned to the decision that made it");

// ── D3: ADMIN is not exempt ────────────────────────────────────────────────────
// 🔴 THIS IS THE ASSERTION THE WHOLE DESIGN RESTS ON. `defaultGrant` (the DOMAIN axis) short-
// circuits ADMIN to all-true. If `defaultReadGrant` did the same, the rule could not be
// witnessed by the only account that exists on production.
ok("2.1 D3 · ADMIN resolves through the TABLE, not a short-circuit — flipping its cell must change the answer",
   canRead("ADMIN", "money.figures", "none") === "none" && canRead("ADMIN", "money.figures", "masked") === "masked",
   "an override on ADMIN is honoured");

ok("2.2 D3 · and the source contains no ADMIN bypass inside the read-tier resolver",
   !/function defaultReadGrant[\s\S]{0,400}?role === "ADMIN"/.test(rolesSrc),
   "no `role === \"ADMIN\"` early-return in defaultReadGrant");

ok("2.3 D3 · every SENSITIVE class is masked at rest for ADMIN too — `read` means MAY REVEAL, not `sees it`",
   [...MASKABLE_CLASSES].every((c: any) => canRead("ADMIN", c) !== "none") && canReveal("ADMIN", "money.figures"),
   "ADMIN: masked at rest, reveal permitted");

// ── D1: support sees movements, not totals ─────────────────────────────────────
ok("2.4 D1 · ⭐ SUPPORT reads `money.figures` as `masked` — not `read`, and not `none`",
   canRead("SUPPORT", "money.figures") === "masked",
   `got ${canRead("SUPPORT", "money.figures")}`);

ok("2.5 D1 · …so SUPPORT can NEVER reveal a balance, while ADMIN can — the SAME run, both directions",
   canReveal("SUPPORT", "money.figures") === false && canReveal("ADMIN", "money.figures") === true);

// ⭐ POSITIVE CONTROL ON THE SAME ROLE. Without this, deleting SUPPORT's whole row passes 2.4+2.5.
ok("2.6 ⭐ POSITIVE CONTROL (same role) · SUPPORT still reads `history.activity` IN FULL — it can do its job",
   canRead("SUPPORT", "history.activity") === "read" && isReadable("SUPPORT", "history.activity"));

// ── D2: contact masked, for every role that sees it at all ─────────────────────
ok("2.7 D2 · SUPPORT may not reveal the email address",
   canReveal("SUPPORT", "identity.contact") === false && canRead("SUPPORT", "identity.contact") === "masked");

ok("2.8 D2 · COMPLIANCE may — the tier distinguishes roles rather than hiding from everybody",
   canReveal("COMPLIANCE", "identity.contact") === true);

// ── the KYC set ────────────────────────────────────────────────────────────────
ok("2.9 SUPPORT does not see `identity.personal` at all — the KYC set is not on the support desk",
   canRead("SUPPORT", "identity.personal") === "none" && !isReadable("SUPPORT", "identity.personal"));

ok("2.10 AUDITOR sees it MASKED rather than not at all — read-only oversight still needs the shape",
   canRead("AUDITOR", "identity.personal") === "masked");

// ⛔ THE OVER-CORRECTION. A tier where nobody can read anything passes every refusal above.
ok("2.11 ⛔ NOT the over-correction · at least one non-ADMIN role can still reveal a money figure",
   STAFF_ROLES.filter((r: string) => r !== "ADMIN").some((r: string) => canReveal(r, "money.figures")),
   STAFF_ROLES.filter((r: string) => r !== "ADMIN" && canReveal(r, "money.figures")).join(",") || "NOBODY");

ok("2.12 ⛔ NOT the over-correction · every staff role retains `history.activity`",
   STAFF_ROLES.every((r: string) => canRead(r, "history.activity") === "read"));

console.log("\n§3 · fail closed");

ok("3.1 an unknown role reads NOTHING — the axis fails closed, never open",
   READ_CLASSES.every((c: any) => defaultReadGrant("WAREHOUSE_ROBOT", c) === "none"));

ok("3.2 PLAYER and AGENT are not staff and resolve to `none` (§6: the axis never governs a player's own view)",
   READ_CLASSES.every((c: any) => defaultReadGrant("PLAYER", c) === "none" && defaultReadGrant("AGENT", c) === "none"));

ok("3.3 null / undefined resolve to `none` rather than throwing",
   READ_CLASSES.every((c: any) => defaultReadGrant(null, c) === "none" && defaultReadGrant(undefined, c) === "none"));

// ⚠️ An override of `undefined` must yield the DEFAULT, not `none` — a caller that has not
// loaded overrides must still get the seed grid, or every page silently hides everything.
ok("3.4 an ABSENT override yields the default, a PRESENT one wins — mirrors RoleDomainGrant exactly",
   canRead("SUPPORT", "money.figures", undefined) === "masked"
   && canRead("SUPPORT", "money.figures", null) === "masked"
   && canRead("SUPPORT", "money.figures", "read") === "read");

console.log("\n§4 · completeness + drift");

ok("4.1 every class has a label and a summary — a class cannot be added without saying what it means",
   READ_CLASSES.every((c: string) => Boolean(READ_CLASS_LABEL[c]) && Boolean(READ_CLASS_SUMMARY[c])));

ok("4.2 every cell value has a label for the /admin/roles editor",
   ["read", "masked", "none"].every((v) => Boolean(READ_CELL_LABEL[v])));

// ⭐ THE RATCHET IS ON THE UNCLASSIFIED, NOT ON THE CLASSIFIED (§5.5). A count of "masked
// fields" passes by never growing; a count of classes with no row somewhere is the drift.
ok("4.3 drift · no class is missing from any staff row, and no row carries a class that no longer exists",
   STAFF_ROLES.every((r: string) => {
     const keys = Object.keys((DEFAULT_READ_GRANTS as any)[r]).sort();
     return JSON.stringify(keys) === JSON.stringify([...READ_CLASSES].sort());
   }));

// ⛔ §6: "if the answer to 'can support see X?' ever lives in a .tsx file, the matrix has
// stopped being the authority." This is that rule, enforced.
// ⛔ 4.4 IS THE §6 RULE — AND IT WAS WRONG THE FIRST TIME, IN THE DANGEROUS DIRECTION.
// It first forbade a read-class NAME from appearing in any .tsx. That would have failed the
// moment the axis was actually used, because §3.3 specifies exactly that at call sites:
// <Sensitive readClass="money.figures">. A guard that forbids the intended usage is not strict,
// it is wrong — and it would have been "fixed" by weakening it, which is how a guard dies.
//
// ⭐ §6 says: "if the ANSWER to 'can support see X?' ever lives in a .tsx file, the matrix has
// stopped being the authority." The ANSWER is canRead/readCell/mayReveal. WHICH CLASS a field
// belongs to is a CLASSIFICATION, not an answer, and it belongs at the call site — that is the
// whole point of the primitive. So the rule is: no page may ASK the question; only the kit
// primitive may. A page that imports the resolver has started keeping its own opinion.
// ⚠️ THE DETECTION IS AN IMPORT OF THE RESOLVER, NOT A BARE IDENTIFIER — the first version
// matched any word and immediately condemned src/components/profile/ip-reveal.tsx, whose
// `canReveal` is a local boolean about IPv4 octets and has nothing to do with this axis.
// A page "asks the question" by IMPORTING the decider; that is the thing to look for.
//
// 📌 ip-reveal.tsx is worth knowing about for a different reason: the platform ALREADY has a
// mask-and-reveal vocabulary (dots at rest, tap to reveal). <Sensitive> should LOOK like it.
// ⛔ But it must NOT work like it: ip-reveal holds the full value in the DOM and unhides it
// client-side, which is correct for a player viewing their OWN address (§6 puts that out of
// scope) and is exactly what §5.4 forbids for staff viewing a PLAYER.
const DECIDERS = ["canRead", "readCell", "mayReveal", "canReveal", "defaultReadGrant", "DEFAULT_READ_GRANTS"];
const IMPORTS_DECIDER = new RegExp(
  "import\\s*(?:type\\s*)?\\{[^}]*\\b(?:" + DECIDERS.join("|") + ")\\b[^}]*\\}\\s*from\\s*[\"'][^\"']*server/(?:roles|rbac)[\"']",
  "s",
);
const ALLOWED = new Set<string>(["src/components/ui/sensitive.tsx"]);
const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
};
const rel = (f: string) => f.slice(ROOT.length + 1).split("\\").join("/");
const offenders = walk(join(ROOT, "src"))
  .filter((f) => !ALLOWED.has(rel(f)))
  .filter((f) => IMPORTS_DECIDER.test(decomment(readFileSync(f, "utf8"))))
  .map(rel);
ok("4.4 ⛔ NO .tsx asks the question — only the kit primitive may resolve a read cell (§6)",
   offenders.length === 0, offenders.join(", ") || "0 offenders");


console.log("\n§5 · the runtime — override resolution, and what it refuses to store");

// ⚠️ With no DATABASE_URL the in-memory map is the AUTHORITATIVE store rather than a cache,
// which is exactly the contract these assertions need: an edit takes effect for the process.
const RT = await import("../src/lib/server/rbac.ts");
RT.__resetReadGrantsForTest();

const rowNow = await RT.roleReadGrants("SUPPORT");
ok("5.1 with NO overrides the runtime returns the code defaults — the seed matrix IS the live one",
   rowNow["money.figures"] === "masked" && rowNow["history.activity"] === "read",
   JSON.stringify(rowNow));

ok("5.2 `readCell` and the pure `canRead` agree when there is no override — one decision, two entry points",
   (await RT.readCell("SUPPORT", "money.figures")) === canRead("SUPPORT", "money.figures"));

// ── ruling D3, at the runtime layer ────────────────────────────────────────────
// 🔴 THE DOMAIN AXIS BYPASSES THE TABLE FOR ADMIN ON PURPOSE (so a bad grant edit cannot lock
// the Owner out). If that bypass had been copied here, ADMIN's read row would be unreachable
// and the masking rule would have no witness. This asserts the bypass was NOT copied.
await RT.setRoleReadGrant("ADMIN", "money.figures", "masked", "test");
ok("5.3 D3 · ⭐ ADMIN's read row is EDITABLE and the override is honoured — no ADMIN bypass here",
   (await RT.readCell("ADMIN", "money.figures")) === "masked"
   && (await RT.mayReveal("ADMIN", "money.figures")) === false,
   "ADMIN set to masked ⇒ cannot reveal");

// ⭐ POSITIVE CONTROL in the same run: the DOMAIN axis still bypasses for ADMIN, so the Owner
// cannot lock itself out of /admin/roles while its READ row says masked.
ok("5.4 ⭐ POSITIVE CONTROL · the DOMAIN axis still bypasses for ADMIN — the Owner cannot lock itself out",
   (await RT.canView("ADMIN", "ops")) === true && (await RT.canAct("ADMIN", "ops")) === true);

RT.__resetReadGrantsForTest();
ok("5.5 reset returns every cell to the code default",
   (await RT.readCell("ADMIN", "money.figures")) === "read");

// ── what the store REFUSES ─────────────────────────────────────────────────────
// ⛔ `readClass` and `cell` are TEXT columns (a Prisma enum cannot hold a dot, and inventing
// MONEY_FIGURES beside money.figures would give one class two names). The DB therefore cannot
// reject a typo — the code must.
const throws = async (fn: () => Promise<unknown>) => {
  try { await fn(); return false; } catch { return true; }
};

ok("5.6 ⛔ an unknown read CLASS is refused rather than stored — TEXT columns cannot reject a typo",
   await throws(() => RT.setRoleReadGrant("SUPPORT", "money.figurez" as any, "read", "test")));

ok("5.7 ⛔ an unknown CELL value is refused rather than stored",
   await throws(() => RT.setRoleReadGrant("SUPPORT", "money.figures", "sometimes" as any, "test")));

ok("5.8 ⛔ a non-staff role is refused — PLAYER can never acquire a read grant",
   await throws(() => RT.setRoleReadGrant("PLAYER" as any, "money.figures", "read", "test")));

// ⚠️ The cell that would be legal, mean nothing, and hide a support agent's own working data.
ok("5.9 ⛔ `masked` is refused on a class with NO masked form (history.activity)",
   await throws(() => RT.setRoleReadGrant("SUPPORT", "history.activity", "masked", "test")));

ok("5.10 ⭐ POSITIVE CONTROL · a LEGAL edit on that same class still succeeds — 5.9 is not a blanket refusal",
   !(await throws(() => RT.setRoleReadGrant("SUPPORT", "history.activity", "none", "test")))
   && (await RT.readCell("SUPPORT", "history.activity")) === "none");

RT.__resetReadGrantsForTest();

// ⭐ THE MATRIX THE EDITOR RENDERS must be complete for every staff role — a missing row would
// render an empty column that reads as "nothing granted" rather than as "not loaded".
const matrix = await RT.getReadMatrix();
ok("5.11 the editor matrix covers every staff role × every class",
   STAFF_ROLES.every((r: string) => matrix[r] && READ_CLASSES.every((c: string) => typeof matrix[r][c] === "string")),
   `${Object.keys(matrix).length} roles`);
// ⭐ THE DB PATH, REACHED DIRECTLY. `loadReadOverrides` only runs with DATABASE_URL set, so
// without this the row-validation decision would be untestable — and it is the one a bad
// migration, a console edit or an importer actually reaches. Same predicate, both call sites.
ok("5.12 ⛔ the DB-row validator accepts every legal pair and NOTHING else",
   READ_CLASSES.every((c: string) =>
     ["read", "masked", "none"].every((v) => RT.isStorableReadOverride(c, v)))
   && !RT.isStorableReadOverride("money.figurez", "read")
   && !RT.isStorableReadOverride("money.figures", "sometimes")
   && !RT.isStorableReadOverride("", "")
   && !RT.isStorableReadOverride("__proto__", "read"));

ok("5.13 …and the WRITER refuses exactly what the LOADER discards — one decision, never two",
   (await throws(() => RT.setRoleReadGrant("SUPPORT", "money.figurez" as any, "read", "t")))
   === !RT.isStorableReadOverride("money.figurez", "read"));


console.log("\n§6 · the editor surface");

const rolesActions = decomment(readFileSync(join(ROOT, "src/app/admin/roles/actions.ts"), "utf8"));
const rolesPage = decomment(readFileSync(join(ROOT, "src/app/admin/roles/page.tsx"), "utf8"));

// ⛔ §6 of the design: "two permission screens is how two permission models are born."
ok("6.1 ⛔ the read matrix is a TAB on /admin/roles, not a page of its own",
   /ReadTiersMatrix/.test(rolesPage) && /RolesMatrix/.test(rolesPage)
   && !existsSync(join(ROOT, "src/app/admin/read-tiers"))
   && !existsSync(join(ROOT, "src/app/admin/roles/reads")),
   "both matrices render from one page, and no sibling route exists");

// ⭐ THE D3 CONTRAST, ASSERTED AS A PAIR. Either half alone is a claim; together they are the
// ruling. The DOMAIN action must refuse ADMIN (the Owner can never be locked out of a route);
// the READ action must NOT (the Owner is subject to masking, or the rule has no witness).
const domainFn = rolesActions.slice(rolesActions.indexOf("export async function setRoleGrantAction"),
                                   rolesActions.indexOf("export async function resetRoleGrantsAction"));
const readFn = rolesActions.slice(rolesActions.indexOf("export async function setRoleReadGrantAction"),
                                  rolesActions.indexOf("export async function resetRoleReadGrantsAction"));
ok("6.2 ⭐ D3 · the DOMAIN action refuses ADMIN and the READ action does NOT — the pair IS the ruling",
   /role === "ADMIN"/.test(domainFn) && !/role === "ADMIN"/.test(readFn),
   `domain refuses=${/role === "ADMIN"/.test(domainFn)} · read refuses=${/role === "ADMIN"/.test(readFn)}`);

ok("6.3 …and the READ action accepts every STAFF role, ADMIN included",
   /STAFF_ROLES as readonly string\[\]\)\.includes\(role\)/.test(readFn));

// ⚠️ Without this the officer flips a cell, opens a player, sees the OLD masking from the router
// cache, and concludes the matrix does not work. The editor and the surface it governs are
// different routes; revalidating only the editor is the bug that looks like a broken feature.
ok("6.4 ⚠️ saving a read cell revalidates the PLAYER page too, not just the editor",
   /revalidatePath\("\/admin\/players\/\[id\]", "page"\)/.test(readFn));

ok("6.5 the edit is audited under its own action name, distinct from the domain one",
   /action: "rbac\.read_grant_changed"/.test(readFn) && /action: "rbac\.grant_changed"/.test(domainFn));

// ⛔ The server must refuse what the control greys out, or the greying is decoration.
ok("6.6 ⛔ the SERVER refuses `masked` on a class with no masked form — the greyed option is a real rule",
   /cell === "masked" && !isMaskable/.test(readFn));

// ⭐ E-225, one layer up: the kit Select takes `ariaLabel`. A hyphenated attribute compiles clean
// and is dropped, and this editor is exactly the kind of screen where that goes unnoticed.
const readMatrixSrc = decomment(readFileSync(join(ROOT, "src/app/admin/roles/read-tiers-matrix.tsx"), "utf8"));

// ⛔ D4 HAD NO OFFLINE GUARD AT ALL, AND ITS ONLY LIVE CHECK WAS UNBOUNDED. §5 names
// `reveal-is-not-audited` as a required RED anchor and it was never written, so deleting the
// audit write would have left every suite green. The live drive now asserts on THIS RUN's rows,
// and this pair gives the mutation something to fail offline.
const revealSrc = decomment(readFileSync(join(ROOT, "src/app/admin/players/actions.ts"), "utf8"));
ok("6.9 ⛔ D4 · the reveal AWAITS an audit row, and does so BEFORE returning the value",
   // ⚠️ LINE-ANCHORED, AND THE HARNESS IS WHY. The first version matched `await audit({`
   // anywhere in the file, so the RED mutation `if (false) await audit({` sailed through it and
   // red:read-tiers reported NOT CAUGHT. The call must be an unconditional STATEMENT, not merely
   // present — a guard on D4 that a one-word disable can satisfy is not a guard.
   /^\s*await audit\(\{[\s\S]{0,400}?action: "pii\.revealed"/m.test(revealSrc)
   && revealSrc.indexOf("pii.revealed") < revealSrc.indexOf("return { ok: true, value: raw }"),
   "awaited, and ordered before the return");

// ⭐ …and the row must never carry the value it protects — an audit trail that records the
// secret is the leak one layer down.
ok("6.10 ⛔ D4 · the audit payload names the class and the field, never the value",
   /payload: \{ field, readClass: spec\.readClass, role \}/.test(revealSrc)
   && !/payload:[^}]*\braw\b/.test(revealSrc));
ok("6.7 ⭐ the editor's Selects are named with `ariaLabel`, never the hyphenated attribute (E-225)",
   /ariaLabel=\{/.test(readMatrixSrc) && !/aria-label=/.test(readMatrixSrc));

// ⚠️ Ali, 2026-08-04: greyed WITH ITS REASON, never hidden.
ok("6.8 ⚠️ an unavailable level is OFFERED and disabled WITH A REASON, not removed from the list",
   /disabled: !isMaskable\(cls\)/.test(readMatrixSrc) && /hint:/.test(readMatrixSrc));


console.log("\n§7 · the DRIFT DETECTOR — the ratchet §5.5 asked for");

/**
 * ⛔ THIS SECTION EXISTS BECAUSE IT WAS MISSING, AND ITS ABSENCE HID THREE REAL HOLES.
 *
 * §5.5 asks for "a drift detector — every field declared in a class must be reachable through
 * <Sensitive>, and a new money figure added to a page without one fails the suite", and warns:
 * "a count of masked fields would pass by never growing; the ratchet has to be on UNCLASSIFIED
 * fields, the way test:orphans and test:red-anchors already do it."
 *
 * It was not built. An adversarial audit then found the axis wired to ONE surface while three
 * other staff surfaces rendered governed fields in the clear — two of them to roles whose CEILING
 * is `masked`, which is a real permission violation and not a cosmetic gap:
 *   /admin/kyc/[id]      compliance route  → AUDITOR (identity.personal: masked) read region + DOB raw
 *   /admin/invites       growth route      → GROWTH (identity.contact: masked) read player emails raw
 *   players/[id] KYC tab compliance-gated  → ADMIN/COMPLIANCE read the email with NO audit row (D4)
 *
 * ⭐ THE LESSON IS THE SHAPE OF THE MISS. Every OTHER guard in this suite asks "is the wired
 * surface correct?" — and every one of them was green while the axis governed one page out of four.
 * A permission axis needs a guard whose POPULATION IS THE WHOLE APP, not the part you remembered.
 */
const GOVERNED_ACCESSORS: Array<{ prop: string; cls: string }> = [
  { prop: "email", cls: "identity.contact" },
  { prop: "region", cls: "identity.personal" },
  { prop: "dob", cls: "identity.personal" },
  { prop: "idNumber", cls: "identity.personal" },
  /**
   * 🔴 `phoneE164` AND `msisdn` WERE ABSENT FROM THIS LIST UNTIL 2026-09-06, AND THAT ABSENCE IS
   * THE WHOLE STORY OF THE PHONE.
   *
   * `roles.ts` READ_CLASS_SUMMARY has described `identity.contact` as "email address and
   * **unmasked phone number**" since the axis shipped — so the /admin/roles editor promised an
   * Owner that flipping this cell governed the phone. It governed nothing: seven admin surfaces
   * masked the number with hand-written `.slice()` expressions in three different shapes, none
   * of which consulted the matrix, and `grep '\*\*\*\*\*' scripts/` found no assertion anywhere
   * that a phone was masked at all. The ratchet whose stated purpose is "a population that is
   * the WHOLE APP, not the part you remembered" could not see a single one of them, because the
   * field was not in its own list.
   *
   * ⭐ THE MISS HAS THE SAME SHAPE AS THE ONE THIS SECTION'S HEADER DESCRIBES, one layer down: it
   * is not that a guard was wrong, it is that a guard's POPULATION was chosen by hand and the
   * hand forgot something. Adding these two is what turns Ali's ruling into an enforced rule
   * rather than another silent one.
   */
  { prop: "phoneE164", cls: "identity.contact" },
  { prop: "msisdn", cls: "identity.contact" },
];

/**
 * ⛔ EVERY SITE IS EITHER WIRED OR REVIEWED-WITH-A-REASON. There is no third state, and that is
 * what makes this a ratchet rather than a lint anyone can ignore: a NEW site is neither, so it
 * fails. ⚠️ The first version of this detector just counted matches and reported 13 — of which
 * NINE were false positives (already-masked `.slice(0,4)` tails, the platform's own support
 * address, a region AGGREGATION that renders no player). A detector that cries wolf gets deleted;
 * the reviewed list is how it stays precise AND honest about what it chose not to police.
 *
 * ⭐ THE KEYS ARE `file::fragment`, so a reason survives a line moving but NOT the code changing.
 */
const GOVERNED_REVIEWED = new Map<string, string>([
  ["src/app/admin/kyc/[id]/page.tsx::kyc.idNumber.slice",
   "already masked first-4…last-4 at the call site; masking predates this axis and is correct"],
  ["src/app/admin/players/[id]/page.tsx::kyc.idNumber.slice",
   "already masked first-4…last-4; same pre-existing rule"],
  ["src/app/admin/players/cohorts/page.tsx::u.region",
   "an AGGREGATION — counts players per region and renders no player's value; §6 governs reading a PLAYER'S record"],
  ["src/app/admin/system/page.tsx::getSupportConfig().email",
   "the PLATFORM's own support address, not a player's — outside the axis entirely"],
  ["src/app/admin/system/system-client.tsx::config.email",
   "the same platform support address, rendered in the settings form"],
  ["src/app/admin/invites/invite-admin-client.tsx::{row.email}",
   "a StagedRow is the OPERATOR'S OWN typed input — addresses they are about to invite, not a player's record being read. §6 scopes this axis to a staff member reading a PLAYER's record"],
  ["src/app/admin/players/[id]/page.tsx::{user.email}",
   "a PROP carrying the value into KycTab, which renders it through <Sensitive> — the render is wired, and the prop is how it gets there"],
  ["src/app/admin/invites/invite-admin-client.tsx::email: row.email",
   "an object literal shaping a payload, not a render — the render is the separate {row.email} entry"],

  // ── phone, reviewed 2026-09-06 with Ali's ruling ────────────────────────────────────────
  // ⚠️ ALL THREE ARE OBJECT LITERALS THAT SHAPE A ROW, NOT RENDERS. Each of these pages now
  // renders its phone through <Sensitive>; what is left is the `{ …, phoneE164: u.phoneE164, … }`
  // that carries the value from the query to that render. The distinction is the same one the
  // invites entries above already draw, and it is the honest one: this ratchet governs a value
  // REACHING A READER, and a value reaching a component that masks it has not reached anybody.
  ["src/app/admin/markets/[id]/page.tsx::phoneE164: u.phoneE164",
   "an object literal building the predictors row; the render beside it is wired through <Sensitive field=\"phone\">"],
  ["src/app/admin/self-exclusions/page.tsx::phoneE164: u.phoneE164",
   "an object literal building the roster row; the render is wired through <Sensitive field=\"phone\">"],
  ["src/app/admin/privacy/page.tsx::maskedRosterLabel(u, u.phoneE164)",
   "the phone is PASSED to `maskedRosterLabel`, which renders a masked NAME or the non-PII handle and never the number — see §8.12, which asserts this roster no longer reaches maskName's phone fallback. The phone COLUMN beside it is wired through <Sensitive>"],
  ["src/app/admin/layout.tsx::phoneE164: session.phoneE164",
   "the SIGNED-IN OFFICER'S OWN number, taken from their session cookie and handed to AdminShell as a display-name fallback. §6 scopes this axis to a staff member reading a PLAYER's record; a person reading their own number is outside it, the same reason staff/[id] is exempt"],
]);

// ⚠️ Deliberate structural exemptions (whole files), each with a reason. May only SHRINK.
const GOVERNED_ALLOW = new Map<string, string>([
  ["src/components/ui/sensitive.tsx", "the primitive itself — it is what every other site resolves through"],
  // ⭐ `src/app/admin/staff/[id]/page.tsx` WAS EXEMPT HERE AND IS NOT ANY MORE (2026-09-06).
  // Its reason — "§6 scopes this axis to a staff member reading a PLAYER's record" — was true and
  // was covering a real asymmetry: the staff ROSTER masked while the staff DETAIL rendered a full
  // number with no eye, no audit row and no matrix, so the console spoke two vocabularies about
  // the same datum. Ali's 2026-09-06 ruling is "everywhere a phone is shown in admin,
  // consistently", and both pages are `OWNER_ONLY_PREFIXES`, so wiring them costs NO role a read
  // it had — ADMIN holds `identity.contact: read` and is one click from the number — while
  // adding the audit row that made masking acceptable in the first place. A list that may only
  // shrink is meant to shrink; this is what that looks like.
]);

/**
 * ⚠️ THE POPULATION IS BOTH ADMIN TREES — widened 2026-09-06.
 *
 * It walked `src/app/admin` alone, and `src/components/admin/**` is where the console's SHARED
 * pieces live: the shell, the nav, the tables, the sort controls. A component there rendering a
 * player's phone would have been invisible to a ratchet whose stated purpose is "a population
 * that is the WHOLE APP, not the part you remembered" — the same failure this section's header
 * describes, one directory over. ⭐ Measured before widening: the only phone in that tree is the
 * signed-in officer's OWN number in the top bar, which §6 puts out of scope and which is listed
 * as reviewed below. So this costs nothing today and catches the next one.
 */
const adminTsx = [
  ...walk(join(ROOT, "src", "app", "admin")),
  ...walk(join(ROOT, "src", "components", "admin")),
];
type Offender = { file: string; prop: string; cls: string; snippet: string };
const governedOffenders: Offender[] = [];
for (const f of adminTsx) {
  const relf = rel(f);
  if (GOVERNED_ALLOW.has(relf)) continue;
  // ⭐ Strip every <Sensitive …> element first, so a CORRECTLY wired field cannot be reported.
  // Its own `value={user.email}` prop otherwise matches the very pattern being hunted — the same
  // trap that made check 1.8 fail against a correctly wired page.
  const body = decomment(readFileSync(f, "utf8")).replace(/<Sensitive[\s\S]*?\/>/g, "");
  for (const g of GOVERNED_ACCESSORS) {
    const re = new RegExp("\\{[^{}]*\\.\\b" + g.prop + "\\b[^{}]*\\}", "g");
    for (const m of body.match(re) ?? []) {
      const snippet = m.replace(/\s+/g, " ").slice(0, 70);
      // A reviewed site is keyed by a FRAGMENT of its own text, so the reason dies with the code.
      const reviewed = [...GOVERNED_REVIEWED.keys()].some((k) => {
        const [kf, frag] = k.split("::");
        return kf === relf && m.includes(frag);
      });
      if (reviewed) continue;
      // A bare presence check renders nothing: `{user.email && (`.
      if (/^\{[^{}]*&&\s*\($/.test(m.replace(/\s+/g, " ").trim())) continue;
      // ⚠️ AND SKIP OUR OWN RESIDUE. Stripping `<Sensitive …/>` out of `{x.dob ? <Sensitive/> : "—"}`
      // leaves `{x.dob ? : "—"}` — an empty ternary branch that exists ONLY because the field is
      // correctly wired. Reporting it would condemn exactly the fix this ratchet is asking for,
      // which is how a detector earns a reputation for crying wolf and then gets deleted.
      if (/\?\s*:/.test(m)) continue;
      // ⭐ A value already run through one of the registry's OWN mask functions is WIRED. Not every
      // site can host <Sensitive>: `AutoCheck.detail` is a plain string on a CLIENT component, so
      // /admin/kyc/[id]'s checklist masks at source with `maskDob`. Treating that as an offender
      // would push the next author toward the raw value to silence the check.
      if (/\bmask[A-Z]\w*\s*\(/.test(m)) continue;
      governedOffenders.push({ file: relf, prop: g.prop, cls: g.cls, snippet });
    }
  }
}

// ⛔ THE RATCHET IS ON UNREVIEWED USES AND MAY ONLY SHRINK (§5.5). A count that may only shrink is
// the only shape that survives someone adding a page: it cannot be satisfied by not growing.
const GOVERNED_CEILING = 0;
ok(`7.1 ⛔ RATCHET · every governed field on an admin surface is wired or reviewed (ceiling ${GOVERNED_CEILING})`,
   governedOffenders.length <= GOVERNED_CEILING,
   governedOffenders.length === 0
     ? "0 unreviewed"
     : governedOffenders.map((o) => `${o.file} [${o.cls}] ${o.snippet}`).join(" | "));

// ⭐ POSITIVE CONTROL ON THE DETECTOR ITSELF. A ratchet whose population is empty reads exactly
// like a ratchet with nothing to find — the failure that let this gap exist for a whole delivery.
// ⛔ BOTH ROOTS ASSERTED SEPARATELY. `adminTsx.length > 50` alone passes even if the
// `src/components/admin` walk silently returns nothing — a widened population that quietly
// stayed narrow reads exactly like a widened one that worked.
{
  const rooted = (seg: string) => adminTsx.filter((f) => f.replace(/\\/g, "/").includes(seg)).length;
  const app = rooted("/src/app/admin/"), comp = rooted("/src/components/admin/");
  ok("7.2 ⭐ POSITIVE CONTROL · the population is BOTH admin trees, not a remembered list",
     app > 50 && comp > 5, `${app} in app/admin + ${comp} in components/admin = ${adminTsx.length}`);
}

ok("7.3 ⭐ …and it CAN still match: the wired page holds the accessors, inside <Sensitive>",
   /<Sensitive field="email"/.test(readFileSync(join(ROOT, "src/app/admin/players/[id]/page.tsx"), "utf8")),
   "stripping <Sensitive> is what makes 7.1 zero, not the absence of the fields");

ok("7.4 every exemption and every reviewed site carries a reason, and both lists may only shrink",
   [...GOVERNED_ALLOW.values()].every((r) => r.length > 30)
   && [...GOVERNED_REVIEWED.values()].every((r) => r.length > 30),
   `${GOVERNED_ALLOW.size} file exemptions · ${GOVERNED_REVIEWED.size} reviewed sites`);

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 * §8 · THE PHONE — and the two surfaces §7's population structurally cannot reach
 *
 * ⛔ §7 WALKS `src/app/admin/**` FOR `.tsx`. That is the right population for a RENDER, and it
 * is blind to the two places PII leaves this platform as a FILE: the transactions CSV
 * (`src/app/api/...`, a `.ts` route) and the DSAR bundle (`src/lib/server/privacy.ts`). Both were
 * outside every guard in this suite, and the CSV was the largest bulk-PII surface on the
 * platform. A ratchet's honesty depends on saying what it does NOT cover, so these are asserted
 * by name rather than left to a population that was never going to include them.
 *
 * 🟡 STILL OWED, AND RECORDED AS OWED: the rest of `src/lib/server/**.ts` is not swept for
 * governed accessors. Those sites mask for LOGS and EMAILS (`sms.ts`, `auth-service.ts`,
 * `kyc-service.ts`, `selcom.ts`, `payments.ts`) rather than rendering to a staff reader, so they
 * are a different question from this axis — but "different question" is a judgement, not a
 * measurement, and nobody has measured it. E-313.
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
console.log("\n§8 · the phone, and the file-producing surfaces");

const maskSrc = decomment(readFileSync(join(ROOT, "src/lib/phone-normalize.ts"), "utf8"));
// Driven, not read: 8.14-8.16 call the real helper. Imported here rather than at the top
// because this suite otherwise reads source, and a behavioural leg needs the module itself.
const A = await import("../src/lib/server/affiliate-service.ts");
const registrySrc = decomment(readFileSync(join(ROOT, "src/lib/server/sensitive-fields.ts"), "utf8"));
const exportSrc = decomment(readFileSync(join(ROOT, "src/app/api/admin/transactions/export/route.ts"), "utf8"));

ok("8.1 the phone is IN the registry, under identity.contact",
   /phone:\s*\{[\s\S]{0,200}?readClass:\s*"identity\.contact"/.test(registrySrc),
   "the class has always CLAIMED the phone (roles.ts READ_CLASS_SUMMARY); this is where it becomes true");

ok("8.2 ⛔ msisdn is a SEPARATE field addressing a TRANSACTION, not the player's account phone",
   /msisdn:\s*\{[\s\S]{0,260}?targetType:\s*"Transaction"/.test(registrySrc)
   && /msisdn:\s*\{[\s\S]{0,320}?db\.txn\.findById/.test(registrySrc),
   "a payout destination read back off user.phoneE164 would state, on a money row, that the money went somewhere it did not");

ok("8.3 the reveal's audit row takes its targetType from the registry, never the literal \"User\"",
   /targetType:\s*"targetType" in spec/.test(revealSrc),
   "an msisdn reveal filed against a player id points an investigator at the wrong record");

ok("8.4 🔴 the reveal is NOT gated on one hardcoded domain",
   !/requireStaff\(\s*"(support|compliance|accounting|trading|ops|growth|overview)"\s*\)/.test(revealSrc),
   "<Sensitive> renders on four different domains' routes; pinning the action to one refused COMPLIANCE on every reveal, everywhere, by a throw the control could not display");

ok("8.5 …and it refuses SOFTLY, so the control can show the reason",
   /softRequireConsole\(/.test(revealSrc) && /if \(!gate\.ok\) return gate;/.test(revealSrc));

ok("8.6 ⛔ the mask lives in a module with NO imports, so a client component cannot drag the store into a browser chunk",
   /export function maskPhone/.test(maskSrc) && !/^import /m.test(maskSrc),
   "sensitive-fields.ts imports the store; app-shell.tsx and auth/otp mask phones on the client");

ok("8.7 ⛔ a short or malformed number masks to dots and is NEVER echoed",
   /if \(!raw \|\| raw\.length < 10\) return "••••";/.test(maskSrc),
   "six hand-written masks read `phone.length > 6 ? masked : phone` — the junk row was the one printed in full");

{
  // The shape rule, over the same population §7 already trusts: no admin surface may re-express
  // a phone mask by hand. ⚠️ This is the check that would have caught the seven divergent copies.
  const handRolled = adminTsx
    .filter((f) => !GOVERNED_ALLOW.has(rel(f)))
    .filter((f) => /phoneE164\.slice\s*\(|msisdn\.slice\s*\(/.test(decomment(readFileSync(f, "utf8"))))
    .map(rel);
  ok("8.8 ⛔ no admin surface hand-rolls a phone mask — there were SEVEN, in THREE different shapes",
     handRolled.length === 0, handRolled.join(", ") || "0");
}

ok("8.9 🔴 the transactions CSV masks msisdn unless the reader's cell permits a reveal",
   /mayReveal\(session\.role,\s*"identity\.contact"\)/.test(exportSrc)
   && /full \? t\.msisdn : maskPhone\(t\.msisdn\)/.test(exportSrc),
   "the gate is `accounting`, which FINANCE and AUDITOR hold — and both sit at the `masked` ceiling, so two roles forbidden a single unmasked phone could pull 50,000 into a file");

ok("8.10 …and the column NAMES itself when masked, because a CSV has no eye",
   /full \? "msisdn" : "msisdn_masked"/.test(exportSrc),
   "otherwise a reconciler reads the dots as a corrupt number and opens an incident");

// ⚠️ THIS ASSERTION CHECKS THE BLOCK IS *REACHED*, NOT MERELY PRESENT — and it only does so
// because a red mutation proved the weaker version worthless. `bulk-pull-is-not-recorded-as-a-
// pii-read` wraps the audit in `if (false)`, which leaves every string this leg looks for exactly
// where it was: the guard stayed green over provably dead code. A source-level check that reads
// for a fragment is satisfied by a comment. So the CONDITION is named too.
ok("8.11 …and a FULL pull writes pii.revealed with the row count, never a value",
   /if \(fullMsisdn && msisdnRows > 0\) \{/.test(exportSrc)
   && /action: "pii\.revealed"/.test(exportSrc) && /bulk: true, rows: msisdnRows/.test(exportSrc)
   && !/payload:[^}]*t\.msisdn/.test(exportSrc),
   "`transactions.exported` alone does not record that PII left the building");

{
  /**
   * 🔴 THE LOOSER OF TWO MASKINGS DECIDES WHAT LEAKED. `/admin/privacy` and
   * `/admin/self-exclusions` labelled their name column with `maskName`, whose fallback for a
   * player with no display name is a PHONE FRAGMENT keeping the last THREE digits — beside a
   * phone column that now shows the last two behind an audited eye. One row, one number, two
   * maskings, and the ungoverned one gave away more.
   *
   * ⛔ `maskName` is deliberately NOT changed: `scripts/erasure.test.mts:224` pins its phone form
   * and asserts it differs from the name mask, so a redacted record cannot be re-identified by
   * matching the two. This is a call-site rule, and it is asserted at the call sites.
   */
  const rosters = ["src/app/admin/privacy/page.tsx", "src/app/admin/self-exclusions/page.tsx"];
  const offenders = rosters.filter((f) => /\bmaskName\s*\(/.test(decomment(readFileSync(join(ROOT, f), "utf8"))));
  ok("8.12 ⛔ a sensitive roster does not label a row with maskName's PHONE fallback",
     offenders.length === 0,
     offenders.join(", ") || "both use maskedRosterLabel — a masked name, else the non-PII handle");
  ok("8.13 ⭐ POSITIVE CONTROL · the detector can still see a `maskName(` call",
     /\bmaskName\s*\(/.test("const x = maskName(a, b);"));

  /**
   * ⛔ AND THE BEHAVIOUR, NOT ONLY THE CALL SITES — added 2026-09-06 after a near miss.
   *
   * 8.12 above proves the two rosters do not call `maskName`. It says NOTHING about what
   * `maskedRosterLabel` itself does, and on 2026-09-06 that helper appeared in the working tree
   * rewritten to `return maskName(user.displayName, phoneE164)` — a one-line body that
   * reintroduces the exact phone-fragment leak the function exists to prevent, underneath a
   * twenty-line comment explaining why it must not. 8.12 would have passed. `tsc` would have
   * passed. ⭐ A guard on the CALL SITE cannot see a lie inside the CALLEE, so the property is
   * asserted where it actually lives: drive the function and look at what comes out.
   */
  const ROSTER_PHONE = "+255712000101";
  const noName = A.maskedRosterLabel({ id: "usr_9f3k2qm1a8", displayName: null }, ROSTER_PHONE);
  const named = A.maskedRosterLabel({ id: "usr_9f3k2qm1a8", displayName: "Asha Mwakalinga" }, ROSTER_PHONE);
  // ⚠️ "CONTAINS NO DIGITS" WOULD BE THE WRONG PROPERTY, and the first draft of this leg asserted
  // it and failed on correct output. The handle is `Player #2QM1A8` — its digits come from the
  // USER ID, which is not PII and is already rendered beside it. The property that matters is
  // that the label is not a PHONE: no `+` form, and no run of the number's own digits.
  ok("8.14 ⛔ a roster label for a player with NO name is not a phone in any form",
     !noName.includes("+")
     && !noName.includes(ROSTER_PHONE.slice(-3))
     && !noName.includes(ROSTER_PHONE.replace(/\D/g, "").slice(0, 4)),
     `got "${noName}" against ${ROSTER_PHONE}`);
  ok("8.15 …and it is the non-PII handle this product already chose",
     /^Player #/.test(noName), `got "${noName}"`);
  ok("8.16 ⭐ POSITIVE CONTROL · a player WITH a name still gets the masked name, not the handle",
     named.includes("***") && !/^Player #/.test(named), `got "${named}"`);
}

ok("8.17 ⭐ POSITIVE CONTROL · §8 reads real files, not empty strings",
   maskSrc.length > 500 && registrySrc.length > 500 && exportSrc.length > 500,
   `${maskSrc.length} / ${registrySrc.length} / ${exportSrc.length} bytes`);

console.log(`\nread-tiers: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
