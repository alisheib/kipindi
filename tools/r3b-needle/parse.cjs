const fs = require("fs");
const esbuild = require(require.resolve("esbuild", { paths: ["F:/kipindi-r3b/node_modules/tsx", "F:/kipindi-r3b"] }));
const files = ["src/components/layout/needle.tsx", "src/lib/needle-rest.ts", "src/components/social/channels-panel.tsx", "src/components/pwa/install-invite.tsx", "src/components/analytics/consent-prompt.tsx", "tailwind.config.ts", "scripts/needle-host.test.mts", "scripts/stacking-contract.test.mts"];
let bad = 0;
for (const f of files) {
  try { esbuild.transformSync(fs.readFileSync("F:/kipindi-r3b/" + f, "utf8"), { loader: /x$/.test(f) ? "tsx" : "ts", jsx: "automatic", format: "esm" }); console.log("parse OK  " + f); }
  catch (e) { bad++; console.log("PARSE FAIL " + f + ": " + e.message.split("\n").slice(0, 4).join(" | ")); }
}
process.exit(bad ? 1 : 0);
