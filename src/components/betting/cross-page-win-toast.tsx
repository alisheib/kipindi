"use client";

/**
 * CrossPageWinToast — fires a gold celebration toast on the FIRST page load
 * after a win event has been buffered into sessionStorage by a different page.
 *
 * Usage from any client component (e.g. mapigo settle, match settle):
 *   queueWinToast({ title: "You won!", amount: 2300, label: "SPIKE call" });
 *
 * Then route away. On the next page mount, this component reads + drains
 * the buffer and fires the gold toast.
 */
import * as React from "react";
import { useToast } from "@/components/ui/toast";

const STORAGE_KEY = "kp_pending_win_toast";

type PendingWin = {
  title: string;
  description?: string;
  amount?: number;
  label?: string;
  ts: number;
};

export function queueWinToast(input: { title: string; description?: string; amount?: number; label?: string }) {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingWin = { ...input, ts: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be blocked in private mode — silent fallback
  }
}

export function CrossPageWinToast() {
  const { toast } = useToast();
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STORAGE_KEY);
      const payload = JSON.parse(raw) as PendingWin;
      // Drop if older than 5 minutes (stale tab)
      if (Date.now() - payload.ts > 5 * 60_000) return;
      const description = payload.description
        ?? (payload.amount !== undefined
            ? `+TZS ${payload.amount.toLocaleString()}${payload.label ? ` · ${payload.label}` : ""}`
            : undefined);
      toast({
        title: payload.title,
        description,
        variant: "gold",
        durationMs: 6_000,
      });
    } catch {
      // ignore corrupt JSON
    }
  }, [toast]);
  return null;
}
