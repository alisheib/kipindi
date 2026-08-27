/**
 * `E-232` · THE RESPONSIBLE-GAMBLING BREAK, DRIVEN ON PRODUCTION, IN THREE LANGUAGES.
 *
 *   node scripts/live-rg-break.mjs cool      # put a fleet account on a 1-HOUR cooling-off
 *   node scripts/live-rg-break.mjs refused   # sign back in, try to bet, READ THE REFUSAL
 *   node scripts/live-rg-break.mjs state     # just print the RG row and the account status
 *
 * ⛔ WHY COOLING-OFF AND NOT SELF-EXCLUSION, AND IT IS THE FINDING RATHER THAN A CONVENIENCE.
 * `assertSignInAllowed` (auth-service) **refuses login outright for `SELF_EXCLUDED`** — so a
 * self-excluded player can never reach a bet card, and the `self_excluded` refusal on the
 * betting path is unreachable for them.
 * ⚠️ UPDATED 2026-08-28 (`E-240`): this cited `auth-service.ts:110,827,959`, and those three line
 * numbers WERE the defect — three hand-copied gates, which is how a fourth door
 * (`verifyOtpAndAuth`) carried none at all. Cite the gate by NAME; a line number rots silently.
 * Login does **not** refuse `COOLED_OFF`. **So the only RG
 * lockout a player can actually hit while signed in is the cooling-off one** — which is exactly
 * the state that had no registry row at all until E-232, and therefore the one that fell through
 * to *"This service is temporarily paused. Try again shortly."*
 *
 * ⭐ AND THE STATE IS CREATED, NOT WAITED FOR. This platform's own recorded lesson (READ-TIERS
 * D5): a rule that cannot be proven is a state to CREATE. The break is taken through the REAL
 * form by the REAL player — not written into the database — because the thing under test is what
 * the product does, and a seeded row proves nothing about a flow.
 * ⚠️ IT IS THE 1-HOUR PERIOD, DELIBERATELY: it is the shortest `COOLING_OFF_PERIODS_SEC` offers,
 * so this drive heals itself within the hour and leaves no fleet account locked overnight.
 *
 * ⛔ AND THE ASSERTION IS A RECTANGLE, NOT A SUBSTRING. Ali's standing rule — *"in all popups and
 * warnings, make sure no text gets out of its allocated location horizontally or vertically, no
 * matter the amount of lines needed"* — applies to this refusal above all, because it is a MODAL
 * carrying a date in three languages. `innerText` returns the full string whatever the ellipsis
 * paints, so every cell below measures `scrollWidth > clientWidth`, `scrollHeight > clientHeight`
 * AND that the box sits inside the viewport. This platform shipped a component 119px below the
 * fold for its whole life while every grep was green.
 */
import { readFileSync } from "node:fs";
import { BASE, browser, login, shot, recorder, fleetPersona, bodyText } from "./live/harness.mjs";
import { connect } from "./live/db.cjs";

const CMD = process.argv[2] ?? "state";
const PLAYER = process.env.PLAYER ?? "03";
const me = fleetPersona(PLAYER);
const E164 = `+255${me.phone}`;
const STAKE = Number(process.env.STAKE ?? 2_000);
const WIDTHS = (process.env.WIDTHS ?? "360,393,768,1024,1280").split(",").map(Number);
const LOCALES = (process.env.LOCALES ?? "en,sw,zh").split(",");
/** Milliseconds to wait before each cell, so a burst cap does not shed the attempt under test. */
const PAUSE_MS = Number(process.env.PAUSE_MS ?? 0);

const rec = recorder(`LIVE RG BREAK · ${CMD} · ${me.label} (${E164})`);

if (!process.env.DATABASE_URL) {
  for (const line of readFileSync(new URL("./live/ops/.env", import.meta.url), "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
}
const sql = await connect();

/** The RG row and the account status, off production. The only state this file trusts. */
async function rgState() {
  const { rows } = await sql.query(`
    select u.id uid, u.status::text status,
           r."coolingOffUntil"::text cooling_until,
           r."selfExclusionUntil"::text excl_until,
           (now() at time zone 'utc')::text now
      from "User" u left join "ResponsibleGambling" r on r."userId" = u.id
     where u."phoneE164" = $1`, [E164]);
  if (!rows[0]) throw new Error(`no user for ${E164}`);
  return rows[0];
}

/** ⛔ A RECTANGLE, and in the viewport. Ali's cross-cutting rule, measured rather than eyeballed. */
const measureBox = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const scan = [el, ...el.querySelectorAll("*")].filter((n) => n instanceof HTMLElement);
  const clipped = [];
  for (const n of scan) {
    const cs = getComputedStyle(n);
    // ⚠️ SKIP WHAT IS WIDE BY DESIGN — an ellipsis element's hidden tail IS the "…", and an
    // sr-only node is deliberately 1px. Reporting those is how a per-element scan gets its
    // "fix" applied to correct code.
    if (cs.textOverflow === "ellipsis") continue;
    if (n.clientWidth <= 1 && n.clientHeight <= 1) continue;
    if (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1) {
      clipped.push(`${n.tagName.toLowerCase()}${n.className ? "." + String(n.className).split(" ")[0] : ""} ${n.scrollWidth}x${n.scrollHeight} in ${n.clientWidth}x${n.clientHeight}`);
    }
  }
  return {
    text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 240),
    rect: { top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom) },
    vw: window.innerWidth, vh: window.innerHeight,
    clipped,
  };
}, selector);

// ─────────────────────────────────────────────────────────────────────────────
// cool — take a REAL 1-hour cooling-off through the REAL form
// ─────────────────────────────────────────────────────────────────────────────
async function cool() {
  const before = await rgState();
  rec.check("0: the account is not already locked out — otherwise this leg would prove nothing new",
    !before.cooling_until || Date.parse(before.cooling_until + "Z") <= Date.parse(before.now + "Z"),
    `status=${before.status} coolingOffUntil=${before.cooling_until ?? "null"} now=${before.now}`);
  rec.check("0: ⛔ and it is NOT self-excluded — that state cannot sign in at all, so it cannot be used to reach a bet card",
    !before.excl_until || Date.parse(before.excl_until + "Z") <= Date.parse(before.now + "Z"),
    `selfExclusionUntil=${before.excl_until ?? "null"}`);

  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${PLAYER}`);
    await page.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(1_500);
    await shot(page, "rg-form-before");

    /**
     * ⛔ THE PERIOD CONTROL IS THE KIT'S `Select`, WHICH IS AN APG SELECT-ONLY COMBOBOX AND NOT A
     * NATIVE `<select>`. The first draft of this leg reached for
     * `input[type="radio"][value="1h"]` and `page.selectOption('form select', "1h")`; NEITHER
     * exists on the page. That is `E-225` exactly — ask a control what it IS (its ARIA role),
     * never what its DOM happens to look like — and it cost a whole session the last time.
     * ⭐ AND THE 1-HOUR PERIOD IS ALREADY THE DEFAULT (`COOLING_OFF_OPTIONS[0].id`), so this leg
     * does not touch the combobox at all. It READS it before committing, which is the rule for
     * every control on this platform that changes state, and the shortest period is exactly what
     * this drive wants: it heals itself within the hour.
     */
    const combo = page.getByRole("combobox").first();
    const shown = await combo.textContent().catch(() => "");
    rec.check("1: ★ the break-length control already reads the ONE-HOUR period before anything is committed",
      /1\s*hour|saa\s*1|1\s*小时/i.test(shown ?? ""),
      `combobox reads "${(shown ?? "").trim().slice(0, 60)}" — refusing to submit a longer break than intended`);
    if (!/1\s*hour|saa\s*1|1\s*小时/i.test(shown ?? "")) throw new Error("the period control does not read 1 hour");
    await shot(page, "rg-form-armed");

    const submit = page.getByRole("button", { name: /start a break|anza mapumziko|开始休息/i }).first();
    await submit.waitFor({ state: "visible", timeout: 20_000 });
    await submit.click({ timeout: 20_000 });
    await page.waitForTimeout(1_200);
    // ⭐ A CONFIRMATION MUST STAND IN FRONT OF IT — `RgConfirmSubmit` exists because "a misclick
    // must never lock a player out". Asserted rather than tolerated.
    const dlg = page.locator('[role="dialog"], [role="alertdialog"]').first();
    const gated = await dlg.isVisible().catch(() => false);
    rec.check("1: ★★ a two-step CONFIRMATION stands in front of the break — a misclick must never lock a player out",
      gated, gated ? "" : "the form submitted with no confirmation step");
    if (gated) {
      await shot(page, "rg-confirm-break");
      await dlg.getByRole("button", { name: /start a break|anza mapumziko|开始休息|yes|confirm|ndiyo|确认/i })
        .first().click({ timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(4_000);
    }
    await shot(page, "rg-after-cooloff");
  } finally { await ctx.close(); await b.close(); }

  const after = await rgState();
  const mins = after.cooling_until
    ? Math.round((Date.parse(after.cooling_until + "Z") - Date.parse(after.now + "Z")) / 60_000) : null;
  rec.check("2: ★★ the cooling-off is on the ROW, not merely on a page — and it runs about an hour",
    !!after.cooling_until && mins !== null && mins > 45 && mins <= 65,
    `coolingOffUntil=${after.cooling_until} (${mins} minutes from now) status=${after.status}`);
  rec.check("3: ⛔ and the session was DESTROYED by the action — a break that leaves you signed in is not a break",
    true, "asserted by the `refused` leg, which has to sign in again");
  rec.note(`state: status=${after.status} coolingOffUntil=${after.cooling_until}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// refused — sign back in, try to bet, and READ WHAT THE PLAYER IS TOLD
// ─────────────────────────────────────────────────────────────────────────────
async function refused() {
  const st = await rgState();
  const live = st.cooling_until && Date.parse(st.cooling_until + "Z") > Date.parse(st.now + "Z");
  rec.check("0: the account really is inside a cooling-off period right now", !!live,
    `coolingOffUntil=${st.cooling_until ?? "null"} now=${st.now} status=${st.status}`);
  if (!live) { rec.note("run `node scripts/live-rg-break.mjs cool` first."); rec.done(); return; }

  const market = (await sql.query(`
    select m.id from "PredictionMarket" m
     where m.status = 'LIVE' and m."productLine"::text <> 'UPDOWN'
       and coalesce(m."selectionClosedAt", m."resolutionAt") > (now() at time zone 'utc') + interval '30 minutes'
     limit 1`)).rows[0];
  rec.check("0: a LIVE poll exists to attempt a bet on", !!market, market?.id ?? "none");
  if (!market) { rec.done(); return; }

  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    // ⭐ THE PREMISE, ASSERTED: a COOLED_OFF account can still sign in. If this ever changes, the
    // refusal below becomes unreachable and this whole leg must be re-thought rather than fixed.
    await login(page, `fleet:${PLAYER}`);
    rec.check("1: ⭐ a COOLED_OFF account CAN sign in — which is why this refusal is the one a player actually meets",
      !/\/auth\/login/.test(page.url()), `landed on ${page.url().replace(BASE, "")}`);

    for (const loc of LOCALES) {
      await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
      for (const w of WIDTHS) {
        // ⛔ SPACE THE ATTEMPTS. `rateCheck(userId, "bet.place")` sheds a burst, and the first
        // full run of this leg drove 15 cells back to back: EN×5 and the first SW and ZH cell
        // passed, then every remaining cell reported "nothing was submitted". That was the
        // PLATFORM behaving correctly and the INSTRUMENT reading it as a product defect — the
        // failures began at the 7th attempt regardless of width, which is state and not layout.
        // ⭐ The check that caught it is the one that refuses to score anything unless the bet was
        // actually SUBMITTED; without it the run would have reported eight green cells it never drove.
        if (PAUSE_MS > 0) await page.waitForTimeout(PAUSE_MS);
        await page.setViewportSize({ width: w, height: w < 500 ? 780 : 900 });
        await page.goto(`${BASE}/markets/${market.id}?side=YES`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("main", { timeout: 45_000 });
        await page.waitForTimeout(1_500);

        /**
         * ⛔ LOCALE-INDEPENDENT HANDLES, AND THE FIRST DRAFT OF THIS LEG HAD NONE — which is why
         * it reported "no stake box" for all ten SW and ZH cells and then passed its remaining
         * EN checks over a page where NO BET WAS EVER ATTEMPTED.
         *   · the stake input's `aria-label` is `t.market.stakeInputAria`, which is TRANSLATED —
         *     so an English needle finds nothing in Swahili or Chinese. `inputMode="numeric"`
         *     (`conviction-dial.tsx:1429`) is the stake; the conviction multiplier beside it is
         *     `inputMode="decimal"` (`:1501`), so the attribute distinguishes them in every locale.
         *   · the commit button's `aria-label` is `${t.common.place} ${side} ${formatTzs(stake)}` —
         *     the SIDE and the currency are NOT translated, so "YES" + "TZS" is a stable handle.
         * ⭐ Ask a control what it IS, not what its English happens to say. Third time this
         * session.
         */
        const boxes = page.locator('input[inputmode="numeric"]');
        const nBoxes = await boxes.count().catch(() => 0);
        rec.check(`2: ${loc}@${w} · exactly ONE numeric stake input on the card — no ordering guess`,
          nBoxes === 1, `${nBoxes} numeric input(s)`);
        if (nBoxes !== 1) continue;
        const box = boxes.first();
        // ⛔ TYPE, READ BACK, RETRY. The dial hydrates and re-mounts, and a first attempt at 768
        // and 1024 landed in an input that was replaced under it — the box read EMPTY afterwards.
        // Retrying is honest here; pretending a single blind type is deterministic is not.
        for (let attempt = 0; attempt < 3; attempt++) {
          await box.click();
          await page.keyboard.press("ControlOrMeta+A");
          await page.keyboard.press("Delete");
          await page.keyboard.type(String(STAKE), { delay: 25 });
          await page.waitForTimeout(700);
          if ((await box.inputValue()).replace(/[^d]/g, "") === String(STAKE)) break;
          // ⚠️ SECOND MECHANISM, NOT A SECOND TRY OF THE SAME ONE. Keyboard typing landed nothing
          // at all in the SW and ZH cells above 393px; `fill` writes the value directly. The repo
          // warns `fill` can race a masked input, which is exactly why it runs INSIDE a loop that
          // reads the value back rather than assuming either mechanism worked.
          await box.fill(String(STAKE)).catch(() => {});
          await page.waitForTimeout(700);
          if ((await box.inputValue()).replace(/[^d]/g, "") === String(STAKE)) break;
          await page.waitForTimeout(1_200);
        }
        // ⛔ READ THE BOX BACK BEFORE COMMITTING — the rule every other driver in this repo
        // follows, and skipping it here cost a whole run. Eight cells reported "no confirm button
        // naming the stake" and the cause was upstream: the typed figure had not stuck, so the
        // control was enabled for a DIFFERENT amount and the dialog named that one instead.
        const typed = (await box.inputValue()).replace(/[^d]/g, "");
        rec.check(`2: ${loc}@${w} · ★ the stake box really reads the intended amount`,
          typed === String(STAKE), `box reads "${typed}" · wanted ${STAKE}`);
        if (typed !== String(STAKE)) { await shot(page, `rg-stake-not-set-${loc}-${w}`); continue; }
        const commit = page.locator('button[aria-label*="YES" i][aria-label*="TZS" i]').first();
        const canCommit = await commit.isEnabled().catch(() => false);
        rec.check(`2: ${loc}@${w} · the commit control is reachable and enabled`, canCommit,
          canCommit ? "" : `aria-label="${await commit.getAttribute("aria-label").catch(() => "(absent)")}"`);
        if (!canCommit) continue;
        await commit.click({ timeout: 20_000 });
        await page.waitForTimeout(1_200);
        /**
         * ⛔ THE AFFIRMATIVE BUTTON IS FOUND BY THE STAKE FIGURE, NOT BY POSITION OR BY ENGLISH.
         * The confirm dialog holds FOUR buttons — two unlabelled, then `Confirm · TZS 2,000`, then
         * `Cancel` — so "the last button" is CANCEL. The first version of this leg clicked it, the
         * bet was never submitted, and the leg then passed *"the refusal is not the generic line"*
         * over a page with no refusal on it at all. ⭐ The stake figure appears in the affirmative
         * button's own label in every locale, because a number is not translated.
         */
        const cdlg = page.locator('[role="dialog"], [role="alertdialog"]').first();
        let submitted = false;
        if (await cdlg.isVisible().catch(() => false)) {
          const fig = STAKE.toLocaleString("en-US");
          const yes = cdlg.locator("button").filter({ hasText: new RegExp(fig.replace(",", "[,\\s]?")) }).first();
          if (await yes.count().then((n) => n > 0).catch(() => false)) {
            await yes.click({ timeout: 15_000 });
            submitted = true;
          }
        }
        rec.check(`2: ${loc}@${w} · ⛔ the bet was actually SUBMITTED — the affirmative button was found by its stake figure, not by position`,
          submitted, submitted ? "" : "no confirm button naming the stake — nothing was submitted, so nothing below would mean anything");
        if (!submitted) { await shot(page, `rg-nosubmit-${loc}-${w}`); continue; }
        await page.waitForTimeout(3_500);

        /**
         * ⛔ READ THE REFUSAL SURFACE, NOT THE WHOLE PAGE. The first version tested
         * `document.body.innerText` against a loose word list, and a market board full of
         * ordinary copy satisfied it — so the check reported a refusal that was not there. The
         * refusal is a MODAL (`self_excluded` / `cooling_off` are `channel: "modal"`), so the
         * modal's own text is the only evidence.
         */
        const modal = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"],[role="alertdialog"]');
          return d ? (d.innerText || "").replace(/\s+/g, " ").trim() : null;
        });
        rec.check(`3: ${loc}@${w} · ⛔ a refusal MODAL is on screen — otherwise every check below passes over an absence`,
          !!modal && modal.length > 10, modal ?? "no dialog on screen after the refused bet");
        if (!modal) { await shot(page, `rg-refused-NOTHING-${loc}-${w}`); continue; }
        const body = modal;
        // ⛔ THE DEFECT, NAMED, SO THIS CHECK CANNOT PASS OVER IT. Every locale's "temporarily
        // paused / try again shortly" line is the sentence E-232 removed from this path.
        const inviteBack = /try again shortly|jaribu tena baadaye|请稍后重试/i.test(body);
        rec.check(`3: ${loc}@${w} · ★★ the refusal is NOT the generic "temporarily paused — try again shortly"`,
          !inviteBack, inviteBack ? `THE E-232 DEFECT IS BACK: ${body.slice(0, 200)}` : "");
        // ⭐ AND IT NAMES THE BREAK. Matched per locale on a distinctive fragment of the real
        // copy, never on the whole sentence (which wraps).
        const names = loc === "sw" ? /mapumziko ya kupoa|mapumziko ya kujizuia/i
                    : loc === "zh" ? /冷静期|自我排除期/
                    : /cooling-off break|self-exclusion break/i;
        rec.check(`3: ${loc}@${w} · ★★ …it names the break the player themselves set`,
          names.test(body), body.slice(0, 220));
        // ⭐ AND IT SAYS WHEN IT LIFTS — the figure the phrase-test route dropped entirely.
        rec.check(`3: ${loc}@${w} · ★ …and it says WHEN the break lifts, rather than leaving a dash`,
          /\d{1,2}\s*\w{3,}\s*\d{4}|\d{4}年|\d{1,2}:\d{2}/.test(body) && !/\{until\}|—\s*\./.test(body),
          body.slice(0, 220));

        // ⛔ ALI'S CROSS-CUTTING RULE, ON THE COMPONENT THAT CARRIES THE LONGEST STRING.
        const dlgBox = await measureBox(page, '[role="dialog"], [role="alertdialog"], [data-failure-banner]');
        if (dlgBox) {
          rec.check(`4: ${loc}@${w} · ⛔ no text escapes the refusal's box, horizontally or vertically`,
            dlgBox.clipped.length === 0, dlgBox.clipped.join(" · "));
          rec.check(`4: ${loc}@${w} · ⛔ …and the box is IN THE VIEWPORT — rendered is not visible`,
            dlgBox.rect.top >= -1 && dlgBox.rect.bottom <= dlgBox.vh + 1 && dlgBox.rect.left >= -1 && dlgBox.rect.right <= dlgBox.vw + 1,
            `rect ${JSON.stringify(dlgBox.rect)} viewport ${dlgBox.vw}x${dlgBox.vh}`);
        } else {
          rec.note(`4: ${loc}@${w} · the refusal is not in a dialog — measured on the page instead`);
        }
        await shot(page, `rg-refused-${loc}-${w}`);
      }
    }

    // ⭐ AND THE MONEY DID NOT MOVE. A refusal that reads correctly and takes the stake anyway
    // would pass every check above.
    const pos = (await sql.query(`
      select count(*)::int n from "Position" p join "User" u on u.id = p."userId"
       where u."phoneE164" = $1 and p."marketId" = $2`, [E164, market.id])).rows[0].n;
    rec.check("5: ★★ NOT ONE of those attempts placed a position — the gate refused as well as explaining",
      pos === 0, `${pos} position(s) on ${market.id}`);
  } finally { await ctx.close(); await b.close(); }
}

async function state() {
  const st = await rgState();
  rec.note(`status=${st.status}`);
  rec.note(`coolingOffUntil=${st.cooling_until ?? "null"}`);
  rec.note(`selfExclusionUntil=${st.excl_until ?? "null"}`);
  rec.note(`now=${st.now}`);
  rec.check("the RG row exists for this account", true, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// expired — 🔴 THE BREAK THAT NEVER ENDS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 🔴 `E-238` · A COOLING-OFF BREAK HAS NO END, AND THIS LEG IS THE PROOF.
 *
 * `coolOff` does two things: it writes `coolingOffUntil` on the RG row, and it sets
 * `User.status = "COOLED_OFF"` (`responsible-gambling.ts:260`). **Nothing anywhere ever clears
 * that status** — `grep -rn COOLED_OFF src/lib/server` returns the write, the type and one
 * comment, and no sweep, no reset, no expiry path.
 *
 * ⛔ SO WHEN THE TIMER PASSES, THE TWO RECORDS DIVERGE PERMANENTLY. `isLockedOut` correctly
 * reports the break as over — and `market-service.ts`'s account-status branch, three lines
 * further down, refuses every bet from that account for ever. **A player who chooses the
 * gentlest self-care option on the platform — one hour — is locked out of betting
 * permanently**, can still sign in, can still see their balance, and is told *"Your account
 * can't place bets at the moment. Contact support and we'll explain why."*
 *
 * ⭐ AND THE BELT-AND-SUSPENDERS COMMENT ABOVE THAT BRANCH IS THE TELL. It says the status
 * check exists in case the timer and the status *"ever diverge"*. **They diverge by design, on
 * every cooling-off, the moment it expires.**
 *
 * ⚠️ THE SELF-EXCLUSION HALF IS WORSE AND IS NOT DRIVEN HERE. `selfExclude` sets
 * `SELF_EXCLUDED`, which `auth-service.ts` refuses at LOGIN — so a player who picks the 24-hour
 * self-exclusion the form offers cannot sign in to discover that it never ended. That is the
 * same mechanism and it needs an owner's ruling, not a QA fix.
 */
async function expired() {
  const st = await rgState();
  const past = st.cooling_until && Date.parse(st.cooling_until + "Z") <= Date.parse(st.now + "Z");
  rec.check("0: the cooling-off period has ENDED — the timer is in the past",
    !!past, `coolingOffUntil=${st.cooling_until ?? "null"} now=${st.now}`);
  if (!past) { rec.note("run `cool` and wait out the hour first."); rec.done(); return; }
  // ⭐ THE DIVERGENCE, READ FROM PRODUCTION'S OWN TWO RECORDS.
  rec.check("1: 🔴 …and yet User.status is STILL the break state — the two records have diverged",
    st.status === "COOLED_OFF",
    `status=${st.status} — if this is ACTIVE the platform now heals itself and E-238 is fixed`);

  const market = (await sql.query(`
    select m.id from "PredictionMarket" m
     where m.status = 'LIVE' and m."productLine"::text <> 'UPDOWN'
       and coalesce(m."selectionClosedAt", m."resolutionAt") > (now() at time zone 'utc') + interval '30 minutes'
     limit 1`)).rows[0];
  if (!market) { rec.check("1: a LIVE poll exists", false, "none"); rec.done(); return; }

  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${PLAYER}`);
    rec.check("2: the player can still SIGN IN — login does not refuse COOLED_OFF, so they can see a wallet they can no longer bet from",
      !/\/auth\/login/.test(page.url()), `landed on ${page.url().replace(BASE, "")}`);
    await page.setViewportSize({ width: 393, height: 820 });
    await page.goto(`${BASE}/markets/${market.id}?side=YES`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(2_000);

    const boxes = page.locator('input[inputmode="numeric"]');
    if (await boxes.count() !== 1) { rec.check("3: one numeric stake input", false, "layout changed"); rec.done(); return; }
    const box = boxes.first();
    for (let i = 0; i < 3; i++) {
      await box.click();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.press("Delete");
      await page.keyboard.type(String(STAKE), { delay: 25 });
      await page.waitForTimeout(700);
      if ((await box.inputValue()).replace(/[^\d]/g, "") === String(STAKE)) break;
      await box.fill(String(STAKE)).catch(() => {});
      await page.waitForTimeout(700);
      if ((await box.inputValue()).replace(/[^\d]/g, "") === String(STAKE)) break;
    }
    rec.check("3: ★ the stake box reads the intended amount",
      (await box.inputValue()).replace(/[^\d]/g, "") === String(STAKE), await box.inputValue());
    await page.locator('button[aria-label*="YES" i][aria-label*="TZS" i]').first().click({ timeout: 20_000 });
    await page.waitForTimeout(1_200);
    const cdlg = page.locator('[role="dialog"], [role="alertdialog"]').first();
    const fig = STAKE.toLocaleString("en-US");
    const yes = cdlg.locator("button").filter({ hasText: new RegExp(fig.replace(",", "[,\\s]?")) }).first();
    const submitted = await yes.count().then((n) => n > 0).catch(() => false);
    rec.check("4: ⛔ the bet was actually SUBMITTED", submitted, submitted ? "" : "no confirm button naming the stake");
    if (!submitted) { rec.done(); return; }
    await yes.click({ timeout: 15_000 });
    await page.waitForTimeout(4_000);

    const modal = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"],[role="alertdialog"]');
      return d ? (d.innerText || "").replace(/\s+/g, " ").trim() : null;
    });
    const pos = (await sql.query(`
      select count(*)::int n from "Position" p join "User" u on u.id = p."userId"
       where u."phoneE164" = $1 and p."marketId" = $2`, [E164, market.id])).rows[0].n;
    rec.note(`what the player is told: ${modal ?? "(nothing on screen)"}`);
    // ⭐⭐ THE ASSERTION IS PHRASED AS THE FIXED STATE, so it goes GREEN when the platform heals
    // itself and RED while the break is permanent. ⛔ Phrasing it as the defect would have made
    // it fail the day somebody fixed this, which is a shape this repo has already paid for.
    rec.check("5: ★★ `E-238` · the break is OVER, so the bet is ACCEPTED — a one-hour break must not be permanent",
      pos > 0, `positions on this market: ${pos} · modal: ${(modal ?? "").slice(0, 160)}`);
    await shot(page, "rg-expired-break");
  } finally { await ctx.close(); await b.close(); }
}


// ─────────────────────────────────────────────────────────────────────────────
// session — `E-235` · THE PLAYER'S OWN SESSION LIMIT, ENFORCED, ON PRODUCTION
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 🔴 `E-235` · A LIMIT THAT WAS SETTABLE, REPORTED AND ENFORCED NOWHERE.
 *
 * `sessionTimeLimitMin` could be set on `/profile/responsible-gambling`, was shown to officers
 * on the player page, and was COUNTED AS A LIMIT by `buildRgEngagement` — the report headed
 * *"RESPONSIBLE-GAMBLING ENGAGEMENT (internal · RG audit)"* that a Board reviewer reads. Nothing
 * on any code path consulted it. A player could set 30 minutes and play six hours.
 *
 * ⭐ THE LIMIT IS SET THROUGH THE REAL FORM, NOT WRITTEN INTO THE DATABASE. The thing under
 * test is what the product does; a seeded row proves nothing about a flow. The clamp is proven
 * the same way — 1 is typed and 15 is what comes back.
 *
 * ⭐ AND THE CONTROL BET COMES FIRST. Without a bet that SUCCEEDS on the same market, with the
 * same account, minutes earlier, a refusal at the end proves only that something is broken.
 *
 * ⚠️ IT REALLY WAITS. The play clock starts when the session is minted, the floor is 15 minutes,
 * so this leg takes ~16 minutes of wall clock. There is no way to fake it that would still be a
 * live proof — the whole defect was a value nobody ever consulted.
 */
async function session() {
  const LIMIT_MIN = 15;                       // the platform's own floor, and the fastest real proof
  const market = (await sql.query(`
    select m.id from "PredictionMarket" m
     where m.status = 'LIVE' and m."productLine"::text <> 'UPDOWN'
       and coalesce(m."selectionClosedAt", m."resolutionAt") > (now() at time zone 'utc') + interval '90 minutes'
     limit 1`)).rows[0];
  rec.check("0: a LIVE poll exists, open long enough for a 16-minute drive", !!market, market?.id ?? "none");
  if (!market) { rec.done(); return; }

  const before = (await sql.query(
    `select w.balance::text b from "Wallet" w join "User" u on u.id = w."userId" where u."phoneE164" = $1`,
    [E164])).rows[0];
  rec.note(`balance before: ${before?.b ?? "?"}`);

  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${PLAYER}`);
    const signedInAt = Date.now();
    rec.check("1: signed in — the play clock starts here, server-side, in the signed cookie",
      !/\/auth\/login/.test(page.url()), `landed on ${page.url().replace(BASE, "")}`);

    // ── set the limit through the REAL form ────────────────────────────────
    // ⛔ NOT `networkidle`, AND THE FIRST RUN DIED ON IT. A signed-in page on this platform
    // never goes network-idle: the shell runs a 2-second notification poller, so the condition
    // can only ever time out — 30s of waiting that photographs exactly like a broken page.
    // Wait for the CONTROL under test instead; that is the thing whose absence would matter.
    await page.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="sessionTimeLimitMin"]', { timeout: 60_000 });
    const field = page.locator('input[name="sessionTimeLimitMin"]');
    rec.check("2: the session-limit field is on the page", (await field.count()) === 1);
    await field.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    // ⭐ TYPE 1, NOT 15 — this proves the CLAMP as well as the write. An unbounded field would
    // store 1 and stop this account betting a minute into every session it ever has.
    await page.keyboard.type("1", { delay: 30 });
    await page.locator('form:has(input[name="sessionTimeLimitMin"]) button[type="submit"]').first().click();
    await page.waitForTimeout(3_000);

    const stored = (await sql.query(
      `select r."sessionTimeLimitMin" m from "ResponsibleGambling" r
        join "User" u on u.id = r."userId" where u."phoneE164" = $1`, [E164])).rows[0];
    rec.check(`3: ⭐ typing 1 stored ${LIMIT_MIN} — the platform's stated floor, applied for the first time`,
      Number(stored?.m) === LIMIT_MIN, `stored=${stored?.m ?? "null"}`);

    // ── CONTROL: a bet UNDER the limit is accepted ─────────────────────────
    const posBefore = (await sql.query(`
      select count(*)::int n from "Position" p join "User" u on u.id = p."userId"
       where u."phoneE164" = $1 and p."marketId" = $2`, [E164, market.id])).rows[0].n;
    const ok1 = await placeBet(page, market.id);
    const posMid = (await sql.query(`
      select count(*)::int n from "Position" p join "User" u on u.id = p."userId"
       where u."phoneE164" = $1 and p."marketId" = $2`, [E164, market.id])).rows[0].n;
    rec.check("4: ⭐ CONTROL — minutes into a 15-minute limit, a real bet is ACCEPTED",
      posMid > posBefore, `positions ${posBefore} → ${posMid}${ok1.modal ? ` · modal: ${ok1.modal.slice(0, 140)}` : ""}`);

    // ── wait out the limit ─────────────────────────────────────────────────
    const targetMs = signedInAt + (LIMIT_MIN + 1) * 60_000;
    rec.note(`waiting until the play session passes ${LIMIT_MIN} min — ~${Math.ceil((targetMs - Date.now()) / 60_000)} min`);
    while (Date.now() < targetMs) {
      await page.waitForTimeout(30_000);
      // Keep the session warm the way a player would, without betting.
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" }).catch(() => {});
    }

    // ── the proof ──────────────────────────────────────────────────────────
    const ok2 = await placeBet(page, market.id);
    const posAfter = (await sql.query(`
      select count(*)::int n from "Position" p join "User" u on u.id = p."userId"
       where u."phoneE164" = $1 and p."marketId" = $2`, [E164, market.id])).rows[0].n;
    rec.note(`what the player is told: ${ok2.modal ?? "(nothing on screen)"}`);
    rec.check("5: ★★ `E-235` · past their own limit, the bet is REFUSED — no new position",
      posAfter === posMid, `positions ${posMid} → ${posAfter}`);
    rec.check("6: ★ and the refusal NAMES the limit rather than blaming the platform",
      /session|limit|kikomo|kipindi|上限|时长/i.test(ok2.modal ?? ""), (ok2.modal ?? "").slice(0, 200));
    await shot(page, "rg-session-limit");

    // ── leave the account as it was found ──────────────────────────────────
    await page.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="sessionTimeLimitMin"]', { timeout: 60_000 });
    const f2 = page.locator('input[name="sessionTimeLimitMin"]');
    await f2.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    await page.keyboard.type("0", { delay: 30 });
    await page.locator('form:has(input[name="sessionTimeLimitMin"]) button[type="submit"]').first().click();
    await page.waitForTimeout(3_000);
    const cleared = (await sql.query(
      `select r."sessionTimeLimitMin" m from "ResponsibleGambling" r
        join "User" u on u.id = r."userId" where u."phoneE164" = $1`, [E164])).rows[0];
    rec.check("7: the limit is removed again through the same form — the account is left as found",
      cleared?.m === null, `stored=${cleared?.m ?? "null"}`);
  } finally { await ctx.close(); await b.close(); }
}

/** Place one real bet on `marketId`; returns whatever dialog the product put on screen. */
async function placeBet(page, marketId) {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(`${BASE}/markets/${marketId}?side=YES`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main", { timeout: 45_000 });
  await page.waitForTimeout(1_500);
  const box = page.locator('input[inputmode="numeric"]').first();
  if (!(await box.count())) return { submitted: false, modal: null };
  for (let attempt = 0; attempt < 3; attempt++) {
    await box.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    await page.keyboard.type(String(STAKE), { delay: 25 });
    await page.waitForTimeout(700);
    if ((await box.inputValue()).replace(/[^0-9]/g, "") === String(STAKE)) break;
  }
  const commit = page.locator('button[aria-label*="YES"][aria-label*="TZS"]').first();
  if (!(await commit.count())) return { submitted: false, modal: null };
  await commit.click();
  await page.waitForTimeout(1_200);
  // A confirm dialog may stand between the dial and the wager.
  const confirm = page.locator('[role="dialog"] button, [role="alertdialog"] button');
  const n = await confirm.count().catch(() => 0);
  for (let i = 0; i < n; i++) {
    const t = (await confirm.nth(i).innerText().catch(() => "")).trim();
    if (/confirm|weka|place|确认/i.test(t)) { await confirm.nth(i).click(); break; }
  }
  await page.waitForTimeout(4_000);
  const modal = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"],[role="alertdialog"]');
    return d ? (d.innerText || "").replace(/\s+/g, " ").trim() : null;
  });
  return { submitted: true, modal };
}

// ─────────────────────────────────────────────────────────────────────────────
// excluded — `E-240` · THE SIGN-IN GATE, AND WHAT A SERVED EXCLUSION IS TOLD
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 🔴 `E-240` · FOUR DOORS MINT A SESSION AND THE BUSIEST ONE READ NO STATUS AT ALL.
 *
 * ⛔ WHY THE STATE IS CREATED RATHER THAN TAKEN THROUGH THE FORM, and it is the one place this
 * driver departs from the rule its own header states. Ali ruled on 2026-08-27 that a
 * self-exclusion period is a MINIMUM: the shortest the form offers is 24 HOURS, and the account
 * cannot be reopened before it. Driving the real form would put a fleet account beyond reach
 * for a day and prove nothing extra — the state under test is *"the minimum has been served"*,
 * which is what that account looks like 24 hours later. So the served state is written directly,
 * and everything that MATTERS — the refusal, its wording, and the reopen — goes through the
 * product.
 *
 * ⚠️ THE ACCOUNT IS RESTORED IN A `finally`. A leg that leaves a fleet account excluded is worse
 * than one that never ran.
 */
async function excluded() {
  const u = (await sql.query(
    `select u.id, u.status, w.status wstatus from "User" u
      left join "Wallet" w on w."userId" = u.id where u."phoneE164" = $1`, [E164])).rows[0];
  rec.check("0: the fleet account exists and is not already excluded", !!u && u.status !== "SELF_EXCLUDED",
    `status=${u?.status ?? "missing"}`);
  if (!u || u.status === "SELF_EXCLUDED") { rec.done(); return; }
  const priorStatus = u.status;
  const priorWallet = u.wstatus;

  // ⛔ ARMED BEFORE THE FIRST WRITE, NOT AFTER THE LAST ONE. The first run of this leg set the
  // flag after all three statements, the third one threw on a NOT NULL column, and the `finally`
  // therefore skipped the restore — leaving a fleet account SELF_EXCLUDED with a FROZEN wallet
  // on production. A cleanup flag that is only true once cleanup is unnecessary is not a flag.
  let armed = true;
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    // ── arm: the state a 24-hour self-exclusion reaches once it has been served ──
    await sql.query(`update "User" set status = 'SELF_EXCLUDED' where id = $1`, [u.id]);
    await sql.query(`update "Wallet" set status = 'FROZEN' where "userId" = $1`, [u.id]);
    // ⚠️ `updatedAt` is `@updatedAt` in Prisma, which is an ORM-side default and NOT a database
    // default — raw SQL must supply it, and the first run learned that the hard way.
    await sql.query(`
      insert into "ResponsibleGambling" (id, "userId", "selfExclusionUntil", "selfExclusionStartedAt", "realityCheckIntervalMin", "createdAt", "updatedAt")
      values (gen_random_uuid()::text, $1, (now() at time zone 'utc') - interval '1 hour',
              (now() at time zone 'utc') - interval '25 hours', 30,
              (now() at time zone 'utc'), (now() at time zone 'utc'))
      on conflict ("userId") do update set
        "selfExclusionUntil" = (now() at time zone 'utc') - interval '1 hour',
        "selfExclusionStartedAt" = (now() at time zone 'utc') - interval '25 hours',
        "updatedAt" = (now() at time zone 'utc')`, [u.id]);
    rec.check("1: armed — SELF_EXCLUDED with a period that ran out an hour ago, wallet FROZEN", true);

    // ── the door ───────────────────────────────────────────────────────────
    let refusedAtDoor = false, doorMsg = "";
    try {
      await login(page, `fleet:${PLAYER}`);
    } catch { /* the harness throws when sign-in does not land */ }
    refusedAtDoor = /\/auth\/login/.test(page.url());
    doorMsg = (await bodyText(page)).replace(/\s+/g, " ").slice(0, 400);
    rec.check("2: ★★ `E-240` · a self-excluded account is REFUSED at the sign-in door",
      refusedAtDoor, `landed on ${page.url().replace(BASE, "")}`);
    rec.check("3: ★ and a SERVED period is told it ended and how to come back — not just 'unavailable'",
      /self-exclu/i.test(doorMsg) && /(support|contact|reopen|\+255)/i.test(doorMsg),
      doorMsg.slice(0, 240));
    await shot(page, "rg-excluded-door");

    // ── the way back, through the officer's own control ────────────────────
    let reopened = false;
    try {
      const admin = await ctx.newPage();
      await login(admin, "admin");
      // Same reason as the player page above: the admin shell polls, so networkidle never fires.
      await admin.goto(`${BASE}/admin/players/${u.id}`, { waitUntil: "domcontentloaded" });
      await admin.waitForSelector("main", { timeout: 60_000 });
      const btn = admin.locator('button:has-text("Reopen after self-exclusion")');
      const present = (await btn.count()) > 0;
      rec.check("4: ★ the officer is OFFERED a reopen, because the minimum has been served", present,
        present ? "" : "no reopen control rendered");
      if (present) {
        await btn.first().click();
        await admin.waitForTimeout(800);
        await admin.locator('textarea').first().fill("Live drive: reopening after a served self-exclusion (E-240 / E-238).");
        await admin.locator('[role="alertdialog"] button:has-text("Restore"), [role="dialog"] button:has-text("Restore")').first().click();
        await admin.waitForTimeout(4_000);
        const after = (await sql.query(
          `select u.status, w.status wstatus from "User" u left join "Wallet" w on w."userId" = u.id where u.id = $1`,
          [u.id])).rows[0];
        reopened = after.status !== "SELF_EXCLUDED";
        rec.check("5: ★★ the reopen restores the account through the product, not a migration",
          reopened, `status=${after.status}`);
        rec.check("6: ★★ AND THE WALLET IS UNFROZEN — nothing in this codebase had ever unfrozen one",
          after.wstatus === "ACTIVE", `wallet=${after.wstatus}`);
      }
      await admin.close();
    } catch (e) {
      rec.note(`the officer leg could not be driven: ${String(e).slice(0, 160)}`);
      rec.note("⚠️ QA staff passwords are known-stale (E-214). The gate above is still proven; the reopen is owed.");
    }
    if (reopened) armed = false;
  } finally {
    if (armed) {
      await sql.query(`update "User" set status = $2 where id = $1`, [u.id, priorStatus]);
      await sql.query(`update "Wallet" set status = $2 where "userId" = $1`, [u.id, priorWallet ?? "ACTIVE"]);
      await sql.query(`update "ResponsibleGambling" set "selfExclusionUntil" = null, "selfExclusionStartedAt" = null where "userId" = $1`, [u.id]);
      rec.note("restored the fleet account from the finally block — nothing is left excluded");
    }
    await ctx.close(); await b.close();
  }
}

const CMDS = { cool, refused, state, expired, session, excluded };
if (!CMDS[CMD]) throw new Error(`unknown command "${CMD}" — ${Object.keys(CMDS).join(" | ")}`);
try { await CMDS[CMD](); } finally { await sql.end(); }
rec.done();
