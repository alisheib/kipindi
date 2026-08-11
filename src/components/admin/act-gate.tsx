"use client";

/**
 * THE ACT GATE — "may this viewer ACT on this page?", answered once in the admin shell.
 *
 * ⛔ WHY IT EXISTS (finding A1/A3, 2026-08-11). `canView` without `canAct` is a state the
 * console very largely did not render for. Measured by driving all 23 (role, page) cells in
 * that state: **every one rendered an identical control set to the view-only role and to a
 * role that can act.** An AUDITOR was offered the `REAL MONEY LIVE` toggle and eight MNO
 * kill-switches on `/admin/payments`, and eight `Export bundle` controls on `/admin/privacy`.
 *
 * ⭐ The money and the data were never at risk — the action layer refused every time, proven
 * by driving a kill-switch through its whole confirm ceremony and reading
 * `SystemConfig['payments.killswitch']` back unchanged. **The defect is the OFFER.** An
 * officer spends attention on a control that cannot work, and
 * [`control-gates.ts`](../../lib/server/control-gates.ts) records the compounding cost: the
 * bounced click writes `privilege_escalation_blocked` at SECURITY severity, so an ordinary
 * operator's legitimate click lands in the compliance log as an attempted privilege
 * escalation. That is audit pollution on a licensed platform.
 *
 * ⛔ THE FIX IS NOT TO WIDEN THE GRANTS. `roles.ts` is explicit: Trading never touches
 * money/PII/config, Auditor is read-only everywhere. The fix is the one
 * [`admin/objections/page.tsx`](../../app/admin/objections/page.tsx) already set as
 * precedent — **the page asks the same question the action will ask**, and renders an
 * explanatory read-only state instead of a control that bounces.
 *
 * ⚠️ WHY A CLIENT CONTEXT AND NOT A PROP. The answer is one boolean that every act control
 * on the page needs, and threading it from the layout through each Server Component page
 * into each client control would be a prop on ~47 pages — i.e. exactly the "remember to do
 * it" the shell-level gate exists to remove. The provider is mounted once in the layout;
 * controls read it.
 *
 * ⛔ AND THE DEFAULT IS `true`, DELIBERATELY. A control rendered outside the admin shell
 * (a test harness, a story, a player surface that reuses a primitive) must not silently
 * disable itself — a control that vanishes because a provider is missing is a worse failure
 * than one that shows and is refused server-side. **"Gated by default" is enforced by
 * `test:admin-act-gate`, which fails on any admin control component that does not consult
 * this hook — not by a default that would break unrelated callers.**
 */
import { createContext, useContext, type ReactNode } from "react";

const ActCtx = createContext<{ mayAct: boolean; role: string; domainLabel: string }>({
  mayAct: true,
  role: "",
  domainLabel: "",
});

export function AdminActProvider({
  mayAct,
  role,
  domainLabel,
  children,
}: {
  mayAct: boolean;
  role: string;
  domainLabel: string;
  children: ReactNode;
}) {
  return <ActCtx.Provider value={{ mayAct, role, domainLabel }}>{children}</ActCtx.Provider>;
}

/** May this viewer act on this page? `true` outside the admin shell — see the header. */
export function useMayAct(): boolean {
  return useContext(ActCtx).mayAct;
}

/** The viewer's role + this route's domain label, for explaining a refusal precisely. */
export function useActContext(): { mayAct: boolean; role: string; domainLabel: string } {
  return useContext(ActCtx);
}

/**
 * The reason string an act control shows when it is disabled. ⭐ It names the ROLE and the
 * DOMAIN rather than saying "not allowed", because the officer's next question is always
 * *"then who can?"* — and the answer is a grant the Owner can change at `/admin/roles`.
 */
export function useActDisabledReason(): string | undefined {
  const { mayAct, role, domainLabel } = useActContext();
  if (mayAct) return undefined;
  return `Read-only: the ${role || "current"} role can view ${domainLabel || "this area"} but not change it.`;
}

/**
 * Wrap an act control so it is rendered inert and explained rather than offered.
 *
 * Use `<ActGuard>` when the whole subtree is act-only (a row of decision buttons, a
 * settings form). For a single control that also carries read affordances, prefer
 * `useMayAct()` and pass `disabled` yourself — the point is that the control STATES the
 * reason, not that it disappears.
 */
export function ActGuard({
  children,
  /** Shown in place of the control. Defaults to the role/domain sentence. */
  note,
}: {
  children: ReactNode;
  note?: string;
}) {
  const { mayAct } = useActContext();
  if (mayAct) return <>{children}</>;
  return <ActReadOnly note={note} />;
}

/**
 * The chip that stands where an act control would be.
 *
 * ⭐ Use it as an EARLY RETURN in a control component whose entire output is the control:
 *
 *     const mayAct = useMayAct();
 *     if (!mayAct) return <ActReadOnly />;
 *
 * That is one line, and it is unambiguous in review — which matters more here than
 * elegance, because the alternative is hunting every nested button in a component that
 * renders three confirm states. ⚠️ It is only correct when the component carries **no read
 * affordance**; where a control also filters, sorts or reveals data, disable the acting
 * button with `useMayAct()` instead and leave the reading alone.
 */
export function ActReadOnly({ note }: { note?: string }) {
  const reason = useActDisabledReason();
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-bg-sunken px-2 py-1 font-mono text-micro uppercase tracking-[0.1em] text-text-tertiary"
      title={note ?? reason}
    >
      read-only
    </span>
  );
}

/**
 * The page-level banner. Rendered by the admin layout above the page content whenever the
 * viewer holds VIEW but not ACT, so the officer knows before they reach for a control —
 * which is the half a disabled button cannot do on its own.
 */
export function ActReadOnlyBanner({ role, domainLabel }: { role: string; domainLabel: string }) {
  return (
    <div
      role="status"
      className="mx-4 lg:mx-6 mt-4 rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 flex items-start gap-2"
    >
      <span className="mt-[1px] font-mono text-micro uppercase tracking-[0.14em] text-text-tertiary shrink-0">
        read-only
      </span>
      <p className="text-caption text-text-secondary">
        The <strong className="text-text">{role}</strong> role can view{" "}
        <strong className="text-text">{domainLabel}</strong> but not change it, so the controls on
        this page are disabled. The Owner can adjust this at{" "}
        <a href="/admin/roles" className="text-royal-300 hover:underline">
          /admin/roles
        </a>
        .
      </p>
    </div>
  );
}
