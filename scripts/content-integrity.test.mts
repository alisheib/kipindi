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

// ── E-96 · A CAMPAIGN FINDING ID IS NOT COPY ────────────────────────────────
//
// Two controls on `/admin/updown` narrated this campaign's own tracker to the operator:
// the winning-band dropdown said a wide band *"is why **E-32** was filed"*, and the thresholds
// paragraph said the ladder was *"the measured ladder **(E-32)**"*. `E-32` means nothing to the
// person reading it; the operator guide, which is their actual contract, never uses it. Copy
// discipline (SKILL §7) says a surface states the FACT, and the internal detail stays internal.
//
// ⚠️ COMMENTS ARE FINE AND ARE THE POINT — the code SHOULD say which finding it came from.
// This looks only at what renders: string literals and JSX text, comment lines skipped, exactly
// as C1 above does.
{
  const RENDERED_ID = /\bE-\d{1,3}\b/;
  for (const f of srcFiles) {
    const lines = read(f).split("\n");
    let inBlockComment = false;
    lines.forEach((line, i) => {
      // 🔴 STRIP COMMENTS WHEREVER THEY OPEN, NOT ONLY WHERE THEY START A LINE.
      //
      // This rule tracked `/* … */` only when the TRIMMED line began with `/*` or `{/*`, so a
      // comment opened mid-expression was invisible to it — and it fired on exactly that:
      //     expectedResultAtMs={/* E-99 · null under the sample floor → no clock, never a
      //                            guessed one. */ r.expectedResultAtMs}
      // a JS block comment inside a JSX expression container, which renders nothing. The gate
      // has been RED since E-99 shipped (session 28, `0664d18e`) and went unnoticed.
      //
      // ⛔ IT IS THE SIN THIS FILE IS FULL OF WARNINGS ABOUT: *"a guard that greps for a
      // defect's code will match the comment explaining its fix — strip comments before
      // asserting."* The rule's own header even claims "comment lines skipped, exactly as C1
      // above does". It skipped comment LINES; the defect was comment SPANS.
      let text = line;
      if (inBlockComment) {
        const end = text.indexOf("*/");
        if (end < 0) return;                        // the whole line is inside a comment
        text = text.slice(end + 2);
        inBlockComment = false;
      }
      text = text.replace(/\/\*[\s\S]*?\*\//g, " ");   // complete spans on this line
      const open = text.indexOf("/*");                 // an unterminated one opens a block
      if (open >= 0) { inBlockComment = true; text = text.slice(0, open); }
      // ⚠️ `//` only when it is not the `//` of a URL — `https://…` is content, not a comment.
      const dbl = text.search(/(^|[^:])\/\//);
      if (dbl >= 0) text = text.slice(0, dbl);
      const s = text.trim();
      if (s.startsWith("*")) return;                   // a JSDoc continuation line
      // ⛔ NOT `>text<` ON ONE LINE. The first version of this guard read only quoted strings
      // and JSX text bounded by tags on the same line — and MISSED the second of the two cases
      // that motivated it, because `…the measured ladder (E-32) — <strong>0.02%</strong>…` is a
      // JSX text RUN that starts on one line and ends on another. A guard that misses one of
      // its own two founding examples is not measuring the class.
      //
      // So: strip the tags and look at what prose is left. Comments are already gone, so what
      // remains on a `.tsx` line is either copy or code — and an `E-nn` token surrounded by
      // whitespace is not something code contains.
      // ⚠️ `text`, NOT `line`. The comment-stripping above wrote to `text` and this read the
      // ORIGINAL — so every span it had just removed came straight back. Caught by running it:
      // the rule went from 1 failure to 3, all of them comments. Strip a thing and then measure
      // the unstripped copy and you have done nothing but take longer about it.
      const prose = text.replace(/<[^>]*>/g, " ");
      if (RENDERED_ID.test(prose) && /\S\s|\s\S/.test(prose.trim())) {
        fail("E96", `${f}:${i + 1}: a campaign finding id is rendered as copy — "${prose.trim().slice(0, 90)}"`);
      }
    });
  }
}

// ── E-97 · AN ISO STRING IS NOT A TIME AN OPERATOR READS ────────────────────
//
// `generateRoundNow` refused with *"A round is already live on BTC 5m (closes
// 2026-08-05T14:35:00.000Z)"* — measured off the live toast. Every other time on that page is
// formatted (`14:35:00 UTC` on the chain row, `08-05 13:55Z` on the rounds grid), so the one
// place the console spoke in machine format was the one place it was REFUSING, which is exactly
// when an operator most needs to read it without decoding anything.
//
// ⚠️ SCOPED TO `error:` — the sentence that reaches a toast. `detail:` on a lifecycle result is
// a LOG line, and an ISO instant is the right thing there; flagging it would be noise.
{
  for (const f of ["src/lib/server/updown-service.ts", "src/lib/server/market-service.ts"]) {
    const lines = read(f).split("\n");
    // ⛔ SCOPE TO THE `error:` STATEMENT, NOT TO "a line starting with a backtick". The first
    // version did the latter and flagged the market's RESOLUTION CRITERION — an internal record
    // that is redirected away from `/markets/[id]` for an Up & Down round and never reaches a
    // player. A guard that fires on correct code teaches people to ignore it, which is the same
    // damage as one that misses a defect. An `error:` template can wrap onto the next few lines,
    // so the window follows the statement rather than assuming it fits on one.
    let window = 0;
    lines.forEach((line, i) => {
      const s = line.trim();
      if (s.startsWith("//") || s.startsWith("*") || s.startsWith("/*")) return;
      if (/\berror:/.test(line)) window = 4; else if (window > 0) window--;
      if (window === 0) return;
      // An interpolated identifier that names an instant, not already passed through a formatter.
      for (const m of line.matchAll(/\$\{([^}]*\b\w*(?:At|Iso)\b[^}]*)\}/g)) {
        const expr = m[1];
        if (/clockUtc\(|fmtTime\(|toLocale|slice\(/.test(expr)) continue;
        fail("E97", `${f}:${i + 1}: an operator-facing error interpolates a raw instant — \${${expr.trim().slice(0, 60)}} — wrap it in clockUtc()`);
      }
    });
  }
}

if (fails.length) {
  console.error(`\ncontent-integrity: ${fails.length} FAILURE(S) — misleading/superseded content detected:\n` + fails.map((x) => "  ✗ " + x).join("\n") + "\n");
  process.exit(1);
}
console.log("content-integrity: OK — no misleading, superseded, or removed-code patterns in current-truth surfaces");
