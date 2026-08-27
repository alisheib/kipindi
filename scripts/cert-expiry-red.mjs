/**
 * `npm run red:cert-expiry` — DOES `qa:cert-expiry` ACTUALLY CATCH ANYTHING?
 *
 *   node scripts/cert-expiry-red.mjs
 *
 * Three failure modes, driven one at a time, each required to make the watch exit NON-ZERO **and**
 * report the NAMED failure. Then a clean run must go green again.
 *
 * ── ⛔ WHY EACH OF THE THREE IS HERE ───────────────────────────────────────────────────────
 * 1. EXPIRY — `CERT_MIN_DAYS=60` against ~49 days of real runway. This is the assertion the
 *    whole file exists for, and it must fire for BOTH hosts, not one.
 * 2. THE POSITIVE CONTROL — `CERT_ORIGIN_HOST=www.50pick.tz` dials the PROXIED name, so
 *    Cloudflare answers instead of Railway. Without this control the watch could silently start
 *    reading a certificate that renews itself and stay green through the exact outage it exists
 *    to prevent. This is the method `docs/SESSION-PROMPT-INFRA-HARDENING.md:53-55` already
 *    records as having worked.
 * 3. THE POPULATION — one host removed from `ORIGIN_OF` by a real source mutation. Every
 *    remaining assertion still passes, which is precisely why an unasserted population is not
 *    coverage.
 *
 * ⭐ TWO OF THE THREE NEED NO SOURCE EDIT, AND THAT IS THE DESIGN. §[F] of
 * `pre-deploy-live-check.mjs` hard-coded its threshold, so its own prescribed RED proof meant
 * editing the file — and a proof that requires an edit is a proof nobody runs. That is a large
 * part of why §[F] was called a gate in four documents while having never executed.
 *
 * ⛔ WHAT COUNTS AS A CATCH: exit non-zero AND at least one reported failure AND the named one
 * among them. Exit code alone is what a previous harness in this repo settled for, and it printed
 * "✓ RED" for three mutations the guard silently passed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/cert-expiry.anchors.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const WATCH = "scripts/cert-expiry-watch.mjs";

function run(env = {}) {
  const r = spawnSync(process.execPath, [`${ROOT}/${WATCH}`], {
    cwd: ROOT, encoding: "utf8", timeout: 120_000,
    env: { ...process.env, CERT_MIN_DAYS: "", CERT_ORIGIN_HOST: "", ...env },
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  return { code: r.status, out, failures: [...out.matchAll(/^\s*FAIL (.+)$/gm)].map((m) => m[1]) };
}

let caught = 0;
const misses = [];
const cases = [];

console.log("\nred:cert-expiry — E-227, the origin-certificate watch.\n");

// ── The mirror, first half: green on an untouched tree, or nothing below means anything. ────
{
  const base = run();
  if (base.code !== 0) {
    console.error(`⛔ BASELINE IS NOT GREEN (exit ${base.code}). Refusing to proceed — a harness that`);
    console.error("   starts from a red tree cannot attribute anything it then observes.");
    console.error(base.failures.map((f) => `   - ${f}`).join("\n"));
    console.error("   ⚠️ If these are CONNECT failures, re-read the Railway targets from");
    console.error("      `railway domain status` before assuming a certificate problem.");
    process.exit(1);
  }
  const hosts = /both origin hosts were checked \((\d+) of (\d+)/.exec(base.out);
  console.log(`  baseline · the watch is GREEN on untouched source (${hosts ? `${hosts[1]} of ${hosts[2]} hosts` : "hosts unknown"})\n`);
}

// ── 1 + 2 · driven entirely from the environment ────────────────────────────────────────────
cases.push({
  name: "the-threshold-is-not-enforced",
  env: { CERT_MIN_DAYS: "60" },
  check: "days left",
  both: true,
  why: "the expiry assertion itself — 60 days demanded against ~49 of real runway, and it must "
     + "fire for BOTH hosts rather than one",
});
cases.push({
  name: "the-watch-reads-the-EDGE-certificate",
  env: { CERT_ORIGIN_HOST: "www.50pick.tz" },
  check: "[control]",
  why: "🔴 THE ONE THAT MATTERS MOST — dialling the PROXIED name gets Cloudflare's certificate, "
     + "which renews itself. Without the control the watch would stay green through the exact "
     + "outage it exists to prevent, because it would be watching the wrong certificate.",
});

for (const c of cases) {
  const r = run(c.env);
  const exited = r.code !== 0;
  const named = r.failures.filter((f) => f.includes(c.check));
  const enough = c.both ? named.length >= 2 : named.length >= 1;
  if (exited && r.failures.length > 0 && enough) {
    caught++;
    console.log(`  ✓ RED  ${c.name}   [${Object.entries(c.env).map(([k, v]) => `${k}=${v}`).join(" ")}]`);
    console.log(`         └ ${named.length} named failure(s), e.g. ${named[0].slice(0, 110)}`);
  } else {
    const why = !exited ? "the watch exited 0 — THE DEFECT SHIPPED UNSEEN"
              : r.failures.length === 0 ? `exited ${r.code} with no reported failure — a crash, not a catch`
              : c.both ? `only ${named.length} host(s) reported the named failure; both must`
              : `failed, but not on "${c.check}" — the guard is noisy, not aimed`;
    console.log(`  ✗ MISS ${c.name}`);
    console.log(`         └ ${why}`);
    misses.push(`${c.name} — ${why}`);
  }
}

// ── 3 · the population, which needs a real source mutation ──────────────────────────────────
{
  const path = `${ROOT}/${WATCH}`;
  const original = readFileSync(path, "utf8");
  try {
    for (const m of MUTATIONS) {
      let mutated;
      try {
        mutated = injectDefect(original, m.from, m.to);
      } catch (err) {
        console.log(`  ⛔ HARNESS ERROR  ${m.name} — ${err.message}`);
        misses.push(`${m.name} (anchor unresolvable: ${err.message})`);
        continue;
      }
      writeFileSync(path, mutated);
      const r = run();
      writeFileSync(path, original);

      const exited = r.code !== 0;
      const named = r.failures.some((f) => f.includes(m.check));
      if (exited && r.failures.length > 0 && named) {
        caught++;
        console.log(`  ✓ RED  ${m.name}`);
        console.log(`         └ caught by: ${r.failures.find((f) => f.includes(m.check)).slice(0, 110)}`);
      } else {
        const why = !exited ? "the watch exited 0 having checked HALF the surface it claims — THE DEFECT SHIPPED UNSEEN"
                  : r.failures.length === 0 ? `exited ${r.code} with no reported failure — a crash, not a catch`
                  : `failed, but not on "${m.check}" — the population assertion is not what caught it`;
        console.log(`  ✗ MISS ${m.name}`);
        console.log(`         └ ${why}`);
        misses.push(`${m.name} — ${why}`);
      }
    }
  } finally {
    // ⛔ ALWAYS. A mutation left on disk with `git diff` printing nothing is how a defect ships.
    if (readFileSync(path, "utf8") !== original) {
      writeFileSync(path, original);
      console.log(`  ⚠️ restored ${WATCH} from the finally block`);
    }
  }
}

// ── The mirror, second half. ────────────────────────────────────────────────────────────────
{
  const after = run();
  const green = after.code === 0;
  console.log(`\n  restore · the watch is ${green ? "GREEN" : "🔴 NOT GREEN"} again on the restored tree` +
              `${green ? "" : ` (exit ${after.code}) — ⛔ CHECK git diff BEFORE COMMITTING`}`);
  if (!green) misses.push("the tree was not restored cleanly");
}

const total = cases.length + MUTATIONS.length;
console.log(`\nred:cert-expiry: ${caught}/${total} failure modes caught`);
if (misses.length) {
  console.log("\n⛔ NOT CAUGHT:");
  for (const s of misses) console.log(`   · ${s}`);
  process.exit(1);
}
console.log("Every failure mode is caught by a named assertion, and the tree is clean.\n");
