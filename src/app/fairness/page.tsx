/**
 * Public resolution-attestation page · /fairness
 *
 * Lists every recently-resolved market with its source URL, the two officers
 * who signed off, and the audit-chain entry. Anyone (regulator, lab, player)
 * can verify each resolution against its public source.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { listMarkets } from "@/lib/server/market-service";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { formatDateTimeSafe } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerT } from "@/lib/i18n-server";
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
            : "border border-brand-700 bg-brand-500/10 text-brand-300";
          return (
            <li key={i} className="contents">
              <div className="flex w-[104px] shrink-0 flex-col items-center text-center">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${circleCls}`}>
                  <Glyph s={19} />
                </span>
                <span className={`mt-2 font-mono text-[10px] font-semibold uppercase leading-tight tracking-[0.06em] ${s.gilt ? "text-gold-300" : "text-text-muted"}`}>
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

export default async function FairnessPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { t, locale } = await getServerT();
  const allResolved = await listMarkets({ status: "RESOLVED" }).catch(() => []);
  const sp = await searchParams;
  const totalPages = Math.max(1, Math.ceil(allResolved.length / PLAYER_PER_PAGE));
  const safePage = Math.min(Math.max(1, parseInt(sp.page ?? "1", 10) || 1), totalPages);
  const resolved = allResolved.slice((safePage - 1) * PLAYER_PER_PAGE, safePage * PLAYER_PER_PAGE);

  return (
    <div className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 lg:py-8 space-y-6">
      <header className="space-y-3">
        <PageHero glow="info">
          <PageHeader eyebrow={t.common.resolutionAttestation} title={t.common.howAMarketResolves} tone="info" icon={<I.shieldcheck s={18} />} />
        </PageHero>
        <p className="text-[15px] leading-relaxed text-text-muted max-w-[68ch]">
          {t.common.fairnessIntro}
        </p>
      </header>

      {/* How it works */}
      <section className="glass-panel p-5 space-y-4">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="font-display text-[20px] font-semibold text-text">{t.common.fairnessHowItWorks}</h2>
          <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-text-subtle">FATF R.10 · POCA Cap 423 §16</span>
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
            <strong className="text-text">{t.common.fairnessStage2}</strong> — {t.common.fairnessStage2Body}
          </li>
          <li>
            <strong className="text-text">{t.common.fairnessSettlement}</strong> — {t.common.fairnessSettlementBody}
          </li>
        </ol>
      </section>

      {/* Resolved markets table */}
      <section>
        <h2 className="font-display text-[20px] font-semibold text-text mb-3">{t.common.recentlyResolved}</h2>
        {resolved.length === 0 ? (
          <EmptyState
            kind="audit"
            title={t.common.noResolvedMarketsYet}
            body={t.common.attestationPublishHint}
            action={
              <Link href={"/markets" as never} className="btn btn-primary btn-sm">
                {t.positions.browseMarkets}
              </Link>
            }
          />
        ) : (
          <ScrollX label="Resolved markets" className="rounded-lg glass-panel">
            <table className="admin-tbl">
              <thead className="border-b border-border bg-bg-overlay">
                <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                  <th className="text-left p-3">{t.common.thMarket}</th>
                  <th className="text-left p-3">{t.common.thOutcome}</th>
                  <th className="text-left p-3">{t.common.thOfficers}</th>
                  <th className="text-left p-3">{t.common.thResolved}</th>
                  <th className="text-left p-3">{t.common.thSource}</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-b-0 align-top">
                    <td className="p-3 max-w-[420px]">
                      <Link href={`/markets/${m.id}` as never} className="font-display font-semibold text-text hover:text-brand-300 line-clamp-2">{pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}</Link>
                    </td>
                    <td className="p-3">
                      <Chip variant={m.resolvedOutcome === "YES" ? "yes" : m.resolvedOutcome === "NO" ? "no" : "neutral"} size="md">
                        {m.resolvedOutcome ?? "VOID"}
                      </Chip>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-text-muted">
                      <div className="flex items-center gap-1">
                        <I.users s={11} />
                        <span>{m.resolutionStage1By?.slice(0, 12) ?? "\u2014"}\u2026</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <I.shieldcheck s={11} />
                        <span>{m.resolutionStage2By?.slice(0, 12) ?? "\u2014"}\u2026</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-text-muted whitespace-nowrap">{fmtTime(m.resolutionStage2At)}</td>
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
            <Pagination total={allResolved.length} page={safePage} perPage={PLAYER_PER_PAGE} baseHref="/fairness" ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} />
          </div>
        )}
      </section>
    </div>
  );
}
