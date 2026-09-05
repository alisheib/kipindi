/**
 * Up & Down quick-bet — the one-tap card path.
 *
 *   npx tsx scripts/updown-quickbet.test.mts   (npm run test:updown-quickbet)
 *
 * The card places through the SAME `buyPosition` the conviction dial uses (no parallel
 * money path) and shows the viewer's OWN live stake per side ("you're in") straight from
 * `getBoard({ userId })`. This proves both:
 *   • the action path — a tap places, a double-submit pays ONCE, distinct taps stack,
 *     a closed round / over-balance / over-max are all refused BY THE SERVER; and
 *   • the read model — myUpStake/myDownStake is per-viewer, per-side, OPEN-only, and
 *     never leaks one player's position to another (or to a signed-out board).
 *
 * If any of this drifts, the fast-game promise ("bet a lot in one tap, see it instantly")
 * either loses money (double-charge) or lies (wrong "you're in").
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { db } from "../src/lib/server/store.ts";
import { buyPosition, MAX_STAKE } from "../src/lib/server/market-service.ts";
import { getBoard } from "../src/lib/server/updown-board.ts";
import { createAsset, setAssetEnabled, createChain, setChainState, stakeBoundsFor, __resetUpDownConfig } from "../src/lib/server/updown-config.ts";
import { chainStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import { openRound, closeRound } from "../src/lib/server/updown-service.ts";
import { seedDefaultSources, addSource } from "../src/lib/server/source-registry.ts";
import { parseStake, quickStakes, stakeIsValid } from "../src/components/updown/stake-math.ts";

import "./lib/verified-fixtures.mts";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "spot", addedBy: "system" });
// ⚠️ The fixture below is a 24/7 CRYPTO asset (gold is 15m+ only since 2026-08-04, and
// these suites are not about gold). `isSourceTrusted` matches on (domain, category), so the
// same domain needs a crypto row as well — exactly what `updown-heal` already does.
try { await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" }); } catch { /* already present */ }

let seq = 0;
async function funded(id: string, bal: number): Promise<string> {
  await db.user.create({
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: bal, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never);
  return id;
}

const alice = await funded("qb_alice", 1_000_000);
const bob = await funded("qb_bob", 1_000_000);
const broke = await funded("qb_broke", 10_000);

// ── An UPDOWN round, open for betting ────────────────────────────────────────
const asset = await createAsset({ key: "XAU", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币", iconKey: "crypto", priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "crypto", decimals: 2, minMoveTicks: 2 }, "off");
if (!asset.ok) throw new Error(asset.error);
await setAssetEnabled(asset.data.id, true, "off");
// ⛔ 2026-08-14: the admin door now REFUSES a sub-floor minimum (the platform floor is a
// rule, not a setting), so the legacy row §0 is about is written through the DAL rather
// than created through the door. The floor-on-READ below is what §0 actually tests, and
// it must keep working for rows that predate the door.
const chainR = await createChain({ assetId: asset.data.id, durationMinutes: 5, minStake: 1_000, maxStake: 50_000 }, "off");
if (!chainR.ok) throw new Error(chainR.error);
await chainStore.patch(chainR.data.id, { minStake: 100 });   // the legacy row, as it exists on disk
await setChainState(chainR.data.id, "RUNNING", "off");
const chain = (await chainStore.get(chainR.data.id))!;

// ── 0 · STAKE FLOOR — a chain stored with a below-floor min (100, legacy) must never
//        surface a sub-floor bound; the product default (1,000) is the hard floor. ─────
{
  const b = await stakeBoundsFor(chain);
  ok("0.1 · a stale chain min (100) is floored to the platform min (1,000)", b.min === 1_000, `got ${b.min}`);
  ok("0.2 · the chain's own higher max is preserved", b.max === 50_000, `got ${b.max}`);
}

// A round that is OPEN RIGHT NOW: opened 2 min ago (so the board shows it —
// `opensAt <= now` is load-bearing), closing 3 min out (so betting is allowed —
// `resolutionAt > now`, with comfortable margin for the whole test to run).
const nowMs = Date.now();
const openMs = nowMs - 2 * 60_000;
const openIso = new Date(openMs).toISOString();
const closeIso = new Date(openMs + 5 * 60_000).toISOString();
async function confirm(iso: string, price: number) {
  const o = await observationStore.ensure(asset.data.id, iso);
  await observationStore.confirm(o.id, { price, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: iso, evidence: `q ${price}`, confidence: 95, model: "t", rawHash: `h${price}${iso}` });
  return o.id;
}
const oo = await confirm(openIso, 2400);
const r = await openRound(chain, openIso, oo, 2400);
if (!r.ok) throw new Error(r.error);
const marketId = r.data.marketId;

// The viewer's per-side open stake, exactly as the card reads it.
async function mine(userId: string | undefined): Promise<{ up: number; down: number }> {
  const board = await getBoard({ assetKey: "XAU", durationMinutes: 5, userId });
  const round = board.rounds.find((x) => x.marketId === marketId);
  return { up: round?.myUpStake ?? 0, down: round?.myDownStake ?? 0 };
}

// ── 1 · a single tap places ──────────────────────────────────────────────────
{
  const before = (await db.wallet.findByUserId(alice))!.balance;
  const res = await buyPosition(alice, { marketId, side: "YES", stake: 2_000, idempotencyKey: "qb-a-1" });
  ok("1 · a tap places a bet", res.ok, res.ok ? "" : res.error);
  const after = (await db.wallet.findByUserId(alice))!.balance;
  ok("2 · the stake left the wallet exactly once", before - after === 2_000, `moved ${before - after}`);
  const m = await mine(alice);
  ok("3 · the card shows it on the UP side", m.up === 2_000 && m.down === 0, `up ${m.up} down ${m.down}`);
}

// ── 2 · double-submit (SAME key) pays once — the 2G double-tap guard ──────────
{
  const before = (await db.wallet.findByUserId(alice))!.balance;
  const a = await buyPosition(alice, { marketId, side: "YES", stake: 3_000, idempotencyKey: "qb-a-dup" });
  const b = await buyPosition(alice, { marketId, side: "YES", stake: 3_000, idempotencyKey: "qb-a-dup" });
  ok("4 · both idempotent calls report ok", a.ok && b.ok);
  const after = (await db.wallet.findByUserId(alice))!.balance;
  ok("5 · only ONE stake was charged for the duplicate key", before - after === 3_000, `moved ${before - after}`);
  ok("6 · both return the SAME position", a.ok && b.ok && a.data!.positionId === b.data!.positionId);
}

// ── 3 · distinct taps STACK (fast game — many bets in a row) ──────────────────
{
  const before = (await db.wallet.findByUserId(alice))!.balance;
  for (let i = 0; i < 5; i++) {
    const res = await buyPosition(alice, { marketId, side: "YES", stake: 1_000, idempotencyKey: `qb-a-spam-${i}` });
    if (!res.ok) { ok(`7.${i} · rapid tap ${i} placed`, false, res.error); }
  }
  const after = (await db.wallet.findByUserId(alice))!.balance;
  ok("7 · five distinct rapid taps all placed", before - after === 5_000, `moved ${before - after}`);
  const m = await mine(alice);
  // 2,000 + 3,000 (dedup'd) + 5×1,000 = 10,000 on UP.
  ok("8 · 'you're in' sums every distinct UP tap", m.up === 10_000, `up ${m.up}`);
}

// ── 4 · BOTH SIDES, ONE ACCOUNT — and the chip sums each side separately ──────
//
// ⚠️ THIS SECTION HAS NOW SWUNG BACK. Before 2026-08-04 it pinned that the "you're in" chip
// sums each side independently; from 2026-08-04 it pinned a refusal; since 2026-08-14 (Ali,
// docs/RULES.md §2.4) the guard is gone and the ORIGINAL question is live again. The chip's
// implementation never changed through any of it — only the product rule did.
//
// ⭐ What matters here is that the chip tells a player holding BOTH sides the truth about
// each. It is the one surface built on "this state cannot exist", so it is the one most
// likely to have quietly stopped being right while nothing could produce the state.
//
// ⛔ AND THE HEDGE COSTS NO WAGERING PROGRESS — that half is `npm run test:bonus-one-side`,
// because it needs a bonus grant to be visible at all. A green here is half the rule.
{
  const before = (await db.wallet.findByUserId(alice))!.balance;
  const res = await buyPosition(alice, { marketId, side: "NO", stake: 4_000, idempotencyKey: "qb-a-down" });
  ok("9 · ⭐ a DOWN tap is ACCEPTED for an account already holding UP", res.ok, res.ok ? "" : `REFUSED — ${res.error}`);
  const m = await mine(alice);
  const after = (await db.wallet.findByUserId(alice))!.balance;
  ok("10 · ⭐ the chip reads BOTH sides separately, and exactly the DOWN stake left the wallet",
     m.up === 10_000 && m.down === 4_000 && before - after === 4_000, `up ${m.up} down ${m.down} balance ${before}→${after}`);
}

// ── 5 · 'you're in' is PER-VIEWER — never leaks between players ───────────────
{
  await buyPosition(bob, { marketId, side: "NO", stake: 7_000, idempotencyKey: "qb-b-1" });
  const mb = await mine(bob);
  const ma = await mine(alice);
  ok("11 · Bob sees only Bob's stake", mb.up === 0 && mb.down === 7_000, `bob up ${mb.up} down ${mb.down}`);
  // ⚠️ Alice now holds 4,000 DOWN of her own (§4), so "unchanged by BOB's bet" is 10,000/4,000
  // — not 10,000/0. Bob's 7,000 is on the same side as Alice's 4,000, which is exactly the
  // leak this line exists to catch, and it could not have been caught while the guard stood.
  ok("12 · Alice is unchanged by Bob's bet on the SAME side she holds",
     ma.up === 10_000 && ma.down === 4_000, `alice up ${ma.up} down ${ma.down}`);
  const anon = await mine(undefined);
  ok("13 · a signed-out board shows no 'you're in'", anon.up === 0 && anon.down === 0, `anon up ${anon.up} down ${anon.down}`);
}

// ── 6 · server refuses the bad taps ──────────────────────────────────────────
{
  const over = await buyPosition(broke, { marketId, side: "YES", stake: 25_000, idempotencyKey: "qb-broke" });
  ok("14 · over-balance is refused", !over.ok, over.ok ? "charged an over-balance bet!" : over.error);
  const bal = (await db.wallet.findByUserId(broke))!.balance;
  ok("15 · a refused bet moved no money", bal === 10_000, `balance ${bal}`);

  const huge = await buyPosition(alice, { marketId, side: "YES", stake: MAX_STAKE + 1, idempotencyKey: "qb-huge" });
  ok("16 · over-max stake is refused", !huge.ok, huge.ok ? "accepted an over-max stake!" : "");

  const zero = await buyPosition(alice, { marketId, side: "YES", stake: 0, idempotencyKey: "qb-zero" });
  ok("17 · a zero stake is refused", !zero.ok);

  const frac = await buyPosition(alice, { marketId, side: "YES", stake: 150.5 as never, idempotencyKey: "qb-frac" });
  ok("18 · a fractional stake is refused", !frac.ok);
}

// ── 6B · CUSTOM stake — the free-typed amount (client math + server placement) ──
{
  // Pure stake math (the client's placement gate — buyPosition re-validates server-side).
  ok("20 · parseStake reads a grouped amount", parseStake("1,250") === 1_250, `got ${parseStake("1,250")}`);
  ok("21 · parseStake rejects empty / non-numeric / zero",
     parseStake("") === null && parseStake("abc") === null && parseStake("0") === null);
  ok("22 · quickStakes stays within [min,max] and dedupes",
     quickStakes(100, 50_000).every((s) => s >= 100 && s <= 50_000) && new Set(quickStakes(100, 50_000)).size === quickStakes(100, 50_000).length);
  // The chain here is min 100 / max 50,000.
  ok("23 · stakeIsValid gates on the chain bounds",
     stakeIsValid("1234", 100, 50_000) && !stakeIsValid("50", 100, 50_000) && !stakeIsValid("60000", 100, 50_000) && !stakeIsValid("", 100, 50_000));

  // A NON-preset custom amount within bounds places through the same path.
  const before = (await db.wallet.findByUserId(alice))!.balance;
  const custom = await buyPosition(alice, { marketId, side: "YES", stake: 1_337, idempotencyKey: "qb-custom-ok" });
  ok("24 · a valid custom amount places", custom.ok, custom.ok ? "" : custom.error);
  const after = (await db.wallet.findByUserId(alice))!.balance;
  ok("25 · exactly the custom amount left the wallet", before - after === 1_337, `moved ${before - after}`);
  const m = await mine(alice);
  ok("26 · the custom amount joins the UP 'you're in'", m.up === 10_000 + 1_337, `up ${m.up}`);
}

// ── 7 · a CLOSED round refuses new taps ──────────────────────────────────────
{
  const co = await confirm(closeIso, 2410);
  await closeRound(r.data.id, co, 2410);
  const late = await buyPosition(bob, { marketId, side: "YES", stake: 1_000, idempotencyKey: "qb-late" });
  ok("27 · a closed round refuses a late tap", !late.ok, late.ok ? "accepted a bet on a closed round!" : late.error);
}

// ═══════════════════════════════════════════════════════════════════════════
// 28 · THE DEFAULT LANDING — a player with NO query string must reach a PLAYABLE asset
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 `getBoard()` defaulted to `assets[0]`. An enabled asset with NO chains yields
// `durations: []`, which falls to `activeDuration: null` and returns `chainPaused: true` with an
// empty board. So a player landing on `/updown` could be told "no games" while a round was LIVE
// on the very next asset.
//
// ⛔ THE OPERATOR GUIDE ACTIVELY INVITES THIS. It tells the operator to pick whichever asset they
// like, and production has four assets enabled while typically ONE carries a chain. It worked only
// because BTC happened to sort first AND happened to be the asset the chain was built on — build
// the first chain on gold instead and the board goes dark. That is luck, not behaviour.
{
  // A second enabled asset with NO chains, planted BEFORE the playable one in sort order, which
  // is exactly the shape production is one operator decision away from.
  const idle = await createAsset({
    key: "IDLE", symbol: "ETH/USD", nameEn: "Ethereum", nameSw: "Ethereum", nameZh: "以太坊",
    iconKey: "crypto", priceSourceUrl: "https://www.kitco.com/price/precious-metals",
    category: "crypto", decimals: 2, minMoveTicks: 2, sortOrder: -10,
  }, "off");
  if (!idle.ok) {
    ok("28.1 · (setup) an idle enabled asset was created", false, idle.error);
  } else {
    await setAssetEnabled(idle.data.id, true, "off");

    const board = await getBoard({ userId: alice });
    ok("28.1 · ⭐ with no query string the board lands on an asset that HAS a chain",
       board.activeAsset?.key === "XAU",
       `landed on ${board.activeAsset?.key ?? "(none)"} · durations ${JSON.stringify(board.activeAsset?.durations ?? [])}`);
    ok("28.2 · …so a duration resolves and the board is not reported paused",
       board.activeDuration === 5 && board.chainPaused === false,
       `duration ${board.activeDuration} · paused ${board.chainPaused}`);
    // ⛔ An EXPLICIT ask still wins, even onto an idle asset: a player who asked for gold must be
    // told gold is idle, not silently moved somewhere else.
    const asked = await getBoard({ assetKey: "IDLE", userId: alice });
    ok("28.3 · ⛔ an EXPLICIT ?asset= still wins, even onto an idle asset",
       asked.activeAsset?.key === "IDLE" && asked.activeDuration === null,
       `landed on ${asked.activeAsset?.key} · duration ${asked.activeDuration}`);
    // And the idle asset stays VISIBLE in the switcher — hiding it would answer
    // "why isn't gold in the list?" with silence.
    ok("28.4 · …and the idle asset is still listed, not hidden",
       board.assets.some((a) => a.key === "IDLE"));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 29 · UD-4 · the code→copy map — the player reads the dictionary, never the wire
// ═══════════════════════════════════════════════════════════════════════════
//
// Pure, so it is tested here rather than through a browser. The map decides two
// things per refusal: WHAT the player reads (localized, by code) and HOW it is
// presented (§5 matrix: transient → sticky toast; compliance/account → the
// acknowledge-modal). Drift in either direction is a money-trust defect.
{
  const { udBetErrorCopy } = await import("../src/components/updown/updown-bet-errors.ts");
  const dict = {
    udErrSelectionClosed: "closed", udErrRateLimited: "rate", udErrBusy: "busy",
    udErrNotFound: "notfound", udErrInvalid: "invalid",
    udErrSuspendedTitle: "suspT", udErrSuspendedBody: "suspB",
    udErrRgLimitTitle: "rgT", udErrRgLimitBody: "rgB",
  };
  const f = (code?: string, err?: string) => udBetErrorCopy(code, err, dict);

  const closed = f("SELECTION_CLOSED", "Selections are closed — …");
  ok("29.1 · SELECTION_CLOSED → transient sticky toast, localized, AND flips the surface locked",
     closed.kind === "transient" && closed.kind === "transient" && closed.description === "closed" && closed.lockNow === true);
  const rate = f("RATE_LIMITED", "Slow down.");
  ok("29.2 · RATE_LIMITED → transient, localized, no lock",
     rate.kind === "transient" && rate.description === "rate" && rate.lockNow === false);
  const busy = f("BUSY", "…");
  ok("29.3 · BUSY → transient, localized", busy.kind === "transient" && busy.description === "busy");
  const susp = f("SUSPENDED", "Account suspended. Contact support.");
  ok("29.4 · ⛔ SUSPENDED → the acknowledge-modal (LCCP), never a toast",
     susp.kind === "blocked" && susp.title === "suspT" && susp.body === "suspB");
  // ⭐ 29.5 · THE RG DAILY-LOSS REFUSAL IS REACHED BY ITS TOKEN, NOT BY ITS SENTENCE.
  // ⛔ This case used to read `f("INVALID", "Daily loss limit reached.")` — it drove the
  // English PROSE through a phrase test in `updown-bet-errors.ts`. That test is deleted
  // (`docs/RULES.md` §2.9's last ⏳): `buyPosition` emits `reason: "loss_limit_daily"`, so the
  // sentence is no longer load-bearing and the prose fixture would have proved a dead route.
  // The fixture now carries a DELIBERATELY UNRELATED sentence: if the phrase test is ever
  // re-added, this case fails instead of passing for the wrong reason.
  const rgDict = { failLossLimitDaily: "the cap you set has been reached" } as Record<string, string>;
  const rg = udBetErrorCopy("INVALID", "nothing here mentions the c-a-p at all", dict,
                            { reason: "loss_limit_daily" }, rgDict, (n: number) => `TZS ${n}`);
  ok("29.5 · ⛔ the RG daily-loss refusal → the acknowledge-modal, even though its code is INVALID",
     rg.kind === "blocked" && rg.body === "the cap you set has been reached", JSON.stringify(rg));
  // 🔴 29.5b · AND THE HEADING NAMES THE LIMIT, NOT A BLOCK. The reason branch used to title
  // by SEVERITY, and every `modal`-channel reason is severity `error` — so the loss cap was
  // headed `udErrSuspendedTitle` ("Betting unavailable") over a body about the player's own
  // limit, and `udErrRgLimitTitle` was unreachable. Titling is keyed on the reason now.
  ok("29.5b · 🔴 …and it is headed by the LIMIT, never by the account-block heading",
     rg.kind === "blocked" && rg.title === "rgT", rg.kind === "blocked" ? rg.title : "not blocked");
  // ⭐ CONTROL · a genuine account block still gets the block heading, so 29.5b is not
  // passing because every modal now says "rgT".
  const blockDict = { errSuspended: "your account cannot bet" } as Record<string, string>;
  const blocked = udBetErrorCopy("INVALID", "", dict,
                                 { reason: "account_suspended" }, blockDict, (n: number) => `TZS ${n}`);
  ok("29.5c · control · a real account block keeps the account-block heading",
     blocked.kind === "blocked" && blocked.title === "suspT", JSON.stringify(blocked));
  const bounds = f("INVALID", "Stake must be a whole number between TZS 500 and TZS 1,000,000.");
  ok("29.6 · an ordinary INVALID (bounds) stays a transient toast, localized",
     bounds.kind === "transient" && bounds.description === "invalid");
  const noCode = f(undefined, "some raw server sentence");
  ok("29.7 · with NO code at all the server string survives as fallback — and only then",
     noCode.kind === "transient" && noCode.description === "some raw server sentence");
  ok("29.8 · every OTHER mapped refusal never leaks the wire string",
     [closed, rate, busy, susp, bounds].every((r) =>
       (r.kind === "transient" ? r.description : `${r.title} ${r.body}`).indexOf("Slow down") === -1 &&
       (r.kind === "transient" ? r.description : `${r.title} ${r.body}`).indexOf("Selections are") === -1));
}

// ═══════════════════════════════════════════════════════════════════════════
// 30 · UD-5/6/7 · the optimistic ledger + the one-refresh-per-burst contract
// ═══════════════════════════════════════════════════════════════════════════
//
// The ledger lives inside a React hook, so its INVARIANTS are pinned structurally
// (per §5b: assert the value the code carries). Each is a money-display rule: the
// "You're in" figure must never exceed server truth + genuinely-in-flight stakes.
{
  const { readFileSync } = await import("node:fs");
  const hook = readFileSync(new URL("../src/components/updown/use-quick-bet.ts", import.meta.url), "utf8");
  const action = readFileSync(new URL("../src/app/markets/actions.ts", import.meta.url), "utf8");

  ok("30.1 · the optimistic state is a per-key MAP, not two counters",
     /Map<string, InFlightEntry>/.test(hook) && !/setOptUp\(/.test(hook) && !/setOptDown\(/.test(hook));
  ok("30.2 · a failed or transport-dead tap deletes ITS OWN key — never subtracts from a sum",
     (hook.match(/m\.delete\(key\)/g) ?? []).length >= 3);
  ok("30.3 · success SETTLES the key; only a server advance removes settled entries",
     /settled: true/.test(hook) && /filter\(\[, e\]\) => !e\.settled\)|filter\(\(\[, e\]\) => !e\.settled\)/.test(hook));
  ok("30.4 · auth loss is not a failed bet — a null action result clears silently, no toast",
     /if \(r == null\) \{\s*\n\s*mutateInFlight\(\(m\) => \{ m\.delete\(key\); \}\);\s*\n\s*return;/.test(hook));
  ok("30.5 · ⭐ ONE surface reconciliation per tap burst — the falling-edge 50pick:refresh dispatch",
     /wasPending\.current && !pending/.test(hook) && /dispatchEvent\(new Event\("50pick:refresh"\)\)/.test(hook));
  ok("30.6 · ⛔ and /updown is GONE from the action's revalidate list (UD-6a) — the burst refresh replaced it",
     !/revalidatePath\("\/updown"\)/.test(action));
}

// ── 31 · UD-17a — THE MIS-TAP SETTLE WINDOW, AND THE KEY THAT SCOPES IT ───────
// UD-17 was carried on Ali's decision list for three sessions as "(a) or (b)?" when (a)
// was the auditor's own recommendation, was shipped, and (b) had never been specified.
// The thing that was actually open is that NOTHING GUARDED IT: five lines could be
// deleted and the mis-tap vector would come back silently, on a money surface.
//
// ⭐ 31.3 IS THE ONE THAT MATTERS AND IT IS THE EASIEST TO GET WRONG. The guard is only
// acceptable because it fires on MOUNT, not on every render — a card that merely moves
// slots keeps its React identity and must NOT re-arm, or a player who reaches for a card
// that shifted under them gets 300ms of dead surface every reshuffle. That property does
// not live in updown-card.tsx at all: it lives in the parent's `key`. Assert both halves,
// in both files, or the pair can drift apart while each half still reads correct.
{
  const { readFileSync } = await import("node:fs");
  const card = readFileSync(new URL("../src/components/updown/updown-card.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/app/updown/page.tsx", import.meta.url), "utf8");

  ok("31.1 · the card ARMS a tap guard on mount and releases it on a timer",
     /const \[tapGuard, setTapGuard\] = useState\(true\)/.test(card)
     && /setTimeout\(\(\) => setTapGuard\(false\), 300\)/.test(card));

  ok("31.2 · …and while armed a BETTABLE card ignores pointer events",
     /pointerEvents:\s*tapGuard && bettable \? "none" : undefined/.test(card));

  ok("31.3 · ⭐ the card list is keyed by roundId, so a card that only MOVES SLOTS does not remount and does not re-arm",
     /<UpDownCard\b[\s\S]{0,200}?key=\{r\.roundId\}/.test(page));

  ok("31.4 · the effect has an EMPTY dep array — a re-render must not restart the window",
     /useEffect\(\(\) => \{[\s\S]{0,200}?setTapGuard\(false\)[\s\S]{0,120}?\}, \[\]\);/.test(card));

  // ⚠️ Guard the guard: if the identifier is ever renamed, 31.1–31.2 would both go quietly
  // false and read as "the feature is gone" — so assert the SUBJECT exists before believing
  // a negative. (The pattern that let a locator and its own RED proof agree and both be wrong.)
  ok("31.5 · the assertions above are anchored on text that really is in the file (not vacuously false)",
     card.includes("tapGuard") && card.includes("UD-17a") && page.includes("UpDownCard"));
}

console.log(`\nupdown-quickbet: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error("\n✗ QUICK-BET BROKEN — the one-tap card would mischarge or misreport the player's position.\n"); process.exit(1); }
console.log("updown-quickbet: OK — one tap places once, duplicates pay once, distinct taps stack, 'you're in' is per-viewer, bad taps refused");
