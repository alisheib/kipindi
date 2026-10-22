/**
 * /millionea/register — DAFTARI LA WIKI, THE INDEX (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 1, §10 §3.17; the v6
 * delivery's P-register-index frame; D-38). The reading tier.
 *
 * What the register is, in one paragraph (the critic's M11: /fairness opens with its own); then the weeks still running
 * (the lead's H2 ruling, 2026-10-21: "the index lists the current week with its chip") and every final PUBLIC week, newest
 * first — each a door to its own page, each the ONE week row (`WeekRow`, L3): its code, the week with its state chip, and
 * its facts — a voided week's refunds, a won week's winners and jackpot, a week nobody won's "no 10/10", its carry and its
 * fee 0 (L1); a running week's close, or its results so far and its objection window.
 * ⭐ PUBLIC, SERVER-RENDERED, WORKS WITHOUT JAVASCRIPT (the `/fairness` pattern): plain links, nothing to hydrate, no
 *    session needed — and no personal data anywhere: weeks, counts and money only.
 * ⭐ ONE PAGE OF THE RECORD WITH ITS TOTAL (`millioneaRegister`, round 3; S5 re-review 4): the platform's pager, as links
 *    (`?page`), so no week falls off the end unseen and the page still works without JavaScript. The running weeks head
 *    its first page.
 * ⭐ LAUNCH DAY (M11): before any week has opened the page is the kit's own empty state, filling its column (PV-03), with
 *    the register's glyph, what will appear here, and the way to the hub — never the default box under a left heading.
 * ⛔ THE GATE FIRST (MR-2): public means every reader the rollout admits, not a hidden product's page.
 * ⛔ Never a drive week; a running week shows no money (H2). An unearned surface: no gold.
 */
import type { Metadata } from "next";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import { millioneaDoor } from "@/lib/server/millionea-doors";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyStateLink } from "@/components/ui/empty-state-link";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { millioneaRegister, millioneaRegisterCurrent } from "@/lib/server/maswali-player";
import { getServerT } from "@/lib/i18n-server";
import { MILLIONEA_HREF, MillioneaReadingLinks } from "../millionea-parts";
import { millioneaWeekPhase } from "../millionea-view";
import { keepFact } from "@/components/maswali/maswali-facts";
import { liveWeekFacts, WeekRow, WeekStateChip, weekFacts } from "./register-parts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the same answer as the body (the account hub's precedent): a hidden product's page is titled as the
  // identical 404 is, and asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaDoor()).visible) return notFoundMetadata();
  const { t } = await getServerT();
  return { title: `${t.millionea.registerTitle} · ${t.millionea.productLabel}` };
}

export default async function MillioneaRegisterPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  // The staff preview is marked once, above the page, by the shell's bar (PLATFORM D12) — never in the page's column.
  await millioneaGate();
  const [{ t, locale }, sp] = await Promise.all([getServerT(), searchParams]);
  const nowMs = Date.now();
  // The read clamps the page asked into range and answers the page it drew, which the pager then marks.
  const [current, { rows: weeks, total, page }] = await Promise.all([
    millioneaRegisterCurrent(),
    millioneaRegister({ page: Number.parseInt(String(sp.page ?? "1"), 10) || 1, perPage: PLAYER_PER_PAGE }),
  ]);
  const running = page === 1 ? current : [];
  const H2 = "font-display text-title-sm font-bold text-text";
  // The shared row (L3); a list divides its rows and draws its own top edge — the row draws no rule.
  const LIST = "flex flex-col divide-y divide-border border-t border-border";
  return (
    <PageContainer tier="reading" className="kp-mln-zh">
      <div className="flex flex-col gap-6" data-testid="millionea-register">
        <div className="flex flex-col gap-3">
          <PageHeader eyebrow={t.millionea.productTitle} title={t.millionea.registerTitle} />
          {/* Its phrases kept whole, its dash held to the word before it (the tile read: "— mauzo, ada, …" opened a sw line
              at 320). */}
          <p className="max-w-[68ch] text-body text-text-muted text-pretty" data-testid="millionea-register-intro">{keepFact(locale, t.millionea.regIntro)}</p>
        </div>
        {current.length === 0 && total === 0 ? (
          <EmptyState
            fill
            kind="fairness"
            title={t.millionea.regEmpty}
            body={t.millionea.regEmptyBody}
            action={<EmptyStateLink href={MILLIONEA_HREF.hub}>{t.millionea.productTitle}</EmptyStateLink>}
          />
        ) : (
          <>
            {running.length > 0 && (
              <section aria-labelledby="mln-reg-running" className="flex flex-col gap-2" data-testid="millionea-register-running">
                <h2 id="mln-reg-running" className={H2}>{t.millionea.regRunning}</h2>
                <ul role="list" className={LIST}>
                  {running.map((w) => (
                    <WeekRow
                      key={w.id}
                      t={t}
                      code={w.code}
                      chip={<WeekStateChip t={t} state={w.state} phase={millioneaWeekPhase(w, nowMs)} paused={w.paused} />}
                      facts={liveWeekFacts(t, locale, w, nowMs)}
                    />
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="mln-reg-final" className="flex flex-col gap-2" data-testid="millionea-register-final">
              <h2 id="mln-reg-final" className={H2}>{t.millionea.regFinal}</h2>
              {total === 0 ? (
                <p className="text-body-sm text-text-muted">{t.millionea.regEmpty}</p>
              ) : (
                <ul role="list" className={LIST}>
                  {weeks.map((w) => <WeekRow key={w.id} t={t} code={w.code} chip={<WeekStateChip t={t} state={w.state} />} facts={weekFacts(t, w)} />)}
                </ul>
              )}
            </section>
          </>
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
