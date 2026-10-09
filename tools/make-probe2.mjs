// Probe 2: (a) drop the census's first-definition fallback and run the real tree; (b) a fixture where the fallback fails open.
import { readFileSync, writeFileSync } from "node:fs";
const SRC = "F:/kipindi-a8i2/scripts/enter-where-pressed.test.mts";
const OUT = process.argv[2];
const mode = process.argv[3];
let t = readFileSync(SRC, "utf8");
const rep = (a, b) => {
  if (!t.includes(a)) throw new Error("anchor missing: " + a);
  t = t.replace(a, b);
};
rep('from "./lib/decomment.mts"', 'from "file:///F:/kipindi-a8i2/scripts/lib/decomment.mts"');
rep('from "../src/lib/held-key.ts"', 'from "file:///F:/kipindi-a8i2/src/lib/held-key.ts"');
rep('from "../src/lib/modal-stack.ts"', 'from "file:///F:/kipindi-a8i2/src/lib/modal-stack.ts"');
rep('const ROOT = new URL("..", import.meta.url).pathname.replace(/^\\/([A-Za-z]:)/, "$1");', 'const ROOT = "F:/kipindi-a8i2/";');
if (mode === "nofallback") {
  rep("      else if (def) handler = definitionText(code, b, def);", "      else if (def && false) handler = definitionText(code, b, def);");
}
if (mode === "failopen") {
  // Append a direct listenersIn call on a fixture: component A has a local Escape-only onKey; component B listens with an
  // imported onKey that reads Enter.
  t += `
const FIX = [
  'import { onKey } from "@/lib/zz-keys2";',
  "function A() {",
  "  useEffect(() => {",
  '    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };',
  "    window.addEventListener('keydown', onKey);",
  "  }, []);",
  "}",
  "function B() {",
  "  useEffect(() => { window.addEventListener('keydown', onKey); }, []);",
  "}",
].join(String.fromCharCode(10));
const LIB = { "src/lib/zz-keys2.ts": 'export function onKey(e: KeyboardEvent) { if (e.key === "Enter") fire(); }' };
const fw = { ...REAL, read: (rel: string) => (rel === "src/zz/fix.tsx" ? FIX : (LIB as Record<string, string>)[rel] ?? REAL.read(rel)) };
console.log("FAILOPEN PROBE", JSON.stringify(listenersIn("src/zz/fix.tsx", FIX, fw).map((l) => ({ line: l.line, resolved: l.handler !== null, enter: l.enter, text: (l.handler ?? "").slice(0, 70) }))));
`;
}
writeFileSync(OUT, t);
console.log("probe written", OUT, mode);
