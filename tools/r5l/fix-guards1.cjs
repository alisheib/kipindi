// R5-L · one-line sub-floor labels in the ghosts become their line's own box (no new §3 reading-copy sites: a ghost's
// one-line label sizes nothing but its line); the crests take classes, not an inline radius (design-frozen); the notable
// card's verdict chip takes the status metrics without the gold variant (the gold census).
const { once, edit } = require("./lib.cjs");

edit("src/app/leaderboard/loading.tsx", (s) => {
  s = once(s,
    "                    <span className=\"crest-holder kp-shimmer-track bg-bg-overlay\" style={{ width: 28, height: 28, borderRadius: \"50%\" }} />\n",
    "                    <span className=\"crest-holder h-[28px] w-[28px] rounded-full bg-bg-overlay kp-shimmer-track\" />\n", "row crest");
  s = once(s,
    "          const size = first ? 56 : 48;\n",
    "          // The crest's own box (`.crest-holder`: inline-flex, middle-aligned, its line 0) — 56px for the leader, 48 beside.\n"
    + "          const crest = first ? \"h-[56px] w-[56px]\" : \"h-[48px] w-[48px]\";\n", "crest size");
  s = once(s,
    "                <span className=\"crest-holder kp-shimmer-track bg-bg-overlay\" style={{ width: size, height: size, borderRadius: \"50%\" }} />\n",
    "                <span className={`crest-holder ${crest} rounded-full bg-bg-overlay kp-shimmer-track`} />\n", "podium crest");
  s = once(s,
    "              <span className=\"mt-1\">\n"
    + "                <span className=\"inline-flex items-center gap-1 rounded-pill border border-transparent bg-bg-overlay px-2 py-0.5 font-mono text-[10px] font-bold\">\n"
    + "                  <span className=\"h-[11px] w-[11px] shrink-0\" />\n"
    + "                  {`0 ${t.leaderboard.winLabel}`}\n"
    + "                </span>\n"
    + "              </span>\n"
    + "              <span className=\"mt-1 font-mono text-[10px]\"><Words>{`0 ${t.results.resolved}`}</Words></span>\n",
    "              {/* The streak's line: the column's 15px type on its 22.5px line box, the 21px chip inside it (1px border,\n"
    + "                  2px padding, its 10px words on their 15px line) — then the resolved count's own 15px line (10px × 1.5).\n"
    + "                  One line each, so the line's box is the ghost; the words would size nothing. */}\n"
    + "              <span className=\"mt-1 flex h-[22.5px] items-center\"><span className=\"h-[21px] w-[72px] rounded-pill bg-bg-overlay\" /></span>\n"
    + "              <span className=\"mt-1 flex h-[15px] items-center\"><span className=\"h-[8px] w-[80px] rounded-sm bg-bg-overlay/40\" /></span>\n",
    "podium lines");
  return s;
});
edit("src/app/leaderboard/loading.tsx", (s) => once(s,
  "function PodiumGhost({ t }: { t: Dict }) {\n", "function PodiumGhost() {\n", "podium sig"));
edit("src/app/leaderboard/loading.tsx", (s) => once(s, "      <PodiumGhost t={t} />\n", "      <PodiumGhost />\n", "podium call"));
edit("src/app/leaderboard/loading.tsx", (s) => once(s, "import type { Dict } from \"@/lib/i18n-dict\";\n", "", "dict type"));

edit("src/app/results/loading.tsx", (s) => {
  s = once(s,
    "          <div className=\"flex min-w-0 items-center gap-2\">\n"
    + "            <div className=\"h-[38px] w-[38px] shrink-0 rounded-full bg-bg-overlay kp-shimmer-track\" />\n"
    + "            <div className=\"flex min-w-0 flex-col leading-tight font-mono text-[10px] font-semibold tabular-nums text-transparent\">\n"
    + "              <span><Words ink=\"ground\">{`${sideWord(t, \"YES\", \"MARKET\")} 00 · ${sideWord(t, \"NO\", \"MARKET\")} 00`}</Words></span>\n"
    + "            </div>\n"
    + "          </div>\n"
    + "          <p className=\"hidden sm:block amount text-micro text-transparent whitespace-nowrap\"><Words ink=\"ground\">{`00 ${t.results.resolved} · TZS 00K ${t.market.tickerSettled}`}</Words></p>\n",
    "          {/* The donut's 38px, the tally's lines beside it (12.5px each, shorter than the ring), the count line from 640 —\n"
    + "              one line each, so their boxes are the ghost. */}\n"
    + "          <div className=\"flex min-w-0 items-center gap-2\">\n"
    + "            <div className=\"h-[38px] w-[38px] shrink-0 rounded-full bg-bg-overlay kp-shimmer-track\" />\n"
    + "            <div className=\"flex min-w-0 flex-col gap-1\">\n"
    + "              <span className=\"h-[8px] w-[96px] rounded-sm bg-bg-elevated\" />\n"
    + "              <span className=\"h-[8px] w-[64px] rounded-sm bg-bg-elevated\" />\n"
    + "            </div>\n"
    + "          </div>\n"
    + "          <div className=\"hidden h-[14px] w-[176px] items-center sm:flex\"><span className=\"h-[8px] w-full rounded-sm bg-bg-elevated\" /></div>\n",
    "header right");
  s = once(s,
    "          {/* The count in `QueryResultCount`'s own type, its phrase set and not shown — its line is the count's. */}\n"
    + "          <p className=\"shrink-0 font-mono text-[11.5px] tabular-nums text-transparent\"><span className=\"rounded bg-bg-overlay\">{t.market.nResults.replace(\"{n}\", \"00\")}</span></p>\n",
    "          {/* The count as tall as its line — `QueryResultCount`'s 11.5px × 1.5 = 17.25px (/markets' ghost's own box). */}\n"
    + "          <div className=\"flex h-[17.25px] shrink-0 items-center\"><div className=\"kp-shimmer-track h-3 w-[80px] rounded bg-bg-elevated\" /></div>\n",
    "row1 count");
  s = once(s,
    "          {searching && <p className=\"mb-3 h-[16.5px] font-mono text-[11px]\" aria-hidden />}\n",
    "          {searching && <div className=\"mb-3 h-[16.5px]\" aria-hidden />}\n", "searching line");
  s = once(s,
    "          <Chip variant=\"resolved\" size=\"sm\" style={CHIP_GHOST}>{t.market.resolvedOutcome} · {outcomeWord(t, \"NO\", \"MARKET\")}</Chip>\n",
    "          {/* The verdict chip's box: the `resolved` variant's status metrics (`metrics=\"status\"`), not its gold. */}\n"
    + "          <Chip variant=\"neutral\" metrics=\"status\" size=\"sm\" style={CHIP_GHOST}>{t.market.resolvedOutcome} · {outcomeWord(t, \"NO\", \"MARKET\")}</Chip>\n",
    "verdict chip");
  s = once(s,
    "        <div className=\"mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums\">\n"
    + "          <span><Words>{`TZS 00K ${t.market.tickerSettled}`}</Words></span>\n"
    + "          <span className=\"flex items-center gap-1\"><span className=\"h-[11px] w-[11px] shrink-0\" /> <Words>{`00 ${t.market.predictorsCount}`}</Words></span>\n"
    + "        </div>\n",
    "        {/* The stats line: one 11px line (16.5px) — the pool and the predictors fit it at every width. */}\n"
    + "        <div className=\"mt-3 flex h-[16.5px] items-center gap-4\">\n"
    + "          <span className=\"h-[8px] w-[120px] rounded-sm bg-bg-overlay/40\" />\n"
    + "          <span className=\"h-[8px] w-[88px] rounded-sm bg-bg-overlay/40\" />\n"
    + "        </div>\n",
    "stats line");
  return s;
});

edit("src/app/live/loading.tsx", (s) => {
  s = once(s,
    "        <span className=\"inline-flex items-center gap-1 font-mono text-[10px] tabular-nums\"><Words>{t.market.timeLeftD.replace(\"{n}\", \"0\")}</Words></span>\n",
    "        <span className=\"h-[8px] w-[64px] rounded-sm bg-bg-overlay/40\" />\n", "time left");
  s = once(s,
    "      <div className=\"mt-2.5 flex items-center justify-between font-mono text-[12px] tabular-nums\">\n"
    + "        <span><Words>{`${sideWord(t, \"YES\", \"MARKET\")} @ 00%`}</Words></span>\n"
    + "        <span><Words>{`${sideWord(t, \"NO\", \"MARKET\")} @ 00%`}</Words></span>\n"
    + "      </div>\n",
    "      {/* The price line: one 12px line (18px), its two sides at the ends. */}\n"
    + "      <div className=\"mt-2.5 flex h-[18px] items-center justify-between\">\n"
    + "        <span className=\"h-[8px] w-[72px] rounded-sm bg-bg-overlay/40\" />\n"
    + "        <span className=\"h-[8px] w-[72px] rounded-sm bg-bg-overlay/40\" />\n"
    + "      </div>\n",
    "price line");
  return s;
});

edit("src/components/ui/query-bar-ghost.tsx", (s) => once(s,
  "        <span className=\"shrink-0 font-mono text-[11px] font-bold tabular-nums\">00</span>\n        <span className=\"h-[14px] w-[14px] shrink-0\" />\n      </span>\n    </div>\n  );\n}\n",
  "        {/* The count's two-digit room: two mono digits at 11px (2 × 0.6em). */}\n        <span className=\"h-[14px] w-[13.2px] shrink-0\" />\n        <span className=\"h-[14px] w-[14px] shrink-0\" />\n      </span>\n    </div>\n  );\n}\n",
  "menu count"));
