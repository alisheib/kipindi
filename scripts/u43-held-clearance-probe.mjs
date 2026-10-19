/** Real local phone bets, measured against the fixed rail in Chromium. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

if (!process.env.HELD_CLEARANCE_WIDTH) {
  for (const width of [320, 360]) {
    try {
      const output = execFileSync(process.execPath, [process.argv[1]], {
        env: { ...process.env, HELD_CLEARANCE_WIDTH: String(width), HELD_LINE_DELAY: width === 360 ? "1" : "0" },
        encoding: "utf8", stdio: "pipe", timeout: 320_000, maxBuffer: 2 * 1024 * 1024,
      });
      process.stdout.write(output);
    } catch (error) {
      console.error((String(error.stdout ?? "") + String(error.stderr ?? "")).slice(-1200) || String(error));
      process.exit(1);
    }
  }
  process.exit(0);
}

const out = mkdtempSync(join(tmpdir(), "u43-held-clearance-"));
const width = Number(process.env.HELD_CLEARANCE_WIDTH || 320);
if (![320, 360, 390].includes(width)) throw new Error("Held clearance probe needs a supported phone width");
const cell = `player-${width}-sw`;
try {
  execFileSync(process.execPath, ["scripts/live/updown-visual-states.mjs"], {
    env: { ...process.env, HELD_CLEARANCE_ONLY: "1", OUT: out },
    encoding: "utf8", stdio: "pipe", timeout: 300_000, maxBuffer: 2 * 1024 * 1024,
  });
  const index = JSON.parse(readFileSync(join(out, "index.json"), "utf8"));
  const receipt = index.phases.find((phase) => phase.phase === "p2-receipt")?.shots?.find((shot) => shot.cell === cell);
  const shot = index.phases.find((phase) => phase.phase === "p3-youre-in")?.shots?.find((item) => item.cell === cell);
  if (receipt?.receiptOk !== true || shot?.error || shot?.heldAction?.layout !== "held"
    || shot.heldAction.railPosition !== "fixed" || shot.heldAction.buttons !== 2
    || shot.heldAction.minButtonHeight < 40 || shot.heldAction.clearance < 24
    || (width === 320 && (!shot.oneSideCaption?.present || shot.oneSideCaption.visible))) {
    throw new Error(`held ${width}px premise failed: ${JSON.stringify({ receipt, shot }).slice(0, 500)}`);
  }
  if (process.env.HELD_LINE_DELAY === "1" && width === 360 &&
    (!shot.lineShift || shot.lineShift.simulation !== true || shot.lineShift.height !== 72
      || !["vendor", "confirmed"].includes(shot.lineShift.sourceTier)
      || shot.lineShift.before < 24 || shot.lineShift.after < 24
      || Math.abs(shot.lineShift.after - shot.lineShift.before) > 1)) {
    throw new Error(`held 360px delayed-line premise failed: ${JSON.stringify(shot.lineShift)}`);
  }
  console.log(`PASS held ${width}px: two ${shot.heldAction.minButtonHeight.toFixed(1)}px buttons, ${shot.heldAction.clearance.toFixed(1)}px above fixed rail`);
  if (shot.lineShift) console.log(`PASS delayed layout 360px: ${shot.lineShift.before.toFixed(1)}px before → ${shot.lineShift.after.toFixed(1)}px after a price-free 72px browser block; real history tier ${shot.lineShift.sourceTier}`);
} catch (error) {
  const output = String(error.stdout ?? "") + String(error.stderr ?? "");
  console.error(output.slice(-1200) || String(error));
  process.exitCode = 1;
} finally {
  // Only this mkdtemp child of the OS temp directory may be removed.
  const tempRoot = resolve(tmpdir());
  const owned = resolve(out);
  if (owned.startsWith(tempRoot + sep) && owned.split(sep).at(-1)?.startsWith("u43-held-clearance-")) {
    rmSync(owned, { recursive: true, force: true });
  }
}
