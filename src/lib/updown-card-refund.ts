import type { Dict } from "@/lib/i18n-dict";
import { sideWord } from "@/lib/side-label";

/** The brief condition above a board card's two choices, from the actual empty pool. */
export function cardRefundBrief(t: Dict, empty: "UP" | "DOWN" | "BOTH" | null): string | null {
  if (empty === "BOTH") return t.market.udNobodyBackedEither;
  if (empty === "UP" || empty === "DOWN") {
    return t.market.udEmptySideRefundBrief.replace("{side}", sideWord(t, empty, "UPDOWN"));
  }
  return null;
}
