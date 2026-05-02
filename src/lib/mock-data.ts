// Sprint 0 mock data — replaced by API integrations in Sprint 3.
// All names/numbers fictional. TZS amounts realistic for the TZ market.

export type Team = {
  id: string;
  name: string;
  shortName: string;
  color: string;
  initials: string;
};

export type WindowKind = "W_0_15" | "W_15_30" | "W_30_45" | "W_45_60" | "W_FT";
export type WindowStatus = "open" | "closed" | "settled" | "live";
export type MatchStatus = "scheduled" | "live" | "halftime" | "finished";
export type Outcome = "home" | "away" | "draw";

export type Match = {
  id: string;
  league: string;
  home: Team;
  away: Team;
  status: MatchStatus;
  minute?: number;
  homeScore: number;
  awayScore: number;
  kickoff: string;
  momentum: number; // -100..100, positive = away dominance
  windows: { kind: WindowKind; label: string; status: WindowStatus; pool: number; payRate: number; homeStake: number; drawStake: number; awayStake: number }[];
  hot?: boolean; // surge in last 10 min
  growth1h?: number; // pct growth in pool over last hour
  poolHistory: number[]; // last ~60 data points for sparkline
};

export const teams: Record<string, Team> = {
  sim:    { id: "sim",    name: "Simba SC",          shortName: "Simba",   color: "#C0392B", initials: "SC" },
  yng:    { id: "yng",    name: "Young Africans",    shortName: "Yanga",   color: "#1F7A4D", initials: "YA" },
  asu:    { id: "asu",    name: "Azam FC",           shortName: "Azam",    color: "#1E5A94", initials: "AZ" },
  cst:    { id: "cst",    name: "Coastal Union",     shortName: "Coastal", color: "#705210", initials: "CU" },
  kmc:    { id: "kmc",    name: "KMC FC",            shortName: "KMC",     color: "#1E3E94", initials: "KM" },
  mwa:    { id: "mwa",    name: "Mwadui United",     shortName: "Mwadui",  color: "#525B70", initials: "MW" },
  ndb:    { id: "ndb",    name: "Ndanda FC",         shortName: "Ndanda",  color: "#A5650D", initials: "ND" },
  geita:  { id: "geita",  name: "Geita Gold",        shortName: "Geita",   color: "#B58A21", initials: "GG" },
};

// Deterministic pool history: smooth growth with sinusoidal noise.
function genPool(start: number, end: number, points = 60, seed = 1): number[] {
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const eased = 1 - Math.pow(1 - t, 1.6);
    const noise = (Math.sin((i + seed) * 0.7) + Math.sin((i + seed) * 1.4) * 0.5) * (end - start) * 0.012;
    out.push(Math.max(0, Math.round(start + (end - start) * eased + noise)));
  }
  return out;
}

const windowsFor = (poolBase: number, seed = 1): Match["windows"] => [
  { kind: "W_0_15",  label: "0–15",  status: "settled", pool: Math.round(poolBase * 0.32), payRate: 1.8, homeStake: poolBase * 0.32 * 0.45, drawStake: poolBase * 0.32 * 0.20, awayStake: poolBase * 0.32 * 0.35 },
  { kind: "W_15_30", label: "15–30", status: "live",    pool: Math.round(poolBase * 0.41), payRate: 2.1, homeStake: poolBase * 0.41 * 0.52, drawStake: poolBase * 0.41 * 0.18, awayStake: poolBase * 0.41 * 0.30 },
  { kind: "W_30_45", label: "30–45", status: "open",    pool: Math.round(poolBase * 0.18), payRate: 2.4, homeStake: poolBase * 0.18 * 0.40, drawStake: poolBase * 0.18 * 0.25, awayStake: poolBase * 0.18 * 0.35 },
  { kind: "W_45_60", label: "45–60", status: "open",    pool: Math.round(poolBase * 0.06), payRate: 3.1, homeStake: poolBase * 0.06 * 0.38, drawStake: poolBase * 0.06 * 0.30, awayStake: poolBase * 0.06 * 0.32 },
  { kind: "W_FT",    label: "FT",    status: "open",    pool: Math.round(poolBase * 0.03), payRate: 4.2, homeStake: poolBase * 0.03 * 0.42, drawStake: poolBase * 0.03 * 0.28, awayStake: poolBase * 0.03 * 0.30 },
];

export const matches: Match[] = [
  {
    id: "m1", league: "NBC Premier League",
    home: teams.sim, away: teams.yng,
    status: "live", minute: 32, homeScore: 1, awayScore: 1,
    kickoff: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    momentum: 18,
    windows: windowsFor(8_400_000, 1),
    hot: true, growth1h: 28.4,
    poolHistory: genPool(6_550_000, 8_400_000, 60, 1),
  },
  {
    id: "m2", league: "NBC Premier League",
    home: teams.asu, away: teams.cst,
    status: "live", minute: 18, homeScore: 0, awayScore: 0,
    kickoff: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    momentum: -32,
    windows: windowsFor(2_120_000, 7),
    hot: false, growth1h: 8.6,
    poolHistory: genPool(1_950_000, 2_120_000, 60, 7),
  },
  {
    id: "m3", league: "NBC Premier League",
    home: teams.kmc, away: teams.mwa,
    status: "scheduled", homeScore: 0, awayScore: 0,
    kickoff: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    momentum: 0,
    windows: windowsFor(620_000, 3).map((w) => ({ ...w, status: "open" as WindowStatus })),
    growth1h: 14.0,
    poolHistory: genPool(540_000, 620_000, 60, 3),
  },
  {
    id: "m4", league: "NBC Premier League",
    home: teams.ndb, away: teams.geita,
    status: "scheduled", homeScore: 0, awayScore: 0,
    kickoff: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    momentum: 0,
    windows: windowsFor(310_000, 5).map((w) => ({ ...w, status: "open" as WindowStatus })),
    growth1h: 5.2,
    poolHistory: genPool(294_000, 310_000, 60, 5),
  },
  {
    id: "m5", league: "Tanzania FA Cup",
    home: teams.yng, away: teams.asu,
    status: "finished", homeScore: 2, awayScore: 1,
    kickoff: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    momentum: 0,
    windows: windowsFor(12_500_000, 9).map((w) => ({ ...w, status: "settled" as WindowStatus })),
    growth1h: 0,
    poolHistory: genPool(11_400_000, 12_500_000, 60, 9),
  },
];

export type Bet = {
  id: string;
  matchId: string;
  match: { home: Team; away: Team; league: string };
  windowKind: WindowKind;
  windowLabel: string;
  outcome: Outcome;
  stake: number;
  potentialReturn: number;
  returnAmount?: number;
  status: "placed" | "won" | "lost" | "cashedout" | "voided";
  placedAt: string;
  settledAt?: string;
};

export const myBets: Bet[] = [
  {
    id: "b9921", matchId: "m1",
    match: { home: teams.sim, away: teams.yng, league: "NBC Premier League" },
    windowKind: "W_15_30", windowLabel: "15–30",
    outcome: "home", stake: 1_000, potentialReturn: 2_400,
    status: "placed",
    placedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: "b9912", matchId: "m1",
    match: { home: teams.sim, away: teams.yng, league: "NBC Premier League" },
    windowKind: "W_30_45", windowLabel: "30–45",
    outcome: "draw", stake: 500, potentialReturn: 1_300,
    status: "placed",
    placedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  },
  {
    id: "b9810", matchId: "m5",
    match: { home: teams.yng, away: teams.asu, league: "Tanzania FA Cup" },
    windowKind: "W_0_15", windowLabel: "0–15",
    outcome: "home", stake: 2_000, potentialReturn: 4_700, returnAmount: 4_700,
    status: "won",
    placedAt: new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString(),
    settledAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "b9805", matchId: "m5",
    match: { home: teams.yng, away: teams.asu, league: "Tanzania FA Cup" },
    windowKind: "W_FT", windowLabel: "FT",
    outcome: "draw", stake: 1_500, potentialReturn: 0,
    status: "lost",
    placedAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    settledAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export type Transaction = {
  id: string;
  type: "deposit" | "withdraw" | "bet" | "payout" | "refund";
  amount: number;
  status: "pending" | "confirmed" | "failed" | "review";
  provider?: string;
  ref: string;
  description: string;
  at: string;
};

export const transactions: Transaction[] = [
  { id: "t1", type: "payout",   amount:  4_700, status: "confirmed", ref: "P-77821",  description: "Bet b9810 settled", at: new Date(Date.now() - 25 * 3600e3).toISOString() },
  { id: "t2", type: "deposit",  amount: 10_000, status: "confirmed", provider: "M-Pesa",       ref: "D-88210", description: "M-Pesa deposit",      at: new Date(Date.now() - 26 * 3600e3).toISOString() },
  { id: "t3", type: "bet",      amount: -1_000, status: "confirmed", ref: "B-99221",  description: "Stake · Simba 15–30 Win", at: new Date(Date.now() - 10 * 60e3).toISOString() },
  { id: "t4", type: "bet",      amount:   -500, status: "confirmed", ref: "B-99212",  description: "Stake · Simba 30–45 Draw", at: new Date(Date.now() - 6 * 60e3).toISOString() },
  { id: "t5", type: "withdraw", amount: -3_000, status: "review",    provider: "Tigo Pesa",    ref: "W-33102", description: "Withdrawal · AML review", at: new Date(Date.now() - 4 * 3600e3).toISOString() },
  { id: "t6", type: "deposit",  amount:  5_000, status: "confirmed", provider: "Airtel Money", ref: "D-88219", description: "Airtel Money deposit", at: new Date(Date.now() - 50 * 3600e3).toISOString() },
];

export type LeaderRow = {
  rank: number;
  prevRank: number;
  name: string;
  initials: string;
  winRate: number;
  roi: number;
  streak: number;
  region: string;
  totalStake?: number;
  netReturn?: number;
};

export const leaderboard: LeaderRow[] = [
  { rank: 1, prevRank: 1, name: "Mwita J.",    initials: "MJ", winRate: 72.4, roi: 38.1, streak: 8, region: "Dar",     totalStake: 480_000, netReturn: 183_000 },
  { rank: 2, prevRank: 4, name: "Asha M.",     initials: "AM", winRate: 68.2, roi: 31.6, streak: 5, region: "Mwanza",  totalStake: 320_000, netReturn: 101_000 },
  { rank: 3, prevRank: 2, name: "Hassan K.",   initials: "HK", winRate: 64.0, roi: 27.9, streak: 3, region: "Arusha",  totalStake: 410_000, netReturn:  114_000 },
  { rank: 4, prevRank: 3, name: "Neema B.",    initials: "NB", winRate: 61.7, roi: 22.3, streak: 4, region: "Dar",     totalStake: 290_000, netReturn:   65_000 },
  { rank: 5, prevRank: 9, name: "You",         initials: "AS", winRate: 58.3, roi: 18.4, streak: 2, region: "Dar",     totalStake: 120_000, netReturn:   22_000 },
  { rank: 6, prevRank: 5, name: "Salim D.",    initials: "SD", winRate: 56.1, roi: 15.0, streak: 1, region: "Tanga",   totalStake: 180_000, netReturn:   27_000 },
  { rank: 7, prevRank: 7, name: "Grace O.",    initials: "GO", winRate: 54.6, roi: 12.7, streak: 0, region: "Dodoma",  totalStake: 210_000, netReturn:   27_000 },
  { rank: 8, prevRank: 6, name: "Juma R.",     initials: "JR", winRate: 52.9, roi: 10.5, streak: 0, region: "Zanzibar",totalStake: 150_000, netReturn:   16_000 },
];

export const wallet = {
  balance: 12_400,
  pending: 0,
  hold: 3_000,
  currency: "TZS",
  // 30-day balance trend (TZS), monotonic-ish growth
  balanceHistory: [4200, 4500, 4400, 4700, 5100, 5400, 5200, 6000, 5800, 6400, 6800, 7200, 7100, 7800, 8200, 8000, 8600, 9000, 9400, 9300, 9800, 10200, 10500, 10300, 10900, 11200, 11600, 11900, 12100, 12400],
  netPnl7d: +2_400,
  netPnl30d: +6_900,
};

export const user = {
  id: "u_ali",
  name: "Ali",
  initials: "AS",
  phone: "+2557*****99",
  region: "Dar es Salaam",
  joinedAt: "2026-04-01",
  kycStatus: "in_progress" as "not_started" | "in_progress" | "approved" | "rejected",
  streak: 2,
  locale: "sw" as "en" | "sw",
};

// User performance metrics
export const userPerf = {
  winRate7d: 58.3,  winRate30d: 62.1,  winRateDelta: +3.4,
  roi7d: 18.4,      roi30d: 22.1,      roiDelta: -1.7,
  totalStake30d: 84_500,
  totalReturn30d: 103_300,
  biggestWin: 18_400,
  longestStreak: 12,
  // ROI heatmap: rows = time-window, cols = day-of-week (Mon..Sun)
  windowDayHeatmap: [
    [ 12,  -8,  24,  18,  -2,  31,  44 ], // 0–15
    [  8,  22,  35,  46,  18,  52,  62 ], // 15–30
    [  4,  16,  28,  31,  -4,  22,  38 ], // 30–45
    [-12,   2,  -6,  14,  -8,  18,  26 ], // 45–60
    [ 18,  24,  32,  41,  19,  44,  52 ], // FT
  ],
  // Daily net P/L last 14 days (TZS)
  dailyPnl: [-200, 400, 800, -300, 1500, 600, -100, 1100, 900, -400, 1700, 800, 1200, 2400],
};

// Live ticker events — recent payouts and big bets across the platform
export type TickerEvent = {
  id: string;
  type: "win" | "deposit" | "join" | "streak" | "jackpot";
  user: string;
  detail: string;
  amount?: number;
  at: number; // ms ago
};

export const tickerEvents: TickerEvent[] = [
  { id: "tk1",  type: "win",     user: "Mwita J.", detail: "Simba 15–30 Win",      amount: 4_700, at:    18 },
  { id: "tk2",  type: "win",     user: "Asha M.",  detail: "Azam 0–15 Draw",       amount: 2_300, at:    34 },
  { id: "tk3",  type: "join",    user: "Salim D.", detail: "joined Tribal Clash",                  at:    45 },
  { id: "tk4",  type: "win",     user: "Hassan K.",detail: "Yanga FT Win",         amount: 8_900, at:    62 },
  { id: "tk5",  type: "deposit", user: "Neema B.", detail: "M-Pesa deposit",       amount: 5_000, at:    87 },
  { id: "tk6",  type: "streak",  user: "Mwita J.", detail: "8-bet streak unlocked",                at:   140 },
  { id: "tk7",  type: "win",     user: "Grace O.", detail: "KMC 30–45 Win",        amount: 1_800, at:   180 },
  { id: "tk8",  type: "jackpot", user: "Juma R.",  detail: "Pool crossed TZS 10M",                 at:   220 },
  { id: "tk9",  type: "win",     user: "Anna T.",  detail: "Coastal 15–30 Draw",   amount: 3_400, at:   260 },
  { id: "tk10", type: "deposit", user: "Bahati K.",detail: "Tigo Pesa deposit",    amount: 8_000, at:   310 },
];

// Recent bets feed (last 30 across platform — used in match detail right rail)
export type RecentBet = {
  id: string;
  user: string;
  initials: string;
  windowKind: WindowKind;
  windowLabel: string;
  outcome: Outcome;
  stake: number;
  at: number;        // ms ago
  region: string;
};

export const recentBetsFor = (matchId: string): RecentBet[] => {
  const seed = matchId.charCodeAt(matchId.length - 1);
  const base: Omit<RecentBet, "id" | "at">[] = [
    { user: "Mwita J.",  initials: "MJ", windowKind: "W_15_30", windowLabel: "15–30", outcome: "home", stake: 5_000, region: "Dar" },
    { user: "Asha M.",   initials: "AM", windowKind: "W_30_45", windowLabel: "30–45", outcome: "draw", stake: 1_200, region: "Mwanza" },
    { user: "Hassan K.", initials: "HK", windowKind: "W_15_30", windowLabel: "15–30", outcome: "away", stake: 2_500, region: "Arusha" },
    { user: "Neema B.",  initials: "NB", windowKind: "W_45_60", windowLabel: "45–60", outcome: "home", stake:   800, region: "Dar" },
    { user: "Salim D.",  initials: "SD", windowKind: "W_FT",    windowLabel: "FT",    outcome: "draw", stake: 3_200, region: "Tanga" },
    { user: "Grace O.",  initials: "GO", windowKind: "W_15_30", windowLabel: "15–30", outcome: "home", stake:   600, region: "Dodoma" },
    { user: "Juma R.",   initials: "JR", windowKind: "W_30_45", windowLabel: "30–45", outcome: "away", stake: 1_800, region: "Zanzibar" },
    { user: "Bahati K.", initials: "BK", windowKind: "W_15_30", windowLabel: "15–30", outcome: "home", stake: 4_400, region: "Dar" },
    { user: "Anna T.",   initials: "AT", windowKind: "W_45_60", windowLabel: "45–60", outcome: "draw", stake:   700, region: "Mbeya" },
    { user: "Yusuf P.",  initials: "YP", windowKind: "W_30_45", windowLabel: "30–45", outcome: "home", stake: 1_100, region: "Arusha" },
    { user: "Halima R.", initials: "HR", windowKind: "W_15_30", windowLabel: "15–30", outcome: "away", stake: 2_000, region: "Dar" },
    { user: "Joseph M.", initials: "JM", windowKind: "W_FT",    windowLabel: "FT",    outcome: "home", stake:   500, region: "Tanga" },
  ];
  return base.map((b, i) => ({ ...b, id: `${matchId}-r${i}`, at: 12 + i * 14 + (seed % 5) }));
};

// Hot windows — surges in last 10 min, about to close, etc.
export type HotWindow = {
  matchId: string;
  matchLabel: string;
  windowKind: WindowKind;
  windowLabel: string;
  pool: number;
  growth: number;     // pct in last 10 min
  closesInMin: number;
};

export const hotWindows: HotWindow[] = [
  { matchId: "m1", matchLabel: "Simba vs Yanga",     windowKind: "W_15_30", windowLabel: "15–30", pool: 3_440_000, growth: 38.6, closesInMin: 4 },
  { matchId: "m1", matchLabel: "Simba vs Yanga",     windowKind: "W_30_45", windowLabel: "30–45", pool: 1_510_000, growth: 22.1, closesInMin: 18 },
  { matchId: "m2", matchLabel: "Azam vs Coastal",    windowKind: "W_15_30", windowLabel: "15–30", pool:   870_000, growth: 14.2, closesInMin: 12 },
];

// Aggregate platform stats for the home hero
export const platformStats = {
  totalLivePool: matches.reduce((s, m) => m.status === "live" ? s + m.windows.reduce((a, w) => a + w.pool, 0) : s, 0),
  liveMatches: matches.filter((m) => m.status === "live").length,
  upcomingMatches: matches.filter((m) => m.status === "scheduled").length,
  playersOnline: 2_412,
  poolGrowth1h: +12.4, // pct
  // 24-hour pool trend across all matches (24 points)
  poolTrend24h: [42, 48, 54, 51, 58, 64, 69, 72, 71, 76, 82, 88, 94, 98, 102, 108, 115, 122, 128, 134, 141, 148, 156, 162].map((v) => v * 100_000),
};
