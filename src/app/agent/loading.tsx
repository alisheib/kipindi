"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { I } from "@/components/ui/glyphs";
import { ButtonGhost, ghostShape, GhostText } from "@/components/ui/ghost-text";
import { commissionWaterfall, type WaterfallStepId } from "@/lib/agent-commission";
import { DEFAULT_GBT_LEVY_ON_COMMISSION_RATE, DEFAULT_OPERATOR_FEE_RATE, DEFAULT_PLATFORM_FEE_RATE, DEFAULT_TRA_TAX_ON_COMMISSION_RATE } from "@/lib/payout";
import { MAX_DOC_BYTES } from "@/lib/id-documents";
import { fillNodes } from "@/lib/fill-nodes";
import { fill, formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n-dict";

/**
 * The page that is COMING: a header WITH its subtitle, three stat tiles in a row (one column
 * on a phone), a CTA, then five panels and the centred terms link. ⛔ Never a ghost for a card the page
 * does not render — and never one card short either.
 *
 * 🔴 IT WAS TWO SHORT AND ONE LINE THIN. The header ghosted eyebrow + title while the page
 * renders a three-line `heroSub` beneath them, so everything below jumped down the moment the
 * read landed; and the panel count was four against the page's five (how it works · the seven
 * documents · the fee · how you are paid · the commission waterfall) with no ghost for the
 * terms link. ⭐ The subtitle is PRINTED since round 5's follow-up (R5-H · G-2b): `heroSub` wraps to a different number
 * of lines in each locale, and the page's own sentence in the page's own `PageHeader` wraps exactly as the page's does —
 * the two bars it replaced stood on the container's 32px rung instead of 4px under the title, and drew two lines where
 * a phone has four (the subtitle 28px low at 1280).
 *
 * ⭐ EVERY BAND IS THE PAGE'S OWN BOX WITH THE PAGE'S OWN WORDS, SET AND NOT SHOWN (2026-10-09, round 5's follow-up, R5-L —
 * `GhostText`, R5-K's convention). The tiles were 96px boxes against the page's `Stat` tiles of 121px at 1280 (measured on
 * tile 196: a 14.25px label row, the 22.5px figure, the hint's two 18px lines — `cn` drops the hint's `leading-tight` for
 * `text-body-sm`'s own 18px), and every panel was one 20px title bar over two 16px lines on 16px gaps in 20px of
 * padding (126px) against the page's 294px how-it-works (tile 196), 352px of documents, a 193px fee panel, 198px of
 * terms and the 647px eight-row waterfall (its ghost 326) at 1280 in Swahili — the terms link 879px below the ghost's
 * at 1280 and 1,888px at 390 (S/r5l/measure-routes.cts, calibrated on tile 196's header, tiles and first panel). Each
 * band below is the page's: the same `Stat` with the same props, each section's own classes, every sentence the
 * dictionary's — so each wraps where the page's does in Swahili, English and Chinese and at every width, and the page
 * lands where the ghost stood.
 *
 * ⚠️ THE PROGRAMME DRAWN IS TODAY'S, the configuration's defaults (`agent-config.ts`, `market-config.ts`, as tile 196 shows
 * them): a 10% share, a TZS 100,000 fee with no VAT (Ali, 2026-09-09 — so no VAT hint under the fee tile and no VAT line
 * in the fee panel), a lifetime window, no cap per recruit, a 5-day review and a 7-day refund; the waterfall at the default
 * rates. Figures are placeholders of those digit counts (mono digits are one width). A programme set differently draws a
 * VAT line or a different term the ghost does not: the page lands up to one line lower in that panel.
 * ⚠️ AND THE PLAYER DRAWN IS THE ONE THIS PAGE IS FOR: signed in, verified and able to apply — one 48px "Apply" button and
 * no state notice (tile 196). A guest's two buttons stack on a phone (+60px) and a player mid-application reads a notice.
 *
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 */

/** Today's programme, as digit counts: a two-digit share, a six-digit fee, a one-digit review and refund. */
const PCT = "00", DAYS = "0", REFUND_DAYS = "0", FEE = ghostShape(formatTzs(100_000));
const MB = String(Math.round(MAX_DOC_BYTES / (1024 * 1024)));

/** Management's waterfall at today's rates — the page reads them live from `market.config` and `agent-config`; these are
 *  both modules' defaults (the share and the withholding are `agent-config`'s 10% and 5%). */
const WATERFALL = commissionWaterfall(1_000_000, {
  platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
  operatorFeeRate: DEFAULT_OPERATOR_FEE_RATE,
  traTaxOnCommissionRate: DEFAULT_TRA_TAX_ON_COMMISSION_RATE,
  gbtLevyOnCommissionRate: DEFAULT_GBT_LEVY_ON_COMMISSION_RATE,
  agentPct: 10,
  withholdingPct: 5,
});
const WF_LABEL: Record<WaterfallStepId, keyof Dict["agent"]> = {
  winnings: "wfWinnings", grossFee: "wfGrossFee", tra: "wfTra", gbt: "wfGbt",
  netFee: "wfNetFee", agentShare: "wfAgentShare", withholding: "wfWithholding", netPayout: "wfNetPayout",
};
const WF_NOTE: Record<WaterfallStepId, keyof Dict["agent"]> = {
  winnings: "wfWinningsNote", grossFee: "wfGrossFeeNote", tra: "wfTraNote", gbt: "wfGbtNote",
  netFee: "wfNetFeeNote", agentShare: "wfAgentShareNote", withholding: "wfWithholdingNote", netPayout: "wfNetPayoutNote",
};
const pct = (p: number) => String(Math.round(p * 100) / 100);

export default function AgentLoading() {
  const { t } = useT();
  const a = t.agent as unknown as Record<string, string>;
  return (
    <PageContainer tier="reading" className="space-y-6" aria-busy="true">
      {/* ⭐ THE PAGE'S OWN HEADER, SAME PROPS (R5-H · G-2b): `subtitle={t.agent.heroSub}`, 4px under the title as the page
          draws it, so it wraps where the page's does in every language. */}
      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.title} subtitle={t.agent.heroSub} />

      {/* The three facts — the page's `Stat` tiles, same props: label row, figure, hint (the fee has none: no VAT). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-hidden>
        <Stat size="xl" boxed="glass" labelStyle="strong" font="mono" className="p-4 kp-shimmer-track"
          label={<GhostText>{t.agent.statEarn}</GhostText>}
          value={<GhostText>{fill(t.agent.statEarnValue, { pct: PCT })}</GhostText>}
          hint={<GhostText>{t.agent.statEarnHint}</GhostText>} icon={<I.percent s={14} className="text-transparent" />} iconAlign="end" />
        <Stat size="xl" boxed="glass" labelStyle="strong" font="mono" className="p-4 kp-shimmer-track"
          label={<GhostText>{t.agent.statCost}</GhostText>}
          value={<GhostText><span className="amount">{FEE}</span></GhostText>}
          icon={<I.coins s={14} className="text-transparent" />} iconAlign="end" />
        <Stat size="xl" boxed="glass" labelStyle="strong" font="mono" className="p-4 kp-shimmer-track"
          label={<GhostText>{t.agent.statTime}</GhostText>}
          value={<GhostText>{fill(t.agent.statTimeValue, { days: DAYS })}</GhostText>}
          hint={<GhostText>{t.agent.statTimeHint}</GhostText>} icon={<I.clock s={14} className="text-transparent" />} iconAlign="end" />
      </div>

      {/* The CTA — the eligible player's one 48px button, its words and glyph's room. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center" aria-hidden>
        <div><ButtonGhost size="lg" leading={16}>{t.agent.ctaApply}</ButtonGhost></div>
      </div>

      {/* How it works — the title, then five steps beside their 30px numerals. */}
      <section className="rounded-xl glass-panel p-4 text-transparent" aria-hidden>
        <p className="font-display text-title-sm font-bold leading-tight"><GhostText>{t.agent.howTitle}</GhostText></p>
        <ol className="mt-3 space-y-3">
          {[t.agent.how1, t.agent.how2, t.agent.how3, t.agent.how4, t.agent.how5].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="h-[30px] w-[30px] shrink-0 rounded-full bg-bg-overlay/60 kp-shimmer-track" />
              <p className="pt-1 text-body-sm leading-snug"><GhostText>{step}</GhostText></p>
            </li>
          ))}
        </ol>
      </section>

      {/* The seven documents — their own boxes (two columns from 640), then the two notes. */}
      <section className="rounded-xl glass-panel p-4 text-transparent" aria-hidden>
        <p className="font-display text-title-sm font-bold leading-tight"><GhostText>{t.agent.docsTitle}</GhostText></p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[t.agent.docCv, t.agent.docRequest, t.agent.docSerikali, t.agent.docRefLetter1, t.agent.docRefId1, t.agent.docRefLetter2, t.agent.docRefId2].map((d, i) => (
            <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-bg-overlay/40 px-3 py-2 text-body-sm">
              <I.idCard s={14} className="shrink-0" />
              <span><GhostText>{d}</GhostText></span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-body-sm leading-relaxed"><GhostText>{t.agent.docIdNote}</GhostText></p>
        <p className="mt-1 font-mono text-body-sm"><GhostText>{fill(t.agent.docHint, { mb: MB })}</GhostText></p>
      </section>

      {/* The fee — its eyebrow, the figure, the wallet sentence and the refund sentence (no VAT line: none is charged). */}
      <section className="rounded-xl glass-panel p-4 text-transparent" aria-hidden>
        <p className="font-mono text-micro uppercase eyebrow font-bold"><GhostText>{t.agent.feeTitle}</GhostText></p>
        <p className="mt-2 amount text-title-lg font-bold"><GhostText>{FEE}</GhostText></p>
        <p className="mt-3 text-body-sm leading-relaxed">
          <GhostText>{fillNodes(t.agent.feeBodyWallet, { amount: <span className="amount font-semibold">{FEE}</span> })}</GhostText>
        </p>
        <p className="mt-2 text-body-sm leading-relaxed"><GhostText>{fill(t.agent.feeRefund, { days: REFUND_DAYS })}</GhostText></p>
      </section>

      {/* How you are paid — the title and the five terms (a lifetime window, no cap per recruit). */}
      <section className="rounded-xl glass-panel p-4 space-y-2 text-transparent" aria-hidden>
        <p className="font-display text-title-sm font-bold leading-tight"><GhostText>{t.agent.earnTitle}</GhostText></p>
        <ul className="space-y-1.5 text-body-sm leading-snug list-disc pl-4">
          {[t.agent.earnLifetime, t.agent.earnUncapped, t.agent.earnNoPrize, t.agent.earnSingleLevel, t.agent.recruiterOnly].map((term, i) => (
            <li key={i}><GhostText>{term}</GhostText></li>
          ))}
        </ul>
      </section>

      {/* The commission waterfall — `CommissionWaterfall`'s own structure: the title row, the basis sentence, the head row,
          eight rows of a label and its note beside the amount, then the two closing sentences. */}
      <section className="rounded-xl glass-panel p-4 text-transparent" aria-hidden>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-display text-title-sm font-bold leading-tight"><GhostText>{t.agent.wfTitle}</GhostText></p>
          <p className="font-mono text-micro uppercase eyebrow"><GhostText>{t.agent.wfEyebrow}</GhostText></p>
        </div>
        <p className="mt-1 text-body-sm leading-relaxed">
          <GhostText>{fillNodes(t.agent.wfBasis, { amount: <span className="font-mono tabular-nums">{formatTzs(1_000_000)}</span> })}</GhostText>
        </p>
        <dl className="mt-3">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-1.5">
            <span className="font-mono text-micro uppercase eyebrow"><GhostText>{t.agent.wfColParam}</GhostText></span>
            <span className="font-mono text-micro uppercase eyebrow"><GhostText>{t.agent.wfColAmount}</GhostText></span>
          </div>
          {WATERFALL.steps.map((s) => (
            <div key={s.id} className={`flex items-start justify-between gap-4 ${s.id === "netPayout" ? "pt-2 pb-1 border-t border-border-strong" : "py-1.5"}`}>
              <dt className={s.deduction ? "min-w-0 pl-3" : "min-w-0"}>
                <span className={
                  s.deduction ? "block text-body-sm leading-snug before:mr-1.5 before:content-['·']"
                    : s.id === "netPayout" ? "block text-body-sm font-bold leading-snug"
                      : s.subtotal ? "block text-body-sm font-semibold leading-snug" : "block text-body-sm leading-snug"
                }>
                  <GhostText>{s.ratePct === null ? a[WF_LABEL[s.id]] : fill(a[WF_LABEL[s.id]], { pct: pct(s.ratePct) })}</GhostText>
                </span>
                <span className="mt-0.5 block text-body-sm leading-snug"><GhostText>{a[WF_NOTE[s.id]]}</GhostText></span>
              </dt>
              <dd className={`amount shrink-0 tabular-nums text-right ${s.id === "netPayout" ? "text-body font-bold" : s.subtotal ? "text-body-sm font-semibold" : "text-body-sm"}`}>
                <GhostText>{s.deduction ? `−${formatTzs(s.amountTzs)}` : formatTzs(s.amountTzs)}</GhostText>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-body-sm leading-relaxed"><GhostText>{fill(t.agent.wfEffective, { pct: pct(WATERFALL.effectivePctOfWinnings) })}</GhostText></p>
        <p className="mt-1.5 text-body-sm leading-relaxed"><GhostText>{t.agent.wfDisclaimer}</GhostText></p>
      </section>

      {/* The terms link, centred, its words. */}
      <p className="text-center text-body-sm text-transparent" aria-hidden><GhostText>{t.agent.termsLink}</GhostText></p>
    </PageContainer>
  );
}
