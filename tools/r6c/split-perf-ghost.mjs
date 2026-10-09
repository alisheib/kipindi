// Split /positions/performance's loading file (R5-H's convention, as R5-G did for the withdraw screen): the drawing moves
// to performance-ghost.tsx byte for byte but for its name, its prop and the eyebrow's journey arm; loading.tsx becomes the
// server file that asks the journey answer. CRLF in, CRLF out.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const DIR = "F:/kipindi-r6c/src/app/positions/performance/";
const src = readFileSync(DIR + "loading.tsx", "utf8");
if (existsSync(DIR + "performance-ghost.tsx")) throw new Error("performance-ghost.tsx exists already");
const NL = "\r\n";
const lines = src.split(NL);
if (lines.length < 10 || src.includes("\n") && !src.includes("\r\n")) throw new Error("expected CRLF");
const fnAt = lines.findIndex((l) => l === "export default function PerformanceLoading() {");
if (fnAt < 0) throw new Error("no PerformanceLoading");
const docAt = lines.findIndex((l) => l === "/**");
const head = lines.slice(0, docAt); // "use client" + imports
const body = lines.slice(fnAt + 1);
const EYEBROW = "      <PageHeader eyebrow={t.common.positions} title={t.performance.title} />";
const eyebrowAt = body.indexOf(EYEBROW);
if (eyebrowAt < 0) throw new Error("no eyebrow line");
body[eyebrowAt] = "      <PageHeader eyebrow={journey ? t.journey.tabTickets : t.common.positions} title={t.performance.title} />";
const doc = [
  "/**",
  " * /positions/performance loading skeleton — moved here from `loading.tsx` (this folder) byte for byte but for its name,",
  " * its prop and the eyebrow's journey arm (round 6, 2026-10-09, review C14): the page calls its section \"Tiketi zangu\" in",
  " * the journey since this round, so the drawing must land on the same words — the ghost's words land where the page's do",
  " * (R4-J / R5-D). R5-H's convention (`components/ui/page-loader.tsx`): a loading file that needs a server answer stays a",
  " * server file and hands the drawing only that answer, as `wallet/withdraw/loading.tsx` hands `WithdrawGhost` its own.",
  " * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so",
  " * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was.",
  " */",
  "export function PerformanceGhost({ journey }: { journey: boolean }) {",
];
writeFileSync(DIR + "performance-ghost.tsx", [...head, ...doc, ...body].join(NL));
const loading = [
  'import { resolveSimpleJourney } from "@/lib/server/journey-preview";',
  'import { PerformanceGhost } from "./performance-ghost";',
  "",
  "/**",
  " * /positions/performance loading skeleton — the drawing is `performance-ghost.tsx` (this folder), client code that reads",
  " * its own words (R5-H · G-2: a refresh carries one reference — `components/ui/page-loader.tsx` has the convention). This",
  " * file asks the server the one thing the browser cannot read (round 6, review C14): whether this reader is in the journey,",
  " * where the page's section is \"Tiketi zangu\" — the shell's own cached answer, as `positions/loading.tsx` and",
  " * `wallet/withdraw/loading.tsx` ask it — and hands the drawing only that.",
  " */",
  "export default async function PerformanceLoading() {",
  "  const { journey } = await resolveSimpleJourney();",
  "  return <PerformanceGhost journey={journey} />;",
  "}",
  "",
];
writeFileSync(DIR + "loading.tsx", loading.join(NL));
console.log("split: performance-ghost.tsx", [...head, ...doc, ...body].length, "lines; loading.tsx", loading.length, "lines");
