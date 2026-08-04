/**
 * Up & Down — A LATE CLOSE MUST SETTLE, NOT VOID.
 *
 *   npx tsx scripts/updown-late-close.test.mts     (npm run test:updown-late-close)
 *
 * 🔴 THE FINDING THIS PINS (E-69, production, 2026-08-03). Round `udr_01e034350b3c5d648ac3`
 * opened against a validated price of 63,672.01 and **voided with `closePrice NULL`**, because
 * nothing performed its close at the boundary: it resolved **529 seconds late** while the log
 * repeated *"not the leader — chores skipped"*. **The source never failed.** A player's stake
 * was refunded for a round the market had decided perfectly clearly.
 *
 * That was unavoidable while settlement read `/quote`, which can only answer "the price NOW".
 * It is not unavoidable against a DATED feed: `time_series` returns the bar labelled T whether
 * asked at T+5s or T+6h, and its `open` was measured immutable from first publication. So the
 * healer's past-deadline branch — which voided **without re-reading** — had to be inverted.
 *
 * ⛔ AND THE INVERSION HAD TO BE CONDITIONAL, WHICH IS THE PART THAT IS EASY TO GET WRONG.
 * The old behaviour is still CORRECT for a quote feed, for two independent reasons: a late
 * quote describes a late instant and cannot honestly settle the boundary, and re-dialling a
 * paid provider across a backlog costs real money to learn nothing. §4 pins that the quote
 * path is unchanged, so a "fix" that simply always re-reads fails this suite.
 *
 * ── THE SECOND DEFECT, WHICH THE FIRST ONE HIDES ─────────────────────────────
 * The retry ladder's first attempt is taken AT the boundary (`retryBackoffSeconds[0]` is 0),
 * and the bar labelled T does not exist yet. `no-bar` deliberately burns the attempt budget,
 * so under the bar reader **every round would start one life down for a bar that had not
 * published yet** — and a spent budget declares the boundary FAILED, voiding a round whose
 * price published perfectly well moments later. E-69's own shape, reintroduced by its own fix.
 *
 * ⚠️ AND THE PUBLICATION DELAY IS PER-SYMBOL, WHICH THE FIRST MEASUREMENT MISSED.
 * BTC/USD, ETH/USD and XAU/USD publish bar T at **+10s**; **SOL/USD takes +60s** — six times
 * longer. The first version of this suite asserted a 30s grace, measured on three symbols and
 * generalised to four. A grace tuned to the fastest symbol charges the slowest one an attempt
 * at every single boundary and walks its budget to zero, which is exactly how SOL came to be
 * **290 of 290 rounds source-failed** (E-63). The grace is sized against the SLOWEST symbol
 * offered, and §1.10 pins the number so a future symbol cannot quietly inherit a bad one.
 *
 * ⭐ It also is NOT that SOL lacks bars — a contiguous 5-hour pull returned **300/300 minutes
 * present, 0 missing**, on every symbol. SOL's bars are LATE, not absent, and those two call
 * for opposite responses: one is a grace, the other would be a reason not to offer the asset.
 *
 * §1 and §3 pin both halves. The RED harness (`updown-late-close-red.mjs`) proves each one
 * catches the defect it names by putting the defect back.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY;

import { assetStore, chainStore, roundStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState, setUpDownConfig, getUpDownConfig,
  __resetUpDownConfig, abandonAfterSeconds, DEFAULT_UPDOWN_CONFIG,
  refusalCostsAnAttempt, lateCloseDecision,
} from "../src/lib/server/updown-config.ts";
import { openRound, healStuckRounds, acquireObservation } from "../src/lib/server/updown-service.ts";
import { buyPosition } from "../src/lib/server/market-service.ts";
import { seedDefaultSources, addSource } from "../src/lib/server/source-registry.ts";
import { findProvider, FEED_PROVIDERS } from "../src/lib/updown-providers.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "test fixture", addedBy: "system" });

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE PUBLICATION GRACE — pure, so the money rule is exhaustible
// ═══════════════════════════════════════════════════════════════════════════
{
  const cfg = { barPublicationGraceSeconds: 120 };

  ok("1.1 · ⭐ a bar that has not published YET costs no attempt, inside the grace",
     refusalCostsAnAttempt("bar-not-published", 5, cfg) === false);
  ok("1.2 · ⭐ …and that holds at the exact instant of the first attempt (+0s), which is when the ladder always asks",
     refusalCostsAnAttempt("bar-not-published", 0, cfg) === false);
  ok("1.3 · at the grace boundary it is still 'not yet' — the bound is exclusive",
     refusalCostsAnAttempt("bar-not-published", 120, cfg) === false);
  ok("1.4 · ⭐ past the grace it means NEVER and DOES burn — or the round waits forever for a reading that is not coming",
     refusalCostsAnAttempt("bar-not-published", 121, cfg) === true);
  ok("1.5 · a suspect print always burns — retrying cannot make a bad tick good",
     refusalCostsAnAttempt("unparseable-price", 5, cfg) === true);
  ok("1.6 · a stale reading always burns", refusalCostsAnAttempt("stale", 5, cfg) === true);
  ok("1.7 · the operator-state carve-out is preserved — a missing key must not void live rounds",
     refusalCostsAnAttempt("no-api-key", 999, cfg) === false);
  ok("1.8 · …and a paused AI likewise", refusalCostsAnAttempt("ai-paused", 999, cfg) === false);
  // ⛔ The grace is a per-config value, not a constant. A hardcoded 30 would pass every case
  // above while ignoring an operator who tightened it.
  ok("1.9 · the grace is read from CONFIG, not hardcoded",
     refusalCostsAnAttempt("bar-not-published", 20, { barPublicationGraceSeconds: 10 }) === true);
  // ⛔ 120, NOT 30. Sized against the SLOWEST symbol (SOL publishes bar T at +60s; BTC, ETH
  // and XAU at +10s). The first version of this suite asserted 30 — measured on three symbols
  // and generalised to four, which would have charged SOL an attempt at every boundary.
  ok("1.10 · the shipped default is 120s — 2x the measured +60s worst-case publication delay",
     DEFAULT_UPDOWN_CONFIG.barPublicationGraceSeconds === 120, String(DEFAULT_UPDOWN_CONFIG.barPublicationGraceSeconds));
  // The grace must stay well inside the ladder, or a bar that genuinely never publishes
  // would ride out the deadline instead of failing the boundary on time.
  ok("1.11 · the grace is far shorter than the ladder it sits inside",
     DEFAULT_UPDOWN_CONFIG.barPublicationGraceSeconds * 2 < abandonAfterSeconds(DEFAULT_UPDOWN_CONFIG),
     `${DEFAULT_UPDOWN_CONFIG.barPublicationGraceSeconds} vs ${abandonAfterSeconds(DEFAULT_UPDOWN_CONFIG)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE LATE-CLOSE DECISION — pure, and driven off the PROVIDER'S OWN flag
// ═══════════════════════════════════════════════════════════════════════════
{
  const cfg = { maxSettleLookbackSeconds: 86_400 };

  ok("2.1 · ⭐ a DATED feed re-reads a late boundary — this is the whole rebuild",
     lateCloseDecision({ dated: true }, 529, cfg).reread === true);
  const quote = lateCloseDecision({ dated: false }, 529, cfg);
  ok("2.2 · ⭐ a QUOTE feed does NOT — a late quote describes a late instant, and re-dialling costs money to learn nothing",
     quote.reread === false && !quote.reread && quote.why === "feed-cannot-answer-about-the-past",
     JSON.stringify(quote));
  const beyond = lateCloseDecision({ dated: true }, 86_401, cfg);
  ok("2.3 · ⭐ 'late' is BOUNDED — beyond the lookback even a dated feed voids, so every stake still reaches a terminal state",
     beyond.reread === false && !beyond.reread && beyond.why === "beyond-the-lookback", JSON.stringify(beyond));
  ok("2.4 · at the lookback boundary it still re-reads — the bound is exclusive",
     lateCloseDecision({ dated: true }, 86_400, cfg).reread === true);
  // ⛔ Defaulting an unknown provider to "dated" would let an unrecognised id silently unlock
  // a path its feed cannot honour.
  ok("2.5 · an UNKNOWN provider is treated as not-dated, never the reverse",
     lateCloseDecision(undefined, 10, cfg).reread === false);
  ok("2.6 · a provider with no `dated` flag is treated as not-dated",
     lateCloseDecision({}, 10, cfg).reread === false);

  // The decision must come from the shared provider list, so a new dated provider cannot be
  // left behind by this rule — the `[5, 15, 30]` failure applied to settlement.
  ok("2.7 · ⭐ the real bar provider is marked dated in the SHARED list",
     findProvider("twelvedata-bars")?.dated === true);
  ok("2.8 · …and the quote provider is not", !findProvider("twelvedata")?.dated);
  ok("2.9 · every provider the platform offers has a decision — none falls through unclassified",
     FEED_PROVIDERS.every((p) => typeof lateCloseDecision(p, 10, cfg).reread === "boolean"));
  ok("2.10 · the shipped lookback is 24h", DEFAULT_UPDOWN_CONFIG.maxSettleLookbackSeconds === 86_400,
     String(DEFAULT_UPDOWN_CONFIG.maxSettleLookbackSeconds));
}

// ── Fixtures for the integration sections ────────────────────────────────────
const nowIso = () => new Date().toISOString();
let seq = 0;
async function fundedUser(id: string, balance: number): Promise<string> {
  await db.user.create({
    id, phoneE164: `+25597${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso(), updatedAt: nowIso(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: nowIso(), updatedAt: nowIso(),
  } as never);
  return id;
}
const balanceOf = async (id: string) => (await db.wallet.findByUserId(id))?.balance ?? 0;

const START = 100_000;
const alpha = await fundedUser("late_alpha", START);

// ⚠️ A REAL CRYPTO SYMBOL ON A CRYPTO CALENDAR. `validateSymbolCategory` (E-46) refuses gold
// wearing a crypto category, and that fixture mistake has silently killed THREE suites in this
// repo. 24/7 also keeps the verdict independent of the day the suite runs.
const a = await createAsset({
  key: "BTCLATE", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
  priceSourceUrl: "https://api.twelvedata.com/time_series", category: "crypto",
  decimals: 2, minMoveTicks: 2,
}, OFFICER);
if (!a.ok) throw new Error(a.error);
await setAssetEnabled(a.data.id, true, OFFICER);
const asset = (await assetStore.get(a.data.id))!;

const c = await createChain({ assetId: asset.id, durationMinutes: 5 }, OFFICER);
if (!c.ok) throw new Error(c.error);
await setChainState(c.data.id, "RUNNING", OFFICER);
const chain = (await chainStore.get(c.data.id))!;
const anchorMs = Date.parse(chain.gridAnchorAt);
// Rounds are opened on FUTURE boundaries and the clock is then injected — `createMarket`
// refuses a past resolution date and `buyPosition` refuses a stake after it, so a back-dated
// round cannot be built through the real code at all. The clock moves, not the rows.
const B = (k: number) => new Date(anchorMs + k * 5 * 60_000).toISOString();
await setUpDownConfig({ defaultMinStake: 500 }, OFFICER);

// ═══════════════════════════════════════════════════════════════════════════
// 3 · E-69 REPRODUCED, THEN SETTLED — a real stake, closed 529s late
// ═══════════════════════════════════════════════════════════════════════════
//
// The numbers are the production incident's own: 529 seconds past the boundary, which is
// comfortably beyond the 390s abandon deadline, so this round takes the branch that used to
// void without looking.
{
  await setUpDownConfig({ feedProvider: "mock-bars" }, OFFICER);

  // ⛔ THE ROUND MUST OPEN WITH A REAL PRICE, OR THIS SECTION TESTS THE WRONG DEFECT.
  // The first version of this fixture opened with `(null, null)` and the round duly voided —
  // but for E-63's reason (a round opened without an open price can never decide), not
  // E-69's. It read as a failing fix while the fix was working: the close price was real and
  // correctly dated, and the verdict was still VOID. E-69's round opened at a VALIDATED
  // 63,672.01 and had targets; only its CLOSE was missed. That is what is reproduced here.
  const openObs = await acquireObservation(asset, B(100));
  ok("3.0 · the round opens against a confirmed price, exactly as E-69's did",
     openObs.state === "confirmed", JSON.stringify(openObs));
  if (openObs.state !== "confirmed") throw new Error("fixture: the open price did not confirm");
  const opened = await openRound(chain, B(100), openObs.id, openObs.price);
  if (!opened.ok) throw new Error(opened.error);
  const roundId = opened.data.id;
  const boundary = (await roundStore.get(roundId))!.boundaryAt;
  ok("3.0b · …and therefore carries frozen winning targets",
     (await roundStore.get(roundId))!.upTarget != null);

  const bet = await buyPosition(alpha, { marketId: opened.data.marketId, side: "YES", stake: 500 });
  ok("3.1 · a real stake enters the round", bet.ok, bet.ok ? "" : bet.error);
  ok("3.2 · the money has left the wallet", (await balanceOf(alpha)) === START - 500);

  const cfg = await getUpDownConfig();
  const lateBy = 529; // E-69's own lateness, to the second
  ok("3.3 · 529s is genuinely past the abandon deadline — this is the branch that used to void blind",
     lateBy > abandonAfterSeconds(cfg), `${lateBy}s vs ${abandonAfterSeconds(cfg)}s`);

  await healStuckRounds({ now: Date.parse(boundary) + lateBy * 1000 });

  const r = (await roundStore.get(roundId))!;
  ok("3.4 · ⭐ THE ROUND SETTLED INSTEAD OF VOIDING — E-69's exact scenario, decided",
     r.outcome === "UP" || r.outcome === "DOWN", `outcome=${r.outcome} voidReason=${r.voidReason}`);
  ok("3.5 · ⭐ and it has a REAL close price — E-69's round had `closePrice NULL`",
     r.closePrice != null && r.closePrice > 0, String(r.closePrice));
  ok("3.6 · the close is bound to a stored observation, so the number is re-checkable",
     !!r.closeObservationId);
  ok("3.7 · the money moved — resolved AND settled", !!r.resolvedAt && !!r.settledAt,
     `resolved=${r.resolvedAt} settled=${r.settledAt}`);

  // ⛔ The strongest assertion in the suite: the price a LATE close reads must be the price an
  // ON-TIME close would have read. If it is not, "a late close is harmless" is false and the
  // round merely settled on a different number — which is worse than voiding.
  // ⚠️ NO `!` HERE, AND THAT IS NOT STYLE. When the defect is present `closeObservationId` is
  // null, so the first version of this line threw — and a THROWN assertion never reaches the
  // suite's summary, so the RED harness scored a guard that was working perfectly as a MISS.
  // An assertion must fail informatively; only the harness may decide what a failure means.
  const obs = r.closeObservationId ? await observationStore.get(r.closeObservationId) : null;
  ok("3.8 · ⭐ the observation's own quoted time IS the boundary — the late reading is the SAME reading, not a fresh one",
     !!obs && obs.sourceQuotedAt === boundary, `${obs?.sourceQuotedAt ?? "no close observation"} vs ${boundary}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE QUOTE PATH IS UNCHANGED — a "fix" that always re-reads fails here
// ═══════════════════════════════════════════════════════════════════════════
//
// This is the half a careless inversion breaks. `test:updown-heal` §3 proves the same
// invariant from the other side (attempts must not move); this proves the OUTCOME.
{
  await setUpDownConfig({ feedProvider: "mock" }, OFFICER);
  const opened = await openRound(chain, B(110), null, null);
  if (!opened.ok) throw new Error(opened.error);
  const roundId = opened.data.id;
  const boundary = (await roundStore.get(roundId))!.boundaryAt;
  const obs = await observationStore.ensure(asset.id, boundary);
  await observationStore.recordAttempt(obs.id, "the source could not be read");
  const before = (await observationStore.get(obs.id))!.attempts;

  await healStuckRounds({ now: Date.parse(boundary) + 3600 * 1000 });

  const after = (await observationStore.get(obs.id))!;
  ok("4.1 · ⭐ a QUOTE feed does NOT re-dial past the deadline — attempts did not move",
     after.attempts === before, `${before} -> ${after.attempts}`);
  const r = (await roundStore.get(roundId))!;
  ok("4.2 · ⭐ and the round still VOIDS + refunds, exactly as before",
     r.outcome === "VOID" && !!r.resolvedAt, `${r.outcome}`);
  ok("4.3 · the observation records WHY, in words an operator can act on",
     after.state === "FAILED" && /abandoned/i.test(after.failReason ?? ""), `${after.state}: ${after.failReason}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · THE LOOKBACK IS ENFORCED — 'late' never becomes 'unbounded'
// ═══════════════════════════════════════════════════════════════════════════
{
  await setUpDownConfig({ feedProvider: "mock-bars" }, OFFICER);
  const opened = await openRound(chain, B(120), null, null);
  if (!opened.ok) throw new Error(opened.error);
  const roundId = opened.data.id;
  const boundary = (await roundStore.get(roundId))!.boundaryAt;

  // A week late — far beyond the 24h lookback, on a DATED feed that could technically answer.
  await healStuckRounds({ now: Date.parse(boundary) + 7 * 86_400 * 1000 });

  const r = (await roundStore.get(roundId))!;
  ok("5.1 · ⭐ a week-old round VOIDS even on a dated feed — the stake still reaches a terminal state",
     r.outcome === "VOID" && !!r.resolvedAt, `${r.outcome}`);
  ok("5.2 · and it is settled, not left hanging", !!r.settledAt);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 · THE WRITE-ONCE LEDGER IS NOT RELAXED
// ═══════════════════════════════════════════════════════════════════════════
//
// ⛔ The late read skips the backoff and the attempt budget. It must NOT skip the FAILED
// terminal state: the ledger is write-once per (assetId, boundaryAt) so that round N's close
// is byte-identical to round N+1's open, and no late-settlement convenience is worth that.
{
  await setUpDownConfig({ feedProvider: "mock-bars" }, OFFICER);
  const opened = await openRound(chain, B(130), null, null);
  if (!opened.ok) throw new Error(opened.error);
  const roundId = opened.data.id;
  const boundary = (await roundStore.get(roundId))!.boundaryAt;
  const obs = await observationStore.ensure(asset.id, boundary);
  await observationStore.fail(obs.id, "declared failed before the late sweep ran");

  await healStuckRounds({ now: Date.parse(boundary) + 600 * 1000 });

  const after = (await observationStore.get(obs.id))!;
  ok("6.1 · ⭐ a FAILED observation is never revived, even by the late-close path",
     after.state === "FAILED" && after.price == null, `${after.state} price=${after.price}`);
  const r = (await roundStore.get(roundId))!;
  ok("6.2 · and its round voids on that recorded failure, not on a second opinion",
     r.outcome === "VOID", String(r.outcome));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${fail === 0 ? "✅" : "🔴"} late-close: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
