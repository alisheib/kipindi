const now = await import("file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
const cases: Record<string, (L: number) => string> = {
  "virama": (L) => "क" + "\u094D".repeat(L - 1), "a": (L) => "a".repeat(L), "ws-mark": (L) => " \u0301".repeat(L / 2), "zwj-a": (L) => "a\u200D".repeat(L / 2),
  "zwj-prepend": (L) => "a\u200D\u0600".repeat(L / 3), "zwj-jamo": (L) => ("a\u200D" + "\u1100".repeat(50)).repeat(L / 52), "RI": (L) => "\u{1F1F9}".repeat(L / 2),
};
for (const [k, f] of Object.entries(cases)) {
  const t: number[] = [];
  for (const L of [10000, 100000]) { const s = f(L); now.keepNameEnd(s.slice(0, 100)); const t0 = performance.now(); now.keepNameEnd(s); t.push(performance.now() - t0); }
  console.log(`${k.padEnd(12)} 10k ${t[0].toFixed(2)} ms · 100k ${t[1].toFixed(2)} ms · ratio ${(t[1] / t[0]).toFixed(1)}`);
}
