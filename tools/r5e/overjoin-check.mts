// Every case where keepNameEnd's cut differs from an ICU-exact rule: is it an over-join (cut earlier, or unshaped with a
// last unit of two visible clusters or more)?
const now = await import("file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
import { loadCharacter } from "./pattern.mts";
const CH = loadCharacter();
const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
const vis = (s: string) => [...seg.segment(s)].filter((g) => !/^\s+$/u.test(g.segment));
let seed = 9; const r = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; };
const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
const TOK = ["Juma", "K", "Mwanaisha", "Khamis", "a", "B", "x", "百里", "呼延", "张三", "👩‍💻", "👨‍👩‍👧", "👍🏽", "🇹🇿", "🇰🇪", "1️⃣", "🏳️‍🌈", "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", "e\u0301", "Zoe\u0308",
  "क्ष", "प्रकाश", "क्\u200Dष", "क्\u0951ष", "한국어", "\u1100\u1161\u11A8", "\u1100가", "กำ", "ສຳ", "ｶﾞ", "می\u200Cخواهم", "\u0600\u0661", "🇹🇿\uFE0F", "❤️‍🔥", "a\u200D", "#", "#A3F2K8"];
const WS = [" ", " ", " ", "  ", "\u3000", "\u00a0", "\u2003", "\t", ""];
let n = 0, ok = 0, bad = 0, strayZwj = 0;
for (let i = 0; i < 30000; i++) {
  let s = ""; const k = 1 + Math.floor(r() * 7);
  for (let j = 0; j < k; j++) s += pick(TOK) + pick(WS);
  if (r() < 0.5) s = s.trim();
  const node = now.keepNameEnd(s);
  const v = vis(s);
  const gapOk = (g: string) => /^[\t\n\f\r ]*(?:\s[\t\n\f\r ]*)?$/.test(g);
  let icu = -1;
  if (v.length >= 2) { const A = v[v.length - 2], B = v[v.length - 1]; if (A.index > 0 && gapOk(s.slice(A.index + A.segment.length, B.index)) && gapOk(s.slice(B.index + B.segment.length))) icu = A.index; }
  const cut = Array.isArray(node) ? (node[0] as string).length : -1;
  if (cut === icu) continue;
  n++;
  if (/a\u200D/.test(s)) strayZwj++;
  const units = [...s.matchAll(CH)];
  const last = units[units.length - 1];
  const lastVisible = last ? vis(last[0]).length : 0;
  const earlier = cut !== -1 && icu !== -1 && cut < icu;
  const unshapedOk = cut === -1 && lastVisible >= 2;
  if (earlier || unshapedOk) ok++; else { bad++; console.log("NOT an over-join:", JSON.stringify(s), { cut, icu, lastVisible }); }
}
console.log(`decision differences ${n}: over-joins ${ok}, other ${bad}; with a stray "a"+ZWJ token ${strayZwj}`);
