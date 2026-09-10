/**
 * Shared chrome for /legal/* pages — kit-faithful header + Section helper.
 *
 * Every legal page is mostly numbered prose, so we lift the header strip
 * + numbered Section into one place. Drop-in replacement for the per-page
 * <Breadcrumbs> + <h1> + <Section> triplet that previously lived in each
 * file with 50pick tokens.
 */
import { type ReactNode } from "react";
import { I } from "@/components/ui/glyphs";
import { GiltCorner } from "@/components/brand";
import { PageHeader } from "@/components/ui/page-header";
import { type Locale } from "@/lib/i18n-server";

/**
 * WHICH LANGUAGE IS THE LEGALLY BINDING ONE — stated once, for every legal document.
 *
 * ⛔ THIS WAS A FIVE-FOLD COPY, BYTE-IDENTICAL, IN `terms` · `privacy` · `aml` ·
 * `responsible-gambling` · `agent-terms`. §0a of `docs/DESIGN_AUTHORITY.md` is "one fact, one
 * home", and this is a fact about the DOCUMENTS, not about any one of them — so the two new
 * game-rules documents would have made it copies six and seven before anybody noticed it was
 * one sentence at all.
 *
 * ⭐ It matters more than an ordinary duplicate. This sentence decides which text a Board
 * reviewer or a court reads when the translations disagree. Five copies is five chances for one
 * of them to be edited alone — and the drift would be invisible, because no reader ever sees two
 * of these pages at the same moment.
 *
 * ⚠️ A translation here is BINDING TEXT, not copy: change it and the document's META version
 * must bump in the same commit (`legal/terms/page.tsx:22-25` states that rule).
 */
export const LEGAL_BINDING_LANGUAGE: Record<Locale, string> = {
  en: "The English version of this document is the legally binding text; translations are provided for convenience.",
  sw: "Toleo la Kiingereza la waraka huu ndilo lenye nguvu ya kisheria; tafsiri zimetolewa kwa ajili ya urahisi tu.",
  zh: "本文件的英文版本为具有法律约束力的文本；其他语言译本仅供参考之便。",
};

export function LegalHeader({
  title,
  subtitle,
  meta,
  eyebrow = "Legal",
  glyph,
}: {
  title: string;
  subtitle?: string;
  /** Mono one-liner — version, effective date, etc. */
  meta?: string;
  /** Localized eyebrow word — "Legal" / "Kisheria" / "法律". */
  eyebrow?: string;
  /** Per-document sigil key (scrollText / lock / shield / shieldcheck). */
  glyph?: keyof typeof I;
}) {
  const Glyph = glyph ? I[glyph] : null;
  return (
    // Framed like an official regulator letter — the GiltCorner is the kit's
    // sanctioned "seal" (its documented use is framing regulator letters), the
    // single gilt note; glyph + eyebrow stay neutral chrome (gold = money only).
    <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated/50 px-5 py-4 lg:px-6 lg:py-5">
      <GiltCorner size={54} rotate={0} className="absolute left-1 top-1" />
      <GiltCorner size={54} rotate={180} className="absolute right-1 bottom-1" />
      <div className="relative z-10 flex items-start gap-3.5">
        {Glyph && (
          /* ⚠️ LITERALS, not `h-10 w-10` — spacing is overridden (tailwind.config.ts:200-215),
             so `h-10` was 80px and out-sized the size={54} GiltCorner it sits under. */
          <span className="mt-0.5 grid h-[40px] w-[40px] shrink-0 place-items-center rounded-lg border border-border bg-bg-overlay text-text-muted">
            <Glyph s={20} />
          </span>
        )}
        {/* ⭐ DG-P-03 (2026-08-30) — THE LEGAL HEADER JOINS `PageHeader`, AND IT WAS THE BIGGEST
            h1 IN THE ROW THAT NOBODY HAD COUNTED. The handover listed four page-level h1s; its
            census was literal-`<h1>` files plus `PageHeader` files, so it could not see a
            component that renders its own — and none of `/legal/licence`, `/aml`, `/privacy` or
            `/responsible-gambling` contains an `<h1>` of its own. All four got their title from
            the one line here: `text-[26px] lg:text-[30px]`, and §T7 says a `.tsx` reaches only
            64·48·36·28·22·18·16·14·13·12·11·10 — there is no 26 and no 30. §T2 puts a page title
            on the 28px step, which is exactly what `PageHeader` gives its other 31 call sites.
            ⚠️ THREE VALUES MOVE, all toward the kit and all deliberate: the h1 26→28 below 1024
            and 30→28 above it (the `lg:` step goes — no other `PageHeader` call site has one);
            the eyebrow 10→11px, which is the drift `PageHeader`'s own header says it exists to
            normalise; and the subtitle 14→13px. ⛔ The `meta` line stays OUTSIDE the component:
            `PageHeader` has no slot for it, and adding one for a single caller would widen a
            31-site primitive to fit its 32nd. The `space-y-1` still spaces it, unchanged. */}
        <div className="min-w-0 space-y-1">
          <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
          {meta && (
            <p className="font-mono text-[11px] tabular-nums text-text-subtle">{meta}</p>
          )}
        </div>
      </div>
    </header>
  );
}

export function LegalSection({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 pt-2">
      <h2 className="font-display text-[17px] font-semibold text-text leading-tight">
        <span className="font-mono text-[12px] text-text-subtle mr-2 tabular-nums">{n}.</span>
        {title}
      </h2>
      <div className="text-[13.5px] text-text-muted leading-relaxed space-y-2.5">
        {children}
      </div>
    </section>
  );
}
