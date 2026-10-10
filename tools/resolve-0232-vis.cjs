// Merging main's 0.232 re-pin (e7a979c6) into vodacom-visual: keep both histories (R3-C's +4 on the branch, main's +1 from
// 2cd2239e) and add the branch's own step, the pin at the branch's measured lines. Lines are re-derived from the tree.
const fs = require("fs");
const p = "F:/kipindi-vis/scripts/lib/house-bot-reports-cases.mts";
let s = fs.readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const RE = /<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [^\n]*\n/;
const m = RE.exec(s);
if (!m) throw new Error("no conflict");
const ours = m[1], theirs = m[2];
// ours: R3-C's note lines, then " */", then the ok( line pair. theirs: main's note lines, " */", the ok( pair.
const split = (x) => { const at = x.indexOf("     */\n"); if (at < 0) throw new Error("no doc end"); return [x.slice(0, at), x.slice(at)]; };
const [oursNote] = split(ours), [theirsNote, theirsRest] = split(theirs);
// The source's own lines — measured, not computed: every `db.txn.create(` in market-service.ts on this tree.
const ms = fs.readFileSync("F:/kipindi-vis/src/lib/server/market-service.ts", "utf8").replace(/\r\n/g, "\n").split("\n");
const lines = ms.map((l, i) => (/db\.txn\.create\(/.test(l) ? i + 1 : 0)).filter(Boolean);
if (lines.length !== 7) throw new Error("expected seven writes, found " + lines.length);
const want = JSON.stringify(lines.map((n) => `market-service.ts:${n}`)).replace(/","/g, '", "');
const branchNote =
  "     * ⭐ AND ON THE VODACOM BRANCH ALL SEVEN MOVED (2026-10-10, merging main's step above, after the visual pass's round 6):\n" +
  "     * R5-B's `clipQuote` import (+4 above all seven), R5-B's verdict instant and the verdict fan-out's await (+6 above the\n" +
  "     * last six) and R3-C's win note (+4 on the last one), over main's lines. Re-derived from the tree, not the delta: the\n" +
  `     * seven \`db.txn.create(\` lines read ${lines.slice(0, 6).join(", ")} and ${lines[6]}, each the same write in the same order — so\n` +
  `     * the controls' \`:2888\`/\`:1619\` move to \`:${lines[1]}\`/\`:${lines[0]}\`.\n`;
const rest = theirsRest.replace(/j\(\["market-service\.ts:\d+"(?:, "market-service\.ts:\d+"){6}\]\)/, `j(${want})`);
if (rest === theirsRest) throw new Error("pin list not replaced");
s = s.replace(RE, () => oursNote + theirsNote + branchNote + rest);
const a = "`${MS}:2888`", b = "`${MS}:1619`";
if (s.split(a).length - 1 !== 4 || s.split(b).length - 1 !== 1) throw new Error("control counts");
s = s.split(a).join("`${MS}:" + lines[1] + "`").split(b).join("`${MS}:" + lines[0] + "`");
if (/^(<<<<<<<|=======|>>>>>>>)/m.test(s)) throw new Error("markers left");
fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok", lines.join(" "));
