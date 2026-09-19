/**
 * W25 · RULING 523 — A SERVER ACTION IS NOT COVERED BY A PATH RULE, SO IT GETS A STRUCTURAL ONE.
 *
 *   npm run test:admin-action-gate
 *
 * ⛔ WHY A PATH RULE CANNOT SEE THESE. A Next server action is a POST to whatever URL the browser is currently on,
 * carrying a `Next-Action` id — NOT to the action's own source path. So W25 belt 1 (`src/proxy.ts` refusing /admin
 * for a non-staff cookie) and belt 2 (every admin page gating on the stored row) are both blind to an admin action
 * invoked from `/` or `/markets/[id]`. `src/proxy.ts` already reads that header, so the codebase knows the shape
 * exists and decides nothing about it. This guard is the answer: not a review habit, a check.
 *
 * ⭐ WHAT IT ASSERTS. In every `"use server"` file under `src/app/admin`, each exported function must call one of the
 * recognised gates BEFORE its first data access. "Before" is positional inside the function body, which is what makes
 * this checkable without a type checker: a gate that runs after the read has already let the read happen.
 *
 * ⛔ AND IT MUST BE ABLE TO FAIL. §3 plants a synthetic ungated action and requires the scanner to catch it. A
 * structural guard that cannot go red is the defect it was written to prevent, one level up.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const ADMIN = join(ROOT, "src", "app", "admin");
let pass = 0;
const failures = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); } else { failures.push(`${label} ${extra}`.trim()); console.log(`  ✗ ${label} ${extra}`); }
};

/** The gates that answer "may this viewer act". `softRequire*` return a verdict the caller must branch on. */
const GATE = /\b(requireStaff|requireOwner|requireAdmin|softRequireStaff|softRequireConsole|assertOwner|houseConsoleAudience)\s*\(/;
/**
 * THE SAME QUESTION, ASKED INLINE. Not every gate is a named helper: `_actions/ai-toolkit.ts:34` writes the check out
 * longhand — `currentSession()`, then `db.user.findById(session.userId)`, then `role === "ADMIN" || canAct(role, …)`,
 * and it even audits the refusal as `privilege_escalation_blocked`. That is the CORRECT shape (it reads the stored
 * row, not the cookie), so a scanner that demands a particular function NAME would report the best-written gate in
 * the codebase as ungated. What matters is that the viewer's entitlement is decided, so this matches the decision.
 */
const INLINE_GATE = /\bcurrentSession\s*\(\s*\)[\s\S]{0,400}?\b(canAct|canView|isStaffRole|isAdmin)\s*\(|\brole\s*===\s*["']ADMIN["']/;
/** A data access: reading or writing the platform's state. */
const ACCESS = /\b(db|prisma|pc)\s*[.(]|\baudit\s*\(|\bpostLedgerEntries\s*\(|\bwithLock\s*\(/;

/**
 * Exempt, each with the reason stated. An exemption that is not explained is how a gate quietly stops applying.
 * `2fa/setup` and `totp-verify` — both run BEFORE an officer has completed sign-in, so gating them locks the officer
 * out of the very step that would let them pass the gate. `verifyAdminTotpAction` is not ungated in any case: it
 * resolves `currentSession()`, redirects to /auth/admin without one, and rate-limits the code on `totp.verify` — it
 * simply cannot ask "is this viewer staff yet", because answering that is what it is for.
 * ⭐ These are the SAME two routes `admin-section-gate.test.mjs:35` exempts, for the same reason. Two guards agreeing
 * on an exemption is worth more than either asserting it alone; if one list ever grows, the other should be asked why.
 */
const EXEMPT_FILES = new Set(["2fa/setup/actions.ts", "totp-verify/actions.ts"]);

const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(n) && /^\s*["']use server["']/m.test(readFileSync(p, "utf8"))) files.push(p);
  }
};
walk(ADMIN);

/**
 * Find the `{` that opens a FUNCTION BODY, starting from the end of its name/params.
 *
 * ⛔ THE BUG THIS EXISTS TO PREVENT, which this guard shipped with and then caught in itself: taking the first `{`
 * after the parameter list lands inside the RETURN TYPE when one is annotated — `async function gate(a: string):
 * Promise<{ userId: string } | { error: string }> {` brace-matches the type object, so the "body" is
 * `{ userId: string }` and every gate call in the real body is invisible. That made the scanner report
 * `payment-actions.ts` as ungated when every one of its actions opens with `await gate(…)`.
 * So: skip anything inside `<…>`, and take the first `{` at angle-depth 0.
 */
function bodyBrace(src, from) {
  let angle = 0;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (c === "<") angle++;
    else if (c === ">") { if (angle > 0) angle--; }
    else if (c === "{" && angle === 0) return i;
    else if (c === ";" && angle === 0) return -1;   // a declaration with no body (overload signature)
  }
  return -1;
}

/** Extract each exported function's body by brace matching. Returns [{name, body}]. */
function exportedFunctions(src) {
  const out = [];
  const re = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(|export\s+const\s+([A-Za-z0-9_$]+)\s*(?::[^=]+)?=\s*(?:async\s*)?\(/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1] || m[2];
    const brace = bodyBrace(src, re.lastIndex);
    if (brace < 0) continue;
    let depth = 0, end = -1;
    for (let i = brace; i < src.length; i++) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    out.push({ name, body: src.slice(brace, end + 1) });
  }
  return out;
}

/**
 * LOCAL GATE HELPERS — one level of indirection, resolved, because the codebase actually uses it.
 *
 * ⛔ THE FIRST VERSION OF THIS GUARD REPORTED 16 VIOLATIONS AND MOST WERE FALSE. `payment-actions.ts` opens every
 * action with `const g = await gate("retryDeposit")`, and `gate` is a file-local helper at :33 that calls
 * `softRequireStaff("accounting", …)`. A scanner that only knows the platform gate's own names calls that ungated and
 * is wrong. So: any non-exported function in the SAME file whose body calls a recognised gate is itself a gate, and
 * calling it counts. One level only — a helper that calls a helper is not resolved, and would be reported, which is
 * the safe direction to be wrong in.
 */
function localGateNames(src) {
  const names = new Set();
  const re = /(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(|(?:^|\n)\s*const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1] || m[2];
    const brace = bodyBrace(src, re.lastIndex);
    if (brace < 0) continue;
    let depth = 0, end = -1;
    for (let i = brace; i < src.length; i++) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    const b = src.slice(brace, end + 1); if (GATE.test(b) || INLINE_GATE.test(b)) names.add(name);
  }
  return names;
}

/** null = fine; otherwise the reason it is not. */
function violation(body, localGates = new Set()) {
  const access = body.search(ACCESS);
  if (access < 0) return null;                       // touches nothing — nothing to gate
  const pattern = localGates.size
    ? new RegExp(`${GATE.source}|\\b(${[...localGates].join("|")})\\s*\\(`)
    : GATE;
  const inline = body.search(INLINE_GATE);
  const named = body.search(pattern);
  const gate = named < 0 ? inline : (inline < 0 ? named : Math.min(named, inline));
  if (gate < 0) return "no gate call at all";
  if (gate > access) return "the gate runs AFTER the first data access";
  return null;
}

console.log("\n[admin-action-gate] §1 every exported admin server action gates before it reads or writes");
const offenders = [];
let scanned = 0;
for (const file of files) {
  const rel = relative(ADMIN, file).split(sep).join("/");
  if (EXEMPT_FILES.has(rel)) continue;
  const src = readFileSync(file, "utf8");
  const locals = localGateNames(src);
  for (const fn of exportedFunctions(src)) {
    scanned++;
    const why = violation(fn.body, locals);
    if (why) offenders.push(`${rel} · ${fn.name} — ${why}`);
  }
}
ok(`§1 ratchet · ${files.length} "use server" files under src/app/admin, ${scanned} exported functions scanned`,
  files.length >= 25 && scanned >= 40, `${files.length} files · ${scanned} functions`);
ok("§1 every exported admin action calls a gate before its first data access",
  offenders.length === 0, offenders.slice(0, 20).join(" | "));

/**
 * §4 · THE PINNED RATCHET — because the guard's own reasoning is path-independent and its scope was a path.
 *
 * ⛔ THE HOLE THE REVIEW FOUND. §1 walks `src/app/admin` only. But this guard's header says why it exists: a server
 * action POSTs to whatever URL the browser is on, NOT to its own source path. That argument does not stop at a
 * directory — and `src/app/markets/actions.ts` is a `"use server"` file outside the walk holding six
 * admin-privileged writes: resolveMarketAction (:125, settles a market and pays out), recategoriseMarketAction
 * (:166), adminReopenMarketAction (:191, resumes betting), emergencyVoidMarketAction (:211, voids a LIVE pool and
 * refunds every stake), createMarketAction (:244) and restoreCommentAction (:398). All six ARE gated today, by
 * `requireAdminOrThrow` (:60) which reads the stored row then `canAct` and audits refusals as
 * privilege_escalation_blocked. There was no exploit. There was also nothing holding it true: delete the gate from
 * resolveMarketAction and BOTH ratchets stayed green, on the six actions where the consequence is money.
 *
 * ⭐ SO THE RULE IS A RATCHET, NOT A SWEEP: an action that is admin-gated today may not quietly stop being. Every
 * `"use server"` file under `src/app` is scanned; every exported function that gates is discovered; and the set
 * below pins what was gated when this was written. A pinned entry that stops being discovered means its gate was
 * removed — RED. A newly discovered one must be added here deliberately, which is the point: adding an
 * admin-privileged action becomes a decision somebody writes down.
 */
const PINNED_GATED = [
  "markets/actions.ts::resolveMarketAction",
  "markets/actions.ts::recategoriseMarketAction",
  "markets/actions.ts::adminReopenMarketAction",
  "markets/actions.ts::emergencyVoidMarketAction",
  "markets/actions.ts::createMarketAction",
  "markets/actions.ts::restoreCommentAction",
];

console.log("\n[admin-action-gate] §4 an action that is admin-gated today may not quietly stop being");
{
  const APP = join(ROOT, "src", "app");
  const allActionFiles = [];
  const walkApp = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walkApp(p);
      else if (/\.(ts|tsx)$/.test(n) && /^\s*["']use server["']/m.test(readFileSync(p, "utf8"))) allActionFiles.push(p);
    }
  };
  walkApp(APP);
  const discovered = new Set();
  for (const file of allActionFiles) {
    const rel = relative(APP, file).split(sep).join("/");
    if (rel.startsWith("admin/")) continue;            // §1 already covers the admin tree, wholesale
    const src = readFileSync(file, "utf8");
    const locals = localGateNames(src);
    for (const fn of exportedFunctions(src)) {
      const pattern = locals.size ? new RegExp(`${GATE.source}|\\b(${[...locals].join("|")})\\s*\\(`) : GATE;
      if (pattern.test(fn.body) || INLINE_GATE.test(fn.body)) discovered.add(`${rel}::${fn.name}`);
    }
  }
  const lost = PINNED_GATED.filter((p) => !discovered.has(p));
  const unpinned = [...discovered].filter((d) => !PINNED_GATED.includes(d)).sort();
  ok(`§4 ratchet · ${allActionFiles.length} "use server" files under src/app, ${discovered.size} gated actions discovered outside the admin tree`,
    allActionFiles.length >= 45, `${allActionFiles.length} files`);
  ok("§4 every action pinned as admin-gated still has its gate", lost.length === 0, lost.join(", "));
  ok("§4 no admin-gated action outside the admin tree is unpinned (add it to PINNED_GATED deliberately)",
    unpinned.length === 0, unpinned.join(", "));
}

console.log("\n[admin-action-gate] §2 the scanner understands both export shapes");
{
  const fnDecl = `export async function alpha(x: string) { await requireStaff("ops"); await db.user.findById(x); }`;
  const fnConst = `export const beta = async (x: string) => { await requireStaff("ops"); await db.user.findById(x); };`;
  ok("§2 `export async function` is parsed", exportedFunctions(fnDecl).length === 1, JSON.stringify(exportedFunctions(fnDecl).map((f) => f.name)));
  ok("§2 `export const … = async (…) =>` is parsed", exportedFunctions(fnConst).length === 1, JSON.stringify(exportedFunctions(fnConst).map((f) => f.name)));
}

console.log("\n[admin-action-gate] §3 CONTROL · the scanner catches what it exists to catch");
{
  const ungated = `export async function leak(id: string) { const u = await db.user.findById(id); return u; }`;
  const late = `export async function late(id: string) { const u = await db.user.findById(id); await requireStaff("ops"); return u; }`;
  const good = `export async function fine(id: string) { await requireStaff("ops"); return db.user.findById(id); }`;
  const inert = `export async function inert(s: string) { return s.trim().toUpperCase(); }`;
  ok("§3 an action with NO gate is caught", violation(exportedFunctions(ungated)[0].body) === "no gate call at all");
  ok("§3 an action whose gate runs AFTER the read is caught", violation(exportedFunctions(late)[0].body) === "the gate runs AFTER the first data access");
  ok("§3 a correctly gated action is NOT flagged", violation(exportedFunctions(good)[0].body) === null);
  ok("§3 an action that touches no data is NOT flagged", violation(exportedFunctions(inert)[0].body) === null);
}

console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — admin-action-gate: ${pass} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log(`  · ${f}`); process.exit(1); }
