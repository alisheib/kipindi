"use client";

/**
 * THE IDENTITY GATE, AS A PANEL — shown INSTEAD of the control it would refuse.
 *
 * ⭐ THE PRINCIPLE IS ALREADY WRITTEN IN THIS CODEBASE, in `email-verify-gate.tsx`:
 * *"this component exists so the player meets the gate BEFORE filling in a form they'd
 * only be rejected on, and so the thing that unblocks them is one tap away rather than
 * buried in profile."* Same reasoning, one rung up the ladder.
 *
 * ⛔ SO THE STAKE CONTROL / DEPOSIT FORM IS NOT RENDERED AT ALL — not disabled, not
 * hidden with CSS. A disabled dial still invites the tap, still reads as "the app is
 * broken", and on a money surface it is a promise we will refuse. The server enforces the
 * same rule either way (`kyc-gate.ts`); this is so the player never meets the refusal by
 * surprise.
 *
 * ⭐ FOUR STATES, FOUR PANELS, and the difference between them is the whole point. Three
 * of the four ask the player to DO something; one — `PENDING_REVIEW` — asks them to do
 * nothing, because we are the ones who are late. Rendering that one in the same
 * "action needed" skin as a rejection tells a player who did everything right that they
 * failed. `tone` carries that distinction into colour, glyph and CTA.
 *
 * ⚠️ NOT AN ALERT. `role="status"`, not `role="alert"`: an unverified account is a normal
 * first-session condition, not an emergency. The rejection state is the only one that
 * raises its voice, and even then it names the next step rather than the failure.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import type { KycGateState } from "@/lib/kyc-gate-state";

const TONE = {
  /** Nothing has gone wrong; there is simply a step to take. Brand blue, not red. */
  neutral: { ring: "border-brand-600/60", ink: "text-brand-300", wash: "bg-brand-500/10" },
  /** We are the ones they are waiting on. Calm, informational, explicitly reassuring. */
  waiting: { ring: "border-royal-600/60", ink: "text-royal-300", wash: "bg-royal-500/10" },
  /** Their move, and a specific one. Amber says "your turn" without claiming a fault. */
  action:  { ring: "border-gold-700",     ink: "text-gold-300",  wash: "bg-gold-500/10" },
  /** A decision went against them. Honest in red — but the CTA is still "try again". */
  refused: { ring: "border-no-700",       ink: "text-no-300",    wash: "bg-no-500/[0.08]" },
} as const;

const BY_STATE: Record<KycGateState, {
  tone: keyof typeof TONE;
  glyph: keyof typeof I;
  /** ⛔ `false` for PENDING_REVIEW — opening the form shows a "we're reviewing" panel and
   *  nothing to act on, so a CTA there is a button that leads nowhere. */
  cta: boolean;
}> = {
  not_started:    { tone: "neutral", glyph: "shieldcheck", cta: true },
  pending_review: { tone: "waiting", glyph: "clock",       cta: false },
  more_info:      { tone: "action",  glyph: "upload",      cta: true },
  rejected:       { tone: "refused", glyph: "alertCircle", cta: true },
};

export function KycGatePanel({
  state,
  /** Where to come back to once they are verified — round-tripped as `?next=`. */
  returnTo,
  /** `compact` drops the hero padding for the narrow Up & Down stake column. */
  compact = false,
}: {
  state: KycGateState;
  returnTo?: string;
  compact?: boolean;
}) {
  const { t } = useT();
  const spec = BY_STATE[state];
  const tone = TONE[spec.tone];
  const Glyph = I[spec.glyph];

  const copy = {
    not_started:    { eyebrow: t.kycGate.eyebrowVerify,  title: t.kycGate.titleNotStarted,  body: t.kycGate.bodyNotStarted,  cta: t.kycGate.ctaStart },
    pending_review: { eyebrow: t.kycGate.eyebrowPending, title: t.kycGate.titlePending,     body: t.kycGate.bodyPending,     cta: "" },
    more_info:      { eyebrow: t.kycGate.eyebrowAction,  title: t.kycGate.titleMoreInfo,    body: t.kycGate.bodyMoreInfo,    cta: t.kycGate.ctaUpload },
    rejected:       { eyebrow: t.kycGate.eyebrowAction,  title: t.kycGate.titleRejected,    body: t.kycGate.bodyRejected,    cta: t.kycGate.ctaRetry },
  }[state];

  // ⛔ Only a same-site absolute path may round-trip, and it is re-checked HERE as well as
  // on the KYC page. A `next` that leaves the site is an open redirect, and this panel is
  // rendered on money surfaces where the URL is the most attacker-visible thing there is.
  const safeNext = returnTo && /^\/(?!\/)/.test(returnTo) ? returnTo : null;
  const href = safeNext ? `/profile/kyc?next=${encodeURIComponent(safeNext)}` : "/profile/kyc";

  return (
    <section
      role="status"
      data-testid="kyc-gate-panel"
      data-kyc-state={state}
      className={`rounded-xl border ${tone.ring} bg-bg-elevated text-center ${compact ? "p-4" : "p-6"}`}
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
      <p className="mt-1.5 text-body-sm text-text-muted leading-snug max-w-[42ch] mx-auto">{copy.body}</p>
      {spec.cta && (
        <Link href={href as never} className="btn btn-primary btn-md btn-pill mt-4 inline-flex items-center gap-1.5">
          <I.shieldcheck s={14} />
          {copy.cta}
        </Link>
      )}
    </section>
  );
}
