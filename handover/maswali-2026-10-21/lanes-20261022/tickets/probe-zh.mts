// Probe (lane TICKETS, light): does the kit EmptyState's opt-in numeral part reach a zh body that holds a Chinese mark?
import { createRequire } from "node:module";
const req = createRequire("C:/50pick-ssd/kipindi-mln-dtkt/scripts/probe.mts");
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { emptyStateBody } = req("../src/components/ui/empty-state-text.ts") as { emptyStateBody: (b: unknown, p?: unknown) => unknown };
const { numeralRuns } = req("../src/components/maswali/maswali-facts.tsx") as { numeralRuns: (s: string) => unknown };
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<string, Record<string, Record<string, string>>> };
const P = (n: unknown) => renderToStaticMarkup(h("p", null, n as never));
for (const l of ["sw", "en", "zh"]) {
  const tpl = dict[l].millionea.emptyTicketsNext;
  const when = l === "zh" ? "周五 18:00" : l === "sw" ? "Ijumaa 18:00" : "Friday 18:00";
  const body = String(tpl).replace("{week}", "3").replace("{when}", when);
  console.log(`${l} TEMPLATE ${JSON.stringify(tpl)}`);
  console.log(`${l} BODY     ${body}`);
  console.log(`${l} WITH     ${P(emptyStateBody(body, numeralRuns))}`);
  console.log(`${l} WITHOUT  ${P(emptyStateBody(body))}`);
}
// The test's own zh case
const zh = "第3周开放至周五 18:00。";
console.log(`zh-case WITH ${P(emptyStateBody(zh, numeralRuns))}`);
