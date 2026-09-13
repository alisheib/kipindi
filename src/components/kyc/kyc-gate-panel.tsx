"use client";

/**
 * THE IDENTITY GATE, AS A PANEL — shown INSTEAD of the control it would refuse.
 *
 * ⭐ WHERE IT STANDS FROM 2026-09-13: in exactly TWO places — the withdrawal form, and the agent
 * application — because identity is asked before money leaves and before someone applies to recruit
 * for us, and before nothing else. It stood in front of the deposit form, the conviction dial and the
 * Up & Down stake panel from 2026-09-05 to 2026-09-13; those are gone. ⛔ Do not add a caller on a
 * deposit or stake surface: the server asks no identity question there (`kyc-gate.ts`), so a panel
 * would be a wall the platform does not have.
 *
 * ⭐ `purpose` IS REQUIRED, SO EVERY CALLER CHOOSES. The same state reads differently in the two
 * places. On the withdrawal screen it addresses somebody whose money is on the other side of it, so it
 * stays short and calm: "Before you withdraw", the one thing to do, and — while the next move is still
 * theirs — how long our review takes, as a quiet caption. It must not read as a refusal or an outage.
 * On the agent application "One step first" is simply true.
 *
 * ⛔ NO "YOUR BALANCE IS SAFE" LINE (removed 2026-09-13, with `kycGate.payoutSafe`). Ali's quiet rule of
 * that day: say nicely "verify before you withdraw", and never explain things in annoying ways. A
 * reassurance nobody asked for is an explanation, and it raises the very worry it answers.
 *
 * ⛔ THE FORM IT REPLACES IS NOT RENDERED AT ALL — not disabled. A disabled payout form on a money screen
 * reads as an outage and still invites the tap. The server enforces the rule either way.
 *
 * ⭐ SIX STATES (`kyc-gate-state.ts`). One — `pending_review` — asks the player to do NOTHING, because
 * we are the ones who are late; rendering it in the "action needed" skin tells a player who did
 * everything right that they failed. And `refused_final` offers no retry — the server refuses one — only
 * the route to support; its body says our team will explain what happens to the balance.
 *
 * ⚠️ NOT AN ALERT. `role="status"`: an unverified account is an ordinary condition, not an emergency.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import type { KycGateState } from "@/lib/kyc-gate-state";
import { KYC_REVIEW_SLA_HOURS } from "@/lib/kyc-sla";
import { durationHours } from "@/lib/duration-phrase";

const TONE = {
  /** Nothing has gone wrong; there is simply a step to take. Brand blue, not red. */
  neutral: { ring: "border-brand-600/60", ink: "text-brand-300", wash: "bg-brand-500/10" },
  /** We are the ones they are waiting on. Calm, informational, explicitly reassuring. */
  waiting: { ring: "border-royal-600/60", ink: "text-royal-300", wash: "bg-royal-500/10" },
  /** Their move, and a specific one. Amber says "your turn" without claiming a fault. */
  action:  { ring: "border-gold-700",     ink: "text-gold-300",  wash: "bg-gold-500/10" },
  /** A decision went against them. Honest in red — the CTA names the next step.
   *  ⛔ The APP-STATE danger family (the kit Callout's danger tone, verbatim), never the betting NO
   *  red — DESIGN_AUTHORITY §B2a keeps that ink for the NO side of a stake (2026-09-13). */
  refused: { ring: "border-danger-500/50", ink: "text-danger-fg", wash: "bg-danger-500/10" },
} as const;

const BY_STATE: Record<KycGateState, {
  tone: keyof typeof TONE;
  glyph: keyof typeof I;
  /** Where the CTA goes, or `null` for none. ⛔ `null` for PENDING_REVIEW — opening the form shows a
   *  "we're reviewing" panel and nothing to act on, so a CTA there is a button that leads nowhere. */
  cta: "verify" | "support" | null;
}> = {
  not_started:    { tone: "neutral", glyph: "shieldcheck", cta: "verify" },
  uploaded:       { tone: "action",  glyph: "upload",      cta: "verify" },
  pending_review: { tone: "waiting", glyph: "clock",       cta: null },
  more_info:      { tone: "action",  glyph: "upload",      cta: "verify" },
  rejected:       { tone: "refused", glyph: "alertCircle", cta: "verify" },
  refused_final:  { tone: "refused", glyph: "alertCircle", cta: "support" },
};

export function KycGatePanel({
  state,
  purpose,
  /** Where to come back to once they are verified — round-tripped as `?next=`. */
  returnTo,
}: {
  state: KycGateState;
  /** `payout` on the withdrawal form; `agent` on the agent application. */
  purpose: "payout" | "agent";
  returnTo?: string;
}) {
  const { t, locale } = useT();
  const spec = BY_STATE[state];
  const tone = TONE[spec.tone];
  const Glyph = I[spec.glyph];
  const payout = purpose === "payout";

  const copy = {
    not_started:    { eyebrow: payout ? t.kycGate.eyebrowPayout : t.kycGate.eyebrowVerify, title: t.kycGate.titleNotStarted, body: t.kycGate.bodyNotStarted,  cta: t.kycGate.ctaStart },
    uploaded:       { eyebrow: payout ? t.kycGate.eyebrowPayout : t.kycGate.eyebrowAction, title: t.kycGate.titleUploaded,   body: t.kycGate.bodyUploaded,    cta: t.kycGate.ctaFinish },
    pending_review: { eyebrow: t.kycGate.eyebrowPending, title: t.kycGate.titlePending,  body: t.kycGate.bodyPending,      cta: "" },
    more_info:      { eyebrow: t.kycGate.eyebrowAction,  title: t.kycGate.titleMoreInfo, body: t.kycGate.bodyMoreInfo,     cta: t.kycGate.ctaUpload },
    rejected:       { eyebrow: t.kycGate.eyebrowAction,  title: t.kycGate.titleRejected, body: t.kycGate.bodyRejected,     cta: t.kycGate.ctaRetry },
    // ⛔ NOT "Your move" (2026-09-13, found on a screenshot): a FINAL refusal cannot be restarted by the player,
    // so its label names the subject and calls for nothing — the only step is support, and the CTA says so.
    refused_final:  { eyebrow: t.kycGate.eyebrowIdentity, title: t.kycGate.titleRejected, body: t.kycGate.bodyRefusedFinal, cta: t.kycGate.ctaSupport },
  }[state];

  // ⭐ THE WAIT IS A NUMBER (`KYC_REVIEW_SLA_HOURS`, the officer's own clock), shown on the withdrawal
  // screen only while the next move is still the player's. ONE quiet caption under the body — not a
  // list, not a glyph row — because it is a single fact and must not compete with the button.
  const showWait = payout && (state === "not_started" || state === "uploaded");

  // ⛔ Only a same-site absolute path may round-trip, and it is re-checked HERE as well as on the KYC
  // page. A `next` that leaves the site is an open redirect, and this panel is rendered on a money
  // surface where the URL is the most attacker-visible thing there is.
  const safeNext = returnTo && /^\/(?!\/)/.test(returnTo) ? returnTo : null;
  const verifyHref = safeNext ? `/profile/kyc?next=${encodeURIComponent(safeNext)}` : "/profile/kyc";
  const href = spec.cta === "support" ? "/help" : verifyHref;

  return (
    <section
      role="status"
      data-testid="kyc-gate-panel"
      data-kyc-state={state}
      data-kyc-purpose={purpose}
      className={`rounded-xl border ${tone.ring} bg-bg-elevated text-center p-6`}
    >
      <span
        aria-hidden
        /* ⛔ LITERALS, NOT SCALE TOKENS — `theme.extend.spacing` is overridden
           (tailwind.config.ts), so `h-10 w-10` renders 80×80px. 40px = --tap-min. */
        className={`inline-flex h-[40px] w-[40px] items-center justify-center rounded-full ${tone.wash} ${tone.ink}`}
      >
        <Glyph s={18} />
      </span>
      <p className={`mt-3 font-mono text-micro uppercase eyebrow font-bold ${tone.ink}`}>{copy.eyebrow}</p>
      <h3 className="mt-1.5 font-display text-[18px] font-bold text-text leading-tight">{copy.title}</h3>
      <p className="mt-1.5 text-body-sm text-text-muted leading-snug max-w-[42ch] mx-auto text-balance">{copy.body}</p>
      {showWait && (
        <p data-kyc-payout-line="wait" className="mt-2 text-body-sm text-text-subtle leading-snug max-w-[42ch] mx-auto text-balance">
          {fill(t.kycGate.payoutWait, { hours: durationHours(locale, KYC_REVIEW_SLA_HOURS) })}
        </p>
      )}
      {spec.cta && (
        <div>
          <Link href={href as never} className="btn btn-primary btn-md btn-pill mt-4 inline-flex items-center gap-1.5">
            {spec.cta === "support" ? <I.mail s={14} /> : <I.shieldcheck s={14} />}
            {copy.cta}
          </Link>
        </div>
      )}
    </section>
  );
}
