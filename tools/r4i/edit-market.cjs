const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/app/markets/[id]/page.tsx", [
  [`import { formatEatDateTime } from "@/lib/eat-day";`, `import { formatEatDateTime } from "@/lib/eat-day";
import { formatBreakEnd } from "@/lib/break-end";
import { keepText } from "@/components/ui/keep-run";
import { isLockedOut } from "@/lib/server/responsible-gambling";`],
  [`  const myPositions = session ? (await listPositionsForUser(session.userId)).filter((p) => p.marketId === m!.id) : [];`,
   `  const myPositions = session ? (await listPositionsForUser(session.userId)).filter((p) => p.marketId === m!.id) : [];
  /* ⭐ R4-I (2026-10-09; edges E19, tiles 033 037 041 066 070 074 099 103 107) · THE READER'S OWN BREAK, so the page stops
     telling a player who has paused their betting to bet: "Tumia kidhibiti kuanza" ("Use the dial to get started") under
     Your positions, and "Live now — place another prediction without going back" over Similar markets. It gates two
     INVITATIONS, so it fails OPEN (a failed read is "not on a break", \`feature-state.ts\` LAW 1); the bet itself is refused
     by the server either way. */
  const breakEnd = session
    ? await Promise.resolve().then(() => isLockedOut(session.userId))
        .then((l) => (l.locked && l.until ? { until: l.until, exclusion: l.reason === "self_exclusion" } : null))
        .catch(() => null)
    : null;
  const breakDate = breakEnd ? formatBreakEnd(Date.parse(breakEnd.until), Date.now(), t.common.monthsShort, locale) : null;`],
  [`              {myPositions.length === 0 && (
                <p className="text-body-sm text-text-subtle italic">
                  {t.market.noBetYet}
                </p>
              )}`,
   `              {/* R4-I · during a break the empty list says the break, with its end (the sentence /wallet/deposit and the
                  limits page show), in place of the invitation to use the dial. */}
              {myPositions.length === 0 && (breakEnd && breakDate ? (
                <p className="text-body-sm text-text-subtle italic" data-testid="market-break">
                  {keepText(fill(breakEnd.exclusion ? t.rg.exclusionActive : t.rg.breakActive, { date: breakDate }), [breakDate])}
                </p>
              ) : (
                <p className="text-body-sm text-text-subtle italic">
                  {t.market.noBetYet}
                </p>
              ))}`],
  [`            <p className="mb-4 text-body-sm text-text-muted">{t.market.similarMarketsBody}</p>`,
   `            {/* R4-I · the line that says "place another prediction" is not said to a reader on a break; the markets stay. */}
            {!breakEnd && <p className="mb-4 text-body-sm text-text-muted">{t.market.similarMarketsBody}</p>}`],
]);
