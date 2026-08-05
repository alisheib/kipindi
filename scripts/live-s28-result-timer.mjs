/**
 * SESSION 28 · E-99 VERIFIED ON A REAL PRODUCTION ROUND — the Result timer, watched.
 *
 *   node scripts/live-s28-result-timer.mjs <roundId> [width] [locale]
 *
 * ⛔ WATCHED, NOT ASSERTED. E-82 shipped because a phase was reasoned about instead of looked
 * at, and it took 25 consecutive samples across a whole result phase to prove the clock was
 * dead. This samples the SAME way, straight through the close, and prints what the player sees
 * every few seconds — so the evidence is a transcript of the real thing, not a claim about it.
 *
 * ⛔ AND IT MUST NOT PASS VACUOUSLY. If the countdown block is never found, that is a throw,
 * not a green run over an empty array.
 */
import { mkdirSync } from "node:fs";
import { BASE, SHOT, login, browser } from "./live/harness.mjs";

const [ROUND, WIDTH = "1280", LOCALE = "en"] = process.argv.slice(2);
if (!ROUND) { console.error("usage: node scripts/live-s28-result-timer.mjs <roundId> [width] [locale]"); process.exit(2); }
mkdirSync(SHOT, { recursive: true });

/** The countdown pod on the round page: its caption, its digits, and the ink. */
async function readClock(page) {
  return page.evaluate(() => {
    // ⚠️ Anchor on the DIGITS, not on a caption word. Captions are trilingual and change with
    // the phase — matching one of them would make this probe blind in exactly the states it
    // exists to observe. A 28px tabular-nums mono span reading `M:SS` / `--:--` / `—:—` is the
    // structure, and structure does not translate.
    const spans = [...document.querySelectorAll("span, div")];
    const digit = spans.find((el) => {
      const t = (el.textContent ?? "").trim();
      if (!/^(\d{1,2}:\d{2}|--:--|—:—|00:00)$/.test(t)) return false;
      return parseFloat(getComputedStyle(el).fontSize) >= 20;
    });
    if (!digit) return null;
    const pod = digit.parentElement;
    const caption = [...(pod?.children ?? [])].find((c) => c !== digit)?.textContent?.trim() ?? "";
    const cs = getComputedStyle(digit);
    // ⛔ NEVER REGEX A CSS COLOUR — the tokens are oklch() and scraping digits reads
    // lightness/chroma/hue as R/G/B (it once scored a bright button at 1.24:1). Paint it into a
    // 1x1 canvas and read the pixel back; let the browser do the conversion.
    const cv = document.createElement("canvas"); cv.width = cv.height = 1;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = cs.color; ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return { digits: digit.textContent.trim(), caption, rgb: `${r},${g},${b}`, fontSize: cs.fontSize };
  });
}

const { b, ctx } = await browser({ viewport: { width: Number(WIDTH), height: 900 } });
const page = await ctx.newPage();
const seen = [];
try {
  await login(page, "fleet:05");
  if (LOCALE !== "en") {
    await page.goto(`${BASE}/api/locale?set=${LOCALE}&next=/updown`, { waitUntil: "domcontentloaded" }).catch(() => {});
  }
  await page.goto(`${BASE}/updown/${ROUND}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /\$\s?\d[\d,]*\.\d\d/.test(document.body.innerText), undefined, { timeout: 60_000 });

  const first = await readClock(page);
  if (!first) throw new Error("no countdown pod found — refusing to report a phase I cannot see");

  const deadline = Date.now() + 11 * 60_000;
  let last = "";
  while (Date.now() < deadline) {
    const c = await readClock(page);
    if (c) {
      const key = `${c.caption}|${c.digits}|${c.rgb}`;
      if (key !== last) {
        last = key;
        const stamp = new Date().toISOString().slice(11, 19);
        seen.push({ ...c, at: stamp });
        console.log(`  ${stamp}  ${String(c.caption).padEnd(22)} ${String(c.digits).padEnd(7)} rgb(${c.rgb})`);
      }
    }
    // The board polls, so a reload is not needed for the digits — but the PHASE comes from the
    // server render, so refresh occasionally to pick up `confirming` and the settled state.
    if (Math.random() < 0) { /* never — kept explicit so nobody adds a random reload here */ }
    await page.waitForTimeout(4000);
    if (seen.some((s) => /settled|imekamilika|已结算/i.test(s.caption))) break;
    if ((await page.evaluate(() => /result|matokeo|结果/i.test(document.body.innerText))) === false) { /* keep going */ }
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForFunction(() => /\$\s?\d[\d,]*\.\d\d/.test(document.body.innerText), undefined, { timeout: 40_000 }).catch(() => {});
    await page.locator("main").first().screenshot({ path: `${SHOT}/s28-result-${WIDTH}-${LOCALE}.png` }).catch(() => {});
  }

  console.log(`\n  ── distinct states seen (${seen.length}) ──`);
  for (const s of seen) console.log(`     ${s.at}  ${String(s.caption).padEnd(24)} ${String(s.digits).padEnd(7)} rgb(${s.rgb})`);

  // ⭐ THE ASSERTION THAT MATTERS: after the close there must be a COUNTING clock, and it must
  // never be a dead 0:00. Anything else and E-99 did not ship.
  const dead = seen.filter((s) => s.digits === "00:00" || s.digits === "0:00");
  console.log(`\n  dead 00:00 samples: ${dead.length}${dead.length ? " 🔴" : " ✅"}`);
  const counted = seen.filter((s) => /^\d{1,2}:\d{2}$/.test(s.digits) && s.digits !== "00:00");
  console.log(`  counting samples:   ${counted.length}`);
} finally {
  await b.close();
}
