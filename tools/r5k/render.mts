/* Render every R5-K ghost in the three languages inside the root layout's providers; print sizes and a sample. */
import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5k/package.json");
const nextHeaders = req("next/headers");
nextHeaders.cookies = async () => ({ get: () => undefined, getAll: () => [], has: () => false });
nextHeaders.headers = async () => new Headers({ "x-pathname": "/" });
const React = req("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server");
const { I18nProvider } = req("F:/kipindi-r5k/src/lib/i18n.tsx");
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime");
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime");
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (path: string, l: string, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: path }, h(I18nProvider, { initial: l }, el))));
const G = {
  receipt: req("F:/kipindi-r5k/src/app/wallet/receipt/[id]/loading.tsx").default,
  deposit: req("F:/kipindi-r5k/src/app/wallet/deposit/deposit-ghost.tsx").DepositGhost,
  ret: req("F:/kipindi-r5k/src/app/wallet/deposit/return/loading.tsx").default,
  withdraw: req("F:/kipindi-r5k/src/app/wallet/withdraw/loading.tsx").default,
  profile: req("F:/kipindi-r5k/src/app/profile/loading.tsx").default,
  positions: req("F:/kipindi-r5k/src/app/positions/positions-ghost.tsx").PositionsGhost,
  performance: req("F:/kipindi-r5k/src/app/positions/performance/loading.tsx").default,
};
const which = process.argv[2];
for (const [k, C] of Object.entries(G)) for (const l of ["sw", "en", "zh"]) {
  try {
    const html = inApp("/", l, h(C));
    console.log(`${k} ${l}: ${html.length} chars`);
    if (which === k && l === "sw") console.log(html);
  } catch (e) { console.log(`${k} ${l}: THREW ${String((e as Error).stack).slice(0, 600)}`); }
}
