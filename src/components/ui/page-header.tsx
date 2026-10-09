import type { ReactNode } from "react";

/**
 * PageHeader — the eyebrow + H1 pair used at the top of form-hero pages
 * (deposit, withdraw, help, profile/*). Normalizes the two drifting bits:
 *   - eyebrow: font-mono text-[11px] tracking-[0.16em] (was 10px on ~8 pages)
 *   - title:   font-display text-[28px] tracking-[-0.02em]
 *
 * `tone` colors the eyebrow to the page's accent (info = account/security/protection). Longer descriptive
 * paragraphs stay in the page as a sibling; `subtitle` is only for the short italic tagline.
 * ⛔ NO `yes` (R5-I, 2026-10-09; DESIGN_AUTHORITY §B2a): its one caller was the responsible-gambling page — "protection"
 * in the YES side's green. It takes `info` with the other account pages, and the option is gone, as `gold` went below.
 * ⛔ NO `gold` (R5-C, the second gold audit, 2026-10-09; DESIGN_AUTHORITY Q5 "gold is money, and nothing else"): an
 * eyebrow names a page and is never money. Its only callers were /proposals and /proposals/new ("MAPENDEKEZO" in gold
 * with a trophy); they take the default, the ink 191 player eyebrows already wear. It is out of the map, as R4-I took it
 * out of AuthHeader's, so no call site can ask for it again.
 */
type Tone = "subtle" | "info";

const EYEBROW_TONE: Record<Tone, string> = {
  subtle: "text-text-subtle",
  info: "text-info-fg",
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  tone = "subtle",
  className,
  actions,
}: {
  /**
   * The small line over the heading, with `icon` inside it. ⭐ Optional since the Vodacom plan S6 (WP9): Tiketi zangu's
   * head is the name alone — the canvas draws no line over it, and the classic one says "Nafasi" — so the line is drawn
   * only when it is given. Every other call site passes one, and for them the line is the element it always was.
   * A node, as `title` is (round 5's follow-up, R5-K, 2026-10-09): so a loading ghost can set the line's words and not
   * show them (`ghost-text.tsx`) where the page's eyebrow is not a word the ghost may state — the provider's return.
   */
  eyebrow?: ReactNode;
  /** A node, so a loading skeleton can render the SAME heading with its text as a placeholder bar. */
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
  /**
   * Controls that stand beside the eyebrow and the title (a page's own doors — Up & Down's rules and history pills).
   * ⭐ BESIDE THE HEADING, NOT BESIDE THE WHOLE HEADER (2026-10-09, the visual pass's round 3, tile 200 at sw 390). The
   * Up & Down page used to put this whole component in a flex row with its pills, so the tagline under the title was
   * squeezed into what the pills left (~220px of a 357px column) and broke "Je, bei itakuwa / juu au chini muda
   * ukiisha?" (92px over 164px) where one ~260px line fits. Here the row holds the eyebrow and the title, and the
   * subtitle runs the column's full width under it. Without `actions` the markup is exactly what it was.
   */
  actions?: ReactNode;
}) {
  const head = (
    <>
      {eyebrow != null && (
        <p
          className={`flex items-center gap-2 mb-1 font-mono text-caption uppercase eyebrow font-bold ${EYEBROW_TONE[tone]}`}
        >
          {icon}
          {eyebrow}
        </p>
      )}
      {/* ⭐ DG-P-03 · §T1/§T7 — ONE LINE, 31 CALL SITES, AND NOT ONE PIXEL MOVES.
          This was `text-[28px]`, an arbitrary — and it is the arbitrary every page title in the
          product inherits, so it was the highest-leverage one in the tree. `text-title-lg` IS
          28px; its tuple also carries `lineHeight: 34px` and `letterSpacing: -0.85px`, and BOTH
          are already overridden on this very element by `leading-tight` (1.25 → 35px) and
          `tracking-[-0.02em]` (−0.56px at 28px), which are emitted after the fontSize rungs in
          the served sheet. So the computed style is byte-for-byte what it was. */}
      {/* 2026-09-13: balanced, so a wrapping title never leaves one word or one CJK glyph alone
          on its last line (the Chinese AML title did). */}
      <h1 className="font-display text-title-lg font-bold text-text leading-tight tracking-[-0.02em] text-balance">
        {title}
      </h1>
    </>
  );
  return (
    <div className={className}>
      {actions != null ? (
        <div className="flex items-start justify-between gap-3">
          <div>{head}</div>
          {actions}
        </div>
      ) : head}
      {subtitle != null && (
        <p className="mt-1 text-[13px] italic text-text-subtle text-balance">{subtitle}</p>
      )}
    </div>
  );
}
