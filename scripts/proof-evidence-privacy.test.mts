/**
 * GUARD — the raw provider blob on the settlement-proof card is STAFF ONLY.
 *
 * Ali, 2026-08-03: *"remove evidence excerpt for player, keep for admins only — we don't
 * want them copying such things from the platform."*
 *
 * The excerpt is the provider's verbatim response: symbol, exchange, OHLC, previous close,
 * 52-week range. It is the right artefact for an officer adjudicating an objection, and the
 * wrong one on a player's screen — it is vendor data lifted straight off the platform, and
 * it says nothing the panel above it has not already said in plain language (both prices,
 * both quote times, the band, the rule).
 *
 * ⛔ THE POINT OF THIS TEST IS *WHERE* THE GATE IS. Hiding the block with CSS, or rendering
 * it and letting the client decide, still ships the payload into a player's HTML — and
 * "view source" is not a permission boundary. The render must be gated on a SERVER-resolved
 * role, so the bytes never leave the server for a player at all.
 */
import { readFileSync } from "node:fs";

const PAGE = "src/app/updown/[roundId]/page.tsx";
const src = readFileSync(PAGE, "utf8");

let pass = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

console.log("\nsettlement proof — evidence excerpt is staff only\n");

// The page must resolve the viewer's role on the SERVER.
check("the page imports the canonical staff predicate",
  /import\s*\{[^}]*isStaffRole[^}]*\}\s*from\s*"@\/lib\/server\/roles"/.test(src));
check("it computes a server-side `viewerIsStaff` from the session",
  /const\s+viewerIsStaff\s*=\s*isStaffRole\(/.test(src));

// The excerpt block must be gated on it.
const gated = /\{evidence\s*&&\s*viewerIsStaff\s*&&\s*\(/.test(src);
check("the evidence excerpt renders ONLY when `evidence && viewerIsStaff`", gated,
  gated ? "" : "the block is not gated on the staff flag");

// It must not be reachable any other way: no ungated `{evidence && (` remains.
const ungated = /\{evidence\s*&&\s*\(/.test(src);
check("there is no ungated `{evidence && (` render left", !ungated,
  ungated ? "an ungated evidence block still exists" : "");

// And the gate must not be cosmetic.
const cssHidden = /udEvidenceExcerpt[\s\S]{0,400}?(hidden\s|display:\s*none|sr-only)/.test(src);
check("the excerpt is NOT merely hidden with CSS (that still ships the bytes)", !cssHidden);

// The rest of the proof must survive — the player keeps the auditable record.
for (const key of ["udOpen", "udClose", "udRuleTextBanded", "udProofClosingNote"]) {
  check(`the player still sees \`${key}\``, src.includes(key));
}

// ── SELF-TEST: prove the detector can actually fail ─────────────────────────
// The §3 lesson. A guard that cannot go red is not a guard.
const broken = src
  .replace("{evidence && viewerIsStaff && (", "{evidence && (")
  .replace(/const\s+viewerIsStaff\s*=\s*isStaffRole\([^)]*\);/, "");
check("self-test: the gate check fails on an ungated page",
  !/\{evidence\s*&&\s*viewerIsStaff\s*&&\s*\(/.test(broken));
check("self-test: the ungated check fails on an ungated page",
  /\{evidence\s*&&\s*\(/.test(broken));
check("self-test: the viewerIsStaff check fails when it is removed",
  !/const\s+viewerIsStaff\s*=\s*isStaffRole\(/.test(broken));

console.log(`\n${pass} passed, ${failures.length} failed\n`);
if (failures.length) { for (const f of failures) console.log(`  · ${f}`); process.exit(1); }
