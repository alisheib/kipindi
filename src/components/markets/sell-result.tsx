"use client";

/**
 * ⭐ THE RESULT OF A SALE, AND THE HAND-OFF THAT KEEPS IT ON SCREEN (the Vodacom plan S6, A8h, for every player, both
 * looks; VODACOM-PLAN §0i A8h).
 *
 * Measured in a real browser (the A8c drive, 2026-10-04, today's /positions on its open lens, Swahili, 390px): the result
 * of a sale, "Imeuzwa · TZS 3,600 …", was on screen for 388 ms, and for 418 ms on a second sale. The Sell button drew
 * it, and the Sell button belongs to its ticket's row: the sale's own refresh took the sold ticket off the open lens,
 * and the row took the button and the result with it (the page's 20-second poller would have done the same). Tiketi
 * zangu's open lens loses it the same way, and so does a question page, which draws no Sell button for a ticket that is
 * no longer open.
 *
 * So the result is handed to a host that outlives every row: `SellResultHost` (`sell-result-host.tsx`), which AppShell
 * mounts for a signed-in visitor through the shell's lazy module. `handSellResult` dispatches it on `SELL_RESULT_EVENT`
 * with an ack object, and because `dispatchEvent` runs every listener before it returns, the answer is on that object
 * on the next line: the win celebration's handshake (`dispatchWinCelebration`). When nothing took it (the host's code
 * never arrived, or a page without the shell), the Sell button draws this same result itself, as it did before A8h, so
 * a result is never lost. Either way it stays until the player closes it or, for a sale that went through, until its
 * own countdown ends (DESIGN_AUTHORITY §F2's shared 5 s, held while it is read), never because a row was redrawn. A
 * result is a sale that went through, or a refused sale the player cannot clear (the registry's error, or a fault:
 * §F2); every other refusal is told by its toast alone (`submit()`, in the Sell button), and `keepFiguresWhole` keeps
 * whole the figures that toast names.
 *
 * ⛔ ONE RESULT, ONE DEFINITION. `SellResultModal` is the only place the result's words and figures are written, moved
 * here from the Sell button unchanged; the host and the button's fallback both draw it, so the two can never drift.
 * `test:journey-tickets` §12 pins it line for line, `test:sell-grace-truth` §6 its whole figures, and
 * `test:sell-price-guard` §7 the hand-off, the fallback, the host's mount and how the host draws it.
 */
import { OperationResultModal } from "./operation-result-modal";
import { useT } from "@/lib/i18n";
import { formatTzs } from "@/lib/utils";

/**
 * What a sale answered, as its result draws it: what was paid (on a refusal, the figure the button held), the fee as a
 * negative `net` (0 inside the free window), and a refusal's sentence, already in the player's language.
 */
export type SellResultData = { variant: "success" | "danger"; value: number; net: number; error?: string };

/** A result handed to the shell's host: what it draws, for which ticket, in which look, and the control that opened the sale. */
export type SellResultHandOff = {
  resultData: SellResultData;
  positionId: string;
  journey: boolean;
  from: HTMLElement | null;
  /** ⛔ SET BY `handSellResult`, NEVER BY A CALLER: the host marks it taken. */
  ack?: { accepted: boolean };
};

/** The one event a Sell button hands its result on. */
export const SELL_RESULT_EVENT = "50pick:sell-result";

/** Hand the result of a sale to the shell's host, and answer whether a host took it (read on the line after the dispatch). */
export function handSellResult(handOff: Omit<SellResultHandOff, "ack">): boolean {
  if (typeof window === "undefined") return false;
  const ack = { accepted: false };
  window.dispatchEvent(new CustomEvent<SellResultHandOff>(SELL_RESULT_EVENT, { detail: { ...handOff, ack } }));
  return ack.accepted;
}

/** A no-break space: a money figure's "TZS" never ends a line without its number. */
const NO_BREAK = String.fromCharCode(160);

/**
 * A refused sale's sentence as its toast draws it. A toast draws plain text, so each money figure in the sentence ("TZS
 * 9,000", as `formatTzs` writes one) is joined to its "TZS" by a no-break space and moves to the next line whole
 * (DESIGN_AUTHORITY §M4). Since S6 A8h a moved price is named in its toast alone, so the figure S6 A8f kept whole in the
 * result stays whole there too. Only the space inside a figure changes; every word is the dictionary's.
 */
export const keepFiguresWhole = (sentence: string) => sentence.split("TZS ").join("TZS" + NO_BREAK);

/**
 * The result of a sale, in both looks. The journey's look changes one word, the line under a refusal (a ticket where
 * today's says a position, S6 A7); since S6 A8f the money figures in its title are whole (`wholeFigures`).
 */
export function SellResultModal({
  open,
  resultData,
  positionId,
  journey,
  onClose,
}: {
  open: boolean;
  resultData: SellResultData;
  positionId: string;
  journey: boolean;
  onClose: () => void;
}) {
  const { t } = useT();
  return (
    <OperationResultModal
      open={open}
      variant={resultData.variant}
      eyebrow={resultData.variant === "success" ? t.common.positionSold : t.common.cashOutFailed}
      title={
        resultData.variant === "success"
          ? `${formatTzs(resultData.value)} ${t.common.returned}`
          : (resultData.error ?? t.error.tryAgain)
      }
      subtitle={
        resultData.variant === "success"
          ? (resultData.net >= 0
              ? t.common.fullStakeReturned
              : t.common.stakeReturnedMinusFee)
          : journey ? t.journey.sellUnchanged : t.common.positionUnchanged
      }
      details={resultData.variant === "success" ? [
        { label: t.common.ticket, value: positionId },
        { label: t.common.returned, value: formatTzs(resultData.value) },
        {
          label: t.common.earlyExitFee,
          value: resultData.net >= 0 ? t.common.none : formatTzs(Math.abs(resultData.net)),
          tone: "default",
        },
      ] : undefined}
      primaryLabel={resultData.variant === "success" ? t.common.doneSawa : t.common.close}
      onClose={onClose}
      stripTone="brand"
      wholeFigures
    />
  );
}
