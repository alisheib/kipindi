/**
 * THE MONEY MINIMUMS — the minimum deposit (TZS 1,000), the minimum stake (TZS 500) and the TRUE withdrawal minimum.
 *
 *   npm run test:money-minimums
 *
 * Management, relayed by Ali (2026-10-07): *"in deposits and in the minimum stake where we teach people how to deposit, it
 * should always be consistently 1000, not 500 — fix everywhere needed … consistent and functional."* On withdrawals Ali
 * chose "show the true minimum". docs/COMPLIANCE-DECISIONS.md § "2026-10-07 · Minimum deposit and minimum stake are
 * TZS 1,000 everywhere, and the withdrawal minimum is stated truly (management, relayed by the owner)"; RULES.md §2.3, §2.7a.
 * ⭐ AMENDED 2026-10-12 (Ali: *"turn minimum stake instead of 1k to 500, everywhere in the platform where needed"*): the
 * minimum STAKE is TZS 500 on both products; the minimum DEPOSIT stays TZS 1,000 — two rules, two figures, never one
 * constant. docs/COMPLIANCE-DECISIONS.md § "2026-10-12 · The minimum stake is TZS 500 again; the minimum deposit stays
 * TZS 1,000 (owner)".
 *
 * SECTIONS
 *   §1  the deposit minimum is enforced: 999 refused (no row), 1,000 accepted — the player's door and the officer's — and
 *       it is NOT the stake minimum's figure any more
 *   §2  every sentence that teaches either minimum is FILLED from its constant, in three languages — no figure typed, no
 *       `{` left (the deposit hint, the assistant's prompt, the below-minimum refusal)
 *   §3  ⭐ a stored value under the stake minimum cannot reach any reader: global, per-market, the Up & Down default and a
 *       chain all read 500, the money path refuses a 499 stake and takes 500 — and the floor never LOWERS a stored value
 *   §4  the withdrawal minimum is DERIVED from the live fee (TZS 1,015 at 1.5% — the fee rounds) and every surface states it
 *   §5  the other doors that name a minimum: an invite programme's minimum bet, the dev stress harness
 */
import { readFileSync } from "node:fs";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { deposit } from "../src/lib/server/wallet-service.ts";
import { DEPOSIT_MIN_TZS, DEPOSIT_MAX_TZS, AdminDepositSchema, withdrawMinFor, WITHDRAW_MIN_TZS } from "../src/lib/server/validators.ts";
import { PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE, minWithdrawalForRate } from "../src/lib/payout.ts";
import { getGlobalConfig, getEffectiveConfig, floorStakeBounds, getStoredStakeBounds } from "../src/lib/server/market-config.ts";
import { getUpDownConfig, stakeBoundsFor } from "../src/lib/server/updown-config.ts";
import { createMarket, buyPosition, stakeBoundsForMarket } from "../src/lib/server/market-service.ts";
import { setPaymentControls } from "../src/lib/server/payment-control.ts";
import { validateAffiliateConfig, DEFAULT_AFFILIATE_CONFIG } from "../src/lib/affiliate-rules.ts";
import { dict } from "../src/lib/i18n-dict.ts";
import { fill, formatNumber, formatTzs } from "../src/lib/utils.ts";
import { renderFailure } from "../src/lib/failure-reasons.ts";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s}`);
const J = (v: unknown) => JSON.stringify(v);
const now = () => new Date().toISOString();
const src = (rel: string) => decomment(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8")).replace(/\s+/g, " ");

await setPaymentControls({ provider: "mock" }, "test").catch(() => {});
let seq = 0;
async function player(id: string, balance = 0) {
  await db.user.create({ id, phoneE164: `+25574${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
    lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE",
    createdAt: now(), updatedAt: now() } as StoredWallet);
}

// ── §1 ────────────────────────────────────────────────────────────────────────────────────────────
section("§1 · the deposit minimum is enforced");
{
  ok("1.0 ★ the deposit minimum's one home says 1,000, and the stake minimum's says 500 — two rules, two figures (2026-10-12)",
    DEPOSIT_MIN_TZS === 1_000 && PLATFORM_MIN_STAKE === 500, `${DEPOSIT_MIN_TZS}/${PLATFORM_MIN_STAKE}`);
  await player("mm_dep");
  const low = await deposit("mm_dep", { provider: "MPESA", amount: 999, msisdn: "712345678" });
  const rows = (await db.txn.listForUser("mm_dep")).length;
  ok("1.1 ★ TZS 999 is refused, and leaves no row", !low.ok && rows === 0, J(low));
  const floor = await deposit("mm_dep", { provider: "MPESA", amount: 1_000, msisdn: "712345678" });
  ok("1.2 ★ TZS 1,000 exactly is accepted", floor.ok, J(floor));
  const old = await deposit("mm_dep", { provider: "MPESA", amount: 500, msisdn: "712345678" });
  ok("1.3 TZS 500 — the old deposit minimum, and the STAKE minimum since 2026-10-12 — is still refused as a deposit", !old.ok, J(old));
  const adm = AdminDepositSchema.safeParse({ provider: "MPESA", amount: 999 });
  ok("1.4 the officer's manual deposit holds the same floor, and says so", !adm.success && /1,000/.test(J(adm.error?.issues ?? [])) && AdminDepositSchema.safeParse({ provider: "MPESA", amount: 1_000 }).success, J(adm.error?.issues ?? []));
}

// ── §2 ────────────────────────────────────────────────────────────────────────────────────────────
section("§2 · every sentence that teaches the minimum is filled from the constant");
{
  const LOCS = ["en", "sw", "zh"] as const;
  for (const loc of LOCS) {
    const d = dict[loc] as unknown as { common: Record<string, string>; wallet: Record<string, string> };
    const dep = d.common.depositAmountHint, wd = d.wallet.amountHint;
    ok(`2.1.${loc} · the deposit and withdraw hints are {min}/{max} templates — no minimum typed into the dictionary`,
      dep.includes("{min}") && dep.includes("{max}") && wd.includes("{min}") && wd.includes("{max}") && !/TZS[ \u00a0]500\b/.test(dep + wd));
    const filled = fill(dep, { min: formatNumber(DEPOSIT_MIN_TZS), max: formatNumber(DEPOSIT_MAX_TZS) });
    ok(`2.2.${loc} · filled, the deposit hint states 1,000 and leaves no brace`, filled.includes("1,000") && !filled.includes("{"), filled.slice(0, 60));
  }
  const chat = readFileSync(new URL("../src/app/_actions/chat.ts", import.meta.url), "utf8");
  const lit = /Min TZS ([\d,]+), max TZS ([\d,]+)\./.exec(chat);
  ok("2.3 ★ the assistant's prompt states the SAME bounds the form enforces",
    !!lit && lit[1] === formatNumber(DEPOSIT_MIN_TZS) && lit[2] === formatNumber(DEPOSIT_MAX_TZS), J(lit?.slice(1) ?? null));
  const amountField = src("src/app/wallet/deposit/deposit-amount.tsx");
  ok("2.4 the deposit field fills its hint from the constants and passes the minimum to the input",
    amountField.includes("fill(t.common.depositAmountHint, { min: formatNumber(DEPOSIT_MIN_TZS), max: formatNumber(DEPOSIT_MAX_TZS) })") && amountField.includes("min={DEPOSIT_MIN_TZS}"));
  // ⭐ 2026-10-12: the assistant's STAKE sentence read "The minimum stake is TZS 1,000" as a typed literal — a second home
  // for the rule, which the owner's change would have left teaching the old figure on demand. It reads the constants now.
  const chatCode = src("src/app/_actions/chat.ts");
  ok("2.5 ★ the assistant's prompt states the stake bounds FROM the constants — no stake figure typed",
    chatCode.includes("The minimum stake is ${formatTzs(PLATFORM_MIN_STAKE)} and the maximum is ${formatTzs(PLATFORM_MAX_STAKE)} PER BET")
      && !/minimum stake is TZS/i.test(chatCode),
    J(/minimum stake is[^.]*/i.exec(chatCode)?.[0] ?? null));
  ok("2.6 …and the deposit sentence beside it is still the deposit's own figure, not the stake's",
    !!lit && lit[1] === formatNumber(DEPOSIT_MIN_TZS) && lit[1] !== formatNumber(PLATFORM_MIN_STAKE));
}

// ── §3 ────────────────────────────────────────────────────────────────────────────────────────────
section("§3 · a stored value under the stake minimum cannot reach any reader — and a read never lowers one");
{
  await getGlobalConfig(); await getUpDownConfig(); // hydrate, then plant values straight into the stores
  const g = globalThis as unknown as { __50PICK_MARKET_CONFIG: { global: { minStake: number }; perMarket: Map<string, Record<string, number>> }; __50PICK_UPDOWN_CONFIG: { defaultMinStake: number } };
  const savedGlobal = g.__50PICK_MARKET_CONFIG.global.minStake;
  const savedUd = g.__50PICK_UPDOWN_CONFIG.defaultMinStake;
  // A stored value UNDER the minimum — the shape a row written before a floor rose would carry.
  const UNDER = 400;
  g.__50PICK_MARKET_CONFIG.global.minStake = UNDER;
  g.__50PICK_UPDOWN_CONFIG.defaultMinStake = UNDER;
  const m = await createMarket({ titleEn: "Minimum market", titleSw: "Soko la chini", category: "macro", sourceUrl: "https://bot.go.tz",
    resolutionCriterion: "Resolves at the official date.", resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test" } as never);
  g.__50PICK_MARKET_CONFIG.perMarket.set(m.id, { minStake: UNDER });

  ok("3.0 control · the planted values really are stored (the raw reader sees 400)", (await getStoredStakeBounds()).minStake === UNDER);
  ok("3.1 ★ the global read floors to 500", (await getGlobalConfig()).minStake === 500, J((await getGlobalConfig()).minStake));
  ok("3.2 ★ a per-market override of 400 reads 500", (await getEffectiveConfig(m.id)).minStake === 500);
  ok("3.3 ★ the Up & Down product default reads 500", (await getUpDownConfig()).defaultMinStake === 500);
  ok("3.4 ★ a chain stored at 400 resolves to 500", (await stakeBoundsFor({ minStake: UNDER, maxStake: null } as never)).min === 500);
  ok("3.5 the one resolver the board, the house engine and the money path read says 500", (await stakeBoundsForMarket({ id: m.id, productLine: "MARKET" })).min === 500);
  await player("mm_bet", 50_000);
  const b499 = await buyPosition("mm_bet", { marketId: m.id, side: "YES", stake: 499 }) as { ok: boolean; reason?: string; detail?: { min?: number } };
  ok("3.6 ★ the money path refuses a 499 stake on that market — as below the minimum, against a minimum of 500",
    !b499.ok && b499.reason === "stake_below_min" && b499.detail?.min === 500, J(b499));
  for (const loc of ["en", "sw", "zh"] as const) {
    const body = renderFailure(b499 as never, (dict[loc] as unknown as { error: Record<string, string> }).error, "", formatTzs).body;
    ok(`3.6.${loc} · …and the player reads TZS 500 as the minimum, twice, with no brace left and no 1,000 anywhere`,
      (body.match(/TZS[ \u00a0]500\b/g) ?? []).length === 2 && !body.includes("{") && !body.includes("1,000"), body);
  }
  const b500 = await buyPosition("mm_bet", { marketId: m.id, side: "YES", stake: 500 });
  ok("3.7 ★ …and takes 500", b500.ok, J(b500));
  const fl = floorStakeBounds({ minStake: UNDER, maxStake: 300 });
  ok("3.8 the floor lifts the max to at least the min, and a sane pair passes through", fl.minStake === 500 && fl.maxStake === 500
    && J(floorStakeBounds({ minStake: 2_000, maxStake: PLATFORM_MAX_STAKE })) === J({ minStake: 2_000, maxStake: PLATFORM_MAX_STAKE }));
  // ⛔ THE PREMISE OF THE 2026-10-12 RECONCILE. A floor only RAISES: production's stored 1,000 reads 1,000 here, whatever
  // the constant says, exactly as an operator's deliberate narrower window must. Lowering it is `reconcileConfigDefaults`
  // v4 / `reconcileUpDownDefaults` v5 (`test:config` §6b, proven on Postgres by `test:stake-minimum-db`) — never a read.
  g.__50PICK_MARKET_CONFIG.global.minStake = 1_000;
  g.__50PICK_UPDOWN_CONFIG.defaultMinStake = 1_000;
  ok("3.9 a stored 1,000 still reads 1,000 — the floor never lowers a stored value; the reconcile is what moves production",
    (await getGlobalConfig()).minStake === 1_000 && (await getUpDownConfig()).defaultMinStake === 1_000
      && (await stakeBoundsFor({ minStake: null, maxStake: null } as never)).min === 1_000);
  g.__50PICK_MARKET_CONFIG.global.minStake = savedGlobal;
  g.__50PICK_UPDOWN_CONFIG.defaultMinStake = savedUd;
  g.__50PICK_MARKET_CONFIG.perMarket.delete(m.id);
  const rules = src("src/app/legal/rules/up-down/page.tsx");
  ok("3.10 the Up & Down rulebook quotes Up & Down's own (floored) bounds", rules.includes("minStake: ud.defaultMinStake, maxStake: ud.defaultMaxStake"));
}

// ── §4 ────────────────────────────────────────────────────────────────────────────────────────────
section("§4 · the withdrawal minimum is derived, and stated truly");
{
  ok("4.1 ★ TZS 1,015 at the live 1.5% fee — the smallest amount whose net still clears TZS 1,000 (the fee rounds: 1,015 − 15)", withdrawMinFor(0.015) === 1_015, String(withdrawMinFor(0.015)));
  ok("4.2 …1,000 with no fee, and it follows the fee (1,111 at 10%)", withdrawMinFor(0) === Math.max(WITHDRAW_MIN_TZS, 1_000) && withdrawMinFor(0.10) === 1_111);
  ok("4.3 it is the payout floor's own arithmetic, never a second copy", withdrawMinFor(0.015) === Math.max(WITHDRAW_MIN_TZS, minWithdrawalForRate(0.015)));
  const page = src("src/app/wallet/withdraw/page.tsx");
  ok("4.4 the withdraw screen's hint and input take the derived figure",
    page.includes("const withdrawMin = withdrawMinFor(wcfg.withdrawalFeeRate);") && page.includes("min: formatNumber(withdrawMin)") && page.includes("min={withdrawMin}"));
  const action = src("src/app/wallet/withdraw/actions.ts");
  ok("4.5 the server's refusal states the same figure", action.includes("withdrawMinFor(") && action.includes("fill(t.wallet.amountHint"));
  const confirm = src("src/app/wallet/withdraw/withdraw-confirm.tsx");
  ok("4.6 the confirm step checks the same figure before it opens", confirm.includes("withdrawMinFor(feeRate)"));
  const wallet = src("src/app/wallet/page.tsx");
  ok("4.7 the wallet's Limits tab states it too", wallet.includes("withdrawMin: withdrawMinFor((await getEffectiveConfig()).withdrawalFeeRate)"));
  for (const loc of ["en", "sw", "zh"] as const) {
    const hint = fill((dict[loc] as unknown as { wallet: Record<string, string> }).wallet.amountHint, { min: formatNumber(withdrawMinFor(0.015)), max: formatNumber(5_000_000) });
    ok(`4.8.${loc} · filled, the withdraw hint says 1,015 and leaves no brace`, hint.includes("1,015") && !hint.includes("{"), hint);
  }
}

// ── §5 ────────────────────────────────────────────────────────────────────────────────────────────
section("§5 · the other doors that name a minimum");
{
  const at = (v: number) => validateAffiliateConfig({ ...DEFAULT_AFFILIATE_CONFIG, prize: { ...DEFAULT_AFFILIATE_CONFIG.prize, minBetAmountTzs: v } });
  ok("5.1 an invite programme's minimum bet: 0 (none) or a real stake — never a figure under the minimum (500 since 2026-10-12)",
    at(0).ok && at(500).ok && at(1_000).ok && !at(499).ok && !at(100).ok, J({ zero: at(0), floor: at(500), under: at(499) }));
  const stress = src("src/app/api/dev-test/stress-bulk-bet/route.ts");
  ok("5.2 the dev stress harness clamps at the platform minimum", stress.includes("Math.max(PLATFORM_MIN_STAKE, Math.min(1_000_000"));
}

console.log(`\nmoney-minimums: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
