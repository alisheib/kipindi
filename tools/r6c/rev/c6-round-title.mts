// C6: /updown/[roundId] — the <title> a reader gets on a successful read vs the page's h1, per locale.
import { readFileSync } from "node:fs";
import { dict } from "file:///F:/kipindi-r6c/src/lib/i18n-dict.ts";
const R = "F:/kipindi-r6c/";
const page = readFileSync(R + "src/app/updown/[roundId]/page.tsx", "utf8").split(/\r?\n/);
const svc = readFileSync(R + "src/lib/server/updown-service.ts", "utf8").split(/\r?\n/);
const show = (f: string, lines: string[], re: RegExp) => { const i = lines.findIndex((l) => re.test(l)); console.log(`  ${f}:${i + 1}  ${lines[i].trim().slice(0, 150)}`); };
show("updown/[roundId]/page.tsx", page, /catch \{ return \{ title: t\.market\.udTitle \}/);
show("updown/[roundId]/page.tsx", page, /return \{ title: d\.titleEn \}/);
show("updown/[roundId]/page.tsx", page, /\{name\}\{" "\}<span className="whitespace-nowrap">\{t\.market\.udTitle\}/);
show("updown/[roundId]/page.tsx", page, /<Chip>\{round\.durationMinutes\} \{t\.market\.udMin\}<\/Chip>/);
show("updown-service.ts", svc, /if \(lang === "sw"\) return/);
show("updown-service.ts", svc, /return `\$\{asset\.nameEn\} Up or Down/);
// roundTitle, re-stated from updown-service.ts 71-75 (it imports server modules, so it is not loaded here).
const roundTitle = (a: { nameEn: string; nameSw: string; nameZh: string }, d: number, lang: string) =>
  lang === "sw" ? `${a.nameSw} Juu au Chini · dakika ${d}` : lang === "zh" ? `${a.nameZh || a.nameEn}涨跌 · ${d}分钟` : `${a.nameEn} Up or Down · ${d} min`;
const btc = { nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币" };
for (const loc of ["sw", "en", "zh"] as const) {
  const t = (dict as any)[loc];
  const name = loc === "sw" ? btc.nameSw : loc === "zh" ? btc.nameZh : btc.nameEn;
  console.log(`[${loc}] <title> (read ok) = "${roundTitle(btc, 15, "en")}"   <title> (read failed) = "${t.market.udTitle}"   h1 = "${name} ${t.market.udTitle}" + chip "15 ${t.market.udMin}"   stored title in ${loc} = "${roundTitle(btc, 15, loc)}"`);
}
