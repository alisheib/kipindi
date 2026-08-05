/**
 * E-105 DRIVEN LIVE — a real two-sided round, real money, and a photograph of the win popup.
 *
 *   node scripts/live-s30-win-moment.mjs <roundId> [upNN] [downNN] [stake]
 *   SHOT_DIR=shots/E105 node scripts/live-s30-win-moment.mjs udr_xxx 07 08 2000
 *
 * ⭐ WHY IT NEEDS TWO PLAYERS ON OPPOSITE SIDES. A one-sided pool REFUNDS — nobody took the
 * other side, so there is nothing to win and nothing to lose (E-65). Session 27's whole drive
 * ran on two players and 10 of 17 rounds took no bets at all; you cannot photograph a WIN
 * without a counterparty. So this stakes UP as one fleet player and DOWN as another, then holds
 * BOTH browsers open across the boundary.
 *
 * ⛔ THE BROWSERS MUST STAY OPEN, AND THAT IS THE ENTIRE TEST. The announcer fires on an
 * OBSERVED prop transition — unsettled → settled — delivered by the RefreshPoller's
 * `router.refresh()`, which re-renders the server tree WITHOUT remounting client children. A
 * probe that opens the page after settlement photographs nothing and would report the feature
 * missing, which is the mirror of the "probe that reloads and reads in the same tick" trap.
 *
 * ⛔ AND IT IS SCOPED, NOT `bodyText()`. Session 30's E-64 driver asserted a toast with
 * `bodyText()` and matched the permanent `aria-live` line instead — six checks that could not
 * fail. Every assertion here is against the celebration MODAL or the toast REGION, and §1 takes
 * a CONTROL reading before the boundary so a selector matching something permanent is caught.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, SHOT, login, browser, recorder } from "./live/harness.mjs";

const [ROUND, UP_NN = "07", DOWN_NN = "08", STAKE_ARG = "2000"] = process.argv.slice(2);
const STAKE = Number(STAKE_ARG);
if (!ROUND) { console.error("usage: node scripts/live-s30-win-moment.mjs <roundId> [upNN] [downNN] [stake]"); process.exit(2); }
mkdirSync(SHOT, { recursive: true });

const UP = /^(Up|Juu|涨)\s*[—-]/;
const DOWN = /^(Down|Chini|跌)\s*[—-]/;
const CUSTOM = /^(Custom|Maalum|自定义)$/;
const CUSTOM_AMOUNT = /custom stake amount|kiasi maalum cha dau|自定义投注额/i;
/**
 * ⛔ ASK FOR THE ELEMENT BY WHAT IT **IS**, NOT BY A PHRASE YOU EXPECT IT TO CONTAIN.
 *
 * The first version of this driver hunted the celebration with `/you won|won ·/i` and reported
 * **"nothing fired"** over a round whose winner was paid TZS 3,480 in the database — because the
 * modal actually renders `Position won` / **`Won!`** / `Congratulations`, and `"Won! ·"` does not
 * match `"won ·"`. **A guessed phrase turned a working feature into a filed defect**, which is
 * this campaign's single most repeated failure.
 *
 * So the celebration is now identified STRUCTURALLY — it is the only `role="dialog"` this flow
 * can raise — and its text is READ AFTERWARDS rather than used to find it. The loss/refund is
 * the toast region. Anything unexpected is printed in full so a miss is diagnosable instead of
 * silent.
 */
const CELEBRATION_COPY = /position won|won!|umeshinda|hongera|持仓获胜|赢了|congratulations/i;
const LOSS_OR_VOID = /round lost|umeshindwa raundi|本轮失利|stake returned|dau limerudishwa|投注已退还/i;

const rec = recorder(`E-105 · the result moment on ${ROUND} — fleet:${UP_NN} UP vs fleet:${DOWN_NN} DOWN, ${STAKE} each`);

async function stake(page, nn, side) {
  await page.goto(`${BASE}/updown/${ROUND}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /\$\s?\d[\d,]*\.\d\d/.test(document.body.innerText), undefined, { timeout: 60_000 });
  await page.getByRole("radio", { name: CUSTOM }).first().click();
  const field = page.getByLabel(CUSTOM_AMOUNT).first();
  await field.waitFor({ state: "visible", timeout: 15_000 });
  await field.fill(String(STAKE));
  const btn = page.getByRole("button", { name: side === "UP" ? UP : DOWN }).first();
  await btn.waitFor({ state: "visible", timeout: 15_000 });
  const label = (await btn.getAttribute("aria-label")) ?? "";
  // ⛔ Never press a control that is not armed and then report "placed".
  if (!new RegExp(STAKE.toLocaleString("en-US")).test(label)) throw new Error(`fleet:${nn} ${side} control not armed: "${label}"`);
  await btn.click();
  const ok = await page.waitForFunction(() => /you're in|uko ndani|已下注/i.test(document.body.innerText),
    undefined, { timeout: 30_000 }).then(() => true).catch(() => false);
  rec.check(`1.${nn} fleet:${nn} staked ${STAKE} ${side}`, ok, label.slice(0, 70));
  return ok;
}

const { b } = await browser();
const out = { round: ROUND, stake: STAKE, fired: {}, shots: [] };
try {
  // Separate CONTEXTS — a shared context keeps the previous persona signed in, and this
  // platform enforces a durable single session, so two personas need two contexts.
  const upCtx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const downCtx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const upPage = await upCtx.newPage();
  const downPage = await downCtx.newPage();
  await login(upPage, `fleet:${UP_NN}`);
  await login(downPage, `fleet:${DOWN_NN}`);

  await stake(upPage, UP_NN, "UP");
  await stake(downPage, DOWN_NN, "DOWN");

  // ── §2 CONTROL — before the boundary, NEITHER surface may be showing a result ──
  // Without this, "the popup appeared" cannot be told from "a selector matches something
  // permanent". It is the check the E-64 driver did not have, and its absence cost six checks.
  for (const [nn, page] of [[UP_NN, upPage], [DOWN_NN, downPage]]) {
    const dialogs = await page.locator('[role="dialog"]').count();
    const toasts = await page.locator('[role="region"]').filter({ hasText: LOSS_OR_VOID }).count();
    rec.check(`2.${nn} ⭐ CONTROL — fleet:${nn} shows NO result popup before the boundary`,
      dialogs === 0 && toasts === 0, `dialogs=${dialogs} toasts=${toasts}`);
  }

  // ── §3 HOLD BOTH PAGES OPEN ACROSS THE BOUNDARY AND WATCH ──
  // Poll our OWN selectors every 2s. We never reload — a reload would remount the client tree
  // and destroy the very transition under test.
  const deadline = Date.now() + 11 * 60_000;
  const seen = {};
  console.log(`\n   holding both pages open, watching for the result moment (up to 11 min)…`);
  while (Date.now() < deadline && Object.keys(seen).length < 2) {
    for (const [nn, page] of [[UP_NN, upPage], [DOWN_NN, downPage]]) {
      if (seen[nn]) continue;
      // ⛔ STRUCTURAL, NOT PHRASAL. Any dialog raised on this page during this window IS the
      // celebration — nothing else opens one here. Its wording is read afterwards and checked,
      // rather than being the thing that finds it. See the note on CELEBRATION_COPY.
      const dialog = page.locator('[role="dialog"]');
      const toast = page.locator('[role="region"]').filter({ hasText: LOSS_OR_VOID });
      const kind = (await dialog.count()) ? "WIN-CELEBRATION" : (await toast.count()) ? "LOSS-OR-REFUND-TOAST" : null;
      if (!kind) continue;
      seen[nn] = kind;
      const el = kind === "WIN-CELEBRATION" ? dialog.first() : toast.first();
      const text = (await el.innerText()).replace(/\s+/g, " ").trim();
      if (kind === "WIN-CELEBRATION") {
        rec.check(`3.${nn}-copy the celebration says it is a WIN, in this locale`,
          CELEBRATION_COPY.test(text), `"${text.slice(0, 120)}"`);
      }
      const shot = `${SHOT}/e105-fleet${nn}-${kind}.png`;
      await page.screenshot({ path: shot });                       // ⛔ VIEWPORT, never fullPage
      await el.screenshot({ path: `${SHOT}/e105-fleet${nn}-cropped.png` }).catch(() => {});
      out.shots.push(shot, `${SHOT}/e105-fleet${nn}-cropped.png`);
      out.fired[nn] = { kind, text };
      console.log(`   🎉 fleet:${nn} → ${kind}  "${text.slice(0, 90)}"`);
      rec.check(`3.${nn} fleet:${nn} received a result moment WITHOUT reloading`, true, kind);
    }
    await upPage.waitForTimeout(2000);
  }
  for (const nn of [UP_NN, DOWN_NN]) if (!seen[nn]) rec.check(`3.${nn} fleet:${nn} received a result moment`, false, "nothing fired before the deadline");

  // ── §4 EXACTLY ONE SIDE MAY CELEBRATE ──
  const kinds = Object.values(out.fired).map((f) => f.kind);
  rec.check("4.1 exactly one player saw the WIN celebration (a pool has one winning side)",
    kinds.filter((k) => k === "WIN-CELEBRATION").length === 1, JSON.stringify(out.fired));
  rec.check("4.2 …and the other was told plainly, not celebrated at",
    kinds.filter((k) => k === "LOSS-OR-REFUND-TOAST").length === 1, JSON.stringify(kinds));
} finally {
  writeFileSync(`${SHOT}/e105-run.json`, JSON.stringify(out, null, 1));
  await b.close();
}

const failed = rec.done();
console.log(`\nshots → ${out.shots.join("\n         ")}`);
console.log(`\n⛔ NOW PAIR IT WITH THE DATABASE — a popup is not proof money moved:`);
console.log(`   railway run --service 50pick -- node .qa-s30/round-watch.cjs ${ROUND}\n`);
process.exit(failed ? 1 : 0);
