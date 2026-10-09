// R5-H · G-2 part A — the kit's loader (the convention's home), the agent ghost, and the drawings the journey's root ghost
// shares with a segment (Juu/Chini, the deposit, the round history, a question, the provider's return), plus route-ghost.
const { once, edit } = require("./lib.cjs");

/* ── 1 · the kit's loader: client code, its words from useT — and the convention, written once ─────────────────────── */
edit("src/components/ui/page-loader.tsx", (s) => {
  s = `"use client";\n\n${s}`;
  s = once(s, " * Reads kp-locale from cookies server-side so even skeletons render in the\n * user's selected language.\n",
    " * Its words are the client dictionary's (`useT`), in the language the root layout hands the provider — the kp-locale\n"
    + " * cookie, read on the server — so even skeletons render in the user's selected language (the convention below).\n", "pl.locale");
  s = once(s, " * `form` / `board`, so the migration was a zero-pixel change.\n */\n",
    " * `form` / `board`, so the migration was a zero-pixel change.\n"
    + " *\n"
    + " * ⭐ EVERY PLAYER LOADING DRAWING IS CLIENT CODE (2026-10-09, the visual pass round 5's follow-up, R5-H · G-2 — the\n"
    + " * convention for every `loading.tsx` a player can reach, as R5-D's G1 made it for the root's). Next sends a segment's\n"
    + " * loading element again with every payload that renders the segment: the document, each move into it, and every\n"
    + " * `router.refresh()` — the RefreshPoller's beat on the polled pages (every 15–60 s; 5 s on a round awaiting its\n"
    + " * result), each bet's refresh, a change of language. Drawn by a server component, every node of the drawing rode in\n"
    + " * each of those (measured: up to 9.6 KB of Flight JSON per refresh, /wallet/receipts). Drawn by a client component,\n"
    + " * the element is one reference and the few props only the server can answer; the drawing is code, fetched once with\n"
    + " * the segment and kept. So:\n"
    + " *   · the drawing is a \"use client\" component that reads its words with `useT()` — the client dictionary every page\n"
    + " *     already carries, at the provider's language, which is the cookie the server reads — so the server's HTML is\n"
    + " *     byte for byte what it was and the first paint is unchanged;\n"
    + " *   · a loading file that needs no server answer IS that drawing (`\"use client\"` at its top); one that needs one (the\n"
    + " *     journey answer, a feature state) stays a server file that asks it and hands the drawing only the answer, the\n"
    + " *     drawing beside it (`./<name>-ghost.tsx`, imported relatively, so `test:measure` still pairs the tiers);\n"
    + " *   · a JOURNEY picture is never a module a server file imports: a server file's client imports join its segment's\n"
    + " *     first load for every reader (VODACOM-PLAN §0h points 20, 21), so a journey reader's loading file hands back the\n"
    + " *     journey's route ghost pinned to its page (`LazyJourneyRouteGhost at=…`, R5-D's binding), whose code a journey\n"
    + " *     reader's browser already holds and a classic reader's never fetches.\n"
    + " * ⚠️ Only the transport changes: a plain client reference, which Flight starts fetching the moment a payload (or a\n"
    + " * link's prefetch) names it — not `next/dynamic`, which waits for the render; that suits the root's journey-only set,\n"
    + " * not a drawing every reader of the segment is shown. The chunks' sizes are a production build's to measure (a lock\n"
    + " * turn's). `test:visual-pass-r5h` §1 holds every player loading file to this and renders each one's markup.\n"
    + " */\n", "pl.convention");
  s = once(s, 'import { cookies } from "next/headers";\nimport { BrandSpinner } from "@/components/brand";\nimport { PageContainer, type MeasureTier } from "@/components/layout/page-container";\nimport { dict, localeOrDefault, type Locale } from "@/lib/i18n-dict";\n',
    'import { BrandSpinner } from "@/components/brand";\nimport { PageContainer, type MeasureTier } from "@/components/layout/page-container";\nimport { useT } from "@/lib/i18n";\n', "pl.imports");
  s = once(s, "export async function PageLoader({", "export function PageLoader({", "pl.fn");
  s = once(s, '  const jar = await cookies();\n  const locale: Locale = localeOrDefault(jar.get("kp-locale")?.value);\n  const t = dict[locale];\n',
    "  const { t } = useT();\n", "pl.words");
  return s;
});

/* ── 2 · the agent programme's shared ghost: no words at all — client code ───────────────────────────────────────── */
edit("src/app/agent/loading-shared.tsx", (s) => {
  s = `"use client";\n\n${s}`;
  s = once(s, " * renders, so a skeleton can never describe a page that is not coming (§5f's lesson on\n * `wallet/loading.tsx`).\n */\n",
    " * renders, so a skeleton can never describe a page that is not coming (§5f's lesson on\n * `wallet/loading.tsx`).\n"
    + " * ⭐ CLIENT CODE (round 5's follow-up, R5-H · G-2): it reads nothing, so each route's loading file hands it numbers and a\n"
    + " * refresh carries its reference, not the drawn tree — `components/ui/page-loader.tsx` has the convention.\n */\n", "ag.note");
  return s;
});

/* ── 3 · Juu/Chini's drawing reads its own words; its loading file asks the server nothing ─────────────────────────── */
edit("src/app/updown/updown-ghost.tsx", (s) => {
  s = once(s, 'import type { Dict } from "@/lib/i18n-dict";\n', '"use client";\n\nimport { useT } from "@/lib/i18n";\n', "ud.imports");
  s = once(s, " * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` (this folder) draws it\n"
    + " * with the words it reads on the server, and the journey's root loading state (`components/journey/route-ghost.tsx`)\n"
    + " * draws it in the browser on a move to /updown. So it reads nothing itself, and its module may load in the browser.\n */\n"
    + "export function UpDownGhost({ t }: { t: Dict }) {\n",
    " * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` (this folder) renders it,\n"
    + " * and the journey's root loading state (`components/journey/route-ghost.tsx`) draws it on a move to /updown.\n"
    + " * ⭐ CLIENT CODE THAT READS ITS OWN WORDS (round 5's follow-up, R5-H · G-2): so the loading file hands it nothing and a\n"
    + " * refresh of /updown carries its reference, not this tree — `components/ui/page-loader.tsx` has the convention.\n */\n"
    + "export function UpDownGhost() {\n  const { t } = useT();\n", "ud.fn");
  return s;
});
edit("src/app/updown/loading.tsx", () =>
  'import { UpDownGhost } from "./updown-ghost";\n\n'
  + "/**\n * /updown loading skeleton — the drawing is `updown-ghost.tsx` (round 5, review G1: the journey's root loading state\n"
  + " * draws the same one). It reads its own words in the browser since round 5's follow-up (R5-H · G-2), so this file asks\n"
  + " * the server nothing and a refresh of /updown carries one reference — `components/ui/page-loader.tsx` has the convention.\n */\n"
  + "export default function UpDownLoading() {\n  return <UpDownGhost />;\n}\n");

/* ── 4 · the deposit screen's drawing, the same way ───────────────────────────────────────────────────────────────── */
edit("src/app/wallet/deposit/deposit-ghost.tsx", (s) => {
  s = once(s, 'import { PageContainer } from "@/components/layout/page-container";\n', '"use client";\n\nimport { PageContainer } from "@/components/layout/page-container";\n', "dg.directive");
  s = once(s, 'import type { Dict } from "@/lib/i18n-dict";\n', 'import { useT } from "@/lib/i18n";\n', "dg.imports");
  s = once(s, " * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` (this folder) draws it\n"
    + " * with the words it reads on the server, and the journey's root loading state (`components/journey/route-ghost.tsx`)\n"
    + " * draws it in the browser on a move to /wallet/deposit. So it reads nothing itself, and its module may load there.\n */\n"
    + "export function DepositGhost({ t }: { t: Dict }) {\n",
    " * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` (this folder) renders it,\n"
    + " * and the journey's root loading state (`components/journey/route-ghost.tsx`) draws it on a move to /wallet/deposit.\n"
    + " * ⭐ CLIENT CODE THAT READS ITS OWN WORDS (round 5's follow-up, R5-H · G-2): so the loading file hands it nothing and a\n"
    + " * refresh carries its reference, not this tree — `components/ui/page-loader.tsx` has the convention.\n */\n"
    + "export function DepositGhost() {\n  const { t } = useT();\n", "dg.fn");
  return s;
});
edit("src/app/wallet/deposit/loading.tsx", () =>
  'import { DepositGhost } from "./deposit-ghost";\n\n'
  + "/**\n * /wallet/deposit loading skeleton — the drawing is `deposit-ghost.tsx` (round 5, review G1: the journey's root loading\n"
  + " * state draws the same one). It reads its own words in the browser since round 5's follow-up (R5-H · G-2), so this file\n"
  + " * asks the server nothing and a refresh carries one reference — `components/ui/page-loader.tsx` has the convention.\n */\n"
  + "export default function DepositLoading() {\n  return <DepositGhost />;\n}\n");

/* ── 5 · the round history: today's head, or the journey's handed in — the module loads nothing of the journey's ─── */
edit("src/app/updown/history/history-ghost.tsx", (s) => {
  s = once(s, 'import { TicketsHeadGhost } from "@/components/journey/tickets/tickets-ghost";\nimport type { Dict } from "@/lib/i18n-dict";\n',
    '"use client";\n\nimport type { ReactNode } from "react";\nimport { useT } from "@/lib/i18n";\n', "hg.imports");
  s = once(s, "/**\n * /updown/history loading skeleton, for both shells — the journey's head (Tiketi zangu's name and switch) or today's two\n"
    + " * lines, by `journey`, the answer `loading.tsx` (this folder) asks on the server (S6 WP9, VODACOM-PLAN §0h point 21).\n"
    + " * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` draws it with that answer\n"
    + " * and the words it reads, and the journey's root loading state (`components/journey/route-ghost.tsx`) draws it in the\n"
    + " * browser, for a journey reader, on a move here. So it reads nothing itself, and its module may load in the browser.\n"
    + " * ⛔ Two sibling ternaries, each where its line stood, so a reader the journey is not shown to is served today's tree.\n */\n"
    + "export function UpDownHistoryGhost({ t, journey }: { t: Dict; journey: boolean }) {\n  return (\n"
    + "    <div className=\"mx-auto w-full max-w-reading px-3 lg:px-6 py-6\" aria-busy=\"true\">\n"
    + "      {journey ? <TicketsHeadGhost t={t} /> : <div className=\"h-4 w-[128px] rounded bg-bg-elevated kp-shimmer-track\" aria-hidden />}\n"
    + "      {journey ? null : <div className=\"mt-3 h-7 w-52 rounded-md bg-bg-elevated kp-shimmer-track\" aria-hidden />}\n",
    "/**\n * /updown/history loading skeleton, for both shells — today's two head lines, or the head it is handed in their place\n"
    + " * (`journeyHead`: Tiketi zangu's name and switch, for a reader the server put in the journey — S6 WP9, VODACOM-PLAN §0h\n"
    + " * point 21; `loading.tsx` (this folder) asks which reader this is).\n"
    + " * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` renders it for a classic\n"
    + " * reader, and the journey's route ghost (`components/journey/route-ghost.tsx`) draws it with the journey's head — on a\n"
    + " * move here from the root, and from this folder's own loading file for a journey reader.\n"
    + " * ⭐ CLIENT CODE THAT READS ITS OWN WORDS (round 5's follow-up, R5-H · G-2): a refresh carries its reference, not this\n"
    + " * tree — `components/ui/page-loader.tsx` has the convention.\n"
    + " * ⛔ IT LOADS NOTHING OF THE JOURNEY'S: a classic reader's loading file renders it, so its code joins this segment's first\n"
    + " * load for every reader, and §0h point 21 sends a classic reader no script for the journey's picture. The journey's head\n"
    + " * comes in through `journeyHead`, from the one module that draws it.\n"
    + " * ⛔ Two sibling ternaries, each where its line stood, so a reader the journey is not shown to is served today's tree.\n */\n"
    + "export function UpDownHistoryGhost({ journeyHead }: { journeyHead?: ReactNode }) {\n  const { t } = useT();\n  return (\n"
    + "    <div className=\"mx-auto w-full max-w-reading px-3 lg:px-6 py-6\" aria-busy=\"true\">\n"
    + "      {journeyHead ? journeyHead : <div className=\"h-4 w-[128px] rounded bg-bg-elevated kp-shimmer-track\" aria-hidden />}\n"
    + "      {journeyHead ? null : <div className=\"mt-3 h-7 w-52 rounded-md bg-bg-elevated kp-shimmer-track\" aria-hidden />}\n", "hg.head");
  return s;
});
edit("src/app/updown/history/loading.tsx", () =>
  'import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";\n'
  + 'import { resolveSimpleJourney } from "@/lib/server/journey-preview";\n'
  + 'import { heroRailNames } from "@/lib/server/payout-rails";\n'
  + 'import { UpDownHistoryGhost } from "./history-ghost";\n\n'
  + "export default async function UpDownHistoryLoading() {\n"
  + "  /* ⭐ S6 WP9 (VODACOM-PLAN §0h point 21): the picture is chosen on the server, from the answer the page will give —\n"
  + "     Tiketi zangu's name and switch for a journey request, today's two lines for everybody else; the rest is everybody's.\n"
  + "     ⭐ DRAWN IN THE BROWSER, BOTH (round 5's follow-up, R5-H · G-2): the server asks only what the browser cannot, so a\n"
  + "     refresh (every 20 s while a round is live) carries a reference, not a tree. A journey reader is handed the journey's\n"
  + "     route ghost pinned to this page — R5-D's binding, whose code their browser already holds and a classic reader's\n"
  + "     never fetches — and everybody else `UpDownHistoryGhost` with today's head, whose module loads nothing of the\n"
  + "     journey's. `components/ui/page-loader.tsx` has the convention. */\n"
  + "  const { journey } = await resolveSimpleJourney();\n"
  + '  if (journey) return <LazyJourneyRouteGhost rails={heroRailNames(null)} at="/updown/history" />;\n'
  + "  return <UpDownHistoryGhost />;\n}\n");

/* ── 6 · a question's skeleton and the provider's return: they read nothing — client code where they stand ──────── */
edit("src/app/markets/[id]/loading.tsx", (s) => {
  s = once(s, 'import { PageContainer } from "@/components/layout/page-container";\n', '"use client";\n\nimport { PageContainer } from "@/components/layout/page-container";\n', "mid.directive");
  s = once(s, " * (`components/journey/route-ghost.tsx`) now draws this very skeleton there, on a move to a question.\n */\n",
    " * (`components/journey/route-ghost.tsx`) now draws this very skeleton there, on a move to a question.\n"
    + " * ⭐ CLIENT CODE (round 5's follow-up, R5-H · G-2): so a refresh of a question (every 15 s) carries this skeleton's\n"
    + " * reference, not its tree — `components/ui/page-loader.tsx` has the convention.\n */\n", "mid.note");
  return s;
});
edit("src/app/wallet/deposit/return/loading.tsx", (s) => {
  s = once(s, 'import { PageContainer } from "@/components/layout/page-container";\n', '"use client";\n\nimport { PageContainer } from "@/components/layout/page-container";\n', "ret.directive");
  s = once(s, " * States `receipt`, the SAME tier the page states (B7 rule 3).\n */\n",
    " * States `receipt`, the SAME tier the page states (B7 rule 3).\n"
    + " * ⭐ CLIENT CODE (round 5's follow-up, R5-H · G-2): it reads nothing, so a refresh while the deposit is pending (every\n"
    + " * 10 s) carries its reference, not its tree — `components/ui/page-loader.tsx` has the convention.\n */\n", "ret.note");
  return s;
});

/* ── 7 · the journey's route ghost: the shared drawings read their own words, and a segment may pin its page ──────── */
edit("src/components/journey/route-ghost.tsx", (s) => {
  s = once(s, " * `test:visual-pass-r4j` §3 holds every part of this file to the page it stands for.\n */\n",
    " * ⭐ A SEGMENT MAY PIN ITS PAGE (round 5's follow-up, R5-H · G-2). `/positions` and `/updown/history` draw the journey's\n"
    + " * picture for a journey reader from their OWN loading files too, and that file must not import it (a server file's\n"
    + " * client imports join its segment's first load for every reader — §0h point 21 sends a classic reader none of the\n"
    + " * journey's picture). So it hands back this binding with `at`, its page: the picture is the one drawn here for that\n"
    + " * address — whatever the address is when its boundary stands (`/positions`' boundary also stands over\n"
    + " * `/positions/performance` while a move there loads) — and the code is the chunk the root's element already loaded.\n"
    + " * Juu/Chini's, the deposit's and the round history's drawings read their own words now (`useT`), as their own loading\n"
    + " * files render them; Tiketi zangu's are drawn here alone and take them from here.\n"
    + " * `test:visual-pass-r4j` §3 holds every part of this file to the page it stands for.\n */\n", "rg.note");
  s = once(s, "export function JourneyRouteGhost({ rails }: { rails: readonly string[] }) {\n  const { t, locale } = useT();\n  return (\n    <RoutePick\n      routes={{\n"
    + "        \"/\": <HomeGhost t={t} locale={locale} rails={rails} />,\n"
    + "        \"/updown\": <UpDownGhost t={t} />,\n"
    + "        \"/positions\": <TicketsGhost t={t} />,\n"
    + "        \"/account\": <AccountGhost t={t} />,\n"
    + "        \"/updown/history\": <UpDownHistoryGhost t={t} journey />,\n"
    + "        \"/wallet/deposit\": <DepositGhost t={t} />,\n"
    + "        \"/wallet/deposit/return\": <DepositReturnLoading />,\n"
    + "      }}\n"
    + "      patterns={[[\"^/markets/[^/]+$\", <MarketDetailLoading />]]}\n"
    + "      other={<AnyPageGhost />}\n"
    + "    />\n  );\n}\n",
    "/** The pages whose own loading file hands a journey reader this ghost, pinned (`at`) — see \"A SEGMENT MAY PIN ITS PAGE\". */\n"
    + "export type JourneyGhostPage = \"/positions\" | \"/updown/history\";\n\n"
    + "export function JourneyRouteGhost({ rails, at }: { rails: readonly string[]; at?: JourneyGhostPage }) {\n  const { t, locale } = useT();\n"
    + "  const routes = {\n"
    + "    \"/\": <HomeGhost t={t} locale={locale} rails={rails} />,\n"
    + "    \"/updown\": <UpDownGhost />,\n"
    + "    \"/positions\": <TicketsGhost t={t} />,\n"
    + "    \"/account\": <AccountGhost t={t} />,\n"
    + "    \"/updown/history\": <UpDownHistoryGhost journeyHead={<TicketsHeadGhost t={t} />} />,\n"
    + "    \"/wallet/deposit\": <DepositGhost />,\n"
    + "    \"/wallet/deposit/return\": <DepositReturnLoading />,\n"
    + "  };\n"
    + "  if (at) return routes[at];\n"
    + "  return (\n    <RoutePick\n      routes={routes}\n"
    + "      patterns={[[\"^/markets/[^/]+$\", <MarketDetailLoading />]]}\n"
    + "      other={<AnyPageGhost />}\n"
    + "    />\n  );\n}\n", "rg.fn");
  s = once(s, 'import { TicketsGhost } from "@/components/journey/tickets/tickets-ghost";\n',
    'import { TicketsGhost, TicketsHeadGhost } from "@/components/journey/tickets/tickets-ghost";\n', "rg.import");
  s = once(s, " *               return — each the drawing its own loading file renders (the file itself where it reads nothing: the\n"
    + " *               question's and the return's; the drawing it hands its words to where it reads them: the list's\n"
    + " *               `history-ghost.tsx`, a journey reader's head, and the deposit's `deposit-ghost.tsx`), so the root's state\n"
    + " *               and the page's are one drawing.\n",
    " *               return — each the drawing its own loading file renders (the file itself, client code, where it needs no\n"
    + " *               server answer: the question's and the return's; else the drawing beside it: the list's\n"
    + " *               `history-ghost.tsx`, here with a journey reader's head, and the deposit's `deposit-ghost.tsx`), so the\n"
    + " *               root's state and the page's are one drawing.\n", "rg.list");
  return s;
});
console.log("part A done");
