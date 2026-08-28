"use client";

/**
 * THE BULK BAR — select all, or tick the ones you want, and seal them in one action.
 *
 * Ali, 2026-08-28: *"an auto-resolve button on top of this resolver queue page. It confirms
 * all of them and resolves all of them. Plus a checkbox functionality — if admin wants to
 * resolve only a couple of them using the button, he checks each poll as much as he wants
 * and auto-resolves them."*
 *
 * ⛔ IT NAMES THE MONEY BEFORE IT MOVES IT. The confirmation lists every selected market,
 * the outcome that will be sealed, the confidence behind it, the reason the platform's own
 * floor refused it where it did, and the player money held on it — with a total. A bare
 * *"Resolve 12 markets?"* over TZS 600,000 of other people's stakes is not consent.
 *
 * ⛔ AND IT NEVER REPORTS A MIXED BATCH AS A SUCCESS. Five buckets come back and all five
 * are shown. Partial success is the normal case here, not the error case.
 *
 * ⚠️ `useMayAct` IS READ AS A HOOK AT THE TOP AND ACTED ON BELOW EVERY OTHER HOOK. It is
 * live — revoking an ACT grant mid-session flips it on the next `router.refresh()` — and an
 * early `return` above the other hooks would render fewer hooks than the previous pass and
 * crash the page. This bar also *selects*, which is useful to a read-only officer, so it
 * disables the submit rather than removing itself.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { I } from "@/components/ui/glyphs";
import { BrandSpinner } from "@/components/brand";
import { useDeferredToast } from "@/components/ui/toast";
import { useMayAct } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { formatTzs } from "@/lib/utils";
import { BULK_BAR } from "@/lib/admin-status-lexicon";
import { useBulkSelection } from "./bulk-selection";
import { BULK_REASON } from "./bulk-verdict-copy";
import { bulkResolveMarketsAction } from "./bulk-resolve-action";
import type { BulkRow, BulkResolveResult } from "./bulk-resolve-types";

const MIN_REASON = 12;

export function BulkResolveBar({
  rows,
  totalPending,
  requireTwoOfficer,
  canOverride,
  objectionWindowHours,
}: {
  /** The rows on THIS page, in render order. */
  rows: BulkRow[];
  /** How many markets are in the whole filtered queue — used to state, in words, how many
   *  are NOT covered by a "select all" on this page. */
  totalPending: number;
  requireTwoOfficer: boolean;
  canOverride: boolean;
  /** ⛔ THE CONFIRMATION MUST NOT PROMISE A DELAY THE CONFIG DOES NOT GIVE. 0 is a legal
   *  setting (0–168h), and at 0 the settle timer fires on the next macrotask and pays every
   *  winner within milliseconds of the click — so "No money moves yet" would be false over a
   *  listed total of player money for up to twenty markets. Read from the effective config,
   *  never assumed. */
  objectionWindowHours: number;
}) {
  const mayAct = useMayAct();
  const { selected, setAll, clear, overrides, someOn, allOn } = useBulkSelection();
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [result, setResult] = React.useState<BulkResolveResult | null>(null);
  const router = useRouter();
  const { toast, deferToast } = useDeferredToast(pending);

  const chosen = rows.filter((r) => selected.has(r.marketId));
  const pool = chosen.reduce((s, r) => s + r.pool, 0);
  const blocked = chosen.filter((r) => !r.verdict.eligible);
  const overridden = blocked.filter((r) => r.verdict.overridable && (overrides.get(r.marketId) ?? "").trim().length >= MIN_REASON);
  const willSkip = blocked.filter((r) => !overridden.includes(r));
  const willSeal = chosen.filter((r) => r.verdict.eligible).concat(overridden);
  const offPage = Math.max(0, totalPending - rows.length);

  // An override that is present but too short is a HALF-TYPED intention, not an absence.
  // Blocking on it here — rather than letting the server refuse the whole batch — is the
  // difference between "finish this sentence" and "your 12-market batch did nothing".
  const shortReason = blocked.find(
    (r) => r.verdict.overridable && (overrides.get(r.marketId) ?? "").trim().length > 0
      && (overrides.get(r.marketId) ?? "").trim().length < MIN_REASON,
  );

  const submit = () => {
    startTransition(async () => {
      const fd = new FormData();
      for (const r of chosen) fd.append("marketIds", r.marketId);
      for (const r of overridden) fd.set(`override:${r.marketId}`, (overrides.get(r.marketId) ?? "").trim());
      const res = await runAdminAction(() => bulkResolveMarketsAction(fd));
      if (!res.ok) {
        toast({ title: "Bulk resolve failed", description: res.error, variant: "danger" });
        setResult({ ok: false, error: res.error });
        return;
      }
      const r = res;
      setResult(r);
      clear();
      // ⛔ THE HEADLINE COUNTS EVERY BUCKET. "12 resolved" over a batch where 4 were
      // skipped is the same false statement the result panel exists to prevent.
      const parts = [
        r.resolved.length ? `${r.resolved.length} sealed` : "",
        r.staged.length ? `${r.staged.length} staged` : "",
        r.alreadyApplied.length ? `${r.alreadyApplied.length} already done` : "",
        r.skipped.length ? `${r.skipped.length} skipped` : "",
        r.failed.length ? `${r.failed.length} failed` : "",
      ].filter(Boolean);
      deferToast({
        title: `Batch complete · ${r.attempted} attempted`,
        description: parts.join(" · ") || "Nothing changed.",
        variant: r.failed.length ? "danger" : r.resolved.length || r.staged.length ? "success" : "warning",
      });
      router.refresh();
    });
  };

  const verb = requireTwoOfficer ? BULK_BAR.stageSelected.en : BULK_BAR.resolveSelected.en;
  // ⛔ GATED ON `willSeal`, NOT ON `chosen`. Ticking twenty rows the floor refuses is a
  // perfectly ordinary thing to do while reading the queue — and with the gate on `chosen`
  // the button stayed armed and opened a dialog headed "Seal 0 markets?" over an empty list
  // and a total of zero. The confirmation already keys off `willSeal`; this makes the
  // button agree with it.
  const disabled = !mayAct || pending || willSeal.length === 0 || !!shortReason;

  return (
    <>
      <div data-bulk-bar className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div onKeyDownCapture={() => { /* header has no range semantics */ }}>
          <Checkbox
            checked={allOn}
            indeterminate={someOn}
            onChange={(next) => setAll(next)}
            className="min-h-[44px] min-w-[44px] justify-center"
            ariaLabel={`${BULK_BAR.selectAllOnPage.en} (${rows.length} markets)`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-caption uppercase tracking-widest text-text-muted">
            {chosen.length > 0
              ? <>{chosen.length} {BULK_BAR.nSelected.en}<span className="text-border"> · </span><span className="text-text">{formatTzs(pool)} held</span></>
              : <>{BULK_BAR.selectAllOnPage.en} — {rows.length} on this page</>}
          </p>
          {/* ⛔ THE SCOPE IS STATED, ALWAYS. A "select all" that quietly means "this page
              only" is a money defect the moment the queue outgrows one page: the officer
              believes the backlog is cleared and the rest are still holding stakes. */}
          <p className="font-mono text-micro text-text-subtle">
            {BULK_BAR.selectionPageOnly.en}
            {offPage > 0 && <> — {offPage} more {offPage === 1 ? "market is" : "markets are"} on other pages and not selected</>}
          </p>
        </div>

        {chosen.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {willSeal.length > 0 && <Chip size="sm" variant="success">{willSeal.length} will seal</Chip>}
            {willSkip.length > 0 && <Chip size="sm" variant="warning">{willSkip.length} will skip</Chip>}
            {overridden.length > 0 && <Chip size="sm" variant="danger">{overridden.length} overridden</Chip>}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* ⛔ THE KIT BUTTON, not a `<button className="btn …">`. The class string works and
              is exactly how a second button vocabulary starts: `test:ui-consistency` calls
              it `raw-button-btn-class` and its baseline may only shrink. */}
          {chosen.length > 0 && (
            <Button variant="ghost" size="md" onClick={clear} disabled={pending}>
              {BULK_BAR.clear.en}
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={() => setConfirmOpen(true)}
            disabled={disabled}
            leading={pending ? <BrandSpinner size={16} /> : <I.listChecks s={14} />}
            title={
              !mayAct ? "Your role can view this queue but not act on it."
              : shortReason ? `An override reason must be at least ${MIN_REASON} characters.`
              : chosen.length === 0 ? BULK_BAR.nothingSelected.en
              : undefined
            }
          >
            {pending ? "Working…" : `${verb}${chosen.length ? ` (${chosen.length})` : ""}`}
          </Button>
        </div>
      </div>

      {shortReason && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-caption text-warning">
          <I.alertCircle s={12} />
          {BULK_BAR.overrideNeeded.en} — at least {MIN_REASON} characters on “{shortReason.title.slice(0, 48)}”.
        </p>
      )}
      {!canOverride && blocked.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-caption text-text-subtle">
          <I.lock s={12} />
          {BULK_BAR.overrideLocked.en} — {blocked.length} refused {blocked.length === 1 ? "market" : "markets"} will be skipped.
        </p>
      )}

      {result && <BulkResultPanel result={result} onDismiss={() => setResult(null)} />}

      <BulkConfirm
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); submit(); }}
        willSeal={willSeal}
        willSkip={willSkip}
        overridden={overridden}
        requireTwoOfficer={requireTwoOfficer}
        objectionWindowHours={objectionWindowHours}
      />
    </>
  );
}

/**
 * THE CONFIRMATION. ⛔ It names every market, its outcome, its confidence, the reason it
 * was refused where it was, and the money held on it — with a total. `tier="hard"` with a
 * typed word ONLY when an override is in the batch: a typed gate on every routine
 * confirmation is how a typed gate stops being read.
 */
function BulkConfirm({
  open, onCancel, onConfirm, willSeal, willSkip, overridden, requireTwoOfficer, objectionWindowHours,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  willSeal: BulkRow[];
  willSkip: BulkRow[];
  overridden: BulkRow[];
  requireTwoOfficer: boolean;
  objectionWindowHours: number;
}) {
  const total = willSeal.reduce((s, r) => s + r.pool, 0);
  const hasOverride = overridden.length > 0;
  const verb = requireTwoOfficer ? "Stage" : "Seal";

  return (
    <ConfirmModal
      open={open}
      onClose={onCancel}
      onConfirm={onConfirm}
      tone="claret"
      size="lg"
      maxWidth={620}
      tier={hasOverride ? "hard" : "medium"}
      typedWord={hasOverride ? "RESOLVE" : undefined}
      eyebrow={requireTwoOfficer ? "Two-admin · Stage 1" : "Irreversible · Hatua ya mwisho"}
      title={`${verb} ${willSeal.length} ${willSeal.length === 1 ? "market" : "markets"}?`}
      confirmLabel={`Yes, ${verb.toLowerCase()} ${willSeal.length}`}
      cancelLabel="Not yet · Bado"
      body={
        <div className="space-y-3">
          <p>
            {requireTwoOfficer ? (
              <><strong>This stages a verdict on each market below.</strong> A DIFFERENT officer
              must confirm each one before anything is sealed, and no money moves until then.</>
            ) : objectionWindowHours > 0 ? (
              <><strong>This seals the verdict on each market below.</strong> No money moves yet —
              winners are paid automatically once each {objectionWindowHours}-hour objection
              window closes with nothing standing, and an upheld objection can still change it
              until then.</>
            ) : (
              /* The objection window is configured to 0h, so there is no window: the settle
                 timer fires immediately and every winner is paid. Saying "no money moves yet"
                 here would be a false statement over a listed total of player money. */
              <><strong>This seals the verdict AND PAYS, immediately.</strong> The objection window
              is configured to 0 hours, so there is no window to object in — winners are credited
              as soon as each market is sealed, and nothing can change it afterwards.</>
            )}
          </p>

          {hasOverride && (
            <p className="rounded-md border border-claret-700 bg-claret-500/10 px-3 py-2 text-label">
              <strong>{overridden.length} of these were REFUSED by the platform&apos;s own
              auto-resolve floor</strong> and you are sealing them anyway. Your reason, the
              refusal, the site the AI actually read and the site this market approves are all
              recorded against your name.
            </p>
          )}

          {/* ⛔ A LIST, NOT A TABLE, and its own scroll container.
              · A `<table>` here would owe the console's `admin-tbl` chrome (test:ui-consistency
                calls a bare one `table-not-admin-tbl`) — and this is a confirmation list of
                markets, not a data grid an officer sorts or scans by column.
              · The scroll is INSIDE this box. A 20-market list must never make the dialog, or
                the page behind it, scroll sideways at 360. */}
          <ul className="max-h-[38vh] overflow-y-auto rounded-md border border-border">
            {willSeal.map((r) => {
              const ov = overridden.includes(r);
              return (
                <li key={r.marketId} className="flex items-start gap-3 border-b border-border px-3 py-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-label leading-tight text-text">{r.title}</p>
                    {ov && r.verdict.reason && (
                      <p className="mt-0.5 font-mono text-micro text-claret-300">
                        override · {BULK_REASON[r.verdict.reason].label}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-right">
                    <span className={`font-mono text-label font-bold ${r.verdict.outcome === "YES" ? "text-yes-300" : "text-no-300"}`}>
                      {r.verdict.outcome}
                    </span>
                    {r.verdict.confidence != null && (
                      <span className="ml-1.5 font-mono text-micro text-text-subtle">{r.verdict.confidence}%</span>
                    )}
                    <p className="font-mono text-caption text-text-muted">{formatTzs(r.pool)}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="flex items-center justify-between rounded-md border border-border bg-bg-overlay px-3 py-2">
            <span className="font-mono text-micro uppercase tracking-widest text-text-subtle">
              {BULK_BAR.moneyAtStake.en}
            </span>
            <span className="font-mono text-body-sm font-bold text-text">{formatTzs(total)}</span>
          </p>

          {willSkip.length > 0 && (
            <p className="font-mono text-caption text-text-subtle">
              {willSkip.length} further selected {willSkip.length === 1 ? "market is" : "markets are"} refused
              and will be left untouched.
            </p>
          )}
        </div>
      }
    />
  );
}

/** Five buckets, all of them, always. */
function BulkResultPanel({ result, onDismiss }: { result: BulkResolveResult; onDismiss: () => void }) {
  if (!result.ok) {
    return (
      <div className="mt-3 rounded-md border border-claret-700 bg-claret-500/10 px-3 py-2">
        <p className="text-label text-text">{result.error}</p>
        {/* ⛔ A BATCH THAT THREW IS NOT A BATCH THAT DID NOTHING. The shared wrapper's
            message ("nothing may have applied") is written for a single mutation; here the
            loop may have sealed nine markets before the tenth took the process down. Say
            the true thing: check the queue, do not re-press. */}
        <p className="mt-1 font-mono text-micro leading-relaxed text-text-subtle">
          Some markets in this batch may already be sealed. Refresh the queue and read it
          before pressing again — re-running is safe (a sealed market is refused, never
          sealed twice), but the count you see now is not the whole story.
        </p>
        <Button variant="ghost" size="xs" onClick={onDismiss} className="mt-1">Dismiss</Button>
      </div>
    );
  }
  /**
   * ⛔ THE OUTCOME IS ITS OWN FIELD, NEVER INTERPOLATED INTO A SENTENCE. `"YES"` is a stored
   * enum, and this console's own law (`test:labels` §11c) is that an enum never appears
   * inside prose an officer reads — that is how `CASHED_OUT` and `PENDING_REVIEW` reached
   * player and operator screens looking like database columns. It is rendered beside the
   * row, in the side's own colour, exactly as the rest of the console renders a side.
   */
  type ResultRow = { marketId: string; title: string; outcome?: "YES" | "NO"; overridden?: boolean; detail?: string };
  const groups: Array<{ key: string; label: string; tone: string; rows: ResultRow[] }> = [
    { key: "resolved", label: "Sealed", tone: "text-yes-300", rows: result.resolved.map((r) => ({ marketId: r.marketId, title: r.title, outcome: r.outcome, overridden: r.overridden })) },
    { key: "staged", label: "Staged — awaiting a second officer", tone: "text-warning", rows: result.staged.map((r) => ({ marketId: r.marketId, title: r.title, outcome: r.outcome })) },
    { key: "alreadyApplied", label: "Already resolved by someone else", tone: "text-text-muted", rows: result.alreadyApplied.map((r) => ({ marketId: r.marketId, title: r.title, detail: r.detail })) },
    { key: "skipped", label: "Skipped — refused and not overridden", tone: "text-text-subtle", rows: result.skipped.map((r) => ({ marketId: r.marketId, title: r.title, detail: r.reason ? BULK_REASON[r.reason].label : undefined })) },
    { key: "failed", label: "Failed", tone: "text-claret-300", rows: result.failed.map((r) => ({ marketId: r.marketId, title: r.title, detail: r.detail })) },
  ];
  return (
    <div className="mt-3 rounded-md border border-border bg-bg-overlay">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="font-mono text-micro uppercase tracking-widest text-text-subtle">
          Batch {result.batchId.slice(0, 8)} · {result.attempted} attempted
        </p>
        <Button variant="ghost" size="xs" onClick={onDismiss}>Dismiss</Button>
      </div>
      <div className="space-y-2 px-3 py-2">
        {groups.filter((g) => g.rows.length > 0).map((g) => (
          <div key={g.key}>
            <p className={`font-mono text-micro uppercase tracking-widest ${g.tone}`}>{g.rows.length} · {g.label}</p>
            <ul className="mt-0.5 space-y-0.5">
              {g.rows.map((r) => (
                <li key={r.marketId} className="text-label leading-snug text-text-muted">
                  {r.title}
                  {r.outcome && (
                    <span className={`ml-1.5 font-mono text-caption font-bold ${r.outcome === "YES" ? "text-yes-300" : "text-no-300"}`}>
                      {r.outcome}
                    </span>
                  )}
                  {r.overridden && <span className="ml-1.5 font-mono text-micro text-claret-300">overridden</span>}
                  {r.detail && <span className="font-mono text-micro text-text-subtle"> — {r.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {groups.every((g) => g.rows.length === 0) && (
          <p className="text-label text-text-subtle">Nothing changed.</p>
        )}
      </div>
    </div>
  );
}
