import { AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { CEREMONY } from "@/lib/admin-status-lexicon";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { I } from "@/components/ui/glyphs";
import { formatDateTime } from "@/lib/utils";
import { getReportPack, PACK_STEPS, PACK_HISTORY_INCOMPLETE_LINE, currentPackPeriod, type ReportPack } from "@/lib/server/report-pack";
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
  /**
   * ⛔ THIS CARD RENDERS ABOVE BOTH TABS OF /admin/reports, so a throw here takes the KPI strip, the
   * daily P&L and the whole report library down with it. The read is a DATABASE read since C5-SPEC
   * ruling 214's swap — it can fail where the old ring filter could not — and the platform already
   * has the honest answer for a read that failed: `AdminLoadError`, amber, "this may not be empty".
   * ⚠️ It is NOT caught into a default pack: that would paint DRAFT, and a pack that reads Draft
   * invites a second Prepare on a filing that may already be signed. A failed read says it failed.
   */
  let pack: ReportPack;
  try {
    pack = await getReportPack(period);
  } catch (e) {
    console.error("[report-pack] card read failed:", (e as Error)?.message ?? e);
    return (
      <AdminCard title="Regulator pack · Gaming Board monthly" sw="Kifurushi cha mdhibiti">
        <AdminLoadError what="the regulator pack" />
      </AdminCard>
    );
  }
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
      {/* ⛔ THE DANGER STATE, ABOVE THE CHAIN (C5-SPEC ruling 214). The pack's own history could not
          be read to the end, so the chain, both signature slots and the state chip below are derived
          from a window that may not hold every transition. It is stated where the officer looks
          FIRST, because everything under it is the thing they must not trust. */}
      {/* ⛔ `py-2`, NOT the `py-2.5` of the metadata strip this box was first copied from. This project's
          spacing scale is INVERTED at that key — 2.5 paints 10px while 2 paints 12px — so the token that
          reads bigger paints smaller, and `test:spacing-scale` ratchets that backlog DOWNWARD: the strip's
          own 2.5 is counted debt, and a NEW one may not be added. 12px against 10px on a box with its own
          border and ground is not a visible difference; a broken ratchet is. */}
      {pack.historyIncomplete && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-body-sm text-danger-fg">
          <I.alertCircle s={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{PACK_HISTORY_INCOMPLETE_LINE}</p>
            <p className="mt-0.5">
              The audit read hit its row limit, so the chain below may be missing a signature that
              already exists. Read this pack&apos;s history in the audit log before signing anything.
            </p>
          </div>
        </div>
      )}

      {/* State chain — Draft → Prepared → Approved → Submitted → Acknowledged. */}
      <ScrollX label="Report pack signing chain" className="-mx-1 px-1">
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
                    /* ⚠️ LITERALS, not `h-8 w-8` — spacing is overridden (tailwind.config.ts:200-215)
                       so `h-8` was a 48px roundel inside this 84px-wide step column. */
                    className="grid h-[32px] w-[32px] place-items-center rounded-full border-2"
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
                  <span className="text-center font-mono text-micro uppercase eyebrow leading-tight" style={{ color: textColor }}>
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
      </ScrollX>

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
            className="row-link ml-auto inline-flex items-center gap-1 font-mono text-caption text-royal-300 hover:underline"
          >
            <I.download s={12} /> Download
          </a>
        </div>
      )}

      {/* E-100 · `break-all`, and this is the instance that matters most. The regulator's own
          acknowledgement reference is operator-supplied free text of unknown length, and it is
          what an officer reads back to TRA/GBT. Clipping it at a card edge would make the one
          string on a statutory surface that must be quotable, unquotable. Found by the rule,
          not by the eye — the wallet's ticket box was the reported symptom, this was the class. */}
      {sealed && pack.acknowledgedRef && (
        <p className="mt-2 font-mono text-[11px] text-text-tertiary break-all">Regulator ref · {pack.acknowledgedRef}</p>
      )}

      {/* Action for the current state (guarded server-side). */}
      <div className="mt-4 border-t border-dashed border-border-subtle pt-3">
        {/* ⛔ NO CONTROL IS OFFERED OVER AN UNREADABLE HISTORY. The four server actions refuse it
            anyway (`readPackForTransition`), and a button whose only outcome is a refusal trains an
            officer to press through a warning. */}
        {pack.historyIncomplete ? (
          <p className="text-body-sm text-text-muted">
            Signing is unavailable until the pack&apos;s history can be read completely.
          </p>
        ) : sealed ? (
          <div className="flex items-start gap-2.5">
            <I.shieldcheck s={16} className="mt-0.5 shrink-0" style={{ color: "var(--gold-400)" }} />
            <p className="text-body-sm text-text-muted">
              Pack acknowledged by the Gaming Board{pack.acknowledgedAt ? ` on ${formatDateTime(pack.acknowledgedAt)}` : ""}.
              The two-officer chain is complete and immutable.
            </p>
          </div>
        ) : (
          <ReportPackControls period={period} state={pack.state} isPreparer={isPreparer} />
        )}
        {/* ⛔ `text-body-sm`, NOT `text-[10px]`. THIS IS A SENTENCE, AND §T4's READING FLOOR IS 12.5px — the rule
            DG-A-14 settled by reading 48 strings that sat 2-4px under it wearing an eyebrow's clothes. It arrived
            with C5-6 (commit 87d1311c), which shipped with no review and no render; the first tile taken of this
            card (`reportpack-draft-360.png`) shows it at 10px, centred, under the one control on a statutory
            filing. 13px is the LOWEST rung above the floor, and moving off a hand-typed size takes
            `test:type-scale` §3 and §4 DOWN together. */}
        {!pack.historyIncomplete && (
          <p className="mt-2 text-center font-mono text-body-sm text-text-subtle">
            Submit stays locked until the pack is prepared by one officer and approved by a second.
          </p>
        )}
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
        <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{role}</span>
      </div>
      {signed ? (
        <>
          <p className="mt-1 truncate text-body-sm font-semibold text-text" title={name!}>{name}</p>
          {/* ⛔ THE SECOND LINE OF A SIGNATURE SLOT TAKES THE PLATFORM'S OWN SHAPE FOR A SECOND LINE UNDER A NAME
              — `font-mono text-body-sm` in a subdued tone, which is what `/admin/agents` and the desk's own
              roster both use, and both chose it in writing because it CLEARS §T4's 12.5px floor. These two were
              10px and 11px: the moment an officer signs a Gaming Board filing, and the state of a slot nobody has
              signed, printed smaller than the eyebrow above them. Read off `reportpack-360.png` and
              `reportpack-draft-360.png`. Both were hand-typed sizes, so this takes §3 and §4 down together. */}
          {at && <p className="font-mono text-body-sm text-text-subtle">{formatDateTime(at)}</p>}
        </>
      ) : (
        <p className="mt-1 font-mono text-body-sm italic text-text-subtle">{CEREMONY.awaitingSignature.en}</p>
      )}
    </div>
  );
}
