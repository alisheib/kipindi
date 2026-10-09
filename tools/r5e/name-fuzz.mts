// keepNameEnd over a fuzzed name corpus, against Node's ICU grapheme clusters. Run from F:/kipindi-r5e.
import { markup, textOf, keyIssues, captureWarnings } from "./h.ts";
const now = await import("file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
const tip = await import("./orig/keep-words.tsx");
const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
const clusters = (s: string) => [...seg.segment(s)].map((g) => ({ at: g.index, s: g.segment }));
const SPACE_ONLY = /^\s+$/u;

let seed = Number(process.env.SEED ?? 9);
const r = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; };
const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
const TOK = ["Juma", "K", "Mwanaisha", "Khamis", "a", "B", "x", "百里", "呼延", "张三", "👩‍💻", "👨‍👩‍👧", "👍🏽", "🇹🇿", "🇰🇪", "1️⃣", "🏳️‍🌈", "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", "e\u0301", "Zoe\u0308",
  "क्ष", "प्रकाश", "क्\u200Dष", "क्\u0951ष", "한국어", "\u1100\u1161\u11A8", "\u1100가", "กำ", "ສຳ", "ｶﾞ", "می\u200Cخواهم", "\u0600\u0661", "🇹🇿\uFE0F", "❤️‍🔥", "a\u200D", "#", "#A3F2K8"];
const WS = [" ", " ", " ", "  ", "\u3000", "\u00a0", "\u2003", "\t", ""];
const N = Number(process.env.N ?? 30000);
let shaped = 0, fails = 0, decisionDiff = 0, vsTip = 0;
const fail = (m: string) => { fails++; if (fails <= 10) console.log("FAIL", m); };
for (let i = 0; i < N; i++) {
  let s = "";
  const k = 1 + Math.floor(r() * 7);
  for (let j = 0; j < k; j++) s += pick(TOK) + pick(WS);
  if (r() < 0.5) s = s.trim();
  let node: unknown, html = "";
  const w = captureWarnings(() => { node = now.keepNameEnd(s); html = markup(node); });
  if (w.warnings.length) fail(`warn ${JSON.stringify(s)}`);
  if (textOf(html) !== s) fail(`text ${JSON.stringify(s)}`);
  if (keyIssues(node).length) fail(`keys ${JSON.stringify(s)}`);
  const cl = clusters(s);
  const bounds = new Set(cl.map((c) => c.at).concat([s.length]));
  const visible = cl.filter((c) => !SPACE_ONLY.test(c.s));
  // What an ICU-exact rule would do: the last two visible clusters, unless the first starts the name or a gap is wide.
  const gapOk = (g: string) => /^[\t\n\f\r ]*(?:\s[\t\n\f\r ]*)?$/.test(g);
  let icuCut = -1;
  if (visible.length >= 2) {
    const A = visible[visible.length - 2], B = visible[visible.length - 1];
    if (A.at > 0 && gapOk(s.slice(A.at + A.s.length, B.at)) && gapOk(s.slice(B.at + B.s.length))) icuCut = A.at;
  }
  if (Array.isArray(node)) {
    shaped++;
    const cut = (node[0] as string).length;
    if (!bounds.has(cut)) fail(`cut ${cut} inside a cluster: ${JSON.stringify(s)}`);
    const kept = clusters(s.slice(cut)).filter((c) => !SPACE_ONLY.test(c.s));
    if (kept.length < 2) fail(`kept fewer than two characters: ${JSON.stringify(s.slice(cut))}`);
    if (cut !== icuCut) { decisionDiff++; if (decisionDiff <= 5) console.log(`   (cut ${cut} vs ICU-exact ${icuCut}) ${JSON.stringify(s)}`); }
  } else if (icuCut !== -1) { decisionDiff++; if (decisionDiff <= 5) console.log(`   (unshaped vs ICU-exact ${icuCut}) ${JSON.stringify(s)}`); }
  if (markup(tip.keepNameEnd(s)) !== html) vsTip++;
}
console.log(`keepNameEnd fuzz: ${N} names · shaped ${shaped} · fails ${fails} · cut differs from an ICU-exact rule ${decisionDiff} · differs from the tip ${vsTip}`);

// The reviewer's fix2.ts corpus (seed 9, 20,000 — defective sequences included): text, keys, and the cut on a boundary.
{
  let s9 = 9; const rr = () => { s9 ^= s9 << 13; s9 ^= s9 >>> 17; s9 ^= s9 << 5; return ((s9 >>> 0) % 1e6) / 1e6; };
  const P = ["a", "B", " ", "  ", "\u3000", "\u00a0", "\u2003", "👩‍💻", "👍🏽", "🇹🇿", "e\u0301", "\u0301", "\u200d", "\ufe0f", "呼", "1️⃣", "\t", "x"];
  let bad = 0, inside = 0;
  for (let i = 0; i < 20000; i++) {
    let s = ""; const k = Math.floor(rr() * 14);
    for (let j = 0; j < k; j++) s += P[Math.floor(rr() * P.length)];
    const node = now.keepNameEnd(s);
    if (textOf(markup(node)) !== s || keyIssues(node).length) bad++;
    if (Array.isArray(node)) { const cut = (node[0] as string).length; if (!new Set(clusters(s).map((c) => c.at)).has(cut)) { inside++; if (inside <= 5) console.log("   inside:", JSON.stringify(s), cut); } }
  }
  console.log(`fix2.ts corpus: 20000 · text/key failures ${bad} · cuts inside a cluster ${inside}`);
}

// Timing: the reviewer's inputs and the new branches' worst cases.
const L = 10000;
const ADV: Record<string, string> = {
  "a*L": "a".repeat(L), "mark*L": "a" + "\u0301".repeat(L - 1), "zwj-chain": "a" + "\u200da".repeat(L / 2 - 1), "sp": "a" + " ".repeat(L - 2) + "b",
  "virama*L": "क" + "\u094D".repeat(L - 1), "virama-mark*L": ("क\u094D\u0951\u0951\u0951\u0951\u0951").repeat(L / 7), "L-jamo*L": "\u1100".repeat(L), "RI*L": "\u{1F1F9}".repeat(L / 2),
  "prepend*L": "\u0600".repeat(L), "prepend*L+sp": "\u0600".repeat(L) + " ", "ws-mark*L": " \u0301".repeat(L / 2), "ideo-sp*L": "AB" + "\u3000".repeat(L) + "C", "zwj*L": "\u200d".repeat(L),
};
for (const s of Object.values(ADV)) { now.keepNameEnd(s.slice(0, 50)); tip.keepNameEnd(s.slice(0, 50)); }
for (const [k, s] of Object.entries(ADV)) {
  const t0 = performance.now(); now.keepNameEnd(s); const t1 = performance.now(); tip.keepNameEnd(s); const t2 = performance.now();
  console.log(`  timing ${k.padEnd(14)} now ${(t1 - t0).toFixed(2).padStart(7)} ms   tip ${(t2 - t1).toFixed(2).padStart(7)} ms`);
}
