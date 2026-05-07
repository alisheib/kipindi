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

export function NotifyPoller() {
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      const watch = readWatch();
      if (watch.length === 0) {
        timer = setTimeout(tick, 30_000);
        return;
      }
      try {
        const r = await fetch("/api/fairness/recent", { cache: "no-store" });
        if (!r.ok) {
          timer = setTimeout(tick, 60_000);
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
      timer = setTimeout(tick, 30_000);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [toast]);

  return null;
}
