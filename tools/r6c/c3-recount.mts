// C3: r5c's census (goldHits, copied) with the warning family's other spellings counted — `--warning`, `--warning-500`,
// `--warning-bg`, `--warning-border` as variables and as Tailwind utilities — against the REGISTRY's pinned counts.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment, decommentCss } from "file:///F:/kipindi-r6c/scripts/lib/decomment.mts";
const ROOT = "F:/kipindi-r6c";
const OUT_OF_SCOPE = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const toOklch = (r8: number, g8: number, b8: number) => {
  const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const r = lin(r8), g = lin(g8), b = lin(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
};
const goldHue = (C: number, H: number) => C >= 0.04 && H >= 70 && H < 100;
const WIDE = process.argv.includes("--wide");
function goldHits(file: string, src: string) {
  const text = src.replace(/\r\n/g, "\n");
  const code = file.endsWith(".css") ? decommentCss(text) : decomment(text);
  const out: Array<{ kind: string; match: string; line: number }> = [];
  code.split("\n").forEach((ln, i) => {
    const push = (kind: string, re: RegExp, keep: (m: RegExpMatchArray) => boolean = () => true) => {
      for (const m of ln.matchAll(re)) if (keep(m)) out.push({ kind, match: m[0], line: i + 1 });
    };
    const W = WIDE ? "warning(?:-fg|-500|-bg|-border)?" : "warning-fg";
    push("var", new RegExp(`var\\(\\s*--(?:gilt[\\w-]*|gold(?:-[\\w-]+)?|metal-gold|border-gold|glow-gold|glow-jackpot|g-gold|g-jackpot|bet-jackpot|bet-streak|bar-needle(?:-glow)?|${W})\\s*[,)]`, "g"));
    push("tw", new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:(?:gold|gilt)(?:-[a-z0-9]+)?|${W})(?:\\/[\\w.[\\]]+)?(?![\\w-])`, "g"));
    push("cls", /(?<![\w-])(?:gilt-metal|gilt-ink|btn-gold|mat-tint-gilt|chip-resolved)(?![\w-])/g);
    if (file.endsWith(".tsx")) push("name", /["'`](?:gold|warning)["'`]/g);
    else if (file.endsWith(".ts")) push("name", /["'`]gold["'`]/g);
    if (file.endsWith(".tsx")) {
      push("comp", /<(?:GiltCorner|RewardBurst)\b/g);
      push("seal", /<Chip\b[^>]*\bvariant=(?:"resolved"|\{[^}]*"resolved"[^}]*\})/g);
      push("struck", /\bstruck=\{/g);
      push("gilt-class", /className=(?:"|\{`|\{")[^"`]*(?<![\w-])gilt(?![\w-])/g);
    }
    push("oklch", /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/g, (m) => goldHue(Number(m[2]), Number(m[3])));
    push("hex", /#([0-9a-fA-F]{6})\b/g, (m) => {
      const x = m[1]; const o = toOklch(parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16));
      return goldHue(o.C, o.H);
    });
  });
  return out;
}
const suite = readFileSync(ROOT + "/scripts/visual-pass-r5c.test.mts", "utf8");
const reg = new Map<string, number>();
for (const m of suite.matchAll(/^\s*"(src\/[^"]+)":\s*\[(\d+),/gm)) reg.set(m[1], Number(m[2]));
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx|ts|css)$/.test(n) ? [relative(ROOT, p).replace(/\\/g, "/")] : [];
});
let total = 0;
for (const f of walk(join(ROOT, "src"))) {
  if (OUT_OF_SCOPE.test(f)) continue;
  const hits = goldHits(f, readFileSync(join(ROOT, f), "utf8"));
  total += hits.length;
  const was = reg.get(f);
  if (!hits.length && was === undefined) continue;
  if (hits.length !== was) {
    const warn = hits.filter((h) => /warning/.test(h.match) && h.kind !== "name");
    console.log(`${String(was ?? "—").padStart(3)} -> ${String(hits.length).padStart(3)}  ${f}${warn.length ? `   [warning family: ${warn.map((h) => `${h.line}:${h.match}`).join(" ")}]` : ""}`);
  }
}
console.log(`total hits ${total} (${WIDE ? "wide" : "today's"} census)`);
