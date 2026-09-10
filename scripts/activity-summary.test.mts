/**
 * F2b "Your activity" — money-honesty reconciliation tests (in-memory store).
 *
 * Locks the invariant that the dashboard figures are REAL aggregates of the
 * player's own CONFIRMED transactions, that net === won − staked === the exact
 * value the loss-limit gate uses, that windowing is correct, that an empty user
 * yields honest zeros (never fabricated), and that RG limits-used is computed
 * from the same sums the gate enforces. Run: npx tsx scripts/activity-summary.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";

import { db, type StoredTxn, type StoredWallet } from "../src/lib/server/store.ts";
import { getActivitySummary, getRgUsage, periodSince } from "../src/lib/server/activity-summary.ts";
import { setLimits, getRgSettings } from "../src/lib/server/responsible-gambling.ts";
// §D/§E read the schema and the page as TEXT — the partition's totality and a server component's
// searchParams default are neither of them reachable from an in-memory fixture.
import { readFileSync } from "node:fs";
import { LENS_TYPES } from "../src/lib/wallet/ledger.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
let seq = 0;

async function mkUser(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null,
    createdAt: iso(now), updatedAt: iso(now), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: iso(now), updatedAt: iso(now) } as StoredWallet);
}

function txn(userId: string, type: StoredTxn["type"], amount: number, atMs: number, status: StoredTxn["status"] = "CONFIRMED"): void {
  db.txn.create({
    id: `txn_${userId}_${++seq}`, walletId: `wal_${userId}`, userId, type, status,
    amount, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
    provider: "INTERNAL", providerRef: null, msisdn: null, description: null, positionId: null,
    amlReason: null, createdAt: iso(atMs), updatedAt: iso(atMs), completedAt: iso(atMs),
  } as StoredTxn);
}

const HOUR = 3600_000, DAY = 86_400_000;

// ── User A: a mix of confirmed money movement inside the last month ──
await mkUser("act_a");
txn("act_a", "DEPOSIT", 50_000, now - 2 * DAY);      // money in
txn("act_a", "WITHDRAWAL", -10_000, now - 1 * DAY);  // money out (stored negative)
txn("act_a", "BET_PLACED", -8_000, now - 3 * HOUR);  // staked (negative)
txn("act_a", "BET_PLACED", -2_000, now - 2 * HOUR);
txn("act_a", "BET_PAYOUT", 15_000, now - 1 * HOUR);  // won
txn("act_a", "CASHOUT", 1_000, now - 30 * 60_000);   // won (partial)
// Noise that must be EXCLUDED: a pending deposit + an out-of-window bet.
txn("act_a", "DEPOSIT", 999_999, now - 1 * HOUR, "PENDING");
txn("act_a", "BET_PLACED", -70_000, now - 60 * DAY); // older than 30d

{
  const s = await getActivitySummary("act_a", "month", now);
  ok("deposits sum (confirmed only)", s.deposits === 50_000, `got=${s.deposits}`);
  ok("withdrawals magnitude", s.withdrawals === 10_000, `got=${s.withdrawals}`);
  ok("staked magnitude (in-window only)", s.staked === 10_000, `got=${s.staked}`);
  ok("won = payout + cashout ONLY", s.won === 16_000, `got=${s.won}`);
  ok("gamblingNet === won + refunds − staked", s.gamblingNet === s.won + s.refunds - s.staked, `gamblingNet=${s.gamblingNet}`);
  ok("gamblingNet = +6,000", s.gamblingNet === 6_000, `got=${s.gamblingNet}`);
  /**
   * ⭐ `net` IS NO LONGER THE BETTING RESULT — that is the whole point of the 2026-09-09 change.
   * It is every confirmed movement in the window: 50,000 in, 10,000 out, 10,000 staked, 16,000
   * returned = +46,000. The old assertion here was `net === won − staked`, which is now
   * `gamblingNet`, and a suite that kept asserting it would have pinned the defect.
   */
  ok("net = every confirmed movement (+46,000)", s.net === 46_000, `got=${s.net}`);
  ok("⛔ net is NOT the betting result", s.net !== s.gamblingNet, `net=${s.net} gamblingNet=${s.gamblingNet}`);
  ok("pending deposit excluded", s.deposits !== 1_049_999);
  ok("out-of-window bet excluded", s.staked === 10_000);
  ok("not empty", s.empty === false);
}

// ── Invariant: the BETTING net must equal the exact loss-gate value over the same window ──
// ⚠️ `gamblingNet`, not `net`. `sumGamblingNetSince` sums exactly four types (BET_PLACED,
//    BET_PAYOUT, BET_REFUND, CASHOUT), so it is the betting result and has never been a net of
//    everything. Reconciling the new `net` against it would be comparing two different questions
//    and would have forced one of them to be wrong.
{
  const s = await getActivitySummary("act_a", "week", now);
  const gateNet = await db.txn.sumGamblingNetSince("act_a", periodSince("week", now));
  ok("gamblingNet reconciles to sumGamblingNetSince (loss gate)", s.gamblingNet === gateNet, `gamblingNet=${s.gamblingNet} gate=${gateNet}`);
}

// ── Windowing: a bet 10 days ago is out of "week" but in "month" ──
await mkUser("act_w");
txn("act_w", "BET_PLACED", -5_000, now - 10 * DAY);
txn("act_w", "BET_PAYOUT", 9_000, now - 10 * DAY);
{
  const week = await getActivitySummary("act_w", "week", now);
  const month = await getActivitySummary("act_w", "month", now);
  ok("10d-old activity absent from week", week.empty === true, `week.staked=${week.staked}`);
  ok("10d-old activity present in month", month.staked === 5_000 && month.won === 9_000);
  const all = await getActivitySummary("act_w", "all", now);
  ok("all-time includes it", all.staked === 5_000);
}

// ── Empty user → honest zeros, never fabricated ──
await mkUser("act_empty");
{
  const s = await getActivitySummary("act_empty", "month", now);
  ok("empty user → all zeros", s.deposits === 0 && s.withdrawals === 0 && s.staked === 0 && s.won === 0 && s.refunds === 0 && s.net === 0 && s.gamblingNet === 0);
  ok("empty flag set", s.empty === true);
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 * ⭐ ADDED 2026-09-09 — the four things this suite could NOT see, and why it could not see them.
 *
 * 🔴 IT WAS BLIND TO BOTH SHIPPED DEFECTS BY CONSTRUCTION, not by accident:
 *   · its fixtures used FIVE of the twelve stored `TxnType` values, so a tile set covering six of
 *     twelve was indistinguishable from a tile set covering all of them;
 *   · every call passed a period explicitly, so the page's DEFAULT — the actual defect — was
 *     never once exercised.
 * ⛔ A suite whose fixtures cannot express a defect is not evidence about that defect. Both gaps
 * are closed below, and each new section says which failure it would have caught.
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */

// ── §A · A REFUNDED STAKE IS NOT A WIN ────────────────────────────────────────────────────
// 🔴 THE DEFECT: `BET_REFUND` was summed into the `Won` tile, so a player whose market was VOIDED
//    and whose stake came straight back read a positive "Won" and a flattered net. It is also the
//    campaign's own complaint — a player must be able to tell won from lost from refunded — being
//    answered wrongly by the surface that exists to answer it.
await mkUser("act_refund");
txn("act_refund", "BET_PLACED", -7_000, now - 2 * HOUR);
txn("act_refund", "BET_REFUND", 7_000, now - 1 * HOUR);
{
  const s = await getActivitySummary("act_refund", "month", now);
  ok("§A refunds are their own number", s.refunds === 7_000, `got=${s.refunds}`);
  ok("§A ⛔ a refund is NOT counted as won", s.won === 0, `won=${s.won}`);
  ok("§A staked still counts the stake", s.staked === 7_000, `got=${s.staked}`);
  // A voided bet leaves the player exactly where they started, on both readings.
  ok("§A net of a void is zero", s.net === 0, `got=${s.net}`);
  ok("§A gamblingNet of a void is zero", s.gamblingNet === 0, `got=${s.gamblingNet}`);
  // ⭐ AND IT IS NOT EMPTY. Two real movements happened; they merely cancel.
  ok("§A ⛔ a voided bet is NOT an empty period", s.empty === false, `empty=${s.empty}`);
}

// ── §B · A SUM CANNOT PROVE ABSENCE ───────────────────────────────────────────────────────
// 🔴 THE FAILURE THIS PREVENTS: `empty` computed from summed buckets. A deposit and an equal
//    withdrawal net to zero, so `empty` would have been TRUE for a player who moved money twice —
//    and `empty` hides the entire money section, so the page would have said "No activity yet"
//    over two real transactions. Same family as "the books balance is not integrity".
await mkUser("act_cancel");
txn("act_cancel", "DEPOSIT", 10_000, now - 3 * HOUR);
txn("act_cancel", "WITHDRAWAL", -10_000, now - 2 * HOUR);
{
  const s = await getActivitySummary("act_cancel", "month", now);
  ok("§B the sums really do cancel", s.net === 0, `net=${s.net}`);
  ok("§B ⛔ …and the period is NOT empty", s.empty === false, `empty=${s.empty}`);
  ok("§B both movements are visible", s.deposits === 10_000 && s.withdrawals === 10_000, `in=${s.deposits} out=${s.withdrawals}`);
}

// ── §C · EVERY STORED TYPE REACHES `net`, AND THE SIX THAT DID NOT ────────────────────────
// 🔴 THE DEFECT: the tiles enumerated six of twelve `TxnType` values, so `net` — a word that
//    claims everything — silently excluded BONUS_CREDIT, both ADJUSTMENT legs, HOUSE_FEE and both
//    AGENT_COMMISSION legs. A player given a bonus, or charged a fee, saw it nowhere.
// ⭐ Seeded ONE type at a time, each on its own user, so a type that stops reaching `net` names
//    itself instead of hiding inside an aggregate.
{
  const ALL: Array<[StoredTxn["type"], number]> = [
    ["DEPOSIT", 1_000], ["WITHDRAWAL", -1_000], ["BET_PLACED", -1_000], ["BET_PAYOUT", 1_000],
    ["BET_REFUND", 1_000], ["BONUS_CREDIT", 1_000], ["ADJUSTMENT_CREDIT", 1_000],
    ["ADJUSTMENT_DEBIT", -1_000], ["CASHOUT", 1_000], ["HOUSE_FEE", -1_000],
    ["AGENT_COMMISSION", 1_000], ["AGENT_COMMISSION_REVERSAL", -1_000],
    // ⭐ 2026-09-10: the agent registration fee moved onto the WALLET rail, so an applicant is
    // now DEBITED for it and it must reach `net` like any other movement. ⛔ This fixture is a
    // hard-coded list, so it silently covered 12 of 13 types the moment the enum grew — which
    // is the very defect the section guards ("A player given a bonus, or charged a fee, saw it
    // nowhere"). §C.0's count is what makes that impossible to miss.
    ["AGENT_REGISTRATION_FEE", -1_000],
  ];
  ok("§C.0 fixture covers all thirteen stored types", ALL.length === 13, `${ALL.length}`);
  for (const [type, amount] of ALL) {
    const uid = `act_t_${type.toLowerCase()}`;
    await mkUser(uid);
    txn(uid, type, amount, now - 1 * HOUR);
    const s = await getActivitySummary(uid, "month", now);
    ok(`§C ${type} reaches net`, s.net === amount, `net=${s.net} want=${amount}`);
    ok(`§C ${type} is not an empty period`, s.empty === false, `empty=${s.empty}`);
  }
}

// ── §D · THE PARTITION IS TOTAL — asserted against the schema, not trusted ────────────────
// ⛔ `activity-summary.ts` derives its type list by flattening `/wallet`'s `LENS_TYPES`, on that
//    file's written claim to be "a PARTITION of all stored types". If a further type is
//    ever added to the enum and to no lens, that claim silently becomes false and the new type
//    disappears from every tile and from `net` — with no error anywhere. The schema is the source
//    of truth, so the schema is what this compares against.
{
  const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  const block = /enum TxnType \{([\s\S]*?)\n\}/.exec(schema);
  ok("§D.0 CONTROL · the TxnType enum was found in the schema", !!block);
  /**
   * ⛔ NO COMMENT-STRIPPING REGEX HERE, AND `test:decomment` §2.1 CAUGHT THE FIRST DRAFT WRITING
   * ONE. It had `.replace(/\/\/\/.*$/, "")` to drop Prisma's `///` doc lines, which is a private
   * stripper by shape — the exact population that guard ratchets, and it went 20 → 21 the moment
   * this file was saved.
   *
   * ⭐ IT WAS ALSO REDUNDANT, which is the better reason to delete it: `/^[A-Z_]+$/` already
   * rejects a `///` line, because such a line carries slashes and lowercase. The stripper was
   * doing nothing except joining a debt register.
   */
  const stored = (block?.[1] ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[A-Z_]+$/.test(l));
  // ⭐ 12 → 13 on 2026-09-10: `AGENT_REGISTRATION_FEE` was added deliberately, for the fee paid
  // from an applicant's wallet. ⛔ This is NOT a ratchet being relaxed to swallow a regression —
  // the control fired exactly as its comment above says it should, and its purpose is to force
  // the partition below to be re-verified. It was: the new type IS in a lens (`agentfee`), and
  // §C.0's fixture was extended to cover it, because a hard-coded fixture list had quietly
  // dropped to 12-of-13.
  ok("§D.0 CONTROL · the schema really lists thirteen types", stored.length === 13, `${stored.length}: ${stored.join(",")}`);

  const lensed = Object.values(LENS_TYPES).flat();
  const missing = stored.filter((t) => !lensed.includes(t as never));
  const extra = lensed.filter((t) => !stored.includes(t));
  ok("§D ⭐ every stored TxnType belongs to a wallet lens", missing.length === 0, `unlensed: ${missing.join(", ")}`);
  ok("§D ⛔ no lens names a type the schema does not store", extra.length === 0, `phantom: ${extra.join(", ")}`);
  // A partition, not merely a cover — a type in two lenses would be double-counted in `net`.
  ok("§D the lenses do not overlap", new Set(lensed).size === lensed.length, `${lensed.length} entries, ${new Set(lensed).size} distinct`);
}

// ── §E · THE PAGE'S DEFAULT WINDOW IS `all` ───────────────────────────────────────────────
// 🔴 THE DEFECT: the page defaulted to a THIRTY-DAY narrowing while `windows.ts` states `all` is
//    the player default and all seven other player surfaces obey it. A player who chose nothing
//    was shown a filtered page, and — because `empty` hides the money block — a player whose
//    history was older than a month was told "No activity yet" on the bare URL.
// ⛔ A STATIC READ, and it is named as such: the default lives in a server component's
//    `searchParams` branch, which this in-memory suite cannot invoke. The alternative — asserting
//    it in a live drive only — is what let it ship. Both halves are checked: the fallback value,
//    and the href builder that decides which value gets the CLEAN url.
{
  const page = readFileSync(new URL("../src/app/profile/activity/page.tsx", import.meta.url), "utf8");
  ok("§E.0 CONTROL · the page's period fallback line was found",
    /isPeriod\(rawPeriod\)\s*\?\s*rawPeriod\s*:\s*"[a-z]+"/.test(page));
  ok("§E ⭐ the default period is `all`, never a narrowing",
    /isPeriod\(rawPeriod\)\s*\?\s*rawPeriod\s*:\s*"all"/.test(page),
    "a player who chose nothing must see everything they have done");
  ok("§E …and the BARE url is the unnarrowed state",
    /\/profile\/activity\$\{p === "all" \? "" :/.test(page),
    "§K 6c rule 6: defaults are omitted from the URL — so the omitted one must be the default");
}

// ── RG usage reflects the same sums the gate enforces ──
await mkUser("act_rg");
txn("act_rg", "DEPOSIT", 30_000, now - 2 * HOUR);   // today
txn("act_rg", "DEPOSIT", 20_000, now - 3 * DAY);    // this week (not today)
txn("act_rg", "BET_PLACED", -12_000, now - 1 * HOUR); // loss so far today
await setLimits("act_rg", { dailyDepositLimit: 100_000, weeklyDepositLimit: 200_000, dailyLossLimit: 50_000 });
{
  const rg = await getRgUsage("act_rg", now);
  const settings = await getRgSettings("act_rg");
  ok("daily deposit used = 30,000", rg.dailyDeposit.used === 30_000, `got=${rg.dailyDeposit.used}`);
  ok("weekly deposit used = 50,000", rg.weeklyDeposit.used === 50_000, `got=${rg.weeklyDeposit.used}`);
  // getRgUsage must faithfully surface whatever getRgSettings holds (deferral-agnostic).
  ok("daily deposit limit mirrors RG settings", rg.dailyDeposit.limit === (settings.dailyDepositLimit ?? null), `usage=${rg.dailyDeposit.limit} settings=${settings.dailyDepositLimit}`);
  ok("daily loss limit mirrors RG settings", rg.dailyLoss.limit === (settings.dailyLossLimit ?? null));
  ok("daily loss used = 12,000 (floored net)", rg.dailyLoss.used === 12_000, `got=${rg.dailyLoss.used}`);
  ok("no monthly limit → null", rg.monthlyDeposit.limit === null);
}

console.log(`\nactivity-summary: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
