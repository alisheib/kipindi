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

const DURATIONS = [5, 15, 30] as const;

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
      {hint && <span className="mt-1 block text-[10.5px] leading-snug text-text-subtle">{hint}</span>}
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
  observedPrice, observedQuotedAt, decimals, maxStalenessSeconds,
}: {
  observedPrice: number | null;
  observedQuotedAt: string | null;
  decimals: number;
  maxStalenessSeconds: number;
}) {
  if (observedPrice == null || !observedQuotedAt) {
    return (
      <div className="text-[10.5px] leading-snug text-hot-rose-300">
        <span className="font-mono text-[13px] font-bold">—</span>
        <div>nothing readable on that page</div>
      </div>
    );
  }
  const ageSec = Math.round((Date.now() - new Date(observedQuotedAt).getTime()) / 1000);
  const stale = ageSec > maxStalenessSeconds;
  return (
    <div className="text-[10.5px] leading-snug">
      <span className="font-mono text-[13px] font-bold tabular-nums text-text">
        ${observedPrice.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      </span>
      <div className={stale ? "text-warning-fg" : "text-text-subtle"}>
        quoted {ageSec < 120 ? `${ageSec}s` : ageSec < 7200 ? `${Math.round(ageSec / 60)}m` : `${Math.round(ageSec / 3600)}h`} before we read it
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
    start(async () => {
      const r = await generateProposalAction(fd);
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
        <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
          The AI may only read <span className="font-mono text-[11px]">{chosen.sourceDomain}</span> — the domain
          you approved for {chosen.key}. It will report the price and quote time it actually finds there;
          a page with no readable price is held back rather than armed. Margin defaults to{" "}
          <strong>{(defaultMarginBps / 100).toFixed(2)}%</strong> and the round window is{" "}
          <strong>{maxStalenessSeconds}s</strong> — you can change both before approving.
        </p>
      )}

      <Button type="submit" loading={pending} disabled={!aiEnabled || assets.length === 0} variant="primary" size="md">
        {aiEnabled ? "Ask the AI to propose" : "AI generation is off"}
      </Button>
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
  const [url, setUrl] = useState(sourceUrl);
  const [en, setEn] = useState(framingEn);
  const [sw, setSw] = useState(framingSw);
  const [zh, setZh] = useState(framingZh);
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);

  const dirty =
    dur !== String(durationMinutes) || pct !== (marginBps / 100).toFixed(2) ||
    url !== sourceUrl || en !== framingEn || sw !== framingSw || zh !== framingZh;

  // Client-side validation, so an obvious mistake is caught before a round trip. The server
  // re-checks everything — this is courtesy, never the gate.
  const pctNum = Number(pct);
  const urlValid = url.trim() === "" || /^https?:\/\/.+\..+/.test(url.trim());
  const localError =
    !urlValid ? "The source must be a full http(s) link."
    : !Number.isFinite(pctNum) || pctNum < 0 || pctNum > 20 ? "Margin must be between 0 and 20%."
    : en.trim() === "" ? "English framing cannot be empty."
    : sw.trim() === "" ? "Swahili framing cannot be empty."
    : null;

  const save = () => {
    if (localError) { toast({ title: "Fix this first", description: localError, variant: "danger" }); return; }
    const fd = new FormData();
    fd.set("id", id);
    fd.set("durationMinutes", dur);
    fd.set("marginPct", pct);
    fd.set("sourceUrl", url.trim());
    fd.set("framingEn", en.trim());
    fd.set("framingSw", sw.trim());
    fd.set("framingZh", zh.trim());
    start(async () => {
      const r = await editProposalAction(fd);
      if (!r.ok) { toast({ title: "Could not save", description: r.error, variant: "danger" }); return; }
      setOpen(false);
      router.refresh();
      deferToast({
        title: "Proposal updated",
        description: r.warn ?? (url.trim() !== sourceUrl
          ? "The link changed, so the price the AI read no longer applies — regenerate or check the new page yourself."
          : undefined),
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
            <div className="rounded-lg border border-warning-border bg-warning-bg p-3 text-[11.5px] leading-[1.55] text-warning-fg">
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
              <p className="text-[11.5px] leading-[1.6] text-text-secondary whitespace-pre-wrap">{reasoning}</p>
            </div>
          )}

          <Field
            label="Source link"
            hint="Every round on this chain captures this link at open and resolves against the captured copy. Changing it clears the price the AI read, because it read the old page."
          >
            <Input value={url} onChange={(e) => setUrl(e.currentTarget.value)} size="sm" placeholder="https://…" />
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
            <p className="text-[11.5px] text-hot-rose-300">{localError}</p>
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
              <span className="text-[10.5px] text-text-subtle">Save your changes before approving.</span>
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
          <p className="text-[12px] leading-[1.6] text-text-secondary">
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

export function DeleteProposalAction({ id, state }: { id: string; state: string }) {
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
          <p>
            It is removed from the queue along with its record of what the AI read. Nothing that is
            live is affected — a {state.toLowerCase().replace("_", " ")} proposal has never opened a
            round.
          </p>
        }
      />
    </>
  );
}
