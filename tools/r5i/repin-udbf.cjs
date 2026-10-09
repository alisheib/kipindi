// Re-pin updown-bet-feedback §3.4 for R5-I (the server refusal's toast is ranked by the registry now). The file holds a
// literal NUL and LF endings, so it is edited as bytes-preserving text here (never through a heredoc).
const fs = require("fs");
const p = "F:/kipindi-r5i/scripts/updown-bet-feedback.test.mts";
const s = fs.readFileSync(p, "utf8");
const from = [
  "// ⛔ UPDATED 2026-08-07 (UD-1/UD-3). The failure side now carries THREE toasts with two",
  "// registers, and the distinction is the point: the two SERVER refusals (else + catch)",
  "// stay `danger` and became STICKY (`durationMs: 0` — a money refusal stays until read),",
  "// while the pre-flight balance prevention is `factual` — a fact about the wallet, not an",
  "// alarm, and never a round-trip. A danger toast that auto-dismisses, or a prevention",
  "// that alarms, are both regressions here.",
  'ok("3.4 · server failures toast `danger` AND sticky; the pre-flight prevention is `factual`",',
  '   (failureSide.match(/variant:\\s*"danger",\\s*durationMs:\\s*0/g) ?? []).length === 2 &&',
  '   (failureSide.match(/variant:\\s*"danger"/g) ?? []).length === 2 &&',
  '   (failureSide.match(/variant:\\s*"factual"/g) ?? []).length === 1,',
].join("\n");
const to = [
  "// ⛔ UPDATED 2026-08-07 (UD-1/UD-3). The failure side now carries THREE toasts with two",
  "// registers, and the distinction is the point: the two SERVER refusals (else + catch)",
  "// stay `danger` and became STICKY (`durationMs: 0` — a money refusal stays until read),",
  "// while the pre-flight balance prevention is `factual` — a fact about the wallet, not an",
  "// alarm, and never a round-trip. A danger toast that auto-dismisses, or a prevention",
  "// that alarms, are both regressions here.",
  "// ⭐ RE-PINNED 2026-10-09 (R5-I, the visual pass's round 5; DESIGN_AUTHORITY §F2/§F3). The server's refusal toast",
  "// takes the failure registry's RANK (`fail.variant` — `refusalVariant`): a slip the player can fix (a stake under the",
  "// minimum, busy, too many tries) is `factual`, a fault `danger` — as the Sell button's (S6 A8h) and the old dial's.",
  "// Every one is still STICKY; the throw (no verdict at all) stays `danger`; the pre-flight stays `factual`.",
  "// test:feedback-law §11 executes the rank on this surface's mapper.",
  'ok("3.4 · server failures toast at the registry\'s rank AND sticky (the throw `danger`); the pre-flight prevention is `factual`",',
  '   (failureSide.match(/variant:\\s*fail\\.variant,\\s*durationMs:\\s*0/g) ?? []).length === 1 &&',
  '   (failureSide.match(/variant:\\s*"danger",\\s*durationMs:\\s*0/g) ?? []).length === 1 &&',
  '   (failureSide.match(/variant:\\s*"factual"/g) ?? []).length === 1,',
].join("\n");
const n = s.split(from).length - 1;
if (n !== 1) { console.log("anchor matched", n); process.exit(1); }
fs.writeFileSync(p, s.replace(from, () => to));
console.log("re-pinned; NUL kept:", fs.readFileSync(p, "utf8").includes("\u0000"));
