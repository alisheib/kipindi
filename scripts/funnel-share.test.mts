/**
 * E-103 · A FUNNEL STAGE CANNOT BE 183% OF THE ONE ABOVE IT.
 *
 *   npm run test:funnel-share
 *
 * ⛔ EVERY CHECK MUST FAIL IF THE FEATURE IS DELETED. The behaviour before this shipped is
 * `pct(value, previous)`, so restoring it must break §1 and §2.
 */
import { readFileSync } from "node:fs";
import { funnelShares, stagesAreNested } from "../src/lib/funnel-share.ts";

let pass = 0; const fails: string[] = [];
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}
const read = (p: string) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// The EXACT shape production showed on 2026-08-05 with the QA fleet funded.
const LIVE = [
  { label: "Registered", value: 55 },
  { label: "KYC approved", value: 6 },
  { label: "Deposited", value: 11 },
  { label: "Placed a bet", value: 27 },
];

console.log("\n── 1 · the production case that exposed it ──");
{
  const rows = funnelShares(LIVE);
  ok("1.1 the top stage carries no percentage — it IS the denominator", rows[0].shareOfTop === undefined);
  ok("1.2 KYC approved is 11% of registered", rows[1].shareOfTop === "11%", rows[1].shareOfTop);
  // 🔴 THE DEFECT, AS AN ASSERTION. `11/6` was 183%; `11/55` is 20%.
  ok("1.3 ⭐ Deposited reads 20% of registered, NOT 183% of the stage above",
    rows[2].shareOfTop === "20%", rows[2].shareOfTop);
  ok("1.4 ⭐ Placed a bet reads 49% of registered, NOT 245%",
    rows[3].shareOfTop === "49%", rows[3].shareOfTop);
}

console.log("\n── 2 · no stage can exceed the top, whatever the data does ──");
{
  const rows = funnelShares(LIVE);
  const overs = rows.filter((r) => r.shareOfTop && parseInt(r.shareOfTop, 10) > 100);
  ok("2.1 ⭐ nothing above 100% on a set whose later stages exceed their predecessors",
    overs.length === 0, overs.map((o) => `${o.label} ${o.shareOfTop}`).join(", "));
  // ⛔ ONE DENOMINATOR FOR THE WHOLE COLUMN — the actual defect was TWO (KYC used the top, the
  // rest used the previous). Recompute each share from the top and require an exact match.
  const top = LIVE[0].value;
  const mismatched = rows.slice(1).filter((r, i) => r.shareOfTop !== `${Math.round((LIVE[i + 1].value / top) * 100)}%`);
  ok("2.2 ⭐ every row uses the SAME denominator, and it is the top stage",
    mismatched.length === 0, mismatched.map((m) => m.label).join(", "));
}

console.log("\n── 3 · the bars scale to the LARGEST stage, so none can overflow its track ──");
{
  const rows = funnelShares(LIVE);
  ok("3.1 the largest stage fills the track", Math.max(...rows.map((r) => r.barPct)) === 100);
  ok("3.2 no bar exceeds its track", rows.every((r) => r.barPct <= 100));
  ok("3.3 a real-but-tiny stage stays visible rather than rendering as nothing",
    funnelShares([{ label: "a", value: 10_000 }, { label: "b", value: 1 }])[1].barPct >= 8);
  // A set whose later stage is biggest must still render inside the track.
  const inverted = funnelShares([{ label: "a", value: 5 }, { label: "b", value: 90 }]);
  ok("3.4 …even when a later stage is the largest (non-nested data)",
    inverted.every((r) => r.barPct <= 100) && inverted[1].barPct === 100);
}

console.log("\n── 4 · the non-nesting is DETECTED, not assumed ──");
{
  ok("4.1 ⭐ production's shape is correctly reported as NOT nested", stagesAreNested(LIVE) === false);
  ok("4.2 a genuinely nested set is not slandered",
    stagesAreNested([{ label: "a", value: 55 }, { label: "b", value: 20 }, { label: "c", value: 5 }]) === true);
}

console.log("\n── 5 · the page is WIRED to it, and DISCLOSES the non-nesting ──");
{
  const page = code("src/app/admin/insights/page.tsx");
  ok("5.1 ⭐ the page uses the shared rule", /funnelShares\(/.test(page), "no funnelShares( call");
  // 🔴 Assert the DEFECT is gone in statement position, not that a word is absent.
  ok("5.2 ⭐ …and no longer divides by the previous stage",
    !/funnel\[i\s*-\s*1\]/.test(page), "funnel[i - 1] is still the denominator");
  ok("5.3 the chart is told the share, not a 'conversion from previous'",
    !/conversionFromPrev/.test(page), "conversionFromPrev is still passed");
  ok("5.4 ⭐ the card SAYS the stages are independent counts (disclosure, not arithmetic)",
    /stagesAreNested\(/.test(page), "no stagesAreNested( call — the disclosure is unconditional or missing");

  const chart = code("src/components/admin/admin-charts.tsx");
  ok("5.5 the chart no longer computes its own bar width from its own max",
    !/const pct = Math\.max\(8, \(s\.value \/ max\) \* 100\)/.test(chart),
    "AdminFunnelChart still derives barPct itself — two definitions of one number");

  // ⭐ 5.6 · THE SECOND INSTANCE. `/admin/compliance` carried the same class and was worse:
  // THREE denominators in one column (Started/registered, Pending/started, Approved/started),
  // under a heading calling them conversions from the previous step — and Pending and Approved
  // are SIBLINGS, so "as a fraction of the row above" described a relationship the data does
  // not have. Fixing one page and leaving the other is how a class becomes a recurrence.
  const compliance = code("src/app/admin/compliance/page.tsx");
  ok("5.6 ⭐ the KYC funnel on /admin/compliance uses the same rule",
    /funnelShares\(/.test(compliance), "no funnelShares( call on the compliance page");
  ok("5.7 ⭐ …and no longer carries three denominators in one column",
    !/conversionFromPrev/.test(compliance), "conversionFromPrev is still built there");

  // ⛔ NOWHERE may build the old prop any more — otherwise a third page reintroduces the class
  // and both checks above stay green because they only look at two files.
  for (const f of ["src/app/admin/insights/page.tsx", "src/app/admin/compliance/page.tsx", "src/components/admin/admin-charts.tsx"]) {
    ok(`5.8 ${f.replace("src/", "")} carries no 'conversionFromPrev' at all`,
      !/conversionFromPrev/.test(code(f)));
  }
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  · ${f}`); process.exit(1); }
