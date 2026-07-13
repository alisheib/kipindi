import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { ObjectionStatusBadge } from "@/components/admin/status-badge";
import { ScrollX } from "@/components/ui/scroll-x";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { listObjections } from "@/lib/server/objections-service";
import { getMarket } from "@/lib/server/market-service";
import { db } from "@/lib/server/store";
import { displayLabel } from "@/lib/display-label";
import { formatDateTime, formatTzs } from "@/lib/utils";
import { OBJECTION } from "@/lib/admin-status-lexicon";
import { ObjectionDecision } from "./objection-decision";
import Link from "next/link";

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  WRONG_OUTCOME: OBJECTION.reasonWrongOutcome.en,
  SOURCE_CONTRADICTS: OBJECTION.reasonSourceContradicts.en,
  AMBIGUOUS_CRITERION: OBJECTION.reasonAmbiguousCriterion.en,
  RESOLVED_EARLY: OBJECTION.reasonResolvedEarly.en,
  OTHER: OBJECTION.reasonOther.en,
};

export default async function AdminObjectionsPage() {
  const objections = await listObjections();

  // Join each objection to its market + objector. The objector is shown by
  // displayLabel() — never a phone number: this is a compliance surface, and an
  // officer does not need PII to rule on whether a verdict matches its source.
  const rows = await Promise.all(
    objections.map(async (o) => {
      const m = await getMarket(o.marketId);
      const u = await db.user.findById(o.userId);
      return {
        o,
        market: m,
        who: displayLabel(u ?? { id: o.userId, displayName: null }),
        pool: m ? m.yesPool + m.noPool : 0,
        /** The remedy is only reachable while the money has not moved. */
        actionable: !!m && !m.settledAt && o.status === "OPEN",
      };
    }),
  );

  const open = rows.filter((r) => r.o.status === "OPEN");
  const frozenTzs = open.reduce((sum, r) => sum + r.pool, 0);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Objections" sw="Pingamizi" />
      <p className="text-[12.5px] leading-relaxed text-text-muted">
        Player disputes against a market verdict. An OPEN objection freezes that market&rsquo;s
        settlement — nobody is paid until you rule.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <AdminKpi label="Open" value={String(open.length)} />
        <AdminKpi label="Money frozen" value={formatTzs(frozenTzs)} />
        <AdminKpi label="Total filed" value={String(rows.length)} />
      </div>

      {open.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg/25 px-3 py-2.5 text-[12.5px] text-warning-fg">
          <I.hourglassHalf s={14} className="mt-[1px] shrink-0" />
          <p>
            {OBJECTION.frozenNotice.en}. {formatTzs(frozenTzs)} is held across {open.length}{" "}
            {open.length === 1 ? "market" : "markets"} and will not settle until each objection is decided.
          </p>
        </div>
      )}

      <AdminCard title="Queue" sw="Foleni" padding="p-0">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              kind="admin"
              title="No objections"
              body="No player has disputed a verdict. Resolved markets settle automatically when their objection window closes."
            />
          </div>
        ) : (
          <ScrollX label="Objections queue">
            <table className="admin-tbl">
              <thead>
                <tr>
                  <th className="text-left">Status</th>
                  <th className="text-left min-w-[200px]">Market</th>
                  <th className="text-left">Objector</th>
                  <th className="text-left">Reason</th>
                  <th className="text-left min-w-[150px]">Their case</th>
                  <th className="text-right">Pool held</th>
                  <th className="text-left">Filed</th>
                  {/* The officer's action. Kept narrow enough that it lands inside
                      a 1280 viewport — the decision must not be the one column you
                      have to go looking for. */}
                  <th className="text-left min-w-[130px]">Decision</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ o, market, who, pool, actionable }) => (
                  <tr key={o.id}>
                    <td><ObjectionStatusBadge status={o.status} /></td>
                    <td>
                      {market ? (
                        <Link
                          href={`/admin/resolver/${o.marketId}` as never}
                          className="text-text hover:text-brand-300 underline underline-offset-2"
                        >
                          {market.titleEn}
                        </Link>
                      ) : (
                        <span className="text-text-subtle">—</span>
                      )}
                      <div className="font-mono text-[10.5px] text-text-subtle">
                        verdict: {o.outcomeAtFiling ?? "—"}
                        {market?.settledAt ? " · SETTLED" : ""}
                      </div>
                    </td>
                    <td className="font-mono text-[11px] text-text-muted">{who}</td>
                    <td className="text-[12px] text-text-muted">{REASON_LABEL[o.reason] ?? o.reason}</td>
                    <td className="text-[12px] leading-relaxed text-text-muted whitespace-pre-wrap break-words max-w-[190px]">
                      {o.detail}
                    </td>
                    <td className="text-right font-mono tabular-nums text-text-muted">
                      {o.status === "OPEN" && market && !market.settledAt ? formatTzs(pool) : "—"}
                    </td>
                    <td className="font-mono text-[10.5px] text-text-subtle whitespace-nowrap">
                      {formatDateTime(o.createdAt)}
                    </td>
                    <td>
                      {actionable ? (
                        <ObjectionDecision
                          objectionId={o.id}
                          canReverse={market?.resolvedOutcome === "YES" || market?.resolvedOutcome === "NO"}
                        />
                      ) : o.status === "OPEN" ? (
                        // Should be unreachable: an OPEN objection freezes settlement.
                        // If it ever happens, say so rather than offer a remedy we
                        // cannot honour without clawing money back.
                        <span className="text-[11.5px] text-danger-fg">
                          Market already settled — cannot remedy
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="font-mono text-[10.5px] text-text-subtle">
                            {o.remedy ? `${o.remedy} · ` : ""}
                            {o.reviewedAt ? formatDateTime(o.reviewedAt) : "—"}
                          </div>
                          {o.reviewNote && (
                            <p className="text-[11.5px] text-text-muted whitespace-pre-wrap break-words max-w-[220px]">
                              {o.reviewNote}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
        )}
      </AdminCard>
    </div>
  );
}
