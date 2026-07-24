/**
 * Content-integrity check. Binds doc/copy claims to the code so superseded or
 * removed patterns can't silently return (the CI checks the audit asked for in
 * C1/C8/C9/C10/C11 and M11).
 *
 * Run: npm run test:integrity  (also runs inside test:all and CI).
 * Fails (exit 1) if a checked pattern reappears in a current-truth surface
 * (README, CLAUDE.md, product source + meta). It does NOT scan the audit spec,
 * the remediation tracker, the skill, NEXT-SESSION, or the fee-decision doc —
 * those describe the old state as history, which is fine.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const fails: string[] = [];
const fail = (rule: string, detail: string) => fails.push(`[${rule}] ${detail}`);
const read = (p: string): string => { try { return readFileSync(join(ROOT, p), "utf8"); } catch { return ""; } };

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const rel = join(dir, name);
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) out.push(...walk(rel, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(rel.replace(/\\/g, "/"));
  }
  return out;
}
const srcFiles = walk("src", [".ts", ".tsx"]);

// ── C1 · the 15% withholding tax stays deleted ──────────────────────────────
// Ignore comment lines — payments.ts documents the deletion (quotes the old call).
for (const f of ["src/lib/server/payments.ts", "src/lib/server/wallet-service.ts"]) {
  for (const line of read(f).split("\n")) {
    const s = line.trim();
    const isComment = s.startsWith("//") || s.startsWith("*") || s.startsWith("/*");
    if (!isComment && /\bcomputeWithdrawalTax\b/.test(line)) fail("C1", `${f}: LIVE reference to computeWithdrawalTax (the 15% withholding tax must stay deleted)`);
  }
}

// ── C9 · no doc mandates the superseded teal kit ────────────────────────────
for (const f of ["README.md", "CLAUDE.md"]) {
  for (const line of read(f).split("\n")) {
    if (/(read|build|trust)[^.\n]{0,50}(design_handoff_prediction_market_kit|\bthe (teal )?kit\b)/i.test(line) &&
        !/superseded|do not|don.t|historical|not the name|removed|no longer/i.test(line)) {
      fail("C9", `${f}: "${line.trim().slice(0, 90)}" — reads as mandating the teal kit`);
    }
  }
}

// ── C10 · no committed DB scratch script; no raw-PII selects outside the mask ─
for (const p of ["db-check.cjs", "db-check.js"]) if (existsSync(join(ROOT, p))) fail("C10", `${p} is committed (raw-PII scratch script)`);
// Per audit C10: raw-PII selects are allowed only in the server layer (src/lib/server)
// and the masking reports layer. Flag them anywhere else (routes, client, etc.).
for (const f of srcFiles) {
  if (f.startsWith("src/lib/server/")) continue;
  const t = read(f);
  if (/\b(nidaNumber|fullName)\s*:\s*true\b/.test(t)) fail("C10", `${f}: raw nidaNumber/fullName select outside the server layer`);
}

// ── M11 / B3 · dead theme deps + light mode must not return ──────────────────
if (/"next-themes"/.test(read("package.json"))) fail("M11", "package.json re-added next-themes");
if (/\[data-theme=["']light["']\]|prefers-color-scheme:\s*light|next-themes/.test(read("src/app/globals.css")))
  fail("B3", "globals.css has a light-theme selector / next-themes (single dark-royal theme by invariant)");

// ── Language truth · no French UI locale (never existed); platform is trilingual
const LANG_FILES = ["README.md", "CLAUDE.md", "src/app/layout.tsx"];
for (const f of LANG_FILES) {
  const t = read(f);
  if (/EN\s*\/\s*SW\s*\/\s*FR|EN \+ SW \+ FR|français|French (dictionary|locale|translation|language)/i.test(t))
    fail("LANG", `${f} claims a French UI locale — the app is EN/SW/ZH only`);
  if (/bilingual EN\s*\/\s*SW\b/i.test(t))
    fail("LANG", `${f} says "bilingual EN/SW" — player-facing platform is trilingual EN/SW/ZH`);
}

// ── Money truth · README/CLAUDE must not state the flat-9% model as current ──
for (const f of ["README.md", "CLAUDE.md"]) {
  for (const line of read(f).split("\n")) {
    if (/\b9%\b[^.\n]{0,30}(combined|margin|rake|commission|operator|pool)/i.test(line) &&
        !/was |old |former|no longer|replaced|not |bug|history|historical/i.test(line)) {
      fail("FEE", `${f}: "${line.trim().slice(0, 90)}" — states the retired flat-9% fee as current`);
    }
  }
}

// ── A10 · money is always formatted (never a raw toLocaleString on a TZS value) ─
// Player/admin UI money must go through formatTzs / formatTzsCompact / formatNumber
// (src/lib/utils) — a raw `.toLocaleString` on a currency value drops the "TZS"
// unit + real-minus glyph and lets locale grouping drift. This guards the UI
// surface (src/components + src/app). Server money surfaces (reports/analytics
// under src/lib/server) are owned separately and out of this UI-hygiene scope.
for (const f of srcFiles) {
  if (f.startsWith("src/lib/server/")) continue;
  for (const [i, line] of read(f).split("\n").entries()) {
    // `TZS {x.toLocaleString()}` / `TZS ${x.toLocaleString()}` — the toLocaleString
    // must be INSIDE the interpolation right after the TZS unit (so a `TZS` string
    // literal that merely sits near an unrelated count.toLocaleString is not flagged).
    if (/TZS\s*\$?\{[^{}]*\.toLocaleString/.test(line))
      fail("A10", `${f}:${i + 1}: money "TZS …toLocaleString" — use formatTzs()/formatTzsCompact()`);
    // A `…Tzs` value formatted with a raw toLocaleString (e.g. bonusGrantedTzs.toLocaleString()).
    else if (/\w*Tzs\.toLocaleString\b/.test(line))
      fail("A10", `${f}:${i + 1}: raw toLocaleString on a *Tzs value — use formatTzs()/formatNumber()`);
  }
}

// ── SCHED · the removed sweep machinery must not silently return ─────────────
// Per-market scheduled resolution (2026-07-24, docs/COMPLIANCE-DECISIONS.md) deleted
// the global settlement sweep, the AUTO_SETTLE gate and the global AI sentinel sweep.
// Each market now carries its own timer. These symbols must stay dead in LIVE code:
// re-introducing one would mean two mechanisms racing to move the same money.
{
  const DEAD_SYMBOLS = [
    "settleDueMarkets",
    "getAutoSettleEnabled",
    "isAutoSettleEnabled",
    "runSentinelSweep",
    "applySentinelConfigChange",
    "setSentinelInterval",
  ];
  for (const f of srcFiles) {
    for (const [i, line] of read(f).split("\n").entries()) {
      const s = line.trim();
      // Comments are allowed to NAME these — several files document the removal.
      if (s.startsWith("//") || s.startsWith("*") || s.startsWith("/*")) continue;
      for (const sym of DEAD_SYMBOLS) {
        if (new RegExp(`\\b${sym}\\b`).test(line)) {
          fail("SCHED", `${f}:${i + 1}: live reference to removed symbol '${sym}' — settlement/resolution are per-market timers now (market-scheduler.ts)`);
        }
      }
      // The env var is gone too: settlement has no global on/off switch.
      if (/process\.env\.AUTO_SETTLE\b/.test(line)) {
        fail("SCHED", `${f}:${i + 1}: reads process.env.AUTO_SETTLE — that gate was removed; settlement is timer-driven`);
      }
    }
  }
  // And no current-truth doc may tell an operator to flip a control that no longer exists.
  for (const f of ["README.md", "CLAUDE.md", "docs/GO-LIVE-RUNBOOK.md", "docs/LAUNCH-GO-NO-GO.md", "docs/PAYMENT-INTEGRATION-CHECKLIST.md"]) {
    for (const line of read(f).split("\n")) {
      if (/AUTO_SETTLE\s*=\s*true/.test(line) && !/removed|no longer|superseded|does not exist|deleted|gone/i.test(line)) {
        fail("SCHED", `${f}: "${line.trim().slice(0, 90)}" — instructs flipping AUTO_SETTLE, which no longer exists`);
      }
    }
  }
}

// ── RESOLVE · the retired solo-resolution override must not return ────────────
// Single-admin resolution + optional two-admin authorization (2026-07-24,
// docs/COMPLIANCE-DECISIONS.md) DELETED the old `allowConflictedResolution`
// "solo-resolution" override module (test-overrides.ts) and the officer-conflict
// hard-lock. The ONE control is now resolution-policy.ts. These symbols must stay
// dead in LIVE code — a returning one would mean two places controlling one thing.
{
  const DEAD_SYMBOLS = [
    "allowConflictedResolution",
    "getConflictedResolutionAllowed",
    "setConflictedResolutionAllowed",
    "isConflictOverrideHardLocked",
    "assertProductionComplianceLocks",
  ];
  for (const f of srcFiles) {
    for (const [i, line] of read(f).split("\n").entries()) {
      const s = line.trim();
      // Comments are allowed to NAME these — several files document the removal.
      if (s.startsWith("//") || s.startsWith("*") || s.startsWith("/*")) continue;
      for (const sym of DEAD_SYMBOLS) {
        if (new RegExp(`\\b${sym}\\b`).test(line)) {
          fail("RESOLVE", `${f}:${i + 1}: live reference to removed symbol '${sym}' — resolution authorization is one flag now (resolution-policy.ts)`);
        }
      }
      // The deleted module itself must never be imported again.
      if (/from\s+["'][^"']*\/test-overrides["']/.test(line)) {
        fail("RESOLVE", `${f}:${i + 1}: imports the deleted test-overrides module — use resolution-policy.ts`);
      }
    }
  }
}

if (fails.length) {
  console.error(`\ncontent-integrity: ${fails.length} FAILURE(S) — misleading/superseded content detected:\n` + fails.map((x) => "  ✗ " + x).join("\n") + "\n");
  process.exit(1);
}
console.log("content-integrity: OK — no misleading, superseded, or removed-code patterns in current-truth surfaces");
