// R5-L · reflow the last long note lines (the 120-column measure the files keep).
const { once, edit } = require("./lib.cjs");
edit("src/app/fairness/loading.tsx", (s) => {
  s = once(s,
    "/** The objection window the lead sentence names — the configuration's default (`market-config.ts`, `objectionWindowHours`). */\n",
    "/** The objection window the lead sentence names — the configuration's default (`market-config.ts`,\n *  `objectionWindowHours`). */\n",
    "fairness const");
  s = once(s,
    " * /fairness opens on its header — the hero with the attestation's own `PageHeader`, then the lead sentence (its words set and\n * not shown, as the page sets them: 15px, relaxed, 68ch, its last two words kept together) — on the page's 32px rung.\n",
    " * /fairness opens on its header — the hero with the attestation's own `PageHeader`, then the lead sentence (its words set\n * and not shown, as the page sets them: 15px, relaxed, 68ch, its last two words kept together) — on the page's 32px rung.\n",
    "fairness note");
  return s;
});
edit("src/app/leaderboard/loading.tsx", (s) => {
  s = once(s,
    " * and the table head appeared from nothing; below 768 the page's rows are 53px (no 32px sparkline), the ghost's 57. Every band below is the page's own box — `PageRibbon`'s, the kit pill's, `QuerySort`'s,\n * the podium's columns, the `admin-tbl` table (its own CSS pads the cells: 12px over each row, 10 over the head) — with\n * the page's own words set and not shown (`ghost-kit.tsx`, `query-bar-ghost.tsx`), so each wraps where the page's does.\n",
    " * and the table head appeared from nothing; below 768 the page's rows are 53px (no 32px sparkline), the ghost's 57.\n * Every band below is the page's own box — `PageRibbon`'s, the kit pill's, `QuerySort`'s, the podium's columns, the\n * `admin-tbl` table (its own CSS pads the cells: 12px over each row, 10 over the head) — with the page's own words set\n * and not shown (`ghost-kit.tsx`, `query-bar-ghost.tsx`), so each wraps where the page's does.\n",
    "lb note");
  s = once(s,
    "          // The crest's own box (`.crest-holder`: inline-flex, middle-aligned, its line 0) — 56px for the leader, 48 beside.\n",
    "          // The crest's own box (`.crest-holder`: inline-flex, middle-aligned, its line 0) — 56px for the leader, 48\n          // beside it.\n",
    "lb crest");
  return s;
});
