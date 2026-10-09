// R5-L · test:visual-pass-r5h's pins that R5-L's rebuild moves — each moved with its reason, nothing loosened.
const { once, edit } = require("./lib.cjs");
const P = "scripts/visual-pass-r5h.test.mts";
edit(P, (s) => {
  // 4.4 — the pill moved to the bar-ghost kit; the money books' ghost now imports it (one pill for every bar ghost).
  s = once(s,
    "  const ghost = code(BAR_GHOST);\n  const pill = (s: string) => /function PillGhost[\\s\\S]*?<span className=\"([^\"]+)\">/.exec(s)?.[1].split(/\\s+/) ?? [];\n",
    "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-L): the pill is `query-bar-ghost.tsx`'s `PillGhost` now — /results', /markets' and\n"
    + "  // /leaderboard's ghosts draw the same pill — so its box is read there, and the money books' ghost must import it.\n"
    + "  const ghost = code(\"src/components/ui/query-bar-ghost.tsx\");\n"
    + "  const imported = /import \\{ PillGhost \\} from \"@\\/components\\/ui\\/query-bar-ghost\";/.test(code(BAR_GHOST)) && !/function PillGhost/.test(code(BAR_GHOST));\n"
    + "  const pill = (s: string) => /function PillGhost[\\s\\S]*?<span className=\"([^\"]+)\">/.exec(s)?.[1].split(/\\s+/) ?? [];\n",
    "4.4 ghost");
  s = once(s, "    has(ghost) && countOk(ghost), j({ want, got: pill(ghost) }));\n",
    "    has(ghost) && countOk(ghost) && imported, j({ want, got: pill(ghost), imported }));\n", "4.4 cond");

  // 5.1 — the census note: a generic loader's own loading file draws its page's opening bands since R5-L.
  s = once(s,
    "  // ⭐ THE BACK LINK: every ghost whose page opens on `BackLink` draws `BackLinkGhost`, the link's own 44px box. A census:\n"
    + "  // each player loading file's drawings (generic PageLoader routes aside — they draw no page's bands by design) against\n",
    "  // ⭐ THE BACK LINK: every ghost whose page opens on `BackLink` draws `BackLinkGhost`, the link's own 44px box. A census:\n"
    + "  // each player loading file's drawings (since R5-L a generic PageLoader route's own file draws its page's opening bands,\n"
    + "  // so it is held here too; a server file that only hands PageLoader numbers — /proposals/[id], whose first band is its\n"
    + "  // data — is passed over) against\n",
    "5.1 note");

  // 5.2 / 5.3 / 5.4 — the swept bands, as R5-L rebuilt them.
  s = once(s,
    "  const mkGhost = t(\"src/app/markets/loading.tsx\"), liveGhost = t(\"src/app/live/loading.tsx\"), hero = t(\"src/components/ui/page-hero.tsx\");\n",
    "  const mkGhost = t(\"src/app/markets/loading.tsx\"), liveGhost = t(\"src/app/live/loading.tsx\"), hero = t(\"src/components/ui/page-hero.tsx\");\n"
    + "  const barKit = t(\"src/components/ui/query-bar-ghost.tsx\"), livePage = t(\"src/app/live/page.tsx\");\n",
    "sweep reads");
  s = once(s,
    "      && resultsGhost.includes('<div className=\"mb-5 min-h-[458px]\" aria-hidden>')\n"
    + "      && resultsGhost.includes('<div className=\"kp-shimmer-track h-[44px] w-[134px] rounded-pill bg-bg-elevated lg:hidden\" />'),\n",
    "      // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-L): the carousel is the notable card's own box (no 458px reservation, which was\n"
    + "      // 118px too tall at 1280) and the Filters pill the trigger's own box (`lg:hidden` in its root) — `test:visual-pass-r5l` §5.\n"
    + "      && resultsGhost.includes(\"{notable && <NotableGhost />}\") && resultsGhost.includes('<div className=\"mb-5\" aria-hidden>')\n"
    + "      && resultsGhost.includes(\"<FiltersGhost label={t.market.filtersOpen} />\") && barKit.includes('<div className=\"kp-fsheet lg:hidden\">'),\n",
    "5.2");
  s = once(s,
    "      && mkGhost.includes('<div className=\"kp-fsheet kp-shimmer-track h-[44px] w-[170px] rounded-pill bg-bg-elevated lg:hidden\" />'),\n",
    "      // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-L): the Filters pill is the trigger's own box with its word (`FiltersGhost`, whose\n"
    + "      // root is `kp-fsheet lg:hidden`) — the 170px box pushed the phone grid past the bar's edge.\n"
    + "      && mkGhost.includes(\"<FiltersGhost label={t.market.filtersOpen} />\") && barKit.includes('<div className=\"kp-fsheet lg:hidden\">'),\n",
    "5.3");
  s = once(s,
    "    \"5.4 live\": hero.includes('contentClassName = \"relative z-10 p-5 lg:p-6\"') && liveGhost.includes('<div className=\"relative z-10 p-5 lg:p-6\">'),\n",
    "    // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-L): the hero ghost IS `PageHero`, with the page's props — its own padding by construction.\n"
    + "    \"5.4 live\": hero.includes('contentClassName = \"relative z-10 p-5 lg:p-6\"') && liveGhost.includes('<PageHero glow=\"aqua\" watermark={200}>')\n"
    + "      && livePage.includes('<PageHero glow=\"aqua\" watermark={200}>'),\n",
    "5.4");
  s = once(s,
    "    [\"5.3 markets\", \"src/app/markets/loading.tsx\", 'h-[44px] w-[170px] rounded-pill bg-bg-elevated lg:hidden', \"h-[44px] w-[170px] rounded-pill bg-bg-elevated\"],\n"
    + "    [\"5.4 live\", \"src/app/live/loading.tsx\", '<div className=\"relative z-10 p-5 lg:p-6\">', '<div className=\"relative z-10 p-5\">'],\n",
    "    [\"5.3 markets\", \"src/app/markets/loading.tsx\", \"<FiltersGhost label={t.market.filtersOpen} />\", '<div className=\"kp-fsheet kp-shimmer-track h-[44px] w-[170px] rounded-pill bg-bg-elevated\" />'],\n"
    + "    [\"5.4 live\", \"src/app/live/loading.tsx\", '<PageHero glow=\"aqua\" watermark={200}>', '<PageHero glow=\"aqua\" watermark={200} contentClassName=\"relative z-10 p-5\">'],\n",
    "plants");
  return s;
});
