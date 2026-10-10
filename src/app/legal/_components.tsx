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
import { DotSeq } from "@/components/ui/dot-seq";
import { keepYears } from "@/components/ui/keep-words";
import { keepConnectives } from "@/components/ui/keep-run";
import { type Locale } from "@/lib/i18n-server";

/**
 * ⭐ A LEGAL TITLE NEVER LEAVES ITS LAST WORD ALONE BEHIND A CONNECTIVE (round 5 of the visual pass, 2026-10-09, F16 —
 * tile 210). `PageHeader` balances its h1 "so a wrapping title never leaves one word … alone on its last line" — and for a
 * title of three words balancing cannot keep that promise: "Kanuni za Michezo" is 256.7px against the 254px the legal
 * header leaves its title at 390 (the 40px sigil and its 14px gap beside it), so it wraps, and the evener of its two
 * breaks is "Kanuni za / Michezo" (133 / 118px) — the connective ending line 1 and its noun alone on line 2. Where the
 * second-to-last word is a connective — sw ya · za · wa · la · cha · vya · kwa · na, en of · and · & — the connective and
 * the last word break together (`keepLastWords`), which is how "Masharti / ya Huduma" already wraps: "Kanuni / za Michezo"
 * at 320–390 sw, "Terms / of Service" at 320–360 en, "Sera / ya Faragha" at 320 sw. Every other title, every other width
 * and Chinese are unchanged — names stay whole ("Up & Down", "Mchezo Salama"), as the plain balanced wrap keeps them.
 * ⚠️ The pair cannot break, so it is bound only while it is short: at most 10 characters, and every current pair is
 * measured under the narrowest title line there is (184px at 320 — "ya Huduma" is the widest, 155.6px in Sora 700 at
 * 28px); `test:visual-pass-r5a` §3 holds both. "ya NDIO/HAPANA" (251.6px) is 14 characters and is left to wrap.
 * ⭐ ROUND 7 (2026-10-10, R5-3 and R5-4 — the owner's item 37 made whole): the pair was held only where the connective
 * was the second-to-last word, so round 6 read "Sera ya / Mchezo Salama" (responsible gambling, sw 390) and "Sera ya
 * Kuzuia / Uoshaji wa / Fedha na KYC" (AML). Now EVERY connective keeps the white space after it (`keepConnectives`,
 * keep-run.tsx): no line of any legal title ends on one, and nothing can overflow (the run is a connective and a space,
 * so "ya NDIO/HAPANA" still breaks after its slash where it must). Measured in Chromium's balance, Sora 700 at 28px, at
 * the header's 184 / 224 / 254 / 276px (320–412): "Sera ya Mchezo / Salama" (360–412; "Sera / ya Mchezo / Salama" at
 * 320), "Sera ya Kuzuia / Uoshaji / wa Fedha na KYC" (390–412), "Kanuni za Juu / na Chini" (360–412), "Kanuni / za Masoko
 * / ya NDIO/ / HAPANA" (320–360), "AML & KYC / Policy" and "Up & Down / Rules" (320–360); every other title as before
 * (`test:visual-pass-r7a` §3). Titles without a connective come back as they came.
 */
export function legalTitle(title: string): ReactNode {
  return keepConnectives(title);
}

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
    // Framed like an official regulator letter — the kit's heraldic corners (their documented use is framing regulator
    // letters); glyph + eyebrow stay neutral chrome. ⛔ The corners are CLARET, not gilt (R5-C, the second gold audit,
    // 2026-10-09): gold is money and nothing else (Q5; a decorative gilt element is "a violation, not a style choice",
    // §M3), and §B4 gives regulator chrome to claret — "editorial weight only … regulator/footer crest".
    <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated/50 px-5 py-4 lg:px-6 lg:py-5">
      <GiltCorner size={54} rotate={0} ink="var(--claret-400)" className="absolute left-1 top-1" />
      <GiltCorner size={54} rotate={180} ink="var(--claret-400)" className="absolute right-1 bottom-1" />
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
          <PageHeader eyebrow={eyebrow} title={legalTitle(title)} subtitle={subtitle} />
          {meta && (
            // 2026-09-13: balanced so the zh line does not strand "布。" on its own row.
            // 2026-09-27: 13px, not 11px. The version line is a sentence a reader reads, so it sits on the reading floor (§T4).
            // 2026-10-09 (round 3, tile 207): its two parts — the version and what the document is aligned with — are drawn
            // as `DotSeq` parts, so a line breaks between them and never on the "·": at 390 the privacy line read
            // "Toleo 2026-10-07 ·" over "Imeoanishwa na…". It now reads "Toleo 2026-10-07" over the rest, balanced, and on
            // a line wide enough for both it is the same text, the dot in a 3ch gap ( " · " in the mono face).
            // Round 4 (2026-10-09, tile 210): inside a part a year keeps the word before it (`keepYears`) — the privacy
            // line read "…Personal Data Protection Act" / "2022 na kanuni…", the Act's name split from its year.
            <p className="font-mono text-body-sm tabular-nums text-text-subtle text-balance"><DotSeq text={meta} mono renderPart={keepYears} /></p>
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
      <h2 className="font-display text-[17px] font-semibold text-text leading-tight text-balance">
        <span className="font-mono text-body-sm text-text-subtle mr-2 tabular-nums">{n}.</span>
        {/* Round 7: a section heading never ends a line on a connective either (`keepConnectives`). */}
        {keepConnectives(title)}
      </h2>
      {/* 2026-09-14: text-pretty, inherited by every paragraph and list item, so a zh paragraph does not end
          on one stranded character. Not text-balance: these are long paragraphs. */}
      <div className="text-[13.5px] text-text-muted leading-relaxed space-y-2.5 text-pretty">
        {children}
      </div>
    </section>
  );
}
