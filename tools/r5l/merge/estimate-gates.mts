// R5-L · read-only estimate of two ratchets on the merged tree (vodacom-visual 6f5b24c0 + R5-L): the upstream delta of
// hand-typed sizes (`text-[Npx]`, type-scale §4) and of inverted spacing keys (spacing-scale) over the files R5-G/R5-K
// changed, counted the suites' way on decommented source — the merged count is the tip's plus R5-L's own measured delta.
import { execSync } from "node:child_process";
const { decomment } = await import("file:///F:/kipindi-r5l/scripts/lib/decomment.mts");
const git = (args: string) => execSync(`git -C F:/kipindi-r5l ${args}`, { encoding: "utf8", maxBuffer: 64 << 20 });
const changed = git("diff --name-only 9677a3f54 6f5b24c0").trim().split(/\r?\n/).filter((f) => /^src\/.*\.(tsx|ts)$/.test(f));
const show = (rev: string, f: string) => { try { return git(`show ${rev}:${f}`); } catch { return ""; } };
const SIZE = /\btext-\[\d+(?:\.\d+)?px\]/g;
const INVERTED = /(?<![\w-])(?:-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|w|h|min-w|min-h|max-w|max-h|top|bottom|left|right|inset|inset-x|inset-y|translate-x|translate-y|scroll-mt|scroll-pt)-(?:14|16|20|24|28|32|2\.5|3\.5))(?![\w.-])/g;
let dSize = 0, dInv = 0;
const rows: string[] = [];
for (const f of changed) {
  const a = decomment(show("9677a3f54", f)), b = decomment(show("6f5b24c0", f));
  const s = (b.match(SIZE) ?? []).length - (a.match(SIZE) ?? []).length;
  const i = (b.match(INVERTED) ?? []).length - (a.match(INVERTED) ?? []).length;
  dSize += s; dInv += i;
  if (s || i) rows.push(`${f}: sizes ${s >= 0 ? "+" : ""}${s}, inverted ${i >= 0 ? "+" : ""}${i}`);
}
console.log(rows.join("\n"));
console.log(`upstream (R5-G + R5-K + the entrance fix): hand-typed sizes ${dSize >= 0 ? "+" : ""}${dSize}, inverted spacing ${dInv >= 0 ? "+" : ""}${dInv}`);
