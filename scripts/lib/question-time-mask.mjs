/** S8 parity: mask only a question Event's two inert seed timestamps, keeping every other byte. */
export function maskQuestionEventTimes(html) {
  let fields = 0;
  const masked = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (script, attributes, json) => {
    // Hex quote/backtick spellings keep the literal-aware source guard unambiguous without changing HTML grammar.
    const attrs = [...attributes.matchAll(/(?:^|\s)([^\s\x22\x27<>/=]+)(?:\s*=\s*(?:\x22([^\x22]*)\x22|\x27([^\x27]*)\x27|([^\s\x22\x27=<>\x60]+)))?/g)];
    const type = attrs.find((match) => match[1].toLowerCase() === "type");
    if (!type || (type[2] ?? type[3] ?? type[4]) !== "application/ld+json") return script;
    let event;
    try { event = JSON.parse(json); } catch { return script; }
    if (!event || Array.isArray(event) || event["@context"] !== "https://schema.org" || event["@type"] !== "Event") return script;
    const clock = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
    const edits = [];
    let depth = 0, previous = null, key = null;
    // JSON.parse validates the grammar first. String tokens include their escapes; nesting keeps child dates intact.
    for (const match of json.matchAll(/\x22(?:\\.|[^\x22\\])*\x22|[{}\[\]:,]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g)) {
      const token = match[0];
      if (depth === 1 && token.startsWith('"') && (previous === "{" || previous === ",")) key = JSON.parse(token);
      else if (depth === 1 && previous === ":") {
        if ((key === "startDate" || key === "endDate") && token.startsWith('"')) {
          const value = JSON.parse(token);
          const canonical = value.includes(".") ? value : value.replace(/Z$/, ".000Z");
          if (clock.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === canonical) edits.push([match.index, match.index + token.length]);
        }
        key = null;
      }
      if (token === "{" || token === "[") depth++;
      else if (token === "}" || token === "]") depth--;
      previous = token;
    }
    let result = json;
    for (const [start, end] of edits.reverse()) result = result.slice(0, start) + '"~event-time"' + result.slice(end);
    fields += edits.length;
    // Replace the JSON content once; script attributes and all non-clock JSON tokens retain their exact bytes.
    return script.slice(0, script.indexOf(">") + 1) + result + script.slice(script.lastIndexOf("</"));
  });
  return { html: masked, fields };
}

/** A17's server-rendered break end: only a validated, complete EAT date leaf in these two named notices. */
export const QUESTION_BREAK_CLOCK = {
  selector: '[data-testid="market-bet-break"] span.whitespace-nowrap, [data-testid="market-break"] span.whitespace-nowrap',
  pattern: '^([1-9]|[12][0-9]|3[01]) (Jan|Feb|Mar|Mac|Apr|May|Mei|Jun|Jul|Aug|Ago|Sep|Oct|Okt|Nov|Dec|Des)(?: ([0-9]{4}))?, (?:[01][0-9]|2[0-3]):[0-5][0-9]$',
  months: {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    sw: ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ago", "Sep", "Okt", "Nov", "Des"],
  },
  text: "22 Sep, 22:22",
};

/** Runs in the page before geometry is read. It keeps the date element, attributes, style and surrounding words. */
export function normaliseQuestionBreakClocks(mask, roots = null) {
  const candidates = roots ?? [...document.querySelectorAll(mask.selector)];
  const valid = new RegExp(mask.pattern);
  const months = mask.months[mask.locale];
  if (!months) return 0;
  let fields = 0;
  for (const el of candidates) {
    if (el.childElementCount !== 0) continue;
    const parsed = valid.exec(el.textContent);
    if (!parsed) continue;
    const month = months.indexOf(parsed[2]), day = Number(parsed[1]);
    // An omitted year can be a leap year; a present year must be Gregorian, in the formatter's four-digit domain.
    const year = parsed[3] === undefined ? 2000 : Number(parsed[3]);
    if (month < 0 || year < 1 || year > 9999) continue;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const last = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
    if (day > last) continue;
    el.textContent = mask.text;
    fields++;
  }
  return fields;
}
