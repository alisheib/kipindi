/**
 * S5 admin touch floor. The general tap-target guard permits the dense admin xs
 * rung, but these Maswali forms and money ceremonies also run on a phone.
 * Resolve the kit's actual height tokens, then inspect every interactive kit
 * call in the affected routes and the calendar/time subcontrols they open.
 */
import { readFileSync } from "node:fs";
import { endOfOpenTag } from "./lib/jsx-open-tag.mts";
import { decomment } from "./lib/decomment.mts";

const root = new URL("..", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const files = [
  "src/app/admin/maswali/new/week-builder.tsx",
  "src/app/admin/maswali/pools/page.tsx",
  "src/app/admin/maswali/pools/pools-controls.tsx",
  "src/app/admin/maswali/integrity/integrity-controls.tsx",
] as const;
const sources = Object.fromEntries(files.map((path) => [path, read(path)]));
const dateKit = read("src/components/ui/date-select.tsx");
const timeKit = read("src/components/ui/time-select.tsx");
const css = read("src/app/globals.css");
const px = (token: string) => {
  const match = new RegExp(`--${token}:\\s*(\\d+)px`).exec(css);
  if (!match) throw new Error(`Missing ${token}; touch floor cannot be checked`);
  return Number(match[1]);
};
const floor = px("tap-min");
const heights = {
  Button: { xs: px("h-control-xs"), sm: px("h-control-sm"), md: px("h-control-md") },
  Select: { xs: 32, sm: 36, md: 44 }, // select.tsx min-h mapping
  Input: { sm: px("h-control-sm") - 2, md: px("h-input") - 2 }, // inner input, within the 1px border
  DateSelect: { sm: 36 - 2, md: px("h-input") - 2 }, // segment/button within its 1px border
  TimeSelect: { sm: 36 - 2, md: px("h-input") - 2 },
} as const;
if (floor !== 40 || heights.Button.sm !== floor || heights.Button.md !== 44 || heights.Input.md !== 42)
  throw new Error("Kit height premises changed; update this guard from the rendered kit");

type Sources = Record<string, string>;
const tags = (source: string, names: string) => {
  const match = new RegExp(`<(${names})\\b`, "g");
  const result: { name: string; text: string }[] = [];
  for (const found of source.matchAll(match)) {
    const end = endOfOpenTag(source, found.index);
    if (end < 0) throw new Error(`Unclosed <${found[1]}> in source`);
    result.push({ name: found[1], text: source.slice(found.index, end + 1) });
  }
  return result;
};

function audit(routeSources: Sources, calendar: string, time: string) {
  const problems: string[] = [];
  let controls = 0;
  for (const path of files) {
    const tagList = tags(decomment(routeSources[path]), "Button|Select|Input|DateSelect|TimeSelect");
    if (tagList.length === 0) problems.push(`${path}: no kit controls found`);
    controls += tagList.length;
    for (const tag of tagList) {
      const size = /\bsize="(xs|sm|md)"/.exec(tag.text)?.[1] ?? "md";
      const table = heights[tag.name as keyof typeof heights] as Record<string, number>;
      const height = table[size];
      if (height === undefined || height < floor)
        problems.push(`${path}: <${tag.name} size="${size}"> gives ${height ?? "unknown"}px direct target`);
    }
  }
  if (controls < 30) problems.push(`Only ${controls} kit controls found; route inspection may be incomplete`);

  // The calendar is a portal, so a closed-field screenshot cannot inspect these buttons.
  const cleanCalendar = decomment(calendar);
  const popup = cleanCalendar.slice(cleanCalendar.indexOf("{mounted && calOpen && createPortal("));
  if (popup.length === calendar.length) problems.push("DateSelect calendar portal missing");
  const popupButtons = tags(popup, "button").filter((tag) => !tag.text.includes('className="fixed inset-0'));
  if (popupButtons.length !== 7) problems.push(`Expected 7 calendar button templates; found ${popupButtons.length}`);
  for (const [i, button] of popupButtons.entries()) {
    if (!button.text.includes("h-[var(--tap-min)]") && !button.text.includes("min-h-[var(--tap-min)]"))
      problems.push(`DateSelect calendar button ${i + 1} has no 40px height floor`);
  }
  const navButtons = popupButtons.filter((button) => /prevMonth|nextMonth|backToCalendar/.test(button.text));
  if (navButtons.length !== 3) problems.push(`Expected 3 calendar navigation buttons; found ${navButtons.length}`);
  for (const button of navButtons)
    if (!button.text.includes("w-[var(--tap-min)]")) problems.push("DateSelect calendar navigation button has no 40px width floor");
  if (!calendar.includes('grid grid-cols-7 gap-0 px-1 pb-3'))
    problems.push("DateSelect day grid no longer makes seven 40px targets fit at 320px");

  const segment = tags(decomment(time), "input").find((tag) => tag.text.includes("SEG_WIDTH"));
  if (!segment?.text.includes('minWidth: "var(--tap-min)"') || !segment.text.includes('className="h-full'))
    problems.push("TimeSelect hour/minute direct inputs lack 40px width and full-height hit areas");
  if (!time.includes('key={seg.key} className="flex h-full items-center"'))
    problems.push("TimeSelect input parent does not stretch to the field height");
  const width = /w-\[(\d+)px\]/.exec(time)?.[1];
  if (!width || Number(width) < 152)
    problems.push("TimeSelect field too narrow for two 40px inputs, separator and 24h cap");
  return problems;
}

const problems = audit(sources, dateKit, timeKit);
if (problems.length) {
  for (const problem of problems) console.error(`FAIL ${problem}`);
  process.exit(1);
}
console.log(`PASS S5 admin touch floor: ${files.length} routes, calendar portal and TimeSelect subfields (>=${floor}px)`);

if (process.argv.includes("--prove-red")) {
  const builder = files[0];
  const mutatedBuilder = sources[builder].replace('size="md" />', 'size="sm" />');
  const mutatedDate = dateKit.replace('"h-[var(--tap-min)] rounded-md font-mono', '"h-[32px] rounded-md font-mono');
  const mutatedTime = timeKit.replace('minWidth: "var(--tap-min)"', 'minWidth: "20px"');
  const cases = [
    ["route DateSelect", audit({ ...sources, [builder]: mutatedBuilder }, dateKit, timeKit)],
    ["calendar day", audit(sources, mutatedDate, timeKit)],
    ["time segment", audit(sources, dateKit, mutatedTime)],
  ] as const;
  for (const [name, failures] of cases) {
    if (failures.length === 0) throw new Error(`RED failed: shrinking ${name} was accepted`);
    console.log(`PASS RED ${name}: ${failures[0]}`);
  }
}
