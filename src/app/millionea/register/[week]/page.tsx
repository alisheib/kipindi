/**
 * /millionea/register/[week] — DAFTARI LA WIKI, ONE WEEK (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 1, §10 §3.17; the v6
 * delivery's P-register-week frames; D-38). The reading tier.
 *
 * The week's public record: its commitments (the question set's hash published at the open, the tickets' root at the
 * close), the fifteen questions with each one's source, event, the attesting officer's ROLE, the attested time, the
 * outcome and a void's reason; the reserve rule and the map of reserves that stood in, as a timestamped log; the full
 * ledger to the shilling (what came in, what was sold, the jackpot, the fee with its levies, the floor's top-up, what was
 * paid and per ticket, the rounding remainder, what went on); after settlement only, how many tickets were still without
 * a miss after each counted result; and the audit chain on `/fairness`.
 * ⭐ PUBLIC, SERVER-RENDERED, WORKS WITHOUT JAVASCRIPT (the `/fairness` pattern): a table from 768 (its own scrolling
 *    region), the same facts as stacked rows below it — and no personal data: roles, never names; counts, never tickets.
 * ⛔ THE GATE FIRST (MR-2). A code that is not a final PUBLIC week is the not-found page (`millioneaRegisterWeek` → null).
 * ⛔ An unearned surface: no gold (§M8a item 7) — the register states money; it awards none.
 */
import type { Metadata } from "next";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import { millioneaDoor } from "@/lib/server/millionea-doors";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { ReceiptRow } from "@/components/ui/receipt-row";
import { ScrollX } from "@/components/ui/scroll-x";
import { I } from "@/components/ui/glyphs";
import { MaswaliOutcomeStamp } from "@/components/maswali/maswali-outcome-stamp";
import { counted, millioneaWord, reserveLabel, weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { millioneaRegisterWeek, type MillioneaRegisterQuestion, type MillioneaRegisterWeek } from "@/lib/server/maswali-player";
import { getServerT } from "@/lib/i18n-server";
import { WEEK_STATE_KEY } from "@/lib/maswali-week-label";
import { isMaswaliVoidReason, MASWALI_VOID_REASON_KEY } from "@/lib/maswali-void-reason";
import { marketCategoryLabel } from "@/lib/localized";
import { formatEatDateTime } from "@/lib/eat-day";
import { MAIN_COUNT } from "@/lib/maswali-score";
import { fill, formatTzs, pctNum } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { MILLIONEA_HREF, MillioneaPreviewMark, MillioneaReadingLinks } from "../../millionea-parts";
import { bySlot, msOf, nextWeekNumber, ordinalOf, previousWeekNumber, textIn } from "../../millionea-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the same answer as the body (the account hub's precedent): a hidden product's page is titled as the
  // identical 404 is, and asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaDoor()).visible) return notFoundMetadata();
  const { t } = await getServerT();
  return { title: `${t.millionea.registerTitle} · ${t.millionea.productLabel}` };
}

type Q = MillioneaRegisterQuestion;

/** A question's place as the reader reads it: 1…10, A1…A5 (O-8). */
const placeOf = (q: Q) => (q.role === "MAIN" ? String(q.slot) : reserveLabel(ordinalOf(q)));
/** An instant the register prints, in EAT, or "—". */
function when(t: Dict, locale: Locale, iso: string | null, nowMs: number): string {
  const ms = msOf(iso);
  return ms === null ? "—" : formatEatDateTime(ms, nowMs, t.common.monthsShort, locale);
}
/** A void's reason, in the reader's words (the closed list, `maswali-void-reason.ts`), or "—". */
function reasonOf(t: Dict, q: Q): string {
  return q.voidReason && isMaswaliVoidReason(q.voidReason) ? millioneaWord(t, MASWALI_VOID_REASON_KEY[q.voidReason]) : "—";
}

/** The fifteen as stacked rows below 768 and a table from 768 (D-38), one source of facts for both. */
function Questions({ t, locale, w, nowMs }: { t: Dict; locale: Locale; w: MillioneaRegisterWeek; nowMs: number }) {
  const qs = bySlot(w.questions);
  const role = (q: Q) => (q.sealerRole ? t.millionea.officerRole : "—");
  return (
    <section aria-labelledby="mln-reg-q" className="flex flex-col gap-2">
      <h2 id="mln-reg-q" className="font-display text-title-sm font-bold text-text">{t.millionea.weekQuestions}</h2>
      <ol className="flex flex-col md:hidden">
        {qs.map((q) => (
          <li key={q.slot} className="grid grid-cols-[32px_1fr] gap-x-2 gap-y-1 border-t border-border py-3">
            <span className="font-mono text-body-sm font-bold text-text-muted tabular-nums">{placeOf(q)}</span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{marketCategoryLabel(t, q.category)}</span>
              <span className="text-body-sm text-text text-pretty">{textIn(locale, q.text)}</span>
              <span className="text-body-sm text-text-muted [overflow-wrap:anywhere]">{`${t.millionea.regColSource}: ${q.sourceDomain}`}</span>
              <span className="text-body-sm text-text-muted">{`${t.millionea.regColEvent}: ${when(t, locale, q.eventStartsAt, nowMs)}`}</span>
              <span className="text-body-sm text-text-muted">{`${t.millionea.regColOfficer}: ${role(q)} · ${t.millionea.regColAttested}: ${when(t, locale, q.sealedAt, nowMs)}`}</span>
              <span className="flex flex-wrap items-center gap-2">
                {q.outcome !== null ? <MaswaliOutcomeStamp t={t} outcome={q.outcome} /> : <span className="text-body-sm text-text-muted">—</span>}
                {q.outcome === "VOID" && <span className="text-body-sm text-text-muted">{reasonOf(t, q)}</span>}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <ScrollX label={t.millionea.weekQuestions} className="hidden md:block">
        {/* ⚠️ TABLE LAW (`legal/rules/_shared.tsx`): `.admin-tbl` is the product's ONLY table skin — /fairness, /leaderboard,
            the rules pages and the account page wear it too — so the cells take its padding, header and dividers, and
            carry only their own ink, width and wrapping. */}
        <table className="admin-tbl">
          <thead className="font-mono text-micro uppercase eyebrow text-text-subtle">
            <tr>
              <th scope="col" className="text-left">#</th>
              <th scope="col" className="text-left">{t.millionea.regColCategory}</th>
              <th scope="col" className="text-left">{t.millionea.regColQuestion}</th>
              <th scope="col" className="text-left">{t.millionea.regColSource}</th>
              <th scope="col" className="text-left">{t.millionea.regColEvent}</th>
              <th scope="col" className="text-left">{t.millionea.regColOfficer}</th>
              <th scope="col" className="text-left">{t.millionea.regColAttested}</th>
              <th scope="col" className="text-left">{t.millionea.regColOutcome}</th>
              <th scope="col" className="text-left">{t.millionea.regColVoidReason}</th>
            </tr>
          </thead>
          <tbody>
            {qs.map((q) => (
              <tr key={q.slot} className="align-top" style={q.role === "RESERVE" ? { background: "var(--wash-inset)" } : undefined}>
                <th scope="row" className="text-left font-mono text-text-muted tabular-nums">{placeOf(q)}</th>
                <td className="text-text-muted">{marketCategoryLabel(t, q.category)}</td>
                <td className="min-w-[220px] text-text">{textIn(locale, q.text)}</td>
                <td className="text-text-muted [overflow-wrap:anywhere]">{q.sourceDomain}</td>
                <td className="font-mono text-text-muted">{when(t, locale, q.eventStartsAt, nowMs)}</td>
                <td className="text-text-muted">{role(q)}</td>
                <td className="font-mono text-text-muted">{when(t, locale, q.sealedAt, nowMs)}</td>
                <td>{q.outcome !== null ? <MaswaliOutcomeStamp t={t} outcome={q.outcome} /> : "—"}</td>
                <td className="text-text-muted">{q.outcome === "VOID" ? reasonOf(t, q) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
    </section>
  );
}

/** The reserve rule, and the map of the reserves that stood in, as a timestamped log (§10 §3.17). */
function Substitutions({ t, locale, w, nowMs }: { t: Dict; locale: Locale; w: MillioneaRegisterWeek; nowMs: number }) {
  const voidedMains = w.questions.filter((q) => q.role === "MAIN" && q.outcome === "VOID");
  const replaced = new Set(w.substitutions.map((s) => s.main));
  const log = [
    ...w.substitutions.map((s) => ({ at: s.voidedAt, text: fill(t.millionea.logCarry, { n: s.main, r: reserveLabel(s.reserve - MAIN_COUNT) }) })),
    ...voidedMains.filter((q) => !replaced.has(q.slot)).map((q) => ({ at: q.sealedAt, text: fill(t.millionea.logVoid, { n: q.slot }) })),
    ...(w.state === "VOIDED" ? [{ at: w.settledAt, text: t.millionea.logWeekVoid }] : []),
  ].sort((a, b) => (msOf(a.at) ?? 0) - (msOf(b.at) ?? 0));
  return (
    <section aria-labelledby="mln-reg-map" className="flex flex-col gap-2">
      <h2 id="mln-reg-map" className="font-display text-title-sm font-bold text-text">{t.millionea.regMap}</h2>
      <p className="text-body-sm text-text-muted text-pretty">{t.millionea.regSubRule}</p>
      {log.length > 0 && (
        <ol className="flex flex-col" aria-label={t.millionea.regLog}>
          {log.map((l, i) => (
            <li key={i} className="flex flex-wrap gap-x-3 border-b border-border py-2 text-body-sm">
              <span className="font-mono text-text-subtle">{when(t, locale, l.at, nowMs)}</span>
              <span className="text-text">{l.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** The week's whole ledger, to the shilling (§10 §3.17; MR-20–MR-25), each line the settlement's own column. */
function Ledger({ t, w }: { t: Dict; w: MillioneaRegisterWeek }) {
  const prev = previousWeekNumber(w.opensAt), next = nextWeekNumber(w.opensAt);
  const fig = (n: number | null) => <span className="amount">{n === null ? "—" : formatTzs(n)}</span>;
  const ROW = "border-b border-border py-1.5";
  const sales = w.sales ?? 0, carryIn = w.carryIn ?? 0;
  const pct = w.feeRate !== null ? pctNum(w.feeRate) : null;
  const rows: Array<{ key: string; node: React.ReactNode }> = [];
  if (carryIn > 0) rows.push({ key: "in", node: <ReceiptRow className={ROW} label={fill(t.millionea.carriedIn, { week: prev })} value={fig(carryIn)} /> });
  rows.push({ key: "sold", node: <ReceiptRow className={ROW} label={fill(t.millionea.regTicketsSold, { n: w.tickets, price: formatTzs(w.ticketPrice) })} value={fig(sales)} /> });
  rows.push({ key: "pool", node: <ReceiptRow className={ROW} label={t.millionea.poolTotal} value={fig(carryIn + sales)} /> });
  rows.push({ key: "floor", node: <ReceiptRow className={ROW} label={t.millionea.floor} value={fig(w.floor)} /> });
  if (w.state === "VOIDED") {
    // "Every ticket refunded" only once every refund landed (MR-18, the read model's `refundsPending`); until then, that
    // the money is on its way back — never a refund stated before it happened (the S5 UI review, HIGH 1).
    rows.push({ key: "refund", node: w.refundsPending
      ? <ReceiptRow className={ROW} emphasis="muted" label={fill(t.millionea.refundEachPending, { price: formatTzs(w.ticketPrice) })} value={fig(sales)} />
      : <ReceiptRow className={ROW} label={fill(t.millionea.refundEach, { price: formatTzs(w.ticketPrice) })} value={fig(sales)} /> });
    rows.push({ key: "again", node: <ReceiptRow className={ROW} label={t.millionea.carriedForwardAgain} value={fig(carryIn)} /> });
  } else if ((w.winners ?? 0) > 0) {
    rows.push({ key: "jackpot", node: <ReceiptRow className={ROW} label={t.millionea.jackpot} value={fig(w.jackpot)} /> });
    rows.push({ key: "fee", node: <ReceiptRow className={ROW} tone="warning" emphasis="fee" label={pct === null ? t.millionea.fee : fill(t.millionea.feeLine, { pct })} value={fig(w.fee === null ? null : -w.fee)} /> });
    if (w.traLevy !== null && w.gbtLevy !== null && (w.fee ?? 0) > 0) {
      // The levies' shares OF THE FEE (MR-24), from what the settlement booked; their amounts beside them.
      const fee = w.fee ?? 0;
      rows.push({ key: "levies", node: <ReceiptRow className={ROW} emphasis="muted"
        label={fill(t.millionea.levies, { tra: pctNum(w.traLevy / fee), gbt: pctNum(w.gbtLevy / fee) })}
        value={<span className="amount text-text-muted">{`${formatTzs(w.traLevy)} · ${formatTzs(w.gbtLevy)}`}</span>} /> });
    }
    if ((w.topUp ?? 0) > 0) rows.push({ key: "topup", node: <ReceiptRow className={ROW} label={`${t.millionea.topUp} · ${t.millionea.topUpNote}`} value={fig(w.topUp)} /> });
    rows.push({ key: "share", node: <ReceiptRow className={ROW} label={counted(w.winners ?? 0, t.millionea.perTicketOne, t.millionea.perTicket)} value={fig(w.share)} /> });
    rows.push({ key: "paid", node: <ReceiptRow className={ROW} label={t.millionea.toWinners} value={fig(w.paid)} /> });
    if ((w.remainder ?? 0) > 0) rows.push({ key: "dust", node: <ReceiptRow className={ROW} label={`${t.millionea.remainder} · ${t.millionea.remainderNote}`} value={fig(w.remainder)} /> });
    rows.push({ key: "out", node: <ReceiptRow className={ROW} label={fill(t.millionea.carriedOut, { week: next })} value={fig(w.carriedForward)} /> });
  } else {
    rows.push({ key: "fee", node: <ReceiptRow className={ROW} label={t.millionea.fee} value={<span className="amount text-text-muted">{t.millionea.feeZero}</span>} /> });
    rows.push({ key: "out", node: <ReceiptRow className={ROW} label={fill(t.millionea.carriedOut, { week: next })} value={fig(w.carriedForward)} /> });
  }
  return (
    <section aria-labelledby="mln-reg-ledger" className="mat-flat flex flex-col gap-2 rounded-card p-3">
      <h2 id="mln-reg-ledger" className="font-display text-title-sm font-bold text-text">{t.millionea.regLedger}</h2>
      <div className="flex flex-col border-t border-border">{rows.map((r) => <div key={r.key}>{r.node}</div>)}</div>
    </section>
  );
}

export default async function MillioneaRegisterWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const gate = await millioneaGate();
  const { week: code } = await params;
  const { t, locale } = await getServerT();
  const w = await millioneaRegisterWeek(code);
  if (!w) notFound();
  const nowMs = Date.now();
  const week = weekNumberOf(w.code);
  return (
    <PageContainer tier="reading" className="kp-mln-zh">
      <div className="flex flex-col gap-6" data-testid="millionea-register-week">
        <BackLink fallbackHref={MILLIONEA_HREF.register} label={t.millionea.registerTitle} />
        <PageHeader eyebrow={t.millionea.registerTitle} title={`${weekWord(t, week)} · ${millioneaWord(t, WEEK_STATE_KEY[w.state])}`} />
        {gate.preview && <MillioneaPreviewMark t={t} />}
        <section className="mat-flat flex flex-col gap-2 rounded-card p-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{`${t.millionea.regHash} · ${fill(t.millionea.regPublished, { when: when(t, locale, w.opensAt, nowMs) })}`}</span>
            <span className="font-mono text-body-sm text-text break-all">{w.questionSetHash ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{t.millionea.regRoot}</span>
            <span className="font-mono text-body-sm text-text break-all">{w.ticketMerkleRoot ?? "—"}</span>
          </div>
        </section>
        <Questions t={t} locale={locale} w={w} nowMs={nowMs} />
        <Substitutions t={t} locale={locale} w={w} nowMs={nowMs} />
        <Ledger t={t} w={w} />
        {w.standing && w.standing.length > 0 && (
          <section aria-labelledby="mln-reg-standing" className="flex flex-col gap-2">
            <h2 id="mln-reg-standing" className="font-display text-title-sm font-bold text-text">{t.millionea.regStanding}</h2>
            <ol className="flex flex-col">
              {w.standing.map((s) => (
                <li key={s.slot} className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 text-body-sm">
                  <span className="text-text-muted">{`${s.slot <= MAIN_COUNT ? s.slot : reserveLabel(s.slot - MAIN_COUNT)} · ${when(t, locale, s.sealedAt, nowMs)}`}</span>
                  <span className="font-mono tabular-nums text-text">{s.ticketsWithoutAMiss}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
        <Link href={"/fairness" as never} className="inline-flex items-center gap-1 self-start text-body-sm text-text-link hover:text-text-linkHover" style={{ minHeight: "var(--h-control-md)" }}>
          {t.millionea.auditChain}
          <I.chevronRight s={14} edge="end" />
        </Link>
        <MillioneaReadingLinks t={t} hub />
      </div>
    </PageContainer>
  );
}
