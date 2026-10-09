// R5-H · G-2b's sweep — the band defects the audit measured that are EXACT from the classes (each verified against the
// page before this edit). The bigger rebuilds are listed in the report, not done here. CRLF throughout (lib.cjs).
const { rd, once, edit } = require("./lib.cjs");

/* ── E1 · one back link for every ghost whose page opens on one: the BackLink's own 44px box ─────────────────────── */
edit("src/components/ui/back-link.tsx", (s) => s.replace(/\n$/, "") + "\n\n"
  + "/**\n"
  + " * THE BACK LINK WHILE ITS PAGE LOADS (round 5's follow-up, R5-H · G-2b) — the box `BackLink` draws (`min-h-[44px]`, its\n"
  + " * one 16px label line centred in it) with a bar for the label. Every loading ghost whose page opens on a back link draws\n"
  + " * this one: nine drew a 16–20px bar there (and the receipt's none), so each page landed 24–28px lower than its ghost\n"
  + " * promised. A shape, never a link: hidden from a screen reader, nothing to press.\n"
  + " */\n"
  + "export function BackLinkGhost() {\n"
  + "  return (\n"
  + "    <div className=\"flex min-h-[44px] items-center\" aria-hidden>\n"
  + "      <div className=\"h-3 w-[64px] rounded bg-bg-overlay kp-shimmer-track\" />\n"
  + "    </div>\n"
  + "  );\n"
  + "}\n");

const LITERAL_NOTE = "      {/* WIDTH IS A LITERAL, not `w-16` — the Tailwind spacing scale is OVERRIDDEN and\n"
  + "          INVERTS at the keys it does not cover: `w-16` is stock 64px while `w-12` is an\n"
  + "          overridden 128px, so the bigger number paints the smaller box. `test:spacing-scale`\n"
  + "          derives that forbidden set from the two scales and ratchets it. Same 64px, on a key\n"
  + "          that cannot invert. */}\n"
  + "      <div className=\"h-4 w-[64px] rounded bg-bg-overlay kp-shimmer-track\" aria-hidden />\n";
const BACK = "      {/* The back link: the BackLink's own 44px box (`BackLinkGhost`, R5-H · G-2b) — a 20px bar stood here, 24px short. */}\n"
  + "      <BackLinkGhost />\n";
const addImport = (s, after, label) => once(s, after, `${after}import { BackLinkGhost } from "@/components/ui/back-link";\n`, label);

edit("src/app/positions/performance/loading.tsx", (s) => {
  s = once(s, "      {/* BackLink placeholder */}\n" + LITERAL_NOTE, BACK, "perf.back");
  return addImport(s, 'import { PageHeader } from "@/components/ui/page-header";\n', "perf.import");
});
edit("src/app/wallet/deposit/deposit-ghost.tsx", (s) => {
  s = once(s, LITERAL_NOTE, BACK, "dep.back");
  return addImport(s, 'import { PageHeader } from "@/components/ui/page-header";\n', "dep.import");
});
edit("src/app/wallet/withdraw/loading.tsx", (s) => {
  s = once(s, LITERAL_NOTE, BACK, "wd.back");
  return addImport(s, 'import { PageHeader } from "@/components/ui/page-header";\n', "wd.import");
});
edit("src/app/wallet/receipts/loading.tsx", (s) => {
  s = once(s, '      <div className="h-[44px] w-[120px] rounded-control bg-bg-overlay kp-shimmer-track" aria-hidden />\n',
    "      {/* The back link: `BackLinkGhost`, the one every ghost draws for the BackLink (R5-H · G-2b) — this was the only\n"
    + "          ghost with its 44px, as a filled block; now the same box and bar as the others. */}\n"
    + "      <BackLinkGhost />\n", "rc.back");
  return addImport(s, 'import { PageHeader } from "@/components/ui/page-header";\n', "rc.import");
});
edit("src/app/wallet/receipt/[id]/loading.tsx", (s) => {
  s = once(s, '    <PageContainer tier="receipt" className="space-y-5">\n      <p className="font-mono text-caption uppercase eyebrow font-bold text-text-subtle">\n',
    '    <PageContainer tier="receipt" className="space-y-5">\n'
    + "      {/* The back link the page opens on (R5-H · G-2b: this ghost drew none, so the receipt landed 68px lower than it\n"
    + "          promised — the link's 44px and the rhythm's 24). */}\n"
    + "      <BackLinkGhost />\n"
    + '      <p className="font-mono text-caption uppercase eyebrow font-bold text-text-subtle">\n', "rcpt.back");
  return once(s, 'import { PageContainer } from "@/components/layout/page-container";\n',
    'import { PageContainer } from "@/components/layout/page-container";\nimport { BackLinkGhost } from "@/components/ui/back-link";\n', "rcpt.import");
});
edit("src/app/agent/loading-shared.tsx", (s) => {
  s = once(s, "export function AgentGhost({ tier, panels, heading = true, steps = false }: { tier: MeasureTier; panels: number; heading?: boolean; steps?: boolean }) {\n",
    "export function AgentGhost({ tier, panels, back = true, heading = true, steps = false }: { tier: MeasureTier; panels: number; back?: boolean; heading?: boolean; steps?: boolean }) {\n", "ag.sig");
  s = once(s, '      <div className="h-4 w-[128px] rounded bg-bg-overlay/50 kp-shimmer-track" aria-hidden />\n',
    "      {/* The back link — the BackLink's own 44px box (R5-H · G-2b: a 20px bar stood here); `back={false}` for a page\n"
    + "          that opens on none (the invitation). */}\n"
    + "      {back && <BackLinkGhost />}\n", "ag.back");
  s = once(s, ' * The ONE ghost shape the agent programme\'s async routes share: a back-link line, a heading,\n',
    ' * The ONE ghost shape the agent programme\'s async routes share: a back link (where the page has one), a heading,\n', "ag.doc");
  return once(s, 'import type { MeasureTier } from "@/components/layout/page-container";\n',
    'import type { MeasureTier } from "@/components/layout/page-container";\nimport { BackLinkGhost } from "@/components/ui/back-link";\n', "ag.import");
});
edit("src/app/agent/invite/[token]/loading.tsx", (s) => {
  s = once(s, "/** Header, the \"sent to\" panel, then the action row. */\n", "/** Header, the \"sent to\" panel, then the action row — and no back link: the invitation opens on its header (R5-H · G-2b). */\n", "inv.doc");
  return once(s, '  return <AgentGhost tier="reading" panels={1} />;\n', '  return <AgentGhost tier="reading" panels={1} back={false} />;\n', "inv.back");
});
edit("src/app/updown/[roundId]/loading.tsx", (s) => {
  s = once(s, '        {/* back-link */}\n        <div className="h-4 w-[96px] rounded bg-bg-elevated kp-shimmer-track" aria-hidden />\n',
    "        {/* back-link — the BackLink's own 44px box (`BackLinkGhost`, R5-H · G-2b: a 20px bar stood here, 24px short) */}\n"
    + "        <BackLinkGhost />\n", "rd.back");
  return once(s, 'import { useT } from "@/lib/i18n";\n', 'import { useT } from "@/lib/i18n";\nimport { BackLinkGhost } from "@/components/ui/back-link";\n', "rd.import");
});
// The question: the header stands 16px under the link (`mt-3`), on no rhythm of the container's.
edit("src/app/markets/[id]/loading.tsx", (s) => {
  const from = s.indexOf("      {/* Back link skeleton */}\n");
  const hEnd = s.indexOf("      </header>\n", from);
  if (from < 0 || hEnd < 0) throw new Error("mid shape");
  const head = s.slice(s.indexOf("      {/* Header skeleton */}\n", from), hEnd + "      </header>\n".length)
    .replace('      <header className="space-y-2" aria-hidden>\n', '      <header className="mt-3 space-y-2" aria-hidden>\n')
    .split("\n").map((l) => (l.length ? `  ${l}` : l)).join("\n");
  s = s.slice(0, from)
    + "      {/* The back link and the header as the page stands them: the header 16px (`mt-3`) under the BackLink's 44px box,\n"
    + "          on no rhythm of the container's (R5-H · G-2b: a 16px bar sat 24px over the header, which stood 20px high). */}\n"
    + "      <div>\n"
    + "        <BackLinkGhost />\n"
    + head
    + "      </div>\n"
    + s.slice(hEnd + "      </header>\n".length);
  return once(s, 'import { PageContainer } from "@/components/layout/page-container";\n',
    'import { PageContainer } from "@/components/layout/page-container";\nimport { BackLinkGhost } from "@/components/ui/back-link";\n', "mid.import");
});
// The round history, a classic reader: the BackLink, then the page's own header in its `mt-3` wrapper — same component,
// same props, so its words wrap where the page's do in every language (the two sibling ternaries kept).
edit("src/app/updown/history/history-ghost.tsx", (s) => {
  s = once(s, "      {journeyHead ? journeyHead : <div className=\"h-4 w-[128px] rounded bg-bg-elevated kp-shimmer-track\" aria-hidden />}\n"
    + "      {journeyHead ? null : <div className=\"mt-3 h-7 w-52 rounded-md bg-bg-elevated kp-shimmer-track\" aria-hidden />}\n",
    "      {journeyHead ? journeyHead : <BackLinkGhost />}\n"
    + "      {journeyHead ? null : <div className=\"mt-3\"><PageHeader eyebrow={t.market.udTitle} title={t.market.udHistoryTitle} subtitle={t.market.udHistoryBody} /></div>}\n", "hg.head");
  s = once(s, " * ⛔ Two sibling ternaries, each where its line stood, so a reader the journey is not shown to is served today's tree.\n */\n",
    " * ⛔ Two sibling ternaries, each where its line stood, so a reader the journey is not shown to is served today's tree.\n"
    + " * ⭐ TODAY'S HEAD IS THE PAGE'S (R5-H · G-2b): the BackLink's 44px box and the page's own PageHeader in its `mt-3`\n"
    + " * wrapper, same props — a 20px bar and a 40px block stood there, the page landing some 60px lower than promised.\n */\n", "hg.doc");
  return once(s, 'import { useT } from "@/lib/i18n";\n',
    'import { useT } from "@/lib/i18n";\nimport { BackLinkGhost } from "@/components/ui/back-link";\nimport { PageHeader } from "@/components/ui/page-header";\n', "hg.import");
});

/* ── E2 · /results: carousel and grid in the page's block (24 between them, not 48); the Filters pill a phone's alone ─ */
edit("src/app/results/loading.tsx", (s) => {
  s = once(s, "        <div className=\"flex flex-col gap-5\">\n          {/* The notable-results carousel: a 44px arrow row over the featured result card.\n",
    "        {/* ⭐ THE PAGE'S OWN TWO WRAPPERS (R5-H · G-2b): `results/page.tsx` stands the carousel and the grid in a BLOCK\n"
    + "            (`min-w-0 flex-1`) inside a `flex flex-col gap-5 lg:flex-row` row of one child, so only the carousel's own\n"
    + "            `mb-5` (24px) parts them. This was one `flex flex-col gap-5` AND the `mb-5` — 48px: the grid stood 24px low. */}\n"
    + "        <div className=\"flex flex-col gap-5 lg:flex-row lg:gap-6\">\n        <div className=\"min-w-0 flex-1\">\n"
    + "          {/* The notable-results carousel: a 44px arrow row over the featured result card.\n", "res.wrap");
  s = once(s, "          </div>\n        </div>\n      </div>\n    </PageContainer>\n",
    "          </div>\n        </div>\n        </div>\n      </div>\n    </PageContainer>\n", "res.close");
  s = once(s, "            <div className=\"kp-shimmer-track h-[44px] w-[134px] rounded-pill bg-bg-elevated\" />\n",
    "            {/* The Filters button is a phone's alone (`FilterSheet` is `lg:hidden`, filter-sheet.tsx) — R5-H · G-2b: the\n"
    + "                ghost drew it at 1280 too, a 134px pill in a row the page does not have. */}\n"
    + "            <div className=\"kp-shimmer-track h-[44px] w-[134px] rounded-pill bg-bg-elevated lg:hidden\" />\n", "res.filters");
  return s;
});

/* ── E3 · /markets: the count's line is the count's (17.25px, not a 20px bar); the Filters pill a phone's alone ───── */
edit("src/app/markets/loading.tsx", (s) => {
  s = once(s, '          <div className="kp-shimmer-track h-4 w-[80px] shrink-0 rounded bg-bg-elevated" data-result-count="" />\n',
    "          {/* The count as tall as its line — `QueryResultCount`'s 11.5px × 1.5 = 17.25px, its bar centred in it (R5-H · G-2b:\n"
    + "              a 20px bar made the phone grid's count row 2.75px taller than the page's, the board 4px low). */}\n"
    + '          <div className="flex h-[17.25px] shrink-0 items-center" data-result-count=""><div className="kp-shimmer-track h-3 w-[80px] rounded bg-bg-elevated" /></div>\n', "mk.count");
  s = once(s, '          <div className="kp-fsheet kp-shimmer-track h-[44px] w-[170px] rounded-pill bg-bg-elevated" />\n',
    "          {/* The phone's Filters button — `lg:hidden`, as `FilterSheet` is (R5-H · G-2b: `.kp-fsheet` hides nothing at lg,\n"
    + "              so the ghost drew a 170px pill at 1280 in a row the page does not have). */}\n"
    + '          <div className="kp-fsheet kp-shimmer-track h-[44px] w-[170px] rounded-pill bg-bg-elevated lg:hidden" />\n', "mk.fsheet");
  return s;
});

/* ── E4 · /live: the hero's own padding (PageHero's `p-5 lg:p-6`) ─────────────────────────────────────────────────── */
edit("src/app/live/loading.tsx", (s) => once(s, '          <div className="relative z-10 p-5">\n',
  "          {/* PageHero's own content padding, `p-5 lg:p-6` (page-hero.tsx) — R5-H · G-2b: `p-5` alone made the hero 16px\n"
  + "              short from 1024, and the wall under it stood 16px high. */}\n"
  + '          <div className="relative z-10 p-5 lg:p-6">\n', "live.pad"));

/* ── E5 · /wallet/receipts: the row's own lines (20 + 8 + 18, 79px), not 16 + 12 + 22 (83px) ───────────────────────── */
edit("src/app/wallet/receipts/loading.tsx", (s) => {
  s = once(s, "            <div className=\"min-w-0 flex-1 space-y-2\">\n"
    + "              <div className=\"flex items-center justify-between gap-3\">\n"
    + "                <div className=\"h-[14px] w-[150px] max-w-full rounded bg-bg-overlay kp-shimmer-track\" />\n"
    + "                <div className=\"h-[16px] w-[88px] shrink-0 rounded bg-bg-overlay kp-shimmer-track\" />\n"
    + "              </div>\n"
    + "              <div className=\"flex items-center justify-between gap-3\">\n"
    + "                <div className=\"h-[12px] w-[104px] rounded bg-bg-overlay/70 kp-shimmer-track\" />\n"
    + "                <div className=\"h-[22px] w-[88px] rounded-pill bg-bg-overlay/60 kp-shimmer-track\" />\n"
    + "              </div>\n",
    "            {/* The row's own two lines (receipt-list-row.tsx): the type and amount on the amount's 20px `text-body` line,\n"
    + "                8px (`mt-1.5`), then the date and the `sm` chip on an 18px line — 79px a row, as the page's settled rows.\n"
    + "                R5-H · G-2b: 16 + 12 + 22 made each row 4px taller, the sixth 24px low. */}\n"
    + "            <div className=\"min-w-0 flex-1\">\n"
    + "              <div className=\"flex h-[20px] items-center justify-between gap-3\">\n"
    + "                <div className=\"h-[14px] w-[150px] max-w-full rounded bg-bg-overlay kp-shimmer-track\" />\n"
    + "                <div className=\"h-[16px] w-[88px] shrink-0 rounded bg-bg-overlay kp-shimmer-track\" />\n"
    + "              </div>\n"
    + "              <div className=\"mt-1.5 flex h-[18px] items-center justify-between gap-3\">\n"
    + "                <div className=\"h-[12px] w-[104px] rounded bg-bg-overlay/70 kp-shimmer-track\" />\n"
    + "                <div className=\"h-[18px] w-[88px] rounded-pill bg-bg-overlay/60 kp-shimmer-track\" />\n"
    + "              </div>\n", "rc.row");
  return s;
});

/* ── E6 · /profile: the settings grid's own gap (`gap-3`, 16px) ────────────────────────────────────────────────────── */
edit("src/app/profile/loading.tsx", (s) => once(s, '        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">\n',
  "        {/* The page's own grid gap, `gap-3` (profile/page.tsx) — R5-H · G-2b: `gap-2` drew 12px between rows where the\n"
  + "            page has 16. */}\n"
  + '        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">\n', "pf.gap"));

/* ── E7 · /agent: the header with the page's own subtitle (same component, same props) ─────────────────────────────── */
edit("src/app/agent/loading.tsx", (s) => {
  s = once(s, "      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.title} />\n"
    + "      <div className=\"space-y-1.5\" aria-hidden>\n"
    + "        <div className=\"h-3 w-full max-w-[46ch] rounded bg-bg-overlay/40 kp-shimmer-track\" />\n"
    + "        <div className=\"h-3 w-4/5 max-w-[38ch] rounded bg-bg-overlay/40\" />\n"
    + "      </div>\n",
    "      {/* ⭐ THE PAGE'S OWN HEADER, SAME PROPS (R5-H · G-2b): `subtitle={t.agent.heroSub}`, 4px under the title as the page\n"
    + "          draws it, so it wraps where the page's does in every language. Two bars stood in a block of their own on the\n"
    + "          container's 32px rung: the subtitle 28px lower than the page's at 1280, and two lines where a phone has four. */}\n"
    + "      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.title} subtitle={t.agent.heroSub} />\n", "agent.sub");
  s = once(s, " * the read landed; and the panel count was four against the page's five (how it works · the seven\n",
    " * the read landed; and the panel count was four against the page's five (how it works · the seven\n", "agent.doc0");
  return s;
});
if (!rd("src/app/agent/loading.tsx").includes("subtitle={t.agent.heroSub}")) throw new Error("agent");
console.log("G-2b sweep done");
