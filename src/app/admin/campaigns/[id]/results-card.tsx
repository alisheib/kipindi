"use client";

/**
 * U48a · THE RESULTS CARD — what became of the messages the campaign handed over, in the words of the receipts (ENGINE-SPEC
 * §4.16; OD40 · OD41). It shares `LiveProvider`'s state with the status, controls and figures cards (the page mounts it
 * inside the same provider), so it follows the campaign exactly as they do: the driver replaces the view when the server
 * answers, no sooner, and this file only prints it.
 *
 * ⛔ NO ARITHMETIC ON A COUNT IN THE BROWSER, as the figures card (V1): every number printed is a field of `view.results`,
 * which the server summed from the view's one groupBy; `formatNumber` is a format, not a sum. Which honesty lines stand,
 * which rows have anything to say and the price line are decided there too.
 * ⛔ NEVER "DELIVERED" FOR A HAND-OVER (OD41): the "Delivered" row prints `results.delivered` — the rows a receipt moved — and
 * the network's taking a message is "Handed over, no receipt yet" in the row beside it, with the honesty line above both
 * while no receipt has arrived. The words are `live-copy.ts`'s.
 * ⛔ A COUNT THAT COULD NOT BE READ IS SAID (a dash and its sentence), never drawn as a zero.
 * ⛔ E23 · BELOW THE FLOOR THERE IS NO CARD: `results` is null for a viewer who may not see the split, so `LiveWhenResults`
 * draws nothing and the figures card's floor sentence stands alone. ⛔ OD24 · NO MONEY WORD HERE: the price line is a sentence
 * from `live-copy.ts`, handed a figure by the view for a money reader only.
 * ⭐ The reasons and the failed split are the kit's `AdminBarList` in its own ink — "not sent" is the checks working, never
 * danger (OD40) — dominant first, protected ONE line (the view's list, worded once), the five words always.
 *
 * Guard: `npm run test:campaign-visuals` §R (R1–R15) · Red: `npm run red:campaign-visuals`.
 */
import type { ReactNode } from "react";
import { Callout } from "@/components/ui/callout";
import { AdminBarList } from "@/components/admin/admin-charts";
import { formatNumber } from "@/lib/utils";
import { useLive } from "./live-client";
import { RESULTS_ROW_BOX } from "./live-geometry";
import {
  RESULTS_FAILED, RESULTS_HONESTY, RESULTS_ROW, RESULTS_UNREAD, liveReasonTitle, resultsSpendLine,
} from "./live-copy";

/** The card exists only while the view has results — the page hands it its (server-drawn) chrome. */
export function LiveWhenResults({ children }: { children: ReactNode }) {
  const { view } = useLive();
  return view.results !== null ? <>{children}</> : null;
}

/** One result: its title and its count on one line, and under it what the count is — or that it could not be counted. */
function Result({ name, label, value, help, box, children }: {
  name: string; label: string; value: number | null; help: string; box: string; children?: ReactNode;
}) {
  return (
    <div className={box} data-results-row={name} data-results-unread={value === null ? "" : undefined}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 break-words text-body text-text" data-results-label>{label}</span>
        <span className="shrink-0 font-mono text-body font-bold tabular-nums text-text" data-results-value>
          {value === null ? "—" : formatNumber(value)}
        </span>
      </div>
      <p className="text-body-sm text-text-secondary" data-results-help>{value === null ? RESULTS_UNREAD : help}</p>
      {children}
    </div>
  );
}

export function LiveResults() {
  const { view } = useLive();
  const r = view.results;
  if (r === null) return null;
  return (
    <div className="space-y-3" data-results>
      {/* ⭐ OD41 · the honesty lines, rendered from the data: present while the data says so, gone by themselves after. */}
      {r.honesty.noReceiptYet && (
        <Callout tone="info" role="note">
          <span className="block" data-results-honesty="no_receipt_yet">{RESULTS_HONESTY.noReceiptYet}</span>
        </Callout>
      )}
      {r.honesty.notSetUp && (
        <Callout tone="info" role="note">
          <span className="block" data-results-honesty="not_set_up">{RESULTS_HONESTY.notSetUp}</span>
        </Callout>
      )}
      <ul>
        <li>
          <Result name="delivered" label={RESULTS_ROW.delivered.label} value={r.delivered} help={RESULTS_ROW.delivered.help} box={RESULTS_ROW_BOX} />
        </li>
        <li>
          <Result name="handedOver" label={RESULTS_ROW.handedOver.label} value={r.handedOver} help={RESULTS_ROW.handedOver.help} box={RESULTS_ROW_BOX}>
            {/* E5 · of the ones above, those handed over longer ago than a receipt takes — only while some are handed over. */}
            {r.handedOver > 0 && (
              <Result
                name="noReceipt"
                label={RESULTS_ROW.noReceipt.label}
                value={r.noReceiptAfter15}
                help={RESULTS_ROW.noReceipt.help}
                box="mt-2 border-l border-border-subtle pl-3"
              />
            )}
          </Result>
        </li>
        <li>
          <Result name="failed" label={RESULTS_ROW.failed.label} value={r.failed.total} help={RESULTS_ROW.failed.help} box={RESULTS_ROW_BOX}>
            {r.failed.total > 0 && (
              <div className="mt-2" data-results-failed>
                <AdminBarList
                  rows={[
                    { label: RESULTS_FAILED.wire, value: r.failed.wire, title: liveReasonTitle(RESULTS_FAILED.wire, r.failed.wire) },
                    { label: RESULTS_FAILED.receipt, value: r.failed.receipt, title: liveReasonTitle(RESULTS_FAILED.receipt, r.failed.receipt) },
                  ]}
                  format={formatNumber}
                />
              </div>
            )}
          </Result>
        </li>
        <li>
          <Result name="notSent" label={RESULTS_ROW.notSent.label} value={r.notSent.total} help={RESULTS_ROW.notSent.help} box={RESULTS_ROW_BOX}>
            {/* ⭐ OD40 · the five words always, dominant first, protected ONE line — the figures card's own list, worded once. */}
            <div className="mt-2" data-results-reasons>
              <AdminBarList
                rows={r.notSent.reasons.map((x) => ({ label: x.label, value: x.count, title: liveReasonTitle(x.label, x.count) }))}
                format={formatNumber}
              />
            </div>
          </Result>
        </li>
        {r.noAnswer > 0 && (
          <li>
            <Result name="noAnswer" label={RESULTS_ROW.noAnswer.label} value={r.noAnswer} help={RESULTS_ROW.noAnswer.help} box={RESULTS_ROW_BOX} />
          </li>
        )}
        {r.left.count > 0 && (
          <li>
            <Result
              name={r.left.stopped ? "stopped" : "waiting"}
              label={r.left.stopped ? RESULTS_ROW.stopped.label : RESULTS_ROW.waiting.label}
              value={r.left.count}
              help={r.left.stopped ? RESULTS_ROW.stopped.help : RESULTS_ROW.waiting.help}
              box={RESULTS_ROW_BOX}
            />
          </li>
        )}
        <li>
          {/* E30 · everybody this campaign reached who has stopped offers since, whichever way — counted on the server. */}
          <Result
            name="stoppedSince"
            label={RESULTS_ROW.stoppedSince.label}
            value={r.stoppedSince}
            help={RESULTS_ROW.stoppedSince.help}
            box={RESULTS_ROW_BOX}
          />
        </li>
      </ul>
      {/* ⛔ OD24 · the price line: the view carries a figure for a money reader only. */}
      {r.spend !== null && <p className="text-body-sm text-text-secondary" data-results-spend>{resultsSpendLine(r.spend)}</p>}
    </div>
  );
}
