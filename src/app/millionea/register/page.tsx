/**
 * /millionea/register — DAFTARI LA WIKI, THE INDEX (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 1, §10 §3.17; the v6
 * delivery's P-register-index frame; D-38). The reading tier.
 *
 * Every final PUBLIC week, newest first — each a door to its own page — and, inside each row, its strata line: a week
 * nobody won says what it carried forward, at fee 0 ("Wiki 40 · TZS 412,000 imeletwa mbele · ada 0").
 * ⭐ PUBLIC, SERVER-RENDERED, WORKS WITHOUT JAVASCRIPT (the `/fairness` pattern): plain links, nothing to hydrate, no
 *    session needed — and no personal data anywhere: weeks, counts and money only.
 * ⛔ THE GATE FIRST (MR-2): public means every reader the rollout admits, not a hidden product's page.
 * ⛔ Never a drive week, never a week whose results can still change (`millioneaRegister`). An unearned surface: no gold.
 */
import type { Metadata } from "next";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import { millioneaDoor } from "@/lib/server/millionea-doors";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { counted, millioneaWord, weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { millioneaRegister, type MillioneaWeekSummary } from "@/lib/server/maswali-player";
import { getServerT } from "@/lib/i18n-server";
import { WEEK_STATE_KEY } from "@/lib/maswali-week-label";
import { fill, formatTzs } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";
import { MillioneaPreviewMark, MillioneaReadingLinks, registerWeekHref } from "../millionea-parts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the same answer as the body (the account hub's precedent): a hidden product's page is titled as the
  // identical 404 is, and asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaDoor()).visible) return notFoundMetadata();
  const { t } = await getServerT();
  return { title: `${t.millionea.registerTitle} · ${t.millionea.productLabel}` };
}

/** A week's one line: its winners, its carry at fee 0, or its void. */
function weekLine(t: Dict, w: MillioneaWeekSummary): string {
  const week = weekNumberOf(w.code);
  if (w.state === "VOIDED") return `${weekWord(t, week)} · ${millioneaWord(t, WEEK_STATE_KEY.VOIDED)}`;
  if ((w.winners ?? 0) > 0) return counted(w.winners ?? 0, t.millionea.settledWonOne, t.millionea.settledWon, { week });
  return fill(t.millionea.regStrataRow, { week, amount: formatTzs(w.carriedForward ?? 0) });
}

export default async function MillioneaRegisterPage() {
  const gate = await millioneaGate();
  const { t } = await getServerT();
  const weeks = await millioneaRegister();
  return (
    <PageContainer tier="reading">
      <div className="flex flex-col gap-6" data-testid="millionea-register">
        <PageHeader eyebrow={t.millionea.productTitle} title={t.millionea.registerTitle} />
        {gate.preview && <MillioneaPreviewMark t={t} />}
        {weeks.length === 0 ? (
          <EmptyState title={t.millionea.regEmpty} />
        ) : (
          <ul role="list" className="flex flex-col">
            {weeks.map((w) => (
              <li key={w.id} className="border-b border-border">
                <Link href={registerWeekHref(w.code) as never} className="flex items-center justify-between gap-3 py-3 text-text" style={{ minHeight: "var(--h-control-lg)" }}>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{w.code}</span>
                    <span className="text-body-sm text-text text-pretty">{weekLine(t, w)}</span>
                  </span>
                  <I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <MillioneaReadingLinks t={t} hub register={false} />
      </div>
    </PageContainer>
  );
}
