"use client";

/**
 * ResolutionPanel — realises the kit's ResolutionPanel (kit/markets.jsx) on the
 * royal/gilt system. Shown on the market detail page for resolved/voided markets.
 *
 * HONESTY RULES (money + compliance surface):
 *  - The two-officer attestation shows ONLY when two genuinely distinct human
 *    officers resolved it — never for synthetic/auto (demo, sentinel) resolution.
 *  - Every figure shown is an exact stored value (final pools) or an exact config
 *    rate (platform fee). We do NOT reconstruct per-winner payouts here — a
 *    player's own exact payout lives in "Your positions". No fabricated numbers.
 *  - There is no in-app "flag" control because no player objection-submit flow
 *    exists; disputes route to support truthfully.
 */
import { I } from "@/components/ui/glyphs";
import { cn, formatTzs } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";
import { useT } from "@/lib/i18n";

type Props = {
  outcome: "YES" | "NO" | "VOID";
  resolvedAt: string | null;
  /** True only when two DISTINCT real officers confirmed (not demo/auto). */
  twoOfficer: boolean;
  sourceUrl: string;
  objectionsClosedAt: string | null;
  serverNow: number;
  yesPool: number;
  noPool: number;
  /** Total pool fee (0..1) — the exact rate winners' payouts were computed at. */
  feeRate: number;
};

const fmtPct = (r: number) => {
  const v = r * 100;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
};

export function ResolutionPanel({
  outcome, resolvedAt, twoOfficer, sourceUrl, objectionsClosedAt, serverNow, yesPool, noPool, feeRate,
}: Props) {
  const { t } = useT();
  const isVoid = outcome === "VOID";
  const gross = yesPool + noPool;
  const provisional = objectionsClosedAt != null && serverNow < Date.parse(objectionsClosedAt);

  return (
    <section className="glass-panel p-5 space-y-4">
      {/* Header — title + outcome chip */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[16px] font-semibold text-text flex items-center gap-2">
          <I.shieldcheck s={16} className="text-gilt" />
          {t.market.resTitle}
        </h2>
        <span className={cn("chip", isVoid ? "chip-pending" : "chip-resolved")}>
          {isVoid ? t.market.resVoided : `${t.market.resolvedOutcome} · ${outcome === "YES" ? t.common.yes : t.common.no}`}
        </span>
      </div>

      {/* Attestation (only when genuinely two-officer) + timestamp + source */}
      <div className="space-y-2">
        {twoOfficer && (
          <p className="flex items-start gap-2 text-[12.5px] text-text-muted">
            <I.check s={14} className="mt-[1px] shrink-0 text-yes-300" />
            <span>{t.market.resTwoOfficer}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] text-text-subtle">
          {resolvedAt && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <I.clock s={12} className="opacity-70" />
              {formatDateTime(resolvedAt)}
            </span>
          )}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-text-muted hover:text-text underline"
          >
            {t.common.source}
            <I.ext s={11} />
          </a>
        </div>
      </div>

      {/* Finality / objection window */}
      {provisional && objectionsClosedAt ? (
        <div className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg/30 px-3 py-2 text-[12px] text-warning-fg">
          <I.hourglassHalf s={13} className="mt-[1px] shrink-0" />
          <span>
            {t.market.resProvisional} <span className="font-mono tabular-nums">{formatDateTime(objectionsClosedAt)}</span>.
          </span>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-[12px] text-text-subtle">
          <I.check s={13} className="text-yes-300" />
          {t.market.resFinal}
        </p>
      )}

      {/* Settlement / pool composition — exact stored values only */}
      {isVoid ? (
        <p className="text-[12.5px] leading-relaxed text-text-muted">{t.market.resVoidRefund}</p>
      ) : (
        <div className="rounded-md border border-border/60 bg-bg-overlay/40 font-mono text-[12.5px]">
          <Row label={t.market.resFinalPool} value={formatTzs(gross)} strong />
          <Row
            label={`${t.common.yes} ${t.market.resPoolWord}`}
            value={formatTzs(yesPool)}
            win={outcome === "YES"}
          />
          <Row
            label={`${t.common.no} ${t.market.resPoolWord}`}
            value={formatTzs(noPool)}
            win={outcome === "NO"}
          />
          <Row label={t.market.resPlatformFee} value={fmtPct(feeRate)} muted />
        </div>
      )}

      {/* Truthful footnotes — personal payout + dispute route */}
      <div className="space-y-1 pt-1">
        {!isVoid && <p className="text-[11.5px] leading-relaxed text-text-subtle">{t.market.resYourPayoutNote}</p>}
        <p className="text-[11.5px] leading-relaxed text-text-subtle">
          {t.market.resDispute}{" "}
          <a href="/help" className="text-accent-400 hover:text-text underline">{t.market.resContact}</a>
        </p>
      </div>
    </section>
  );
}

function Row({ label, value, strong, win, muted }: { label: string; value: string; strong?: boolean; win?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b border-border/50 last:border-b-0">
      <span className={cn("tracking-[0.02em] inline-flex items-center gap-1.5", win ? "text-text" : "text-text-subtle")}>
        {win && <I.check s={12} className="text-gilt" />}
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums font-semibold",
          strong ? "text-text" : win ? "text-gilt" : muted ? "text-text-subtle" : "text-text-muted",
        )}
      >
        {value}
      </span>
    </div>
  );
}
