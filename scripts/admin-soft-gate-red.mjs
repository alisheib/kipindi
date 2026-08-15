/**
 * `npm run red:admin-soft-gate` — prove `test:admin-soft-gate` FAILS when the defect
 * it names is present, then restore every file byte-identically.
 *
 * ⛔ WHY A RED HARNESS AT ALL. A guard that has only ever been observed passing is
 * indistinguishable from a guard that cannot fail. This campaign has shipped several of
 * those — a vacuity check that passed over the exact drift it existed to catch, an
 * agreement assertion that derived its expectation from the answer, a `required`-array
 * check that could not fail in the one direction that mattered.
 *
 * ⚠️ AND THE RESTORE IS CHECKED WITH A BYTE COMPARE, not assumed. A harness that damages
 * the tree it was proving something about is worse than no harness.
 *
 * Three plants, each the real pre-fix shape of a different assertion:
 *   1. privacy keeps its own gate again (the A2 defect exactly) → §2 + §3 must fail
 *   2. `softRequireStaff` loses its audit call                  → §1 must fail
 *   3. `softRequireStaff` returns before it audits              → §1's ordering must fail
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { injectDefect } from "./red-anchor.mjs";

const ROOT = join(import.meta.dirname, "..");
const GUARD = join(ROOT, "src/lib/server/rbac-guard.ts");
const PRIVACY = join(ROOT, "src/app/admin/privacy/actions.ts");

let pass = 0;
const fails = [];
const ok = (n, c, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};

/** Run the guard. Returns its exit code — 0 green, 1 red. */
function runGuard() {
  try {
    // ⚠️ NOT `npx` — execFileSync("npx", …) throws ENOENT on Windows, and a catch that
    // turns that into "the suite failed" is how a harness reports a red it never saw.
    execFileSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"),
      join(ROOT, "scripts/admin-soft-gate.test.mts")], { cwd: ROOT, stdio: "pipe" });
    return 0;
  } catch (e) {
    return e.status ?? -1;
  }
}

const PLANTS = [
  {
    name: "privacy keeps its own local gate (the A2 defect, exactly)",
    file: PRIVACY,
    from: `async function requireOfficer(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const g = await softRequireStaff("compliance", "privacy.dsar", "Not authorised.");
  return g.ok ? { ok: true, userId: g.userId } : g;
}`,
    to: `async function requireOfficer(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in." };
  const u = await db.user.findById(session.userId);
  if (!u || !(u.role === "ADMIN" || (await canAct(u.role, "compliance")))) return { ok: false, error: "Not authorised." };
  return { ok: true, userId: session.userId };
}`,
  },
  {
    name: "softRequireStaff loses its SECURITY audit on refusal",
    file: GUARD,
    from: `    audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: session.userId,
      targetType: "Action",
      targetId: action,
      payload: { role: me.role, domain, action },
    });
    return { ok: false, error: refusal };`,
    to: `    return { ok: false, error: refusal };`,
  },
  {
    name: "softRequireStaff returns BEFORE it audits (the row is never written)",
    file: GUARD,
    from: `    audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: session.userId,
      targetType: "Action",
      targetId: action,
      payload: { role: me.role, domain, action },
    });
    return { ok: false, error: refusal };`,
    to: `    if (true) return { ok: false, error: refusal };
    audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: session.userId,
      targetType: "Action",
      targetId: action,
      payload: { role: me.role, domain, action },
    });`,
  },
];

console.log("\nred:admin-soft-gate — the guard must FAIL when the defect is present\n");

// The unmodified tree must be GREEN first, or a red below proves nothing.
ok("CONTROL — the guard is GREEN on the unmodified tree", runGuard() === 0);

// ⛔ THE ANCHORS GO THROUGH `red-anchor.mjs`, NOT THROUGH `String.includes`.
// 🔴 Measured 2026-08-15: **not one of the three plants below could be located**, and every one
// of them spans a line break. `core.autocrlf=true` and there is no `.gitattributes`, so
// `rbac-guard.ts` and `privacy/actions.ts` hold CRLF on disk while these anchors are written
// with `\n`. The run printed `2 passed, 3 failed` — and the two that passed were the two
// CONTROLS, which touch no anchor at all. So the only things this harness actually proved were
// that the guard is green before it starts and green when it finishes, and it reported the
// three real cases as failures: a guard apparently gone weak on exactly the audit-trail cases
// that matter most (a DSAR refusal going unrecorded on the PDPA surface).
//
// ⛔ IT WAS A VERDICT THAT DEPENDED ON HOW THE TREE HAD BEEN CHECKED OUT — red here, green on an
// LF clone. That is the second bug `red-anchor.mjs`'s header records paying for, verbatim, and
// this harness was carrying its own `includes`/`replace` pair instead of using it.
// `injectDefect` also refuses an anchor that matches TWICE, which `includes` cannot see.
for (const p of PLANTS) {
  const original = readFileSync(p.file, "utf8");
  let mutated;
  try {
    mutated = injectDefect(original, p.from, p.to);
  } catch (e) {
    ok(`plant located: ${p.name}`, false, e.message);
    continue;
  }
  ok(`plant located: ${p.name}`, true);
  writeFileSync(p.file, mutated);
  const code = runGuard();
  ok(`RED: ${p.name} → guard exits non-zero`, code !== 0, `exit=${code}`);
  writeFileSync(p.file, original);
  ok(`restored byte-identical after: ${p.name}`, readFileSync(p.file, "utf8") === original);
}

ok("CONTROL — the guard is GREEN again after every restore", runGuard() === 0);

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length > 0 ? 1 : 0);
