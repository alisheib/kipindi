import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
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
    <main className="relative min-h-[calc(100vh-44px)] grid place-items-center overflow-hidden px-3 py-8">
      <BrandTopo opacity={0.05} />
      <div className="relative w-full max-w-md">
        <Link href="/" aria-label="50pick home" className="inline-block mb-6">
          <FiftyLockup size={22} />
        </Link>

        <section className="rounded-xl glass-panel p-6 space-y-5">
          <span
            className={`inline-flex h-12 w-12 items-center justify-center rounded-pill ${
              good ? "bg-yes-500/12 text-yes-300" : "bg-no-500/12 text-no-300"
            }`}
          >
            {good ? <I.mail s={22} /> : <I.alertCircle s={22} />}
          </span>

          <div>
            <p className={`font-mono text-[11px] uppercase tracking-[0.16em] font-bold ${good ? "text-yes-300" : "text-no-300"}`}>
              {c.eyebrow}
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
              {c.title}
            </h1>
            <p className="mt-2 text-[13.5px] text-text-muted leading-relaxed">
              {c.body}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <Link href="/markets" className="btn btn-gold btn-lg w-full" style={{ borderRadius: "var(--r-pill)" }}>
              {t.home.heroCta}
            </Link>
            <Link
              href="/profile/account"
              className="btn btn-ghost btn-lg w-full"
              style={{ borderRadius: "var(--r-pill)" }}
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
        </section>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle">
          {t.auth.licensedByGbt} {HELPLINE()}
        </p>
      </div>
    </main>
  );
}
