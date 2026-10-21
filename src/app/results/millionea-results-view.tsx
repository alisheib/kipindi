import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { MaswaliFacts } from "@/components/maswali/maswali-facts";
import { weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { MILLIONEA_HREF, MillioneaPreviewMark, registerWeekHref } from "@/app/millionea/millionea-parts";
import { WeekStateChip, weekFacts } from "@/app/millionea/register/register-parts";
import { ARCHIVE_DEFAULTS, type ArchiveState } from "@/lib/results/archive";
import type { Dict } from "@/lib/i18n-dict";
import type { MillioneaWeekSummary } from "@/lib/server/maswali-player";

/**
 * ⭐ WHERE THE SECTION STANDS (S5-DESIGN-DOORS L16): on the archive's first page as it opens — no search, no topic, no
 * outcome lens, no time window, and not the Up & Down rounds alone. None of those axes filters its weeks, so under any of
 * them it answered a question the reader had not asked (the latest weeks under "Michezo", under "VOID", on page 2 of a
 * search). The notable carousel stands by the same first-page, no-search rule; a sort only orders, so it keeps the section.
 */
export function millioneaSectionShown(state: ArchiveState, searching: boolean, pageNum: number): boolean {
  return !searching && pageNum === 1 && state.cat === ARCHIVE_DEFAULTS.cat && state.out === ARCHIVE_DEFAULTS.out
    && state.when === ARCHIVE_DEFAULTS.when && state.product !== "UPDOWN";
}

/**
 * Latest final PUBLIC weeks, with the register's own facts. No classic market metric includes these rows.
 * ⭐ S5-DESIGN-DOORS L14 L15: a week's facts are Millionea's fact line (`MaswaliFacts`, A1: one per line below 768, side by
 * side from 768 with the platform's own separator, never one opening or ending a line — the hand-typed "·" stood ~2× the
 * platform's gap apart and could open a line); and from 1024 a row is one line — the week and its state at the start, its
 * facts at the end beside the chevron — where the facts stood ~900px from the chevron that opens them on a 1280 board.
 */
export function MillioneaResultsView({ t, preview, weeks }: { t: Dict; preview: boolean; weeks: MillioneaWeekSummary[] }) {
  return (
    <section aria-labelledby="millionea-results-title" className="kp-mln-zh flex flex-col gap-3 rounded-card border border-border bg-bg-elevated/40 p-4 sm:p-5" data-testid="millionea-results-section">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="millionea-results-title" className="font-display text-title-sm font-bold text-text">{t.millionea.productTitle}</h2>
        <Link href={MILLIONEA_HREF.register} className="inline-flex items-center gap-1 text-body-sm text-text-link hover:text-text-linkHover" style={{ minHeight: "var(--h-control-md)" }}>
          {t.millionea.register}
          <I.chevronRight s={14} edge="end" text="body-400" />
        </Link>
      </div>
      {preview && <MillioneaPreviewMark t={t} />}
      {weeks.length === 0 ? (
        <EmptyState fill title={t.millionea.regEmpty} />
      ) : (
        <ul role="list" className="flex flex-col">
          {weeks.map((w) => {
            const facts = weekFacts(t, w);
            return (
              <li key={w.id} className="border-t border-border">
                <Link href={registerWeekHref(w.code) as never} className="flex min-w-0 items-center justify-between gap-3 py-3 text-text" style={{ minHeight: "var(--h-control-lg)" }}>
                  <span className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-row lg:items-center lg:gap-6">
                    <span className="flex min-w-0 flex-col gap-1 lg:shrink-0">
                      <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{w.code}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-body font-semibold text-text">{weekWord(t, weekNumberOf(w.code))}</span>
                        <WeekStateChip t={t} state={w.state} />
                      </span>
                    </span>
                    <span className="min-w-0 text-body-sm text-text-muted lg:ml-auto" data-testid="millionea-results-facts">
                      <MaswaliFacts layout="phone" facts={facts} />
                    </span>
                  </span>
                  <I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
