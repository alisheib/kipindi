/**
 * `npm run test:admin-soft-gate` — there is ONE soft admin gate, and it audits.
 *
 * WHAT THIS PROTECTS (finding A2, 2026-08-11). Four admin surfaces each hand-rolled the
 * same "check the grant, refuse softly" gate — payments, KYC, reports and privacy — and the
 * copies had drifted: **privacy did not write the `privilege_escalation_blocked` SECURITY
 * row that every other gate in this codebase writes**, on the PDPA data-subject surface.
 * Driven and measured before the fix: a role without `compliance` canAct clicked Export
 * bundle and the counter went 0 → 0.
 *
 * ⛔ THE DRIFT WAS INVISIBLE FROM ANY ONE FILE. Each copy read as a careful, deliberate
 * gate. You could only see the missing audit by putting the four side by side — which is
 * the whole argument for there being one, and the reason this guard asserts the ABSENCE of
 * copies rather than the presence of a call.
 *
 * ⚠️ THIS IS THE STRUCTURAL HALF. The behavioural proof is `npm run qa:admin-privacy-gate`,
 * which signs in as a real AUDITOR, clicks the real control and reads the audit counter
 * back out of Postgres. A guard over source text cannot tell you a row was written.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const GUARD = join(ROOT, "src/lib/server/rbac-guard.ts");
const ADMIN = join(ROOT, "src/app/admin");

let pass = 0;
const fails: string[] = [];
// ⚠️ RETURNS THE CONDITION. The first draft returned void, so `if (!ok(...)) continue;`
// short-circuited on EVERY call — §3's four delegation assertions never ran and the suite
// printed a confident 11/1. A helper whose return value a caller branches on must return one.
const ok = (name: string, cond: boolean, detail = ""): boolean => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

/** Blank out comments so a docstring naming a symbol never reads as a call. */
const decomment = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
   .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + m.slice(p1.length).replace(/./g, " "));

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

/**
 * Extract a top-level function body by brace matching.
 * ⛔ Paren-match the PARAMETER LIST first — taking the first `{` after the name lands on a
 * DESTRUCTURED PARAMETER and yields a 12-byte "body". That mistake made 50 guarded actions
 * read as unguarded on the first run of this session's inventory.
 */
function bodyOf(src: string, name: string): string | null {
  const m = new RegExp(`(?:export\\s+)?async\\s+function\\s+${name}\\s*\\(`).exec(src);
  if (!m) return null;
  let p = m.index + m[0].length - 1, d = 0, q = p;
  for (; q < src.length; q++) {
    if (src[q] === "(") d++;
    else if (src[q] === ")") { d--; if (d === 0) break; }
  }
  let scan = q + 1;
  while (scan < src.length) {
    const open = src.indexOf("{", scan);
    if (open < 0) return null;
    let bd = 1, k = open + 1;
    while (k < src.length && bd > 0) { if (src[k] === "{") bd++; else if (src[k] === "}") bd--; k++; }
    if (bd !== 0) return null;
    if (k - 1 === 0 || src[k - 2] === "\n") return src.slice(open, k);
    scan = k;
  }
  return null;
}

console.log("\ntest:admin-soft-gate — one soft gate, and it audits\n");

// ── §1 · the shared helper exists and does all three things ───────────────────────
console.log("§1 the shared helper");
{
  const src = decomment(readFileSync(GUARD, "utf8"));
  const body = bodyOf(src, "softRequireStaff");
  ok("§1 softRequireStaff exists in rbac-guard.ts", body !== null);
  if (body) {
    // ⛔ ASSERT WHAT IT CARRIES, NOT THAT THE NAME APPEARS. The literal string is what a
    // compliance officer greps the audit log for; a renamed action defeats the purpose.
    ok("§1 its refusal branch audits privilege_escalation_blocked", body.includes(`"privilege_escalation_blocked"`));
    ok("§1 the audit carries category SECURITY", /category:\s*"SECURITY"/.test(body));
    ok("§1 it takes step-up 2FA (requireAdminTotp)", /requireAdminTotp\s*\(/.test(body));
    ok("§1 it consults the data-driven grant (canAct), not a hardcoded role list", /canAct\s*\(/.test(body));
    ok("§1 ADMIN bypasses, so the Owner can never be locked out", /role\s*!==\s*"ADMIN"/.test(body));
    // The audit must come BEFORE the return, or a refusal returns unrecorded.
    const auditAt = body.indexOf("privilege_escalation_blocked");
    const returnAt = body.indexOf("return { ok: false");
    ok("§1 the audit is written BEFORE the refusal returns", auditAt > 0 && returnAt > auditAt,
      `audit@${auditAt} return@${returnAt}`);
  }
}

// ── §2 · nothing under src/app/admin re-implements it ─────────────────────────────
console.log("\n§2 no admin action re-implements the gate");
{
  const files = walk(ADMIN).filter((f) => /actions?\.ts$/.test(f) || /-actions?\.ts$/.test(f));
  const offenders: string[] = [];
  for (const f of files) {
    const src = decomment(readFileSync(f, "utf8"));
    // A local soft gate is: calls canAct(...) AND returns a soft error shape. The action
    // guards that THROW (requireStaff/requireOwner) are the hard form and live in
    // rbac-guard.ts; a file calling canAct directly has its own copy of the decision.
    if (/\bcanAct\s*\(/.test(src)) offenders.push(relative(ROOT, f).replace(/\\/g, "/"));
  }
  ok("§2 no admin action file calls canAct() directly — the decision lives in rbac-guard.ts",
    offenders.length === 0, offenders.join(", "));
}

// ── §3 · the four known soft gates delegate ───────────────────────────────────────
console.log("\n§3 the four soft-gated surfaces delegate to it");
{
  const SOFT: Array<[file: string, fn: string, domain: string]> = [
    ["src/app/admin/payments/payment-actions.ts", "gate", "accounting"],
    ["src/app/admin/kyc/[id]/kyc-actions.ts", "gate", "compliance"],
    ["src/app/admin/reports/pack-actions.ts", "requireSigningOfficer", "accounting"],
    ["src/app/admin/privacy/actions.ts", "requireOfficer", "compliance"],
  ];
  for (const [rel, fn, domain] of SOFT) {
    const src = decomment(readFileSync(join(ROOT, rel), "utf8"));
    const body = bodyOf(src, fn);
    if (!ok(`§3 ${rel} · ${fn}() was located`, body !== null) || !body) continue;
    ok(`§3 ${rel} · ${fn}() delegates to softRequireStaff`, /softRequireStaff\s*\(/.test(body));
    ok(`§3 ${rel} · ${fn}() asks for the "${domain}" domain`, body.includes(`"${domain}"`),
      `body did not name "${domain}"`);
    // ⭐ THE ANTI-REGRESSION: the body must NOT contain its own decision any more.
    ok(`§3 ${rel} · ${fn}() keeps no local copy of the decision`,
      !/\bcanAct\s*\(/.test(body) && !body.includes("privilege_escalation_blocked"));
  }
}

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length > 0 ? 1 : 0);
