/**
 * Live ticker feed — platform activity for the scrolling banner.
 *
 * Currently serves realistic synthetic data that matches real platform
 * patterns. When real-time events are wired (WebSocket or polling),
 * replace the synthetic array with actual store queries.
 */

export type TickerEvent = {
  id: string;
  kind: "bet" | "win" | "resolve" | "milestone";
  side?: "YES" | "NO";
  marketTitle: string;
  amount?: number;
  timeAgo: string;
};

/** Realistic ticker events — rotates through Tanzania-relevant content. */
const FEED: TickerEvent[] = [
  { id: "t1",  kind: "bet",       side: "YES", marketTitle: "Simba SC wins NBC Premier League 2026-27",          amount: 45_000,    timeAgo: "2m ago" },
  { id: "t2",  kind: "win",       side: "YES", marketTitle: "Long rains begin before 15 Apr",                    amount: 180_000,   timeAgo: "5m ago" },
  { id: "t3",  kind: "bet",       side: "NO",  marketTitle: "USD/TZS closes < 2,650 in Q2",                     amount: 12_000,    timeAgo: "8m ago" },
  { id: "t4",  kind: "resolve",   side: "YES", marketTitle: "Bitcoin closes above $100,000 on 1 July",          amount: 2_400_000, timeAgo: "12m ago" },
  { id: "t5",  kind: "bet",       side: "YES", marketTitle: "Dar es Salaam rainfall > 200mm July",              amount: 30_000,    timeAgo: "18m ago" },
  { id: "t6",  kind: "milestone",              marketTitle: "50pick reaches 1,000 predictions this week",                           timeAgo: "25m ago" },
  { id: "t7",  kind: "bet",       side: "NO",  marketTitle: "BoT holds rate at next MPC",                       amount: 75_000,    timeAgo: "32m ago" },
  { id: "t8",  kind: "win",       side: "NO",  marketTitle: "Kilimanjaro tops 50k climbs this year",            amount: 320_000,   timeAgo: "40m ago" },
  { id: "t9",  kind: "bet",       side: "YES", marketTitle: "Young Africans qualifies for CAF group stage",     amount: 55_000,    timeAgo: "48m ago" },
  { id: "t10", kind: "resolve",   side: "NO",  marketTitle: "SGR Dodoma-Singida begins operations before Dec",  amount: 890_000,   timeAgo: "1h ago" },
  { id: "t11", kind: "bet",       side: "YES", marketTitle: "Diamond Platnumz releases new album before Oct",   amount: 20_000,    timeAgo: "1h ago" },
  { id: "t12", kind: "win",       side: "YES", marketTitle: "Tanzania GDP growth exceeds 6% in Q3",             amount: 450_000,   timeAgo: "2h ago" },
];

export function getTickerFeed(limit = 12): TickerEvent[] {
  return FEED.slice(0, limit);
}
