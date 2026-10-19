"use client";

import { useEffect, useState } from "react";
import { fmtEATClock } from "@/lib/updown-source-label";
import { hasLaterConfirmedRead, roundLineHistoryUrl, roundOpenPoints, shouldDisplayRoundLine, type OpenPoint } from "@/lib/updown-vendor-opens";
import { usd } from "@/lib/usd-price";

type State = "open" | "locked" | "closing" | "confirming" | "resolved" | "void";
type Feed = { sourceTier: "vendor" | "confirmed"; series: { mode: "line"; points: OpenPoint[] } | { mode: "candles" } };

const WORDS = {
  en: { beat: "Price to beat", minuteOpen: "Minute open", unavailable: "Round line unavailable", noNewer: "No newer price since the open at", delayed: "Price feed delayed" },
  sw: { beat: "Bei ya kushinda", minuteOpen: "Ufunguzi wa dakika", unavailable: "Mstari wa raundi haupatikani", noNewer: "Hakuna bei mpya tangu ufunguzi saa", delayed: "Bei imechelewa" },
  zh: { beat: "目标价格", minuteOpen: "分钟开盘价", unavailable: "本回合走势暂不可用", noNewer: "开盘后暂无新价格，开盘时间", delayed: "价格更新延迟" },
} as const;

/** One cached minute-bar request covers the longest round and also serves the large chart. No per-duration call. */
export function RoundLiveLine({ assetKey, opensAtMs, closesAtMs, openPrice, closePrice, readPrice, readQuotedAt, decimals, locale, state, serverNowMs }: {
  assetKey: string;
  opensAtMs: number;
  closesAtMs: number;
  openPrice: number | null;
  closePrice?: number | null;
  readPrice?: number | null;
  readQuotedAt?: string | null;
  decimals: number;
  locale: string;
  state: State;
  serverNowMs?: number;
}) {
  const words = WORDS[locale === "sw" ? "sw" : locale === "zh" ? "zh" : "en"];
  const [nowMs, setNowMs] = useState(serverNowMs ?? Date.now());
  const [fetched, setFetched] = useState<{ assetKey: string; feed: Feed } | null>(null);
  const [status, setStatus] = useState<"loading" | "missing" | "error" | "ok">("loading");

  useEffect(() => {
    const base = serverNowMs ?? Date.now();
    const start = performance.now();
    setNowMs(base);
    const timer = setInterval(() => setNowMs(base + performance.now() - start), 1000);
    return () => clearInterval(timer);
  }, [serverNowMs]);

  const active = state === "open" || state === "locked";
  const settled = state === "resolved" || state === "void";
  const visible = typeof assetKey === "string" && assetKey.length > 0
    && shouldDisplayRoundLine(state, opensAtMs, closesAtMs, nowMs, openPrice);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    let busy = false;
    let frozen = false;
    let current: AbortController | null = null;
    setFetched(null);
    setStatus("loading");
    // A background tab may postpone the first request. Bound that wait as well as
    // the request itself so the card never keeps a loading claim indefinitely.
    const watchdog = setTimeout(() => {
      if (alive) setStatus((previous) => previous === "loading" ? "error" : previous);
    }, 12_000);
    const load = async () => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      current = new AbortController();
      const deadline = setTimeout(() => current?.abort(), 12_000);
      try {
        const response = await fetch(roundLineHistoryUrl(assetKey), { cache: "no-cache", signal: current.signal });
        if (!response.ok) throw new Error("history unavailable");
        const next = await response.json() as Feed;
        if (!alive) return;
        if (next.sourceTier === "vendor" && next.series.mode === "line") {
          setFetched({ assetKey, feed: next });
          setStatus("ok");
          // Once a decided round has a real opening bar, its history must not
          // repaint from a later vendor correction. A tab mounted while hidden
          // may still make its first request on reveal.
          if (!active && openPrice != null && roundOpenPoints(next.series.points,
            opensAtMs, closesAtMs, closesAtMs, openPrice, decimals, closePrice,
            { price: readPrice ?? null, quotedAt: readQuotedAt ?? null })) frozen = true;
        } else {
          setFetched(null);
          setStatus("missing");
        }
      } catch {
        if (alive) setStatus((previous) => previous === "ok" ? previous : "error");
      } finally {
        clearTimeout(deadline);
        busy = false;
        current = null;
      }
    };
    void load();
    // A decided card keeps its frozen history; only an open or locked round polls.
    const timer = active ? setInterval(() => void load(), 30_000) : null;
    const reveal = () => { if (document.visibilityState === "visible" && (active || !frozen)) void load(); };
    document.addEventListener("visibilitychange", reveal);
    return () => { alive = false; clearTimeout(watchdog); current?.abort(); if (timer) clearInterval(timer); document.removeEventListener("visibilitychange", reveal); };
  }, [assetKey, visible, active, opensAtMs, closesAtMs, openPrice, closePrice, readPrice, readQuotedAt, decimals]);

  if (!visible || openPrice == null) return null;
  const feed = fetched?.assetKey === assetKey ? fetched.feed : null;
  const points = feed?.series.mode === "line"
    ? roundOpenPoints(feed.series.points, opensAtMs, closesAtMs, nowMs, openPrice, decimals,
      settled ? closePrice : null, { price: readPrice ?? null, quotedAt: readQuotedAt ?? null })
    : null;
  const real = points?.filter((point): point is { t: number; price: number } => point.price != null) ?? [];
  const last = real[real.length - 1];
  const openClock = `${fmtEATClock(opensAtMs) ?? "--:--"} EAT`;
  const lastClock = last ? `${fmtEATClock(last.t) ?? "--:--"} EAT` : null;
  const stale = !settled && last != null && nowMs - last.t > 3 * 60_000;

  if (!points || !last) {
    // The price row already says when no newer confirmed read exists. If a newer
    // read is visible there but minute bars are unavailable, explain the missing
    // drawing in one small line instead of leaving an unexplained blank slot.
    if (status === "loading") return null;
    if (active && readPrice != null && Number.isFinite(readPrice)) {
      return <p className="m-0 font-mono text-micro text-text-subtle" role="status" data-testid="round-live-line-unavailable">{words.unavailable}</p>;
    }
    return <span className="sr-only" role="status" data-testid="round-live-line-empty">{words.unavailable}</span>;
  }

  // The card's confirmed read can be newer than the only vendor bar on this line.
  // Hide that one-point drawing instead of falsely saying no newer price exists.
  if (real.length === 1 && hasLaterConfirmedRead(opensAtMs, readPrice ?? null, readQuotedAt ?? null)) {
    return <p className="m-0 font-mono text-micro text-text-subtle" role="status" data-testid="round-live-line-unavailable">{words.unavailable}</p>;
  }

  const prices = real.map((point) => point.price).concat(openPrice);
  let min = Math.min(...prices), max = Math.max(...prices);
  const minimumSpan = Math.max(openPrice * 0.002, 6 / 10 ** decimals);
  if (max - min < minimumSpan) {
    const middle = (max + min) / 2;
    min = middle - minimumSpan / 2;
    max = middle + minimumSpan / 2;
  }
  const x = (t: number) => 3 + (t - opensAtMs) / (closesAtMs - opensAtMs) * 314;
  const y = (price: number) => 49 - (price - min) / (max - min) * 42;
  const runs: Array<Array<{ t: number; price: number }>> = [];
  for (const point of points) {
    if (point.price == null) { if (runs[runs.length - 1]?.length) runs.push([]); }
    else {
      if (!runs.length) runs.push([]);
      runs[runs.length - 1].push({ t: point.t, price: point.price });
    }
  }

  return (
    <div data-testid="round-live-line">
      <svg viewBox="0 0 320 56" preserveAspectRatio="none" className="block w-full" style={{ height: 56 }} role="img"
        aria-label={`${words.beat} ${usd(openPrice, decimals)}. ${real.map((point) => `${fmtEATClock(point.t)} EAT ${usd(point.price, decimals)}`).join("; ")}.`}>
        <line x1="0" x2="320" y1={y(openPrice)} y2={y(openPrice)} stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="3 4" />
        {runs.filter((run) => run.length > 1).map((run, index) => (
          <path key={index} d={run.map((point, i) => `${i ? "L" : "M"}${x(point.t).toFixed(2)} ${y(point.price).toFixed(2)}`).join(" ")}
            fill="none" stroke="var(--aqua-300)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        ))}
        <circle cx={x(last.t)} cy={y(last.price)} r="2.5" fill="var(--aqua-300)" />
      </svg>
      <div className="flex items-baseline justify-between gap-2 font-mono text-micro text-text-subtle">
        {/* The value beside this caption is the latest vendor bar's OPEN, not
            the frozen opening target above. Name the same measure as the large chart. */}
        <span>{stale ? words.delayed : real.length === 1 ? `${words.noNewer} ${openClock}` : words.minuteOpen}</span>
        <span className="whitespace-nowrap tabular-nums">{lastClock} · {usd(last.price, decimals)}</span>
      </div>
    </div>
  );
}
