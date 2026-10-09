const fs = require("fs");
function edit(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  for (const [o, n] of pairs) {
    const c = s.split(o).length - 1;
    if (c !== 1) { console.error(f, "anchor count", c, JSON.stringify(o.slice(0, 80))); process.exit(1); }
    s = s.replace(o, () => n);
  }
  if (crlf) s = s.replace(/\n/g, "\r\n");
  fs.writeFileSync(f, s);
  console.log("ok", f, crlf ? "crlf" : "lf");
}
edit("src/lib/server/market-service.ts", [
  [`    if (lockout.reason === "cooling_off") {
      return { ok: false, error: \`Cooling-off until \${until}.\`, code: "SUSPENDED", reason: "cooling_off", detail: { until } };
    }
    return { ok: false, error: \`Self-exclusion until \${until}.\`, code: "SUSPENDED", reason: "self_excluded", detail: { until } };`,
   `    // ⭐ R4-I (2026-10-09) · \`untilAt\`, THE INSTANT, beside the formatted \`until\`: the player's surface formats it in the
    // reader's month words on the East Africa clock (\`failureUntil\`), where \`until\` printed "9 Oct 2026, 06:02" in every
    // language (tiles 036 040 044 102 106 110). \`until\` stays for a renderer with no locale and for the English \`error\`.
    if (lockout.reason === "cooling_off") {
      return { ok: false, error: \`Cooling-off until \${until}.\`, code: "SUSPENDED", reason: "cooling_off", detail: { until, untilAt: lockout.until! } };
    }
    return { ok: false, error: \`Self-exclusion until \${until}.\`, code: "SUSPENDED", reason: "self_excluded", detail: { until, untilAt: lockout.until! } };`],
]);
edit("src/lib/server/wallet-service.ts", [
  [`    if (lockout.reason === "cooling_off") {
      return { ok: false, error: \`You are in a cooling-off period until \${until}.\`, code: "SUSPENDED", reason: "cooling_off", detail: { until } };
    }
    return { ok: false, error: \`You are in a self-exclusion period until \${until}.\`, code: "SUSPENDED", reason: "self_excluded", detail: { until } };`,
   `    // R4-I (2026-10-09) · the instant beside the formatted end, for the reader's own formatter — see the betting gate.
    if (lockout.reason === "cooling_off") {
      return { ok: false, error: \`You are in a cooling-off period until \${until}.\`, code: "SUSPENDED", reason: "cooling_off", detail: { until, untilAt: lockout.until! } };
    }
    return { ok: false, error: \`You are in a self-exclusion period until \${until}.\`, code: "SUSPENDED", reason: "self_excluded", detail: { until, untilAt: lockout.until! } };`],
]);
