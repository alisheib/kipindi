// R5-G port · deposit/loading.tsx: a server file that asks the journey answer alone and hands it to the client drawing.
import { resolve } from "./resolve-blocks.mjs";
resolve("F:/kipindi-r5g/src/app/wallet/deposit/loading.tsx", [
  [
    'import { resolveSimpleJourney } from "@/lib/server/journey-preview";',
    'import { DepositGhost } from "./deposit-ghost";',
    "",
    "/**",
    " * /wallet/deposit loading skeleton — the drawing is `deposit-ghost.tsx` (round 5, review G1: the journey's root loading",
    " * state draws the same one). It reads its own words in the browser since round 5's follow-up (R5-H · G-2), so a refresh",
    " * carries one reference — `components/ui/page-loader.tsx` has the convention. This file asks the server the one thing the",
    " * browser cannot read (R5-G, G-1): whether this reader is in the journey, whose deposit screen is \"Weka pesa\" under the",
    " * Wallet (`money-names.ts`) — the shell's own cached answer, as `positions/loading.tsx` asks it — and hands the drawing",
    " * only that.",
    " */",
    "export default async function DepositLoading() {",
    "  const { journey } = await resolveSimpleJourney();",
    "  return <DepositGhost journey={journey} />;",
  ],
]);
