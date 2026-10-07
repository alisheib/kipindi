// Node port of handover tools/a8h/drive/crash-edit.py. The A8h lost-chunk control's throwaway edit, in F:/kipindi-a8i2:
// "strip" removes the LazySellResultHost line's .catch(nothingIfLost); "restore" puts it back. Each asserts its line once.
import fs from "node:fs";
const f = "F:/kipindi-a8i2/src/components/layout/shell-lazy.tsx";
const a = 'import("@/components/markets/sell-result-host").then((m) => m.SellResultHost).catch(nothingIfLost));';
const b = 'import("@/components/markets/sell-result-host").then((m) => m.SellResultHost));';
const mode = process.argv[2];
const s = fs.readFileSync(f, "utf8");
const count = (t, n) => t.split(n).length - 1;
let s2;
if (mode === "strip") {
  if (count(s, a) !== 1) { console.error("the guarded line is not there once"); process.exit(1); }
  s2 = s.replace(a, b);
  console.log("guard removed from the sell-result line (throwaway)");
} else {
  s2 = count(s, b) === 1 ? s.replace(b, a) : s;
  console.log(`restore: guarded ${count(s2, a)} stripped ${count(s2, b)}`);
}
fs.writeFileSync(f, s2, "utf8");
