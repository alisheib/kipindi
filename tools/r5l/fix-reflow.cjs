// R5-L · reflow the notes that ran past the 120-column measure.
const { once, edit } = require("./lib.cjs");
edit("src/app/agent/apply/loading.tsx", (s) => once(s,
  " * second panel stood (246). Every band below is the page's own box with the page's own words, set and not shown (`ghost-kit.tsx`), so the\n * step buttons wrap where the page's do in every language.\n",
  " * second panel stood (246). Every band below is the page's own box with the page's own words, set and not shown\n * (`ghost-kit.tsx`), so the step buttons wrap where the page's do in every language.\n",
  "apply reflow"));
edit("src/app/agent/status/loading.tsx", (s) => once(s,
  " * eyebrow, 4px, the 35px title: 54px), so the ghost's bar (`h-6`, 32px on this scale) stood 22px short and every panel under\n * it landed 22px lower than promised; and both panels were one title bar over two lines, where the page's first is a two-line block beside a chip\n * and a date, and its second a title over two bulleted terms.",
  " * eyebrow, 4px, the 35px title: 54px), so the ghost's bar (`h-6`, 32px on this scale) stood 22px short and every panel\n * under it landed 22px lower than promised (57 at 320 in Swahili, where the title takes two lines); and both panels were\n * one title bar over two lines, where the page's first is a two-line block beside a chip and a date, and its second a\n * title over two bulleted terms.",
  "status reflow"));
