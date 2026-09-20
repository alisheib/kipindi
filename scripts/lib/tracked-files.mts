/**
 * THE TRACKED-FILE POPULATIONS — `src/` and `scripts/` — read by every guard that makes a claim about
 * "every file in this repository".   `scripts/lib/tracked-files.mts`
 *
 * ⭐ WHY THIS FILE EXISTS, AND WHY IT IS NOT A NEW WALKER. Both functions below were WRITTEN in
 * `scripts/lib/house-bot-reports-cases.mts` (0.232.5 and 0.250.0 read them) and are LIFTED here
 * unchanged — the same extensions, the same `node_modules` skip, the same repo-relative forward-slash
 * spelling. They moved because that module cannot be imported: it is a case list that runs 4,000 lines
 * of assertions on import and ends in `process.exit`, so a second guard needing the same population had
 * exactly two choices — import a suite (impossible) or write a second walker.
 *
 * ⛔ A SECOND WALKER IS THE DEFECT, NOT THE WORKAROUND. `house-bot-reports-cases.mts` records the
 * incident in its own source: a control that built its own walker left `0.232.3` "passing forever over
 * an empty population WITH ITS CONTROL STILL GREEN". Two walkers drift — one learns that `.mjs` is a
 * file JavaScript can run, the other keeps matching `.tsx?` — and every claim made over the narrower one
 * is a claim about a population wearing the wider one's name. There is one walker per population, here.
 *
 * ⛔ EVERY CALLER MUST PRINT WHAT IT WALKED. A population is a measurement, and an empty one is the
 * silent verdict this programme has paid for twice: a checker over zero files reports zero offenders and
 * its control goes green with it. Assert a realism FLOOR on the count, print the count, and never quote
 * a count from a comment — re-derive it.
 */
import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** The repository root, resolved from this file rather than from `process.cwd()`. */
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Every file under `dir` with a walkable extension, repo-relative, forward slashes, `node_modules` skipped.
 *
 * ⭐ ONE EXTENSION SET FOR BOTH POPULATIONS, AND THE MERGE IS A NO-OP THAT CLOSES A HOLE. The two callers
 * arrived with different patterns — `src` matched `/\.(tsx?|[cm]?js)$/` (no `.mts`) and `scripts` matched
 * `/\.(m?ts|[cm]?js)$/` (no `.tsx`) — so a `.tsx` under `scripts/` and a `.mts` under `src/` were each
 * invisible to every claim made over the other's population. MEASURED at this commit before merging them:
 * `scripts/**` holds 0 `.tsx` files and `src/**` holds 0 `.mts` files, so both populations are byte-identical
 * to what they were, and the asymmetry that could have hidden a file tomorrow is gone. ⛔ The set may only
 * GROW: an extension removed here silently shrinks every population built on it.
 */
function walkTracked(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); }
      else if (/\.(tsx?|m?ts|[cm]?js)$/.test(e.name)) out.push(relative(REPO_ROOT, p).replace(/\\/g, "/"));
    }
  };
  walk(join(REPO_ROOT, dir));
  return out;
}

/**
 * Every source file under `src/`, as a path relative to the repo root (forward slashes).
 *
 * ⛔ `.js`/`.mjs`/`.cjs` ARE IN THE WALK (C5-7's review, low). It matched `/\.(tsx?)$/`, so
 * `src/lib/needle-haptics.js` and `src/lib/needle-physics.js` were outside EVERY pin that calls this — and the
 * population every one of them prints ("1,081 src files") was the `.ts`/`.tsx` population wearing the name of the
 * `src` population. A file that JavaScript can run is a file that can carry a house word or write a money row; the
 * extension is not a reason to stop looking.
 */
export function srcFiles(): string[] {
  return walkTracked("src");
}

/**
 * Every tracked `.mjs`/`.cjs`/`.mts`/`.js` script under `scripts/`, the whole tree, as repo-relative paths.
 *
 * ⛔ WHY THIS EXISTS (C5-7's review, medium). Ruling 232's population is `src/**`, and its own claim is that a money
 * writer "cannot escape by living somewhere else" — but the ONE writer in this repository that files a positioned
 * `Transaction` row around the DAL lives in `scripts/`, and the scope was stated honestly and then never measured.
 * `0.232.5` reads this population the same way `0.232.1` reads `src/`.
 */
export function scriptFiles(): string[] {
  return walkTracked("scripts");
}
