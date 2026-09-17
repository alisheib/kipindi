/**
 * The case list behind `test:house-bot-reports` (C5-SPEC §4.1, ruling 176). Run by that suite in two child processes —
 * memory and Postgres — never on its own. Every line carries its store.
 *
 * ⛔ OWNER RULING D19: house bots are never public, and the holder sees nothing. A pin here that goes red is a D19 defect
 * or a money defect, never a pin to relax.
 *
 * §0 are static source pins, each with a PLANTED control that must be reported and a BENIGN control that must not; they
 * run in the memory child only (a source file reads the same on both stores). Source is read through
 * `scripts/lib/decomment.mts`, never a new stripper (`test:decomment`).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./decomment.mts";

type Any = any;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} [${STORE}] ${l}${x ? ` — ${x}` : ""}`);
};
const section = (t: string) => console.log(`\n[${STORE}] ${t}`);
const j = (v: unknown) => JSON.stringify(v) ?? String(v);
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
async function guard(label: string, fn: () => Promise<void> | void): Promise<void> {
  try { await fn(); } catch (e) { ok(`${label} · threw`, false, String((e as Error)?.stack ?? e).split("\n").slice(0, 3).join(" | ")); }
}

/** Every `.ts`/`.tsx` file under `src/`, as a path relative to the repo root (forward slashes). */
function srcFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p); else if (/\.(tsx?)$/.test(e.name)) out.push(relative(ROOT, p).replace(/\\/g, "/"));
    }
  };
  walk(join(ROOT, "src"));
  return out;
}

/** The text of each top-level argument of the call whose `(` is at `open` (brackets balanced; the pins read simple calls). */
function callArgs(src: string, open: number): string[] {
  const args: string[] = [];
  let depth = 0, start = open + 1;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") {
      depth--;
      if (depth === 0) { args.push(src.slice(start, i).trim()); return args; }
    } else if (c === "," && depth === 1) { args.push(src.slice(start, i).trim()); start = i + 1; }
  }
  return args;
}

/** `[start, end)` of the brace-balanced body that follows `anchor`, or null. */
function bodyRange(src: string, anchor: string): [number, number] | null {
  const a = src.indexOf(anchor);
  if (a < 0) return null;
  const open = src.indexOf("{", a + anchor.length);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return [a, i + 1];
  }
  return null;
}

/* ═══ §0 · ruling 170 · no house audit names the HOLDER as its actor ════════════════════════════════ */

/** An actor expression that names the account holder rather than an officer, the engine or nobody. */
export const HOLDER_ACTOR = /^(?:holder\w*|botUserId|(?:[\w$]+\.)*(?:userId|holderUserId|holderId|botUserId))$/;
/**
 * ⛔ THE COMMIT 7 DEBT, BY NAME — IT MAY ONLY LEAVE THIS LIST. `withdrawHouseConsent` (designation.ts) writes
 * `house_bot.holder_withdrew_consent` with the holder as actor; D19c struck the holder-facing Stop it served, so Commit 7
 * reshapes it with the officer as actor (C5-SPEC ruling 170, L49). Until then it has no caller under `src/` (rule 2).
 */
export const HOLDER_ACTOR_DEBT = ["withdrawHouseConsent"] as const;

/** A file whose code can write a house audit row: it names the catalogue, the writer, the consent void or a house action. */
const writesHouseAudit = (code: string) => /\bHOUSE_AUDIT\b|\bhouseAudit\s*\(|\bvoidHouseConsent\s*\(|["'`]house_bot\./.test(code);

/** Every actor expression a house-audit-writing file supplies: `houseAudit(action, ACTOR, …)` and every `actorId: VALUE`. */
export function holderActorSites(code: string): Array<{ at: number; actor: string }> {
  const out: Array<{ at: number; actor: string }> = [];
  for (const m of code.matchAll(/\bhouseAudit\s*\(/g)) {
    const open = m.index! + m[0].length - 1;
    const args = callArgs(code, open);
    // The declaration `async function houseAudit(action: HouseAuditAction, actorId: string | null, …)` is a signature.
    if (args[1] && !/:/.test(args[1]) && HOLDER_ACTOR.test(args[1])) out.push({ at: m.index!, actor: args[1] });
  }
  for (const m of code.matchAll(/\bactorId\s*:\s*([^,}\n;)]+)/g)) {
    const actor = m[1].trim();
    if (HOLDER_ACTOR.test(actor)) out.push({ at: m.index!, actor });
  }
  return out;
}

/** The violations of both rules over a set of `{rel, code}` files: a holder actor outside the named debt, and any caller of a debt. */
export function holderActorViolations(files: Array<{ rel: string; code: string }>): { holder: string[]; callers: string[]; debtSeen: string[] } {
  const holder: string[] = [], callers: string[] = [], debtSeen: string[] = [];
  for (const { rel, code } of files) {
    if (writesHouseAudit(code)) {
      const debts = HOLDER_ACTOR_DEBT.map((name) => [name, bodyRange(code, `export function ${name}(`)] as const);
      for (const site of holderActorSites(code)) {
        const debt = debts.find(([, r]) => r && site.at >= r[0] && site.at < r[1]);
        if (debt) debtSeen.push(debt[0]); else holder.push(`${rel}: actor ${site.actor}`);
      }
    }
    for (const name of HOLDER_ACTOR_DEBT) {
      for (const m of code.matchAll(new RegExp(String.raw`\b${name}\s*\(`, "g"))) {
        const before = code.slice(Math.max(0, m.index! - 16), m.index!);
        if (/function\s+$/.test(before)) continue; // its own definition
        callers.push(`${rel}: calls ${name}`);
      }
    }
  }
  return { holder, callers, debtSeen: [...new Set(debtSeen)] };
}

if (STORE === "memory") {
  section("§0 · ruling 170 · no house audit names the holder as its actor (the Commit 7 debt listed by name)");
  await guard("0.170", () => {
    const files = srcFiles().map((rel) => ({ rel, code: decomment(read(rel)) }));
    const writers = files.filter((f) => writesHouseAudit(f.code));
    ok("0.170.0 · the population is real: every file that can write a house audit is read (designation, outcomes, press-audit among them)",
      files.length > 500 && ["designation.ts", "outcomes.ts", "press-audit.ts"].every((n) => writers.some((w) => w.rel.endsWith(`house-bot/${n}`))),
      `${files.length} src files · ${writers.length} writers`);
    const v = holderActorViolations(files);
    ok("0.170.1 · ⛔ D19c · no house audit write under src/ names the holder as its actor, outside the named Commit 7 debt", v.holder.length === 0, v.holder.join(" · "));
    ok("0.170.2 · ⛔ no file under src/ calls withdrawHouseConsent before Commit 7 reshapes it", v.callers.length === 0, v.callers.join(" · "));
    ok("0.170.3 · the debt is still real (it may only leave the list, and leaves it when Commit 7 fixes it)",
      j(v.debtSeen) === j([...HOLDER_ACTOR_DEBT]), j(v.debtSeen));

    const plantedHolder = holderActorViolations([{ rel: "src/planted.ts", code: `import { HOUSE_AUDIT } from "x";\nasync function f(bot) { await houseAudit("house_bot.paused", bot.userId, target, payload); }` }]);
    ok("0.170.c1 · CONTROL · a planted house audit with `bot.userId` as its actor is reported", plantedHolder.holder.length === 1, j(plantedHolder));
    const plantedVoid = holderActorViolations([{ rel: "src/planted.ts", code: `export function stop(holderUserId) { return voidHouseConsent({ userId: holderUserId, cause: "HOLDER_WITHDREW", actorId: holderUserId }); }` }]);
    ok("0.170.c2 · CONTROL · a planted consent void with the holder as actor, outside the debt, is reported", plantedVoid.holder.length === 1, j(plantedVoid));
    const plantedCaller = holderActorViolations([{ rel: "src/app/planted/actions.ts", code: `"use server";\nexport async function stopAction() { return withdrawHouseConsent(session.userId); }` }]);
    ok("0.170.c3 · CONTROL · a planted caller of withdrawHouseConsent is reported", plantedCaller.callers.length === 1, j(plantedCaller));
    const benign = holderActorViolations([{ rel: "src/benign.ts", code: `async function houseAudit(action: A, actorId: string | null, t: T, p: P) {}\nawait houseAudit("house_bot.started", officerId, target, { holderUserId: bot.userId });\nawait voidHouseConsent({ userId: bot.userId, cause: code, actorId: null });\nexport function withdrawHouseConsent(holderUserId: string) { return 1; }` }]);
    ok("0.170.c4 · CONTROL · an officer actor, a holder id in the PAYLOAD, a null actor, the signature and the debt's own definition are not reported",
      benign.holder.length === 0 && benign.callers.length === 0, j(benign));
  });
}

/* ═══ both stores · the store this child really runs on ══════════════════════════════════════════════ */
section("store · the child runs on the store it names");
await guard("store", async () => {
  const P: Any = await import("../../src/lib/server/prisma.ts");
  ok(`store.1 · the ${STORE} child ${STORE === "postgres" ? "has" : "has no"} database`, P.hasDatabase() === (STORE === "postgres"), `hasDatabase=${P.hasDatabase()}`);
});

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
