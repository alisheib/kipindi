const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r5h.test.mts", (s) => {
  s = once(s, '  flagLayout: squash(code(FLAG_FILE)).includes("useLayoutEffect(() => raiseJourneyFlag(), []);") && !/\\buseEffect\\(/.test(code(FLAG_FILE)) && hasDirective(t(FLAG_FILE), "use client"),\n',
    '  flagLayout: squash(decomment(t(FLAG_FILE))).includes("useLayoutEffect(() => raiseJourneyFlag(), []);") && !/\\buseEffect\\(/.test(decomment(t(FLAG_FILE))) && hasDirective(t(FLAG_FILE), "use client"),\n', "flagLayout");
  s = once(s, "  const page = code(WALLET_PAGE), ghost = code(WALLET_GHOST);\n",
    "  // The page's activity view (the bands a player with rows is shown), up to the next section's view.\n"
    + "  const pageAll = code(WALLET_PAGE), page = pageAll.slice(0, pageAll.indexOf('{section === \"methods\" && (')), ghost = code(WALLET_GHOST);\n", "page slice");
  return s;
});
