// R5-L · ONE rule for "the tallest of N titles" — the two ghosts that hold one (/results' notable card: three; /live's
// hero stack: six) take the board's title at the N/(N+1) quantile, from the served fonts (S/r5l/measure-titles-steps.cts),
// drawn on the design system's breakpoints. /results keeps its classes (the rule's p75 gives three lines to 401px, so
// the note's "four in Swahili at 320" — the p80's — goes); /live's six-and-three lines (one day's six featured markets,
// 2026-09-24) become the rule's four/three/two: 95px over today's board at 390 and 30 at 1280 before, 24 and 0 after.
const { once, edit } = require("./lib.cjs");
edit("src/app/results/loading.tsx", (s) => once(s,
  " *     the title, the 28px bar with its 24.5px label row, the stats line), and the title's line count is the one\n"
  + " *     judgement left: three lines on a phone (four in Swahili at 320), two from 640, one from 768 (at 22px from 1024) —\n"
  + " *     the tallest of three notable titles: the 80th percentile of the board's titles at each width, from the served\n"
  + " *     fonts (S/r5l/measure-routes.cts).\n",
  " *     the title, the 28px bar with its 24.5px label row, the stats line), and the title's line count is the one\n"
  + " *     judgement left: the tallest of three notable titles, on the rule /live's hero takes for its six — the tallest of\n"
  + " *     N is the board's title at the N/(N+1) quantile, here the 75th percentile, from the served fonts\n"
  + " *     (S/r5l/measure-titles-steps.cts): three lines to 401px, two to 685 (657 in English), one beyond, at 22px from\n"
  + " *     1024. Drawn on the breakpoints — three below 640, two to 767, one from 768 — it holds a line more than the\n"
  + " *     judgement from 402 to 639 and from 686 (658) to 767.\n",
  "results judgement"));
edit("src/app/live/loading.tsx", (s) => {
  s = once(s,
    " * ⚠️ ONE NUMBER IS A JUDGEMENT AND IT IS THE QUESTION'S LINE COUNT. Six lines on a phone,\n"
    + " * three from `lg` — measured across the six featured markets at each width, and written as the\n"
    + " * arithmetic (`6 × leading-tight × 19px`) so it can be re-derived rather than re-guessed. The\n"
    + " * hero now shows the TALLEST of the six on every slide (`featured-contest.tsx` stacks them),\n"
    + " * so this is a stable target rather than whichever market happened to be up.\n",
    " * ⚠️ ONE NUMBER IS A JUDGEMENT AND IT IS THE QUESTION'S LINE COUNT. The hero shows the TALLEST of the six questions\n"
    + " * on every slide (`featured-contest.tsx` stacks them), so the stack is the tallest of six titles — since R5-L on the\n"
    + " * rule /results' notable card takes for its three: the tallest of N is the board's title at the N/(N+1) quantile, from\n"
    + " * the served fonts (S/r5l/measure-titles-steps.cts) — four lines below 359px in Swahili, three to 489 (to 421 in English\n"
    + " * and Chinese), two beyond, at 24px from 1024. Drawn on the breakpoints: four below 360 in Swahili (three in English and\n"
    + " * Chinese), three to 639, two from 640 — a line more than the judgement from 490 (422) to 639. It was six lines on a\n"
    + " * phone and three from `lg`, measured across one day's six featured markets (2026-09-24): on today's board (tiles 175\n"
    + " * and 176, whose questions take two lines at 390 and at 1280) that stood 95px over at 390 and 30 at 1280; the rule's\n"
    + " * three and two stand 24 and 0 over. Written as the arithmetic (`lines × leading-tight × px`) so it is re-derived,\n"
    + " * not re-guessed.\n",
    "live judgement note");
  s = once(s,
    "              {/* The question. `mb-4` is the real h2's margin (20px on this scale) — the same\n"
    + "                  class, not a copy of the number it resolves to. */}\n"
    + "              <div className=\"mb-4 min-h-[calc(6*1.25*19px)] lg:min-h-[calc(3*1.25*24px)]\">\n"
    + "                <div className=\"kp-shimmer-track h-[19px] w-full rounded bg-bg-overlay\" />\n"
    + "                <div className=\"kp-shimmer-track mt-[4.75px] h-[19px] w-full rounded bg-bg-overlay\" />\n"
    + "                <div className=\"kp-shimmer-track mt-[4.75px] h-[19px] w-[82%] rounded bg-bg-overlay\" />\n"
    + "              </div>\n",
    "              {/* The question stack at the judgement's line count (the header) — `mb-4` is the real stack's margin (20px\n"
    + "                  on this scale), the same class, not a copy of the number it resolves to. Its bars stay inside every\n"
    + "                  minimum: three below 640, two from it. */}\n"
    + "              <div className={`mb-4 ${locale === \"sw\" ? \"min-h-[calc(4*1.25*19px)] xs:min-h-[calc(3*1.25*19px)]\" : \"min-h-[calc(3*1.25*19px)]\"} sm:min-h-[calc(2*1.25*19px)] lg:min-h-[calc(2*1.25*24px)]`}>\n"
    + "                <div className=\"kp-shimmer-track h-[19px] w-full rounded bg-bg-overlay\" />\n"
    + "                <div className=\"kp-shimmer-track mt-[4.75px] h-[19px] w-full rounded bg-bg-overlay sm:w-[82%]\" />\n"
    + "                <div className=\"kp-shimmer-track mt-[4.75px] h-[19px] w-[82%] rounded bg-bg-overlay sm:hidden\" />\n"
    + "              </div>\n",
    "live title box");
  return s;
});
edit("scripts/visual-pass-r5l.test.mts", (s) => {
  s = once(s,
    "  const judge = card.includes(\"min-h-[calc(3*1.25*18px)] sm:min-h-[calc(2*1.25*18px)] md:min-h-[calc(1.25*18px)] lg:min-h-[calc(1.25*22px)]\") && raw(RSG).includes(\"80th percentile\");\n"
    + "  ok(\"6.2 · the one judgement left is the title's line count, written as the arithmetic and named: three lines on a phone, two from 640, one from 768 (22px from 1024) — the tallest of three notable titles\", judge);\n",
    "  const judge = card.includes(\"min-h-[calc(3*1.25*18px)] sm:min-h-[calc(2*1.25*18px)] md:min-h-[calc(1.25*18px)] lg:min-h-[calc(1.25*22px)]\") && raw(RSG).includes(\"N/(N+1) quantile, here the 75th percentile\");\n"
    + "  ok(\"6.2 · the one judgement left is the title's line count, written as the arithmetic and named: three lines on a phone, two from 640, one from 768 (22px from 1024) — the tallest of three notable titles, on the one rule (the N/(N+1) quantile) /live's hero takes for six\", judge);\n",
    "suite 6.2");
  s = once(s,
    "  const plants: Array<[string, string, string]> = [\n"
    + "    [\"the CTA row's gap\", '<div className=\"mt-4 flex flex-wrap items-center gap-3\">', '<div className=\"mt-4 flex flex-wrap items-center gap-2\">'],\n",
    "  // The hero's question stack: the tallest of six titles on the one rule (`results/loading.tsx` takes it for three) —\n"
    + "  // four lines below 360 in Swahili and three elsewhere on a phone, two from 640, at 24px from 1024; never six again.\n"
    + "  const stack = (l: Locale) => /<div class=\"mb-4 (min-h-\\[calc[^\"]*lg:min-h-\\[calc\\(2\\*1\\.25\\*24px\\)\\])\">/.exec(render(LVG, l, \"/live\"))?.[1] ?? \"\";\n"
    + "  const sw = stack(\"sw\"), en = stack(\"en\"), zh = stack(\"zh\");\n"
    + "  ok(\"8.4 · RUN: the hero's question stack is the tallest of six titles on the one rule — four lines below 360 in Swahili, three in English and Chinese, three to 639, two from 640 (24px from 1024) — where it held six on a phone and three from lg (95px over today's board at 390, 30 at 1280)\",\n"
    + "    sw === \"min-h-[calc(4*1.25*19px)] xs:min-h-[calc(3*1.25*19px)] sm:min-h-[calc(2*1.25*19px)] lg:min-h-[calc(2*1.25*24px)]\"\n"
    + "      && en === \"min-h-[calc(3*1.25*19px)] sm:min-h-[calc(2*1.25*19px)] lg:min-h-[calc(2*1.25*24px)]\" && zh === en\n"
    + "      && raw(LVG).includes(\"N/(N+1) quantile\") && !g.includes(\"calc(6*1.25*19px)\") && code(FC).includes('<div className=\"kp-slide-stack mb-4\">'), j({ sw, en, zh }));\n"
    + "  const plants: Array<[string, string, string]> = [\n"
    + "    [\"the CTA row's gap\", '<div className=\"mt-4 flex flex-wrap items-center gap-3\">', '<div className=\"mt-4 flex flex-wrap items-center gap-2\">'],\n",
    "suite 8.4");
  return s;
});
