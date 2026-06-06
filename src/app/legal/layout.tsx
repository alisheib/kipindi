import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";

const LEGAL_NAV: Array<{ href: string; en: string; sw: string }> = [
  { href: "/legal/terms",                en: "Terms",                sw: "Masharti" },
  { href: "/legal/privacy",              en: "Privacy",              sw: "Faragha" },
  { href: "/legal/responsible-gambling", en: "Responsible Gambling", sw: "Mchezo salama" },
  { href: "/legal/aml",                  en: "AML / KYC",            sw: "Kuzuia uoshaji" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-10">
      <aside className="lg:sticky lg:top-20 self-start space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated p-4">
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(400px 240px at 100% 0%, oklch(58% 0.13 80 / 0.16), transparent 60%), " +
                "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(30% 0.165 268) 100%)",
            }}
          />
          <div className="absolute -right-4 -bottom-4 opacity-[0.06]" aria-hidden>
            <FiftyMark size={120} />
          </div>
          <div className="relative z-10 flex items-center gap-2">
            <I.scrollText s={14} className="text-gold-300" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
              Legal · Sheria
            </p>
          </div>
        </div>
        <nav aria-label="Legal sections" className="rounded-xl glass-panel overflow-hidden">
          {LEGAL_NAV.map((n, i) => (
            <Link
              key={n.href}
              href={n.href as never}
              className={`block px-3.5 py-2.5 hover:bg-bg-overlay transition-colors ${i > 0 ? "border-t border-border" : ""}`}
            >
              <p className="font-display text-[13px] font-semibold text-text leading-tight">{n.en}</p>
              <p className="mt-0.5 text-[11px] italic text-text-subtle">· {n.sw}</p>
            </Link>
          ))}
        </nav>
      </aside>
      <article className="space-y-5 min-w-0">
        {children}
      </article>
    </main>
  );
}
