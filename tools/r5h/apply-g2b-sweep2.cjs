// R5-H · G-2b's sweep, batch 2 — the Up & Down ghosts, the question's header and Tiketi zangu's rail, each EXACT from the
// page's classes (verified against the page before this edit). CRLF throughout (lib.cjs).
const { once, edit } = require("./lib.cjs");

/* ── /updown (and the journey's Juu/Chini tab): the page's header, tape, phone trigger, 44px durations, BoardViz ───── */
edit("src/app/updown/updown-ghost.tsx", (s) => {
  s = once(s, '"use client";\n\nimport { useT } from "@/lib/i18n";\n',
    '"use client";\n\nimport { PageHeader } from "@/components/ui/page-header";\nimport { useT } from "@/lib/i18n";\n', "ud.import");
  s = once(s, "      <div className=\"mb-4\">\n"
    + "        <p className=\"font-mono text-caption uppercase eyebrow font-bold text-text-subtle\">{t.market.udStreaming}</p>\n"
    + "        <div className=\"mt-1 h-7 w-40 rounded-md bg-bg-elevated kp-shimmer-track\" aria-hidden />\n"
    + "      </div>\n",
    "      {/* ⭐ THE PAGE'S OWN HEADER, SAME PROPS (R5-H · G-2b): eyebrow, title and tagline as `updown/page.tsx` draws them, so\n"
    + "          the tagline wraps where the page's does in every language (its two pills sit beside the title row, 45px in a\n"
    + "          54px row, and set no height). A 40px bar stood for the title and nothing for the tagline: 18.5px short at 1280. */}\n"
    + "      <div className=\"mb-4\">\n"
    + "        <PageHeader eyebrow={t.market.udStreaming} title={t.market.udTitle} subtitle={t.market.udTagline} />\n"
    + "      </div>\n", "ud.header");
  s = once(s, "      {/* ⚠️ LITERAL, not `h-10` — spacing is overridden (tailwind.config.ts:200-215) so the\n"
    + "          price tape ghost drew 80px. */}\n"
    + "      <div className=\"mt-4 h-[44px] rounded-xl bg-bg-inset kp-shimmer-track\" aria-hidden />\n",
    "      {/* ⚠️ LITERAL, not `h-10` — spacing is overridden (tailwind.config.ts:200-215) so the\n"
    + "          price tape ghost drew 80px. 41.5px is the tape's one row (1 + 10 + 19.5 + 10 + 1, R5-H · G-2b; it was 44); a\n"
    + "          phone with many assets wraps the tape to more rows, which a ghost cannot know. */}\n"
    + "      <div className=\"mt-4 h-[41.5px] rounded-xl bg-bg-inset kp-shimmer-track\" aria-hidden />\n", "ud.tape");
  s = once(s, "      {/* asset + duration tabs */}\n      <div className=\"mt-4 flex gap-2\" aria-hidden>\n",
    "      {/* ⭐ A PHONE'S ONE TRIGGER (R5-H · G-2b): below `sm` the board shows a single 48px field that names the asset and the\n"
    + "          duration (`updown-board-tabs.tsx`, `mt-4 sm:hidden`); the two pill rows are `hidden sm:flex`. The ghost drew both\n"
    + "          rows at every width — 116px where a phone has 68. */}\n"
    + "      <div className=\"mt-4 sm:hidden\" aria-hidden>\n"
    + "        <div className=\"h-[var(--h-control-lg)] w-full rounded-control bg-bg-inset kp-shimmer-track\" />\n"
    + "      </div>\n"
    + "      {/* asset + duration tabs, from `sm` */}\n      <div className=\"mt-4 hidden gap-2 sm:flex\" aria-hidden>\n", "ud.phone");
  s = once(s, "      <div className=\"mt-2 flex gap-1.5\" aria-hidden>\n"
    + "        {Array.from({ length: 3 }).map((_, i) => <div key={i} className=\"h-7 w-[64px] rounded-md bg-bg-inset kp-shimmer-track\" />)}\n"
    + "      </div>\n",
    "      {/* The durations are 44px FilterPills too (R5-H · G-2b: `h-7` drew 40). */}\n"
    + "      <div className=\"mt-2 hidden gap-1.5 sm:flex\" aria-hidden>\n"
    + "        {Array.from({ length: 3 }).map((_, i) => <div key={i} className=\"h-[44px] w-[64px] rounded-md bg-bg-inset kp-shimmer-track\" />)}\n"
    + "      </div>\n"
    + "      {/* ⭐ THE BOARD'S HEARTBEAT, `BoardViz` (R5-H · G-2b: missing, 100px): its eyebrow beside the cubes | chart toggle — the\n"
    + "          rail's 44px buttons in a 2px pad and a 1px border, 50px — then `mt-2` and the strip of the last rounds' 18px cubes\n"
    + "          (one line; a phone with many rounds may wrap it). Drawn when the board has both, the page's common case. */}\n"
    + "      <div className=\"mt-4\" aria-hidden>\n"
    + "        <div className=\"flex items-center justify-between gap-3\">\n"
    + "          <div className=\"h-3 w-[96px] rounded bg-bg-elevated kp-shimmer-track\" />\n"
    + "          <div className=\"h-[50px] w-[136px] rounded-pill bg-bg-elevated kp-shimmer-track\" />\n"
    + "        </div>\n"
    + "        <div className=\"mt-2 h-[18px] w-[240px] max-w-full rounded-sm bg-bg-inset kp-shimmer-track\" />\n"
    + "      </div>\n", "ud.durations");
  return s;
});

/* ── /updown/[roundId]: two columns from `lg`, as the page; the action panel first, the pool after it ─────────────── */
edit("src/app/updown/[roundId]/loading.tsx", (s) => {
  s = once(s, "        {/* grid: price hero (left) · pool + action rail (right) */}\n"
    + "        <div className=\"grid grid-cols-1 items-start gap-4 xl:[grid-template-columns:minmax(0,1.55fr)_minmax(300px,1fr)]\">\n"
    + "          <div className=\"h-[300px] rounded-xl border border-border bg-bg-elevated kp-shimmer-track\" aria-hidden />\n"
    + "          <div className=\"flex min-w-0 flex-col gap-4\">\n"
    + "            <div className=\"h-40 rounded-xl border border-border bg-bg-elevated kp-shimmer-track\" aria-hidden />\n"
    + "            <div className=\"h-56 rounded-xl border border-border bg-bg-elevated kp-shimmer-track\" aria-hidden />\n"
    + "          </div>\n",
    "        {/* grid: price hero (left) · action rail + pool (right). ⭐ R5-H · G-2b: two columns from `lg`, as the page (E-193;\n"
    + "            `xl` stacked everything between 1024 and 1279), and the action panel FIRST, the pool after it (the page's order\n"
    + "            since 2026-09-27 — a pick lands on #stake with the countdown in view). */}\n"
    + "        <div className=\"grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:minmax(0,1.55fr)_minmax(300px,1fr)]\">\n"
    + "          <div className=\"h-[300px] rounded-xl border border-border bg-bg-elevated kp-shimmer-track\" aria-hidden />\n"
    + "          <div className=\"flex min-w-0 flex-col gap-4\">\n"
    + "            <div className=\"h-56 rounded-xl border border-border bg-bg-elevated kp-shimmer-track\" aria-hidden />\n"
    + "            <div className=\"h-40 rounded-xl border border-border bg-bg-elevated kp-shimmer-track\" aria-hidden />\n"
    + "          </div>\n", "rd.grid");
  s = once(s, " * columns. Same paddings, same grid, same slot order as `page.tsx`: back-link,\n",
    " * columns. Same paddings, same grid (two columns from `lg`), same slot order as `page.tsx`: back-link,\n", "rd.doc1");
  return s;
});

/* ── /markets/[id]: the header's own bands — the 40px action row, the hairline, the question; no subtitle ─────────── */
edit("src/app/markets/[id]/loading.tsx", (s) => once(s,
  "          <div className=\"flex items-center gap-2\">\n"
  + "            <div className=\"h-5 w-[64px] rounded-pill bg-bg-overlay kp-shimmer-track\" />\n"
  + "            {/* ⚠️ WIDTH IS A LITERAL, not `w-12` — spacing is overridden\n"
  + "                (tailwind.config.ts:200-215) so `w-12` is 128px, twice any real chip. */}\n"
  + "            <div className=\"h-5 w-[64px] rounded-pill bg-bg-overlay kp-shimmer-track\" />\n"
  + "          </div>\n"
  + "          <div className=\"h-7 rounded bg-bg-overlay kp-shimmer-track\" style={{ width: \"min(620px, 90%)\" }} />\n"
  + "          <div className=\"h-5 w-48 rounded bg-bg-overlay kp-shimmer-track\" />\n",
  "          {/* ⭐ THE PAGE'S HEADER BANDS (R5-H · G-2b): the chips beside the 40px watch and share buttons (a 40px row), 16px,\n"
  + "              the 1px hairline (neutral here: the page's is the gilt seal of a real question), 16px, then the question — one\n"
  + "              line of it, 35px, 45px from `md` (`text-title-lg` / `md:text-display-3`, leading-tight); a longer question\n"
  + "              wraps, which a ghost cannot know. It drew 24px chips, a 40px title bar and a subtitle the page does not have. */}\n"
  + "          <div className=\"mb-3 flex h-[40px] items-center gap-2\">\n"
  + "            <div className=\"h-[25px] w-[64px] rounded-pill bg-bg-overlay kp-shimmer-track\" />\n"
  + "            {/* ⚠️ WIDTH IS A LITERAL, not `w-12` — spacing is overridden\n"
  + "                (tailwind.config.ts:200-215) so `w-12` is 128px, twice any real chip. */}\n"
  + "            <div className=\"h-[25px] w-[64px] rounded-pill bg-bg-overlay kp-shimmer-track\" />\n"
  + "          </div>\n"
  + "          <div className=\"mb-3 h-px w-full bg-border\" />\n"
  + "          <div className=\"h-[35px] rounded bg-bg-overlay kp-shimmer-track md:h-[45px]\" style={{ width: \"min(620px, 90%)\" }} />\n", "mid.header")
  .replace('        <header className="mt-3 space-y-2" aria-hidden>\n', '        <header className="mt-3" aria-hidden>\n'));

/* ── Tiketi zangu's rail ghost: R5-B's hook, so the journey's rail rule draws it as it draws the rail ────────────── */
edit("src/components/journey/tickets/tickets-ghost.tsx", (s) => once(s,
  "      <div className=\"flex items-end gap-1 border-b border-border\" aria-hidden>\n",
  "      {/* `data-rail-ghost` (R5-B's hook, globals.css): the journey's rail rule draws this ghost as it draws the page's rail —\n"
  + "          bled 12px into the gutter, the rule from the column's edge — so the switch lands where its ghost stood (R5-H · G-2b:\n"
  + "          without it the ghost's boxes stood 12px right of the page's options). */}\n"
  + "      <div className=\"flex items-end gap-1 border-b border-border\" data-rail-ghost=\"\" aria-hidden>\n", "tg.rail"));

/* ── /updown/history: the page's search band and bar (missing), and the strip's own tile height ─────────────────── */
edit("src/app/updown/history/history-ghost.tsx", (s) => {
  s = once(s, 'import { BackLinkGhost } from "@/components/ui/back-link";\n',
    'import { BackLinkGhost } from "@/components/ui/back-link";\nimport { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW2_CLASS, QUERY_SEARCH_BAND_CLASS } from "@/components/ui/query-bar";\n', "hg.qimport");
  s = once(s, "      <div className=\"mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3\" aria-hidden>\n"
    + "        {Array.from({ length: 3 }).map((_, i) => <div key={i} className=\"h-[80px] rounded-xl border border-border bg-bg-elevated kp-shimmer-track\" />)}\n"
    + "      </div>\n",
    "      {/* ⭐ THE SEARCH BAND AND THE BAR, AS THE PAGE DRAWS THEM for a player with rounds (R5-H · G-2b: neither was drawn,\n"
    + "          so the strip landed about 300px lower than this ghost promised): the band on the page's own classes (`mt-5 pb-5`,\n"
    + "          its echo row inside the gap to the bar), then the bar's two rows — the lenses with the count's 17.25px line, then\n"
    + "          sort and the phone's Filters (from lg the asset, duration and day groups, which wrap by their words). */}\n"
    + "      <div className={`${QUERY_SEARCH_BAND_CLASS} mt-5 pb-5`} aria-hidden>\n"
    + "        <div className=\"search-box-wrap\">\n"
    + "          <div className=\"h-[calc(var(--h-input)+2px)] w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track\" />\n"
    + "          <p className=\"mt-1.5 min-h-[17px]\" />\n"
    + "        </div>\n"
    + "      </div>\n"
    + "      <div className={QUERY_BAR_CLASS} aria-hidden>\n"
    + "        <div className={QUERY_BAR_ROW1_CLASS}>\n"
    + "          <div className=\"flex min-w-0 flex-1 items-center gap-1 overflow-hidden\">\n"
    + "            {[56, 76, 76, 76].map((w, i) => <div key={i} className=\"h-[44px] shrink-0 rounded-pill bg-bg-elevated kp-shimmer-track\" style={{ width: w }} />)}\n"
    + "          </div>\n"
    + "          <div className=\"flex h-[17.25px] shrink-0 items-center\"><div className=\"h-3 w-[80px] rounded bg-bg-elevated\" /></div>\n"
    + "        </div>\n"
    + "        <div className={QUERY_BAR_ROW2_CLASS}>\n"
    + "          <div className=\"h-[44px] w-[180px] rounded-pill bg-bg-elevated kp-shimmer-track\" />\n"
    + "          <div className=\"h-[44px] w-[104px] rounded-pill bg-bg-elevated kp-shimmer-track lg:hidden\" />\n"
    + "        </div>\n"
    + "      </div>\n"
    + "      {/* The P&L strip: each tile the page's (14px padding, a 1px border, the 14px label, 2px, the 19px figure's 28.5px\n"
    + "          line, the 15px sub-line) — 89.5px, where 80 stood. */}\n"
    + "      <div className=\"mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3\" aria-hidden>\n"
    + "        {Array.from({ length: 3 }).map((_, i) => <div key={i} className=\"h-[89.5px] rounded-xl border border-border bg-bg-elevated kp-shimmer-track\" />)}\n"
    + "      </div>\n", "hg.band");
  return s;
});
console.log("G-2b sweep 2 done");
