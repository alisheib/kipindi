/* R5-L · render every changed ghost in sw/en/zh on React's server renderer (as the suite will) — a smoke check for throws,
 * missing words ("undefined") and stray visible text. Run from F:/kipindi-r5l: npx tsx <this file> */
import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5l/package.json");
const React = req("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server");
const { I18nProvider } = req("F:/kipindi-r5l/src/lib/i18n.tsx");
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime");
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime");
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (path: string, l: string, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: path }, h(I18nProvider, { initial: l }, el))));
const FILES = [
  "agent/loading", "agent/apply/loading", "agent/status/loading", "agent/invite/[token]/loading", "leaderboard/loading",
  "results/loading", "markets/loading", "live/loading", "fairness/loading", "help/loading", "notifications/loading",
  "profile/account/loading", "profile/activity/loading", "profile/invite/loading", "profile/kyc/loading",
  "profile/notifications/loading", "profile/responsible-gambling/loading", "profile/security/loading",
  "profile/sessions/loading", "profile/source-of-funds/loading", "proposals/loading", "proposals/new/loading", "watchlist/loading",
];
let bad = 0;
for (const f of FILES) {
  const mod = req(`F:/kipindi-r5l/src/app/${f}.tsx`);
  for (const l of ["sw", "en", "zh"]) {
    try {
      const html = inApp("/" + f.replace(/\/?loading$/, ""), l, h(mod.default));
      const issues: string[] = [];
      if (/undefined|NaN|\[object Object\]/.test(html)) issues.push("undefined/NaN in markup");
      if (l === "sw") console.log(`${f.padEnd(40)} ${String(html.length).padStart(6)} B`);
      if (issues.length) { bad++; console.log(`  ${f} ${l}: ${issues.join(", ")} … ${html.match(/.{0,80}(undefined|NaN).{0,40}/)?.[0]}`); }
    } catch (e) { bad++; console.log(`  ${f} ${l}: THREW ${String(e).slice(0, 200)}`); }
  }
}
// the in-page fallbacks
const { ResultsGhostBands } = req("F:/kipindi-r5l/src/app/results/loading.tsx");
const { MarketsBoardGhost } = req("F:/kipindi-r5l/src/app/markets/loading.tsx");
for (const l of ["sw", "en", "zh"]) {
  for (const [name, el] of [["ResultsGhostBands", h(ResultsGhostBands, { notable: false, searching: true })], ["MarketsBoardGhost", h(MarketsBoardGhost)]] as const) {
    try { const html = inApp("/x", l, el); if (/undefined|NaN/.test(html)) { bad++; console.log(`  ${name} ${l}: undefined`); } }
    catch (e) { bad++; console.log(`  ${name} ${l}: THREW ${String(e).slice(0, 200)}`); }
  }
}
console.log(bad ? `${bad} problem(s)` : "all ghosts render in sw/en/zh");
