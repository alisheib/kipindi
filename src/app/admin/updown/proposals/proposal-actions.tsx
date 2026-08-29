"use client";

/**
 * Officer controls for the Up & Down proposal queue.
 *
 * KIT-ONLY, and the same interaction contract as the rest of admin: every mutation goes
 * through `useTransition` + `useDeferredToast` (so a success toast fires when
 * `router.refresh()` commits, not on a timer), every consequential action confirms through the
 * kit modal rather than `window.confirm`, and every server refusal is shown VERBATIM.
 *
 * ⛔ ONE UX RULE DRIVES MOST OF THIS FILE: an officer must never be able to arm a chain
 * without having seen what changes. So the arm dialog states the asset, the duration, the
 * margin, and — when the proposal moves the asset's source — BOTH links, old and new, because
 * that single field decides what every future round resolves against.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { AiProgress, AiOverlayShell, useAiPhases, type AiPhase } from "@/components/ui/ai-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmModal, Modal } from "@/components/ui/modal";
import {
  generateProposalAction, editProposalAction, approveProposalAction,
  rejectProposalAction, armProposalAction, deleteProposalAction,
} from "./actions";
import { ALLOWED_DURATIONS } from "@/lib/updown-durations";

// ⛔ E-62 · ONE SOURCE FOR THE DURATIONS — see `src/lib/updown-durations.ts`. This was a
// hand-copied `[5, 15, 30]`; a duration added server-side would have been unreachable here.
const DURATIONS = ALLOWED_DURATIONS;

/** The closed reject set, with officer-facing labels. Values must match the server's enum. */
const REJECT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "source_unreadable", label: "No price could be read from that page" },
  { value: "source_not_trusted", label: "Source is not one we approve" },
  { value: "framing_unclear", label: "Framing is unclear or mistranslated" },
  { value: "margin_out_of_range", label: "Margin is wrong for this asset" },
  { value: "duration_not_allowed", label: "Wrong round length" },
  { value: "duplicate_chain", label: "We already run this asset and duration" },
  { value: "asset_disabled", label: "Asset should not be trading" },
  { value: "officer_judgement", label: "Officer judgement (see note)" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-body-sm leading-snug text-text-subtle">{hint}</span>}
    </label>
  );
}

// ── The evidence cell — a server component would do, but the relative age needs the client ──

/**
 * What the AI actually read from the page. Rendered by the SAME rule as every other price
 * surface on this platform: real data or an em-dash, never a zero and never a stale figure
 * dressed as current (rule A-5).
 */
export function EvidencePanel({
  observedPrice, observedQuotedAt, readAt, decimals, maxStalenessSeconds,
}: {
  observedPrice: number | null;
  observedQuotedAt: string | null;
  /** When the PLATFORM took this reading — the proposal's `createdAt`. E-52: the skew that
   *  matters is quote-time vs read-time, and it is FROZEN. Measuring against `Date.now()`
   *  turned every healthy proposal amber 91 seconds after it was generated. */
  readAt: string;
  decimals: number;
  maxStalenessSeconds: number;
}) {
  if (observedPrice == null || !observedQuotedAt) {
    return (
      // `text-danger-fg` — `hot-rose` is not a bridged colour family, so the
      // unreadable-feed state painted in ordinary body ink, indistinguishable
      // from a healthy evidence reading. Not `no-300`: §B2 reserves YES/NO.
      <div className="text-body-sm leading-snug text-danger-fg">
        <span className="font-mono text-[13px] font-bold">—</span>
        <div>nothing readable on that page</div>
      </div>
    );
  }
  // ⛔ E-52 · AGAINST `readAt`, NEVER `Date.now()`.
  //
  // This was `Date.now() - observedQuotedAt`, under the label "before we read it". Those are
  // two different quantities: the first is how long ago the quote was published relative to
  // NOW, the second is the skew at the moment of the read. So the number grew as the row aged,
  // and because `stale` compares it to the 90-second round window, **every** proposal turned
  // amber 91 seconds after it was generated and stayed that way forever — with
  // "⚠ older than the 90s round window" on evidence that had been 33 seconds old when taken.
  //
  // Caught on the first row E-47b ever produced, where the cell said "quoted 14m before we
  // read it ⚠ older than the 90s round window" while the checks column beside it said
  // "Read a live quote, 33s old" — the stored indicator, computed correctly at generation.
  // Two ages for one reading, contradicting each other on one row.
  //
  // ⚠️ It matters more now than it did: until E-47b nothing reached the queue approvable, so
  // nobody was discouraged from approving. A permanent false staleness alarm on every healthy
  // proposal is exactly how an officer learns to distrust a working signal.
  const skewSec = Math.round((new Date(readAt).getTime() - new Date(observedQuotedAt).getTime()) / 1000);
  const ageSec = Math.max(0, skewSec);
  const stale = ageSec > maxStalenessSeconds;
  const human = (s: number) => (s < 120 ? `${s}s` : s < 7200 ? `${Math.round(s / 60)}m` : `${Math.round(s / 3600)}h`);
  return (
    <div className="text-body-sm leading-snug">
      <span className="font-mono text-[13px] font-bold tabular-nums text-text">
        ${observedPrice.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      </span>
      <div className={stale ? "text-warning-fg" : "text-text-subtle"}>
        quoted {human(ageSec)} before we read it
      </div>
      {stale && (
        <div className="text-warning-fg">⚠ older than the {maxStalenessSeconds}s round window</div>
      )}
    </div>
  );
}

// ── Generate ────────────────────────────────────────────────────────────────

export function ProposeForm({
  assets, defaultMarginBps, maxStalenessSeconds, aiEnabled,
}: {
  assets: Array<{ id: string; key: string; symbol: string; sourceDomain: string }>;
  defaultMarginBps: number;
  maxStalenessSeconds: number;
  aiEnabled: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [duration, setDuration] = useState("15");
  const [prompt, setPrompt] = useState("");

  /**
   * Progress, because this call takes ~30 SECONDS of real provider time and the officer
   * previously had only a spinning button. Same shared component the AI poll console uses
   * — the phases below describe THIS pipeline (fetch the approved page → read a price →
   * run the source/duration/margin checks), and they advance on timers, so the bar stops
   * at the last stage and waits rather than creeping to 99% and lying. Ali, 2026-08-03.
   */
  const PHASES: AiPhase[] = [
    { key: "calling",    label: "Asking the AI to open the approved source…",        pct: 20 },
    { key: "reading",    label: "Reading the live price and its quote time…",        pct: 50, afterMs: 4000 },
    { key: "checking",   label: "Checking the source, duration and margin…",         pct: 78, afterMs: 9000 },
    { key: "finishing",  label: "Scoring the proposal and filing it for review…",    pct: 92, afterMs: 9000 },
  ];
  const gen = useAiPhases(PHASES);

  const chosen = assets.find((a) => a.id === assetId);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assetId) {
      toast({ title: "Choose an asset first", variant: "danger" });
      return;
    }
    const fd = new FormData();
    fd.set("assetId", assetId);
    fd.set("durationMinutes", duration);
    if (prompt.trim()) fd.set("prompt", prompt.trim());
    gen.start();
    start(async () => {
      const r = await generateProposalAction(fd);
      gen.finish();
      if (!r.ok) {
        toast({ title: "Could not generate a proposal", description: r.error, variant: "danger" });
        return;
      }
      setPrompt("");
      router.refresh();
      // The honest headline: a FILTERED result is the common case, not an error, and the
      // officer should not go looking for a bug when the page simply had no price on it.
      deferToast(
        r.state === "FILTERED" || r.state === "VALIDATION_FAILED"
          ? {
              title: "Generated, but it did not pass the checks",
              description: r.warn ?? "See the reasons in the queue. Most often the page shows no readable price.",
              variant: "warning",
            }
          : { title: "Proposal ready for review", description: "Check the source and the price it read before approving.", variant: "success" },
      );
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Asset">
          <Select
            value={assetId}
            onChange={setAssetId}
            ariaLabel="Asset to propose a chain for"
            size="sm"
            options={assets.map((a) => ({ value: a.id, label: `${a.key} · ${a.symbol}` }))}
          />
        </Field>
        <Field label="Round length">
          <Select
            value={duration}
            onChange={setDuration}
            ariaLabel="Round length in minutes"
            size="sm"
            options={DURATIONS.map((d) => ({ value: String(d), label: `${d} minutes` }))}
          />
        </Field>
        <Field label="Steer (optional)">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.currentTarget.value)}
            placeholder="e.g. prefer the page with a visible quote time"
            size="sm"
            maxLength={1000}
          />
        </Field>
      </div>

      {chosen && (
        <p className="text-body-sm leading-[1.55] text-text-subtle max-w-[80ch]">
          {/* E-47b — the AI does not read anything. It used to say "the AI may only read
              {chosen.sourceDomain} … it will report the price and quote time it actually finds
              there", which described 12 production generations that read nothing at all. */}
          The platform reads {chosen.key} from{" "}
          <span className="font-mono text-[11px]">{chosen.sourceDomain}</span> first — its own feed, the
          same way a live round does — and the AI then proposes the framing and the margin against that
          reading. If the feed cannot be read, you are told before any AI credit is spent. Margin
          defaults to <strong>{(defaultMarginBps / 100).toFixed(2)}%</strong> and the round window is{" "}
          <strong>{maxStalenessSeconds}s</strong> — you can change both before approving.
        </p>
      )}

      <Button type="submit" loading={pending} disabled={!aiEnabled || assets.length === 0} variant="primary" size="md">
        {aiEnabled ? "Ask the AI to propose" : "AI generation is off"}
      </Button>

      {/* ⛔ THE SAME BLOCKING OVERLAY THE POLL CONSOLE USES — one shell, one scrim, one
          blur, one card (Ali, 2026-08-03: pick the best and make it consistent). It is not
          decoration: it stops an officer double-firing a paid 30-second generation or
          navigating away mid-call. */}
      {gen.running && (
        <AiOverlayShell>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-block h-5 w-5 rounded-full border-2 border-brand-300 border-t-transparent animate-spin shrink-0" />
              <p className="font-display text-[15px] font-semibold text-text">
                Asking the AI to propose a chain
              </p>
            </div>
            <AiProgress
              phases={PHASES}
              active={gen.active}
              elapsed={gen.elapsed}
              note="The AI opens the asset's approved domain, reports the price and quote time it actually finds, and the proposal is then checked against the source allowlist, the 5-minute grid and the margin range. A page with no readable price is held back rather than armed."
            />
            {/* A generation still going at the last phase is not stuck — say so, rather
                than leaving the officer staring at a bar that has stopped moving. */}
            {gen.active === "finishing" && gen.elapsed > 45 && (
              <p className="text-body-sm leading-[1.55] text-warning-fg">
                Still working after {gen.elapsed}s. Web-search grounding can be slow on an
                awkward page — it will finish or fail on its own, and either way the result
                lands in the queue. Nothing is lost.
              </p>
            )}
          </div>
        </AiOverlayShell>
      )}
    </form>
  );
}

// ── Review: edit · approve · reject ─────────────────────────────────────────

export function ReviewActions({
  id, state, assetKey, durationMinutes, marginBps, sourceUrl, framingEn, framingSw, framingZh, reasoning, blockingReasons,
}: {
  id: string;
  state: string;
  assetKey: string;
  durationMinutes: number;
  marginBps: number;
  sourceUrl: string;
  framingEn: string;
  framingSw: string;
  framingZh: string;
  reasoning: string;
  blockingReasons: string[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  // Local edit state, seeded from the proposal. Dirty tracking so Save is meaningful.
  const [dur, setDur] = useState(String(durationMinutes));
  const [pct, setPct] = useState((marginBps / 100).toFixed(2));
  const [en, setEn] = useState(framingEn);
  const [sw, setSw] = useState(framingSw);
  const [zh, setZh] = useState(framingZh);
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);

  const dirty =
    dur !== String(durationMinutes) || pct !== (marginBps / 100).toFixed(2) ||
    en !== framingEn || sw !== framingSw || zh !== framingZh;

  // Client-side validation, so an obvious mistake is caught before a round trip. The server
  // re-checks everything — this is courtesy, never the gate.
  const pctNum = Number(pct);
  // E-50 · no source validation here any more, because the source is no longer editable
  // here. It is validated where it is SET — the asset form, against the trusted-source
  // allowlist, on add, on enable, and again on every chain start.
  const localError =
    !Number.isFinite(pctNum) || pctNum < 0 || pctNum > 20 ? "Margin must be between 0 and 20%."
    : en.trim() === "" ? "English framing cannot be empty."
    : sw.trim() === "" ? "Swahili framing cannot be empty."
    : null;

  const save = () => {
    if (localError) { toast({ title: "Fix this first", description: localError, variant: "danger" }); return; }
    const fd = new FormData();
    fd.set("id", id);
    fd.set("durationMinutes", dur);
    fd.set("marginPct", pct);
    fd.set("framingEn", en.trim());
    fd.set("framingSw", sw.trim());
    fd.set("framingZh", zh.trim());
    start(async () => {
      const r = await editProposalAction(fd);
      if (!r.ok) { toast({ title: "Could not save", description: r.error, variant: "danger" }); return; }
      setOpen(false);
      router.refresh();
      // E-50 · the "the link changed…" branch is gone with the field. It could only ever
      // fire AFTER the officer had already made the change it was warning them off.
      deferToast({
        title: "Proposal updated",
        description: r.warn,
        variant: r.warn ? "warning" : "success",
      });
    });
  };

  const approve = () => {
    const fd = new FormData();
    fd.set("id", id);
    if (note.trim()) fd.set("note", note.trim());
    start(async () => {
      const r = await approveProposalAction(fd);
      if (!r.ok) { toast({ title: "Could not approve", description: r.error, variant: "danger" }); return; }
      setOpen(false);
      router.refresh();
      deferToast({ title: "Approved", description: "Arm it when you are ready to start the chain.", variant: "success" });
    });
  };

  const reject = () => {
    if (reasons.length === 0) {
      toast({ title: "Choose at least one reason", description: "Rejections are counted, so they need a reason.", variant: "danger" });
      return;
    }
    const fd = new FormData();
    fd.set("id", id);
    for (const r of reasons) fd.append("reasons", r);
    if (note.trim()) fd.set("note", note.trim());
    start(async () => {
      const r = await rejectProposalAction(fd);
      if (!r.ok) { toast({ title: "Could not reject", description: r.error, variant: "danger" }); return; }
      setRejectOpen(false);
      setReasons([]);
      router.refresh();
      deferToast({ title: "Rejected", variant: "success" });
    });
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} variant="ghost" size="sm">Review</Button>
      <button
        type="button"
        onClick={() => setRejectOpen(true)}
        className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-subtle hover:text-no-300 transition-colors px-2 py-1"
      >
        Reject
      </button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        labelledBy={`review-title-${id}`}
        maxWidth={620}
        closeOnScrim={!pending}
      >
        <div className="space-y-3">
          <h2 id={`review-title-${id}`} className="font-display text-[16px] font-semibold text-text">
            Review · {assetKey} {durationMinutes}m
          </h2>
          {blockingReasons.length > 0 && (
            <div className="rounded-lg border border-warning-border bg-warning-bg p-3 text-body-sm leading-[1.55] text-warning-fg">
              <strong>This cannot be approved yet:</strong>
              <ul className="mt-1 space-y-0.5">
                {blockingReasons.map((r) => <li key={r}>· {r}</li>)}
              </ul>
              <p className="mt-1.5">
                Fix it here, or reject and regenerate. A proposal whose page shows no readable price
                cannot be armed at all — that is the check working, not a bug.
              </p>
            </div>
          )}

          {reasoning && (
            <div className="rounded-lg border border-border bg-[var(--bg-inset)] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">What the AI said</p>
              <p className="text-body-sm leading-[1.6] text-text-secondary whitespace-pre-wrap">{reasoning}</p>
            </div>
          )}

          {/* E-50 · READ-ONLY. Editing this was a guaranteed dead end and the form knew it:
              it let the officer type a new link, saved it, and only THEN explained that the
              price could not be re-read for a link the asset does not point at, so the
              proposal would never arm. An input whose every successful use ends in a
              warning is not a control, it is a trap.
              ⛔ The source is a property of the ASSET, not of a proposal, and E-46 already
              made the asset form the single guarded door — it re-validates against the
              trusted-source allowlist on add, on enable and on every chain start. Offering
              a second, unguarded way to set the same value is exactly the "one control, one
              place" rule this platform is built on. So: show it, name where it lives. */}
          <Field
            label="Source link"
            hint="Set on the asset, not here — every round on this chain captures the asset's link at open and resolves against that captured copy. Change it under Up & Down → Overview → Edit asset, where it is re-checked against the trusted-source allowlist, then regenerate this proposal."
          >
            <p className="m-0 break-all rounded-md border border-border bg-bg-inset px-2.5 py-2 font-mono text-[11px] text-text-muted">
              {sourceUrl || "—"}
            </p>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Round length">
              <Select
                value={dur}
                onChange={setDur}
                ariaLabel="Round length"
                size="sm"
                options={DURATIONS.map((d) => ({ value: String(d), label: `${d} minutes` }))}
              />
            </Field>
            <Field label="Margin (%)" hint="UP wins at open + margin, DOWN at open − margin; between the two the round voids and refunds.">
              <Input value={pct} onChange={(e) => setPct(e.currentTarget.value)} type="number" step="0.01" min="0" max="20" size="sm" />
            </Field>
          </div>

          <Field label="Framing · English"><Input value={en} onChange={(e) => setEn(e.currentTarget.value)} size="sm" maxLength={300} /></Field>
          <Field label="Framing · Swahili"><Input value={sw} onChange={(e) => setSw(e.currentTarget.value)} size="sm" maxLength={300} /></Field>
          <Field label="Framing · Chinese"><Input value={zh} onChange={(e) => setZh(e.currentTarget.value)} size="sm" maxLength={300} /></Field>

          <Field label="Note (optional)" hint="Kept on the record with your name.">
            <Textarea value={note} onChange={(e) => setNote(e.currentTarget.value)} rows={2} maxLength={500} />
          </Field>

          {localError && (
            // `text-danger-fg` — see EvidencePanel above; `hot-rose` never rendered,
            // so this validation error looked like ordinary hint text.
            <p className="text-body-sm text-danger-fg">{localError}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" onClick={save} loading={pending} disabled={!dirty || !!localError} variant="ghost" size="md">
              {dirty ? "Save changes" : "No changes"}
            </Button>
            <Button
              type="button"
              onClick={approve}
              loading={pending}
              disabled={dirty || blockingReasons.length > 0 || state === "APPROVED"}
              variant="primary"
              size="md"
            >
              {state === "APPROVED" ? "Already approved" : "Approve"}
            </Button>
            {dirty && (
              <span className="text-body-sm text-text-subtle">Save your changes before approving.</span>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => !pending && setRejectOpen(false)}
        labelledBy={`reject-title-${id}`}
        maxWidth={460}
        closeOnScrim={!pending}
      >
        <div className="space-y-3">
          <h2 id={`reject-title-${id}`} className="font-display text-[16px] font-semibold text-text">
            Reject · {assetKey} {durationMinutes}m
          </h2>
          <p className="text-body-sm leading-[1.6] text-text-secondary">
            Pick every reason that applies. These are counted, so they tell us which sources and
            framings the AI keeps getting wrong.
          </p>
          <div className="space-y-1.5">
            {REJECT_OPTIONS.map((o) => (
              <Checkbox
                key={o.value}
                checked={reasons.includes(o.value)}
                onChange={(next) =>
                  setReasons((prev) => next ? [...prev, o.value] : prev.filter((r) => r !== o.value))
                }
                label={o.label}
              />
            ))}
          </div>
          <Field label="Note (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.currentTarget.value)} rows={2} maxLength={500} />
          </Field>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={reject} loading={pending} disabled={reasons.length === 0} variant="danger" size="md">
              Reject proposal
            </Button>
            <Button type="button" onClick={() => setRejectOpen(false)} variant="ghost" size="md">Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Arm ─────────────────────────────────────────────────────────────────────

/**
 * The terminal act. The dialog states everything that is about to change, and when the
 * proposal moves the asset's source it shows BOTH links — the one every existing round was
 * sold on, and the one every future round will be.
 */
export function ArmAction({
  id, assetKey, durationMinutes, marginBps, sourceUrl, sourceChanges, currentAssetSource,
}: {
  id: string;
  assetKey: string;
  durationMinutes: number;
  marginBps: number;
  sourceUrl: string;
  sourceChanges: boolean;
  currentAssetSource: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);

  const arm = () => {
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      const r = await armProposalAction(fd);
      setOpen(false);
      if (!r.ok) {
        // Verbatim — the service names the unresolved rounds, the money at risk and the way
        // out. That is the whole message an officer needs.
        toast({ title: "Could not arm the chain", description: r.error, variant: "danger" });
        return;
      }
      router.refresh();
      deferToast({
        title: `${assetKey} ${durationMinutes}m is live`,
        description: "It will open its first round at the next grid boundary and capture this source link.",
        variant: "success",
      });
    });
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} variant="primary" size="sm">Arm</Button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={arm}
        title={`Start ${assetKey} ${durationMinutes}m?`}
        tone="claret"
        tier="hard"
        typedWord="ARM"
        confirmLabel="Arm the chain"
        body={
          <>
            <p>
              This starts a <strong>real-money chain</strong>. It will open a {durationMinutes}-minute
              round at every grid boundary, at a <strong>{(marginBps / 100).toFixed(2)}%</strong> margin,
              until you pause it.
            </p>
            {sourceChanges ? (
              <>
                <p className="mt-2">
                  <strong>It also moves {assetKey}&rsquo;s price source.</strong> Every round opened from
                  now on captures the new link and resolves against it:
                </p>
                <p className="mt-1 font-mono text-[10.5px] break-all text-text-subtle">
                  from {currentAssetSource || "(none)"}
                </p>
                <p className="font-mono text-[10.5px] break-all text-text">
                  to {sourceUrl}
                </p>
                <p className="mt-2">
                  If any round on {assetKey} is still unresolved, this will be refused — those rounds
                  were sold on the old link and must settle against it first.
                </p>
              </>
            ) : (
              <p className="mt-2 font-mono text-[10.5px] break-all text-text-subtle">
                Source (unchanged): {sourceUrl}
              </p>
            )}
          </>
        }
      />
    </>
  );
}

// ── Delete ──────────────────────────────────────────────────────────────────

/** ⚠️ Only ever rendered for a proposal that is NOT `ARMED` — the queue gates it —
 *  which is what makes the modal's "has never opened a round" true. It no longer
 *  takes the state as a prop because it no longer prints it; the gate is the
 *  caller's, and it is stated at the call site. */
export function DeleteProposalAction({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);

  const del = () => {
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      const r = await deleteProposalAction(fd);
      setOpen(false);
      if (!r.ok) { toast({ title: "Could not delete", description: r.error, variant: "danger" }); return; }
      router.refresh();
      deferToast({ title: "Proposal deleted", variant: "success" });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-subtle hover:text-no-300 transition-colors px-2 py-1"
      >
        Delete
      </button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={del}
        title="Delete this proposal?"
        tone="claret"
        confirmLabel="Delete"
        body={
          /* §L3 — the state enum used to be interpolated here ("a validation failed
             proposal"), and its `replace` had no `/g`, so a two-underscore state
             would have kept the second underscore. The state was never the point:
             the delete control is only rendered for a proposal that is NOT armed,
             so "has never opened a round" is true of every proposal that can reach
             this modal, and saying it plainly is both shorter and honest. */
          <p>
            It is removed from the queue along with its record of what the feed returned. Nothing that is
            live is affected — this proposal has never opened a round.
          </p>
        }
      />
    </>
  );
}
