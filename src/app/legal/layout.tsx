import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { getServerT, type Locale } from "@/lib/i18n-server";
import { LegalNav } from "./legal-nav";

const LEGAL_NAV: Array<{ href: string; label: Record<Locale, string> }> = [
  { href: "/legal/terms",                label: { en: "Terms",                sw: "Masharti",        zh: "服务条款" } },
  { href: "/legal/privacy",              label: { en: "Privacy",              sw: "Faragha",         zh: "隐私" } },
  { href: "/legal/responsible-gambling", label: { en: "Responsible Gambling", sw: "Mchezo Salama",   zh: "责任博彩" } },
  { href: "/legal/aml",                  label: { en: "AML / KYC",            sw: "Kuzuia Uoshaji",  zh: "反洗钱 / KYC" } },
];

const EYEBROW: Record<Locale, string> = {
  en: "Legal",
  sw: "Kisheria",
  zh: "法律",
};

const NAV_ARIA: Record<Locale, string> = {
  en: "Legal sections",
  sw: "Sehemu za kisheria",
  zh: "法律章节",
};

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getServerT();
  return (
    <div className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-10">
      <aside className="lg:sticky lg:top-[76px] self-start space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated p-4">
          <div
            className="absolute inset-0"
            aria-hidden
            style={{ background: "var(--hero-panel-grad)" }}
          />
          <div className="absolute -right-4 -bottom-4 opacity-[0.06]" aria-hidden>
            <FiftyMark size={120} />
          </div>
          <div className="relative z-10 flex items-center gap-2">
            <I.scrollText s={14} className="text-text-subtle" />
            <p className="font-mono text-caption uppercase tracking-[0.16em] font-bold text-text-subtle">
              {EYEBROW[locale]}
            </p>
          </div>
        </div>
        {/* 🔴 THE ACTIVE TAB IS DECIDED ON THE CLIENT, AND IT HAS TO BE. This nav used to read
            `x-pathname` here and derive `active` from it — but a layout is NOT re-executed on a
            client-side soft navigation, and all four of these links are soft navigations INSIDE
            this layout. So the highlight froze on whatever route the last HARD load saw: Ali's
            "always Responsible Gambling" was "always the page you arrived on". `LegalNav` reads
            `usePathname()`, which the router re-reads on every route change. The labels stay
            server-resolved and are passed in — only the current route crosses the boundary.
            ⛔ See `legal-nav.tsx` before changing this back; `force-dynamic` does NOT fix it. */}
        <LegalNav
          ariaLabel={NAV_ARIA[locale]}
          items={LEGAL_NAV.map((n) => ({ href: n.href, label: n.label[locale] }))}
        />
      </aside>
      <article className="space-y-5 min-w-0">
        {children}
      </article>
    </div>
  );
}
