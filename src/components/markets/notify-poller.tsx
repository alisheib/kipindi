"use client";

/**
 * NotifyPoller — mounted in AppShell. Reads the user's watched-market list
 * from localStorage every 30s, polls /api/fairness/recent for resolutions,
 * and fires a browser Notification + brand toast for any newly-resolved
 * market the user is watching.
 *
 * Keeps a `seen` set in sessionStorage so a notification fires once per
 * resolution per session, not on every poll.
 */
import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { dispatchWinCelebration } from "@/components/markets/win-celebration";

const WATCH_KEY = "50pick-notify-markets";
const SEEN_KEY = "50pick-notify-seen";
const BET_PREFIX = "50pick-bet-";

type StoredBet = { side: "YES" | "NO"; stake: number; payoutIfWin: number };

function readStoredBet(marketId: string): StoredBet | null {
  try {
    const raw = localStorage.getItem(BET_PREFIX + marketId);
    if (!raw) return null;
    const v = JSON.parse(raw) as StoredBet;
    if ((v.side === "YES" || v.side === "NO") && typeof v.stake === "number") return v;
  } catch { /* private browsing or stale */ }
  return null;
}

function clearStoredBet(marketId: string) {
  try { localStorage.removeItem(BET_PREFIX + marketId); } catch { /* no-op */ }
}

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

function readSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const v = JSON.parse(raw);
    return new Set(Array.isArray(v) ? v : []);
  } catch {
    return new Set();
  }
}

function writeSeen(s: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(s)));
  } catch {
    /* private browsing */
  }
}

type Attestation = {
  marketId: string;
  titleEn: string;
  resolvedOutcome: "YES" | "NO" | "VOID" | null;
  stage2At: string | null;
};

// Poll cadence — tight when the user has live watched markets (so a
// 5-minute demo market's resolution lands within ~8s of settlement),
// relaxed when there's nothing to watch (no point pinging the server
// every 8 seconds for an empty list). Also re-runs immediately on
// tab focus so an alt-tabbed user sees the celebration the moment
// they come back to the window.
// Tight when the user has a watched market — 2 s feels effectively
// instant to a human watching a countdown. Idle stays high so a
// session with nothing to watch doesn't burn the server.
const ACTIVE_POLL_MS = 2_000;
const IDLE_POLL_MS = 60_000;

export function NotifyPoller() {
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      const watch = readWatch();
      if (watch.length === 0) {
        timer = setTimeout(tick, IDLE_POLL_MS);
        return;
      }
      try {
        const r = await fetch("/api/fairness/recent", { cache: "no-store" });
        if (!r.ok) {
          timer = setTimeout(tick, IDLE_POLL_MS);
          return;
        }
        const j = (await r.json()) as { attestations: Attestation[] };
        const seen = readSeen();
        const newly = (j.attestations ?? []).filter(
          (a) => watch.includes(a.marketId) && a.stage2At && !seen.has(a.marketId),
        );
        for (const a of newly) {
          seen.add(a.marketId);
          const title = `Market resolved · ${a.resolvedOutcome ?? "VOID"}`;
          const body = a.titleEn?.slice(0, 120) ?? "";
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              new Notification(title, { body, tag: `50pick-${a.marketId}` });
            } catch {
              /* no-op */
            }
          }
          // Did the user pick the winning side on this market? If yes,
          // upgrade the toast to a full WinCelebration popup. The stored
          // payoutIfWin is from place-time and may differ slightly from
          // the realised payout, but it's directionally accurate for the
          // demo and is replaced on the next /positions render.
          const stored = readStoredBet(a.marketId);
          const won = stored && a.resolvedOutcome === stored.side;
          if (won && stored) {
            dispatchWinCelebration({
              kind: "WIN",
              amount: stored.payoutIfWin,
              net: stored.payoutIfWin - stored.stake,
              label: a.titleEn,
            });
            clearStoredBet(a.marketId);
          } else if (a.resolvedOutcome === "VOID" || (stored && stored.side !== a.resolvedOutcome)) {
            clearStoredBet(a.marketId);
          }
          // Drop the resolved market from the watch list so subsequent
          // polls don't keep re-checking it. The seen-set guards
          // against duplicate fires within a session, but pruning the
          // watch list keeps the poll payload small over time.
          try {
            const remaining = watch.filter((id) => id !== a.marketId);
            localStorage.setItem("50pick-notify-markets", JSON.stringify(remaining));
          } catch { /* ignore */ }
          toast({
            title,
            description: body,
            variant: won ? "gold"
              : a.resolvedOutcome === "YES" ? "success"
              : a.resolvedOutcome === "NO" ? "warning"
              : "default",
          });
        }
        if (newly.length > 0) writeSeen(seen);
      } catch {
        /* network — try again later */
      }
      // Stay tight while there's at least one watched market; otherwise
      // fall back to the idle cadence.
      const stillWatching = readWatch().length > 0;
      timer = setTimeout(tick, stillWatching ? ACTIVE_POLL_MS : IDLE_POLL_MS);
    };

    // Tab focus / visibility — immediately fire a tick so an alt-tabbed
    // user sees the win the moment they refocus. We clear any pending
    // timer and re-tick from scratch.
    const onWake = () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      tick();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [toast]);

  return null;
}
