import Link from "next/link";
import { headers } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { getServerT, type Locale } from "@/lib/i18n-server";

const LEGAL_NAV: Array<{ href: string; label: Record<Locale, string> }> = [
  { href: "/legal/terms",                label: { en: "Terms",                sw: "Masharti",        zh: "服务条款" } },
  { href: "/legal/privacy",              label: { en: "Privacy",              sw: "Faragha",         zh: "隐私" } },
  { href: "/legal/responsible-gambling", label: { en: "Responsible Gambling", sw: "Mchezo Salama",   zh: "责任博彩" } },
  { href: "/legal/aml",                  label: { en: "AML / KYC",            sw: "Kuzuia Uoshaji",  zh: "反洗钱 / KYC" } },
];

const EYEBROW: Record<Locale, string> = {
  en: "Legal",
  sw: "Sheria",
  zh: "法律",
};

const NAV_ARIA: Record<Locale, string> = {
  en: "Legal sections",
  sw: "Sehemu za kisheria",
  zh: "法律章节",
};

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getServerT();
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-10">
      <aside className="lg:sticky lg:top-[76px] self-start space-y-3">
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
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-gold-300">
              {EYEBROW[locale]}
            </p>
          </div>
        </div>
        <nav aria-label={NAV_ARIA[locale]} className="rounded-xl glass-panel overflow-hidden">
          {LEGAL_NAV.map((n, i) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href as never}
                aria-current={active ? "page" : undefined}
                className={`block px-3.5 py-2.5 transition-colors ${i > 0 ? "border-t border-border" : ""} ${
                  active
                    ? "bg-brand-500/10 border-l-2 border-l-brand-500"
                    : "hover:bg-bg-overlay"
                }`}
              >
                <p className={`font-display text-[13px] font-semibold leading-tight ${active ? "text-brand-300" : "text-text"}`}>{n.label[locale]}</p>
              </Link>
            );
          })}
        </nav>
      </aside>
      <article className="space-y-5 min-w-0">
        {children}
      </article>
    </main>
  );
}
