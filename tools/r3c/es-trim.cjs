const fs = require("fs");
const p = "F:/kipindi-r3c/src/components/ui/empty-state.tsx";
let s = fs.readFileSync(p, "utf8");
const order = ["markets", "positions", "leaderboard", "notifications", "audit", "sources", "proposals", "kyc", "fairness", "rg", "admin", "default"];
const open = '<svg viewBox="0 0 56 56" {...s} width="56" height="56">';
let i = 0;
s = s.replace(/<svg viewBox="0 0 56 56" \{\.\.\.s\} width="56" height="56">/g, () => {
  const k = order[i++];
  return `<svg {...frame(INK_TOP.${k})} {...s}>`;
});
if (i !== 12) throw new Error("expected 12 drawings, found " + i);
const anchor = '  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };';
if (!s.includes(anchor)) throw new Error("anchor missing");

const doc = [
  "/**",
  " * ⭐ EACH DRAWING'S BOX STARTS WHERE ITS INK STARTS (2026-10-09, round 3, tiles 165 166 241). Every drawing is a 56px square,",
  " * but its ink does not reach the square's top: the compass begins 8.25px down, the briefcase 14.25px. The box's padding is",
  " * 48px on both sides, so with a call to action under the body (whose ink ends where its box ends) the content stood 56 and",
  " * 62px under the dashed top against 48px over its bottom — 4px and 7px below the box's centre, measured on Juu/Chini's",
  " * history (box y333–647, ink y390–598) and on Tiketi zangu's (ink y396–594 in y333–641). So each viewBox starts at its",
  " * drawing's first ink row (the topmost stroke, less half the 1.5px stroke, rounded down) and the svg is that much shorter:",
  " * the ink now opens 48px under the border, as the button closes 48px above it. The scale is unchanged (one unit, one",
  " * pixel), the width stays 56, and nothing below the ink moves, so each drawing keeps its gap to the title.",
  " * ⚠️ A NEW DRAWING NEEDS ITS ROW HERE — `test:visual-pass-r3c` §2 reads each case's topmost coordinate and fails on a",
  " * number that is not its ink top. An `illustration` handed in by a caller is drawn as it comes.",
  " */",
  "const INK_TOP: Record<Kind, number> = {",
  "  markets: 14, positions: 14, leaderboard: 12, notifications: 13, audit: 7, sources: 10,",
  "  proposals: 8, kyc: 12, fairness: 14, rg: 12, admin: 8, default: 8,",
  "};",
  "/** The svg's frame for a drawing whose ink starts `top` units down its 56-unit square. */",
  "function frame(top: number) {",
  "  return { viewBox: `0 ${top} 56 ${56 - top}`, width: 56, height: 56 - top };",
  "}",
  "",
  "",
].join("\r\n");
const at = s.indexOf("/** Line-art illustrations");
if (at < 0) throw new Error("no illustration doc");
s = s.slice(0, at) + doc + s.slice(at);
fs.writeFileSync(p, s, "utf8");
console.log("ok", i);
