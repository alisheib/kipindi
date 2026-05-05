/**
 * Public resolution-attestation page · /fairness
 *
 * Lists every recently-resolved market with its source URL, the two officers
 * who signed off, and the audit-chain entry. Anyone (regulator, lab, player)
 * can verify each resolution against its public source.
 */
import Link from "next/link";
import { ExternalLink, ShieldCheck, Users } from "lucide-react";
import { listMarkets, seedDemoMarkets } from "@/lib/server/market-service";

export const metadata = { title: "Resolution attestation · Uthibitisho" };
export const dynamic = "force-dynamic";

const fmtTime = (iso: string | null) => iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function FairnessPage() {
  seedDemoMarkets();
  const resolved = listMarkets({ status: "RESOLVED" }).slice(0, 30);

  return (
    <div className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 lg:py-8 space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Resolution attestation · Uthibitisho</p>
        <h1 className="font-display text-[34px] font-bold text-text">How a market resolves</h1>
        <p className="text-[15px] italic text-text-subtle">Soko linatatuliwa vipi</p>
        <p className="text-[15px] leading-relaxed text-text-muted max-w-[68ch] mt-3">
          Every market on 50pick is resolved by two compliance officers against a public source URL.
          The audit chain captures both signatures, the source, and the recorded outcome. A 24-hour
          public objection window opens after the second signature. If you spot something wrong, flag
          the market — the audit trail catches every flag.
        </p>
      </header>

      {/* How it works */}
      <section className="rounded-lg border border-border bg-bg-elevated p-5 space-y-4">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="font-display text-[20px] font-semibold text-text">How it works</h2>
          <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-text-subtle">FATF R.10 · POCA Cap 423 §16</span>
        </div>
        <ol className="space-y-3 text-[14px] text-text-muted list-decimal pl-5 marker:text-gold-300 marker:font-bold">
          <li>
            <strong className="text-text">Created</strong> — A compliance officer publishes the question, the source URL, the
            written resolution criterion, and the resolution timestamp. The market opens.
          </li>
          <li>
            <strong className="text-text">Stake</strong> — Players buy YES or NO at the current pool-implied probability.
            The pool grows; the probability moves.
          </li>
          <li>
            <strong className="text-text">Stage 1 sign-off</strong> — At <code className="font-mono text-gold-300">resolutionAt</code> a compliance
            officer reviews the source and posts the outcome. Audit logs the signature.
          </li>
          <li>
            <strong className="text-text">Stage 2 sign-off</strong> — A <em>different</em> officer confirms. Audit logs the
            second signature. The 24-hour objection window opens.
          </li>
          <li>
            <strong className="text-text">Settlement</strong> — Winners share the losing pool minus the 9% operator margin.
            Payouts hit wallets the moment the second signature lands.
          </li>
        </ol>
      </section>

      {/* Resolved markets table */}
      <section>
        <h2 className="font-display text-[20px] font-semibold text-text mb-3">Recently resolved</h2>
        {resolved.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-elevated/40 p-10 text-center">
            <p className="text-[14px] text-text-muted">No resolved markets yet — attestations publish here automatically.</p>
            <p className="mt-1 text-[13px] italic text-text-subtle">Bado hakuna soko lililotatuliwa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-bg-elevated">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-bg-overlay">
                <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                  <th className="text-left p-3">Market</th>
                  <th className="text-left p-3">Outcome</th>
                  <th className="text-left p-3">Officers</th>
                  <th className="text-left p-3">Resolved</th>
                  <th className="text-left p-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-b-0 align-top">
                    <td className="p-3 max-w-[420px]">
                      <Link href={`/markets/${m.id}` as never} className="font-display font-semibold text-text hover:text-teal-300 line-clamp-2">{m.titleEn}</Link>
                      {m.titleSw && <p className="mt-0.5 text-[12px] italic text-text-subtle line-clamp-1">{m.titleSw}</p>}
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
                        <Users size={11} />
                        <span>{m.resolutionStage1By?.slice(0, 12) ?? "—"}…</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <ShieldCheck size={11} />
                        <span>{m.resolutionStage2By?.slice(0, 12) ?? "—"}…</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-text-muted whitespace-nowrap">{fmtTime(m.resolutionStage2At)}</td>
                    <td className="p-3">
                      <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-teal-300 hover:text-teal-200 underline">
                        Source
                        <ExternalLink size={11} aria-hidden />
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
