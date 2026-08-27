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
    await shot(page, "j-queue-grant-form");

    // "Grant bonus" only OPENS the confirm dialog — deliberately, because a manual grant is
    // real liability the player must play through.
    const btn = page.getByRole("button", { name: /^Grant bonus$/i }).first();
    await btn.waitFor({ state: "visible", timeout: 30_000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ timeout: 30_000 });
    await page.waitForTimeout(800);
    const dlg = page.locator('[role="dialog"], [role="alertdialog"]').first();
    await dlg.waitFor({ state: "visible", timeout: 15_000 });
    await shot(page, "j-queue-confirm");
    await dlg.getByRole("button", { name: /yes, grant/i }).first().click({ timeout: 20_000 });
    await page.waitForTimeout(4_000);
    await shot(page, "j-queue-after");
  } finally { await ctx.close(); await b.close(); }

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

const CMDS = { locked, queue, promote, settle, verify, withdraw, payout };
if (!CMDS[CMD]) throw new Error(`unknown command "${CMD}" — ${Object.keys(CMDS).join(" | ")}`);
try {
  await CMDS[CMD]();
} finally {
  await sql.end();
}
console.log(`\n  ⛔ Read the GRANT ROW, not any page:\n     node scripts/live/ops/bonus-census.cjs ${PLAYER}\n`);
rec.done();
