"use client";

/**
 * Operations control-plane — the master mode indicator + the runtime payment
 * toggles (provider · auto-settle · demo-async). Every change goes through the
 * audited `setPaymentControlsAction`; the LIVE-mode hard-locks are enforced
 * server-side in `setPaymentControls`, and mirrored here as disabled affordances
 * with a plain-language reason so an officer never fights an invisible wall.
 *
 * Consequential changes (switching the money rail, arming auto-settle) route
 * through <ConfirmModal>. Reversible/test toggles apply directly.
 */
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { setPaymentControlsAction, testSelcomConnectionAction } from "./payment-actions";
import type { PaymentControlsView, PaymentProviderId } from "@/lib/server/payment-control";

const PROVIDER_LABEL: Record<PaymentProviderId, string> = { mock: "Mock (test)", selcom: "Selcom", azampay: "AzamPay" };

type Pending = { update: Record<string, string>; title: string; body: ReactNode; confirmLabel: string; tone: "brand" | "warning" | "claret" } | null;

export function ControlPlane({ controls }: { controls: PaymentControlsView }) {
  const [busy, startTransition] = useTransition();
  const [pending, setPending] = useState<Pending>(null);
  const router = useRouter();
  const { toast } = useToast();
  const live = controls.mode === "LIVE";

  const apply = (update: Record<string, string>) => {
    startTransition(async () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(update)) fd.set(k, v);
      const r = await setPaymentControlsAction(fd);
      if (!r.ok) { toast({ title: "Blocked", description: r.error, variant: "danger" }); return; }
      toast({ title: "Control-plane updated", variant: "success" });
      setPending(null);
      router.refresh();
    });
  };

  // Provider options shown as a segmented selector. mock + every configured real provider.
  const providerOptions: PaymentProviderId[] = ["mock", "selcom", ...(controls.selectable.azampay ? (["azampay"] as const) : [])];

  const chooseProvider = (p: PaymentProviderId) => {
    if (p === controls.provider) return;
    const selectable = p === "mock" ? controls.selectable.mock : controls.selectable[p];
    if (!selectable) {
      toast({ title: "Unavailable", description: p === "mock" ? "The mock cannot be selected while real money is live — use the kill-switch to pause payments." : `${PROVIDER_LABEL[p]} is not configured yet (set its API credentials in Railway).`, variant: "danger" });
      return;
    }
    const toReal = p !== "mock";
    setPending({
      update: { provider: p },
      title: `Switch payment rail to ${PROVIDER_LABEL[p]}?`,
      tone: toReal ? "warning" : "brand",
      confirmLabel: `Switch to ${PROVIDER_LABEL[p]}`,
      body: (
        <>
          The active payment rail becomes <strong>{PROVIDER_LABEL[p]}</strong>. All new deposits and
          withdrawals route through it immediately. {toReal
            ? "This moves REAL money through the gateway. The per-MNO kill-switch remains your instant emergency stop."
            : "The mock is a deterministic test provider — no real money moves."}
        </>
      ),
    });
  };

  const testConnection = () => {
    startTransition(async () => {
      const r = await testSelcomConnectionAction();
      if (r.ok) toast({ title: "Selcom reachable", description: r.detail, variant: "success" });
      else toast({ title: "Selcom check failed", description: r.error, variant: "danger" });
    });
  };

  const setAutoSettle = (next: boolean) => {
    if (!next) { apply({ autoSettle: "false" }); return; } // turning off is always safe → direct
    setPending({
      update: { autoSettle: "true" },
      title: "Enable automatic settlement?",
      tone: "warning",
      confirmLabel: "Enable auto-settle",
      body: <>The lifecycle ticker will pay out resolved markets on its own (once their objection window closes with nothing standing). Only enable this once the payout rail is live and reconciled. You can turn it off again at any time.</>,
    });
  };

  return (
    <>
      {/* Master mode indicator */}
      <div
        className="rounded-lg border p-4"
        style={live
          ? { borderColor: "color-mix(in oklab, var(--gold-400) 45%, transparent)", background: "color-mix(in oklab, var(--gold-500) 12%, var(--bg-elevated))" }
          : { borderColor: "var(--info-border)", background: "color-mix(in oklab, var(--info-bg) 30%, var(--bg-elevated))" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-display text-[15px] font-bold tracking-wide"
            style={live
              ? { background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))", color: "oklch(18% 0.03 264)" }
              : { background: "var(--info-bg)", color: "var(--info-fg)" }}
          >
            {live ? <I.shieldcheck s={16} /> : <I.bolt s={16} />}
            {live ? "REAL MONEY LIVE" : "TEST MODE"}
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Operations mode · Hali ya uendeshaji</p>
            <p className="text-caption text-text-secondary">
              {live
                ? "Real deposits & withdrawals move real money. Compliance-critical rails are hard-locked."
                : "Pre-launch test float — no real money. Toggles below are freely settable for testing."}
            </p>
          </div>
        </div>
        {controls.liveMockRefused && (
          <p className="mt-3 flex items-start gap-2 rounded-md border border-no-500 bg-no-soft/40 p-2 text-caption text-no-200">
            <I.warning s={15} className="mt-0.5 shrink-0" />
            <span><strong>Misconfiguration:</strong> real money is LIVE but the active provider is the mock — every payment is being refused. Configure Selcom and switch to it.</span>
          </p>
        )}
      </div>

      {/* Provider selector */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
            <I.mobileMoney s={14} className="text-text-tertiary" /> Payment provider · Mtoa huduma
          </span>
          {controls.provider !== "mock" && (
            <Chip size="sm" variant={controls.gatewayConfigured ? "success" : "danger"}>
              {controls.gatewayConfigured ? "Configured" : "Creds missing"}
            </Chip>
          )}
        </div>
        <div className="mt-2 inline-flex w-full flex-wrap gap-1.5 rounded-lg border border-border-subtle bg-bg-inset p-1.5" role="radiogroup" aria-label="Active payment provider">
          {providerOptions.map((p) => {
            const active = controls.provider === p;
            const selectable = p === "mock" ? controls.selectable.mock : controls.selectable[p];
            const disabled = busy || (!active && !selectable);
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => chooseProvider(p)}
                title={!selectable && !active ? (p === "mock" ? "Disabled while real money is live" : "Not configured") : undefined}
                className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-md px-3 font-mono text-[12px] font-bold uppercase tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                style={active
                  ? { background: "var(--brand-500)", color: "var(--pearl-50)" }
                  : { color: "var(--text-muted)" }}
              >
                {!active && !selectable && <I.lock s={12} />}
                {PROVIDER_LABEL[p]}
                {active && <I.check s={13} />}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
          <p className="font-mono text-[10px] text-text-tertiary max-w-[80%]">
            {controls.providerExplicit ? "Set by an officer." : `Inherited from env (PAYMENT_AGGREGATOR=${controls.env.provider}).`}
            {" "}Selcom ships integrated but off — flip here when ready; the kill-switch is the emergency stop.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={testConnection}
            className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-md border border-border px-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text disabled:opacity-50"
            title="Signed order-status probe — no money moves. Must run from an allow-listed IP."
          >
            <I.bolt s={12} /> Test Selcom · Jaribu
          </button>
        </div>
      </div>

      {/* Auto-settle + demo-async toggles */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <ToggleRow
          icon={<I.bolt s={14} />}
          label="Automatic settlement"
          sw="Malipo ya kiotomatiki"
          hint={controls.autoSettle ? "Ticker pays resolved markets automatically." : "Manual — an officer settles each market."}
          on={controls.autoSettle}
          explicit={controls.autoSettleExplicit}
          envValue={controls.env.autoSettle}
          disabled={busy}
          onChange={setAutoSettle}
        />
        <ToggleRow
          icon={<I.clock s={14} />}
          label="Demo async (test)"
          sw="Majaribio ya async"
          hint={controls.locks.demoAsyncLocked ? "TEST-only — locked off on real money." : controls.demoAsync ? "Mock returns PENDING; webhook settles." : "Mock settles synchronously."}
          on={controls.demoAsync}
          explicit={controls.demoAsyncExplicit}
          envValue={controls.env.demoAsync}
          disabled={busy || controls.locks.demoAsyncLocked}
          locked={controls.locks.demoAsyncLocked}
          onChange={(next) => apply({ demoAsync: String(next) })}
        />
      </div>

      <ConfirmModal
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => pending && apply(pending.update)}
        title={pending?.title ?? ""}
        body={pending?.body ?? null}
        tone={pending?.tone ?? "brand"}
        confirmLabel={pending?.confirmLabel}
      />
    </>
  );
}

function ToggleRow({
  icon, label, sw, hint, on, explicit, envValue, disabled, locked, onChange,
}: {
  icon: ReactNode; label: string; sw: string; hint: string; on: boolean;
  explicit: boolean; envValue: boolean; disabled?: boolean; locked?: boolean; onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-inset px-3 py-2.5">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 font-display text-[13px] font-bold text-text">
          <span className="text-text-tertiary">{icon}</span>{label}
          {locked && <I.lock s={11} className="text-text-subtle" />}
        </p>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">{sw}</p>
        <p className="mt-0.5 text-[11px] text-text-tertiary leading-snug">
          {hint}{!explicit && !locked ? ` · env: ${envValue ? "on" : "off"}` : ""}
        </p>
      </div>
      <Toggle on={on} disabled={disabled} onClick={() => onChange(!on)} aria-label={`${label}: ${on ? "on" : "off"}`} />
    </div>
  );
}
