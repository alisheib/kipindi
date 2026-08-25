/**
 * E-214 — PROVE THE SIX QA PERSONAS OPEN THE FRONT DOOR, ON PRODUCTION.
 *
 *   npm run qa:personas
 *
 * ⭐ WHY THIS EXISTS, AND WHY THE OBVIOUS VERSION OF IT IS WORTHLESS.
 * `ops-remint-qa-passwords.mts` already re-reads every row and verifies the new secret
 * against the STORED hash before printing it. That is a real check and it is not the one
 * that matters: it proves the database agrees with itself. It cannot prove that the login
 * PAGE accepts the secret, because it never visits one. E-214 was exactly that gap wearing
 * the opposite sign — six personas failing at the door, reported as `login failed`, which
 * on a real-money platform reads as a dead front door. It was a stale credential; the
 * product was correct on every line, and the audit chain settled it in one query.
 *
 * ⛔ SO THIS DRIVER SIGNS IN FOR REAL, AGAINST PRODUCTION, AND ASSERTS THE ROLE IT LANDS AS.
 * "Signed in" is not the claim — `login()` already waits for an authenticated shell. The
 * claim is *"signed in AS THE ROLE THIS PERSONA IS SUPPOSED TO BE"*, because a driver that
 * signs in successfully and lands on the wrong shell measures the wrong population for the
 * rest of its run and every assertion after that is about somebody else.
 *
 * ⭐ THE `trading` PERSONA IS THE REASON THAT SECOND HALF IS HERE, and it is a lesson about
 * reading one line further. Session 62 recorded a "drift": `PERSONA.trading` is `712000104`
 * whose production role reads `MODERATOR`, not `TRADING`, so a driver "signing in as the
 * TRADING officer" was said to be measuring a moderator. ⛔ IT IS NOT A DRIFT. There is no
 * `TRADING` value in the `UserRole` enum at all — `schema.prisma:26` says so, three lines
 * below the enum: *"MODERATOR is surfaced in the UI as 'Trading'; the enum value stays"* —
 * and `roles.ts:104` (`MODERATOR: "Trading"`) is the code that does it, not a comment
 * promising it. The label was right, the account was right, and "fixing" either would have
 * broken a correct driver to satisfy a misreading. This suite pins the mapping so the
 * question is answered by a run instead of by re-reading the enum every session.
 *
 * ⛔ AND IT CARRIES ITS OWN POSITIVE CONTROL. A sign-in suite whose every assertion is
 * "it worked" cannot tell a working door from an assertion that cannot fail — this
 * campaign has shipped that defect more than once (`… ? true : true`, a fixture already
 * in sorted order). The last leg deliberately presents a WRONG secret and requires the
 * refusal. If that leg ever passes silently, the door is open to anything.
 * ⚠️ Safe by construction: `LOCKOUT_MAX_FAILS = 5` and a successful sign-in resets
 * `failedLoginCount` to 0 (`auth-service.ts:640`, `:278`), so the control runs AFTER
 * alpha's good login and leaves the counter at 1 of 5.
 */
import { PERSONA, BASE, login, browser, recorder, qaEnv } from "./live/harness.mjs";

/**
 * The role each persona must land as, by the label the CONSOLE renders — not by the enum
 * value. The admin chrome shows `roleLabel(session.role)`, so this table is written in the
 * same vocabulary the operator reads, and `MODERATOR → "Trading"` is asserted rather than
 * assumed.
 */
const EXPECT = [
  { who: "alpha",   staff: false, label: null,          phone: "+255712000101" },
  { who: "echo",    staff: false, label: null,          phone: "+255712000105" },
  { who: "growth",  staff: true,  label: "Growth",      phone: "+255712000102" },
  { who: "trading", staff: true,  label: "Trading",     phone: "+255712000104" },
  { who: "officer", staff: true,  label: "Compliance",  phone: "+255712000106" },
  { who: "finance", staff: true,  label: "Finance",     phone: "+255712000107" },
];

const r = recorder(`E-214 · the six QA personas, driven on ${BASE}`);

const { b, ctx: bootCtx } = await browser({});
await bootCtx.close();   // `browser()` hands back a starter context this driver does not use

try {
  for (const p of EXPECT) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    try {
      await login(page, p.who);
      r.check(`${p.who} signs in`, true, p.phone);

      if (p.staff) {
        // ⚠️ Read the chip by its TITLE, not by its text. The visible span is
        // `hidden sm:inline-flex`, so below 640 it is `display: none` and a text query
        // would report a control that is in the DOM and not on the screen — the exact
        // mistake session 62 made with `sm:hidden`. The title attribute is on the same
        // node and is legible at any width; the viewport here is 1280 regardless.
        await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
        const chip = page.locator('[title^="You are signed in as"]').first();
        const seen = ((await chip.getAttribute("title").catch(() => "")) || "")
          .replace(/^You are signed in as\s*/, "").trim();
        r.check(`${p.who} lands as ${p.label}`, seen === p.label,
          seen ? `console says "${seen}"` : "no role chip found on /admin");
      } else {
        // A player's authenticated shell was already the signal `login()` waited for.
        // The extra claim worth making is that a PLAYER-only money surface is reachable
        // and did not bounce to the sign-in page.
        //
        // 🔴 `domcontentloaded`, NEVER `networkidle`, ON `/wallet`. Measured, not guessed:
        // this line was `networkidle` for exactly one run and BOTH players failed on a
        // 30s navigation timeout — which prints as `alpha signs in — FAIL` directly beneath
        // `alpha signs in — ok`, i.e. it reads as the player half of the front door being
        // dead while the staff half works. It is not. `/wallet` holds a live stream open,
        // so the network NEVER goes idle and the wait can only ever expire. The same
        // harness-lies-about-the-product shape as every entry in §3.
        await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded" });
        // ⚠️ And do not settle for the URL. A bounce to sign-in would be caught by it, but
        // so would a 500 that renders an error shell at the same path. Wait for something
        // only the real wallet renders, in all three languages the product ships.
        const rendered = await page.waitForFunction(() => {
          const t = document.body.innerText.toLowerCase();
          return /wallet|pochi|deposit|withdraw/.test(t) || /钱包|充值|提现/.test(document.body.innerText);
        }, null, { timeout: 30_000 }).then(() => true).catch(() => false);
        const url = page.url();
        r.check(`${p.who} reaches /wallet`,
          rendered && /\/wallet/.test(url) && !/\/auth\//.test(url),
          rendered ? url : `at ${url} but no wallet content rendered`);
      }
    } catch (e) {
      r.check(`${p.who} signs in`, false, String(e.message ?? e).slice(0, 180));
    } finally {
      await ctx.close();
    }
  }

  // ── POSITIVE CONTROL ────────────────────────────────────────────────────────────
  // Present a secret that is certainly wrong and REQUIRE the door to refuse. Without
  // this leg, six green "signs in" lines prove the suite ran, not that it can fail.
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    let refused = false;
    try {
      await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
      await page.fill("#identifier", PERSONA.alpha.phone);
      await page.fill('input[type="password"]', `${qaEnv("QA_ALPHA_PASSWORD")}-WRONG`);
      await page.getByRole("button", { name: /sign in|log in|ingia|(?<!退出)登录/i }).first().click();
      // Wait for the refusal to be STATED. Anchor on the error, not on the absence of a
      // success — and give the redirect time to land so a slow page is not read as a pass.
      refused = await page.waitForFunction(() => {
        const t = document.body.innerText.toLowerCase();
        return /invalid|incorrect|wrong|try again|hitilafu|locked/.test(t)
            || /sign in|ingia/.test(t) && !/wallet|pochi|deposit/.test(t);
      }, null, { timeout: 30_000 }).then(() => true).catch(() => false);
    } catch { refused = true; }
    finally { await ctx.close(); }
    r.check("CONTROL · a wrong secret is REFUSED", refused,
      refused ? "" : "🔴 a deliberately wrong password was ACCEPTED — stop and investigate");
  }
} finally {
  await b.close();
}

process.exit(r.done() === 0 ? 0 : 1);
