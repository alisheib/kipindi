/**
 * RED · `npm run red:header-fit` — can the reachability rule still FAIL?
 *
 *   BASE=http://localhost:3011 npm run red:header-fit
 *
 * ⛔ THIS IS THE PROOF FOR E-190, AND IT IS A BROWSER PROOF BECAUSE THE DEFECT IS GEOMETRY.
 * No node suite can see a control 30px past the right edge; only a laid-out page can. So this
 * harness rewrites the real component, waits for the SERVER to serve the rewritten page, and
 * asks `live/clip.mjs` — the same rule `qa:landmark-seal` runs — whether it now refuses.
 *
 * ── WHAT IT REQUIRES OF ITSELF, because a red harness can lie in three ways ───────────────
 *
 * 1 · ⛔ **A POSITIVE CONTROL IN THE SAME RUN.** Before and after the mutations, the clean tree
 *      must report ZERO clipped controls. A harness that only ever sees red cannot tell you
 *      whether it is measuring the mutation or measuring a broken server.
 *
 * 2 · ⛔ **MISSED AND BROKEN ARE DIFFERENT ANSWERS, AND IT REFUSES TO CONFLATE THEM.** Before
 *      running the check it waits on an INDEPENDENT WITNESS — the header bar's own
 *      `scrollWidth` at 1024 — and requires it to move. If the witness never moves, the server
 *      never served the mutation and the result is **BROKEN HARNESS**, not "the guard missed".
 *      Session 59 paid for this distinction twice: a mutant tree that could not resolve
 *      `node_modules` reported 23/23 as if the guard had been exercised.
 *
 * 3 · ⛔ **IT MUTATES IN BOTH LANGUAGES THAT MATTER.** `bar-gap-stops-yielding` is GREEN in
 *      English and RED in Swahili — 9px — so an English-only harness would report it MISSED and
 *      certify a repair that was short for the language most of this platform's players read.
 *
 * ⚠️ IT WRITES TO A TRACKED SOURCE FILE. The original bytes are held in memory, restored in a
 * `finally`, and the run ENDS by asserting the file is byte-identical to how it started. If
 * this process is killed mid-mutation, `git diff src/components/layout/top-app-bar.tsx` is the
 * one command that tells you, and `git checkout --` is the repair.
 *
 * ⚠️ PREMISE: a dev server on BASE serving THIS working tree. It refuses rather than guesses —
 * a "proof" run against a stale build proves nothing about the code you are holding.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { CLIP_PROBE, LG_XL_BAND } from "./live/clip.mjs";
import { MUTATIONS } from "./anchors/header-fit.anchors.mjs";

const BASE = process.env.BASE ?? "http://localhost:3011";
const PATH = process.env.RED_PATH ?? "/markets";
const LOCALES = ["en", "sw"];
const SETTLE_MS = Number(process.env.RED_SETTLE_MS ?? 180_000);

const die = (why) => { console.error(`\n🔴 PREMISE ABSENT — ${why}\n`); process.exit(2); };

/** Read the bar's own scrollWidth at the band — the witness, independent of the rule under test.
 *  ⛔ A FUNCTION, never a string. See `live/clip.mjs` for what a string costs (E-191). */
const WITNESS = () => {
  const bar = document.querySelector("header .mx-auto") || document.querySelector("header > *");
  return bar ? bar.scrollWidth : -1;
};

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

/** One measurement pass: witness + clipped controls, per locale, at the band. */
async function measure(session) {
  const out = {};
  for (const locale of LOCALES) {
    const ctx = await b.newContext({ viewport: { width: LG_XL_BAND, height: 800 }, deviceScaleFactor: 1, storageState: session });
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}${PATH}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
      await page.waitForTimeout(1500);
      const lang = (await page.getAttribute("html", "lang").catch(() => null)) ?? "";
      if (!lang.toLowerCase().startsWith(locale)) die(`${PATH} did not render in ${locale} (<html lang="${lang}">) — every reading below would be about English`);
      out[locale] = {
        witness: await page.evaluate(WITNESS, ""),
        clipped: await page.evaluate(CLIP_PROBE, "body"),
      };
    } finally { await ctx.close(); }
  }
  return out;
}

/** Sign in locally. The header renders the bell and the avatar ONLY when signed in — a guest
 *  run of this harness would mutate the bar and then measure a cluster missing the two controls
 *  the mutation severs, and report a clean pass. That is E-187, one layer down. */
const session = await (async () => {
  const c = await b.newContext();
  const r = await c.request.get(`${BASE}/auth/demo`).catch(() => null);
  if (!r) die(`no server at ${BASE} — start one: DATABASE_URL="" npx next dev -p 3011`);
  const s = await c.storageState();
  await c.close();
  if (!s.cookies.some((x) => x.name === "kp_session")) die(`/auth/demo did not return a session — this harness needs a DEV server (the route 404s in a production build)`);
  s.cookies = s.cookies.filter((x) => x.name !== "kp-locale");
  return s;
})();

const files = new Map();
for (const m of MUTATIONS) if (!files.has(m.file)) files.set(m.file, readFileSync(m.file, "utf8"));

let proven = 0, missed = 0, broken = 0;
const lines = [];

try {
  // ── POSITIVE CONTROL, before anything is touched ────────────────────────────
  const clean = await measure(session);
  for (const locale of LOCALES) {
    const c = clean[locale].clipped;
    if (c.length !== 0) die(`the CLEAN tree already reports ${c.length} clipped control(s) in ${locale} at ${LG_XL_BAND} — ${c.join(" | ")}. Nothing below would mean anything.`);
  }
  console.log(`\nRED · header-fit — ${BASE}${PATH} @ ${LG_XL_BAND}px, signed in, ${LOCALES.join("/")}`);
  console.log(`  control: clean tree, 0 clipped — witness ${LOCALES.map((l) => `${l}=${clean[l].witness}`).join(" ")}\n`);

  for (const m of MUTATIONS) {
    const original = files.get(m.file);
    const hits = original.split(m.from).length - 1;
    if (hits !== 1) { broken++; lines.push(`BROKEN  ${m.name} — anchor resolves ${hits}× in ${m.file}, needs exactly 1`); continue; }
    writeFileSync(m.file, original.replace(m.from, m.to));

    // Wait for the SERVER to serve it — on the witness, never on the rule under test.
    const t0 = Date.now();
    let got = null, moved = false;
    while (Date.now() - t0 < SETTLE_MS) {
      got = await measure(session);
      moved = LOCALES.some((l) => got[l].witness !== clean[l].witness);
      if (moved) break;
    }
    writeFileSync(m.file, original);

    if (!moved) {
      broken++;
      lines.push(`BROKEN  ${m.name} — the bar's scrollWidth never moved in ${Math.round((Date.now() - t0) / 1000)}s; the server never served the mutation, so the guard was never asked`);
      continue;
    }
    const caughtIn = LOCALES.filter((l) => got[l].clipped.length > 0);
    if (caughtIn.length === 0) {
      missed++;
      lines.push(`MISSED  ${m.name} — witness moved (${LOCALES.map((l) => `${l}:${clean[l].witness}→${got[l].witness}`).join(" ")}) but no control was reported unreachable`);
    } else {
      proven++;
      lines.push(`CAUGHT  ${m.name} — ${caughtIn.map((l) => `${l}: ${got[l].clipped.join(" | ")}`).join("  ·  ")}`);
    }
  }

  // ── POSITIVE CONTROL AGAIN, on the restored tree ────────────────────────────
  const after = await measure(session);
  for (const locale of LOCALES) {
    if (after[locale].clipped.length !== 0) {
      broken++;
      lines.push(`BROKEN  restore — ${locale} still reports ${after[locale].clipped.join(" | ")} after the tree was put back`);
    }
  }
} finally {
  for (const [file, original] of files) writeFileSync(file, original);
  await b.close();
}

// ⛔ The last word is about the TREE, not about the checks. A harness that leaves a mutation on
// disk has handed the next session a defect wearing a passing test's clothes.
let dirty = 0;
for (const [file, original] of files) if (readFileSync(file, "utf8") !== original) dirty++;

for (const l of lines) console.log("  " + l);
console.log(`\n  ${proven}/${MUTATIONS.length} proven · ${missed} missed · ${broken} broken · ${dirty} file(s) left modified\n`);
process.exit(missed || broken || dirty ? 1 : 0);
