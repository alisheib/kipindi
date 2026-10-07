/**
 * U6 live drive — the consent ledger, measured on production.
 *
 * ⛔ IT REFUSES TO REPORT UNLESS IT REACHED THE COMMIT IT WAS TOLD TO PROVE. A drive that
 * measures whatever happens to be deployed is a drive that can report a green it did not earn.
 *
 * ⭐ WHY THE DEPLOY ID IS ITSELF THE MIGRATION PROOF. Production starts with
 * `prisma migrate deploy && next start` (package.json). The migration runs BEFORE the server,
 * so a migration that fails means the container never serves, and `?dpl=` never advances to
 * this SHA. Reaching the SHA is therefore evidence the 82nd migration applied to the live
 * database — not an inference about it.
 *
 * ⭐ AND THE ASSERTION THAT ACTUALLY BELONGS TO U6: the wording the ledger stores verbatim
 * (§5.7) must be the wording the sign-up page really shows. A record of consent that quotes a
 * sentence the player was never shown is a false record, and nothing in a source-level guard
 * can see the difference — only the rendered page can.
 * ⛔ 2026-10-07 · THE SIGN-UP BOX IS REMOVED (COMPLIANCE-DECISIONS § "2026-10-07 · Marketing SMS go to
 * anyone with a phone — consent is not a condition"), so sign-up records no consent and the page must
 * show NONE of the box's three sentences, in any language — while the three stay pinned in
 * `consent-wording.ts`, because a yes recorded under them from 2026-09-28 still counts. Run against a
 * build that carries the removal; an older build fails 2b–3c, as it should.
 *
 * Run: node scripts/live/marketing-u6-consent-ledger-drive.mjs <sha>
 */
import { readFileSync } from "node:fs";

const WANT = (process.argv[2] || "").trim();
if (!WANT) {
  console.error("!! give me the commit this build should be: node scripts/live/marketing-u6-consent-ledger-drive.mjs <sha>");
  process.exit(2);
}

const BASE = "https://www.50pick.tz";
// ⛔ HeadlessChrome stays in the UA or /api/pv counts this drive as real visitors.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36";

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const get = async (path, locale) => {
  const headers = { "user-agent": UA, ...(locale ? { cookie: `kp-locale=${locale}` } : {}) };
  const r = await fetch(`${BASE}${path}`, { headers, cache: "no-store", redirect: "follow" });
  return { status: r.status, html: await r.text(), url: r.url };
};

// ── the gate: which build is this? ────────────────────────────────────────────────────────
const home = await get("/");
const dpl = (home.html.match(/data-dpl-id="([^"]+)"/) || home.html.match(/[?&]dpl=([a-z0-9]+)/) || [])[1] || "";
if (!dpl) {
  console.error("!! could not read a deploy id from /. REFUSING to report.");
  process.exit(2);
}
if (!dpl.startsWith(WANT)) {
  console.error(`!! production is serving ${dpl.slice(0, 12)}, not ${WANT}. REFUSING to report.`);
  process.exit(2);
}
console.log(`build: ${dpl.slice(0, 12)} — matches ${WANT}\n`);

ok("1 · the deploy carrying U6's migration is SERVING — `prisma migrate deploy` ran before `next start`, so the 82nd migration applied to the live database",
  home.status === 200, `GET / → ${home.status}`);

// ── the sign-up page, which since 2026-10-07 asks nothing about offers ─────────────────────
const reg = await get("/auth/register");
ok("2 · the sign-up page still serves",
  reg.status === 200, `GET /auth/register → ${reg.status}`);
ok("2b · ⛔ 2026-10-07 · the SMS-offers box is GONE from the sign-up page — no marketingOptIn field (the owner's final rule)",
  !/name="marketingOptIn"/.test(reg.html));

// ⛔ The three sentences the box showed from 2026-09-28: no page shows them any more, in ANY language — and each stays
// pinned literally in consent-wording.ts (OQ11, D3), because a yes recorded under them is still a yes.
const REMOVED = {
  sw: "Nitumie ofa na habari za 50pick kwa SMS (hiari).",
  en: "Send me 50pick offers and news by SMS (optional).",
  zh: "通过短信向我发送 50pick 的优惠和资讯（可选）。",
};
const pinned = readFileSync(new URL("../../src/lib/marketing/consent-wording.ts", import.meta.url), "utf8");
ok("3 · ⛔ the Swahili sign-up page shows none of the removed box's sentence",
  !reg.html.includes(REMOVED.sw), JSON.stringify(REMOVED.sw));
const regEn = await get("/auth/register", "en");
ok("3b · ⛔ with kp-locale=en the page shows no SMS-offers box and not the box's English sentence",
  regEn.status === 200 && !regEn.html.includes(REMOVED.en) && !/name="marketingOptIn"/.test(regEn.html), JSON.stringify(REMOVED.en));
const regZh = await get("/auth/register", "zh");
ok("3c · ⛔ with kp-locale=zh the page shows no SMS-offers box and not the box's Chinese sentence",
  regZh.status === 200 && !regZh.html.includes(REMOVED.zh) && !/name="marketingOptIn"/.test(regZh.html), JSON.stringify(REMOVED.zh));
ok("3d · ⛔ OQ11 · the removed box's three sentences STAY pinned literally in consent-wording.ts — a yes recorded under them still counts",
  Object.values(REMOVED).every((s) => pinned.includes(JSON.stringify(s).slice(1, -1))),
  Object.entries(REMOVED).filter(([, s]) => !pinned.includes(JSON.stringify(s).slice(1, -1))).map(([l]) => l).join(",") || "all pinned");
// ⭐ D2 (2026-09-27) · the form posts the language it was DRAWN in (a hidden `shownLocale`), which since 2026-10-07 decides
// only the new account's language. It must name the page's own language, on the same pages 3-3c just read.
const shownField = (html) => (html.match(/name="shownLocale" value="([a-z]+)"/) || [])[1] || null;
ok("3e · ⭐ D2 · each sign-up page posts the language it was drawn in — shownLocale sw / en / zh",
  shownField(reg.html) === "sw" && shownField(regEn.html) === "en" && shownField(regZh.html) === "zh",
  `sw page → ${shownField(reg.html)} · en page → ${shownField(regEn.html)} · zh page → ${shownField(regZh.html)}`);

// ── controls: prove this drive can fail, and is not just matching anything ────────────────
// ⛔ 3–3c are ABSENCES, so the control must prove the reader finds a sentence that IS on each page: the age line.
const AGE_LINE = { sw: "Ninathibitisha nina miaka 18+.", en: "I confirm I am 18 or older.", zh: "我确认我已满18岁。" };
ok("4 · CONTROL · each page's own age line IS found — so 3–3c's absences are measured on the real form, not an error page",
  reg.html.includes(AGE_LINE.sw) && regEn.html.includes(AGE_LINE.en) && regZh.html.includes(AGE_LINE.zh),
  "if this failed, the absences above would prove nothing");
ok("4a · CONTROL · the pre-2026-09-26 sentence is gone — it never named SMS",
  !reg.html.includes("Nipe matangazo (hiari).") && !regEn.html.includes("Send me product updates (optional)."));
ok("4b · CONTROL · the deploy-id reader is not matching everything",
  !dpl.startsWith("0000000"), `read ${dpl.slice(0, 12)}`);
ok("4c · CONTROL · the page really was read, not an empty body",
  reg.html.length > 2000, `${reg.html.length} bytes`);

console.log(`\nU6 LIVE DRIVE on ${dpl.slice(0, 12)}: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
