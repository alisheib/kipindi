// R5-H · the measure anchor that plants a tier drift in /wallet's skeleton follows the drawing to `wallet-ghost.tsx`.
const { once, edit } = require("./lib.cjs");
edit("scripts/anchors/measure.anchors.mjs", (s) => {
  s = once(s, 'const WALLET_LOADING = "src/app/wallet/loading.tsx";\n',
    "/** ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): /wallet's skeleton is drawn in the browser, by `wallet-ghost.tsx` beside\n"
    + " *  its loading file — which `test:measure` reaches through its one hop to a same-directory module (`tierOf`), so the\n"
    + " *  tier the plant moves is there now. */\n"
    + 'const WALLET_LOADING = "src/app/wallet/wallet-ghost.tsx";\n', "const");
  s = once(s, " * harness's own subjects (`positions/page.tsx`, `results/page.tsx`, `wallet/loading.tsx`) are\n",
    " * harness's own subjects (`positions/page.tsx`, `results/page.tsx`, `wallet/wallet-ghost.tsx`) are\n", "doc");
  return s;
});
