/**
 * THE MATCH'S WORDS — every sentence the landing's Up & Down scoreboard says, built in ONE place
 * (landing v3, R5 · spec updown-band-v2 §4.1 "Composed nodes").
 *
 * The server band renders the rule from it, and the band's live leaf (`updown-match-live.tsx`) renders the
 * verdict, the detail and the timeline's description from it — at first paint and again whenever the
 * 60-second refresh brings in a newer confirmed read (R5(a)). One builder, so the page and the refreshed
 * page cannot phrase one read two ways.
 *
 * ⛔ NO DIRECTIVE AND NO IMPORT FROM A `"use client"` MODULE: the server calls it.
 * ⛔ COMPOSED WITH `fillNodes` OR AS EXPLICIT ARRAYS, never adjacent JSX expressions across a line break —
 * the served-HTML trap that printed "hour<!-- -->of" and "requiredbefore". Every space between two nodes
 * is a literal string here.
 * ⛔ WHAT IT NEVER SAYS (spec §11): an absolute price; "live" beside a number; a side's name in a level
 * line; a pool, a payout or a multiplier (law 40 — the round type has no money field to say it with).
 */
import { Fragment, type ReactNode } from "react";
import { I } from "@/components/ui/glyphs";
import { fill } from "@/lib/utils";
import { fillNodes } from "@/lib/fill-nodes";
import { usd } from "@/lib/usd-price";
import { sideWord } from "@/lib/side-label";
import { fmtEATClock } from "@/lib/updown-source-label";
import { matchLead, type MatchLead, type MatchRead, type UpdownBandRound } from "@/lib/updown-match";
import type { Dict, Locale } from "@/lib/i18n-dict";

export type MatchWords = {
  lead: MatchLead;
  /** The Up and Down side words (`sideWord`, UPDOWN): "Juu" / "Chini", "Up" / "Down", "涨" / "跌". */
  up: string;
  down: string;
  verdict: ReactNode;
  /** The dated line under the verdict; null while awaiting a price. */
  detail: ReactNode | null;
  /** The level state's refund note; null otherwise. */
  note: string | null;
  /** The round's rule in two sentences; null when the open or a target is unknown. */
  rule: ReactNode | null;
  /** The timeline in words, with EAT — the track's accessible name (K22). */
  aria: string;
};

const clock = (ms: number) => fmtEATClock(ms) ?? "—";

/** How far a read sits from the open, as the plain words the detail uses — for the track's description. */
function moveWords(t: Dict, read: MatchRead, open: number, decimals: number): string {
  const dev = read.price - open;
  const amount = usd(Math.abs(dev), decimals);
  if (read.side === "LEVEL" || dev === 0) {
    return amount === usd(0, decimals) ? t.home.udMatchLevelExact : fill(t.market.udLevelBy, { amount });
  }
  return `${dev > 0 ? t.market.udAboveOpenBy : t.market.udBelowOpenBy} ${amount}`;
}

export function matchWords(t: Dict, locale: Locale, round: UpdownBandRound): MatchWords {
  const up = sideWord(t, "YES", "UPDOWN");
  const down = sideWord(t, "NO", "UPDOWN");
  const lead = matchLead(round);
  const latest = round.reads?.at(-1) ?? null;
  // Plain element builders, not components: a component type declared per call would remount each render.
  const time = (ms: number) => <span className="mono kp-udnum">{clock(ms)}</span>;
  const amt = (v: number, key?: string) => <span key={key} className="amount">{usd(v, round.decimals)}</span>;

  // ── The verdict: the largest type in the panel, and the only focal point (V-1) ────────────────
  let verdict: ReactNode;
  if (lead === "up" || lead === "down") {
    const Arrow = lead === "up" ? I.arrowUp : I.arrowDown;
    verdict = [
      <Arrow key="a" s={16} className="kp-udbug__arrow" />,
      <span key="n" className="kp-udbug__now">{lead === "up" ? t.home.udMatchUpLeads : t.home.udMatchDownLeads}</span>,
      <span key="w" className="kp-udbug__was">{lead === "up" ? t.home.udMatchUpLed : t.home.udMatchDownLed}</span>,
    ];
  } else if (lead === "level") {
    verdict = [
      <span key="n" className="kp-udbug__now">{t.home.udMatchNobody}</span>,
      <span key="w" className="kp-udbug__was">{t.home.udMatchNobodyWas}</span>,
    ];
  } else if (lead === "kickoff") {
    // "Kick-off" never takes the aged swap (it has no past tense), and the call to act leaves at close.
    // The break, when there is one, falls after the dot: the side-picking words stay whole.
    verdict = [
      <span key="k" className="kp-udbug__kick">{t.home.udMatchKickoff}</span>,
      <span key="c" className="kp-udbug__cta">{" · "}<span>{t.home.udMatchPickSide}</span></span>,
    ];
  } else {
    verdict = t.market.udAwaitingRead;
  }

  // ── The detail: a dated fact, unchanged by the tense swap ─────────────────────────────────────
  let detail: ReactNode | null = null;
  if (latest && round.openPrice != null && (lead === "up" || lead === "down" || lead === "level")) {
    const dev = latest.price - round.openPrice;
    const at = <Fragment key="at">{fillNodes(t.home.udMatchAt, { time: time(latest.ms) })}</Fragment>;
    if (lead === "level") {
      const zero = usd(Math.abs(dev), round.decimals) === usd(0, round.decimals);
      detail = [at, " · ", zero
        ? <Fragment key="m">{t.home.udMatchLevelExact}</Fragment>
        : <Fragment key="m">{fillNodes(t.market.udLevelBy, { amount: amt(Math.abs(dev)) })}</Fragment>];
    } else {
      detail = [at, " · ", dev > 0 ? t.market.udAboveOpenBy : t.market.udBelowOpenBy, " ", amt(Math.abs(dev), "v")];
    }
  } else if (lead === "kickoff") {
    detail = [
      <span key="n" className="kp-udbug__now">{fillNodes(t.home.udMatchNoNewPrice, { time: time(round.opensAtMs) })}</span>,
      <span key="w" className="kp-udbug__was">{fillNodes(t.home.udMatchOpenedAt, { time: time(round.opensAtMs) })}</span>,
    ];
  }

  // ── The rule: when the result is decided, and when every stake comes back ─────────────────────
  // Symmetric targets say one margin; a round whose targets sit unevenly states both prices. Strict
  // "less than", like the strict void test (`decideOutcomeByTargets`: between the targets voids).
  let rule: ReactNode | null = null;
  const { openPrice: open, upTarget: upT, downTarget: downT, decimals } = round;
  if (open != null && upT != null && downT != null) {
    const symmetric = Math.abs((upT - open) - (open - downT)) < 0.5 * 10 ** -decimals;
    const margin = Math.max(upT - open, open - downT);
    const refund = symmetric
      ? fillNodes(t.home.udMatchRefund, { margin: amt(margin) })
      : fillNodes(t.home.udMatchRefundRange, { upWord: up, up: amt(upT), downWord: down, down: amt(downT) });
    rule = [
      <span key="d" className="kp-udrule__decides">{fillNodes(t.home.udMatchDecides, { close: time(round.closesAtMs) })}</span>,
      // Two sentences are joined by a space — except in Chinese, where a full stop takes none.
      locale === "zh" ? "" : " ",
      <span key="r" className="kp-udrule__refund">{refund}</span>,
    ];
  }

  // ── The timeline in words, with EAT (the band shows no zone; the description and the round page do) ──
  const readsWords = round.reads && round.reads.length > 0 && open != null
    ? round.reads.map((r) => fill(t.home.udMatchAriaRead, { time: clock(r.ms), move: moveWords(t, r, open, decimals) }))
      .join(locale === "zh" ? "；" : "; ")
    : t.home.udMatchAriaNone;
  const aria = fill(t.home.udMatchAria, {
    open: clock(round.opensAtMs), lock: clock(round.betsCloseAtMs), close: clock(round.closesAtMs), reads: readsWords,
  });

  return { lead, up, down, verdict, detail, note: lead === "level" ? t.home.udMatchLevelNote : null, rule, aria };
}
