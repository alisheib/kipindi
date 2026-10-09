const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/app/positions/page.tsx", [
  [`import { TicketsView } from "@/components/journey/tickets/tickets-view";`,
   `import { TicketsView } from "@/components/journey/tickets/tickets-view";
import { isLockedOut } from "@/lib/server/responsible-gambling";
import { breakSentenceText } from "@/lib/break-end";`],
  [`  const emptyBody =
    cause === "no-rows" ? t.positions.noOpenBody`,
   `  /* ⭐ R4-I (2026-10-09; edges E19, tiles 021–023 · 054–056 · 087–089) · DURING A BREAK THE EMPTY LIST DOES NOT SAY "BET".
     A player with no ticket was told to pick a market and commit a prediction ("Chagua swali, bonyeza NDIO au HAPANA…" in
     the journey, "Pick a market and drag the conviction dial…" here), with a button to the board, while betting is paused.
     For a reader on a break the empty list says the break's own sentence with its end — the one /wallet/deposit and the
     limits page show — and offers no way to bet. The read fails OPEN (it gates an invitation, \`feature-state.ts\` LAW 1):
     a failed read keeps today's empty state, and the bet path still refuses. */
  const breakEnd = await Promise.resolve().then(() => isLockedOut(session.userId))
    .then((l) => (l.locked && l.until ? { until: l.until, exclusion: l.reason === "self_exclusion" } : null))
    .catch(() => null);
  const breakBody = breakEnd
    ? breakSentenceText(breakEnd.exclusion ? t.rg.exclusionActive : t.rg.breakActive, breakEnd.until, serverNow, t.common.monthsShort, locale)
    : null;
  const emptyBody =
    cause === "no-rows" && breakBody ? breakBody
    : cause === "no-rows" ? t.positions.noOpenBody`],
  [`        locale={locale}
        t={t}
      />
    );
  }`, `        locale={locale}
        t={t}
        breakBody={breakBody}
      />
    );
  }`],
  [`          browseLabel={cause === "no-rows" ? t.positions.browseMarkets : undefined}`,
   `          browseLabel={cause === "no-rows" && !breakBody ? t.positions.browseMarkets : undefined}`],
]);
edit("src/components/journey/tickets/tickets-view.tsx", [
  [`export function TicketsView({ rows, positions, markets, prices, lens, page, serverNow, locale, t }: {`,
   `export function TicketsView({ rows, positions, markets, prices, lens, page, serverNow, locale, t, breakBody = null }: {`],
  [`  locale: Locale;
  t: Dict;
}) {
  const state: PortfolioState`, `  locale: Locale;
  t: Dict;
  /** R4-I · the reader's break, as the page words it (\`rg.breakActive\` with its end), or null: the first-ticket empty state
   *  then says it instead of "pick a question…", and offers no way to bet. The page reads it; this view only draws. */
  breakBody?: string | null;
}) {
  const state: PortfolioState`],
  [`  const emptyBody = firstTicket
    ? t.journey.ticketsEmptyOpenBody.replace("{yes}", sideWord(t, "YES", "MARKET")).replace("{no}", sideWord(t, "NO", "MARKET"))
    : t.positions.emptyLensBody;`,
   `  // ⛔ R4-I · during a break the first-ticket call ("Chagua swali, bonyeza NDIO au HAPANA…") and its "Tazama maswali"
  // button go; the break's own sentence speaks (tiles 021–023 · 054–056 · 087–089).
  const breakNow = firstTicket && !!breakBody;
  const emptyBody = breakNow && breakBody ? breakBody
    : firstTicket
    ? t.journey.ticketsEmptyOpenBody.replace("{yes}", sideWord(t, "YES", "MARKET")).replace("{no}", sideWord(t, "NO", "MARKET"))
    : t.positions.emptyLensBody;`],
  [`          action={firstTicket ? (`, `          action={breakNow ? null : firstTicket ? (`],
]);
