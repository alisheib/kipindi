import { AdminCard } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { formatDateTime } from "@/lib/utils";
import { getReportPack, PACK_STEPS, currentPackPeriod, type ReportPack } from "@/lib/server/report-pack";
import { currentSession } from "@/lib/server/auth-service";
import { ReportPackControls, CopyHash } from "./report-pack-controls";

function kb(bytes: number): string {
  if (bytes <= 0) return "—";
  const kbv = bytes / 1024;
  return kbv >= 1024 ? `${(kbv / 1024).toFixed(1)} MB` : `${Math.round(kbv)} KB`;
}

/** ADM1 — the monthly Gaming Board pack with its maker-checker signing chain. */
export async function ReportPackCard() {
  const period = currentPackPeriod();
  const pack: ReportPack = await getReportPack(period);
  const session = await currentSession();
  const isPreparer = !!session && pack.preparedBy === session.userId;

  const stateIndex = PACK_STEPS.findIndex((s) => s.state === pack.state);
  const sealed = pack.state === "acknowledged";

  return (
    <AdminCard
      title="Regulator pack · Gaming Board monthly"
      sw={`Kifurushi cha mdhibiti · ${pack.periodLabel}`}
      action={
        <Chip size="sm" variant={sealed ? "resolved" : pack.state === "draft" ? "neutral" : "brand"}>
          {sealed ? "ACKNOWLEDGED" : pack.state.toUpperCase()}
        </Chip>
      }
    >
      {/* State chain — Draft → Prepared → Approved → Submitted → Acknowledged. */}
      <div className="overflow-x-auto -mx-1 px-1">
        <ol className="flex min-w-[520px] items-center">
          {PACK_STEPS.map((step, i) => {
            const done = i <= stateIndex;
            const current = i === stateIndex;
            const isSeal = step.state === "acknowledged";
            // The acknowledged node is the ONE sanctioned gold in this console.
            const nodeColor = isSeal && sealed ? "var(--gold-400)" : done ? "var(--brand-400)" : "var(--border-strong)";
            const textColor = current ? "var(--text)" : done ? "var(--text-secondary)" : "var(--text-subtle)";
            return (
              <li key={step.state} className="contents">
                <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 84 }}>
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full border-2"
                    style={{
                      borderColor: nodeColor,
                      background: done ? `color-mix(in oklab, ${nodeColor} 16%, transparent)` : "transparent",
                      boxShadow: current ? `0 0 0 3px color-mix(in oklab, ${nodeColor} 22%, transparent)` : undefined,
                    }}
                  >
                    {isSeal && sealed ? (
                      <I.shieldcheck s={15} style={{ color: nodeColor }} />
                    ) : done ? (
                      <I.check s={14} style={{ color: nodeColor }} />
                    ) : (
                      <span className="font-mono text-[11px] font-bold" style={{ color: nodeColor }}>{i + 1}</span>
                    )}
                  </span>
                  <span className="text-center font-mono text-[9.5px] uppercase tracking-[0.1em] leading-tight" style={{ color: textColor }}>
                    {step.label}
                  </span>
                </div>
                {i < PACK_STEPS.length - 1 && (
                  <span className="h-0.5 flex-1 shrink-0 rounded-full" style={{ minWidth: 16, background: i + 1 <= stateIndex ? "var(--brand-400)" : "var(--border-strong)" }} />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Maker-checker signatures — real actors, no fabrication. */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SignSlot role="Prepared by · Ameandaa" name={pack.preparedByName} at={pack.preparedAt} />
        <SignSlot role="Approved by · Ameidhinisha" name={pack.approvedByName} at={pack.approvedAt} />
      </div>

      {/* File artifact — real filename, size and sha256 of the rendered PDF. */}
      {pack.artifact && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border bg-bg-overlay px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-text">
            <I.fileText s={13} className="text-text-tertiary" />
            {pack.artifact.filename}
          </span>
          <span className="font-mono text-[11px] text-text-tertiary">{kb(pack.artifact.sizeBytes)}</span>
          <CopyHash sha256={pack.artifact.sha256} />
          <a
            href="/api/admin/reports/gbt-monthly?format=pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.08em] uppercase text-royal hover:underline"
          >
            <I.download s={12} /> Download
          </a>
        </div>
      )}

      {sealed && pack.acknowledgedRef && (
        <p className="mt-2 font-mono text-[11px] text-text-tertiary">Regulator ref · {pack.acknowledgedRef}</p>
      )}

      {/* Action for the current state (guarded server-side). */}
      <div className="mt-4 border-t border-dashed border-border-subtle pt-3">
        {sealed ? (
          <div className="flex items-start gap-2.5">
            <I.shieldcheck s={16} className="mt-0.5 shrink-0" style={{ color: "var(--gold-400)" }} />
            <p className="text-[12px] text-text-muted">
              Pack acknowledged by the Gaming Board{pack.acknowledgedAt ? ` on ${formatDateTime(pack.acknowledgedAt)}` : ""}.
              The two-officer chain is complete and immutable.
            </p>
          </div>
        ) : (
          <ReportPackControls period={period} state={pack.state} isPreparer={isPreparer} />
        )}
        <p className="mt-2 text-center font-mono text-[10px] text-text-subtle">
          Submit stays locked until the pack is prepared by one officer and approved by a second.
        </p>
      </div>
    </AdminCard>
  );
}

function SignSlot({ role, name, at }: { role: string; name: string | null; at: string | null }) {
  const signed = !!name;
  return (
    <div
      className="rounded-md border p-2.5"
      style={{ borderColor: signed ? "color-mix(in oklab, var(--brand-500) 45%, var(--border))" : "var(--border)", background: signed ? "color-mix(in oklab, var(--brand-500) 6%, transparent)" : "var(--bg-overlay)" }}
    >
      <div className="flex items-center gap-1.5">
        <I.shieldcheck s={12} className={signed ? "text-brand-300" : "text-text-subtle"} />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle">{role}</span>
      </div>
      {signed ? (
        <>
          <p className="mt-1 truncate text-[12.5px] font-semibold text-text" title={name!}>{name}</p>
          {at && <p className="font-mono text-[10px] text-text-subtle">{formatDateTime(at)}</p>}
        </>
      ) : (
        <p className="mt-1 font-mono text-[11px] italic text-text-subtle">awaiting signature</p>
      )}
    </div>
  );
}
