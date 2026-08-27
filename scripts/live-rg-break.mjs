/**
 * `E-232` · THE RESPONSIBLE-GAMBLING BREAK, DRIVEN ON PRODUCTION, IN THREE LANGUAGES.
 *
 *   node scripts/live-rg-break.mjs cool      # put a fleet account on a 1-HOUR cooling-off
 *   node scripts/live-rg-break.mjs refused   # sign back in, try to bet, READ THE REFUSAL
 *   node scripts/live-rg-break.mjs state     # just print the RG row and the account status
 *
 * ⛔ WHY COOLING-OFF AND NOT SELF-EXCLUSION, AND IT IS THE FINDING RATHER THAN A CONVENIENCE.
 * `auth-service.ts:110,827,959` **refuse login outright for `SELF_EXCLUDED`** — so a
 * self-excluded player can never reach a bet card, and the `self_excluded` refusal on the
 * betting path is unreachable for them. Login does **not** refuse `COOLED_OFF`. **So the only RG
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
import { BASE, browser, login, shot, recorder, fleetPersona } from "./live/harness.mjs";
import { connect } from "./live/db.cjs";

const CMD = process.argv[2] ?? "state";
const PLAYER = process.env.PLAYER ?? "03";
const me = fleetPersona(PLAYER);
const E164 = `+255${me.phone}`;
const STAKE = Number(process.env.STAKE ?? 2_000);
const WIDTHS = (process.env.WIDTHS ?? "360,393,768,1024,1280").split(",").map(Number);
const LOCALES = (process.env.LOCALES ?? "en,sw,zh").split(",");

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
        await box.click();
        await page.keyboard.press("ControlOrMeta+A");
        await page.keyboard.press("Delete");
        await page.keyboard.type(String(STAKE), { delay: 20 });
        await page.waitForTimeout(400);
        const commit = page.locator('button[aria-label*="YES" i][aria-label*="TZS" i]').first();
        const canCommit = await commit.isEnabled().catch(() => false);
        rec.check(`2: ${loc}@${w} · the commit control is reachable and enabled`, canCommit,
          canCommit ? "" : `aria-label="${await commit.getAttribute("aria-label").catch(() => "(absent)")}"`);
        if (!canCommit) continue;
        await commit.click({ timeout: 20_000 });
        await page.waitForTimeout(1_000);
        // The confirm dialog's button is translated; take the dialog's LAST button, which is the
        // affirmative one in this kit's ConfirmDialog, and fall back to any button naming the side.
        const cdlg = page.locator('[role="dialog"], [role="alertdialog"]').first();
        if (await cdlg.isVisible().catch(() => false)) {
          const btns = cdlg.locator("button");
          const n = await btns.count().catch(() => 0);
          if (n > 0) await btns.nth(n - 1).click({ timeout: 15_000 }).catch(() => {});
        }
        await page.waitForTimeout(4_000);

        const body = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
        /**
         * ⛔ THE CHECK THAT STOPS EVERY CHECK BELOW FROM PASSING VACUOUSLY, and it is here because
         * the first run of this leg passed *"the refusal is NOT the generic line"* on a page that
         * carried NO REFUSAL AT ALL. An absence satisfies a negative assertion, which is the
         * exact defect this campaign has now filed four times.
         */
        const anyRefusal = /break|mapumziko|休息|冷静|paused|imesitishwa|暂时|excluded|kujizuia|排除/i.test(body);
        rec.check(`3: ${loc}@${w} · ⛔ a refusal was actually RENDERED — otherwise every check below passes over an absence`,
          anyRefusal, body.slice(0, 200));
        if (!anyRefusal) { await shot(page, `rg-refused-NOTHING-${loc}-${w}`); continue; }
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

const CMDS = { cool, refused, state };
if (!CMDS[CMD]) throw new Error(`unknown command "${CMD}" — ${Object.keys(CMDS).join(" | ")}`);
try { await CMDS[CMD](); } finally { await sql.end(); }
rec.done();
