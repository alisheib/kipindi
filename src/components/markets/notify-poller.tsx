"use client";

/**
 * NotifyPoller — mounted in AppShell. Watches the markets the player asked to be told
 * about and announces what a resolution MEANT FOR THEM: a celebration, a refund, or a
 * loss, each read off their own settled position row.
 *
 * ── DA-5 / E-115 · WHY THIS IS NOT A `localStorage` READ ANY MORE ─────────────────────
 *
 * 🔴 It used to headline `payoutIfWin`, written at PLACE TIME by `conviction-dial.tsx`,
 * and decide the player had won by comparing the market's PUBLIC outcome to a side kept
 * in the same browser. Four defects lived in that one shortcut:
 *
 *   1. **The figure was a projection, not the payment.** The pools keep moving after a
 *      bet, so on a pari-mutuel market the place-time number is a DIFFERENT number from
 *      the realised payout — and it was the one struck in gilt in front of the player.
 *   2. **It could fire a day before the money existed.** The trigger was `stage2At`
 *      (adjudication). `settleMarket` will not move a shilling until the objection window
 *      closes — 24h by default — and an objection can still void the market in between.
 *   3. **A cashed-out player got the seal.** Nothing cleared the browser key on sell, so
 *      an early exit whose side later won was celebrated for money never received (M7).
 *   4. **Two bets on one market collapsed into one**, because the key was per market.
 *
 * ⭐ Now: `/api/fairness/recent` stays the cheap PUBLIC heartbeat that detects *that* a
 * market resolved; one authed call to `/api/positions/settled` then says what it meant
 * for this viewer, from rows whose `settledAt` is stamped in the same transaction as the
 * wallet credit. **The product cannot be its own witness about money.** This mirrors
 * `UpDownResultAnnouncer`, which has always done it correctly — its own comment even
 * named this defect as the outstanding one.
 *
 * ⚠️ THE THREE OUTCOMES ARE NOT TWO. A market can resolve YES and still refund an
 * unmatched backer in full. Saying "you lost" there is a false money statement; the
 * status is read off the ROW, never inferred from the outcome.
 *
 * ⚠️ RG: the win is celebratory, the loss is NOT its mirror. A loss gets a plain factual
 * toast — no glow, no counter, no haptic — and it NAMES the amount, because a result
 * screen that will not say the number is the euphemism RG rules exist to prevent.
 */
import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { positionStatusWord } from "@/lib/side-label";
import { dispatchWinCelebration } from "@/components/markets/win-celebration";
import { formatTzs } from "@/lib/utils";
import { DWELL_RESULT_MS } from "@/lib/feedback-timing";

const WATCH_KEY = "50pick-notify-markets";
/** Announced-once key. ⛔ Per POSITION, not per market — two bets on one market are two
 *  results, and a per-market key silently swallowed the second. */
const SEEN_KEY = "50pick-notify-seen-positions";

function readWatch(): string[] {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/* 🔴 STORAGE IS A CONVENIENCE, NEVER A DEPENDENCY — E-261.
 *
 * `readSeen` used to answer an empty set whenever `sessionStorage` threw, and `writeSeen`
 * silently dropped the write. In a browser that blocks storage — Chrome set to block all
 * cookies, and several in-app webviews, which is the exact class `reality-check.tsx` was
 * hardened for after an unguarded touch took the whole signed-in app to the error page —
 * that meant the announced-set was empty on EVERY tick. At the 2s active cadence a player
 * with settled positions was shown the same win celebration and the same loss toasts every
 * two seconds, indefinitely, with no way to stop it but closing the tab.
 *
 * ⛔ The memory Map is not a cache of the storage — it is the primary, and storage is the
 * copy that survives a reload. Written in that order so a throw on the way out cannot lose
 * the fact that we already announced. Shape copied deliberately from `reality-check.tsx:40-53`
 * rather than re-invented; there is one right answer here and it is already written down. */
const memSeen = new Map<string, string>();

function readSeen(): Set<string> {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(SEEN_KEY);
  } catch { /* storage blocked — fall through to memory */ }
  if (raw === null) raw = memSeen.get(SEEN_KEY) ?? null;
  if (!raw) return new Set();
  try {
    const v = JSON.parse(raw);
    return new Set(Array.isArray(v) ? v : []);
  } catch {
    return new Set();
  }
}

function writeSeen(s: Set<string>) {
  const raw = JSON.stringify(Array.from(s));
  memSeen.set(SEEN_KEY, raw);
  try {
    sessionStorage.setItem(SEEN_KEY, raw);
  } catch {
    /* private browsing — memory already holds it, so the re-announce storm cannot start */
  }
}

type Attestation = {
  marketId: string;
  titleEn: string;
  resolvedOutcome: "YES" | "NO" | "VOID" | null;
  stage2At: string | null;
};

/** One settled row of the viewer's own — the only thing money is announced from. */
type SettledPosition = {
  positionId: string;
  marketId: string;
  status: "WIN" | "LOSS" | "VOID";
  side: "YES" | "NO";
  stake: number;
  payout: number;
  settledAt: string | null;
  title: string;
};

// Tight while the player has a watched market — 2s is effectively instant to a human
// watching a countdown. Idle stays high so a session with nothing to watch does not
// burn the server.
const ACTIVE_POLL_MS = 2_000;
const IDLE_POLL_MS = 60_000;
/** ⛔ A POLL WITH NO CEILING IS A POLL THAT CAN HANG. A request left open past the next
 *  cadence tick holds the whole chain: nothing is scheduled, `onWake` finds a tick already
 *  in flight, and the poller is silently dead until the tab is reloaded. An abort throws
 *  into the existing `catch` and the chain re-arms on the next line. */
const POLL_TIMEOUT_MS = 8_000;

export function NotifyPoller() {
  const { toast } = useToast();
  const { t } = useT();

  useEffect(() => {
    let cancelled = false;
    // 🔴 DEFENCE IN DEPTH FOR THE CADENCE (audit F-08). The component is now mounted only
    // for a signed-in viewer (app-shell.tsx), but a session can lapse WHILE it is mounted —
    // and the prune below lives inside `if (pr.ok)`, so once /api/positions/settled starts
    // answering 401 the watch list can never shrink and `stillWatching` stays true forever.
    // That is what kept a 2s cadence running with nothing left to report. A lapsed session
    // drops to the idle cadence instead; a genuine sign-in re-mounts the component.
    let sessionLapsed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // 🔴 RE-ENTRANCY. `onWake` clears the pending timer and re-ticks — and alt-tabbing back
    // fires `visibilitychange` AND `focus` back to back, so two wakes landed on one tick.
    // Each started its own chain, each re-armed at the end, and `timer` can only hold the
    // LAST id: the other chain ran untracked, uncancellable by the cleanup below, doubling
    // on every refocus. Two chains also both read `readSeen()` before either writes it,
    // which is how one settled row got celebrated twice.
    // ⛔ The self-chaining design is correct and is NOT touched — only entry is serialised.
    let tickInFlight = false;

    const tick = async () => {
      if (cancelled) return;
      // B-17 — a hidden tab does not poll at the 2s cadence. The visibility handler below
      // re-ticks the moment the user comes back, so nothing is lost.
      if (document.hidden) {
        timer = setTimeout(pollNow, IDLE_POLL_MS);
        return;
      }
      const watch = readWatch();
      if (watch.length === 0) {
        timer = setTimeout(pollNow, IDLE_POLL_MS);
        return;
      }
      try {
        const r = await fetch("/api/fairness/recent", { cache: "no-store", signal: AbortSignal.timeout(POLL_TIMEOUT_MS) });
        if (!r.ok) {
          timer = setTimeout(pollNow, IDLE_POLL_MS);
          return;
        }
        const j = (await r.json()) as { attestations: Attestation[] };
        // The public feed only says a market REACHED adjudication. That is the cue to go
        // and ask about our own money — it is not itself news about money.
        const adjudicated = (j.attestations ?? []).filter((a) => watch.includes(a.marketId) && a.stage2At);

        if (adjudicated.length > 0) {
          const ids = adjudicated.map((a) => a.marketId);
          const pr = await fetch(`/api/positions/settled?markets=${encodeURIComponent(ids.join(","))}`, { cache: "no-store", signal: AbortSignal.timeout(POLL_TIMEOUT_MS) });
          // 401 = the session lapsed. Say nothing; a signed-out browser has no money news —
          // but DO remember it, so the cadence below stops behaving as if news were imminent.
          if (pr.status === 401) sessionLapsed = true;
          if (pr.ok) {
            const pj = (await pr.json()) as { positions: SettledPosition[] };
            const seen = readSeen();
            let added = false;

            for (const p of pj.positions ?? []) {
              if (seen.has(p.positionId)) continue;

              const label = p.title || adjudicated.find((a) => a.marketId === p.marketId)?.titleEn || "";

              if (p.status === "WIN") {
                // ⛔ THE REALISED PAYOUT, from the settled row. `net` is profit, so it is
                // payout − stake.
                dispatchWinCelebration({
                  kind: "WIN",
                  amount: p.payout,
                  net: p.payout - p.stake,
                  label,
                });
              } else if (p.status === "VOID") {
                // ⛔ `factual`, NOT `default` — E-114. `default` paints checkCircle, a
                // CONFIRMATION TICK, over a stake that merely came back. A refund is not
                // an achievement and not an alarm; it is a fact, and the kit has a variant
                // whose whole job is stating one. This is the same fix DA-4 made on the
                // Up & Down path, which had been left undone here.
                toast({
                  title: t.market.marketStakeReturnedTitle,
                  description: `${label} · ${formatTzs(p.payout)}`,
                  variant: "factual",
                  durationMs: DWELL_RESULT_MS,
                });
              } else {
                // LOSS — plain and direct. ⛔ NOT `warning`, which is GOLD, the celebration
                // ink; and not `danger`, which reads as *something went wrong* when losing
                // is the game working.
                toast({
                  title: t.market.marketLostTitle,
                  description: `${label} · ${formatTzs(p.stake)}`,
                  variant: "factual",
                  durationMs: DWELL_RESULT_MS,
                });
              }

              // 🔴 ANNOUNCE FIRST, THEN MARK — E-259. These two lines used to sit at the TOP of
              // the loop, so a position was recorded as announced before anything had been
              // shown. When the toast layer's flood guard still DESTROYED everything past four,
              // a return with eight settled positions marked all eight seen, pruned all eight
              // markets from the localStorage watch list, and painted four. The other four were
              // unrecoverable — sessionStorage said announced, and the watch list that would
              // have re-fetched them was already gone.
              // ⛔ The toast layer no longer drops (see `present` / the overflow effect), so this
              // ordering is belt AND braces: nothing may claim delivery it did not perform, and
              // a throw above leaves the row unmarked to be retried on the next tick.
              seen.add(p.positionId);
              added = true;

              // A browser notification only for money that MOVED, and only once.
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                try {
                  // §L3 — this printed the raw enum into an OS notification title, so the
                  // phone read "· WIN" in every language while the toast above it was
                  // localised. MARKET is established: `/api/positions/settled` reads
                  // `listPositionsForUser(…, "MARKET")` and says so in its own header.
                  new Notification(`${t.market.marketResolvedToast} · ${positionStatusWord(t, p.status, "MARKET")}`, {
                    body: label.slice(0, 120),
                    tag: `50pick-${p.positionId}`,
                  });
                } catch { /* no-op */ }
              }

              // Stop watching a market once OUR position on it has settled. ⛔ Not on
              // adjudication: between stage 2 and settlement there is nothing to tell the
              // player yet, and dropping it there would lose the announcement entirely.
              try {
                const remaining = readWatch().filter((id) => id !== p.marketId);
                localStorage.setItem(WATCH_KEY, JSON.stringify(remaining));
              } catch { /* ignore */ }
            }

            if (added) writeSeen(seen);
          }
        }
      } catch {
        /* network — try again later */
      }
      // Re-read from localStorage (not the cached `watch`) so pruned markets are
      // reflected in the cadence decision.
      const stillWatching = readWatch().length > 0 && !sessionLapsed;
      if (cancelled) return;
      timer = setTimeout(pollNow, stillWatching ? ACTIVE_POLL_MS : IDLE_POLL_MS);
    };

    /** The ONLY way into `tick` — the chain, the wake and the first run all come through
     *  here, so a second chain cannot exist. Dropping a re-entrant call is safe: the tick
     *  already running re-arms the timer at its end, so the chain is never left dead.
     *  ⛔ `finally`, not a flag cleared at each of the four returns — a future early return
     *  that forgot one would kill the poller permanently and silently. */
    const pollNow = async () => {
      if (cancelled || tickInFlight) return;
      tickInFlight = true;
      try {
        await tick();
      } finally {
        tickInFlight = false;
      }
    };

    // Tab visibility — fire a tick so a returning user sees the result the moment the tab
    // is on screen again.
    // ⛔ ONE WAKE PATH. `window.focus` was a SECOND one, and it fires in the same instant as
    // `visibilitychange` on alt-tab-back — the two wakes were the duplicate-chain bug. It
    // also covered nothing: a visible tab that merely loses WINDOW focus keeps
    // `document.hidden === false`, so the 2s chain never stopped and there was nothing to
    // wake. Do not add it back.
    const onWake = () => {
      if (cancelled) return;
      // visibilitychange fires on HIDE too — waking on hide is the opposite of the
      // intent (B-17). Only a visible tab re-ticks.
      if (document.hidden) return;
      if (timer) clearTimeout(timer);
      timer = null;
      void pollNow();
    };
    document.addEventListener("visibilitychange", onWake);

    void pollNow();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [toast, t]);

  return null;
}
