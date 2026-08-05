/**
 * THE UNHAPPY PATHS, DRIVEN ON PRODUCTION WITH REAL MONEY, IN EN / SW / ZH.
 *
 *   node scripts/live-updown-unhappy.mjs stake  <chainLabel>   # generate + stake ONE side
 *   node scripts/live-updown-unhappy.mjs void   <chainLabel>   # operator-void the live round
 *   node scripts/live-updown-unhappy.mjs verify <roundId>      # every surface, every language
 *
 * ⛔ WHY THIS IS SPLIT INTO THREE COMMANDS. A round takes minutes to settle, and a browser held
 * open across that wait is a browser whose session, sockets and clock have all drifted by the
 * time it measures anything. Each command opens, does one thing against a positive signal, and
 * closes; the settlement in between is read from the database.
 *
 * ⭐ WHAT IS BEING PROVEN (E-65). A refund must state its REAL reason on every surface, and the
 * one-sided case is the one that has never been driven live: the round DECIDES — outcome UP or
 * DOWN, `voidReason` null — and the player is refunded anyway because nobody took the other
 * side. Any surface that reads `voidReason` first finds null and prints a void's copy, which is
 * how a player was once shown "VOID · REFUNDED" beside a rule saying they had lost.
 *
 * ⚠️ Traps already paid for and encoded here: land on `/updown` with NO query string (one hid a
 * bug for a whole campaign) · the stake buttons carry `aria-label` "<Up|Down> — <asset> · TZS n"
 * · the locale is the `kp-locale` cookie, and it must be set BEFORE the page loads or the first
 * paint is English · never reason about time from this laptop's clock.
 */
import { browser, login, recorder, BASE, SHOT, bodyText, clickByName } from "./live/harness.mjs";

const MODE = process.argv[2] ?? "verify";
const ARG = process.argv[3] ?? "";
const rec = recorder(`LIVE · unhappy path — ${MODE} ${ARG}`);

const LOCALES = [
  { code: "en", label: "English" },
  { code: "sw", label: "Kiswahili" },
  { code: "zh", label: "中文" },
];

const { b, ctx } = await browser({ viewport: { width: 1440, height: 1100 } });

// ⛔ ONE CONTEXT PER PERSONA. Signing in as the admin and then as a player in the SAME context
// reuses the admin's session cookie, so `/auth/login` redirects straight into the app and the
// sign-in field never renders — which surfaces as `waiting for locator('#identifier')` and
// reads exactly like a broken login page on a page that is fine.
const asPersona = async (who) => {
  const c = await b.newContext({ viewport: { width: 1440, height: 1100 } });
  const p = await c.newPage();
  await login(p, who);
  return { c, p };
};

try {
  if (MODE === "stake") {
    // ⭐ NO GENERATE STEP. Both BTC chains are RUNNING, so rounds arrive on their own — and the
    // first version of this driver "confirmed" a generate by looking for `/open|closes|live/`
    // in the row, which the market column already says. It would have passed whether or not a
    // round existed: a check that cannot fail is not a check.
    const { c, p } = await asPersona("alpha");
    // ⛔ NO QUERY STRING. A `?` on this URL hid a bug for an entire campaign.
    // ⚠️ `domcontentloaded`, NOT `networkidle`. This board polls for live prices and countdowns,
    // so the network never goes idle and `networkidle` times out after 30s — on a page that has
    // been fully rendered and interactive the whole time. Wait for the CONTROL instead.
    await p.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded" });
    const upBtn = p.getByRole("button", { name: /^up — .*·/i }).first();
    await upBtn.waitFor({ state: "visible", timeout: 30_000 });
    const label = await upBtn.getAttribute("aria-label");
    rec.note(`staking via: ${label}`);
    await upBtn.click();
    const placed = await p.waitForFunction(
      () => /you'?re in|umeweka|您已投注/i.test(document.body.innerText),
      undefined, { timeout: 30_000 },
    ).then(() => true).catch(() => false);
    rec.check("⭐ the stake is placed, and the card says so", placed, (await bodyText(p)).slice(0, 200));
    await p.screenshot({ path: `${SHOT}/unhappy-staked.png` }).catch(() => {});
    await c.close();
  }

  if (MODE === "void") {
    const { c, p: admin } = await asPersona("admin");
    await admin.goto(`${BASE}/admin/updown/rounds`, { waitUntil: "networkidle" });
    const row = admin.locator("tr").filter({ hasText: ARG }).first();
    await row.waitFor({ state: "visible", timeout: 20_000 });
    // ⚠️ THE CONTROL IS "Void & refund", AND ITS MODAL IS role="alertdialog", NOT "dialog".
    // Scoping to [role=dialog] found nothing, so the reason field looked absent and the confirm
    // was never clicked — while the row still contained the word "Void" (it is the BUTTON's own
    // label), so a check for /void/i in the row PASSED on a round that had not been touched.
    // That is the same lying-check shape as matching a table column by a word the prose also
    // contains: assert the OUTCOME, never a word the control itself supplies.
    await row.getByRole("button", { name: /void.{0,3}refund/i }).first().click();
    const dialog = admin.locator('[role="alertdialog"], [role="dialog"]').first();
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    // ⛔ A VOID MUST CARRY A REASON — that is the whole point of the operator path.
    const reason = dialog.locator("textarea, input[type=text]").first();
    rec.check("the void asks for a reason before it will proceed", (await reason.count()) > 0);
    await reason.fill("Supervised production test of the refund paths (QA session 27) — every stake returned in full.");
    await dialog.getByRole("button", { name: /void|confirm|refund/i }).last().click();
    // ⛔ A POSITIVE SIGNAL THE CONTROL CANNOT SUPPLY: the Remedy cell turns into a dash once the
    // round is settled, and the outcome column says VOID. Wait for the row to STOP offering the
    // button rather than for a word the button itself prints.
    const voided = await admin.waitForFunction(
      (label) => {
        const tr = [...document.querySelectorAll("tr")].find((r) => r.innerText.includes(label));
        return !!tr && !/void.{0,3}refund/i.test(tr.innerText);
      },
      ARG, { timeout: 60_000 },
    ).then(() => true).catch(() => false);
    rec.check("⭐ the round is voided — the Remedy control is gone, not merely re-rendered", voided,
      (await admin.locator("tr").filter({ hasText: ARG }).first().innerText().catch(() => "")).replace(/s+/g, " ").slice(0, 120));
    await admin.screenshot({ path: `${SHOT}/unhappy-voided.png` }).catch(() => {});
    await c.close();
  }

  if (MODE === "verify") {
    // ── 3 · EVERY SURFACE, EVERY LANGUAGE ───────────────────────────────────
    //
    // ⛔ The locale cookie is set on the CONTEXT before the page opens. Setting it after load
    // and reloading measures a hydration path the player never takes, and the first paint —
    // which is what a player actually sees — would still be English.
    for (const loc of LOCALES) {
      await ctx.addCookies([{ name: "kp-locale", value: loc.code, url: BASE }]);
      const p = await ctx.newPage();
      if (loc.code === "en") await login(p, "alpha");     // one session, reused across locales
      await p.goto(`${BASE}/updown/${ARG}`, { waitUntil: "domcontentloaded" });
      // 🔴 WAIT FOR CONTENT, NOT FOR A LOAD EVENT. This page server-renders a skeleton and
      // streams the round in, so `domcontentloaded` (and even `load`) returns while every card
      // is still an empty placeholder — and reading the text there reports "no refund reason on
      // the page" about a page that has not rendered one yet. `networkidle` is not the answer
      // either: the board polls, so it never goes idle. Wait for the ROUND'S OWN NUMBERS.
      // ⚠️ ANCHORED ON THE SETTLEMENT PROOF, which only renders once the round is decided —
      // not on a digit-and-length heuristic, which the chrome and the ticker satisfy on their
      // own and which therefore reported "not rendered" on pages that plainly were.
      const rendered = await p.waitForFunction(
        () => /settlement proof|uthibitisho wa malipo|结算凭证/i.test(document.body.innerText),
        undefined, { timeout: 45_000 },
      ).then(() => true).catch(() => false);
      rec.check(`${loc.label} · the round page rendered its settlement proof before it was read`, rendered);
      const t = await bodyText(p);

      // The sentence itself, per language, from the dictionary this feature ships.
      const EXPECT = {
        en: [/nobody backed the other side/, /price did not move far enough/, /cancelled by our team/, /could not confirm a closing price/],
        sw: [/hakuna aliyeweka dau upande mwingine/, /bei haikusogea vya kutosha/, /ilifutwa na timu yetu/, /hatukuweza kuthibitisha bei/],
        zh: [/没有人投注另一方/, /价格向任一方向的变动都不足以/, /本轮已由我们的团队取消/, /我们无法确认本轮的收盘价/],
      }[loc.code];
      const matched = EXPECT.filter((re) => re.test(t));
      rec.check(`${loc.label} · ⭐ the round page states a REAL refund reason`,
        matched.length === 1, matched.length === 0 ? "no reason sentence at all" : `${matched.length} reasons at once`);

      // ⛔ E-65 EXACTLY: a decided round must never be dressed as a void, and the player must
      // never be told they lost on a round whose money came back in full.
      rec.check(`${loc.label} · ⛔ a refunded stake is never also called a loss`,
        !/(you lost|umepoteza|您输了)/.test(t));
      rec.check(`${loc.label} · the page is in the language asked for, not English`,
        loc.code === "en" || !/nobody backed the other side/.test(t) || false,
        loc.code === "en" ? "" : "English copy leaked into a translated page");

      // ⭐ E-87 · THE CHIP MUST NOT CONTRADICT THE PROOF BESIDE IT. A round that reached a
      // verdict and refunded this player for want of a counterparty is NOT a void, and the
      // label above the payout must not say it is while the proof panel below says "OUTCOME Up".
      const decidedAndRefunded = /nobody backed the other side|hakuna aliyeweka dau upande mwingine|没有人投注另一方/.test(t);
      const claimsVoid = /(void · refunded|batili · imerudishwa|作废 · 已退款)/.test(t);
      rec.check(`${loc.label} · ⭐ E-87 · a DECIDED round is never labelled a void`,
        !decidedAndRefunded || !claimsVoid,
        decidedAndRefunded && claimsVoid ? "the chip says void while the proof says it decided" : "");

      await p.screenshot({ path: `${SHOT}/unhappy-round-${loc.code}.png` }).catch(() => {});

      // The settlement proof — the panel a player checks the maths against.
      const proof = p.locator("text=/settlement|malipo|结算/i").first();
      rec.check(`${loc.label} · the settlement proof is on the page`, (await proof.count()) > 0);

      // The inbox — the same reason, reached the same player, in the same language.
      await p.goto(`${BASE}/inbox`, { waitUntil: "domcontentloaded" });
      await p.waitForFunction(() => document.body.innerText.length > 600, undefined, { timeout: 30_000 }).catch(() => {});
      const inbox = await bodyText(p);
      // ⛔ THE INBOX IS *SUPPOSED* TO BE QUIET HERE, and asserting otherwise was measuring my
      // own assumption. `comms-registry` is explicit: **ROUND_RESULT is the Up & Down DAILY
      // DIGEST, and it is the only message a player gets per round** — per-round inbox entries
      // were deliberately suppressed (E-37, Ali's decision) so a busy chain cannot spam a
      // player forty times an hour. Confirmed against the live database: alpha has NO
      // notification row for a round that settled minutes ago, which is correct.
      //
      // So the check is the DESIGN, not the wish: a per-round result must NOT appear, and the
      // reason still has to reach the player — on the round page, the proof, and the digest.
      rec.check(`${loc.label} · ⭐ the inbox does NOT spam a per-round entry (E-37 — the digest carries it)`,
        !/round result|matokeo ya raundi|本轮结果/i.test(inbox),
        inbox.slice(0, 160));
      await p.screenshot({ path: `${SHOT}/unhappy-inbox-${loc.code}.png` }).catch(() => {});
      await p.close();
    }
  }
} catch (e) {
  rec.check("driver completed", false, e.message);
} finally {
  await b.close();
}

process.exit(rec.done() === 0 ? 0 : 1);
