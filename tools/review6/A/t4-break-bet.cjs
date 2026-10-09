// Review A · t4: static trace — does any BET surface consult the reader's break? (read-only)
// 1) markets/[id]/page.tsx: where breakEnd is read, every use of it, the bettingOpen definition, and the JSX branch that
//    renders <SidePicker> (the dial + confirm). 2) every bet surface file: does it mention a break/lockout at all?
const fs = require("node:fs");
const path = require("node:path");
const ROOT = "F:/kipindi-rev/";
const page = fs.readFileSync(ROOT + "src/app/markets/[id]/page.tsx", "utf8").split("\n");
const hit = (re) => page.map((l, i) => [i + 1, l]).filter(([, l]) => re.test(l));
console.log("== markets/[id]/page.tsx");
for (const [n, l] of hit(/breakEnd|breakDate|bettingOpen\s*=|<SidePicker|\{bettingOpen \?|session \? \(/)) console.log(String(n).padStart(5), l.trim().slice(0, 150));

const files = [
  "src/components/markets/side-picker.tsx",
  "src/components/markets/conviction-dial.tsx",
  "src/components/markets/bet-confirm-modal.tsx",
  "src/components/markets/market-card.tsx",
  "src/components/home/landing-hero.tsx",
  "src/app/updown/page.tsx",
  "src/app/updown/[roundId]/page.tsx",
  "src/components/updown/updown-card.tsx",
  "src/components/updown/round-stake-panel.tsx",
  "src/components/updown/updown-stake-controls.tsx",
  "src/components/updown/use-quick-bet.ts",
];
const RG = /isLockedOut|breakEnd|onBreak|promoSuppressed|coolingOff|cooling_off|selfExclu|self_exclu|breakState/;
console.log("\n== bet surfaces: lines that consult a break / exclusion (none = offered during a break)");
for (const f of files) {
  const p = ROOT + f;
  if (!fs.existsSync(p)) { console.log("  (missing)", f); continue; }
  const lines = fs.readFileSync(p, "utf8").split("\n");
  const uses = lines.map((l, i) => [i + 1, l]).filter(([, l]) => RG.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l));
  // landing-hero's SignedInAct does read the break (its lead) — print what it gates, so the board's YES/NO are judged too.
  console.log(`  ${f}: ${uses.length ? uses.map(([n]) => n).join(",") : "NONE"}`);
  if (f.endsWith("landing-hero.tsx")) for (const [n, l] of uses) console.log("      ", n, l.trim().slice(0, 120));
}
