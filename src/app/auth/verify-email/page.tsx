import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel, AuthHeader } from "@/components/auth/auth-panel";
import { PasswordInput } from "@/components/ui/password-input";
import { FieldLegend } from "@/components/ui/field-legend";
import { SubmitButton } from "@/components/ui/submit-button";
import { SUPPORT_EMAIL } from "@/lib/server/support-config";
import { currentSession } from "@/lib/server/auth-service";
import { openEmailVerifyLink } from "@/lib/server/email-verification";
import { getServerT } from "@/lib/i18n-server";
import { bannerFor } from "@/lib/failure-banner";
import { confirmEmailAction } from "./actions";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.confirmEmailTitle };
}
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams?: Promise<{ token?: string; done?: string; reason?: string; retry?: string }> }) {
  const { t } = await getServerT();
  const sp = (await searchParams) ?? {};
  // 🔴 A3 (route audit 2026-10-06) · OPENING THE LINK CONFIRMS ONLY FOR THE ACCOUNT HOLDER. It used to confirm during this
  // GET for anyone holding the link — a mail scanner, or the stranger who owns a mistyped address. A pending link now
  // confirms on open only inside the account's own session; anywhere else this page asks for the account's password.
  const session = await currentSession().catch(() => null);
  const r = await openEmailVerifyLink(sp.token, session?.userId ?? null);
  // `done=1` is the password form's own success hop: by then the link reads "already", and it was THIS confirmation.
  const status = r.status === "already" && sp.done === "1" ? "verified" : r.status;
  // Another account is signed in on this browser: "Add funds" would open THAT account's deposit screen.
  const otherSignedIn = !!session && !!r.tokenUserId && session.userId !== r.tokenUserId;

  if (status === "needs_password") {
    const retry = Math.min(3600, Math.max(0, Number.parseInt(sp.retry ?? "", 10) || 0));
    const banner = bannerFor(sp.reason, t.error as unknown as Record<string, string>, retry > 0 ? { retryAfterSec: retry } : undefined);
    return (
      <AuthShell>

          <AuthPanel>
            {/* Royal, not the success or danger family: nothing is confirmed yet, and nothing failed. LITERAL sizes, as
                below — spacing is overridden (tailwind.config.ts:200-215). */}
            <span className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-pill border border-brand-600/60 bg-brand-500/10 text-brand-300">
              <I.mail s={22} />
            </span>

            <AuthHeader
              tone="brand"
              eyebrow={t.common.confirmEmailTitle}
              title={t.common.confirmEmailPasswordTitle}
              subtitle={t.common.confirmEmailPasswordBody}
              subtitleLead="relaxed"
            />

            {banner && (
              <div role="alert" className="rounded-md border border-danger-500/70 bg-danger-500/10 px-3.5 py-3 text-[13px] text-danger-fg">
                {banner.body}
              </div>
            )}

            {/* ⛔ The address is never shown in this view: whoever holds the link may not be the account holder. */}
            <form action={confirmEmailAction} className="space-y-4">
              <input type="hidden" name="token" value={sp.token ?? ""} />
              <div>
                <FieldLegend as="label" htmlFor="password" className="block mb-1.5">
                  {t.common.passwordLabel}
                </FieldLegend>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  size="lg"
                />
              </div>
              <SubmitButton label={t.common.confirmMyEmail} pendingLabel={t.common.verifying} />
            </form>

            <Link href="/auth/forgot-password" className="btn btn-ghost btn-lg btn-pill w-full">
              {t.auth.forgotPassword}
            </Link>

            <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
              {t.common.needHelpEmail}{" "}
              <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline">
                {SUPPORT_EMAIL()}
              </a>
            </p>
          </AuthPanel>

      </AuthShell>
    );
  }

  const COPY = {
    verified: {
      eyebrow: t.common.emailConfirmedEyebrow,
      title: t.common.emailConfirmedTitle,
      body: t.common.emailConfirmedBody,
      tone: "good" as const,
    },
    already: {
      eyebrow: t.common.alreadyConfirmed,
      title: t.common.emailAlreadyConfirmedTitle,
      body: t.common.emailAlreadyConfirmedBody,
      tone: "good" as const,
    },
    mismatch: {
      eyebrow: t.common.linkOutOfDate,
      title: t.common.emailMismatchTitle,
      body: t.common.emailMismatchBody,
      tone: "bad" as const,
    },
    invalid: {
      eyebrow: t.common.linkInvalid,
      title: t.common.emailInvalidTitle,
      body: t.common.emailInvalidBody,
      tone: "bad" as const,
    },
  };

  const c = COPY[status];
  const good = c.tone === "good";

  return (
    <AuthShell>

        <AuthPanel>
          {/* `/[0.12]` and not `/12`: Tailwind's opacity scale runs in steps of 5, so
              `/12` was dropped before the mix and BOTH medallions rendered with no fill
              — confirmed and failed looked identical apart from the glyph tint. Email
              confirmation gates the first deposit, so this chip sits on the money-in
              ladder and has to read at a glance. */}
          <span
            /* ⚠️ LITERALS, not `h-12 w-12` — spacing is overridden (tailwind.config.ts:200-215)
               and `h-12` rendered a 128px disc on the money-in ladder described above. */
            className={`inline-flex h-[48px] w-[48px] items-center justify-center rounded-pill ${
              /* D2 (2026-08-21): the SEMANTIC families. A confirmed inbox is not a
                 won bet and an expired link is not a lost one — §B2 keeps `--yes-*`
                 / `--no-*` for money. The medallion still reads green-vs-rose at a
                 glance, on the jade green that means "app state" everywhere else. */
              good ? "bg-success/[0.12] text-success-fg" : "bg-danger-500/[0.12] text-danger-fg"
            }`}
          >
            {good ? <I.mail s={22} /> : <I.alertCircle s={22} />}
          </span>

          <AuthHeader
            tone={good ? "yes" : "no"}
            eyebrow={c.eyebrow}
            title={c.title}
            subtitle={c.body}
            subtitleLead="relaxed"
          />

          {/* ⭐ 2026-10-06 · A CONFIRMED ADDRESS IS ONE TAP FROM THE DEPOSIT IT UNLOCKS. The player confirmed because
              every screen said "confirm your email to add money"; this page then offered only "Browse markets" and
              "Go to account", so the money step had to be found again. Signed out (a link opened in the mail app's own
              browser), `/wallet/deposit` asks them to sign in and keeps the destination. A link that did NOT confirm
              keeps its two doors: the markets, and the account page where a new link is sent. */}
          <div className="flex flex-col gap-2.5">
            {good ? (
              <>
                {/* Not while ANOTHER account is signed in here: the deposit screen would be that account's. */}
                {!otherSignedIn && (
                  <Link href="/wallet/deposit" className="btn btn-primary btn-lg btn-pill w-full">
                    {t.common.addFunds}
                  </Link>
                )}
                <Link href="/markets" className={otherSignedIn ? "btn btn-primary btn-lg btn-pill w-full" : "btn btn-ghost btn-lg btn-pill w-full"}>
                  {t.home.heroCta}
                </Link>
              </>
            ) : (
              <>
                <Link href="/markets" className="btn btn-primary btn-lg btn-pill w-full">
                  {t.home.heroCta}
                </Link>
                <Link
                  href="/profile/account"
                  className="btn btn-ghost btn-lg btn-pill w-full"
                >
                  {t.common.goToAccount}
                </Link>
              </>
            )}
          </div>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            {t.common.needHelpEmail}{" "}
            <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline">
              {SUPPORT_EMAIL()}
            </a>
          </p>
        </AuthPanel>

    </AuthShell>
  );
}
