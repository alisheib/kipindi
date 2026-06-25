/**
 * One-off validation of the Market Sentinel against REAL Claude + web search.
 * Seeds tricky cumulative/threshold markets with KNOWN answers, runs the real
 * runSentinelSweep(), and checks each verdict. In-memory only — never the prod DB.
 *
 * Run:  railway run -- npx tsx scripts/sentinel-validate.mts
 *       (railway injects ANTHROPIC_API_KEY; we force the in-memory store below)
 */

// Force the in-memory market store BEFORE importing the DAL (evaluated at module load).
delete process.env.DATABASE_URL;
process.env.USE_PRISMA_DAL = "false";
process.env.NODE_ENV = "development";

const { marketStore } = await import("../src/lib/server/market-dal");
const { runSentinelSweep } = await import("../src/lib/server/market-sentinel");
import type { StoredMarket } from "../src/lib/server/market-service";

const FUTURE = "2026-12-31T23:59:59.000Z"; // far out → not skipped by the 5-min rule

function mk(id: string, titleEn: string, resolutionCriterion: string): StoredMarket {
  return {
    id, titleEn, titleSw: titleEn, category: "sports",
    sourceUrl: "https://en.wikipedia.org/wiki/2022_FIFA_World_Cup",
    resolutionCriterion, resolutionAt: FUTURE, status: "LIVE",
    yesPool: 1000, noPool: 1000, predictorCount: 5,
    resolvedOutcome: null, resolutionStage1By: null, resolutionStage1At: null,
    resolutionStage2By: null, resolutionStage2At: null, objectionsClosedAt: null,
    resolutionNotifiedAt: null, proposedBy: "test",
    createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

// Ground truth: 2022 FIFA World Cup — Mbappé 8 goals (Golden Boot), Messi 7 goals.
type Expect = { determined: boolean; outcome?: "YES" | "NO" };
const cases: { m: StoredMarket; expect: Expect; why: string }[] = [
  {
    m: mk("t1", "Will Lionel Messi score more than 6 goals at the 2022 FIFA World Cup in Qatar?",
      "Resolves YES if Lionel Messi scored more than 6 goals across the 2022 FIFA World Cup tournament in Qatar; otherwise NO."),
    expect: { determined: true, outcome: "YES" }, why: "Messi scored 7; 7 > 6 → YES (locked, tournament over)",
  },
  {
    m: mk("t2", "Will Lionel Messi score more than 7 goals at the 2022 FIFA World Cup in Qatar?",
      "Resolves YES if Lionel Messi scored more than 7 goals across the 2022 FIFA World Cup tournament in Qatar; otherwise NO."),
    expect: { determined: true, outcome: "NO" }, why: "Messi scored 7; 7 is NOT more than 7 → NO (the trap)",
  },
  {
    m: mk("t3", "Will Kylian Mbappe score more than 8 goals at the 2022 FIFA World Cup in Qatar?",
      "Resolves YES if Kylian Mbappe scored more than 8 goals across the 2022 FIFA World Cup tournament in Qatar; otherwise NO."),
    expect: { determined: true, outcome: "NO" }, why: "Mbappe scored 8 (Golden Boot); 8 is NOT more than 8 → NO (the trap)",
  },
  {
    m: mk("t4", "Will Kylian Mbappe score at least 8 goals at the 2022 FIFA World Cup in Qatar?",
      "Resolves YES if Kylian Mbappe scored at least 8 goals across the 2022 FIFA World Cup tournament in Qatar; otherwise NO."),
    expect: { determined: true, outcome: "YES" }, why: "Mbappe scored 8; 8 >= 8 → YES (operator contrast with t3)",
  },
  {
    m: mk("t5", "Will Kylian Mbappe score more than 7 goals at the 2022 FIFA World Cup in Qatar?",
      "Resolves YES if Kylian Mbappe scored more than 7 goals across the 2022 FIFA World Cup tournament in Qatar; otherwise NO."),
    expect: { determined: true, outcome: "YES" }, why: "Mbappe scored 8; 8 > 7 → YES",
  },
  {
    m: mk("t6", "Did Argentina win the 2022 FIFA World Cup final against France?",
      "Resolves YES if Argentina won the 2022 FIFA World Cup final (held 18 Dec 2022) against France; otherwise NO."),
    expect: { determined: true, outcome: "YES" }, why: "Argentina won on penalties → YES (single event, locked)",
  },
  {
    m: mk("t7", "Will Spain win the 2030 FIFA World Cup final?",
      "Resolves YES if Spain win the 2030 FIFA World Cup final; otherwise NO."),
    expect: { determined: false }, why: "2030 WC has not happened → NOT locked → must stay open (conservatism test)",
  },
];

for (const c of cases) await marketStore.set(c.m);

console.log(`\nSeeded ${cases.length} markets. Running real sentinel sweep (Claude + web search)...\n`);
const t0 = Date.now();
const results = await runSentinelSweep();
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

const byId = new Map(results.map((r) => [r.marketId, r]));
let pass = 0;
for (const c of cases) {
  const r = byId.get(c.m.id);
  let ok = false;
  if (r && r.action !== "error") {
    if (!c.expect.determined) {
      ok = !r.determined || r.confidence < 90; // should NOT be locked
    } else {
      ok = r.determined && r.confidence >= 90 && r.outcome === c.expect.outcome;
    }
  }
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"}  [${c.m.id}] ${c.m.titleEn}`);
  console.log(`   expected: ${c.expect.determined ? `LOCKED ${c.expect.outcome}` : "OPEN (not locked)"} — ${c.why}`);
  if (r) {
    console.log(`   AI said : determined=${r.determined} outcome=${r.outcome} confidence=${r.confidence} action=${r.action}`);
    if (r.reasoning) console.log(`   reasoning: ${r.reasoning.replace(/\s+/g, " ").slice(0, 400)}`);
    if (r.evidence) console.log(`   evidence : ${r.evidence.replace(/\s+/g, " ").slice(0, 200)}`);
    if (r.error) console.log(`   ERROR    : ${r.error}`);
  } else {
    console.log(`   AI said : (no result returned)`);
  }
  console.log("");
}
console.log(`\n=== ${pass}/${cases.length} passed in ${elapsed}s ===\n`);
process.exit(pass === cases.length ? 0 : 1);
