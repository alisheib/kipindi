"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { isKnownRefusal, refusalFigures, ADMIN_REFUSALS, type OperatorRefusal } from "@/lib/operator-refusal";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { AiProgress, AiOverlayShell, type AiPhase } from "@/components/ui/ai-progress";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  criterionTranslationIssue, MIN_CRITERION_TRANSLATION,
  type CriterionTranslationIssue,
} from "@/lib/localized";
import { DateSelect } from "@/components/ui/date-select";
import { TimeSelect } from "@/components/ui/time-select";
import { Toggle } from "@/components/ui/toggle";
import { DurationInput } from "@/components/ui/duration-input";
import { I } from "@/components/ui/glyphs";
import {
  generatePollAction,
  generatePollBatchAction,
  updatePollConfigAction,
  approvePollAction,
  rejectPollAction,
  editPollAction,
  publishPollAction,
  deletePollAction,
  deleteAllPollsAction,
  seedFixturesAction,
} from "./actions";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import type { StoredAIPoll, QualityIndicator, FilterReason } from "@/lib/server/ai-poll-generation";
import type { AIPollConfig } from "@/lib/server/ai-poll-config";
import { formatTzs } from "@/lib/utils";
import { SELECTION, bi } from "@/lib/admin-status-lexicon";
import { band, BAND_TEXT, BAND_FILL } from "@/lib/score-band";

const adminTextarea = "w-full rounded-lg border border-border bg-[var(--bg-inset)] px-3 py-2.5 text-[13px] text-text placeholder:text-text-subtle outline-none admin-focus transition-colors resize-none";

/**
 * After a generate/regenerate/batch action + router.refresh(), the new poll
 * lands somewhere down the list while the page is still scrolled at the form —
 * so the operator can't see what was produced. This scrolls the target element
 * into view and flashes it. The list re-renders asynchronously after refresh(),
 * so we poll briefly for the element (up to ~3s) and no-op if it never appears
 * (e.g. a filtered poll on a later page).
 */
let _revealTimer: ReturnType<typeof setTimeout> | null = null;
let _revealFlashEl: HTMLElement | null = null;
function revealElement(elementId: string) {
  if (typeof document === "undefined") return;
  // Latest-wins: cancel any in-flight reveal so rapid successive generations
  // don't spawn competing loops that fight over the scroll position.
  if (_revealTimer) { clearTimeout(_revealTimer); _revealTimer = null; }
  if (_revealFlashEl) { _revealFlashEl.classList.remove("poll-flash"); _revealFlashEl = null; }
  let tries = 0;
  const tick = () => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Restart the flash even if it's the same element (reflow re-triggers it).
      el.classList.remove("poll-flash");
      void el.offsetWidth;
      el.classList.add("poll-flash");
      _revealFlashEl = el;
      _revealTimer = setTimeout(() => {
        el.classList.remove("poll-flash");
        if (_revealFlashEl === el) _revealFlashEl = null;
        _revealTimer = null;
      }, 2000);
      return;
    }
    _revealTimer = tries++ < 40 ? setTimeout(tick, 80) : null;
  };
  _revealTimer = setTimeout(tick, 80);
}

/* ─── Generate form ─── */

// The canonical market categories (matches MarketCategory). Generation is
// further restricted at runtime to the subset that has an enabled trusted
// source — see the `generatable` prop on GenerateForm.
const CATEGORIES = [
  { id: "sports", label: "Sports" },
  { id: "macro", label: "Macro / Economy" },
  { id: "weather", label: "Weather" },
  { id: "crypto", label: "Crypto" },
  { id: "culture", label: "Culture" },
  { id: "tech", label: "Tech" },
  { id: "other", label: "Other" },
] as const;

type GenPhase = "idle" | "calling" | "validating" | "filtering" | "done";
/**
 * `message` is the server's OWN refusal sentence, carried verbatim, and `refusal` is the same
 * refusal AS DATA — see the failure branch in the overlay for why nothing here may invent a
 * cause, and `src/lib/operator-refusal.ts` for why the figures never come out of the sentence.
 */
type GenResult = {
  state: string; title: string; quality: number; reasons: string[];
  message?: string; refusal?: OperatorRefusal;
} | null;

/** The three reads of a refusal this console needs, each returning nothing when the server sent
 *  no refusal or sent a `reason` this client does not know — so an older console degrades to the
 *  plain sentence rather than to an empty card. */
const refusalTitle = (r?: OperatorRefusal) => (isKnownRefusal(r) ? ADMIN_REFUSALS[r.reason].title : undefined);
const refusalRows = (r?: OperatorRefusal) => (r ? refusalFigures(r) : []);
const refusalFix = (r?: OperatorRefusal) => (isKnownRefusal(r) ? r.fix : undefined);
const refusalBody = (r?: OperatorRefusal) => (isKnownRefusal(r) ? ADMIN_REFUSALS[r.reason].body : undefined);

const PHASE_LABELS: Record<GenPhase, string> = {
  idle: "",
  calling: "Calling AI model…",
  validating: "Validating response…",
  filtering: "Running quality checks…",
  done: "",
};

/** The shared-component view of the same phases — derived below so the labels and the
 *  percentages cannot drift apart into two lists that disagree. */
const PHASE_PROGRESS: Record<GenPhase, number> = {
  idle: 0,
  calling: 25,
  validating: 55,
  filtering: 80,
  done: 100,
};

const POLL_PHASES: AiPhase[] = (["calling", "validating", "filtering"] as const).map((k) => ({
  key: k, label: PHASE_LABELS[k], pct: PHASE_PROGRESS[k],
}));

export function GenerateForm({ generatable }: { generatable: string[] }) {
  const [pending, start] = useTransition();
  // Only categories with an enabled trusted source can be generated; default to
  // the first available one (falls back to "sports" only when the list is empty,
  // in which case the button is disabled anyway).
  const generatableSet = new Set(generatable);
  const [category, setCategory] = useState(generatable[0] ?? "sports");
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<GenPhase>("idle");
  const [result, setResult] = useState<GenResult>(null);
  const phaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const router = useRouter();
  // Controlled Poll state
  const [controlled, setControlled] = useState(false);
  const [controlledTitle, setControlledTitle] = useState("");
  // ISO date (YYYY-MM-DD from DateSelect) + 24h time (HH:MM from TimeSelect)
  // for resolution + selection close. The kit components guarantee a real
  // calendar date and an in-range 24-hour time — an out-of-range value can't
  // even be typed, so the parse below only ever combines two valid halves.
  const [resDate, setResDate] = useState("");       // YYYY-MM-DD
  const [resTime, setResTime] = useState("");       // HH:MM (24h)
  const [selDate, setSelDate] = useState("");       // YYYY-MM-DD
  const [selTime, setSelTime] = useState("");       // HH:MM (24h)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLDivElement>(null);
  // Lower bound for the date pickers — no resolving/closing in the past.
  const todayIso = new Date().toISOString().slice(0, 10);

  const clearTimers = () => {
    phaseTimers.current.forEach(clearTimeout);
    phaseTimers.current = [];
  };

  /** Combine an ISO date (YYYY-MM-DD) + 24h time (HH:MM) into a UTC ISO string.
   *  Time defaults to 00:00 when blank. Returns null if the date is missing or
   *  the combination is somehow not a real instant. */
  const combineDateTime = (isoDate: string, time: string): string | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
    const t = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "00:00";
    const dt = new Date(`${isoDate}T${t}:00`);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  };

  /** Validate all controlled poll fields. Returns errors map (empty = valid). */
  const validateControlled = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!controlled) return errs;
    // Title is optional but if provided must be reasonable
    if (controlledTitle && controlledTitle.length < 5) errs.title = "Title must be at least 5 characters.";
    if (controlledTitle && controlledTitle.length > 200) errs.title = "Title must be under 200 characters.";
    // Resolution date is optional but if provided must be valid + in the future
    if (resDate) {
      const resIso = combineDateTime(resDate, resTime);
      if (!resIso) {
        errs.resDate = "Pick a valid resolution date.";
      } else if (new Date(resIso).getTime() <= Date.now() + 3 * 3600_000) {
        errs.resDate = "Resolution must be at least 3 hours from now.";
      }
    }
    if (selDate) {
      const selIso = combineDateTime(selDate, selTime);
      if (!selIso) {
        errs.selDate = "Pick a valid selection-close date.";
      } else if (new Date(selIso).getTime() <= Date.now()) {
        errs.selDate = `${SELECTION.selectionClose.en} must be in the future.`;
      }
    }
    // Cross-validation: selectionClosedAt < resolutionAt
    if (selDate && resDate && !errs.selDate && !errs.resDate) {
      const selIso = combineDateTime(selDate, selTime)!;
      const resIso = combineDateTime(resDate, resTime)!;
      if (new Date(selIso).getTime() >= new Date(resIso).getTime()) {
        errs.selDate = `${SELECTION.selectionClose.en} must be before the resolution date.`;
      }
    }
    return errs;
  };

  /**
   * Take the operator to the first invalid field (DG-S-06, §K rule 7d).
   *
   * ⭐ DELETED INTO `focusFirstInvalid` (2026-08-31). The version that lived here was the
   * repo's only such helper and it was wrong four ways, each of which the kit version fixes and
   * documents: it picked by `Object.keys(errs)[0]` — the VALIDATOR's order, not the order the
   * fields appear, so it could scroll past the first empty field to a later one; it only ever
   * focused an `<input>`, so a `<textarea>` or `<select>` got a scroll and no keyboard; it had
   * no `else`, so a field on an unrendered tab meant NOTHING happened and nothing said why; and
   * its `behavior:"smooth"` plus `setTimeout(…, 300)` ignored §M6 and raced its own animation.
   * ⛔ The result is now READ, not discarded — a refusal that nobody looks at is the silence
   * §K rule 7d names.
   */
  const scrollToFirstError = (errs: Record<string, string>) => {
    const r = focusFirstInvalid(formRef.current, Object.keys(errs));
    if (!r.ok && r.reason === "not-rendered") {
      // The field is invalid and off-screen. Say so — this form is single-panel today, so this
      // cannot happen yet; when it is tabbed, the branch is already here rather than missing.
      console.warn(`[validation] "${r.field}" is invalid but not rendered`, r.ownedByTab ? `— it belongs to ${r.ownedByTab}` : "");
    }
  };

  // Cleanup timers on unmount (user navigates away mid-generation)
  useEffect(() => () => clearTimers(), []);

  // Escape key dismisses the result card (only when done, never mid-generation)
  useEffect(() => {
    if (phase !== "done") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase]);

  const generate = () => {
    // Validate controlled fields before starting
    const errs = validateControlled();
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      scrollToFirstError(errs);
      return;
    }

    setPhase("calling");
    setResult(null);
    clearTimers();
    // Simulate phases while the real call runs — gives visual progress
    phaseTimers.current.push(setTimeout(() => setPhase("validating"), 800));
    phaseTimers.current.push(setTimeout(() => setPhase("filtering"), 1600));

    start(async () => {
      const fd = new FormData();
      fd.set("category", category);
      fd.set("prompt", prompt);
      if (controlled && controlledTitle) fd.set("controlledTitle", controlledTitle);
      if (controlled && resDate) {
        const resIso = combineDateTime(resDate, resTime);
        if (resIso) fd.set("controlledResolutionAt", resIso);
      }
      if (controlled && selDate) {
        const selIso = combineDateTime(selDate, selTime);
        if (selIso) fd.set("controlledSelectionClosedAt", selIso);
      }
      try {
        const r = await generatePollAction(fd);
        clearTimers();
        const state = r.ok ? r.poll.state : "VALIDATION_FAILED";
        setResult({
          state,
          title: r.ok ? r.poll.titleEn : "",
          quality: r.ok ? r.poll.overallQuality : 0,
          reasons: r.ok ? r.poll.filterReasons.map((r: string) => REASON_LABELS[r] ?? r) : [],
          message: r.ok ? undefined : r.error,
          refusal: r.ok ? undefined : r.refusal,
        });
        setPhase("done");
        router.refresh();
        if (r.ok && state === "PENDING_REVIEW") {
          revealElement(`poll-${r.poll.id}`);
        }
      } catch {
        clearTimers();
        setResult({ state: "VALIDATION_FAILED", title: "", quality: 0, reasons: [], message: "The request never reached the server. Check the connection and try again." });
        setPhase("done");
      }
    });
  };

  const dismiss = () => {
    setPhase("idle");
    setResult(null);
  };

  const active = phase !== "idle";

  return (
    <div className="relative">
      {/* Form — disabled during generation */}
      <div className={active ? "pointer-events-none select-none opacity-30 blur-[1px] transition-all duration-200" : "transition-all duration-200"}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const enabled = generatableSet.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => enabled && setCategory(c.id)}
                  disabled={!enabled}
                  title={enabled ? undefined : "No enabled trusted source — add one under Sources & categories to generate this category."}
                  /* DG-A-08 — 34px (12px line box + py-1.5 + border) was under §A2's 40px
                     floor. `min-h` and not the kit `<Button>`: this is a single-select chip
                     whose whole job is to SHOW which category is chosen, and the kit has no
                     selected state — a variant would erase the signal. Legal because a chip
                     is not a `.btn`; §K1 forbids a height utility only on the kit's button. */
                  className={`inline-flex min-h-[var(--tap-min)] items-center justify-center px-3 py-1.5 rounded-pill text-label font-mono uppercase tracking-[0.1em] border transition-colors ${
                    !enabled
                      ? "border-border/60 bg-bg-overlay/40 text-text-subtle/60 cursor-not-allowed line-through decoration-1"
                      : category === c.id
                        ? "border-brand-500 bg-brand-500/10 text-brand-300"
                        : "border-border bg-bg-overlay text-text-muted hover:border-text-subtle"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {generatable.length === 0 ? (
            <p className="flex items-start gap-1.5 text-body-sm text-warning-fg leading-snug">
              <I.warning s={13} className="shrink-0 mt-0.5" />
              No categories have an enabled trusted source yet. Add one under{" "}
              <a href="/admin/sources" className="underline underline-offset-2 hover:text-text">Sources &amp; categories</a>{" "}
              before generating — polls can only cite approved domains.
            </p>
          ) : (
            <p className="text-body-sm text-text-subtle leading-snug">
              Only categories with an enabled trusted source can be generated. Manage them under{" "}
              <a href="/admin/sources" className="text-royal-300 underline-offset-2 hover:underline">Sources &amp; categories</a>.
            </p>
          )}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional: guide the AI with specific instructions (e.g. 'Focus on Premier League football this weekend')"
            className={adminTextarea}
            rows={2}
          />

          {/* ── Controlled Poll — collapsible advanced section ── */}
          <button
            type="button"
            onClick={() => { setControlled((v) => !v); setFormErrors({}); }}
            className="flex items-center gap-2 text-[12px] font-semibold text-text-muted hover:text-text transition-colors"
          >
            <I.target s={13} className="shrink-0" />
            Controlled Poll · Kura Iliyodhibitiwa
            <I.chevronRight s={11} className={`ml-auto transition-transform duration-150 text-text-subtle ${controlled ? "rotate-90" : ""}`} />
          </button>
          {controlled && (
            <div ref={formRef} className="space-y-3 rounded-lg border border-border bg-bg-overlay p-3.5">
              <p className="text-body-sm text-text-subtle leading-snug">
                Set specific dates and title. The AI will generate the criterion, options, and sources around your constraints.
              </p>

              {/* Title */}
              <div data-field="title">
                <label className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-text">
                  <I.edit s={12} className="text-text-subtle shrink-0" /> Title (EN) · Optional
                </label>
                <Input
                  value={controlledTitle}
                  onChange={(e) => { setControlledTitle(e.target.value); setFormErrors((p) => { const n = { ...p }; delete n.title; return n; }); }}
                  placeholder="e.g. Will Tanzania beat Kenya in the CECAFA Cup final?"
                  size="sm"
                  error={!!formErrors.title}
                />
                {formErrors.title && <p className="mt-1 text-body-sm text-no-300">{formErrors.title}</p>}
              </div>

              {/* Selection Close: Date + Time */}
              <div data-field="selDate">
                <label className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-text">
                  <I.calendarClock s={12} className="text-text-subtle shrink-0" /> {bi(SELECTION.selectionClose)}
                </label>
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-[150px] flex-1">
                    <DateSelect
                      value={selDate}
                      min={todayIso}
                      onChange={(iso) => { setSelDate(iso); setFormErrors((p) => { const n = { ...p }; delete n.selDate; return n; }); }}
                    />
                  </div>
                  <TimeSelect
                    value={selTime}
                    size="md"
                    error={!!formErrors.selDate}
                    aria-label="Selection close time, 24-hour"
                    onChange={(t) => { setSelTime(t); setFormErrors((p) => { const n = { ...p }; delete n.selDate; return n; }); }}
                  />
                </div>
                {formErrors.selDate
                  ? <p className="mt-1 text-body-sm text-no-300">{formErrors.selDate}</p>
                  : <p className="mt-1 text-[10px] text-text-subtle">When new bets stop · time defaults to 00:00 if blank</p>
                }
              </div>

              {/* Resolution Date: Date + Time */}
              <div data-field="resDate">
                <label className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-text">
                  <I.calendarClock s={12} className="text-text-subtle shrink-0" /> Resolution Date · Tarehe ya matokeo
                </label>
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-[150px] flex-1">
                    <DateSelect
                      value={resDate}
                      min={todayIso}
                      onChange={(iso) => { setResDate(iso); setFormErrors((p) => { const n = { ...p }; delete n.resDate; return n; }); }}
                    />
                  </div>
                  <TimeSelect
                    value={resTime}
                    size="md"
                    error={!!formErrors.resDate}
                    aria-label="Resolution time, 24-hour"
                    onChange={(t) => { setResTime(t); setFormErrors((p) => { const n = { ...p }; delete n.resDate; return n; }); }}
                  />
                </div>
                {formErrors.resDate
                  ? <p className="mt-1 text-body-sm text-no-300">{formErrors.resDate}</p>
                  : <p className="mt-1 text-[10px] text-text-subtle">When outcome is known · time defaults to 00:00 if blank</p>
                }
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={pending || active || generatable.length === 0}
              className="btn btn-primary btn-sm rounded-pill min-w-[160px]"
            >
              {controlled ? "Generate controlled poll" : "Generate poll"}
            </button>
            <span className="text-[11px] text-text-subtle font-mono">
              Category: {category}{controlled ? " · controlled" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Generation overlay — fixed scrim blocks the entire page while running */}
      {active && (
        <AiOverlayShell>
            {phase !== "done" ? (
              /* ── In-progress ── */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-brand-300 border-t-transparent animate-spin shrink-0" />
                  <p className="font-display text-[15px] font-semibold text-text">Generating poll</p>
                </div>
                {/* ⛔ SHARED, not local. This bar used to be ~14 lines of markup here, and
                    Up & Down proposal generation — a 30-second call — had nothing but a
                    spinning button. Copying it there would have manufactured two lookalike
                    implementations; the campaign's standing rule is to fix the shared
                    component (§0.1b). Both consoles now render `AiProgress`. */}
                <AiProgress
                  phases={POLL_PHASES}
                  active={phase}   /* already narrowed to a running phase in this branch */
                  note="The AI generates a poll, then it passes through validation, duplicate detection, and quality scoring."
                />
              </div>
            ) : result ? (
              /* ── Result ── */
              <div className="space-y-3">
                {result.state === "PENDING_REVIEW" ? (
                  <>
                    <div className="flex items-center gap-2.5">
                      {/* ⚠️ LITERALS, not `h-8 w-8` — spacing is overridden (tailwind.config.ts:200-215)
                          so `h-8` was a 48px disc round an 18px glyph, while the sibling result
                          medallion at L659 was `h-9` = 64px: the same object at two sizes. All
                          four are 36px now. Decorative, so no tap floor applies. */}
                      <span className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full bg-yes-500/15 text-yes-300 shrink-0"><I.check s={18} /></span>
                      <div>
                        <p className="font-display text-[15px] font-semibold text-text">Poll ready for review</p>
                        <p className="font-mono text-[11px] text-yes-300">Quality: {result.quality}%</p>
                      </div>
                    </div>
                    {result.title && (
                      <p className="text-[13px] text-text-muted leading-snug line-clamp-2">{result.title}</p>
                    )}
                  </>
                ) : result.state === "FILTERED" ? (
                  <>
                    <div className="flex items-center gap-2.5">
                      {/* ⚠️ LITERALS — see the pass medallion above. `h-8` is 48px here. */}
                      <span className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full bg-warning-bg text-warning-fg shrink-0"><I.warning s={18} /></span>
                      <div>
                        <p className="font-display text-[15px] font-semibold text-text">Didn&apos;t pass quality checks</p>
                        <p className="font-mono text-[11px] text-warning-fg">Try generating again</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.reasons.map((r, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-mono border border-warning-border bg-warning-bg text-warning-fg">{r}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      {/* ⚠️ LITERALS — see the pass medallion above. `h-8` is 48px here. */}
                      <span className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full bg-no-500/15 text-no-300 shrink-0"><I.x s={18} /></span>
                      <div>
                        {/* ⭐ A KNOWN REFUSAL NAMES ITSELF. "Generation failed" says what did not
                            happen; "AI credit limit reached" says what DID, and only the second can
                            be acted on. Falls back for anything this client does not recognise. */}
                        <p className="font-display text-[15px] font-semibold text-text">
                          {refusalTitle(result.refusal) ?? "Generation failed"}
                        </p>
                        {/* ⛔ NO HARDCODED SUBLINE — this branch does not know the cause on its own.
                            It read "AI provider error" until 2026-08-31, when every failure on this
                            screen was our OWN spend cap refusing before Anthropic was ever called: the
                            single place that named a cause named the wrong one, and pointed the operator
                            away from the control actually stopping them. The replacement must not be
                            another guess — "nothing was charged" is false too, because L961/L985 reach
                            this state AFTER a paid call. The figures below and `result.message` come
                            from the server. When there is neither, say nothing. */}
                      </div>
                    </div>
                    {/* ⭐ BODY, THEN FIGURES — the same order the shared OperationResultModal uses.
                        One refusal rendered in two orders on two surfaces is the reader's problem,
                        and the bespoke surface moves to match the shared one, never the reverse.
                        ⛔ `refusalBody` is the NEXT STEP ONLY. The server's full sentence opens with
                        this card's own title and repeats both figures, so rendering it here printed
                        one fact three times. It stays as the fallback for an unknown reason, which
                        has no title and no figures of its own. */}
                    {(refusalBody(result.refusal) ?? result.message) && (
                      <p className="text-[13px] text-text-muted leading-snug">
                        {refusalBody(result.refusal) ?? result.message}
                      </p>
                    )}
                    {/* THE FIGURES, AS DATA — never parsed back out of the sentence. */}
                    {refusalRows(result.refusal).length > 0 && (
                      <dl className="flex flex-wrap gap-x-5 gap-y-1.5">
                        {refusalRows(result.refusal).map((f) => (
                          <div key={f.label} className="flex items-baseline gap-1.5">
                            <dt className="font-mono text-[10px] uppercase eyebrow text-text-tertiary">{f.label}</dt>
                            {/* ⚠️ NEUTRAL, not `text-no-300`. Painting BOTH figures danger-red says the
                                LIMIT is at fault as loudly as the spend — and the limit is the thing
                                the operator is about to raise. The medallion carries the alarm. */}
                            <dd className="font-mono text-[12px] tabular text-text">{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {result.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {result.reasons.map((r, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-mono border border-no-700/40 bg-no-500/10 text-no-300">{r}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {/* 🔴 THE CTA IS THE OTHER HALF OF THE 2026-08-31 INCIDENT, AND IT IS EASY TO MISS.
                    Correcting the words while leaving a "Generate another" button under them still
                    invites the loop — the operator was retrying because the screen kept offering a
                    retry. When the server named a remedy, the primary action IS the remedy; retry
                    survives only where nobody knows why it failed. */}
                {/* ⛔ THE ROW WRAPS, AND EACH BUTTON KEEPS A BASIS — the same idiom `AdminCard`'s
                    header took after `G-5`. A `.btn` is `white-space: nowrap`, so as a flex item its
                    `min-width: auto` is its FULL label width and `flex-1` cannot shrink it: a long
                    label does not clip, it pushes the row out of the card. Measured by `qa:refusal`
                    at 320/360/390. The labels are short enough today; this makes the row unable to
                    break if one ever is not. */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={dismiss} className="btn btn-ghost btn-sm rounded-pill flex-1 basis-[8rem]">
                    Dismiss
                  </button>
                  {refusalFix(result.refusal) ? (
                    <Link
                      href={refusalFix(result.refusal)!.href}
                      onClick={dismiss}
                      className="btn btn-primary btn-sm rounded-pill flex-1 basis-[8rem] text-center"
                    >
                      {refusalFix(result.refusal)!.label}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => { dismiss(); generate(); }} className="btn btn-primary btn-sm rounded-pill flex-1 basis-[8rem]">
                      Generate another
                    </button>
                  )}
                </div>
              </div>
            ) : null}
        </AiOverlayShell>
      )}
    </div>
  );
}

/* ─── Batch generate ─── */

type BatchPhase = "idle" | "running" | "done";
type BatchSummary = { total: number; pending: number; filtered: number };

export function BatchGenerateForm({ maxBatch, remaining, generatable }: { maxBatch: number; remaining: number; generatable: string[] }) {
  const [pending, start] = useTransition();
  const suggested = Math.min(maxBatch, Math.max(1, remaining || 3));
  const [count, setCount] = useState(String(suggested));
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<BatchPhase>("idle");
  const [total, setTotal] = useState(0);
  const [pct, setPct] = useState(0);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const clearTick = () => { if (tick.current) { clearInterval(tick.current); tick.current = null; } };
  useEffect(() => () => clearTick(), []);
  useEffect(() => {
    if (phase !== "done") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase]);

  // Per-poll progress is SIMULATED (the batch action is one server round-trip
  // with no per-poll callback): the bar eases toward ~92% across the estimated
  // run, then snaps to 100% when the real response lands — same fake-timer
  // approach the single-poll form uses, just paced for N polls.
  const run = () => {
    const n = Math.max(1, parseInt(count, 10) || 1);
    setTotal(n);
    setPct(0);
    setSummary(null);
    setError(null);
    setPhase("running");
    clearTick();
    // Ease toward a 92% cap; pace so a full batch takes roughly n × ~3.5s.
    const target = 92;
    const step = Math.max(1.5, target / ((n * 3500) / 350));
    tick.current = setInterval(() => {
      setPct((p) => (p >= target ? p : Math.min(target, p + step)));
    }, 350);

    start(async () => {
      try {
        const fd = new FormData();
        fd.set("count", count);
        fd.set("prompt", prompt);
        const r = await generatePollBatchAction(fd);
        clearTick();
        router.refresh();
        if (r.ok) {
          setSummary({ total: r.total, pending: r.summary.PENDING_REVIEW, filtered: r.summary.FILTERED + r.summary.VALIDATION_FAILED });
          setPct(100);
          setPhase("done");
          if (r.summary.PENDING_REVIEW > 0) revealElement("ai-polls-pending");
        } else {
          setError("Server error — try again with fewer polls.");
          setPct(100);
          setPhase("done");
        }
      } catch {
        clearTick();
        setError("Server error — please try again.");
        setPct(100);
        setPhase("done");
      }
    });
  };

  const dismiss = () => { setPhase("idle"); setSummary(null); setError(null); setPct(0); };

  const active = phase !== "idle";
  // Estimated poll currently in flight (1-based), derived from the simulated %.
  const currentPoll = Math.min(total, Math.floor((pct / 100) * total) + 1);

  return (
    <div className="flex flex-wrap items-end gap-3 pt-3 mt-3 border-t border-border/60">
      <label className="block">
        <span className="text-micro text-text-subtle block mb-1 font-mono uppercase eyebrow">
          Batch count (max {maxBatch})
        </span>
        <Input
          type="number"
          min={1}
          max={maxBatch}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          mono
          size="sm"
          containerClassName="w-24"
        />
      </label>
      <div className="flex-1 min-w-[220px]">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Optional guidance applied to every poll in the batch"
          size="sm"
        />
      </div>
      <button
        type="button"
        onClick={run}
        disabled={pending || active || generatable.length === 0}
        className="btn btn-ghost btn-sm rounded-pill min-w-[150px]"
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Generating batch…
          </span>
        ) : (
          "Generate batch"
        )}
      </button>
      <span className="text-[11px] text-text-subtle font-mono">
        {generatable.length === 0
          ? "No trusted sources — add one under Sources & categories first."
          : `Two-tier across ${generatable.join(", ")}. Brainstorm → free filter → enrich keepers.`}
      </span>

      {/* Simulated per-poll progress overlay */}
      {active && (
        <AiOverlayShell>
            {phase === "running" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-brand-300 border-t-transparent animate-spin shrink-0" />
                  <p className="font-display text-[15px] font-semibold text-text">Generating {total} poll{total !== 1 ? "s" : ""}</p>
                </div>
                {/* Determinate: the batch really does know "poll 3 of 8". Same shared
                    bar as the single generator and Up & Down — one chrome everywhere. */}
                <AiProgress
                  pct={pct}
                  label={`${pct < 28 ? "Brainstorming ideas across categories…" : `Refining poll ${currentPoll} of ${total}`} · ${Math.round(pct)}%`}
                  note="Two-tier: a cheap pass brainstorms ideas and filters duplicates / out-of-window dates for free, then the full Sonnet + web-search pipeline runs only on the keepers."
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {/* ⚠️ LITERALS, not `h-9 w-9` (64px on the overridden scale) — 36px, the same
                      as the three result medallions above in this same component. */}
                  <span className={`grid h-[36px] w-[36px] shrink-0 place-items-center rounded-full ${error ? "bg-no-500/15 text-no-300" : "bg-yes-500/15 text-yes-300"}`}>
                    {error ? <I.x s={18} /> : <I.check s={18} />}
                  </span>
                  <p className="font-display text-[15px] font-semibold text-text">
                    {error ? "Batch failed" : `Batch complete — ${summary?.total ?? 0} generated`}
                  </p>
                </div>
                <p className="text-body-sm text-text-muted">
                  {error ?? `${summary?.pending ?? 0} ready for review · ${summary?.filtered ?? 0} filtered`}
                </p>
                <button type="button" onClick={dismiss} className="btn btn-ghost btn-sm rounded-pill w-full">Dismiss</button>
              </div>
            )}
        </AiOverlayShell>
      )}
    </div>
  );
}

/* ─── Config panel ─── */

const LEAD_TIME_CATEGORIES = ["sports", "weather", "crypto", "culture", "tech", "macro", "infrastructure", "other"] as const;
const LEAD_TIME_LABELS: Record<string, string> = {
  sports: "Sports", weather: "Weather", crypto: "Crypto",
  culture: "Culture", tech: "Tech", macro: "Macro",
  infrastructure: "Infrastructure", other: "Other",
};

export function ConfigPanel({ config }: { config: AIPollConfig }) {
  const [pending, start] = useTransition();
  const [webSearch, setWebSearch] = useState(config.webSearchEnabled);
  const [dailyTarget, setDailyTarget] = useState(String(config.dailyTarget));
  const [minLead, setMinLead] = useState(String(config.minLeadTimeHours));
  const [maxLead, setMaxLead] = useState(String(config.maxLeadTimeDays));
  const [minConf, setMinConf] = useState(String(config.minConfidence));
  const [maxBatch, setMaxBatch] = useState(String(config.maxBatchPerRun));
  const [leadTimes, setLeadTimes] = useState<Record<string, number>>(
    Object.fromEntries(LEAD_TIME_CATEGORIES.map((c) => [c, config.selectionLeadTimeHours?.[c] ?? 1440])),
  );
  const router = useRouter();
  const { deferToast } = useDeferredToast(pending);

  const save = (override?: Partial<{ webSearchEnabled: boolean }>) => {
    start(async () => {
      const fd = new FormData();
      fd.set("webSearchEnabled", String(override?.webSearchEnabled ?? webSearch));
      fd.set("dailyTarget", dailyTarget);
      fd.set("minLeadTimeHours", minLead);
      fd.set("maxLeadTimeDays", maxLead);
      fd.set("minConfidence", minConf);
      fd.set("maxBatchPerRun", maxBatch);
      for (const [cat, mins] of Object.entries(leadTimes)) {
        fd.set(`selectionLead.${cat}`, String(mins));
      }
      const r = await updatePollConfigAction(fd);
      router.refresh();
      if (r.ok) {
        // Re-seed from the server's CLAMPED values so an out-of-range entry
        // (e.g. confidence 200) snaps back to what was actually saved (100).
        setWebSearch(r.config.webSearchEnabled);
        setDailyTarget(String(r.config.dailyTarget));
        setMinLead(String(r.config.minLeadTimeHours));
        setMaxLead(String(r.config.maxLeadTimeDays));
        setMinConf(String(r.config.minConfidence));
        setMaxBatch(String(r.config.maxBatchPerRun));
        if (r.config.selectionLeadTimeHours) {
          setLeadTimes(Object.fromEntries(LEAD_TIME_CATEGORIES.map((c) => [c, r.config.selectionLeadTimeHours[c] ?? 1440])));
        }
        deferToast({ title: "Settings saved", variant: "success" });
      } else {
        // Without this branch a rejected save (or a failed web-search toggle,
        // which routes through here) gave the officer no feedback at all.
        // The toggle flips optimistically before save() — revert it on failure
        // so the switch never lies about the persisted setting.
        if (override && typeof override.webSearchEnabled === "boolean") {
          setWebSearch(!override.webSearchEnabled);
        }
        deferToast({ title: "Couldn't save settings", description: r.error, variant: "danger" });
      }
    });
  };

  const numField = (label: string, hint: string, value: string, set: (v: string) => void) => (
    <label className="block">
      <span className="text-micro text-text-subtle block mb-1 font-mono uppercase eyebrow">{label}</span>
      <Input type="number" value={value} onChange={(e) => set(e.target.value)} mono size="sm" />
      <span className="text-[10px] text-text-subtle">{hint}</span>
    </label>
  );

  return (
    <div className="space-y-3">
      {/* Web search toggle */}
      <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-text">Live web search grounding</p>
          <p className="text-body-sm text-text-subtle leading-snug">
            Grounds every poll in real current events + real source URLs. Off = the model uses its training memory only.
          </p>
        </div>
        <div className="ml-3">
          <Toggle
            on={webSearch}
            onClick={() => { const v = !webSearch; setWebSearch(v); save({ webSearchEnabled: v }); }}
            disabled={pending}
            aria-label="Toggle live web search grounding"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {numField("Daily target", "Polls/day goal (1–1,000,000)", dailyTarget, setDailyTarget)}
        {numField("Min confidence", "Floor 0–100 to reach review", minConf, setMinConf)}
        {numField("Max per batch", "Cap on one batch run", maxBatch, setMaxBatch)}
        {numField("Min lead time (h)", "Earliest a poll may resolve", minLead, setMinLead)}
        {numField("Max horizon (d)", "Latest a poll may resolve", maxLead, setMaxLead)}
      </div>

      {/* ── Selection lead times per category ── */}
      <div className="rounded-md border border-border bg-bg-overlay p-3">
        <p className="text-body-sm font-semibold text-text mb-1">Selection lead time per category · Muda wa kufunga uchaguzi</p>
        <p className="text-body-sm text-text-subtle mb-2.5 leading-snug">
          How long before the resolution date betting closes for each category. Players see &quot;{SELECTION.selectionClosedWaiting.en}&quot; after this cutoff.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LEAD_TIME_CATEGORIES.map((cat) => (
            <div key={cat}>
              <span className="text-micro text-text-subtle block mb-0.5 font-mono uppercase eyebrow">{LEAD_TIME_LABELS[cat]}</span>
              <DurationInput
                value={leadTimes[cat] ?? 1440}
                onChange={(mins) => setLeadTimes((prev) => ({ ...prev, [cat]: mins }))}
                min={0}
                max={43200}
                size="sm"
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => save()} disabled={pending} className="btn btn-primary btn-sm rounded-pill min-w-[140px]">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

/* ─── Quality indicators display ─── */

export function QualityBadges({ indicators, overall }: { indicators: QualityIndicator[]; overall: number }) {
  /* 🔴 D2 + D3 (2026-08-21, owner ruling) — this triad broke BOTH laws in one line.
     `good` was `--yes-300`, the ink that means a player's money is on YES (§B2:
     the betting pair is never reused for a non-money meaning), and `bad` was
     `--claret-300`, which §B4 reserves for the IRREVERSIBLE OPERATOR CEREMONY —
     the kill-switch, the emergency void, the final reject. A quality indicator
     reading "criterion is vague" is neither: it is app state, and app state is
     the `--success` / `--warning` / `--danger` families. */
  const statusColor = (s: "good" | "warning" | "bad") =>
    s === "good" ? "var(--success-fg)" : s === "warning" ? "var(--warning-fg)" : "var(--danger-fg)";
  const overallBand = band(overall, { good: 80, warn: 50 });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <I.gauge s={13} className="text-text-subtle" />
        <span className="font-mono text-micro uppercase eyebrow text-text-subtle">
          Overall quality
        </span>
        <span
          className="font-mono text-[13px] font-bold tabular-nums"
          style={{ color: BAND_TEXT[overallBand] }}
        >
          {overall}%
        </span>
        <div className="flex-1 h-1.5 bg-bg-overlay rounded-pill overflow-hidden">
          <div
            className="h-full rounded-pill transition-all prog-sweep"
            style={{
              width: `${overall}%`,
              backgroundColor: BAND_FILL[overallBand],
            }}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {indicators.map((q, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-mono border"
            style={{
              color: statusColor(q.status),
              borderColor: `color-mix(in oklab, ${statusColor(q.status)} 30%, transparent)`,
              background: `color-mix(in oklab, ${statusColor(q.status)} 8%, transparent)`,
            }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor(q.status) }} />
            {q.label}: {q.score}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Filter reasons display ─── */

const REASON_LABELS: Record<string, string> = {
  empty_title: "Empty title",
  empty_criterion: "Empty resolution criterion",
  invalid_date: "Invalid resolution date",
  past_date: "Resolution date is in the past",
  resolution_too_soon: "Resolves too soon (under lead-time floor)",
  resolution_too_far: "Resolves too far out (over horizon)",
  no_options: "No betting options",
  duplicate_options: "Duplicate options detected",
  too_few_options: "Too few options (need 2+)",
  invalid_category: "Unknown category",
  banned_category: "Banned category (policy)",
  low_confidence: "Low AI confidence",
  title_too_long: "Title too long",
  criterion_too_long: "Criterion too long",
  xss_detected: "XSS / injection detected",
  null_bytes: "Null bytes detected",
  duplicate_poll: "Duplicate of existing poll",
  no_sources: "No valid sources",
  invalid_source_url: "Invalid source URL",
  source_not_trusted: "Source not on the trusted registry for this category",
  malformed_response: "Malformed AI response",
  provider_error: "AI provider error",
};

export function FilterReasonChips({ reasons }: { reasons: FilterReason[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.map((r, i) => (
        // `/[0.08]` and not `/8` — off Tailwind's 5-step opacity ladder, so these
        // refusal-reason pills rendered as bare outlines with no danger wash.
        //
        // 🔴 D3 (2026-08-21, owner ruling) — THE INK NOW MATCHES THE BOX. This pill
        // was the one mixed chip in the product: a `--danger-500` border and wash
        // carrying `--claret-300` TEXT, i.e. two different refusal vocabularies in
        // one 10px capsule. §B4 files claret as the IRREVERSIBLE OPERATOR CEREMONY
        // — kill-switch, emergency void, final reject — and a filter-reason label
        // is the opposite of a ceremony: it is a diagnostic, printed by the machine,
        // that no officer acted on. So it is danger end to end, and claret is left
        // to mean the thing an officer cannot take back.
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-mono border border-danger-500/30 bg-danger-500/[0.08] text-danger-fg"
        >
          {REASON_LABELS[r] ?? r}
        </span>
      ))}
    </div>
  );
}

/* ─── Review actions (approve / reject / edit / regenerate) ─── */

export function ReviewActions({ poll }: { poll: StoredAIPoll }) {
  const [pending, start] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const overlay = useActionOverlay();
  const router = useRouter();

  const approve = () => {
    overlay.run("Approving poll…", "Inaendelea kuidhinisha kura. Subiri kidogo.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", poll.id);
        const r = await approvePollAction(fd);
        router.refresh();
        if (!r.ok) overlay.fail("Could not approve", r.error);
        else overlay.succeed("Poll approved", "Ready to publish as a live market.");
      } catch {
        overlay.fail("Could not approve", "Server error — please try again.");
      }
    });
  };

  const regenerate = () => {
    overlay.run("Regenerating poll…", "Creating a fresh version with the same settings.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("category", poll.requestCategory);
        fd.set("prompt", poll.requestPrompt);
        fd.set("regenerationOf", poll.id);
        const r = await generatePollAction(fd);
        router.refresh();
        if (r.ok) {
          overlay.succeed("New poll generated", `State: ${r.poll.state} · Quality: ${r.poll.overallQuality}%`);
          if (r.poll.state === "PENDING_REVIEW") revealElement(`poll-${r.poll.id}`);
        } else {
          // ⛔ NEVER hardcode a cause here. This line used to read "The AI could not produce a
          // valid poll. Try again." — and on 2026-08-31 it said exactly that while the server
          // was refusing on our own spend cap, so the operator retried against a ceiling that
          // could not yield. `r.error` is the server's own sentence; it names the real control
          // and where to change it. See `OperatorError` in lib/server/safe-error.ts.
          overlay.fail("Regeneration failed", r.error, r.refusal);
        }
      } catch {
        overlay.fail("Regeneration failed", "Server error — please try again.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 min-w-[160px]">
      <button onClick={approve} disabled={pending} className="btn btn-primary btn-sm rounded-pill">
        {pending ? "Processing…" : "Approve"}
      </button>
      <button onClick={() => setShowEdit((v) => !v)} disabled={pending} className="btn btn-ghost btn-sm rounded-pill">
        Edit…
      </button>
      <button onClick={regenerate} disabled={pending} className="btn btn-ghost btn-sm rounded-pill">
        Regenerate
      </button>
      <button onClick={() => setShowReject((v) => !v)} disabled={pending} className="btn btn-ghost btn-sm rounded-pill text-claret-300">
        Reject…
      </button>

      {showReject && <RejectForm pollId={poll.id} onClose={() => setShowReject(false)} overlay={overlay} />}
      {showEdit && <EditForm poll={poll} onClose={() => setShowEdit(false)} overlay={overlay} />}
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}

/* ─── Publish actions ─── */

export function PublishActions({ poll }: { poll: StoredAIPoll }) {
  const [pending, start] = useTransition();
  const overlay = useActionOverlay();
  const router = useRouter();

  const publish = () => {
    overlay.run("Publishing market…", "Creating a live market from this poll. Players will be able to bet on it.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", poll.id);
        const r = await publishPollAction(fd);
        router.refresh();
        if (!r.ok) overlay.fail("Publish failed", r.error);
        else overlay.succeed("Market is live", `Market ${r.marketId} — players can now place bets.`);
      } catch {
        overlay.fail("Publish failed", "Server error — please try again.");
      }
    });
  };

  return (
    <>
      <button onClick={publish} disabled={pending} className="btn btn-primary btn-sm rounded-pill min-w-[120px]">
        {pending ? "Publishing…" : "Publish as market"}
      </button>
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </>
  );
}

/* ─── Delete actions ─── */

export function DeleteAction({ pollId, state, redirectTo }: { pollId: string; state: string; redirectTo?: string }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const overlay = useActionOverlay();
  const router = useRouter();
  const { toast } = useDeferredToast(pending);

  const del = (voidReason?: string) => {
    overlay.run("Deleting…", state === "PUBLISHED" ? "Voiding market and refunding players." : "Removing this poll permanently.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", pollId);
        if (voidReason) fd.set("reason", voidReason);
        const r = await deletePollAction(fd);
        if (!r.ok) {
          overlay.fail("Delete failed", r.error);
          return;
        }
        if (redirectTo) {
          overlay.dismiss();
          toast(r.refundedCount && r.refundedCount > 0
            ? { title: "Market voided — players refunded", description: `${r.refundedCount} player${r.refundedCount !== 1 ? "s" : ""} refunded`, variant: "success" }
            : { title: "Deleted", variant: "default" },
          );
          router.push(redirectTo as never);
        } else {
          router.refresh();
          if (r.refundedCount && r.refundedCount > 0) {
            overlay.succeed("Market voided — players refunded", `${r.refundedCount} player${r.refundedCount !== 1 ? "s" : ""} refunded · ${formatTzs(r.refundedTzs ?? 0)}`);
          } else {
            overlay.succeed("Poll deleted", "It has been permanently removed.");
          }
        }
      } catch {
        overlay.fail("Delete failed", "Server error — please try again.");
      }
    });
  };

  const deleteBtn = (
    <button
      disabled={pending}
      className="btn btn-ghost btn-sm rounded-pill text-text-subtle hover:text-claret-300"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );

  return (
    <>
      {state === "PUBLISHED" ? (
        <ConfirmDialog
          trigger={deleteBtn}
          title="Cancel live market?"
          tone="claret"
          confirmLabel="Yes — void market & refund all"
          body={
            <div className="space-y-2 text-[13px] text-text-muted leading-relaxed">
              <p>
                This market is <strong className="text-text">live</strong> with real player positions open.
                Confirming will:
              </p>
              <ul className="mt-1 space-y-1 pl-4 list-disc">
                <li>Immediately cancel and void the market</li>
                <li>Refund every player their <strong className="text-text">full stake — no deductions</strong></li>
                <li>Send refund notifications to all affected players</li>
              </ul>
              <p className="text-body-sm text-text-subtle">
                Only proceed under a regulatory or government directive. This is irreversible.
              </p>
              <div className="mt-3 pt-3 border-t border-border/60">
                {/* DG-A-14: this read "Reason for cancellation (required for audit log)" — a
                    label with its hint welded on, so the hint was reading copy sitting below the
                    12.5px floor in eyebrow dress. The label keeps the eyebrow recipe untouched;
                    the hint drops to the reading rung beneath it and carries the `mb-1.5` that
                    used to separate the label from the textarea. */}
                <p className="font-mono text-micro uppercase eyebrow text-text-subtle">
                  Reason for cancellation
                </p>
                <p className="text-body-sm text-text-subtle mb-1.5">(required for audit log)</p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Government directive, regulatory compliance…"
                  className={adminTextarea}
                  rows={2}
                />
              </div>
            </div>
          }
          onConfirm={() => del(reason.trim() || "Regulatory/administrative decision — market cancelled by administrator")}
        />
      ) : (
        <ConfirmDialog
          trigger={deleteBtn}
          title="Delete this poll?"
          tone="warning"
          confirmLabel="Yes, delete"
          body="This poll will be permanently removed. This cannot be undone."
          onConfirm={() => del()}
        />
      )}
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </>
  );
}

/* ─── Seed fixtures button ─── */

export function SeedFixturesButton() {
  const [pending, start] = useTransition();
  const overlay = useActionOverlay();
  const router = useRouter();

  const seed = () => {
    overlay.run("Seeding fixtures…", "Creating test polls for development.");
    start(async () => {
      try {
        const r = await seedFixturesAction();
        router.refresh();
        if (r.ok) overlay.succeed("Fixtures seeded", `${r.count} test polls created.`);
        else overlay.fail("Seed failed", "Could not create fixtures.");
      } catch {
        overlay.fail("Seed failed", "Server error — please try again.");
      }
    });
  };

  return (
    <>
      <button onClick={seed} disabled={pending} className="btn btn-ghost btn-sm rounded-pill text-[12px]">
        {pending ? "Seeding…" : "Seed fixtures"}
      </button>
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </>
  );
}

/* ─── Delete all button ─── */

export function DeleteAllButton({ totalCount }: { totalCount: number }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const overlay = useActionOverlay();
  const router = useRouter();

  const deleteAll = (voidReason?: string) => {
    overlay.run("Deleting all polls…", "Voiding any published markets and refunding players. This may take a moment.");
    start(async () => {
      try {
        const fd = new FormData();
        if (voidReason) fd.set("reason", voidReason);
        const r = await deleteAllPollsAction(fd);
        if (!r.ok) {
          overlay.fail("Delete failed", String((r as { error?: string }).error ?? "Unknown error"));
          return;
        }
        const parts: string[] = [];
        if (r.deleted > 0) parts.push(`${r.deleted} poll${r.deleted !== 1 ? "s" : ""} deleted`);
        if (r.voided > 0) parts.push(`${r.voided} market${r.voided !== 1 ? "s" : ""} voided`);
        if (r.skipped > 0) parts.push(`${r.skipped} in-flight skipped`);
        if (r.refundedCount > 0) parts.push(`${r.refundedCount} player${r.refundedCount !== 1 ? "s" : ""} refunded · ${formatTzs(r.refundedTzs ?? 0)}`);
        if (r.voidErrors && r.voidErrors.length > 0) parts.push(`${r.voidErrors.length} void error${r.voidErrors.length !== 1 ? "s" : ""}`);
        router.refresh();
        if (r.voidErrors && r.voidErrors.length > 0) {
          overlay.fail("Completed with errors", parts.join(" · "));
        } else {
          overlay.succeed("All polls cleared", parts.join(" · ") || "Nothing to delete.");
        }
      } catch {
        overlay.fail("Delete failed", "Server error — please try again.");
      }
    });
  };

  if (totalCount === 0) return null;

  return (
    <>
    <ConfirmDialog
      trigger={
        <button disabled={pending} className="btn btn-ghost btn-sm rounded-pill text-[12px] text-text-subtle hover:text-claret-300">
          {pending ? "Clearing…" : "Delete all"}
        </button>
      }
      title="Delete all AI polls?"
      tone="claret"
      confirmLabel="Yes — delete everything"
      body={
        <div className="space-y-2 text-[13px] text-text-muted leading-relaxed">
          <p>This will permanently delete <strong className="text-text">{totalCount.toLocaleString()} AI poll{totalCount !== 1 ? "s" : ""}</strong>. Specifically:</p>
          <ul className="mt-1 space-y-1 pl-4 list-disc">
            <li>All <strong className="text-text">PENDING, FILTERED, APPROVED, REJECTED</strong> polls are deleted immediately</li>
            <li>Any <strong className="text-text">PUBLISHED</strong> markets are voided and all players are refunded their full stake — no deductions</li>
            <li><strong className="text-text">GENERATING</strong> polls (in-flight) are left untouched</li>
          </ul>
          <p className="text-body-sm text-text-subtle">This cannot be undone. The platform will be clean and ready for fresh generation.</p>
          <div className="mt-3 pt-3 border-t border-border/60">
            {/* DG-A-14: same welded label/hint as the cancel dialog above — "Reason (required
                for audit log)". The label keeps the eyebrow recipe; the hint moves to the
                reading rung below it and inherits the `mb-1.5` before the textarea. */}
            <p className="font-mono text-micro uppercase eyebrow text-text-subtle">Reason</p>
            <p className="text-body-sm text-text-subtle mb-1.5">(required for audit log)</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Platform cleanup — starting fresh generation cycle…"
              className={adminTextarea}
              rows={2}
            />
          </div>
        </div>
      }
      onConfirm={() => deleteAll(reason.trim() || "Platform cleanup — bulk AI poll deletion by administrator")}
    />
    <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </>
  );
}

/* ─── Reject sub-form ─── */

const REJECT_REASONS = [
  { id: "banned_category", label: "Banned category" },
  { id: "low_confidence", label: "Low quality" },
  { id: "duplicate_poll", label: "Duplicate" },
  { id: "malformed_response", label: "Malformed" },
  { id: "empty_title", label: "Missing content" },
] as const;

function RejectForm({ pollId, onClose, overlay }: { pollId: string; onClose: () => void; overlay: ReturnType<typeof useActionOverlay> }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState<string>("low_confidence");
  const [note, setNote] = useState("");
  const router = useRouter();

  const submit = () => {
    onClose();
    overlay.run("Rejecting poll…", "Recording your decision in the audit log.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", pollId);
        fd.set("reasons", reason);
        fd.set("note", note);
        const r = await rejectPollAction(fd);
        router.refresh();
        if (!r.ok) overlay.fail("Reject failed", r.error);
        else overlay.succeed("Poll rejected", "It will not appear in the publish queue.");
      } catch {
        overlay.fail("Reject failed", "Server error — please try again.");
      }
    });
  };

  return (
    <div className="mt-2 z-10 rounded-md border border-border bg-bg-elevated p-3 shadow-lg w-[min(280px,calc(100vw-2rem))]">
      <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle mb-2">
        Reject reason
      </p>
      <div className="mb-2">
        <Select value={reason} onChange={setReason} size="sm"
          options={REJECT_REASONS.map((r) => ({ value: r.id, label: r.label }))} />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for the audit log…"
        className={adminTextarea + " mb-2"}
        rows={2}
      />
      <div className="flex flex-col gap-2">
        <button type="button" onClick={submit} disabled={pending} className="btn btn-no btn-md w-full">
          {pending ? "Rejecting…" : "Reject"}
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm w-full">Cancel</button>
      </div>
    </div>
  );
}

/* ─── Edit sub-form ─── */

function EditForm({ poll, onClose, overlay }: { poll: StoredAIPoll; onClose: () => void; overlay: ReturnType<typeof useActionOverlay> }) {
  const [pending, start] = useTransition();
  const [titleEn, setTitleEn] = useState(poll.titleEn);
  const [titleSw, setTitleSw] = useState(poll.titleSw);
  const [titleZh, setTitleZh] = useState(poll.titleZh ?? "");
  const [category, setCategory] = useState(poll.category);
  const [criterion, setCriterion] = useState(poll.resolutionCriterion);
  const [criterionSw, setCriterionSw] = useState(poll.resolutionCriterionSw ?? "");
  const [criterionZh, setCriterionZh] = useState(poll.resolutionCriterionZh ?? "");
  // ⛔ THE SAME imported rule the wizard and the server action use — one policy, three
  // surfaces. Re-implementing it here is how a client comes to accept what the server
  // refuses (E-145's shape).
  const swIssue = criterionTranslationIssue(criterionSw, criterion);
  const zhIssue = criterionTranslationIssue(criterionZh, criterion);
  const issueText = (i: CriterionTranslationIssue | null) =>
    i === "SAME_AS_ENGLISH"
      ? "This is the English text — leave it blank instead. Blank already shows the English with a note; a stored copy makes “not translated” impossible to tell from “translated identically”."
      : i === "TOO_SHORT"
        ? `Too short to be a translation (minimum ${MIN_CRITERION_TRANSLATION} characters). Leave it blank instead.`
        : null;
  const initialDt = poll.resolutionAt ? new Date(poll.resolutionAt) : null;
  const validInit = initialDt && !Number.isNaN(initialDt.getTime()) ? initialDt : null;
  const [editDate, setEditDate] = useState(validInit ? validInit.toISOString().slice(0, 10) : "");   // YYYY-MM-DD
  const [editTime, setEditTime] = useState(validInit ? validInit.toISOString().slice(11, 16) : "");  // HH:MM
  const initialSel = poll.selectionClosedAt ? new Date(poll.selectionClosedAt) : null;
  const validSel = initialSel && !Number.isNaN(initialSel.getTime()) ? initialSel : null;
  const [selDate, setSelDate] = useState(validSel ? validSel.toISOString().slice(0, 10) : "");
  const [selTime, setSelTime] = useState(validSel ? validSel.toISOString().slice(11, 16) : "");
  const [dateError, setDateError] = useState("");
  const [selError, setSelError] = useState("");
  const router = useRouter();
  const todayIso = new Date().toISOString().slice(0, 10);

  /** Combine an ISO date (YYYY-MM-DD) + 24h time (HH:MM) into a UTC ISO string. */
  const combineDateTime = (isoDate: string, time: string): string | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
    const t = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "00:00";
    const dt = new Date(`${isoDate}T${t}:00`);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  };

  const submit = () => {
    // 🔴 REFUSE A BAD TRANSLATION HERE, BECAUSE THE INLINE ALERT DOES NOT STOP THE
    // SAVE. Until this guard existed the panel rendered the red warning, submitted
    // anyway, `normaliseCriterionTranslation` dropped the value server-side, and the
    // officer got "Poll updated · Changes saved" — a SUCCESS toast over a discarded
    // translation. ⛔ That is the precise failure mode this whole finding is about:
    // an officer who believes they saved a translation and did not. The wizard blocks
    // its Continue button on the same rule; this panel had the rule and never used it.
    if (swIssue || zhIssue) {
      overlay.fail("Couldn't save", issueText(swIssue ?? zhIssue) ?? "Fix the criterion translation first.");
      return;
    }
    // A resolution date is mandatory on edit — guard the unsafe Date() parse.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDate)) {
      setDateError("Pick a resolution date.");
      return;
    }
    const t = /^([01]\d|2[0-3]):[0-5]\d$/.test(editTime) ? editTime : "00:00";
    const resIso = new Date(`${editDate}T${t}:00`);
    if (Number.isNaN(resIso.getTime())) { setDateError("Pick a valid resolution date."); return; }
    if (resIso.getTime() <= Date.now() + 3 * 3600_000) { setDateError("Resolution must be at least 3 hours from now."); return; }
    // Selection close validation (optional, but if set must be valid + before resolution)
    let selIsoStr: string | undefined;
    if (selDate) {
      const selIso = combineDateTime(selDate, selTime);
      if (!selIso) { setSelError("Pick a valid selection-close date."); return; }
      if (new Date(selIso).getTime() <= Date.now()) { setSelError(`${SELECTION.selectionClose.en} must be in the future.`); return; }
      if (new Date(selIso).getTime() >= resIso.getTime()) { setSelError(`${SELECTION.selectionClose.en} must be before the resolution date.`); return; }
      selIsoStr = selIso;
    }
    onClose();
    overlay.run("Saving changes…", "Re-validating poll through the quality pipeline.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", poll.id);
        fd.set("titleEn", titleEn);
        fd.set("titleSw", titleSw);
        fd.set("titleZh", titleZh);
        fd.set("category", category);
        fd.set("resolutionCriterion", criterion);
        fd.set("resolutionCriterionSw", criterionSw);
        fd.set("resolutionCriterionZh", criterionZh);
        fd.set("resolutionAt", resIso.toISOString());
        fd.set("selectionClosedAt", selIsoStr ?? "");
        const r = await editPollAction(fd);
        router.refresh();
        if (!r.ok) overlay.fail("Edit failed", r.error);
        else overlay.succeed("Poll updated", "Changes saved and poll re-validated.");
      } catch {
        overlay.fail("Edit failed", "Server error — please try again.");
      }
    });
  };

  return (
    <div className="mt-2 z-10 rounded-md border border-border bg-bg-elevated p-3 shadow-lg w-[min(360px,calc(100vw-2rem))] space-y-2">
      <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">
        Edit poll
      </p>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Title (EN)</span>
        <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} size="sm" />
      </label>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Title (SW)</span>
        <Input value={titleSw} onChange={(e) => setTitleSw(e.target.value)} size="sm" />
      </label>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Title (ZH) · Chinese</span>
        <Input value={titleZh} onChange={(e) => setTitleZh(e.target.value)} size="sm" />
      </label>
      <div>
        <span className="text-[10px] text-text-subtle block mb-1">Category</span>
        <Select value={category} onChange={setCategory} size="sm"
          options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
      </div>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Resolution criterion (EN) · binding</span>
        <textarea value={criterion} onChange={(e) => setCriterion(e.target.value)} className={adminTextarea} rows={2} />
      </label>
      {/* ⭐ F6c · THE OFFICER MUST BE ABLE TO SEE AND FIX WHAT THE MODEL WROTE. Without
          these two, a generated Swahili criterion would be stored and published with no
          human ever reading it — and this is the sentence the payout turns on. Blank is
          a legitimate answer: the player is shown the English with a note saying why. */}
      <label className="block">
        <span className="text-[10px] text-text-subtle">Criterion (SW) · blank = show English + note</span>
        <textarea value={criterionSw} onChange={(e) => setCriterionSw(e.target.value)}
          className={`${adminTextarea}${swIssue ? " border-no-700" : ""}`} rows={2}
          aria-invalid={!!swIssue || undefined} />
        {swIssue && <p role="alert" className="mt-1 text-[10px] leading-snug text-no-300">{issueText(swIssue)}</p>}
      </label>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Criterion (ZH) · blank = show English + note</span>
        <textarea value={criterionZh} onChange={(e) => setCriterionZh(e.target.value)}
          className={`${adminTextarea}${zhIssue ? " border-no-700" : ""}`} rows={2}
          aria-invalid={!!zhIssue || undefined} />
        {zhIssue && <p role="alert" className="mt-1 text-[10px] leading-snug text-no-300">{issueText(zhIssue)}</p>}
      </label>
      <div>
        <span className="text-[10px] text-text-subtle">{bi(SELECTION.selectionClose)}</span>
        <div className="flex flex-wrap items-start gap-2 mt-1">
          <div className="min-w-[130px] flex-1">
            <DateSelect value={selDate} min={todayIso} onChange={(iso) => { setSelDate(iso); setSelError(""); }} />
          </div>
          <TimeSelect value={selTime} size="md" error={!!selError} aria-label="Selection close time, 24-hour" onChange={(t) => { setSelTime(t); setSelError(""); }} />
        </div>
        {selError
          ? <p className="mt-1 text-body-sm text-no-300">{selError}</p>
          : <p className="mt-0.5 text-[10px] text-text-subtle">When new bets stop. Leave blank to auto-compute from category lead time.</p>
        }
      </div>
      <div>
        <span className="text-[10px] text-text-subtle">Resolves at</span>
        <div className="flex flex-wrap items-start gap-2 mt-1">
          <div className="min-w-[130px] flex-1">
            <DateSelect value={editDate} min={todayIso} onChange={(iso) => { setEditDate(iso); setDateError(""); }} />
          </div>
          <TimeSelect value={editTime} size="md" error={!!dateError} aria-label="Resolution time, 24-hour" onChange={(t) => { setEditTime(t); setDateError(""); }} />
        </div>
        {dateError && <p className="mt-1 text-body-sm text-no-300">{dateError}</p>}
      </div>
      <div className="flex flex-col gap-2 pt-1">
        <button type="button" onClick={submit} disabled={pending} className="btn btn-primary btn-md w-full">
          {pending ? "Saving…" : "Save & re-validate"}
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm w-full">Cancel</button>
      </div>
    </div>
  );
}
