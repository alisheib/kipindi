/**
 * J · #15 — THE BONUS SYSTEM, PROVED END TO END ON PRODUCTION, WITH THE LEDGER AS THE WITNESS.
 *
 *   node scripts/live-bonus-j.mjs locked      # 0 money moves — the bonus is NOT withdrawable
 *   node scripts/live-bonus-j.mjs queue       # grant 2,000 x1 — it must land QUEUED
 *   node scripts/live-bonus-j.mjs promote     # cancel the stale grant; the queued one activates
 *   node scripts/live-bonus-j.mjs settle      # ONE qualifying bet -> turnover met -> unlocked
 *   node scripts/live-bonus-j.mjs withdraw    # the unverified payout, to the registered number
 *
 * ⭐ WHY THIS IS A SECOND FILE AND NOT FIVE MORE LEGS IN `live-bonus-live-proof.mjs`.
 * That drive proves the RULES (one side counts, a hedge does not, a free exit takes its credit
 * back). These five legs prove the LIFECYCLE, they run in a fixed order, and every one of them
 * reads production's own database before and after. Bolting them onto a file whose legs are
 * independent would have made the order look optional, and it is not.
 *
 * ── ⛔ WHAT I MEASURED BEFORE WRITING A LINE, BECAUSE THE WORK ORDER HAD TWO OF THEM BACKWARDS
 *
 *  1. **Turnover accrues at BET PLACEMENT, not at settlement** — `market-service.ts:1266`,
 *     inside `buyPosition`. So the brief's *"a bet that settles, completes the wagering
 *     requirement"* has the order wrong: the requirement completes the instant the stake is
 *     accepted, and settlement happens afterwards to the position, not to the grant.
 *  2. **Cash is spent FIRST** — `:1034`, `realPart = min(stake, realAvail)`. A funded player's
 *     bonus is therefore NOT consumed by the qualifying bet, and survives to be converted.
 *     ⚠️ A player funded BELOW the stake would spend the bonus instead, `remainingTzs` would
 *     reach 0, and the unlock would move NOTHING while still reporting FULFILLED. The fixture's
 *     balance is a precondition of this proof, so `settle` asserts it rather than assuming it.
 *  3. **`sequentialBonuses` is TRUE in production** — and not because the file says so.
 *     `SystemConfig` holds NO bonus row at all (measured 2026-08-26), so `DEFAULT_BONUS_CONFIG`
 *     IS the live value. A new grant to a player who already holds an ACTIVE one therefore
 *     lands **QUEUED** and can never fulfil. ⛔ The obvious plan — "grant a fresh one at
 *     multiplier 1 so a single bet completes it" — would have produced a QUEUED row, a drive
 *     waiting for a fulfilment that cannot happen, and a census showing 0/2,000 forever.
 *
 * ── ⛔ WHY THE WITHDRAWAL LEG IS SAFE, AND IT IS MEASURED RATHER THAN HOPED
 *
 * Ali's ruling, 2026-08-26: the withdrawal leg goes to the **FLEET NUMBER ONLY**, and to
 * `fleet:01` specifically — because `+255799000001` is the number **measured refused by BOTH
 * rails** on 2026-08-25 (`WALLET_CASHIN:FAILED → SELCOM_PESA:FAILED`, the hold released,
 * nothing needed recovering), while real numbers in the same table pay real named people.
 * ⛔ Not "a number in the fleet block" — that is a guess about a population. The one that has
 * actually been refused.
 * ⭐ And since `E-215` the destination is not a choice at all: `withdraw()` refuses any msisdn
 * that is not the account's registered number, so running as `fleet:01` IS the ruling.
 *
 * ── B × J · THE PLAYER MUST BE UNVERIFIED, and this is checked, not assumed
 * The integration matrix requires the withdrawal leg to run with no KYC anywhere in the path,
 * or it proves the retired flow. `fleet:01` holds **no `KycSubmission` row at all** (measured;
 * the only fleet member who has one is `fleet:07`, and it never left IN_PROGRESS). Every leg
 * that pays asserts this in the same run.
 *
 * ⛔ THE DOM IS NOT THE PROOF. Every claim about money is read from `Wallet`, `BonusGrant` and
 * `Transaction` on production. The page is only ever the thing being DRIVEN.
 */
import { readFileSync } from "node:fs";
import { BASE, browser, login, bodyText, shot, recorder, fleetPersona } from "./live/harness.mjs";
import { connect } from "./live/db.cjs";

const CMD = process.argv[2] ?? "locked";
const PLAYER = process.env.PLAYER ?? "01";
const me = fleetPersona(PLAYER);
const E164 = `+255${me.phone}`;

/** The fresh grant: multiplier 1 so ONE legal stake completes the requirement. */
const GRANT_TZS = Number(process.env.GRANT_TZS ?? 2_000);
const MULT = Number(process.env.MULT ?? 1);
/** The qualifying stake — equal to the requirement, and one of the card's own presets. */
const STAKE = GRANT_TZS * MULT;
/** How much selection window a browser drive needs to finish inside. */
const MIN_WINDOW_S = Number(process.env.MIN_WINDOW_S ?? 300);
/**
 * The `relock` leg needs a poll it can bet into AND exit from inside the free grace, so it
 * wants hours of betting time rather than the 5 minutes a settle-and-watch drive needs.
 * ⛔ Below `freeExitGraceMinutes` of runway AT THE MOMENT OF THE BET, `cashOutValue` returns
 * `sellable: false` with reason `TOO_SHORT` and no exit is ever offered.
 */
const RELOCK_MIN_WINDOW_S = Number(process.env.RELOCK_MIN_WINDOW_S ?? 1_800);

const rec = recorder(`LIVE BONUS · J · ${CMD} · ${me.label} (${E164})`);

// ── production database ──────────────────────────────────────────────────────
// `qa:bonus-live` runs plain `node`, with no `railway run` wrapper, so DATABASE_URL is absent.
// The ops probes already solve this by reading `scripts/live/ops/.env` (gitignored); do the
// same rather than inventing a second convention.
if (!process.env.DATABASE_URL) {
  for (const line of readFileSync(new URL("./live/ops/.env", import.meta.url), "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
}
const sql = await connect();
const N = (v) => Number(v ?? 0);

/** The wallet and its counters, straight off production. Every figure `::text` or `::numeric`. */
async function state() {
  const { rows } = await sql.query(`
    select u.id uid, w.id wid,
           w.balance::numeric balance, w."bonusBalance"::numeric bonus, w.hold::numeric hold,
           (select count(*)::int from "Transaction" t where t."userId" = u.id and t.type::text = 'WITHDRAWAL')   withdrawals,
           (select count(*)::int from "Transaction" t where t."userId" = u.id and t.type::text = 'BONUS_CREDIT') credits,
           (select count(*)::int from "KycSubmission" k where k."userId" = u.id)                                 kyc_rows
      from "User" u join "Wallet" w on w."userId" = u.id
     where u."phoneE164" = $1`, [E164]);
  if (!rows[0]) throw new Error(`no wallet for ${E164} on production`);
  const r = rows[0];
  return { uid: r.uid, wid: r.wid, balance: N(r.balance), bonus: N(r.bonus), hold: N(r.hold),
           withdrawals: r.withdrawals, credits: r.credits, kycRows: r.kyc_rows };
}

/** Every grant this player holds, oldest first — the row, never a rendered number. */
async function grants() {
  const { rows } = await sql.query(`
    select g.id, g.status, g."amountTzs"::numeric amount, g."wagerMultiplier"::numeric mult,
           g."wagerRequiredTzs"::numeric required, g."wageredTzs"::numeric wagered,
           g."remainingTzs"::numeric remaining, g."fulfilledAt"::text fulfilled,
           g."expiresAt"::text expires,
           g."createdAt"::text created, g.note
      from "BonusGrant" g join "User" u on u.id = g."userId"
     where u."phoneE164" = $1 order by g."createdAt" asc`, [E164]);
  return rows.map((g) => ({ ...g, amount: N(g.amount), mult: N(g.mult), required: N(g.required),
                            wagered: N(g.wagered), remaining: N(g.remaining) }));
}

const describe = (g) => `${g.id} ${g.status} ${g.amount}x${g.mult} wagered ${g.wagered}/${g.required} remaining ${g.remaining}`;

/** ⭐ B × J, asserted in every leg that pays rather than once in a comment. */
const assertUnverified = (s) =>
  rec.check("B × J · the player holds NO KycSubmission — this is the unverified path",
    s.kycRows === 0, `kyc rows = ${s.kycRows}`);

// ─────────────────────────────────────────────────────────────────────────────
// locked — the bonus is NOT withdrawable, and nothing moves proving it
// ─────────────────────────────────────────────────────────────────────────────
/**
 * ⛔ NO MONEY MOVES IN THIS LEG, BY CONSTRUCTION.
 *  1. every server-action POST the page makes is intercepted and ABORTED, so the legitimate
 *     withdrawal the product built is never delivered;
 *  2. the ONE request that is allowed through is the rewritten replay, whose amount is
 *     `balance + 1` — above the spendable balance and therefore refused BEFORE the hold;
 *  3. the wallet is read from the database before and after and must be identical.
 * ⭐ The claim is not "a big withdrawal is refused" — that is trivially true. It is that the
 * bonus sitting in the same wallet did not help: at this moment the player holds real money
 * AND bonus money, and `balance + 1` is comfortably inside `balance + bonus`.
 */
async function locked() {
  const before = await state();
  rec.check("0: the wallet holds BOTH real and bonus money — otherwise this leg proves nothing",
    before.balance > 0 && before.bonus > 0, `balance ${before.balance} · bonus ${before.bonus}`);
  assertUnverified(before);

  const ask = before.balance + 1;
  rec.note(`asking for ${ask} — one shilling above the spendable balance, and ${before.balance + before.bonus - ask} BELOW balance+bonus`);

  const { b, ctx } = await browser({});
  const page = await ctx.newPage();
  let captured = null;
  try {
    await login(page, `fleet:${PLAYER}`);

    // 🔴 ABORT EVERY SERVER-ACTION POST, NOT THE FIRST ONE. `live-payout-destination.mjs`
    // records what "the first POST with this header" cost: opening the confirm dialog fires
    // `lookupWithdrawPayeeAction`, which is also a server action, so the LOOKUP was killed and
    // the genuine withdrawal sailed through — on production, on a funded account.
    const seen = [];
    await page.route("**/*", async (route) => {
      const req = route.request();
      if (req.method() === "POST" && req.headers()["next-action"] && !req.headers()["x-qa-replay"]) {
        seen.push({ url: req.url(), headers: req.headers(), body: req.postData() ?? "",
                    ct: req.headers()["content-type"] ?? "" });
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(`${BASE}/wallet/withdraw`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3_000);

    // ── 1 · the screen's own declared ceiling excludes the bonus ──────────────
    // ⭐ `page.tsx:181` computes `max={Math.min(WITHDRAW_MAX_TZS, wallet?.balance ?? 0)}`.
    // Reading it off the live DOM and comparing against the DATABASE's balance is a
    // cross-check through two systems that do not share code, not a self-consistency check.
    const ceiling = await page.evaluate(() => {
      const el = document.querySelector('input[name="amount"], #amount');
      return el ? { max: el.getAttribute("max"), value: el.value } : null;
    });
    rec.check("1: the withdraw form declares a maximum at all", !!ceiling?.max, JSON.stringify(ceiling));
    rec.check("1: ★★ and that maximum is the REAL balance — the bonus is not offered",
      N(ceiling?.max) === before.balance,
      `page max ${ceiling?.max} · db balance ${before.balance} · db bonus ${before.bonus} (sum would be ${before.balance + before.bonus})`);

    await shot(page, "j-locked-withdraw-form");

    // ── 2 · capture the product's own POST ───────────────────────────────────
    // ⚠️ A DISTINCTIVE PROBE AMOUNT. The replay rewrites the amount inside a multipart body,
    // and a round number risks colliding with the action id's hex or another field's value.
    const PROBE = 3_571;
    await page.evaluate((amt) => {
      const a = document.querySelector('input[name="amount"], #amount');
      if (a) {
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        set.call(a, String(amt));
        a.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const p = document.querySelector('input[name="provider"]');
      if (p && !p.checked) p.click();
    }, PROBE);
    await page.waitForTimeout(400);
    // ⚠️ TWO controls, in order, and they are not the same button: the trigger only OPENS the
    // dialog; the dialog's own "Send funds" calls `form.requestSubmit()`.
    await page.getByRole("button", { name: /confirm withdrawal|thibitisha kutoa|确认提现/i }).first().click().catch(() => {});
    await page.waitForTimeout(1_200);
    await page.getByRole("button", { name: /send funds|tuma pesa|发送资金/i }).first().click().catch(() => {});
    await page.waitForTimeout(3_000);

    // Identify the submission by its ENCODING — a property of being a form post — not by the
    // order it arrived in, and not by a field name (Next prefixes every field with its action
    // index, so `name="amount"` never appears; `name="2_amount"` does).
    const forms = seen.filter((p) => /multipart\/form-data/i.test(p.ct));
    rec.check("2: exactly ONE of the page's POSTs is a multipart form submission",
      forms.length === 1, `${forms.length} multipart of ${seen.length} intercepted`);
    rec.check("2: every POST the page made was ABORTED — none was delivered",
      seen.length > 0, `${seen.length} intercepted, 0 delivered`);
    captured = forms.length === 1 ? forms[0] : null;

    // ── 3 · the rewritten replay, and the SERVER must refuse it ──────────────
    let hostile = { status: 0, text: "", sent: false, rewritten: false };
    if (captured) {
      // ⛔ REWRITE THE FIELD, NOT THE FILE. `body.split(String(PROBE)).join(...)` would edit
      // any other occurrence of those digits too. Anchor on the multipart part header so the
      // only thing that can change is the amount the player asked for.
      const re = /(name="[^"]*amount"\r?\n\r?\n)(\d+)/;
      const rewritten = captured.body.replace(re, (_m, head) => `${head}${ask}`);
      const changed = re.test(captured.body) && rewritten !== captured.body;
      rec.check("3: the amount field was located and rewritten in the captured body",
        changed, changed ? `${PROBE} → ${ask}` : "no `name=\"…amount\"` part found — the replay would have proved nothing");
      if (changed) {
        hostile = await page.evaluate(async ({ url, headers, body }) => {
          const h = {};
          for (const [k, v] of Object.entries(headers)) {
            if (["host", "content-length", "connection"].includes(k.toLowerCase())) continue;
            h[k] = v;
          }
          h["x-qa-replay"] = "1";                 // the one request the route handler lets pass
          const res = await fetch(url, { method: "POST", headers: h, credentials: "include", body });
          return { status: res.status, text: await res.text(), sent: true, rewritten: true };
        }, { url: captured.url, headers: captured.headers, body: rewritten });
      }
    }
    // ⚠️ 303, not 200 — `withdrawAction` `redirect()`s on refusal, and a redirecting server
    // action answers 303. The claim worth making is that it ANSWERED.
    rec.check("3: the server answered the replay rather than crashing",
      hostile.sent && hostile.status >= 200 && hostile.status < 400, `HTTP ${hostile.status}`);

    // 🔴 AND THE FIRST VERSION OF THE NEXT CHECK FAILED AGAINST A CORRECT SERVER, which is
    // worth keeping rather than quietly fixing. A redirecting server action answers with an
    // RSC FLIGHT PAYLOAD, and the refusal travels inside it as the redirect's query string —
    // so the message is PERCENT-ENCODED (`Insufficient%20balance.`) and a plain
    // `/insufficient balance/i` cannot match it. The payload also opens with ~6 KB of chunk
    // URLs, so a 6,000-character slice never reached the interesting part either. ⛔ Two
    // instrument bugs, one honest product. Decode each `%XX` individually — a whole-string
    // `decodeURIComponent` throws on the stray `%` characters a flight payload contains — and
    // read the WHOLE response.
    // ⚠️ RUNS, not single pairs. Decoding %XX one at a time cannot reassemble a multi-byte UTF-8
    // character, so the arrow in "Wallet → Bonus" printed as a raw %E2%86%92 in this drive's own
    // evidence and read like a product defect. It was the decoder. Match consecutive escapes.
    const decoded = hostile.text.replace(/(?:%[0-9A-Fa-f]{2})+/g, (m) => { try { return decodeURIComponent(m); } catch { return m; } });
    const err = /[?&]error=([^&"\\]+)/.exec(decoded);
    const sentence = err ? err[1] : "";
    rec.note(`the refusal the product actually sent: "${sentence || "(no error param found)"}"`);
    rec.check("3: ★★ …and it REFUSED — the bonus did not part-fund a payout",
      !!sentence, `${decoded.length}b decoded · error param: ${sentence || "none"}`);

    // 🔴 `E-223`, FOUND HERE. The first run of this leg got back *"That didn't go through.
    // Check the details and try again."* — the generic `errInvalid`, because the refusal
    // carried no `reason`. ⛔ The refusal must now name the WITHDRAWABLE figure (the real
    // balance) and say that the rest is a bonus that has not been played through.
    // ⚠️ The figure is compared against the DATABASE's balance, not against whatever the page
    // rendered — the two must agree, and only the database is evidence.
    const withdrawable = before.balance.toLocaleString("en-US");
    const total = (before.balance + before.bonus).toLocaleString("en-US");
    rec.check("3: ★★ `E-223` · the refusal SAYS SOMETHING — not the generic 'that didn't go through'",
      !!sentence && !/didn't go through/i.test(sentence), sentence);
    rec.check(`3: ★★ …and it names the WITHDRAWABLE balance, TZS ${withdrawable}`,
      sentence.includes(withdrawable), sentence);
    rec.check(`3: ★★ …and never offers the wallet TOTAL of TZS ${total}, which the player cannot have`,
      !sentence.includes(total), sentence);
    rec.check("3: ★ …and it explains that the rest is a bonus, which is the only answer the player can act on",
      /bonus/i.test(sentence), sentence);
  } finally { await ctx.close(); await b.close(); }

  // ── 4 · the ledger's answer, which is the one that counts ─────────────────
  const after = await state();
  rec.check("4: ★★ NOTHING MOVED — balance, hold, bonus and the withdrawal count are identical",
    after.balance === before.balance && after.hold === before.hold &&
    after.bonus === before.bonus && after.withdrawals === before.withdrawals,
    `balance ${before.balance}→${after.balance} · hold ${before.hold}→${after.hold} · ` +
    `bonus ${before.bonus}→${after.bonus} · withdrawals ${before.withdrawals}→${after.withdrawals}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// the grant form — ONE driver, because two legs mint through it
// ─────────────────────────────────────────────────────────────────────────────
/**
 * ⭐ EXTRACTED FROM `queue` RATHER THAN COPIED, and the reason is a rule this campaign has
 * paid for repeatedly: a duplicated money form gets its guards fixed in ONE copy. Every
 * check here was learned on the live page — the fields are addressed BY ARIA-LABEL (this page
 * carries SIX numeric inputs, three of them the platform's own bonus CONFIG), and the typed
 * amount and multiplier are read back BEFORE the commit, because a multiplier that silently
 * stayed at its default would mint a requirement 5× what the caller intended while every
 * later assertion still looked plausible.
 * ⚠️ GROWTH, not ADMIN — `grantBonusToPlayerAction` calls `requireStaff("growth")`, and ADMIN
 * bypasses every domain check, so a grant issued as ADMIN proves nothing about the real path.
 * `tag` names the screenshots, so two callers cannot overwrite one another's evidence.
 */
async function mintGrantViaGrowth(tag) {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    // ⚠️ GROWTH, not ADMIN. `grantBonusToPlayerAction` calls `requireStaff("growth")`, and
    // ADMIN bypasses every domain check — a grant issued as ADMIN proves nothing about the
    // path a real officer uses.
    await login(page, "growth");
    await page.goto(`${BASE}/admin/bonuses`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5_000);

    await page.locator('input[aria-label="Player phone"]').first().fill(me.phone);
    // ⛔ BY ARIA-LABEL, NOT BY POSITION. The old leg filled `input[inputmode="numeric"]`
    // nth(0)/nth(1) page-wide, and this page carries SIX numeric inputs — three belonging to
    // the platform's own bonus CONFIG. Measured on the live page
    // (`scripts/live/probe-bonus-numfields.mjs`), nth(0) really is the grant Amount, so the
    // old selector was right — but it was right by luck of DOM order, on a form that mints
    // money. Naming the field removes the luck.
    await page.locator('input[aria-label="Amount"]').first().fill(String(GRANT_TZS));
    await page.locator('input[aria-label="Multiplier"]').first().fill(String(MULT));
    await page.locator('input[aria-label="Note (optional)"]').first()
      .fill(`QA J live proof - fleet:${PLAYER} - x${MULT} so one stake completes it`);
    await page.waitForTimeout(400);

    // ⛔ VERIFY THE FORM BEFORE COMMITTING. This mints real bonus liability, and a multiplier
    // that silently stayed at the default would produce a requirement 5x what this drive
    // intends while every later assertion still looked plausible.
    const typed = await page.evaluate(() => ({
      amount: document.querySelector('input[aria-label="Amount"]')?.value,
      mult: document.querySelector('input[aria-label="Multiplier"]')?.value,
    }));
    rec.check("1: ★ the form really carries the intended amount and multiplier before the commit",
      N(typed.amount) === GRANT_TZS && N(typed.mult) === MULT,
      `amount="${typed.amount}" multiplier="${typed.mult}" · wanted ${GRANT_TZS} x${MULT}`);
    await shot(page, `${tag}-grant-form`);

    // "Grant bonus" only OPENS the confirm dialog — deliberately, because a manual grant is
    // real liability the player must play through.
    const btn = page.getByRole("button", { name: /^Grant bonus$/i }).first();
    await btn.waitFor({ state: "visible", timeout: 30_000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ timeout: 30_000 });
    await page.waitForTimeout(800);
    const dlg = page.locator('[role="dialog"], [role="alertdialog"]').first();
    await dlg.waitFor({ state: "visible", timeout: 15_000 });
    await shot(page, `${tag}-confirm`);
    await dlg.getByRole("button", { name: /yes, grant/i }).first().click({ timeout: 20_000 });
    await page.waitForTimeout(4_000);
    await shot(page, `${tag}-after`);
  } finally { await ctx.close(); await b.close(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// queue — a second grant must QUEUE, and production has never seen one
// ─────────────────────────────────────────────────────────────────────────────
/**
 * ⭐ THE SEQUENTIAL RULE HAS NEVER RUN ON PRODUCTION. Both live grants were issued to players
 * who held nothing, so both went straight to ACTIVE and `shouldQueue` has never been true here.
 * This leg is the first time §6 of the Management Bonus Rules is exercised in a real wallet.
 * ⚠️ It is also a precondition of `settle`: a fresh grant behind an ACTIVE one cannot fulfil.
 */
async function queue() {
  const before = await state();
  const gBefore = await grants();
  const active = gBefore.filter((g) => g.status === "ACTIVE");
  rec.check("0: the player already holds exactly one ACTIVE grant — the condition being tested",
    active.length === 1, gBefore.map(describe).join(" | ") || "(none)");

  await mintGrantViaGrowth("j-queue");

  const gAfter = await grants();
  const fresh = gAfter.filter((g) => !gBefore.some((o) => o.id === g.id));
  rec.check("2: exactly one new grant row exists", fresh.length === 1,
    fresh.map(describe).join(" | ") || "(none created)");
  const g = fresh[0];
  rec.check("3: ★★ it landed QUEUED, not ACTIVE — the sequential rule, exercised on production for the first time",
    g?.status === "QUEUED", g ? describe(g) : "no grant");
  rec.check("4: …with the requirement this drive asked for, frozen on the row",
    g?.required === GRANT_TZS * MULT && g?.mult === MULT, g ? describe(g) : "");

  const after = await state();
  // ⭐ `creditBonus` only adds to `bonusBalance` when the grant is ACTIVE — the invariant
  // being `bonusBalance == Σ ACTIVE remainingTzs`. A QUEUED grant that moved the wallet would
  // mean the player could stake money the platform has not yet released.
  rec.check("5: ★★ the wallet did NOT move — a QUEUED grant is not yet spendable",
    after.bonus === before.bonus && after.balance === before.balance,
    `bonus ${before.bonus}→${after.bonus} · balance ${before.balance}→${after.balance}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// promote — cancelling the stale grant must activate the queued one
// ─────────────────────────────────────────────────────────────────────────────
/**
 * ⚠️ THIS CANCELS A REAL GRANT AND CLAWS ITS MONEY BACK OUT OF A WALLET. It is QA money —
 * `fleet:01`'s 10,000 x5 from 2026-08-14, note "QA session-3 live proof", 0 turnover ever
 * accrued — and cancelling is the documented officer action with its own audit entry.
 * ⭐ It is also the only way to reach `activateNextQueued`, which has never run on production.
 */
async function promote() {
  const before = await state();
  const gBefore = await grants();
  const stale = gBefore.find((g) => g.status === "ACTIVE");
  const queued = gBefore.find((g) => g.status === "QUEUED");
  rec.check("0: there is exactly one ACTIVE grant to cancel and one QUEUED behind it",
    !!stale && !!queued && gBefore.filter((g) => g.status === "ACTIVE").length === 1,
    gBefore.map(describe).join(" | "));
  rec.check("0: ⛔ the grant about to be cancelled has NEVER accrued turnover — no player progress is destroyed",
    stale?.wagered === 0, stale ? describe(stale) : "");
  if (!stale || !queued) { rec.done(); return; }

  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, "growth");
    await page.goto(`${BASE}/admin/bonuses`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5_000);

    // ⛔ FIND THE ROW BY WHAT IT IS. The ledger renders one Cancel per ACTIVE grant and the
    // grant id is NOT on the page, so `.first()` is a guess about ordering on a control that
    // removes money from a wallet. Scope to the row that names this player AND this amount,
    // and refuse to click if that does not identify exactly one.
    const rows = page.locator("tbody tr").filter({ hasText: new RegExp(me.label.replace(/\s+/g, "\\s+"), "i") });
    const cancels = rows.locator('button:has-text("Cancel")');
    const n = await cancels.count();
    rec.check("1: exactly one cancellable row belongs to this player", n === 1, `${n} Cancel control(s) in this player's rows`);
    if (n !== 1) throw new Error(`refusing to click: ${n} candidate rows`);
    await shot(page, "j-promote-before");
    await cancels.first().click({ timeout: 20_000 });
    const dlg = page.locator('[role="dialog"], [role="alertdialog"]').first();
    await dlg.waitFor({ state: "visible", timeout: 15_000 });
    await dlg.getByRole("button", { name: /yes, cancel grant/i }).first().click({ timeout: 20_000 });
    await page.waitForTimeout(4_000);
    await shot(page, "j-promote-after");
  } finally { await ctx.close(); await b.close(); }

  const gAfter = await grants();
  const staleNow = gAfter.find((g) => g.id === stale.id);
  const queuedNow = gAfter.find((g) => g.id === queued.id);
  rec.check("2: the stale grant is CANCELLED", staleNow?.status === "CANCELLED", staleNow ? describe(staleNow) : "gone");
  rec.check("3: ★★ …and the QUEUED grant was promoted to ACTIVE by `activateNextQueued` — never run on production before",
    queuedNow?.status === "ACTIVE", queuedNow ? describe(queuedNow) : "gone");

  const after = await state();
  // The wallet's bonus balance is the invariant: Σ ACTIVE remainingTzs. The cancelled grant's
  // remainder leaves; the promoted grant's arrives. Both, in one action.
  rec.check("4: ★★ the bonus wallet re-baselined to the promoted grant exactly",
    after.bonus === GRANT_TZS,
    `bonus ${before.bonus} → ${after.bonus} · expected ${GRANT_TZS} (cancelled ${stale.remaining}, activated ${queued.amount})`);
  rec.check("5: …and the REAL balance was not touched by any of it",
    after.balance === before.balance, `balance ${before.balance}→${after.balance}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// settle — one qualifying bet, the unlock, and the round settling
// ─────────────────────────────────────────────────────────────────────────────
/** The Up & Down round that both accepts a bet and settles soonest. */
async function pickRound() {
  const { rows } = await sql.query(`
    select r."marketId" mkt, a.symbol, ch."durationMinutes" mins,
           extract(epoch from (m."selectionClosedAt" - (now() at time zone 'utc')))::int window_s,
           extract(epoch from (r."boundaryAt"        - (now() at time zone 'utc')))::int boundary_s
      from "UpDownRound" r
      join "PredictionMarket" m on m.id = r."marketId"
      join "UpDownChain" ch on ch.id = r."chainId"
      left join "UpDownAsset" a on a.id = ch."assetId"
     where m.status = 'LIVE' and ch.state = 'RUNNING'
       and m."selectionClosedAt" > (now() at time zone 'utc') + ($1 || ' seconds')::interval
     order by r."boundaryAt" asc limit 1`, [String(MIN_WINDOW_S)]);
  return rows[0] ?? null;
}

/**
 * ⭐ WHY UP & DOWN AND NOT A POLL MARKET. The soonest LIVE poll market resolves in three days,
 * so "settle" could only ever have been asserted, not watched. An Up & Down round settles on
 * real price data within its own duration — so this leg watches the whole lifecycle rather
 * than promising the second half to a later session.
 * ⚠️ AND ITS BET CARD IS NOT THE POLL CARD. `/markets/<id>` for a UD round renders a PRESET
 * LADDER (1K/2K/5K/10K) and ONE gold control — `Confirm Up · TZS 2,000` — which is the money
 * commit itself, with no dialog behind it. `live-bonus-live-proof.mjs`'s `placeBet()` matches
 * `/Place YES|NO/`, a MARKET-lexicon word that does not exist on this page: it would have
 * timed out and read as a broken bet form. Learned from the live page with
 * `scripts/live/probe-ud-market-card.mjs`, not from the source.
 */
async function settle() {
  const before = await state();
  const gBefore = await grants();
  const g0 = gBefore.find((g) => g.status === "ACTIVE");

  // ⛔ NEVER BET TWICE. The first run of this leg placed a REAL 2,000 stake, unlocked the
  // grant, and then crashed on a read-back query — `Position` has `placedAt`, not `createdAt`.
  // Re-running it blindly would have staked another 2,000 into a grant that was already
  // FULFILLED, buying nothing. ⭐ A money leg has to be safe to re-run after it half-fails,
  // because half-failing is exactly when somebody re-runs it. If the work is already done,
  // verify instead of repeating.
  if (!g0 && gBefore.some((g) => g.status === "FULFILLED")) {
    rec.note("an ACTIVE grant no longer exists and a FULFILLED one does — the stake has already been placed.");
    rec.note(`verifying instead of betting again. To watch a specific round settle: MKT=<id> node scripts/live-bonus-j.mjs verify`);
    return verify();
  }
  rec.check("0: there is exactly one ACTIVE grant, and one legal stake completes it",
    !!g0 && g0.required === STAKE, g0 ? describe(g0) : "(no ACTIVE grant)");
  // ⛔ THE PRECONDITION THAT DECIDES WHETHER THIS PROOF MEANS ANYTHING. Cash is spent first,
  // so a balance above the stake keeps the bonus intact for the unlock to move. Below it, the
  // bet would spend the bonus, `remainingTzs` would hit 0, and the grant would report
  // FULFILLED having credited nothing.
  rec.check("0: ★ the real balance exceeds the stake — so the bet is CASH-funded and the bonus survives to be converted",
    before.balance > STAKE, `balance ${before.balance} · stake ${STAKE}`);
  rec.check("0: the bonus wallet holds exactly the grant that is about to be unlocked",
    before.bonus === g0?.amount, `bonus ${before.bonus} · grant ${g0?.amount}`);
  if (!g0 || g0.required !== STAKE) { rec.done(); return; }

  const round = await pickRound();
  rec.check("1: an Up & Down round is open long enough to bet into and settles soonest",
    !!round, round ? `${round.mkt} ${round.symbol} ${round.mins}m · window ${round.window_s}s · settles in ${round.boundary_s}s`
                   : `no round with >= ${MIN_WINDOW_S}s of selection left`);
  if (!round) { rec.done(); return; }
  rec.note(`betting ${STAKE} on ${round.symbol} ${round.mins}m (${round.mkt}) — boundary in ${round.boundary_s}s`);

  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${PLAYER}`);
    // `?side=YES` selects UP server-side; the card renders it through the UPDOWN lexicon.
    await page.goto(`${BASE}/markets/${round.mkt}?side=YES`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(7_000);

    // The preset ladder speaks in K. 2,000 is "2K".
    //
    // 🔴 `getByRole("button")` CANNOT MATCH THESE, AND THE PROBE IS WHY I BELIEVED IT COULD.
    // The chips are `<button type="button" role="radio">` (`round-stake-panel.tsx:176-177`) —
    // a real `<button>` element carrying an EXPLICIT radio role, inside a `radiogroup`.
    // `scripts/live/probe-ud-market-card.mjs` enumerated them with
    // `document.querySelectorAll("button")` and duly printed `"2K"`, so the ladder looked
    // reachable; Playwright resolves roles through the ACCESSIBILITY TREE, where an explicit
    // `role` wins over the tag. The first run timed out for 30s on a control that was visible
    // the whole time and reported it as a missing bet form.
    // ⭐ THE PROBE AND THE DRIVER WERE ASKING TWO DIFFERENT QUESTIONS OF ONE ELEMENT — the DOM
    // question and the ARIA question — and §3's rule is exactly this: ask for a control by
    // what it IS. The probe now prints the explicit role for this reason.
    const preset = `${STAKE / 1000}K`;
    const chip = page.getByRole("radio", { name: new RegExp(`^${preset}$`) }).first();
    await chip.waitFor({ state: "visible", timeout: 30_000 });
    await chip.click({ timeout: 20_000 });
    await page.waitForTimeout(1_000);

    // ⛔ READ THE CONTROL BEFORE CLICKING IT. There is no confirm dialog on this surface — the
    // gold button IS the money commit — so the only chance to check the amount is now.
    // ⚠️ And require it to be the ONLY one. `.first()` on a money control is an ordering guess,
    // which is the mistake that cost a real withdrawal in `live-payout-destination.mjs`.
    const confirms = page.locator('button[aria-label*="TZS" i]');
    const nConfirm = await confirms.count();
    rec.check("2: exactly ONE button on the page names a TZS amount — no ordering guess",
      nConfirm === 1, `${nConfirm} candidate control(s)`);
    if (nConfirm !== 1) throw new Error(`refusing to click: ${nConfirm} money controls match`);
    const confirm = confirms.first();
    const label = await confirm.getAttribute("aria-label");
    const wants = new RegExp(`TZS\\s*${STAKE.toLocaleString("en-US")}\\s*$`);
    rec.check("2: ★★ the one-click commit names the intended stake before it is clicked",
      !!label && wants.test(label), `aria-label="${label}" · wanted "… TZS ${STAKE.toLocaleString("en-US")}"`);
    await shot(page, "j-settle-before-commit");
    if (!label || !wants.test(label)) throw new Error("refusing to click a money control that does not name the intended stake");

    await confirm.click({ timeout: 25_000 });
    await page.waitForTimeout(6_000);
    await shot(page, "j-settle-after-commit");
    rec.note(`page after commit: ${(await bodyText(page)).slice(0, 180)}`);
  } finally { await ctx.close(); await b.close(); }

  // Hand the round to the verifier, which is also reachable on its own after a half-failure.
  return verifyRound(round.mkt, round.boundary_s, before, g0);
}

/**
 * Everything `settle` asserts AFTER the stake lands — split out because the first live run
 * placed a real 2,000 bet, unlocked the grant, and then DIED on a read-back query, leaving the
 * money moved and the proof unwritten.
 * ⛔ A verification step that can only run as the tail of a money step is a step you cannot
 * repeat, and the only way to re-reach it was to bet again.
 * ⚠️ `before` and `g0` are optional. Without them the ABSOLUTE facts are asserted rather than
 * the deltas — and those are the stronger claims anyway: a grant that is FULFILLED with
 * `remaining = 0`, exactly one CONFIRMED `BONUS_CREDIT` for its full amount, and a bonus wallet
 * at zero do not depend on remembering what the wallet held ten minutes ago.
 */
async function verifyRound(mkt, boundarySecs, before, g0) {
  // ── 3 · the position, read from production ───────────────────────────────
  // ⚠️ `placedAt`, NOT `createdAt`. `Position` has no `createdAt` column, and the first live
  // run found that out by throwing 42703 one statement after a real stake was accepted.
  const pos = (await sql.query(`
    select p.id, p.side, p.stake::numeric stake, p."bonusStakeTzs"::numeric bonus_stake, p.status
      from "Position" p join "User" u on u.id = p."userId"
     where u."phoneE164" = $1 and p."marketId" = $2 order by p."placedAt" desc limit 1`,
    [E164, mkt])).rows[0];
  rec.check("3: the stake reached production as a real Position", !!pos && N(pos.stake) === STAKE,
    pos ? `${pos.id} ${pos.side} ${pos.stake} status=${pos.status}` : "no position row");
  rec.check("3: ★ and it was funded from CASH — `bonusStakeTzs` is 0, so the grant's remainder survived",
    !!pos && N(pos.bonus_stake) === 0, pos ? `bonusStakeTzs=${pos.bonus_stake}` : "");

  // ── 4 · the unlock, off the grant row ────────────────────────────────────
  const all = await grants();
  const gAfter = g0 ? all.find((g) => g.id === g0.id) : all.find((g) => g.status === "FULFILLED");
  rec.check("4: ★★ turnover met and the grant FULFILLED — at BET PLACEMENT, not at settlement",
    gAfter?.status === "FULFILLED" && gAfter?.wagered >= gAfter?.required,
    gAfter ? describe(gAfter) : "gone");
  rec.check("4: …and nothing is left in it to unlock twice",
    gAfter?.remaining === 0 && !!gAfter?.fulfilled, gAfter ? `remaining=${gAfter.remaining} fulfilledAt=${gAfter.fulfilled}` : "");

  // ── 5 · the LEDGER, which is where the platform says WHY ─────────────────
  const credit = (await sql.query(`
    select t.id, t.type::text type, t.status::text status, t.amount::numeric amount, t.description, t.provider::text provider
      from "Transaction" t join "User" u on u.id = t."userId"
     where u."phoneE164" = $1 and t.type::text = 'BONUS_CREDIT' order by t."createdAt" desc limit 1`,
    [E164])).rows[0];
  const after = await state();
  const grantAmount = gAfter?.amount ?? g0?.amount ?? 0;
  // ⚠️ THE ABSOLUTE CLAIM FIRST, because it does not depend on remembering the wallet's earlier
  // state — and after a half-failed run there IS no earlier state to remember.
  rec.check("5: ★★ a CONFIRMED BONUS_CREDIT was written for the unspent remainder",
    credit?.status === "CONFIRMED" && N(credit?.amount) === grantAmount && /bonus unlocked/i.test(credit?.description ?? ""),
    credit ? `${credit.id} ${credit.status} ${credit.amount} "${credit.description}"` : "no BONUS_CREDIT row");
  rec.check("5: ★★ the bonus wallet is EMPTY — every shilling of the grant left it",
    after.bonus === 0, `bonusBalance=${after.bonus}`);
  if (before && g0) {
    // The deltas, when this ran as one continuous drive.
    rec.check("5: ★★ …into the withdrawable balance, and the counter moved by exactly one",
      after.credits === before.credits + 1 &&
      after.bonus === before.bonus - g0.amount && after.balance === before.balance - STAKE + g0.amount,
      `bonus ${before.bonus}→${after.bonus} (−${g0.amount}) · balance ${before.balance}→${after.balance} (−${STAKE} stake +${g0.amount} unlock) · credits ${before.credits}→${after.credits}`);
    // ⚠️ AND THE HONEST FOOTNOTE, because a reader will otherwise draw the wrong conclusion.
    rec.note(`a 1× bonus unlocks for exactly what it costs to unlock: the withdrawable ceiling is ` +
             `${before.balance} → ${after.balance}, unchanged. The bonus did not make the player richer — ` +
             `it moved ${g0.amount} from a wallet they could not withdraw from into one they can.`);
  } else {
    rec.note(`verified without a before-snapshot (the stake was placed in an earlier run): ` +
             `balance ${after.balance} · bonus ${after.bonus} · ${after.credits} BONUS_CREDIT row(s) lifetime.`);
    // ⚠️ SCOPED TO THE UNLOCK, deliberately. An earlier wording said "the withdrawable ceiling
    // is unchanged", which is true of the unlock in isolation and MISLEADING once the round
    // settles — this run's stake was refunded, so the ceiling ended 2,000 higher. Anything else
    // that moves the balance is reported at §6, where it is actually known.
    rec.note(`the UNLOCK itself is net-zero: a 1× bonus costs exactly what it releases — the player ` +
             `staked ${grantAmount} to free ${grantAmount}, moving it from a wallet they could not ` +
             `withdraw from into one they can. What the round then did to the stake is §6's business.`);
  }

  // ── 6 · and now the round settles, watched rather than asserted ──────────
  const waitS = Math.max(60, (boundarySecs ?? 0) + 420);
  const deadlineMs = Date.now() + waitS * 1000;
  let settled = null;
  while (Date.now() < deadlineMs) {
    const r = (await sql.query(`
      select m.status, r.outcome, r."settledAt"::text settled, r."voidReason" void_reason,
             r."openPrice"::numeric op, r."closePrice"::numeric cp
        from "UpDownRound" r join "PredictionMarket" m on m.id = r."marketId"
       where r."marketId" = $1`, [mkt])).rows[0];
    if (r && r.settled) { settled = r; break; }
    await new Promise((s) => setTimeout(s, 15_000));
  }
  rec.check("6: ★★ the round SETTLED on production while this drive watched",
    !!settled, settled ? `${settled.status} outcome=${settled.outcome} at ${settled.settled}`
                       : `still unsettled after waiting ${Math.round(waitS / 60)} min`);
  if (settled) {
    rec.note(`round outcome ${settled.outcome}${settled.void_reason ? ` (${settled.void_reason})` : ""} · open ${settled.op} → close ${settled.cp}`);
    const end = await state();

    // 🔴 ASK THE POSITION, NOT THE ROUND — and the first version of this block asked the round.
    // It compared `settled.outcome` against the side held and printed *"position lost"*, on a
    // run where the player had in fact been REFUNDED IN FULL and was 2,000 up. The round really
    // did resolve DOWN; the position was still VOIDed, because nobody took the other side and a
    // one-sided market refunds everyone. **The round's outcome and the position's fate are two
    // different facts**, and a drive that derives one from the other reports the opposite of
    // what happened to the money. Read `Position.status` / `finalPayout`, which is where the
    // player's own result lives.
    const settledPos = (await sql.query(`
      select p.status, p."finalPayout"::numeric payout, p.stake::numeric stake
        from "Position" p where p.id = $1`, [pos?.id ?? ""])).rows[0];
    const fate = settledPos?.status === "VOID" ? "REFUNDED"
               : N(settledPos?.payout) > 0 ? "WON" : "LOST";
    rec.note(`the POSITION's own fate: ${settledPos?.status} · finalPayout ${settledPos?.payout} on a stake of ${settledPos?.stake} → ${fate}`);
    rec.note(`balance across settlement ${after.balance} → ${end.balance}`);

    // ✅ `E-224` · FIXED 2026-08-27, AND THIS CHECK IS NOW THE PROOF RATHER THAN THE REPORT.
    // ⛔ IT USED TO ASSERT THE DEFECT (`g?.status === "FULFILLED"`), which means it went RED the
    // moment the platform became correct. That is the "assertion the fix invalidates" shape and
    // it is inverted here in the same commit as the fix.
    // The rule: a returned stake does not discharge a wagering obligation, and nothing is ever
    // clawed back — the grant is RE-LOCKED to ACTIVE, the player keeps every shilling, and only
    // the withdrawable portion moves back into the locked bonus wallet.
    if (fate === "REFUNDED") {
      const g = (await grants()).find((x) => x.id === (gAfter?.id ?? g0?.id));
      rec.check("6: ★★ `E-224` · the stake was REFUNDED, so the fulfilment was REVERSED — the grant is ACTIVE again, not FULFILLED",
        g?.status === "ACTIVE", g ? describe(g) : "");
      rec.check("6: ★★ …and the wagering progress fell BACK BELOW the requirement — that is why it re-locked",
        N(g?.wagered) < N(g?.required), g ? `wagered ${g?.wagered} · required ${g?.required}` : "");
      rec.check("6: ★ NOTHING WAS CLAWED BACK — total holdings are unchanged to the shilling across the re-lock",
        N(end.balance) + N(end.bonus) === N(after.balance) + N(after.bonus),
        `before balance+bonus ${N(after.balance) + N(after.bonus)} · after ${N(end.balance) + N(end.bonus)}`);
      rec.note(`✅ E-224 CLOSED HERE: the stake came back and the bonus RE-LOCKED. The grant returned ` +
               `to ACTIVE with its converted cash moved out of withdrawable balance and back into the ` +
               `bonus wallet, so a ${grantAmount} bonus can no longer be cleared having risked nothing. ` +
               `The player lost no money — only the WITHDRAWABLE portion moved.`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// relock — `E-224` DRIVEN ON PRODUCTION: a refunded wager does not discharge the obligation
// ─────────────────────────────────────────────────────────────────────────────
/**
 * ⛔ WHY THIS LEG HAD TO EXIST, AND WHY `settle` COULD NEVER HAVE PROVEN IT.
 * `settle`'s check 6 — the E-224 assertion — fires only when the round it bet into VOIDS
 * (`fate === "REFUNDED"`). On production that is reachable only by WAITING for a `no-move` or
 * a `source-failed` round: about one in three on XAU/15m, and effectively never on a healthy
 * chain. So E-224 shipped guarded (`test:bonus-relock` 62/0, `red:bonus-relock` 13/13) and
 * deployed (`f0521356`, serving inside `d3818929`) with its live proof left to chance — and by
 * §0's own definition it was NOT DONE: a money control that has never executed against
 * production is a hypothesis with a test suite attached.
 * ⭐ THIS LEG MAKES THE REFUND HAPPEN ON PURPOSE.
 *
 * ⭐ AND THE ROUTE IS THE FREE EXIT, NOT A VOID — which is the STRONGER proof, because the
 * free exit is `B1b`'s own exploit path: the PLAYER decides to undo the bet, not the platform.
 *   grant 2,000 ×1  →  ONE cash-funded 2,000 stake (turnover accrues at PLACEMENT —
 *   `market-service.ts:1266` — so the grant FULFILS immediately and 2,000 of locked bonus
 *   becomes withdrawable cash)  →  the free exit inside the 5-minute grace, a full refund at
 *   zero fee  →  the obligation is NOT discharged: the grant returns to ACTIVE and the 2,000
 *   moves back out of `balance` into `bonusBalance`.
 * Before `f0521356` that last arrow did not exist: `reverseWageringCore` read
 * `listActiveByUser`, whose DAL filter is `status: "ACTIVE"`, so the FULFILLED grant was not
 * skipped by a visible condition — it was INVISIBLE TO THE QUERY, and the player kept 2,000 of
 * withdrawable cash having risked nothing, repeatably, as fast as the rate limiter allows.
 *
 * ⛔ THE PLAYER MUST END EXACTLY WHERE HE STARTED, TO THE SHILLING. Ali's ruling (2026-08-26)
 * is "re-locked, not TAKEN", so the whole round trip is a NO-OP on holdings: `balance` back to
 * its opening figure and `bonusBalance` back to the grant. Check 6.1 asserts that equality and
 * it IS the ruling, not a proxy for it.
 *
 * ⚠️ FOUR PRECONDITIONS DECIDE WHETHER ANY OF THIS MEANS ANYTHING, SO EACH IS ASSERTED:
 *  · `sequentialBonuses` is TRUE on production — and not because a file says so. `SystemConfig`
 *    holds no `bonus.config` row, so `DEFAULT_BONUS_CONFIG` IS the live value, re-measured in
 *    this run. A fresh grant to a player who already holds an ACTIVE one lands QUEUED and can
 *    never fulfil, so this leg REFUSES to start unless the player holds neither ACTIVE nor
 *    QUEUED. ⛔ That is the trap the work order warned about: the obvious plan produces a
 *    QUEUED row and a drive waiting for a fulfilment that cannot happen.
 *  · Cash is spent FIRST (`market-service.ts:1034`), so the real balance must exceed the stake.
 *    Below it the bet would spend the BONUS, `remainingTzs` would reach 0, and the unlock would
 *    move nothing while still reporting FULFILLED.
 *  · The position must be cash-funded for a second, independent reason: `cashOutPosition`
 *    REFUSES a bonus-funded bet outright (`bonus_funded_no_exit`), so a bonus-funded stake
 *    cannot even reach the exit this leg drives.
 *  · `hadRunway` — the market must have at least `freeExitGraceMinutes` of BETTING time left
 *    when the stake lands, or no exit is ever offered. That is why this leg uses a poll with
 *    hours of window and not an Up & Down round, where TOO_SHORT is the ordinary branch.
 *
 * ⛔ AND IT PICKS A MARKET NOBODY ELSE IS IN. A cash-out debits the player's OWN side of the
 * pool, so betting into a poll holding other players' money would move their odds twice for
 * nothing. The picker requires `count(Position) = 0` and both pools at zero.
 *
 * ⛔ THE DOM IS NOT THE PROOF, here least of all. Every figure below is read from `Wallet`,
 * `BonusGrant`, `Position`, `Transaction`, `LedgerEntry` and `AuditLog` on production.
 */
async function pickEmptyPoll() {
  const { rows } = await sql.query(`
    select m.id, m."titleEn" title,
           extract(epoch from (coalesce(m."selectionClosedAt", m."resolutionAt") - (now() at time zone 'utc')))::int window_s
      from "PredictionMarket" m
     where m.status = 'LIVE' and m."productLine"::text <> 'UPDOWN'
       and coalesce(m."selectionClosedAt", m."resolutionAt") > (now() at time zone 'utc') + ($1 || ' seconds')::interval
       and m."yesPool" = 0 and m."noPool" = 0
       and (select count(*) from "Position" p where p."marketId" = m.id) = 0
     order by window_s asc limit 1`, [String(RELOCK_MIN_WINDOW_S)]);
  return rows[0] ?? null;
}

/** The newest transaction of a type for this player — the row the player's own wallet renders. */
async function lastTxn(type) {
  return (await sql.query(`
    select t.id, t.status::text status, t.amount::numeric amount, t.fee::numeric fee,
           t.description, t."balanceAfter"::numeric balance_after, t."createdAt"::text created
      from "Transaction" t join "User" u on u.id = t."userId"
     where u."phoneE164" = $1 and t.type::text = $2 order by t."createdAt" desc limit 1`,
    [E164, type])).rows[0] ?? null;
}

async function relock() {
  // ── 0 · the live config, re-measured, and the grants that would block the drive ──────────
  const cfgRow = (await sql.query(`select key, value from "SystemConfig" where key = 'bonus.config'`)).rows[0];
  rec.check("0: ★ `sequentialBonuses` is DEFAULT_BONUS_CONFIG's `true` because production holds NO `bonus.config` row — measured in this run, not read off a comment",
    !cfgRow, cfgRow ? `SystemConfig['bonus.config'] = ${JSON.stringify(cfgRow.value).slice(0, 200)}` : "no row — the code defaults are live");

  const g0all = await grants();
  const queued = g0all.filter((x) => x.status === "QUEUED");
  // Re-entry after a half-run: an ACTIVE grant of exactly this shape with ZERO turnover is one
  // this leg minted and did not get to spend. Reuse it rather than minting a second.
  let g = g0all.find((x) => x.status === "ACTIVE" && x.required === STAKE && x.wagered === 0 && x.remaining === GRANT_TZS);
  const otherActive = g0all.filter((x) => x.status === "ACTIVE" && x.id !== g?.id);
  rec.check("0: no QUEUED grant is in the way — under `sequentialBonuses` a queued grant can never fulfil, so a drive that waits on one waits for ever",
    queued.length === 0, g0all.map(describe).join(" | ") || "(no grants)");
  rec.check("0: no OTHER ACTIVE grant exists — a fresh grant would land QUEUED behind it",
    otherActive.length === 0, otherActive.map(describe).join(" | ") || "(none)");
  if (queued.length || otherActive.length) { rec.done(); return; }

  const preMint = await state();
  rec.check("0: ★ the real balance exceeds the stake — so the bet is CASH-funded and the bonus survives to be converted",
    preMint.balance > STAKE, `balance ${preMint.balance} · stake ${STAKE}`);
  if (!(preMint.balance > STAKE)) { rec.done(); return; }

  // ── 1 · one ACTIVE grant, minted through the officer path ────────────────────────────────
  if (g) {
    rec.note(`re-entering: an ACTIVE ${GRANT_TZS}x${MULT} grant with zero turnover already exists (${g.id}) — not minting a second one.`);
  } else {
    await mintGrantViaGrowth("j-relock");
    const gAfter = await grants();
    const fresh = gAfter.filter((x) => !g0all.some((o) => o.id === x.id));
    rec.check("1: exactly one new grant row exists", fresh.length === 1, fresh.map(describe).join(" | ") || "(none created)");
    g = fresh[0];
    rec.check("1: ★★ it landed ACTIVE, not QUEUED — with nothing ahead of it the sequential rule does not defer it",
      g?.status === "ACTIVE", g ? describe(g) : "no grant");
    rec.check("1: …carrying the requirement ONE legal stake completes, with its full amount still locked",
      g?.required === STAKE && g?.remaining === GRANT_TZS, g ? describe(g) : "");
    const s1 = await state();
    rec.check("1: the bonus wallet took the grant and the REAL balance did not move",
      s1.bonus === preMint.bonus + GRANT_TZS && s1.balance === preMint.balance,
      `bonus ${preMint.bonus}→${s1.bonus} · balance ${preMint.balance}→${s1.balance}`);
  }
  if (!g || g.status !== "ACTIVE" || g.required !== STAKE) { rec.done(); return; }

  // ⭐ THE BASELINE FOR THE RULING. Read AFTER the grant exists, so it is the same figure in
  // both the fresh and the re-entered path, and check 6.1 compares against exactly this.
  const opening = await state();
  rec.check("1: ★ the opening position is clean — the bonus wallet holds exactly this grant and nothing else",
    opening.bonus === GRANT_TZS, `bonusBalance ${opening.bonus} · grant ${GRANT_TZS}`);
  rec.note(`OPENING: balance ${opening.balance} · bonus ${opening.bonus} · hold ${opening.hold} · ${describe(g)} · expires ${g.expires ?? "never"}`);

  // ── 2 · one cash-funded qualifying stake, into a poll nobody else is in ──────────────────
  const market = process.env.MKT ? { id: process.env.MKT, title: "(MKT from env)", window_s: null } : await pickEmptyPoll();
  rec.check("2: a LIVE poll with hours of betting left and NOBODY else in it — an empty pool means the exit moves no other player's odds",
    !!market, market ? `${market.id} · window ${market.window_s == null ? "?" : Math.round(market.window_s / 60) + "m"} · ${String(market.title ?? "").slice(0, 60)}`
                     : `no empty LIVE poll with >= ${RELOCK_MIN_WINDOW_S}s of betting left`);
  if (!market) { rec.done(); return; }
  rec.note(`staking ${STAKE} (cash) on ${market.id}, then taking the FREE EXIT inside the grace`);

  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  let sold = false;
  let expiresAtFulfilment = null;
  try {
    await login(page, `fleet:${PLAYER}`);

    // ⛔ NAVIGATE TO THE SIDE, DO NOT CLICK FOR IT — the selected side is a SEARCH PARAM, and
    // clicking `Back YES at 50%` races a client transition. Learned in `live-bonus-live-proof`.
    await page.goto(`${BASE}/markets/${market.id}?side=YES`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(1_500);

    // ⚠️ BY ITS ARIA LABEL. This panel carries TWO numeric inputs — the stake and the
    // conviction multiplier — and `.first()` on a bare `inputmode` selector is a coin toss
    // between them, on a form that commits money.
    const box = page.locator('input[aria-label*="Stake amount" i]').first();
    await box.waitFor({ timeout: 30_000 });
    await box.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);
    await page.keyboard.type(String(STAKE), { delay: 30 });
    await page.waitForTimeout(400);
    // ⛔ READ IT BACK BEFORE COMMITTING. `fill` has raced this masked input's default before
    // and produced "1000100" — on a control that stakes real money.
    const typed = (await box.inputValue()).replace(/[^\d]/g, "");
    rec.check("2: ★ the stake box really reads the intended amount before the commit",
      typed === String(STAKE), `box reads "${typed}" · wanted ${STAKE}`);
    if (typed !== String(STAKE)) throw new Error(`refusing to bet: stake box reads "${typed}"`);
    await shot(page, "j-relock-before-bet");

    await page.getByRole("button", { name: /Place YES/i }).first().click({ timeout: 20_000 });
    await page.waitForTimeout(1_200);
    await page.locator('[role="dialog"], [role="alertdialog"]').locator("button")
      .filter({ hasText: /^(Confirm|Place)/i }).last().click({ timeout: 20_000 });
    await page.waitForTimeout(4_000);
    await shot(page, "j-relock-after-bet");
    rec.note(`page after the stake: ${(await bodyText(page)).slice(0, 160)}`);

    // ── 3 · the fulfilment, read from production while the grace clock runs ───────────────
    const pos = (await sql.query(`
      select p.id, p.side, p.stake::numeric stake, p."bonusStakeTzs"::numeric bonus_stake,
             p.status::text status, p."placedAt"::text placed
        from "Position" p join "User" u on u.id = p."userId"
       where u."phoneE164" = $1 and p."marketId" = $2 order by p."placedAt" desc limit 1`,
      [E164, market.id])).rows[0];
    rec.check("3: the stake landed as a real OPEN position for the intended amount",
      !!pos && pos.status === "OPEN" && N(pos.stake) === STAKE,
      pos ? `${pos.id} ${pos.side} ${pos.stake} ${pos.status} placed ${pos.placed}` : "no position row");
    rec.check("3: ★★ it is CASH-funded — `bonusStakeTzs = 0`, so the bonus was NOT consumed by the bet, and a `bonus_funded_no_exit` refusal cannot be what this leg ends up measuring",
      !!pos && N(pos.bonus_stake) === 0, pos ? `bonusStakeTzs ${pos.bonus_stake}` : "");
    if (!pos || pos.status !== "OPEN") throw new Error("no OPEN position to exit — aborting before the exit step");

    const gFul = (await grants()).find((x) => x.id === g.id);
    rec.check("3: ★★ the grant FULFILLED on PLACEMENT — turnover accrues when the stake is accepted, not at settlement",
      gFul?.status === "FULFILLED" && N(gFul?.wagered) >= N(gFul?.required), gFul ? describe(gFul) : "grant gone");
    // ⭐ THE FIELD THE PRE-FIX CODE ZEROED. It is the ONLY record of how much cash this
    // fulfilment converted, and the re-lock has nothing to move back without it. `amountTzs`
    // is not a substitute: spendBonus/refundBonus move `remainingTzs` before fulfilment.
    rec.check("3: ★★ `remainingTzs` was PRESERVED at the converted figure — `E-224`'s first half, and the number the re-lock will move back",
      N(gFul?.remaining) === GRANT_TZS, gFul ? `remainingTzs ${gFul.remaining} · converted ${GRANT_TZS}` : "");
    rec.check("3: …and `fulfilledAt` is stamped", !!gFul?.fulfilled, `fulfilledAt=${gFul?.fulfilled ?? "null"}`);
    expiresAtFulfilment = gFul?.expires ?? null;

    const mid = await state();
    rec.check("3: ★★ the conversion really moved — the bonus wallet is empty, and the real balance shows the stake leaving and the unlocked bonus arriving",
      mid.bonus === 0 && mid.balance === opening.balance - STAKE + GRANT_TZS,
      `bonus ${opening.bonus}→${mid.bonus} · balance ${opening.balance}→${mid.balance} · expected ${opening.balance - STAKE + GRANT_TZS}`);
    const credit = await lastTxn("BONUS_CREDIT");
    rec.check("3: the player is TOLD, in a CONFIRMED row the wallet page renders — not only in a column",
      credit?.status === "CONFIRMED" && N(credit?.amount) === GRANT_TZS && /wagering completed/i.test(credit?.description ?? ""),
      credit ? `${credit.id} ${credit.status} ${credit.amount} "${credit.description}" (${credit.created})` : "no BONUS_CREDIT row");
    rec.note(`AT FULFILMENT: this ${GRANT_TZS} is now WITHDRAWABLE cash · grant expires ${expiresAtFulfilment ?? "never"}`);

    // ── 4 · the free exit, inside the grace ───────────────────────────────────────────────
    // ⚠️ THE CONTROL IS CALLED "FREE EXIT", NOT "CANCEL" — read off the live page: the label is
    // a COUNTDOWN (`FREE EXIT 4:12 · No fee`) and once it lapses the button becomes
    // `Selling closed`, DISABLED. A probe matching only /cancel/ reports the feature missing.
    await page.goto(`${BASE}/markets/${market.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(1_500);
    const btn = page.getByRole("button", { name: /free exit|cancel|ghairi|取消/i }).first();
    const there = await btn.isVisible().catch(() => false);
    rec.check("4: the free-exit control is offered inside the window — `hadRunway` held, so the exit exists at all",
      there, there ? (await btn.getAttribute("aria-label").catch(() => "")) ?? "" : "no free-exit control on the page");
    if (!there) throw new Error("no free-exit control — the position would ride to settlement and this leg cannot prove the re-lock");

    // 🔴 THE QUOTE INSIDE THE DIALOG EXPIRES, AND A SCREENSHOT IS ENOUGH TO BURN IT — measured
    // in `live-bonus-live-proof.mjs`, where the first attempt shot the page, reached a modal
    // reading "This quote has expired", and reported success over a position still OPEN.
    // So: click through with nothing in the way, and reopen if the quote lapses.
    for (let attempt = 0; attempt < 3 && !sold; attempt++) {
      await btn.click({ timeout: 20_000 });
      const dlg = page.locator('[role="dialog"], [role="alertdialog"]').first();
      await dlg.waitFor({ state: "visible", timeout: 15_000 });
      const sell = dlg.getByRole("button", { name: /^Sell\b/i }).first();
      await sell.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
      if (await sell.isEnabled().catch(() => false)) { await sell.click({ timeout: 15_000 }); sold = true; }
      else {
        await dlg.getByRole("button", { name: /keep position|close/i }).first().click({ timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(600);
      }
    }
    rec.check("4: the Sell control was live, not an expired quote", sold);
    await page.waitForTimeout(6_000);
    await shot(page, "j-relock-after-exit");
  } finally { await ctx.close(); await b.close(); }
  if (!sold) { rec.done(); return; }

  // ── 5 · the refund itself ───────────────────────────────────────────────────────────────
  const posOut = (await sql.query(`
    select p.id, p.status::text status, p."finalPayout"::numeric payout, p.stake::numeric stake
      from "Position" p join "User" u on u.id = p."userId"
     where u."phoneE164" = $1 and p."marketId" = $2 order by p."placedAt" desc limit 1`,
    [E164, market.id])).rows[0];
  rec.check("5: the position is CASHED_OUT and the FULL stake came back — a free exit inside the grace is a refund at zero fee",
    posOut?.status === "CASHED_OUT" && N(posOut?.payout) === STAKE,
    posOut ? `${posOut.id} ${posOut.status} finalPayout ${posOut.payout} on a stake of ${posOut.stake}` : "no position");
  const cashout = await lastTxn("CASHOUT");
  rec.check("5: …and its transaction charged nothing", N(cashout?.fee) === 0 && N(cashout?.amount) === STAKE,
    cashout ? `${cashout.id} ${cashout.amount} fee ${cashout.fee} (${cashout.created})` : "no CASHOUT row");

  const gEnd = (await grants()).find((x) => x.id === g.id);
  const end = await state();

  // ── 6 · ⭐⭐ THE RULING ITSELF, AND IT IS ONE EQUALITY: nothing was taken ────────────────
  rec.check("6: ★★ `E-224` · NOTHING WAS CLAWED BACK — balance and bonus are back at their OPENING figures, to the shilling",
    end.balance === opening.balance && end.bonus === opening.bonus,
    `balance ${opening.balance}→${end.balance} · bonus ${opening.bonus}→${end.bonus}`);
  rec.check("6: ★★ the obligation was NOT discharged — the grant is ACTIVE again, not FULFILLED",
    gEnd?.status === "ACTIVE", gEnd ? describe(gEnd) : "grant gone");
  rec.check("6: …and `fulfilledAt` was cleared with it", !gEnd?.fulfilled, `fulfilledAt=${gEnd?.fulfilled ?? "null"}`);
  rec.check("6: ★★ the wagering progress fell BACK BELOW the requirement — that is WHY it re-locked, and it is the condition a refund must produce",
    N(gEnd?.wagered) < N(gEnd?.required), gEnd ? `wagered ${gEnd?.wagered} / required ${gEnd?.required}` : "");
  rec.check("6: ★ the re-locked amount is on the row AND in the wallet — `bonusBalance` == Σ ACTIVE `remainingTzs`, the invariant the reconciler reads",
    N(gEnd?.remaining) === GRANT_TZS && end.bonus === N(gEnd?.remaining),
    gEnd ? `remainingTzs ${gEnd.remaining} · bonusBalance ${end.bonus}` : "");

  // ── 7 · ⛔ THE EXPIRY TRAP — a clawback by the back door, found by adversarially re-reading
  // the fix rather than by designing it. A grant re-locked after its original expiry date would
  // return to ACTIVE carrying a DEAD expiry, and `expireActiveGrants` selects exactly
  // `status = ACTIVE AND expiresAt < now` — the very next sweep would REMOVE the re-locked
  // money, and the player would end with NEITHER the cash NOR the bonus.
  const nowUtc = (await sql.query(`select (now() at time zone 'utc')::text t`)).rows[0].t;
  const msLeft = gEnd?.expires ? Date.parse(gEnd.expires + "Z") - Date.parse(nowUtc + "Z") : null;
  rec.check("7: ★★ the expiry clock RESTARTED — the re-locked grant carries at least one full default window (30d) from now, so the next sweep cannot take it",
    msLeft != null && msLeft > 29.5 * 86_400_000,
    gEnd?.expires ? `expiresAt ${gEnd.expires} · now ${nowUtc} · ${(msLeft / 86_400_000).toFixed(2)} days left (was ${expiresAtFulfilment ?? "never"})` : "no expiry on the row");
  rec.check("7: ★ …and never SHORTER than what was already there — the restart may only ever lean the player's way",
    !expiresAtFulfilment || !gEnd?.expires || Date.parse(gEnd.expires + "Z") >= Date.parse(expiresAtFulfilment + "Z"),
    `was ${expiresAtFulfilment ?? "never"} · now ${gEnd?.expires ?? "never"}`);
  // ⭐ POSITIVE CONTROL IN THE SAME RUN: the sweep's own predicate, run over the WHOLE table.
  // A green above means little if some other ACTIVE grant is already sweepable — and if one is,
  // that is a finding, not a pass.
  const sweepable = (await sql.query(`
    select count(*)::int n from "BonusGrant"
     where status::text = 'ACTIVE' and "expiresAt" is not null and "expiresAt" < (now() at time zone 'utc')`)).rows[0].n;
  rec.check("7: ★ POSITIVE CONTROL · `expireActiveGrants`'s own predicate finds NOTHING to sweep anywhere on production — asserted over the whole table, not just this row",
    sweepable === 0, `ACTIVE grants with expiresAt in the past: ${sweepable}`);

  // ── 8 · the player-facing record, and the books ─────────────────────────────────────────
  const debit = await lastTxn("ADJUSTMENT_DEBIT");
  rec.check("8: the player is TOLD what happened, in the row the wallet page renders — an OUTGOING ADJUSTMENT_DEBIT, deliberately not a negative BONUS_CREDIT",
    debit?.status === "CONFIRMED" && N(debit?.amount) === -GRANT_TZS && /re-locked/i.test(debit?.description ?? ""),
    debit ? `${debit.id} ${debit.status} ${debit.amount} "${debit.description}" (${debit.created})` : "no ADJUSTMENT_DEBIT row");
  const led = (await sql.query(`
    select "groupId", count(*)::int n, sum(amount)::numeric total,
           string_agg(account || ' ' || amount::text, ' | ' order by amount) lines
      from "LedgerEntry" where "txnId" = $1 group by "groupId"`, [debit?.id ?? ""])).rows[0];
  rec.check("9: ★★ the double-entry group for the re-lock BALANCES TO ZERO — two lines, cash out of PLAYER and into PLAYER_BONUS",
    !!led && led.n === 2 && N(led.total) === 0,
    led ? `${led.groupId} · ${led.n} entries · sum ${led.total} · ${led.lines}` : "no ledger entries for the re-lock txn");

  // ⛔ THE PAYLOAD AS AN OBJECT, NOT AS TEXT. `payload::text` on a jsonb column renders
  // `{"shortfallTzs": 0}` WITH A SPACE, so a /"shortfallTzs":0/ regex can never match — and
  // that is exactly how the first live run of this leg reported two FAILs while printing the
  // correct values in its own detail line. ⭐ Assert the VALUE, never its spelling. `text` is
  // kept alongside, for evidence only.
  const auds = (await sql.query(`
    select action, payload, payload::text text, "createdAt"::text created from "AuditLog"
     where "actorId" = $1 and action in ('bonus.relocked','bonus.wagering_reversed','bonus.fulfilled')
       and "createdAt" > (now() at time zone 'utc') - interval '30 minutes'
     order by "createdAt" desc`, [opening.uid])).rows;
  const relocked = auds.find((a) => a.action === "bonus.relocked");
  const reversed = auds.find((a) => a.action === "bonus.wagering_reversed");
  const pr = relocked?.payload ?? null;
  const pv = reversed?.payload ?? null;
  rec.check("10: `bonus.relocked` was written, and it NAMES the shortfall rather than rounding it away — nothing was owed and unpaid",
    !!pr && Number(pr.owedTzs) === GRANT_TZS && Number(pr.relockedTzs) === GRANT_TZS && Number(pr.shortfallTzs) === 0,
    relocked ? relocked.text.slice(0, 320) : `only: ${auds.map((a) => a.action).join(", ") || "(none)"}`);
  // ⭐ NOT "the two keys are present" — that a re-lock RECORDS an expiry proves nothing. The
  // finding was that a re-lock can inherit a DEAD expiry and be swept away, so the audit row
  // must show the date MOVING FORWARD, which is the only version of this check that would go
  // red if the restart were removed.
  rec.check("10: …and the expiry it recorded MOVED FORWARD — the back-door clawback, closed and witnessed in the log",
    !!pr && !!pr.expiresAtWas && !!pr.expiresAtNow && Date.parse(pr.expiresAtNow) > Date.parse(pr.expiresAtWas),
    pr ? `expiresAtWas ${pr.expiresAtWas} → expiresAtNow ${pr.expiresAtNow}` : "");
  rec.check("10: `bonus.wagering_reversed` records the turnover that came back off the grant, and that exactly ONE grant re-locked",
    !!pv && Number(pv.reversed) === STAKE && Number(pv.relockedGrants) === 1 && Number(pv.relockedTzs) === GRANT_TZS,
    reversed ? reversed.text.slice(0, 260) : "no bonus.wagering_reversed row");

  await relockControl(gEnd);

  rec.note(`CLOSE: balance ${end.balance} · bonus ${end.bonus} · hold ${end.hold} · ${gEnd ? describe(gEnd) : "no grant"} · expires ${gEnd?.expires ?? "never"}`);
  rec.note(`✅ E-224 DRIVEN LIVE: a bonus that HAD been converted into withdrawable cash was RE-LOCKED when the ` +
           `bet behind it was refunded. The grant is ACTIVE, its clock restarted, and the player holds exactly what ` +
           `he held before — ${GRANT_TZS} of it locked again. Before f0521356 the FULFILLED grant was invisible to ` +
           `reverseWagering's query and this ${GRANT_TZS} would have stayed withdrawable, repeatably.`);
}

/**
 * ⭐ THE CONTROL THAT PROVES SECTION 6 CAN FAIL — WITHOUT DEPLOYING THE DEFECT.
 *
 * ⛔ A live drive cannot be made RED the way a suite can. The only way to make the platform
 * wrong again is to ship the wrong code to production, and that is not a thing anyone should
 * do to prove a point. `red:bonus-relock` (13/13) mutates the FIX offline and is the mutation
 * proof; this is the part that offline cannot give: evidence that THESE predicates, run against
 * PRODUCTION's own rows, distinguish a re-locked grant from one that was not.
 *
 * ⭐ AND THE DEFECT IS STILL ON PRODUCTION — AS DATA. A grant that FULFILLED before `f0521356`
 * had its `remainingTzs` zeroed on fulfilment and, when the bet behind it was refunded, stayed
 * FULFILLED because the row was invisible to `reverseWagering`'s query. Such a row is exactly
 * the state section 6 forbids, and it is sitting in the table. Run section 6's OWN predicates
 * against it: every one must come back FALSE.
 *
 * ⛔ PHRASED AS THE DISCRIMINATION, NOT AS THE DEFECT — which is the whole reason this reads the
 * way it does. "that grant is still broken" is an assertion a future clean-up INVALIDATES: it
 * would go red when somebody made the platform tidier, which is the exact shape of the check
 * that went red when E-224 was fixed. So the claim is about the PREDICATES, and if no such row
 * exists any more the leg prints INCONCLUSIVE rather than scoring an unproven negative green —
 * this campaign has already had one refusal-check pass because the page it examined was empty.
 */
async function relockControl(gLive) {
  const pre = (await sql.query(`
    select g.id, g.status::text status, g."amountTzs"::numeric amount,
           g."wagerRequiredTzs"::numeric required, g."wageredTzs"::numeric wagered,
           g."remainingTzs"::numeric remaining, g."fulfilledAt"::text fulfilled,
           g."createdAt"::text created
      from "BonusGrant" g
     where g.status::text = 'FULFILLED' and g."remainingTzs" = 0
     order by g."createdAt" asc limit 1`)).rows[0];

  // Section 6's four predicates, as data, so the same code judges both rows.
  const P = [
    ["the grant is ACTIVE again, not FULFILLED", (x) => x.status === "ACTIVE"],
    ["`fulfilledAt` was cleared", (x) => !x.fulfilled],
    ["progress fell back below the requirement", (x) => N(x.wagered) < N(x.required)],
    ["the converted figure survived on the row", (x) => N(x.remaining) > 0],
  ];

  if (!pre) {
    rec.note("11: ⚠️ CONTROL INCONCLUSIVE — production no longer holds a FULFILLED grant with " +
             "remainingTzs = 0, so there is no pre-fix row to discriminate against. NOT scored as a pass.");
  } else {
    const falses = P.filter(([, f]) => !f(pre));
    rec.check("11: ★★ CONTROL · every predicate section 6 asserts comes back FALSE on a grant that fulfilled under the OLD code — so section 6's green is a fact about the re-lock, not a tautology",
      falses.length === P.length,
      `${pre.id} (created ${pre.created}) ${pre.status} wagered ${pre.wagered}/${pre.required} remaining ${pre.remaining} → ${falses.length}/${P.length} predicates false`);
  }
  if (gLive) {
    const trues = P.filter(([, f]) => f(gLive));
    rec.check("11: ★ POSITIVE HALF, IN THE SAME RUN · and all four come back TRUE on the grant this drive re-locked",
      trues.length === P.length, `${describe(gLive)} → ${trues.length}/${P.length} predicates true`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// withdraw — the unverified payout, to the registered number
// ─────────────────────────────────────────────────────────────────────────────
/**
 * ⭐ WHAT THIS PROVES AND WHAT IT DOES NOT, stated plainly so nobody reads it as more.
 * PROVEN: money that entered `balance` through a bonus unlock is subject to exactly one rule
 * on the way out — `w.balance < amount` — and an account with no identity record at all is
 * paid by it, to its own registered number and nowhere else.
 * NOT PROVEN: that these particular shillings are the bonus's. Money is fungible and the
 * platform does not tag it; claiming otherwise would be the kind of sentence this campaign
 * exists to delete.
 */
async function withdraw() {
  const before = await state();
  assertUnverified(before);
  const g = (await grants()).find((x) => x.status === "FULFILLED");
  rec.check("0: the grant this payout follows is FULFILLED, and its credit is in the balance",
    !!g, g ? describe(g) : "(no fulfilled grant — run `settle` first)");
  const amount = Number(process.env.AMOUNT ?? GRANT_TZS);
  rec.check("0: the balance covers the payout", before.balance >= amount,
    `balance ${before.balance} · asking ${amount}`);
  if (!g || before.balance < amount) { rec.done(); return; }

  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${PLAYER}`);
    await page.goto(`${BASE}/wallet/withdraw`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3_000);

    // ── 1 · E-215 still holds, now over a bonus-derived balance ─────────────
    const shape = await page.evaluate(() => ({
      editable: !!document.querySelector('input[name="msisdn"]:not([type="hidden"])'),
      disabled: !!document.querySelector('input[name="msisdn"][disabled]'),
      hidden: document.querySelector('input[name="msisdn"][type="hidden"]')?.value ?? null,
      max: document.querySelector('input[name="amount"], #amount')?.getAttribute("max") ?? null,
      text: document.body.innerText.replace(/\s+/g, " "),
    }));
    rec.check("1: there is still no editable destination field", !shape.editable);
    rec.check("1: …and it was not achieved with a disabled input", !shape.disabled);
    rec.check("1: ★ the destination is the REGISTERED number — Ali's ruling, enforced by the product rather than by this script",
      shape.hidden === me.phone, `hidden=${shape.hidden} registered=${me.phone}`);
    rec.check("1: ★ and the ceiling now INCLUDES the unlocked bonus, because it is ordinary balance",
      N(shape.max) === before.balance, `page max ${shape.max} · db balance ${before.balance} · db bonus ${before.bonus}`);
    await shot(page, "j-withdraw-form");

    // ── 2 · the payout ──────────────────────────────────────────────────────
    await page.evaluate((amt) => {
      const a = document.querySelector('input[name="amount"], #amount');
      if (a) {
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        set.call(a, String(amt));
        a.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const p = document.querySelector('input[name="provider"]');
      if (p && !p.checked) p.click();
    }, amount);
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /confirm withdrawal|thibitisha kutoa|确认提现/i }).first().click({ timeout: 20_000 });
    await page.waitForTimeout(1_500);
    await shot(page, "j-withdraw-confirm");
    await page.getByRole("button", { name: /send funds|tuma pesa|发送资金/i }).first().click({ timeout: 20_000 });
    await page.waitForTimeout(6_000);
    await shot(page, "j-withdraw-after");
  } finally { await ctx.close(); await b.close(); }

  // ── 3 · the row, then its outcome ───────────────────────────────────────
  const row = (await sql.query(`
    select t.id, t.status::text status, t.amount::numeric amount, t.fee::numeric fee, t.msisdn,
           t.provider::text provider, t."createdAt"::text created
      from "Transaction" t join "User" u on u.id = t."userId"
     where u."phoneE164" = $1 and t.type::text = 'WITHDRAWAL' order by t."createdAt" desc limit 1`,
    [E164])).rows[0];
  const mid = await state();
  rec.check("3: ★★ the payout was ACCEPTED — a WITHDRAWAL row exists that did not before",
    mid.withdrawals === before.withdrawals + 1 && N(row?.amount) === -amount,
    row ? `${row.id} ${row.status} ${row.amount} fee ${row.fee} → ${row.msisdn} via ${row.provider}` : "no row");
  // ⚠️ COMPARE THE NUMBER, NOT ITS SPELLING. The first version asserted
  // `row.msisdn === me.phone` and went RED against a perfectly correct payout: the form submits
  // the 9-digit local part `799000001`, and `tzPhone` (`validators.ts:31-37`) NORMALISES it to
  // `+255799000001` before `withdraw()` stores it. Both are the same number; only one is
  // canonical, and the product picked the canonical one. ⭐ Same family as §3's whole theme —
  // the harness accusing a working money screen — and the fix is to compare the last nine
  // digits, exactly as `normalizeTzLocalDigits` does inside `payoutDestinationFor`.
  const digits = (s) => String(s ?? "").replace(/\D/g, "").slice(-9);
  rec.check("3: ★★ …and it is addressed to the account's OWN registered number",
    digits(row?.msisdn) === digits(me.phone) && digits(me.phone).length === 9,
    `stored=${row?.msisdn} → ${digits(row?.msisdn)} · registered=${me.phone}`);

  // ⭐ THE RAILS ARE EXPECTED TO REFUSE THIS NUMBER, AND THAT IS WHY IT IS SAFE — but the
  // assertion is about the PLATFORM's behaviour either way: whatever the rail answers, the
  // money must end up accounted for, with nothing stranded in `hold`.
  const deadline = Date.now() + 240_000;
  let final = row;
  while (Date.now() < deadline && final?.status === "PROCESSING") {
    await new Promise((s) => setTimeout(s, 10_000));
    final = (await sql.query(`select t.id, t.status::text status, t.amount::numeric amount from "Transaction" t where t.id = $1`, [row.id])).rows[0];
  }
  const after = await state();
  rec.note(`payout ${final?.id} settled as ${final?.status} · balance ${before.balance} → ${after.balance} · hold ${after.hold}`);
  rec.check("4: ★★ the payout reached a terminal state — nothing is stuck in flight",
    final?.status === "CONFIRMED" || final?.status === "FAILED", `status=${final?.status}`);
  rec.check("4: ★★ …and nothing is stranded in `hold`", after.hold === 0, `hold=${after.hold}`);
  if (final?.status === "FAILED") {
    rec.check("4: ★ the rails refused (as measured on 2026-08-25) and the money came BACK in full",
      after.balance === before.balance, `balance ${before.balance} → ${after.balance}`);
  } else {
    rec.check("4: the rails paid, and exactly the amount left the balance",
      after.balance === before.balance - amount, `balance ${before.balance} → ${after.balance}, asked ${amount}`);
  }
}

/**
 * The verification half of `settle`, reachable on its own.
 *
 * ⭐ IT EXISTS BECAUSE THE FIRST LIVE RUN NEEDED IT. `settle` placed a real 2,000 stake, the
 * grant fulfilled, a CONFIRMED `BONUS_CREDIT` was written — and then the drive threw 42703 on
 * a read-back column that does not exist, so every money event had happened and none of it was
 * asserted. ⛔ Without this command the only route back to the proof was to bet again.
 *
 * `MKT=<roundId>` picks the round; with no `MKT` it finds this player's most recent OPEN or
 * settled position and uses that round.
 */
async function verify() {
  let mkt = process.env.MKT ?? "";
  if (!mkt) {
    const { rows } = await sql.query(`
      select p."marketId" mkt from "Position" p join "User" u on u.id = p."userId"
       where u."phoneE164" = $1 order by p."placedAt" desc limit 1`, [E164]);
    mkt = rows[0]?.mkt ?? "";
  }
  rec.check("0: a round to verify was identified", !!mkt, mkt || "no position found for this player");
  if (!mkt) return;
  // How long to keep watching: whatever is left until this round's boundary, from the DATABASE's
  // clock rather than this laptop's, which runs ~93s slow.
  const { rows } = await sql.query(`
    select extract(epoch from (r."boundaryAt" - (now() at time zone 'utc')))::int secs
      from "UpDownRound" r where r."marketId" = $1`, [mkt]);
  const secs = Math.max(0, rows[0]?.secs ?? 0);
  rec.note(`verifying ${mkt} — boundary ${secs > 0 ? `in ${secs}s` : `${-secs}s ago`}`);
  return verifyRound(mkt, secs, null, null);
}

/**
 * Re-assert the payout WITHOUT making another one.
 *
 * ⭐ WHY THIS IS NOT JUST "RUN `withdraw` AGAIN". The `withdraw` leg's own assertion about the
 * destination was written wrong — it compared the stored msisdn against the 9-digit local part
 * while `tzPhone` had canonicalised it to E.164 — and re-running the leg to prove the CORRECTED
 * assertion would have pushed a second real payout through production to fix a bug in a string
 * comparison. ⛔ An instrument's own repair must not cost a money movement.
 */
async function payout() {
  const s = await state();
  assertUnverified(s);
  const row = (await sql.query(`
    select t.id, t.status::text status, t.amount::numeric amount, t.fee::numeric fee, t.msisdn,
           t.provider::text provider, t."createdAt"::text created
      from "Transaction" t join "User" u on u.id = t."userId"
     where u."phoneE164" = $1 and t.type::text = 'WITHDRAWAL' order by t."createdAt" desc limit 1`,
    [E164])).rows[0];
  rec.check("0: this account has a payout to inspect", !!row,
    row ? `${row.id} ${row.status} ${row.amount} → ${row.msisdn} (${row.created})` : "no WITHDRAWAL row");
  if (!row) return;
  const digits = (v) => String(v ?? "").replace(/\D/g, "").slice(-9);
  rec.check("1: ★★ it is addressed to the account's OWN registered number, compared as a NUMBER not a spelling",
    digits(row.msisdn) === digits(me.phone) && digits(me.phone).length === 9,
    `stored=${row.msisdn} → ${digits(row.msisdn)} · registered=${me.phone}`);
  rec.check("2: ★★ it reached a terminal state — nothing stuck in flight",
    row.status === "CONFIRMED" || row.status === "FAILED", `status=${row.status}`);
  rec.check("3: ★★ nothing is stranded in `hold`", s.hold === 0, `hold=${s.hold}`);
  const g = (await grants()).find((x) => x.status === "FULFILLED");
  rec.check("4: ★ and the grant behind it is still FULFILLED with nothing left to unlock",
    g?.status === "FULFILLED" && g?.remaining === 0, g ? describe(g) : "no fulfilled grant");
  rec.note(`payout ${row.id} · ${row.status} · ${row.amount} fee ${row.fee} via ${row.provider} · wallet balance ${s.balance} bonus ${s.bonus} hold ${s.hold}`);
}

const CMDS = { locked, queue, promote, settle, verify, relock, "relock-control": () => relockControl(null), withdraw, payout };
if (!CMDS[CMD]) throw new Error(`unknown command "${CMD}" — ${Object.keys(CMDS).join(" | ")}`);
try {
  await CMDS[CMD]();
} finally {
  await sql.end();
}
console.log(`\n  ⛔ Read the GRANT ROW, not any page:\n     node scripts/live/ops/bonus-census.cjs ${PLAYER}\n`);
rec.done();
