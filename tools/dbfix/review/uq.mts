import { execFileSync } from "node:child_process";
import { build } from "./harness.mts";
const cmd = build("F:\Ali\u2019s work\kipindi", [3000]);
try { const out = execFileSync("powershell", ["-NoProfile", "-Command", cmd], { encoding: "utf8", timeout: 20000, stdio: ["ignore", "pipe", "pipe"] }); console.log("ran, out=" + JSON.stringify(out)); }
catch (e) { console.log("execFileSync threw (killOwnOrphans would return 0):", String((e as any).stderr).split("\n").slice(0, 2).join(" | ")); }
