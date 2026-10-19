/** U43 B5: player words, duration grammar, and the current urgency motion. */
import { readFileSync } from "node:fs";
import { dict } from "../src/lib/i18n-dict";
import { roundDuration, roundName } from "../src/lib/updown-round-name";

let failures = 0;
const ok = (name: string, value: boolean) => {
  console.log(`${value ? "PASS" : "FAIL"} ${name}`);
  if (!value) failures++;
};
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = read("src/app/globals.css");
const states = read("scripts/live/updown-visual-states.mjs");
const tabs = read("src/components/updown/updown-board-tabs.tsx");
const receipt = read("src/components/updown/updown-bet-receipt-modal.tsx");

ok("Swahili duration places the numeral after dakika", roundDuration(dict.sw, 5) === "dakika 5" && roundName(dict.sw, "Bitcoin", 5) === "Bitcoin Juu na Chini · dakika 5");
ok("English and Chinese duration keep their own order", roundDuration(dict.en, 5) === "5 min" && roundDuration(dict.zh, 5) === "5 分钟");
ok("board chip, filter sheet and active summary all use the shared locale-aware duration",
  tabs.includes('const durationText = (minutes: number) => roundDuration({ market: { udMin: minLabel } }, minutes);')
  && tabs.includes('const activeDurText = activeDur ? durationText(activeDur.d) : durationsLabel;')
  && (tabs.match(/label=\{durationText\(tItem\.d\)\}/g) ?? []).length === 2
  && !tabs.includes('`${tItem.d} ${minLabel}`')
  && [dict.en, dict.sw, dict.zh].every((d) => roundDuration({ market: { udMin: d.market.udMin } }, 5) === roundDuration(d, 5)));
ok("bet receipt uses that same duration grammar beside the market source",
  receipt.includes('subtitle={`${roundDuration(t, info.durationMinutes)} · ${t.market[SOURCE_CLASS_KEY[info.sourceClass]]}`}')
  && !receipt.includes('`${info.durationMinutes} ${t.market.udMin}'));
ok("one round word in the handover labels", [dict.en.market.udNextMatchIn, dict.en.market.udNextMatchLive, dict.en.market.udNextMatchSoon, dict.en.market.udNextMatchNone, dict.en.market.udNextMatchLiveBody].every((v) => v.toLowerCase().includes("round")) && [dict.sw.market.udNextMatchIn, dict.sw.market.udNextMatchLive, dict.sw.market.udNextMatchSoon, dict.sw.market.udNextMatchNone, dict.sw.market.udNextMatchLiveBody].every((v) => v.toLowerCase().includes("raundi")) && [dict.zh.market.udNextMatchIn, dict.zh.market.udNextMatchLive, dict.zh.market.udNextMatchSoon, dict.zh.market.udNextMatchNone, dict.zh.market.udNextMatchLiveBody].every((v) => v.includes("回合")));
ok("empty-side explanation stays short and truthful in three languages", dict.en.market.udNobodyBackedEither.length <= 78 && dict.sw.market.udNobodyBackedEither.length <= 84 && dict.zh.market.udNobodyBackedEither.length <= 40 && /only one side.*every stake returns/i.test(dict.en.market.udNobodyBackedEither) && /upande mmoja tu.*kila dau litarudi/i.test(dict.sw.market.udNobodyBackedEither) && /只有一方.*所有本金退回/.test(dict.zh.market.udNobodyBackedEither));
ok("locked card explains the wait and guaranteed one-sided refund briefly in every language",
  [dict.en, dict.sw, dict.zh].every((d) => d.market.udLockedWhy.includes("{time}") && d.market.udLockedOneSided.includes("{side}"))
  && dict.en.market.udLockedWhy.length <= 65 && /final price/i.test(dict.en.market.udLockedWhy)
  && dict.sw.market.udLockedWhy.length <= 65 && /bei ya mwisho/i.test(dict.sw.market.udLockedWhy)
  && dict.zh.market.udLockedWhy.length <= 32 && /最终价格/.test(dict.zh.market.udLockedWhy)
  && dict.en.market.udLockedOneSided.length <= 55 && /full stake returns/i.test(dict.en.market.udLockedOneSided)
  && dict.sw.market.udLockedOneSided.length <= 55 && /Dau lako lote litarudi/.test(dict.sw.market.udLockedOneSided)
  && dict.zh.market.udLockedOneSided.length <= 35 && /全额退回/.test(dict.zh.market.udLockedOneSided));
ok("failed price read differs from a successful read with no newer price", [dict.en, dict.sw, dict.zh].every((d) => d.market.udReadUnavailable !== d.home.udMatchNoNewPrice && d.market.udReadUnavailable.length > 0));
ok("source names state market kind without a second live label", ["udSourceCrypto", "udSourceStock", "udSourceMetals", "udSourceFx", "udSourceGeneric"].every((key) => [dict.en, dict.sw, dict.zh].every((d) => !/\blive\b|moja kwa moja|实时/i.test(d.market[key as keyof typeof d.market] as string))));
ok("market sort and close-call filter use one idea per language", [dict.en, dict.sw, dict.zh].every((d) => d.market.sortClose === d.market.oddsCall));
ok("watchlist empty state does not promise a notice", [dict.en, dict.sw, dict.zh].every((d) => !/tell|notify|julisha|通知/i.test(d.watchlist.emptyBody)));
ok("urgency uses kit motion and captures the actual animation", !css.includes(".ud-count-pulse") && states.includes('querySelectorAll(".m-urgent")') && states.includes('x.animationName === "m-breathe"'));

console.log(`U43 SYSTEM: ${failures} failed`);
process.exit(failures ? 1 : 0);
