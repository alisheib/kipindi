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
 *     `AppShell` — is fired by `notify-poller.tsx`, gated on a `readStoredBet()` localStorage
 *     record that the Up & Down quick-bet path never writes, and gated behind notifications,
 *     which `perEventNotificationsSuppressed()` turns off for UPDOWN. **Suppressing the message
 *     also suppressed the moment.**
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

export type AnnounceableRound = {
  roundId: string;
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
      markAnnounced(r.roundId);

      const sideWord = res.side === "UP" ? t.market.udUp : t.market.udDown;

      if (res.status === "WIN") {
        // ⛔ THE REALISED PAYOUT, from the settled row — never a place-time projection. On a
        // pari-mutuel pool those differ, and a celebrated figure that is not the figure paid is
        // a false money statement. `net` is profit, so it is payout − stake and can be shown
        // with a "+".
        dispatchWinCelebration({
          kind: "WIN",
          amount: res.payout,
          net: res.payout - res.stake,
          label: `${t.market.udUpDown} · ${sideWord}`,
        });
        continue;
      }

      if (res.status === "VOID") {
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
          durationMs: 6000,
        });
        continue;
      }

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
        durationMs: 6000,
      });
    }
  }, [rounds, toast, t]);

  return null;
}
