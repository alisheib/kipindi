// R5-L · the generic loaders open on their pages' own opening bands (PageLoader's rule): write each route's loading file
// into the stage, CRLF applied at install.
const fs = require("fs");
const path = require("path");
const STAGE = path.join(__dirname, "stage");
const put = (p, s) => { const f = path.join(STAGE, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); console.log("staged", p); };

const HEAD = `"use client";\n\n`;
const NOTE = (what) => `/**\n * ${what}\n * The generic body below — \`components/ui/page-loader.tsx\` has the rule (R5-L): a loader opens on its page's own opening\n * bands, in the page's rhythm, and its spinner panel stands where the page's first band of data begins.\n */\n`;

const files = {
  "src/app/fairness/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHero } from "@/components/ui/page-hero";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { Words } from "@/components/ui/ghost-kit";',
      'import { keepLastWords } from "@/components/ui/keep-words";',
      'import { I } from "@/components/ui/glyphs";',
      'import { durationHours } from "@/lib/duration-phrase";',
      'import { fill } from "@/lib/utils";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/fairness opens on its header — the hero with the attestation's own `PageHeader`, then the lead sentence (its words set and\n * not shown, as the page sets them: 15px, relaxed, 68ch, its last two words kept together) — on the page's 32px rung.\n * ⚠️ The page pads 48px from 1024 (`py-6 lg:py-8`, its own container — `test:measure`'s allowlist); this loader stands in\n * `PageContainer`'s 32, so the header band takes the other 16 (`lg:pt-3`) and lands where the page's does.\n * ⚠️ The sentence names the objection window: drawn at the configuration's default, one hour (`market-config.ts`); a\n * longer window is a few characters wider.",
    extra: "/** The objection window the lead sentence names — the configuration's default (`market-config.ts`, `objectionWindowHours`). */\nconst OBJECTION_WINDOW_HOURS = 1;\n\n",
    fn: "FairnessLoading",
    body: `  const { t, locale } = useT();
  return (
    <PageLoader
      tier="reading"
      rhythm="space-y-6"
      lead={
        <div className="lg:pt-3">
          <header className="space-y-3">
            <PageHero glow="info">
              <PageHeader eyebrow={t.common.resolutionAttestation} title={t.common.howAMarketResolves} tone="info" icon={<I.shieldcheck s={18} />} />
            </PageHero>
            <p className="text-[15px] leading-relaxed max-w-[68ch]" aria-hidden>
              <Words ink="ground">{keepLastWords(fill(t.common.fairnessIntro, { hours: durationHours(locale, OBJECTION_WINDOW_HOURS) }))}</Words>
            </p>
          </header>
        </div>
      }
    />
  );`,
  },
  "src/app/help/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHero } from "@/components/ui/page-hero";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/help opens on its hero — the page's own `PageHeader` in the info `PageHero` — on the page's 24px rung.",
    fn: "HelpLoading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="reading"
      rhythm="space-y-5"
      lead={
        <PageHero glow="info">
          <PageHeader tone="info" eyebrow={t.help.pageTitle} title={t.help.heading} />
        </PageHero>
      }
    />
  );`,
  },
  "src/app/notifications/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { BackLinkGhost } from "@/components/ui/back-link";',
      'import { I } from "@/components/ui/glyphs";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/notifications opens on its back link and its header (the bell, 22px, on the eyebrow's row), on the page's 24px rung.\n *\n * ⛔ B7 RULE 3 — a page and its loading.tsx state the SAME tier. The page is\n * <PageContainer tier=\"reading\">, and `reading` is 1080, so this is 1080. `/updown/[roundId]`\n * once shipped 1232 against a 1080 skeleton: a 152px jump on every load that no test could see.",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="reading"
      rows={6}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHeader tone="info" icon={<I.bellRing s={22} />} eyebrow={t.notif.eyebrow} title={t.notif.title} />
        </>
      }
    />
  );`,
  },
  "src/app/profile/account/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHero } from "@/components/ui/page-hero";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { BackLinkGhost } from "@/components/ui/back-link";',
      'import { I } from "@/components/ui/glyphs";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/profile/account opens on its back link and its hero (the page's own `PageHeader`), on the page's 24px rung. The\n * back link's words follow `?back=` on the page; its ghost is the link's 44px box, whatever it says.",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="reading"
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHero glow="info">
            <PageHeader tone="info" icon={<I.user s={14} className="text-info-fg" />} eyebrow={t.profile.myAccount} title={t.profile.myAccount} />
          </PageHero>
        </>
      }
    />
  );`,
  },
  "src/app/profile/activity/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { BackLinkGhost } from "@/components/ui/back-link";',
      'import { I } from "@/components/ui/glyphs";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/profile/activity opens on its back link and its header (the chart glyph, 22px, on the eyebrow's row), on the page's\n * 24px rung.",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="reading"
      rows={5}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHeader tone="info" icon={<I.chart s={22} />} eyebrow={t.activity.eyebrow} title={t.activity.title} />
        </>
      }
    />
  );`,
  },
  "src/app/profile/invite/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { BackLinkGhost } from "@/components/ui/back-link";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/profile/invite opens on its back link and its title row (19px, set solid), on the page's 24px rung. The title is\n * the unpaid invitation's — \"Invite friends\" with no chip — the page every player who is not a paid agent is shown.",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="form"
      rows={4}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-[19px] font-bold leading-none">{t.profile.inviteFriends}</p>
            </div>
          </div>
        </>
      }
    />
  );`,
  },
  "src/app/profile/kyc/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHero } from "@/components/ui/page-hero";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { BackLinkGhost } from "@/components/ui/back-link";',
      'import { Words } from "@/components/ui/ghost-kit";',
      'import { I } from "@/components/ui/glyphs";',
      'import { KYC_REVIEW_SLA_HOURS } from "@/lib/kyc-sla";',
      'import { durationHours } from "@/lib/duration-phrase";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/profile/kyc opens on its back link and its hero — the page's own `PageHeader` and its sentence (set and not shown,\n * in the page's type and measure) — on the page's 24px rung. The hero is the unverified player's (\"Verify your identity\"\n * and its review-time sentence), the reader this page is for; a pending, approved or refused account reads its own.",
    fn: "Loading",
    body: `  const { t, locale } = useT();
  return (
    <PageLoader
      tier="form"
      rows={4}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHero glow="info">
            <PageHeader tone="info" icon={<I.shieldcheck s={14} />} eyebrow={t.profile.kycIdentityVerification} title={t.profile.verifyIdentity} />
            <p className={\`mt-2 text-[13px] leading-snug max-w-prose text-balance \${locale === "zh" ? "break-keep [overflow-wrap:anywhere]" : ""}\`} aria-hidden>
              <Words>{t.profile.verifyBody.replace("{hours}", durationHours(locale, KYC_REVIEW_SLA_HOURS))}</Words>
            </p>
          </PageHero>
        </>
      }
    />
  );`,
  },
  "src/app/profile/notifications/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { BackLinkGhost } from "@/components/ui/back-link";',
      'import { I } from "@/components/ui/glyphs";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/profile/notifications opens on its back link and its header (the bell, 22px, on the eyebrow's row), on the page's\n * 24px rung.",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="form"
      rows={3}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHeader tone="info" icon={<I.bellRing s={22} />} eyebrow={t.push.eyebrow} title={t.push.pageTitle} />
        </>
      }
    />
  );`,
  },
  "src/app/profile/responsible-gambling/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHero } from "@/components/ui/page-hero";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { BackLinkGhost } from "@/components/ui/back-link";',
      'import { Words } from "@/components/ui/ghost-kit";',
      'import { I } from "@/components/ui/glyphs";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/profile/responsible-gambling opens on its back link and its hero — the page's own `PageHeader` and its sentence (set\n * and not shown, in the page's type and measure, balanced as the page balances it) — on the page's 24px rung. Drawn for a\n * player with no break running (the page shows a running break's notice above the hero); every RG notice, the helpline\n * and the limit controls are the page's, drawn only when it lands.",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="reading"
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHero glow="info">
            <PageHeader tone="info" icon={<I.shieldcheck s={14} />} eyebrow={t.rg.playerProtection} title={t.profile.responsibleGambling} />
            <p className="mt-2 text-[13px] leading-snug max-w-prose text-balance" aria-hidden>
              <Words>{t.rg.pageDescription}</Words>
            </p>
          </PageHero>
        </>
      }
    />
  );`,
  },
  "src/app/profile/security/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { BackLinkGhost } from "@/components/ui/back-link";',
      'import { I } from "@/components/ui/glyphs";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/profile/security opens on its back link and its header (the key, 22px, on the eyebrow's row), on the page's 24px rung.",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="form"
      rows={3}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHeader tone="info" icon={<I.keyRound s={22} />} eyebrow={t.security.eyebrow} title={t.security.title} />
        </>
      }
    />
  );`,
  },
  "src/app/profile/sessions/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHero } from "@/components/ui/page-hero";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { BackLinkGhost } from "@/components/ui/back-link";',
      'import { Words } from "@/components/ui/ghost-kit";',
      'import { I } from "@/components/ui/glyphs";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/profile/sessions opens on its back link and its hero — the page's own `PageHeader` and its sentence (set and not\n * shown) — on the page's 24px rung.",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="form"
      rows={4}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHero glow="info">
            <PageHeader tone="info" icon={<I.device s={14} className="text-info-fg" />} eyebrow={t.profile.activeSessions} title={t.profile.activeSessions} />
            <p className="mt-1 text-[13px]" aria-hidden>
              <Words>{t.profile.sessionsDescription}</Words>
            </p>
          </PageHero>
        </>
      }
    />
  );`,
  },
  "src/app/profile/source-of-funds/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHero } from "@/components/ui/page-hero";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { BackLinkGhost } from "@/components/ui/back-link";',
      'import { Words } from "@/components/ui/ghost-kit";',
      'import { I } from "@/components/ui/glyphs";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/profile/source-of-funds opens on its back link and its hero — the page's own `PageHeader` and its sentence (set and\n * not shown, in the page's type and measure) — on the page's 24px rung.",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="form"
      rows={4}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHero glow="info">
            <PageHeader tone="info" icon={<I.fileSignature s={14} className="text-info-fg" />} eyebrow="AML" title={t.profile.sourceOfFunds} />
            <p className="mt-2 text-[13px] leading-snug max-w-prose" aria-hidden>
              <Words>{t.profile.sofDescription}</Words>
            </p>
          </PageHero>
        </>
      }
    />
  );`,
  },
  "src/app/proposals/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHero } from "@/components/ui/page-hero";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { StatusFlag } from "@/components/ui/status-flag";',
      'import { I } from "@/components/ui/glyphs";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/proposals opens on its hero — the page's own `PageHeader` (the trophy, 18px) over the programme's state flag, in the\n * hero's own content box — on the page's 32px rung. Drawn for the programme's default state, COMING_SOON\n * (`proposals-config.ts`): the flag's box (`ComingSoonBadge`, its words not shown) and no Create button, which the page\n * draws only while proposals are open.",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="reading"
      rhythm="space-y-6"
      lead={
        <PageHero contentClassName="relative z-10 p-5 lg:p-6 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex flex-col items-start gap-2">
            <PageHeader icon={<I.trophy s={18} />} eyebrow={t.proposals.title} title={t.proposals.voteForMarkets} />
            <StatusFlag label={t.proposals.comingSoonTag} glyph="clock" size="sm" className="cs-badge" style={{ color: "transparent" }} />
          </div>
        </PageHero>
      }
    />
  );`,
  },
  "src/app/proposals/new/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHero } from "@/components/ui/page-hero";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { StatusFlag } from "@/components/ui/status-flag";',
      'import { BackLinkGhost } from "@/components/ui/back-link";',
      'import { I } from "@/components/ui/glyphs";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/proposals/new opens on its back link and its hero — the page's own `PageHeader` (the trophy, 18px) over the\n * programme's state flag — on the page's 24px rung. Drawn for the programme's default state, COMING_SOON\n * (`proposals-config.ts`): the flag's box (`ComingSoonBadge`, its words not shown).",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="form"
      rows={4}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHero>
            <div className="flex flex-col items-start gap-2">
              <PageHeader eyebrow={t.common.submitProposal} title={t.common.suggestMarket} icon={<I.trophy s={18} />} />
              <StatusFlag label={t.proposals.comingSoonTag} glyph="clock" size="sm" className="cs-badge" style={{ color: "transparent" }} />
            </div>
          </PageHero>
        </>
      }
    />
  );`,
  },
  "src/app/watchlist/loading.tsx": {
    imports: [
      'import { PageLoader } from "@/components/ui/page-loader";',
      'import { PageHeader } from "@/components/ui/page-header";',
      'import { I } from "@/components/ui/glyphs";',
      'import { useT } from "@/lib/i18n";',
    ],
    note: "/watchlist opens on its header (the star, 22px, on the eyebrow's row), on the page's 24px rung.",
    fn: "Loading",
    body: `  const { t } = useT();
  return (
    <PageLoader
      tier="board"
      rows={4}
      rhythm="space-y-5"
      lead={<PageHeader tone="info" icon={<I.star s={22} />} eyebrow={t.watchlist.eyebrow} title={t.watchlist.title} />}
    />
  );`,
  },
};

for (const [p, f] of Object.entries(files)) {
  const src = HEAD + f.imports.join("\n") + "\n\n" + (f.extra ?? "") + NOTE(f.note) + `export default function ${f.fn}() {\n${f.body}\n}\n`;
  put(p, src);
}
