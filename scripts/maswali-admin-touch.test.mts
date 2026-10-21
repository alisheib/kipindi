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
  "src/app/admin/maswali/page.tsx",
  "src/app/admin/maswali/new/week-builder.tsx",
  "src/app/admin/maswali/pools/page.tsx",
  "src/app/admin/maswali/pools/pools-controls.tsx",
  "src/app/admin/maswali/integrity/integrity-controls.tsx",
  "src/app/admin/maswali/[weekId]/week-controls.tsx",
] as const;
const sources = Object.fromEntries(files.map((path) => [path, read(path)]));
const detailPage = read("src/app/admin/maswali/[weekId]/page.tsx");
const dateKit = read("src/components/ui/date-select.tsx");
const timeKit = read("src/components/ui/time-select.tsx");
const sortKit = read("src/components/admin/admin-sort.tsx");
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

/** The repo's own spacing scale (`tailwind.config.ts`, `extend.spacing`: `"3": "16px"`); `0` is Tailwind's 0. */
const tailwind = read("tailwind.config.ts");
const spacingBlock = tailwind.slice(tailwind.indexOf("spacing: {"), tailwind.indexOf("}", tailwind.indexOf("spacing: {")));
const spacing = (key: string) => {
  if (key === "0") return 0;
  const match = new RegExp(`"${key.replace(".", "\\.")}":\\s*"(\\d+(?:\\.\\d+)?)px"`).exec(spacingBlock);
  if (!match) throw new Error(`Missing spacing ${key}; the calendar's geometry cannot be computed`);
  return Number(match[1]);
};
/** How far a selected day's halo reaches past its cell: `--glow-selected`'s blur plus its spread (12px - 1px = 11px). */
const glow = /--glow-selected:\s*0 0 (\d+)px (-?\d+)px/.exec(css);
if (!glow) throw new Error("Missing --glow-selected; the calendar's halo room cannot be checked");
const haloReach = Number(glow[1]) + Number(glow[2]);

/**
 * THE DAY GRID'S WIDTH, AS THE BROWSER LAYS IT OUT (MASWALI-BUILD S5-FIX-PLATFORM D9, 2026-10-21). This guard used to
 * hold a class string, and passed while the rendered columns were 36px wide at 320 and the weekday labels stood up to
 * 10px off their columns (the tiles measured both). So the geometry is computed from the classes themselves: the
 * dialog's padding, the panel's width rule and border, the one inset the weekdays and the days share, and the grid's
 * gap give every column's width at 320 and 360, and the room a selected day's halo has from 336 (where seven 40px
 * columns leave it 11px).
 */
function calendarGeometry(popup: string): string[] {
  const problems: string[] = [];
  const cls = (text: string | undefined) => /className="([^"]*)"/.exec(text ?? "")?.[1] ?? "";
  const divs = tags(popup, "div");
  const dialogCls = cls(divs.find((tag) => tag.text.includes('role="dialog"'))?.text);
  const panelCls = cls(divs.find((tag) => cls(tag.text).includes("m-dialog-in"))?.text);
  const pad = /(?:^|\s)p-([\d.]+)(?:\s|$)/.exec(dialogCls)?.[1];
  const maxW = Number(/(?:^|\s)max-w-\[(\d+)px\](?:\s|$)/.exec(panelCls)?.[1] ?? NaN);
  const less = /(?:^|\s)w-full(?:\s|$)/.test(panelCls) ? 0 : Number(/(?:^|\s)w-\[calc\(100%-(\d+)px\)\](?:\s|$)/.exec(panelCls)?.[1] ?? NaN);
  const border = /(?:^|\s)border(?:\s|$)/.test(panelCls) ? 1 : 0;
  if (pad === undefined || Number.isNaN(maxW) || Number.isNaN(less)) {
    problems.push(`DateSelect calendar panel's width rule is not one this guard can compute (dialog "${dialogCls}", panel "${panelCls}")`);
    return problems;
  }
  const grids = [...popup.matchAll(/<div className="(grid grid-cols-7[^"]*)">/g)];
  if (grids.length !== 2) {
    problems.push(`Expected the weekday row and the day grid; found ${grids.length} seven-column grids`);
    return problems;
  }
  const [labels, days] = grids;
  // One inset for both: neither grid pads its own sides, the day grid follows the weekday row as its sibling, and the
  // div both stand in carries the inset.
  const ownInset = (c: string) => /(?:^|\s)(?:px|pl|pr)-/.test(c);
  const between = popup.slice(labels.index, days.index);
  const siblings = (between.match(/<div\b/g) ?? []).length === 1 && (between.match(/<\/div>/g) ?? []).length === 1;
  const insetCls = /(?:^|\s)(px-\S+)/.exec(/<div className="([^"]*)">\s*$/.exec(popup.slice(0, labels.index))?.[1] ?? "")?.[1];
  if (ownInset(labels[1]) || ownInset(days[1]) || !siblings || !insetCls)
    problems.push("DateSelect weekday row and day grid do not share one side inset, so the labels stand off their columns");
  const insetAt = (content: number) => {
    if (!insetCls) return ownInset(days[1]) ? spacing(/(?:^|\s)px-([\d.]+)/.exec(days[1])?.[1] ?? "") : 0;
    const scale = /^px-([\d.]+)$/.exec(insetCls);
    if (scale) return spacing(scale[1]);
    const fixed = /^px-\[(\d+(?:\.\d+)?)px\]$/.exec(insetCls);
    if (fixed) return Number(fixed[1]);
    // What is left once n tap-floor columns are placed, held between a least and a most.
    const fit = /^px-\[clamp\((\d+(?:\.\d+)?)px,calc\(\(100%_-_(\d+)_\*_var\(--tap-min\)\)_\/_2\),(\d+(?:\.\d+)?)px\)\]$/.exec(insetCls);
    if (fit) return Math.min(Math.max(Number(fit[1]), (content - Number(fit[2]) * floor) / 2), Number(fit[3]));
    return NaN;
  };
  const gapKey = /(?:^|\s)gap(?:-x)?-([\d.]+)(?:\s|$)/.exec(days[1])?.[1];
  const gap = gapKey === undefined ? 0 : spacing(gapKey);
  const contentAt = (vw: number) => Math.min(vw - 2 * spacing(pad) - less, maxW) - 2 * border;
  for (const vw of [320, 360]) {
    const content = contentAt(vw);
    const column = (content - 2 * insetAt(content) - 6 * gap) / 7;
    if (!(column >= floor)) problems.push(`DateSelect day grid gives ${column.toFixed(1)}px columns at ${vw}px (the floor is ${floor}px)`);
  }
  if (popup.includes("shadow-glow-selected")) {
    for (const vw of [336, 360, 390]) {
      const inset = insetAt(contentAt(vw));
      if (!(inset >= haloReach)) problems.push(`DateSelect selected day's halo is cut at ${vw}px: ${inset}px of inset under its ${haloReach}px reach`);
    }
  }
  return problems;
}

function audit(routeSources: Sources, detail: string, calendar: string, time: string, sort: string) {
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

  const overview = tags(decomment(routeSources[files[0]]), "Link");
  const weekLink = overview.find((tag) => tag.text.includes("${w.id}"));
  const alertLink = overview.find((tag) => tag.text.includes("${a.weekId}"));
  for (const [name, link] of [["week row", weekLink], ["attention alert", alertLink]] as const) {
    if (!link?.text.includes("inline-flex") || !link.text.includes("min-h-[44px]"))
      problems.push(`Maswali overview ${name} link has no 44px direct hit height`);
  }
  const sortControls = tags(decomment(sort), "button|Link").filter((tag) =>
    tag.text.includes("onSort(field)") || tag.text.includes("params.toString()"));
  if (sortControls.length !== 2) problems.push(`Expected SortBtn and SortTh direct targets; found ${sortControls.length}`);
  for (const control of sortControls)
    if (!control.text.includes("min-h-[44px]") || !control.text.includes("min-w-[44px]"))
      problems.push(`${control.name === "Link" ? "SortTh" : "SortBtn"} direct target has no 44px box`);

  const poolInputs = tags(decomment(routeSources[files[2]]), "Input").filter((tag) =>
    /\bname="(?:ocode|tcode)"/.test(tag.text));
  if (poolInputs.length !== 2) problems.push(`Expected both pools lookup inputs; found ${poolInputs.length}`);
  for (const field of poolInputs)
    if (!field.text.includes('containerClassName="mt-1"') || field.text.includes('className="mt-1"'))
      problems.push("Pools lookup margin reduces the direct input below 40px");

  const editLink = tags(decomment(detail), "Link").find((tag) => tag.text.includes("${week.id}/edit"));
  if (!editLink?.text.includes("inline-flex min-h-[44px] items-center"))
    problems.push("Draft detail edit link has no 44px direct hit height");
  const sourceLink = tags(decomment(routeSources[files[5]]), "a").find((tag) => tag.text.includes("r.sourceUrl"));
  if (!sourceLink?.text.includes("inline-flex min-h-[44px] min-w-[44px] items-center"))
    problems.push("Result source link has no 44px direct hit box");

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
  const cancel = popupButtons.find((button) => button.text.includes("setCalOpen(false)"));
  if (!cancel?.text.includes("min-w-[var(--tap-min)]")) problems.push("DateSelect calendar Cancel has no 40px width floor");
  problems.push(...calendarGeometry(popup));

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

const problems = audit(sources, detailPage, dateKit, timeKit, sortKit);
if (problems.length) {
  for (const problem of problems) console.error(`FAIL ${problem}`);
  process.exit(1);
}
console.log(`PASS S5 admin touch floor: ${files.length} routes, calendar portal and TimeSelect subfields (>=${floor}px)`);

if (process.argv.includes("--prove-red")) {
  const builder = files[1];
  const mutatedBuilder = sources[builder].replace('size="md" />', 'size="sm" />');
  const mutatedDate = dateKit.replace('"h-[var(--tap-min)] rounded-md font-mono', '"h-[32px] rounded-md font-mono');
  const mutatedTime = timeKit.replace('minWidth: "var(--tap-min)"', 'minWidth: "20px"');
  const overview = files[0];
  const shrunkRow = sources[overview].replace('className="link tabular inline-flex min-h-[44px]', 'className="link tabular inline-flex min-h-[32px]');
  const shrunkSort = sortKit.replace('min-w-[44px]', 'min-w-[32px]');
  const pools = files[2];
  const badMargin = sources[pools].replace('containerClassName="mt-1" size="md" name="ocode"', 'className="mt-1" size="md" name="ocode"');
  const shrunkEdit = detailPage.replace('className="link inline-flex min-h-[44px]', 'className="link inline-flex min-h-[32px]');
  const controls = files[5];
  const shrunkSource = sources[controls].replace('className="link inline-flex min-h-[44px] min-w-[44px]', 'className="link inline-flex min-h-[32px] min-w-[32px]');
  const shrunkClose = sources[controls].replace('<DateSelect value={date} onChange={setDate} size="md"', '<DateSelect value={date} onChange={setDate} size="sm"');
  // D9: the calendar as S5 shipped it, one defect at a time.
  const plantCal = (name: string, from: string, to: string) => {
    const planted = dateKit.replace(from, to);
    if (planted === dateKit) throw new Error(`RED plant "${name}" did not apply: ${from}`);
    return planted;
  };
  const narrowPanel = plantCal("narrow panel", "m-dialog-in relative w-full max-w-[320px]", "m-dialog-in relative w-[calc(100%-24px)] max-w-[320px]");
  const ownLabelInset = plantCal("own label inset", '<div className="grid grid-cols-7 pt-2 pb-1">', '<div className="grid grid-cols-7 px-3 pt-2 pb-1">');
  const shortHalo = plantCal("short halo", "_/_2),11px)]", "_/_2),4px)]");
  const thinCancel = plantCal("thin cancel", "inline-flex min-h-[var(--tap-min)] min-w-[var(--tap-min)] items-center font-mono", "inline-flex min-h-[var(--tap-min)] items-center font-mono");
  const cases = [
    ["route DateSelect", "<DateSelect size=\"sm\">", audit({ ...sources, [builder]: mutatedBuilder }, detailPage, dateKit, timeKit, sortKit)],
    ["calendar day", "DateSelect calendar button", audit(sources, detailPage, mutatedDate, timeKit, sortKit)],
    ["time segment", "TimeSelect hour/minute", audit(sources, detailPage, dateKit, mutatedTime, sortKit)],
    ["week row", "Maswali overview week row", audit({ ...sources, [overview]: shrunkRow }, detailPage, dateKit, timeKit, sortKit)],
    ["sort header", "SortBtn direct target", audit(sources, detailPage, dateKit, timeKit, shrunkSort)],
    ["pools lookup margin", "Pools lookup margin", audit({ ...sources, [pools]: badMargin }, detailPage, dateKit, timeKit, sortKit)],
    ["draft edit link", "Draft detail edit link", audit(sources, shrunkEdit, dateKit, timeKit, sortKit)],
    ["source link", "Result source link", audit({ ...sources, [controls]: shrunkSource }, detailPage, dateKit, timeKit, sortKit)],
    ["detail close DateSelect", "<DateSelect size=\"sm\">", audit({ ...sources, [controls]: shrunkClose }, detailPage, dateKit, timeKit, sortKit)],
    ["calendar panel (S5's, 24px inside its dialog)", "DateSelect day grid gives", audit(sources, detailPage, narrowPanel, timeKit, sortKit)],
    ["weekday row (S5's own 16px inset)", "DateSelect weekday row and day grid do not share", audit(sources, detailPage, ownLabelInset, timeKit, sortKit)],
    ["day inset (capped under the halo's reach)", "DateSelect selected day's halo is cut", audit(sources, detailPage, shortHalo, timeKit, sortKit)],
    ["calendar Cancel (no width floor)", "DateSelect calendar Cancel has no 40px width floor", audit(sources, detailPage, thinCancel, timeKit, sortKit)],
  ] as const;
  for (const [name, ownFailure, failures] of cases) {
    const caught = failures.find((failure) => failure.includes(ownFailure));
    if (!caught) throw new Error(`RED failed: shrinking ${name} did not trip its own assertion: ${failures.join("; ")}`);
    console.log(`PASS RED ${name}: ${caught}`);
  }
}
