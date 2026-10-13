import assert from "node:assert/strict";
import { maskQuestionEventTimes, normaliseQuestionBreakClocks, QUESTION_BREAK_CLOCK } from "./lib/question-time-mask.mjs";

const first = "2026-10-13T12:00:00.123Z", next = "2026-10-13T12:37:00.123Z";
const event = `{"@context":"https://schema.org","@type":"Event","name":"rain \\u003c quote \\\"","startDate":"${first}","endDate":"${first}","organizer":{"startDate":"${first}","name":"50pick"},"location":{"url":"/markets/market_fixed"}}`;
const script = (json = event, type = "application/ld+json") => `<script type="${type}" data-static="exact">${json}</script>`;
const baseline = `<main><time datetime="${first}">${first}</time><p>TZS 1,234 · 50%</p>${script()}</main>`;
const mask = maskQuestionEventTimes;
const clean = mask(baseline);
assert.equal(clean.fields, 2);
assert.equal(clean.html, baseline.replace(`"startDate":"${first}"`, '"startDate":"~event-time"').replace(`"endDate":"${first}"`, '"endDate":"~event-time"'));
assert.equal(mask(clean.html).html, clean.html, "idempotent");
assert.equal(mask(script(event.replace(`"startDate":"${first}"`, `"startDate":"${next}"`).replace(`"endDate":"${first}"`, `"endDate":"${next}"`))).html, mask(script()).html, "top-level clocks alone compare equal");
for (const [name, changed] of [
  ["visible timestamp", baseline.replace(`<time datetime="${first}">${first}`, `<time datetime="${first}">${next}`)],
  ["visible date attribute", baseline.replace(`datetime="${first}"`, `datetime="${next}"`)],
  ["money figure", baseline.replace("TZS 1,234", "TZS 9,876")],
  ["event words", baseline.replace("rain ", "snow ")],
  ["event URL", baseline.replace("market_fixed", "market_other")],
  ["event nested clock", baseline.replace(`"organizer":{"startDate":"${first}"`, `"organizer":{"startDate":"${next}"`)],
  ["event shape", baseline.replace('"location":', '"venue":')],
]) assert.notEqual(mask(changed).html, clean.html, `${name} remains a detected change`);
assert.equal(mask(script(event, "application/json")).html, script(event, "application/json"), "ordinary script untouched");
assert.equal(mask(script(event.replace('"Event"', '"SportsEvent"'))).fields, 0, "another schema type untouched");
assert.equal(mask(script('{"startDate":"broken"}')).fields, 0, "unrecognised schema untouched");
assert.equal(mask(script(event.replace(first, "broken"))).fields, 1, "malformed date remains visible to compare");
assert.equal(mask(script("invalid JSON")).html, script("invalid JSON"), "invalid JSON untouched");
assert.equal(mask(`<script type='application/ld+json'>${event}</script>`).fields, 2, "single-quoted type supported");
assert.equal(mask(`<script data-type="application/ld+json">${event}</script>`).fields, 0, "attribute substring is not a type");
assert.equal(mask(`<script data-other=" type='application/ld+json' ">${event}</script>`).fields, 0, "a type spelling inside another attribute's value is not a type");
assert.equal(mask(script(event.replace(first, "2026-02-31T12:00:00.123Z"))).fields, 1, "an impossible calendar date remains compared");
// Negative controls for the detector itself: broad normalisation must lose at least one required distinction.
const broadMasks = [
  (html) => html.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, "~event-time"),
  (html) => html.replace(/<script[^]*?<\/script>/g, "<script>~</script>"),
  (html) => mask(html).html.replace(/TZS [\d,]+/g, "TZS ~"),
];
const pairs = [[baseline, baseline.replace(`<time datetime="${first}">${first}`, `<time datetime="${first}">${next}`)], [baseline, baseline.replace("rain ", "snow ")], [baseline, baseline.replace("TZS 1,234", "TZS 9,876")]];
assert.ok(broadMasks.every((mutant, i) => mutant(pairs[i][0]) === mutant(pairs[i][1])), "all three broad-mask mutants are caught by the positive distinctions");
const leaf = (text, children = 0) => ({ textContent: text, childElementCount: children, className: "whitespace-nowrap", style: "font: 13px inherit; padding: 1px", attributes: { "data-kept": "exact" } });
const enClock = { ...QUESTION_BREAK_CLOCK, locale: "en" }, swClock = { ...QUESTION_BREAK_CLOCK, locale: "sw" };
const notices = [leaf("14 Oct, 13:43"), leaf("14 Okt, 14:21")];
assert.equal(normaliseQuestionBreakClocks(enClock, [notices[0]]) + normaliseQuestionBreakClocks(swClock, [notices[1]]), 2);
assert.ok(notices.every((el) => el.textContent === QUESTION_BREAK_CLOCK.text && el.className === "whitespace-nowrap" && el.style === "font: 13px inherit; padding: 1px" && el.attributes["data-kept"] === "exact"), "only leaf text changed; paint and attributes stay measured");
for (const text of ["14 Oct 13:43", "14 Oct, 25:43", "32 Oct, 13:43", "31 Feb, 13:43", "31 Apr, 13:43", "29 Feb 2026, 13:43", "29 Feb 1900, 13:43", "14 Oct 0000, 13:43", "14 Oct 10000, 13:43", "14 Okt, 13:43", "TZS 1,234", "until 14 Oct, 13:43", "shortened —", "stop withdrawals."]) {
  const node = leaf(text); assert.equal(normaliseQuestionBreakClocks(enClock, [node]), 0); assert.equal(node.textContent, text);
}
assert.equal(normaliseQuestionBreakClocks(enClock, [leaf("14 Oct, 13:43", 1)]), 0, "a parent sentence is not a date leaf");
assert.equal(normaliseQuestionBreakClocks(enClock, [leaf("14 Oct, 13:43"), leaf("14 Oct, 13:43"), leaf("14 Oct, 13:43")]), 3, "an extra clock leaf stays a detectable population change");
assert.equal(normaliseQuestionBreakClocks(enClock, [leaf("4 Jan 2027, 00:00"), leaf("29 Feb 2000, 00:00"), leaf("29 Feb 2028, 00:00")]), 3, "later years and valid leap days remain valid");
assert.equal(normaliseQuestionBreakClocks(swClock, [leaf("4 Mar, 00:00")]), 0, "a month from another locale is not masked");
assert.equal(QUESTION_BREAK_CLOCK.selector, '[data-testid="market-bet-break"] span.whitespace-nowrap, [data-testid="market-break"] span.whitespace-nowrap', "the geometry normalizer's population is exactly the two named notices");
console.log("question-time-mask: inert Event mask preserves all visible dates/figures and other JSON fields; A17 geometry canonicalizes only valid EAT leaves in two named notices, preserving paint/attributes/words; calendar/locale/year/population controls pass; 3 broad-mask controls caught");
