/**
 * THE ANCHORS `red:wallet-reach` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason every anchors file here gives: `test:red-anchors` must answer
 * *"does every anchor still resolve, exactly once?"* WITHOUT executing a harness that rewrites
 * real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * The balance capsule became the wallet door at EVERY width on 2026-08-25, after Ali asked
 * for the balance always visible and players voted down the phone-only wallet icon that had
 * stood in for it. Each mutation restores one way that can silently regress.
 *
 * ⭐ THE FIRST IS THE DEFECT THAT STARTED IT, and it is not "the balance was hidden" — it is
 * that the ladder was NON-MONOTONIC: shown, hidden, shown, hidden as the window WIDENS. Every
 * branch had a reason and the sequence had none, so the same account on the same build showed
 * a balance on a 1440 laptop and none on a 1920 monitor.
 *
 * ⭐ AND THE LAST IS THE POSITIVE CONTROL. §5 asserts the widest string the pill can ever
 * render is bounded — a claim that passes trivially while the compact branch exists. The
 * mutation REMOVES the branch, so the width becomes a function of how much the player has
 * won, and the bound assertion must be the thing that fails.
 *
 * ⚠️ SINGLE-LINE ANCHORS. This tree is CRLF and these declarations are LF, so a multi-line
 * anchor cannot match and the replace becomes a silent no-op — which reads as "the guard
 * failed to catch the defect" rather than "the harness never ran".
 * ⚠️ And no replacement may CONTAIN its own anchor, or the did-it-reach-disk check refuses a
 * mutation that applied correctly.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const BAR = "src/components/layout/top-app-bar.tsx";
const PILL = "src/components/layout/wallet-balance-pill.tsx";
const UTILS = "src/lib/utils.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "non-monotonic-ladder-returns",
    why: "⭐ THE ORIGINAL DEFECT, VERBATIM: the balance is gated shown/hidden/shown/hidden as the window widens. Every branch is defensible and the SEQUENCE is not — a player on a 1920 monitor loses the balance a 1440 laptop shows, and no explanation exists outside a source comment",
    file: BAR,
    suite: "wallet-reach",
    from: `            <WalletBalancePill balance={user.balance} />`,
    to: `            <span className="hidden sm:flex lg:hidden xl:flex 2xl:hidden"><WalletBalancePill balance={user.balance} /></span>`,
    expect: "3: ⛔ the old non-monotonic ladder has not come back",
  },
  {
    name: "second-door-in-the-nav",
    why: "`/wallet` returns to the inline nav, so from `lg` up the row carries TWO doors to one room — the capsule and a link. It is the wider of the two, and it is the 110px that had 1024 running 77px past its own container in Swahili",
    file: BAR,
    suite: "wallet-reach",
    from: `        { href: "/positions", label: t.common.positions },`,
    to: `        { href: "/positions", label: t.common.positions }, { href: "/wallet", label: t.nav.wallet },`,
    expect: "3: ⭐ /wallet is NOT an inline nav link",
  },
  {
    name: "hide-put-back-on-the-btn",
    why: "⛔ THE CSS TRAP, RESTORED: the Deposit CTA is hidden by classes ON the `.btn` instead of on a wrapper. `.btn { display: inline-flex }` is declared at globals.css:911, AFTER `@tailwind utilities`, so at equal specificity the component class wins and `.hidden` is silently ignored — the control renders at 360 anyway, 33px past the edge, while the class list reads correct",
    file: BAR,
    suite: "wallet-reach",
    from: `              className="btn gilt-metal btn-md btn-pill"`,
    to: `              className="btn gilt-metal btn-md btn-pill hidden sm:inline-flex"`,
    expect: "4: ⛔ and the hide is NOT on the button itself",
  },
  {
    name: "capsule-loses-its-border",
    why: "the border leaves the capsule, so the balance and its eye stop reading as one control and become two shapes sharing a background — which is the arrangement the 12px gap and the `-mx-1` were fighting before this was rebuilt",
    file: PILL,
    suite: "wallet-reach",
    from: `        border: flashing ? "1px solid var(--gold-300)" : "1px solid oklch(78% 0.13 80 / 0.35)",`,
    to: `        outline: flashing ? "1px solid var(--gold-300)" : "1px solid oklch(78% 0.13 80 / 0.35)",`,
    expect: "1: the capsule owns the border",
  },
  {
    name: "always-compact",
    why: "⭐ the threshold is dropped and every balance rounds to the nearest thousand. The pill still LOOKS right — it is still a balance, still in the bar — but a 500 TZS bet no longer changes the string, so the rolling counter and the gilt pulse announce a move the number does not show. That is the precise defect this component was built to fix",
    file: UTILS,
    suite: "wallet-reach",
    from: `  return Math.abs(value) >= BALANCE_COMPACT_ABOVE ? formatTzsCompact(value) : formatTzs(value);`,
    to: `  return formatTzsCompact(value);`,
    // ⚠️ It goes red on the EXACTNESS assertion first, which is the honest signature of this
    // defect: the string stops being the exact figure before it stops changing. Naming the
    // later assertion would have been naming a symptom of the symptom.
    expect: "5: a normal balance is exact, so the rolling counter still reads",
  },
  {
    name: "control-width-unbounded",
    why: "⭐ POSITIVE CONTROL — the compact branch is removed the OTHER way, so the figure is always exact and the pill's width becomes a function of how much the player has WON. Every correctness assertion in §5 still passes; only the BOUND fails. A bar that fits a small balance and breaks for a big one breaks for exactly the players who look at it most",
    file: UTILS,
    suite: "wallet-reach",
    from: `  return Math.abs(value) >= BALANCE_COMPACT_ABOVE ? formatTzsCompact(value) : formatTzs(value);`,
    to: `  return formatTzs(value);`,
    expect: "5: ⭐ the widest string this pill can EVER render is bounded",
  },
];
