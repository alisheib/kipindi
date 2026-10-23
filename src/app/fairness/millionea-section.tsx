/**
 * /fairness — MASWALI MILLIONEA'S COMMITMENTS, AND HOW TO CHECK YOUR TICKET (MASWALI-BUILD S6 item 1; MASWALI-PLAN §3 MR-9
 * and MR-13, §8 MB-32 and MB-33).
 *
 * The section a reader the rollout admits finds under the resolution record: each public week's commitments — the
 * question set's fingerprint and when it was published (the open), the tickets' root, their count and the close — and the
 * four steps of "verify my ticket". ⭐ A SUMMARY THAT LINKS, NEVER A SECOND REGISTER: a final week's whole record (its
 * questions, seals, voids, reserves and ledger) is one link away on S5's register; what only this page publishes is the
 * commitment before the results.
 * ⛔ THE ROLLOUT DECIDES FIRST: `resolveMillionea()` — the gate's own per-request answer — and below it this component
 *    renders nothing and reads nothing, so `/fairness` for every Yes/No and Up & Down reader is today's page.
 * ⛔ NOT THE PAGE'S B-1 RULE, AND ON PURPOSE: the attestation table is this page and a failed read of it throws; a failed
 *    read of Millionea's record must not take the Yes/No record down with it, so it says, in words, that it could not be
 *    read — never "no week yet", which would be a false fact.
 * ⛔ An unearned surface: no gold (DESIGN_AUTHORITY Q5). A hash is data: mono, whole, wrapping anywhere.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { millioneaWord } from "@/components/maswali/maswali-format";
import { resolveMillionea } from "@/lib/server/millionea-preview";
import { millioneaFairnessView, type MillioneaCommitmentRow, type MillioneaFairnessView } from "@/lib/server/maswali-fairness";
import { formatEatDateTime } from "@/lib/eat-day";
import { WEEK_STATE_KEY } from "@/lib/maswali-week-label";
import { fill, formatNumber } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";

/** The register's addresses, spelt as path literals (the S5 pages' `MILLIONEA_HREF` rule: a door is named where it is drawn). */
const REGISTER_HREF = "/millionea/register";
const TICKETS_HREF = "/millionea/tickets";
const registerWeekHref = (code: string) => `/millionea/register/${encodeURIComponent(code)}`;

const LABEL = "font-mono text-micro uppercase eyebrow text-text-subtle";
const HASH = "font-mono text-body-sm text-text break-all";
const LINK = "inline-flex items-center gap-1 self-start text-body-sm text-text-link hover:text-text-linkHover";
/** The section's subheads: a rung of the type ladder (a new file writes no hand-typed size, `test:type-scale` §4). */
const H3 = "font-display text-body-lg font-semibold text-text";

function at(t: Dict, locale: Locale, iso: string | null, nowMs: number): string {
  const ms = iso ? Date.parse(iso) : Number.NaN;
  return formatEatDateTime(ms, nowMs, t.common.monthsShort, locale);
}

/** One week's commitments: its code and state, the question set's fingerprint, then the root — or when it will come. */
function WeekCommitment({ t, locale, w, nowMs }: { t: Dict; locale: Locale; w: MillioneaCommitmentRow; nowMs: number }) {
  const f = t.millioneaFairness;
  return (
    <li className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0">
      <span className={LABEL}>{`${w.code} · ${millioneaWord(t, WEEK_STATE_KEY[w.state])}`}</span>
      <div className="flex flex-col gap-0.5">
        <span className={LABEL}>{`${t.millionea.stubHash} · ${fill(t.millionea.commitPublished, { when: at(t, locale, w.hashPublishedAt, nowMs) })}`}</span>
        <span className={HASH}>{w.questionSetHash ?? "—"}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {w.ticketMerkleRoot !== null ? (
          <>
            <span className={LABEL}>{`${f.root} · ${fill(f.rootMeta, { n: formatNumber(w.ticketCount ?? 0), when: at(t, locale, w.closedAt, nowMs) })}`}</span>
            <span className={HASH}>{w.ticketMerkleRoot}</span>
          </>
        ) : (
          <>
            <span className={LABEL}>{f.root}</span>
            <span className="text-body-sm text-text-muted">{fill(f.rootPending, { when: at(t, locale, w.closesAt, nowMs) })}</span>
          </>
        )}
      </div>
      {w.onRegister && (
        <Link href={registerWeekHref(w.code) as never} className={LINK} style={{ minHeight: "var(--h-control-md)" }}>
          {f.toRegisterWeek}
          <I.chevronRight s={14} edge="end" text="body-400" />
        </Link>
      )}
    </li>
  );
}

function WeekGroup({ t, locale, title, rows, nowMs }: { t: Dict; locale: Locale; title: string; rows: MillioneaCommitmentRow[]; nowMs: number }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className={H3}>{title}</h3>
      <ul role="list" className="flex flex-col">
        {rows.map((w) => <WeekCommitment key={w.code} t={t} locale={locale} w={w} nowMs={nowMs} />)}
      </ul>
    </div>
  );
}

/** ⭐ THE SECTION — or nothing at all for a reader the rollout does not admit. */
export async function MillioneaFairness({ t, locale }: { t: Dict; locale: Locale }) {
  const r = await resolveMillionea();
  if (!r.visible) return null;
  let view: MillioneaFairnessView | null = null;
  try {
    view = await millioneaFairnessView(r);
  } catch {
    view = null;
  }
  const f = t.millioneaFairness;
  const nowMs = Date.now();
  const empty = view !== null && view.current.length === 0 && view.recent.length === 0;
  const steps = [f.verifyOne, f.verifyTwo, f.verifyThree, f.verifyFour];

  return (
    <section id="millionea" aria-labelledby="mln-fair-title" className="glass-panel p-5 lg:p-6 flex flex-col gap-4" data-testid="millionea-fairness">
      <div className="flex items-center gap-2">
        <span className="text-text-subtle"><I.commitment s={18} /></span>
        <h2 id="mln-fair-title" className="font-display text-title-sm font-semibold text-text text-balance">{f.sectionTitle}</h2>
      </div>
      <p className="text-body leading-relaxed text-text-muted max-w-[68ch] text-pretty">{f.sectionIntro}</p>

      {view === null ? (
        <p role="status" className="text-body-sm text-text-muted">{f.readFailed}</p>
      ) : empty ? (
        <p className="text-body-sm text-text-muted">{f.noWeek}</p>
      ) : (
        <>
          {view.current.length > 0 && <WeekGroup t={t} locale={locale} title={f.weeksNow} rows={view.current} nowMs={nowMs} />}
          {view.recent.length > 0 && <WeekGroup t={t} locale={locale} title={f.weeksRecent} rows={view.recent} nowMs={nowMs} />}
        </>
      )}
      <Link href={REGISTER_HREF as never} className={LINK} style={{ minHeight: "var(--h-control-md)" }}>
        <I.register s={16} edge="start" />
        {f.toRegister}
        <I.chevronRight s={14} edge="end" text="body-400" />
      </Link>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <h3 className={H3}>{f.verifyTitle}</h3>
        <ol role="list" className="fairness-steps space-y-3 text-body text-text-muted">
          {steps.map((s) => <li key={s} className="text-pretty">{s}</li>)}
        </ol>
        <Link href={TICKETS_HREF as never} className={LINK} style={{ minHeight: "var(--h-control-md)" }}>
          <I.ticket s={16} edge="start" />
          {f.verifyLink}
          <I.chevronRight s={14} edge="end" text="body-400" />
        </Link>
      </div>
    </section>
  );
}
