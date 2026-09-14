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
import { Fragment } from "react";
import { ScrollX } from "@/components/ui/scroll-x";
import { formatTzs, pctNum } from "@/lib/utils";
import { poolFee, resolveFeeModel } from "@/lib/payout";
import type { RateConfig } from "@/lib/server/market-config";

/** Every live number the two documents quote. ⛔ Nothing here may be typed by hand. */
export type RulesRates = {
  /** Bare number for a "N%" slot — 13, not 0.13. The copy carries the "%" so Chinese can place it.
   *  It is our fee as a share of the LOSING side (see `losingSideRate`). */
  commissionPct: number;
  /** What the winning side actually receives from the losing pool, as a percentage. */
  netSharePct: number;
  withdrawalFeePct: number;
  minStake: number;
  maxStake: number;
  freeExitMinutes: number;
  objectionHours: number;
  /** The raw losing-side rate, kept so the worked example can compute rather than restate. */
  commissionRate: number;
};

/**
 * The fee the rules quote, as a share of the LOSING side.
 *
 * 🔴 FIXED 2026-09-13. This read `cfg.commissionRate` — the RETIRED capped-commission rate
 * (market-config: "legacy arm only", 0.10) — so both rules documents and their worked examples
 * told players 10% while `/legal/terms` and settlement charged 13%. The live model is
 * `loser-share`: fee = (platformFeeRate + operatorFeeRate) × the losing pool, with no ceiling.
 * The rate is now read back from `poolFee` itself (`shareOfLosers` is the loser-share rate after
 * the same resolve and clamp settlement applies), so these documents cannot quote a number the
 * arithmetic does not charge.
 *
 * ⚠️ A global config set back to `capped-commission` has no flat share of the losing side, and
 * the documents' prose would be false under it whatever number they showed; that arm keeps its
 * headline rate, and a return to it needs the prose rewritten first.
 */
function losingSideRate(cfg: RateConfig): number {
  return resolveFeeModel(cfg) === "loser-share" ? poolFee(0, 0, cfg).shareOfLosers : cfg.commissionRate;
}

export function ratesFrom(cfg: RateConfig): RulesRates {
  const rate = losingSideRate(cfg);
  return {
    commissionPct: pctNum(rate),
    netSharePct: pctNum(1 - rate),
    withdrawalFeePct: pctNum(cfg.withdrawalFeeRate),
    minStake: cfg.minStake,
    maxStake: cfg.maxStake,
    freeExitMinutes: cfg.freeExitGraceMinutes,
    objectionHours: cfg.objectionWindowHours,
    commissionRate: rate,
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
 *
 * 🔴 2026-09-14 (public audit, en/sw/zh): short headers were NOT enough. At 360 the four-column
 * worked example hid its last column, "Shared by winners", the one number the example exists to
 * show, inside a scroll box with no cue on a phone. So below `sm` (640px) every row is a stacked
 * card with every column visible, and the table is kept from `sm` up.
 * ⛔ `prose` is for a table whose later columns are SENTENCES (the Up & Down refund cases). Those
 * cells used to take the figure styling, and `.admin-tbl td.tabular-nums` is nowrap (globals.css),
 * so each sentence stayed on one line and was cut at the card edge even at 1280. Figures keep it.
 * ⭐ The first column never breaks inside a word: a Chinese label broke after every character
 * (否/获/胜) once the figures squeezed it. Latin labels still wrap at their spaces.
 */
export function RulesTable({
  label,
  head,
  rows,
  prose = false,
}: {
  label: string;
  head: readonly string[];
  rows: readonly (readonly string[])[];
  /** The columns after the first are sentences, not figures: they wrap and read in the body face. */
  prose?: boolean;
}) {
  return (
    <>
      {/* Phone: one card per row. The label heads the card; each later column is a term and its value. */}
      <ul aria-label={label} className="sm:hidden space-y-[8px]">
        {rows.map((r) => (
          <li key={r[0]} className="glass-panel rounded-md px-[16px] py-[12px]">
            <p className="text-text font-medium break-keep">{r[0]}</p>
            <dl className={prose ? "mt-[4px]" : "mt-[8px] grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-[16px] gap-y-[6px]"}>
              {r.slice(1).map((cell, i) => (
                <Fragment key={i}>
                  <dt className={prose ? "sr-only" : "font-mono text-caption uppercase eyebrow text-text-subtle"}>{head[i + 1]}</dt>
                  <dd className={prose ? "text-text-muted" : "font-mono tabular-nums text-text-muted text-right whitespace-nowrap"}>{cell}</dd>
                </Fragment>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden sm:block">
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
                    <td key={i} className={i === 0 ? "p-3 text-text break-keep" : prose ? "p-3 text-text-muted" : "p-3 font-mono tabular-nums text-text-muted"}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
      </div>
    </>
  );
}

/** Money, formatted the one way the product formats money. */
export const tzs = (n: number) => formatTzs(n);
