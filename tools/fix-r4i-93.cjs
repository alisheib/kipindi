// R4-I's 9.3 pins SignedInAct's call and signature as they stood before R4-H added `journey` — follow R4-H's shape.
const fs = require("fs");
const p = "F:/kipindi-vis/scripts/visual-pass-r4i.test.mts";
let s = fs.readFileSync(p, "utf8");
const pairs = [
  ["/<SignedInAct t=\\{t\\} mine=\\{mine \\?\\? null\\} \\/>/.test(HERO)", "/<SignedInAct t=\\{t\\} mine=\\{mine \\?\\? null\\} journey=\\{journey\\} \\/>/.test(HERO)"],
  ["/function SignedInAct\\(\\{ t, mine \\}: \\{ t: Dict; mine: LandingMine \\| null \\}\\)/.test(HERO)", "/function SignedInAct\\(\\{ t, mine, journey \\}: \\{ t: Dict; mine: LandingMine \\| null; journey: boolean \\}\\)/.test(HERO)"],
];
for (const [a, b] of pairs) {
  if (!s.includes(a)) throw new Error("anchor: " + a.slice(0, 60));
  s = s.split(a).join(b);
}
const note = "  // The page says the end (`formatBreakEnd`) and hands the hero words, so the hero's call and SignedInAct's signature stay";
if (!s.includes(note)) throw new Error("note anchor");
s = s.replace(note, "  // (Merged onto R4-H, which added `journey` to SignedInAct's call and signature: the pins follow that shape.)\r\n" + note);
fs.writeFileSync(p, s);
console.log("ok");
