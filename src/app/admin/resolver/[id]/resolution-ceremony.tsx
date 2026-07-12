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
import { resolveMarketAction } from "@/app/markets/actions";
import { BrandSpinner } from "@/components/brand";
import { formatTzs } from "@/lib/utils";

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
}: {
  marketId: string;
  stage: "stage1" | "stage2";
  stagedOutcome: Outcome | null;
  isSelfCountersign: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const [verdict, setVerdict] = useState<Outcome | null>(stage === "stage2" ? stagedOutcome : null);
  const [evidence, setEvidence] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [sealText, setSealText] = useState("");

  const fire = (outcome: Outcome, evidenceText: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("outcome", outcome);
      if (evidenceText.trim()) fd.set("evidence", evidenceText.trim());
      const r = await resolveMarketAction(fd);
      if (!r.ok) {
        toast({ title: "Could not resolve", description: r.error, variant: "danger" });
        return;
      }
      if (r.data?.stage === "stage1") {
        toast({ title: "Stage 1 attested", description: "Awaiting a second officer to seal.", variant: "warning" });
      } else {
        const detail = r.data?.winnersPaid
          ? `Paid ${formatTzs(r.data.winnersPaid)} to winners`
          : "Voided · every stake refunded";
        toast({ title: `Sealed · ${outcome}`, description: detail, variant: "success" });
      }
      setSealText("");
      router.refresh();
    });
  };

  if (pending) {
    return (
      <div className="flex items-center justify-center gap-3 py-6">
        <BrandSpinner size={36} />
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-text-muted">
          Recording attestation…
        </span>
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
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-claret-300">
              Void reason · Sababu ya kubatilisha <span className="text-claret-300">*</span>
            </span>
            <select
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="h-9 w-full rounded-md border border-claret-edge bg-bg-overlay px-2.5 text-[12.5px] text-text admin-focus"
            >
              <option value="">Select a reason…</option>
              {VOID_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
            <I.fileText s={12} /> Evidence excerpt · Ushahidi
          </span>
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Paste the exact quote from the official source that settles this market…"
            className="w-full rounded-md border border-border bg-bg-overlay px-3 py-2 text-[12.5px] leading-relaxed text-text admin-focus resize-y placeholder:text-text-subtle"
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
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Staged verdict</span>
          <span className="font-mono text-[14px] font-bold" style={{ color: verdictMeta?.text }}>
            {stagedOutcome}{verdictMeta?.sw ? ` · ${verdictMeta.sw}` : ""}
          </span>
          <span className="ml-auto font-mono text-[10px] text-text-subtle">seal to publish</span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-text-muted">
          Sealing credits every winning wallet, closes every losing position, starts the 24-hour objection
          window, and writes an immutable audit entry. <strong className="text-text">This is final.</strong>
        </p>
      </div>

      {isSelfCountersign ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-claret-edge bg-claret-soft px-3.5 py-3">
          <I.alertCircle s={16} className="mt-0.5 shrink-0 text-claret-300" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-claret-300">
              Second officer required · Afisa wa pili anahitajika
            </p>
            <p className="mt-0.5 text-[12px] text-text-muted">
              You staged this verdict at Stage 1. A different officer must countersign to seal it — the
              two-officer rule forbids a single officer from settling a market alone.
            </p>
          </div>
        </div>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              <I.fileText s={12} /> Countersign note · Optional
            </span>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Optional: note what you independently verified before sealing…"
              className="w-full rounded-md border border-border bg-bg-overlay px-3 py-2 text-[12.5px] leading-relaxed text-text admin-focus resize-y placeholder:text-text-subtle"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-claret-300">
              Type SEAL to publish · Andika SEAL
            </span>
            <input
              value={sealText}
              onChange={(e) => setSealText(e.target.value)}
              placeholder="SEAL"
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-md border border-claret-edge bg-bg-overlay px-3 font-mono text-[14px] tracking-[0.3em] uppercase text-text admin-focus placeholder:tracking-[0.3em] placeholder:text-text-subtle"
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
            className="rounded-lg border-2 p-3 text-center transition-colors"
            style={{
              borderColor: active ? v.ring : "var(--border)",
              background: active ? `color-mix(in oklab, ${v.ring} 12%, transparent)` : "transparent",
            }}
          >
            <div className="font-display text-[16px] font-bold" style={{ color: active ? v.text : "var(--text)" }}>
              {v.label}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{v.sw}</div>
          </button>
        );
      })}
    </div>
  );
}
