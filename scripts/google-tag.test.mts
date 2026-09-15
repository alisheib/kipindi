/**
 * WHAT GOOGLE ANALYTICS MAY SEE — `npm run test:google-tag`.
 *
 * `src/lib/google-tag.ts` decides, for every address, whether the tag runs and what address it reports.
 * The notice (Privacy §4) promises: no staff page, no page opened from a password-reset, email-verification
 * or agent-invitation link, and no identifying part of an address. Each promise is a case below, and each
 * is paired with a control that must be REPORTED so a rule cannot pass by matching nothing.
 *
 * ⛔ The browser half (the tag really loads, really sends the scrubbed address, sends nothing on /admin
 * after a soft navigation) cannot be proven here; it was driven against a production build under the live
 * hostname on 2026-09-15 — see COMPLIANCE-DECISIONS 2026-09-15.
 */
import {
  GA_COOKIE_DAYS, GA_COOKIE_EXPIRES_SECONDS, GA_HOSTS, GA_MEASUREMENT_ID, GA_VIEW_MARK,
  gaExcluded, gaIsAnalyticsRequest, gaLocation, gaPath, gaReferrer, gaScrubHit,
} from "../src/lib/google-tag.ts";
import { CONSENT_DENY_DAYS, CONSENT_GRANT_DAYS, CONSENT_VERSION, parseConsent, serialiseConsent } from "../src/lib/analytics-consent.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, evidence = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${evidence ? ` — ${evidence}` : ""}`);
};
const W = "https://www.50pick.tz";

console.log("\n§1 · the tag is the account's, and only the live site reports");
ok("§1a measurement id is the one Google issued", GA_MEASUREMENT_ID === "G-W66WRL67MQ");
ok("§1b live hosts report", gaLocation(`${W}/`) === `${W}/` && gaLocation("https://50pick.tz/markets") === "https://50pick.tz/markets");
ok("§1c local, preview and look-alike hosts do not",
  ["http://localhost:3000/", "https://kipindi-production.up.railway.app/", "https://www.50pick.tz.evil.com/", "https://staging.50pick.tz/"]
    .every((h) => gaLocation(h) === null));
ok("§1d GA_HOSTS is exactly the two live names", JSON.stringify(GA_HOSTS) === JSON.stringify(["50pick.tz", "www.50pick.tz"]));
ok("§1e cookie lifetime is under Chrome's 400-day cap and in seconds", GA_COOKIE_DAYS === 395 && GA_COOKIE_EXPIRES_SECONDS === 395 * 86400);

console.log("\n§2 · excluded pages report nothing — every spelling");
const EXCLUDED = [
  "/admin", "/admin/", "/admin/players/c123", "/ADMIN/players/c123", "//admin/players", "/%61dmin/players",
  "/api/health", "/auth/admin", "/auth/2fa", "/auth/reset-password?token=abc", "/auth/verify-email?token=abc",
  "/auth/demo?email=unverified", "/agent/invite/tok_9f8e7d",
];
for (const p of EXCLUDED) ok(`§2 excluded: ${p}`, gaLocation(W + p) === null);
ok("§2 control · a look-alike prefix is NOT excluded (segment match, not string match)",
  !gaExcluded("/administrator") && !gaExcluded("/apis") && gaLocation(`${W}/agent/invitations`) !== null);
ok("§2 control · the agent landing and status pages still report", gaLocation(`${W}/agent`) === `${W}/agent` && gaLocation(`${W}/agent/status?ref=app_1`) === `${W}/agent/status`);

console.log("\n§3 · the query keeps campaign parameters only");
ok("§3a utm_* and click ids kept, in a stable order",
  gaLocation(`${W}/?utm_campaign=launch&gclid=G1&utm_source=sms`) === `${W}/?utm_source=sms&utm_campaign=launch&gclid=G1`);
const PERSONAL = ["token=abc", "phone=255700000123", "email=a%40b.tz", "ref=QAFLC8R2", "invite=INV1", "next=%2Fwallet", "q=my+name", "code=123456"];
for (const q of PERSONAL) ok(`§3b dropped: ${q}`, gaLocation(`${W}/auth/login?${q}&utm_source=x`) === `${W}/auth/login?utm_source=x`);
ok("§3c the fragment is dropped", gaLocation(`${W}/help#contact-me`) === `${W}/help`);
ok("§3 control · an unknown parameter is dropped even though no rule names it (allow-list, not deny-list)",
  gaLocation(`${W}/markets?brand_new_secret=1`) === `${W}/markets`);

console.log("\n§4 · a personal record id in the path is masked");
ok("§4a receipt", gaLocation(`${W}/wallet/receipt/tx_abc123`) === `${W}/wallet/receipt/:id`);
ok("§4b position, with a trailing segment", gaLocation(`${W}/positions/pos_77/share`) === `${W}/positions/:id/share`);
ok("§4c a doubled slash cannot shift the id past the mask", !String(gaLocation(`${W}/positions//pos_77`)).includes("pos_77"));
ok("§4 control · public content ids are kept (a market is not a person)", gaLocation(`${W}/markets/mkt_1`) === `${W}/markets/mkt_1`);
ok("§4 control · the bare list page is unchanged", gaPath("/positions") === "/positions");

console.log("\n§5 · the referrer");
ok("§5a an excluded page on our site never arrives as a referrer", gaReferrer(`${W}/auth/reset-password?token=abc`) === `${W}/`);
ok("§5b our own page is scrubbed like a location", gaReferrer(`${W}/auth/login?phone=255700&utm_source=x`) === `${W}/auth/login?utm_source=x`);
ok("§5c another site keeps origin and path, never its query", gaReferrer("https://mail.example.com/inbox?user=neema@x.tz") === "https://mail.example.com/inbox");
ok("§5d empty or garbage referrer → empty", gaReferrer("") === "" && gaReferrer("not a url") === "");
ok("§5 control · a malformed percent-escape is refused, not thrown", gaLocation(`${W}/%E0%A4%A`) === null);

console.log("\n§6 · the wire — the hits the real gtag.js produced on 2026-09-15, rewritten or dropped");
const C = "https://www.google-analytics.com/g/collect";
const SHARED = "v=2&tid=G-W66WRL67MQ&gcs=G101&cid=242240067.1789461519&sid=1789461518&dt=Harness%20page";
const enc = encodeURIComponent;
// Captured verbatim in shape: gtag's history page_view with the raw previous address as `dr`.
const historyView = `${C}?${SHARED}&dl=${enc(`${W}/markets`)}&dr=${enc(`${W}/legal/privacy?token=SECRET1&utm_source=news&phone=PHONE255`)}&en=page_view&_et=1002`;
ok("§6a gtag's own (unmarked) history page view is dropped", gaScrubHit(historyView, null) === null);
const ourView = historyView.replace("&en=page_view", "&en=page_view&ep.kp_view=1");
const ours = gaScrubHit(ourView, null);
const oursDecoded = decodeURIComponent(ours?.url ?? "");
ok("§6b our marked view is sent, its referrer scrubbed, the mark removed",
  !!ours && !oursDecoded.includes("SECRET1") && !oursDecoded.includes("PHONE255") && !oursDecoded.includes("kp_view")
  && new URL(ours.url).searchParams.get("dr") === `${W}/legal/privacy?utm_source=news`, oursDecoded);
ok("§6b control · every other parameter survives unchanged (tid, gcs, cid, sid, dt, en, _et)",
  !!ours && ["tid", "gcs", "cid", "sid", "dt", "en", "_et"].every((k) => new URL(ours.url).searchParams.get(k) === new URL(ourView).searchParams.get(k)));
const receipt = gaScrubHit(`${C}?${SHARED}&dl=${enc(`${W}/wallet/receipt/RCPT123`)}&en=page_view&ep.kp_view=1`, null);
ok("§6c a receipt id in `dl` is masked on the wire", new URL(receipt!.url).searchParams.get("dl") === `${W}/wallet/receipt/:id`);
ok("§6d a hit whose page is excluded is dropped, whatever the event",
  gaScrubHit(`${C}?${SHARED}&dl=${enc(`${W}/admin/players/PLAYER77`)}&en=scroll&epn.percent_scrolled=90`, null) === null
  && gaScrubHit(`${C}?${SHARED}&dl=${enc(`${W}/agent/invite/INVTOKEN9`)}&en=page_view&ep.kp_view=1`, null) === null);
const invitedRef = gaScrubHit(`${C}?${SHARED}&dl=${enc(`${W}/legal/terms`)}&dr=${enc(`${W}/agent/invite/INVTOKEN9`)}&en=page_view&ep.kp_view=1`, null);
ok("§6e an excluded page as the referrer becomes the bare origin", new URL(invitedRef!.url).searchParams.get("dr") === `${W}/`);
const batchShared = `${C}?${SHARED}`;
const batchBody = [
  `en=page_view&dl=${enc(`${W}/markets`)}&ep.kp_view=1`,
  `en=page_view&dl=${enc(`${W}/wallet/receipt/RCPT123`)}`,
  `en=scroll&dl=${enc(`${W}/admin/x`)}&epn.percent_scrolled=90`,
  `en=click&dl=${enc(`${W}/help`)}&ep.link_url=${enc("https://checkout.selcom.net/pay?order=ORD77&token=PAYTOK")}`,
  `en=view_search_results&dl=${enc(`${W}/markets`)}&ep.search_term=neema`,
].join("\n");
const batch = gaScrubHit(batchShared, batchBody);
const lines = batch?.body?.split("\n") ?? [];
ok("§6f a batch keeps the marked view and the click, drops the unmarked view, the excluded scroll and the search",
  lines.length === 2 && lines[0].includes("en=page_view") && lines[1].includes("en=click"), JSON.stringify(lines));
ok("§6g an outbound link keeps origin and path, never its query", !String(batch?.body).includes("ORD77") && !String(batch?.body).includes("PAYTOK")
  && decodeURIComponent(String(batch?.body)).includes("https://checkout.selcom.net/pay"));
ok("§6h a batch with nothing left sends nothing", gaScrubHit(batchShared, `en=page_view&dl=${enc(`${W}/x`)}\nen=scroll&dl=${enc(`${W}/admin`)}`) === null);
ok("§6i a shared `dl` on an excluded page drops the whole batch", gaScrubHit(`${C}?${SHARED}&dl=${enc(`${W}/auth/reset-password?token=RESETTOK`)}`, batchBody) === null);
ok("§6j the analytics-host test: collectors and GTM yes; our site, relative paths and look-alikes no",
  gaIsAnalyticsRequest("https://region1.google-analytics.com/g/collect") && gaIsAnalyticsRequest("https://region1.analytics.google.com/g/collect")
  && gaIsAnalyticsRequest("https://www.googletagmanager.com/td?id=1")
  && !gaIsAnalyticsRequest(`${W}/api/health`) && !gaIsAnalyticsRequest("/g/collect")
  && !gaIsAnalyticsRequest("https://evil.example/?h=google-analytics.com") && !gaIsAnalyticsRequest("https://google-analytics.com.evil.example/g/collect"));
// Seen live 2026-09-15: gtag.js duplicates each hit to www.google.com/g/collect.
const googleCopy = `https://www.google.com/g/collect?${SHARED}&dl=${enc(`${W}/markets`)}&en=page_view&ep.kp_view=1`;
ok("§6k the google.com copy of a hit is recognised and dropped, even a clean marked view",
  gaIsAnalyticsRequest(googleCopy) && gaScrubHit(googleCopy, null) === null);
ok("§6k control · the same hit to the GA collector is still sent, and look-alikes of google.com are not analytics",
  gaScrubHit(googleCopy.replace("https://www.google.com/", "https://www.google-analytics.com/"), null) !== null
  && !gaIsAnalyticsRequest("https://google.com.evil.example/g/collect") && !gaIsAnalyticsRequest("https://notgoogle.com/g/collect"));
ok("§6 control · the unmarked-view rule is what drops §6a (the same hit marked is kept)", gaScrubHit(historyView, null) === null && ours !== null);
ok("§6 control · the mark constant is the one the tests use", GA_VIEW_MARK === "kp_view");

console.log("\n§7 · consent — analytics is opt-in (Tanzania PDPA 2022: no legitimate-interests ground)");
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 15, 12, 0, 0);
const rec = (o: Record<string, unknown>) => JSON.stringify(o);
ok("§7a nothing stored, empty, or garbage → unset (analytics stays off)",
  parseConsent(null, NOW) === "unset" && parseConsent("", NOW) === "unset" && parseConsent("{not json", NOW) === "unset" && parseConsent("null", NOW) === "unset");
ok("§7b a record from another version, an unknown choice, or a non-numeric time → unset",
  parseConsent(rec({ v: 2, choice: "granted", at: NOW }), NOW) === "unset"
  && parseConsent(rec({ v: 1, choice: "yes", at: NOW }), NOW) === "unset"
  && parseConsent(rec({ v: 1, choice: "granted", at: String(NOW) }), NOW) === "unset");
ok("§7c a timestamp from the future is not a decision", parseConsent(rec({ v: 1, choice: "granted", at: NOW + 2 * DAY }), NOW) === "unset");
ok("§7d a yes lasts 395 days, then the visitor is asked again",
  parseConsent(serialiseConsent("granted", NOW - 394 * DAY), NOW) === "granted"
  && parseConsent(serialiseConsent("granted", NOW - 395 * DAY), NOW) === "unset");
ok("§7e a no lasts 180 days, and is not re-asked sooner",
  parseConsent(serialiseConsent("denied", NOW - 179 * DAY), NOW) === "denied"
  && parseConsent(serialiseConsent("denied", NOW - 180 * DAY), NOW) === "unset");
ok("§7f serialise → parse round-trips both answers", parseConsent(serialiseConsent("granted", NOW), NOW) === "granted" && parseConsent(serialiseConsent("denied", NOW), NOW) === "denied");
ok("§7 control · a yes lasts exactly as long as the cookies it allows", CONSENT_GRANT_DAYS === GA_COOKIE_DAYS && CONSENT_DENY_DAYS === 180 && CONSENT_VERSION === 1);

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 30) { console.error(`!! only ${pass + fail} assertions ran`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
