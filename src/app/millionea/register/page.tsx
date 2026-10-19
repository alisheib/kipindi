/**
 * /millionea/register — DAFTARI LA WIKI, THE INDEX (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 1, §10 §3.17; the v6
 * delivery's P-register-index frame; D-38). The reading tier.
 *
 * Every final PUBLIC week, newest first — each a door to its own page — and, inside each row, its strata line: a week
 * nobody won says what it carried forward, at fee 0 ("TZS 412,000 imeletwa mbele · ada 0").
 * ⭐ ONE ROW, ONE LINE OF INFORMATION (S5 VIS R9, the tile read of 2026-10-19): "Week 48 · Voided" and "Week 45: 1 ticket
 *    won" were two grammars for one kind of line, and at 1280/1920 a row ran ~1,016px with a short label and its chevron
 *    900px away. A row now names its week, its state as the week page's own chip, then its facts — a voided week's refunds,
 *    a won week's winners and jackpot, a rolled week's carry at fee 0. From 768 the facts share one line, between "·"
 *    separators that cannot open a line there (a few words each on a line of ~500px); below 768 each fact is its own line,
 *    with no separator at all (A1).
 * ⭐ PUBLIC, SERVER-RENDERED, WORKS WITHOUT JAVASCRIPT (the `/fairness` pattern): plain links, nothing to hydrate, no
 *    session needed — and no personal data anywhere: weeks, counts and money only.
 * ⭐ ONE PAGE OF THE RECORD WITH ITS TOTAL (`millioneaRegister`, round 3; S5 re-review 4): the platform's pager, as links
 *    (`?page`), so no week falls off the end unseen and the page still works without JavaScript.
 * ⛔ THE GATE FIRST (MR-2): public means every reader the rollout admits, not a hidden product's page.
 * ⛔ Never a drive week, never a week whose results can still change (`millioneaRegister`). An unearned surface: no gold.
 */
import { Fragment } from "react";
import type { Metadata } from "next";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import { millioneaDoor } from "@/lib/server/millionea-doors";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { I } from "@/components/ui/glyphs";
import { weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { millioneaRegister, type MillioneaWeekSummary } from "@/lib/server/maswali-player";
import { getServerT } from "@/lib/i18n-server";
import type { Dict } from "@/lib/i18n-dict";
import { MILLIONEA_HREF, MillioneaPreviewMark, MillioneaReadingLinks, registerWeekHref } from "../millionea-parts";
import { WeekStateChip, weekFacts } from "./register-parts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the same answer as the body (the account hub's precedent): a hidden product's page is titled as the
  // identical 404 is, and asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaDoor()).visible) return notFoundMetadata();
  const { t } = await getServerT();
  return { title: `${t.millionea.registerTitle} · ${t.millionea.productLabel}` };
}

/** One week's row: its code, its week and state chip, its facts, and the chevron of a door. */
function WeekRow({ t, w }: { t: Dict; w: MillioneaWeekSummary }) {
  const facts = weekFacts(t, w);
  return (
    <li className="border-b border-border">
      <Link href={registerWeekHref(w.code) as never} className="flex items-center justify-between gap-3 py-3 text-text" style={{ minHeight: "var(--h-control-lg)" }}>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{w.code}</span>
          <span className="flex flex-col gap-1 md:flex-row md:items-center md:gap-6">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 md:w-[200px] md:shrink-0">
              <span className="text-body font-semibold text-text">{weekWord(t, weekNumberOf(w.code))}</span>
              <WeekStateChip t={t} state={w.state} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 text-body-sm text-text-muted md:flex-row md:flex-wrap md:items-baseline md:gap-x-2" data-testid="millionea-week-facts">
              {facts.map((f, i) => (
                <Fragment key={i}>
                  {i > 0 && <span aria-hidden className="hidden text-text-subtle md:inline">·</span>}
                  <span>{f}</span>
                </Fragment>
              ))}
            </span>
          </span>
        </span>
        <I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />
      </Link>
    </li>
  );
}

export default async function MillioneaRegisterPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const gate = await millioneaGate();
  const [{ t }, sp] = await Promise.all([getServerT(), searchParams]);
  // The read clamps the page asked into range and answers the page it drew, which the pager then marks.
  const { rows: weeks, total, page } = await millioneaRegister({
    page: Number.parseInt(String(sp.page ?? "1"), 10) || 1,
    perPage: PLAYER_PER_PAGE,
  });
  return (
    <PageContainer tier="reading" className="kp-mln-zh">
      <div className="flex flex-col gap-6" data-testid="millionea-register">
        <PageHeader eyebrow={t.millionea.productTitle} title={t.millionea.registerTitle} />
        {gate.preview && <MillioneaPreviewMark t={t} />}
        {total === 0 ? (
          <EmptyState title={t.millionea.regEmpty} />
        ) : (
          <ul role="list" className="flex flex-col">
            {weeks.map((w) => <WeekRow key={w.id} t={t} w={w} />)}
          </ul>
        )}
        {total > PLAYER_PER_PAGE && (
          <div className="rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
            <Pagination
              total={total}
              page={page}
              perPage={PLAYER_PER_PAGE}
              baseHref={MILLIONEA_HREF.register}
              ofLabel={t.common.of}
              prevLabel={t.common.previousPage}
              nextLabel={t.common.nextPage}
              firstLabel={t.common.firstPage}
              lastLabel={t.common.lastPage}
            />
          </div>
        )}
        <MillioneaReadingLinks t={t} hub register={false} />
      </div>
    </PageContainer>
  );
}
