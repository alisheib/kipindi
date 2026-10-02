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
 *
 * ── S6 (2026-10-01) · THE CAPTIONED CAPSULE ─────────────────────────────────
 * The journey header's balance (`WalletBalanceCaptioned`, the last export in the pill's file) and the
 * Wallet's journey words add thirteen, each naming the §8 check that must catch it and restoring one way
 * that capsule can drift: back toward the classic one it was built beside (an eye, a currency word that
 * yields, the classic name, an inline ring, a figure that no longer rolls), off the S4 frames (a gold
 * frozen figure, a figure step at the wrong width, a figure that is not money type, a delta that shares
 * the caption's row or covers a frozen one), or out of the journey's words (a Wallet without them, a
 * Deposit or a Withdraw in the classic word).
 * ⚠️ THREE OF THEM REWRITE globals.css, so this harness now rewrites the stylesheet while it runs, as it
 * already rewrote the bar and the pill. Run it detached with nothing else running, and diff the tree after.
 *
 * ── S6 (2026-10-01) · THE JOURNEY BAR (WP6a) ────────────────────────────────
 * Five more, each naming its §8c check and each restoring a width gate the journey header must not have: the pill
 * hidden where the classic one hides, its words yielding with the "+", a guest's Ingia gone from a phone (E-276 in the
 * new bar), the capsule shown only on a desktop, and the whole money cluster made invisible on a phone by a class on
 * its wrapper, outside every guard. They rewrite `journey-top-bar.tsx`, which AppShell mounts for a journey request
 * (WP6b); the gate reads its source, so each was provable from the commit that added it, before the mount.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const BAR = "src/components/layout/top-app-bar.tsx";
const PILL = "src/components/layout/wallet-balance-pill.tsx";
const UTILS = "src/lib/utils.ts";
const SHEET = "src/components/layout/wallet-sheet.tsx";
const CSS = "src/app/globals.css";
const JBAR = "src/components/journey/journey-top-bar.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "non-monotonic-ladder-returns",
    why: "⭐ THE ORIGINAL DEFECT, VERBATIM: the balance is gated shown/hidden/shown/hidden as the window widens. Every branch is defensible and the SEQUENCE is not — a player on a 1920 monitor loses the balance a 1440 laptop shows, and no explanation exists outside a source comment",
    file: BAR,
    suite: "wallet-reach",
    from: `            <WalletBalancePill balance={liveBalance} held={!!user.walletHeld} />`,
    to: `            <span className="hidden sm:flex lg:hidden xl:flex 2xl:hidden"><WalletBalancePill balance={liveBalance} held={!!user.walletHeld} /></span>`,
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
    // ⚠️ RE-ANCHORED 2026-09-03 (PV-13a). The capsule's bordering hairline moved from a real
    // `border` to an `inset` box-shadow — a real border sits INSIDE the border-box and was
    // eating 2px off the capsule's CONTENT height, which is why the eye (sized with `h-full`)
    // first resolved to 42px instead of the 44px rung. Same mutation SHAPE, same property this
    // check still requires: swap the winning property away from `boxShadow` so the capsule
    // stops owning a border-like treatment at all.
    name: "capsule-loses-its-border",
    why: "the bordering treatment leaves the capsule, so the balance and its eye stop reading as one control and become two shapes sharing a background — which is the arrangement the 12px gap and the `-mx-1` were fighting before this was rebuilt",
    file: PILL,
    suite: "wallet-reach",
    from: `        boxShadow: flashing`,
    to: `        outline: flashing`,
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
  {
    name: "captioned-gets-an-eye",
    why: "S6 · the eye comes back INTO the journey capsule. SJ-15 moved hiding balances into the Wallet the capsule opens, beside Withdraw, so the header row carries one control per job; an eye here is a second, smaller target inside a 44px pill on a 320 row that S4 measured with no room to spare",
    file: PILL,
    suite: "wallet-reach",
    from: `<I.lock s={16} className="kp-jbal__lock" />`,
    to: `<CashEye bare size={14} className="kp-jbal__lock" />`,
    expect: "8.4 no eye and no caret in the capsule",
  },
  {
    name: "tzs-yields-below-sm",
    why: "⭐ THE CLASSIC CHIP'S PHONE RULE, COPIED INTO THE CAPSULE THAT RULED IT OUT. The classic chip drops the currency word below 640 to make room for its eye; the journey capsule has no eye, and SJ-15 shows TZS at EVERY width. Copying the classic markup is the most natural way to build this capsule, and it silently brings back a bare number on every phone",
    file: PILL,
    suite: "wallet-reach",
    from: `<span>{hidden ? BALANCE_MASK : formatBalancePill(display)}</span>`,
    to: `<span><span className="hidden sm:inline">TZS </span>{hidden ? splitCurrency(BALANCE_MASK)[1] : splitCurrency(formatBalancePill(display))[1]}</span>`,
    expect: "8.5 TZS at EVERY width",
  },
  {
    name: "figure-loses-its-money-type",
    why: "the figure loses the amount class: no mono family, no tabular digits, no zero tracking. The roll then jitters as proportional digits change width, and §M4 (money is never letter-spaced) has nothing left to hold it at this call site",
    file: PILL,
    suite: "wallet-reach",
    from: `<span className="kp-jbal__fig amount">`,
    to: `<span className="kp-jbal__fig">`,
    expect: "8.7 the figure is money type",
  },
  {
    name: "captioned-name-says-wallet",
    why: "⭐ A11 · the classic capsule's name pasted onto the captioned one: a listener hears Pochi (Wallet) while the button shows Salio, so a voice-control user who says what they see addresses nothing (WCAG 2.5.3), and a frozen wallet stops saying it is frozen. It is the plan's own first draft, which the S6 critic caught as G12",
    file: PILL,
    suite: "wallet-reach",
    from: "aria-label={hidden ? `${caption} · ${t.common.hideBalances}` : `${caption} ${figure}`}",
    to: "aria-label={hidden ? `${t.common.wallet} · ${t.common.hideBalances}` : `${t.common.wallet} · ${formatTzs(balance)}`}",
    expect: "8.10 A11",
  },
  {
    name: "captioned-wallet-loses-the-journey-words",
    why: "the captioned capsule opens the Wallet WITHOUT the journey flag: the sheet says the classic Amana where the journey header says Weka pesa, two words for one action one tap apart",
    file: PILL,
    suite: "wallet-reach",
    from: `anchorRef={capsuleRef} journey />`,
    to: `anchorRef={capsuleRef} />`,
    expect: "8.3 the Wallet it opens is anchored to it",
  },
  {
    name: "captioned-drops-the-roll",
    why: "⭐ A18 · the captioned capsule stops calling the shared hook and paints the figure flat. Every visual check still passes, because the number is right at rest, but a bet no longer rolls the figure or pulses the ring: the silent jump the classic pill was built to end",
    file: PILL,
    suite: "wallet-reach",
    from: `const { display, flashing, delta } = useBalanceRoll(balance);`,
    to: `const [display, flashing, delta] = [balance, false, 0];`,
    expect: "8.11 A18",
  },
  {
    name: "journey-withdraw-loses-toa-pesa",
    why: "⭐ V19, REDEFINED · Withdraw stays one tap from the captioned capsule only if the Wallet it opens names it in the journey's words. Reverting the flag on this one door leaves Weka pesa beside a Withdraw in the classic word, and the pair stops reading as a pair",
    file: SHEET,
    suite: "wallet-reach",
    from: `{journey ? t.journey.withdrawAction : t.common.withdraw}`,
    to: `{t.common.withdraw}`,
    expect: "8b.3 V19",
  },
  {
    name: "journey-deposit-loses-weka-pesa",
    why: "the Wallet's Deposit forgets the journey flag: the journey header says Weka pesa and the door it opens says Amana, one action under two names one tap apart. The Withdraw beside it still says Toa pesa, so the pair reads as two vocabularies",
    file: SHEET,
    suite: "wallet-reach",
    from: `{journey ? t.journey.depositAction : t.common.deposit}`,
    to: `{t.common.deposit}`,
    expect: "8b.2 with it, Deposit says the journey's word",
  },
  {
    name: "held-figure-stays-gold",
    why: "the held half of the plain-ink rule is dropped, so a FROZEN wallet's figure keeps the gold of money you can use. The S4 held frame draws it in plain ink because gold marks a balance a player can spend; the masked half still looks right, which is what makes this the easy slip",
    file: CSS,
    suite: "wallet-reach",
    from: `.kp-jbal:is([data-held], [data-masked]) .kp-jbal__fig { color: var(--text); }`,
    to: `.kp-jbal[data-masked] .kp-jbal__fig { color: var(--text); }`,
    expect: "8.8 gold on a live balance, plain ink when held or masked",
  },
  {
    name: "flash-ring-goes-inline",
    why: "the gilt ring written inline, the way the classic capsule writes its own. It looks the same, and it puts a second inline box-shadow in a file whose one inline border is the classic capsule's: the plan kept the journey's paint in globals.css so the classic markup, and every anchor that points into it, stays the only one of its kind",
    file: PILL,
    suite: "wallet-reach",
    from: `data-flash={flashing ? "" : undefined}`,
    to: `style={{ boxShadow: flashing ? "0 0 0 3px var(--gold-300)" : undefined }}`,
    expect: "8.13 the gilt flash is a data attribute the stylesheet paints",
  },
  {
    name: "figure-steps-up-at-640",
    why: "the figure's 14px step moves to 640, where the classic chip steps its type. Every phone from 360 to 639 then keeps the 12px figure that S4 measured only as the 320 fallback: under the reading floor on the widths most players hold",
    file: CSS,
    suite: "wallet-reach",
    from: `@media (min-width: 360px) { .kp-jbal__fig { font-size: 14px; } }`,
    to: `@media (min-width: 640px) { .kp-jbal__fig { font-size: 14px; } }`,
    expect: "8.15 S4 fit rule: the figure is 12px below 360 and 14px from 360",
  },
  {
    name: "delta-shares-the-caption-row",
    why: "⭐ THE PLAN'S FIRST PLACEMENT, RESTORED: the delta pinned to the left end of the caption row with no fill of its own. It looks fine in Swahili at 360, where a drive would look first, and by the font metrics it overprints Balance in English at 320 on any move of 1,000 or more, and a frozen caption at every width",
    file: CSS,
    suite: "wallet-reach",
    from: `left: 0; right: 0; padding-block: 2px; text-align: right; background: var(--bg-inset);`,
    to: `left: 0;`,
    expect: "8.18 the ±delta TAKES the caption's row",
  },
  {
    name: "held-delta-covers-the-frozen-word",
    why: "the classic pill's delta condition copied across, so a balance that moves while the wallet is frozen covers Salio · limegandishwa with a number for half a second: the frozen word hidden at the one moment the player is looking at it",
    file: PILL,
    suite: "wallet-reach",
    from: `{!held && !hidden && flashing && delta !== 0 && (`,
    to: `{!hidden && flashing && delta !== 0 && (`,
    expect: "8.19 …and only on a LIVE, unmasked wallet",
  },
  {
    name: "journey-pill-yields-where-the-classic-one-does",
    why: "the classic bar's rule carried across: + Weka pesa shown only where the bell is, from 1024. On the classic bar that yield is paid for by the rail's centre coin; the journey rail has no coin (SJ-16), so on a phone the money door would simply be gone",
    file: JBAR,
    suite: "wallet-reach",
    from: `{state.pill && (`,
    to: `{state.pill && pollers.bell && (`,
    expect: "8c.2 + Weka pesa shows at EVERY width",
  },
  {
    name: "journey-plus-takes-the-words-with-it",
    why: "the classic pill's label idiom carried across: the words hidden below 1280, so on a phone the gilt pill is a bare + glyph. S4 measured the row with the words in and the + out, never the other way round",
    file: JBAR,
    suite: "wallet-reach",
    from: `<span>{t.journey.depositAction}</span>`,
    to: `<span className="hidden xl:inline">{t.journey.depositAction}</span>`,
    expect: "8c.3 its + is the one part that yields",
  },
  {
    name: "journey-sign-in-yields-on-phones",
    why: "⭐ E-276 IN THE NEW BAR: a returning player's way in hidden on a phone, the same width-0 Sign in Ali found on the classic bar in 2026-09, where the only account control left was the one that makes a NEW account",
    file: JBAR,
    suite: "wallet-reach",
    from: `className="btn btn-ghost btn-md btn-pill kp-jhdr__auth"`,
    to: `className="hidden sm:inline-flex btn btn-ghost btn-md btn-pill kp-jhdr__auth"`,
    expect: "8c.4 E-276",
  },
  {
    name: "journey-capsule-only-on-a-desktop",
    why: "the old non-monotonic ladder's first step, in the journey bar: the balance shown only where the bell is, so a phone player sees no balance at all, which is what Ali ruled out on 2026-08-25",
    file: JBAR,
    suite: "wallet-reach",
    from: `{state.capsule !== "none" && (`,
    to: `{state.capsule !== "none" && pollers.bell && (`,
    expect: "8c.1 the capsule is decided by the header state alone",
  },
  {
    name: "journey-money-cluster-invisible-on-phones",
    why: "the gate moved OUTSIDE every guard: the cluster that holds the capsule, + Weka pesa and a guest's way in made invisible below 1024 by a class on its own wrapper. Each guard still reads clean, so only a check over the whole bar sees it. A visibility class, because the cluster's own stylesheet rule sets its display and would beat a display utility",
    file: JBAR,
    suite: "wallet-reach",
    from: `<div className="kp-jhdr__cluster">`,
    to: `<div className="invisible lg:visible kp-jhdr__cluster">`,
    expect: "8c.5 …and nothing AROUND them yields by width either",
  },
];
