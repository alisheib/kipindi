/**
 * RED · `npm run red:journey-header-fit -- --alone` — can the journey header's fit rules still FAIL? (the Vodacom plan
 * S6, `S6-PLAN.md` WP6b step 6 as amended by A5 and A6)
 *
 *   KP_BASE=http://localhost:3041 npm run red:journey-header-fit -- --alone      (both are required)
 *
 * Each mutation in `anchors/journey-header-fit.anchors.mjs` puts one S4 fit rule of the journey header's stylesheet back
 * to a value the S4 measurement refused. This harness writes it into `src/app/globals.css`, waits until the SERVER
 * serves it, and asks the RULE probe `qa:journey-header-fit` runs (`live/journey-header-fit.mjs`, one definition for
 * both) whether a cell of the matrix now breaks the rule the mutation names. That is CAUGHT; served and unbroken is
 * MISSED; never served is BROKEN.
 *
 * ── WHAT IT REQUIRES OF ITSELF ───────────────────────────────────────────────────────────────────────────────────
 * 1 · ⭐ THE RED CRITERION IS THE RULE PROBE, NOT CLIPPING (A5). A rule read as a computed value against a FIXED token
 *     breaks deterministically whatever slack the real balances leave; a clip-only proof would miss most of these.
 *     Whether the header FITS is `qa:journey-header-fit`'s question, asked of the clean tree.
 * 2 · ⭐ AN INDEPENDENT WITNESS. Every mutation's text also names itself in a custom property no rule reads (the anchors
 *     file's WITNESS_PROPERTY, the one place that name is spelled), and the harness measures only once the page's own
 *     stylesheets hold that name — so a server that never served the mutation reads BROKEN, never MISSED (the
 *     distinction `red:header-fit` paid for twice).
 * 3 · ⛔ A POSITIVE CONTROL BEFORE AND AFTER. The clean tree must break no rule in any cell, or nothing below means
 *     anything; and after the last restore, once the witness is gone from the served stylesheet, it must break none
 *     again.
 * 4 · ⛔ NEVER UNBIDDEN — AN OPT-IN, NOT A RULE IN PROSE (A6). It refuses unless `--alone` is on its own command line,
 *     which its package script never passes, so `red:all` (which runs the script as written) cannot supply it; and it
 *     refuses inside a `red:all` run, which marks every harness it starts with KP_RED_ALL. Both refusals exit 2,
 *     premise absent, before anything is written, and `test:journey-shell` §10 holds both in predeploy. Run it alone,
 *     detached, under the heavy-node lock, then `git diff --exit-code`.
 * 5 · ⛔ IT WRITES TO A TRACKED FILE. Every way out a process can see restores it — the end of the run, a thrown error,
 *     Ctrl+C, Ctrl+Break, a closing console, and SIGTERM where the OS delivers one — each write retried before it gives
 *     up loudly, and the run ENDS by checking every file is byte-identical. It limits its own runtime (RED_BUDGET_S,
 *     default 1800): every wait races the budget, and a run out of time prints INCONCLUSIVE rather than be killed.
 *     ⚠️ A HARD KILL IS NOT A WAY OUT IT CAN SEE. On Windows a forced kill (`taskkill /F`, a stopped task), a crash or a
 *     bluescreen ends the process with nothing run, and the mutation stays in `globals.css`, witness and all. What
 *     catches it then: this harness refuses to start while the stylesheet holds a witness; `test:journey-shell` §10
 *     fails on one in predeploy, by name, and its §7 rule checks fail on every one of these mutations; and `git diff
 *     --exit-code`. Restore with `git checkout -- src/app/globals.css`.
 *
 * ⚠️ PREMISE: an IN-MEMORY dev server on this working tree (no DATABASE_URL), started after `rm -rf .next`, with
 * DISABLE_ADMIN_TOTP=true. It seeds a SUPPORT officer, mints a preview pass and moves the demo player's wallet. KP_ROUTE
 * (default /) must draw what every mutation's rule reads: it refuses a page that hides the deposit pill.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS, WITNESS_PROPERTY } from "./anchors/journey-header-fit.anchors.mjs";
import { premise, mintStaffPass } from "./live/journey-pass.mjs";
import { STATES, JHF_LOCALES, RULES, applies, cookiesFor, measureState, WITNESS_PROBE } from "./live/journey-header-fit.mjs";

const NL = String.fromCharCode(10);
/** A mutation's file on disk, resolved from the repository root — never from wherever the harness was started. */
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const onDisk = (rel) => join(ROOT, rel);
const BASE = process.env.KP_BASE;
const ROUTE = process.env.KP_ROUTE ?? "/";
const SETTLE_MS = Number(process.env.RED_SETTLE_MS ?? 180_000);
const BUDGET_MS = Number(process.env.RED_BUDGET_S ?? 1800) * 1000;
const T0 = Date.now();
const timeLeft = () => BUDGET_MS - (Date.now() - T0);

const die = (why) => {
  console.error(`${NL}🔴 PREMISE ABSENT — ${why}${NL}`);
  process.exit(2);
};

/* ── NEVER UNBIDDEN (A6): every refusal comes before the first write ─────────────────────────────────────────── */
if (process.env.KP_RED_ALL) die("red:all started this harness, and it never runs from there: it rewrites globals.css for minutes, and red:all's timeout kills npm but, on Windows, not this process. Run it alone: KP_BASE=http://localhost:3041 npm run red:journey-header-fit -- --alone");
if (!process.argv.includes("--alone")) die("it runs only when asked for by name: KP_BASE=http://localhost:3041 npm run red:journey-header-fit -- --alone — detached, under the heavy-node lock, then git diff --exit-code");
if (!BASE) die("KP_BASE is not set: start an in-memory dev server on this tree and pass its address, e.g. KP_BASE=http://localhost:3041");
const planted = [...new Set(MUTATIONS.map((m) => m.file))].filter((rel) => readFileSync(onDisk(rel), "utf8").includes(`${WITNESS_PROPERTY}:`));
if (planted.length) die(`${planted.join(", ")} already holds a ${WITNESS_PROPERTY} — a mutation an earlier run left behind (a hard kill). Restore it first: git checkout -- ${planted.join(" ")}`);
const unasked = MUTATIONS.filter((m) => !STATES.some((s) => RULES.some((r) => r.id === m.expect && applies(r, s, ROUTE)))).map((m) => m.name);
if (unasked.length) die(`no cell on ${ROUTE} draws what ${unasked.join(", ")} must break — leave KP_ROUTE unset, or name a page that shows the deposit pill`);
const { refuse } = await premise(BASE);
if (refuse) die(refuse);

/* ── EVERY WAY OUT A PROCESS CAN SEE RESTORES THE TREE (A6) ──────────────────────────────────────────────────── */
/** Repo path → the text it held before this run touched it. Filled before the first write to that file. */
const ORIGINALS = new Map();
/** A synchronous pause: the exit handler cannot await, and a busy file needs a beat. */
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
/** Writes `text` to `rel` and reads it back, retrying a busy or locked file (an editor, an indexer, the dev server). */
function writeBack(rel, text) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      writeFileSync(onDisk(rel), text);
      if (readFileSync(onDisk(rel), "utf8") === text) return true;
    } catch {
      // EBUSY or EPERM for a moment: the next attempt, a beat later.
    }
    pause(200);
  }
  return false;
}
/** Puts every touched file back; one it cannot put back is named, loudly, with the command that restores it. */
function restoreAll() {
  for (const [rel, original] of ORIGINALS) {
    let now = null;
    try {
      now = readFileSync(onDisk(rel), "utf8");
    } catch {
      now = null;
    }
    if (now === original) continue;
    if (!writeBack(rel, original)) console.error(`${NL}⛔⛔ FILE LEFT MUTATED — ${rel} could not be restored. Restore it now: git checkout -- ${rel}${NL}`);
  }
}
process.on("exit", restoreAll);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(signal, () => {
    restoreAll();
    console.error(`${NL}⛔ ${signal} — every mutated file restored before exiting`);
    process.exit(130);
  });
}
process.on("uncaughtException", (e) => {
  restoreAll();
  console.error(e);
  process.exit(1);
});
process.on("unhandledRejection", (e) => {
  restoreAll();
  console.error(e);
  process.exit(1);
});

class OutOfTime extends Error {}
/** `work`, or OutOfTime the moment the budget is spent: no wait in this harness outlives RED_BUDGET_S. */
async function inBudget(work, what) {
  let timer = null;
  const spent = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new OutOfTime(`the ${Math.round(BUDGET_MS / 1000)} s budget ran out ${what}`)), Math.max(0, timeLeft()));
  });
  try {
    return await Promise.race([work, spent]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The matrix through the RULE probe: every violation, or — given `expect` — only until a violation of that rule turns
 * up. The demo account is one, so each state is set up again as the scan reaches it.
 */
async function scan(browser, pass, expect = null) {
  const found = [];
  for (const state of STATES) {
    const cookies = await inBudget(cookiesFor(browser, BASE, state, pass), `setting up ${state.id}`);
    for (const locale of JHF_LOCALES) {
      const cells = await inBudget(measureState(browser, BASE, state, locale, cookies, { route: ROUTE, fit: false }), `during ${state.id} · ${locale}`);
      for (const c of cells) for (const v of c.violations) found.push({ rule: v.rule, text: `${c.locale} ${c.width} ${c.state} — ${v.text}` });
      if (expect && found.some((v) => v.rule === expect)) return found;
    }
  }
  return found;
}

/** Polls a fresh page until the served stylesheet holds the witness `name` — or, given null, holds none at all. */
async function waitForWitness(browser, pass, name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  try {
    await ctx.addCookies([pass]);
    const page = await ctx.newPage();
    const until = Date.now() + Math.max(0, Math.min(SETTLE_MS, timeLeft()));
    while (Date.now() < until) {
      await page.goto(`${BASE}${ROUTE}`, { waitUntil: "load", timeout: 240_000 }).catch(() => {});
      const held = await page.evaluate(WITNESS_PROBE, WITNESS_PROPERTY).catch(() => null);
      if (held && (name === null ? held.length === 0 : held.includes(name))) return true;
      await page.waitForTimeout(1500);
    }
    return false;
  } finally {
    await ctx.close().catch(() => {});
  }
}

const lines = [];
let proven = 0;
let missed = 0;
let broken = 0;
let inconclusive = "";
const browser = await chromium.launch({ headless: true });
/** A premise that fails once the browser is up: close it, then refuse. Nothing has been written yet. */
const quit = async (why) => {
  await browser.close().catch(() => {});
  die(why);
};
try {
  const pass = await inBudget(mintStaffPass(browser, BASE), "while minting the preview pass")
    .catch((e) => (e instanceof OutOfTime ? Promise.reject(e) : quit(`no preview pass: ${e?.message ?? e}`)));

  // ── POSITIVE CONTROL, before anything is touched ──────────────────────────────────────────────────────────
  const clean = await scan(browser, pass);
  if (clean.length > 0) await quit(`the CLEAN tree already breaks ${clean.length} rule reading(s), e.g. ${clean.slice(0, 3).map((v) => v.text).join(" | ")}. Nothing below would mean anything.`);
  console.log(`${NL}RED · journey-header-fit — ${BASE}${ROUTE}, ${STATES.length} states × ${JHF_LOCALES.join("/")}`);
  console.log(`  control: the clean tree breaks no rule in any cell${NL}`);

  for (const m of MUTATIONS) {
    if (timeLeft() < 120_000) {
      inconclusive = `the ${Math.round(BUDGET_MS / 1000)} s budget ran out before ${m.name}`;
      break;
    }
    if (!ORIGINALS.has(m.file)) ORIGINALS.set(m.file, readFileSync(onDisk(m.file), "utf8"));
    const original = ORIGINALS.get(m.file);
    let mutated;
    try {
      mutated = injectDefect(original, m.from, m.to);
    } catch (e) {
      broken++;
      lines.push(`BROKEN  ${m.name} — ${e.message}`);
      continue;
    }
    try {
      if (!writeBack(m.file, mutated)) {
        broken++;
        lines.push(`BROKEN  ${m.name} — ${m.file} could not be written`);
        continue;
      }
      const served = await inBudget(waitForWitness(browser, pass, m.name), `while waiting for the server to serve ${m.name}`);
      if (!served) {
        broken++;
        lines.push(`BROKEN  ${m.name} — the served stylesheet never named it within ${Math.round(SETTLE_MS / 1000)} s; the server never served the mutation, so the rule was never asked`);
        continue;
      }
      const found = await scan(browser, pass, m.expect);
      const hit = found.find((v) => v.rule === m.expect);
      if (hit) {
        proven++;
        lines.push(`CAUGHT  ${m.name} — ${hit.text}`);
      } else {
        missed++;
        lines.push(`MISSED  ${m.name} — served, and no cell broke "${m.expect}"${found.length ? ` (it broke ${[...new Set(found.map((v) => v.rule))].join(", ")} instead: fix the declaration)` : ""}`);
      }
    } finally {
      restoreAll();
    }
  }

  // ── POSITIVE CONTROL AGAIN, once the restore is what the server serves ────────────────────────────────────
  if (!inconclusive) {
    if (!(await inBudget(waitForWitness(browser, pass, null), "while waiting for the restored stylesheet"))) {
      broken++;
      lines.push("BROKEN  restore — the served stylesheet still names a mutation after every file was put back");
    } else {
      const after = await scan(browser, pass);
      if (after.length > 0) {
        broken++;
        lines.push(`BROKEN  restore — the restored tree breaks ${after.length} rule reading(s), e.g. ${after[0].text}`);
      }
    }
  }
} catch (e) {
  if (e instanceof OutOfTime) inconclusive = e.message;
  else throw e;
} finally {
  restoreAll();
  await browser.close().catch(() => {});
}

// ⛔ The last word is about the TREE, not about the checks: a mutation left on disk is a defect wearing a passing test.
let dirty = 0;
for (const [rel, original] of ORIGINALS) if (readFileSync(onDisk(rel), "utf8") !== original) dirty++;

for (const l of lines) console.log(`  ${l}`);
if (inconclusive) console.log(`${NL}  INCONCLUSIVE — ${inconclusive}. Raise RED_BUDGET_S, or run it on a quieter machine; the tree was restored.`);
console.log(`${NL}RED · journey-header-fit — ${proven}/${MUTATIONS.length} caught · ${missed} missed · ${broken} broken · ${dirty} file(s) left modified${inconclusive ? " · INCONCLUSIVE" : ""}${NL}`);
process.exit(missed || broken || dirty || inconclusive || proven !== MUTATIONS.length ? 1 : 0);
