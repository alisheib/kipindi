// Specific strings: the pattern's units vs ICU's clusters. Pass a pattern source file via PAT=path (default: the worktree).
import { readFileSync } from "node:fs";
import { loadCharacter } from "./pattern.mts";
const CHARACTER = loadCharacter(process.env.PAT);
const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
const esc = (s: string) => Array.from(s).map((c) => (/[\p{L}\p{N}\p{P}]/u.test(c) && c.codePointAt(0)! < 0x2000 ? c : `<${c.codePointAt(0)!.toString(16)}>`)).join("");
const units = (s: string) => { const out: string[] = []; let last = 0; for (const m of s.matchAll(CHARACTER)) { if ((m.index ?? 0) > last) out.push(s.slice(last, m.index)); out.push(m[0]); last = (m.index ?? 0) + m[0].length; } if (last < s.length) out.push(s.slice(last)); return out; };
const T = ["क्\u200Cष", "क्\u200Dष", "क्\u0951ष", "क्ष", "क़्ष", "🇹🇿\uFE0F", "🇹🇿\u0301", "🇹🇿🇰🇪", "🇹🇿🇰", "a\u200D", "a\u200C", "กำ", "ສຳ", "ｶﾞ", "\u1100\u1100\u1161", "\u1100가", "\u1100각\u11A8", "가\u11A8\u11A8", "👩‍💻", "👨‍👩‍👧", "🏳️‍🌈", "1️⃣", "👍🏽", "\u0600\u0661", "\u{113D1}a", "Zoe\u0308", "e\u0301\u0301", "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", "x\u200D🇹🇿", "ि", "क\u093F", "\u0915\u094D\u200D", "a\uFE0F"];
for (const s of T) {
  const u = units(s), g = [...seg.segment(s)].map((x) => x.segment);
  console.log(`${JSON.stringify(u) === JSON.stringify(g) ? "same " : "DIFF "} ${esc(s).padEnd(40)} pattern ${u.map(esc).join(" | ").padEnd(50)} icu ${g.map(esc).join(" | ")}`);
}
