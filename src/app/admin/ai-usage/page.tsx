import type * as React from "react";
import Link from "next/link";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminAreaChart, AdminMeter } from "@/components/admin/admin-charts";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { resolveRange } from "@/lib/server/date-range";
import { getAiUsageSummary, listAiUsage, type AiFeature, type UsageBucket, type AiUsageFilter, type AiUsageEventRecord } from "@/lib/server/ai-usage";
import { getCycleReadModel, listCycles, suggestedPriceUsd, tzs } from "@/lib/server/ai-cycles";
import { CycleSettings, StartCycleControl, CloseCycleControl } from "./cycle-controls";
import { currentSession } from "@/lib/server/auth-service";
import { canAct } from "@/lib/server/rbac";
import { getAnthropicSpend } from "@/lib/server/anthropic-billing";
import { CreditControls } from "./credit-controls";
import { AiOpsControls } from "./ai-ops-controls";
import { getAiOpsConfig, AVAILABLE_MODELS } from "@/lib/server/ai-ops-config";
import { ai } from "@/lib/server/ai-config";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

export const metadata = { title: "Admin \u00b7 AI usage & credits" };
export const dynamic = "force-dynamic";

function usd(n: number): string {
  if (!n) return "$0.00";
  return `$${n.toFixed(Math.abs(n) < 1 ? 4 : 2)}`;
}
function tok(n: number): string {
  return n.toLocaleString();
}
function ts(iso: string): string {
  return iso.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

const FEATURE_LABEL: Record<AiFeature, string> = {
  polls: "Poll generation",
  chat: "Help chatbot",
  sentinel: "Market Sentinel (polls)",
  updown: "Up & Down oracle",
  other: "Other",
};
const FEATURE_VARIANT: Record<AiFeature, "info" | "success" | "warning" | "neutral"> = {
  polls: "info",
  chat: "success",
  sentinel: "warning",
  updown: "info",
  other: "neutral",
};
// Up & Down first — it is the highest-frequency spender (one oracle call per asset per
// grid boundary) and Ali wants each game's cost legible at a glance.
const FEATURES: AiFeature[] = ["updown", "sentinel", "polls", "chat", "other"];

// The cycle ledger is short by construction (one row per $100 of spend), so it pages
// separately from the per-call ledger and on its own `cpage` param — sharing `page` would
// move both tables at once.
const CYCLES_PER_PAGE = 12;

/** The subject types the meter writes, and how an operator reads them. ⛔ Mirrors
 *  `AiSubjectType` in ai-usage.ts — `test:ai-cycles` §15 asserts the two agree, so this
 *  cannot quietly fall behind the meter. */
const SUBJECT_LABEL: Record<string, string> = {
  market: "MARKET",
  updown_observation: "U&D OBSERVATION",
  updown_proposal: "U&D PROPOSAL",
  poll_generation: "POLL GENERATION",
  poll_ideation: "POLL IDEATION",
  chat_session: "CHAT",
};
const SUBJECT_TYPES = Object.keys(SUBJECT_LABEL);

const LINE_LABEL: Record<"polls" | "updown" | "chat" | "other", string> = {
  polls: "Polls (generation + Sentinel)",
  updown: "Up & Down oracle",
  chat: "Help chatbot",
  // ⛔ Present so the lines SUM to the total. Spend filed as `other` used to appear in the
  // page total and in NO line, and nothing said so.
  other: "Other / unclassified",
};

/** ms → "4d 3h" / "6h 12m" / "48m". Null while a cycle is still open. */
function lasted(ms: number | null): string {
  if (ms === null) return "—";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** ⛔ `—`, never `Infinity` or `NaN`. A null here is a real answer, not a missing one. */
function orDash(n: number | null, fmt: (v: number) => string): string {
  return n === null || !Number.isFinite(n) ? "—" : fmt(n);
}

function cycles(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function tzsFmt(n: number | null): string {
  return n === null ? "—" : `TZS ${Math.round(n).toLocaleString()}`;
}

/**
 * The filter rail's label. ⛔ ONE definition, not five copies of the same class string —
 * `test:type-scale` §6 ratchets every hand-typed `tracking-[…]`, and adding a fifth filter
 * would otherwise have raised it. The tracking is hand-typed because the closed scale's
 * `text-micro` carries 0.4px and this rail is set at 0.14em to match the table headers
 * beside it; keeping the two in step matters more than shaving one arbitrary value, and
 * now there is exactly one place to change if that ever stops being true.
 */
function FilterLabel({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-micro uppercase tracking-[0.14em] text-text-subtle">{children}</span>;
}
type SP = Record<string, string | string[] | undefined>;
function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function AdminAiUsagePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const feature = one(sp.feature);
  const status = one(sp.status);
  const q = one(sp.q).trim();
  const subjectType = one(sp.subject);
  const sortRaw = one(sp.sort);
  const dirRaw = one(sp.dir);
  const pageRaw = one(sp.page);

  // Created-date window via the platform resolver — presets + custom date+hour+minute,
  // EAT-safe (the old since/until treated the day as UTC). Only filters when set.
  const rangeId = one(sp.range);
  const hasWin = !!(rangeId && rangeId !== "all") || !!one(sp.from) || !!one(sp.to);
  const win = hasWin ? resolveRange({ range: rangeId, from: one(sp.from), to: one(sp.to) }) : null;

  const filter: AiUsageFilter = {
    feature: FEATURES.includes(feature as AiFeature) ? feature : undefined,
    // ⛔ WIRED, not speculative. The DAL gained this filter with the attribution and nothing
    // used it — dead surface on a money screen is the same defect as a dead control.
    subjectType: SUBJECT_TYPES.includes(subjectType as (typeof SUBJECT_TYPES)[number]) ? subjectType : undefined,
    status: status === "ok" || status === "error" ? status : undefined,
    since: win ? new Date(win.start).toISOString() : undefined,
    until: win ? new Date(win.end).toISOString() : undefined,
    search: q || undefined,
  };

  // Fetch all matching rows for in-memory sort (the DAL returns newest-first;
  // we re-sort client-side so SortTh column headers work). Cap at 10k to keep
  // memory bounded; the 180-day retention + filters keeps this well under.
  const [summary, listed, anthropic, aiOps, cyc, cycleList, session] = await Promise.all([
    getAiUsageSummary(),
    listAiUsage(filter, 1, 10_000),
    getAnthropicSpend(),
    getAiOpsConfig(),
    getCycleReadModel(),
    listCycles(parsePage(one(sp.cpage), 1_000_000, CYCLES_PER_PAGE), CYCLES_PER_PAGE),
    currentSession(),
  ]);
  // ⛔ VIEW ≠ ACT. `canView` without `canAct` is a real, reachable state under the default
  // grants, and a role that may read the cost figures must not be able to retune the
  // denomination they are expressed in. ADMIN bypasses, exactly as the layout does.
  const mayTune = !!session && (session.role === "ADMIN" || (await canAct(session.role, "ops")));
  const s = summary;

  // Sort
  const SORT_KEYS = ["time", "feature", "model", "in", "out", "search", "cost", "ms", "subject", "status"] as const;
  const { sort, dir } = parseSort(
    { sort: sortRaw, dir: dirRaw },
    SORT_KEYS,
    "time",
    "desc",
  );
  const sorted = applySort(listed.rows, sort, dir, {
    time: (e: AiUsageEventRecord) => e.createdAt,
    feature: (e: AiUsageEventRecord) => e.feature,
    model: (e: AiUsageEventRecord) => e.model,
    in: (e: AiUsageEventRecord) => e.inputTokens,
    out: (e: AiUsageEventRecord) => e.outputTokens,
    search: (e: AiUsageEventRecord) => e.webSearches,
    cost: (e: AiUsageEventRecord) => e.costUsd,
    ms: (e: AiUsageEventRecord) => e.latencyMs ?? 0,
    status: (e: AiUsageEventRecord) => e.ok ? "ok" : "error",
    // Sorts unattributed rows together — "" ranks before any real subject type.
    subject: (e: AiUsageEventRecord) => `${e.subjectType ?? ""} ${e.subjectId ?? ""}`,
  });

  // Paginate
  const page = parsePage(pageRaw, sorted.length, PER_PAGE);
  const rows = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const total = sorted.length;

  // Build baseHref preserving filters but not page
  const spFlat: Record<string, string | undefined> = {
    feature: filter.feature,
    status,
    q: q || undefined,
    subject: filter.subjectType,
    range: rangeId || undefined,
    from: one(sp.from) || undefined,
    to: one(sp.to) || undefined,
    sort: sortRaw || undefined,
    dir: dirRaw || undefined,
  };
  const baseHref = buildBaseHref("/admin/ai-usage", spFlat);

  const c = s.credit;
  const pctSpent = c.limitUsd > 0 ? Math.min(100, (c.spentThisWindowUsd / c.limitUsd) * 100) : 0;
  const creditTone: "no" | "warn" | "ok" = c.remainingUsd <= 0 ? "no" : pctSpent >= 80 ? "warn" : "ok";
  const creditToneCls = creditTone === "no"
    ? "border-no-700/60 bg-no-500/10"
    : creditTone === "warn"
    ? "border-warning-fg/50 bg-bg-overlay"
    : "border-success/40 bg-success/10";

  const health = s.health;
  // 🔴 THE HEALTH BANNER MUST NOT SAY "HEALTHY" WHILE THE AI IS PAUSED.
  // Caught by looking at the screenshot: the green "AI is healthy" bar rendered directly
  // above the red "AI is paused — cycle 6 is complete" bar. Both statements were true —
  // health measures whether calls ERROR, the gate measures whether they are ALLOWED — but an
  // operator glancing at two stacked bars that contradict each other learns nothing, and on
  // an admin money surface that is the defect, not the wording.
  //
  // Health is still reported, because "are calls erroring?" stays a real question while
  // paused. It just stops being the headline, and the headline stops being wrong.
  const banner =
    cyc.gate.blocked
      ? {
          cls: "border-border bg-bg-overlay",
          icon: <I.clock s={16} className="text-text-tertiary shrink-0 mt-0.5" />,
          title: "AI is paused — this is a spend-cycle checkpoint, not a fault",
          body: `Cycle ${cyc.gate.lastClosedIndex} spent its full size, so poll posting and AI resolving are stopped until cycle ${cyc.gate.lastClosedIndex + 1} is started. Of the last 24h of calls, ${s.recent24h.ok} succeeded and ${s.recent24h.err} errored — nothing is broken.`,
        }
      : health === "failing"
      ? { cls: "border-no-700/60 bg-no-500/10", icon: <I.warning s={16} className="text-no-300 shrink-0 mt-0.5" />, title: "AI calls are FAILING", body: `Every AI call in the last 24h errored (${s.recent24h.err} failed). The Up & Down oracle, market resolution, poll generation and chatbot are all down \u2014 almost always an exhausted Anthropic balance or a bad key. Top up and start a new top-up window below.` }
      : health === "idle"
      ? { cls: "border-border bg-bg-overlay", icon: <I.clock s={16} className="text-text-tertiary shrink-0 mt-0.5" />, title: "AI idle", body: "No AI calls in the last 24h \u2014 normal during quiet periods." }
      : { cls: "border-success/40 bg-success/10", icon: <I.checkCircle s={16} className="text-success shrink-0 mt-0.5" />, title: "AI is healthy", body: `${s.recent24h.ok} successful AI call${s.recent24h.ok === 1 ? "" : "s"} in the last 24h, ${s.recent24h.err} error${s.recent24h.err === 1 ? "" : "s"}.` };

  return (
    <>
      <AdminPageHead title="AI usage & credits" sw="Matumizi ya AI na salio" />
      <AdminBody>
        {/* Health banner */}
        <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${banner.cls}`}>
          {banner.icon}
          <div>
            <p className="font-bold text-text">{banner.title}</p>
            <p className="text-caption mt-0.5 text-text-secondary">{banner.body}</p>
          </div>
        </div>

        {/* Spend KPIs — real Anthropic data when available, else our estimates */}
        <KpiGrid>
          <AdminKpi
            label={anthropic ? "Spend today (Anthropic)" : "Spend today"}
            sw="Leo"
            value={usd(anthropic?.today ?? s.windows.today.costUsd)}
            delta={anthropic ? `est. ${usd(s.windows.today.costUsd)} \u00b7 ${s.windows.today.calls} calls` : `${s.windows.today.calls} calls`}
          />
          <AdminKpi
            label={anthropic ? "Last 7 days (Anthropic)" : "Last 7 days"}
            sw="Siku 7"
            value={usd(anthropic?.last7 ?? s.windows.last7.costUsd)}
            delta={anthropic ? `est. ${usd(s.windows.last7.costUsd)} \u00b7 ${s.windows.last7.calls} calls` : `${s.windows.last7.calls} calls`}
          />
          <AdminKpi
            label={anthropic ? "Last 30 days (Anthropic)" : "Last 30 days"}
            sw="Siku 30"
            value={usd(anthropic?.last30 ?? s.windows.last30.costUsd)}
            delta={anthropic ? `est. ${usd(s.windows.last30.costUsd)} \u00b7 ${s.windows.last30.calls} calls` : `${s.windows.last30.calls} calls`}
          />
          <AdminKpi label="Stored (180d)" sw="Jumla" value={usd(s.windows.all.costUsd)} delta={`${s.windows.all.calls} calls`} />
        </KpiGrid>

        {/* 30-day spend trend — real Anthropic daily cost. Only rendered when the
            admin Cost API key is set (the estimate-only path has no per-day
            series), so we draw the truth or nothing — never a fabricated line. */}
        {anthropic && anthropic.daily.length >= 2 && (
          <AdminCard
            title="Daily spend · 30 days"
            sw="Matumizi ya kila siku"
            action={<span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">Anthropic Cost API · USD</span>}
          >
            <AdminAreaChart
              series={anthropic.daily.map((d, i) => ({ x: i, y: d.costUsd }))}
              xLabels={anthropic.daily.map((d) => d.date.slice(5))}
              height={200}
              fillVar="var(--royal)"
              strokeVar="var(--royal)"
              yLabel="USD"
            />
          </AdminCard>
        )}

        {/* ═══ SPEND CYCLES ═══════════════════════════════════════════════════════
            Ali, 2026-08-23: "I will charge Claude API with maybe 1k and if a cycle is
            100$ ... when a cycle ends we have to start a new one to proceed, or posting
            or AI resolving blocked ... we see each cycle how much it lasted."
            ⛔ Every figure below is either measured or "—". Nothing here is estimated. */}

        {/* The gate — the loudest thing on the page when the AI is paused. */}
        {cyc.gate.blocked ? (
          <div className="rounded-lg border border-no-700/60 bg-no-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <I.warning s={16} className="text-no-300 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-text">AI is paused — cycle {cyc.gate.lastClosedIndex} is complete</p>
              <p className="text-caption mt-0.5 text-text-secondary">
                Poll posting and AI resolving are blocked until cycle {cyc.gate.lastClosedIndex + 1} is started.
                Nothing is lost while it is paused; markets simply wait.
              </p>
            </div>
            <StartCycleControl nextIndex={cyc.gate.lastClosedIndex + 1} sizeUsd={cyc.config.sizeUsd} canAct={mayTune} />
          </div>
        ) : null}

        <AdminCard
          title="Spend cycles"
          sw="Mizunguko ya matumizi"
          action={<span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">${cyc.config.sizeUsd.toLocaleString()} per cycle · rates {cyc.priceRev}</span>}
        >
          {/* ⚠️ EVERY SPACE AROUND AN EXPRESSION HERE IS EXPLICIT `{" "}`, AND BOTH HALVES OF
              THAT WERE PAID FOR. Written as `${expr} and`, the space after the expression was
              dropped and the page read "Top up $1,000and that is 10 cycles." — caught by
              screenshotting the card for the admin guide, not by any assertion. Then the JSX
              COMMENT explaining the fix, placed between the two lines, ate the space before
              it and produced "period.Top up". A comment is not invisible to the text flow.
              Never rely on implicit whitespace next to a JSX expression or comment. */}
          <p className="text-caption text-text-secondary mb-4">
            A cycle is a fixed <strong>${cyc.config.sizeUsd.toLocaleString()}</strong> of Claude spend — a denomination, not a period.{" "}
            Top up ${(cyc.config.sizeUsd * 10).toLocaleString()}{" "}and that is 10 cycles. Cycles are numbered for ever and never reset,
            which is what makes &ldquo;cycles this year&rdquo; a number you can divide by markets resolved.
          </p>

          <KpiGrid>
            <AdminKpi
              label="Cycles closed"
              sw="Zilizofungwa"
              value={cyc.closedCount.toLocaleString()}
              delta={cyc.open ? `cycle ${cyc.open.index} open` : cyc.gate.blocked ? "none open — AI paused" : "none opened yet"}
              tone={cyc.gate.blocked ? "danger" : undefined}
            />
            <AdminKpi
              label="This cycle"
              sw="Mzunguko huu"
              value={cyc.open ? usd(cyc.open.costUsd) : "—"}
              delta={cyc.open ? `${cyc.open.usedPct.toFixed(0)}% of ${cyc.open.sizeUsd.toLocaleString()}` : "no open cycle"}
            />
            <AdminKpi
              label="Funded cycles"
              sw="Zilizolipiwa"
              value={orDash(cyc.funded.cycles, (v) => cycles(v))}
              delta={cyc.funded.cycles === null ? "no limit set" : `${cycles(cyc.funded.consumedCycles ?? 0)} used of ${cyc.funded.limitUsd.toLocaleString()}`}
            />
            <AdminKpi
              label="Cycles per year"
              sw="Kwa mwaka"
              value={cyc.projection.ok ? cycles(cyc.projection.cyclesPerYear) : "—"}
              delta={
                cyc.projection.ok
                  ? `from ${cyc.projection.closedCycles} closed over ${cyc.projection.observedDays}d`
                  : cyc.projection.reason === "no-closed-cycles"
                  ? "no cycle has closed yet"
                  : `not enough data — ${cyc.projection.observedDays}d of ${cyc.projection.minDays}`
              }
              /* 🔴 NOT `unavailable`. That prop renders "n/a · couldn't compute" with the
                 tooltip "a data read failed", and DISCARDS both the value and the delta —
                 so a projection the platform deliberately WITHHELD would claim a failure
                 that never happened, and throw away the sentence explaining why. Nothing
                 failed here: there is simply not enough history yet, which is a different
                 fact and the delta above says so. `unavailable` is for a read that broke. */
            />
          </KpiGrid>

          {/* ⛔ THE CONFIDENCE STATEMENT IS NOT DECORATION. A year figure from three hours of
              data looks exactly like a year figure from three years of it. */}
          <p className="text-caption text-text-tertiary mt-3 leading-snug">
            {cyc.projection.ok ? (
              <>
                Projected from <strong>{cyc.projection.closedCycles}</strong> closed cycle{cyc.projection.closedCycles === 1 ? "" : "s"} over{" "}
                <strong>{cyc.projection.observedDays} days</strong> ({cyc.projection.cyclesPerDay.toFixed(4)} cycles/day ·{" "}
                {usd(cyc.projection.usdPerYear)}/year). Only <strong>closed</strong> cycles feed this rate — the open one is a partial and
                would drag it down. A rate from few cycles is coarse; it sharpens as more close.
              </>
            ) : (
              <>
                No yearly projection yet: <strong>{cyc.projection.observedDays} days</strong> observed against a minimum of{" "}
                <strong>{cyc.projection.minDays}</strong>, with {cyc.projection.closedCycles} closed cycle
                {cyc.projection.closedCycles === 1 ? "" : "s"}. A year extrapolated from less than this looks like an answer and is not.
              </>
            )}
          </p>

          {cyc.open && (
            <div className="mt-4">
              <AdminMeter
                value={cyc.open.costUsd}
                cap={cyc.open.sizeUsd}
                label={`Cycle ${cyc.open.index}`}
                thresholdPct={80}
                format={(n) => usd(n)}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <CloseCycleControl index={cyc.open.index} costUsd={cyc.open.costUsd} sizeUsd={cyc.open.sizeUsd} canAct={mayTune} />
                <span className="text-caption text-text-tertiary">
                  Opened {ts(cyc.open.openedAt)} · size stamped at ${cyc.open.sizeUsd.toLocaleString()} · rates {cyc.open.priceRev}
                </span>
              </div>
            </div>
          )}

          {/* Reconciliation — the number that says the ledger and the events agree. */}
          <div className="mt-4 rounded-md border border-border bg-bg-overlay px-4 py-3">
            <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary mb-1">Reconciliation</div>
            <p className="text-label text-text-secondary leading-snug">
              {!cyc.conservation.comparable ? (
                <>
                  Not comparable yet — no cycle has opened inside the retained call window, so there is no span both
                  ledgers cover. The cycle ledger is complete regardless; only this cross-check is waiting.
                </>
              ) : (
                <>
                  Cycles hold <strong className="tabular-nums">{usd(cyc.conservation.cyclesUsd)}</strong>; the call ledger over the same
                  span holds <strong className="tabular-nums">{usd(cyc.conservation.eventsUsd)}</strong>.
                  {" "}
                  {Math.abs(cyc.conservation.driftUsd) < 0.000002 ? (
                    <span className="text-success">They agree exactly.</span>
                  ) : (
                    <span className="text-warning-fg">They differ by {usd(cyc.conservation.driftUsd)} — investigate before pricing from this page.</span>
                  )}
                  {" "}
                  {/* ⛔ THE SPAN IS NAMED, because the two ledgers do not cover the same time.
                      Cycles are never pruned; calls are, at 180 days. Comparing "all cycles"
                      against "all surviving calls" would report a growing drift that is only
                      retention doing its job — a reconciliation that cries wolf on a schedule
                      is one nobody reads when it finally means something. */}
                  Compared from <strong>{(cyc.conservation.sinceIso ?? "").slice(0, 10)}</strong>, the first cycle opened inside the
                  180-day call-retention window — the only span both ledgers cover.
                </>
              )}
            </p>
          </div>
        </AdminCard>

        {/* ═══ WHAT A RESOLUTION COSTS, AND WHAT TO CHARGE ════════════════════════ */}
        <AdminCard title="Cost per resolution, and what to charge" sw="Gharama kwa kila soko">
          <p className="text-caption text-text-secondary mb-3">
            Each product line&rsquo;s AI spend divided by the markets that line actually <strong>settled</strong>.
            {" "}⛔ Settled, not merely resolved: a resolved market still inside its objection window has an intact pool and has not
            been delivered, so counting it would understate the cost.
          </p>
          <ScrollX label="Cost per resolution by product line">
            <table className="admin-tbl min-w-[860px]">
              <thead>
                <tr>
                  <th className="text-left p-3">Product line</th>
                  <th className="text-right p-3">AI spend</th>
                  <th className="text-right p-3">Calls</th>
                  <th className="text-right p-3">Settled</th>
                  <th className="text-right p-3">Cost each</th>
                  <th className="text-right p-3">Cycles each</th>
                  <th className="text-right p-3">Suggested ({cyc.config.targetMarginPct}%)</th>
                  <th className="text-right p-3">Unattributed</th>
                </tr>
              </thead>
              <tbody className="text-text-muted">
                {cyc.lines.map((l) => {
                  const suggested = l.usdPerResolution === null ? null : suggestedPriceUsd(l.usdPerResolution, cyc.config.targetMarginPct);
                  const suggestedTzs = suggested === null ? null : tzs(suggested, cyc.config);
                  return (
                    <tr key={l.line} className="border-b border-border/60 last:border-b-0">
                      <td className="p-3 text-text">{LINE_LABEL[l.line]}</td>
                      <td className="p-3 font-mono tabular-nums text-right text-text">{usd(l.spendUsd)}</td>
                      <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{l.calls.toLocaleString()}</td>
                      <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{l.resolutions.toLocaleString()}</td>
                      <td className="p-3 font-mono tabular-nums text-right text-text">{orDash(l.usdPerResolution, usd)}</td>
                      <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{orDash(l.cyclesPerResolution, (v) => v.toFixed(4))}</td>
                      <td className="p-3 font-mono tabular-nums text-right text-text">
                        {suggested === null ? "—" : usd(suggested)}
                        <span className="block text-caption text-text-tertiary">{tzsFmt(suggestedTzs)}</span>
                      </td>
                      <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{usd(l.unattributedUsd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollX>

          <div className="mt-3 space-y-1.5 text-caption text-text-tertiary leading-snug">
            <p>
              {/* ⚠️ `{" "}` after </strong> — see the note above the Spend-cycles copy. Without it
                  this rendered "not a flat fee.The". */}
              ⛔ <strong>What 50pick actually charges is a pool commission, not a flat fee.</strong>{" "}The &ldquo;suggested&rdquo; column is
              what this AI cost plus a {cyc.config.targetMarginPct}% margin would come to per market — it is a cost floor to compare
              against real commission earned, not a price we charge. TZS 1,000 is the <em>minimum stake</em>, not a price.
            </p>
            <p>
              {cyc.fx.usable ? (
                <>Shillings converted at <strong>{cyc.fx.rate.toLocaleString()} TZS / USD</strong>, rate taken {cyc.fx.asOfIso.slice(0, 10)}
                  {cyc.fx.stale ? <span className="text-warning-fg"> — {Math.round(cyc.fx.ageDays ?? 0)} days old; refresh it before pricing from this.</span> : null}.</>
              ) : (
                <>No USD→TZS rate is set, so every shilling figure reads &ldquo;—&rdquo;. Set the rate and its date in <strong>Cycle settings</strong> below. A converted figure with no visible rate is a claim nobody can check.</>
              )}
            </p>
            <p>
              ⚠️ <strong>Up &amp; Down AI spend is not the whole cost of an Up &amp; Down round.</strong> One oracle call serves an
              <em> observation</em>, which is shared by every round on that boundary — measured at 2.353 rounds per observation.
              Rounds settled by the price feed instead of the AI cost nothing in this table at all.
            </p>
            <p>
              Model mix over this span:{" "}
              {cyc.modelMix.length === 0 ? "no calls" : cyc.modelMix.map((m) => `${m.model} ${m.pct.toFixed(0)}%`).join(" · ")}.
              A switch between model tiers moves cost per resolution several-fold on its own.
            </p>
          </div>
        </AdminCard>

        {/* ═══ BY YEAR ════════════════════════════════════════════════════════════ */}
        <AdminCard title="Cycles by year" sw="Mizunguko kwa mwaka" padding="p-0">
          <ScrollX label="Cycles by year">
            <table className="admin-tbl min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left p-3">Year</th>
                  <th className="text-right p-3">Cycles closed</th>
                  <th className="text-right p-3">Spend</th>
                  <th className="text-right p-3">Avg cycle lasted</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-text-muted">
                {cyc.years.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="!p-0">
                      <EmptyState
                        kind="admin"
                        title="No cycle has closed yet"
                        titleSw="Hakuna mzunguko uliofungwa bado"
                        body="A year appears here as soon as its first cycle closes. Until then there is nothing honest to count."
                      />
                    </td>
                  </tr>
                ) : cyc.years.map((y) => (
                  <tr key={y.year} className="border-b border-border/60 last:border-b-0">
                    <td className="p-3 text-text font-mono tabular-nums">{y.year}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text">{y.closed.toLocaleString()}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{usd(y.costUsd)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{y.avgLastedDays === null ? "—" : `${y.avgLastedDays}d`}</td>
                    <td className="p-3">
                      {y.partial
                        ? <Chip size="sm" variant="warning">PART YEAR</Chip>
                        : <Chip size="sm" variant="neutral">COMPLETE</Chip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
          <p className="px-4 py-3 text-caption text-text-tertiary leading-snug border-t border-border">
            Counted from the ledger, in the platform timezone — each closed cycle at the size it was <strong>opened</strong>{" "}with, never
            re-derived from today&rsquo;s size. A part year is marked, because a part-year total read as a full one understates the rate.
          </p>
        </AdminCard>

        {/* ═══ THE LEDGER ═════════════════════════════════════════════════════════ */}
        <AdminCard
          title="Every cycle"
          sw="Kila mzunguko"
          padding="p-0"
          action={<span className="font-mono text-micro text-text-subtle">{cycleList.total.toLocaleString()} total</span>}
        >
          <ScrollX label="Cycle ledger">
            <table className="admin-tbl min-w-[860px]">
              <thead>
                <tr>
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Opened</th>
                  <th className="text-left p-3">Closed</th>
                  <th className="text-right p-3">Lasted</th>
                  <th className="text-right p-3">Size</th>
                  <th className="text-right p-3">Spent</th>
                  <th className="text-right p-3">Used</th>
                  <th className="text-left p-3">Rates</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-text-muted">
                {cycleList.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="!p-0">
                      <EmptyState
                        kind="admin"
                        title="No cycles yet"
                        titleSw="Bado hakuna mizunguko"
                        body="Cycle 1 opens by itself the first time a Claude call is metered. Nothing needs to be started by hand."
                      />
                    </td>
                  </tr>
                ) : cycleList.rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-b-0">
                    <td className="p-3 font-mono tabular-nums text-text">{r.index}</td>
                    <td className="p-3 font-mono tabular-nums text-text-tertiary whitespace-nowrap text-caption">{ts(r.openedAt)}</td>
                    <td className="p-3 font-mono tabular-nums text-text-tertiary whitespace-nowrap text-caption">{r.closedAt ? ts(r.closedAt) : "—"}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text">{lasted(r.lastedMs)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{usd(r.sizeUsd)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text">{usd(r.costUsd)}</td>
                    <td className={`p-3 font-mono tabular-nums text-right ${r.usedPct > 100.01 ? "text-warning-fg" : "text-text-tertiary"}`}>{r.usedPct.toFixed(0)}%</td>
                    <td className="p-3 font-mono text-text-tertiary text-caption">{r.priceRev}</td>
                    <td className="p-3">
                      {r.status === "OPEN"
                        ? <Chip size="sm" variant="success">OPEN</Chip>
                        : <Chip size="sm" variant="neutral">CLOSED</Chip>}
                      {r.openedBy && <span className="text-text-tertiary ml-1.5 text-caption">opened by hand</span>}
                      {r.note && <span className="text-text-tertiary ml-1.5 text-caption">{r.note.slice(0, 60)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
          <AdminPagination
            total={cycleList.total}
            page={parsePage(one(sp.cpage), cycleList.total, CYCLES_PER_PAGE)}
            baseHref={buildBaseHref("/admin/ai-usage", { ...spFlat, page: pageRaw || undefined })}
            param="cpage"
            perPage={CYCLES_PER_PAGE}
          />
          <p className="px-4 py-3 text-caption text-text-tertiary leading-snug border-t border-border">
            ⛔ This ledger is <strong>never pruned</strong>. The per-call ledger below is kept 180 days; a cycle carries its own total so
            the count stays true long after the calls behind it are gone. &ldquo;Used&rdquo; above 100% means the final call crossed the
            boundary — real, bounded by one call, and shown rather than smoothed away.
          </p>
        </AdminCard>

        {/* ═══ SETTINGS ═══════════════════════════════════════════════════════════ */}
        <AdminCard title="Cycle settings" sw="Mipangilio ya mizunguko">
          <CycleSettings
            sizeUsd={cyc.config.sizeUsd}
            autoRoll={cyc.config.autoRoll}
            targetMarginPct={cyc.config.targetMarginPct}
            fxTzsPerUsd={cyc.config.fxTzsPerUsd}
            fxAsOfIso={cyc.config.fxAsOfIso}
            minDaysForProjection={cyc.config.minDaysForProjection}
            canAct={mayTune}
          />
        </AdminCard>

        {/* Credit limit + top-up window */}
        <AdminCard title="Credit budget" sw="Bajeti ya salio">
          <p className="text-caption text-text-secondary mb-3">
            Anthropic has no API for exact remaining balance, so this tracks spend against a budget you set.
            Admins are emailed at <strong>~80%</strong> and again at <strong>100%</strong>. After you top up credit on the
            Anthropic console, click <strong>New top-up window</strong> to zero the counter and re-arm the alerts. Set up
            <strong> Auto Reload</strong> on Anthropic too, so the balance never actually hits zero.
            {" "}⛔ A <strong>top-up window</strong> is not a <strong>spend cycle</strong> — the window is how much credit you have bought,
            the cycle is the $-denomination it is counted in. They are different sections on this page.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-md border border-border bg-bg-overlay px-4 py-3">
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary mb-1">Limit / window</div>
              <div className="text-text font-semibold tabular-nums">{usd(c.limitUsd)}</div>
            </div>
            <div className="rounded-md border border-border bg-bg-overlay px-4 py-3">
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary mb-1">Spent this window</div>
              <div className="text-text font-semibold tabular-nums">{usd(c.spentThisWindowUsd)}</div>
              <div className="text-caption text-text-tertiary mt-0.5">{pctSpent.toFixed(0)}% of limit</div>
            </div>
            <div className={`rounded-md border px-4 py-3 ${creditToneCls}`}>
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary mb-1">Remaining (est.)</div>
              <div className="text-text font-semibold tabular-nums">{usd(c.remainingUsd)}</div>
            </div>
            <div className="rounded-md border border-border bg-bg-overlay px-4 py-3">
              <div className="text-micro uppercase tracking-[0.14em] text-text-tertiary mb-1">Window started</div>
              <div className="text-text font-semibold tabular-nums text-body-sm">{c.topUpWindowStartIso.slice(0, 10)}</div>
              {c.alertedLevel !== "none" && (
                <div className="text-caption text-warning-fg mt-0.5">alerted: {c.alertedLevel}</div>
              )}
            </div>
          </div>
          {/* A8 AdminMeter — spend-vs-cap gauge; flips to danger past the 80%
              alert threshold (the same point admins are emailed). */}
          {c.limitUsd > 0 && (
            <div className="mb-4">
              <AdminMeter
                value={c.spentThisWindowUsd}
                cap={c.limitUsd}
                label="Top-up window spend"
                thresholdPct={80}
                format={(n) => usd(n)}
              />
            </div>
          )}
          <CreditControls limitUsd={c.limitUsd} />
        </AdminCard>

        {/* AI operations — the Claude model for poll generation + resolution checks */}
        <AdminCard title="AI operations" sw="Mipangilio ya AI">
          <p className="text-caption text-text-secondary mb-4">
            Control which Claude model powers the platform. Changes apply immediately — no redeploy needed.
            Markets are AI-checked exactly at their own resolution time by the per-market scheduler (there is no
            fixed sweep interval); use “Re-check this market now” on the resolver queue for a one-off check.
          </p>
          <AiOpsControls
            currentModel={aiOps.model}
            triageModel={ai.triageModel}
            models={AVAILABLE_MODELS}
          />
        </AdminCard>

        {/* Per-feature breakdown */}
        <AdminCard title="By feature (stored window)" sw="Kwa kipengele" padding="p-0">
          <ScrollX label="AI usage by feature">
            <table className="admin-tbl min-w-[860px]">
              <thead>
                <tr>
                  <th className="text-left p-3">Feature</th>
                  <th className="text-right p-3">Calls</th>
                  <th className="text-right p-3">OK</th>
                  <th className="text-right p-3">Errors</th>
                  <th className="text-right p-3">In tok</th>
                  <th className="text-right p-3">Out tok</th>
                  <th className="text-right p-3">Searches</th>
                  <th className="text-right p-3">Cost</th>
                </tr>
              </thead>
              <tbody className="text-text-muted">
                {FEATURES.map((f) => ({ f, b: s.byFeature[f] })).filter((r) => r.b.calls > 0).map(({ f, b }: { f: AiFeature; b: UsageBucket }) => (
                  <tr key={f} className="border-b border-border/60 last:border-b-0">
                    <td className="p-3 text-text">
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant={FEATURE_VARIANT[f]}>{f.toUpperCase()}</Chip>
                        <span>{FEATURE_LABEL[f]}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono tabular-nums text-right text-text">{b.calls.toLocaleString()}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{b.ok.toLocaleString()}</td>
                    <td className={`p-3 font-mono tabular-nums text-right ${b.err > 0 ? "text-no-300 font-semibold" : "text-text-tertiary"}`}>{b.err.toLocaleString()}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{tok(b.inTok)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{tok(b.outTok)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{tok(b.searches)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text">{usd(b.costUsd)}</td>
                  </tr>
                ))}
                {s.windows.all.calls === 0 && (
                  <tr>
                    <td colSpan={8} className="!p-0">
                      <EmptyState
                        kind="admin"
                        title="No AI usage recorded yet"
                        titleSw="Bado hakuna matumizi ya AI"
                        body="AI calls will appear here once the Up & Down oracle, market resolution, poll generation, or chatbot runs — each on its own line."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollX>
        </AdminCard>

        {/* Per-call ledger — sortable, filterable, paginated */}
        <AdminCard
          title="Every API call"
          sw="Kila ombi la API"
          padding="p-0"
          action={<span className="font-mono text-micro text-text-subtle">{total.toLocaleString()} matching</span>}
        >
          {/* Filters */}
          <div className="px-4 lg:px-5 pt-4 pb-3">
            <form method="get" className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <FilterLabel>Feature</FilterLabel>
                <div className="w-[160px]">
                  <Select
                    name="feature"
                    defaultValue={filter.feature ?? ""}
                    size="xs"
                    placeholder="All features"
                    options={[
                      { value: "", label: "All features" },
                      ...FEATURES.map((f) => ({ value: f, label: FEATURE_LABEL[f] })),
                    ]}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <FilterLabel>Status</FilterLabel>
                <div className="w-[140px]">
                  <Select
                    name="status"
                    defaultValue={status}
                    size="xs"
                    placeholder="All statuses"
                    options={[
                      { value: "", label: "All statuses" },
                      { value: "ok", label: "OK" },
                      { value: "error", label: "Errors" },
                    ]}
                  />
                </div>
              </div>
              {/* Window is the platform date+hour+minute filter; hidden inputs keep it
                  when the form's other fields (feature/status/search) are applied. */}
              {rangeId ? <input type="hidden" name="range" value={rangeId} /> : null}
              {one(sp.from) ? <input type="hidden" name="from" value={one(sp.from)} /> : null}
              {one(sp.to) ? <input type="hidden" name="to" value={one(sp.to)} /> : null}
              <div className="flex flex-col gap-1">
                <FilterLabel>For</FilterLabel>
                <div className="w-[190px]">
                  <Select
                    name="subject"
                    defaultValue={filter.subjectType ?? ""}
                    size="xs"
                    placeholder="All subjects"
                    options={[
                      { value: "", label: "All subjects" },
                      ...SUBJECT_TYPES.map((t) => ({ value: t, label: SUBJECT_LABEL[t] })),
                    ]}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <FilterLabel>Window</FilterLabel>
                <DateTimeRangeFilter defaultPreset="all" presetIds={["today", "yesterday", "24h", "7d", "30d", "all"]} />
              </div>
              <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <FilterLabel>Search</FilterLabel>
                <div className="relative">
                  <I.search size={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
                  {/* ⚠️ LITERAL, not `h-8` (48px on the overridden scale) — 32px = --h-control-xs,
                      the one admin-search height across every admin filter rail. */}
                  <input type="text" name="q" defaultValue={q} placeholder="model, error, detail…" className="w-full h-[32px] pl-9 pr-3 rounded-md border border-border bg-bg-overlay text-label text-text admin-focus transition-colors placeholder:text-text-subtle" />
                </div>
              </label>
              <div className="flex items-center gap-2 pt-4">
                <Button type="submit" size="sm">Filter</Button>
                {(filter.feature || status || q || hasWin || filter.subjectType) && (
                  <a href="/admin/ai-usage" className="btn btn-ghost btn-sm">Clear</a>
                )}
              </div>
            </form>
          </div>

          <ScrollX label="AI call ledger">
            <table className="admin-tbl min-w-[860px]">
              <thead>
                <tr>
                  <SortTh field="time" label="Time (UTC)" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" />
                  <SortTh field="feature" label="Feature" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" />
                  <SortTh field="model" label="Model" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" />
                  <SortTh field="in" label="In" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" align="right" />
                  <SortTh field="out" label="Out" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" align="right" />
                  <SortTh field="search" label="Search" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" align="right" />
                  <SortTh field="cost" label="Cost" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" align="right" />
                  <SortTh field="ms" label="ms" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" align="right" />
                  {/* 🔴 THE ATTRIBUTION WAS THREADED THROUGH ALL 12 CALL SITES AND SHOWN NOWHERE.
                      Dividing spend by resolutions is the whole point of the build, and an
                      operator who cannot see what a single call was FOR cannot check the
                      division — only take it on trust. Sortable, so the unattributed rows
                      group together. */}
                  <SortTh field="subject" label="For" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" />
                  <SortTh field="status" label="Status" current={sort} dir={dir} sp={spFlat} baseHref="/admin/ai-usage" />
                </tr>
              </thead>
              <tbody className="text-text-muted">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="!p-0">
                      <EmptyState
                        kind="audit"
                        title="No calls match these filters"
                        titleSw="Hakuna maombi yanayolingana na chujio hili"
                        body="Try clearing filters or widening the date range."
                      />
                    </td>
                  </tr>
                ) : rows.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 last:border-b-0 align-top">
                    <td className="p-3 font-mono tabular-nums text-text-tertiary whitespace-nowrap text-caption">{ts(e.createdAt)}</td>
                    <td className="p-3 whitespace-nowrap">
                      <Chip size="sm" variant={FEATURE_VARIANT[(e.feature as AiFeature)] ?? "neutral"}>
                        {e.feature.toUpperCase()}
                      </Chip>
                    </td>
                    <td className="p-3 font-mono text-text-tertiary whitespace-nowrap text-caption">{e.model}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{tok(e.inputTokens)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{tok(e.outputTokens)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{e.webSearches || ""}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text">{usd(e.costUsd)}</td>
                    <td className="p-3 font-mono tabular-nums text-right text-text-tertiary">{e.latencyMs ?? ""}</td>
                    <td className="p-3 whitespace-nowrap">
                      {e.subjectType
                        ? <>
                            <Chip size="sm" variant="neutral">{SUBJECT_LABEL[e.subjectType] ?? e.subjectType}</Chip>
                            {e.subjectId
                              ? <span className="font-mono text-text-tertiary ml-1.5 text-caption">{e.subjectId.slice(0, 22)}</span>
                              : <span className="text-text-subtle ml-1.5 text-caption italic">no id yet</span>}
                          </>
                        : <span className="text-text-subtle text-caption italic">pre-2026-08-23</span>}
                    </td>
                    <td className="p-3 text-label">
                      {e.ok
                        ? <Chip size="sm" variant="success">OK</Chip>
                        : <Chip size="sm" variant="danger">ERROR</Chip>}
                      {e.errorType && <span className="text-no-200 ml-1.5 text-caption">{e.errorType.slice(0, 120)}</span>}
                      {e.ok && e.detail && <span className="text-text-tertiary ml-1.5 text-caption">{e.detail.slice(0, 120)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>

          <AdminPagination total={total} page={page} baseHref={baseHref} />

          <p className="px-4 py-3 text-caption text-text-tertiary leading-snug border-t border-border">
            {anthropic
              ? <>KPI tiles show <strong>real Anthropic-reported costs</strong> (via Cost API, cached 10 min). Per-call costs below are estimates from token counts. </>
              : <>Cost estimated from token counts \u00d7 Anthropic pricing. Set <code className="text-text-subtle">ANTHROPIC_ADMIN_KEY</code> on Railway for real Anthropic-reported costs. </>}
            Haiku $1/$5, Sonnet $3/$15, Opus $5/$25 per 1M tokens; web search $0.01/call. Ledger retained 180 days.
          </p>
        </AdminCard>
      </AdminBody>
    </>
  );
}
