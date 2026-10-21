/**
 * THE MILLIONEA DOORS, EVERY STATE, AS THE PRODUCT DRAWS THEM (MASWALI-BUILD S5-DESIGN-DOORS; the critic's R1-doors).
 *
 * Each card state is a hub read model, run through the card's own model (`homeCardOf`) and drawn by the card itself
 * (`MaswaliHomeCard`) in every language and on both hosts; the loading pictures are the ghosts themselves
 * (`JourneyHomeGhost`, `MarketsGhost`, `MaswaliHomeCardGhost`). Nothing here re-draws a door: the markup is React's, from
 * the product's own modules. `qa:maswali-player-shots`' door pages inject it into the real pages (the real stylesheet, the
 * real fonts, the real column), and `test:maswali-doors` reads it.
 *
 *   npx tsx scripts/lib/maswali-door-fixtures.mts <out.json>     (or import { doorFixtures })
 *
 * ⚠️ A fixed clock (a Wednesday, mid-sale), so every day and date it prints is the same on every run.
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dict, type Locale } from "../../src/lib/i18n-dict.ts";
import { formatTzs } from "../../src/lib/utils.ts";
import { homeCardOf, nextWeekOpen, type HomeCardModel } from "../../src/components/maswali/maswali-card-model.ts";

const req = createRequire(import.meta.url);
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { I18nProvider } = req("../../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Locale; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const { MaswaliHomeCard } = req("../../src/components/maswali/maswali-home-card.tsx") as { MaswaliHomeCard: (p: Record<string, unknown>) => unknown };
const { MaswaliHomeCardGhost } = req("../../src/components/maswali/maswali-home-card-ghost.tsx") as { MaswaliHomeCardGhost: (p: Record<string, unknown>) => unknown };
const { JourneyHomeGhost } = req("../../src/components/journey/home/journey-home-ghost.tsx") as { JourneyHomeGhost: (p: Record<string, unknown>) => unknown };
const MarketsGhost = (req("../../src/app/markets/markets-ghost.tsx") as { default: (p: Record<string, unknown>) => unknown }).default;

const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
/** As the app renders it: inside the router, a pathname and the language provider. */
export const inApp = (l: Locale, el: unknown, path = "/") =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l } as never, el as never))));

export const LOCALES = ["sw", "en", "zh"] as const;
export const HOSTS = ["journey", "board"] as const;
export type DoorHost = (typeof HOSTS)[number];

/** Wednesday 18 November 2026, 09:00 EAT: week 47 sells (opened Monday, closes Friday 18:00). */
export const NOW = Date.parse("2026-11-18T09:00:00+03:00");
const MONDAY_OPEN = { weekday: 1, clock: "00:01" };
const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 86_400_000;
const CLOSES = Date.parse("2026-11-20T18:00:00+03:00");

type Out = "YES" | "NO" | "VOID" | null;
const questionsOf = (outcomes: Out[]) => outcomes.map((o, i) => ({ slot: i + 1, role: i < 10 ? "MAIN" : "RESERVE", outcome: o }));
const week = (o: Record<string, unknown> = {}) => ({
  id: "w47", code: "MLN-2026-W47", visibility: "PUBLIC", state: "OPEN", isFinal: false,
  opensAt: "2026-11-16T00:01:00+03:00", closesAt: iso(CLOSES), closedAt: null, firstEventAt: null,
  ticketPrice: 1_000, ticketCap: 10, selling: true,
  pool: { jackpot: 1_000_000, feeRate: 0.13, atLeast: false, carryPendingCode: null },
  questions: questionsOf(Array(15).fill(null)), resultsOut: 0, voidedMains: 0, voidedReserves: 0, nextResultAt: null, mine: null, ...o,
});
const closedWeek = (outcomes: Out[], o: Record<string, unknown> = {}) => week({
  state: "RESOLVING", selling: false, closesAt: iso(NOW - 5 * DAY), closedAt: iso(NOW - 5 * DAY),
  questions: questionsOf(outcomes), resultsOut: outcomes.filter((x) => x !== null).length, ...o,
});
const last = (o: Record<string, unknown>) => ({
  id: "w46", code: "MLN-2026-W46", state: "SETTLED", isFinal: false, closedAt: null, settledAt: null, tickets: 412, sales: 412_000,
  carryIn: 0, jackpot: null, winners: 0, share: null, fee: 0, topUp: null, paid: null, carriedForward: null, refundsPending: false, ...o,
});
const hub = (o: Record<string, unknown>) => ({ line: "PUBLIC", week: null, grading: null, lastWeek: null, paused: false, life: "LIVE", nextOpensAt: null, notices: [], asOf: iso(NOW), ...o });
const ALL_YES: Out[] = Array(15).fill("YES");
const SIX_IN: Out[] = ["YES", "NO", "YES", "YES", "NO", "YES", null, null, null, null, null, null, null, null, null];
const DOOMED: Out[] = ["VOID", "VOID", "VOID", "VOID", "VOID", "VOID", "YES", "YES", "YES", "YES", "VOID", "YES", "YES", "YES", "YES"];

/** Every state the card's model draws, each named — the order the shots stack them in. */
export const STATES: ReadonlyArray<{ name: string; hub: Record<string, unknown>; preview?: boolean; common?: boolean }> = [
  { name: "open · no ticket (the common card)", hub: hub({ week: week() }), common: true },
  { name: "open · 3 of 10 held", hub: hub({ week: week({ mine: { held: 3, cap: 10, tickets: [] } }) }) },
  { name: "open · carry waiting on week 46", hub: hub({ week: week({ pool: { jackpot: 1_000_000, feeRate: 0.13, atLeast: true, carryPendingCode: "MLN-2026-W46" } }) }) },
  { name: "open · at the cap, week 48 next", hub: hub({ week: week({ mine: { held: 10, cap: 10, tickets: [] } }) }) },
  { name: "open · at the cap in the final week", hub: hub({ week: week({ isFinal: true, mine: { held: 10, cap: 10, tickets: [] } }), life: "ENDING" }) },
  { name: "open · staff preview", hub: hub({ week: week() }), preview: true },
  { name: "presale", hub: hub({ nextOpensAt: iso(Date.parse("2026-11-23T00:01:00+03:00")) }) },
  { name: "paused", hub: hub({ week: week({ selling: false }), paused: true }) },
  { name: "closed · 6 of 15 results in", hub: hub({ week: closedWeek(SIX_IN) }) },
  { name: "closed · 15 of 15, objection window", hub: hub({ week: closedWeek(ALL_YES, { objectionsCloseAt: iso(NOW + 2 * DAY) }) }) },
  { name: "voiding", hub: hub({ week: closedWeek(DOOMED) }) },
  { name: "voided · refunds on their way", hub: hub({ lastWeek: last({ state: "VOIDED", refundsPending: true }) }) },
  { name: "voided · every ticket refunded", hub: hub({ lastWeek: last({ state: "VOIDED", refundsPending: false }) }) },
  { name: "settled · 3 tickets won", hub: hub({ lastWeek: last({ winners: 3, jackpot: 1_013_000, fee: 131_690 }) }) },
  { name: "settled · 1 ticket won", hub: hub({ lastWeek: last({ winners: 1, jackpot: 1_000_000, fee: 130_000 }) }) },
  { name: "settled · no 10/10, carried", hub: hub({ lastWeek: last({ winners: 0, carriedForward: 601_000 }) }) },
];

/** The card's model for a state, as the door builds it (`maswali-home-card-door.tsx`). */
export function modelOf(l: Locale, s: (typeof STATES)[number]): HomeCardModel {
  const t = dict[l];
  const m = homeCardOf(t, s.hub as never, 0.13, NOW, nextWeekOpen(s.hub as never, MONDAY_OPEN, NOW));
  if (!m) throw new Error(`no card for "${s.name}"`);
  return m;
}

/** The card for a state, exactly as the door draws it inside its wrapper. */
export function cardMarkup(l: Locale, s: (typeof STATES)[number], host: DoorHost): string {
  const m = modelOf(l, s);
  return inApp(l, h(MaswaliHomeCard as never, {
    t: dict[l], locale: l, week: m.week, jackpot: m.jackpot, pct: m.pct, cap: m.cap, state: m.state, finalWeek: m.finalWeek,
    atLeast: m.atLeast, pendingWeek: m.pendingWeek, preview: s.preview === true, host,
  } as never));
}

export type DoorFixtures = {
  now: number;
  states: string[];
  /** The common card's accessible name, as its parts read: the title ("Millionea · Week 47") and the figure. */
  names: Record<Locale, { title: string; figure: string }>;
  cards: Record<Locale, Record<DoorHost, string[]>>;
  ghost: Record<Locale, Record<DoorHost, string>>;
  journeyGhost: Record<Locale, { slot: string; none: string; preview: string }>;
  marketsGhost: Record<Locale, { slot: string; none: string }>;
};

export function doorFixtures(): DoorFixtures {
  const out: DoorFixtures = { now: NOW, states: STATES.map((s) => s.name), names: {} as DoorFixtures["names"], cards: {} as DoorFixtures["cards"], ghost: {} as DoorFixtures["ghost"], journeyGhost: {} as DoorFixtures["journeyGhost"], marketsGhost: {} as DoorFixtures["marketsGhost"] };
  for (const l of LOCALES) {
    const d = dict[l].millionea;
    out.names[l] = { title: `${d.productLabel} · ${d.week.replace("{week}", "47")}`, figure: d.ruleWithFigure.split(" · ")[0].replace("{amount}", formatTzs(1_000_000)) };
    out.cards[l] = { journey: STATES.map((s) => cardMarkup(l, s, "journey")), board: STATES.map((s) => cardMarkup(l, s, "board")) };
    out.ghost[l] = {
      journey: inApp(l, h(MaswaliHomeCardGhost as never, { t: dict[l], locale: l, host: "journey" } as never)),
      board: inApp(l, h(MaswaliHomeCardGhost as never, { t: dict[l], locale: l, host: "board" } as never)),
    };
    out.journeyGhost[l] = {
      slot: inApp(l, h(JourneyHomeGhost as never, { t: dict[l], locale: l, millionea: true } as never)),
      none: inApp(l, h(JourneyHomeGhost as never, { t: dict[l], locale: l, millionea: false } as never)),
      preview: inApp(l, h(JourneyHomeGhost as never, { t: dict[l], locale: l, millionea: true, preview: true } as never)),
    };
    out.marketsGhost[l] = {
      slot: inApp(l, h(MarketsGhost as never, { millionea: true } as never), "/markets"),
      none: inApp(l, h(MarketsGhost as never, { millionea: false } as never), "/markets"),
    };
  }
  return out;
}

if (process.argv[1] && /maswali-door-fixtures\.mts$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const target = process.argv[2];
  const fx = doorFixtures();
  if (target) writeFileSync(target, JSON.stringify(fx));
  else process.stdout.write(JSON.stringify(fx));
}
