/**
 * THE ANCHORS `red:updown-bell` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason `updown-readiness.anchors.mjs` sets out at length: the fleet
 * auditor (`test:red-anchors`) must answer *"does every anchor still resolve, exactly once?"*
 * WITHOUT executing a harness that rewrites real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Imported by a suite inside `test:all` — data only, repo-relative POSIX
 * paths, nothing that touches the filesystem to describe it.
 *
 * ── WHY DECLARING MATTERS HERE, MEASURED THE HARD WAY ────────────────────────
 * This harness was written with its mutations inline and `test:red-anchors` immediately went
 * RED: 68 undeclared harnesses against a ceiling of 67. That ratchet is the one edit
 * `red-anchors.test.mts` forbids raising, and it was right to refuse — an inline anchor is one
 * nobody can audit, and this campaign has already watched three inline anchors rot silently
 * when the code under them was rewritten (`updown-push-red.mjs`, 2026-08-22, same day).
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * Every one reintroduces a defect the Up & Down bell rows exist to prevent, and most of them
 * ACTUALLY SHIPPED on this platform:
 *  · `loss-produces-no-row` is E-43 exactly — one outcome goes silent while the rest carry on.
 *    Measured on production: 56/56 refunds announced, 0/13 wins, 0/11 losses.
 *  · `href-*` are the quiet ones. `notify()` dedupes byte-identical messages inside 90s, so a
 *    row that links to the BOARD instead of its own round makes the second round at the same
 *    stake vanish — nothing throws, a row simply never exists.
 *  · `zh-loss-says-bet-failed` restores 投注失败, which tells a Chinese reader the bet never
 *    went through at the moment it was placed and lost (E-179).
 *  · `push-tag-falls-back-to-kind` collapses every result under one device key, so a win is
 *    silently replaced on the lock screen by a later loss.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string }} RedMutation */

const NS = "src/lib/server/notification-service.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "loss-produces-no-row",
    why: "the loss stops writing a bell row — the player hears from us only when the news is good",
    file: NS,
    suite: "updown-bell",
    from: `export function notifyUpDownLoss(userId: string, opts: UpDownResultOpts) {
  return notifyUpDownResult(userId, "LOSS", opts, {`,
    to: `export function notifyUpDownLoss(userId: string, opts: UpDownResultOpts) {
  if (1 > 0) return null;
  return notifyUpDownResult(userId, "LOSS", opts, {`,
  },
  {
    name: "href-loses-the-round",
    why: "rows link to the board rather than their own round, so a second round at the same stake is silently deduped away",
    file: NS,
    suite: "updown-bell",
    from: "    href: opts.roundHref,\n  }, { pushTag: opts.pushTag });",
    to: "    href: \"/updown\",\n  }, { pushTag: opts.pushTag });",
  },
  {
    name: "href-becomes-history",
    why: "rows open the daily history page instead of the round, which cannot say which round settled",
    file: NS,
    suite: "updown-bell",
    from: "    href: opts.roundHref,\n  }, { pushTag: opts.pushTag });",
    to: "    href: \"/updown/history\",\n  }, { pushTag: opts.pushTag });",
  },
  {
    // ⚠️ THE ANCHOR IS DELIBERATELY MULTI-LINE. The single `titleZh:` line appears TWICE —
    // `notifyLoss` (long-form) and `notifyUpDownLoss` carry identical title lines — so a
    // one-line anchor mutated the WRONG emitter and left the Up & Down one untouched. The
    // harness reported "anchor still present after write" rather than a false green, which
    // is exactly why that post-write re-read exists.
    name: "zh-loss-says-bet-failed",
    why: "the Chinese loss reverts to 投注失败, telling the reader their bet never went through at the moment it was placed and lost",
    file: NS,
    suite: "updown-bell",
    from: `export function notifyUpDownLoss(userId: string, opts: UpDownResultOpts) {
  return notifyUpDownResult(userId, "LOSS", opts, {
    titleEn: \`Bet lost · \${formatTzs(opts.stake)}\`,
    titleSw: \`Dau limepotea · \${formatTzs(opts.stake)}\`,
    titleZh: \`投注未中 · \${formatTzs(opts.stake)}\`,`,
    to: `export function notifyUpDownLoss(userId: string, opts: UpDownResultOpts) {
  return notifyUpDownResult(userId, "LOSS", opts, {
    titleEn: \`Bet lost · \${formatTzs(opts.stake)}\`,
    titleSw: \`Dau limepotea · \${formatTzs(opts.stake)}\`,
    titleZh: \`投注失败 · \${formatTzs(opts.stake)}\`,`,
  },
  {
    name: "win-headlines-the-stake",
    why: "the win announces the stake instead of the realised payout — a figure that is not the figure paid",
    file: NS,
    suite: "updown-bell",
    from: "    titleEn: `You won ${formatTzs(opts.payout)}`,",
    to: "    titleEn: `You won ${formatTzs(opts.stake)}`,",
  },
  {
    name: "refund-is-filed-as-a-win",
    why: "a refund is filed under WIN, the misfiling comms-registry already flags as making the production event numbers wrong",
    file: NS,
    suite: "updown-bell",
    from: `export function notifyUpDownRefund(userId: string, opts: UpDownResultOpts) {
  return notifyUpDownResult(userId, "DEPOSIT", opts, {`,
    to: `export function notifyUpDownRefund(userId: string, opts: UpDownResultOpts) {
  return notifyUpDownResult(userId, "WIN", opts, {`,
  },
  {
    name: "push-tag-falls-back-to-kind",
    why: "results collapse under one device key, so a win is silently replaced by a later loss",
    file: NS,
    suite: "updown-bell",
    from: "  }, { pushTag: opts.pushTag });",
    to: "  });",
  },
];
