/**
 * ONE RECEIPT IN THE LIST — `/wallet/receipts` (2026-10-07).
 *
 * ⭐ THE ROW STATES WHAT THE RECEIPT STATES, FROM THE SAME RECORD (the B-receipt brief's rule: "the list row and the
 * receipt state the same facts, read from the same settled record"): the type (Deposit / Withdrawal — the receipt's own
 * noun), the payment method, when, the amount, and the status in the shared lexicon. The whole row is ONE link to the
 * receipt, which prints both references in full.
 *
 * ⭐ ANATOMY, PHONE FIRST — TWO LINES. Line 1: what and how much (type · method, which may wrap; the amount, which never
 * does). Line 2: when and how it stands (the date, never broken mid-date; the status chip, which wraps under the date
 * when both cannot share the line). Nothing is truncated (a cut-off method or date is data loss, §M4a). The design
 * review of 2026-10-07 measured the first anatomy (date and chip stacked in a left column beside the amount) at 360:
 * with a 40px plate and a 7-figure amount the column kept ~93px, so Swahili statuses ran outside their pill and Chinese
 * dates split mid-date. So below `sm` the plate is not drawn (the type word already says which way the money went),
 * and the chip keeps the kit's own wrapping instead of a `nowrap` override.
 *
 * ⛔ NO BETTING INK AND NO GOLD. Deposit and withdrawal share ONE neutral brand plate; the glyph gives the direction
 * (§B2a: yes-green / no-rose belong to the two sides of a stake). The amount is neutral ink in `<Cash>`, so the privacy
 * eye masks it like every other personal figure; the chip's tone comes from `status-tone.ts` (§B11) — never typed here.
 * ⚠️ DECIDED ONCE, AND THE OTHER ROW IS THE DRIFT (design review, 2026-10-07): /wallet's history row (`wallet-client.tsx`
 * TxnRow) still paints direction in the betting pair (a yes/no plate and a green signed amount) — older than this row
 * and a §B2a drift, not a second design. This row is the target; converging TxnRow is its own change, because it is the
 * busiest money row in the product and carries bets and payouts as well as payments.
 * ⛔ A plain component with no hooks and every word resolved by the page — it renders on the server, and a driver reads
 * `data-type` / `data-status` instead of parsing a translated word.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { Cash } from "@/components/ui/cash";
import { IconPlate } from "@/components/ui/icon-plate";
import type { StatusChipVariant } from "@/lib/status-tone";
import type { ReceiptType } from "@/lib/wallet/receipts";
import type { TxnStatusValue } from "@/lib/wallet/ledger";

/** The glyph beside the status word — colour is never the only signal (§A4). */
const STATUS_GLYPH: Record<TxnStatusValue, "checkCircle" | "clock" | "alertCircle" | "rotateCcw" | "xCircle"> = {
  CONFIRMED: "checkCircle",
  PENDING: "clock",
  PROCESSING: "clock",
  AML_REVIEW: "clock",
  FAILED: "alertCircle",
  REVERSED: "rotateCcw",
  CANCELLED: "xCircle",
};

export function ReceiptListRow({
  id,
  type,
  status,
  typeWord,
  method,
  when,
  amount,
  statusWord,
  chip,
}: {
  id: string;
  type: ReceiptType;
  status: TxnStatusValue;
  typeWord: string;
  method: string;
  /** Day and EAT clock, in the reader's month words (`formatEatDateTime`). */
  when: string;
  /** Already formatted (`formatTzs`), unsigned — the receipt's own headline figure. */
  amount: string;
  statusWord: string;
  chip: StatusChipVariant;
}) {
  const Dir = type === "DEPOSIT" ? I.arrowDownToLine : I.arrowUpFromLine;
  const Glyph = I[STATUS_GLYPH[status]];
  return (
    <li data-row-id={id} data-type={type} data-status={status} className="border-b border-border last:border-b-0">
      {/* The ring sits INSIDE the row: the list is an `overflow-hidden` panel, which clipped the outset ring's sides. */}
      <Link
        href={`/wallet/receipt/${encodeURIComponent(id)}` as never}
        className="group flex items-center gap-3 px-3 py-3 transition-colors duration-quick hover:bg-bg-overlay/40 focus-visible:[outline-offset:-2px] lg:px-4"
      >
        <span className="hidden shrink-0 sm:block" aria-hidden>
          <IconPlate size={40} className="bg-brand-500/10 text-brand-300">
            <Dir s={20} />
          </IconPlate>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 font-display text-body font-semibold leading-tight text-text break-words">
              {typeWord}
              <span className="font-sans font-normal text-text-muted"> · {method}</span>
            </p>
            <p className="amount shrink-0 whitespace-nowrap font-mono text-body font-semibold text-text">
              <Cash>{amount}</Cash>
            </p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="whitespace-nowrap font-mono text-body-sm tabular-nums text-text-subtle">{when}</p>
            <Chip variant={chip} size="sm">
              <Glyph s={12} aria-hidden /> {statusWord}
            </Chip>
          </div>
        </div>
        <I.chevronRight s={16} className="shrink-0 text-text-subtle transition-colors duration-quick group-hover:text-text" aria-hidden />
      </Link>
    </li>
  );
}
