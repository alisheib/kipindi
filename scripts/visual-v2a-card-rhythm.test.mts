/** V2a F10/F53: the classic card shares the kit's spacing rungs and btn-md action height.
 * Source geometry is checked here; the served card and skeleton are measured in the browser gate. */
import { readFileSync } from "node:fs";
import postcss, { type Declaration, type Rule } from "postcss";

const raw = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const css = raw("src/app/globals.css");
const card = raw("src/components/markets/market-card.tsx");
const home = raw("src/components/home/landing-hero.tsx");
const geometry = raw("src/components/markets/card-geometry.ts");
let passed = 0;
const failures: string[] = [];
function check(label: string, pass: boolean, detail = "") {
  if (pass) { passed++; console.log(`  ok   ${label}`); }
  else { failures.push(`${label}${detail ? `: ${detail}` : ""}`); console.log(`  FAIL ${label}${detail ? `: ${detail}` : ""}`); }
}

function inspect(styles: string) {
  const ast = postcss.parse(styles);
  const value = (selector: string, property: string, compact = false): string | undefined => {
    let found: string | undefined;
    ast.walkRules((rule: Rule) => {
      if (found !== undefined || rule.selector !== selector) return;
      const inCompact = rule.parent?.type === "atrule" && /max-width:\s*639\.98px/.test(rule.parent.params);
      if (inCompact !== compact) return;
      rule.walkDecls(property, (decl: Declaration) => { if (found === undefined) found = decl.value.trim(); });
    });
    return found;
  };
  const sp = (v: string | undefined): number => {
    const key = /^var\(--(sp-\d+)\)$/.exec(v ?? "")?.[1];
    return key ? Number(/^([\d.]+)px$/.exec(value(":root", `--${key}`) ?? "")?.[1] ?? NaN) : NaN;
  };
  const px = (v: string | undefined): number => Number(/^([\d.]+)px$/.exec(v ?? "")?.[1] ?? NaN);
  const layoutProps = ["--mcard-pt", "--mcard-gap", "--mcard-act-mt", "--mcard-act-mb"];
  const rootLayout = layoutProps.map((prop) => sp(value(":root", prop)));
  const compactLayout = layoutProps.map((prop) => sp(value('html:not([data-density="comfortable"])', prop, true)));
  const spacedRules: Array<[string, string]> = [
    [".mcardp-top", "gap"], [".mcardp-catgrp", "gap"], [".mcardp-head", "gap"],
    [".mcardp-traders", "gap"], [".mcardp-meta .live", "gap"],
  ];
  const everyGapScaled = spacedRules.every(([sel, prop]) => Number.isFinite(sp(value(sel, prop))))
    && /^var\(--sp-\d+\) var\(--sp-\d+\)$/.test(value(".mcardp-tail", "gap") ?? "")
    && /^var\(--sp-\d+\) var\(--sp-\d+\)$/.test(value(".mcardp-meta", "gap") ?? "");
  const padding = value(".mcardp", "padding") ?? "";
  const pad = /^var\(--mcard-pt\) (var\(--sp-\d+\)) (var\(--sp-\d+\))$/.exec(padding);
  const padBottom = sp(pad?.[2]);
  const movement = value(".mcardp-moveline", "margin") ?? "";
  const moveScaled = /^calc\(-1 \* var\(--sp-\d+\)\) 0$/.test(movement);
  const compactGridScaled = Number.isFinite(sp(value('html:not([data-density="comfortable"]) .market-grid', "gap", true)));
  const footerReach = Math.abs(px(value(".mcardp-details::after", "bottom"))) ||
    Number(/^-([\d.]+)px$/.exec(value(".mcardp-details::after", "bottom") ?? "")?.[1] ?? NaN);
  const cardAction = value(".mcardp-actions .btn", "height");
  const kitAction = value(".btn-md", "height");
  const control = px(value(":root", "--h-control-md"));
  const floor = px(value(":root", "--tap-min"));
  const base = px(value(":root", "--mcard-base"));
  const closedBase = px(value(":root", "--mcard-base-closed"));
  const tradersRoot = sp(value(":root", "--mcard-traders-h"));
  const tradersCompact = px(value('html:not([data-density="comfortable"])', "--mcard-traders-h", true));
  const metaRoot = px(value(":root", "--mcard-meta-mb"));
  const metaCompact = sp(value('html:not([data-density="comfortable"])', "--mcard-meta-mb", true));
  const formula = (closed: boolean) => `calc(var(--mcard-base${closed ? "-closed" : ""}) + var(--mcard-pt) + ${closed ? 6 : 8} * var(--mcard-gap) + var(--mcard-act-mt) + var(--mcard-act-mb) + var(--mcard-traders-h) + var(--mcard-meta-mb))`;
  const skeletonFormulas = value(":root", "--mcard-h") === formula(false)
    && value(":root", "--mcard-h-closed") === formula(true)
    && geometry.includes('MARKET_CARD_H = "var(--mcard-h)"')
    && geometry.includes('MARKET_CARD_H_CLOSED = "var(--mcard-h-closed)"');
  const predictedBase = 209 + (control - 40) + (padBottom - 13);
  const predictedClosedBase = 160 + (control - 40) + (padBottom - 13);
  const height = (closed: boolean, compact: boolean) => {
    const [pt, gap, mt, mb] = compact ? compactLayout : rootLayout;
    return (closed ? closedBase : base) + pt + (closed ? 6 : 8) * gap + mt + mb
      + (compact ? tradersCompact : tradersRoot) + (compact ? metaCompact : metaRoot);
  };
  const heights = {
    openComfortable: height(false, false), closedComfortable: height(true, false),
    openCompact: height(false, true), closedCompact: height(true, true),
  };
  return {
    layoutScaled: [...rootLayout, ...compactLayout].every(Number.isFinite)
      && rootLayout[0] > compactLayout[0] && rootLayout[1] > compactLayout[1]
      && Number.isFinite(metaCompact) && metaRoot === 0,
    internalScaled: everyGapScaled && !!pad && Number.isFinite(sp(pad[1])) && Number.isFinite(padBottom)
      && moveScaled && compactGridScaled,
    internalDetails: { everyGapScaled, padding, movement, moveScaled, compactGridScaled },
    actionEqual: cardAction === kitAction && cardAction === "var(--h-control-md)" && control >= floor,
    footerReach: Number.isFinite(footerReach) && padBottom + 1 >= footerReach,
    skeletonCoherent: skeletonFormulas && base === predictedBase && closedBase === predictedClosedBase
      && Object.values(heights).every(Number.isFinite) && heights.openComfortable > heights.openCompact
      && heights.closedComfortable > heights.closedCompact && heights.openCompact > heights.closedCompact,
    heights,
  };
}

console.log("V2a · classic card spacing and action geometry");
const current = inspect(css);
check("F10 · comfortable and compact layout tokens resolve to kit spacing rungs", current.layoutScaled);
check("F10 · card padding, inner gaps, movement and phone grid use kit spacing rungs", current.internalScaled,
  JSON.stringify(current.internalDetails));
check("F53 · card and home use btn-md; the card action inherits its 44px kit height", current.actionEqual
  && card.includes('className="btn btn-yes btn-md"') && card.includes('className="btn btn-no btn-md"')
  && home.includes('className="btn btn-yes btn-md kp-qrow__btn"') && home.includes('className="btn btn-no btn-md kp-qrow__btn"'));
check("F10 · bottom padding contains the footer's 40px click reach", current.footerReach);
check("F10/F53 · skeleton formulas include the action and spacing changes in both densities", current.skeletonCoherent,
  JSON.stringify(current.heights));
const plant = (before: string, after: string) => {
  if (!css.includes(before)) throw new Error(`plant target missing: ${before}`);
  return inspect(css.replace(before, after));
};
check("CONTROL · restoring the 40px card action is caught", !plant(".mcardp-actions .btn { height: var(--h-control-md);", ".mcardp-actions .btn { height: var(--tap-min);").actionEqual);
check("CONTROL · restoring a private 10px row gap is caught", !plant("--mcard-gap: var(--sp-3);", "--mcard-gap: 10px;").layoutScaled);
check("CONTROL · shrinking the footer padding below its hit reach is caught", !plant("padding: var(--mcard-pt) var(--sp-4) var(--sp-4);", "padding: var(--mcard-pt) var(--sp-4) var(--sp-3);").footerReach);
check("CONTROL · a stale skeleton base is caught", !plant("--mcard-base: 216px;", "--mcard-base: 209px;").skeletonCoherent);
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
