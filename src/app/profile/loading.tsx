"use client";

import { useT } from "@/lib/i18n";
import { PageContainer } from "@/components/layout/page-container";
import { ChipGhost, GhostText, AMOUNT_SHAPE } from "@/components/ui/ghost-text";
import { Stat } from "@/components/ui/stat";
import { DotSeq } from "@/components/ui/dot-seq";
import { keepLastWords } from "@/components/ui/keep-words";
import { ACHIEVEMENTS, type AchievementId } from "@/components/badges/icons";
import { PROFILE_NAME_FACE, PROFILE_PHONE_LINE, PROFILE_ROW_TITLE, PROFILE_SIGN_OUT_TITLE } from "@/components/profile/profile-faces";
import type { Dict } from "@/lib/i18n-dict";

/** Each language in its own name — the page's `LANGUAGE_NAME` (the header's language menu's endonyms). */
const LANGUAGE_NAME = { en: "English", sw: "Kiswahili", zh: "中文" } as const;
/** The achievement shelf in its order (`lib/server/achievements.ts`), the connector's place held: the invite programme is
 *  live for a player in good standing, so the shelf has six. Each name is the catalogue's two (`badges/icons.tsx`). */
const SHELF: readonly AchievementId[] = ["first-prediction", "first-win", "verified", "market-maker", "connector", "sharp"];
const shelfTitle = (id: AchievementId) => { const a = ACHIEVEMENTS.find((x) => x.id === id); return a ? `${a.name} · ${a.nameSw}` : id; };
/** The settings rows a player is shown (`profile/page.tsx`, in its order): the invite row (the programme live for them),
 *  the identity row (not yet verified) and the rest. */
const rows = (t: Dict): ReadonlyArray<readonly [string, string]> => [
  [t.profile.inviteFriends, t.profile.inviteFriendsSub],
  [t.profile.myAccount, t.profile.myAccountSub],
  [t.activity.title, t.activity.settingSub],
  [t.receipts.title, t.receipts.settingSub],
  [t.watchlist.title, t.watchlist.settingSub],
  [t.push.pageTitle, t.push.settingSub],
  [t.profile.responsibleGambling, t.profile.responsibleGamblingSub],
  [t.security.title, t.security.settingSub],
  [t.profile.verifyIdentity, t.profile.verifyIdSub],
  [t.profile.sourceOfFunds, t.profile.sourceOfFundsSub],
  [t.profile.activeSessions, t.profile.activeSessionsSub],
  [t.common.help, t.profile.helpSupportSub],
];

/**
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 * ⭐ THE PAGE, BAND FOR BAND (round 5's follow-up, R5-K, 2026-10-09). It drew a 64px avatar beside four bars, a strip of
 * three cells at every width, six settings rows and nothing else; the page is an 80px avatar beside the eyebrow, the
 * name (40px, two lines when it wraps), the number line and the pills (40px tall where a pill is a link), a strip of two
 * rows on a phone, the achievements panel, twelve rows and the sign-out — 647–1,435px more (S/r5k/m-rest.mts). It now
 * draws each in the page's own classes (`profile-faces.ts`, `Stat`, `Chip`, the shelf's grid), the words set and not
 * shown, so every line wraps where the page's does.
 * ⭐ THE CASE DRAWN: a player as most are — no display name yet (the page shows "Set your name" until one is set), no
 * region (Tanzania), not verified and no email address (both pills are links, 40px), the invite programme live for them
 * (its row and the connector badge), no source-of-funds notice. A verified player with a confirmed address has two
 * plain pills (21px) and one row fewer.
 */
export default function ProfileLoading() {
  const { t, locale } = useT();
  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* 🔴 DG-P-04 · §S1 — the h1 stays INSIDE the hero, as the page has it: `space-y-*` counts DOM order, and
          `.sr-only` is `position:absolute`, so as the container's first child it would hand the hero 32px of margin.
          ⛔ And it must not go inside an `aria-hidden` band: a heading there is a heading no screen reader reaches. */}
      <section className="relative overflow-hidden overflow-clip rounded-xl border border-border bg-bg-elevated kp-shimmer-track">
        <h1 className="sr-only">{t.profile.title}</h1>
        <div className="absolute inset-0" aria-hidden style={{ background: "var(--hero-panel-grad)" }} />
        <div className="relative z-10 p-5 lg:p-6 flex items-start gap-4 lg:gap-5" aria-hidden>
          {/* The 80px avatar (`AvatarUploader size="2xl"`). */}
          <div className="h-[80px] w-[80px] shrink-0 rounded-full bg-bg-overlay/20" />
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-mono text-caption uppercase eyebrow font-bold"><GhostText>{t.profile.predictor}</GhostText></p>
            {/* The name's button (`ProfileNameEditor`): 40px at least, the name's face, the 13px edit glyph. */}
            <span className="mt-1.5 inline-flex min-h-[40px] max-w-full items-center gap-2">
              <span className={`min-w-0 ${PROFILE_NAME_FACE} text-balance [overflow-wrap:anywhere]`}><GhostText className="italic">{t.profile.setYourName}</GhostText></span>
              <span className="h-[13px] w-[13px] shrink-0" />
            </span>
            <p className={PROFILE_PHONE_LINE}><GhostText>{`+255••••00 · ${t.profile.tanzania}`}</GhostText></p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <ChipGhost>{t.profile.playerRole}</ChipGhost>
              <span className="inline-flex items-center min-h-[var(--tap-min)]"><ChipGhost glyph={10}>{t.profile.kycPillStart}</ChipGhost></span>
              <ChipGhost>{LANGUAGE_NAME[locale]}</ChipGhost>
              <span className="inline-flex items-center min-h-[var(--tap-min)]"><ChipGhost glyph={10}>{t.profile.addEmailPill}</ChipGhost></span>
            </div>
          </div>
        </div>
        {/* The strip — the kit Stat in the page's own props: the balance a row of its own on a phone, three across from sm. */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 border-t border-border" aria-hidden>
          <Stat size="xl" labelStyle="widest" boxed="pad" font="mono" label={<GhostText>{t.profile.balance}</GhostText>} value={<GhostText>{AMOUNT_SHAPE}</GhostText>}
            icon={<span className="block h-[14px] w-[14px]" />}
            className="col-span-2 min-w-0 whitespace-nowrap border-b border-border px-5 sm:col-span-1 sm:border-b-0 lg:px-6" labelClassName="min-w-0 whitespace-normal break-words" />
          <Stat size="xl" labelStyle="widest" boxed="pad" font="mono" label={<GhostText>{t.profile.openCount}</GhostText>} value={<GhostText>0</GhostText>}
            icon={<span className="block h-[14px] w-[14px]" />}
            className="min-w-0 whitespace-nowrap border-border px-5 sm:border-l lg:px-6" labelClassName="min-w-0 whitespace-normal break-words" />
          <Stat size="xl" labelStyle="widest" boxed="pad" font="mono" label={<GhostText>{t.profile.settledCount}</GhostText>} value={<GhostText>0</GhostText>}
            icon={<span className="block h-[14px] w-[14px]" />}
            className="min-w-0 whitespace-nowrap border-l border-border px-5 lg:px-6" labelClassName="min-w-0 whitespace-normal break-words" />
        </div>
      </section>

      {/* The achievements: the section's key, then the shelf's own grid (auto-fit, 96px tracks, 24px apart) — a 64px coin
          over each name's two parts, stacked (`DotSeq stack`, the last two words kept) — and the hint under it. */}
      <section aria-hidden>
        <h2 className="mb-3 flex items-center gap-1.5 font-mono text-micro uppercase eyebrow font-bold">
          <span className="h-[13px] w-[13px] shrink-0" />
          <GhostText>{t.profile.achievements}</GhostText>
        </h2>
        <div className="rounded-xl glass-panel p-5 kp-shimmer-track">
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))" }}>
            {SHELF.map((id) => (
              <figure key={id} className="flex flex-col items-center gap-2 text-center">
                <span className="inline-grid h-[64px] w-[64px] rounded-full bg-bg-overlay" />
                <figcaption className="w-full text-body-sm leading-tight">
                  <DotSeq text={shelfTitle(id)} stack renderPart={(part) => <GhostText>{keepLastWords(part)}</GhostText>} />
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-center text-body-sm"><GhostText>{t.profile.badgesHint}</GhostText></p>
        </div>
      </section>

      {/* Settings grid skeleton */}
      <section aria-hidden>
        <h2 className="mb-3 flex items-center gap-1.5 font-mono text-micro uppercase eyebrow font-bold">
          <span className="h-[13px] w-[13px] shrink-0" />
          <GhostText>{t.profile.account}</GhostText>
        </h2>
        {/* The page's own grid gap, `gap-3` (profile/page.tsx) — R5-H · G-2b: `gap-2` drew 12px between rows where the
            page has 16. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows(t).map(([title, sub]) => (
            <div key={title} className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-bg-elevated p-[14px] kp-shimmer-track">
              {/* ⚠️ LITERALS, not `h-10 w-10` — spacing is overridden (tailwind.config.ts:200-215)
                  so this drew 80px. It ghosts the profile menu-row icon tile (profile/page.tsx), which is 40px. */}
              <span className="inline-flex h-[40px] w-[40px] shrink-0 rounded-md bg-bg-overlay" />
              <div className="flex-1 min-w-0">
                <p className={PROFILE_ROW_TITLE}><GhostText>{title}</GhostText></p>
                <p className="mt-0.5 text-body-sm leading-snug"><GhostText>{sub}</GhostText></p>
              </div>
              <span className="h-[16px] w-[16px] shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* The sign-out row (a form's one button: `inline-flex w-full`, 36px plate, title and line, the chevron). */}
      <div aria-hidden>
        <div className="inline-flex w-full items-center justify-between gap-3 rounded-xl glass-panel px-4 py-[14px] kp-shimmer-track">
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex h-[36px] w-[36px] rounded-md bg-bg-overlay" />
            <span className="text-left">
              <p className={PROFILE_SIGN_OUT_TITLE}><GhostText>{t.common.signOut}</GhostText></p>
              <p className="mt-0.5 text-body-sm"><GhostText>{t.profile.seeYouSoon}</GhostText></p>
            </span>
          </span>
          <span className="h-[16px] w-[16px] shrink-0" />
        </div>
      </div>
    </PageContainer>
  );
}
