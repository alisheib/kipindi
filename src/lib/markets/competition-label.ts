/**
 * ONE localised label per competition (the Vodacom plan S2). The keys live in `competitions.ts`; the words live in
 * the dictionary's `journey` namespace until the S15 convergence (VODACOM-PLAN §3 rule). Type-only imports, so
 * nothing server-side reaches a client bundle through this file.
 */
import type { Competition } from "./competitions";
import type { Dict } from "@/lib/i18n-dict";

export function competitionLabel(t: Dict, c: Competition): string {
  switch (c) {
    case "ligi-kuu": return t.journey.compLigiKuu;
    case "asfc": return t.journey.compAsfc;
    case "epl": return t.journey.compEpl;
    case "ucl": return t.journey.compUcl;
    case "uel": return t.journey.compUel;
    case "laliga": return t.journey.compLaliga;
    case "serie-a": return t.journey.compSerieA;
    case "bundesliga": return t.journey.compBundesliga;
    case "ligue-1": return t.journey.compLigue1;
    case "caf-cl": return t.journey.compCafCl;
    case "caf-cc": return t.journey.compCafCc;
    case "afcon": return t.journey.compAfcon;
    case "world-cup": return t.journey.compWorldCup;
    case "nba": return t.journey.compNba;
  }
}
