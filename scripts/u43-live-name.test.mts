/** U43 B5: the same Up & Down name on /live and journey cards, with the stored audit title untouched. */
import { readFileSync } from "node:fs";
import { dict } from "../src/lib/i18n-dict";
import { marketDisplayTitle } from "../src/lib/updown-round-name";

let failures = 0;
const ok = (name: string, value: boolean) => {
  console.log(`${value ? "PASS" : "FAIL"} ${name}`);
  if (!value) failures++;
};
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const stored = {
  productLine: "UPDOWN",
  titleEn: "Bitcoin Up or Down · 15 min",
  titleSw: "Bitcoin Juu au Chini · dakika 15",
  titleZh: "比特币涨跌 · 15分钟",
};
const original = { ...stored };
ok("round display uses one game name in all three languages", (
  marketDisplayTitle(dict.en, "en", stored) === "Bitcoin Up & Down · 15 min"
  && marketDisplayTitle(dict.sw, "sw", stored) === "Bitcoin Juu na Chini · dakika 15"
  && marketDisplayTitle(dict.zh, "zh", stored) === "比特币 涨跌 · 15 分钟"
));
ok("display mapping leaves stored audit titles unchanged", JSON.stringify(stored) === JSON.stringify(original));
ok("other markets and unrecognised round titles remain faithful", (
  marketDisplayTitle(dict.sw, "sw", { ...stored, productLine: "MARKET" }) === stored.titleSw
  && marketDisplayTitle(dict.sw, "sw", { ...stored, titleSw: "Kitu kingine" }) === "Kitu kingine"
));
const wall = read("src/app/live/pulse-grid.tsx");
ok("classic live card titles use the display name", /const title = marketDisplayTitle\(t, locale, market\);/.test(wall));
const live = read("src/app/live/page.tsx");
ok("featured live titles use the display name", /const topContested = mostContested\.map\([\s\S]*?title: marketDisplayTitle\(t, locale, m\), yesPct,/.test(live));
const journey = read("src/components/journey/cards/journey-card.tsx");
ok("journey card titles and link labels use the same round name", (
  journey.includes('const title = m.productLine === "UPDOWN"')
  && journey.includes('text: marketDisplayTitle(t, locale, m), short: false')
  && journey.includes('aria-label={m.productLine === "UPDOWN" ? title.text : pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}')
));
const results = read("src/app/results/page.tsx");
ok("results archive and notable card use the display name", (
  results.includes("title: marketDisplayTitle(t, locale, m),")
  && results.includes("keepFigures(marketDisplayTitle(t, locale, m))")
));
const marketCard = read("src/components/markets/market-card.tsx");
ok("classic result cards use the display name", marketCard.includes("const title = marketDisplayTitle(t, locale, { productLine, titleEn, titleSw, titleZh: titleZh ?? null });"));
const service = read("src/lib/server/market-service.ts");
ok("all four round result notices use display names", (
  service.includes("function upDownResultTitle(")
  && service.includes('marketDisplayTitle(dict.en, "en", m)')
  && service.includes('marketDisplayTitle(dict.sw, "sw", m)')
  && service.includes('marketDisplayTitle(dict.zh, "zh", m)')
  && (service.match(/marketTitle: upDownResultTitle\(m\),/g) ?? []).length === 4
));
const fairness = read("src/app/fairness/page.tsx");
ok("fairness remains scoped to long-form markets", fairness.includes("const terminal = await listTerminalMarkets();"));
console.log(`U43 LIVE NAME: ${failures} failed`);
process.exit(failures ? 1 : 0);
