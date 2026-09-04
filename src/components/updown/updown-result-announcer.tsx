"use client";

/**
 * THE RESULT MOMENT for Up & Down — Ali's *"perfect popup on win"*, 2026-08-05.
 *
 * ⭐ WHY THERE WAS NO MOMENT AT ALL, AND IT WAS TWO SILENCES MEETING.
 *  1. The board never sent the data. `myStakesByMarket` recorded a settled position only when
 *     `finalPayout === stake` (a refund); a WIN and a LOSS were both recorded as *nothing*, and
 *     `myUpStake`/`myDownStake` are zeroed the moment a position leaves OPEN. **A winner and a
 *     loser received byte-identical board props** — no surface could have congratulated anyone.
 *  2. The platform's `WinCelebrationHost` — which already exists and is already mounted once in
 *     `AppShell` — was fired by `notify-poller.tsx`, gated on a `readStoredBet()` localStorage
 *     record that the Up & Down quick-bet path never writes, and gated behind notifications,
 *     which `perEventNotificationsSuppressed()` turns off for UPDOWN. **Suppressing the message
 *     also suppressed the moment.**
 *     ✅ **2026-08-10 (DA-5 / E-115): that `readStoredBet()` gate no longer exists.** The
 *     long-form poller was rebuilt on this component's own contract — settled rows,
 *     `finalPayout`, status read never inferred — so the sentence above is history. This file
 *     stays the precedent; it is no longer the only one obeying the rule.
 *
 * ⛔ ALI'S 2026-07-24 DECISION STANDS AND THIS DOES NOT TOUCH IT. Shown the measured volume
 * (6.7 messages/hour per player on today's board, 15/hour on a 3-minute chain) he chose
 * **in-app only — no email, no push, no inbox row**. Everything here is client-side rendering
 * of data the page already has. ⛔ Do not "complete" this by calling `notifyWin`/`notifyLoss`.
 *
 * ⛔ IT FIRES ON AN OBSERVED TRANSITION, NEVER ON MOUNT. A popup that fires because you opened
 * a page is not a moment, it is an ambush — and it would re-congratulate a player every time
 * they returned to the board. The first render only SEEDS the map; a round announces when its
 * own `myResult` goes null → settled while this component stays mounted, which is exactly what
 * the `RefreshPoller`'s `router.refresh()` delivers (it re-renders the server tree without
 * remounting client children). `sessionStorage` then makes it once-per-round even across a
 * genuine remount.
 *
 * ⛔ THE THREE OUTCOMES ARE NOT TWO, AND CONFLATING THEM IS A FALSE MONEY STATEMENT.
 * A round can resolve DOWN and still hand an UP backer their whole stake back, because nobody
 * took the other side (E-65). Saying "you lost" there would be the E-39/E-65/E-68 defect on the
 * most screenshot-able screen in the product. The status is read off the POSITION ROW, never
 * inferred from the round's outcome.
 *
 * ⚠️ RG: the win is celebratory, the loss is NOT its mirror. Losses stay direct and
 * non-euphemistic (LCCP harm-prevention), which is why a loss gets a plain, quiet toast and
 * never a glow, a counter or a haptic.
 */

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import { dispatchWinCelebration } from "@/components/markets/win-celebration";
import { useT } from "@/lib/i18n";
import { formatTzs } from "@/lib/utils";
import { DWELL_RESULT_MS } from "@/lib/feedback-timing";
import { routeOutcome } from "@/lib/outcome-announcement";
import { isAttentive, presenceSinceMs, serverNow } from "@/lib/presence-window";
import { recordAway } from "@/lib/away-ledger";

export type AnnounceableRound = {
  roundId: string;
  /**
   * When the SERVER recorded the result — `BoardRound.resolvedAtMs`, already finite-checked
   * where it is built (`updown-board.ts`), so it is a real instant or `null` and never NaN.
   *
   * ⭐ IT IS WHAT LETS THIS LANE OBEY THE PRESENCE LAW, AND IT COST NO SERVER CHANGE: both
   * pages that mount this announcer already had the field on the round they were rendering.
   * ⛔ OPTIONAL ON PURPOSE, AND THE LAW HANDLES THE ABSENCE. A caller that omits it hands
   * `undefined` to `routeOutcome`, whose rule 2 routes an unknown instant to the ledger — the
   * calm channel — rather than to the seal. Missing information must never read as "yes, just
   * now"; that is exactly the case the RED harness found.
   */
  settledAtMs?: number | null;
  myResult: { status: "WIN" | "LOSS" | "VOID"; side: "UP" | "DOWN"; stake: number; payout: number } | null;
};

/** Once per round per browser session, so a remount cannot re-fire a result. */
const seenKey = (roundId: string) => `50pick:ud-announced:${roundId}`;

function alreadyAnnounced(roundId: string): boolean {
  try { return sessionStorage.getItem(seenKey(roundId)) === "1"; } catch { return false; }
}
function markAnnounced(roundId: string) {
  try { sessionStorage.setItem(seenKey(roundId), "1"); } catch { /* private mode — at worst it repeats once */ }
}

export function UpDownResultAnnouncer({ rounds }: { rounds: AnnounceableRound[] }) {
  const { toast } = useToast();
  const { t } = useT();
  /** roundId → whether we have already SEEN a settled result for it in this mount. */
  const seen = useRef<Map<string, boolean> | null>(null);

  useEffect(() => {
    // ── FIRST RENDER SEEDS, IT DOES NOT ANNOUNCE ──────────────────────────────────────────
    // Everything already settled when the player arrived is history, not news. Without this
    // the board would celebrate on every load, which is the opposite of a moment.
    if (seen.current == null) {
      seen.current = new Map(rounds.map((r) => [r.roundId, r.myResult != null]));
      return;
    }
    const map = seen.current;

    for (const r of rounds) {
      const settled = r.myResult != null;
      const before = map.get(r.roundId);
      map.set(r.roundId, settled);
      // A round this mount has never heard of is ALSO seeded rather than announced — it may
      // simply have scrolled into the list. Only a genuine false → true counts.
      if (before === undefined) continue;
      if (before || !settled) continue;

      const res = r.myResult!;
      if (alreadyAnnounced(r.roundId)) continue;

      const sideWord = res.side === "UP" ? t.market.udUp : t.market.udDown;

      /* ⭐ THE SAME LAW THE MARKET LANE OBEYS, FROM THE SAME MODULE. A round that settled while
       * the player was away is held for the calm bar; one they watched land still gets its
       * moment. ⛔ Not a second copy of the rules — `routeOutcome` is pure and is the only place
       * the 30-minute window, the freshness cap and the ceremony gate are written. */
      const routing = routeOutcome(
        { kind: res.status, settledAtMs: r.settledAtMs },
        { presenceSinceMs: presenceSinceMs(), serverNowMs: serverNow(), attentive: isAttentive() },
      );

      /* 🔴 THIS LANE CARRIED E-266 TOO, AND NOBODY HAD FILED IT. `markAnnounced(r.roundId)` used
       * to run HERE — before a single word had been shown — so a result whose announcement never
       * landed was burned for the whole browser session: `sessionStorage` said announced, and
       * nothing re-reads a settled round. The marker now moves below the delivery, behind the
       * same `delivered` gate the market poller uses. */
      let delivered = false;

      if (routing.channel === "CEREMONY" && res.status === "WIN") {
        // ⛔ THE REALISED PAYOUT, from the settled row — never a place-time projection. On a
        // pari-mutuel pool those differ, and a celebrated figure that is not the figure paid is
        // a false money statement. `net` is profit, so it is payout − stake and can be shown
        // with a "+".
        // ⭐ AND IT ANSWERS: the dispatch returns whether a host took the seal. `AppShell`
        // mounts that host behind `lazy()`, so "nobody was listening yet" is a real state on a
        // cold load — and an unacknowledged seal must not be recorded as announced.
        delivered = dispatchWinCelebration({
          kind: "WIN",
          amount: res.payout,
          net: res.payout - res.stake,
          label: `${t.market.udUpDown} · ${sideWord}`,
        });
      } else if (routing.channel === "TOAST" && res.status === "VOID") {
        // A refund is neither a win nor a loss and must say so in its own words. The amount is
        // the stake that came back, which for a void IS the payout.
        // ⛔ DA-4 (E-114) · `factual`, NOT `default` — the same reasoning as the LOSS toast
        // below, one branch up: `default` paints checkCircle, a CONFIRMATION TICK, over a
        // stake that merely came back. A refund is not an achievement and not an alarm; it
        // is a fact, and the kit has a variant whose whole job is stating one.
        toast({
          title: t.market.udStakeReturnedTitle,
          description: `${sideWord} · ${formatTzs(res.payout)}`,
          variant: "factual",
          durationMs: DWELL_RESULT_MS,
          groupKey: routing.groupKey,
          groupAmount: res.payout,
          groupLabel: (n, total) => ({
            title: t.notif.groupedReturned
              .replace("{n}", String(n))
              .replace("{amount}", formatTzs(total)),
          }),
        });
        delivered = true;
      } else if (routing.channel === "TOAST") {

      // LOSS — plain, direct, no glow and no haptic. It states the amount because a result
      // screen that will not name the number is the euphemism RG rules exist to prevent.
      //
      // ⛔ `factual`, AND THE VARIANT IS THE FIX. This shipped as `default` and the first live
      // photograph showed why that was wrong: `default` and `success` both paint **checkCircle**,
      // so a toast reading "Round lost · TZS 2,000" carried a **TICK** — a confirmation glyph
      // over the news that a player's money is gone. `warning` is gold, the celebration ink;
      // `danger` is red and reads as *something went wrong*, but losing a round is not an error,
      // it is the game working. The kit had no way to state a fact, so one was added to the KIT
      // (§0.1b rule 1) rather than a colour being hand-picked here.
        toast({
          title: t.market.udLostTitle,
          description: `${sideWord} · ${formatTzs(res.stake)}`,
          variant: "factual",
          durationMs: DWELL_RESULT_MS,
          groupKey: routing.groupKey,
          groupAmount: res.stake,
          groupLabel: (n, total) => ({
            title: t.notif.groupedLost
              .replace("{n}", String(n))
              .replace("{amount}", formatTzs(total)),
          }),
        });
        delivered = true;
      } else {
        /* ── LEDGER · held for the calm bar, exactly as the market lane holds its own ────────
         * The round settled while nobody was looking. Nothing fires; the entry joins the one
         * `AwaySummaryBar`, and a win among them still opens its seal on a TAP (ruling ①). */
        delivered = recordAway({
          id: r.roundId,
          kind: res.status,
          amount: res.payout,
          stake: res.stake,
          settledAtMs: r.settledAtMs ?? null,
          label: `${t.market.udUpDown} · ${sideWord}`,
        });
      }

      /* ⛔ THE MARKER MOVES ONLY ON A REAL DELIVERY. And when nothing was delivered the
       * transition is REWOUND — `map` was set to `settled` at the top of this iteration, so
       * leaving it there would make the next render read `before === true` and skip the round
       * forever. Rewinding lets the very next `router.refresh()` re-detect the same false → true
       * edge and try again, which is what makes the lazy-host window survivable rather than
       * merely detectable. */
      if (!delivered) { map.set(r.roundId, false); continue; }
      markAnnounced(r.roundId);
    }
  }, [rounds, toast, t]);

  return null;
}
