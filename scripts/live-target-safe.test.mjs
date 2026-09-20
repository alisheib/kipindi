/**
 * NO TEST HARNESS MAY DEFAULT TO PRODUCTION.
 *
 *   npm run test:live-target-safe
 *
 * ⛔ WHAT THIS EXISTS TO STOP, measured on `main` 2026-09-19. `scripts/live/harness.mjs` exported
 * `BASE = process.env.LIVE_BASE ?? "https://50pick.tz"`. Fourteen scripts import it, including `qa:chaos` and
 * `qa:pending-bar` — and `plans/house-bots/C7-SPEC.md` §4 assigns BOTH to house-bot checkpoints whose own standing
 * rules read "never touch production, not even a read". Run with no environment set, which is how every npm script
 * invokes them, they drove a real browser against the live money platform signed in as the owner's ADMIN account.
 *
 * ⭐ THE DEFECT IS NOT THAT PRODUCTION IS REACHABLE — it must be, for the live QA campaign. It is that production was
 * the value you got by NOT choosing. A target that dangerous is chosen, never inherited.
 *
 * ⛔ AND THE CODEBASE WAS ALREADY SPLIT AGAINST ITSELF: five sibling drivers each declare their own
 * `?? "http://localhost:3001"`, shadowing the shared export precisely because loopback is the sane default.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let pass = 0;
const failures = [];
const ok = (l, c, x = "") => { c ? pass++ : failures.push((l + " " + x).trim()); console.log("  " + (c ? "✓" : "✗") + " " + l + (x ? " " + x : "")); };

/** A production origin: any http(s) URL whose host is not loopback. */
const isProdUrl = (quoted) => /^["'][a-z]+:\/\//i.test(quoted) && !/localhost|127\.0\.0\.1|\[::1\]/.test(quoted);
/** `BASE`-ish binding taking a quoted default via ?? or ||. */
const DEFAULT_TARGET = /\b(?:BASE|BASE_URL|TARGET|ORIGIN)\b[^\n]*?(?:\?\?|\|\|)\s*("[^"]*"|'[^']*')/g;

/**
 * ⛔ WHICH FILES MAY NAME PRODUCTION AS A DEFAULT, and why the line is drawn HERE.
 *
 * The first run of this guard reported eight more: `scripts/live/rules-pages-drive.mjs`,
 * `scripts/live-e2e.mjs`, `scripts/live-kyc-id-looked-at.mjs` and their siblings. Those are the LIVE QA CAMPAIGN's
 * own drivers, and targeting production is their entire purpose — their names say so before you open them. Changing
 * them would break the campaign to satisfy a rule aimed at something else.
 *
 * ⭐ THE ACTUAL DANGER IS A SHARED DEFAULT SILENTLY INHERITED. `harness.mjs` is imported by fourteen scripts that do
 * NOT announce a live target — `qa:chaos`, `qa:pending-bar`, the design-gate probes — and they picked up production
 * from it without ever naming it. An entry point called `live-e2e` that hits live is doing what it says. A probe
 * called `chaos-render` that hits live because a module three files away chose a default is not.
 *
 * So: an ENTRY POINT whose own name declares a live target may default to production. A SHARED MODULE may never,
 * and `scripts/live/harness.mjs` is explicitly held to the strict rule despite its directory, because it is the
 * shared module the whole defect ran through.
 */
const nameDeclaresLive = (rel) =>
  rel !== "scripts/live/harness.mjs" && (rel.startsWith("scripts/live/") || /(^|\/)live-[a-z0-9-]+\.(mjs|mts|js)$/.test(rel));

const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(mjs|mts|js)$/.test(n)) files.push(p);
  }
};
walk(join(ROOT, "scripts"));

console.log("\n[live-target-safe] §1 no script takes a production URL as its DEFAULT target");
{
  const offenders = [];
  let exempted = 0;
  for (const f of files) {
    const rel = f.replace(ROOT, "").split("\\").join("/").replace(/^\//, "");
    if (nameDeclaresLive(rel)) { exempted++; continue; }
    // ⛔ This file quotes the offending line verbatim in its own §3 control. A guard that scans itself reports its
    // own documentation as the defect — the same trap `report-formats` and `admin-section-gate` §0b each shipped
    // with today. Comments are stripped for the same reason.
    if (rel === "scripts/live-target-safe.test.mjs") { exempted++; continue; }
    const src = readFileSync(f, "utf8")
      .replace(/^[ \t]*\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of src.matchAll(DEFAULT_TARGET)) {
      if (isProdUrl(m[1])) offenders.push(rel + " -> " + m[1]);
    }
  }
  ok("§1 ratchet · " + files.length + " scripts scanned", files.length >= 100, String(files.length));
  ok("§1 CONTROL · the live-campaign entry points ARE exempted, and there are some", exempted >= 5, exempted + " files whose own name declares a live target");

  /**
   * ⛔ TWO RULES, BECAUSE THE TWO CASES ARE NOT THE SAME DEFECT.
   *
   * (a) A SHARED MODULE may never default to production — that is the measured incident: `harness.mjs` handed
   *     production to fourteen importers that never named it. STRICT, ceiling 0, no exemptions.
   *
   * (b) A STANDALONE ENTRY POINT that defaults to production without saying so in its name is the same SHAPE and a
   *     smaller risk: somebody types its name, so somebody chose it. Five exist today. They are NOT exempted and
   *     NOT silently fixed — changing five scripts' targets at once, without knowing which genuinely measure the
   *     live bundle (`bundle-css-probe`, `perf-smoke`) and which are local capture tools, would trade a known
   *     footgun for an unknown breakage. So they are PINNED: the count may only shrink, and every name is printed
   *     on every run so the list cannot rot quietly into scenery.
   */
  const SHARED = offenders.filter((o) => o.startsWith("scripts/live/harness") || o.includes("/lib/"));
  ok("§1a a SHARED module never defaults to a production origin", SHARED.length === 0, SHARED.join(" | "));
  const ENTRY_CEILING = 5;
  const entry = offenders.filter((o) => !SHARED.includes(o));
  ok("§1b RATCHET · standalone entry points defaulting to production may only SHRINK (ceiling " + ENTRY_CEILING + ")",
    entry.length <= ENTRY_CEILING, entry.length + ": " + entry.join(" | "));
}

console.log("\n[live-target-safe] §2 the shared harness names its target on every run");
{
  const h = readFileSync(join(ROOT, "scripts/live/harness.mjs"), "utf8");
  ok("§2 the harness defaults to loopback",
    /export const BASE = process\.env\.LIVE_BASE \?\? "http:\/\/(?:localhost|127\.0\.0\.1)/.test(h));
  ok("§2 and it PRINTS the resolved target, so a wrong one is visible immediately",
    /LIVE HARNESS TARGET/.test(h) && /console\.log\(/.test(h));
}

console.log("\n[live-target-safe] §3 CONTROL · the detector catches the shape that shipped, and only that shape");
{
  const shipped = 'export const BASE = process.env.LIVE_BASE ?? "https://50pick.tz";';
  const safe = 'export const BASE = process.env.LIVE_BASE ?? "http://localhost:3001";';
  const hits = (s) => [...s.matchAll(DEFAULT_TARGET)].some((m) => isProdUrl(m[1]));
  ok("§3 the exact line that shipped is caught", hits(shipped));
  ok("§3 CONTROL · the safe line is NOT caught, so §1 is not merely rejecting everything", !hits(safe));
}

console.log("\n" + (failures.length === 0 ? "ALL PASS" : "FAILURES") + " — live-target-safe: " + pass + " passed, " + failures.length + " failed");
if (failures.length) { for (const f of failures) console.log("  · " + f); process.exit(1); }
