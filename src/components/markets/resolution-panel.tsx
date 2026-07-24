"use client";

/**
 * ResolutionPanel — realises the kit's ResolutionPanel (kit/markets.jsx) on the
 * royal/gilt system. Shown on the market detail page for resolved/voided markets.
 *
 * HONESTY RULES (money + compliance surface):
 *  - The two-officer attestation shows ONLY when two genuinely distinct human
 *    officers resolved it — never for synthetic/auto (demo, sentinel) resolution.
 *  - Every figure shown is an exact stored value (the final pools) or exactly
 *    computed from them (the fee). The fee is shown in SHILLINGS, not as a rate:
 *    under the capped model the effective rate differs per poll, so a single "9%"
 *    would be false on any lopsided poll — in the one place a player comes to
 *    check that we paid him correctly. When the ceiling bound, we show the
 *    arithmetic (what the uncapped commission would have been, what we actually
 *    charged) so he can verify it himself. We do NOT reconstruct per-winner
 *    payouts here — a player's own exact payout lives in "Your positions".
 *  - F11: the objection window is now a REAL settlement gate. A market can be
 *    RESOLVED with its pool still whole and every position OPEN, so this panel
 *    says "payout is on hold" rather than the old "provisional" hedge — and it
 *    carries a genuine objection control, because an objection now genuinely
 *    freezes the money. Before the gate, the control would have been theatre:
 *    the money was already paid, and disputes were routed to support truthfully.
 */
import { I } from "@/components/ui/glyphs";
import { cn, formatTzs } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";
import { Callout } from "@/components/ui/callout";
import { useT } from "@/lib/i18n";
import { ObjectionDialog } from "./objection-dialog";

type Props = {
  marketId: string;
  outcome: "YES" | "NO" | "VOID";
  resolvedAt: string | null;
  /** True only when two DISTINCT real officers confirmed (not demo/auto). */
  twoOfficer: boolean;
  /** True when ONE genuine human officer resolved it (single-admin authorization,
   *  the default). Mutually exclusive with twoOfficer; both false = auto/system. */
  singleOfficer?: boolean;
  sourceUrl: string;
  objectionsClosedAt: string | null;
  serverNow: number;
  yesPool: number;
  noPool: number;
  /**
   * The fee actually taken from this pool, in TZS — and the arithmetic behind it.
   *
   * This used to be `feeRate: number`, a single percentage. That can no longer
   * describe the fee: under the ceiling the effective rate is `fee / pool`, which
   * differs for every poll depending on how lopsided it ended up. Printing "9%"
   * against a poll whose fee was capped at 1.1% of the pool would be a lie in the
   * one place a player goes to check we paid him correctly.
   *
   * So we show him the actual arithmetic instead: what 10% of the pool WOULD have
   * been, what the third-of-the-smaller-side ceiling was, and which one we charged.
   * He can check it himself.
   */
  fee: {
    /** yesPool + noPool. */
    pool: number;
    /** min(yesPool, noPool) — the prize. */
    smaller: number;
    /** commissionRate × pool, before the cap. */
    commission: number;
    /** feeCeilingRate × smaller — the most we were allowed to take. */
    ceiling: number;
    /** What we actually took: min(commission, ceiling). */
    fee: number;
    /** True when the ceiling bound — i.e. the poll was lopsided. */
    capped: boolean;
  };
  /** The rates this poll was frozen at, for the disclosure line. */
  rates: { commissionRate: number; feeCeilingRate: number };
  /** The officer's recorded evidence excerpt (exact quote from the official
   *  source) captured at the resolution ceremony. Null/empty → nothing recorded,
   *  so the evidence block is omitted (empty-state; never fabricated). */
  evidence?: string | null;
  /** When the money actually moved. Null = adjudicated but NOT yet paid: the pool
   *  is intact and an objection can still change the outcome. */
  settledAt?: string | null;
  /** Why this viewer can or cannot object — decided server-side, so the panel can
   *  say something true instead of dangling a control that would be refused. */
  objection?:
    | { state: "ELIGIBLE" }
    | { state: "OPEN"; objectionId: string }
    | { state: "NO_POSITION" }
    | { state: "WINDOW_CLOSED" }
    | { state: "ALREADY_SETTLED" }
    | { state: "SIGNED_OUT" };
};

const fmtPct = (r: number) => {
  const v = r * 100;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
};

export function ResolutionPanel({
  marketId, outcome, resolvedAt, twoOfficer, singleOfficer, sourceUrl, objectionsClosedAt, serverNow,
  yesPool, noPool, fee, rates, evidence, settledAt, objection,
}: Props) {
  const { t } = useT();
  const isVoid = outcome === "VOID";
  const gross = yesPool + noPool;
  // The money is HELD while the window is open and nothing has settled. This is a
  // fact about the pool now, not a disclaimer about the verdict.
  const held = !settledAt && objectionsClosedAt != null && serverNow < Date.parse(objectionsClosedAt);
  // Only the real recorded excerpt is ever shown — empty/whitespace → omit the block.
  const evidenceText = evidence?.trim() || null;

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
        {twoOfficer ? (
          <p className="flex items-start gap-2 text-[12.5px] text-text-muted">
            <I.sealCheck s={14} className="mt-[1px] shrink-0 text-yes-300" />
            <span>{t.market.resTwoOfficer}</span>
          </p>
        ) : singleOfficer ? (
          <p className="flex items-start gap-2 text-[12.5px] text-text-muted">
            <I.sealCheck s={14} className="mt-[1px] shrink-0 text-yes-300" />
            <span>{t.market.resSingleOfficer}</span>
          </p>
        ) : null}
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

      {/* Recorded officer evidence — the exact quote from the official source that
          justifies the verdict. Shown ONLY when a real excerpt was recorded; the
          quote renders as escaped text (React) so any markup is inert. */}
      {evidenceText && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-text-subtle">
            <I.fileCheck s={12} className="text-gilt" />
            {t.market.resEvidence}
          </p>
          <blockquote className="border-l-2 border-gilt/60 bg-bg-overlay/30 rounded-r-md px-3 py-2 text-[12.5px] leading-relaxed text-text-muted italic whitespace-pre-wrap break-words">
            {evidenceText}
          </blockquote>
        </div>
      )}

      {/* Settlement state. While the window is open the pool is UNTOUCHED — say so
          plainly, because it is the fact that makes an objection worth filing. */}
      {held && objectionsClosedAt ? (
        <div className="rounded-md border border-warning-border bg-warning-bg/30 px-3 py-2 space-y-1.5 text-[12px] text-warning-fg">
          <p className="flex items-start gap-2">
            <I.hourglassHalf s={13} className="mt-[1px] shrink-0" />
            <span>
              {t.market.resHeld} <span className="font-mono tabular-nums">{formatDateTime(objectionsClosedAt)}</span>.
            </span>
          </p>
          <p className="pl-[21px] leading-relaxed opacity-90">{t.market.resHeldWhy}</p>
        </div>
      ) : settledAt ? (
        // Just "Settled <when>". Who was paid and how much is INTERNAL — the player
        // sees their own payout under Your positions, and the operator sees the rest
        // in the admin console. Do not narrate the payout run on a public surface.
        <p className="flex items-center gap-1.5 text-[12px] text-text-subtle">
          <I.check s={13} className="text-yes-300" />
          {t.market.resPaidOut} <span className="font-mono tabular-nums">{formatDateTime(settledAt)}</span>
        </p>
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
          {/* THE FEE, IN SHILLINGS — and, when the ceiling bound, the arithmetic
              that produced it. A player checking that we paid him correctly can
              recompute the whole thing from the four numbers on this panel.
              A single "9%" here would have been a lie on any capped poll. */}
          <Row label={t.market.resPlatformFee} value={formatTzs(Math.round(fee.fee))} muted />
          {fee.capped && (
            <Row
              label={t.market.resFeeCapped}
              value={`${fmtPct(rates.feeCeilingRate)} × ${formatTzs(Math.round(fee.smaller))}`}
              muted
            />
          )}
        </div>
      )}

      {/* Why the fee was capped — the promise, stated where it was kept. */}
      {!isVoid && fee.capped && (
        <Callout tone="brand">
          {t.market.resFeeCappedNote
            .replace(/\{ceiling\}/g, fmtPct(rates.feeCeilingRate))
            .replace(/\{commission\}/g, fmtPct(rates.commissionRate))
            .replace(/\{uncapped\}/g, formatTzs(Math.round(fee.commission)))
            .replace(/\{charged\}/g, formatTzs(Math.round(fee.fee)))}
        </Callout>
      )}

      {/* Truthful footnotes — personal payout + the dispute route that actually
          exists for THIS viewer, in THIS state. We never show a control that the
          server would refuse; we say why instead. */}
      <div className="space-y-2 pt-1">
        {!isVoid && <p className="text-[11.5px] leading-relaxed text-text-subtle">{t.market.resYourPayoutNote}</p>}

        {objection?.state === "OPEN" ? (
          <p className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg/20 px-3 py-2 text-[11.5px] leading-relaxed text-warning-fg">
            <I.hourglassHalf s={13} className="mt-[1px] shrink-0" />
            {t.market.objOpenNotice}
          </p>
        ) : objection?.state === "ELIGIBLE" ? (
          <ObjectionDialog marketId={marketId} />
        ) : objection?.state === "NO_POSITION" ? (
          <p className="text-[11.5px] leading-relaxed text-text-subtle">{t.market.objOnlyStakeholders}</p>
        ) : objection?.state === "WINDOW_CLOSED" ? (
          <p className="text-[11.5px] leading-relaxed text-text-subtle">{t.market.objWindowClosed}</p>
        ) : objection?.state === "ALREADY_SETTLED" ? (
          <p className="text-[11.5px] leading-relaxed text-text-subtle">{t.market.objSettledContact}</p>
        ) : null}

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
