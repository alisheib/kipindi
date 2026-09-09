/**
 * test:config-hydration-gate — A HYDRATION GATE MAY ONLY CLOSE ON A READ THAT ANSWERED.
 *
 * 🔴 THE DEFECT THIS GATE EXISTS FOR (LEAD-B.2a, CONFIRMED 3/3). `loadConfig` collapses THREE
 * states into one `null` — "no database", "no row yet", and "the query FAILED" — because its
 * catch logs and returns null. Every hydration was written `const stored = await loadConfig(…);
 * if (stored) …; FLAG = true;`, so a transient DB error at first read raised the gate on a read
 * that never landed and pinned that container on CODE DEFAULTS for its entire life, with no
 * retry.
 *
 * ⛔ AND TWO DOCBLOCKS SAID THE OPPOSITE, WHICH IS WHY IT SURVIVED A FIX. `market-config.ts`
 * and `payment-ops.ts` both state "a failure leaves the flag DOWN so the next read retries",
 * and `MONEY-GATE-REMEDIATION.md` §1.2 declared the blocker closed on the strength of them.
 * The 2026-09-08 fix moved the flag after the `await` — which genuinely fixed the CONCURRENT
 * caller — and left the FAILED read raising it exactly as before.
 *
 * What it costs, per module:
 *   · `payment-ops`      — `kstore` stays empty, so `isPaymentPaused()` answers FALSE for every
 *                          rail and both flows. The emergency stop evaporates.
 *   · `market-config`    — a market created in that window freezes DEFAULT_GLOBAL_CONFIG into
 *                          its immutable feeSnapshot (RULES §2.1), and the next unrelated admin
 *                          save calls `persist()`, writing `perMarket: []` and destroying every
 *                          per-market override. That half needs no rate to diverge at all.
 *   · `updown-config`    — every round opened in that window freezes the defaults.
 *   · `payment-control`  — the officer's chosen provider is discarded for the process's life.
 *
 * ⛔ AND THE OBVIOUS FIX IS WRONG. Moving the flag inside `if (stored)` never hydrates on a
 * fresh install, where an absent row is legitimate, and every caller waits for ever. The gate
 * needs a distinction `loadConfig` cannot express: **did the store answer?** — not **was there
 * anything in it?** That is `loadConfigResult`.
 *
 *   npx tsx scripts/config-hydration-gate.test.mts
 *   CHG_ROOT=<tree> npx tsx scripts/config-hydration-gate.test.mts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.CHG_ROOT || join(here, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").split("\r\n").join("\n");

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` · ${detail}` : ""}`); }
}

const store = read("src/lib/server/config-store.ts");

/** Every module that latches a global "hydrated" flag from SystemConfig. */
const GATES = [
  { file: "src/lib/server/payment-ops.ts", flag: "__50PICK_KILLSWITCH_HYDRATED", what: "the emergency kill-switch map" },
  { file: "src/lib/server/market-config.ts", flag: "__50PICK_MARKET_CONFIG_HYDRATED", what: "the fee rates and stake bounds" },
  { file: "src/lib/server/updown-config.ts", flag: "__50PICK_UPDOWN_CONFIG_HYDRATED", what: "the Up & Down defaults" },
  { file: "src/lib/server/payment-control.ts", flag: "__50PICK_PAY_CONTROL_HYDRATED", what: "the chosen money rail" },
];

// ── §1 · The store can say whether it answered ───────────────────────────────
console.log("\n§1 · config-store distinguishes 'nothing stored' from 'could not ask'");
{
  ok("1.1  loadConfigResult exists and is exported", /export async function loadConfigResult</.test(store));
  ok("1.2  a successful read reports ok:true, even when the row is absent",
    /return \{ ok: true, value: row \? \(row\.value as T\) : null \};/.test(store));
  ok("1.3  a FAILED read reports ok:false — never a null that looks like 'nothing stored'",
    /return \{ ok: false, error \};/.test(store));
  ok("1.4  no-database still reports ok:true (a fresh/dev install must not hang)",
    /if \(!hasDatabase\(\)\) return \{ ok: true, value: null \};/.test(store));
  ok("1.5  loadConfig still exists for value-only callers, built ON the result form",
    /export async function loadConfig<T>/.test(store) && /return r\.ok \? r\.value : null;/.test(store));
}

// ── §2 · Every gate uses it, and refuses to latch on a failed read ───────────
console.log("\n§2 · every hydration gate latches only on a read that answered");
for (const g of GATES) {
  const src = read(g.file);
  const name = g.file.split("/").pop();
  ok(`2.${name} · uses loadConfigResult`, /loadConfigResult</.test(src),
    `${g.what} still hydrates through loadConfig, which cannot tell a failed read from an empty one`);
  ok(`2.${name} · returns without latching when the read failed`, /if \(!res\.ok\) return;/.test(src),
    "a failed read still raises the gate — the container is pinned on code defaults for life");
  ok(`2.${name} · still latches the flag when the read DID answer`,
    new RegExp(`globalThis\\.${g.flag} = true;`).test(src),
    "the gate never closes — every caller would wait for ever on a fresh install");
  // ⛔ The bare `loadConfig<` form must be gone from these four files entirely, or a second
  // hydration path could be added later using the shape this gate exists to forbid.
  ok(`2.${name} · no bare loadConfig< remains in this module`, !/\bloadConfig</.test(src),
    "a value-only read here is one refactor away from becoming a gate again");
}

// ── §3 · POSITIVE CONTROL — the scanner can still say NO ─────────────────────
//
// ⛔ WITHOUT THIS, §2 COULD PASS BY MATCHING NOTHING. The pre-fix shape must be REJECTED by
// each of the three patterns, and the fixed shape ACCEPTED by all of them.
console.log("\n§3 · POSITIVE CONTROL · pre-fix REJECTED, post-fix ACCEPTED");
{
  const preFix = `const stored = await loadConfig<KillMap>(KILL_KEY);
      if (stored) Object.assign(kstore, stored);
      globalThis.__50PICK_KILLSWITCH_HYDRATED = true;`;
  ok("3.1  pre-fix: loadConfigResult is absent", !/loadConfigResult</.test(preFix));
  ok("3.2  pre-fix: the failed-read return is absent", !/if \(!res\.ok\) return;/.test(preFix));
  ok("3.3  pre-fix: it DOES still latch (so 2.x's third check alone cannot catch it)",
    /globalThis\.__50PICK_KILLSWITCH_HYDRATED = true;/.test(preFix));
  ok("3.4  pre-fix: the bare loadConfig< is present and caught", /\bloadConfig</.test(preFix));

  const fixed = `const res = await loadConfigResult<KillMap>(KILL_KEY);
      if (!res.ok) return;
      if (res.value) Object.assign(kstore, res.value);
      globalThis.__50PICK_KILLSWITCH_HYDRATED = true;`;
  ok("3.5  post-fix: accepted by all four patterns",
    /loadConfigResult</.test(fixed) && /if \(!res\.ok\) return;/.test(fixed)
    && /globalThis\.__50PICK_KILLSWITCH_HYDRATED = true;/.test(fixed) && !/\bloadConfig</.test(fixed));
}

// ── §4 · OVER-CORRECTION — a fresh install must still hydrate ────────────────
//
// ⛔ The tempting fix — latch inside `if (stored)` — spins for ever where no row exists yet,
// which is every new deployment and every developer machine. §1.2/§1.4 are what forbid it:
// "the store answered and holds nothing" is a FINAL answer and must close the gate.
console.log("\n§4 · OVER-CORRECTION guard · absence is an answer, not a failure");
{
  ok("4.1  ok:true is returned for an absent row, not ok:false",
    /return \{ ok: true, value: row \? \(row\.value as T\) : null \};/.test(store));
  ok("4.2  the gates key their refusal on !res.ok, never on a missing value",
    GATES.every((g) => {
      const src = read(g.file);
      return /if \(!res\.ok\) return;/.test(src) && !/if \(!res\.value\) return;/.test(src);
    }),
    "a gate keyed on the VALUE would never hydrate a fresh install");
}

console.log(`\n${fail === 0 ? "PASS" : "FAILED"} · ${pass} ok, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
