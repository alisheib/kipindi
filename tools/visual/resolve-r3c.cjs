// Resolve the two globals.css conflicts of R3-C onto (R3-A + R3-B + R3-D). cwd = F:/kipindi-vis.
const fs = require("fs");
const p = "src/app/globals.css";
let s = fs.readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const blocks = [];
for (let at = s.indexOf("<<<<<<< ours\n"); at >= 0; at = s.indexOf("<<<<<<< ours\n", at + 1)) {
  const mid = s.indexOf("=======\n", at), end = s.indexOf(">>>>>>> theirs\n", at);
  blocks.push({ at, mid, end, ours: s.slice(at + 13, mid), theirs: s.slice(mid + 8, end) });
}
if (blocks.length !== 2) throw new Error(`blocks: ${blocks.length}`);

// 1 · the dot sequence: R3-C's generic .kp-seq rules, with R3-A's featured-card meta line on the same rules.
const b1 = blocks[0];
if (!b1.theirs.includes(".kp-seq {") || !b1.ours.includes(".mcardp-src__seq")) throw new Error("block 1 shape");
const r1 = b1.theirs
  .replace("   dot measures 11–13px there), 3ch in a monospace face (`--mono`), which is exactly \" · \" in it. */\n",
    "   dot measures 11–13px there), 3ch in a monospace face (`--mono`), which is exactly \" · \" in it.\n" +
    "   ⭐ ONE IDIOM, TWO HOOKS: the featured card's meta line (\"2026年10月9日 截止 · 结算来源：CoinGecko\", `.mcardp-src__seq`,\n" +
    "   market-card.tsx) is drawn the same way (round 3's tiles 029 059 074 084 097 109: at 320 Chinese it broke\n" +
    "   \"…结算来 / 源：CoinGecko\", splitting 来源). Its dot keeps the sentence's own \" · \" for a screen reader. */\n")
  .replace(".kp-seq { display: flex;", ".kp-seq, .mcardp-src__seq { display: flex;")
  .replace(".kp-seq__item { position: relative;", ".kp-seq__item, .mcardp-src__part { position: relative;")
  .replace(".kp-seq__dot { position: absolute;", ".kp-seq__dot, .mcardp-src__dot { position: absolute;");
for (const sel of [".kp-seq, .mcardp-src__seq {", ".kp-seq__item, .mcardp-src__part {", ".kp-seq__dot, .mcardp-src__dot {", "ONE IDIOM, TWO HOOKS"]) {
  if (!r1.includes(sel)) throw new Error(`block 1 missing ${sel}`);
}

// 2 · the sheet title: R3-C's title rule (its comment and margin), then R3-D's ticket subgrid as R3-D wrote it.
const b2 = blocks[1];
const oursTitle = b2.ours.split("\n")[0];
if (!oursTitle.startsWith(".kp-jsheet__title {") || !b2.theirs.includes(".kp-jsheet__title { margin: calc(")) throw new Error("block 2 shape");
const r2 = b2.theirs + b2.ours.slice(oursTitle.length + 1);
if (!r2.includes("@supports (grid-template-rows: subgrid)") || r2.split(".kp-jsheet__title {").length !== 2) throw new Error("block 2 result");

// Apply from the end so offsets stay valid.
s = s.slice(0, b2.at) + r2 + s.slice(b2.end + 15);
s = s.slice(0, b1.at) + r1 + s.slice(b1.end + 15);
if (/^(<<<<<<<|=======|>>>>>>>)/m.test(s)) throw new Error("markers left");
fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("resolved", crlf ? "CRLF" : "LF");
