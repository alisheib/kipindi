/**
 * Public resolution-attestation page · /fairness
 *
 * Lists every recently-resolved market with its source URL, the two officers
 * who signed off, and the audit-chain entry. Anyone (regulator, lab, player)
 * can verify each resolution against its public source.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { listMarkets } from "@/lib/server/market-service";
import { formatDateTimeSafe } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.resolutionAttestation };
}
export const dynamic = "force-dynamic";

const fmtTime = (iso: string | null) => formatDateTimeSafe(iso);

export default async function FairnessPage() {
  const { t, locale } = await getServerT();
  const resolved = (await listMarkets({ status: "RESOLVED" })).slice(0, 30);

  return (
    <div className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 lg:py-8 space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.common.resolutionAttestation}</p>
        <h1 className="font-display text-[34px] font-bold text-text">{t.common.howAMarketResolves}</h1>
        <p className="text-[15px] leading-relaxed text-text-muted max-w-[68ch] mt-3">
          {t.common.fairnessIntro}
        </p>
      </header>

      {/* How it works */}
      <section className="rounded-lg glass-panel p-5 space-y-4">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="font-display text-[20px] font-semibold text-text">{t.common.fairnessHowItWorks}</h2>
          <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-text-subtle">FATF R.10 · POCA Cap 423 §16</span>
        </div>
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
          />
        ) : (
          <div className="overflow-x-auto rounded-lg glass-panel">
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
                      <Link href={`/markets/${m.id}` as never} className="font-display font-semibold text-text hover:text-teal-300 line-clamp-2">{pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}</Link>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-pill border px-2.5 py-0.5 text-[12px] font-bold ${
                        m.resolvedOutcome === "YES" ? "border-yes-700 bg-yes-500/15 text-yes-300"
                        : m.resolvedOutcome === "NO" ? "border-no-700 bg-no-500/15 text-no-300"
                        : "border-border bg-bg-overlay text-text-muted"
                      }`}>
                        {m.resolvedOutcome ?? "VOID"}
                      </span>
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
                      <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-teal-300 hover:text-teal-200 underline">
                        {t.common.thSource}
                        <I.ext s={11} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
