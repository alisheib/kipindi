const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/app/page.tsx", [
  [`        Promise.resolve().then(() => isLockedOut(session.userId)).then((l) => l.locked).catch(() => false),
      ]).then(([picks, wallet, onBreak]) => ({
        picks,
        balance: wallet === undefined ? null : (wallet?.balance ?? 0),
        held: !!wallet && wallet.status !== "ACTIVE",
        onBreak,
      }))`,
   `        Promise.resolve().then(() => isLockedOut(session.userId))
          .then((l) => (l.locked && l.until ? { until: l.until, exclusion: l.reason === "self_exclusion" } : null))
          .catch(() => null),
      ]).then(([picks, wallet, breakEnd]) => ({
        picks,
        balance: wallet === undefined ? null : (wallet?.balance ?? 0),
        held: !!wallet && wallet.status !== "ACTIVE",
        breakEnd,
      }))`],
]);
edit("src/components/home/landing-hero.tsx", [
  [`import { formatEatDate } from "@/lib/eat-day";`, `import { formatEatDate } from "@/lib/eat-day";
import { formatBreakEnd } from "@/lib/break-end";
import { keepText } from "@/components/ui/keep-run";`],
  [`  /** R4-I · the reader is on a self-imposed break (fails open: a failed read is false). Optional, so a caller that does
   *  not know draws the block as before. */
  onBreak?: boolean;
};`,
   `  /** R4-I · the reader's own break or exclusion and its end (fails open: a failed read is null). Optional, so a caller
   *  that does not know draws the block as before. */
  breakEnd?: { until: string; exclusion: boolean } | null;
};`],
  [`            <SignedInAct t={t} mine={mine ?? null} />`, `            <SignedInAct t={t} mine={mine ?? null} locale={locale} nowMs={nowMs} />`],
  [`function SignedInAct({ t, mine }: { t: Dict; mine: LandingMine | null }) {
  const picks = mine?.picks ?? null;
  const balance = mine?.balance ?? null;
  const held = !!mine?.held;
  const onBreak = !!mine?.onBreak;
  const noPicks = !!picks && picks.open === 0 && picks.awaiting === 0 && picks.paidThisWeekTzs === 0;
  // At zero the empty-balance prompt already says what to do next; the no-picks sentence beside it said it twice.
  const emptyWallet = !held && balance !== null && balance <= 0;`,
   `function SignedInAct({ t, mine, locale, nowMs }: { t: Dict; mine: LandingMine | null; locale: Locale; nowMs: number }) {
  const picks = mine?.picks ?? null;
  const balance = mine?.balance ?? null;
  const held = !!mine?.held;
  const breakEnd = mine?.breakEnd ?? null;
  const onBreak = !!breakEnd;
  const noPicks = !!picks && picks.open === 0 && picks.awaiting === 0 && picks.paidThisWeekTzs === 0;
  // At zero the empty-balance prompt already says what to do next; the no-picks sentence beside it said it twice.
  // ⛔ R4-I · not during a break either: "Add funds … to make your next pick" invites both things a break pauses.
  const emptyWallet = !held && !onBreak && balance !== null && balance <= 0;
  const breakDate = breakEnd ? formatBreakEnd(Date.parse(breakEnd.until), nowMs, t.common.monthsShort, locale) : null;`],
  [`  // huna chaguo. Chagua upande…" asked a player who had just paused their own betting to bet now. The break gets the held
  // wallet's treatment — the sentence is not shown, no new words; the header already drops its deposit pill for a break.
  return (`,
   `  // huna chaguo. Chagua upande…" asked a player who had just paused their own betting to bet now. The break gets the held
  // wallet's whole treatment: the invitation is not shown, and the break's own notice speaks in its place — the title the
  // sign-in page gives it (\`auth.coolingOff\`) over the sentence /wallet/deposit and the limits page give it
  // (\`rg.breakActive\`, with its end); an exclusion its own pair. No new words.
  return (`],
  [`      ) : emptyWallet ? (
        <p className="kp-mine__lead">{t.home.emptyBalance}</p>
      ) : null}`,
   `      ) : breakEnd && breakDate ? (
        <div className="kp-mine__held" role="status" data-testid="landing-mine-break">
          <p className="kp-mine__held-t">{breakEnd.exclusion ? t.auth.selfExclusionActive : t.auth.coolingOff}</p>
          <p className="kp-mine__held-b">{keepText(fill(breakEnd.exclusion ? t.rg.exclusionActive : t.rg.breakActive, { date: breakDate }), [breakDate])}</p>
        </div>
      ) : emptyWallet ? (
        <p className="kp-mine__lead">{t.home.emptyBalance}</p>
      ) : null}`],
]);
