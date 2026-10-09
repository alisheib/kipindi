// R5-L · the old skeleton's landing error re-derived on the title rule's p75 (three lines at 320 in Swahili, not four)
// and over every width: 357.5 at 768 to 546.5 at 1024 in Swahili and English (S/r5l/measure-routes.cts + the bands).
const { once, edit } = require("./lib.cjs");
edit("src/app/results/page.tsx", (s) => once(s,
  "page one's first card landed 395 to 547px below its",
  "page one's first card landed 358 to 547px below its",
  "results range"));
