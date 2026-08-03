/**
 * E-52 · THE PROPOSAL'S EVIDENCE AGE IS FROZEN, NOT A FUNCTION OF NOW — the guard.
 *
 *   npx tsx scripts/proposal-evidence-age.test.mts     (npm run test:proposal-evidence-age)
 *
 * WHAT WENT WRONG. `EvidencePanel` computed
 *
 *     const ageSec = Math.round((Date.now() - new Date(observedQuotedAt).getTime()) / 1000);
 *
 * and printed it under the label **"quoted Xs before we read it"**, then compared it to the
 * 90-second round window to decide whether to show **"⚠ older than the 90s round window"**.
 *
 * Those are two different quantities. The skew that matters is `readAt − observedQuotedAt`, and
 * it is FIXED the moment the reading is taken. Measuring against `Date.now()` makes it grow with
 * the age of the ROW, so **every** proposal turned amber 91 seconds after generation and stayed
 * amber forever — carrying a staleness warning about evidence that had been fresh when taken.
 *
 * 🔴 CAUGHT ON THE FIRST ROW E-47b EVER PRODUCED, and only by looking at the screenshot: the
 * cell read *"quoted 14m before we read it · ⚠ older than the 90s round window"* while the
 * checks column beside it read *"Read a live quote, 33s old"* — the stored indicator, which
 * `validateProposal` computes correctly at generation. Two ages for one reading, disagreeing
 * with each other on one row, one of them amber.
 *
 * ⚠️ WHY IT MATTERS MORE NOW. Until E-47b nothing in this queue was ever approvable, so a false
 * discouraging signal cost nothing. Now that proposals do reach PENDING_REVIEW, a permanent
 * staleness alarm on every healthy one is how an officer learns to ignore a real warning.
 *
 * The panel is a client component, so this drives the ARITHMETIC and the SOURCE rather than the
 * DOM — the defect was a formula, and a formula is what is asserted.
 */
import { readFileSync } from "node:fs";

let pass = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; return; }
  fails.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const SRC = readFileSync(new URL("../src/app/admin/updown/proposals/proposal-actions.tsx", import.meta.url), "utf8");
const PAGE = readFileSync(new URL("../src/app/admin/updown/proposals/page.tsx", import.meta.url), "utf8");

// The panel's own skew formula, extracted so the assertions below drive the real shape.
const skew = (readAt: string, quotedAt: string) =>
  Math.max(0, Math.round((new Date(readAt).getTime() - new Date(quotedAt).getTime()) / 1000));

// ── §1 · the arithmetic ─────────────────────────────────────────────────────────
{
  const quoted = "2026-08-03T06:40:00.000Z";
  const read = "2026-08-03T06:40:33.000Z";           // 33s skew — the real live figure
  ok("§1 the skew is read-time minus quote-time", skew(read, quoted) === 33, `got ${skew(read, quoted)}`);
  ok("§1 …and is BELOW the 90s window, so no warning", skew(read, quoted) <= 90);

  // ⭐ THE PROPERTY THE DEFECT VIOLATED: the same reading, judged a day later, is unchanged.
  // Under the old formula this was ~86,400 and amber.
  ok("§1 ⛔ the skew does not grow as the row ages", skew(read, quoted) === 33,
    "if this depends on the current time the warning is permanent and meaningless");

  // A genuinely stale reading must still warn — the fix must not silence the real signal.
  ok("§1 a genuinely stale reading still exceeds the window",
    skew("2026-08-03T06:46:00.000Z", quoted) === 360 && skew("2026-08-03T06:46:00.000Z", quoted) > 90);

  // Clock skew between the provider and us can put the quote AFTER the read. Negative seconds
  // rendered as "quoted -4s before we read it" reads as a bug; clamped at 0 it reads as fresh.
  ok("§1 a quote timestamped after the read clamps to 0, never negative",
    skew("2026-08-03T06:40:00.000Z", "2026-08-03T06:40:04.000Z") === 0);
}

// ── §2 · the source no longer measures against the clock ────────────────────────
{
  // Scoped to EvidencePanel, because `Date.now()` is legitimate elsewhere in this file.
  // ⚠️ Anchored to the NEXT top-level declaration, not to the first `\n}` — the component has an
  // early-return block that closes with one, so a lazy match captured only the null branch and
  // reported the real formula missing. A truncated extract makes every assertion below vacuous.
  const panel = SRC.match(/export function EvidencePanel\([\s\S]*?(?=\nexport (?:function|const)|\nfunction )/)?.[0] ?? "";
  ok("§2 EvidencePanel was found", panel.length > 0, "the component was renamed or moved");

  // ⚠️ STRIP THE COMMENTS FIRST. The naive `!/Date\.now\(\)/.test(panel)` failed on the FIXED
  // code, because the comment above the formula quotes the old broken expression in order to
  // explain it. A guard that bans the characters punishes the explanation and would be
  // "satisfied" by deleting the note that tells the next reader why this matters — the same
  // mistake E-48's guard made about the strings "520" and "3,480". Test the CODE.
  const code = panel.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  ok("§2 ⛔ the code does not call Date.now()", !/Date\.now\(\)/.test(code),
    "the age is being measured against the current time again — E-52 exactly as it shipped");
  ok("§2 …and the explanatory comment survives", /Date\.now\(\)/.test(panel) && /E-52/.test(panel),
    "the note explaining why this must not use the clock was removed");
  ok("§2 it derives the skew from readAt", /readAt/.test(panel) && /new Date\(readAt\)/.test(panel),
    "nothing anchors the age to when the reading was taken");
  ok("§2 …and clamps it", /Math\.max\(0,/.test(panel));
  ok("§2 the staleness warning still exists", /older than the/.test(panel),
    "the fix must not remove the real signal, only stop it firing falsely");
}

// ── §3 · the call site passes the read time ─────────────────────────────────────
{
  ok("§3 the queue passes the proposal's createdAt as readAt", /readAt=\{p\.createdAt\}/.test(PAGE),
    "without this the panel cannot know when the reading was taken");
}

// ── §4 · the two ages on one row must agree ─────────────────────────────────────
{
  // `validateProposal`'s stored indicator says "Quote was Ns old when read". That number and
  // the panel's number describe THE SAME THING, and the whole finding was that they disagreed.
  // Assert the server computes it the same way — against the read, not against now.
  const svc = readFileSync(new URL("../src/lib/server/updown-proposal.ts", import.meta.url), "utf8");
  const block = svc.match(/const age = [\s\S]{0,900}?old when read/)?.[0] ?? "";
  ok("§4 the server's indicator was found", block.length > 0,
    "the 'old when read' indicator moved — check it still measures the same quantity");
  ok("§4 …and it is stated as 'when read', matching the panel's label",
    /old when read/.test(block));
  // ⭐ The two must agree BY CONSTRUCTION. The server had the same defect, less visibly: it also
  // measured against Date.now(), so re-validating on edit/approve would report a fresh reading
  // as stale. Both derive from createdAt now.
  ok("§4 ⛔ the server measures against createdAt, not the clock",
    /const age = Math\.abs\(new Date\(p\.createdAt\)/.test(svc),
    "validateProposal is measuring the read skew against Date.now() again");
  ok("§4 …and does not use Date.now() for it",
    !/const age = Math\.abs\(Date\.now\(\)/.test(svc));
}

console.log(`\nE-52 · proposal evidence age — ${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
