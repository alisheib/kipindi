import assert from "node:assert/strict";
import { maskQuestionEventTimes, normaliseQuestionBreakClocks, QUESTION_BREAK_CLOCK, normaliseBookHomeCloseDates, BOOK_HOME_CLOSE_DATE, BOOK_WATCHLIST_DATE } from "./lib/question-time-mask.mjs";

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

for (const locale of ['en', 'sw']) {
  const mask = {...BOOK_HOME_CLOSE_DATE, locale}, prefix = mask.prefixes[locale], month = locale === 'sw' ? 'Okt' : 'Oct';
  const featured = leaf(prefix + '14 ' + month), source = leaf(' · Settles on bot.go.tz', 2), row = leaf(prefix + '13 ' + month);
  const result = normaliseBookHomeCloseDates(mask, {featured: [featured, source], rows: [row]});
  assert.deepEqual(result, {featured: 1, rows: 1, leaves: {featured: 1, rows: 1}});
  assert.equal(featured.textContent, prefix + mask.text);
  assert.equal(row.textContent, prefix + mask.text);
  assert.equal(source.textContent, ' · Settles on bot.go.tz');
  assert.equal(featured.style, 'font: 13px inherit; padding: 1px');
  assert.equal(featured.attributes['data-kept'], 'exact');
  assert.deepEqual(normaliseBookHomeCloseDates(mask, {featured: [featured, source], rows: [row]}), result, 'canonical text remains a validated leaf on stability reads');
  for (const date of ['31 Feb', '31 Apr', '29 Feb 2026', '29 Feb 1900', '14 ' + month + ' 0000', '14 ' + month + ' 10000', '14, ' + month, '14 ' + month + ', 14:21', locale === 'sw' ? '14 Oct' : '14 Okt', '14 ' + month + ' words']) {
    const invalid = leaf(prefix + date);
    assert.equal(normaliseBookHomeCloseDates(mask, {featured: [invalid], rows: []}).featured, 0);
    assert.equal(invalid.textContent, prefix + date);
  }
  const changedWords = leaf('Ends 14 ' + month);
  assert.equal(normaliseBookHomeCloseDates(mask, {featured: [changedWords], rows: []}).featured, 0);
  assert.equal(changedWords.textContent, 'Ends 14 ' + month);
  const valid = ['4 Jan 2027', '29 Feb 2000', '29 Feb 2028'].map(date => leaf(prefix + date));
  assert.equal(normaliseBookHomeCloseDates(mask, {featured: [], rows: valid}).rows, 3);
}
console.log('home-close-date: only complete locale dates in the two named home leaf kinds canonicalize; prefix/source/attributes/paint stay intact; invalid date/locale/year/word/population controls pass');

// U43 B4 moved the card's time into its top row (.mcardp-closes, market-card.tsx), the live mark inside it, before the date.
assert.equal(BOOK_WATCHLIST_DATE.selector, '#main-content article.mcardp .mcardp-closes[data-market-part="time"]', 'only classic watchlist card time slots are selected');
for (const locale of ['en', 'sw']) {
  const mask = { ...BOOK_WATCHLIST_DATE, locale }, month = locale === 'sw' ? 'Okt' : 'Oct';
  const date = { nodeType: 3, nodeValue: `14 ${month}, 13:43` };
  const liveMark = { nodeType: 1, outerHTML: '<span class="mcardp-live-mark"><span class="mcardp-live-dot" aria-hidden="true"></span><span class="sr-only">Live</span></span>' };
  const card = { childNodes: [liveMark, date], childElementCount: 1, className: 'mcardp-closes inline-flex items-center gap-1', style: 'color: navy', attributes: { 'data-market-part': 'time' } };
  assert.equal(normaliseQuestionBreakClocks(mask, [card]), 1, 'a date text node beside the live mark is canonicalized');
  assert.equal(date.nodeValue, mask.text);
  assert.equal(card.childNodes[0], liveMark, 'the live mark before the date is kept');
  assert.equal(card.style, 'color: navy', 'the card paint is kept');
  assert.equal(normaliseQuestionBreakClocks(mask, [card]), 1, 'a stability read is idempotent');
  for (const bad of ['31 Feb, 13:43', '14 ' + month + ' 13:43', locale === 'sw' ? '14 Oct, 13:43' : '14 Okt, 13:43', 'Voided', 'Resolved YES']) {
    const node = { nodeType: 3, nodeValue: bad };
    assert.equal(normaliseQuestionBreakClocks(mask, [{ childNodes: [liveMark, node], childElementCount: 1 }]), 0, `${bad} remains visible`);
    assert.equal(node.nodeValue, bad);
  }
  const two = [{ nodeType: 3, nodeValue: `14 ${month}, 13:43` }, { nodeType: 3, nodeValue: 'extra words' }];
  assert.equal(normaliseQuestionBreakClocks(mask, [{ childNodes: two, childElementCount: 0 }]), 0, 'two direct text nodes are not a date');
}
console.log('watchlist-date: only a complete locale EAT moment in one direct text node canonicalizes; the live mark and paint stay intact; invalid, status and mixed-text controls pass');
