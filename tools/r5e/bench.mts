// Tip (orig/) against the worktree: the median of 7 alternating runs per function and input — the function call alone
// (the patterns' work), on the reviewer's adversarial inputs (review/timew.ts) and the new branches' own worst cases.
const tipKW = await import("./orig/keep-words.tsx");
const nowKW = await import("file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
const tipKR = await import("./orig/keep-run.tsx");
const nowKR = await import("file:///F:/kipindi-r5e/src/components/ui/keep-run.tsx");
const tipES = await import("./orig/empty-state-text.ts");
const nowES = await import("file:///F:/kipindi-r5e/src/components/ui/empty-state-text.ts");
const L = Number(process.env.L ?? 10000);
const fromCp = (n: number) => String.fromCharCode(n);
const ADV: Record<string, string> = {
  "a*L": "a".repeat(L), "a*L+' b c'": "a".repeat(L) + " b c", "'a '*L/2": "a ".repeat(L / 2), "1*L": "1".repeat(L), "'1 '+' '*L": "1" + " ".repeat(L) + "minutesX",
  "'dakika '*L/7": "dakika ".repeat(Math.floor(L / 7)), "'Act 2022 '*L/9": "Act 2022 ".repeat(Math.floor(L / 9)), "'Act '*L/4+'2022x'": "Act ".repeat(Math.floor(L / 4)) + "2022x",
  "ideo-stop*L": fromCp(0x3002).repeat(L), "'TZS 1,'*L/6": "TZS 1,".repeat(Math.floor(L / 6)), "A*L": "A".repeat(L), "'ab-'*L/3": "ab-".repeat(Math.floor(L / 3)),
  "ideo-space*L": "dakika" + fromCp(0x3000).repeat(L) + "28", "nbsp-run": ("a" + fromCp(0xa0) + " ").repeat(L / 3) + "b",
};
type F = (s: string) => unknown;
const PAIRS: Array<[string, F, F]> = [
  ["keepLastWords", tipKW.keepLastWords, nowKW.keepLastWords], ["keepYears", tipKW.keepYears, nowKW.keepYears], ["keepFigures", tipKW.keepFigures, nowKW.keepFigures],
  ["keepNameEnd", tipKW.keepNameEnd, nowKW.keepNameEnd], ["keepText", (s) => tipKR.keepText(s, tipKR.digitChoice(s)), (s) => nowKR.keepText(s, nowKR.digitChoice(s))],
  ["emptyStateBody", tipES.emptyStateBody, nowES.emptyStateBody],
];
const median = (a: number[]) => a.sort((x, y) => x - y)[a.length >> 1];
for (const [name, a, b] of PAIRS) {
  let worstTip = 0, worstNow = 0, wTip = "", wNow = "";
  const rows: string[] = [];
  for (const [k, s] of Object.entries(ADV)) {
    const ta: number[] = [], tb: number[] = [];
    for (let i = 0; i < 7; i++) { let t0 = performance.now(); a(s); ta.push(performance.now() - t0); t0 = performance.now(); b(s); tb.push(performance.now() - t0); }
    const ma = median(ta), mb = median(tb);
    if (ma > worstTip) { worstTip = ma; wTip = k; }
    if (mb > worstNow) { worstNow = mb; wNow = k; }
    if (mb > 2 * ma + 1) rows.push(`      slower: ${k} tip ${ma.toFixed(1)} ms → now ${mb.toFixed(1)} ms`);
  }
  console.log(`${name.padEnd(15)} worst tip ${worstTip.toFixed(1).padStart(7)} ms (${wTip})   worst now ${worstNow.toFixed(1).padStart(7)} ms (${wNow})`);
  for (const r of rows) console.log(r);
}
