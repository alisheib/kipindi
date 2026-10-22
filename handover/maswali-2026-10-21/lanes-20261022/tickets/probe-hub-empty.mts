// Probe (lane TICKETS, light): the hub's no-week body, built as src/app/millionea/page.tsx builds it, through Millionea's
// one empty state (MaswaliEmptyState) — its numerals mono in sw/en/zh, and the kit without the part for comparison.
import { createRequire } from "node:module";
const req = createRequire("C:/50pick-ssd/kipindi-mln-dtkt/scripts/probe.mts");
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<string, Record<string, Record<string, string>>> };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: unknown };
const { nextOpenWords } = req("../src/app/millionea/hub-words.tsx") as { nextOpenWords: (t: unknown, ms: number) => string };
const { MaswaliEmptyState } = req("../src/components/maswali/maswali-empty-state.tsx") as { MaswaliEmptyState: unknown };
const { EmptyState } = req("../src/components/ui/empty-state.tsx") as { EmptyState: unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (l: string, el: unknown) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(I18nProvider as never, { initial: l } as never, el as never)));
const MONDAY_0001 = Date.parse("2026-12-06T21:01:00.000Z"); // Monday 00:01 EAT
const bodyOf = (p: string) => /<p class="[^"]*text-text-subtle[^"]*">([\s\S]*?)<\/p>/.exec(p)?.[1] ?? "?";
for (const l of ["sw", "en", "zh"]) {
  const t = dict[l];
  const body = [nextOpenWords(t, MONDAY_0001), t.millionea.questionsAtOpen].join(l === "zh" ? "" : " ");
  const props = { title: t.millionea.hubNoWeek, body, fill: true };
  const withPart = inApp(l, h(MaswaliEmptyState as never, props as never));
  const kit = inApp(l, h(EmptyState as never, props as never));
  const mono = [...withPart.matchAll(/<span class="mono">([^<]*)<\/span>/g)].map((m) => m[1]);
  console.log(`${l} BODY  ${body}`);
  console.log(`${l} MONO  ${JSON.stringify(mono)}  faces-only=${withPart.replace(/<span class="mono">([^<]*)<\/span>/g, "$1") === kit}`);
  console.log(`${l} HTML  ${bodyOf(withPart)}`);
}
