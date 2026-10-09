// R5-G port · deposit-ghost.tsx: R5-H's client drawing (its words from useT) + R5-G's journey answer and names.
import { resolve } from "./resolve-blocks.mjs";
resolve("F:/kipindi-r5g/src/app/wallet/deposit/deposit-ghost.tsx", [
  [
    'import { useT } from "@/lib/i18n";',
    'import { depositNames } from "@/lib/journey/money-names";',
  ],
  [
    " * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` (this folder) renders it,",
    " * and the journey's root loading state (`components/journey/route-ghost.tsx`) draws it on a move to /wallet/deposit.",
    " * ⭐ CLIENT CODE THAT READS ITS OWN WORDS (round 5's follow-up, R5-H · G-2): so a refresh carries its reference, not this",
    " * tree, and the loading file hands it only the one answer the browser cannot read — `components/ui/page-loader.tsx` has",
    " * the convention.",
    " * ⭐ AND ITS HEAD IS THE PAGE'S FOR EITHER READER (R5-G, 2026-10-09, G-1): `journey` — the answer `loading.tsx` asks on the",
    " * server, and `true` from the root ghost, which only a journey reader is drawn — picks the page's own names",
    " * (`money-names.ts`): \"Weka pesa\" under the Wallet for a journey reader, today's \"Amana\" under \"WEKA PESA\" for everybody",
    " * else. The function that names the page names its ghost, so the ghost's words land where the page's do.",
    " */",
    "export function DepositGhost({ journey }: { journey: boolean }) {",
    "  const { t } = useT();",
    "  const names = depositNames(t, journey);",
  ],
]);
