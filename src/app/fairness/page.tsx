/**
 * Public resolution-attestation page · /fairness
 *
 * Lists every recently-resolved market with its source URL, the officer(s) who
 * signed off (one by default; two when two-admin authorization is enabled), and
 * the audit-chain entry. Anyone (regulator, lab, player) can verify each
 * resolution against its public source.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { listTerminalMarkets } from "@/lib/server/market-service";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { Suspense } from "react";
import { FilterPill } from "@/components/ui/filter-pill";
import { SearchBox } from "@/components/ui/search-box";
import { parseQuery, matchesQuery, fieldNames, MARKET_SEARCH } from "@/lib/search";
import { FairnessBar, type AttestationCounts } from "./fairness-bar";
import {
  attestationCounts,
  attestationEmptyCause,
  attestationExits,
  buildAttestationHref,
  filterAttestations,
  parseAttestationParams,
  sortAttestations,
  type AttestationRow,
} from "@/lib/fairness/attestations";
import { formatDateTimeSafe, fill } from "@/lib/utils";
import { getGlobalConfig } from "@/lib/server/market-config";
import { durationHours } from "@/lib/duration-phrase";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerT } from "@/lib/i18n-server";
import { outcomeWord } from "@/lib/side-label";
import { pickLocalized } from "@/lib/localized";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.resolutionAttestation };
}
export const dynamic = "force-dynamic";

// C1d provably-fair chain — a horizontal 5-node process diagram in the glyph
// idiom. Gilt lands only on the attestation seal (the sanctioned earned/verified
// exception); the other nodes are royal. Static (no motion → reduced-motion safe).
// Wrapped in overflow-x-auto so the long trilingual labels scroll within the
// panel on narrow screens instead of forcing page h-overflow.
function FairnessChain({ steps }: { steps: { glyph: keyof typeof I; label: string; gilt?: boolean }[] }) {
  return (
    <div
      className="overflow-x-auto -mx-1 px-1 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--brand-400)]"
      tabIndex={0}
      role="region"
      aria-label="Provably-fair steps"
    >
      <ol className="flex items-start min-w-[540px]">
        {steps.map((s, i) => {
          const Glyph = I[s.glyph];
          const circleCls = s.gilt
            ? "border-2 border-gold-500 bg-gold-500/10 text-gold-300"
            : "border border-brand-600 bg-brand-500/10 text-brand-300";
          return (
            <li key={i} className="contents">
              <div className="flex w-[104px] shrink-0 flex-col items-center text-center">
                {/* ⚠️ LITERALS, not `h-11 w-11` — spacing is overridden (tailwind.config.ts:200-215),
                    so `h-11` was 96px inside this w-[104px] column: 4px of gutter each side. */}
                <span className={`inline-flex h-[44px] w-[44px] items-center justify-center rounded-full ${circleCls}`}>
                  <Glyph s={19} />
                </span>
                <span className={`mt-2 font-mono text-micro font-semibold uppercase leading-tight eyebrow ${s.gilt ? "text-gold-300" : "text-text-muted"}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div aria-hidden className="mt-[21px] h-[2px] flex-1 min-w-[16px] rounded-full bg-border" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const fmtTime = (iso: string | null) => formatDateTimeSafe(iso);

export default async function FairnessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getServerT();
  // B-1 — no swallow: the attestation list IS this page; a failed read must
  // throw to fairness/error.tsx, never render "no resolved markets yet".
  // ⛔ THE LIVE WINDOW, READ ONCE. This page is the regulator's own reading surface, so the
  // number it states must be the number in force — not a literal that agrees with the code
  // default and disagrees with the persisted production snapshot.
  const { objectionWindowHours } = await getGlobalConfig();
  /**
   * 🔴 IT READ `listMarkets({ status: "RESOLVED" })` — AN EXACT EQUALITY, NOT AN `IN`. So the page
   * whose entire purpose is proving how a market settled could not show a market that settled by
   * being VOIDED, nor the stakes refunded with it. `listTerminalMarkets()` returns
   * `RESOLVED ∪ VOIDED` in one call.
   *
   * ⭐ AND IT IS STRICTLY CHEAPER DESPITE SEEING TWICE AS MUCH: the old call was uncached on a
   * `force-dynamic`, signed-out page anyone can curl in a loop; this one is memoised for five
   * minutes and already had exactly one caller (`/results`). The page that needed it most was not
   * using it.
   *
   * ⛔ CALLED WITH NO ARGUMENT, AND THAT IS LOAD-BEARING. `scripts/product-line.test.mts`'
   * MUST_STAY_DEFAULT names this file, and its matcher covers the terminal read too — so passing
   * the both-products argument here goes red, correctly: measured on production 2026-08-19, the
   * archive was UPDOWN 11,112 against MARKET 65, i.e. 99.4% price rounds, and an attestation table
   * sorted newest-first over both lines would bury every long-form settlement a regulator opens
   * this page to read. ⚠️ That is a RULING, not an oversight — do not "fix" the absence of Up & Down
   * here. ⛔ And do not write the opted-in call form in a comment either: that matcher reads source
   * WITHOUT stripping comments, so prose about the forbidden call is indistinguishable from the
   * call. This paragraph found that out.
   */
  const terminal = await listTerminalMarkets();
  const sp = await searchParams;
  const state = parseAttestationParams(sp);
  const nowMs = Date.now();

  const rows: AttestationRow[] = terminal.map((m) => ({
    id: m.id,
    category: m.category,
    // ⛔ The one normalisation, lifted verbatim from `results/page.tsx`: a VOIDED row whose
    //    verdict column was never stamped still resolved one way, and that way is void.
    outcome: m.resolvedOutcome ?? (m.status === "VOIDED" ? "VOID" : null),
    // ⛔ THE CLOCK THE TABLE PRINTS — see the contract's note on `ATTESTATION_NATURAL_DIR`.
    resolvedAtMs: Date.parse(m.resolutionStage2At ?? "") || 0,
    twoOfficer: !!(m.resolutionStage1By && m.resolutionStage2By && m.resolutionStage1By !== m.resolutionStage2By),
    titleEn: m.titleEn,
    titleSw: m.titleSw ?? "",
    titleZh: m.titleZh ?? "",
    criterion: m.resolutionCriterion ?? "",
    status: m.status,
    sourceUrl: m.sourceUrl,
  }));

  const parsed = parseQuery(state.q, { fields: fieldNames(MARKET_SEARCH) });
  const matchesRow = (row: AttestationRow) =>
    matchesQuery(parsed, row as unknown as Record<string, string | null | undefined>, MARKET_SEARCH);

  const titleOf = (r: AttestationRow) => pickLocalized(locale, r.titleEn, r.titleSw, r.titleZh);
  const collate = new Intl.Collator(locale).compare;

  const counts = attestationCounts(rows, state, nowMs, matchesRow) as AttestationCounts;
  const matched = sortAttestations(
    filterAttestations(rows, state, nowMs, matchesRow), state, titleOf, collate,
  );

  // ⛔ ONE `totalCount`, shared by the bar, the sheet's apply button and the pager.
  const totalCount = matched.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PLAYER_PER_PAGE));
  const safePage = Math.min(Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1), totalPages);
  const resolved = matched.slice((safePage - 1) * PLAYER_PER_PAGE, safePage * PLAYER_PER_PAGE);
  // ⛔ THE PAGER CARRIED A BARE PATH — `baseHref="/fairness"` — so every page turn would have
  //    dropped the lens, the window, the sort and the search on the floor.
  const baseHref = buildAttestationHref(state);

  const cause = attestationEmptyCause(state, nowMs, matchesRow, totalCount, rows.length);
  const exits = cause && cause !== "no-rows" ? attestationExits(rows, state, nowMs, matchesRow) : [];
  const EXIT_LABEL: Record<string, string> = {
    when: t.common.rangeAll,
    q: t.common.clearSearch,
    out: t.common.all,
  };

  return (
    <div className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 lg:py-8 space-y-6">
      <header className="space-y-3">
        <PageHero glow="info">
          <PageHeader eyebrow={t.common.resolutionAttestation} title={t.common.howAMarketResolves} tone="info" icon={<I.shieldcheck s={18} />} />
        </PageHero>
        <p className="text-[15px] leading-relaxed text-text-muted max-w-[68ch]">
          {fill(t.common.fairnessIntro, { hours: durationHours(locale, objectionWindowHours) })}
        </p>
      </header>

      {/* How it works */}
      <section className="glass-panel p-5 space-y-4">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="font-display text-[20px] font-semibold text-text">{t.common.fairnessHowItWorks}</h2>
          <span className="font-mono text-caption eyebrow uppercase text-text-subtle">FATF R.10 · POCA Cap 423 §16</span>
        </div>
        {/* C1d — 5-step provably-fair chain (glyph idiom, gilt only on the
            two-officer attestation seal). Labels live in HTML, not the SVG.
            Aligned to this page's existing compliance-reviewed 5-step model
            (rather than rewriting the regulatory copy to the spec's literal
            step names) so the chain and the detail list below stay one story. */}
        <FairnessChain
          steps={[
            { glyph: "flag",        label: t.common.fairnessCreated },
            { glyph: "coins",       label: t.common.fairnessStake },
            { glyph: "user",        label: t.common.fairnessStage1 },
            { glyph: "shieldcheck", label: t.common.fairnessStage2, gilt: true },
            { glyph: "wallet",      label: t.common.fairnessSettlement },
          ]}
        />
        <ol className="space-y-3 text-[14px] text-text-muted list-decimal pl-5 marker:text-gold-300 marker:font-bold">
          <li>
            <strong className="text-text">{t.common.fairnessCreated}</strong> — {t.common.fairnessCreatedBody}
          </li>
          <li>
            <strong className="text-text">{t.common.fairnessStake}</strong> — {t.common.fairnessStakeBody}
          </li>
          <li>
            <strong className="text-text">{t.common.fairnessStage1}</strong> — {t.common.fairnessStage1Body}
          </li>
          <li>
            <strong className="text-text">{t.common.fairnessStage2}</strong> — {fill(t.common.fairnessStage2Body, { hours: durationHours(locale, objectionWindowHours) })}
          </li>
          <li>
            <strong className="text-text">{t.common.fairnessSettlement}</strong> — {t.common.fairnessSettlementBody}
          </li>
        </ol>
      </section>

      {/* Resolved markets table */}
      <section>
        <h2 className="font-display text-[20px] font-semibold text-text mb-3">{t.common.recentlyResolved}</h2>

        {/* ⛔ THE CONTROLS ARE WITHHELD ONLY WHEN THE RECORD IS GENUINELY EMPTY. Every other empty
            state keeps the bar, because there the bar is the way OUT of the empty state. */}
        {rows.length > 0 && (
          <>
            <div className="pb-2">
              <Suspense>
                <SearchBox
                  placeholder={t.common.searchMarkets}
                  ariaLabel={t.common.searchMarkets}
                  helpFields={fieldNames(MARKET_SEARCH)}
                />
              </Suspense>
            </div>
            <FairnessBar state={state} counts={counts} resultCount={totalCount} t={t} />
          </>
        )}

        {totalCount === 0 && exits.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 py-2">
            {exits.map((e) => (
              <FilterPill
                key={e.id}
                href={buildAttestationHref(state, e.patch)}
                label={EXIT_LABEL[e.id] ?? e.id}
                count={e.count}
                on={false}
                semantics="toggle"
                rank="secondary"
                replace
                scroll={false}
                testId={`exit:${e.id}`}
              />
            ))}
          </div>
        )}

        {resolved.length === 0 ? (
          /**
           * ⭐ FOUR CAUSES WHERE THERE WAS ONE. "No resolved markets yet" was correct for an empty
           * platform and a lie for every other case — a reader who pressed `Refunded` on a book
           * with no voided settlements was told the platform had settled nothing at all, on the
           * page that exists to prove it has.
           * ⚠️ `lens-empty` on `void` is the HEALTHY one and reads as a fact rather than a failure:
           * no settlement has been voided is good news on an attestation record.
           */
          <EmptyState
            kind="audit"
            title={
              cause === "no-rows" ? t.common.noResolvedMarketsYet
              : cause === "search-miss" ? `${t.results.noResultsMatch} "${state.q}"`
              : cause === "lens-empty" ? t.common.noVoidedSettlements
              : t.market.filterMissTitle
            }
            body={
              cause === "no-rows" ? t.common.attestationPublishHint
              : cause === "search-miss" ? t.results.tryDifferentKeywords
              : cause === "lens-empty" ? t.common.noVoidedSettlementsBody
              : t.market.filterMissBody
            }
            action={
              <Link href={"/markets" as never} className="btn btn-primary btn-sm">
                {t.positions.browseMarkets}
              </Link>
            }
          />
        ) : (
          <ScrollX label="Resolved markets" className="glass-panel">
            <table className="admin-tbl">
              <thead className="border-b border-border bg-bg-overlay">
                <tr className="font-mono text-micro uppercase eyebrow text-text-subtle">
                  <th className="text-left p-3">{t.common.thMarket}</th>
                  <th className="text-left p-3">{t.common.thOutcome}</th>
                  <th className="text-left p-3">{t.common.thOfficers}</th>
                  <th className="text-left p-3">{t.common.thResolved}</th>
                  <th className="text-left p-3">{t.common.thSource}</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((m) => (
                  /* ⛔ `data-row-id` — the instrumentation contract's third attribute. Without it
                     `qa:count-truth` cannot prove disjointness or no-double-counting over SETS,
                     which is the only way those properties are checkable in three languages. */
                  <tr key={m.id} data-row-id={m.id} className="border-b border-border last:border-b-0 align-top">
                    <td className="p-3 max-w-[420px]">
                      <Link href={`/markets/${m.id}` as never} className="font-display font-semibold text-text hover:text-brand-300 line-clamp-2">{titleOf(m)}</Link>
                    </td>
                    <td className="p-3">
                      {/* §L3 — this printed the stored token, and its null arm printed the
                          LITERAL string "VOID". The fairness page is the one surface whose
                          whole purpose is a player checking a settlement, so an untranslated
                          verdict here is the worst place for one. */}
                      <Chip variant={m.outcome === "YES" ? "yes" : m.outcome === "NO" ? "no" : "neutral"} size="md">
                        {/* ⛔ The cast is at the RENDER, never in the lens. `resolvedOutcome` is a
                            raw `String?` column, so a token nobody enumerated reaches here — and
                            `outcomeWord`'s own fallback is what handles it. The FILTER above never
                            casts: it asks "is it YES", "is it NO", "neither", which is total. */}
                        {outcomeWord(t, (m.outcome ?? "VOID") as Parameters<typeof outcomeWord>[1], "MARKET")}
                      </Chip>
                    </td>
                    {/**
                      * \ud83d\udd34 THIS CELL PUBLISHED TWELVE CHARACTERS OF AN INTERNAL OFFICER USER-ID, ON AN
                      * UNAUTHENTICATED PAGE \u2014 and its own sibling feed refuses to. `/api/fairness/recent`
                      * serves the same attestation and says why in writing: *"Public attestation proves
                      * TWO DISTINCT officers settled it \u2014 without leaking internal officer user-ids (or
                      * staff names) on an unauthenticated endpoint. Accountability by identity lives in
                      * the private audit chain."* It publishes a `twoOfficer` boolean. The page beside it
                      * published the ids. The ruling existed; the page had not been brought under it.
                      *
                      * \u26d4 AND IT RENDERED THE LITERAL CHARACTERS `\u2026`, THREE TIMES. Written as a JSX
                      * TEXT CHILD \u2014 outside the braces \u2014 `\u2026` is not an escape, it is six characters,
                      * so every row read `a1b2c3d4e5f6\u2026`. Same trap one line down, where `"\u2014"`
                      * INSIDE the braces was a real escape and the `\u2026` after it was not. \u26a0\ufe0f tsc
                      * cannot see this and no gate did: it is well-typed, valid JSX that says the wrong
                      * thing. The seal glyph and a word carry the meaning now, with no escape to get
                      * wrong.
                      *
                      * \u2b50 WHAT IS LOST IS NOTHING A READER COULD USE. A truncated opaque id verified
                      * nothing \u2014 it could not be looked up, compared or challenged. What the record must
                      * prove is that two DISTINCT officers signed, and that is exactly what is shown.
                      */}
                    <td className="p-3 text-[11px] text-text-muted">
                      <div className="flex items-center gap-1">
                        {m.twoOfficer ? <I.users s={11} /> : <I.shieldcheck s={11} />}
                        <span>{m.twoOfficer ? t.common.twoOfficerSealed : t.common.oneOfficerSealed}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-text-muted whitespace-nowrap">{fmtTime(m.resolvedAtMs ? new Date(m.resolvedAtMs).toISOString() : null)}</td>
                    <td className="p-3">
                      <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-brand-300 hover:text-brand-200 underline">
                        {t.common.thSource}
                        <I.ext s={11} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
        )}
        {totalPages > 1 && (
          <div className="mt-4 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
            {/* ⛔ `totalCount`, THE SAME VARIABLE THE BAR PUBLISHES — never recomputed, or the
                pager counts a different population from the number above it. And `baseHref` now
                carries the state: it was the bare string "/fairness", so a page turn dropped the
                lens, the window, the sort and the search. */}
            <Pagination total={totalCount} page={safePage} perPage={PLAYER_PER_PAGE} baseHref={baseHref} ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} firstLabel={t.common.firstPage} lastLabel={t.common.lastPage} />
          </div>
        )}
      </section>
    </div>
  );
}
