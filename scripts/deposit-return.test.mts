/** S9: a manual question bet earns create-only return attribution from an owned, matching paid deposit. */
import "./lib/verified-fixtures.mts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/server/store.ts";
import { createMarket, buyPosition } from "../src/lib/server/market-service.ts";
import { positionStore } from "../src/lib/server/market-dal.ts";
import { depositReturnMeasure } from "../src/lib/journey/deposit-return-measure.ts";
import { isDepositReturnBet } from "../src/lib/journey/deposit-state.ts";
import { returnedSheetPreset } from "../src/lib/journey/sheet-state.ts";
import { parseReturnChoice } from "../src/lib/journey/return-choice.ts";
import { FUNDING_STORAGE_MAX_BYTES, fundingStorageKey, parseStoredFunding, writeStoredFunding } from "../src/lib/journey/funding-storage.ts";

const red = process.argv.includes("--prove-red");
const pg = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";
let passed = 0;
function check(label: string, fact: boolean) { assert.ok(fact, label); passed++; process.stdout.write(`  ✓ ${label}\n`); }
const iso = (at: number) => new Date(at).toISOString();
const now = Date.now();
const source = readFileSync(new URL("../src/lib/server/market-service.ts", import.meta.url), "utf8");
function writerGuard(text: string) {
  return /isDepositReturnBet\(userId, returnRow/.test(text)
    && /db\.txn\.findById\(opts\.returnDepositId, lockTx\)/.test(text)
    && /\.\.\.\(depositReturn \? \{ origin: "deposit_return" \} : \{\}\)/.test(text);
}
check("the real wallet-locked writer checks the owned deposit before create", writerGuard(source));
if (red) {
  check("plant: a URL-only origin writer is caught", !writerGuard(source.replace("isDepositReturnBet(userId, returnRow", "Boolean(opts.returnDepositId) || discarded(userId, returnRow")));
  check("plant: an unlocked deposit read is caught", !writerGuard(source.replace("db.txn.findById(opts.returnDepositId, lockTx)", "db.txn.findById(opts.returnDepositId)")));
  check("plant: a dropped persisted origin is caught", !writerGuard(source.replace('...(depositReturn ? { origin: "deposit_return" } : {})', "")));
}

const row = (id: string, owner: string, status: string, completed: number, bet: string, extra: Record<string, unknown> = {}) => ({
  id, userId: owner, walletId: `wal_${owner}`, type: "DEPOSIT", status, amount: 5_000,
  fee: 0, taxWithheld: 0, balanceAfter: 100_000, currency: "TZS", provider: "MPESA", providerRef: `s9_${id}`,
  msisdn: "255712345678", description: "", positionId: null, amlReason: null,
  createdAt: iso(completed - 5_000), updatedAt: iso(completed), completedAt: iso(completed), idempotencyKey: `key_${id}`,
  pendingBet: { v: 1, bet, returnPath: "/" }, ...extra,
});

const pure = row("txn_pure", "s9_a", "CONFIRMED", now - 60_000, "mkt_target.YES.5000");
check("exact paid owned target within 30 minutes qualifies", isDepositReturnBet("s9_a", pure, { marketId: "mkt_target", side: "YES", stake: 5_000 }, now));
check("a foreign deposit cannot qualify", !isDepositReturnBet("s9_b", pure, { marketId: "mkt_target", side: "YES", stake: 5_000 }, now));
check("a failed deposit cannot qualify", !isDepositReturnBet("s9_a", { ...pure, status: "FAILED" }, { marketId: "mkt_target", side: "YES", stake: 5_000 }, now));
check("a changed quote cannot qualify", !isDepositReturnBet("s9_a", pure, { marketId: "mkt_target", side: "NO", stake: 5_000 }, now));
check("a house stake cannot qualify", !isDepositReturnBet("s9_a", pure, { marketId: "mkt_target", side: "YES", stake: 5_000, houseBotId: "hb_x" }, now));
check("30-minute boundary qualifies, one millisecond later does not",
  isDepositReturnBet("s9_a", pure, { marketId: "mkt_target", side: "YES", stake: 5_000 }, Date.parse(pure.completedAt) + 30 * 60_000)
  && !isDepositReturnBet("s9_a", pure, { marketId: "mkt_target", side: "YES", stake: 5_000 }, Date.parse(pure.completedAt) + 30 * 60_000 + 1));
check("returned stake clamps only to the current legal bounds and discloses the change",
  returnedSheetPreset({ min: 2_000, max: 4_000 }, 5_000).stake === 4_000
  && returnedSheetPreset({ min: 2_000, max: 4_000 }, 5_000).changed?.from === 5_000
  && returnedSheetPreset({ min: 2_000, max: 4_000 }, 3_000).changed === null);
const closedChoice = { state: "closed", seed: { v: 1, id: "mkt_target", bettable: false, yesPool: 1,
  noPool: 1, rates: null, feePct: null, min: 1_000, max: 100_000, closesAt: iso(now - 1), serverNow: now },
  title: "Closed question", walletBalance: 7_000, similar: [{ id: "mkt_other", title: "Other live question" }] };
check("closed-return context accepts only the selected market and bounded real candidates",
  parseReturnChoice(closedChoice, "mkt_target")?.similar.length === 1
  && parseReturnChoice(closedChoice, "mkt_other") === null
  && parseReturnChoice({ ...closedChoice, similar: Array(4).fill(closedChoice.similar[0]) }, "mkt_target") === null);
const funding = JSON.stringify({ v: 1, key: "12345678-1234-1234-1234-123456789abc", owner: "s9_a", startedAt: now, attempts: 1 });
const tooManyBytes = JSON.stringify({ ...JSON.parse(funding), padding: "资".repeat(350) });
check("owner funding storage is bounded and never expires an unresolved identity by age",
  parseStoredFunding(funding, "s9_a")?.key === "12345678-1234-1234-1234-123456789abc"
  && parseStoredFunding(funding, "s9_b") === null
  && tooManyBytes.length < FUNDING_STORAGE_MAX_BYTES
  && parseStoredFunding(tooManyBytes, "s9_a") === null
  && parseStoredFunding(JSON.stringify({ ...JSON.parse(funding), startedAt: 1 }), "s9_a")?.startedAt === 1);
const fundingItems = new Map<string, string>();
const tabStorage = {
  setItem: (key: string, value: string) => fundingItems.set(key, value),
  getItem: (key: string) => fundingItems.get(key) ?? null,
} as unknown as Storage;
check("funding identity is readable after write before any payment dispatch",
  writeStoredFunding(tabStorage, "s9_a", JSON.parse(funding))
  && parseStoredFunding(fundingItems.get(fundingStorageKey("s9_a")) ?? "", "s9_a")?.key === JSON.parse(funding).key);
check("a tab store that drops writes refuses the payment identity",
  !writeStoredFunding({ setItem: () => undefined, getItem: () => null } as unknown as Storage, "s9_a", JSON.parse(funding)));

const depositActionSource = readFileSync(new URL("../src/app/wallet/deposit/actions.ts", import.meta.url), "utf8");
const mobileFormSource = readFileSync(new URL("../src/app/wallet/deposit/journey-deposit-form.tsx", import.meta.url), "utf8");
const cardBridgeSource = readFileSync(new URL("../src/app/wallet/deposit/card-intent-bridge.tsx", import.meta.url), "utf8");
const dispositionSource = readFileSync(new URL("../src/lib/server/deposit-action-recovery.ts", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../src/app/wallet/deposit/page.tsx", import.meta.url), "utf8");
const fundingUnlockGuard = (action: string, mobile: string, card: string, disposition: string, page: string) =>
  action.includes("await depositRefusalDisposition(session.userId, idempotencyKey)")
  && action.includes('signFlash("deposit-release-key", bound)')
  && disposition.includes("withLock(`wallet:${ownerId}`")
  && disposition.includes("db.txn.findByIdempotencyKey(key, tx)")
  && disposition.includes('if (!row) return "release"')
  && page.includes('readFlash("deposit-release-key", sp.release)')
  && page.includes("releaseProof?.startsWith(ownerPrefix)")
  && mobile.includes("releaseStoredFunding(box, ownerId, releaseKey)")
  && card.includes("releaseStoredFunding(box, ownerId, releaseKey)")
  && !mobile.includes("removeItem(slot)") && !card.includes("removeItem(fundingKey");
check("a no-row refusal releases the owner/key identity only after locked proof and signed return",
  fundingUnlockGuard(depositActionSource, mobileFormSource, cardBridgeSource, dispositionSource, pageSource));
if (red) check("plant: an unlocked tab-key release is caught",
  !fundingUnlockGuard(depositActionSource, mobileFormSource, cardBridgeSource,
    dispositionSource.replace("withLock(`wallet:${ownerId}`", "withoutLock(`wallet:${ownerId}`"), pageSource));
const keyedActionGuard = (source: string) => source.includes("if ((!idempotencyKey")
  && source.indexOf("if ((!idempotencyKey") < source.indexOf("const result = await deposit(");
check("all deposit actions refuse an unkeyed payment before dispatch", keyedActionGuard(depositActionSource));
if (red) check("plant: an unkeyed charge path is caught",
  !keyedActionGuard(depositActionSource.replace("if ((!idempotencyKey", "if (false && (!idempotencyKey")));
const ambiguousActionGuard = (source: string) => source.includes("if (data.recoveryRequired) redirect(`/wallet/deposit/wait?key=${encodeURIComponent(idempotencyKey!)}` as never);")
  && source.indexOf("if (data.redirectUrl)") < source.indexOf("if (data.recoveryRequired)")
  && source.indexOf("if (data.recoveryRequired)") < source.indexOf("if (journeyFlow) redirect");
check("ambiguous classic and focused outcomes keep the original key in owned recovery", ambiguousActionGuard(depositActionSource));
if (red) check("plant: reminting after an ambiguous answer is caught", !ambiguousActionGuard(depositActionSource.replace("if (data.recoveryRequired)", "if (false)")));
const cardRecoveryGuard = (source: string) => source.includes("gate.inert = true;")
  && source.includes("if (gate.inert || window.sessionStorage.getItem(fundingKey(ownerId)))")
  && source.includes('form.addEventListener("submit", submit, true)');
check("Card recovery still blocks a submit after the route reuses an enabled form", cardRecoveryGuard(cardBridgeSource));
if (red) check("plant: a Card bridge without the submit-time recovery lock is caught",
  !cardRecoveryGuard(cardBridgeSource.replace("if (gate.inert || window.sessionStorage.getItem(fundingKey(ownerId)))", "if (false)")));

const marked = (id: string, at: number) => ({ id, userId: "s9_a", marketId: "mkt_target", side: "YES", stake: 5_000,
  placedAt: iso(at), origin: "deposit_return" });
const d1 = row("txn_measure_1", "s9_a", "CONFIRMED", now - 120_000, "mkt_target.YES.5000");
const d2 = row("txn_measure_2", "s9_a", "CONFIRMED", now - 90_000, "mkt_target.YES.5000");
const round = { ...row("txn_measure_round", "s9_a", "CONFIRMED", now - 80_000, "mkt_target.YES.5000"),
  pendingBet: { v: 1, bet: "udr_target.UP.5000", returnPath: "/updown/udr_target" } };
const one = depositReturnMeasure([d1, d2, round], [marked("pos_one", now - 60_000)]);
const two = depositReturnMeasure([d1, d2, round], [marked("pos_one", now - 60_000), marked("pos_two", now - 30_000)]);
check("one origin-marked position never satisfies two overlapping deposits", one.eligibleMarketDeposits === 2 && one.matchedMarketDeposits === 1);
check("a second distinct manual position can satisfy the other deposit", two.matchedMarketDeposits === 2);
check("round intents are reported separately from question positions", two.eligibleRoundDeposits === 1);
check("a confirmed row without a valid completion is absent from the origin-backed denominator",
  depositReturnMeasure([{ ...d1, completedAt: null }], []).eligibleMarketDeposits === 0);
check("a legacy unmarked position does not inflate the return measure",
  depositReturnMeasure([d1], [{ ...marked("pos_legacy", now - 60_000), origin: null }]).matchedMarketDeposits === 0);

if (!red) {
  const player = async (id: string, suffix: string) => {
    await db.user.create({ id, phoneE164: `+255760${suffix}`, passwordHash: null, passwordSalt: null,
      failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
      displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
      marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
      createdAt: iso(now), updatedAt: iso(now), lastLoginAt: null, closedAt: null } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 100_000, pending: 0, hold: 0,
      currency: "TZS", status: "ACTIVE", createdAt: iso(now), updatedAt: iso(now) } as never);
  };
  await player("s9_ret_a", "000101");
  await player("s9_ret_b", "000102");
  const market = await createMarket({ titleEn: "Return attribution", titleSw: "Soko la kurudi", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves from the official source.",
    resolutionAt: iso(now + 7 * 86_400_000), proposedBy: "test" } as never);
  const bet = `${market.id}.YES.5000`;
  const own = row("txn_s9_own", "s9_ret_a", "CONFIRMED", now - 60_000, bet);
  const failed = row("txn_s9_failed", "s9_ret_a", "FAILED", now - 60_000, bet);
  const old = row("txn_s9_old", "s9_ret_a", "CONFIRMED", now - 31 * 60_000, bet);
  await db.txn.create(own as never); await db.txn.create(failed as never); await db.txn.create(old as never);
  const place = (userId: string, idempotencyKey: string, returnDepositId: string) =>
    buyPosition(userId, { marketId: market.id, side: "YES", stake: 5_000, idempotencyKey, returnDepositId });
  const first = await place("s9_ret_a", "s9_ret_key_1", own.id);
  check("real money path places the first manual bet", first.ok && !!first.data?.positionId);
  if (!first.ok || !first.data) throw new Error("fixture bet did not land");
  const stored = await positionStore.get(first.data.positionId);
  check("the new position persists deposit_return", stored?.origin === "deposit_return");
  const replay = await place("s9_ret_a", "s9_ret_key_1", failed.id);
  const afterReplay = await positionStore.get(first.data.positionId);
  check("a same-key replay cannot rewrite origin", replay.ok && replay.data?.replayed === true && afterReplay?.origin === "deposit_return");
  const foreign = await place("s9_ret_b", "s9_ret_key_2", own.id);
  check("a foreign row cannot mark a real bet", foreign.ok && !!foreign.data && (await positionStore.get(foreign.data.positionId))?.origin == null);
  const rejected = await place("s9_ret_a", "s9_ret_key_3", failed.id);
  check("a failed row cannot mark a real bet", rejected.ok && !!rejected.data && (await positionStore.get(rejected.data.positionId))?.origin == null);
  const late = await place("s9_ret_a", "s9_ret_key_4", old.id);
  check("an expired return cannot mark a real bet", late.ok && !!late.data && (await positionStore.get(late.data.positionId))?.origin == null);
}
process.stdout.write(`S9 deposit return: ${passed} passed, 0 failed (${pg ? "Postgres" : "memory"}${red ? ", red plants" : ""})\n`);
