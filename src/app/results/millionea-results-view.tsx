import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { MILLIONEA_HREF, MillioneaPreviewMark } from "@/app/millionea/millionea-parts";
import { WeekRow, WeekStateChip, weekFacts } from "@/app/millionea/register/register-parts";
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
 * ⭐ ONE WEEK ROW, THE REGISTER'S (`WeekRow`, register-parts.tsx — S5-DESIGN-REGISTER's shared row, adopted with no fork; the
 * register critic's L3: the row was written twice): its code, the week and its state chip, its facts, the chevron of its door.
 * The row carries the doors critic's L14 and L15 for both lists: a week's facts are Millionea's fact line (`MaswaliFacts`,
 * A1: one per line below 768, side by side from 768 with the platform's own separator, never one opening or ending a line —
 * the hand-typed "·" stood ~2× the platform's gap apart and could open a line), and from 1024 they end beside the chevron
 * that opens them (they stood ~900px from it on a 1280 board). The list draws the rules between rows and above the first
 * (`divide-y`, `border-t`), as the register's index does; the row draws none.
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
        <ul role="list" className="flex flex-col divide-y divide-border border-t border-border">
          {weeks.map((w) => <WeekRow key={w.id} t={t} code={w.code} chip={<WeekStateChip t={t} state={w.state} />} facts={weekFacts(t, w)} />)}
        </ul>
      )}
    </section>
  );
}
