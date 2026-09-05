"use client";

/**
 * ADM2 — Resolution Ceremony verdict rail (client).
 *
 * The interactive half of /admin/resolver/[id]. Two acts:
 *  - Stage 1 (no money moves): the first officer selects the verdict, declares
 *    the evidence excerpt, and records the attestation.
 *  - Stage 2 (irreversible — settles + pays): the SECOND officer countersigns.
 *    A self-countersign is blocked (B ≠ A), and the seal is the hard confirm
 *    tier — the officer must type the word SEAL to arm the publish button.
 *
 * All settlement flows through the existing, money-tested `resolveMarketAction`;
 * this component adds the ceremony gate + the evidence field, nothing else.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { UnsavedChangesGuard, PendingChangesBar } from "@/components/ui/unsaved-changes";
import { Select } from "@/components/ui/select";
import { resolveMarketAction } from "@/app/markets/actions";
import { BrandSpinner } from "@/components/brand";
import { formatDateTime } from "@/lib/utils";
import { CEREMONY, bi } from "@/lib/admin-status-lexicon";
import { AttestationRail } from "@/components/admin/attestation-rail";
import { runAdminAction } from "@/lib/client/run-admin-action";

type Outcome = "YES" | "NO" | "VOID";

const VOID_REASONS = [
  { value: "source_silent", label: "Official source unavailable / silent" },
  { value: "ambiguous", label: "Outcome ambiguous / unverifiable" },
  { value: "event_cancelled", label: "Underlying event cancelled / postponed" },
  { value: "criterion_flawed", label: "Resolution criterion flawed" },
  { value: "other", label: "Other (explain in evidence)" },
];

const VERDICTS: { value: Outcome; label: string; sw: string; ring: string; text: string }[] = [
  { value: "YES", label: "YES", sw: "NDIO", ring: "var(--yes-500)", text: "var(--yes-300)" },
  { value: "NO", label: "NO", sw: "HAPANA", ring: "var(--no-500)", text: "var(--no-300)" },
  { value: "VOID", label: "VOID", sw: "BATILISHA", ring: "var(--claret-edge)", text: "var(--claret-300)" },
];

export function ResolutionCeremony({
  marketId,
  stage,
  stagedOutcome,
  isSelfCountersign,
  twoAdmin,
  objectionWindowHours,
}: {
  marketId: string;
  stage: "stage1" | "stage2";
  stagedOutcome: Outcome | null;
  isSelfCountersign: boolean;
  /** false (default) = single admin seals in one act; true = two-officer ceremony. */
  twoAdmin: boolean;
  /** The window in force, read from live config by the page. 0 = the seal pays immediately,
   *  and the copy says so rather than promising a hold that will not happen. */
  objectionWindowHours: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  /* ⛔ ONE HOME FOR THE OPENING VERDICT — the field's seed and the "has this been touched?"
     comparison read the same expression. Written twice, a change to the stage-2 seed would make
     the ceremony open already claiming unsaved work. */
  const initialVerdict = stage === "stage2" ? stagedOutcome : null;
  const [verdict, setVerdict] = useState<Outcome | null>(initialVerdict);
  const [evidence, setEvidence] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [sealText, setSealText] = useState("");

  /**
   * ⛔ THE EVIDENCE EXCERPT IS THE WORK, and it is the one field here nobody can retype from
   * memory: it is a quote pasted out of an official source, up to 2,000 characters, and it is
   * what a regulator reads back. `sealText` is deliberately NOT counted — "SEAL" is an arming
   * word, not work, and a guard that fired on it would interrupt an officer for four letters
   * they can retype in a second, on the most safety-critical screen in the console.
   */
  const typedWork = verdict !== initialVerdict || evidence.trim().length > 0 || voidReason !== "";
  const discardWork = () => { setVerdict(initialVerdict); setEvidence(""); setVoidReason(""); };

  const fire = (outcome: Outcome, evidenceText: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("outcome", outcome);
      if (evidenceText.trim()) fd.set("evidence", evidenceText.trim());
      const r = await runAdminAction(() => resolveMarketAction(fd));
      if (!r.ok) {
        toast({ title: "Could not resolve", description: r.error, variant: "danger" });
        return;
      }
      if (r.data?.stage === "stage1") {
        toast({ title: "Stage 1 attested", description: "Awaiting a second officer to seal.", variant: "warning" });
      } else {
        // The seal records the verdict; it does not move money. Settlement waits
        // for the objection window to close with no objection standing.
        const detail = r.data?.settlesAt
          ? `Pays out ${formatDateTime(r.data.settlesAt)}, unless a player objects`
          : "Pays out on the next settlement sweep";
        toast({ title: `Verdict sealed · ${outcome}`, description: detail, variant: "success" });
      }
      setSealText("");
      router.refresh();
    });
  };

  if (pending) {
    return (
      <div className="flex items-center justify-center gap-3 py-6">
        <BrandSpinner size={36} />
        <span className="font-mono text-label uppercase tracking-[0.16em] text-text-muted">
          Recording attestation…
        </span>
      </div>
    );
  }

  // ── SINGLE-ADMIN (default) — one officer resolves + seals in ONE action ─────
  // Two-admin authorization is OFF, so there is no stage-1/stage-2 split: pick the
  // verdict, declare the evidence, type SEAL, and the market is sealed in one call
  // (resolveMarket returns "complete"). No second officer, no self-countersign block.
  if (!twoAdmin) {
    const composedEvidence =
      verdict === "VOID" && voidReason
        ? `[void reason: ${VOID_REASONS.find((r) => r.value === voidReason)?.label ?? voidReason}] ${evidence}`.trim()
        : evidence;
    const sealed = sealText.trim().toUpperCase() === "SEAL";
    const canSeal = !!verdict && (verdict !== "VOID" || !!voidReason) && sealed;
    return (
      <div className="space-y-4">
        <VerdictCards value={verdict} onChange={(v) => { setVerdict(v); if (v !== "VOID") setVoidReason(""); }} />

        {verdict === "VOID" && (
          <label className="block">
            <span className="mb-1 block font-mono text-micro uppercase eyebrow text-claret-300">
              Void reason · Sababu ya kubatilisha <span className="text-claret-300">*</span>
            </span>
            <Select
              value={voidReason}
              onChange={setVoidReason}
              ariaLabel="Void reason"
              placeholder="Select a reason…"
              size="sm"
              options={VOID_REASONS.map((r) => ({ value: r.value, label: r.label }))}
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 font-mono text-micro uppercase eyebrow text-text-subtle">
            <I.fileText s={12} /> {bi(CEREMONY.evidenceExcerpt)}
          </span>
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Paste the exact quote from the official source that settles this market…"
            className="w-full rounded-md border border-border bg-bg-overlay px-3 py-2 text-body-sm leading-relaxed text-text admin-focus resize-y placeholder:text-text-subtle"
          />
          <span className="mt-0.5 block text-right font-mono text-[10px] text-text-subtle">{evidence.length}/2000</span>
        </label>

        {/* 🔴 DG-A-14 · this is an IMPERATIVE, not a label, and it was the least legible
            text in the ceremony: "Type SEAL to publish" is verb + object + purpose clause, and
            the Swahili half is imperative too. At `text-micro` uppercase it rendered as ~258px
            of tracked capitals 2.5px under §T4's reading floor — the arming instruction for an
            IRREVERSIBLE real-money settlement. Dressing dropped, `text-body-sm` (13px).
            ⚠️ It also hand-typed `tracking-[0.16em] font-bold` while every other label in this
            file carries `.eyebrow` — the exact 0.16em drift §T3 removed on 2026-08-30. */}
        <label className="block">
          <span className="mb-1 block font-mono text-body-sm font-bold text-claret-300">
            Type SEAL to publish · Andika SEAL
          </span>
          <input
            value={sealText}
            onChange={(e) => setSealText(e.target.value)}
            placeholder="SEAL"
            autoComplete="off"
            spellCheck={false}
            /* ⚠️ LITERAL, not `h-10` — spacing is overridden (tailwind.config.ts:200-215) so
               `h-10` was an 80px field on the two-officer settlement gate. 44px = --h-input. */
            className="h-[44px] w-full rounded-md border border-claret-edge bg-bg-overlay px-3 font-mono text-body tracking-[0.3em] uppercase text-text admin-focus placeholder:tracking-[0.3em] placeholder:text-text-subtle"
          />
        </label>

        <button
          type="button"
          disabled={!canSeal}
          onClick={() => verdict && fire(verdict, composedEvidence)}
          className="btn btn-claret btn-lg w-full disabled:opacity-40"
        >
          <I.shieldcheck s={16} /> Resolve &amp; seal{verdict ? ` ${verdict}` : ""}
        </button>
        <p className="text-center font-mono text-[10px] text-text-subtle">
          {sealed ? "Armed — this seals the verdict (single-admin authorization)." : "Type SEAL to arm. One officer seals; winners are paid after the objection window."}
        </p>

        {/* ⛔ THIS IS THE DEFAULT BRANCH, AND IT WAS ALMOST THE ONE LEFT OUT. Two-admin
            authorization ships OFF, so `!twoAdmin` is the ceremony an officer actually sees —
            covering only the stage-1/stage-2 pair below would have guarded the two paths that
            are switched off and left the live one bare. Three returns, three pairs. */}
        <PendingChangesBar
          dirty={typedWork}
          label="Verdict not sealed"
          detail="The verdict and evidence excerpt are held in this page only."
          onDiscard={discardWork}
        />
        <UnsavedChangesGuard
          dirty={typedWork}
          body="A verdict and evidence have been entered but the market was not resolved. Leaving now discards them."
        />
      </div>
    );
  }

  // ── Stage 1 — first officer stages the verdict + declares evidence ──────────
  if (stage === "stage1") {
    const composedEvidence =
      verdict === "VOID" && voidReason
        ? `[void reason: ${VOID_REASONS.find((r) => r.value === voidReason)?.label ?? voidReason}] ${evidence}`.trim()
        : evidence;
    const canSubmit = !!verdict && (verdict !== "VOID" || !!voidReason);
    return (
      <div className="space-y-4">
        <VerdictCards value={verdict} onChange={(v) => { setVerdict(v); if (v !== "VOID") setVoidReason(""); }} />

        {verdict === "VOID" && (
          <label className="block">
            <span className="mb-1 block font-mono text-micro uppercase eyebrow text-claret-300">
              Void reason · Sababu ya kubatilisha <span className="text-claret-300">*</span>
            </span>
            <Select
              value={voidReason}
              onChange={setVoidReason}
              ariaLabel="Void reason"
              placeholder="Select a reason…"
              size="sm"
              options={VOID_REASONS.map((r) => ({ value: r.value, label: r.label }))}
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 font-mono text-micro uppercase eyebrow text-text-subtle">
            <I.fileText s={12} /> {bi(CEREMONY.evidenceExcerpt)}
          </span>
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Paste the exact quote from the official source that settles this market…"
            className="w-full rounded-md border border-border bg-bg-overlay px-3 py-2 text-body-sm leading-relaxed text-text admin-focus resize-y placeholder:text-text-subtle"
          />
          <span className="mt-0.5 block text-right font-mono text-[10px] text-text-subtle">{evidence.length}/2000</span>
        </label>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => verdict && fire(verdict, composedEvidence)}
          className="btn btn-primary btn-md w-full disabled:opacity-40"
        >
          <I.shieldcheck s={15} /> Record Stage-1 attestation
        </button>
        <p className="text-center font-mono text-[10px] text-text-subtle">
          Staging moves no money. A second officer must seal to settle.
        </p>

        <PendingChangesBar
          dirty={typedWork}
          label="Attestation not recorded"
          detail="The verdict and evidence excerpt are held in this page only."
          saveLabel="Record Stage-1"
          onSave={canSubmit && verdict ? () => fire(verdict, composedEvidence) : undefined}
          onDiscard={discardWork}
        />
        <UnsavedChangesGuard
          dirty={typedWork}
          body="A verdict and evidence have been entered but no attestation was recorded. Leaving now discards them."
        />
      </div>
    );
  }

  // ── Stage 2 — second officer countersigns + seals (irreversible) ────────────
  const sealed = sealText.trim().toUpperCase() === "SEAL";
  const canSeal = !isSelfCountersign && sealed && !!stagedOutcome;
  const verdictMeta = VERDICTS.find((v) => v.value === stagedOutcome);
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-bg-overlay p-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-micro uppercase eyebrow text-text-subtle">Staged verdict</span>
          <span className="font-mono text-[14px] font-bold" style={{ color: verdictMeta?.text }}>
            {stagedOutcome}{verdictMeta?.sw ? ` · ${verdictMeta.sw}` : ""}
          </span>
          <span className="ml-auto font-mono text-[10px] text-text-subtle">seal to publish</span>
        </div>
        {/* 🔴 THE WHOLE SENTENCE WAS REWRITTEN, NOT RENUMBERED. It read "Sealing credits every
            winning wallet, closes every losing position, starts the 24-hour objection window" —
            and the first two clauses have been FALSE since F11 made the window a real gate.
            Sealing pays nobody: `resolveMarket` moves no money, leaves every position OPEN and
            stamps `settledAt: null`; the settle timer pays later. Interpolating the hours into
            a false money sentence would have kept the false money sentence and made it look
            freshly checked. The model is `bulk-resolve-bar.tsx`, which has always said it
            correctly — and, like that one, this states what happens when the window is 0. */}
        <p className="mt-2 text-body-sm leading-relaxed text-text-muted">
          {objectionWindowHours > 0 ? (
            <>
              Sealing RECORDS the verdict and writes an immutable audit entry.{" "}
              <strong className="text-text">No money moves yet</strong> — the pool stays whole and
              every position stays open for a {objectionWindowHours}-hour objection window, and
              winners are paid automatically once it closes with nothing standing. An upheld
              objection can still change the outcome until then.
            </>
          ) : (
            <>
              Sealing records the verdict AND PAYS, immediately: the objection window is
              configured to 0 hours, so there is no window to object in.{" "}
              <strong className="text-text">This is final.</strong>
            </>
          )}
        </p>
      </div>

      {isSelfCountersign ? (
        <AttestationRail tone="blocked" title={CEREMONY.secondOfficerRequired}>
          You staged this verdict at Stage 1. A different officer must countersign to seal it — the
          two-officer rule forbids a single officer from settling a market alone.
        </AttestationRail>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 font-mono text-micro uppercase eyebrow text-text-subtle">
              <I.fileText s={12} /> Countersign note · Optional
            </span>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Optional: note what you independently verified before sealing…"
              className="w-full rounded-md border border-border bg-bg-overlay px-3 py-2 text-body-sm leading-relaxed text-text admin-focus resize-y placeholder:text-text-subtle"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-mono text-body-sm font-bold text-claret-300">
              Type SEAL to publish · Andika SEAL
            </span>
            <input
              value={sealText}
              onChange={(e) => setSealText(e.target.value)}
              placeholder="SEAL"
              autoComplete="off"
              spellCheck={false}
              /* ⚠️ LITERAL, not `h-10` (80px on the overridden scale) — see the twin above.
                 Both confirmation fields must stay the same height. */
              className="h-[44px] w-full rounded-md border border-claret-edge bg-bg-overlay px-3 font-mono text-body tracking-[0.3em] uppercase text-text admin-focus placeholder:tracking-[0.3em] placeholder:text-text-subtle"
            />
          </label>

          <button
            type="button"
            disabled={!canSeal}
            onClick={() => stagedOutcome && fire(stagedOutcome, evidence)}
            className="btn btn-claret btn-lg w-full disabled:opacity-40"
          >
            <I.shieldcheck s={16} /> Seal &amp; publish {stagedOutcome}
          </button>
          <p className="text-center font-mono text-[10px] text-text-subtle">
            {sealed ? "Armed — this action is irreversible." : "Type SEAL above to arm the publish button."}
          </p>
        </>
      )}

      {/* ⭐ THE SAME PAIR IN BOTH STAGES. The second officer edits the same evidence excerpt,
          and the stage-2 tree is a separate `return` — so the surfaces are rendered again here
          rather than hoisted, which would mean restructuring a settlement ceremony to satisfy
          a warning. `onSave` is omitted: sealing is irreversible and is armed by typing SEAL. */}
      <PendingChangesBar
        dirty={typedWork}
        label="Evidence not sealed"
        detail="Nothing is published until the verdict is sealed below."
        onDiscard={discardWork}
      />
      <UnsavedChangesGuard
        dirty={typedWork}
        body="Evidence has been entered for this settlement but nothing was sealed. Leaving now discards it."
      />
    </div>
  );
}

function VerdictCards({ value, onChange }: { value: Outcome | null; onChange: (v: Outcome) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {VERDICTS.map((v) => {
        const active = value === v.value;
        return (
          <button
            key={v.value}
            type="button"
            onClick={() => onChange(v.value)}
            aria-pressed={active}
            className="min-h-[var(--tap-min)] rounded-lg border-2 p-3 text-center transition-colors"
            style={{
              borderColor: active ? v.ring : "var(--border)",
              background: active ? `color-mix(in oklab, ${v.ring} 12%, transparent)` : "transparent",
            }}
          >
            <div className="font-display text-[16px] font-bold" style={{ color: active ? v.text : "var(--text)" }}>
              {v.label}
            </div>
            <div className="font-mono text-micro uppercase tracking-[0.14em] text-text-subtle">{v.sw}</div>
          </button>
        );
      })}
    </div>
  );
}
