// Probe: in the harness's new layout, does an `@/…` import made from inside the mutant tree resolve to the
// MUTANT's file (not the real repo's)? Plant a throw in src/lib/platform-timezone.ts — a module the gate reaches
// ONLY through the `@/` alias (platform-config.ts re-exports it) — and see whether the gate dies on it.
import { mkdtempSync, mkdirSync, cpSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";

const cwd = "F:/kipindi-rot1/";
const NEST = join(cwd, `.red-ai-probe-${process.pid}.red-tmp`);
mkdirSync(NEST, { recursive: true });
const root = mkdtempSync(join(NEST, "m-"));
for (const rel of ["src", "scripts/ai-cycles.test.mts", "tsconfig.json", "package.json"]) {
  const dest = join(root, rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(join(cwd, rel), dest, { recursive: true });
}
const target = join(root, "src/lib/platform-timezone.ts");
writeFileSync(target, `throw new Error("MARKER-FROM-THE-MUTANT-COPY");\n` + readFileSync(target, "utf8"));

let out = "", exit = 0;
try {
  out = execFileSync(process.execPath, [join(cwd, "node_modules/tsx/dist/cli.mjs"), join(root, "scripts/ai-cycles.test.mts")], {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000,
    env: { ...process.env, NODE_ENV: "test" },
  });
} catch (e) { out = `${e.stdout ?? ""}${e.stderr ?? ""}`; exit = e.status ?? 1; }
console.log("exit =", exit);
console.log("marker seen:", out.includes("MARKER-FROM-THE-MUTANT-COPY"));
console.log(out.split("\n").filter((l) => /Error|MARKER/.test(l)).slice(0, 3).join("\n"));
rmSync(NEST, { recursive: true, force: true });
