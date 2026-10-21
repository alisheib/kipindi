/**
 * /millionea/slip — FILL A TICKET (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 items 1 and 8, §10 §3.5–§3.7; the v6 delivery's
 * S-purchase frames; DESIGN_AUTHORITY §M8a, §M3a). The reading tier.
 *
 * The week on sale in the reader's line: its fifteen questions in the reader's language, its close and first event, its
 * frozen price and cap, the reader's MAIN balance and tickets of the cap, and its frozen free-cancel grace — handed to the
 * slip's composer (`slip-client.tsx`), which keeps the picks in the tab, opens the confirm sheet (asking, on the
 * server-aligned clock and on every tick while it is open, which free cancel a ticket cut NOW would carry — S5-FIX-PLAYER
 * P1) and makes the purchase. ⛔ No pool figure and no payout here (the handover's WP6): the slip states the rules and the price.
 *
 * ⛔ THE GATE FIRST, in the page and in the metadata (MR-2); a signed-out reader is sent to sign in and back here.
 * ⛔ NO DOOR ON A BREAK: the live break notice stands where the slip would (the refusals table, `onBreak`).
 * ⛔ A refusal the slip can already name (closed, paused, a staff account, the cap) is said before any pick is asked, with
 *    a way back to the hub — the money path decides again at the buy: the registry's sentence in the reader's language, or,
 *    for the cap and a product not yet available, the hub's own words (S5-FIX-PLAYER P13: nothing was tried, so never a
 *    purchase result's "Nothing was charged." or a next week promised where none can follow).
 * ⭐ The Needle and the chat bubble stand down here for every reader (D-25, `surfaces.ts → isSlipSurface`).
 */
import type { Metadata } from "next";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { Callout } from "@/components/ui/callout";
import { BetBreakNotice } from "@/components/rg/bet-break-notice";
import { weekNumberOf } from "@/components/maswali/maswali-format";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { millioneaSlip } from "@/lib/server/maswali-player";
import { millioneaBreakOf, millioneaDoor, millioneaHubNow, millioneaOpenTemplate } from "@/lib/server/millionea-doors";
import { nextWeekOpen } from "@/components/maswali/maswali-card-model";
import { getServerT } from "@/lib/i18n-server";
import { breakSentence } from "@/lib/break-end";
import { renderFailure } from "@/lib/failure-reasons";
import { formatTzs, pctNum } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";
import { MILLIONEA_HREF, MillioneaPreviewMark, signInHref } from "../millionea-parts";
import { capReachedLine, hiddenSlotsOf, msOf, slipQuestionsOf } from "../millionea-view";
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
    <PageContainer tier="reading" className="kp-mln-zh">
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
  // ⭐ S5-FIX-PLAYER P13 · NOTHING HAS BEEN TRIED YET: a refusal before any pick is said in the words of the page that offers
  // the slip, never in a purchase result's ("Nothing was charged.", "…you can buy again when next week opens"): the cap as
  // the hub's buy block says it — the next week named only when one can follow (`nextWeekOpen`: none in a final week or
  // while Millionea ends) — and "not available" as the hub says no week is on sale. The rest keep the registry's sentence.
  if (slip.refusal && slip.refusal !== "millionea_sales_closed") {
    let said: { body: string; tone: "neutral" | "info" };
    if (slip.refusal === "millionea_cap_reached") {
      const hub = await millioneaHubNow(gate.userId, gate.state);
      said = { body: capReachedLine(t, slip.ticketCap, hub ? nextWeekOpen(hub, millioneaOpenTemplate(), nowMs) : null), tone: "info" };
    } else if (slip.refusal === "millionea_not_available") {
      said = { body: t.millionea.hubNoWeek, tone: "neutral" };
    } else {
      const r = renderFailure(
        { ok: false, error: "", reason: slip.refusal, detail: { ticketCap: slip.ticketCap } },
        t.error as unknown as Record<string, string>, t.common.couldNotPlace, (n) => formatTzs(n),
      );
      said = { body: r.body, tone: r.severity === "error" ? "neutral" : "info" };
    }
    return (
      <NoSlip t={t} preview={gate.preview}>
        <Callout tone={said.tone} role="status">{said.body}</Callout>
      </NoSlip>
    );
  }
  const closesAt = msOf(slip.week.closesAt) ?? nowMs;
  return (
    <PageContainer tier="reading" className="kp-mln-zh">
      {/* The way back to the hub over the slip's head, as the S-slip frames draw it ("‹ MASWALI MILLIONEA"). */}
      <BackLink fallbackHref={MILLIONEA_HREF.hub} label={t.millionea.productTitle} />
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
        freeCancelMinutes={slip.freeCancelMinutes}
        pct={pctNum(slip.feeRate)}
      />
    </PageContainer>
  );
}
