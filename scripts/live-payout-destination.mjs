/**
 * `E-215` LIVE — REPLAY THE REAL WITHDRAWAL SERVER-ACTION POST WITH THE DESTINATION REWRITTEN.
 *
 *   npm run qa:payout-destination
 *
 * ⛔ DRIVING THE FORM WOULD PROVE ONLY THAT THE WIDGET IS SAFE. The withdraw screen no longer
 * offers a destination field at all, so pointing a browser at it and finding no way to type
 * another number demonstrates exactly nothing about the SERVER — which is where the law
 * actually lives, and which two operator retry paths reach with no form anywhere in sight.
 * So this captures the genuine server-action POST the product itself builds, rewrites the
 * msisdn inside it, and replays it with the player's own cookies. Same technique as
 * `scripts/live-recategorise.mjs` leg 3.
 *
 * ── 🔴 HOW THIS AVOIDS MOVING REAL MONEY, WHICH IS NOT INCIDENTAL ──────────────────
 * This runs on production against a funded account, so a mistake here PAYS SOMEBODY.
 *
 *  1. **The legitimate POST is never delivered.** It is intercepted by `page.route()` and
 *     ABORTED, so the request the product built with the correct destination dies in the
 *     browser. Nothing valid ever reaches `withdraw()`.
 *  2. **Only the REWRITTEN request is sent** — and it must be refused. If the seal works, no
 *     money moves because the payout is rejected before the balance is touched.
 *  3. ⚠️ **The rewritten destination is another QA FLEET number, never a stranger's.** If the
 *     seal were broken, the exposure is a minimum-size payout aimed at an account this
 *     campaign owns and can see — not at a member of the public. ⛔ Do not "improve" this by
 *     using a realistic third-party number: the whole point of a control test is that failure
 *     is survivable.
 *  4. **The wallet is read from the DATABASE before and after** and must be identical, and the
 *     `WITHDRAWAL` row count must not move. ⭐ That is the assertion that actually proves it —
 *     an HTTP body saying "refused" is the product's claim about itself, and this campaign has
 *     been lied to by enough instruments to want the ledger's answer too.
 *
 * ⚠️ `LIVE_BASE` must be production for this to mean anything, and it defaults there.
 */
import { BASE, login, browser, recorder, fleetPersona } from "./live/harness.mjs";
import { connect } from "./live/db.cjs";

/** The account that will attempt the withdrawal — a funded QA fleet player. */
const WHO = process.env.QA_FLEET_ID ?? "01";
/** Where the hostile replay will try to send it. ⛔ A fleet account, deliberately. */
const HOSTILE_NN = "02";

const r = recorder(`E-215 · the payout destination, replayed on ${BASE}`);

const me = fleetPersona(WHO);
const myE164 = `+255${me.phone}`;
const hostileE164 = `+255${fleetPersona(HOSTILE_NN).phone}`;

const sql = await connect();
const readState = async () => {
  const w = await sql.query(
    `select w.balance::text as balance, w.hold::text as hold,
            (select count(*)::int from "Transaction" t
              where t."userId" = u.id and t.type::text = 'WITHDRAWAL') as withdrawals
       from "User" u join "Wallet" w on w."userId" = u.id
      where u."phoneE164" = $1`, [myE164]);
  return w.rows[0];
};

const before = await readState();
r.check("0: the account is readable and funded", !!before && Number(before.balance) > 5000,
  before ? `balance ${before.balance} · hold ${before.hold} · ${before.withdrawals} withdrawals` : "no row");

const { b, ctx: boot } = await browser({});
await boot.close();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

let captured = null;
try {
  await login(page, `fleet:${WHO}`);

  // 🔴 ABORT **EVERY** SERVER-ACTION POST THIS PAGE MAKES — not the first one, every one.
  //
  // 🔴 THIS COST A REAL WITHDRAWAL, AND THE MISTAKE IS THE ORDINARY ONE. The first version
  // captured "a POST carrying a `next-action` header" and aborted it, then let everything after
  // it continue. But opening the confirm dialog fires `lookupWithdrawPayeeAction`, which is
  // ALSO a server action — so the payee LOOKUP was captured and killed, and the genuine
  // withdrawal POST that followed sailed straight through. On production, on a funded account:
  // TZS 2,000 left the balance into `hold` and a real `WITHDRAWAL` row was written. (It went to
  // the account's OWN registered number, the rails refused it seconds later with
  // `PROVIDER_DOWN`, and the balance came back to 194,740.00 with hold 0.00 — but that is luck
  // reporting a good outcome, not a control.) ⛔ **"The first POST with this header" was a
  // guess about the population, and the population had two members.**
  //
  // The fix is to make delivery IMPOSSIBLE rather than selective: nothing this page submits ever
  // reaches the server, so the ONLY request `withdraw()` can ever see is the rewritten replay
  // below — which must be refused. Aborting the payee lookup too is harmless: it is best-effort
  // by design and a miss simply shows the number without a name.
  const seen = [];
  await page.route("**/*", async (route) => {
    const req = route.request();
    // ⚠️ The replay in §3 is itself a `next-action` POST, so it would be aborted by this
    // very handler — "TypeError: Failed to fetch", which reads like the server refusing the
    // hostile request and is nothing of the kind. It carries `x-qa-replay` so exactly one
    // request is let through: mine. Everything the PAGE submits stays undeliverable.
    if (req.method() === "POST" && req.headers()["next-action"] && !req.headers()["x-qa-replay"]) {
      seen.push({ url: req.url(), headers: req.headers(), body: req.postData() ?? "",
                  ct: req.headers()["content-type"] ?? "" });
      return route.abort();
    }
    return route.continue();
  });

  await page.goto(`${BASE}/wallet/withdraw`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_500);

  // ── 1 · THE SCREEN STATES THE DESTINATION RATHER THAN ACCEPTING ONE ──────────
  const shape = await page.evaluate(() => {
    const editable = document.querySelector('input[name="msisdn"]:not([type="hidden"])');
    const hidden = document.querySelector('input[name="msisdn"][type="hidden"]');
    return {
      editable: !!editable,
      // ⚠️ `disabled` is checked SEPARATELY from absence. The owner ruled out a greyed box
      // explicitly, and "there is no field" and "there is a field you may not touch" are
      // different products even though both stop the typing.
      disabledField: !!document.querySelector('input[name="msisdn"][disabled]'),
      hiddenValue: hidden ? hidden.value : null,
      text: document.body.innerText.replace(/\s+/g, " "),
    };
  });
  r.check("1: there is no editable destination field", !shape.editable);
  r.check("1: ⛔ …and it was not achieved with a disabled input", !shape.disabledField);
  r.check("1: the form carries the REGISTERED number", shape.hiddenValue === me.phone,
    `hidden=${shape.hiddenValue} registered=${me.phone}`);
  r.check("1: ⭐ and the screen says WHY, not merely that it may not be changed",
    /only go to the number registered|iliyosajiliwa|注册的号码/i.test(shape.text));

  // ── 2 · CAPTURE THE REAL SERVER-ACTION POST ─────────────────────────────────
  const amount = 2000;
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
  await page.waitForTimeout(400);
  // ⚠️ TWO controls, in order, and they are NOT the same button. `WithdrawConfirm` renders a
  // trigger labelled "Confirm withdrawal" that only OPENS the dialog; the dialog's own
  // "Send funds" is what calls `form.requestSubmit()`. Clicking the first and waiting for a
  // POST would time out on a page that is working perfectly.
  await page.getByRole("button", { name: /confirm withdrawal|thibitisha kutoa|确认提现/i })
    .first().click().catch(() => {});
  await page.waitForTimeout(1_200);
  await page.getByRole("button", { name: /send funds|tuma pesa|发送资金/i })
    .first().click().catch(() => {});
  await page.waitForTimeout(3_000);

  // ⚠️ IDENTIFY THE WITHDRAWAL POST BY WHAT IT IS, not by the order it arrived in.
  // Measured on production rather than assumed: this page fires FOUR server-action POSTs, and
  // three are `text/plain` (two empty `[]` revalidations and the payee lookup
  // `[{"provider":"MPESA","msisdn":"799000001"}]`). Only the real form submission is
  // `multipart/form-data`. ⛔ The first attempt matched on `name="amount"` and found nothing,
  // because Next prefixes every form field with its action index — the parts are
  // `name="1_$ACTION_ID_…"`, `name="2_amount"` and so on, never the bare field name. Match the
  // ENCODING, which is a property of being a form submission, not a guess about field naming.
  for (const p of seen) {
    r.note(`captured next-action POST · ct=${(p.ct || "?").slice(0, 40)} · ${p.body.length}b · ${p.body.replace(/\s+/g, " ").slice(0, 120)}`);
  }
  const forms = seen.filter((p) => /multipart\/form-data/i.test(p.ct));
  // ⚠️ Exactly one, or the discriminator is not one. Two multipart POSTs would mean rewriting
  // whichever came first — the same ordering guess that cost a real withdrawal.
  r.check("2: exactly ONE of them is a multipart form submission", forms.length === 1,
    `${forms.length} multipart of ${seen.length} total`);
  captured = forms.length === 1 ? forms[0] : null;

  r.check("2: every server-action POST from the page was ABORTED — none was delivered",
    seen.length > 0, `${seen.length} intercepted, 0 delivered`);
  r.check("2: the withdrawal's own POST was identified among them", !!captured,
    captured ? `ct=${captured.ct.slice(0, 40)}` : `${seen.length} POST(s), none matched the form shape`);
  r.check("2: the captured body carries the registered number",
    !!captured?.body?.includes(me.phone), captured ? `${captured.body.length}b` : "not captured");

  // ── 3 · 🔴 THE HOSTILE REPLAY — the SERVER must refuse ──────────────────────
  let hostile = { status: 0, text: "", sent: false };
  if (captured?.url && captured?.body?.includes(me.phone)) {
    hostile = await page.evaluate(async ({ url, headers, body, mine, theirs }) => {
      const h = {};
      for (const [k, v] of Object.entries(headers)) {
        if (["host", "content-length", "connection"].includes(k.toLowerCase())) continue;
        h[k] = v;
      }
      h["x-qa-replay"] = "1";                   // the one request the route handler lets pass
      const res = await fetch(url, {
        method: "POST", headers: h, credentials: "include",
        body: body.split(mine).join(theirs),      // the ONE thing that differs
      });
      return { status: res.status, text: (await res.text()).slice(0, 6000), sent: true };
    }, { url: captured.url, headers: captured.headers, body: captured.body,
         mine: me.phone, theirs: fleetPersona(HOSTILE_NN).phone });
  }
  // ⚠️ 303, NOT 200 — and the first version of this line asserted 200 and failed against a
  // correct server. `live-recategorise.mjs` leg 3 gets a 200 because that action RETURNS a
  // value; `withdrawAction` `redirect()`s on refusal, and a redirecting server action answers
  // 303. The claim worth making is "it answered rather than crashed or was blocked", so that
  // is what is written: any 2xx/3xx, never 0 and never a 5xx.
  r.check("3: the server ANSWERED the rewritten request rather than crashing",
    hostile.sent && hostile.status >= 200 && hostile.status < 400, `HTTP ${hostile.status}`);
  // ⚠️ Anchor on the REASON, not on the absence of a success. The refusal must name where the
  // money is allowed to go — a bare "invalid" is what the owner ruled out.
  const last4 = me.phone.slice(-4);
  r.check("3: 🔴 …and the answer REFUSES, naming the registered last four",
    /only go to the number registered|iliyosajiliwa|注册的号码/i.test(hostile.text)
      && hostile.text.includes(last4),
    `names ${last4}? ${hostile.text.includes(last4)} · ${hostile.text.replace(/\s+/g, " ").slice(0, 180)}`);
  // ⚠️ AN ASSERTION THAT WAS HERE AND SHOULD NOT HAVE BEEN, recorded rather than deleted.
  // It required that the response never echo the SUBMITTED number, and it failed — correctly,
  // against a correct product. `withdrawAction` builds `carryParams` with
  // `&msisdn=${submitted}` so a player does not retype the form after a validation error, and
  // that redirect is what the refusal travels in. ⛔ Nobody ever specified "the refusal must
  // not contain the submitted number"; I invented it, and inventing a requirement and then
  // reporting the product for breaking it is the wrong direction of this campaign's own
  // recurring defect. What Ali specified is that the refusal NAMES THE REGISTERED LAST DIGITS,
  // which the assertion above proves on production.
  //
  // ⚠️ It does leave one true observation for a later session: since `E-215` the withdraw
  // PAGE ignores `sp.msisdn` entirely, so that carry param is now dead weight on this one
  // action — harmless (nothing reads it) but misleading to a future reader. Left alone here
  // deliberately: it is a behaviour change on a money action nobody commissioned, and
  // `test:msisdn-prefill` §4 pins the carry shape on purpose.
  r.note(`the refusal redirect carries the submitted number back as a carry param (msisdn=${fleetPersona(HOSTILE_NN).phone}) — the page ignores it since E-215; noted, not asserted`);

  // ── 6 · ⭐ DEPOSIT IS THE OPPOSITE RULE, DRIVEN — "use another number" really works ──
  //
  // Ali's acceptance, verbatim in substance: *a deposit to another number still works, and
  // survives a validation error with the chosen number intact.*
  //
  // ⛔ NO MONEY MOVES, AND THAT IS BY CONSTRUCTION, NOT BY LUCK. The amount submitted is
  // deliberately BELOW `DEPOSIT_MIN_TZS` (500), and `deposit/actions.ts:62` refuses on the
  // amount bound BEFORE `dispatchDeposit` is reached — so the round-trip this leg needs is the
  // only thing that happens.
  //
  // 🔴 AND IT RUNS AS `alpha`, NOT AS THE FLEET ACCOUNT — a precondition, measured rather than
  // assumed. Deposits are gated behind a verified email address, and **no QA fleet account has
  // one**: `/wallet/deposit` as `fleet:01` renders "Add an email address to your account —
  // you'll need one to add money" and no form at all. The first version of this leg ran there
  // and reported "no 'use another number' control" against a page that was correct and simply
  // was not the deposit form. ⭐ Same shape as `E-177`'s blocked precondition: the account
  // could not reach the surface the claim was about. `alpha` (+255712000101) holds a VERIFIED
  // email, so it can — which is only true because `E-214` was cleared first.
  const dctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const dpage = await dctx.newPage();
  await login(dpage, "alpha");
  const alphaMsisdn = "712000101";
  await dpage.goto(`${BASE}/wallet/deposit`, { waitUntil: "domcontentloaded" });
  await dpage.waitForTimeout(3_000);

  const formPresent = await dpage.locator("#msisdn").count();
  r.check("6: the deposit form is actually reachable for this account", formPresent > 0,
    formPresent ? "" : "gated — no #msisdn on the page");

  const prefilled = await dpage.locator("#msisdn").inputValue().catch(() => "");
  r.check("6: deposit opens prefilled with the registered number", prefilled === alphaMsisdn,
    `${prefilled} vs ${alphaMsisdn}`);

  // The affordance itself — a real control, not an editable box the player has to discover.
  const another = dpage.getByRole("button", { name: /use another number|tumia namba nyingine|使用其他号码/i }).first();
  r.check("6: ⭐ a real 'use another number' control is offered", (await another.count()) > 0);
  await another.click().catch(() => {});
  await dpage.waitForTimeout(600);
  const cleared = await dpage.locator("#msisdn").inputValue().catch(() => "x");
  r.check("6: …and it CLEARS the field rather than merely permitting an edit", cleared === "",
    `field="${cleared}"`);

  // Choose a different number, and force a validation error on the AMOUNT.
  const chosen = fleetPersona(HOSTILE_NN).phone;
  await dpage.fill("#msisdn", chosen);
  await dpage.evaluate(() => {
    const a = document.querySelector('input[name="amount"], #amount');
    if (a) {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      set.call(a, "1");                       // ⛔ below DEPOSIT_MIN_TZS — refused before dispatch
      a.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const p = document.querySelector('input[name="provider"]');
    if (p && !p.checked) p.click();
  });
  await dpage.waitForTimeout(400);
  await dpage.getByRole("button", { name: /confirm deposit|thibitisha amana|确认存款/i })
    .first().click().catch(() => {});
  await dpage.waitForTimeout(1_200);
  await dpage.getByRole("button", { name: /^deposit$|^weka$|^存款$/i }).first().click().catch(() => {});
  await dpage.waitForTimeout(5_000);

  const back = await dpage.evaluate(() => ({
    url: location.href,
    msisdn: (document.querySelector("#msisdn") || {}).value ?? null,
  }));
  // ⚠️ THE CLIENT REFUSED IT, AND THAT IS THE CORRECT PRODUCT — `DepositConfirm.guardOpen()`
  // toasts and never opens the dialog when the amount is out of bounds, so no POST is made.
  r.check("6: the out-of-bounds amount was refused before any request was made",
    !/error=/.test(back.url) && /\/wallet\/deposit$/.test(back.url.split("?")[0]),
    back.url.slice(0, 140));

  // 🔴 AND THE ASSERTION THAT WAS HERE BEFORE THIS ONE WAS VACUOUS, WHICH IS WORTH RECORDING.
  // It read the field after that refusal and found the chosen number still in it — and then
  // scored "the CHOSEN number survived the validation error" as a PASS. It could not have
  // failed: the form never submitted and never navigated, so the field held what had just been
  // typed into it, by the DOM, with no round-trip involved at all. ⛔ An assertion that passes
  // because nothing happened is the same defect as `… ? true : true`, and this campaign has
  // now shipped a version of it more than once.
  //
  // The round-trip is a property of the PAGE re-rendering from the error redirect's query
  // string, so drive exactly that: land on the URL `depositAction` builds and read the field.
  const errUrl = `${BASE}/wallet/deposit?error=${encodeURIComponent("Enter an amount between TZS 500 and TZS 5,000,000.")}&provider=MPESA&amount=1&msisdn=${chosen}`;
  await dpage.goto(errUrl, { waitUntil: "domcontentloaded" });
  await dpage.waitForTimeout(2_500);
  const rt = await dpage.locator("#msisdn").inputValue().catch(() => null);
  // ⭐ THE ONE THAT MATTERS: the number the player CHOSE survives the refusal. This is exactly
  // what `moneyFormMsisdn`'s error-keying is for, and why it was not rewritten.
  r.check("6: ⭐ the CHOSEN number survives the error round-trip", rt === chosen,
    `field=${rt} chosen=${chosen}`);
  r.check("6: ⛔ …and is NOT silently replaced by the registered number", rt !== alphaMsisdn,
    `field=${rt}`);
  // ⚠️ The control that proves the assertion above can fail: the SAME page with no error must
  // show the registered number instead. Without this, "the field contains the chosen number"
  // would also pass on a page that simply echoed `?msisdn=` unconditionally.
  await dpage.goto(`${BASE}/wallet/deposit`, { waitUntil: "domcontentloaded" });
  await dpage.waitForTimeout(2_500);
  const fresh = await dpage.locator("#msisdn").inputValue().catch(() => null);
  r.check("6: CONTROL · a fresh visit shows the REGISTERED number, not the chosen one",
    fresh === alphaMsisdn, `field=${fresh} registered=${alphaMsisdn}`);
  await dctx.close();
} catch (e) {
  r.check("driver completed", false, String(e.message ?? e).slice(0, 300));
} finally {
  await ctx.close();
  await b.close();
}

// ── 4 · ⭐ THE LEDGER'S OWN ANSWER — not the product's claim about itself ─────
const after = await readState();
r.check("4: ⭐ the balance did not move", before && after && before.balance === after.balance,
  `${before?.balance} → ${after?.balance}`);
r.check("4: ⭐ nothing was placed in hold", before && after && before.hold === after.hold,
  `${before?.hold} → ${after?.hold}`);
r.check("4: ⭐ no WITHDRAWAL row was created", before && after && before.withdrawals === after.withdrawals,
  `${before?.withdrawals} → ${after?.withdrawals}`);

// ── 5 · THE REFUSAL IS ON THE AUDIT CHAIN ───────────────────────────────────
const refusals = await sql.query(
  `select payload::text as payload, "createdAt"::text as at
     from "AuditLog"
    where action = 'withdraw.destination_refused'
    order by "createdAt" desc limit 3`);
r.check("5: the refusal was recorded as a compliance fact", refusals.rowCount > 0,
  `${refusals.rowCount} row(s)`);
r.check("5: …carrying the number that was submitted",
  refusals.rows.some((x) => x.payload.includes(fleetPersona(HOSTILE_NN).phone)),
  refusals.rows[0]?.payload?.slice(0, 200) ?? "none");

await sql.end();
process.exit(r.done() === 0 ? 0 : 1);
