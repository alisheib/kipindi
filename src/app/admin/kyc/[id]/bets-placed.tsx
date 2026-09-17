/**
 * The KYC card's "Bets placed" value (C5-SPEC ruling 197), rendered on the SERVER.
 *
 * Today's value — the count, then the staked total for a viewer who may see money — and, only for an account the house
 * has staked on, one block line: "of which house stakes: N", then " · TZS X" only for that same money viewer, then the X9
 * qualifier, because the decision rail beside this card has a note that is sent to the player (ruling 196).
 *
 * ⛔ SERVER ONLY. It takes the figures one by one — never the money facts object — and no client component imports it
 * (the ruling 197 pin in `test:house-bot-reports` §0). For an account with no house stake it renders exactly what the card
 * rendered before; `test:house-bot-reports` §4 compares the bytes. The words wrap in the card's half-width column; a
 * shilling figure never breaks.
 */
import { EXPOSURE_QUALIFIER, kycHouseBetsLine } from "@/lib/house-bot/exposure-copy";
import { adminCount, formatTzs } from "@/lib/utils";

/** A shilling figure as `formatTzs` writes it: held on one line while the words around it wrap in the half-width column. */
const MONEY = /(TZS\s\S+)/;

export function BetsPlacedValue({ betCount, stakedTzs, houseBetCount, houseStakedTzs, canSeeMoney }: {
  betCount: number;
  stakedTzs: number;
  houseBetCount: number;
  houseStakedTzs: number;
  /** The accounting money view (`canView(role, "accounting")`): the only viewer shown a shilling figure. */
  canSeeMoney: boolean;
}) {
  const house = kycHouseBetsLine(houseBetCount, canSeeMoney ? houseStakedTzs : null, formatTzs);
  return (
    <span className="font-mono tabular-nums">
      {adminCount(betCount, "bet")}
      {canSeeMoney ? <>{" · "}<span className="whitespace-nowrap">{formatTzs(stakedTzs)}</span> staked</> : ""}
      {house ? (
        <span data-exposure="kycCard" className="block text-body-sm text-text-muted">
          {house.split(MONEY).map((part, i) => (i % 2 === 1 ? <span key={i} className="whitespace-nowrap">{part}</span> : part))}{" · "}{EXPOSURE_QUALIFIER}
        </span>
      ) : null}
    </span>
  );
}
