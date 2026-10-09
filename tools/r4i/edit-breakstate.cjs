const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
const LAMBDA = `.then((l) => (l.locked && l.until ? { until: l.until, exclusion: l.reason === "self_exclusion" } : null))`;
edit("src/app/page.tsx", [
  [`import { isLockedOut } from "@/lib/server/responsible-gambling";`, `import { isLockedOut } from "@/lib/server/responsible-gambling";
import { breakStateOf } from "@/lib/break-end";`],
  [`          ${LAMBDA}`, `          .then(breakStateOf)`],
]);
edit("src/app/positions/page.tsx", [
  [`import { breakSentenceText } from "@/lib/break-end";`, `import { breakSentenceText, breakStateOf } from "@/lib/break-end";`],
  [`    ${LAMBDA}`, `    .then(breakStateOf)`],
]);
edit("src/app/markets/[id]/page.tsx", [
  [`import { formatBreakEnd } from "@/lib/break-end";`, `import { breakStateOf, formatBreakEnd } from "@/lib/break-end";`],
  [`        ${LAMBDA}`, `        .then(breakStateOf)`],
]);
edit("src/components/home/landing-hero.tsx", [
  [`import { formatBreakEnd } from "@/lib/break-end";`, `import { formatBreakEnd, type BreakState } from "@/lib/break-end";`],
  [`  breakEnd?: { until: string; exclusion: boolean } | null;`, `  breakEnd?: BreakState | null;`],
]);
