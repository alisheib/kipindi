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
 * ⭐ PUBLIC, SERVER-RENDERED, WORKS WITHOUT JAVASCRIPT (the `/fairness` pattern) — and no personal data: roles, never names;
 *    counts, never tickets.
 * ⭐ THE TILE READ OF 2026-10-19 (S5 VIS-R), at 320 · 360 · 768 · 1024 · 1280 · 1920 in English, Swahili and Chinese:
 *    · R1 — the fifteen are a TABLE FROM 1024 and CARDS BELOW IT, one card per question with every fact labelled by the
 *      table's own heads: at 768 the nine-column table was cut off on the right and crushed in Chinese.
 *    · R2 — the table is six columns that fit the reading measure at 1024: the category rides above its question (R8: one
 *      drawing of it at every width), the officer's role under the attested time, a void's reason under its outcome; the
 *      dates, the source and the role never break (nowrap), the question and the reason wrap; the source drops "www.".
 *    · R3 — the outcome stamp says the outcome alone: the column head or the card's label already says "Outcome".
 *    · R4 · R7 — the head names the week, its state is its own chip, and the register is named once (the back link); the
 *      eyebrow is the product's, as on every Millionea page.
 *    · R5 · A1 — no "·"-joined line can start or end a line with its separator: the commitments' label is one phrase with
 *      its date kept whole, the ledger's notes stand on their own line, each levy is its own row, and every week, amount
 *      and date inside a label is one unbroken run.
 *    · R6 — a past week's questions are "Week 48's questions", never "this week's".
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
import { millioneaWord, reserveLabel, sourceLabel, weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { cachedMillioneaRegisterWeek, type MillioneaRegisterQuestion, type MillioneaRegisterWeek } from "@/lib/server/maswali-player";
import { getServerT } from "@/lib/i18n-server";
import { isMaswaliVoidReason, MASWALI_VOID_REASON_KEY } from "@/lib/maswali-void-reason";
import { marketCategoryLabel } from "@/lib/localized";
import { formatEatDateTime } from "@/lib/eat-day";
import { MAIN_COUNT } from "@/lib/maswali-score";
import { fill, formatNumber } from "@/lib/utils";
import { keepConnectives } from "@/components/ui/keep-run";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { MILLIONEA_HREF, MillioneaPreviewMark, MillioneaReadingLinks } from "../../millionea-parts";
import { bySlot, msOf, ordinalOf, textIn } from "../../millionea-view";
import { kept, registerLedgerRows, WeekStateChip } from "../register-parts";
import { ROOT_OPEN_GRAPH } from "@/app/layout";
import { weekStore } from "@/lib/server/maswali-dal";
import { loadPublishedOgWeek } from "@/lib/server/millionea-og-week";
import { normalizeMillioneaWeekCode } from "@/lib/server/maswali-player";
import { dict } from "@/lib/i18n-dict";
import { WEEK_STATE_KEY } from "@/lib/maswali-week-label";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }): Promise<Metadata> {
  // The title obeys the same answer as the body (the account hub's precedent): a hidden product's page is titled as the
  // identical 404 is, and asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaDoor()).visible) return notFoundMetadata();
  const { t } = await getServerT();
  const ordinary = { title: `${t.millionea.registerTitle} · ${t.millionea.productLabel}` };
  const door = await millioneaDoor(); // React-cached: the same audience answer as the 404 gate above.
  if (door.state !== "ACTIVE") return ordinary; // STAFF_PREVIEW has no Millionea share card.
  const { week: rawCode } = await params;
  const code = normalizeMillioneaWeekCode(rawCode);
  let week: Awaited<ReturnType<typeof loadPublishedOgWeek>> = null;
  try { week = await loadPublishedOgWeek(door, code, weekStore.getByCode); }
  catch { return ordinary; } // Metadata may fail; the body's read decides the page.
  if (!week) return ordinary; // The body decides 404; some valid register pages are not OG-eligible yet.
  const english = dict.en;
  const weekNumber = weekNumberOf(week.code);
  const title = `${weekWord(t, weekNumber)} · ${t.millionea.productLabel}`;
  const shareTitle = `${weekWord(english, weekNumber)} · ${english.millionea.productTitle}`;
  const description = millioneaWord(english, WEEK_STATE_KEY[week.state]);
  const image = `/api/og/millionea/${encodeURIComponent(week.code)}`;
  return {
    title,
    description,
    openGraph: { ...ROOT_OPEN_GRAPH, title: shareTitle, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: [image] },
  };
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
/** The reserves' band: the inset wash every Millionea list gives the five (the hub's, §10 §3.3 item 5). */
const RESERVE_WASH = { background: "var(--wash-inset)" } as const;
/** A field's label in a card — the table head's own face, so a card and a column name a fact alike. */
const FIELD = "font-mono text-micro uppercase eyebrow text-text-subtle";

/** A question's category: ONE drawing in the cards and the table (R8), the Millionea category of the hub and the slip, and
 *  never split ("加密货币", "Hali ya hewa"). */
function Category({ t, q }: { t: Dict; q: Q }) {
  return <span className="whitespace-nowrap font-mono text-micro uppercase eyebrow text-text-subtle">{marketCategoryLabel(t, q.category)}</span>;
}

/** The attested outcome, said once (R3): the bare stamp — its field or its column names it — and a void's reason under it. */
function Outcome({ t, q }: { t: Dict; q: Q }) {
  if (q.outcome === null) return <span className="text-text-muted">—</span>;
  return (
    <span className="flex flex-col items-start gap-1">
      <MaswaliOutcomeStamp t={t} outcome={q.outcome} label={false} />
      {q.outcome === "VOID" && <span className="text-body-sm text-text-muted text-pretty">{reasonOf(t, q)}</span>}
    </span>
  );
}

/** The fifteen: cards below 1024 and a table from 1024 (R1), one source of facts for both. */
function Questions({ t, locale, w, nowMs }: { t: Dict; locale: Locale; w: MillioneaRegisterWeek; nowMs: number }) {
  const qs = bySlot(w.questions);
  const mains = qs.filter((q) => q.role === "MAIN"), reserves = qs.filter((q) => q.role === "RESERVE");
  const role = (q: Q) => (q.sealerRole ? t.millionea.officerRole : "—");
  const heading = fill(t.millionea.regWeekQuestions, { week: weekNumberOf(w.code) });
  const card = (q: Q) => (
    <li key={q.slot} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2 border-t border-border px-1 py-3" style={q.role === "RESERVE" ? RESERVE_WASH : undefined}>
      <span className="font-mono text-body-sm font-bold tabular-nums text-text-muted">{placeOf(q)}</span>
      <div className="flex min-w-0 flex-col gap-1">
        <Category t={t} q={q} />
        <span className="text-body-sm text-text text-pretty">{textIn(locale, q.text)}</span>
        <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1.5 text-body-sm">
          <dt className={FIELD}>{t.millionea.regColSource}</dt>
          <dd className="text-text-muted [overflow-wrap:anywhere]">{sourceLabel(q.sourceDomain)}</dd>
          <dt className={FIELD}>{t.millionea.regColEvent}</dt>
          <dd className="whitespace-nowrap font-mono text-text-muted">{when(t, locale, q.eventStartsAt, nowMs)}</dd>
          <dt className={FIELD}>{t.millionea.regColOfficer}</dt>
          <dd className="text-text-muted">{role(q)}</dd>
          <dt className={FIELD}>{t.millionea.regColAttested}</dt>
          <dd className="whitespace-nowrap font-mono text-text-muted">{when(t, locale, q.sealedAt, nowMs)}</dd>
          <dt className={FIELD}>{t.millionea.regColOutcome}</dt>
          <dd><Outcome t={t} q={q} /></dd>
        </dl>
      </div>
    </li>
  );
  const row = (q: Q) => (
    <tr key={q.slot} className="align-top" style={q.role === "RESERVE" ? RESERVE_WASH : undefined}>
      <th scope="row" className="text-left font-mono tabular-nums text-text-muted">{placeOf(q)}</th>
      <td className="min-w-[200px]">
        <span className="flex flex-col gap-1">
          <Category t={t} q={q} />
          <span className="text-text text-pretty">{textIn(locale, q.text)}</span>
        </span>
      </td>
      <td className="whitespace-nowrap text-text-muted">{sourceLabel(q.sourceDomain)}</td>
      <td className="whitespace-nowrap font-mono text-text-muted">{when(t, locale, q.eventStartsAt, nowMs)}</td>
      <td className="text-text-muted">
        {q.sealedAt ? (
          <span className="flex flex-col gap-1">
            <span className="whitespace-nowrap font-mono">{when(t, locale, q.sealedAt, nowMs)}</span>
            <span className="whitespace-nowrap text-text-subtle">{role(q)}</span>
          </span>
        ) : "—"}
      </td>
      <td className="min-w-[160px]"><Outcome t={t} q={q} /></td>
    </tr>
  );
  const band = "font-mono text-caption uppercase eyebrow text-text-subtle";
  return (
    <section aria-labelledby="mln-reg-q" className="flex flex-col gap-2">
      <h2 id="mln-reg-q" className="font-display text-title-sm font-bold text-text">{heading}</h2>
      <div className="flex flex-col lg:hidden" data-testid="millionea-register-cards">
        <ol className="flex flex-col">{mains.map(card)}</ol>
        {reserves.length > 0 && (
          <>
            <div className={`border-t border-border px-1 pb-1.5 pt-2 ${band}`} style={RESERVE_WASH}>{t.millionea.reservesHead}</div>
            <ol className="flex flex-col">{reserves.map(card)}</ol>
          </>
        )}
      </div>
      <ScrollX label={heading} className="hidden lg:block">
        {/* ⚠️ TABLE LAW (`legal/rules/_shared.tsx`): `.admin-tbl` is the product's ONLY table skin — /fairness, /leaderboard,
            the rules pages and the account page wear it too — so the cells take its padding, header and dividers, and
            carry only their own ink, width and wrapping. */}
        <table className="admin-tbl" data-testid="millionea-register-table">
          <thead className="font-mono text-micro uppercase eyebrow text-text-subtle">
            <tr>
              <th scope="col" className="text-left">#</th>
              <th scope="col" className="text-left">{t.millionea.regColQuestion}</th>
              <th scope="col" className="text-left">{t.millionea.regColSource}</th>
              <th scope="col" className="text-left">{t.millionea.regColEvent}</th>
              <th scope="col" className="text-left">{t.millionea.regColAttested}</th>
              <th scope="col" className="text-left">{t.millionea.regColOutcome}</th>
            </tr>
          </thead>
          <tbody>{mains.map(row)}</tbody>
          {reserves.length > 0 && (
            <tbody>
              <tr data-divider style={RESERVE_WASH}>
                <th scope="rowgroup" colSpan={6} className={`text-left ${band}`}>{t.millionea.reservesHead}</th>
              </tr>
              {reserves.map(row)}
            </tbody>
          )}
        </table>
      </ScrollX>
    </section>
  );
}

/** The reserve rule, and the map of the reserves that stood in, as a timestamped log (§10 §3.17). */
function Substitutions({ t, locale, w, nowMs }: { t: Dict; locale: Locale; w: MillioneaRegisterWeek; nowMs: number }) {
  const voidedMains = w.questions.filter((q) => q.role === "MAIN" && q.outcome === "VOID");
  const replaced = new Set(w.substitutions.map((s) => s.main));
  // In time order, an entry without an instant after every timed one (it was read as the earliest and opened the log).
  const order = (iso: string | null) => msOf(iso) ?? Number.MAX_SAFE_INTEGER;
  const timed = [
    ...w.substitutions.map((s) => ({ at: s.voidedAt, text: fill(t.millionea.logCarry, { n: s.main, r: reserveLabel(s.reserve - MAIN_COUNT) }) })),
    ...voidedMains.filter((q) => !replaced.has(q.slot)).map((q) => ({ at: q.sealedAt, text: fill(t.millionea.logVoid, { n: q.slot }) })),
  ].sort((a, b) => order(a.at) - order(b.at));
  // The week's own void closes the log, UNTIMED: its stamp writes the state alone (`stampVoid`), so no instant is stored to
  // print — never a made-up one (AGENTS.md §6), as the v6 delivery's log also leaves it.
  const log: Array<{ at: string | null; text: string }> = w.state === "VOIDED" ? [...timed, { at: null, text: t.millionea.logWeekVoid }] : timed;
  return (
    <section aria-labelledby="mln-reg-map" className="flex flex-col gap-2">
      <h2 id="mln-reg-map" className="font-display text-title-sm font-bold text-text">{t.millionea.regMap}</h2>
      {/* The range's two ends stay together — "A1 to A5", "A1 hadi A5", "A1 至 A5" (A1) — as one run. */}
      <p className="text-body-sm text-text-muted text-pretty">{kept(t.millionea.regSubRule, t.millionea.regSubRule.match(/A1\s\S+\sA5/) ?? [])}</p>
      {log.length > 0 && (
        <ol className="flex flex-col" aria-label={t.millionea.regLog}>
          {log.map((l, i) => (
            // What happened, then when — the ledger's own reading order (label left, figure right); an untimed entry is
            // the words alone, never a "—" standing in a time's place.
            <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-border py-2 text-body-sm">
              <span className="text-text">{l.text}</span>
              {l.at !== null && <span className="whitespace-nowrap font-mono text-text-subtle">{when(t, locale, l.at, nowMs)}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** The week's whole ledger, to the shilling (§10 §3.17; MR-20–MR-25): the rows `registerLedgerRows` builds — each figure the
 *  settlement's own column, in its order (S5-FIX-PLAYER P3, P4, P11) — drawn as the receipt's own rows. */
function Ledger({ t, w }: { t: Dict; w: MillioneaRegisterWeek }) {
  const ROW = "gap-3 border-b border-border py-1.5";
  const rows = registerLedgerRows(t, w);
  return (
    <section aria-labelledby="mln-reg-ledger" className="mat-flat flex flex-col gap-2 rounded-card p-3 pr-[56px] xl:pr-3">
      <h2 id="mln-reg-ledger" className="font-display text-title-sm font-bold text-text">{t.millionea.regLedger}</h2>
      <div className="flex flex-col border-t border-border">{rows.map((r) => (
        <div key={r.key}>
          <ReceiptRow className={ROW} tone={r.tone} emphasis={r.emphasis} label={r.label}
            value={<span className={r.quiet ? "amount text-text-muted" : "amount"}>{r.value}</span>} />
        </div>
      ))}</div>
    </section>
  );
}

export default async function MillioneaRegisterWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const gate = await millioneaGate();
  const { week: code } = await params;
  const { t, locale } = await getServerT();
  const w = await cachedMillioneaRegisterWeek(code);
  if (!w) notFound();
  const nowMs = Date.now();
  const week = weekNumberOf(w.code);
  // The commitments' label is ONE phrase — "Question set published 23 Nov, 00:01" — with its date kept whole (R5: it read
  // "…PUBLISHED 23 / NOV, 00:01", and a "·" between the two halves could open or close a line, A1).
  const published = when(t, locale, w.opensAt, nowMs);
  const EYEBROW = "font-mono text-micro uppercase eyebrow text-text-subtle";
  return (
    <PageContainer tier="reading" className="kp-mln-zh">
      <div className="flex flex-col gap-6" data-testid="millionea-register-week">
        <BackLink fallbackHref={MILLIONEA_HREF.register} label={t.millionea.registerTitle} />
        <div className="flex flex-col gap-2">
          <PageHeader eyebrow={t.millionea.productTitle} title={weekWord(t, week)} />
          <WeekStateChip t={t} state={w.state} />
        </div>
        {gate.preview && <MillioneaPreviewMark t={t} />}
        <section className="mat-flat flex flex-col gap-3 rounded-card p-3">
          <div className="flex flex-col gap-0.5">
            <span className={EYEBROW}>{kept(fill(t.millionea.regHashPublished, { when: published }), [published])}</span>
            <span className="font-mono text-body-sm text-text break-all">{w.questionSetHash ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className={EYEBROW}>{keepConnectives(t.millionea.regRoot)}</span>
            <span className="font-mono text-body-sm text-text break-all">{w.ticketMerkleRoot ?? "—"}</span>
          </div>
        </section>
        <Questions t={t} locale={locale} w={w} nowMs={nowMs} />
        <Substitutions t={t} locale={locale} w={w} nowMs={nowMs} />
        <Ledger t={t} w={w} />
        {w.standing && w.standing.length > 0 && (
          <section aria-labelledby="mln-reg-standing" className="flex flex-col gap-2">
            <h2 id="mln-reg-standing" className="font-display text-title-sm font-bold text-text">{t.millionea.regStanding}</h2>
            <ol className="flex flex-col pr-[56px] xl:pr-0">
              {w.standing.map((s) => (
                // The result's place, its attested time and the count, each in its own column — never "1 · 2 Dec, 00:00" in
                // one string (A1) — the count grouped as every count is.
                <li key={s.slot} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border py-1.5 text-body-sm">
                  <span className="font-mono font-bold tabular-nums text-text-muted">{s.slot <= MAIN_COUNT ? s.slot : reserveLabel(s.slot - MAIN_COUNT)}</span>
                  <span className="whitespace-nowrap font-mono text-text-subtle">{when(t, locale, s.sealedAt, nowMs)}</span>
                  <span className="font-mono tabular-nums text-text">{formatNumber(s.ticketsWithoutAMiss)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
        <Link href={"/fairness" as never} className="inline-flex items-center gap-1 self-start text-body-sm text-text-link hover:text-text-linkHover" style={{ minHeight: "var(--h-control-md)" }}>
          {t.millionea.auditChain}
          <I.chevronRight s={14} edge="end" text="body-400" />
        </Link>
        <MillioneaReadingLinks t={t} hub />
      </div>
    </PageContainer>
  );
}
