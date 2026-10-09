const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r5h.test.mts", (s) => {
  s = once(s, ".startsWith('<div aria-hidden=\"true\" class=\"flex min-h-[44px] items-center\">');",
    ".startsWith('<div class=\"flex min-h-[44px] items-center\" aria-hidden=\"true\"><div class=\"h-3 w-[64px] rounded bg-bg-overlay kp-shimmer-track\"></div></div>');", "bl render");
  s = once(s, "    \"5.2 results\": resultsPage.includes('<div className=\"flex flex-col gap-5 lg:flex-row lg:gap-6\"> <div className=\"min-w-0 flex-1\">')\n",
    "    // (the page holds an emptied JSX note between its two wrappers — `{}` once decommented)\n"
    + "    \"5.2 results\": /<div className=\"flex flex-col gap-5 lg:flex-row lg:gap-6\"> (?:\\{\\} )*<div className=\"min-w-0 flex-1\">/.test(resultsPage)\n", "res page");
  return s;
});
