const fs = require("fs");
const esbuild = require(require.resolve("esbuild", { paths: ["F:/kipindi-r3b/node_modules/tsx", "F:/kipindi-r3b"] }));
const { execSync } = require("child_process");
for (const f of ["src/components/social/channels-panel.tsx", "src/components/layout/needle.tsx"]) {
  const src = execSync(`git -C F:/kipindi-r3b show HEAD:${f}`, { encoding: "utf8", maxBuffer: 1 << 26 });
  try { esbuild.transformSync(src, { loader: "tsx", jsx: "automatic" }); console.log("HEAD parse OK  " + f); }
  catch (e) { console.log("HEAD PARSE FAIL " + f + ": " + e.message.split("\n").slice(0,3).join(" | ")); }
}
