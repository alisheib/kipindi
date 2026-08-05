/**
 * E-102 LIVE — sit on a round page and DO NOT TOUCH IT.
 *
 *   node scripts/live-s29-autorefresh.mjs <roundId> [minutes]
 *
 * ⛔ THE WHOLE CLAIM IS "THE PLAYER DOES NOTHING". So this run must not reload, not navigate,
 * not click, and not dispatch the kit's `50pick:refresh` event. If the result appears, the page
 * put it there. Anything the harness does to help is the harness proving itself.
 *
 * ⛔ AND IT MUST NOT PASS VACUOUSLY. A round that is already settled when the page opens proves
 * nothing — the run refuses to start unless it catches the round still live, and refuses to
 * report success unless it saw the transition with its own eyes.
 *
 * What it watches: the countdown pod's caption + digits and the presence of a settlement proof.
 * Sampled from the DOM every 2s, never re-fetched.
 */
import { mkdirSync } from "node:fs";
import { BASE, SHOT, login, browser, recorder } from "./live/harness.mjs";

const [ROUND, MINUTES = "12"] = process.argv.slice(2);
if (!ROUND) { console.error("usage: node scripts/live-s29-autorefresh.mjs <roundId> [minutes]"); process.exit(2); }
mkdirSync(SHOT, { recursive: true });

const r = recorder("E-102 · the round page refreshes itself, driven on production");
const { b, ctx } = await browser({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

/** Caption + digits from the countdown pod, and whether the settlement proof has appeared. */
const read = () => page.evaluate(() => {
  const spans = [...document.querySelectorAll("span, div")];
  const digit = spans.find((el) => {
    const t = (el.textContent ?? "").trim();
    if (!/^(\d{1,2}:\d{2}|--:--|—:—|00:00)$/.test(t)) return false;
    return parseFloat(getComputedStyle(el).fontSize) >= 20;
  });
  const pod = digit?.parentElement;
  const caption = [...(pod?.children ?? [])].find((c) => c !== digit)?.textContent?.trim() ?? "";
  const body = document.body.innerText;
  return {
    digits: digit?.textContent?.trim() ?? "(no pod)",
    caption,
    // The settlement proof only renders once the round has an outcome — it is the strongest
    // "the result arrived" signal on this page, and it is server-rendered, so its appearance
    // means the tree was re-fetched.
    proof: /settlement proof|uthibitisho|结算证明/i.test(body),
    settled: /round settled|raundi imekamilika|回合已结算/i.test(body),
  };
});

try {
  await login(page, "fleet:05");
  await page.goto(`${BASE}/updown/${ROUND}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /\$\s?\d[\d,]*\.\d\d/.test(document.body.innerText), undefined, { timeout: 60_000 });

  const first = await read();
  console.log(`  opened at  ${new Date().toISOString().slice(11, 19)}  ${first.caption} ${first.digits}  proof=${first.proof}`);
  // ⛔ REFUSE A VACUOUS RUN.
  if (first.proof || first.settled) {
    console.error("🔴 the round was ALREADY settled when the page opened — this proves nothing about auto-refresh");
    process.exit(2);
  }
  r.check("the round is still live when the page opens (so the transition is observable)",
    !first.proof && !first.settled, `${first.caption} ${first.digits}`);

  const deadline = Date.now() + Number(MINUTES) * 60_000;
  const seen = [];
  let last = "", arrived = null;
  while (Date.now() < deadline) {
    const c = await read();
    const key = `${c.caption}|${c.digits}|${c.proof}`;
    if (key !== last) {
      last = key;
      const at = new Date().toISOString().slice(11, 19);
      seen.push({ ...c, at });
      console.log(`  ${at}  ${String(c.caption).padEnd(24)} ${String(c.digits).padEnd(7)} proof=${c.proof}`);
    }
    if (c.proof && !arrived) { arrived = c; break; }
    // ⛔ NOTHING HERE MAY TOUCH THE PAGE. No reload, no click, no event dispatch.
    await page.waitForTimeout(2000);
  }

  r.check("⭐⭐ the RESULT ARRIVED with the player doing nothing at all — no reload, no click",
    arrived != null, `no settlement proof within ${MINUTES} minutes`);
  if (arrived) {
    // The caption must also have moved on — a proof rendered under a stale "Result in" clock
    // would mean half the tree refreshed.
    r.check("…and the countdown pod moved with it, so the whole tree refreshed",
      /settled|imekamilika|已结算/i.test(arrived.caption), `caption still reads "${arrived.caption}"`);
  }
  const dead = seen.filter((s) => s.digits === "00:00" && !/settled|imekamilika|已结算/i.test(s.caption));
  r.check("no dead 00:00 under a non-settled caption at any point (E-99 holds)",
    dead.length === 0, `${dead.length} sample(s)`);

  await page.screenshot({ path: `${SHOT}/s29-e102-arrived.png` }).catch(() => {});
  r.note(`shot → ${SHOT}/s29-e102-arrived.png · ${seen.length} distinct states`);
} finally {
  await b.close();
}

process.exit(r.done() ? 1 : 0);
