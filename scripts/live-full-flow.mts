/**
 * AI poll · LIVE full-flow test (calls the REAL Anthropic API).
 *
 * The whole journey on real data, exactly as the operator + players will use it:
 *   1. Generate one poll PER CATEGORY via the real API + web search.
 *   2. Watch the 4 layers sort them (PENDING_REVIEW vs FILTERED).
 *   3. Officer APPROVES some and REJECTS some.
 *   4. Approved polls are PUBLISHED into LIVE markets.
 *   5. Funded test players BET (YES/NO) on the live markets.
 *   6. Verify pools moved, wallets debited, positions opened.
 *
 * Run (PowerShell):
 *   $env:ANTHROPIC_API_KEY="sk-ant-..."; npx tsx scripts/live-full-flow.mts
 *
 * Safe with no key — prints how to provide one and exits.
 */
import { randomId } from "../src/lib/server/crypto.ts";
import { db } from "../src/lib/server/store.ts";
import {
  generateAIPoll, approveAIPoll, rejectAIPoll, countAIPollsByState, aiPollDailyProgress,
  type StoredAIPoll, type FilterReason,
} from "../src/lib/server/ai-poll-generation.ts";
import { updateAIPollConfig } from "../src/lib/server/ai-poll-config.ts";
import {
  ingestCandidate, filterCandidate, attachVerification, scoreCandidate, approveCandidate, markPublished,
} from "../src/lib/server/market-candidate.ts";
import { markAIPollPublished } from "../src/lib/server/ai-poll-generation.ts";
import {
  createMarket, listMarkets, buyPosition, getMarket, impliedYesPct,
} from "../src/lib/server/market-service.ts";
import { seedDefaultSources } from "../src/lib/server/source-registry.ts";

if (!process.env.ANTHROPIC_API_KEY) {
  console.log('\nNo ANTHROPIC_API_KEY set. PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..."; npx tsx scripts/live-full-flow.mts\n');
  process.exit(0);
}

let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}
const now = () => new Date().toISOString();

function fundedPlayer(name: string, balance: number): string {
  const id = `usr_${randomId(10)}`;
  db.user.create({
    id, phoneE164: `+25579${String(Math.abs(hash(name)) % 1_000_0000).padStart(7, "0")}`,
    passwordHash: "x", passwordSalt: "x", failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: name, dob: "1990-01-01",
    region: "Dar es Salaam", acceptedTermsVersion: "1", acceptedTermsAt: now(),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null, recruitedBy: null,
  });
  db.wallet.create({
    id: `wal_${randomId(10)}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  });
  return id;
}
function hash(s: string): number { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

function publishPoll(poll: StoredAIPoll, officerId: string): string {
  const candidate = ingestCandidate({
    category: (poll.category === "tech" || poll.category === "other" ? "macro" : poll.category) as
      "sports" | "macro" | "weather" | "crypto" | "culture" | "infrastructure",
    proposedTitleEn: poll.titleEn, proposedTitleSw: poll.titleSw || undefined,
    resolutionCriterion: poll.resolutionCriterion, resolutionAt: poll.resolutionAt,
    sources: poll.sources.map((s) => ({ url: s.url, publisher: s.publisher, retrievedAt: now() })),
    tokensSpent: poll.tokensUsed, costUsd: poll.costUsd, actorId: officerId,
  });
  filterCandidate(candidate.id, { passes: true });
  attachVerification(candidate.id, { confirmingSources: [], tokensSpent: 0, costUsd: 0 });
  scoreCandidate(candidate.id, { confidence: poll.confidence, tokensSpent: 0, costUsd: 0, rubric: { aiPollQuality: poll.overallQuality } });
  approveCandidate(candidate.id, { officerId, note: `From AI poll ${poll.id}` });
  const marketCategory = poll.category === "infrastructure" ? "macro"
    : poll.category === "tech" ? "tech" : poll.category === "other" ? "other" : poll.category;
  const market = createMarket({
    titleEn: poll.titleEn, titleSw: poll.titleSw || poll.titleEn,
    category: marketCategory as "sports" | "macro" | "weather" | "crypto" | "culture" | "tech" | "other",
    sourceUrl: poll.sources[0]?.url ?? "", resolutionCriterion: poll.resolutionCriterion,
    resolutionAt: poll.resolutionAt, proposedBy: officerId,
  });
  markPublished(candidate.id, market.id, officerId);
  markAIPollPublished(poll.id, { candidateId: candidate.id, marketId: market.id, officerId });
  return market.id;
}

const OFFICER = "officer_live";
const CATEGORIES = ["sports", "macro", "weather", "crypto", "culture", "infrastructure", "tech"];

console.log("\n" + "=".repeat(72));
console.log("LIVE FULL-FLOW  ·  real API  ·  generate → review → publish → bet");
console.log("=".repeat(72));

updateAIPollConfig({ webSearchEnabled: true, minConfidence: 60, minLeadTimeHours: 24, maxLeadTimeDays: 240 }, OFFICER);
seedDefaultSources();

// 1 · GENERATE one poll per category
console.log("\n--- 1 · GENERATE (one per category) ---");
const generated: StoredAIPoll[] = [];
let totalCost = 0;
for (const category of CATEGORIES) {
  const poll = await generateAIPoll({ category, actorId: OFFICER });
  generated.push(poll);
  totalCost += poll.costUsd;
  const tag = poll.state === "PENDING_REVIEW" ? "✓ review" : `· ${poll.state}${poll.filterReasons.length ? ` (${poll.filterReasons.join(",")})` : ""}`;
  console.log(`  [${category.padEnd(14)}] ${tag.padEnd(22)} ${poll.titleEn.slice(0, 70) || "—"}`);
}
const reviewable = generated.filter((p) => p.state === "PENDING_REVIEW");
check("at least 4 categories produced a reviewable poll", reviewable.length >= 4, `${reviewable.length}/${CATEGORIES.length}`);
check("every poll landed in a valid terminal/queue state", generated.every((p) => ["PENDING_REVIEW", "FILTERED", "VALIDATION_FAILED"].includes(p.state)));
check("no reviewable poll has a past or too-soon date", reviewable.every((p) => new Date(p.resolutionAt).getTime() > Date.now() + 23 * 3600_000));
check("every reviewable poll carries >=1 valid source", reviewable.every((p) => p.sources.length >= 1));
check("every reviewable poll has a Swahili title", reviewable.every((p) => p.titleSw.length > 0));

// 2 · REVIEW — approve half, reject half
console.log("\n--- 2 · REVIEW (approve some, reject some) ---");
const approved: StoredAIPoll[] = [];
reviewable.forEach((poll, i) => {
  if (i % 2 === 0) {
    const a = approveAIPoll(poll.id, { officerId: OFFICER, note: "Strong, clean market." });
    if (a?.state === "APPROVED") { approved.push(a); console.log(`  APPROVE  ${a.titleEn.slice(0, 66)}`); }
  } else {
    rejectAIPoll(poll.id, { officerId: OFFICER, reasons: ["officer_decision" as FilterReason], note: "Holding for today." });
    console.log(`  REJECT   ${poll.titleEn.slice(0, 66)}`);
  }
});
const c = countAIPollsByState();
check("approvals recorded", c.APPROVED === approved.length && approved.length >= 1, `approved=${c.APPROVED}`);
check("rejections recorded", c.REJECTED >= 1, `rejected=${c.REJECTED}`);

// 3 · PUBLISH approved → live markets
console.log("\n--- 3 · PUBLISH (approved → live markets) ---");
const before = listMarkets().length;
const marketIds = approved.map((p) => publishPoll(p, OFFICER));
const liveMarkets = listMarkets({ status: "LIVE" }).filter((m) => marketIds.includes(m.id));
check("a live market was created per approved poll", liveMarkets.length === approved.length, `${liveMarkets.length}/${approved.length}`);
check("market count grew by the number published", listMarkets().length === before + approved.length);
liveMarkets.forEach((m) => console.log(`  LIVE  ${m.id}  ${m.titleEn.slice(0, 60)}`));

if (marketIds.length === 0) {
  console.log("\n(no approved markets to bet on — ending)");
  console.log(`\nLIVE FULL-FLOW   PASS: ${pass}   FAIL: ${fail}   ·  API cost $${totalCost.toFixed(4)}\n`);
  process.exit(fail > 0 ? 1 : 0);
}

// 4 · BET — funded players place YES/NO
console.log("\n--- 4 · BET (players stake on live markets) ---");
const alice = fundedPlayer("Asha", 100_000);
const brian = fundedPlayer("Baraka", 100_000);
const m1 = marketIds[0];
const m2 = marketIds[1] ?? marketIds[0];

// Snapshot pool figures as PRIMITIVES — getMarket returns the live object that
// buyPosition mutates in place, so we must copy the numbers, not the reference.
const b = getMarket(m1)!;
const beforeYes = b.yesPool, beforeNo = b.noPool, beforeCount = b.predictorCount;
const yesBet = await buyPosition(alice, { marketId: m1, side: "YES", stake: 5000 });
const noBet = await buyPosition(brian, { marketId: m1, side: "NO", stake: 8000 });
const yesBet2 = await buyPosition(alice, { marketId: m2, side: "YES", stake: 3000 });

check("Asha's YES bet on M1 succeeded", yesBet.ok === true, yesBet.ok ? `payoutIfWin=${yesBet.data.payoutIfWin}` : yesBet.error);
check("Baraka's NO bet on M1 succeeded", noBet.ok === true, noBet.ok ? `payoutIfWin=${noBet.data.payoutIfWin}` : noBet.error);
check("Asha's second bet (M2) succeeded", yesBet2.ok === true, yesBet2.ok ? "" : yesBet2.error);

const afterM1 = getMarket(m1)!;
check("M1 YES pool grew by 5,000", afterM1.yesPool === beforeYes + 5000, `yes ${beforeYes}→${afterM1.yesPool}`);
check("M1 NO pool grew by 8,000", afterM1.noPool === beforeNo + 8000, `no ${beforeNo}→${afterM1.noPool}`);
check("M1 predictor count rose by 2", afterM1.predictorCount === beforeCount + 2, `${beforeCount}→${afterM1.predictorCount}`);
check("Asha's wallet debited to 92,000", db.wallet.findByUserId(alice)!.balance === 100_000 - 5000 - 3000, `bal=${db.wallet.findByUserId(alice)!.balance}`);
check("Baraka's wallet debited to 92,000", db.wallet.findByUserId(brian)!.balance === 100_000 - 8000, `bal=${db.wallet.findByUserId(brian)!.balance}`);

// Over-stake guard: a bet beyond balance must be refused, wallet untouched.
const broke = await buyPosition(brian, { marketId: m1, side: "NO", stake: 999_999 });
check("over-balance bet rejected, wallet intact", broke.ok === false && db.wallet.findByUserId(brian)!.balance === 92_000, broke.ok ? "ALLOWED!" : broke.error);

console.log(`\n  M1 implied YES: ${impliedYesPct(afterM1)}%   ·   daily progress: ${JSON.stringify(aiPollDailyProgress())}`);
console.log("\n" + "=".repeat(72));
console.log(`LIVE FULL-FLOW   PASS: ${pass}   FAIL: ${fail}   ·   API cost $${totalCost.toFixed(4)}`);
console.log("=".repeat(72) + "\n");
process.exit(fail > 0 ? 1 : 0);
