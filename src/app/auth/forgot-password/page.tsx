import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel, AuthHeader } from "@/components/auth/auth-panel";
import { LoginIdentifier } from "@/components/auth/login-identifier";
import { SubmitButton } from "@/components/ui/submit-button";
import { SUPPORT_EMAIL, HELPLINE, HELPLINE_TEL } from "@/lib/support-config";
import { requestResetAction } from "./actions";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.auth.forgotPassword };
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams?: Promise<{ sent?: string; identifier?: string; phone?: string; error?: string }> }) {
  const { t } = await getServerT();
  const sp = (await searchParams) ?? {};
  const sent = sp.sent === "1";

  // Round-trip whatever the player typed. `?phone=` is still read so an older
  // cached page (or a bookmarked link) refills correctly — the same allowance
  // the action makes for the legacy field name.
  const typed = (sp.identifier ?? sp.phone ?? "").trim().slice(0, 254);

  // ⭐ THE DISTINCTION ALI ASKED FOR, AND IT IS A REAL ONE RATHER THAN A STYLE.
  // The two entry paths do not carry the same guarantee, so they must not make
  // the same promise:
  //   · an ADDRESS was typed → we have somewhere to send to, by construction.
  //   · a NUMBER was typed   → the account behind it may carry no email at all
  //     (34 of 100 production accounts do not), and for those players the link
  //     can never arrive. Saying "check your email" flatly would be false for
  //     them, so that branch keeps the qualifier AND raises the support route.
  // Both sentences stay enumeration-neutral: each says "IF an account…", so
  // neither confirms that this number or address is registered.
  const viaEmail = typed.includes("@");
  const defaultMethod: "email" | "phone" = viaEmail ? "email" : "phone";

  return (
    <AuthShell>

        <AuthPanel>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 font-mono text-caption uppercase tracking-[0.16em] text-text-subtle hover:text-text"
          >
            <I.chevronLeft s={14} />
            {t.common.backToSignIn}
          </Link>

          <AuthHeader
            eyebrow={t.auth.forgotPassword}
            title={t.common.recoverAccount}
            subtitle={t.common.recoverBody}
          />

          {sent && (
            <div role="status" className="rounded-md border border-success/65 bg-success/10 px-3.5 py-3 text-[13px]">
              <p className="font-display font-semibold text-success-fg">{t.common.checkEmail}</p>
              <p className="mt-0.5 text-text-muted">
                {viaEmail ? t.common.checkEmailBodyAddress : t.common.checkEmailBody}
              </p>
            </div>
          )}

          {sp.error === "identifier_required" && (
            <div role="alert" className="rounded-md border border-danger-500/70 bg-danger-500/10 px-3.5 py-3 text-[13px] text-danger-fg">
              {t.common.enterPhoneOrEmail}
            </div>
          )}
          {sp.error === "rate_limited" && (
            <div role="alert" className="rounded-md border border-warning-border bg-warning-bg px-3.5 py-3 text-[13px] text-gold-300">
              {t.common.tooManyAttempts}
            </div>
          )}

          {!sent && (
            <form action={requestResetAction} className="space-y-4">
              {/* ⭐ THE SAME CONTROL THE SIGN-IN PAGE USES, not a second one built
                  to look like it. `LoginIdentifier` already owns the segmented
                  Phone/Email switcher, the morphing field, the label and hint
                  swap, the 44px height that matches --h-input, radiogroup
                  keyboard semantics, and all three locales — and it already
                  submits under `identifier`, which is exactly what the action
                  reads. Recovery asking for a credential in a different shape
                  from the page that asks for the same credential one click away
                  is the inconsistency this removes. */}
              <LoginIdentifier
                defaultMethod={defaultMethod}
                defaultValue={typed}
                invalid={sp.error === "identifier_required"}
              />
              <SubmitButton label={t.common.sendResetLink} pendingLabel={t.common.sending} />
            </form>
          )}

          {/* Fallback — users without email */}
          <div className="rounded-xl border border-border bg-bg-overlay/40 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <I.shieldQuestion s={16} className="mt-0.5 shrink-0 text-text-subtle" />
              <div className="text-body-sm text-text-muted leading-relaxed">
                <p className="font-display font-semibold text-text">{t.common.noEmailContactSupport}</p>
                <p>
                  {t.common.noEmailHelp}
                </p>
              </div>
            </div>
            {/* 🔴 DG-P-08 · THE SUPPORT ADDRESS WAS CLIPPED, AND ONLY ON THE WIDE SCREENS.
                `sm:grid-cols-2` split this 448px panel into two 164px cards, which leaves the
                mono line below exactly 106.0px of content box:
                  max-w-md 448 − 2 (glass-panel border, globals.css:2981-2983) − 64 (p-6)
                  = 382 → −2 −40 (p-4 above) = 340 → (340 − 12 gap-2)/2 = 164 per column
                  → −2 −32 (px-3) = 130 → −14 (the 14px glyph) −10 (gap-2.5) = 106.0
                on this repo's OVERRIDDEN spacing scale (tailwind.config.ts:204-219 — 6→32,
                4→20, 3→16, 2→12; "2.5" is NOT overridden so it stays 0.625rem = 10px).
                `support@50pick.tz` is 17 characters of JetBrains Mono, whose advance is 0.6em:
                17 × 0.6 × 11px = 112.2px. ⭐ AND IT WAS DRIVEN, not just derived — a static
                harness over `.next`'s own compiled stylesheet and the real self-hosted JBM
                measures the box at exactly 106px and the string at 112px, `scrollWidth >
                clientWidth` at 640, 768, 1024 AND 1440, and NOT clipped at 390. So it read
                `support@50pick.…` — the TLD gone — on every desktop and tablet, and correctly
                on a phone, which is the inverse of where anyone looks for it.
                ⛔ NOT "one `min-w-0` away": the column below already carries `min-w-0`, and it
                is the ENABLER of the ellipsis, not its cure — a flex item's automatic minimum
                size is its content unless something sets it, so removing it would push the
                address OUT of the card instead of ellipsising it inside it (E-30, the same box
                model admin-clip.test.mts was written for).
                THE FIX IS THE RULING'S OWN FIRST SENTENCE — "The value must FIT, wrapping to a
                second row if it has to" (operation-result-modal.tsx:455-466, reported from a
                real withdrawal 2026-07-29). One column gives each card the full 340px row, and
                the same harness then measures the address at 112px in a 112px box — ONE line,
                no ellipsis, at 390, 640, 768, 1024 and 1440. `break-all` below is the
                length-agnostic backstop for an operator override at /admin/system.
                ⚠️ THIS CHANGES NOTHING ON A PHONE — the grid was already `grid-cols-1` under
                640px, which is the only width where the address was legible. And the Swahili
                render improves twice over: `saa 2 asubuhi – saa 2 usiku` (~135px) stopped
                wrapping to two lines in the card beside it. */}
            <div className="grid grid-cols-1 gap-2">
              <a
                href={`tel:${HELPLINE_TEL()}`}
                className="flex items-center gap-2.5 rounded-md border border-border bg-bg-elevated px-3 py-2.5 hover:border-brand-400 transition-colors"
              >
                <I.phone s={14} className="text-gold-300 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-bold text-text">{HELPLINE()}</p>
                  <p className="text-[10px] text-text-subtle">{t.common.businessHours}</p>
                </div>
              </a>
              <a
                href={`mailto:${SUPPORT_EMAIL()}?subject=Password%20reset%20request`}
                className="flex items-center gap-2.5 rounded-md border border-border bg-bg-elevated px-3 py-2.5 hover:border-brand-400 transition-colors"
              >
                <I.mail s={14} className="text-gold-300 shrink-0" />
                <div className="min-w-0">
                  {/* `break-all`, not `truncate` — the same string, on the same product, already
                      renders this way at src/app/help/page.tsx:180, so the two pages are one
                      decision rather than two habits. An address a locked-out player cannot read
                      is the one fact this card exists to carry, and §A5 offers wrap OR ellipsise:
                      an ellipsis here does not shorten the address, it states a different one.
                      `break-all` is the only break that acts on an unbroken token (the 2026-07-29
                      ruling above; E-100 at wallet-client.tsx:425-431, Ali on a real phone). */}
                  <p className="font-mono text-[11px] font-bold text-text break-all">{SUPPORT_EMAIL()}</p>
                  <p className="text-[10px] text-text-subtle">{t.common.oneBusinessDay}</p>
                </div>
              </a>
            </div>
          </div>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            {t.common.rememberedIt}{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"
            >
              {t.common.signIn}
            </Link>
          </p>
        </AuthPanel>

    </AuthShell>
  );
}
