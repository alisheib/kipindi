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
  hold("only success may draw in result modal", /if \(variant === "success"\) return <span[^>]*><I\.check s=\{36\} draw=\{drawCheck\} \/><\/span>/.test(w.modal)
    && /<CrestIcon variant=\{variant\} color=\{tone\.fg\} drawCheck=\{drawCheck\} \/>/.test(w.modal));
  hold("placed bet asks for draw", /drawCheck=\{resultData\.variant === "success"\}/.test(w.dial));
  hold("placed Up and Down bet asks for draw", /<OperationResultModal\s+drawCheck\s+open\s+variant="success"/.test(w.updown));
  hold("only confirmed deposit asks for draw", /drawCheck=\{!!deposited && status === "CONFIRMED" && variant === "success"\}/.test(w.wallet));
  hold("deposit arrow nudges on confirmation", /!!deposited && status === "CONFIRMED" && variant === "success"\s*\? <I\.arrowDownToLine[^>]*className="g-nudge-down"/.test(w.wallet));
  hold("withdrawal arrow nudges only on accepted request", /!!withdrawal && \(status === "PENDING" \|\| status === "PROCESSING" \|\| status === "CONFIRMED"\) && \(variant === "info" \|\| variant === "success"\)\s*\? <I\.arrowUpFromLine[^>]*className="g-nudge-up"/.test(w.wallet));
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
  ["drawing bypasses the key", "glyphs", 'key === "check"', 'key === "x"'],
  ["check appears before drawing", "glyphs", "strokeDashoffset: 100", "strokeDashoffset: 0"],
  ["failure draws as success", "modal", 'variant === "success") return', 'variant === "danger") return'],
  ["bet draw before success", "dial", 'resultData.variant === "success"', 'resultData.variant !== "success"'],
  ["Up and Down bet loses its draw", "updown", "      drawCheck\n      open", "      open"],
  ["withdrawal draws a deposit check", "wallet", '!!deposited && status === "CONFIRMED"', 'status === "CONFIRMED"'],
  ["deposit under review draws a check", "wallet", ' && variant === "success"', ""],
  ["deposit arrow nudges before confirmation", "wallet", '!!deposited && status === "CONFIRMED" && variant === "success"\n    ? <I.arrowDownToLine', '!!deposited\n    ? <I.arrowDownToLine'],
  ["held withdrawal nudges", "wallet", '(status === "PENDING" || status === "PROCESSING" || status === "CONFIRMED") && (variant === "info" || variant === "success")', '(variant === "info" || variant === "success")'],
  ["immediately completed withdrawal stays still", "wallet", ' || status === "CONFIRMED") && (variant', ') && (variant'],
];
for (const [name, key, from, to] of plants) {
  if (!world[key].includes(from)) throw new Error(`plant absent: ${name}`);
  const mutated = { ...world, [key]: world[key].replace(from, to) };
  if (claims(mutated).length === 0) throw new Error(`plant survived: ${name}`);
}
console.log(`W8 receipt motion: ${plants.length}/${plants.length} red plants caught`);
