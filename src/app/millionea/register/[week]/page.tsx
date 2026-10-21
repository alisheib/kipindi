/**
 * /millionea/register/[week] — DAFTARI LA WIKI, ONE WEEK (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 1, §10 §3.17; the v6
 * delivery's P-register-week frames; D-38). The reading tier.
 *
 * The week's public record, from the day it opens (the lead's H2 ruling, 2026-10-21): its state and its facts at the top;
 * its ledger to the shilling once it is final; its two commitments (the question set's hash published at the open, the
 * tickets' root stamped at the close with its time and count); the fifteen questions — each with its criterion, its event,
 * its source (a link, as /fairness links every source), its outcome once confirmed, how it was attested and, on the final
 * record, how it counted; the reserve rule and the week's log; after settlement, how many tickets were still without a
 * miss after each counted result.
 * ⭐ PUBLIC, SERVER-RENDERED, WORKS WITHOUT JAVASCRIPT (the `/fairness` pattern) — and no personal data: a count of
 *    officers, never a name; counts, never tickets.
 * ⭐ THE TILE READ OF 2026-10-19 (S5 VIS-R), kept: cards below 1024 and a six-column table from 1024 (R1, R2); the stamp says
 *    the outcome alone (R3); the head names the week, its state its own chip, the register named once (R4, R7); no "·" can
 *    open or close a line (R5, A1); a past week's questions are "Week 48's questions" (R6).
 * ⭐ S5-DESIGN-REGISTER (2026-10-21, Ali's 10/10 pass — the register critic's report):
 *    · H2 · a public week's page exists from its open: an OPEN, CLOSED or RESOLVING week shows its commitments, its questions
 *      and its confirmed outcomes — and NO money until it is final (the ledger's place says when the ledger comes). The
 *      "Audit chain" link is gone: /fairness's Millionea rows are S6's.
 *    · M1 · M9 · the answer at the top: under the title the week's chip and its code, its facts (the index row's own; the
 *      sunset's top score) and its times ("Sales closed … · Settled …"); then the ledger, before the questions.
 *    · H4 · M2 · M3 · each question reads as a ticket's clause: category, question, criterion, "Event … · source ↗", then its
 *      stamp, how it counted ("↪ A1" on a voided main, "↪ 4" on the reserve that stood in, "Not used"), and how it was
 *      attested ("One officer" / "Two officers", /fairness's glyphs, and its time); a void's reason under it; the week's
 *      legal line once, under the fifteen. From 1024 the same facts as a six-column table on its panel (L18).
 *    · H1 · L8 · P6 · the log names each void ("Question 1 voided"), each stand-in, the objection window (from → to), and a
 *      voided week's reason with its counts ("Week voided: 6 main questions void, only 4 valid reserves").
 *    · H5 · M4 · M5 · the ledger is the ONE Millionea ledger (`MaswaliLedger`), at the receipt's measure, with no right lane.
 *    · M12 · L15 · the commitments are a titled section of nouns (`WeekCommitments`).
 * ⛔ THE GATE FIRST (MR-2). A code that is not a public week that has opened is the not-found page (`millioneaRegisterRecord`).
 * ⛔ An unearned surface: no gold (§M8a item 7) — the register states money; it awards none.
 */
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import { millioneaDoor } from "@/lib/server/millionea-doors";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { ScrollX } from "@/components/ui/scroll-x";
import { I } from "@/components/ui/glyphs";
import { MaswaliLedger } from "@/components/maswali/maswali-ledger";
import { MaswaliOutcomeStamp } from "@/components/maswali/maswali-outcome-stamp";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { counted, millioneaWord, reserveLabel, sourceLabel, weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { millioneaGate } from "@/lib/server/millionea-gate";
import {
  millioneaRegisterRecord, normalizeMillioneaWeekCode,
  type MillioneaAttestation, type MillioneaRegisterQuestion, type MillioneaRegisterWeek, type MillioneaRegisterLiveWeek,
} from "@/lib/server/maswali-player";
import { getServerT } from "@/lib/i18n-server";
import { isMaswaliVoidReason, MASWALI_VOID_REASON_KEY } from "@/lib/maswali-void-reason";
import { marketCategoryLabel } from "@/lib/localized";
import { MAIN_COUNT } from "@/lib/maswali-score";
import { fill, formatNumber, formatTzs } from "@/lib/utils";
import type { WeekState } from "@/lib/maswali-week-label";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { MILLIONEA_HREF, MillioneaPreviewMark, MillioneaReadingLinks } from "../../millionea-parts";
import { bySlot, millioneaWeekPhase, msOf, ordinalOf, textIn, type MillioneaWeekPhase } from "../../millionea-view";
import { liveWeekFacts, registerLedgerRows, registerWhen, WeekCommitments, weekFacts, WeekStateChip, weekTimes } from "../register-parts";
import { ROOT_OPEN_GRAPH } from "@/app/layout";
import { weekStore } from "@/lib/server/maswali-dal";
import { loadPublishedOgWeek } from "@/lib/server/millionea-og-week";
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

/**
 * HOW A QUESTION COUNTED (M3), on the final record only — a voided main a reserve stood in for ("↪ A1"), the reserve that
 * stood in ("↪ 4"), a reserve the week did not need ("Not used") — or, while the week runs, a voided main still waiting
 * for its reserve (or, when the week's void is already certain, for none). ⛔ No carry is drawn before the week settled:
 * an objection could still reinstate a question while the window is open (§M8a item 1: never an un-carry).
 */
type Mark =
  | { kind: "standIn"; reserve: string; main: number }
  | { kind: "stoodIn"; reserve: string; main: number }
  | { kind: "notUsed" }
  | { kind: "awaiting"; certain: boolean };

/** One line of the week's log: what happened, and when — or the words alone when no instant is stored for it. */
type LogEntry = { at: string | null; text: string; time: string | null };

/** The one shape the page draws, whichever record it read. */
type View = {
  code: string;
  state: WeekState;
  phase: MillioneaWeekPhase | null;
  paused: boolean;
  facts: ReactNode[];
  times: ReactNode[];
  hash: string | null;
  publishedAt: string | null;
  root: string | null;
  closedAt: string | null;
  tickets: number | null;
  questions: Q[];
  attested: Record<number, MillioneaAttestation>;
  marks: Map<number, Mark>;
  log: LogEntry[];
  legal: "single" | "two" | null;
};

/** The reserves' band: the inset wash every Millionea list gives the five (the hub's, §10 §3.3 item 5). */
const RESERVE_WASH = { background: "var(--wash-inset)" } as const;
const H2 = "font-display text-title-sm font-bold text-text";

/** A void's reason, in the reader's words (the closed list, `maswali-void-reason.ts`), or "—". */
function reasonOf(t: Dict, q: Q): string {
  return q.voidReason && isMaswaliVoidReason(q.voidReason) ? millioneaWord(t, MASWALI_VOID_REASON_KEY[q.voidReason]) : "—";
}

/** The objection window as a log line: the platform's one name for it (L5) and its two ends (P6), when both are stamped. */
function windowEntry(t: Dict, locale: Locale, from: string | null, to: string | null, nowMs: number): LogEntry[] {
  const a = registerWhen(t, locale, from, nowMs), b = registerWhen(t, locale, to, nowMs);
  return a !== null && b !== null ? [{ at: from, text: t.millionea.regCheck, time: `${a} → ${b}` }] : [];
}

/** A voided week's last line, untimed — its stamp writes the state alone, so no instant is stored (AGENTS.md §6) — with
 *  the counts that voided it (H1: MR-18, more voided mains than valid reserves). */
function weekVoidLine(t: Dict, mains: number, reserves: number): string {
  const m = t.millionea;
  if (reserves === 0) return mains === 1 ? m.logWeekVoidNoReserveOne : fill(m.logWeekVoidNoReserve, { mains: formatNumber(mains) });
  return reserves === 1 ? fill(m.logWeekVoidOneReserve, { mains: formatNumber(mains) }) : fill(m.logWeekVoidCounts, { mains: formatNumber(mains), reserves: formatNumber(reserves) });
}

/** In time order, an entry without an instant after every timed one (it was once read as the earliest). */
function inOrder(entries: LogEntry[]): LogEntry[] {
  const order = (iso: string | null) => msOf(iso) ?? Number.MAX_SAFE_INTEGER;
  return [...entries].sort((a, b) => order(a.at) - order(b.at));
}

/** A final week, as the page draws it. */
function finalView(t: Dict, locale: Locale, rec: { week: MillioneaRegisterWeek; attested: Record<number, MillioneaAttestation>; voidedMains: number; usableReserves: number; objections: { from: string | null; to: string | null } }, nowMs: number): View {
  const w = rec.week;
  const marks = new Map<number, Mark>();
  if (w.state === "SETTLED") {
    for (const s of w.substitutions) {
      const reserve = reserveLabel(s.reserve - MAIN_COUNT);
      marks.set(s.main, { kind: "standIn", reserve, main: s.main });
      marks.set(s.reserve, { kind: "stoodIn", reserve, main: s.main });
    }
    for (const q of w.questions) if (q.role === "RESERVE" && !marks.has(q.slot) && q.outcome !== "VOID") marks.set(q.slot, { kind: "notUsed" });
  }
  const replaced = new Set(w.substitutions.map((s) => s.main));
  const at = (slot: number) => rec.attested[slot]?.attestedAt ?? null;
  const when = (iso: string | null) => registerWhen(t, locale, iso, nowMs);
  const log: LogEntry[] = [
    ...w.substitutions.map((s) => ({ at: at(s.main), text: fill(t.millionea.logCarry, { n: s.main, r: reserveLabel(s.reserve - MAIN_COUNT) }), time: when(at(s.main)) })),
    ...w.questions.filter((q) => q.role === "MAIN" && q.outcome === "VOID" && !replaced.has(q.slot))
      .map((q) => ({ at: at(q.slot), text: fill(t.millionea.logVoid, { n: q.slot }), time: when(at(q.slot)) })),
    ...windowEntry(t, locale, rec.objections.from, rec.objections.to, nowMs),
  ];
  const sunset = w.basis === "TOP_SCORE" && w.winningScore !== null;
  const facts: ReactNode[] = sunset
    ? [
        // M9 · the sunset's top score heads its facts, in the win ledger's own words; then the jackpot it shared.
        ...factsOf(counted(w.winners ?? 0, t.millionea.sunsetScoreOne, t.millionea.sunsetScore, { score: w.winningScore ?? 0 })).map((f) => keepFact(locale, f)),
        ...(w.jackpot !== null ? [<>{`${t.millionea.jackpot} `}<span className="amount">{formatTzs(w.jackpot)}</span></>] : []),
      ]
    : weekFacts(t, w);
  return {
    code: w.code, state: w.state, phase: null, paused: false,
    facts, times: weekTimes(t, locale, w, nowMs),
    hash: w.questionSetHash, publishedAt: w.opensAt, root: w.ticketMerkleRoot, closedAt: w.closedAt, tickets: w.tickets,
    questions: w.questions, attested: rec.attested, marks,
    log: inOrder(log).concat(w.state === "VOIDED" ? [{ at: null, text: weekVoidLine(t, rec.voidedMains, rec.usableReserves), time: null }] : []),
    legal: w.resolution,
  };
}

/** A week still running, as the page draws it — no money, no carry (H2). */
function liveView(t: Dict, locale: Locale, w: MillioneaRegisterLiveWeek, nowMs: number): View {
  const phase = millioneaWeekPhase(w, nowMs);
  const marks = new Map<number, Mark>();
  for (const q of w.questions) if (q.role === "MAIN" && q.outcome === "VOID") marks.set(q.slot, { kind: "awaiting", certain: phase.kind === "voiding" });
  const at = (slot: number) => w.attested[slot]?.attestedAt ?? null;
  const log: LogEntry[] = [
    ...w.questions.filter((q) => q.role === "MAIN" && q.outcome === "VOID")
      .map((q) => ({ at: at(q.slot), text: fill(t.millionea.logVoid, { n: q.slot }), time: registerWhen(t, locale, at(q.slot), nowMs) })),
    ...windowEntry(t, locale, w.gradedSetFinalAt, w.objectionsCloseAt, nowMs),
  ];
  const signed = Object.values(w.attested).filter((a) => a.signoff !== null);
  return {
    code: w.code, state: w.state, phase, paused: w.paused,
    facts: liveWeekFacts(t, locale, w, nowMs), times: weekTimes(t, locale, w, nowMs),
    hash: w.questionSetHash, publishedAt: w.opensAt, root: w.ticketMerkleRoot, closedAt: w.closedAt, tickets: w.tickets,
    questions: w.questions, attested: w.attested, marks,
    log: inOrder(log),
    legal: signed.length === 0 ? null : signed.every((a) => a.signoff === "two") ? "two" : "single",
  };
}

/** A question's place as the reader reads it: 1…10, A1…A5 (O-8) — a voided main's struck, in its own ink (M3). */
function Place({ q }: { q: Q }) {
  const label = q.role === "MAIN" ? String(q.slot) : reserveLabel(ordinalOf(q));
  return (
    <span className="font-mono text-body-sm font-bold tabular-nums text-text-muted">
      {q.role === "MAIN" && q.outcome === "VOID" ? <s className="decoration-current">{label}</s> : label}
    </span>
  );
}

/** A question's category: ONE drawing in the cards and the table (R8), the Millionea category of the hub and the slip, and
 *  never split ("加密货币", "Hali ya hewa"). */
function Category({ t, q }: { t: Dict; q: Q }) {
  return <span className="whitespace-nowrap font-mono text-micro uppercase eyebrow text-text-subtle">{marketCategoryLabel(t, q.category)}</span>;
}

/** The source, as /fairness gives every source: a link out, in the link ink, with the family's external mark (H4), its
 *  domain without "www." (R2). The hit box reaches the 40px floor without moving any paint (`.kp-mln-hit`). */
function SourceLink({ q }: { q: Q }) {
  return (
    <a href={q.sourceUrl} target="_blank" rel="noopener noreferrer" className="kp-mln-hit inline-flex items-center gap-1 whitespace-nowrap text-text-link hover:text-text-linkHover">
      <span>{sourceLabel(q.sourceDomain)}</span>
      <I.ext s={12} edge="end" text="body-400" className="shrink-0" />
    </a>
  );
}

/** How a result was attested (H4): /fairness's own glyphs — one officer the shield, two the pair — and the count in words. */
function Signoff({ t, s }: { t: Dict; s: "one" | "two" }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {s === "two" ? <I.users s={12} className="shrink-0" /> : <I.shieldcheck s={12} className="shrink-0" />}
      <span>{s === "two" ? t.millionea.signoffTwo : t.millionea.signoffOne}</span>
    </span>
  );
}

/** How a question counted, in a few muted words (M3): the stand-in's glyph and label (a screen reader hears the log's own
 *  sentence), "Not used", or a voided main still waiting — said after the stamp's "Void" without repeating it. */
function MarkWords({ t, mark }: { t: Dict; mark: Mark }) {
  if (mark.kind === "standIn" || mark.kind === "stoodIn") {
    return (
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap font-mono text-body-sm text-text-muted">
        <I.standIn s={12} className="shrink-0" aria-hidden />
        <span aria-hidden>{mark.kind === "standIn" ? mark.reserve : mark.main}</span>
        <span className="sr-only">{fill(t.millionea.logCarry, { n: mark.main, r: mark.reserve })}</span>
      </span>
    );
  }
  if (mark.kind === "notUsed") return <span className="text-body-sm text-text-muted">{t.millionea.notUsed}</span>;
  // The ticket's own words for a void still waiting — "Void · a reserve will take its place" — after the stamp that already
  // says "Void": the words that follow its first fact, opening with a capital (they often start their own line beside the
  // stamp — the tile read: "too few reserves: …" opened a line in lower case).
  const words = factsOf(mark.certain ? t.millionea.voidWeekCertain : t.millionea.voidAwaiting).slice(1).join(" ");
  return <span className="text-body-sm text-text-muted text-pretty">{words.charAt(0).toLocaleUpperCase() + words.slice(1)}</span>;
}

/** The outcome as the card states it: the stamp (or "Awaiting"), how it counted, and how and when it was attested; a void's
 *  reason on its own line. */
function OutcomeLines({ t, locale, q, att, mark, nowMs }: { t: Dict; locale: Locale; q: Q; att: MillioneaAttestation | undefined; mark: Mark | undefined; nowMs: number }) {
  const when = registerWhen(t, locale, att?.attestedAt ?? null, nowMs);
  return (
    <div className="flex flex-col gap-1 pt-0.5">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {q.outcome !== null ? <MaswaliOutcomeStamp t={t} outcome={q.outcome} label={false} /> : <span className="text-body-sm text-text-muted">{t.millionea.awaiting}</span>}
        {mark && <MarkWords t={t} mark={mark} />}
      </span>
      {att?.signoff && when !== null && (
        <span className="text-body-sm text-text-muted">
          <MaswaliFacts facts={[<Signoff key="s" t={t} s={att.signoff} />, <time key="w" className="whitespace-nowrap font-mono" dateTime={att.attestedAt ?? undefined}>{when}</time>]} />
        </span>
      )}
      {q.outcome === "VOID" && <span className="text-body-sm text-text-muted text-pretty">{reasonOf(t, q)}</span>}
    </div>
  );
}

/** The fifteen: cards below 1024 and a table from 1024 (R1), one source of facts for both. */
function Questions({ t, locale, v, nowMs }: { t: Dict; locale: Locale; v: View; nowMs: number }) {
  const qs = bySlot(v.questions);
  const mains = qs.filter((q) => q.role === "MAIN"), reserves = qs.filter((q) => q.role === "RESERVE");
  const heading = fill(t.millionea.regWeekQuestions, { week: weekNumberOf(v.code) });
  const event = (q: Q) => {
    const w = registerWhen(t, locale, q.eventStartsAt, nowMs);
    return w === null ? null : keepFact(locale, fill(t.millionea.eventAt, { when: w }), [w]);
  };
  const card = (q: Q) => (
    <li key={q.slot} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2 border-t border-border px-1 py-3" style={q.role === "RESERVE" ? RESERVE_WASH : undefined}>
      <Place q={q} />
      <div className="flex min-w-0 flex-col gap-1">
        <Category t={t} q={q} />
        <span className="text-body-sm text-text text-pretty">{textIn(locale, q.text)}</span>
        <span className="text-body-sm text-text-muted text-pretty">{textIn(locale, q.criterion)}</span>
        <span className="text-body-sm text-text-muted"><MaswaliFacts facts={[event(q), <SourceLink key="src" q={q} />]} /></span>
        <OutcomeLines t={t} locale={locale} q={q} att={v.attested[q.slot]} mark={v.marks.get(q.slot)} nowMs={nowMs} />
      </div>
    </li>
  );
  const row = (q: Q) => {
    const att = v.attested[q.slot];
    const when = registerWhen(t, locale, att?.attestedAt ?? null, nowMs);
    const mark = v.marks.get(q.slot);
    return (
      <tr key={q.slot} className="align-top" style={q.role === "RESERVE" ? RESERVE_WASH : undefined}>
        <th scope="row" className="text-left"><Place q={q} /></th>
        <td className="min-w-[240px]">
          {/* The question on the row's first line, every cell's first line on one baseline (M2): its criterion and its
              category under it. */}
          <span className="flex flex-col gap-1">
            <span className="text-text text-pretty">{textIn(locale, q.text)}</span>
            <span className="text-body-sm text-text-muted text-pretty">{textIn(locale, q.criterion)}</span>
            <Category t={t} q={q} />
          </span>
        </td>
        <td className="whitespace-nowrap"><SourceLink q={q} /></td>
        <td className="whitespace-nowrap font-mono text-text-muted">{registerWhen(t, locale, q.eventStartsAt, nowMs) ?? "—"}</td>
        <td className="text-text-muted">
          {att?.signoff && when !== null ? (
            <span className="flex flex-col gap-1">
              <time className="whitespace-nowrap font-mono" dateTime={att.attestedAt ?? undefined}>{when}</time>
              <span className="text-body-sm"><Signoff t={t} s={att.signoff} /></span>
            </span>
          ) : "—"}
        </td>
        <td className="min-w-[160px]">
          <span className="flex flex-col items-start gap-1">
            {q.outcome !== null ? <MaswaliOutcomeStamp t={t} outcome={q.outcome} label={false} /> : <span className="text-text-muted">{t.millionea.awaiting}</span>}
            {mark && <MarkWords t={t} mark={mark} />}
            {q.outcome === "VOID" && <span className="text-body-sm text-text-muted text-pretty">{reasonOf(t, q)}</span>}
          </span>
        </td>
      </tr>
    );
  };
  const band = "font-mono text-caption uppercase eyebrow text-text-subtle";
  const reservesHead = (
    <span className="inline-flex items-center gap-1.5"><I.reserve s={12} className="shrink-0" /><MaswaliFacts facts={factsOf(t.millionea.reservesHead)} /></span>
  );
  return (
    <section aria-labelledby="mln-reg-q" className="flex flex-col gap-2">
      <h2 id="mln-reg-q" className={H2}>{heading}</h2>
      <div className="flex flex-col lg:hidden" data-testid="millionea-register-cards">
        <ol className="flex flex-col">{mains.map(card)}</ol>
        {reserves.length > 0 && (
          <>
            <div className={`border-t border-border px-1 pb-1.5 pt-2 ${band}`} style={RESERVE_WASH}>{reservesHead}</div>
            <ol className="flex flex-col">{reserves.map(card)}</ol>
          </>
        )}
      </div>
      <ScrollX label={heading} className="glass-panel hidden lg:block">
        {/* ⚠️ TABLE LAW (`legal/rules/_shared.tsx`): `.admin-tbl` is the product's ONLY table skin — /fairness, /leaderboard,
            the rules pages and the account page wear it too — on its glass panel (L18), so the cells take its padding,
            header and dividers, and carry only their own ink, width and wrapping. */}
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
                <th scope="rowgroup" colSpan={6} className={`text-left ${band}`}>{reservesHead}</th>
              </tr>
              {reserves.map(row)}
            </tbody>
          )}
        </table>
      </ScrollX>
      {v.legal && <p className="text-body-sm text-text-subtle text-pretty">{v.legal === "two" ? t.millionea.regLegalTwo : t.millionea.regLegalOne}</p>}
    </section>
  );
}

/** The reserve rule (the slip's sentence, the order, and what voids a week whole: H1, L7) and the week's log. */
function ReserveMap({ t, locale, v }: { t: Dict; locale: Locale; v: View }) {
  return (
    <section aria-labelledby="mln-reg-map" className="flex flex-col gap-2">
      <h2 id="mln-reg-map" className={H2}>{t.millionea.regMap}</h2>
      {/* Its phrases kept whole: "A1–A5", "A1 hadi A5", "A1 至 A5" one run (A1). */}
      <p className="max-w-[68ch] text-body-sm text-text-muted text-pretty">{keepFact(locale, t.millionea.regSubRule)}</p>
      {v.log.length > 0 && (
        <ol className="flex max-w-receipt flex-col divide-y divide-border border-t border-border" aria-label={t.millionea.regLog}>
          {v.log.map((l, i) => (
            // What happened, then when — the ledger's own reading order (label left, figure right); an untimed entry is the
            // words alone, never a "—" standing in a time's place.
            <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-body-sm">
              <span className="text-text">{l.text}</span>
              {l.time !== null && <span className="whitespace-nowrap font-mono text-text-subtle">{l.time}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function MillioneaRegisterWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const gate = await millioneaGate();
  const { week: code } = await params;
  const { t, locale } = await getServerT();
  const rec = await millioneaRegisterRecord(code);
  if (!rec) notFound();
  const nowMs = Date.now();
  const v = rec.kind === "final" ? finalView(t, locale, rec, nowMs) : liveView(t, locale, rec.week, nowMs);
  const week = weekNumberOf(v.code);
  return (
    <PageContainer tier="reading" className="kp-mln-zh">
      <div className="flex flex-col gap-6" data-testid="millionea-register-week">
        <BackLink fallbackHref={MILLIONEA_HREF.register} label={t.millionea.registerTitle} />
        {/* M1 · the answer at the top: the week, its chip and its code, its facts, its times. */}
        <div className="flex flex-col gap-2">
          <PageHeader eyebrow={t.millionea.productTitle} title={weekWord(t, week)} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <WeekStateChip t={t} state={v.state} phase={v.phase} paused={v.paused} />
            <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{v.code}</span>
          </div>
          {v.facts.length > 0 && <p className="text-body text-text" data-testid="millionea-week-head-facts"><MaswaliFacts facts={v.facts} /></p>}
          {v.times.length > 0 && <p className="text-body-sm text-text-muted"><MaswaliFacts facts={v.times} /></p>}
        </div>
        {gate.preview && <MillioneaPreviewMark t={t} />}
        {/* The week's money: the ONE Millionea ledger once the week is final (H5), at the receipt's measure, no right lane
            (M4, M5); until then its place says when it comes — never a figure before it is final (H2). */}
        {/* Titled as every section of the page is — its heading over its card, as the commitments' (one rhythm). */}
        <section aria-labelledby="mln-reg-ledger" className="flex flex-col gap-2">
          <h2 id="mln-reg-ledger" className={H2}>{t.millionea.regLedger}</h2>
          <div className="mat-flat flex max-w-receipt flex-col rounded-card p-3">
            {rec.kind === "final"
              ? <MaswaliLedger rows={registerLedgerRows(t, locale, rec.week)} />
              : <p className="text-body-sm text-text-muted">{t.millionea.regLedgerLater}</p>}
          </div>
        </section>
        <WeekCommitments t={t} locale={locale} nowMs={nowMs} hash={v.hash} publishedAt={v.publishedAt} root={v.root} closedAt={v.closedAt} tickets={v.tickets} />
        <Questions t={t} locale={locale} v={v} nowMs={nowMs} />
        <ReserveMap t={t} locale={locale} v={v} />
        {rec.kind === "final" && rec.week.standing && rec.week.standing.length > 0 && (
          <section aria-labelledby="mln-reg-standing" className="flex flex-col gap-2">
            <h2 id="mln-reg-standing" className={H2}>{t.millionea.regStanding}</h2>
            <ol className="flex max-w-receipt flex-col divide-y divide-border border-t border-border">
              {rec.week.standing.map((s) => (
                // The result's place, its attested time and the count, each in its own column — never "1 · 2 Dec, 00:00" in
                // one string (A1) — the count grouped as every count is.
                <li key={s.slot} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-baseline gap-x-3 py-1.5 text-body-sm">
                  <span className="font-mono font-bold tabular-nums text-text-muted">{s.slot <= MAIN_COUNT ? s.slot : reserveLabel(s.slot - MAIN_COUNT)}</span>
                  <span className="whitespace-nowrap font-mono text-text-subtle">{registerWhen(t, locale, s.sealedAt, nowMs) ?? "—"}</span>
                  <span className="font-mono tabular-nums text-text">{formatNumber(s.ticketsWithoutAMiss)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
        <MillioneaReadingLinks t={t} hub />
      </div>
    </PageContainer>
  );
}
