"use client";

/**
 * AwaySummaryBar — the one calm account of what settled while the player was not here.
 *
 * ── THE RULING (Ali, 2026-09-04) ──────────────────────────────────────────────────────
 *
 * *"If I'm logged in and in platform show the celebration, but if I come back after a while
 * I don't think it's needed."* Four decisions followed, and this component is three of them:
 * the return surface is a **calm bar, not a pop-up**; an old win gets its seal only when the
 * player **taps for it**; and the whole backlog is stated **once**, never as a stack.
 *
 * ⛔ IT FIRES NOTHING. No haptic, no sound, no modal, no focus steal, no auto-dismiss. §F5 —
 * *nothing answers an action the player did not take* — and arriving is not an act. The
 * notifications panel already had to have `haptics.success()` removed for buzzing the
 * money-settled pattern on a poll, over losses; this surface must never earn the same entry.
 *
 * ⭐ AND IT NEEDS NO DEFERRAL. `reality-check.tsx` defers while a dialog is open, and
 * deliberately does not consume its trigger when it does — the right pattern for a MODAL. A
 * `NoticeBar` sits in document flow, blocks nothing, takes no focus and is covered by any
 * modal's own scrim, so a player mid-bet is structurally undisturbed. The precedent was read
 * and is not needed; it is named here so a later session does not re-derive the question.
 *
 * ── WHY THE SEAL IS STILL AVAILABLE ───────────────────────────────────────────────────
 *
 * §M7 says a win gets the seal. §F5 says nothing may fire on arrival. Those look opposed and
 * are not: the ceremony is not withdrawn, it is handed to the player. Tapping is the act that
 * §F5 asks for, and the seal it opens is the one §M7 requires — so both laws are satisfied
 * rather than traded against each other.
 *
 * ⛔ ONLY WINS GO INTO THAT SEAL, AND IT CARRIES NO LABEL. Summing a loss into a celebration
 * figure would be a false money statement, and naming one market over a figure covering
 * several is the same defect the collapsed summary seal already refuses.
 */

import { useEffect, useState } from "react";
import { NoticeBar, NoticeBarAction } from "@/components/ui/notice-bar";
import { useT } from "@/lib/i18n";
import { formatTzs } from "@/lib/utils";
import { initPresence, subscribeReturn } from "@/lib/presence-window";
import {
  initLedger, readAway, subscribeAway, clearAway, summarise, type LedgerEntry,
} from "@/lib/away-ledger";
import { dispatchWinCelebration } from "@/components/markets/win-celebration";

export function AwaySummaryBar({
  userId,
  playStartedAtMs,
  serverNowMs,
}: {
  userId: string | null;
  /** From the signed session (`session.playStartedAt`) — the server's own "this sitting
   *  began at" instant. Seeds the attention window; see `presence-window.ts` for why the
   *  server can seed it but cannot maintain it. */
  playStartedAtMs: number;
  /** ⚠️ NEVER RENDERED. Read only inside the effect below, to capture the one server-time
   *  offset — the same discipline `useServerNow` uses, so no markup depends on a clock and
   *  there is no hydration mismatch. */
  serverNowMs: number;
}) {
  const { t } = useT();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    // ⚠️ `userId` is a REQUIRED dep, not a convenience: AppShell survives a soft-nav across
    // login and logout, so an unscoped or stale key would show one account's settled results
    // to the next person on the same browser. Same leak `reality-check.tsx` records.
    initLedger(userId);
    initPresence({ playStartedAtMs, serverNowMs });
    setEntries(readAway());
    const offAway = subscribeAway(setEntries);
    // A return that happens WHILE the tab is open re-reads the ledger, so a player who walks
    // away and comes back without reloading is served by the same surface as a cold return.
    const offReturn = subscribeReturn(() => setEntries(readAway()));
    return () => { offAway(); offReturn(); };
  }, [userId, playStartedAtMs, serverNowMs]);

  if (entries.length === 0) return null;

  const s = summarise(entries);
  const n = (v: number) => String(v);

  /* ⛔ THE FIGURE APPEARS ONLY WHEN EVERY ENTRY SHARES ONE OUTCOME — `summarise` enforces it
   * and returns `null` otherwise. A mixed set states counts and sends the player to the
   * record, because a netted number across wins and losses was never paid, never lost, and
   * appears in no ledger row. Each honest quantity is its own column: a win states what was
   * PAID, a refund what came BACK, a loss what was STAKED. */
  const body =
    s.homogeneous === "WIN" && s.figure !== null
      ? t.notif.awayWon.replace("{n}", n(s.wins)).replace("{amount}", formatTzs(s.figure))
      : s.homogeneous === "LOSS" && s.figure !== null
        ? t.notif.awayLost.replace("{n}", n(s.losses)).replace("{amount}", formatTzs(s.figure))
        : s.homogeneous === "VOID" && s.figure !== null
          ? t.notif.awayReturned.replace("{n}", n(s.voids)).replace("{amount}", formatTzs(s.figure))
          : t.notif.awayMixed.replace("{n}", n(s.total));

  const wins = entries.filter((e) => e.kind === "WIN");

  const openSeal = () => {
    if (wins.length > 0) {
      dispatchWinCelebration({
        kind: "WIN",
        amount: wins.reduce((sum, e) => sum + e.amount, 0),
        net: wins.reduce((sum, e) => sum + (e.amount - e.stake), 0),
      });
    }
    clearAway();
  };

  return (
    <NoticeBar
      tone="info"
      glyph="clock"
      testId="away-summary-bar"
      dismissLabel={t.common.dismiss}
      // Dismissing IS the acknowledgement — the durable record is the bell, which keeps every
      // one of these as a trilingual row for 180 days. Nothing is lost by clearing.
      onDismiss={clearAway}
      action={
        wins.length > 0 ? (
          <NoticeBarAction tone="info" onClick={openSeal}>{t.notif.awayView}</NoticeBarAction>
        ) : (
          <NoticeBarAction tone="info" href="/positions?filter=settled">{t.notif.awayView}</NoticeBarAction>
        )
      }
    >
      <span className="font-semibold">{t.notif.awayTitle}</span>
      {" · "}
      {body}
    </NoticeBar>
  );
}
