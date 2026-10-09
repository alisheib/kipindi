// R5-G port · withdraw/loading.tsx → R5-H's convention: the drawing moves, byte for byte, into a client module beside it
// (`./withdraw-ghost.tsx`, its words from useT, its head from money-names with the `journey` it is handed); the loading
// file stays on the server, asks the journey answer alone and hands the drawing only that.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const DIR = "F:/kipindi-r5g/src/app/wallet/withdraw/";
const s = readFileSync(DIR + "loading.tsx", "utf8");
const EOL = "\r\n";
const theirsEnd = s.indexOf(">>>>>>> theirs");
if (theirsEnd < 0) throw new Error("conflict block not found");
// The drawing's body: everything after the conflict (from R5-H's DG-P-04 note through the end), as the tip writes it.
const body = s.slice(s.indexOf(EOL, theirsEnd) + EOL.length);
if (!body.startsWith("  /* ⭐ DG-P-04") || !body.includes("eyebrow={names.eyebrow}") || !body.includes("title={names.heading}")) throw new Error("unexpected body");
const ghost = [
  '"use client";',
  "",
  'import { BrandSpinner } from "@/components/brand";',
  'import { useT } from "@/lib/i18n";',
  'import { PageContainer } from "@/components/layout/page-container";',
  'import { PageHeader } from "@/components/ui/page-header";',
  'import { BackLinkGhost } from "@/components/ui/back-link";',
  'import { PageHero } from "@/components/ui/page-hero";',
  'import { I } from "@/components/ui/glyphs";',
  'import { withdrawNames } from "@/lib/journey/money-names";',
  "",
  "/**",
  " * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so",
  " * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —",
  " * `components/ui/page-loader.tsx` has the convention.",
  " * ⭐ AND ITS HEAD IS THE PAGE'S FOR EITHER READER (R5-G, 2026-10-09, G-1): `journey` — the one answer `loading.tsx` (this",
  " * folder) asks on the server — picks the page's own names (`money-names.ts`): \"Toa pesa\" under the Wallet for a journey",
  " * reader, \"Toa fedha\" under \"TOA\" for everybody else, from the function that names the page, so the words land where",
  " * the page's do. The drawing moved here from `loading.tsx` byte for byte (R5-H's convention: a loading file that needs an",
  " * answer stays a server file, its drawing beside it).",
  " */",
  "export function WithdrawGhost({ journey }: { journey: boolean }) {",
  "  const { t } = useT();",
  "  const names = withdrawNames(t, journey);",
].join(EOL) + EOL + body;
const loading = [
  'import { resolveSimpleJourney } from "@/lib/server/journey-preview";',
  'import { WithdrawGhost } from "./withdraw-ghost";',
  "",
  "/**",
  " * /wallet/withdraw loading skeleton — the drawing is `withdraw-ghost.tsx` (this folder), client code that reads its own",
  " * words (round 5's follow-up, R5-H · G-2: a refresh carries one reference — `components/ui/page-loader.tsx` has the",
  " * convention). This file asks the server the one thing the browser cannot read (R5-G, G-1): whether this reader is in the",
  " * journey, whose withdraw screen is \"Toa pesa\" under the Wallet (`money-names.ts`) — the shell's own cached answer, as",
  " * `positions/loading.tsx` asks it — and hands the drawing only that.",
  " */",
  "export default async function WithdrawLoading() {",
  "  const { journey } = await resolveSimpleJourney();",
  "  return <WithdrawGhost journey={journey} />;",
  "}",
  "",
].join(EOL);
if (existsSync(DIR + "withdraw-ghost.tsx")) throw new Error("withdraw-ghost.tsx exists already");
writeFileSync(DIR + "withdraw-ghost.tsx", ghost);
writeFileSync(DIR + "loading.tsx", loading);
console.log("withdraw split: withdraw-ghost.tsx", ghost.split(EOL).length, "lines; loading.tsx", loading.split(EOL).length, "lines");
