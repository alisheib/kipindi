#!/usr/bin/env node
/**
 * RED PROOF for `npm run qa:bar-geometry`.
 *
 * 🔴 WHY IT EXISTS, AND IT IS A DEBT BEING PAID RATHER THAN A NEW IDEA. `qa:bar-geometry` was
 * counted toward Stage 6 of the player-query campaign WITHOUT a red control, and that board
 * recorded the debt against itself: *"The three geometry defects it found were fixed on the
 * strength of an unreproducible hand mutation. Build its control before crediting it."* Stage 6's
 * own exit condition is that each new guard's RED control has been SEEN TO FAIL.
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the driver EXIT NON-ZERO *and*
 * report a failure naming the right thing — `expect` is matched against the driver's output, so a
 * mutation that goes red for an unrelated reason is reported as WRONG REASON, not as caught. A
 * harness that cannot be wrong about WHY is worth more than one more case.
 *
 * ⚠️ IT MUTATES A RUNNING PRODUCT. `qa:bar-geometry` measures a real browser, so the dev server
 * must recompile between the mutation and the measurement; every case waits for the route to
 * serve again before measuring, and `--only` scopes each case to the route its mutation is
 * sharpest on, so a four-case proof is four short drives rather than four full sweeps.
 *
 * 🔴 AND THE WORKING TREE IS THE THING AT RISK. A previous red harness on this platform left a
 * live payout gate DISABLED in the working tree when two runs overlapped, and its own "0 files
 * left dirty" check reported clean. So the baseline is captured BEFORE anything is touched, the
 * restore is verified by COMPARISON rather than assumed, and the driver is re-run at the end.
 *
 * ⚠️ EVERY MUTATION IN THIS PROOF TOUCHES ONE FILE — `components/ui/query-bar.tsx` — and that is
 * the point rather than a convenience. Since the `QUERY_GROUP_CLASS` rollout, the bar's geometry
 * lives in shared constants, so one mutation breaks every bar on the platform at once. A driver
 * that only caught it on the route it was pointed at would be measuring one page's markup; this
 * one is measuring the CONTRACT.
 *
 * ⛔ Needs the dev server up — the same precondition as the driver.
 *   `rm -rf .next/dev && npx next dev -p 3031`   (⛔ never `next start`: the store refuses the
 *   in-memory fallback in production, so local visual work runs on `next dev`.)
 *
 * Run: npm run red:bar-geometry
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/bar-geometry.anchors.mjs";

const BASE = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3031";
const DRIVER = "scripts/live/bar-geometry-drive.mjs";

/**
 * ⚠️ ONE WIDTH AND ONE LOCALE PER CASE, CHOSEN — not defaulted. Swahili at 360 is where the
 * overlap and the tap floor bite (it runs 35–40% longer than English); Swahili at 1280 is where
 * the desktop group clips, and it CANNOT be seen at 360 because the group is `hidden` below `lg`.
 * ⛔ A proof that ran every case at one width would report the clip as NOT CAUGHT and the harness
 * would look like the defect.
 */
const SHAPE = {
  "sort-summary-unbound": { widths: "360", locales: "sw" },
  "desktop-group-does-not-wrap": { widths: "1280", locales: "sw" },
  "bar-is-not-sticky": { widths: "1280", locales: "sw" },
  "control-below-the-tap-floor": { widths: "1280", locales: "sw" },
  // ⚠️ 1280 IS NOT A PREFERENCE HERE, IT IS THE ONLY WIDTH THAT CAN PROVE IT. Assertion 4 runs
  // only at `width >= 1280`, because below `lg` the app shell's own bars legitimately share the
  // band — a run at 360 would report NOT CAUGHT and the harness would look like the defect.
  "search-band-shares-the-bar-offset": { widths: "1280", locales: "sw" },
};

const runDriver = (only, shape) => {
  const args = [DRIVER, BASE];
  if (only) args.push(`--only=${only}`);
  if (shape?.widths) args.push(`--widths=${shape.widths}`);
  if (shape?.locales) args.push(`--locales=${shape.locales}`);
  try {
    return { code: 0, out: execFileSync("node", args, { encoding: "utf8", stdio: "pipe" }) };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

/** Give the dev server time to recompile the mutated route, then confirm it is serving. */
const settle = async (route) => {
  await new Promise((r) => setTimeout(r, 1500));
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
      if (res.status < 500) return true;
    } catch { /* server mid-restart */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

/**
 * ⛔ THE PRECONDITION IS PER-ROUTE, NOT PLATFORM-WIDE, and that is a correction rather than a
 * convenience. A sweep over every surface is red whenever ANY fixture is thin — a persona with no
 * Up & Down positions makes `/updown/history` and `/positions/performance` withhold their rails,
 * correctly — and a proof that refused to start on an unrelated route's missing data would be
 * unrunnable on any realistic fixture.
 *
 * ⭐ WHAT MATTERS IS THAT THE ROUTE UNDER MUTATION IS GREEN BEFORE IT IS MUTATED. That is the
 * claim "this mutation caused this failure" rests on, and it is now checked for each case
 * individually, at the width and locale that case is proved at.
 */
const routesUnderProof = [...new Set(MUTATIONS.map((c) => c.route))];
for (const route of routesUnderProof) {
  const shape = SHAPE[MUTATIONS.find((c) => c.route === route).name] ?? {};
  const b = runDriver(route, shape);
  if (b.code !== 0) {
    console.error(`REFUSING: qa:bar-geometry is already RED on ${route} (untouched tree) — fix that first, or a mutation there cannot be shown to cause anything.`);
    console.error(b.out.split("\n").filter((l) => l.includes("✗")).slice(0, 6).join("\n"));
    process.exit(1);
  }
}
console.log(`precondition: the driver is GREEN on every route under proof (${routesUnderProof.join(", ")})\n`);

const originals = new Map();
for (const f of new Set(MUTATIONS.map((c) => c.file))) originals.set(f, readFileSync(f, "utf8"));

let caught = 0;
const problems = [];
for (const [i, c] of MUTATIONS.entries()) {
  const original = originals.get(c.file);
  const shape = SHAPE[c.name] ?? {};
  let mutated;
  try { mutated = injectDefect(original, c.from, c.to); }
  catch (e) {
    // ⛔ A STALE ANCHOR IS AN ABSENT TEST THAT FAILS IN THE DIRECTION OF LOOKING FINE. Never skip.
    problems.push(`case ${i + 1} (${c.name}): ANCHOR — ${e.message}`);
    console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`);
    continue;
  }

  writeFileSync(c.file, mutated, "utf8");
  const served = await settle(c.route);
  const r = served ? runDriver(c.route, shape) : { code: -1, out: "" };
  writeFileSync(c.file, original, "utf8");
  await settle(c.route);

  if (!served) {
    problems.push(`case ${i + 1} (${c.name}): the route never came back after the mutation — PROVED NOTHING`);
    console.log(`  ${i + 1}. NO SERVER    ${c.name}`);
  } else if (r.code === 0) {
    problems.push(`case ${i + 1} (${c.name}): stayed GREEN at ${shape.widths ?? "default"}/${shape.locales ?? "default"}`);
    console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`);
  } else if (!r.out.includes(c.expect)) {
    const lines = r.out.split("\n").filter((l) => l.includes("✗")).slice(0, 3).map((l) => l.trim());
    problems.push(`case ${i + 1} (${c.name}): red, but no failure mentioned "${c.expect}" — got ${lines.join(" | ") || "(no ✗ line)"}`);
    console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
  } else {
    caught++;
    console.log(`  ${i + 1}. caught       ${c.name}  →  ${c.expect}`);
  }
}

// ⚠️ RESTORATION IS MEASURED, NOT INFERRED. "No problems, therefore the tree is clean" is the
//    reasoning that left a payout gate disabled; the question gets its own answer.
const unrestored = [...originals].filter(([f, original]) => readFileSync(f, "utf8") !== original).map(([f]) => f);
for (const f of unrestored) problems.push(`${f} NOT RESTORED — the working tree is dirty`);
// ⚠️ The after-check is per-route too, for the same reason the precondition is.
for (const route of routesUnderProof) {
  const shape = SHAPE[MUTATIONS.find((c) => c.route === route).name] ?? {};
  if (runDriver(route, shape).code !== 0) problems.push(`the driver is RED on ${route} after restore`);
}
const after = { code: problems.some((p) => p.includes("after restore")) ? 1 : 0 };

console.log(`\n${caught}/${MUTATIONS.length} cases caught · files restored: ${unrestored.length === 0 ? "all" : unrestored.join(", ")} · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
if (caught === 0) { console.error("\n✗ ZERO cases exercised — this run proves nothing about the gate."); process.exit(1); }
console.log("RED PROOF COMPLETE — qa:bar-geometry refuses every defect it names.");
