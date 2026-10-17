/**
 * /millionea/slip — FILL A TICKET (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 items 1 and 8, §10 §3.5–§3.7; the v6 delivery's
 * S-purchase frames; DESIGN_AUTHORITY §M8a, §M3a). The reading tier.
 *
 * The week on sale in the reader's line: its fifteen questions in the reader's language, its close and first event, its
 * frozen price and cap, the reader's MAIN balance and tickets of the cap, and the free cancel a ticket bought now would
 * carry — handed to the slip's composer (`slip-client.tsx`), which keeps the picks in the tab, opens the confirm sheet
 * and makes the purchase. ⛔ No pool figure and no payout here (the handover's WP6): the slip states the rules and the price.
 *
 * ⛔ THE GATE FIRST, in the page and in the metadata (MR-2); a signed-out reader is sent to sign in and back here.
 * ⛔ NO DOOR ON A BREAK: the live break notice stands where the slip would (the refusals table, `onBreak`).
 * ⛔ A refusal the slip can already name (closed, paused, a staff account, the cap) is said before any pick is asked:
 *    the registry's sentence in the reader's language, and a way back to the hub — the money path decides again at the buy.
 * ⭐ The Needle and the chat bubble stand down here for every reader (D-25, `surfaces.ts → isSlipSurface`).
 */
import type { Metadata } from "next";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Callout } from "@/components/ui/callout";
import { BetBreakNotice } from "@/components/rg/bet-break-notice";
import { weekNumberOf } from "@/components/maswali/maswali-format";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { millioneaSlip } from "@/lib/server/maswali-player";
import { millioneaBreakOf, millioneaDoor } from "@/lib/server/millionea-doors";
import { getServerT } from "@/lib/i18n-server";
import { breakSentence } from "@/lib/break-end";
import { renderFailure } from "@/lib/failure-reasons";
import { formatTzs, pctNum } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";
import { MILLIONEA_HREF, MillioneaPreviewMark, signInHref } from "../millionea-parts";
import { hiddenSlotsOf, msOf, slipQuestionsOf } from "../millionea-view";
import { SlipClient } from "./slip-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the same answer as the body (the account hub's precedent): a hidden product's page is titled as the
  // identical 404 is, and asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaDoor()).visible) return notFoundMetadata();
  const { t } = await getServerT();
  return { title: `${t.millionea.titleSlip} · ${t.millionea.productLabel}` };
}

/** The page when no slip is drawn: its name, the reason, and the way back to the hub. */
function NoSlip({ t, preview, children }: { t: Dict; preview: boolean; children: React.ReactNode }) {
  return (
    <PageContainer tier="reading">
      <div className="flex flex-col gap-5" data-testid="millionea-slip-none">
        <PageHeader eyebrow={t.millionea.productTitle} title={t.millionea.titleSlip} />
        {preview && <MillioneaPreviewMark t={t} />}
        {children}
        <Link href={MILLIONEA_HREF.hub as never} className="btn btn-ghost btn-md self-start border-border-control">{t.millionea.productTitle}</Link>
      </div>
    </PageContainer>
  );
}

export default async function MillioneaSlipPage() {
  const gate = await millioneaGate();
  if (!gate.userId) redirect(signInHref(MILLIONEA_HREF.slip));
  const { t, locale } = await getServerT();
  const now = new Date();
  const nowMs = now.getTime();
  const brk = await millioneaBreakOf(gate.userId);
  if (brk) {
    return (
      <NoSlip t={t} preview={gate.preview}>
        <BetBreakNotice body={breakSentence(brk.exclusion ? t.rg.exclusionActive : t.rg.breakActive, brk.until, nowMs, t.common.monthsShort, locale)} testId="millionea-slip-break" />
      </NoSlip>
    );
  }
  const slip = await millioneaSlip({ userId: gate.userId, state: gate.state }, now);
  if (!slip) {
    return (
      <NoSlip t={t} preview={gate.preview}>
        <Callout tone="neutral" role="status">{t.millionea.hubNoWeek}</Callout>
      </NoSlip>
    );
  }
  // Sales closed is the slip's own state (its band, its resting controls); every other refusal is said instead of a slip.
  if (slip.refusal && slip.refusal !== "millionea_sales_closed") {
    const said = renderFailure(
      { ok: false, error: "", reason: slip.refusal, detail: { ticketCap: slip.ticketCap } },
      t.error as unknown as Record<string, string>, t.common.couldNotPlace, (n) => formatTzs(n),
    );
    return (
      <NoSlip t={t} preview={gate.preview}>
        <Callout tone={said.severity === "error" ? "neutral" : "info"} role="status">{said.body}</Callout>
      </NoSlip>
    );
  }
  const closesAt = msOf(slip.week.closesAt) ?? nowMs;
  const cancelAt = msOf(slip.cancelIfBoughtNow);
  const deposit = `/wallet/deposit?${new URLSearchParams({ amount: String(Math.max(0, slip.ticketPrice - (slip.balance ?? 0))) })}`;
  return (
    <PageContainer tier="reading">
      {gate.preview && <MillioneaPreviewMark t={t} />}
      <SlipClient
        userId={gate.userId}
        weekId={slip.week.id}
        weekNumber={weekNumberOf(slip.week.code)}
        closesAt={closesAt}
        firstEventAt={msOf(slip.firstEventAt)}
        serverNow={nowMs}
        questions={slipQuestionsOf(t, locale, slip.questions)}
        hiddenSlots={hiddenSlotsOf(slip.questions)}
        price={slip.ticketPrice}
        cap={slip.ticketCap}
        held={slip.held ?? 0}
        balance={slip.balance}
        cancelIfBoughtNow={cancelAt}
        pct={pctNum(slip.feeRate)}
        depositHref={deposit}
      />
    </PageContainer>
  );
}
