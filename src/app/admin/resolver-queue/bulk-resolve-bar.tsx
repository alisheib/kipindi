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
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
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
import { UnsavedChangesGuard, PendingChangesBar } from "@/components/ui/unsaved-changes";
import { useBulkSelection } from "./bulk-selection";
import { BULK_REASON, composeOverrideJustification } from "./bulk-verdict-copy";
import { bulkResolveMarketsAction } from "./bulk-resolve-action";
import type { BulkRow, BulkResolveResult } from "./bulk-resolve-types";

/**
 * ⛔ THERE IS NO `MIN_REASON` HERE ANY MORE, AND THAT IS THE POINT OF THIS CHANGE.
 *
 * Ali's ruling, stated four times: *"if I click autoresolve I'm responsible about it — I
 * have Sentinel saying it's 92% confident, we don't care, just resolve"*. A typed sentence
 * stood between the owner and a batch he had already decided on, and the console never said
 * it would.
 *
 * ⭐ WHAT DID **NOT** CHANGE, deliberately: the server's own `MIN_REASON`, the
 * `bulkResolveOverride` compliance domain, the per-market audit row, and the server's
 * refusal of an override naming a row it did not itself refuse. `bulk-resolve-action.ts` is
 * untouched. The justification is now COMPOSED per row from that row's own verdict
 * (`composeOverrideJustification`) instead of one generic sentence typed once and stood
 * against every market in the batch — strictly more informative than what it replaces, and
 * always far longer than the server's floor.
 */

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
  const { selected, setAll, clear, sharedReason, setSharedReason, someOn, allOn } = useBulkSelection();
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [result, setResult] = React.useState<BulkResolveResult | null>(null);
  const router = useRouter();
  const { toast, deferToast } = useDeferredToast(pending);

  const chosen = rows.filter((r) => selected.has(r.marketId));
  const pool = chosen.reduce((s, r) => s + r.pool, 0);
  const blocked = chosen.filter((r) => !r.verdict.eligible);
  // ⭐ THE ROWS ONE TYPED REASON WOULD COVER — independent of whether it has been typed yet,
  // because this is also what decides whether the field is SHOWN at all.
  const needOverride = blocked.filter((r) => r.verdict.overridable);
  // The officer's OPTIONAL words. It is no longer a precondition for anything — it is
  // appended to each composed justification when they choose to write one.
  const note = sharedReason.trim();
  /**
   * ⛔ GATED ON `canOverride`, AND THAT CLAUSE IS LOAD-BEARING — NOT A TIDY-UP.
   *
   * The old shape got this for free: the reason box only RENDERED under the compliance
   * grant, so an officer without it could never reach the length that populated this list.
   * Dropping the length gate without putting `canOverride` in its place would let a
   * trading-only officer post overrides the server refuses at
   * `bulk-resolve-action.ts`'s `softRequireStaff` — which is asked ONCE for the whole batch,
   * so the WHOLE batch dies, eligible rows included, over rows they never meant to override.
   */
  const overridden = canOverride ? needOverride : [];
  const willSkip = blocked.filter((r) => !overridden.includes(r));
  const willSeal = chosen.filter((r) => r.verdict.eligible).concat(overridden);
  const offPage = Math.max(0, totalPending - rows.length);

  const submit = () => {
    startTransition(async () => {
      const fd = new FormData();
      for (const r of chosen) fd.append("marketIds", r.marketId);
      // ⛔ FANNED OUT OVER `overridden` ONLY — never over `chosen`. The wire format is
      // unchanged (`override:<marketId>`, one entry per overridden market), and the server
      // still refuses an override naming a row it did not refuse. Sending the shared string
      // for every ticked row would put ELIGIBLE market ids into the action's `overrides`
      // map and therefore into the run-boundary audit's `overrides:` key — asserting, in an
      // append-only chain a regulator reads, overrides that never happened.
      // ⭐ COMPOSED PER ROW, from that row's OWN verdict — the outcome, its confidence
      // against the floor THAT MARKET was judged by, every standing refusal (`v.all`, not
      // just the headline), the cited host against the approved one, and the officer's note
      // when they wrote one. One typed sentence could only ever be generic across a batch;
      // this records which site was read on which market.
      // ⚠️ It is PROSE, not evidence: the server re-derives every fact from the market row
      // and never reads this back as truth about the world.
      for (const r of overridden) {
        fd.set(`override:${r.marketId}`, composeOverrideJustification({ ...r.verdict, note }));
      }
      const res = await runAdminAction(() => bulkResolveMarketsAction(fd));
      if (!res.ok) {
        toast({ title: "Bulk resolve failed", description: res.error, variant: "danger" });
        setResult({ ok: false, error: res.error, field: res.field });
        if (res.field) focusFirstInvalid(document.body, [res.field]);
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
  const disabled = !mayAct || pending || willSeal.length === 0;

  return (
    <>
      <div data-bulk-bar data-field="marketIds" className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
          {/* DG-A-14: this line is read, not scanned as a heading — it is either "N selected ·
              TZS X held" or "Select all on this page — N on this page", and the held stake is
              a number an officer acts on. It was wearing a section eyebrow's dress (uppercase
              + widest tracking) at 11px, under the §T4 12.5px reading floor, so the dressing
              is gone and the size is on the smallest legible rung. */}
          <p className="font-mono text-body-sm text-text-muted">
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
            {/* ⛔ AND THAT TURNING THE PAGE DISCARDS IT. The provider clears the set on every
                page change, deliberately — carrying ids across pages would submit rows the
                officer cannot see. But it did so SILENTLY: an officer who ticked twelve
                markets, paged forward to check one detail and came back found the ticks gone
                with nothing having said they would be. Stated only while a selection exists,
                because a warning about losing nothing is noise. */}
            {chosen.length > 0 && <>. Turning the page clears it.</>}
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
              : chosen.length === 0 ? BULK_BAR.nothingSelected.en
              // ⛔ THE ONE STATE THAT HAD NO EXPLANATION — and the one an officer actually
              // hits. Tick twenty rows the citation gate refused, type nothing, and
              // `willSeal` was empty: the button greyed out and every branch above returned
              // `undefined`, so hovering it said nothing at all. A dead control with no
              // tooltip is indistinguishable from a broken page, and it was reported as one.
              // ⭐ THAT STATE NO LONGER EXISTS FOR AN OFFICER WITH THE GRANT — the button is
              // ARMED — so this branch stopped being an excuse and became a statement of
              // what pressing it will do.
              : needOverride.length > 0 && canOverride
                ? `${needOverride.length} of these ${needOverride.length === 1 ? "was" : "were"} refused by the resolver. Sealing ${needOverride.length === 1 ? "it" : "them"} records an override against your name, on each market.`
              : needOverride.length > 0
                ? "Sealing a market the citation gate refused needs compliance access."
                : "None of the selected markets can be sealed — every one is refused for a reason no override can clear."
            }
          >
            {/* ⛔ THE COUNT STAYS ON SCREEN WHILE IT RUNS. "Working…" alone dropped the one
                number the officer needs, on a control that seals markets ONE AT A TIME by
                design (`Promise.all` is the P2024 pool-exhaustion shape) — so a twenty-market
                batch is twenty sequential transactions behind a single static word, and looks
                identical to a hung page.
                ⚠️ It names what is being ATTEMPTED, never a live "3 of 20": one server action
                returns once, so this component has no progress to read, and a counter that
                appeared to tick would be invented. The real per-market breakdown arrives in
                the five-bucket result panel. */}
            {pending
              ? `${verb === BULK_BAR.stageSelected.en ? "Staging" : "Sealing"} ${willSeal.length}… one at a time`
              : `${verb}${chosen.length ? ` (${chosen.length})` : ""}`}
          </Button>
        </div>
      </div>

      {/* ⭐ AN OPTIONAL NOTE, NOT A TOLL GATE.
          The justification itself is COMPOSED per market from that row's own verdict, so the
          audit chain is complete whether or not the officer writes anything here; what they
          add is appended to it. Shown only when the selection actually contains overridable
          rows AND this officer holds the compliance grant — an input that cannot be honoured
          is worse than none. The count stays in the label so the officer can never be
          unclear about how many markets an override is about to be recorded against. */}
      {canOverride && needOverride.length > 0 && (
        <div className="mt-3 rounded-md border border-warning/50 bg-warning/5 p-3">
          {/* ⛔ THE ACCESSIBLE NAME CONTAINS THE VISIBLE ONE — an `aria-label` sharing no
              words with the on-screen label breaks WCAG 2.5.3 and puts the field out of
              reach of a voice-control user reading the screen aloud. */}
          {/* DG-A-14: "Why are you sealing these N markets anyway?" is a whole question put to
              the officer, not an identifier, so it loses the eyebrow dress (uppercase + widest
              tracking) and comes up off 11px onto the smallest rung above the §T4 reading
              floor. The words are untouched, which keeps it word-for-word identical to the
              textarea's `aria-label` and so keeps WCAG 2.5.3 satisfied. */}
          <label htmlFor="bulk-override-reason" className="mb-1.5 flex items-center gap-1 font-mono text-body-sm text-warning">
            <I.shieldAlert s={11} />
            Anything to add about {needOverride.length === 1 ? "this market" : `these ${needOverride.length} markets`}? Optional.
          </label>
          <textarea
            data-field="overrideReason"
            id="bulk-override-reason"
            value={sharedReason}
            onChange={(e) => setSharedReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Added to the justification recorded against your name. Leave it empty and the market's own facts are still recorded."
            aria-label={`Anything to add about ${needOverride.length === 1 ? "this market" : `these ${needOverride.length} markets`}? Optional.`}
            aria-describedby="bulk-override-help"
            className="w-full rounded-md border border-warning/50 bg-bg-overlay px-3 py-2 text-label text-text outline-none admin-focus transition-colors placeholder:text-text-subtle"
          />
          <p id="bulk-override-help" className="mt-1.5 font-mono text-caption leading-relaxed text-text-subtle">
            {/* ⛔ THE HINT STATES WHAT IS RECORDED EITHER WAY. Its predecessor counted
                characters down to a minimum, which asserted that nothing would be written
                until the officer typed — the opposite of what now happens. */}
            <>Each of the {needOverride.length} refused {needOverride.length === 1 ? "market" : "markets"} is recorded with its own outcome, confidence, floor and cited source, against your name. {note ? "Your note is appended to each." : "A note is optional."}</>
          </p>
        </div>
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

      {/**
        * ⛔ THE PAGE ALREADY ADMITS THIS WORK IS LOST — "Turning the page clears it" is printed
        * two hundred lines above, and `BulkSelectionProvider` really does `setSharedReason("")`
        * on every page key change. So the console has been telling officers about a silent loss
        * instead of preventing it, on the one field it describes as *"read by a regulator, not
        * by you"*. The pagination links are in-app links, which is exit ② — the guard covers
        * them the moment it is given a dirty signal.
        *
        * ⭐ NO SAVE ON THE BAR, and this one is not a style choice: "saving" here means SEALING
        * markets and moving money, behind a confirmation that itemises every row. A one-click
        * Save on a floating bar is the last place that should live.
        */}
      {/* ⚠️ THE NOTE IS OPTIONAL, BUT LOSING TYPED WORDS IS STILL LOSING WORK — so the guard
          stays. What changed is the claim it makes: it no longer says an override is being
          held up by this box, because it is not. */}
      <PendingChangesBar
        dirty={note.length > 0}
        label="Override note not submitted"
        detail="It is discarded if you turn the page or leave — it is not held anywhere yet."
        onDiscard={() => setSharedReason("")}
      />
      <UnsavedChangesGuard
        dirty={note.length > 0}
        body="A note has been typed for the selected markets but nothing has been sealed. Leaving now discards it."
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
      /**
       * ⛔ THE PAIR IS CORRELATED AT THE CALL SITE, NOT PASSED AS TWO INDEPENDENT PROPS.
       *
       * The obvious form — `tier={c ? "hard" : "medium"} typedWord={c ? "RESOLVE" : undefined}`
       * — renders correctly and is a LIE TO THE TYPE CHECKER. It reads as
       * `tier: "hard" | "medium"` and `typedWord: string | undefined` INDEPENDENTLY, so
       * `hard` with no word is inside the type it declares. That combination looks gated and
       * is not: `ConfirmModal` arms itself with `tier === "hard" && !!typedWord`, so a hard
       * tier without a word silently degrades to an ordinary confirm — on the control that
       * seals real money across a page of markets. One spread makes the two inseparable, so
       * the checker can see what the behaviour already was.
       *
       * ⭐ The behaviour is UNCHANGED: a typed `RESOLVE` gate appears only when an override
       * is in the batch. A typed gate on every routine confirmation is how a typed gate stops
       * being read.
       */
      {...(hasOverride
        ? ({ tier: "hard", typedWord: "RESOLVE" } as const)
        : ({ tier: "medium" } as const))}
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
                    {/* ⛔ A MACHINE-READABLE OUTCOME, because the prose beside it lies to a
                        scanner. A row with nothing to seal renders this span EMPTY, but its
                        reason text reads "The AI returned no YES/NO outcome" — so a drive
                        checking the row's words for YES/NO matched the sentence describing
                        the ABSENCE and passed over the exact defect it was written to catch.
                        The attribute carries the value itself, with no sentence around it. */}
                    <span
                      data-outcome={r.verdict.outcome ?? ""}
                      className={`font-mono text-label font-bold ${r.verdict.outcome === "YES" ? "text-yes-300" : "text-no-300"}`}
                    >
                      {r.verdict.outcome}
                    </span>
                    {r.verdict.confidence != null && (
                      <span className="ml-1.5 font-mono text-micro text-text-subtle">{r.verdict.confidence}%</span>
                    )}
                    <p className="amount text-caption text-text-muted">{formatTzs(r.pool)}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="flex items-center justify-between rounded-md border border-border bg-bg-overlay px-3 py-2">
            <span className="font-mono text-micro uppercase eyebrow text-text-subtle">
              {BULK_BAR.moneyAtStake.en}
            </span>
            <span className="amount text-body-sm font-bold text-text">{formatTzs(total)}</span>
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
        <p className="font-mono text-micro uppercase eyebrow text-text-subtle">
          Batch {result.batchId.slice(0, 8)} · {result.attempted} attempted
        </p>
        <Button variant="ghost" size="xs" onClick={onDismiss}>Dismiss</Button>
      </div>
      <div className="space-y-2 px-3 py-2">
        {groups.filter((g) => g.rows.length > 0).map((g) => (
          <div key={g.key}>
            <p className={`font-mono text-micro uppercase eyebrow ${g.tone}`}>{g.rows.length} · {g.label}</p>
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
