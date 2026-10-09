// e45-run — runs R4-K's E45 font probe as the journey's player: mints a staff preview pass and the demo player's session
// on the local server, then hands the probe its cookie header (session + kp_preview).
//   node e45-run.mjs http://localhost:3074        (cwd: a worktree with node_modules)
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
const BASE = process.argv[2];
if (!/^http:\/\/localhost:\d+$/.test(BASE ?? "")) { console.log("e45-run: give http://localhost:<port>"); process.exit(2); }
process.env.LIVE_BASE = BASE;
const R = "F:/kipindi-a8i2-ctl/scripts/live/";
const { browser } = await import(pathToFileURL(R + "harness.mjs").href);
const kit = await import(pathToFileURL(R + "journey-pass.mjs").href);
const { b } = await browser();
const pass = await kit.mintStaffPass(b, BASE);
const c = await b.newContext();
await c.request.get(`${BASE}/auth/demo`);
const cookies = (await c.cookies(BASE)).filter((x) => x.name !== "kp-locale" && x.name !== pass.name);
await c.close();
await b.close();
const header = [...cookies.map((x) => `${x.name}=${x.value}`), `${pass.name}=${pass.value}`].join("; ");
console.log(`e45-run: player cookies ${cookies.map((x) => x.name).join(", ")} + ${pass.name}`);
const probe = join(dirname(fileURLToPath(import.meta.url)), "e45-font-probe.mjs");
const r = spawnSync(process.execPath, [probe, BASE, header], { stdio: "inherit", cwd: process.cwd() });
process.exit(r.status ?? 1);
