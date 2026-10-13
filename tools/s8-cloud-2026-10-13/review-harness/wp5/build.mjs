import { build } from "/home/user/kipindi-land7/node_modules/esbuild/lib/main.js";
import { existsSync } from "node:fs";
import path from "node:path";
const SRC = "/tmp/rev-wp5/src";
const alias = { name: "alias", setup(b) {
  b.onResolve({ filter: /^@\// }, (args) => {
    const base = path.join(SRC, args.path.slice(2));
    for (const ext of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) if (existsSync(base + ext) && !base.endsWith("/") && (ext !== "" || /\.[tj]sx?$/.test(base))) return { path: base + ext };
    return { path: base + ".ts" };
  });
} };
await build({ entryPoints: ["entry.tsx"], bundle: true, outfile: "bundle.js", format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": JSON.stringify(process.env.MODE ?? "development") }, nodePaths: ["/home/user/kipindi-land7/node_modules"],
  plugins: [alias], logLevel: "warning", loader: { ".tsx": "tsx", ".ts": "ts" } });
console.log("built");
