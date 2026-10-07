/**
 * test:shortfall — the bet sheet's low-balance plan (the Vodacom plan S3, §3.1 `shortfallPlan`).
 *
 *   npm run test:shortfall     (in predeploy)
 *   npm run red:shortfall      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * What it holds `src/lib/journey/shortfall.ts` to (its two headroom helpers are proven against the REAL gates in
 * `test:deposit-ceiling`):
 *   1. THE ORDER — with EVERY gate failing, the plan names them one at a time as each is cleared, in `buyPosition`'s
 *      order: maintenance → a break (with its date) → the session limit → the account → the market → the stake → the
 *      wallet → the loss limit → a deposit already pending → the deposit.
 *   2. THE THREE DECK EXAMPLES — a shortfall of 3,000 → [3,000, 5,000, 10,000]; 5,000 → [5,000, 10,000, 25,000];
 *      300 → [1,000, 5,000, 10,000] with `belowDepositMin` (the deposit minimum is TZS 1,000 since 2026-10-07).
 *   3. SPENDABLE — the balance plus the bonus balance (what `buyPosition` refuses against); an unread balance is
 *      `unknown`, never zero.
 *   4. THE OFFER — an unconfirmed email is still a deposit, and the deposit asks no email step (the owner's ruling of
 *      2026-10-07); chips above the ceiling are dropped;
 *      a deposit the limits or source of funds would refuse is not offered, and neither is one with every rail paused;
 *      "bet instead" appears only at or above the minimum stake, within the loss headroom; a held wallet offers nothing.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written.
 */
import * as SF from "../src/lib/journey/shortfall.ts";

const PROVE_RED = process.argv.includes("--prove-red");
type Impl = { plan: typeof SF.shortfallPlan };
const REAL: Impl = { plan: SF.shortfallPlan };
const NOW = Date.UTC(2026, 9, 1, 9, 0);

/** A player who may bet, with TZS 2,000, staking TZS 5,000 on a LIVE market (min 1,000, max 1,000,000). */
function base(): SF.ShortfallInput {
  return {
    maintenance: false, lockout: null, session: null, account: { status: "ACTIVE", coolingOffUntil: null },
    market: { live: true, selectionClosed: false }, stake: 5_000, bounds: { min: 1_000, max: 1_000_000 },
    wallet: { status: "ACTIVE", balance: 2_000, bonusBalance: 0 }, loss: { dailyLossLimit: null, lossToday: 0 },
    pendingDeposit: null,
    deposit: {
      limits: { daily: null, weekly: null, monthly: null }, usage: { day: 0, week: 0, month: 0 },
      sof: { accepted: false, singleTxn: 1_000_000, rolling30d: 5_000_000 }, railsOpen: true,
    },
    nowMs: NOW,
  };
}

function run(impl: Impl, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const j = (v: unknown) => JSON.stringify(v);
  const P = (i: SF.ShortfallInput) => { try { return impl.plan(i); } catch (e) { return { kind: "threw", e: String(e) } as never; } };
  const tag = (p: SF.ShortfallPlan) => (p.kind === "blocked" ? p.reason : p.kind);

  /* 1 · the order */
  const all: SF.ShortfallInput = {
    ...base(), maintenance: true, lockout: { kind: "cooling_off", until: "2 Oct 2026, 09:00" },
    session: { exceeded: true, limitMin: 60, playedMin: 75 }, account: { status: "SUSPENDED" },
    market: { live: false, selectionClosed: true }, stake: 500, wallet: { status: "FROZEN", balance: 2_000, bonusBalance: 0 },
    loss: { dailyLossLimit: 3_000, lossToday: 0 }, pendingDeposit: { amount: 3_000, txnId: "txn_p" },
  };
  const seen: string[] = [];
  let cur = { ...all };
  seen.push(tag(P(cur)));
  cur = { ...cur, maintenance: false }; seen.push(tag(P(cur)));
  cur = { ...cur, lockout: null }; seen.push(tag(P(cur)));
  cur = { ...cur, session: null }; seen.push(tag(P(cur)));
  cur = { ...cur, account: { status: "ACTIVE" } }; seen.push(tag(P(cur)));
  cur = { ...cur, market: { live: true, selectionClosed: false } }; seen.push(tag(P(cur)));
  cur = { ...cur, stake: 5_000 }; seen.push(tag(P(cur)));
  cur = { ...cur, wallet: { status: "ACTIVE", balance: 2_000, bonusBalance: 0 } }; seen.push(tag(P(cur)));
  cur = { ...cur, loss: { dailyLossLimit: null, lossToday: 0 } }; seen.push(tag(P(cur)));
  cur = { ...cur, pendingDeposit: null }; seen.push(tag(P(cur)));
  ok("1.order · every gate failing, cleared one at a time: maintenance → cooling_off → session_limit → account_blocked → market_closed → stake_below_min → wallet_held → loss_limit → pending → short",
    j(seen) === j(["maintenance", "cooling_off", "session_limit", "account_blocked", "market_closed", "stake_below_min", "wallet_held", "loss_limit", "pending", "short"]), j(seen));
  const se = P({ ...base(), lockout: { kind: "self_exclusion", until: "1 Apr 2027" } });
  const cooling = (until: string | null) => tag(P({ ...base(), account: { status: "COOLED_OFF", coolingOffUntil: until } }));
  ok("1.breaks · a self-exclusion carries its date; a COOLED_OFF account is blocked until its end (or with no end), and free after it",
    se.kind === "blocked" && se.reason === "self_excluded" && se.until === "1 Apr 2027"
      && cooling(new Date(NOW + 3_600_000).toISOString()) === "account_blocked" && cooling(null) === "account_blocked"
      && cooling(new Date(NOW - 3_600_000).toISOString()) === "short", j({ se }));
  const stakeTags = [5_000.5, 999, 1_000_001].map((s) => tag(P({ ...base(), stake: s })));
  ok("1.stake · a fractional stake, one below the minimum, one above the maximum — each named", j(stakeTags) === j(["stake_not_whole", "stake_below_min", "stake_above_max"]), j(stakeTags));

  /* 2 · the deck's examples */
  const chipsFor = (balance: number, stake: number) => {
    const p = P({ ...base(), stake, wallet: { status: "ACTIVE", balance, bonusBalance: 0 } });
    const d = p.kind === "short" ? p.options.find((o) => o.kind === "deposit") : undefined;
    return d && d.kind === "deposit" ? { amount: d.amount, chips: d.chips, below: d.belowDepositMin } : null;
  };
  const e3 = chipsFor(2_000, 5_000), e5 = chipsFor(0, 5_000), e300 = chipsFor(4_700, 5_000);
  // ⭐ 2026-10-07: the deposit minimum is TZS 1,000 (management, via Ali — "consistently 1000 not 500"), so a 300 shortfall
  // offers 1,000 and the chips start there. Edited by the money-doors lane with the Vodacom lane's OK (this file is theirs).
  ok("2.examples · 3,000 → [3,000, 5,000, 10,000]; 5,000 → [5,000, 10,000, 25,000]; 300 → [1,000, 5,000, 10,000] below the deposit minimum",
    j(e3) === j({ amount: 3_000, chips: [3_000, 5_000, 10_000], below: false }) && j(e5) === j({ amount: 5_000, chips: [5_000, 10_000, 25_000], below: false })
      && j(e300) === j({ amount: 1_000, chips: [1_000, 5_000, 10_000], below: true }), j({ e3, e5, e300 }));

  /* 3 · spendable */
  const enough = P({ ...base(), wallet: { status: "ACTIVE", balance: 3_000, bonusBalance: 2_000 } });
  const unknown = P({ ...base(), wallet: { status: "ACTIVE", balance: null, bonusBalance: null } });
  const noWallet = P({ ...base(), wallet: null });
  ok("3.spendable · balance + bonus covers the stake (enough at 3,000 + 2,000); an unread balance or wallet is unknown, never a shortfall",
    enough.kind === "enough" && enough.spendable === 5_000 && unknown.kind === "unknown" && noWallet.kind === "unknown", j({ enough, unknown, noWallet }));

  /* 4 · the offer */
  // ⛔ No email step (the owner's ruling of 2026-10-07: a deposit asks no email question). The deposit option is exactly
  // its four fields, so a code-first flag cannot come back without failing here.
  const email = P(base());
  ok("4.email · the deposit option carries no email step — exactly kind, amount, chips and belowDepositMin",
    email.kind === "short" && email.options[0]?.kind === "deposit"
      && j(Object.keys(email.options[0]).sort()) === j(["amount", "belowDepositMin", "chips", "kind"]), j(email));
  const clamp = P({ ...base(), deposit: { ...base().deposit, limits: { daily: 7_000, weekly: null, monthly: null } } });
  ok("4.clamp · a chip above the ceiling is dropped (daily headroom 7,000: [3,000, 5,000])",
    clamp.kind === "short" && j((clamp.options[0] as SF.DepositOption).chips) === j([3_000, 5_000]), j(clamp));
  const limit = P({ ...base(), deposit: { ...base().deposit, limits: { daily: 10_000, weekly: null, monthly: null }, usage: { day: 8_000, week: 8_000, month: 8_000 } } });
  const sof = P({ ...base(), deposit: { ...base().deposit, usage: { day: 0, week: 0, month: 4_998_000 } } });
  const paused = P({ ...base(), deposit: { ...base().deposit, railsOpen: false } });
  const onlyInstead = (p: SF.ShortfallPlan, why: string) =>
    p.kind === "short" && p.depositRefusal === why && p.options.length === 1 && p.options[0].kind === "betInstead" && (p.options[0] as SF.BetInsteadOption).stake === 2_000;
  ok("4.refused · a deposit the daily limit, source of funds, or paused rails would refuse is not offered — \"bet instead\" (2,000) is",
    onlyInstead(limit, "deposit_limit") && onlyInstead(sof, "sof_required") && onlyInstead(paused, "rails_paused"), j({ limit, sof, paused }));
  const both = P(base());
  const poor = P({ ...base(), wallet: { status: "ACTIVE", balance: 800, bonusBalance: 0 } });
  ok("4.instead · \"bet instead\" sits beside the deposit at 2,000; with 800 (below the 1,000 minimum) it is not offered",
    both.kind === "short" && both.options.length === 2 && both.options[1].kind === "betInstead" && (both.options[1] as SF.BetInsteadOption).stake === 2_000
      && poor.kind === "short" && poor.options.length === 1 && poor.options[0].kind === "deposit", j({ both, poor }));
  // A stake over the player's own loss headroom is blocked — never an offer to deposit past their own limit. (A stake
  // within it that the wallet cannot cover leaves "bet instead" at most the balance, which is then within it too.)
  const lossOver = P({ ...base(), loss: { dailyLossLimit: 10_000, lossToday: 7_000 } });
  const lossAt = P({ ...base(), loss: { dailyLossLimit: 10_000, lossToday: 5_000 } });
  const spent = P({ ...base(), loss: { dailyLossLimit: 10_000, lossToday: 12_000 } });
  ok("4.loss · over the loss headroom is blocked with it (3,000 left); a stake equal to it goes on to the deposit; a spent limit reads 0, never negative",
    lossOver.kind === "blocked" && lossOver.reason === "loss_limit" && lossOver.headroom === 3_000
      && lossAt.kind === "short" && spent.kind === "blocked" && spent.reason === "loss_limit" && spent.headroom === 0, j({ lossOver, lossAt, spent }));
  const held = P({ ...base(), wallet: { status: "FROZEN", balance: 50_000, bonusBalance: 0 } });
  const pending = P({ ...base(), pendingDeposit: { amount: 3_000, txnId: "txn_p" } });
  ok("4.held · a held wallet offers nothing (the bet path refuses it); a pending deposit is waited on, never a second one",
    held.kind === "blocked" && held.reason === "wallet_held" && !("options" in held) && pending.kind === "pending" && pending.amount === 3_000 && pending.txnId === "txn_p",
    j({ held, pending }));
  return failed;
}

if (!PROVE_RED) {
  console.log("shortfall — the Vodacom plan S3 (pure)");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`\nSHORTFALL — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  const real = SF.shortfallPlan;
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const plants: Plant[] = [
    { name: "the loss limit asked before the wallet (the bet path's order swapped)", expect: /^1\.order /,
      impl: { plan: (i) => { const l = SF.lossHeadroomFor(i.loss); return i.wallet?.status !== "ACTIVE" && l !== null && i.stake > l && !i.maintenance && !i.lockout && !i.session?.exceeded && i.account.status === "ACTIVE" && i.market.live && Number.isInteger(i.stake) && i.stake >= i.bounds.min ? { kind: "blocked", reason: "loss_limit", headroom: l } : real(i); } } },
    { name: "a COOLED_OFF account blocked forever", expect: /^1\.breaks /,
      impl: { plan: (i) => (i.account.status === "COOLED_OFF" ? { kind: "blocked", reason: "account_blocked" } : real(i)) } },
    { name: "the bonus balance left out of spendable", expect: /^3\.spendable /,
      impl: { plan: (i) => real({ ...i, wallet: i.wallet && { ...i.wallet, bonusBalance: 0 } }) } },
    { name: "an unread balance read as zero", expect: /^3\.spendable /,
      impl: { plan: (i) => real({ ...i, wallet: i.wallet ? { ...i.wallet, balance: i.wallet.balance ?? 0 } : { status: "ACTIVE", balance: 0, bonusBalance: 0 } }) } },
    { name: "the deposit not floored at DEPOSIT_MIN_TZS", expect: /^2\.examples /,
      impl: { plan: (i) => { const r = real(i); return r.kind === "short" ? { ...r, options: r.options.map((o) => (o.kind === "deposit" ? { ...o, amount: r.shortfall, chips: [r.shortfall, ...o.chips.slice(1)] } : o)) } : r; } } },
    { name: "chips not clamped to the ceiling", expect: /^4\.clamp /,
      impl: { plan: (i) => real({ ...i, deposit: { ...i.deposit, limits: { daily: null, weekly: null, monthly: null } } }) } },
    { name: "an email step put back on the deposit option", expect: /^4\.email /,
      impl: { plan: (i) => { const r = real(i); return r.kind === "short" ? { ...r, options: r.options.map((o) => (o.kind === "deposit" ? { ...o, emailCodeFirst: true } : o)) } : r; } } },
    { name: "a deposit offered past the limits", expect: /^4\.refused /,
      impl: { plan: (i) => real({ ...i, deposit: { ...i.deposit, limits: { daily: null, weekly: null, monthly: null }, sof: { ...i.deposit.sof, accepted: true }, railsOpen: true } }) } },
    { name: "\"bet instead\" offered below the minimum stake", expect: /^4\.instead /,
      impl: { plan: (i) => { const r = real(i); return r.kind === "short" && !r.options.some((o) => o.kind === "betInstead") ? { ...r, options: [...r.options, { kind: "betInstead", stake: Math.floor(r.spendable) }] } : r; } } },
    { name: "the loss limit never asked", expect: /^4\.loss /,
      impl: { plan: (i) => real({ ...i, loss: { dailyLossLimit: null, lossToday: 0 } }) } },
    { name: "the loss limit refuses a stake equal to the headroom (off by one)", expect: /^4\.loss /,
      impl: { plan: (i) => { const l = SF.lossHeadroomFor(i.loss); return l !== null && i.stake >= l && i.wallet?.status === "ACTIVE" ? { kind: "blocked", reason: "loss_limit", headroom: Math.max(0, l) } : real(i); } } },
    { name: "a pending deposit ignored (a second deposit offered)", expect: /^4\.held /,
      impl: { plan: (i) => real({ ...i, pendingDeposit: null }) } },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = run(REAL, quiet);
  ok("the REAL plan passes every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = run(p.impl, quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
