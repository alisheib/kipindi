/**
 * THE ANCHORS `red:cashback-hidden` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * Jay item #5 — the cash back OFFER is hidden and nothing else moved. The risk here is
 * asymmetric and both directions matter:
 *   · the offer creeps back (a switch flipped, or a surface that reads its own condition);
 *   · the LEDGER PATH gets deleted along with the offer, which is the thing Ali explicitly
 *     did not ask for and which no "is the promo gone?" check can see.
 *
 * ⭐ `ripped-out-entirely` IS THE ONE TO READ. It turns the whole bonus system off, which
 * hides the promo perfectly — every "the offer is gone" assertion passes HARDER — while
 * taking referrals, invites, proposals and every existing grant down with it.
 *
 * ⚠️ SINGLE-LINE ANCHORS (CRLF tree); no replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const CFG = "src/lib/server/bonus-config.ts";
const DEP = "src/app/wallet/deposit/page.tsx";
const CLIENT = "src/app/wallet/wallet-client.tsx";
const WSVC = "src/lib/server/wallet-service.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "offer-comes-back",
    why: "the switch flips back on. Production carries NO bonus row, so this default IS the live value — the promo returns to /wallet and /wallet/deposit offering a 10% cash back bonus, which is the state Ali asked to end",
    file: CFG,
    suite: "cashback-hidden",
    from: `  cashbackEnabled: false,`,
    to: `  cashbackEnabled: true,`,
    expect: "1: ⛔ the cash back offer is OFF by default",
  },
  {
    name: "ripped-out-entirely",
    why: "⭐ the WHOLE bonus system is switched off instead of the offer. The promo disappears perfectly and every 'the offer is gone' assertion passes HARDER — while referrals, invites, proposal rewards and the two live ACTIVE grants go down with it. 'Hidden until further notice' is not 'deleted', and only a rule that asserts what must STILL work can tell the two apart",
    file: CFG,
    suite: "cashback-hidden",
    from: `  enabled: true,`,
    to: `  enabled: false,`,
    expect: "1: ⭐ …and the bonus system as a whole is still ON",
  },
  {
    name: "surface-invents-its-own-condition",
    why: "the deposit page stops consulting the switch and renders the promo off the percentage alone — a second definition of one truth, so the offer keeps appearing on that surface after it has been turned off everywhere else",
    file: DEP,
    suite: "cashback-hidden",
    from: `  const showCashback = bonusCfg.enabled && bonusCfg.cashbackEnabled && bonusCfg.cashbackPercentage > 0;`,
    to: `  const showCashback = bonusCfg.cashbackPercentage > 0;`,
    expect: "2: the deposit page gates the promo on the switch",
  },
  {
    name: "client-reads-config-itself",
    why: "the wallet CLIENT starts reading the switch instead of rendering the value its page computed — the gate chain stops being page-computes-then-client-renders and becomes two places that can disagree",
    file: CLIENT,
    suite: "cashback-hidden",
    from: `      {cashbackPercent > 0 && <CashbackPromo percent={cashbackPercent} mode={cashbackMode} />}`,
    to: `      {cashbackPercent > 0 && cashbackEnabled && <CashbackPromo percent={cashbackPercent} mode={cashbackMode} />}`,
    expect: "2: the wallet client renders off the passed-in value",
  },
  {
    name: "grant-branch-drops-auto",
    why: "🔴 the auto-grant branch stops requiring AUTO mode, so the switch alone now decides whether money is granted. The claim this whole change rests on — that hiding an OFFER cannot stop or start a GRANT — silently stops being true",
    file: WSVC,
    suite: "cashback-hidden",
    from: `      if (cfg.enabled && cfg.cashbackEnabled && cfg.cashbackMode === "AUTO" && cfg.cashbackPercentage > 0) {`,
    to: `      if (cfg.enabled && cfg.cashbackEnabled && cfg.cashbackPercentage > 0) {`,
    expect: "3: 🔴 …and that branch also requires AUTO mode",
  },
];
