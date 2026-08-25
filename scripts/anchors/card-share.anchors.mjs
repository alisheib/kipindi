/**
 * THE ANCHORS `red:card-share` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * A tiny share trigger joined the market card's footer on 2026-08-25. The row it lives in
 * PAINTS 17px and must keep painting 17px — `MARKET_CARD_H` (349) is derived from it and both
 * /markets skeletons consume that number — so most of the risk here is a control that grows.
 *
 * ⭐ THE LAST IS THE POSITIVE CONTROL: it removes the trigger from the card entirely, so
 * every rule about how the trigger behaves passes VACUOUSLY over a card that has none.
 *
 * ⚠️ SINGLE-LINE ANCHORS (CRLF tree); no replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const CARD = "src/components/markets/market-card.tsx";
const SHARE = "src/components/markets/share-button.tsx";
const CSS = "src/app/globals.css";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "label-returns-to-the-row",
    why: "⭐ the word SHARE renders beside the glyph in a row whose height is a PUBLISHED CONSTANT. `MARKET_CARD_H` (349) is derived from that row and both /markets skeletons consume it, so the card silently stops matching its own skeleton on /markets, /live, /watchlist and the landing at once",
    file: SHARE,
    suite: "card-share",
    from: `        {!compact && (copied ? t.common.copied : t.common.share)}`,
    to: `        {copied ? t.common.copied : t.common.share}`,
    expect: "3: ⛔ the compact variant renders no text label",
  },
  {
    name: "height-on-the-class",
    why: "`.mcardp-share` gains a height, which is the obvious way to reach the tap floor and the one way that moves every card on four surfaces. The whole point of the pseudo-element is that the TARGET grows and the BOX does not",
    file: CSS,
    suite: "card-share",
    from: `  color: var(--text-subtle);\n  transition: color var(--dur-micro) var(--ease-micro);\n}`,
    to: `  color: var(--text-subtle);\n  height: 40px;\n  transition: color var(--dur-micro) var(--ease-micro);\n}`,
    expect: "3: ⛔ `.mcardp-share` sets no height that could raise the row",
  },
  {
    name: "reach-falls-back-into-flow",
    why: "the reach stops being out-of-flow, so the pseudo-element occupies real space and pushes the row open — the tap floor is met and the card geometry is broken, which is the trade this technique exists to avoid",
    file: CSS,
    suite: "card-share",
    from: `.mcardp-share::after {\n  content: "";\n  position: absolute;`,
    to: `.mcardp-share::after {\n  content: "";\n  position: relative;`,
    expect: "4: the reach is an OUT-OF-FLOW pseudo-element",
  },
  {
    name: "card-swallows-the-share-tap",
    why: "🔴 `stopPropagation` is dropped. The whole CARD is a click target that opens the market, so every share tap navigates away before the dialog can render — the control looks present, is correctly named, and does nothing a player can see",
    file: SHARE,
    suite: "card-share",
    from: `        onClick={(e) => { e.stopPropagation(); setOpen(true); }}`,
    to: `        onClick={() => setOpen(true)}`,
    expect: "5: 🔴 the trigger stops the card's own click",
  },
  {
    name: "control-no-trigger-on-the-card",
    why: "⭐ POSITIVE CONTROL — the trigger is removed from the card. Every rule about how it is sized, named and wired still passes, because those rules read `share-button.tsx`, which is untouched. Only the assertion that the CARD renders one stands between that and a green report on a card with no share control at all",
    file: CARD,
    suite: "card-share",
    from: `        <ShareButton compact marketId={id} title={title} />`,
    to: `        {null}`,
    expect: "1: …in its COMPACT variant",
  },
  {
    name: "details-loses-its-context",
    why: "🔴 THE DEFECT THAT SHIPPED AND WAS CAUGHT ONLY BY HIT-TESTING. `.mcardp-details` drops its own `position: relative`, so its absolute overlay resolves against the footer ROW instead of itself, `left:0; right:0` spans the whole row, and the invisible layer sits on top of the share trigger. Both controls still render, both are still correctly named, and the share button becomes unclickable at every point including its centre",
    file: CSS,
    suite: "card-share",
    from: `.mcardp-details { position:relative; display:inline-flex;`,
    to: `.mcardp-details { display:inline-flex;`,
    expect: "4: 🔴 `.mcardp-details` declares its own positioning context",
  },
];
