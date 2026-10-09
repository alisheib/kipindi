// R5-L · PageLoader opens on its page's own opening bands (`lead`), in the page's rhythm (`rhythm`).
const path = require("path");
const fs = require("fs");
const STAGE = path.join(__dirname, "stage/src/components/ui/page-loader.tsx");
let s = fs.readFileSync(STAGE, "utf8").replace(/\r\n/g, "\n");
const { once } = require("./lib.cjs");

s = once(s,
  " * turn's). `test:visual-pass-r5h` §1 holds every player loading file to this and renders each one's markup.\n */\n",
  " * turn's). `test:visual-pass-r5h` §1 holds every player loading file to this and renders each one's markup.\n"
  + " *\n"
  + " * ⭐ EVERY GHOST OPENS ON THE BAND ITS PAGE OPENS ON (2026-10-09, the visual pass round 5's follow-up, R5-L) — ONE rule for\n"
  + " * every loading drawing and every in-page Suspense skeleton. This loader drew a 257px spinner box (80 + 64 + 16 + 15 + 80,\n"
  + " * and its border) where its pages open on a 44px back link or a hero, so everything the page draws first landed somewhere\n"
  + " * the ghost had not promised. So a ghost draws its page's OPENING bands with the page's own parts — the BackLink's 44px\n"
  + " * box (`BackLinkGhost`) where the page opens on one, then the page's own header (`PageHeader` with the page's eyebrow,\n"
  + " * title, subtitle, icon and tone, inside `PageHero` where the page wraps it in one; a hero's own sentence as words set and\n"
  + " * not shown, `ghost-kit.tsx`) — in the page's own rhythm (`rhythm`, the class the page's container carries), and this\n"
  + " * loader's spinner panel and rows stand where the page's first band of DATA begins. The header is printed: it is the\n"
  + " * page's name and waits for nothing. A page whose first band IS its data (a proposal's own head card) keeps the spinner\n"
  + " * first — the same rule, decided per route. Each route's loading file says which bands it draws and which case.\n"
  + " */\n",
  "doc");

s = once(s,
  'import { BrandSpinner } from "@/components/brand";\nimport { PageContainer, type MeasureTier } from "@/components/layout/page-container";\nimport { useT } from "@/lib/i18n";\n',
  'import type { ReactNode } from "react";\nimport { BrandSpinner } from "@/components/brand";\nimport { PageContainer, type MeasureTier } from "@/components/layout/page-container";\nimport { useT } from "@/lib/i18n";\nimport { cn } from "@/lib/utils";\n',
  "imports");

s = once(s,
  "  tier = \"reading\",\n  rows = 5,\n  rowHeight = 64,\n}: {\n  /** ⛔ A TIER, never a number — B7 rule 2, and it must match the page's own. */\n  tier?: MeasureTier;\n  rows?: number;\n  rowHeight?: number;\n}) {\n  const { t } = useT();\n  return (\n    <PageContainer tier={tier} className=\"content-fade-in\">\n",
  "  tier = \"reading\",\n  rows = 5,\n  rowHeight = 64,\n  lead,\n  rhythm,\n}: {\n  /** ⛔ A TIER, never a number — B7 rule 2, and it must match the page's own. */\n  tier?: MeasureTier;\n  rows?: number;\n  rowHeight?: number;\n"
  + "  /** The page's opening bands, drawn with the page's own parts (the rule above). */\n  lead?: ReactNode;\n"
  + "  /** The page container's own rhythm, so the opening bands and the panel stand as far apart as the page's bands. */\n  rhythm?: \"space-y-5\" | \"space-y-6\";\n"
  + "}) {\n  const { t } = useT();\n  return (\n    <PageContainer tier={tier} className={cn(\"content-fade-in\", rhythm)}>\n      {lead}\n",
  "signature");

fs.writeFileSync(STAGE, s);
console.log("staged page-loader.tsx");
