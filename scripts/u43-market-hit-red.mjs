/** Replant the measured 320px market-card footer defects in the browser only. */
import { execFileSync } from "node:child_process";

const base = process.argv.slice(2).find((arg) => /^http:\/\//.test(arg)) || process.env.BASE || "http://localhost:3009";
const run = (path, red) => {
  try {
    const out = execFileSync(process.execPath, ["scripts/u43-market-hit-probe.mjs", "red", base, path], {
      encoding: "utf8", stdio: "pipe",
      env: { ...process.env, BASE: base, HIT_WIDTHS: "320", HIT_LOCALES: "sw", RED_MARKET_HIT: red },
    });
    return { code: 0, out };
  } catch (error) {
    return { code: error.status ?? 1, out: String(error.stdout ?? "") + String(error.stderr ?? "") };
  }
};

for (const path of ["/markets", "/"]) {
  const green = run(path, "0");
  if (green.code !== 0) throw new Error(`${path} market hit guard red before mutation: ${green.out.slice(-500)}`);
  const red = run(path, "reach");
  if (red.code === 0 || !red.out.includes("share live hit") || !red.out.includes("details live hit")) {
    throw new Error(`${path} old 39.5px reach was not caught on both footer controls: ${red.out.slice(-700)}`);
  }
  console.log(`CAUGHT ${path}: old 39.5px Share and Details reach`);
}
for (const { path, mode } of [
  { path: "/markets", mode: "meta-margin" },
  { path: "/", mode: "featured-wrap" },
]) {
  const red = run(path, mode);
  if (red.code === 0 || !red.out.includes("live hit") || !red.out.includes("below 40px")) {
    throw new Error(`${path} ${mode} did not fail actual 320px hit geometry: ${red.out.slice(-700)}`);
  }
  console.log(`CAUGHT ${path}: ${mode} removes a 40px market footer target`);
}
console.log("U43 MARKET HIT RED: four browser-only plants caught; application files untouched");
