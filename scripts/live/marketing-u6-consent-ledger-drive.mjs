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

// ── the consent point still renders after U6 edited the registration path ─────────────────
const reg = await get("/auth/register");
ok("2 · the sign-up page still serves after U6 wired the ledger into both registration paths",
  reg.status === 200, `GET /auth/register → ${reg.status}`);
ok("2b · the marketing consent checkbox is still on it — the consent point exists",
  /name="marketingOptIn"/.test(reg.html));

// ⭐ THE ONE THAT MATTERS: what the ledger stores must be what the page SHOWS — in EVERY language.
// 🔴 Until 2026-09-26 this read only the Swahili page, and both registration paths stored the Swahili
// sentence for everybody (D2); the English and Chinese pages are now read with their own cookie.
// ⛔ Each sentence must ALSO be one the gate counts — pinned literally in consent-wording.ts (OQ11, D3).
const SHOWN = {
  sw: "Nitumie ofa na habari za 50pick kwa SMS (hiari).",
  en: "Send me 50pick offers and news by SMS (optional).",
  zh: "通过短信向我发送 50pick 的优惠和资讯（可选）。",
};
const pinned = readFileSync(new URL("../../src/lib/marketing/consent-wording.ts", import.meta.url), "utf8");
ok("3 · ⭐ the Swahili sentence the ledger stores VERBATIM is the sentence production actually shows",
  reg.html.includes(SHOWN.sw), JSON.stringify(SHOWN.sw));
const regEn = await get("/auth/register", "en");
ok("3b · ⭐ D2 · with kp-locale=en the page shows the ENGLISH sentence the ledger now stores for that player",
  regEn.status === 200 && regEn.html.includes(SHOWN.en) && !regEn.html.includes(SHOWN.sw), JSON.stringify(SHOWN.en));
const regZh = await get("/auth/register", "zh");
ok("3c · D2 · with kp-locale=zh the page shows the CHINESE sentence",
  regZh.status === 200 && regZh.html.includes(SHOWN.zh) && !regZh.html.includes(SHOWN.sw), JSON.stringify(SHOWN.zh));
ok("3d · ⛔ OQ11 · each sentence shown is one the gate COUNTS — pinned literally in consent-wording.ts",
  Object.values(SHOWN).every((s) => pinned.includes(JSON.stringify(s).slice(1, -1))),
  Object.entries(SHOWN).filter(([, s]) => !pinned.includes(JSON.stringify(s).slice(1, -1))).map(([l]) => l).join(",") || "all pinned");
// ⭐ D2 (2026-09-27) · the form posts the language it was DRAWN in (a hidden `shownLocale`), so the ledger stores
// the sentence the person ticked even when the cookie changes before submit. It must name the page's own language,
// on the same page whose sentence assertions 3-3c just read.
const shownField = (html) => (html.match(/name="shownLocale" value="([a-z]+)"/) || [])[1] || null;
ok("3e · ⭐ D2 · each sign-up page posts the language it was drawn in — shownLocale sw / en / zh beside its own sentence",
  shownField(reg.html) === "sw" && shownField(regEn.html) === "en" && shownField(regZh.html) === "zh",
  `sw page → ${shownField(reg.html)} · en page → ${shownField(regEn.html)} · zh page → ${shownField(regZh.html)}`);

// ── controls: prove this drive can fail, and is not just matching anything ────────────────
ok("4 · CONTROL · a sentence that is NOT on the page is reported absent",
  !reg.html.includes("Nitumie ofa na habari za 50pick kwa SMS (lazima)."),
  "a near-miss of the real string — if this passed, assertion 3 would be meaningless");
ok("4a · CONTROL · the pre-2026-09-26 sentence is gone — it never named SMS",
  !reg.html.includes("Nipe matangazo (hiari).") && !regEn.html.includes("Send me product updates (optional)."));
ok("4b · CONTROL · the deploy-id reader is not matching everything",
  !dpl.startsWith("0000000"), `read ${dpl.slice(0, 12)}`);
ok("4c · CONTROL · the page really was read, not an empty body",
  reg.html.length > 2000, `${reg.html.length} bytes`);

console.log(`\nU6 LIVE DRIVE on ${dpl.slice(0, 12)}: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
