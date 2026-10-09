const { edit } = require('./ed1.cjs');
edit('src/app/page.tsx', [
  [`  const isAuthed = !!session;
`, `  const isAuthed = !!session;
  // The signed-in block names /positions by the journey tab's own key for a journey reader (round 4, edges E4). The one
  // cached resolver every journey page asks; a visitor's block has no such link, so a visitor is never asked about.
  const journey = isAuthed && (await resolveSimpleJourney()).journey;
`],
  [`        rails={heroRailNames(railPauses)}
      />`, `        rails={heroRailNames(railPauses)}
        journey={journey}
      />`],
  [`export const metadata: Metadata = {
  alternates: { canonical: "/" },`, `export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
  // ⭐ THE TAB SPEAKS THE READER'S LANGUAGE (round 4 of the visual pass, 2026-10-09, edges E5): the home's title was the
  // layout's English default, "50pick — Predict events. Not chance.", in Swahili and Chinese too (38 sw and 37 zh tiles),
  // while every other page names itself in the reader's words. The same composition, its line from the dictionary's own
  // tagline (\`auth.railTagline\`: "Tabiri matukio. Si bahati." · "预测事件，而非运气。"); \`absolute\`, because the
  // layout's template would add " · 50pick" to a title that already opens with the name. No new words.
  title: { absolute: \`50pick — \${t.auth.railTagline}\` },
  alternates: { canonical: "/" },`],
  [`  openGraph: { ...ROOT_OPEN_GRAPH, url: "/" },
};`, `  openGraph: { ...ROOT_OPEN_GRAPH, url: "/" },
  };
}`],
]);
