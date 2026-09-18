/**
 * A2'S PROMISE, CHECKED IN THE SOURCE — every writer of an account fact a house bot depends on calls the holder
 * hook, and every script that writes one either goes through the platform or says the L2 sweep covers it.
 *
 *   npm run test:house-bot-holder-lifecycle
 *
 * ⛔ WHAT THIS GUARDS (04 A2 test, F8). The behaviour — what each A2 row DOES — is proven on both stores by
 * `test:house-bot-engine` §19 (every row twice: once through the hook, once through the sweep with no hook at all).
 * What no behavioural suite can prove is that a FUTURE writer is wired at all: a new "suspend" action, a new reset
 * path, a raw-SQL script. That is what this walks. A writer with no hook is caught here, before it ships.
 *
 * ⛔ THE POPULATIONS ARE SHRINK-ONLY. Both counts are ratchets: a new writer must be wired (or named as an
 * exemption, with its reason) in the same commit that adds it. Lowering a ceiling is fine; raising one is a
 * decision, and it must be made here in writing.
 *
 * ⛔ THE DETECTOR IS A FUNCTION OVER TEXT, so §4 can plant a RED fixture and prove the walker can fail. A walker
 * nobody has ever seen fail is a walker that cannot.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(import.meta.dirname, "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
const section = (t: string) => console.log(`\n${t}`);

/* ── the tree ──────────────────────────────────────────────────────────────────────────────────── */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git" || entry === ".pgscratch") continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mts|mjs)$/.test(entry)) out.push(p);
  }
  return out;
}

const SRC = walk(join(ROOT, "src")).map((p) => relative(ROOT, p).replace(/\\/g, "/"));
const SCRIPTS = walk(join(ROOT, "scripts")).map((p) => relative(ROOT, p).replace(/\\/g, "/"));

/* ── §1 · the writers of an account fact a house bot depends on ────────────────────────────────── */

/**
 * The fields A2's matrix reacts to. `phoneE164` is in A2's list and is read by nothing in the cause set today, so
 * it is walked for the next reader rather than dropped: a writer of it must still be wired.
 */
const WRITTEN_FIELDS = ["passwordHash", "role", "status", "phoneE164", "twoFactorEnabled", "email", "closedAt"] as const;
const USER_WRITE = /db\.user\.update\(/;
const OTHER_WRITERS: Array<{ re: RegExp; what: string }> = [
  { re: /db\.responsible\.upsert\(/, what: "a responsible-gambling row" },
  { re: /queue\.push\(r\);/, what: "a data-rights request" },
  { re: /db\.wallet\.update\([^)]*freezeReasons/, what: "a wallet hold" },
];
/** The hook, however it is spelled at a call site. */
const HOOK = /onHolderAccountChanged\(/;
/** How far below a write the hook may sit: past this, a reader cannot see the two as one act. */
const WINDOW_BELOW = 14;
/** …or anywhere in the same function, for a writer whose result is captured and hooked after a lock returns. */
const WINDOW_FUNCTION = 90;

type Writer = { file: string; line: number; text: string; why: string; hooked: boolean };

/**
 * Every writer in one file, and whether the hook is near it. Pure, so §4 can plant text.
 * A write inside a `db.user.update` whose patch names none of the A2 fields is not a writer here.
 */
export function writersIn(file: string, code: string): Writer[] {
  const lines = code.split(/\r?\n/);
  const out: Writer[] = [];
  const near = (i: number, span: number) => lines.slice(i, Math.min(lines.length, i + span)).some((l) => HOOK.test(l));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // A `db.user.update` patch can span lines; read the statement, not the line.
    const stmt = lines.slice(i, Math.min(lines.length, i + 8)).join("\n");
    let why = "";
    if (USER_WRITE.test(line)) {
      const field = WRITTEN_FIELDS.find((f) => new RegExp(`\\b${f}\\b`).test(stmt.split(/\)\s*;/)[0] ?? stmt));
      if (field) why = `db.user.update with ${field}`;
    }
    if (!why) {
      const other = OTHER_WRITERS.find((w) => w.re.test(line));
      if (other) why = other.what;
    }
    if (!why) continue;
    out.push({ file, line: i + 1, text: line.trim().slice(0, 120), why, hooked: near(i, WINDOW_BELOW) || near(i, WINDOW_FUNCTION) });
  }
  return out;
}

/**
 * Writers that legitimately have no hook. Each row says WHY, and the reason is the point: a reader who disagrees
 * can check it. A writer that is not here and not hooked fails.
 */
const EXEMPT: Array<{ file: string; match: RegExp; why: string }> = [
  { file: "src/lib/server/auth-service.ts", match: /db\.user\.create|phoneE164: normalised|status: "PENDING_KYC"/, why: "a brand-new account cannot be a house bot yet" },
  { file: "src/lib/server/auth-service.ts", match: /lastLoginAt/, why: "a sign-in stamp is not an A2 fact" },
  { file: "src/lib/server/erasure.ts", match: /.*/, why: "erasure refuses while a bot is live (04 A5, ruling 2); the hash nulling happens after the bot is gone" },
  { file: "src/lib/server/responsible-gambling.ts", match: /db\.responsible\.upsert\(r\)/, why: "effectivize's delayed raise: the L2 sweep decides it (04 A2 row 8b)" },
  { file: "src/lib/server/kyc-service.ts", match: /status: "ACTIVE"/, why: "an approval clears a cause rather than raising one; the sweep picks it up" },
  { file: "src/app/auth/demo/route.ts", match: /.*/, why: "a development-only account" },
  { file: "src/lib/server/store.ts", match: /.*/, why: "the store's own twin, not a platform writer" },
  { file: "src/lib/server/house-bot-dal.ts", match: /.*/, why: "house-bot rows, not the holder's account" },
  { file: "src/lib/server/house-bot/holder-hook.ts", match: /.*/, why: "the hook itself" },
  { file: "src/lib/server/prisma-dal.ts", match: /.*/, why: "the data layer, not a platform writer" },
  { file: "src/app/api/dev-test/", match: /.*/, why: "the development-only test routes: they seed and promote fixtures, and are not reachable in production" },
  { file: "src/lib/server/responsible-gambling.ts", match: /db\.responsible\.upsert\(fresh\)/, why: "the DEFAULT row: every limit in it is null, so no holder cause can arise from writing it" },
];

/** A row whose `file` ends in "/" exempts that folder; anything else is one exact file. */
const exemptFor = (w: Writer) => EXEMPT.find((e) => (e.file.endsWith("/") ? w.file.startsWith(e.file) : e.file === w.file) && e.match.test(w.text));

section("1 · every writer of an A2 fact calls the holder hook");
const writers: Writer[] = [];
for (const f of SRC) {
  const code = decomment(readFileSync(join(ROOT, f), "utf8"));
  writers.push(...writersIn(f, code));
}
const unhooked = writers.filter((w) => !w.hooked && !exemptFor(w));
ok("1.1 · ⭐ every writer of passwordHash, role, status, phoneE164, twoFactorEnabled, email or closedAt — and of a responsible-gambling row, a wallet hold or a data-rights request — either calls the hook or is a named exemption",
  unhooked.length === 0, unhooked.map((w) => `${w.file}:${w.line} (${w.why})`).join(" · ") || "-");

// Shrink-only: a new writer arrives wired, or this number is raised deliberately, here, with its reason.
const WRITER_CEILING = 33;
ok(`1.2 · the writer population is shrink-only (${writers.length} found, ceiling ${WRITER_CEILING})`, writers.length <= WRITER_CEILING,
  `${writers.length} writers in ${new Set(writers.map((w) => w.file)).size} files`);
const hooked = writers.filter((w) => w.hooked);
ok("1.3 · the hook is wired at a real population, not at one site", hooked.length >= 18, `${hooked.length} hooked`);
const exemptions = writers.filter((w) => !w.hooked && exemptFor(w));
ok("1.4 · every exemption used carries a reason", exemptions.every((w) => (exemptFor(w)?.why ?? "").length > 20), `${exemptions.length} exemptions used`);

/* ── §2 · F8 · scripts and raw SQL ─────────────────────────────────────────────────────────────── */

section("2 · F8 · a script that writes an account fact says the sweep covers it");
const SQL_FIELD = /"passwordHash"|'passwordHash'|passwordHash\s*=/;
const COVERED = /house-bot: covered by L2 sweep/;
const scriptWriters: Array<{ file: string; declared: boolean }> = [];
for (const f of SCRIPTS) {
  const raw = readFileSync(join(ROOT, f), "utf8");
  const code = decomment(raw);
  // A script writes an account fact when it names the column in SQL, or updates the user row with one of the fields.
  const writesSql = SQL_FIELD.test(code);
  const writesRow = writersIn(f, code).length > 0;
  if (!writesSql && !writesRow) continue;
  scriptWriters.push({ file: f, declared: COVERED.test(raw) || /\.test\.mts$|-cases\.mts$|\.test\.mjs$/.test(f) });
}
const undeclared = scriptWriters.filter((s) => !s.declared);
ok("2.1 · ⭐ every script that writes an account fact is a suite, or carries the comment that says the L2 sweep covers it",
  undeclared.length === 0, undeclared.map((s) => s.file).join(" · ") || "-");
// ⚠️ 23 → 24 on 2026-09-16 (build commit 4, step 9): `house-bot-bell-shots.mts`, the render pass, promotes its own
// scratch account to ADMIN so the recipient resolver admits it. It carries the declaration, like every other script here.
const SCRIPT_CEILING = 24;
ok(`2.2 · the script population is shrink-only (${scriptWriters.length} found, ceiling ${SCRIPT_CEILING})`, scriptWriters.length <= SCRIPT_CEILING,
  scriptWriters.map((s) => s.file).slice(0, 6).join(" · "));

/* ── §3 · the hook's own wiring ────────────────────────────────────────────────────────────────── */

section("3 · the wiring itself");
const hookSrc = readFileSync(join(ROOT, "src/lib/server/house-bot/holder-hook.ts"), "utf8");
const lifecycleSrc = decomment(readFileSync(join(ROOT, "src/lib/server/lifecycle.ts"), "utf8"));
const instrumentationSrc = decomment(readFileSync(join(ROOT, "src/instrumentation.ts"), "utf8"));
ok("3.1 · the call sites' entry point exists and binds the production channel",
  /export async function onHolderAccountChanged\(/.test(hookSrc) && /houseHolderAlerts\(\)/.test(hookSrc));
ok("3.2 · ruling 129 · the L2 sweep is the lifecycle ticker's LAST chore, one line, after the identity-review target",
  (() => {
    // ⛔ The CALL order, not the definition order: both helpers are defined above the pass that calls them.
    const i = lifecycleSrc.lastIndexOf("await maybeWatchKycReviewSla()");
    const j = lifecycleSrc.lastIndexOf("await maybeRunHolderSweep()");
    const calls = (lifecycleSrc.match(/await maybeRunHolderSweep\(\)/g) ?? []).length;
    return i > 0 && j > i && calls === 1;
  })(), `sla@${lifecycleSrc.lastIndexOf("await maybeWatchKycReviewSla()")} sweep@${lifecycleSrc.lastIndexOf("await maybeRunHolderSweep()")}`);
ok("3.3 · the sweep runs whatever HOUSE_BOT_ENGINE says (R6): the chore reads no engine env",
  !/HOUSE_BOT_ENGINE/.test(lifecycleSrc));
ok("3.4 · ruling 46 · the engine starts with its alert channel, and every tick gets the same one",
  /houseEngineAlerts\(\)/.test(instrumentationSrc)
    && /workerTicks\(alerts\)/.test(instrumentationSrc) && /plannerTicks\(alerts\)/.test(instrumentationSrc) && /triggerTicks\(alerts\)/.test(instrumentationSrc));
const unescaped: string[] = [];
for (const f of SRC) {
  if (f.endsWith("house-bot/holder-hook.ts")) continue; // the hook's own definition, not a call site
  const code = decomment(readFileSync(join(ROOT, f), "utf8"));
  for (const m of code.matchAll(/onHolderAccountChanged\(/g)) {
    const before = code.slice(Math.max(0, (m.index ?? 0) - 200), m.index ?? 0);
    if (!/runOutsideLock\(\(\) => \{/.test(before)) unescaped.push(f);
  }
}
ok("3.5 · ⭐ EVERY hook leaves its caller's lock first (C4-SPEC §2's trap) — not only the sites whose callers are known to hold one",
  unescaped.length === 0, [...new Set(unescaped)].join(" · ") || "-");

/* ── §4 · CONTROL · the walker can fail ────────────────────────────────────────────────────────── */

section("4 · CONTROL · a planted writer with no hook is caught");
const PLANTED_BAD = `
export async function suspendSomebody(userId: string) {
  await db.user.update(userId, { status: "SUSPENDED" });
  return { ok: true };
}
`;
const PLANTED_GOOD = `
export async function suspendSomebody(userId: string) {
  await db.user.update(userId, { status: "SUSPENDED" });
  void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "SUSPENDED")).catch(() => {});
  return { ok: true };
}
`;
const bad = writersIn("src/lib/server/planted.ts", PLANTED_BAD);
const good = writersIn("src/lib/server/planted.ts", PLANTED_GOOD);
ok("4.1 · ⭐ a planted status writer with NO hook is found and reported unhooked", bad.length === 1 && bad[0].hooked === false, JSON.stringify(bad));
ok("4.2 · ⭐ CONTROL · the same writer WITH the hook beside it passes", good.length === 1 && good[0].hooked === true, JSON.stringify(good));
const plantedSql = `await prisma().$executeRawUnsafe('UPDATE "User" SET "passwordHash" = $1 WHERE id = $2', h, u);`;
ok("4.3 · ⭐ a planted raw-SQL password write in a script with no declaration is caught",
  SQL_FIELD.test(plantedSql) && !COVERED.test(plantedSql));
ok("4.4 · CONTROL · the same script with the declaration passes", COVERED.test(`// house-bot: covered by L2 sweep\n${plantedSql}`));
const plantedIrrelevant = `await db.user.update(userId, { avatarDataUrl: null });`;
ok("4.5 · CONTROL · a write of a field A2 does not read is not a writer", writersIn("src/lib/server/planted.ts", plantedIrrelevant).length === 0);

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-holder-lifecycle: ${pass} passed, ${fail} failed`);
/**
 * ⛔ RULING 519 · THE FLOOR, AND WHY THIS SUITE HAD NONE. Ruling 515 raised every `minPass` the two-store runner
 * carries, and its own sentence says EVERY house suite's floor is checked against its last printed count. This suite is
 * not a two-store suite, so it had no floor to raise — and no floor at all is strictly worse than a stale one:
 * with `process.exit(fail === 0 ? 0 : 1)` and nothing else, a run in which EVERY case silently stopped
 * executing printed "ALL PASS — 0 passed, 0 failed" and exited 0.
 * The floor below is the count `npm run test:house-bot-holder-lifecycle` PRINTED at `670a0bc1` on 2026-09-18, in the run this commit records. It
 * only ever RISES, and only to a number a run printed — never to an arithmetic guess.
 */
const MIN_ASSERTIONS = 16;
if (pass < MIN_ASSERTIONS) {
  console.error(`\n!! FLOOR — test:house-bot-holder-lifecycle ran ${pass} assertion(s), fewer than the ${MIN_ASSERTIONS} a green run printed. Cases that stop running are not cases that pass.`);
  process.exit(4);
}
process.exit(fail === 0 ? 0 : 1);
