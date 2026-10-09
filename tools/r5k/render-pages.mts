/* Render the PAGE-side components R5-K touched (the standing strip, the name editor, the money books' bar ghost) and print
   a sha-256 of each render, in sw/en/zh — run on this tip's files and on R5-K's to show the markup is byte-identical. */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5k/package.json");
const React = req("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server");
const { I18nProvider } = req("F:/kipindi-r5k/src/lib/i18n.tsx");
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime");
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime");
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (l: string, el: unknown) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: "/" }, h(I18nProvider, { initial: l }, el))));
const { dict } = req("F:/kipindi-r5k/src/lib/i18n-dict.ts");
const { PnlSummaryStrip } = req("F:/kipindi-r5k/src/components/positions/pnl-summary-strip.tsx");
const { ProfileNameEditor } = req("F:/kipindi-r5k/src/components/profile/name-editor.tsx");
const { MoneyBarGhost } = req("F:/kipindi-r5k/src/app/wallet/money-bar-ghost.tsx");
const { WalletGhost } = req("F:/kipindi-r5k/src/app/wallet/wallet-ghost.tsx");
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
for (const l of ["sw", "en", "zh"]) {
  const t = dict[l];
  const strip = inApp(l, h(PnlSummaryStrip, { openCount: 2, openStake: 10000, openLiveValue: 9000, settledNet: -500, wins: 1, losses: 2, cashOuts: 0, settledCount: 3, t: { yourStanding: t.positions.yourStanding, live: t.common.live, atRisk: t.positions.atRisk, open: t.common.open, liveValueIfSettled: t.positions.liveValueIfSettled, unrealised: t.positions.unrealised, settledPnl: t.positions.settledPnl, winRate: t.positions.winRate, ofSettled: "3" } }));
  const strip2 = inApp(l, h(PnlSummaryStrip, { openCount: 0, openStake: 0, openLiveValue: 0, settledNet: 1500, wins: 3, losses: 0, cashOuts: 1, settledCount: 4, t: { yourStanding: "a", live: "b", atRisk: "c", open: "d", liveValueIfSettled: "e", unrealised: "f", settledPnl: "g", winRate: "h", ofSettled: "i" } }));
  const named = inApp(l, h(ProfileNameEditor, { currentName: "Juma", fallbackPlaceholder: "x" }));
  const unnamed = inApp(l, h(ProfileNameEditor, { currentName: null, fallbackPlaceholder: t.profile.setYourName }));
  const bar = inApp(l, h(MoneyBarGhost, { t, lenses: [t.common.all, "x"], count: t.wallet.nResults.replace("{n}", "00") }));
  const wallet = inApp(l, h(WalletGhost, { bonusLive: false }));
  console.log(`${l}: strip ${sha(strip)} ${sha(strip2)} · name ${sha(named)} ${sha(unnamed)} · bar ${sha(bar)} · wallet ghost ${sha(wallet)}`);
}
