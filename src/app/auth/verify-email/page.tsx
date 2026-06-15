import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { SUPPORT_EMAIL, HELPLINE } from "@/lib/support-config";
import { verifyEmailToken } from "@/lib/server/email-verification";

export const metadata = { title: "Confirm email · Thibitisha barua pepe" };
export const dynamic = "force-dynamic";

const COPY = {
  verified: {
    eyebrow: "Email confirmed · Imethibitishwa",
    title: "Your email is confirmed",
    body: "Thank you. We'll send your account, deposit, withdrawal, and verification notices here.",
    sw: "Asante. Tutatuma taarifa za akaunti yako kwenye barua pepe hii.",
    tone: "good" as const,
  },
  already: {
    eyebrow: "Already confirmed · Tayari",
    title: "This email is already confirmed",
    body: "Nothing more to do — your email was confirmed earlier. You're all set.",
    sw: "Barua pepe yako tayari imethibitishwa.",
    tone: "good" as const,
  },
  mismatch: {
    eyebrow: "Link out of date · Kiungo kimepitwa",
    title: "This link is out of date",
    body: "Your email address changed after this link was sent, so it no longer applies. Open your profile to send a fresh confirmation link.",
    sw: "Barua pepe yako ilibadilika. Fungua wasifu wako kupata kiungo kipya.",
    tone: "bad" as const,
  },
  invalid: {
    eyebrow: "Link invalid or expired · Kiungo si sahihi",
    title: "We couldn't confirm this link",
    body: "The confirmation link is invalid or has expired (links last 24 hours). Open your profile to send a fresh one.",
    sw: "Kiungo si sahihi au kimeisha muda. Fungua wasifu wako kupata kipya.",
    tone: "bad" as const,
  },
};

export default async function VerifyEmailPage({ searchParams }: { searchParams?: Promise<{ token?: string }> }) {
  const sp = (await searchParams) ?? {};
  const { status } = await verifyEmailToken(sp.token);
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
            {good ? <I.check s={22} /> : <I.alertCircle s={22} />}
          </span>

          <div>
            <p className={`font-mono text-[11px] uppercase tracking-[0.16em] font-bold ${good ? "text-yes-300" : "text-no-300"}`}>
              {c.eyebrow}
            </p>
            <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight text-text tracking-[-0.02em]">
              {c.title}
            </h1>
            <p className="mt-2 text-[13.5px] text-text-muted leading-relaxed">
              {c.body}
              <span className="block italic text-text-subtle text-[12px] mt-1">{c.sw}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <Link href="/markets" className="btn btn-gold btn-lg w-full" style={{ borderRadius: "var(--r-pill)" }}>
              Browse markets · Tazama masoko
            </Link>
            {!good && (
              <Link
                href="/profile/account"
                className="btn btn-ghost btn-lg w-full"
                style={{ borderRadius: "var(--r-pill)" }}
              >
                Go to account · Resend link
              </Link>
            )}
          </div>

          <p className="border-t border-border pt-3 text-center text-[12.5px] text-text-muted">
            Need help? Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-semibold text-accent-400 hover:text-accent-300 underline-offset-2 hover:underline">
              {SUPPORT_EMAIL()}
            </a>
          </p>
        </section>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle">
          18+ · Licensed by GBT · Helpline {HELPLINE()}
        </p>
      </div>
    </main>
  );
}
