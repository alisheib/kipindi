/**
 * U33p · THE PUBLIC POLICY LINES, DRIVEN — Admin → System → Public policy lines (`?tab=policy`, a tab of its own) and the
 * two public pages it edits, /legal/responsible-gambling and /legal/privacy, at 1280 and at 360, on an in-memory dev boot
 * (`DISABLE_ADMIN_TOTP=true`, `rm -rf .next` first, http://localhost — never 127.0.0.1). What a suite cannot see:
 *   BEFORE — the public pages print TODAY's text in en, sw and zh: the RG §4 marketing promise under the RG page's code
 *            version; the Privacy Notice's consent-only Blackball clause, no licence bullet, its code version. ⭐ Both code
 *            versions are read from the pages' own META in the source, and every stamp this drive expects is derived
 *            from them by the stamp rule (`nextStamp`, `nextPolicyVersion`'s rule — test:policy-lines holds the rule).
 *   1280   — the card on its own tab (not on Platform): "0 of 5 lines saved.", every line unsaved and prefilled with
 *            today's words, Save held WITH its reason, the outreach note's hint saying it prints nowhere yet. A refusal
 *            with every problem at once: the RG English given a late-night promise, a phone number and an angle bracket,
 *            and the Swahili emptied — each problem under its own box in its own words, Save waiting, and the pending bar's
 *            Save taking the admin to the first problem (never a silent no-op). A save: Appendix B.2 in three languages —
 *            no problem, and ONE note (the page would stop naming the age control for players, review F13); "Saved … by
 *            QA U33p Owner", the RG page's version moved by the saved words, the Swahili saved with its numbers bound to
 *            their units. ⭐ The review tick (review F1 · F4): today's Consent words marked reviewed — "Reviewed … the page
 *            prints today's words", the Privacy version NOT moved, the tick gone, the public page unchanged. Then the
 *            Privacy lines in ONE Save (B.3 gateway, B.4 licence, B.5 Consent). A second admin saves the note; the first
 *            admin's page, opened before it, is refused under the box in words, and nothing of it saved.
 *   AFTER  — the public pages print the SAVED lines and the moved version, in en, sw and zh: the RG promise; the licence
 *            bullet with its label in bold; the new Blackball line, and no consent-only clause anywhere.
 *   360    — the card, and the sw and zh pages, with no sideways scroll.
 * Writes viewport tiles to .qa-shots/marketing-setup/u33p/ — open and read them; a pass here is not a look.
 * Usage: BASE=http://localhost:3010 node scripts/live/marketing-u33p-policy-lines-drive.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = join(".qa-shots", "marketing-setup", "u33p");
mkdirSync(SHOTS, { recursive: true });

const LF = String.fromCharCode(10);
const NBSP = String.fromCharCode(0xa0);

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Text as a reader compares it: a no-break space read as a space, every run of spaces one. */
const flat = (s) => String(s || "").split(NBSP).join(" ").split(LF).join(" ").replace(/ +/g, " ").trim();

const ADMIN_PHONE = "+255700000341";
const ADMIN_NAME = "QA U33p Owner";
/* A SECOND admin, a different account: one session per account, so a second context as the same admin would sign the
   first one out (repo memory, the single-session lesson). */
const SECOND_PHONE = "+255700000342";
const SECOND_NAME = "QA U33p Second";
const FORM = '[data-testid="policy-lines-form"]';
const POLICY_TAB = "/admin/system?tab=policy";
const lineSel = (key) => `${FORM} [data-policy-line="${key}"]`;
const boxSel = (key, l) => `${lineSel(key)} [data-policy-locale="${l}"] textarea`;
const alertSel = (key, l) => `${lineSel(key)} [data-policy-locale="${l}"] [role="alert"]`;
const HELD_IDLE = "Change a line, or tick";
const HELD_PROBLEMS = "Fix the problems shown under the lines to save.";
const STALE = "Someone saved this line since you opened the page";
const LOCALES = ["en", "sw", "zh"];
const META_WORD = { en: "Version", sw: "Toleo", zh: "版本" };
/** The EAT calendar day a save made now is stamped with. */
const TODAY = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
/** A legal page's code version — the date its own META prints, read from the source (never typed here). */
function codeVersionOf(rel) {
  const src = readFileSync(rel, "utf8");
  const at = src.indexOf("const META");
  const from = at < 0 ? -1 : src.indexOf('en: "Version ', at);
  if (from < 0) return "";
  const rest = src.slice(from + 'en: "Version '.length);
  return rest.slice(0, rest.indexOf(" "));
}
const RG_CODE = codeVersionOf("src/app/legal/responsible-gambling/page.tsx");
const PR_CODE = codeVersionOf("src/app/legal/privacy/page.tsx");
/** The stamp NEW WORDS give a page that prints `printed` now: today, or — when it already prints today (or a day ahead) —
 *  its next suffix. `nextPolicyVersion`'s rule, which test:policy-lines L4 holds. */
function nextStamp(printed) {
  const [day, n] = printed.split(".");
  return day >= TODAY ? `${day}.${Number(n || "1") + 1}` : TODAY;
}
const RG_AFTER = nextStamp(RG_CODE);
const PR_AFTER = nextStamp(PR_CODE);
/** The review tick's visible words (the card's `REVIEW_LABEL`) — clicked by its words, never `.check()`. */
const REVIEW_LABEL = "Mark today's words reviewed (the page and its version stay as they are)";

/* Today's text, as the public reads it (a no-break space read as a space — `flat`). */
const RG_TODAY = {
  en: "No marketing messages to a self-excluded player, to a player on a break until they opt in again after it ends, to a player showing a sign of harm (section 3), or to anyone under 18 or whose age we cannot confirm",
  sw: "Hakuna matangazo kwa mchezaji aliyejizuia, kwa mchezaji aliye kwenye mapumziko hadi atakapokubali tena baada ya mapumziko kuisha, kwa mchezaji anayeonyesha dalili ya madhara (sehemu ya 3), wala kwa mtu yeyote aliye chini ya umri wa miaka 18 au ambaye umri wake hatuwezi kuuthibitisha",
  zh: "不向已自我排除的玩家、处于冷静期的玩家（直至其在冷静期结束后重新同意）、出现伤害迹象的玩家（见第 3 节），以及未满 18 岁或无法确认年龄的人发送营销信息",
};
const CLAUSE = { en: "only if you agree to receive them", sw: "ikiwa tu umekubali kuzipokea", zh: "仅在您同意接收时" };
const CONSENT_TODAY_EN = "Consent: marketing communications — you can withdraw it at any time under Profile → Notifications; and Google Analytics — only if you allow it when first asked, and you can change that at any time in §7 of this policy";

/* The Appendix B drafts (the spec's "drafts for Ali — G4 and G10"), pasted as a person would: plain spaces. */
const B2 = {
  en: "No marketing messages to a self-excluded player, to a player on a break until they opt in again after it ends, to a player showing a sign of harm (section 3), or to anyone under 18. A player's age is the date of birth they gave us, checked against our identity check; for anyone who is not a 50pick player, we send only after a member of our staff has confirmed in writing that the person is 18 or older, and never without that confirmation.",
  sw: "Hakuna matangazo kwa mchezaji aliyejizuia, kwa mchezaji aliye kwenye mapumziko hadi atakapokubali tena baada ya mapumziko kuisha, kwa mchezaji anayeonyesha dalili ya madhara (sehemu ya 3), wala kwa mtu yeyote aliye chini ya umri wa miaka 18. Umri wa mchezaji ni tarehe ya kuzaliwa aliyotupa, ikilinganishwa na ukaguzi wetu wa utambulisho; kwa mtu ambaye si mchezaji wa 50pick, tunatuma tu baada ya mfanyakazi wetu kuthibitisha kwa maandishi kwamba mtu huyo ana umri wa miaka 18 au zaidi, na kamwe bila uthibitisho huo.",
  zh: "不向已自我排除的玩家、处于冷静期的玩家（直至其在冷静期结束后重新同意）、出现伤害迹象的玩家（见第 3 节），以及未满 18 岁的人发送营销信息。玩家的年龄以其向我们提供并经身份核验比对的出生日期为准；对于非 50pick 玩家，只有在我们的工作人员以书面形式确认此人已年满 18 岁后，我们才会发送，没有该确认绝不发送。",
};
const B3 = {
  en: "Blackball, our SMS gateway in Tanzania, which sends our text messages, such as one-time codes and 50pick offers and news, which you can stop at any time with the stop link in every offer or under Profile → Notifications: it receives your phone number and the text of each message, and tells us whether each message was delivered",
  sw: "Blackball, lango letu la SMS nchini Tanzania, linalotuma ujumbe wetu mfupi (SMS), kama misimbo ya matumizi ya mara moja na ofa na habari za 50pick, ambazo unaweza kuzisimamisha wakati wowote kwa kiungo cha kusimamisha kilicho katika kila ofa au kwenye Wasifu → Arifa: hupokea namba yako ya simu na maandishi ya kila ujumbe, na hutuambia kama kila ujumbe umefika",
  zh: "Blackball（坦桑尼亚），我们的短信网关：发送我们的短信，例如一次性验证码以及 50pick 的优惠和资讯——您可随时通过每条优惠短信中的退订链接或在“个人资料 → 通知”中停止接收；接收您的电话号码和每条短信的内容，并告知我们每条短信是否已送达",
};
const B4 = {
  en: "Our Gaming Board of Tanzania licence: 50pick offers and news by SMS, sent to adult Tanzanian mobile numbers under our licence — you can stop them at any time with the stop link in every offer or under Profile → Notifications, and once you stop we do not send them again unless you ask",
  sw: "Leseni yetu ya Bodi ya Michezo ya Kubahatisha Tanzania: ofa na habari za 50pick kwa SMS, zinazotumwa kwa namba za simu za Tanzania za watu wazima chini ya leseni yetu — unaweza kuzisimamisha wakati wowote kwa kiungo cha kusimamisha kilicho katika kila ofa au kwenye Wasifu → Arifa, na ukishasimamisha hatutumi tena isipokuwa ukiomba",
  zh: "我们的坦桑尼亚博彩委员会牌照：50pick 短信优惠与资讯，依据我们的牌照发送至坦桑尼亚成年人的手机号码——您可随时通过每条优惠短信中的退订链接或在“个人资料 → 通知”中停止接收；一旦停止，除非您要求，我们不会再次发送",
};
const B4_LABEL = { en: "Our Gaming Board of Tanzania licence", sw: "Leseni yetu ya Bodi ya Michezo ya Kubahatisha Tanzania", zh: "我们的坦桑尼亚博彩委员会牌照" };
const B5 = {
  en: "Consent: 50pick offers and news by SMS for anyone who asks for them, which you can withdraw at any time under Profile → Notifications; and Google Analytics — only if you allow it when first asked, and you can change that at any time in §7 of this policy",
  sw: "Ridhaa: ofa na habari za 50pick kwa SMS kwa yeyote anayeziomba, ambazo unaweza kuziondoa wakati wowote kwenye Wasifu → Arifa; na Google Analytics — ikiwa tu utairuhusu unapoulizwa mara ya kwanza, na unaweza kubadilisha uamuzi huo wakati wowote katika §7 ya sera hii",
  zh: "同意：向提出要求的任何人发送 50pick 短信优惠与资讯，您可随时在“个人资料 → 通知”中撤回；以及 Google Analytics——仅在首次询问时您同意后才会开启，您可随时在本政策第 7 条中更改",
};
const B6 = {
  en: "50pick sends offers by SMS under its gaming licence. Turn this off to stop them; it stays off.",
  sw: "50pick hutuma ofa kwa SMS chini ya leseni yake ya michezo ya kubahatisha. Zima hii ili kuzisimamisha; itabaki imezimwa.",
  zh: "50pick 依据其博彩牌照通过短信发送优惠。关闭此项即可停止接收，并保持关闭。",
};

const browser = await chromium.launch();

async function adminPage(viewport, who = { phone: ADMIN_PHONE, name: ADMIN_NAME }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("dialog", (d) => { d.accept().catch(() => {}); });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "ADMIN", phone: who.phone, name: who.name } });
  if (!r.ok()) throw new Error(`seed-admin ADMIN failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}
async function publicPage(viewport, locale) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}
async function openCard(page) {
  await page.goto(BASE + POLICY_TAB, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(FORM, { timeout: 60_000 });
  await page.locator(FORM).scrollIntoViewIfNeeded();
  await wait(400);
}
/** A legal page as a reader sees it: every bullet's words, and the whole page's words. */
async function readLegal(page, path) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("section li", { timeout: 60_000 });
  await wait(300);
  const items = await page.locator("section li").evaluateAll((els) => els.map((e) => e.textContent || ""));
  const body = (await page.locator("body").textContent().catch(() => "")) || "";
  return { items: items.map(flat), body: flat(body) };
}
const textOf = async (page, sel) => flat(await page.locator(sel).first().textContent().catch(() => ""));
const overflowOf = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function showBullet(page, startsWith) {
  const li = page.locator("section li", { hasText: startsWith }).first();
  if ((await li.count()) === 1) await li.scrollIntoViewIfNeeded().catch(() => {});
  await wait(200);
}
async function tile(page, name) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

// ── BEFORE · the public pages print today's text ─────────────────────────────────────────────────────────────────
ok("before · the code versions were read from the pages' own META", RG_CODE !== "" && PR_CODE !== "", `rg ${RG_CODE} · privacy ${PR_CODE}`);
for (const l of LOCALES) {
  const { ctx, page } = await publicPage({ width: 1280, height: 800 }, l);
  const rg = await readLegal(page, "/legal/responsible-gambling");
  ok(`before · ${l} · RG §4 prints today's marketing promise`, rg.items.includes(flat(RG_TODAY[l])));
  ok(`before · ${l} · the RG header prints its code version ${RG_CODE}`, rg.body.includes(`${META_WORD[l]} ${RG_CODE}`));
  if (l === "en") { await showBullet(page, "No marketing messages to a self-excluded"); await tile(page, "1280-00-rg-en-before"); }
  const pv = await readLegal(page, "/legal/privacy");
  ok(`before · ${l} · Privacy §4 still carries today's consent-only clause`, pv.body.includes(CLAUSE[l]));
  ok(`before · ${l} · Privacy prints no licence bullet yet`, !pv.body.includes(flat(B4_LABEL[l])));
  ok(`before · ${l} · the Privacy header prints its code version ${PR_CODE}`, pv.body.includes(`${META_WORD[l]} ${PR_CODE}`));
  if (l === "en") { await showBullet(page, "Blackball, our SMS gateway"); await tile(page, "1280-01-privacy-en-before"); }
  await ctx.close();
}

// ── 1280 · THE CARD ──────────────────────────────────────────────────────────────────────────────────────────────
{
  const { ctx, page } = await adminPage({ width: 1280, height: 800 });
  await openCard(page);
  ok("1280 · the card renders on the Public policy lines tab", (await page.locator(FORM).count()) === 1);
  ok("1280 · the tab rail offers Public policy lines", (await page.locator(`a[href="${POLICY_TAB}"]`).count()) >= 1);
  await page.goto(BASE + "/admin/system?tab=platform", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`a[href="${POLICY_TAB}"]`, { timeout: 60_000 }).catch(() => {});
  await wait(400);
  ok("1280 · its own tab only — the Platform tab does not carry the card", (await page.locator(FORM).count()) === 0);
  await openCard(page);
  const countLine = await textOf(page, `${FORM} [data-policy-count]`);
  ok("1280 · nothing saved: 0 of 5 lines saved (this drive needs a fresh in-memory boot — restart next dev)", countLine === "0 of 5 lines saved.", countLine);
  const statuses = await page.locator(`${FORM} [data-policy-status]`).evaluateAll((els) => els.map((e) => e.getAttribute("data-policy-status")));
  ok("1280 · five lines, every one unsaved", statuses.length === 5 && statuses.every((s) => s === "unsaved"), JSON.stringify(statuses));
  ok("1280 · the RG English box holds today's words", flat(await page.locator(boxSel("rg.marketing", "en")).inputValue()) === flat(RG_TODAY.en));
  ok("1280 · the Privacy version is the code's", (await textOf(page, `${FORM} [data-policy-version="privacy"]`)).includes(`Version ${PR_CODE} — the code's`));
  const save = page.locator(FORM).getByRole("button", { name: "Save policy lines" });
  ok("1280 · Save is held while nothing changed", await save.isDisabled());
  ok("1280 · …and says why beside it", (await page.locator(FORM).getByText(HELD_IDLE).count()) === 1);
  ok("1280 · the outreach note's hint says it prints nowhere yet", (await page.locator(lineSel("profile.outreachNote")).getByText("printed nowhere yet", { exact: false }).count()) === 1);
  const describedBy = (await page.locator(boxSel("rg.marketing", "sw")).getAttribute("aria-describedby").catch(() => null)) || "";
  const statusId = (await page.locator(`${lineSel("rg.marketing")} [data-policy-status]`).getAttribute("id").catch(() => null)) || "";
  ok("1280 · each box names its line's status (aria-describedby)", statusId !== "" && describedBy.split(" ").includes(statusId), `${describedBy} · ${statusId}`);
  await tile(page, "1280-02-card-nothing-saved");

  // A refusal with EVERY problem at once, each under its own box.
  await page.locator(boxSel("rg.marketing", "en")).fill(`${B2.en} We send no late-night messages. Call 0712 345 678 <b>`);
  await page.locator(boxSel("rg.marketing", "sw")).fill("");
  await wait(400);
  const enAlert = await textOf(page, alertSel("rg.marketing", "en"));
  const swAlert = await textOf(page, alertSel("rg.marketing", "sw"));
  ok("1280 · the English names the late-night promise nothing enforces yet", enAlert.includes("late-night window") && enAlert.includes("the platform does not do this yet") && !enAlert.includes(".ts"), enAlert);
  ok("1280 · …the phone number", enAlert.includes("Remove the phone number"), enAlert);
  ok("1280 · …and the markup, in the same breath", enAlert.includes("Plain text only"), enAlert);
  ok("1280 · the emptied Swahili says every language needs the line", swAlert.includes("Every language needs this line"), swAlert);
  ok("1280 · Save waits, saying to fix the problems shown", (await save.isDisabled()) && (await page.locator(FORM).getByText(HELD_PROBLEMS).count()) === 1);
  await page.locator(lineSel("rg.marketing")).scrollIntoViewIfNeeded();
  await tile(page, "1280-03-every-problem-at-once");
  // The pending bar offers its Save while the card's own is off screen: pressed with a problem, it must take the admin to it.
  const barSave = page.locator('[data-pending-state="dirty"] button').filter({ hasText: /save/i }).first();
  const offered = (await barSave.count()) === 1 && (await barSave.isVisible());
  ok("1280 · the pending bar offers its Save while the card's own is off screen", offered);
  if (offered) {
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await barSave.click();
    await wait(350);
    ok("1280 · …and, pressed with a problem, it takes the admin to the first one (never a silent no-op)",
      await page.evaluate(() => !!document.activeElement?.closest('[data-policy-line="rg.marketing"]')));
  }
  ok("1280 · …and nothing was saved", (await page.locator(`${lineSel("rg.marketing")} [data-policy-status="saved"]`).count()) === 0);

  // A save: Appendix B.2 in three languages.
  for (const l of LOCALES) await page.locator(boxSel("rg.marketing", l)).fill(B2[l]);
  await wait(400);
  ok("1280 · Appendix B.2 has no problem in any language", (await page.locator(`${lineSel("rg.marketing")} [role="alert"]`).count()) === 0);
  // F13 · B.2 replaces "whose age we cannot confirm" with the staff promise: the code still refuses a player whose age
  // cannot be read, so the card says, as a NOTE (never a refusal), that the page would stop saying so.
  const b2Notes = await page.locator(`${lineSel("rg.marketing")} [data-policy-hints] li`).allTextContents().catch(() => []);
  ok("1280 · …and ONE note under it: the page would stop saying the code refuses anyone whose age cannot be confirmed",
    b2Notes.length === 1 && b2Notes[0].includes("whose age cannot be confirmed") && b2Notes[0].includes("the page will no longer say so"), JSON.stringify(b2Notes));
  await save.click();
  await page.locator(`${lineSel("rg.marketing")} [data-policy-status="saved"]`).waitFor({ timeout: 20_000 }).catch(() => {});
  await wait(500);
  const rgStatus = await textOf(page, `${lineSel("rg.marketing")} [data-policy-status]`);
  ok("1280 · the RG line is saved, by this admin", /^Saved .+ by QA U33p Owner[.]$/.test(rgStatus), rgStatus);
  ok("1280 · 1 of 5 lines saved", (await textOf(page, `${FORM} [data-policy-count]`)) === "1 of 5 lines saved.");
  const rgVersion = await textOf(page, `${FORM} [data-policy-version="rg"]`);
  ok(`1280 · the Responsible Gambling page now prints version ${RG_AFTER}, moved by the saved words`, rgVersion.includes(`Version ${RG_AFTER}`) && rgVersion.includes("moved by saved words"), rgVersion);
  const swSaved = await page.locator(boxSel("rg.marketing", "sw")).inputValue();
  ok("1280 · the Swahili was saved with each number kept on its unit (no-break spaces)", swSaved.includes(`ya${NBSP}3`) && swSaved.includes(`miaka${NBSP}18`));
  await page.locator(lineSel("rg.marketing")).scrollIntoViewIfNeeded();
  await tile(page, "1280-04-rg-saved");

  // ⭐ F1 · F4 · today's Consent words REVIEWED as they stand: a marker with no text — the page and its version stay put.
  await page.locator(lineSel("privacy.lawfulConsent")).getByText(REVIEW_LABEL, { exact: true }).click();
  await wait(250);
  ok("1280 · ticking “Mark today's words reviewed” on the Consent bullet releases Save", !(await save.isDisabled()));
  await page.locator(lineSel("privacy.lawfulConsent")).scrollIntoViewIfNeeded();
  await tile(page, "1280-04a-consent-review-ticked");
  await save.click();
  await page.locator(`${lineSel("privacy.lawfulConsent")} [data-policy-status="reviewed"]`).waitFor({ timeout: 20_000 }).catch(() => {});
  await wait(500);
  const consentStatus = await textOf(page, `${lineSel("privacy.lawfulConsent")} [data-policy-status]`);
  ok("1280 · the Consent bullet is marked reviewed by this admin, and says the page prints today's words",
    /^Reviewed .+ by QA U33p Owner — the page prints today's words[.]$/.test(consentStatus), consentStatus);
  ok(`1280 · …the Privacy version did NOT move (still ${PR_CODE}, the code's)`, (await textOf(page, `${FORM} [data-policy-version="privacy"]`)).includes(`Version ${PR_CODE} — the code's`));
  ok("1280 · …the tick is gone — today's words are reviewed already", (await page.locator(lineSel("privacy.lawfulConsent")).getByText(REVIEW_LABEL, { exact: true }).count()) === 0);
  ok("1280 · …and its boxes still hold today's words", flat(await page.locator(boxSel("privacy.lawfulConsent", "en")).inputValue()) === flat(CONSENT_TODAY_EN));
  ok("1280 · 2 of 5 lines saved", (await textOf(page, `${FORM} [data-policy-count]`)) === "2 of 5 lines saved.");
  await page.locator(lineSel("privacy.lawfulConsent")).scrollIntoViewIfNeeded();
  await tile(page, "1280-04b-consent-reviewed");
  {
    const pub = await publicPage({ width: 1280, height: 800 }, "en");
    const pv = await readLegal(pub.page, "/legal/privacy");
    ok(`1280 · …and the public Privacy page still prints today's Consent bullet, under version ${PR_CODE}`,
      pv.items.includes(flat(CONSENT_TODAY_EN)) && pv.body.includes(`Version ${PR_CODE}`));
    await pub.ctx.close();
  }

  // The Privacy lines in ONE Save: B.3 the gateway, B.4 the licence bullet, B.5 the Consent bullet.
  for (const l of LOCALES) {
    await page.locator(boxSel("privacy.smsGateway", l)).fill(B3[l]);
    await page.locator(boxSel("privacy.lawfulLicence", l)).fill(B4[l]);
    await page.locator(boxSel("privacy.lawfulConsent", l)).fill(B5[l]);
  }
  await wait(400);
  ok("1280 · the three Privacy drafts have no problem", (await page.locator(`${FORM} [role="alert"]`).count()) === 0);
  await save.click();
  await page.waitForFunction((sel) => (document.querySelector(sel)?.textContent || "").includes("4 of 5"), `${FORM} [data-policy-count]`, { timeout: 20_000 }).catch(() => {});
  await wait(500);
  ok("1280 · 4 of 5 lines saved", (await textOf(page, `${FORM} [data-policy-count]`)) === "4 of 5 lines saved.");
  ok(`1280 · the Privacy Policy now prints version ${PR_AFTER}, moved once by the saved words`, (await textOf(page, `${FORM} [data-policy-version="privacy"]`)).includes(`Version ${PR_AFTER} — moved by saved words`));
  await page.locator(lineSel("privacy.lawfulLicence")).scrollIntoViewIfNeeded();
  await tile(page, "1280-05-privacy-saved");

  // ⛔ m1 · a page opened before somebody else's save is refused, never a quiet supersede — the server's rule, through the page.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(FORM, { timeout: 60_000 });
  await wait(400);
  {
    const second = await adminPage({ width: 1280, height: 800 }, { phone: SECOND_PHONE, name: SECOND_NAME });
    await openCard(second.page);
    for (const l of LOCALES) await second.page.locator(boxSel("profile.outreachNote", l)).fill(B6[l]);
    await wait(300);
    await second.page.locator(FORM).getByRole("button", { name: "Save policy lines" }).click();
    await second.page.locator(`${lineSel("profile.outreachNote")} [data-policy-status="saved"]`).waitFor({ timeout: 20_000 }).catch(() => {});
    await wait(300);
    const theirs = await textOf(second.page, `${lineSel("profile.outreachNote")} [data-policy-status]`);
    ok("1280 · a second admin saves the outreach note", /^Saved .+ by QA U33p Second[.]$/.test(theirs), theirs);
    await second.ctx.close();

    for (const l of LOCALES) await page.locator(boxSel("profile.outreachNote", l)).fill(`${B6[l]} ${l === "zh" ? "随时可改。" : "Read again."}`);
    await wait(300);
    await page.locator(FORM).getByRole("button", { name: "Save policy lines" }).click();
    await page.locator(alertSel("profile.outreachNote", "en")).waitFor({ timeout: 20_000 }).catch(() => {});
    await wait(400);
    const said = await textOf(page, alertSel("profile.outreachNote", "en"));
    ok("1280 · ⛔ m1 — the page opened before that save is refused under the box, in words", said.includes(STALE), said);
    ok("1280 · …and the cursor is taken there", await page.evaluate(() => !!document.activeElement?.closest('[data-policy-line="profile.outreachNote"]')));
    await page.locator(lineSel("profile.outreachNote")).scrollIntoViewIfNeeded();
    await tile(page, "1280-06-stale-page-refused");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(FORM, { timeout: 60_000 });
    const after = await textOf(page, `${lineSel("profile.outreachNote")} [data-policy-status]`);
    ok("1280 · …and nothing of it was saved: after a reload the note is the second admin's", /^Saved .+ by QA U33p Second[.]$/.test(after), after);
  }
  await ctx.close();
}

// ── AFTER · the public pages print the saved lines and the moved version ─────────────────────────────────────────
for (const l of LOCALES) {
  const { ctx, page } = await publicPage({ width: 1280, height: 800 }, l);
  const rg = await readLegal(page, "/legal/responsible-gambling");
  ok(`after · ${l} · RG §4 prints the saved promise`, rg.items.includes(flat(B2[l])));
  ok(`after · ${l} · …and no longer today's`, !rg.items.includes(flat(RG_TODAY[l])));
  ok(`after · ${l} · the RG header prints version ${RG_AFTER}`, rg.body.includes(`${META_WORD[l]} ${RG_AFTER}`));
  await showBullet(page, flat(B2[l]).slice(0, 18));
  await tile(page, `1280-07-rg-${l}-after`);
  const pv = await readLegal(page, "/legal/privacy");
  ok(`after · ${l} · Privacy §3 prints the licence bullet`, pv.items.includes(flat(B4[l])));
  const bold = flat(await page.locator("section li strong", { hasText: B4_LABEL[l] }).first().textContent().catch(() => ""));
  ok(`after · ${l} · …its label in bold`, bold === B4_LABEL[l], bold);
  ok(`after · ${l} · Privacy §3 prints the saved Consent bullet`, pv.items.includes(flat(B5[l])));
  ok(`after · ${l} · Privacy §4 prints the saved gateway line`, pv.items.includes(flat(B3[l])));
  ok(`after · ${l} · …and the consent-only clause is gone from the page`, !pv.body.includes(CLAUSE[l]));
  ok(`after · ${l} · the Privacy header prints version ${PR_AFTER}`, pv.body.includes(`${META_WORD[l]} ${PR_AFTER}`));
  await showBullet(page, B4_LABEL[l]);
  await tile(page, `1280-08-privacy-${l}-after`);
  await ctx.close();
}

// ── 360 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const { ctx, page } = await adminPage({ width: 360, height: 780 });
  await openCard(page);
  ok("360 · the card renders", (await page.locator(FORM).count()) === 1);
  ok("360 · the card carries the earlier saves (5 of 5)", (await textOf(page, `${FORM} [data-policy-count]`)) === "5 of 5 lines saved.");
  const overflow = await overflowOf(page);
  ok("360 · no sideways scroll on the card", overflow <= 1, `${overflow}px`);
  await tile(page, "360-01-card-top");
  await page.locator(lineSel("rg.marketing")).scrollIntoViewIfNeeded();
  await wait(200);
  await tile(page, "360-02-card-rg-line");
  await ctx.close();
}
for (const l of ["sw", "zh"]) {
  const { ctx, page } = await publicPage({ width: 360, height: 780 }, l);
  for (const [path, slug, start] of [["/legal/responsible-gambling", "rg", flat(B2[l]).slice(0, 18)], ["/legal/privacy", "privacy", B4_LABEL[l]]]) {
    await readLegal(page, path);
    const overflow = await overflowOf(page);
    ok(`360 · ${l} · no sideways scroll on ${path}`, overflow <= 1, `${overflow}px`);
    await showBullet(page, start);
    await tile(page, `360-03-${slug}-${l}`);
  }
  await ctx.close();
}

await browser.close();
console.log(`${LF}u33p-policy-lines-drive: ${pass} passed, ${fail} failed`);
console.log(`shots: ${SHOTS}`);
process.exit(fail > 0 ? 1 : 0);
