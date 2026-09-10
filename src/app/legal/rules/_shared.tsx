/**
 * Shared machinery for the two GAME RULES documents.
 *
 * ⛔ THE RATES ARE PARAMETERS, NEVER LITERALS — and this module exists mostly to make that
 * impossible to get wrong. `docs/RULES.md` is 🟢 LAW and opens with it in capitals:
 * *"Do not restate a rate anywhere else. A number written twice is a number that will disagree
 * with itself."* Marketing's source PDFs hard-code **13%**, **87%**, **TZS 130,000** and
 * **TZS 65,000**; every one of those is derived here from `getGlobalConfig()` instead, so a rate
 * change moves the documents rather than falsifying them.
 *
 * ⭐ AND THE WORKED EXAMPLE IS THE REASON THIS MATTERS MOST. A prose sentence that says "13%"
 * looks wrong the moment the rate moves. A worked example that says "TZS 1,000,000 − TZS 130,000
 * = TZS 870,000" still looks internally consistent while being false — three numbers that agree
 * with each other and with nothing else. It is computed.
 *
 * ⚠️ TABLE LAW. `.admin-tbl` is the product's ONLY table skin (`ui-consistency` rule
 * `table-not-admin-tbl` fails any `<table>` without it), and a wide table must scroll inside
 * `ScrollX` — a component, not a utility, because a scrollable region must be keyboard-reachable
 * under WCAG 2.1.1. §A6 requires zero horizontal overflow at 360. These are the first tables in
 * `/legal`, so the shape is set here once rather than per document.
 */
import { ScrollX } from "@/components/ui/scroll-x";
import { formatTzs, pctNum } from "@/lib/utils";
import type { RateConfig } from "@/lib/server/market-config";

/** Every live number the two documents quote. ⛔ Nothing here may be typed by hand. */
export type RulesRates = {
  /** Bare number for a "N%" slot — 13, not 0.13. The copy carries the "%" so Chinese can place it. */
  commissionPct: number;
  /** What the winning side actually receives from the losing pool, as a percentage. */
  netSharePct: number;
  withdrawalFeePct: number;
  minStake: number;
  maxStake: number;
  freeExitMinutes: number;
  objectionHours: number;
  /** The raw rate, kept so the worked example can compute rather than restate. */
  commissionRate: number;
};

export function ratesFrom(cfg: RateConfig): RulesRates {
  return {
    commissionPct: pctNum(cfg.commissionRate),
    netSharePct: pctNum(1 - cfg.commissionRate),
    withdrawalFeePct: pctNum(cfg.withdrawalFeeRate),
    minStake: cfg.minStake,
    maxStake: cfg.maxStake,
    freeExitMinutes: cfg.freeExitGraceMinutes,
    objectionHours: cfg.objectionWindowHours,
    commissionRate: cfg.commissionRate,
  };
}

/** The two pools both worked examples use. Round numbers, so the arithmetic reads clearly. */
export const EXAMPLE_WIN_POOL = 1_000_000;
export const EXAMPLE_LOSE_POOL = 500_000;

/** One row of a worked example, with every figure DERIVED from the live commission rate. */
export function workedRow(losingPool: number, rate: number) {
  const fee = Math.round(losingPool * rate);
  return { losingPool, fee, net: losingPool - fee };
}

/**
 * A worked-example table. Structure once, words per locale — so a fourth language, or a change
 * to the table's shape, is one edit rather than three that can drift apart.
 *
 * ⚠️ `.admin-tbl thead` is `white-space: nowrap` and Swahili runs ~35-40% longer than English
 * (§A5), so header wording is a WIDTH decision at 360, not a copy decision. Keep headers short.
 */
export function RulesTable({
  label,
  head,
  rows,
}: {
  label: string;
  head: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <ScrollX label={label} className="glass-panel">
      <table className="admin-tbl">
        <thead className="border-b border-border bg-bg-overlay">
          <tr className="font-mono text-micro uppercase eyebrow text-text-subtle">
            {head.map((h) => (
              <th key={h} className="text-left p-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((cell, i) => (
                // ⭐ §T5 — the figures are DATA inside prose, so they take the mono ladder with
                // `tabular-nums`; the first column is a label and stays in the reading face.
                <td key={i} className={i === 0 ? "p-3 text-text" : "p-3 font-mono tabular-nums text-text-muted"}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollX>
  );
}

/** Money, formatted the one way the product formats money. */
export const tzs = (n: number) => formatTzs(n);
