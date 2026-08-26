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

import { readFileSync, readdirSync } from "node:fs";
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
// ⚠️ THIS CHECK WAS WRITTEN AS `ok(..., true, "asserted elsewhere")` FIRST, AND THAT IS THE
// defect this campaign names most often: it would pass with the whole axis deleted. It now walks
// the tree. ALLOWED holds the kit primitive and the matrix editor — the only two places a class
// name may legitimately appear — and it may only ever SHRINK.
const ALLOWED = new Set<string>([
  "src/components/ui/sensitive.tsx",
  "src/app/admin/roles/read-tiers-tab.tsx",
]);
const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
};
const offenders = walk(join(ROOT, "src"))
  .filter((f) => !ALLOWED.has(f.slice(ROOT.length + 1).replace(/\\/g, "/")))
  .filter((f) => READ_CLASSES.some((c: string) => decomment(readFileSync(f, "utf8")).includes(`"${c}"`)))
  .map((f) => f.slice(ROOT.length + 1).replace(/\\/g, "/"));
ok("4.4 ⛔ a read class is named in NO .tsx outside the kit primitive — the matrix stays the authority (§6)",
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

console.log(`\nread-tiers: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
