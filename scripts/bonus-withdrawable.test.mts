/**
 * J · THE BONUS/PAYOUT BOUNDARY — is a bonus actually WITHDRAWABLE, and when?
 *
 *   npx tsx scripts/bonus-withdrawable.test.mts     (npm run test:bonus-withdrawable)
 *
 * ⭐ WHY THIS FILE EXISTS, AND IT IS §5-TRAP-1 IN THE JAY BRIEF EXACTLY.
 * `bonus-one-side.test.mts` §5.2 already asserts *"the grant FULFILLED and the bonus became
 * real, WITHDRAWABLE balance"* — and it proves that claim with
 *
 *     (await realBal("os_honest")) > 50_000
 *
 * which reads the **balance column**. Nothing in this repository has ever called `withdraw()`
 * against a bonus. So the word "withdrawable" was carried by a check that cannot see the
 * payout path at all: if `withdraw()` had started counting `bonusBalance` tomorrow, or had
 * stopped honouring a fulfilled grant's credit, every bonus suite would still have been green.
 * ⛔ *Would this check still pass if the feature were absent?* That one would.
 *
 * The rule this pins is ONE LINE of `wallet-service.ts`, and it is the whole law:
 *
 *     if (w.balance < amount) return { ok: false, error: "Insufficient balance." }
 *
 * `bonusBalance` is not in it. That is not an accident and it is not documented anywhere a
 * guard can enforce — so a well-meaning "the player has 13,000, let them take 13,000" change
 * would repeal the entire wagering requirement in one edit, and no existing test would notice.
 *
 *   §1  the refusal is about the BUCKET, not the amount — with a positive control on the
 *       same player, the same wallet and the same number
 *   §2  a partial cover is not topped up out of the bonus
 *   §3  ★ THE FLIP — one number, one wallet: REFUSED before turnover, PAID after it, and the
 *       grant is the only thing that changed
 *   §4  ★ the boundary is EXACT — one shilling short of the requirement still refuses a
 *       10,000 payout, and the shilling after it releases one
 *   §5  a REAL bet produces the same unlock, and the LEDGER says so — a CONFIRMED
 *       `BONUS_CREDIT`, not merely a balance that moved
 *   §6  and it needs no identity: an unverified player is paid (Board comment #1, B × J)
 *
 * ⚠️ EVERY SECTION ASKS `withdraw()`, never the balance column. A rule about what may leave
 * the platform, checked against the number the platform happens to be holding, proves only
 * that the number is the number — which is precisely the defect this file was written about.
 *
 * ⚠️ §3 and §4 drive turnover with `recordWagering()` DIRECTLY rather than through a bet.
 * That is deliberate: this suite is about the PAYOUT boundary, and `bonus-one-side.test.mts`
 * already owns the question of which stakes accrue. Isolating the variable means the flip in
 * §3 can be attributed to the grant and to nothing else. §5 then does it the long way, through
 * a real `buyPosition`, so the suite is not left proving a synthetic path.
 *
 * RED harness: `node scripts/bonus-withdrawable-red.mjs`.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { withdraw } from "../src/lib/server/wallet-service.ts";
import { creditBonus, recordWagering } from "../src/lib/server/bonus-service.ts";
import { createMarket, buyPosition } from "../src/lib/server/market-service.ts";
import { errorCopy } from "../src/lib/error-copy.ts";
import { dict as DICT } from "../src/lib/i18n-dict.ts";

/** What a refused `withdraw()` looks like once it carries a reason (E-223). */
type ReasonedResult = {
  ok: boolean; error?: string; code?: string;
  reason?: string; detail?: { balance?: number; needed?: number };
};

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const now = () => new Date().toISOString();
let seq = 0;

/** local digits of the fixture phone — `withdraw()` refuses any other destination (E-215). */
const localDigits = new Map<string, string>();

/**
 * A player with a wallet and NO KYC submission at all.
 * ⛔ Deliberately unverified: identity is no longer a precondition of withdrawal (Board
 * comment #1), so a fixture that quietly approves KYC would be testing the retired path.
 */
async function player(id: string, balance: number): Promise<void> {
  const local = `77${String(++seq).padStart(7, "0")}`;
  localDigits.set(id, local);
  await db.user.create({
    id, phoneE164: `+255${local}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}

/** Ask the PAYOUT PATH, not the wallet. Returns the service result verbatim. */
const tryWithdraw = (id: string, amount: number) =>
  withdraw(id, { provider: "MPESA", amount, msisdn: localDigits.get(id)! });

const wal = async (id: string) => (await db.wallet.findByUserId(id))!;
const grant = async (id: string) => (await db.bonusGrant.listByUser(id))[0];

// ── §1 · the refusal is about the BUCKET, not the amount ─────────────────────
console.log("\n§1 · bonusBalance is not money that may leave the platform");
{
  // 10,000 of bonus, nothing else. The wallet's own total is 10,000.
  await player("bw_bonus_only", 0);
  await creditBonus("bw_bonus_only", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 });
  const before = await wal("bw_bonus_only");
  const r = await tryWithdraw("bw_bonus_only", 10_000);
  ok("1.1 · ★★ a wallet holding 10,000 of BONUS is refused a 10,000 payout",
     r.ok === false, r.ok ? "ACCEPTED — the wagering requirement is repealed" : `refused: ${r.error}`);
  // ⛔ The refusal must not be a silent no-op that still moved money. Read the wallet back.
  const after = await wal("bw_bonus_only");
  ok("1.2 · …and nothing moved — balance, hold and bonusBalance are untouched",
     after.balance === before.balance && after.hold === before.hold && after.bonusBalance === before.bonusBalance,
     `balance ${before.balance}→${after.balance} hold ${before.hold}→${after.hold} bonus ${before.bonusBalance}→${after.bonusBalance}`);
  ok("1.3 · …and no WITHDRAWAL row was written",
     (await db.txn.listForUser("bw_bonus_only")).filter((t) => t.type === "WITHDRAWAL").length === 0);

  // ⭐ THE POSITIVE CONTROL, in the same run and on the same number. Without it, "refused"
  // is indistinguishable from a payout path that refuses everybody — which is what an
  // over-correction of this rule would look like, and it would never be reported as a bug.
  await player("bw_cash_only", 10_000);
  const c = await tryWithdraw("bw_cash_only", 10_000);
  ok("1.4 · ★ CONTROL — the SAME 10,000, held as CASH, is paid",
     c.ok === true, c.ok ? "" : `refused: ${(c as { error: string }).error}`);
}

// ── §2 · a partial cover is not topped up out of the bonus ───────────────────
console.log("\n§2 · the bonus does not part-fund a payout either");
{
  await player("bw_partial", 3_000);
  await creditBonus("bw_partial", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 });
  const r = await tryWithdraw("bw_partial", 5_000);
  ok("2.1 · ★ 3,000 cash + 10,000 bonus is refused a 5,000 payout — the 13,000 total is not spendable",
     r.ok === false, r.ok ? "ACCEPTED — the bonus part-funded a payout" : `refused: ${r.error}`);
  const c = await tryWithdraw("bw_partial", 3_000);
  ok("2.2 · ★ CONTROL — the cash part alone is paid",
     c.ok === true, c.ok ? "" : `refused: ${(c as { error: string }).error}`);
}

// ── §3 · THE FLIP — one number, refused before turnover and paid after it ────
console.log("\n§3 · turnover is what converts it, and the same number proves it");
{
  await player("bw_flip", 0);
  await creditBonus("bw_flip", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 1 }); // req 10,000
  const before = await tryWithdraw("bw_flip", 10_000);
  ok("3.1 · ★★ BEFORE — 10,000 is refused while it sits in the bonus wallet",
     before.ok === false, before.ok ? "ACCEPTED" : `refused: ${before.error}`);

  const wr = await recordWagering("bw_flip", 10_000);
  const g = await grant("bw_flip");
  ok("3.2 · the grant FULFILLED and reports the credit it moved",
     g.status === "FULFILLED" && wr.creditedToRealTzs === 10_000,
     `status=${g.status} credited=${wr.creditedToRealTzs}`);
  const mid = await wal("bw_flip");
  ok("3.3 · the money changed BUCKET — bonusBalance 10,000 → 0, balance 0 → 10,000",
     mid.bonusBalance === 0 && mid.balance === 10_000,
     `balance=${mid.balance} bonus=${mid.bonusBalance}`);

  const after = await tryWithdraw("bw_flip", 10_000);
  ok("3.4 · ★★ AFTER — the SAME 10,000, the SAME wallet, is now PAID",
     after.ok === true, after.ok ? "" : `refused: ${(after as { error: string }).error}`);
  // ⚠️ NOT `hold === 10_000`. The first version of this line asserted the IN-FLIGHT state and
  // failed against a payout that had worked perfectly: the dispatch confirms inside the same
  // call here, so `hold` is placed and RELEASED before control returns, and the wallet rests
  // at 0/0 with the money genuinely gone. Asserting a state the product only passes through
  // is the same mistake as reading a toast after it auto-dismisses — measure what PERSISTS.
  const end = await wal("bw_flip");
  const out = (await db.txn.listForUser("bw_flip")).filter((t) => t.type === "WITHDRAWAL");
  ok("3.5 · …and the 10,000 really left the wallet — one WITHDRAWAL row, nothing left behind",
     out.length === 1 && out[0].amount === -10_000 && end.balance === 0 && end.hold === 0 && end.bonusBalance === 0,
     `rows=${out.length} amount=${out[0]?.amount} balance=${end.balance} hold=${end.hold} bonus=${end.bonusBalance}`);
}

// ── §4 · the boundary is EXACT ───────────────────────────────────────────────
console.log("\n§4 · one shilling of turnover decides a 10,000 payout");
{
  await player("bw_edge", 0);
  await creditBonus("bw_edge", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 }); // req 50,000
  await recordWagering("bw_edge", 49_999);
  const g1 = await grant("bw_edge");
  ok("4.1 · 49,999 of a 50,000 requirement leaves the grant ACTIVE",
     g1.status === "ACTIVE" && g1.wageredTzs === 49_999, `status=${g1.status} wagered=${g1.wageredTzs}`);
  const short = await tryWithdraw("bw_edge", 10_000);
  ok("4.2 · ★★ …and one shilling short, the 10,000 is still refused",
     short.ok === false, short.ok ? "ACCEPTED — the requirement is off by one" : `refused: ${short.error}`);

  await recordWagering("bw_edge", 1);
  const g2 = await grant("bw_edge");
  ok("4.3 · the fiftieth-thousandth shilling FULFILS it",
     g2.status === "FULFILLED", `status=${g2.status}`);
  const paid = await tryWithdraw("bw_edge", 10_000);
  ok("4.4 · ★★ CONTROL — and now the same 10,000 is paid",
     paid.ok === true, paid.ok ? "" : `refused: ${(paid as { error: string }).error}`);
}

// ── §5 · a real bet, and the LEDGER rather than the balance ──────────────────
console.log("\n§5 · the long way round — a real stake, and a CONFIRMED BONUS_CREDIT");
{
  // ⚠️ 30,000 of cash against a 10,000 stake. `buyPosition` computes
  // `realPart = min(stake, balance)` — CASH FIRST — so the bonus is NOT consumed by the
  // qualifying bet and survives to be converted. A fixture funded below the stake would
  // spend the bonus instead, `remainingTzs` would reach 0, and the unlock would move
  // NOTHING while still reporting FULFILLED. That is a real property of the product, and
  // it is why this fixture's balance is stated rather than assumed.
  await player("bw_real", 30_000);
  await creditBonus("bw_real", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 1 }); // req 10,000
  const m = await createMarket({
    titleEn: "Bonus withdrawability market", titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  const bet = await buyPosition("bw_real", { marketId: m.id, side: "YES", stake: 10_000 });
  ok("5.1 · the qualifying stake was accepted", bet.ok === true,
     bet.ok ? "" : (bet as { error: string }).error);
  ok("5.2 · ★ and it was funded from CASH, not from the bonus — bonusStakeTzs is 0",
     bet.ok === true && bet.data.bonusStakeTzs === 0,
     bet.ok ? `bonusStakeTzs=${bet.data.bonusStakeTzs}` : "");

  const g = await grant("bw_real");
  ok("5.3 · the grant FULFILLED off a single real bet, with nothing left in it",
     g.status === "FULFILLED" && g.wageredTzs === 10_000 && g.remainingTzs === 0,
     `status=${g.status} wagered=${g.wageredTzs} remaining=${g.remainingTzs}`);

  // ⛔ THE LEDGER, NOT THE BALANCE. A balance that moved is consistent with a dozen causes;
  // the platform's claim is that this specific movement was a bonus unlock, and the
  // transaction is where it says so.
  const credits = (await db.txn.listForUser("bw_real")).filter((t) => t.type === "BONUS_CREDIT");
  ok("5.4 · ★★ exactly ONE BONUS_CREDIT was written, CONFIRMED, for the unspent remainder",
     credits.length === 1 && credits[0].status === "CONFIRMED" && credits[0].amount === 10_000,
     `n=${credits.length} status=${credits[0]?.status} amount=${credits[0]?.amount}`);

  const w = await wal("bw_real");
  ok("5.5 · the wallet nets to stake-out, bonus-in — 30,000 − 10,000 + 10,000",
     w.balance === 30_000 && w.bonusBalance === 0, `balance=${w.balance} bonus=${w.bonusBalance}`);

  // ⭐ AND THE POINT OF THE WHOLE FILE: that credit is now payable.
  const paid = await tryWithdraw("bw_real", 30_000);
  ok("5.6 · ★★ …and the payout path accepts the full balance the unlock helped build",
     paid.ok === true, paid.ok ? "" : `refused: ${(paid as { error: string }).error}`);
}

// ── §6 · no identity in the path ─────────────────────────────────────────────
console.log("\n§6 · B × J — the player who is paid has no KYC submission at all");
{
  // Every fixture above was created WITHOUT a KycSubmission, so §1.4/§3.4/§4.4/§5.6 already
  // paid unverified players. This section says so out loud, and fails if a future change
  // quietly re-introduces the gate — which would break the Board's comment #1 while every
  // other suite in this file went on passing for the wrong reason.
  ok("6.1 · ★ no fixture in this file ever held a KYC submission",
     (await db.kyc.listByUser("bw_real")).length === 0 && (await db.kyc.listByUser("bw_flip")).length === 0);
  await player("bw_unverified", 12_000);
  const r = await tryWithdraw("bw_unverified", 12_000);
  ok("6.2 · ★★ …and an account with no identity record at all is still paid",
     r.ok === true, r.ok ? "" : `refused: ${(r as { error: string }).error}`);
}

// ── §7 · E-223 · the refusal has to SAY something, and say the right number ──
console.log("\n§7 · E-223 — what the player is actually told when the bonus cannot cover it");
{
  // 🔴 FOUND BY DRIVING IT, NOT BY READING IT. Replaying the real withdrawal server action on
  // production with the amount rewritten to `balance + 1` came back with
  // *"That didn't go through. Check the details and try again."* — the generic `errInvalid`,
  // because this refusal returned `INVALID` with no `reason` at all. The most common refusal
  // on the money-out screen explained nothing.
  await player("bw_copy_bonus", 3_000);
  await creditBonus("bw_copy_bonus", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 });
  const r = await tryWithdraw("bw_copy_bonus", 5_000) as ReasonedResult;
  ok("7.1 · ★★ the refusal carries a machine reason, so it can be minted in the player's language",
     r.ok === false && !!r.reason, `reason=${r.reason ?? "(none — falls through to errInvalid)"}`);
  ok("7.2 · ★ …and it is the BONUS one, because the locked bonus is exactly what closes the gap",
     r.reason === "withdraw_bonus_locked", `reason=${r.reason}`);
  // ⛔ THE FIGURE IS THE WITHDRAWABLE BALANCE. 13,000 is what the wallet holds; 3,000 is what
  // the player may have. Stating the total on a money screen promises money that is not theirs.
  ok("7.3 · ★★ the figure offered is the WITHDRAWABLE balance, not the wallet total",
     r.detail?.balance === 3_000, `balance=${r.detail?.balance} (wallet total is 13,000)`);
  ok("7.4 · …and it repeats what was asked for, so the player can see the gap",
     r.detail?.needed === 5_000, `needed=${r.detail?.needed}`);

  // The sentence itself, minted exactly as `withdrawAction` mints it.
  const body = errorCopy(DICT.en as never, r as never);
  ok("7.5 · ★★ the rendered sentence names 3,000 and is not the generic 'that didn\\'t go through'",
     body.includes("3,000") && !/didn't go through/i.test(body), body);
  ok("7.6 · ★★ …and it never shows the player the 13,000 they cannot withdraw",
     !body.includes("13,000"), body);
  // ⚠️ A placeholder that survives to the screen is this file's sibling defect —
  // `withdraw_below_min` shipped a literal `{min}` in all three languages once.
  ok("7.7 · no unresolved placeholder survived interpolation", !/\{\w+\}/.test(body), body);

  // ⭐ THE OTHER BRANCH, in the same run. Without it, "the bonus explains the gap" would be
  // indistinguishable from "every shortfall blames a bonus", including for players who have none.
  await player("bw_copy_plain", 3_000);
  const p = await tryWithdraw("bw_copy_plain", 5_000) as ReasonedResult;
  ok("7.8 · ★ CONTROL — a player with NO bonus gets the plain shortfall, not a wagering lecture",
     p.reason === "withdraw_balance_insufficient", `reason=${p.reason}`);
  const pbody = errorCopy(DICT.en as never, p as never);
  ok("7.9 · …and that sentence names the same withdrawable figure",
     pbody.includes("3,000") && !/wagering/i.test(pbody), pbody);
  // ⭐ AND THE FAR-SHORT CASE: asking for more than cash + bonus is not the bonus's fault.
  const far = await tryWithdraw("bw_copy_bonus", 50_000) as ReasonedResult;
  ok("7.10 · ★ CONTROL — asking beyond cash+bonus is the plain shortfall; the bonus is not blamed for it",
     far.reason === "withdraw_balance_insufficient", `reason=${far.reason}`);
}

console.log(`\nbonus-withdrawable: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
