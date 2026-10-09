// R5-H · the pins in r4c, r5b, withdrawn-features and design-frozen that followed a drawing to its new file (G-2), or the
// money books' one bar ghost (G-2b). Each with its reason. CRLF (lib.cjs).
const { once, edit } = require("./lib.cjs");

edit("scripts/visual-pass-r4c.test.mts", (s) => once(s,
  '    ["src/app/positions/loading.tsx", /<div className=\\{QUERY_SEARCH_BAND_CLASS\\} aria-hidden>\\s*<div className="search-box-wrap">[\\s\\S]{0,260}?<p className="mt-1\\.5 min-h-\\[17px\\]" \\/>/],\n',
  "    // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): today's /positions picture is drawn in the browser, beside its loading file.\n"
  + '    ["src/app/positions/positions-ghost.tsx", /<div className=\\{QUERY_SEARCH_BAND_CLASS\\} aria-hidden>\\s*<div className="search-box-wrap">[\\s\\S]{0,260}?<p className="mt-1\\.5 min-h-\\[17px\\]" \\/>/],\n', "r4c 1.6"));

edit("scripts/visual-pass-r5b.test.mts", (s) => {
  s = once(s, '  const ghost = read("src/app/wallet/loading.tsx");\n',
    "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): /wallet's picture is drawn in the browser, by `wallet-ghost.tsx` beside the\n"
    + "  // loading file (which asks the server the one thing the browser cannot: whether the bonus programme is live).\n"
    + '  const ghost = read("src/app/wallet/wallet-ghost.tsx");\n', "r5b 2.4");
  s = once(s, '  const users = ["src/app/wallet/wallet-bar.tsx", "src/app/wallet/receipts/receipts-bar.tsx", "src/app/wallet/receipts/loading.tsx"].map((f) => [f, read(f)] as const);\n',
    "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2b): the receipts ghost's bar is the money books' one bar ghost now — /wallet's\n"
    + "  // too (its ghost had none) — with every pill as wide as the page's in every language (`test:visual-pass-r5h` §4).\n"
    + '  const users = ["src/app/wallet/wallet-bar.tsx", "src/app/wallet/receipts/receipts-bar.tsx", "src/app/wallet/money-bar-ghost.tsx"].map((f) => [f, read(f)] as const);\n', "r5b 9.3");
  s = once(s, '  ok("9.4 · the ghost\'s count is as tall as the count\'s line (17.25), so row 2 lands where the page puts it",\n'
    + '    /<div className="flex h-\\[17\\.25px\\] shrink-0 items-center"><div className="h-3 w-\\[80px\\] rounded bg-bg-overlay" \\/><\\/div>/.test(users[2][1]) && 11.5 * 1.5 === 17.25);\n',
    "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2b): the count is set in `QueryResultCount`'s own type with its words not shown —\n"
    + "  // the line is the count's by construction (17.25 = 11.5 × 1.5), and its width the phrase's, which decides where row 1 wraps\n"
    + "  // from lg.\n"
    + '  ok("9.4 · the ghost\'s count is as tall as the count\'s line (17.25), so row 2 lands where the page puts it",\n'
    + '    /<p className="shrink-0 font-mono text-\\[11\\.5px\\] tabular-nums text-transparent"><span className="rounded bg-bg-overlay">\\{count\\}<\\/span><\\/p>/.test(users[2][1])\n'
    + '      && /className="shrink-0 font-mono text-\\[11\\.5px\\] tabular-nums text-text-subtle"/.test(read("src/components/ui/query-bar.tsx")) && 11.5 * 1.5 === 17.25);\n', "r5b 9.4");
  return s;
});

edit("scripts/withdrawn-features.test.mts", (s) => {
  s = once(s, '  const skeleton = readFileSync("src/app/wallet/loading.tsx", "utf8");\n',
    '  const skeleton = readFileSync("src/app/wallet/loading.tsx", "utf8");\n'
    + "  // ⚠️ Round 5's follow-up (R5-H, G-2): the loading file asks the feature seam on the server and hands the answer to the\n"
    + "  // drawing beside it, which is client code (`feature-state.ts` is never imported into a client file).\n"
    + '  const drawing = readFileSync("src/app/wallet/wallet-ghost.tsx", "utf8");\n', "wf read");
  s = once(s, "  const stripped = decomment(skeleton);\n",
    "  const stripped = decomment(skeleton);\n  const drawn = decomment(drawing);\n", "wf strip");
  s = once(s, "  ok(\"§5f the wallet skeleton reads the same feature seam as the page\",\n     stripped.includes(\"bonusIsLiveFor\"), \"loading.tsx never consults feature-state\");\n",
    "  ok(\"§5f the wallet skeleton reads the same feature seam as the page\",\n     stripped.includes(\"<WalletGhost bonusLive={bonusIsLiveFor()} />\") && /bonusLive && \"lg:grid-cols-2\"/.test(drawn) && !drawn.includes(\"feature-state\"),\n     \"loading.tsx never consults feature-state, or the drawing does not follow its answer\");\n", "wf seam");
  s = once(s, "     !/className=\"grid grid-cols-1 lg:grid-cols-2/.test(stripped),\n",
    "     !/className=\"grid grid-cols-1 lg:grid-cols-2/.test(stripped) && !/className=\"grid grid-cols-1 lg:grid-cols-2/.test(drawn),\n", "wf cols");
  s = once(s, "  ok(\"§5f the bonus ghost is retained for the ON path\", stripped.includes(\"mat-raised\"),\n",
    "  ok(\"§5f the bonus ghost is retained for the ON path\", drawn.includes(\"mat-raised\") && /\\{bonusLive && \\(/.test(drawn),\n", "wf mat");
  return s;
});

edit("scripts/design-frozen.test.mts", (s) => once(s, '  ["src/app/wallet/loading.tsx", 1],\n',
  "  // Round 5's follow-up (R5-H, G-2): the wallet ghost's one budgeted literal — its balance card's royal gradient — moved\n"
  + "  // with the drawing to `wallet-ghost.tsx` (client code beside the loading file); the count is the same.\n"
  + '  ["src/app/wallet/wallet-ghost.tsx", 1],\n', "df"));
