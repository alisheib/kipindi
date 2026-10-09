const fs = require("fs");
const D = process.argv[2], REPO = process.argv[3];
const lf = (t) => t.replace(/\r\n/g, "\n");
const crlf = (t) => t.replace(/\n/g, "\r\n");
const rd = (f) => lf(fs.readFileSync(D + "/" + f, "utf8"));
const once = (s, needle, label) => {
  const i = s.indexOf(needle);
  if (i < 0 || s.indexOf(needle, i + 1) >= 0) throw new Error(label + ": not exactly once");
  return i;
};
let v = lf(fs.readFileSync(REPO + "/docs/VODACOM-PLAN.md", "utf8"));
// 1 · State
{ const o = "money dialog lands on its way out (below). ⚠️ Owner ruling of 2026-10-07";
  once(v, o, "state");
  v = v.replace(o, 'money dialog lands on its way out (below); and A8j (`88fb1f41`): Enter in a form never skips its confirm (below).\n⚠️ Owner ruling of 2026-10-07'); }
// 2 · the LIVE paragraph, above A8i-2's
{ const o = "**✅ A8i-2 LIVE `586c5183` (2026-10-07)"; const i = once(v, o, "a8i2 live");
  v = v.slice(0, i) + rd("live.md") + v.slice(i); }
// 3 · IN FLIGHT
{ const s0 = "**⏳ IN FLIGHT (updated 2026-10-07 ~12:45 EAT)"; const i = once(v, s0, "inflight start");
  const e0 = "an early start that the handover draft supersedes.)\n"; const j = v.indexOf(e0, i);
  if (j < 0 || j - i > 3000) throw new Error("inflight end");
  v = v.slice(0, i) + rd("inflight.md") + v.slice(j + e0.length); }
// 4 · Next
{ const o = `**Next:** (1) S6 — **A8j** (live for every player, money: above, §0i "A8i" and the handover's draft), then resume at`;
  once(v, o, "next");
  v = v.replace(o, `**Next:** (1) S6 — the lock turn above (A8j's owed WebKit runs, then the close-out's three owed items), then resume at`); }
// 5 · §0i list line
{ const o = '**A8i** and **A8i-2** are LIVE (`23f762f4`, `586c5183`, their bullets at the end of this list); A8j goes first (§0).';
  once(v, o, "0i line");
  v = v.replace(o, "**A8i**, **A8i-2** and **A8j** are LIVE (`23f762f4`, `586c5183`, `88fb1f41`, their bullets at the end of this list); the close-out's three owed items go first (§0)."); }
// 6 · §0i bullet after A8i-2's
{ const b = once(v, "- **A8i-2 — a key held down presses once", "a8i2 bullet");
  const e0 = "  in predeploy (it needs a server).\n"; const j = v.indexOf(e0, b);
  if (j < 0 || j - b > 8000) throw new Error("a8i2 bullet end");
  v = v.slice(0, j + e0.length) + rd("bullet.md") + v.slice(j + e0.length); }
// 7 · §0h point 60 after 59
{ const b = once(v, "59. **A key held down presses once", "point 59");
  const e0 = "    clock is NOT taken: its race was refuted twice, and the handover said to drop it.\n"; const j = v.indexOf(e0, b);
  if (j < 0 || j - b > 6000) throw new Error("point 59 end");
  v = v.slice(0, j + e0.length) + rd("point60.md") + v.slice(j + e0.length); }
fs.writeFileSync(REPO + "/docs/VODACOM-PLAN.md", crlf(v));
// 8 · NEXT-PLAN row
let n = lf(fs.readFileSync(REPO + "/docs/NEXT-PLAN.md", "utf8"));
{ const o = "next A8j (⏳ IN FLIGHT on OMEGA-COMPILE01, VODACOM-PLAN §0; Enter skips the withdraw confirm), then WP12";
  once(n, o, "next-plan");
  n = n.replace(o, "A8j (Enter in a form never skips its confirm) LIVE `88fb1f41` 2026-10-07; next the close-out's three owed items and A8j's WebKit runs (⏳ IN FLIGHT on OMEGA-COMPILE01, VODACOM-PLAN §0), then WP12"); }
fs.writeFileSync(REPO + "/docs/NEXT-PLAN.md", crlf(n));
console.log("applied 8");
