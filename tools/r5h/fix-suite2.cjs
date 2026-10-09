const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r5h.test.mts", (s) => once(s,
  "  ok(\"4.5 · the bar ghost promises a shape and nothing else: no link, no live region, no `data-result-count` (`qa:count-truth` reads that one), hidden from a screen reader\", bar.length > 0 && !/<a\\b|aria-live|data-result-count/.test(bar) && bar.includes('aria-hidden=\"true\"'));\n",
  "  ok(\"4.5 · the bar ghost promises a shape and nothing else: no link, no live region, no `data-result-count` (`qa:count-truth` reads that one), hidden from a screen reader\", bar.length > 0 && !/<a\\b|aria-live|data-result-count/.test(bar) && bar.includes('aria-hidden=\"true\"'));\n"
  + "  // Row 2 wraps where the page's does only if its groups stand in the page's wrappers with the page's divider: the row's\n"
  + "  // 29px column gap is keyed on `.kp-qdiv` (`.kp-qbar-row:has(.kp-qdiv)`), and the bars write the same two wrappers.\n"
  + "  const rows = (s: string) => ({ wrappers: count(s, '<div class=\"hidden min-w-0 items-center gap-2 lg:flex\"><span aria-hidden=\"true\" class=\"kp-qdiv\"></span><div class=\"hidden min-w-0 flex-wrap items-center gap-1 lg:flex\">'), keys: count(s, \"shrink-0 pr-0.5 font-mono text-micro font-bold uppercase eyebrow text-transparent\"), phone: count(s, \"h-[44px] w-[104px] rounded-pill bg-bg-overlay kp-shimmer-track lg:hidden\") });\n"
  + "  const barSrc = squash(code(\"src/app/wallet/wallet-bar.tsx\"));\n"
  + "  const pageWrappers = count(barSrc, '<div className=\"hidden min-w-0 items-center gap-2 lg:flex\"> <QueryGroupDivider /> <nav aria-label=');\n"
  + "  ok(`4.7 · row 2 is the page's: one Filters button for a phone, and from lg the two groups each in the bar's own wrapper with its divider (the row's 29px gap is keyed on it) and its key — ${j(rows(bar))}, the page's bar writing ${pageWrappers} such wrappers`,\n"
  + "    j(rows(bar)) === j({ wrappers: 2, keys: 2, phone: 1 }) && pageWrappers === 2, j(rows(bar)));\n"
  + "  ok(\"4.7′ PLANT · the groups drawn without their divider (the row's gap back to 12px: a different wrap) is reported\", rows(bar.split('<span aria-hidden=\"true\" class=\"kp-qdiv\"></span>').join(\"\")).wrappers === 0);\n", "4.7"));
