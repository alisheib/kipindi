"use client";

/**
 * Operations control-plane — the master mode indicator + the runtime payment
 * toggles (provider · demo-async). Every change goes through the audited
 * `setPaymentControlsAction`. Admins may switch the provider — including to the
 * mock — in ANY money mode (owner decision 2026-07-24). There are no hard-locks;
 * the guardrails are: a real provider needs its creds, switching TO the mock while
 * real money is LIVE demands a typed "MOCK" confirm (it is a deliberate simulation),
 * and a persistent banner shows for as long as that simulation is active.
 *
 * Consequential changes (switching the money rail) route through <ConfirmModal>;
 * the mock-on-live-money switch uses its hard (type-the-word) tier. Reversible/test
 * toggles apply directly.
 */
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { Callout } from "@/components/ui/callout";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { setPaymentControlsAction, testSelcomConnectionAction } from "./payment-actions";
import type { PaymentControlsView, PaymentProviderId } from "@/lib/server/payment-control";

const PROVIDER_LABEL: Record<PaymentProviderId, string> = { mock: "Mock (test)", selcom: "Selcom", azampay: "AzamPay" };

type Pending = { update: Record<string, string>; title: string; body: ReactNode; confirmLabel: string; tone: "brand" | "warning" | "claret"; tier?: "medium" | "hard"; typedWord?: string } | null;

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
    const selectable = controls.selectable[p];
    if (!selectable) {
      // Only reachable for a real provider whose creds are missing — the mock is
      // always selectable now.
      toast({ title: "Unavailable", description: `${PROVIDER_LABEL[p]} is not configured yet (set its API credentials in Railway).`, variant: "danger" });
      return;
    }
    const toReal = p !== "mock";
    // Switching TO the mock while real money is LIVE is a deliberate SIMULATION —
    // demand a typed "MOCK" confirm (hard tier) and colour it claret.
    const mockOnLive = p === "mock" && live;
    setPending({
      update: { provider: p },
      title: mockOnLive ? "Simulate payments on real money?" : `Switch payment rail to ${PROVIDER_LABEL[p]}?`,
      tone: mockOnLive ? "claret" : toReal ? "warning" : "brand",
      tier: mockOnLive ? "hard" : "medium",
      typedWord: mockOnLive ? "MOCK" : undefined,
      confirmLabel: mockOnLive ? "Start simulation" : `Switch to ${PROVIDER_LABEL[p]}`,
      body: mockOnLive ? (
        <>
          Real money is <strong>LIVE</strong>, and you are switching the rail to the <strong>mock</strong>.
          The mock is a self-contained simulator — it does <strong>not</strong> touch the real payment
          gateway in either direction. While it is active, deposits and withdrawals are simulated, not real.
          <span className="mt-2 block">
            This is a deliberate operator action, audited as a compliance event, and a persistent banner
            will show here until you switch back to a real provider. Type <strong>MOCK</strong> to confirm.
          </span>
        </>
      ) : (
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
          {/* The ACTIVE PROVIDER sits beside the mode, not 200px further down in
              the selector. These are the two facts an operator needs before
              touching anything ("is this real money, and who is taking it?"),
              and reading them used to mean reading two separate cards. */}
          <Chip size="lg" variant={controls.simulationActiveOnLiveMoney ? "warning" : "neutral"}>
            <I.mobileMoney s={14} />
            {PROVIDER_LABEL[controls.provider]}
            {controls.simulationActiveOnLiveMoney && <span className="ml-1 font-mono text-[10px]">· SIM</span>}
            {!controls.simulationActiveOnLiveMoney && controls.gatewayConfigured && controls.provider !== "mock" && <I.check s={13} className="text-yes-300" />}
          </Chip>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Operations mode · Hali ya uendeshaji</p>
            <p className="text-caption text-text-secondary">
              {live
                ? "Real deposits & withdrawals move real money. The provider is operator-switchable; the kill-switch is the emergency stop."
                : "Pre-launch test float — no real money. Toggles below are freely settable for testing."}
            </p>
          </div>
        </div>

        {/* ── PERSISTENT SIMULATION BANNER ───────────────────────────────────
            Real money is on AND the active rail is the mock — a deliberate
            simulation. This is not a failure, but it must never run silently:
            deposits/withdrawals are simulated, not real. Shows for as long as the
            simulation is active. role="alert" because operators must notice it. */}
        {controls.simulationActiveOnLiveMoney && (
          <Callout
            tone="warning"
            emphasis="strong"
            live
            glyph="warning"
            className="mt-3"
            title="Payment simulation is active on real money"
          >
            <p>
              Real money is <strong>LIVE</strong>, but the active provider is the <strong>mock</strong> — a
              self-contained simulator that does <strong>not</strong> touch the real payment gateway. Deposits
              and withdrawals are being <strong>simulated</strong>, not processed for real.
            </p>
            <p className="mt-2">
              <strong className="text-text">To process real payments:</strong> in <strong>Payment provider</strong> directly
              below, press <strong>Selcom</strong>.
              {controls.selectable.selcom
                ? " That is the whole switch — it takes effect immediately."
                : " Selcom is not selectable yet because its credentials are missing (PAYMENT_API_KEY, PAYMENT_API_SECRET, PAYMENT_VENDOR_ID, PAYMENT_API_URL). Set them in Railway first."}
            </p>
          </Callout>
        )}

        {/* ── PRECEDENCE, MADE VISIBLE ───────────────────────────────────────
            `getPaymentProvider()` is `store.provider ?? envProvider()`, so a
            value an officer saved here SILENTLY OUTRANKS PAYMENT_AGGREGATOR.
            That is how a Railway env correctly set to `selcom` sat behind a
            persisted `mock` with nothing on screen explaining why. If the two
            disagree, say so, and say which one is actually in force. */}
        {controls.providerExplicit && controls.provider !== controls.env.provider && (
          <Callout tone="warning" glyph="info" className="mt-3">
            This overrides the environment. <code className="font-mono">PAYMENT_AGGREGATOR</code> is
            set to <strong>{controls.env.provider}</strong>, but an officer saved{" "}
            <strong>{controls.provider}</strong> here and the saved value wins. What you see above is
            what is actually running.
          </Callout>
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
            const selectable = controls.selectable[p];
            const disabled = busy || (!active && !selectable);
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => chooseProvider(p)}
                title={!selectable && !active ? "Not configured" : undefined}
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

      {/* Demo-async toggle. (Settlement is timer-driven per market now — no global
          auto-settle switch; see the /admin/settlement queue + /admin/system health.) */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <ToggleRow
          icon={<I.clock s={14} />}
          label="Demo async (test)"
          sw="Majaribio ya async"
          hint={controls.demoAsync ? "Mock returns PENDING; webhook settles." : "Mock settles synchronously."}
          on={controls.demoAsync}
          explicit={controls.demoAsyncExplicit}
          envValue={controls.env.demoAsync}
          disabled={busy}
          locked={false}
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
        tier={pending?.tier ?? "medium"}
        typedWord={pending?.typedWord}
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
