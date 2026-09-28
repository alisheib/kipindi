// Builds the band panel's args from a drive's frames folder: node panel-args.mjs <label> [round] [priorFile]
import { readdirSync, writeFileSync } from "node:fs";
const label = process.argv[2];
const round = Number(process.argv[3] || 1);
const prior = process.argv[4] || "";
const repo = "C:/kipindi-landing-v3";
const dir = `${repo}/.qa-shots/landing-v3/${label}`;
const framesDir = `${dir}/frames`;
const STATE = {
  S8: "S8 · no live round — today's band, unchanged",
  S4: "S4 · kick-off: the open confirmed, no read after it yet",
  S3: "S3 · level: the newest read sits between the targets (BTC, ±$0.02 band — too narrow for the void band to draw)",
  S3g: "S3 on GOLD with production's ±$0.40 band — level, the void band drawn",
  S2: "S2 · Down leads (newest read below the down target)",
  S1: "S1 · Up leads (three reads 2 min apart: level tick, Down stem, Up stem + bead)",
  S5: "S5 · aged: the Up read went stale while betting is still open — past tense, muted (Playwright clock)",
  S7: "S7 · betting closed (Playwright clock): padlocked sides, the Watch link in the clock row, Play the next round",
  S7x: "S7 after the deciding instant: the playhead parked on the flag",
  PAIR: "the click-through pair — 1 = the band, 2 = the round page it lands on after tapping Juu (360 sw)",
  BACK: "after Back from the round page — the band's clock re-anchored",
  R5a: "after the 60-second refresh brought a newer (Down) read in without a reload",
};
const files = readdirSync(framesDir).filter((f) => f.endsWith(".png")).sort();
const frames = files.map((file) => {
  const m = file.match(/^(S\d+g?x?|PAIR|BACK|R5a)[-](.*)\.png$/);
  const key = m ? m[1] : "?";
  const cell = m ? m[2] : file;
  return { file, what: `${STATE[key] ?? key} — ${cell.replace(/-b$/, " (continued below)")}` };
});
const args = { repo, framesDir, report: `${dir}/band-report.json`, contrast: `${dir}/contrast.txt`, frames, round, prior };
writeFileSync(`${dir}/panel-args.json`, JSON.stringify(args, null, 2));
console.log(`${frames.length} frames → ${dir}/panel-args.json`);
