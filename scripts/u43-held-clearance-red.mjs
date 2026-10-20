/** Browser-only reversals: restore the caption and pre-action 72px layout shift. No prices are invented. */
import { execFileSync } from "node:child_process";

const run = ({ width, captionRed = false, lineRed = false }) => {
  try {
    const output = execFileSync(process.execPath, ["scripts/u43-held-clearance-probe.mjs"], {
      env: { ...process.env, HELD_CLEARANCE_WIDTH: String(width), HELD_LINE_DELAY: width === 360 ? "1" : "0",
        HELD_CAPTION_RED: captionRed ? "1" : "0", HELD_LINE_RED: lineRed ? "1" : "0" },
      encoding: "utf8", stdio: "pipe", timeout: 320_000, maxBuffer: 2 * 1024 * 1024,
    });
    return { code: 0, output };
  } catch (error) {
    return { code: error.status ?? 1, output: String(error.stdout ?? "") + String(error.stderr ?? "") };
  }
};

const green320 = run({ width: 320 });
if (green320.code !== 0 || !green320.output.includes("PASS held 320px:")) {
  throw new Error(`held 320px premise failed before browser mutation: ${green320.output.slice(-1000)}`);
}
console.log(green320.output.trim());
const red320 = run({ width: 320, captionRed: true });
if (red320.code === 0 || !red320.output.includes("held 320px one-side caption is absent or visible instead of hidden")) {
  throw new Error(`the duplicate held caption was not rejected by the real browser: ${red320.output.slice(-1000)}`);
}
console.log("CAUGHT held 320px: the duplicate one-side caption becomes visible in the real browser");

const green360 = run({ width: 360 });
if (green360.code !== 0 || !green360.output.includes("PASS delayed layout 360px:")) {
  throw new Error(`held 360px delayed-line premise failed before browser mutation: ${green360.output.slice(-1000)}`);
}
console.log(green360.output.trim());
const red360 = run({ width: 360, lineRed: true });
if (red360.code === 0 || !/delayed line held action clearance -?\d+(?:\.\d+)?px below 24px/.test(red360.output)) {
  throw new Error(`the pre-action plot did not fail real held-action geometry: ${red360.output.slice(-1000)}`);
}
console.log("CAUGHT held 360px: a price-free 72px delayed layout block above the action pushes its buttons within 24px of the fixed rail");
