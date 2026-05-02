import { BetsClient, type MapigoBetView } from "./bets-client";
import { myBets as mockBets, teams } from "@/lib/mock-data";
import { currentSession } from "@/lib/server/auth-service";
import { getBetsForUser } from "@/lib/server/bet-service";
import { getMyMapigoBets } from "@/lib/server/mapigo-service";
import type { Bet as MockBet } from "@/lib/mock-data";

export const metadata = { title: "My bets · Madau yangu" };
export const dynamic = "force-dynamic";

export default async function MyBetsPage() {
  const session = await currentSession();

  let bets: MockBet[] = mockBets;
  let mapigoBets: MapigoBetView[] = [];
  let isDemo = false;

  if (session) {
    isDemo = !!session.demoMode;
    bets = getBetsForUser(session.userId).map<MockBet>((b) => {
      const homeShort = b.matchLabel.split(" vs ")[0] ?? "Home";
      const awayShort = b.matchLabel.split(" vs ")[1] ?? "Away";
      const homeTeam = Object.values(teams).find((t) => t.shortName === homeShort) ?? Object.values(teams)[0];
      const awayTeam = Object.values(teams).find((t) => t.shortName === awayShort) ?? Object.values(teams)[1];
      const status: MockBet["status"] =
        b.status === "WON" ? "won" :
        b.status === "LOST" ? "lost" :
        b.status === "VOIDED" ? "voided" :
        b.status === "CASHED_OUT" ? "cashedout" :
        "placed";
      return {
        id: b.id,
        matchId: b.matchId,
        match: { home: homeTeam, away: awayTeam, league: b.league },
        windowKind: b.windowKind,
        windowLabel: b.windowLabel,
        outcome: b.outcome,
        stake: b.stake,
        potentialReturn: b.potentialReturn,
        returnAmount: b.returnAmount ?? undefined,
        status,
        placedAt: b.placedAt,
        settledAt: b.settledAt ?? undefined,
      };
    });
    mapigoBets = getMyMapigoBets(session.userId, 50).map((b) => ({
      id: b.id,
      call: b.call,
      stake: b.stake,
      potentialReturn: b.potentialReturn,
      status: b.status,
      returnAmount: b.returnAmount,
      placedAt: b.placedAt,
    }));
  }

  return <BetsClient bets={bets} mapigoBets={mapigoBets} isDemo={isDemo} />;
}
