/**
 * test:ops-provision-staff — the staff provisioning door's four refusals (2026-10-07, for the QA GROWTH login management
 * approved — COMPLIANCE-DECISIONS § "2026-10-07 · Management's answers for the first marketing campaign …" item 6), DRIVEN:
 * the real script is run as a child process, exactly as `npm run ops:provision-staff` runs it, with a controlled
 * environment, and its exit code and words are read.
 *   P1  no DATABASE_URL → REFUSING, exit 2, before anything is read (the in-memory store would "provision" an account
 *       that exists nowhere);
 *   P2  --execute outside production's own environment → REFUSING, exit 2, before anything is read — no Railway
 *       environment, and the audit secret equal to the session secret;
 *   P3  a list or a secrets file where git would commit it → REFUSING, exit 2; the prefix rules; a secrets file that
 *       already holds the prefix's password → REFUSING;
 *   P4  the wiring: the public-proxy rewrite comes BEFORE the store is loaded, and the store is loaded only by a
 *       dynamic `import()` (a static import would build nothing yet, but a future one that reads at import would read the
 *       private host); no password is printed in the --secrets-file mode;
 *   P5  the control: a --plan with an (unreachable) database passes every refusal and reaches the database.
 * No database is ever reached: every DATABASE_URL here points at a closed loopback port.
 *
 * ⛔ The red control (`--prove-red`) runs the same claims against MUTATED COPIES of the script written OUTSIDE the repo
 * (the OS temp dir, its imports pointed back at this checkout), so no file in the checkout is touched. The plants are
 * DECLARED in `scripts/anchors/ops-provision-staff.anchors.mjs`, so `test:red-anchors` §3 audits that each still
 * resolves exactly once in the script (writing the copies keeps this harness out of §4's in-process class).
 *
 * Run: `npm run test:ops-provision-staff` · Red: `npm run red:ops-provision-staff`
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MUTATIONS as PLANTS } from "./anchors/ops-provision-staff.anchors.mjs";

process.exitCode = 1;
const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "ops-provision-staff.mts");
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const NL = String.fromCharCode(10);
const DEAD_DB = "postgresql://nobody:nothing@127.0.0.1:1/none";
const TMP = mkdtempSync(join(tmpdir(), "ops-provision-staff-"));

type Run = { code: number | null; out: string };
function run(script: string, args: string[], env: Record<string, string | undefined>): Run {
  const base: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined) continue;
    if (/^(DATABASE_URL|RAILWAY_|AUDIT_CHAIN_SECRET|SESSION_SECRET)/.test(k)) continue;
    base[k] = v;
  }
  for (const [k, v] of Object.entries(env)) if (v !== undefined) base[k] = v;
  const r = spawnSync(process.execPath, [TSX, script, ...args], { cwd: ROOT, env: base, encoding: "utf8", timeout: 120_000 });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

const ONE_ROW = join(TMP, "list.json");
writeFileSync(ONE_ROW, JSON.stringify([{ phone: "+255700000099", email: "qa.x@50pick.test", displayName: "QA X", role: "GROWTH" }]));
const HELD = join(TMP, "held.env.local");
writeFileSync(HELD, `QA_X_PASSWORD=already-here${NL}`);
const PROD = { RAILWAY_ENVIRONMENT_NAME: "production", RAILWAY_SERVICE_NAME: "50pick", SESSION_SECRET: "s".repeat(40) };

type Claim = { id: string; name: string; check: (script: string) => [boolean, string] };
const refused = (r: Run, words: RegExp) => r.code === 2 && words.test(r.out) && !/Would provision/.test(r.out);
const claims: Claim[] = [
  { id: "P1", name: "no DATABASE_URL → REFUSING, exit 2, nothing read", check: (s) => {
    const r = run(s, ["--list", ONE_ROW, "--plan"], {});
    return [refused(r, /REFUSING: no DATABASE_URL/), `exit ${r.code} · ${r.out.slice(0, 160)}`];
  } },
  { id: "P2a", name: "--execute with no Railway environment → REFUSING, exit 2, nothing read", check: (s) => {
    const r = run(s, ["--list", ONE_ROW, "--execute", "--confirm", "PROVISION 50PICK STAFF", "--reason", "a reason long enough"],
      { DATABASE_URL: DEAD_DB, AUDIT_CHAIN_SECRET: "a".repeat(40), SESSION_SECRET: "s".repeat(40) });
    return [refused(r, /REFUSING: --execute runs only in production's own environment/), `exit ${r.code} · ${r.out.slice(0, 160)}`];
  } },
  { id: "P2b", name: "--execute with the audit secret equal to the session secret → REFUSING, exit 2", check: (s) => {
    const r = run(s, ["--list", ONE_ROW, "--execute", "--confirm", "PROVISION 50PICK STAFF", "--reason", "a reason long enough"],
      { DATABASE_URL: DEAD_DB, ...PROD, AUDIT_CHAIN_SECRET: "s".repeat(40) });
    return [refused(r, /REFUSING: --execute runs only in production's own environment/), `exit ${r.code} · ${r.out.slice(0, 160)}`];
  } },
  { id: "P3a", name: "a list git would commit (package.json, tracked) → REFUSING, exit 2", check: (s) => {
    const r = run(s, ["--list", join(ROOT, "package.json"), "--plan"], { DATABASE_URL: DEAD_DB });
    return [refused(r, /REFUSING: .*names people's phones and emails/), `exit ${r.code} · ${r.out.slice(0, 160)}`];
  } },
  { id: "P3b", name: "a secrets file git would commit → REFUSING, exit 2", check: (s) => {
    const r = run(s, ["--list", ONE_ROW, "--plan", "--secrets-file", join(ROOT, "package.json"), "--secrets-prefix", "QA_X"], { DATABASE_URL: DEAD_DB });
    return [refused(r, /REFUSING: .* is not git-ignored/), `exit ${r.code} · ${r.out.slice(0, 160)}`];
  } },
  { id: "P3c", name: "--secrets-file without --secrets-prefix, or a prefix that is not UPPER_SNAKE → REFUSING", check: (s) => {
    const a = run(s, ["--list", ONE_ROW, "--plan", "--secrets-file", join(TMP, "x.env.local")], { DATABASE_URL: DEAD_DB });
    const b = run(s, ["--list", ONE_ROW, "--plan", "--secrets-file", join(TMP, "x.env.local"), "--secrets-prefix", "qa x"], { DATABASE_URL: DEAD_DB });
    return [refused(a, /go together/) && refused(b, /go together/), `exits ${a.code}, ${b.code}`];
  } },
  { id: "P3d", name: "a secrets file that already holds the prefix's password → REFUSING (never a second one)", check: (s) => {
    const r = run(s, ["--list", ONE_ROW, "--plan", "--secrets-file", HELD, "--secrets-prefix", "QA_X"], { DATABASE_URL: DEAD_DB });
    return [refused(r, /already holds QA_X_PASSWORD/), `exit ${r.code} · ${r.out.slice(0, 160)}`];
  } },
  { id: "P4", name: "the proxy rewrite comes before the store loads, and the store loads only by a dynamic import()", check: (s) => {
    const src = readFileSync(s, "utf8");
    const rewrite = src.indexOf("turntable.proxy.rlwy.net:40357");
    const load = src.search(/await import\([^)]*src\/lib\/server\/store\.ts/);
    const staticImport = /^import (?!type )[^;]*src\/lib\/server\/(store|prisma|audit)\.ts/m.test(src);
    return [rewrite > 0 && load > rewrite && !staticImport, `rewrite at ${rewrite}, dynamic load at ${load}, static import ${staticImport}`];
  } },
  { id: "P4b", name: "in --secrets-file mode the success path prints no password (it names the file and the key)", check: (s) => {
    const src = readFileSync(s, "utf8");
    const tail = src.slice(src.indexOf("✔ Provisioned"));
    const secretsBranch = tail.slice(0, tail.indexOf("} else {"));
    return [/if \(SECRETS_FILE && SECRETS_PREFIX\)/.test(tail) && !/tempPassword/.test(secretsBranch) && /is NOT shown/.test(secretsBranch),
      "the secrets branch of the final print"];
  } },
  { id: "P5", name: "CONTROL — a --plan with a database passes every refusal and reaches the database", check: (s) => {
    const r = run(s, ["--list", ONE_ROW, "--plan"], { DATABASE_URL: DEAD_DB });
    return [r.code !== 2 && !/REFUSING/.test(r.out) && /reach|connect|P1001|ECONNREFUSED/i.test(r.out), `exit ${r.code} · ${r.out.slice(0, 200)}`];
  } },
];

function judge(script: string, only?: Set<string>): Map<string, [boolean, string]> {
  const out = new Map<string, [boolean, string]>();
  for (const c of claims) if (!only || only.has(c.id)) out.set(c.id, c.check(script));
  return out;
}

const verdicts = judge(SCRIPT);
let pass = 0;
for (const c of claims) {
  const [ok, detail] = verdicts.get(c.id)!;
  if (ok) pass++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${c.id} · ${c.name}${ok ? "" : ` — ${detail}`}`);
}
const fail = claims.length - pass;
console.log(`${NL}ops-provision-staff: ${pass} passed, ${fail} failed`);

if (PROVE_RED) {
  if (fail > 0) {
    console.log(`RED CONTROL — NOT RUN: the baseline is not green (${fail} claim(s) fail for the REAL script)`);
  } else {
    // Each plant: a mutated copy, OUTSIDE the repo, its relative imports pointed back at this checkout.
    const real = readFileSync(SCRIPT, "utf8");
    const at = (rel: string) => pathToFileURL(join(ROOT, rel)).href;
    const relocate = (src: string) => src.replace(/"\.\.\/src\/([^"]+)"/g, (_m, p) => `"${at(`src/${p}`)}"`);
    // The plants are declared data (see the header); each replaces its anchor's FIRST occurrence, as before.
    type Plant = { name: string; expect: string[]; mutate: (s: string) => string };
    const plants: Plant[] = (PLANTS as { name: string; expect: string[]; from: string; to: string }[])
      .map((m) => ({ name: m.name, expect: m.expect, mutate: (s: string) => s.replace(m.from, () => m.to) }));
    let held = 0;
    const missed: string[] = [];
    console.log(`${NL}RED CONTROL — each defect planted in a copy must fire its own claim${NL}`);
    for (const p of plants) {
      const mutated = p.mutate(real);
      if (mutated === real) { missed.push(`${p.name}: the plant did not apply`); console.log(`  MISSED ${p.name} — did not apply`); continue; }
      const copy = join(TMP, `plant-${plants.indexOf(p)}.mts`);
      writeFileSync(copy, relocate(mutated));
      const v = judge(copy, new Set(p.expect));
      const fired = p.expect.filter((id) => !v.get(id)![0]);
      if (fired.length === p.expect.length) { held++; console.log(`  held  ${p.name} → ${fired.join(", ")}`); }
      else { missed.push(p.name); console.log(`  MISSED ${p.name} — only ${fired.join(", ") || "none"} of ${p.expect.join(", ")}`); }
    }
    console.log(`${NL}RED CONTROL — ${held} of ${plants.length} proofs held${missed.length ? `; ${missed.length} FAILED` : ""}`);
    if (missed.length === 0) process.exitCode = 0;
  }
} else if (fail === 0) {
  process.exitCode = 0;
}
rmSync(TMP, { recursive: true, force: true });
