import { Fragment } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { MILLIONEA_HREF, MillioneaPreviewMark, registerWeekHref } from "@/app/millionea/millionea-parts";
import { WeekStateChip, weekFacts } from "@/app/millionea/register/register-parts";
import type { Dict } from "@/lib/i18n-dict";
import type { MillioneaWeekSummary } from "@/lib/server/maswali-player";

/** Latest final PUBLIC weeks, with the register's own facts. No classic market metric includes these rows. */
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
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{w.code}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-body font-semibold text-text">{weekWord(t, weekNumberOf(w.code))}</span>
                      <WeekStateChip t={t} state={w.state} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5 text-body-sm text-text-muted md:flex-row md:flex-wrap md:items-baseline md:gap-x-2" data-testid="millionea-results-facts">
                      {facts.map((fact, i) => (
                        <Fragment key={i}>
                          {i > 0 && <span aria-hidden className="hidden text-text-subtle md:inline">·</span>}
                          <span>{fact}</span>
                        </Fragment>
                      ))}
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
