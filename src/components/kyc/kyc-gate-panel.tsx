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
 * ⭐ SIX IDENTITY STATES (`kyc-gate-state.ts`), plus `frozen` and `email` below. One — `pending_review` — asks the
 * player to do NOTHING, because we are the ones who are late; rendering it in the "action needed" skin tells a player
 * who did everything right that they failed. And `refused_final` offers no retry — the server refuses one — only
 * the route to support; its body says our team will explain what happens to the balance.
 *
 * ⭐ AND ONE STATE THAT IS NOT ABOUT IDENTITY AT ALL — `frozen` (2026-09-14, audit session 95, U1). The
 * withdraw page used to draw the full payout form over a wallet that was not ACTIVE — an officer hold,
 * a self-exclusion — whenever the account had been approved once, and the player learned only at confirm.
 * The page now chooses `frozen` there (unless the identity state is already `refused_final`, which says
 * more), and this panel stands where the form was. It says what is true — withdrawals are held on this
 * account — and offers the one step that exists, support. ⛔ Its copy (`kycGate.frozen*`) must not ask
 * for verification: verifying would open nothing, and the quiet rule keeps identity out of places it
 * does not decide. Its tone is the kit Callout's warning tokens — app-state ink, which resolves to gilt — because a
 * hold is not a decision against the player; never the betting pair.
 *
 * ⭐ AND THE CONFIRMED EMAIL (owner ruling 2026-10-07). A deposit asks no email question any more; a WITHDRAWAL needs a
 * confirmed address, asked after identity (`wallet-service.withdraw()`). This panel tells that in ONE card, in the
 * server's order, so a player never clears the step it showed and is then refused for one it did not (E-5):
 *   · state `email` — identity is settled and only the address is owed. The address on file is shown (mono, never
 *     truncated) with "Send the link again" and a door to change it; with no address, the one step is "Add email".
 *   · the `email` PROP on an identity state — both are owed: the identity step stays the card's ONE primary action,
 *     and the email step sits under a hairline with a ghost 40px control. Not on `refused_final` or `frozen`: there,
 *     confirming an address would open nothing.
 * Coming back from the mail app re-reads the page (`useRefreshOnReturn`), so a confirmed address opens the form with
 * its `?amount=` still set; the resend tells its outcome inline (`useResendEmailLink`). Copy says "confirm" and
 * "before you withdraw", never "first": the step comes back whenever the address is changed or removed.
 * Under `pending_review` the card's body says what WE do and the step is titled "While you wait…": "Nothing more to do"
 * above a step the player still owes was the card contradicting itself (design review, 2026-10-07). The doors to the
 * account page carry `?next=` (the same safe path as the identity CTA), so a changed address leads back here.
 * ⛔ Every control here is `type="button"` or a link: the panel is never inside the payout `<form>`, and must never
 * become a second submitter if a refactor moved it there (`test:implicit-submit`).
 *
 * ⚠️ NOT AN ALERT, AND NOT A LIVE REGION (2026-10-07). An unverified account is an ordinary condition, drawn with the
 * page, so there is nothing to announce. The card was `role="status"` with the resend's outcome as a SECOND status
 * inside it, inserted already filled: an atomic outer region re-reads the whole card, and a region born with its text
 * is often not read at all. Now the one live region is the outcome line, mounted EMPTY beside the email controls and
 * filled when the outcome arrives (§A7).
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import type { KycPanelState } from "@/lib/kyc-gate-state";
import { KYC_REVIEW_SLA_HOURS } from "@/lib/kyc-sla";
import { durationHours } from "@/lib/duration-phrase";
import { isSafePath } from "@/lib/safe-next";
import { useRefreshOnReturn, useResendEmailLink } from "@/lib/use-email-confirm";

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
  /** Money is held on this account (2026-09-14). The kit Callout's warning tone, verbatim — amber
   *  app-state ink, the same family the page's own hold line uses; never the betting pair. */
  held:    { ring: "border-warning-border", ink: "text-warning-fg", wash: "bg-warning-bg" },
} as const;

const BY_STATE: Record<KycPanelState, {
  tone: keyof typeof TONE;
  glyph: keyof typeof I;
  /** Where the CTA goes, or `null` for none. ⛔ `null` for PENDING_REVIEW — opening the form shows a
   *  "we're reviewing" panel and nothing to act on, so a CTA there is a button that leads nowhere.
   *  `email` draws its own controls (resend / change, or add) below. */
  cta: "verify" | "support" | "email" | null;
}> = {
  not_started:    { tone: "neutral", glyph: "shieldcheck", cta: "verify" },
  uploaded:       { tone: "action",  glyph: "upload",      cta: "verify" },
  pending_review: { tone: "waiting", glyph: "clock",       cta: null },
  more_info:      { tone: "action",  glyph: "upload",      cta: "verify" },
  rejected:       { tone: "refused", glyph: "alertCircle", cta: "verify" },
  refused_final:  { tone: "refused", glyph: "alertCircle", cta: "support" },
  /** A wallet hold, not an identity state: support is the only step there is. */
  frozen:         { tone: "held",    glyph: "lock",        cta: "support" },
  /** An address to confirm (2026-10-07): nothing has gone wrong, there is one step — brand, like `not_started`. */
  email:          { tone: "neutral", glyph: "mail",        cta: "email" },
};

/** The outcome line of the resend, in app-state ink: sent → success, a wait → muted, a failure → danger. */
const RESULT_INK = { ok: "text-success-fg", info: "text-text-muted", err: "text-danger-fg" } as const;

export function KycGatePanel({
  state,
  purpose,
  /** Where to come back to once they are verified — round-tripped as `?next=`. */
  returnTo,
  email,
}: {
  /** An identity state from `kycGateState`, or `frozen` / `email` — chosen by the withdraw page. */
  state: KycPanelState;
  /** `payout` on the withdrawal form; `agent` on the agent application. */
  purpose: "payout" | "agent";
  returnTo?: string;
  /** The account's email standing while a confirmed address is still owed — the address on file, or null when there is
   *  none. Read by the `email` state, and on an identity state it adds the email as the card's second step. Omit it when
   *  the address is confirmed. */
  email?: { address: string | null } | null;
}) {
  const { t, locale } = useT();
  const spec = BY_STATE[state];
  const tone = TONE[spec.tone];
  const Glyph = I[spec.glyph];
  const payout = purpose === "payout";
  const zhKeep = locale === "zh" ? "break-keep [overflow-wrap:anywhere]" : "";

  const emailOnly = state === "email";
  // The second step rides on an identity state only: a frozen wallet or a final refusal would open nothing.
  const emailStep = !emailOnly && !!email && state !== "frozen" && state !== "refused_final";
  const address = email?.address ?? null;
  const { pending, result, resend } = useResendEmailLink();
  useRefreshOnReturn(emailOnly || emailStep);

  const copy = {
    not_started:    { eyebrow: payout ? t.kycGate.eyebrowPayout : t.kycGate.eyebrowVerify, title: t.kycGate.titleNotStarted, body: t.kycGate.bodyNotStarted,  cta: t.kycGate.ctaStart },
    uploaded:       { eyebrow: payout ? t.kycGate.eyebrowPayout : t.kycGate.eyebrowAction, title: t.kycGate.titleUploaded,   body: t.kycGate.bodyUploaded,    cta: t.kycGate.ctaFinish },
    pending_review: { eyebrow: t.kycGate.eyebrowPending, title: t.kycGate.titlePending,  body: fill(emailStep ? t.kycGate.bodyPendingEmail : t.kycGate.bodyPending, { hours: durationHours(locale, KYC_REVIEW_SLA_HOURS) }), cta: "" },
    more_info:      { eyebrow: t.kycGate.eyebrowAction,  title: t.kycGate.titleMoreInfo, body: t.kycGate.bodyMoreInfo,     cta: t.kycGate.ctaUpload },
    rejected:       { eyebrow: t.kycGate.eyebrowAction,  title: t.kycGate.titleRejected, body: t.kycGate.bodyRejected,     cta: t.kycGate.ctaRetry },
    // ⛔ NOT "Your move" (2026-09-13, found on a screenshot): a FINAL refusal cannot be restarted by the player,
    // so its label names the subject and calls for nothing — the only step is support, and the CTA says so.
    refused_final:  { eyebrow: t.kycGate.eyebrowIdentity, title: t.kycGate.titleRejected, body: t.kycGate.bodyRefusedFinal, cta: t.kycGate.ctaSupport },
    // A wallet hold (2026-09-14): its own words, which ask for nothing but the route to support.
    frozen:         { eyebrow: t.kycGate.frozenEyebrow,   title: t.kycGate.frozenTitle,   body: t.kycGate.frozenBody,       cta: t.kycGate.frozenCta },
    // The confirmed email (2026-10-07). "We sent a link" only when an address exists — nothing was sent to none.
    email:          { eyebrow: t.kycGate.eyebrowPayout,   title: t.kycGate.emailTitle,    body: address ? t.kycGate.emailBody : t.kycGate.emailBodyNone, cta: "" },
  }[state];

  // ⭐ THE WAIT IS A NUMBER (`KYC_REVIEW_SLA_HOURS`, the officer's own clock), shown on the withdrawal
  // screen only while the next move is still the player's. ONE quiet caption under the body — not a
  // list, not a glyph row — because it is a single fact and must not compete with the button.
  const showWait = payout && (state === "not_started" || state === "uploaded");

  // ⛔ Only a same-site absolute path may round-trip, and it is re-checked HERE as well as on the KYC
  // page. A `next` that leaves the site is an open redirect, and this panel is rendered on a money
  // surface where the URL is the most attacker-visible thing there is. The one shared rule — this private copy let
  // "/\evil.example" and control characters through until 2026-10-06.
  const safeNext = isSafePath(returnTo) ? returnTo : null;
  const verifyHref = safeNext ? `/profile/kyc?next=${encodeURIComponent(safeNext)}` : "/profile/kyc";
  const href = spec.cta === "support" ? "/help" : verifyHref;
  // The account page changes or adds the address; `next` brings the player back to this screen, amount and all.
  const accountHref = safeNext ? `/profile/account?next=${encodeURIComponent(safeNext)}` : "/profile/account";
  // While our team reviews the documents, the email step is what the player can do meanwhile — titled so.
  const waiting = state === "pending_review";
  const stepTitle = address
    ? (waiting ? t.kycGate.emailStepWaitTitle : t.kycGate.emailStepTitle)
    : (waiting ? t.kycGate.emailStepWaitNone : t.kycGate.emailStepNone);

  // The resend's outcome, told where the player pressed — the ONE live region (role=status: a fact, not an emergency),
  // always mounted with the email controls and empty until there is something to say.
  const resultLine = (
    <p role="status" data-kyc-email-result={result?.tone} className={`text-body-sm font-medium leading-snug max-w-[42ch] mx-auto text-balance ${result ? `mt-3 ${RESULT_INK[result.tone]}` : ""} ${zhKeep}`}>
      {result?.message ?? ""}
    </p>
  );

  return (
    <section
      data-testid="kyc-gate-panel"
      data-kyc-state={state}
      data-kyc-purpose={purpose}
      data-kyc-email={emailOnly || emailStep ? "owed" : undefined}
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
      {/* 2026-09-14 — the title is balanced like the lines under it: "We're checking your / documents" left one word
          alone at 360. In zh the body and caption break only at punctuation (keep-all), because a balanced 42ch
          measure split a two-character word across the break; overflow-wrap still lets an over-long run wrap. */}
      <h3 className="mt-1.5 font-display text-[18px] font-bold text-text leading-tight text-balance">{copy.title}</h3>
      <p className={`mt-1.5 text-body-sm text-text-muted leading-snug max-w-[42ch] mx-auto text-balance ${zhKeep}`}>{copy.body}</p>
      {emailOnly && address && (
        // The address the link went to — mono, wrapped anywhere, never truncated: a player checks it character by character.
        <p data-kyc-email-address className="mt-3 mx-auto max-w-[42ch] rounded-control border border-border bg-bg-inset px-3 py-2 font-mono text-body-sm text-text break-all">
          {address}
        </p>
      )}
      {showWait && (
        <p data-kyc-payout-line="wait" className={`mt-2 text-body-sm text-text-subtle leading-snug max-w-[42ch] mx-auto text-balance ${zhKeep}`}>
          {fill(t.kycGate.payoutWait, { hours: durationHours(locale, KYC_REVIEW_SLA_HOURS) })}
        </p>
      )}
      {(spec.cta === "verify" || spec.cta === "support") && (
        <div>
          <Link href={href as never} className="btn btn-primary btn-md btn-pill mt-4 inline-flex items-center gap-1.5">
            {spec.cta === "support" ? <I.mail s={14} /> : <I.shieldcheck s={14} />}
            {copy.cta}
          </Link>
        </div>
      )}
      {emailOnly && (
        <>
          <div className="mt-4 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            {address ? (
              <>
                <Button type="button" variant="primary" size="md" onClick={resend} loading={pending} leading={<I.mail s={14} />} className="btn-pill">
                  {t.wallet.verifyResendCta}
                </Button>
                <Link href={accountHref as never} className="btn btn-ghost btn-md btn-pill inline-flex items-center justify-center gap-1.5">
                  <I.user s={14} />
                  {t.wallet.verifyChangeEmailCta}
                </Link>
              </>
            ) : (
              <Link href={accountHref as never} className="btn btn-primary btn-md btn-pill inline-flex items-center justify-center gap-1.5">
                <I.mail s={14} />
                {t.wallet.verifyAddEmailCta}
              </Link>
            )}
          </div>
          {resultLine}
        </>
      )}
      {emailStep && (
        <div data-kyc-step="email" className="mt-5 border-t border-border pt-4">
          <p className={`font-display text-body font-semibold text-text leading-tight text-balance ${zhKeep}`}>
            {stepTitle}
          </p>
          {address && <p className="mt-1 font-mono text-body-sm text-text-muted break-all">{address}</p>}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {address ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={resend} loading={pending} leading={<I.mail s={14} />} className="btn-pill">
                  {t.wallet.verifyResendCta}
                </Button>
                {/* A mistyped address is fixed from here too — the same door as the email-only card. */}
                <Link href={accountHref as never} className="btn btn-ghost btn-sm btn-pill inline-flex items-center gap-1.5">
                  <I.user s={14} />
                  {t.wallet.verifyChangeEmailCta}
                </Link>
              </>
            ) : (
              <Link href={accountHref as never} className="btn btn-ghost btn-sm btn-pill inline-flex items-center gap-1.5">
                <I.mail s={14} />
                {t.wallet.verifyAddEmailCta}
              </Link>
            )}
          </div>
          {resultLine}
        </div>
      )}
    </section>
  );
}
