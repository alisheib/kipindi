/**
 * Up & Down — THE BETTING WINDOW, and one side per round.
 *
 *   npx tsx scripts/updown-window.test.mts     (npm run test:updown-window)
 *
 * 🔴 E-72. Bets were accepted right up to the closing SECOND. `openRound` wrote
 * `selectionClosedAt: null`, and `isSelectionClosed` then falls back to `resolutionAt` — which
 * for an Up & Down round IS the close instant. The board shows the live price and both frozen
 * targets, so at 21:26:59 on a round closing 21:27:00 a player could watch the price cross a
 * target and stake with about one second of risk.
 *
 * ⛔ AND THE SETTLEMENT REBUILD MAKES IT WORSE, which is why the two ship in one commit.
 * Taking the open from a completed 1-minute bar puts the open 60-120s in the past; on a
 * 3-minute round that is up to two-thirds already played, visible to anyone and bettable by
 * anyone. Shipping open-from-bar WITHOUT the window would widen the hole while looking like a
 * fairness improvement — §5 pins that the two cannot be separated.
 *
 * 🔴 AND ONE ACCOUNT MAY NOT HOLD BOTH SIDES (Ali's decision, 2026-08-04). In a pari-mutuel
 * pool that is a hedge risking only the fee: stake both ways and one leg always wins, so the
 * stake comes back less commission. Near-zero-risk volume, on a platform whose leaderboards
 * and bonus wagering both count volume.
 *
 * ⛔ THE ASSERTIONS ARE ABOUT `buyPosition`, NEVER ABOUT A DISABLED BUTTON. A disabled button
 * is decoration; a device clock 40 seconds fast must not be able to place a bet the server
 * should refuse. Every case below goes through the real money path.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY;

import { assetStore, chainStore, roundStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState, setUpDownConfig,
  __resetUpDownConfig,
} from "../src/lib/server/updown-config.ts";
import { openRound, acquireObservation } from "../src/lib/server/updown-service.ts";
import { roundState } from "../src/lib/server/updown-board.ts";
import { roundPhase } from "../src/lib/updown-card-phase.ts";
import { buyPosition, isSelectionClosed } from "../src/lib/server/market-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { seedDefaultSources, addSource } from "../src/lib/server/source-registry.ts";
import {
  selectionCloseLeadSeconds, selectionClosesAt,
  SELECTION_CLOSE_FRACTION, SELECTION_CLOSE_MIN_SECONDS, ALLOWED_DURATIONS,
} from "../src/lib/updown-durations.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "test fixture", addedBy: "system" });

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE LEAD IS A PROPORTION — pure, and this is the point of the whole design
// ═══════════════════════════════════════════════════════════════════════════
{
  ok("1.1 · a 5-minute round locks for the last 60s (20%)", selectionCloseLeadSeconds(5) === 60, String(selectionCloseLeadSeconds(5)));
  ok("1.2 · a 3-minute round locks for 36s", selectionCloseLeadSeconds(3) === 36, String(selectionCloseLeadSeconds(3)));
  ok("1.3 · a 15-minute round locks for 180s", selectionCloseLeadSeconds(15) === 180, String(selectionCloseLeadSeconds(15)));
  ok("1.4 · an hour-long round locks for 12 minutes", selectionCloseLeadSeconds(60) === 720, String(selectionCloseLeadSeconds(60)));

  // ⛔ THE WHOLE REASON THE LEAD IS NOT A CONSTANT. A fixed 30s is a sixth of a 3-minute round
  // but 3% of a 15-minute one and 0.8% of an hour — so it would leave every long duration
  // essentially unprotected while looking like a fix.
  ok("1.5 · ⭐ the lead SCALES with the round — a 60m round locks 20x longer than a 3m one",
     selectionCloseLeadSeconds(60) / selectionCloseLeadSeconds(3) === 20,
     `${selectionCloseLeadSeconds(60)} vs ${selectionCloseLeadSeconds(3)}`);
  ok("1.6 · ⭐ every allowed duration locks for at least the floor — none is left unprotected",
     ALLOWED_DURATIONS.every((d) => selectionCloseLeadSeconds(d) >= SELECTION_CLOSE_MIN_SECONDS),
     ALLOWED_DURATIONS.map((d) => `${d}m=${selectionCloseLeadSeconds(d)}s`).join(" "));
  ok("1.7 · the floor wins on a very short round — 20% of 60s would be 12s",
     selectionCloseLeadSeconds(1) === SELECTION_CLOSE_MIN_SECONDS, String(selectionCloseLeadSeconds(1)));
  // ⛔ A misconfigured fraction must not produce a round that is shut before it opens.
  ok("1.8 · the lead can never exceed the round itself",
     selectionCloseLeadSeconds(1, { fraction: 5 }) === 60, String(selectionCloseLeadSeconds(1, { fraction: 5 })));
  ok("1.9 · a zero/negative duration cannot produce a negative lead",
     selectionCloseLeadSeconds(0) === 0 && selectionCloseLeadSeconds(-5) === 0);
  ok("1.10 · the shipped fraction is 20% and the floor 30s",
     SELECTION_CLOSE_FRACTION === 0.2 && SELECTION_CLOSE_MIN_SECONDS === 30);

  // The instant form
  const close = "2026-08-04T12:05:00.000Z";
  ok("1.11 · selectionClosesAt is the close minus the lead",
     selectionClosesAt(close, 5) === "2026-08-04T12:04:00.000Z", String(selectionClosesAt(close, 5)));
  ok("1.12 · an unparseable close yields null rather than an Invalid Date",
     selectionClosesAt("not-a-date", 5) === null);
  // ⚠️ `createMarket` drops a `selectionClosedAt` already in the past, so a lead that swallows
  // the round must produce null rather than an instant at or before the open — a round born
  // locked takes no bets at all and reads as an outage.
  ok("1.13 · ⭐ a lead that swallows the whole round yields null, never a locked-at-birth round",
     selectionClosesAt(close, 0) === null);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE PLAYER-VISIBLE STATE — four, not three
// ═══════════════════════════════════════════════════════════════════════════
{
  const r = { outcome: null, boundaryAt: "", closesAt: "" } as never as Parameters<typeof roundState>[0];
  const closeMs = Date.parse("2026-08-04T12:05:00.000Z");
  const lockIso = "2026-08-04T12:04:00.000Z";

  ok("2.1 · before the lock the round is OPEN",
     roundState(r, closeMs, Date.parse("2026-08-04T12:03:59.000Z"), lockIso) === "open");
  ok("2.2 · ⭐ at the lock it becomes LOCKED — a distinct state, because the player can now do a distinct thing (nothing)",
     roundState(r, closeMs, Date.parse("2026-08-04T12:04:00.000Z"), lockIso) === "locked");
  ok("2.3 · past the close it is CONFIRMING, not locked",
     roundState(r, closeMs, Date.parse("2026-08-04T12:05:01.000Z"), lockIso) === "confirming");
  // ⚠️ A legacy round has no lock instant and stays bettable to its boundary, because that is
  // genuinely what `buyPosition` does for it. Rendering it locked would be the card lying
  // about a bet the server would still accept.
  ok("2.4 · ⭐ a LEGACY round with no lock instant stays OPEN — the card must not invent a lock the server does not enforce",
     roundState(r, closeMs, Date.parse("2026-08-04T12:04:30.000Z"), null) === "open");
  const decided = { outcome: "UP" } as never as Parameters<typeof roundState>[0];
  ok("2.5 · a decided round is never shown as locked",
     roundState(decided, closeMs, Date.parse("2026-08-04T12:04:30.000Z"), lockIso) === "resolved");
}

// ── Fixtures ────────────────────────────────────────────────────────────────
const nowIso = () => new Date().toISOString();
let seq = 0;
async function fundedUser(id: string, balance: number): Promise<string> {
  await db.user.create({
    id, phoneE164: `+25598${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
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

const alpha = await fundedUser("win_alpha", 100_000);
const echo = await fundedUser("win_echo", 100_000);

const a = await createAsset({
  key: "BTCWIN", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
  priceSourceUrl: "https://api.twelvedata.com/time_series", category: "crypto",
  decimals: 2, minMoveTicks: 2,
}, OFFICER);
if (!a.ok) throw new Error(a.error);
await setAssetEnabled(a.data.id, true, OFFICER);
const asset = (await assetStore.get(a.data.id))!;
const c = await createChain({ assetId: asset.id, durationMinutes: 15 }, OFFICER);
if (!c.ok) throw new Error(c.error);
await setChainState(c.data.id, "RUNNING", OFFICER);
const chain = (await chainStore.get(c.data.id))!;
await setUpDownConfig({ defaultMinStake: 500, feedProvider: "mock-bars" }, OFFICER);

/**
 * A round on its own FUTURE boundary, with a real open price and frozen targets.
 *
 * ⚠️ Each call takes a DISTINCT boundary. `openRound` refuses a round whose close collides
 * with the previous one on the same chain (one round per boundary — correct, and it caught
 * the first version of this fixture handing every section the same minute).
 * ⚠️ And the boundary must be in the FUTURE: `createMarket` refuses a past resolution date
 * and `buyPosition` refuses a stake after it, so a back-dated round cannot be built at all.
 */
let roundSeq = 0;
async function freshRound() {
  const openIso = new Date(Math.floor((Date.now() + ++roundSeq * 20 * 60_000) / 60_000) * 60_000).toISOString();
  const obs = await acquireObservation(asset, openIso);
  if (obs.state !== "confirmed") throw new Error("fixture: open price did not confirm");
  const r = await openRound(chain, openIso, obs.id, obs.price);
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE ROUND CARRIES THE LOCK, AND `buyPosition` ENFORCES IT
// ═══════════════════════════════════════════════════════════════════════════
{
  const round = await freshRound();
  const m = (await marketStore.get(round.marketId))!;

  ok("3.1 · ⭐ the round is born with a lock instant — this was `selectionClosedAt: null`",
     !!m.selectionClosedAt, String(m.selectionClosedAt));
  ok("3.2 · and it is BEFORE the close, by the round's own proportion",
     !!m.selectionClosedAt &&
     Date.parse(m.resolutionAt) - Date.parse(m.selectionClosedAt) === selectionCloseLeadSeconds(15) * 1000,
     `${m.selectionClosedAt} vs close ${m.resolutionAt}`);
  ok("3.3 · a bet is accepted while the window is open",
     (await buyPosition(alpha, { marketId: round.marketId, side: "YES", stake: 1_000 })).ok);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE SERVER REFUSES A BET AFTER THE LOCK — not the button, the money path
// ═══════════════════════════════════════════════════════════════════════════
{
  const round = await freshRound();
  // Move the lock into the past, leaving the CLOSE in the future. That is precisely the
  // window E-72 describes: the round is still running, and it must no longer take bets.
  await marketStore.stamp(round.marketId, {
    selectionClosedAt: new Date(Date.now() - 1000).toISOString(),
    updatedAt: nowIso(),
  } as never);
  const m = (await marketStore.get(round.marketId))!;
  ok("4.1 · the round is still LIVE and its close is still ahead",
     m.status === "LIVE" && Date.parse(m.resolutionAt) > Date.now());
  ok("4.2 · isSelectionClosed agrees the window has shut", isSelectionClosed(m));

  const bet = await buyPosition(echo, { marketId: round.marketId, side: "YES", stake: 1_000 });
  ok("4.3 · ⭐ THE SERVER REFUSES THE BET — a fast device clock cannot buy a known outcome",
     !bet.ok && bet.code === "SELECTION_CLOSED", bet.ok ? "ACCEPTED" : `${bet.code}`);
  ok("4.4 · and it says so in English AND Swahili",
     !bet.ok && /closed/i.test(bet.error) && /umefungwa/i.test(bet.error), bet.ok ? "" : bet.error);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · ⛔ THE WINDOW AND OPEN-FROM-BAR ARE ONE CHANGE
// ═══════════════════════════════════════════════════════════════════════════
//
// Shipping the open move without the window makes the live last-look hole WORSE while looking
// like a fairness improvement, so this pins that a round's bettable stretch is always shorter
// than the round — for every duration the platform offers, including the shortest.
{
  for (const d of ALLOWED_DURATIONS) {
    const total = d * 60;
    const lead = selectionCloseLeadSeconds(d);
    const bettable = total - lead;
    ok(`5.${d} · a ${d}m round is bettable for ${bettable}s of ${total}s, and locked for the last ${lead}s`,
       lead > 0 && bettable > 0 && lead + bettable === total, `lead=${lead} bettable=${bettable}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 · ONE ACCOUNT, ONE SIDE — the hedge that risks only the fee
// ═══════════════════════════════════════════════════════════════════════════
{
  const round = await freshRound();

  const first = await buyPosition(alpha, { marketId: round.marketId, side: "YES", stake: 1_000 });
  ok("6.1 · the first side is accepted", first.ok, first.ok ? "" : first.error);

  const hedge = await buyPosition(alpha, { marketId: round.marketId, side: "NO", stake: 1_000 });
  ok("6.2 · ⭐ the SAME account is refused the opposite side — hedging both ways risks only the fee",
     !hedge.ok, hedge.ok ? "ACCEPTED — the hedge landed" : hedge.error);
  ok("6.3 · and the refusal names the side they already hold, so it does not read as a bug",
     !hedge.ok && /UP/.test(hedge.error), hedge.ok ? "" : hedge.error);
  ok("6.4 · in Swahili too", !hedge.ok && /JUU|CHINI/.test(hedge.error), hedge.ok ? "" : hedge.error);

  // ⭐ Topping up the SAME side is normal play and must still work — a rule that blocked it
  // would stop a player backing their own view harder, which is not what was decided.
  const more = await buyPosition(alpha, { marketId: round.marketId, side: "YES", stake: 1_000 });
  ok("6.5 · ⭐ but MORE on the same side is still fine — this is a hedge rule, not a stake cap",
     more.ok, more.ok ? "" : more.error);

  // ⭐ Two DIFFERENT accounts on opposite sides is what a pari-mutuel market IS.
  const other = await buyPosition(echo, { marketId: round.marketId, side: "NO", stake: 1_000 });
  ok("6.6 · ⭐ a DIFFERENT account takes the other side freely — that is the market working",
     other.ok, other.ok ? "" : other.error);
}

// ═══════════════════════════════════════════════════════════════════════════
// 7 · THE RESULT PHASE MUST BE VISIBLE — and it was not
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 The card decided "am I locked?" from `state`, a prop rendered ONCE on the server. A player
// who opened the board during betting kept `state: "open"` for as long as they sat there, so
// when the lock passed nothing re-evaluated: the countdown hit zero and the caption fell through
// to "Selections closed" over a dead 00:00 for the whole phase. 25 consecutive production
// samples across a full 1-minute phase, not one reading "Result in".
//
// ⛔ The second assertion is the one that matters for money: the buttons must NOT come back.
// Re-targeting the countdown at the close makes the clock "run" again, so a naive open+running
// test reads as bettable for the entire result phase — a control offering what the server refuses.
{
  const OPEN = Date.parse("2026-08-04T12:00:00.000Z");
  const LOCK = OPEN + 3 * 60_000;      // 3 minutes of betting
  const CLOSE = OPEN + 4 * 60_000;     // + a 1-minute result phase
  const at = (ms: number) => roundPhase({ state: "open", selectionClosesAtMs: LOCK, closesAtMs: CLOSE, nowMs: ms });

  ok("7.1 · during betting the round is not locked, and is bettable",
     !at(OPEN + 60_000).locked && at(OPEN + 60_000).bettable);

  ok("7.2 · ⭐ the instant the lock passes the round reads LOCKED — even though the server prop still says 'open'",
     at(LOCK).locked, "this is the stale-prop defect: it stayed 'open' and showed a dead 00:00");
  ok("7.3 · …and stays locked right through the result phase",
     at(LOCK + 1_000).locked && at(CLOSE - 1_000).locked);
  ok("7.4 · ⛔ …and the buttons do NOT come back during it",
     !at(LOCK).bettable && !at(LOCK + 30_000).bettable && !at(CLOSE - 1_000).bettable,
     "a control offering what buyPosition refuses");

  ok("7.5 · at the close it is no longer 'result in' — the countdown has genuinely run out",
     !at(CLOSE).locked && !at(CLOSE + 30_000).locked);

  ok("7.6 · a settled round is never 'locked', whatever the clock says",
     !roundPhase({ state: "resolved", selectionClosesAtMs: LOCK, closesAtMs: CLOSE, nowMs: LOCK + 1_000 }).locked &&
     !roundPhase({ state: "void", selectionClosesAtMs: LOCK, closesAtMs: CLOSE, nowMs: LOCK + 1_000 }).locked);

  ok("7.7 · the SERVER's verdict still wins when it says locked",
     roundPhase({ state: "locked", selectionClosesAtMs: null, closesAtMs: CLOSE, nowMs: OPEN }).locked);

  ok("7.8 · a legacy round with no lock instant is bettable to its close, not locked early",
     roundPhase({ state: "open", selectionClosesAtMs: null, closesAtMs: CLOSE, nowMs: CLOSE - 1_000 }).bettable &&
     !roundPhase({ state: "open", selectionClosesAtMs: null, closesAtMs: CLOSE, nowMs: CLOSE - 1_000 }).locked);

  // ── 7b · UD-2 · the ROUND PAGE's action rail actually consumes this rule ──
  //
  // E-82's defect survived its own fix once already, in exactly this branch: the pod was
  // made instant-driven (E-104) while the STAKE PANEL beside it stayed keyed to a
  // server-rendered `round.state === "open"` — live chips and a gold Confirm for up to
  // 20s after the lock. The rule alone cannot prevent that; only its ADOPTION can, so
  // adoption is asserted: the panel derives from `roundPhase` on the server-anchored
  // clock, and the page routes both open and locked states through it rather than
  // rendering the stake panel off the raw prop.
  const { readFileSync } = await import("node:fs");
  const rail = readFileSync(new URL("../src/components/updown/round-action-panel.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/app/updown/[roundId]/page.tsx", import.meta.url), "utf8");
  ok("7b.1 · the round page's action rail derives its phase from roundPhase + useServerNow",
     /roundPhase\(\{ state, selectionClosesAtMs, closesAtMs/.test(rail) && /useServerNow\(/.test(rail));
  ok("7b.2 · ⛔ the page renders the rail for BOTH open and locked — never RoundStakePanel off the raw prop",
     /isOpen \|\| locked \? \(/.test(page) && /<RoundActionPanel/.test(page) && !/<RoundStakePanel/.test(page));
  ok("7b.3 · the quick-bet hook itself refuses a tap past the lock (the belt under the panel)",
     /lockPassed \|\| lockedByServer/.test(
       readFileSync(new URL("../src/components/updown/use-quick-bet.ts", import.meta.url), "utf8")));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${fail === 0 ? "✅" : "🔴"} updown-window: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
