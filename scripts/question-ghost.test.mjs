/** F41: source proof for the guest question's loading bands and first-paint viewer switch. */
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const clean = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const base = {
  ghost: clean(read("src/components/journey/question/question-ghost.tsx")),
  page: clean(read("src/app/markets/[id]/page.tsx")),
  css: clean(read("src/app/globals.css")),
  shell: clean(read("src/components/layout/app-shell.tsx")),
  route: clean(read("src/components/journey/route-ghost.tsx")),
  loading: clean(read("src/app/markets/[id]/loading.tsx")),
  scale: clean(read("tailwind.config.ts")),
};

const classAt = (s, marker) => s.match(new RegExp(`className="([^"]*${marker}[^\"]*)"`))?.[1] ?? "";
const px = (s, re) => Number(s.match(re)?.[1]);
const checks = {
  route(s) {
    return s.loading.includes('at="/markets/[id]"')
      && (s.route.match(/<QuestionGhost \/>/g) ?? []).length === 2;
  },
  viewer(s) {
    return s.shell.includes('viewer={journeyShown && !session ? "guest" : undefined}')
      && s.shell.includes('data-viewer={viewer}')
      && s.css.includes('.kp-qghost__guest, .kp-qghost__aside { display: none; }')
      && s.css.includes(':root [data-viewer="guest"] .kp-qghost__guest,')
      && s.css.includes(':root [data-viewer="guest"] .kp-qghost__aside { display: block; }')
      && s.css.includes(':root [data-viewer="guest"] .kp-qghost__member { display: none; }');
  },
  structure(s) {
    const grid = 'flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_360px] lg:grid-rows-[auto_auto] lg:items-start lg:gap-6';
    const stats = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)_minmax(0,1fr)]';
    return s.page.includes(`className="${grid}"`) && s.ghost.includes(`className="${grid}"`)
      && s.page.includes(`className="${stats}"`) && s.ghost.includes(`className="${stats}"`)
      && s.page.includes('<header className="mt-3 mb-5">')
      && s.ghost.includes('className="mt-3 mb-5"')
      && s.ghost.includes('lg:col-start-2 lg:row-start-1 lg:self-stretch')
      && s.ghost.includes('lg:col-start-1 lg:row-start-1 min-w-0 space-y-5');
  },
  guest(s) {
    const realCard = classAt(s.page, 'rounded-xl border border-border bg-bg-elevated p-6 text-center');
    const ghostCard = classAt(s.ghost, 'kp-qghost__guest');
    return realCard && ghostCard.endsWith(realCard)
      && ['signInToPredict', 'placeYourStake', 'browseForFree'].every((key) =>
        s.page.includes(`{t.market.${key}}`) && s.ghost.includes(`{t.market.${key}}`))
      && s.ghost.includes('className="mt-4 grid grid-cols-1 xs:grid-cols-2 gap-2"')
      && (s.ghost.match(/h-\[44px\] rounded-pill bg-bg-overlay kp-shimmer-track/g) ?? []).length === 2
      && (s.ghost.match(/className="invisible"/g) ?? []).length === 3;
  },
  bands(s) {
    const left = s.ghost.slice(s.ghost.indexOf('min-w-0 space-y-5'));
    const rail = px(left, /className="h-\[(\d+)px\] rounded-pill bg-bg-overlay kp-shimmer-track"/);
    const labels = px(left, /className="mt-1\.5 flex h-\[([\d.]+)px\] items-center/);
    const stat = px(left, /className="h-\[(\d+)px\] rounded-md border border-border bg-bg-elevated p-3/);
    const countdown = px(left, /className="glass-panel h-\[(\d+)px\] p-5/);
    const title = s.ghost.match(/className="h-\[(\d+)px\] md:h-\[(\d+)px\]/)?.slice(1).map(Number);
    const gap = px(s.scale, /"5": "(\d+)px"/);
    const labelGap = px(s.scale, /"1\.5": "(\d+)px"/);
    // The real 1920/zh open guest page's grid begins at y=354. F41's audit capture measured these three band starts.
    const first = 354 + rail + labelGap + labels + gap;
    const second = first + stat + gap;
    const third = second + countdown + gap;
    return s.page.includes('height={28}') && s.page.includes('glass-panel p-5 space-y-2.5')
      && s.ghost.includes('glass-panel h-[140px] p-5 space-y-2.5')
      && title?.[0] === 70 && title?.[1] === 40
      && first === 430.5 && second === 531.5 && third === 695.5
      && (s.ghost.match(/h-\[77px\] rounded-md/g) ?? []).length === 3
      && s.ghost.includes('col-span-2 sm:col-span-1 h-[77px]');
  },
  mobile(s) {
    return s.css.includes('.kp-qghost__aside { display: block; }')
      && s.css.includes('.kp-qghost__mobile-picks { display: none; }')
      && s.ghost.indexOf('<GuestBetGhost t={t} />') < s.ghost.indexOf('min-w-0 space-y-5')
      && s.ghost.indexOf('kp-qghost__mobile-picks') > s.ghost.indexOf('glass-panel h-[140px]')
      && s.ghost.indexOf('kp-qghost__mobile-picks') < s.ghost.indexOf('glass-panel min-h-[203px]');
  },
};

function failing(s) { return Object.entries(checks).filter(([, fn]) => !fn(s)).map(([name]) => name); }
const fails = failing(base);
for (const name of Object.keys(checks)) console.log(`${fails.includes(name) ? "FAIL" : "ok  "} F41.${name}`);
if (fails.length) { process.exitCode = 1; console.error(`F41 guard failed: ${fails.join(", ")}`); }

if (process.argv.includes("--prove-red") && !fails.length) {
  const plants = [
    ["viewer", "css", ':root [data-viewer="guest"] .kp-qghost__member { display: none; }', ""],
    ["structure", "ghost", 'lg:grid-cols-[1fr_360px]', 'lg:grid-cols-[1fr_320px]'],
    ["guest", "ghost", 'kp-qghost__guest rounded-xl border border-border bg-bg-elevated p-6 text-center', 'kp-qghost__guest rounded-xl border border-border bg-bg-elevated p-4 text-center'],
    ["bands", "ghost", 'h-[28px] rounded-pill bg-bg-overlay', 'h-[8px] rounded-pill bg-bg-overlay'],
    ["mobile", "css", '.kp-qghost__mobile-picks { display: none; }', ''],
    ["route", "loading", 'at="/markets/[id]"', 'at="/markets"'],
  ];
  for (const [target, file, from, to] of plants) {
    if (!base[file].includes(from)) { console.error(`Plant missing: ${target}`); process.exitCode = 1; continue; }
    const planted = { ...base, [file]: base[file].replace(from, to) };
    const hit = failing(planted);
    const caught = hit.includes(target) && !hit.some((name) => name !== target);
    console.log(`${caught ? "ok  " : "FAIL"} F41.red.${target} ${hit.join(",")}`);
    if (!caught) process.exitCode = 1;
  }
}
