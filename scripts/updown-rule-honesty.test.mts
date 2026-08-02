/**
 * E-39 · THE SETTLEMENT RULE THE PLAYER IS SHOWN MUST BE THE RULE WE APPLY.
 *
 * 🔴 WHY THIS TEST EXISTS. `/updown/[roundId]` carries a panel headed "SETTLEMENT PROOF ·
 * AUDITABLE RECORD". It prints both prices, both sources, both quote times, the move, the
 * band — `Up ≥ $63,126.62`, `Down ≤ $63,101.38` — and then, directly underneath, a line
 * labelled **Rule**. Until 2026-08-02 that line was a hard-coded constant in all three
 * locales:
 *
 *     en  "Up if the close is above the open · Down if below · Void if it does not move"
 *     sw  "… · Batili ikiwa haijasogea"
 *     zh  "… · 无变动则作废"
 *
 * That is the rule at margin ZERO. It is not the rule the platform applies. Since E-32 every
 * round is priced by the measured ladder — 2 bps at 5 minutes — so a BTC round that moves
 * **$5** voids and refunds. The page told that player voiding requires the price not to move,
 * on the same card that showed them a $12.62 band and a price that plainly moved.
 *
 * ⚠️ THE POINT IS NOT THE WORDING. It is that a *constant* cannot describe a rule that varies
 * per round. The panel is the artefact a player takes to an objection, and it is the one
 * surface where a money rule must be stated as the code applies it. The internal resolution
 * note (`updown-service.ts`) has always said it correctly — "stayed inside the band" — so the
 * platform knew the right sentence and showed the player the wrong one.
 *
 * WHAT IS GUARDED, in three layers, so this cannot regress as a copy edit:
 *   A · BEHAVIOUR — at every rung of the shipped ladder there exists a round that MOVES and
 *       still VOIDs. This is the premise, proven against `decideOutcomeByTargets` itself
 *       rather than asserted. It is what makes the old sentence false.
 *   B · COPY — for a round that HAS a band, the rule sentence must name the two targets, in
 *       that locale's own words, and must not be the legacy no-move constant.
 *   C · WIRING — the page must CHOOSE between the two sentences. A page that renders one
 *       constant unconditionally is the original defect however good the constant is.
 *
 * Every negative assertion here was run against the unfixed tree first and observed to fail.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decideOutcomeByTargets } from "../src/lib/server/updown-service.ts";
import { DEFAULT_UPDOWN_CONFIG } from "../src/lib/server/updown-config.ts";
import { dict } from "../src/lib/i18n-dict.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 62 - s.length))}`);

const LOCALES = ["en", "sw", "zh"] as const;

// ── A · BEHAVIOUR — "void if it does not move" is false at every shipped rung ────────────────
section("A · a round that MOVES and still VOIDs exists at every ladder rung");

for (const rung of DEFAULT_UPDOWN_CONFIG.marginSchedule) {
  const open = 63_000;
  const margin = (open * rung.bps) / 10_000;
  const upTarget = open + margin;
  const downTarget = open - margin;
  // A price that moved by HALF the band — unambiguously moved, unambiguously inside.
  const moved = open + margin / 2;
  const d = decideOutcomeByTargets(moved, upTarget, downTarget);
  ok(
    `${String(rung.maxDurationMinutes).padStart(4)}min @ ${rung.bps}bps — close moved $${(margin / 2).toFixed(2)} and still VOIDs`,
    d.outcome === "VOID" && moved !== open,
    `got outcome=${d.outcome} for close=${moved} band=[${downTarget}, ${upTarget}]`,
  );
}

// The band edges themselves, so the sentence's "at or above / at or below" is exact.
{
  const open = 63_000, up = 63_012.62, down = 62_987.38;
  ok("close exactly ON the up target resolves UP (≥, not >)", decideOutcomeByTargets(up, up, down).outcome === "UP");
  ok("close exactly ON the down target resolves DOWN (≤, not <)", decideOutcomeByTargets(down, up, down).outcome === "DOWN");
  ok("close one cent inside the up target VOIDs", decideOutcomeByTargets(up - 0.01, up, down).outcome === "VOID");
}

// ── B · COPY — the banded sentence must name the targets, in each locale ─────────────────────
section("B · the banded rule sentence names both targets, in all three locales");

for (const loc of LOCALES) {
  const m = dict[loc].market as Record<string, string>;
  const banded = m.udRuleTextBanded;
  const legacy = m.udRuleText;

  ok(`${loc} · udRuleTextBanded exists`, typeof banded === "string" && banded.trim().length > 0);
  if (typeof banded !== "string" || !banded.trim()) continue;

  // It must not simply be the no-move constant under a new name.
  ok(`${loc} · banded sentence is NOT the legacy no-move constant`, banded !== legacy,
     `both are: ${banded}`);

  // It must name the two targets using THIS locale's own words for them — the same words
  // printed on the rows immediately above, so the sentence and the numbers agree on screen.
  ok(`${loc} · banded sentence names the Up target ("${m.udUp}")`, banded.includes(m.udUp), banded);
  ok(`${loc} · banded sentence names the Down target ("${m.udDown}")`, banded.includes(m.udDown), banded);

  // The defect in one assertion: a banded round must never be described with a rule whose
  // void condition is "the price did not move". These are the exact legacy claims.
  const NO_MOVE_CLAIM: Record<string, string> = {
    en: "does not move",
    sw: "haijasogea",
    zh: "无变动",
  };
  ok(`${loc} · banded sentence does not claim voiding requires NO movement`,
     !banded.includes(NO_MOVE_CLAIM[loc]), banded);
}

// Trilingual parity for the new key — a missing *Zh silently shows a Chinese reader English.
{
  const present = LOCALES.filter((l) => typeof (dict[l].market as Record<string, string>).udRuleTextBanded === "string");
  ok("all three locales carry udRuleTextBanded", present.length === 3, `present in: ${present.join(", ")}`);
}

// ── C · WIRING — the page must CHOOSE, not print a constant ──────────────────────────────────
section("C · the round page selects the sentence from the round's own band");

const pageSrc = read("src/app/updown/[roundId]/page.tsx");

ok("the page references the banded sentence at all", pageSrc.includes("udRuleTextBanded"),
   "the new key is unused — the page is still rendering a constant");

// The selection must be driven by the round's targets, which is the only thing that makes it
// per-round. Accept either target in the condition; reject a page that mentions neither.
{
  // The window spans the Rule row itself. It is generous on the trailing side because the
  // selection sits below the label with its own explanatory comment — but it is still LOCAL,
  // so a `upTarget` mention elsewhere in the file cannot satisfy it on its own.
  const at = pageSrc.indexOf("udRule}");
  const ruleBlock = pageSrc.slice(Math.max(0, at - 900), at + 1200);
  ok("the sentence is chosen from upTarget/downTarget, not hard-coded",
     /upTarget|downTarget/.test(ruleBlock) && /udRuleTextBanded/.test(ruleBlock),
     "no target-driven selection found near the Rule row");
}

// And the legacy sentence must survive for the genuinely unbanded case (margin 0 / old rounds),
// because there it is CORRECT — deleting it would trade one wrong sentence for another.
ok("the legacy no-move sentence is kept for rounds with no band", pageSrc.includes("udRuleText"),
   "udRuleText was deleted — a margin-0 round now has no accurate rule line");

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
