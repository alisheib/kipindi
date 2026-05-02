import Link from "next/link";
import { Pattern } from "@/components/ui/pattern";

const LEGAL_NAV: Array<{ href: string; en: string; sw: string }> = [
  { href: "/legal/terms",                 en: "Terms",               sw: "Masharti" },
  { href: "/legal/privacy",               en: "Privacy",             sw: "Faragha" },
  { href: "/legal/responsible-gambling",  en: "Responsible Gambling", sw: "Mchezo salama" },
  { href: "/legal/aml",                   en: "AML / KYC",           sw: "Kuzuia uoshaji" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <Pattern kind="sokoni" opacity={0.025} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative mx-auto max-w-[1080px] px-3 lg:px-6 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-10">
        <aside className="space-y-1 lg:sticky lg:top-20 self-start">
          <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold mb-3">Legal · Sheria</p>
          {LEGAL_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href as never}
              className="block px-3 py-2 rounded-md text-body-sm hover:bg-surface-2 hover:text-text text-text-secondary transition-colors"
            >
              <span className="font-medium text-text">{n.en}</span>{" "}
              <span className="text-text-tertiary">· {n.sw}</span>
            </Link>
          ))}
        </aside>
        <article className="prose-kp space-y-4">
          {children}
        </article>
      </div>
    </div>
  );
}
