// Debug: replicate ONE mutation of scripts/ai-cycles-red.mjs without any mutation, and print
// everything the gate says. Lives in the scratchpad, so it never touches the repo's scripts/.
import { mkdtempSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const cwd = "F:/kipindi-rot1/";
const NEST = join(cwd, "node_modules", ".red-dbg");
mkdirSync(NEST, { recursive: true });
const root = mkdtempSync(join(NEST, "m-"));
console.log("root =", root);
cpSync(join(cwd, "src"), join(root, "src"), { recursive: true });
cpSync(join(cwd, "scripts"), join(root, "scripts"), { recursive: true });

let out = "", exit = 0;
try {
  out = execSync(`npx tsx "${join(root, "scripts/ai-cycles.test.mts")}"`, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "test" },
  });
} catch (e) {
  out = `STDOUT>>>\n${e.stdout ?? ""}\nSTDERR>>>\n${e.stderr ?? ""}`;
  exit = e.status ?? 1;
}
console.log("exit =", exit);
console.log(out.slice(0, 6000));
try { rmSync(NEST, { recursive: true, force: true }); } catch {}
