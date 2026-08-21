"use client";

import { parseQuery, matchesQuery, fieldNames, PROPOSAL_SEARCH } from "@/lib/search";
import { SearchBox } from "@/components/ui/search-box";
import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Textarea } from "@/components/ui/textarea";
import { DateSelect } from "@/components/ui/date-select";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SELECTION, PROPOSAL } from "@/lib/admin-status-lexicon";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { SortBtn } from "@/components/admin/admin-sort";
import { RefreshButton } from "@/components/admin/refresh-button";
import { ControlLocked } from "@/components/admin/control-locked";
import { StatusBadge } from "@/components/proposals/status-badge";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/proposals/category-icon";
import type { ProposalsConfig, ProposalsState } from "@/lib/server/proposals-config";
import type { AdminQueueRow, DeclineReason } from "@/lib/server/proposals-service";
import type { ProposalCategory, ProposalStatus } from "@/lib/server/store";
import { saveProposalsConfigAction, approveProposalAction, goLiveProposalAction, declineProposalAction, requestChangesAction, editProposalAction } from "./actions";
import { formatTzs } from "@/lib/utils";

const DECLINE_REASONS: DeclineReason[] = ["Politics", "Ambiguous outcome", "No official source", "Duplicate", "Past resolution", "Outside jurisdiction", "Officer decision"];
const CATEGORIES: ProposalCategory[] = ["sports", "macro", "weather", "crypto", "culture", "infrastructure", "tech", "mixed"];
const TODAY = () => new Date().toISOString().slice(0, 10);
const MAX_DATE = () => `${new Date().getFullYear() + 2}-12-31`;

/**
 * What the officer is told about a proposal there is nothing left to do to.
 *
 * ⛔ Deliberately a sentence per state and not a word substituted into one: an
 * officer standing here wants to know what HAPPENED to it, and "listed" is the
 * database's word for "it is a live market taking real predictions". Only three
 * states reach this branch — REVIEW/CHANGES_REQUESTED are the actionable panel and
 * APPROVED has its own — and the fallback claims nothing rather than guessing.
 */
function terminalNote(status: ProposalStatus): string {
  if (status === "LISTED") return PROPOSAL.sentenceListed.en;
  if (status === "RESOLVED") return PROPOSAL.sentenceResolved.en;
  if (status === "DECLINED") return PROPOSAL.sentenceDeclined.en;
  return PROPOSAL.sentenceClosed.en;
}

/** The 4-state feature machine — display order + per-state admin metadata. The
 *  tones mirror the player-facing aesthetic system so the console reads the same
 *  way the app does: royal = live · gilt = coming soon · amber = maintenance ·
 *  muted = disabled. `state` is server-enforced; this is purely presentational. */
const STATE_ORDER: ProposalsState[] = ["ACTIVE", "COMING_SOON", "MAINTENANCE", "DISABLED"];
const STATE_META: Record<ProposalsState, {
  label: string; sw: string; note: string;
  icon: (typeof I)[keyof typeof I];
  fg: string; selBg: string; selBorder: string;
}> = {
  ACTIVE: {
    label: "Active", sw: "Inatumika",
    note: "Live — players can propose, vote, and earn the approval reward. No badge shown.",
    icon: I.trophy, fg: "var(--brand-300)",
    selBg: "color-mix(in oklab, var(--brand-500) 16%, transparent)",
    selBorder: "color-mix(in oklab, var(--brand-500) 45%, transparent)",
  },
  COMING_SOON: {
    label: "Coming soon", sw: "Inakuja",
    note: "Gilt “coming soon” badge shows on every entry point. Proposing & voting are blocked; players are guided that it opens soon.",
    icon: I.clock, fg: "var(--gold-300)",
    selBg: "color-mix(in oklab, var(--gold-500) 16%, transparent)",
    selBorder: "color-mix(in oklab, var(--gold-500) 45%, transparent)",
  },
  MAINTENANCE: {
    label: "Maintenance", sw: "Matengenezo",
    note: "Amber “temporarily unavailable” treatment. Proposing & voting are blocked; players are told it’s back shortly.",
    icon: I.pause, fg: "var(--warning-500)",
    selBg: "color-mix(in oklab, var(--warning-500) 18%, transparent)",
    selBorder: "color-mix(in oklab, var(--warning-500) 46%, transparent)",
  },
  DISABLED: {
    label: "Disabled", sw: "Imezimwa",
    note: "Every entry point is hidden and /proposals is redirected to an honest “not available” page.",
    icon: I.xCircle, fg: "var(--text-muted)",
    selBg: "color-mix(in oklab, var(--text-subtle) 14%, transparent)",
    selBorder: "var(--border-strong)",
  },
};

/** Client mirror of the server source-URL gate (http/https only) — used by the edit panel. */
function isValidHttpUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > 500) return false;
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}

function Cap({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">{children}</span>;
}
function CField({ label, hint, prefix, suffix, value, onChange, width }: { label: string; hint?: string; prefix?: string; suffix?: string; value: number; onChange: (n: number) => void; width?: number }) {
  return (
    <div style={{ width: width ?? "100%" }}>
      <div className="mb-1.5 text-[12px] font-semibold text-text">{label}</div>
      <Input
        prefix={prefix || undefined}
        trailing={suffix ? <span className="text-[11px]">{suffix}</span> : undefined}
        mono
        size="sm"
        inputMode="numeric"
        value={value}
        onChange={(e) => { const n = Number(e.target.value.replace(/[^\d]/g, "")); onChange(Number.isFinite(n) ? n : 0); }}
      />
      {hint && <div className="mt-1.5 text-[10.5px] text-text-subtle">{hint}</div>}
    </div>
  );
}

type QFilter = "all" | "review" | "approved" | "flagged";

const PER_PAGE = 20;
type QSort = "score" | "age" | "status" | "title";
type SortDir = "asc" | "desc";

/**
 * ⭐ THE HAND-ROLLED PAGER AND SORT BUTTON ARE GONE (stage 9b, 2026-08-21).
 *
 * Both were verbatim forks — the pager of `ui/pagination.tsx`, the sort button
 * of moderation's copy of the same twelve lines — and the pager's own comment
 * said the three "must stay one size" while nothing in the build could make them.
 * They had already diverged: the shared pager has since gained `flex-wrap` on
 * both rows (at 360px seven 44px controls need two) and `shadow-glow-selected`
 * on the current page, the console's standing selected-control signal.
 *
 * The glow is the ONE resting-pixel difference the migration makes, and the fork
 * was the outlier — every other paginated screen already has it. `onNavigate` is
 * the shared pager's client mode, built for a queue like this one that pages in
 * local state because it owns interactive filter/selection.
 */

/**
 * ⛔ E-27. `/admin/proposals` is a `trading` route, but two of its controls demand other
 * domains — `saveProposalsConfig` is `accounting` (prize economics) and `approveProposal`
 * is `growth` (it credits a real bonus). `DEFAULT_GRANTS` makes all three disjoint, so a
 * MODERATOR could see both controls armed and neither could ever work. The page is told
 * the answer by its server component and renders a locked state instead.
 */
export function AdminProposalsClient({ config, queue, canSaveConfig, canApprove, needSaveConfig, needApprove }: {
  config: ProposalsConfig;
  queue: AdminQueueRow[];
  canSaveConfig: boolean;
  canApprove: boolean;
  /** `CONTROL_DOMAIN[...]`, passed in — a CLIENT component importing `control-gates`
   *  would drag `rbac` (and prisma + node:crypto) into the browser bundle. */
  needSaveConfig: string;
  needApprove: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useT();
  const overlay = useActionOverlay();
  const [pending, start] = useTransition();
  const [c, setC] = useState<ProposalsConfig>(config);
  const [qFilter, setQFilter] = useState<QFilter>("all");
  const [sort, setSort] = useState<QSort>("score");
  const [dir, setDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selId, setSelId] = useState<string | null>(queue[0]?.id ?? null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [note, setNote] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  // Officer edit mode — full control over the proposal's content.
  const [editing, setEditing] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [eTitleSw, setETitleSw] = useState("");
  const [eTitleZh, setETitleZh] = useState("");
  const [eCriterion, setECriterion] = useState("");
  const [eCategory, setECategory] = useState<ProposalCategory>("sports");
  const [eResDate, setEResDate] = useState("");
  const [eCloseDate, setECloseDate] = useState("");
  const [eSource, setESource] = useState("");

  const [search, setSearch] = useState("");

  const meta = STATE_META[c.state];
  const HeaderIcon = meta.icon;

  // Search (live, on every keystroke) → filter → sort → only the current page is
  // ever materialised in the DOM.
  const filteredQueue = useMemo(() => {
    // `allowRegex` because the SearchBox below advertises it — see test:search-adoption §5.
    const parsedSearch = parseQuery(search, { allowRegex: true, fields: fieldNames(PROPOSAL_SEARCH) });
    return queue.filter((q) => {
      const passFilter =
        qFilter === "all" ? true
        : qFilter === "review" ? (q.status === "REVIEW" || q.status === "CHANGES_REQUESTED")
        : qFilter === "approved" ? q.status === "APPROVED"
        : (q.score < 0 || (q.down > 0 && q.down >= q.up));
      if (!passFilter) return false;
      // Shared grammar (src/lib/search) — was a single contiguous `.includes()`.
      return matchesQuery(parsedSearch, q as unknown as Record<string, string | null | undefined>, PROPOSAL_SEARCH);
    });
  }, [queue, qFilter, search]);
  const sortedQueue = useMemo(() => {
    const acc: Record<QSort, (q: AdminQueueRow) => string | number> = {
      score: (q) => q.score,
      age: (q) => q.ageIso,
      status: (q) => q.status,
      title: (q) => q.title.toLowerCase(),
    };
    const f = acc[sort];
    const out = [...filteredQueue].sort((a, b) => {
      const av = f(a), bv = f(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [filteredQueue, sort, dir]);
  const totalQueue = sortedQueue.length;
  const safePage = Math.min(Math.max(1, page), Math.max(1, Math.ceil(totalQueue / PER_PAGE)));
  const shownQueue = useMemo(() => sortedQueue.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE), [sortedQueue, safePage]);

  // Reset to page 1 whenever the search, filter, or sort changes.
  useEffect(() => { setPage(1); }, [qFilter, sort, dir, search]);

  const sel = queue.find((q) => q.id === selId) ?? shownQueue[0] ?? null;

  // Pre-fill the go-live source field with the proposer's submitted source URL
  // whenever the selected proposal changes (officer can edit before publishing).
  useEffect(() => { setSourceUrl(sel?.sourceUrl ?? ""); }, [sel?.id, sel?.sourceUrl]);

  const onSort = (f: QSort) => {
    if (f === sort) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSort(f); setDir("desc"); }
  };

  const refresh = () => router.refresh();
  // Note: sourceUrl is owned by the selection effect (pre-filled from the
  // proposal), NOT cleared here — so it survives an approve→go-live transition
  // on the same proposal (the row stays selected after refresh).
  const resetReview = () => { setDeclining(false); setReason(null); setNote(""); setEditing(false); };

  const openEdit = () => { if (!sel) return;
    setETitle(sel.title); setETitleSw(sel.titleSw ?? ""); setETitleZh(sel.titleZh ?? ""); setECriterion(sel.resolutionCriterion);
    setECategory(sel.category); setEResDate(sel.resolutionDate); setECloseDate(sel.selectionCloseDate ?? "");
    setESource(sel.sourceUrl ?? ""); setDeclining(false); setEditing(true);
  };

  // Client-side validity gate for the edit panel — mirrors the proposer form so an
  // officer can't submit an obviously-invalid edit (server re-validates regardless).
  const editValid = eTitle.trim().length >= 8 && eTitle.trim().length <= 120
    && eCriterion.trim().length >= 12
    && /^\d{4}-\d{2}-\d{2}$/.test(eResDate)
    && (!eCloseDate || (/^\d{4}-\d{2}-\d{2}$/.test(eCloseDate) && eCloseDate < eResDate))
    && (!eSource.trim() || isValidHttpUrl(eSource));

  const saveEdit = () => { if (!sel || !editValid) return;
    overlay.run("Saving edit…", "Updating the proposal.");
    start(async () => {
      try {
        const r = await editProposalAction(sel.id, {
          titleEn: eTitle, titleSw: eTitleSw.trim() || null, titleZh: eTitleZh.trim() || null,
          resolutionCriterion: eCriterion, category: eCategory, resolutionDate: eResDate,
          selectionCloseDate: eCloseDate || null,
          // Only send source when non-empty — a blank field means "leave unchanged",
          // never "clear it" (a market's resolution source is required).
          sourceUrl: eSource.trim() ? eSource.trim() : undefined,
        });
        if (r.ok) { overlay.succeed("Saved", "Proposal updated."); setEditing(false); refresh(); }
        else overlay.fail("Couldn't save", r.error);
      } catch { overlay.fail("Couldn't save", "Server error — please try again."); }
    });
  };

  const saveConfig = () => start(async () => {
    // Wrap like every sibling mutation (saveEdit/approve/decline) — a thrown or
    // network error here was previously uncaught, leaving the officer with no feedback.
    try {
      const r = await saveProposalsConfigAction(c);
      if (r.ok) { toast({ title: "Proposals config saved · Imehifadhiwa", variant: "success" }); refresh(); }
      else toast({ title: "Couldn't save", description: r.error, variant: "danger" });
    } catch { toast({ title: "Couldn't save", description: "Server error — please try again.", variant: "danger" }); }
  });

  const approve = () => { if (!sel) return;
    overlay.run("Approving & paying bonus…", "Crediting the proposer's bonus wallet.");
    start(async () => {
      try {
        const r = await approveProposalAction(sel.id);
        if (r.ok) { overlay.succeed("Approved · bonus paid", r.grantedTzs > 0 ? `${formatTzs(r.grantedTzs)} credited to the proposer's bonus wallet.` : "Proposer notified. Publish it live when ready."); resetReview(); refresh(); }
        else overlay.fail("Couldn't approve", r.error);
      } catch { overlay.fail("Couldn't approve", "Server error — please try again."); }
    });
  };

  const goLive = () => { if (!sel) return;
    if (!sourceUrl.trim()) { toast({ title: "Source URL required", description: "Confirm the trusted source URL before publishing.", variant: "danger" }); return; }
    overlay.run("Publishing live…", "Creating a live market from this proposal.");
    start(async () => {
      try {
        const r = await goLiveProposalAction(sel.id, sourceUrl.trim());
        if (r.ok) { overlay.succeed("Published live", `Market ${r.marketId} created.`); resetReview(); refresh(); }
        else overlay.fail("Couldn't publish", r.error);
      } catch { overlay.fail("Couldn't publish", "Server error — please try again."); }
    });
  };

  const sendBack = () => { if (!sel) return;
    overlay.run("Requesting changes…", "Sending note to the proposer.");
    start(async () => {
      try {
        const r = await requestChangesAction(sel.id, note);
        if (r.ok) { overlay.succeed("Changes requested", "Proposer will be notified."); resetReview(); refresh(); }
        else overlay.fail("Couldn't send back", r.error);
      } catch { overlay.fail("Couldn't send back", "Server error — please try again."); }
    });
  };

  const decline = () => { if (!sel || !reason) return;
    overlay.run("Declining proposal…", `Reason: ${reason}`);
    start(async () => {
      try {
        const r = await declineProposalAction(sel.id, reason, note);
        if (r.ok) { overlay.succeed(`Declined · ${reason}`, "Proposer will be notified."); resetReview(); refresh(); }
        else overlay.fail("Couldn't decline", r.error);
      } catch { overlay.fail("Couldn't decline", "Server error — please try again."); }
    });
  };

  const open = sel && (sel.status === "REVIEW" || sel.status === "CHANGES_REQUESTED");
  const approved = sel && sel.status === "APPROVED";

  return (
    <div className="space-y-4">
      {/* Queue + review */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="overflow-hidden rounded-lg glass-panel">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="text-[14px] font-bold">Queue · sorted by votes</div>
            <div className="flex items-center gap-1.5 flex-wrap gap-y-1.5">
              {(["all", "review", "approved", "flagged"] as QFilter[]).map((f) => (
                <button key={f} onClick={() => setQFilter(f)} className="rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold capitalize transition-colors"
                  style={qFilter === f ? { borderColor: "color-mix(in oklab, var(--brand-500) 40%, transparent)", background: "color-mix(in oklab, var(--brand-500) 14%, transparent)", color: "var(--brand-200)" } : { borderColor: "var(--border)", color: "var(--text-muted)" }}>{f}</button>
              ))}
              {/* ⛔ NO SIZE OVERRIDE. This carried `!h-7 !w-7` to bandage a `variant="icon"`
                  that shipped at 80×80 (`h-10 w-10` on the overridden scale). The atom now
                  writes its own 40×40 literal, so the bandage is dead weight — and an
                  `!important` scale token is exactly the trap that caused the defect. */}
              <RefreshButton variant="icon" />
            </div>
          </div>
          <div className="border-b border-border px-4 py-2.5">
            {/* One SearchBox. `controlled` — this list is already in memory and
                sorted/paged client-side, so a URL round-trip would buy nothing. */}
            <SearchBox
              mode="controlled"
              value={search}
              onChange={setSearch}
              placeholder={t.common.searchProposals}
              ariaLabel={t.common.searchProposals}
              helpFields={fieldNames(PROPOSAL_SEARCH)}
            allowRegex
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-border px-4 py-2">
            <Cap>Sort</Cap>
            <SortBtn field="score" label="Votes" current={sort} dir={dir} onSort={onSort} />
            <SortBtn field="age" label="Age" current={sort} dir={dir} onSort={onSort} />
            <SortBtn field="status" label="Status" current={sort} dir={dir} onSort={onSort} />
            <SortBtn field="title" label="Title" current={sort} dir={dir} onSort={onSort} />
          </div>
          {totalQueue === 0 ? (
            <div className="px-4 py-10 text-center text-[12.5px] text-text-subtle">{search.trim() ? "No proposals match your search." : "No proposals in this view yet."}</div>
          ) : shownQueue.map((q, i) => {
            const active = q.id === sel?.id;
            return (
              <button key={q.id} onClick={() => { setSelId(q.id); resetReview(); }} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ borderBottom: i < shownQueue.length - 1 ? "1px solid var(--border)" : "none", borderLeft: "3px solid " + (active ? "var(--brand-500)" : "transparent"), background: active ? "color-mix(in oklab, var(--brand-500) 8%, transparent)" : "transparent" }}>
                <div className="flex w-[42px] shrink-0 flex-col items-center font-mono">
                  <span className="text-[14px] font-bold" style={{ color: q.score >= 0 ? "var(--text)" : "var(--claret-300)" }}>{q.score}</span>
                  <span className="text-[9px] text-text-subtle">net</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text">{q.title}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-text-subtle">{CATEGORY_LABEL[q.category]} · {q.proposerMasked}</div>
                </div>
                <StatusBadge status={q.status} />
              </button>
            );
          })}
          <AdminPagination total={totalQueue} page={safePage} perPage={PER_PAGE} onNavigate={setPage} />
        </div>

        {/* Review panel */}
        {sel ? (
          <div className="flex flex-col gap-3.5 rounded-lg glass-panel p-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={sel.status} />
                <Chip variant="neutral"><CategoryIcon category={sel.category} />{CATEGORY_LABEL[sel.category]}</Chip>
                <span className="ml-auto font-mono text-[11px] text-text-subtle">by {sel.proposerMasked}</span>
              </div>
              <div className="font-display text-[17px] font-bold leading-snug">{sel.title}</div>
              {sel.titleSw && <div className="mt-0.5 font-display italic text-text-subtle text-[12px]">{sel.titleSw}</div>}
            </div>

            <div>
              <Cap>Resolution criterion</Cap>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{sel.resolutionCriterion}</p>
              <p className="mt-1 font-mono text-[10.5px] text-text-subtle">selection closes {sel.selectionCloseDate ?? "at resolution"} · resolves {sel.resolutionDate}</p>
              {sel.sourceUrl && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px]">
                  <I.link s={12} className="shrink-0 text-text-subtle" />
                  <a href={sel.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-royal-200 hover:underline" title={sel.sourceUrl}>{sel.sourceUrl}</a>
                </p>
              )}
              {sel.bonusGrantedTzs > 0 && (
                <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10.5px] text-text"><I.coins s={12} />bonus paid · {formatTzs(sel.bonusGrantedTzs)}</p>
              )}
            </div>

            {/* Vote stats — rank only */}
            <div className="flex gap-2.5">
              {[["Upvotes", sel.up, "var(--text)", I.chevronUp], ["Downvotes", sel.down, "var(--claret-300)", I.chevronDown], ["Score", sel.score, "var(--text)", I.fileText]].map(([l, v, col, Ic]) => {
                const Icon = Ic as (typeof I)[keyof typeof I];
                return (
                  <div key={l as string} className="flex-1 rounded-md bg-bg-overlay p-3">
                    <div className="flex items-center gap-1"><Cap><span className="inline-flex items-center gap-1"><Icon size={11} />{l as string}</span></Cap></div>
                    <div className="mt-1 font-mono text-[19px] font-bold" style={{ color: col as string }}>{v as number}</div>
                  </div>
                );
              })}
            </div>
            <p className="flex items-center gap-1.5 text-[11.5px] text-text-subtle"><I.info s={13} />Votes only rank the queue — the officer makes the final call.</p>

            <div className="h-px bg-border" />

            {editing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-[13px] font-bold"><I.edit s={14} />Edit proposal · full control</div>
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-text">Title (EN)</div>
                  <Input value={eTitle} onChange={(e) => setETitle(e.target.value)} size="sm" maxLength={120} />
                </div>
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-text">Title (SW)</div>
                  <Input value={eTitleSw} onChange={(e) => setETitleSw(e.target.value)} size="sm" maxLength={120} />
                </div>
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-text">Title (ZH)</div>
                  <Input value={eTitleZh} onChange={(e) => setETitleZh(e.target.value)} size="sm" maxLength={120} />
                </div>
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-text">Resolution criterion</div>
                  <Textarea value={eCriterion} onChange={(e) => setECriterion(e.target.value)} maxLength={500} rows={3} />
                </div>
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-text">Category</div>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((ct) => (
                      <button key={ct} type="button" onClick={() => setECategory(ct)} className="inline-flex h-[30px] items-center gap-1.5 rounded-pill border px-3 text-[12px] font-semibold transition-colors"
                        style={eCategory === ct ? { borderColor: "color-mix(in oklab, var(--brand-500) 40%, transparent)", background: "color-mix(in oklab, var(--brand-500) 14%, transparent)", color: "var(--brand-200)" } : { borderColor: "var(--border)", color: "var(--text-muted)" }}>
                        <CategoryIcon category={ct} size={13} />{CATEGORY_LABEL[ct]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div className="mb-1.5 text-[12px] font-semibold text-text">{SELECTION.selectionCloses.en}</div>
                    <DateSelect value={eCloseDate} onChange={setECloseDate} min={TODAY()} max={eResDate || MAX_DATE()} />
                  </div>
                  <div>
                    <div className="mb-1.5 text-[12px] font-semibold text-text">Resolution date</div>
                    <DateSelect value={eResDate} onChange={setEResDate} min={TODAY()} max={MAX_DATE()} />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-text">Source URL</div>
                  <Input value={eSource} onChange={(e) => setESource(e.target.value)} placeholder="https://..." mono size="sm" />
                </div>
                {!editValid && (
                  <p className="text-[10.5px] text-no-300">Check the fields: title 8–120 chars, criterion ≥ 12, a resolution date, selection close before it, and a valid source URL.</p>
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" size="md" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button variant="primary" size="md" fullWidth disabled={!editValid} loading={pending} leading={<I.check size={15} />} onClick={saveEdit}>Save changes</Button>
                </div>
              </div>
            ) : approved ? (
              <div className="space-y-2.5">
                <div className="rounded-md border p-2.5" style={{ borderColor: "color-mix(in oklab, var(--brand-500) 30%, var(--border))", background: "color-mix(in oklab, var(--brand-500) 7%, transparent)" }}>
                  <p className="flex items-center gap-1.5 text-[11.5px] text-text"><I.checkCircle s={13} />Approved &amp; bonus paid. Publish it live to open the market — no further reward is granted.</p>
                </div>
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-text">Source URL · Chanzo</div>
                  <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://... (trusted source for resolution)" mono size="sm" />
                  <p className="mt-1 text-[10.5px] text-text-subtle">Pre-filled from the proposal · must be on the approved source registry.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ConfirmDialog
                    tone="claret"
                    title="Publish live market · Orodhesha"
                    body="Publish this proposal as a LIVE market? Players can immediately bet real money on it. It can only be reversed by an emergency void (which refunds every stake) — it cannot be un-published."
                    confirmLabel="Yes, publish live"
                    onConfirm={goLive}
                    trigger={<Button variant="primary" size="md" loading={pending} leading={<I.arrowRight size={15} />}>Publish live · Orodhesha</Button>}
                  />
                  <Button variant="ghost" size="md" leading={<I.edit s={15} />} onClick={openEdit}>Edit</Button>
                </div>
                <p className="text-[10.5px] text-text-subtle">You decide when it goes to market — publishing is a deliberate step, separate from approval.</p>
              </div>
            ) : !open ? (
              // §L3 — an enum used to be interpolated straight into this sentence
              // (`{sel.status.toLowerCase().replace("_", " ")}`), and its `replace` was
              // missing the `/g` flag, so a two-underscore state would have kept the
              // second one. Deleting the interpolation deletes both defects: a status is
              // storage, and what the officer needs here is the CONSEQUENCE — "listed"
              // said nothing, "live as a market and taking predictions" is the fact.
              <p className="text-[12.5px] text-text-muted">{terminalNote(sel.status)}</p>
            ) : !declining ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap gap-2">
                  {/* ⛔ E-27: approving credits a real bonus, so the action is `growth`
                      while this page is `trading`. Ask, don't offer-and-bounce. */}
                  {canApprove ? (
                  <ConfirmDialog
                    tone="warning"
                    title="Approve & pay bonus · Kubali"
                    body="Approve this proposal? This immediately credits the proposer's bonus wallet (real bonus liability). Publishing the market is a separate step afterwards."
                    confirmLabel="Yes, approve & pay"
                    onConfirm={approve}
                    trigger={<Button variant="primary" size="md" loading={pending} leading={<I.checkCircle size={15} />}>Approve &amp; pay bonus · Kubali</Button>}
                  />
                  ) : (
                    <ControlLocked what="Approve &amp; pay bonus" need={needApprove} />
                  )}
                  <Button variant="ghost" size="md" leading={<I.edit s={15} />} onClick={openEdit}>Edit</Button>
                  <Button variant="ghost" size="md" loading={pending} leading={<I.fileText s={15} />} onClick={sendBack}>Request changes</Button>
                  <Button variant="ghost" size="md" leading={<I.xCircle size={15} />} onClick={() => setDeclining(true)} className="!text-claret-300">Decline</Button>
                </div>
                <p className="text-[10.5px] text-text-subtle">Approving instantly credits the proposer&apos;s bonus wallet. Publishing the market is a separate step afterwards.</p>
              </div>
            ) : (
              <div>
                <div className="mb-2 text-[12.5px] font-semibold">Decline reason · Sababu</div>
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {DECLINE_REASONS.map((r) => (
                    <button key={r} onClick={() => setReason(r)} className="rounded-pill border px-3 py-1 text-[12px] font-semibold transition-colors"
                      style={reason === r ? { borderColor: "color-mix(in oklab, var(--claret-500) 44%, transparent)", background: "color-mix(in oklab, var(--claret-500) 16%, transparent)", color: "var(--claret-300)" } : { borderColor: "var(--border)", color: "var(--text-muted)" }}>{r}</button>
                  ))}
                </div>
                <div className="mb-3"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to the proposer (logged) · Ujumbe" rows={2} /></div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="md" onClick={resetReview}>Cancel</Button>
                  <Button variant="danger" size="md" fullWidth disabled={!reason} loading={pending} onClick={decline}>Confirm decline{reason ? ` · ${reason}` : ""}</Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-bg-elevated/40 p-10 text-center text-[13px] text-text-subtle">Select a proposal to review.</div>
        )}
      </div>

      {/* Config — 4-state feature machine + economics */}
      <div className="overflow-hidden rounded-lg glass-panel">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:gap-3.5" style={{ background: meta.selBg }}>
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            {/* ⚠️ LITERALS, not `h-10 w-10` — spacing is overridden (tailwind.config.ts:200-215)
                so `h-10` was 80px, while the sibling `rounded-[10px]` was already written for a
                40px tile. Size and radius now agree. */}
            <span className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[10px]" style={{ background: "color-mix(in oklab, var(--bg-base) 45%, transparent)", color: meta.fg, border: `1px solid ${meta.selBorder}` }}>
              <HeaderIcon s={21} />
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-bold">Proposals feature · state</div>
              <div className="mt-0.5 text-[12px] text-text-muted">Controls what players see and can do — applies immediately on Save.</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
            <span className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: meta.fg }}>{meta.label}</span>
            {canSaveConfig
              ? <Button variant="primary" size="sm" leading={<I.check s={14} />} loading={pending} onClick={saveConfig}>Save</Button>
              : <ControlLocked what="Save prize config" need={needSaveConfig} />}
          </div>
        </div>

        {/* Segmented state selector — takes effect immediately (no redeploy),
            audited as proposals.config.updated on Save. */}
        <div className="border-b border-border px-4 py-4">
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Cap>Feature state</Cap>
            <span className="font-mono text-[10px] text-text-subtle">· applies immediately on Save · no redeploy</span>
          </div>
          <div role="radiogroup" aria-label="Proposals feature state" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATE_ORDER.map((s) => {
              const m = STATE_META[s];
              const sel = c.state === s;
              const Ico = m.icon;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setC((p) => ({ ...p, state: s }))}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors"
                  style={sel ? { borderColor: m.selBorder, background: m.selBg } : { borderColor: "var(--border)", background: "var(--bg-overlay)" }}
                >
                  <span className="shrink-0" style={{ color: sel ? m.fg : "var(--text-subtle)" }}><Ico s={16} /></span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold leading-tight" style={{ color: sel ? "var(--text)" : "var(--text-muted)" }}>{m.label}</span>
                    <span className="block truncate font-mono text-[10px] leading-tight text-text-subtle">{m.sw}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-text-subtle"><I.info s={13} className="mt-px shrink-0" />{meta.note}</p>
        </div>

        <div className="flex flex-wrap gap-5 p-4">
          <CField label="Approval bonus" hint="Bonus paid to the proposer on approval" prefix="TZS" width={200} value={c.prizeTzs} onChange={(n) => setC((p) => ({ ...p, prizeTzs: n }))} />
          <CField label="“Hot” vote threshold" hint="Net votes to flag as Hot" suffix="votes" width={180} value={c.hotThreshold} onChange={(n) => setC((p) => ({ ...p, hotThreshold: n }))} />
          <CField label="Rate limit" hint="Max open proposals per player" suffix="open" width={180} value={c.rateLimit} onChange={(n) => setC((p) => ({ ...p, rateLimit: n }))} />
        </div>
      </div>
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}
