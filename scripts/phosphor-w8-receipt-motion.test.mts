/** W8: only a confirmed bet or deposit draws Phosphor's check. Every claim has a source mutation. */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

type World = Record<"marks" | "glyphs" | "modal" | "dial" | "updown" | "wallet", string>;
const paths: Record<keyof World, string> = {
  marks: "scripts/glyphs/marks.ts",
  glyphs: "src/components/ui/glyphs.tsx",
  modal: "src/components/markets/operation-result-modal.tsx",
  dial: "src/components/markets/conviction-dial.tsx",
  updown: "src/components/updown/updown-bet-receipt-modal.tsx",
  wallet: "src/app/wallet/wallet-result-modal.tsx",
};
const world = Object.fromEntries(Object.entries(paths).map(([key, path]) =>
  [key, decomment(readFileSync(path, "utf8")).replace(/\r\n/g, "\n")])) as World;

function claims(w: World): string[] {
  const missing: string[] = [];
  const hold = (name: string, ok: boolean) => { if (!ok) missing.push(name); };
  hold("Phosphor owns the check centreline", /check: \{ ph: "check", stroke: "M40 144L96 200L224 72" \}/.test(w.marks));
  hold("draw uses the family key", /if \(draw && key === "check" && e\.m\)/.test(w.glyphs)
    && /<path d=\{e\.m\.d\}[^>]*className="m-draw"/.test(w.glyphs));
  hold("draw has the full stroke at rest", /pathLength=\{100\} className="m-draw" style=\{\{ strokeDasharray: 100, strokeDashoffset: 100 \}\}/.test(w.glyphs));
  hold("only success may draw in result modal", /resultCrest: 36/.test(w.glyphs)
    && /if \(variant === "success"\) return <span[^>]*><I\.check s=\{GLYPH\.resultCrest\} draw=\{drawCheck\} \/><\/span>/.test(w.modal)
    && /glyph\(\{ s: GLYPH\.resultCrest \}\)/.test(w.modal)
    && /<CrestIcon variant=\{variant\} color=\{tone\.fg\} drawCheck=\{drawCheck\} \/>/.test(w.modal));
  hold("placed bet asks for draw", /drawCheck=\{resultData\.variant === "success"\}/.test(w.dial));
  hold("placed Up and Down bet asks for draw", /<OperationResultModal\s+drawCheck\s+open\s+variant="success"/.test(w.updown));
  hold("only confirmed deposit asks for draw", /const depositConfirmed = !!deposited && status === "CONFIRMED" && variant === "success"/.test(w.wallet)
    && /drawCheck=\{animate && depositConfirmed\}/.test(w.wallet));
  hold("deposit arrow nudges on confirmation", /const flowGlyph = depositConfirmed\s*\? <I\.arrowDownToLine[^>]*className=\{animate \? "g-nudge-down" : undefined\}/.test(w.wallet));
  hold("withdrawal arrow nudges only on accepted request", /const withdrawalRequested = !!withdrawal && \(status === "PENDING" \|\| status === "PROCESSING" \|\| status === "CONFIRMED"\)\s*&& \(variant === "info" \|\| variant === "success"\)/.test(w.wallet)
    && /: withdrawalRequested\s*\? <I\.arrowUpFromLine[^>]*className=\{animate \? "g-nudge-up" : undefined\}/.test(w.wallet));
  return missing;
}

const baseline = claims(world);
if (baseline.length) throw new Error(`W8 receipt motion: ${baseline.join("; ")}`);
if (!process.argv.includes("--prove-red")) {
  console.log("W8 receipt motion: 9/9 claims pass");
  process.exit(0);
}

const plants: Array<[string, keyof World, string, string]> = [
  ["source mark changed", "marks", "M40 144L96 200L224 72", "M40 144L96 200L200 72"],
  ["result crest size drifts", "glyphs", "resultCrest: 36", "resultCrest: 34"],
  ["drawing bypasses the key", "glyphs", 'key === "check"', 'key === "x"'],
  ["check appears before drawing", "glyphs", "strokeDashoffset: 100", "strokeDashoffset: 0"],
  ["failure draws as success", "modal", 'variant === "success") return', 'variant === "danger") return'],
  ["bet draw before success", "dial", 'resultData.variant === "success"', 'resultData.variant !== "success"'],
  ["Up and Down bet loses its draw", "updown", "      drawCheck\n      open", "      open"],
  ["withdrawal draws a deposit check", "wallet", 'const depositConfirmed = !!deposited', 'const depositConfirmed = !!withdrawal'],
  ["deposit under review draws a check", "wallet", 'status === "CONFIRMED" && variant === "success"', 'status === "CONFIRMED"'],
  ["deposit arrow nudges before confirmation", "wallet", 'const flowGlyph = depositConfirmed', 'const flowGlyph = !!deposited'],
  ["held withdrawal nudges", "wallet", '&& (variant === "info" || variant === "success");', ';'],
  ["immediately completed withdrawal stays still", "wallet", ' || status === "CONFIRMED")\n    && (variant', ')\n    && (variant'],
  ["receipt draws on a refreshed URL", "wallet", 'drawCheck={animate && depositConfirmed}', 'drawCheck={depositConfirmed}'],
];
for (const [name, key, from, to] of plants) {
  if (!world[key].includes(from)) throw new Error(`plant absent: ${name}`);
  const mutated = { ...world, [key]: world[key].replace(from, to) };
  if (claims(mutated).length === 0) throw new Error(`plant survived: ${name}`);
}
console.log(`W8 receipt motion: ${plants.length}/${plants.length} red plants caught`);
