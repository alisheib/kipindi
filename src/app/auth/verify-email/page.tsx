import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel, AuthHeader } from "@/components/auth/auth-panel";
import { SUPPORT_EMAIL, HELPLINE } from "@/lib/support-config";
import { verifyEmailToken } from "@/lib/server/email-verification";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.confirmEmailTitle };
}
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams?: Promise<{ token?: string }> }) {
  const { t } = await getServerT();
  const sp = (await searchParams) ?? {};
  const { status } = await verifyEmailToken(sp.token);

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

          <div className="flex flex-col gap-2.5">
            <Link href="/markets" className="btn btn-primary btn-lg btn-pill w-full">
              {t.home.heroCta}
            </Link>
            <Link
              href="/profile/account"
              className="btn btn-ghost btn-lg btn-pill w-full"
            >
              {t.common.goToAccount}
            </Link>
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
