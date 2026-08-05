/**
 * E-99 · READ THE PROP, DO NOT INFER IT FROM THE RENDERING.
 *
 *   node scripts/s29-e99-prop.cjs <roundId> [pollSeconds] [minutes]
 *
 * 🔴 WHY THIS EXISTS. Session 28 watched a real round straight through its close and saw
 * `Result in —:—` for 42 seconds where the arithmetic says the pod should have counted ≈1:33.
 * It then concluded, from the rendering, that `expectedResultAtMs` "was present and had ALREADY
 * PASSED". ⛔ That is the derived-values trap: the screen cannot tell a target that has passed
 * from a target that was never there, and reasoning about which one it was is exactly what E-82
 * shipped by doing.
 *
 * ⭐ THE PROPS ARE IN THE RSC PAYLOAD, so we can read the server's own numbers. The round page
 * passes `resultTarget` into `RoundCountdownPod` as `closesAtMs` and sets `resultMode` from
 * `resultTarget != null`, so the Flight chunk carries, per render:
 *
 *      resultMode false → the page is NOT in the result phase (or has no measured target)
 *      resultMode true  → resultTarget != null, and `closesAtMs` IS `expectedResultAtMs`
 *
 * `serverNowMs` comes from the same render, so `closesAtMs - serverNowMs` is precisely the
 * number the pod's `useCountdown` will compute — no device clock involved, which matters on a
 * laptop that is 93 seconds slow (E-81).
 *
 * ⛔ IT MUST NOT PASS VACUOUSLY. A render whose payload has no pod props is a THROW, not a
 * silent skip — a probe that reports nothing while finding nothing is the shape of every
 * check-that-lies in this campaign.
 */
const ROUND = process.argv[2];
const POLL_S = Number(process.argv[3] || 3);
const MINUTES = Number(process.argv[4] || 20);
if (!ROUND) { console.error("usage: node scripts/s29-e99-prop.cjs <roundId> [pollSeconds] [minutes]"); process.exit(2); }

const BASE = process.env.QA_BASE || "https://50pick.tz";
const iso = (ms) => new Date(ms).toISOString().slice(11, 19);

/** Pull the LAST RoundCountdownPod prop object out of the Flight payload.
 *
 * ⛔ ORDER-INDEPENDENT ON PURPOSE. The first version of this pinned the five props in the order
 * the JSX happens to list them and silently fell through to a degraded path the moment the real
 * payload turned out to be `closesAtMs · isOpen · serverNowMs · label · resultMode`. Prop order
 * is not a contract; the OBJECT is. So: find the object, then read each key inside it. */
function readPod(html) {
  // The chunk is JSON inside a JS string literal, so every quote arrives escaped as \" .
  // `resultMode` is unique to this component, which is what makes it a safe anchor — and the
  // window is bounded backwards to the nearest `closesAtMs` so it cannot swallow a sibling.
  const re = /\{\\?"closesAtMs\\?":[\s\S]{0,400}?\\?"resultMode\\?":(?:true|false)\}/g;
  let m, last = null;
  while ((m = re.exec(html))) last = m[0];
  if (!last) return null;
  const num = (k) => { const x = new RegExp(`\\\\?"${k}\\\\?":(\\d+)`).exec(last); return x ? +x[1] : null; };
  const bool = (k) => { const x = new RegExp(`\\\\?"${k}\\\\?":(true|false)`).exec(last); return x ? x[1] === "true" : null; };
  const lbl = /\\?"label\\?":\\?"((?:[^"\\]|\\u[0-9a-fA-F]{4}|\\.)*?)\\?"/.exec(last);
  const closesAtMs = num("closesAtMs"), serverNowMs = num("serverNowMs"), resultMode = bool("resultMode");
  // A pod we can only half-read is a pod we cannot report on.
  if (closesAtMs == null || serverNowMs == null || resultMode == null) return null;
  return {
    closesAtMs, serverNowMs, resultMode, isOpen: bool("isOpen"),
    label: lbl ? lbl[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) : "(no label)",
  };
}

(async () => {
  const deadline = Date.now() + MINUTES * 60_000;
  let last = "", samples = 0, podsFound = 0;
  const seen = [];
  console.log(`watching ${BASE}/updown/${ROUND} · every ${POLL_S}s for ${MINUTES}m\n`);
  console.log("  serverNow  resultMode  target(closesAtMs)  left(s)  label");

  while (Date.now() < deadline) {
    samples++;
    let html = null;
    try {
      const res = await fetch(`${BASE}/updown/${ROUND}`, { cache: "no-store", headers: { "cache-control": "no-cache" } });
      html = await res.text();
    } catch { /* a transient network error must not kill the watch */ }
    if (html) {
      const p = readPod(html);
      if (p) {
        podsFound++;
        const left = Math.round((p.closesAtMs - p.serverNowMs) / 1000);
        const key = `${p.resultMode}|${p.closesAtMs}|${p.label}`;
        // Print every sample while in the result phase (that is the evidence), otherwise only
        // on change — an open round is 15 minutes of identical lines.
        if (p.resultMode || key !== last) {
          last = key;
          seen.push({ ...p, left });
          console.log(`  ${iso(p.serverNowMs)}   ${String(p.resultMode).padEnd(9)}  ${iso(p.closesAtMs)}          ${String(left).padStart(5)}   ${p.label}`);
        }
      }
    }
    await new Promise((r) => setTimeout(r, POLL_S * 1000));
  }

  // ⛔ REFUSE TO REPORT A GREEN OVER AN EMPTY ARRAY.
  if (podsFound === 0) { console.error(`\n🔴 ${samples} fetches, 0 countdown pods found — refusing to report on a page I could not read`); process.exit(1); }

  const inResult = seen.filter((s) => s.resultMode);
  console.log(`\n── ${samples} fetches · ${podsFound} pods read · ${inResult.length} of them in RESULT MODE ──`);
  if (!inResult.length) { console.log("   the round never entered the result phase during the watch"); return; }
  const counting = inResult.filter((s) => s.left > 0);
  console.log(`   result-mode samples with a FUTURE target (the counting branch): ${counting.length}`);
  console.log(`   result-mode samples with a PASSED target (the overrun branch):  ${inResult.length - counting.length}`);
  const t = inResult[0];
  console.log(`   first result-mode target ${new Date(t.closesAtMs).toISOString()} · server ${new Date(t.serverNowMs).toISOString()} · left ${t.left}s`);
})();
