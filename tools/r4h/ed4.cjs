const { edit } = require('./ed1.cjs');
edit('src/components/home/landing-hero.tsx', [
  [`  rails: readonly string[];
};`, `  rails: readonly string[];
  /**
   * The request is shown the journey (\`resolveSimpleJourney\`). It names one door only: the signed-in block's link to
   * /positions takes the journey tab's own name (see \`SignedInAct\`). Omitted, today's words.
   */
  journey?: boolean;
};`],
  [`export function LandingHero({ figures, t, locale, isAuthed, nowMs, cards, mine, rails }: Props) {`,
   `export function LandingHero({ figures, t, locale, isAuthed, nowMs, cards, mine, rails, journey = false }: Props) {`],
  [`            <SignedInAct t={t} mine={mine ?? null} />`, `            <SignedInAct t={t} mine={mine ?? null} journey={journey} />`],
  [`function SignedInAct({ t, mine }: { t: Dict; mine: LandingMine | null }) {`, `function SignedInAct({ t, mine, journey }: { t: Dict; mine: LandingMine | null; journey: boolean }) {`],
  [`        <Link href={"/positions" as never} className="kp-mine__limits">
          {t.home.myPositions}`,
   `        {/* ⭐ ONE PAGE, ONE NAME (round 4 of the visual pass, 2026-10-09, edges E4): in the journey /positions is the tab
            "Tiketi zangu / My tickets / 我的注单" — its h1 and its tab say so — so this link takes the tab's own key, where
            it read "Nafasi zangu / My positions / 我的持仓". A classic reader keeps today's words (the classic nav names
            the page "Nafasi", and its home link "Nafasi zangu"). No new words. */}
        <Link href={"/positions" as never} className="kp-mine__limits">
          {journey ? t.journey.tabTickets : t.home.myPositions}`],
]);
edit('src/app/page.tsx', [
  [`import { getServerT } from "@/lib/i18n-server";`, `import { getServerT } from "@/lib/i18n-server";\nimport { resolveSimpleJourney } from "@/lib/server/journey-preview";`],
]);
