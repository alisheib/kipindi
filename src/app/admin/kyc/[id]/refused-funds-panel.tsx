"use client";

/**
 * S1 — THE OFFICER DECIDES A FINALLY-REFUSED PLAYER'S BALANCE (owner ruling, Ali, 2026-09-13).
 *
 * ⭐ WHAT THIS SCREEN MUST MAKE IMPOSSIBLE TO MISS: how much money is at stake, what each of the four
 * outcomes would do with it IN SHILLINGS before anything is pressed, which outcomes are not available
 * and why, and that a written justification is required. Discretion over WHICH outcome; never over
 * whether it is recorded (`refused-funds-outcomes.ts`).
 *
 * ⛔ THE SERVER IS THE LAW. `decideRefusedFundsAction` re-reads the position fresh and refuses anything
 * this form offers that has become stale — a moved balance is refused by the forfeit's compare-and-swap. Every figure shown here comes from
 * `refusedFundsPosition`, the same function the action decides on — so the preview and the decision
 * cannot tell two stories.
 */
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { formatTzs } from "@/lib/utils";
import {
  REFUSED_FUNDS_OUTCOMES,
  REFUSED_FUNDS_OUTCOME_COPY,
  REFUSED_FUNDS_JUSTIFICATION_MIN,
  REFUSED_FUNDS_JUSTIFICATION_MAX,
  RETURNS_MONEY,
  RETURN_PROVIDERS,
  RETURN_PROVIDER_LABEL,
  type RefusedFundsOutcome,
} from "@/lib/refused-funds-outcomes";
import { decideRefusedFundsAction } from "./kyc-actions";

type Availability = { allowed: boolean; why: string | null; returnTzs: number; forfeitTzs: number };

export function RefusedFundsPanel({
  userId,
  balance,
  hold,
  confirmedDeposits,
  paidOut,
  defaultProvider,
  outcomes,
}: {
  userId: string;
  balance: number;
  hold: number;
  confirmedDeposits: number;
  paidOut: number;
  defaultProvider: string | null;
  outcomes: Record<RefusedFundsOutcome, Availability>;
}) {
  const mayAct = useMayAct();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<RefusedFundsOutcome | "">("");
  const [provider, setProvider] = useState<string>(defaultProvider ?? "");
  const [justification, setJustification] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const chosen = outcome ? outcomes[outcome] : null;
  const needsProvider = !!outcome && RETURNS_MONEY.has(outcome);
  const justified = justification.trim().length >= REFUSED_FUNDS_JUSTIFICATION_MIN;
  const ready = !!chosen?.allowed && justified && (!needsProvider || !!provider);
  const summary = useMemo(() => {
    if (!outcome || !chosen) return null;
    if (outcome === "HOLD_PENDING_APPEAL") return `No money moves. ${formatTzs(balance)} stays held in a frozen wallet.`;
    const parts: string[] = [];
    if (chosen.returnTzs > 0) parts.push(`${formatTzs(chosen.returnTzs)} sent to the registered number`);
    if (chosen.forfeitTzs > 0) parts.push(`${formatTzs(chosen.forfeitTzs)} forfeited to the house`);
    return parts.join(" · ") || "Nothing moves.";
  }, [outcome, chosen, balance]);

  if (!mayAct) return <ActReadOnly />;

  const submit = () => {
    if (!outcome || !ready) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("outcome", outcome);
      fd.set("justification", justification.trim());
      if (needsProvider) fd.set("provider", provider);
      const r = await runAdminAction(() => decideRefusedFundsAction(fd));
      if (!r.ok) {
        toast({ title: "Not decided", description: r.error, variant: "danger" });
        if (r.field) focusFirstInvalid(formRef.current, [r.field]);
        return;
      }
      setOutcome(""); setJustification("");
      router.refresh();
      toast(r.payoutError
        ? { title: "Decision recorded · the return did not start", description: `${r.payoutError} The rest of the balance stays frozen — decide again to return it.`, variant: "warning" }
        : { title: "Decision recorded", description: "The player has been told the decision and the refusal reason.", variant: "success" });
    });
  };

  return (
    <div ref={formRef} className="space-y-3" data-refused-funds-panel="1">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-body-sm">
        <Money label="Balance held" value={formatTzs(balance)} strong />
        <Money label="In flight" value={formatTzs(hold)} />
        <Money label="Deposited (confirmed)" value={formatTzs(confirmedDeposits)} />
        <Money label="Paid out" value={formatTzs(paidOut)} />
      </dl>

      <div data-field="outcome">
        <Select
          value={outcome}
          onChange={(v) => setOutcome(v as RefusedFundsOutcome)}
          ariaLabel="Outcome"
          placeholder="Choose an outcome…"
          size="sm"
          options={REFUSED_FUNDS_OUTCOMES.map((o) => ({
            value: o,
            label: `${REFUSED_FUNDS_OUTCOME_COPY[o].label}${outcomes[o].allowed ? "" : " — not available"}`,
          }))}
        />
      </div>

      {outcome && (
        <div className="rounded-md border border-border bg-bg-inset px-3 py-2 text-body-sm">
          <p className="text-text-muted">{REFUSED_FUNDS_OUTCOME_COPY[outcome].does}</p>
          {chosen && !chosen.allowed ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-no-300"><I.alertCircle s={13} className="mt-0.5 shrink-0" />{chosen.why}</p>
          ) : (
            <p className="mt-1.5 font-mono tabular-nums text-text" data-outcome-summary="1">{summary}</p>
          )}
        </div>
      )}

      {needsProvider && (
        <div data-field="provider">
          <Select
            value={provider}
            onChange={setProvider}
            ariaLabel="Return network"
            placeholder="Network to return on…"
            size="sm"
            options={RETURN_PROVIDERS.map((p) => ({ value: p, label: `${RETURN_PROVIDER_LABEL[p]}${p === defaultProvider ? " · last deposit" : ""}` }))}
          />
        </div>
      )}

      <label className="block">
        <span className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">Justification · required</span>
        <span className="block text-body-sm text-text-subtle">Recorded in the compliance log and shown in the refused-funds report. Never sent to the player.</span>
        <textarea
          data-field="justification"
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={3}
          maxLength={REFUSED_FUNDS_JUSTIFICATION_MAX}
          placeholder="Why this outcome, for this player…"
          className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2 py-2 text-body-sm text-text outline-none admin-focus transition-colors"
        />
        <span className={`font-mono text-body-sm tabular-nums ${justified ? "text-text-subtle" : "text-warning-fg"}`}>
          {justification.trim().length} / {REFUSED_FUNDS_JUSTIFICATION_MIN} minimum
        </span>
      </label>

      <ConfirmDialog
        trigger={
          <Button variant="claret" size="lg" fullWidth disabled={!ready || pending} leading={<I.shieldcheck s={14} />}>
            Record decision
          </Button>
        }
        title="Record this balance decision?"
        body={<>{outcome ? <strong>{REFUSED_FUNDS_OUTCOME_COPY[outcome].label}.</strong> : null} {summary} This is written to the compliance log under its own action, the player is told, and it cannot be undone from this screen.</>}
        confirmLabel="Yes, record it"
        tone="claret"
        onConfirm={submit}
      />
    </div>
  );
}

function Money({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-micro uppercase eyebrow text-text-subtle">{label}</dt>
      <dd className={`font-mono tabular-nums ${strong ? "text-text font-bold" : "text-text-muted"}`}>{value}</dd>
    </div>
  );
}
