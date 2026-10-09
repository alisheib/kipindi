// Builds a probe copy of the test with absolute imports and a replaced plant list. Read-only w.r.t. the repo.
import { readFileSync, writeFileSync } from "node:fs";
const SRC = "F:/kipindi-a8i2/scripts/enter-where-pressed.test.mts";
const OUT = process.argv[2];
let t = readFileSync(SRC, "utf8");
const rep = (a, b) => {
  if (!t.includes(a)) throw new Error("anchor missing: " + a);
  t = t.replace(a, b);
};
rep('from "./lib/decomment.mts"', 'from "file:///F:/kipindi-a8i2/scripts/lib/decomment.mts"');
rep('from "../src/lib/held-key.ts"', 'from "file:///F:/kipindi-a8i2/src/lib/held-key.ts"');
rep('from "../src/lib/modal-stack.ts"', 'from "file:///F:/kipindi-a8i2/src/lib/modal-stack.ts"');
rep('const ROOT = new URL("..", import.meta.url).pathname.replace(/^\\/([A-Za-z]:)/, "$1");', 'const ROOT = "F:/kipindi-a8i2/";');
const probes = `
  plants.length = 0;
  plants.push(
    { name: "PROBE A: swallowsKey forgets the held repeat (the app-wide UP burst rule)", expect: /^/,
      world: () => swap({ swallowsKey: (k, r, t, p, beat) => { if (k !== "Enter" && k !== " ") return false; if (p === "behind") return true; return !r && beat && HK.pressesSomething(k, t); } }) },
    { name: "PROBE B: guard's onKeyDown passes e.repeat as false", expect: /^/,
      world: () => plantIn(GUARD, "const swallow = swallowsKey(e.key, e.repeat,", "const swallow = swallowsKey(e.key, false,") },
    { name: "PROBE C: leave() arms nothing after giving focus back", expect: /^/,
      world: () => plantIn(MODAL, "  if (plan.arm === \\"back\\" && back) armBeat(back, performance.now());", "") },
    { name: "PROBE D: focusIn arms nothing", expect: /^/,
      world: () => plantIn(MODAL, "      armBeat(rootRef.current, performance.now());", "") },
    { name: "PROBE E: Modal's cleanup forgets cancelAnimationFrame", expect: /^/,
      world: () => plantIn(MODAL, "      cancelAnimationFrame(frame);", "") },
    { name: "PROBE F: heirs never re-pointed in leave()", expect: /^/,
      world: () => plantIn(MODAL, "  for (const heir of heirsOf(box, rest)) heir.restoreTo = layer.restoreTo;", "") },
    { name: "PROBE G: guard's keyup listener dropped entirely", expect: /^/,
      world: () => plantIn(GUARD, '  window.addEventListener("keyup", onKeyUp, true);', "") },
  );
  let caught = 0, fail = 0;`;
rep("  let caught = 0, fail = 0;", probes);
writeFileSync(OUT, t);
console.log("probe written", OUT);
