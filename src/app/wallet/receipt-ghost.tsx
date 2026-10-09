import type { ReactNode } from "react";
import { GhostText, ghostShape, AMOUNT_SHAPE } from "@/components/ui/ghost-text";
import { keepIdRuns } from "@/components/ui/keep-words";
import { formatEatDateTime } from "@/lib/eat-day";
import type { Dict, Locale } from "@/lib/i18n-dict";

/**
 * A RECEIPT'S DETAILS WHILE THEY LOAD — /wallet/receipt/[id]'s and the provider's return's (round 5 of the Vodacom visual
 * pass, follow-up R5-K, 2026-10-09). Both pages print one panel of rows (`rounded-xl glass-panel divide-y divide-border`,
 * each row `flex items-start justify-between gap-4 px-4 py-3`: a 13px label and its value on an 18px line — 50px a row,
 * 51 with the rule, the "51px row pitch" of R5-H's audit), so their ghosts draw the same rows from these parts: the
 * label's words set and not shown (its width is what the value is left), and the value as the page sets it — an amount
 * in the money face, an id in runs of four (`keepIdRuns`, balanced) that wrap where a real id of that length wraps, a
 * date in the numeral face. The values are SHAPES (`ghostShape`), never data: the ghost has none.
 */

/** A transaction id's shape: `txn_` and twelve random bytes in hex (`wallet-service.ts`, `txn_${randomId(12)}`). */
export const TXN_ID_SHAPE = `txn_${"0".repeat(24)}`;
/** A deposit's gateway reference: its own order id, `dep_` and ten bytes in hex (`payments.ts`), which the gateway echoes. */
export const DEPOSIT_REF_SHAPE = `dep_${"0".repeat(20)}`;

/** A date as the pages print one (`formatEatDateTime`, East Africa time in the reader's month words), digits as zeros —
 *  drawn at a fixed instant a week back, so the server's drawing and the browser's are one string. */
export function dateShape(t: Dict, locale: Locale): string {
  return ghostShape(formatEatDateTime(Date.UTC(2026, 9, 3, 9, 41), Date.UTC(2026, 9, 9, 9), t.common.monthsShort, locale));
}

/** The panel of rows. */
export function DetailsGhost({ children }: { children: ReactNode }) {
  return <dl className="rounded-xl glass-panel divide-y divide-border" aria-hidden>{children}</dl>;
}
/** One row: the label set and not shown, the value as the page sets it. */
export function RowGhost({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-body-sm shrink-0"><GhostText>{label}</GhostText></dt>
      <dd className="text-body-sm text-right min-w-0">{children}</dd>
    </div>
  );
}
/** A value in words (a type, a method). */
export const WordGhost = ({ text }: { text: string }) => <GhostText>{text}</GhostText>;
/** An amount (`.amount`, the money face). */
export const AmountGhost = () => <span className="amount"><GhostText>{AMOUNT_SHAPE}</GhostText></span>;
/** An id or a reference, in whole runs of four, balanced — as the page prints one. */
export const IdGhost = ({ shape }: { shape: string }) => <span className="block font-mono text-balance"><GhostText>{keepIdRuns(shape)}</GhostText></span>;
/** A date in the numeral face. */
export const DateGhost = ({ text }: { text: string }) => <span className="font-mono tabular-nums"><GhostText>{text}</GhostText></span>;
