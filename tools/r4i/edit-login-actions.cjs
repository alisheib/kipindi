const fs = require("fs");
const f = "src/app/auth/login/actions.ts";
let s = fs.readFileSync(f, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const oldA = `      const until = standing === "serving" && result.detail?.until
        ? \`&until=\${encodeURIComponent(result.detail.until.slice(0, 10))}\` : "";
      redirect(\`/auth/login?excluded=\${standing}\${until}\${safeNext ? \`&next=\${encodeURIComponent(safeNext)}\` : ""}\`);`;
const newA = `      // The instant, not its UTC day (R4-I, 2026-10-09): the panel says the end with its time, on the East Africa clock.
      const endParam = standing === "serving" ? breakEndParam(result.detail?.until) : null;
      const until = endParam ? \`&until=\${encodeURIComponent(endParam)}\` : "";
      redirect(\`/auth/login?excluded=\${standing}\${until}\${safeNext ? \`&next=\${encodeURIComponent(safeNext)}\` : ""}\`);`;
const oldB = `        const until = standing === "serving" && result.detail?.until
          ? \`&until=\${encodeURIComponent(result.detail.until.slice(0, 10))}\` : "";
        redirect(\`/auth/login?excluded=\${standing}\${until}\${safeNext ? \`&next=\${encodeURIComponent(safeNext)}\` : ""}\`);`;
const newB = `        // The instant, not its UTC day (R4-I, 2026-10-09) — as the password door above.
        const endParam = standing === "serving" ? breakEndParam(result.detail?.until) : null;
        const until = endParam ? \`&until=\${encodeURIComponent(endParam)}\` : "";
        redirect(\`/auth/login?excluded=\${standing}\${until}\${safeNext ? \`&next=\${encodeURIComponent(safeNext)}\` : ""}\`);`;
for (const [o, n] of [[oldA, newA], [oldB, newB]]) {
  const c = s.split(o).length - 1;
  if (c !== 1) { console.error("anchor count", c, o.slice(0, 60)); process.exit(1); }
  s = s.replace(o, () => n);
}
const imp = `import { accountRefusalPath, landingAfterAuth } from "@/lib/auth-landing";\n`;
if (s.split(imp).length !== 2) { console.error("import anchor"); process.exit(1); }
s = s.replace(imp, () => imp + `import { breakEndParam } from "@/lib/break-end";\n`);
if (crlf) s = s.replace(/\n/g, "\r\n");
fs.writeFileSync(f, s);
console.log("ok", crlf ? "crlf" : "lf");
