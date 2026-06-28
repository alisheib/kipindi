"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import {
  getSentinelStatusAction,
  resetSentinelTimerAction,
  runSentinelNowAction,
  pauseSentinelAction,
  resumeSentinelAction,
} from "@/app/admin/ai-usage/actions";

type Status = {
  enabled: boolean;
  running: boolean;
  sweeping: boolean;
  paused: boolean;
  pausedRemainingMs: number | null;
  intervalMs: number;
  nextSweepAt: number | null;
  lastSweepAt: number | null;
  lastSummary: { closed: number; errors: number; total: number; at: number } | null;
  serverNow: number;
  timezone: string;
};

/** ms → "1h 04m 12s" / "4m 12s" / "12s" — compact, monospace-friendly. */
function fmtRemaining(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}
function fmtClock(ts: number | null, timeZone?: string): string {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: timeZone || undefined }); } catch { return "—"; }
}

/**
 * Sentinel countdown — a live, deploy-proof timer to the next market-sentinel
 * sweep, with "Reset timer" and "Run now" controls. Sits in the admin top bar.
 * Status is fetched from the server (the authoritative, persisted nextSweepAt)
 * and re-synced every 60s, so the countdown stays accurate even across Railway
 * restarts; the per-second tick is purely cosmetic.
 */
export function SentinelCountdown() {
  const [status, setStatus] = useState<Status | null>(null);
  const [now, setNow] = useState(0); // client epoch; 0 until mounted → SSR/client render match
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);
  // server clock − client clock, captured at each fetch. The countdown is driven
  // by server time, so it stays correct even if the admin's device clock is wrong
  // or changes (DST, manual change, timezone switch). All values are epoch-ms UTC.
  const offsetRef = useRef(0);

  const refresh = () => {
    getSentinelStatusAction().then((s) => { offsetRef.current = s.serverNow - Date.now(); setStatus(s); }).catch(() => {});
  };

  useEffect(() => {
    refresh();
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const sync = setInterval(refresh, 60_000);
    return () => { clearInterval(tick); clearInterval(sync); };
  }, []);

  // Close popover on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const reset = () => start(async () => {
    setMsg(null);
    const r = await resetSentinelTimerAction();
    if (r.ok) { setMsg("Timer reset."); refresh(); } else setMsg(r.error ?? "Couldn't reset.");
  });
  const runNow = () => start(async () => {
    setMsg("Running sweep…");
    const r = await runSentinelNowAction();
    if (!r.ok) { setMsg(r.error ?? "Couldn't run."); return; }
    if ((r.total ?? 0) === 0) { setMsg("No live markets to check right now."); refresh(); return; }
    const parts = [`${r.closed ?? 0} closed`];
    if ((r.errors ?? 0) > 0) parts.push(`${r.errors} errored (check AI usage / credit)`);
    setMsg(`Done · ${parts.join(" · ")} of ${r.total} live.`);
    refresh();
  });
  const pause = () => start(async () => {
    setMsg(null);
    const r = await pauseSentinelAction();
    if (r.ok) { setMsg("Paused — no sweeps or AI calls will run."); refresh(); } else setMsg(r.error ?? "Couldn't pause.");
  });
  const resume = () => start(async () => {
    setMsg(null);
    const r = await resumeSentinelAction();
    if (r.ok) { setMsg("Resumed — timer re-armed."); refresh(); } else setMsg(r.error ?? "Couldn't resume.");
  });

  // Loading / disabled placeholders keep SSR and first client render identical.
  // Drive the countdown off SERVER time (client clock + measured offset).
  const serverNow = now ? now + offsetRef.current : 0;
  const remaining = status?.nextSweepAt && serverNow ? Math.max(0, status.nextSweepAt - serverNow) : null;
  const soon = remaining != null && remaining < 5 * 60_000; // < 5 min → emphasize
  const label = !status
    ? "…"
    : !status.enabled
      ? "off"
      : status.paused
        ? "paused"
        : status.sweeping
          ? "running"
          : remaining == null
            ? "—"
            : remaining === 0
              ? "due"
              : fmtRemaining(remaining);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Market sentinel timer"
        title="Market sentinel — next sweep"
        className={`font-mono text-micro tracking-[0.12em] px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border transition-colors ${
          soon ? "border-gold-700 bg-gold-500/10 text-gold-200" : "border-border bg-bg-elevated text-text hover:border-gold-700/60"
        }`}
      >
        <span className={`inline-flex ${status?.sweeping ? "animate-spin" : ""} ${status?.paused ? "text-no-300" : soon ? "text-gold-300" : "text-gold"}`}>
          {status?.sweeping ? <I.rotateCcw s={12} /> : status?.paused ? <I.pause s={12} /> : <I.activity s={12} />}
        </span>
        <span className="hidden md:inline opacity-70">Sentinel</span>
        <span className="tabular-nums font-semibold">{label}</span>
        <I.chevronDown s={10} className="opacity-50" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[256px] max-w-[calc(100vw-24px)] rounded-lg glass-panel p-3.5 shadow-e4 z-50"
          style={{ animation: "np-rise 160ms cubic-bezier(.2,.8,.2,1)" }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gold-500/12 text-gold-300"><I.activity s={15} /></span>
            <div className="min-w-0">
              <p className="font-display text-[13px] font-semibold text-text leading-tight">Market sentinel</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle">
                {status?.enabled ? (status?.paused ? "Paused" : status?.sweeping ? "Sweeping now" : "Armed") : "Disabled"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 mb-3 font-mono text-[11px]">
            <Row label="Next sweep" value={status?.paused ? (status.pausedRemainingMs != null ? `paused · ${fmtRemaining(status.pausedRemainingMs)} left` : "paused") : status?.sweeping ? "running…" : remaining != null ? `in ${fmtRemaining(remaining)}` : "—"} accent />
            <Row label="At" value={fmtClock(status?.nextSweepAt ?? null, status?.timezone)} />
            <Row label="Last sweep" value={fmtClock(status?.lastSweepAt ?? null, status?.timezone)} />
            <Row label="Interval" value={status ? fmtRemaining(status.intervalMs) : "—"} />
            {status?.lastSummary && (
              <Row label="Last result" value={`${status.lastSummary.closed} closed / ${status.lastSummary.total}`} />
            )}
          </div>

          {status?.enabled && (
            status.paused ? (
              <button
                type="button" onClick={resume} disabled={pending}
                className="btn btn-gold btn-sm rounded-pill w-full mb-2 disabled:opacity-40"
              >
                <I.play s={13} /> Resume
              </button>
            ) : (
              <button
                type="button" onClick={pause} disabled={pending}
                className="btn btn-no btn-sm rounded-pill w-full mb-2 disabled:opacity-40"
                title="Stop all sweeps and AI calls until resumed"
              >
                <I.pause s={13} /> Pause
              </button>
            )
          )}

          <div className="flex items-center gap-2">
            <button
              type="button" onClick={reset} disabled={pending || !status?.enabled}
              className="btn btn-ghost btn-sm rounded-pill flex-1 disabled:opacity-40"
            >
              <I.rotateCcw s={13} /> Reset
            </button>
            <button
              type="button" onClick={runNow} disabled={pending || !status?.enabled || status?.sweeping}
              className="btn btn-gold btn-sm rounded-pill flex-1 disabled:opacity-40"
            >
              <I.bolt s={13} /> Run now
            </button>
          </div>

          {status?.paused && (
            <p className="mt-2 text-[10.5px] leading-snug text-no-300">
              Paused — no sweeps or AI calls until you Resume, Reset, or Run now.
              {status.pausedRemainingMs != null && (
                <> Resume continues with <span className="font-semibold tabular-nums">{fmtRemaining(status.pausedRemainingMs)}</span> left.</>
              )}
            </p>
          )}

          {msg && <p className="mt-2.5 text-[11px] text-text-muted leading-snug">{msg}</p>}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-subtle">{label}</span>
      <span className={`tabular-nums font-semibold ${accent ? "text-gold-300" : "text-text"}`}>{value}</span>
    </div>
  );
}
