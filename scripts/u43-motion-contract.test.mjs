/** U43 B5: check the actual CSS rules for urgency, live status and trend motion. */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(process.env.U43_MOTION_ROOT ?? repo);
const parse = (name) => postcss.parse(readFileSync(join(root, name), "utf8"), { from: name });
const motion = parse("src/app/motion.css");
const globals = parse("src/app/globals.css");

function ruleFor(sheet, selector, media = null) {
  let found = null;
  sheet.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) return;
    if (media === null && rule.parent?.type !== "root") return;
    if (media !== null && (rule.parent?.type !== "atrule"
      || rule.parent.name !== "media" || !rule.parent.params.includes(media))) return;
    found = rule;
  });
  return found;
}

function declaration(rule, property) {
  if (!rule) return null;
  let found = null;
  rule.walkDecls(property, (decl) => { if (decl.parent === rule) found = decl; });
  return found;
}

let failures = 0;
function check(id, name, passed) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id} ${name}`);
  if (!passed) failures++;
}

const urgent = ruleFor(motion, ".m-urgent");
const urgentReduced = ruleFor(motion, '[data-motion="reduced"] .m-urgent');
const urgentOs = ruleFor(motion, ".m-urgent", "prefers-reduced-motion: reduce");
check("1", "last-30 digit pulse is full-motion only",
  declaration(urgent, "animation")?.value.includes("m-breathe 1000ms")
  && declaration(urgent, "animation")?.value.includes("infinite")
  && declaration(urgentReduced, "animation")?.value === "none"
  && declaration(urgentReduced, "animation")?.important === true
  && declaration(urgentReduced, "opacity")?.value === "1"
  && declaration(urgentOs, "animation")?.value === "none");

const liveDot = ruleFor(globals, ".live-dot");
const liveDotReduced = ruleFor(globals, '[data-motion="reduced"] .live-dot');
check("2", "reduced live dot keeps the full 2600ms cadence without shadow",
  declaration(liveDot, "animation")?.value.includes("m-breathe 2600ms")
  && declaration(liveDotReduced, "animation")?.value.includes("m-breathe 2600ms")
  && declaration(liveDotReduced, "animation")?.value.includes("infinite")
  && declaration(liveDotReduced, "animation")?.important === true
  && declaration(liveDotReduced, "box-shadow")?.value === "none"
  && declaration(liveDotReduced, "box-shadow")?.important === true);

const spark = ruleFor(globals, ".mcardp-spark-line");
check("3", "market trend draw uses the current motion ladder",
  declaration(spark, "animation")?.value === "m-draw var(--t-stage) var(--m-glide) forwards");

const sparkReduced = ruleFor(globals, '[data-motion="reduced"] .mcardp-spark-line');
const sparkOs = ruleFor(globals, ".mcardp-spark-line", "prefers-reduced-motion: reduce");
check("4", "market trend is visible without drawing motion in reduced tiers",
  [sparkReduced, sparkOs].every((rule) =>
    declaration(rule, "animation")?.value === "none"
    && declaration(rule, "stroke-dasharray")?.value === "none"
    && declaration(rule, "stroke-dashoffset")?.value === "0"));

console.log(`U43 MOTION CONTRACT: ${4 - failures} passed, ${failures} failed; CSS root ${root}`);
process.exit(failures ? 1 : 0);
