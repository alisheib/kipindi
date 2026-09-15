/**
 * FIRST-PARTY VISIT COUNTING — what the browser may send to our own counter. `npm run test:site-visits`.
 *
 * The counter runs for EVERY visitor without consent (Ali, 2026-09-15), which is only defensible because the
 * payload carries no identifier and nothing personal: this suite pins that, case by case, with controls that must
 * be reported so a rule cannot pass by matching nothing.
 */
import { PATH_MAX, TAG_MAX, visitPayload } from "../src/lib/site-visits.ts";
import {
  OTHER_PATH, SITE_VISIT_MAX_PATHS, SITE_VISIT_RETENTION_DAYS,
  isAutomatedAgent, parseVisitBody, pruneSiteVisits, recordVisit, siteVisitsReport,
} from "../src/lib/server/site-visits.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, evidence = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${evidence ? ` — ${evidence}` : ""}`);
};
const W = "https://www.50pick.tz";
const j = (v: unknown) => JSON.stringify(v);

console.log("\n§1 · only the live site, only countable pages");
ok("§1a a live page is counted", visitPayload(`${W}/markets`, "", true)?.p === "/markets");
ok("§1b the apex host is counted too", visitPayload("https://50pick.tz/", "", true)?.p === "/");
ok("§1c local, preview and look-alike hosts are not",
  ["http://localhost:3000/", "https://kipindi.up.railway.app/", "https://www.50pick.tz.evil.example/"].every((h) => visitPayload(h, "", true) === null));
for (const p of ["/admin/players/c1", "/ADMIN", "//admin", "/%61dmin", "/auth/reset-password?token=T", "/auth/verify-email?token=T", "/agent/invite/tok_1", "/api/health"]) {
  ok(`§1d excluded, not counted: ${p}`, visitPayload(W + p, "", true) === null);
}
ok("§1 control · a look-alike of an excluded prefix IS counted", visitPayload(`${W}/administrator`, "", true)?.p === "/administrator");

console.log("\n§2 · the path carries nothing personal");
const q = visitPayload(`${W}/auth/login?phone=255700000123&email=a%40b.tz&ref=QAF&utm_source=sms#top`, "", true);
ok("§2a query and fragment never reach the path", q?.p === "/auth/login", j(q));
ok("§2b no field anywhere carries the phone, email or referral code", !/255700000123|a@b|QAF/i.test(j(q)), j(q));
ok("§2c a receipt and a position id are masked", visitPayload(`${W}/wallet/receipt/tx_9`, "", true)?.p === "/wallet/receipt/:id"
  && visitPayload(`${W}/positions//pos_77/share`, "", true)?.p === "/positions/:id/share");
ok("§2d a trailing slash is one page, not two", visitPayload(`${W}/markets/`, "", true)?.p === "/markets");
ok("§2e an absurdly long path is capped", (visitPayload(`${W}/markets/${"x".repeat(500)}`, "", true)?.p.length ?? 0) === PATH_MAX);
ok("§2 control · a public content id is kept (a market is not a person)", visitPayload(`${W}/markets/mkt_1`, "", true)?.p === "/markets/mkt_1");

console.log("\n§3 · the source: a referrer HOST and campaign tags, on the entry only");
const ent = visitPayload(`${W}/?utm_source=Instagram&utm_medium=Social&utm_campaign=Launch%20Week`, "https://www.google.com/search?q=neema+phone", true);
ok("§3a referrer reduced to its host, www. removed, no path or query", ent?.r === "google.com" && !j(ent).includes("neema"), j(ent));
ok("§3b campaign tags lowercased", ent?.s === "instagram" && ent?.m === "social" && ent?.c === "launch week", j(ent));
ok("§3c our own site as referrer is direct, not a source", visitPayload(`${W}/markets`, `${W}/`, true)?.r === "" && visitPayload(`${W}/markets`, "https://50pick.tz/x", true)?.r === "");
ok("§3d an in-app navigation carries no source at all", j(visitPayload(`${W}/markets?utm_source=x`, "https://google.com/", false)) === j({ p: "/markets", r: "", s: "", m: "", c: "", e: false }));
ok("§3e a tag is capped and stripped of control characters", (() => {
  const v = visitPayload(`${W}/?utm_campaign=${"a".repeat(200)}%0A%0D`, "", true);
  return v?.c.length === TAG_MAX && !/[\n\r]/.test(v?.c ?? "\n");
})());
ok("§3f garbage referrer → direct", visitPayload(`${W}/`, "not a url", true)?.r === "");

console.log("\n§4 · the payload has exactly these keys — no identifier can ride along");
ok("§4a keys are p r s m c e, nothing else", j(Object.keys(visitPayload(`${W}/`, "", true) ?? {}).sort()) === j(["c", "e", "m", "p", "r", "s"]));
ok("§4 control · a malformed percent-escape is refused, not thrown", visitPayload(`${W}/%E0%A4%A`, "", true) === null);

/* ── The server: what it accepts, who it ignores, what it stores ─────────────────────────────────────── */
console.log("\n§5 · the server re-checks the body — a public endpoint trusts nothing");
const good = { p: "/markets", r: "google.com", s: "sms", m: "", c: "launch", e: true };
const body = (o: unknown) => JSON.stringify(o);
ok("§5a the payload the browser builds is accepted as-is", j(parseVisitBody(body(visitPayload(`${W}/markets?utm_source=sms&utm_campaign=launch`, "https://www.google.com/x", true)))) === j(good));
ok("§5b an extra field (an identifier smuggled in) is refused", parseVisitBody(body({ ...good, uid: "u_1" })) === null);
ok("§5c a missing field, a wrong type, or not JSON is refused",
  parseVisitBody(body({ p: "/", r: "", s: "", m: "", c: "" })) === null && parseVisitBody(body({ ...good, e: "true" })) === null && parseVisitBody("{") === null && parseVisitBody("") === null);
ok("§5d a query, fragment, space or double slash in the path is refused",
  ["/markets?phone=255", "/m#x", "/a b", "//admin"].every((p) => parseVisitBody(body({ ...good, p })) === null));
ok("§5e an excluded page posted directly is refused", ["/admin/players/c1", "/auth/reset-password", "/agent/invite/tok"].every((p) => parseVisitBody(body({ ...good, p })) === null));
ok("§5f an unmasked receipt id is masked server-side", parseVisitBody(body({ ...good, p: "/wallet/receipt/tx_9", e: false, r: "", s: "", c: "" }))?.p === "/wallet/receipt/:id");
ok("§5g a referrer with a path, uppercase tags, or a source on a non-entry is refused",
  parseVisitBody(body({ ...good, r: "google.com/search" })) === null && parseVisitBody(body({ ...good, s: "SMS" })) === null && parseVisitBody(body({ ...good, e: false })) === null);
ok("§5h control characters and oversize bodies are refused", parseVisitBody(body({ ...good, c: "a\nb" })) === null && parseVisitBody(" ".repeat(3000)) === null);

console.log("\n§6 · who is not counted");
const CHROME = "Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";
ok("§6a a real Android Chrome is counted", !isAutomatedAgent(CHROME));
ok("§6b crawlers, previews, headless and scripts are not",
  ["Googlebot/2.1 (+http://www.google.com/bot.html)", "Mozilla/5.0 (compatible; bingbot/2.0)", "facebookexternalhit/1.1", "Mozilla/5.0 HeadlessChrome/128.0", "curl/8.4.0", "python-requests/2.31", "", "short"]
    .every((ua) => isAutomatedAgent(ua)));
ok("§6 control · a UA that merely contains 'robot' inside a word is a person (Cubot phones)", !isAutomatedAgent("Mozilla/5.0 (Linux; Android 12; CUBOT KINGKONG 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"));

console.log("\n§7 · what is stored: daily totals, a path cap, and the purge");
const DAY0 = Date.UTC(2026, 8, 15, 9, 0, 0); // 12:00 EAT
await recordVisit({ p: "/", r: "google.com", s: "", m: "", c: "", e: true }, DAY0);
await recordVisit({ p: "/markets", r: "", s: "", m: "", c: "", e: false }, DAY0);
await recordVisit({ p: "/markets", r: "", s: "instagram", m: "social", c: "launch", e: true }, DAY0);
const rep = await siteVisitsReport("2026-09-15", "2026-09-15");
ok("§7a views and visits are totals per day", rep.views === 3 && rep.visits === 2 && j(rep.days) === j([{ day: "2026-09-15", views: 3, entries: 2 }]), j(rep.days));
ok("§7b top pages carry views and landings", j(rep.pages) === j([{ path: "/markets", views: 2, entries: 1 }, { path: "/", views: 1, entries: 1 }]), j(rep.pages));
ok("§7c sources are counted once per visit, never on an in-app view", rep.sources.reduce((n, s) => n + s.visits, 0) === 2 && rep.sources.some((s) => s.referrer === "google.com") && rep.sources.some((s) => s.campaign === "launch"), j(rep.sources));
ok("§7d the day is the EAT day: 22:30 UTC on the 15th counts on the 16th", await (async () => {
  await recordVisit({ p: "/late", r: "", s: "", m: "", c: "", e: true }, Date.UTC(2026, 8, 15, 22, 30));
  return (await siteVisitsReport("2026-09-16", "2026-09-16")).pages[0]?.path === "/late";
})());
ok("§7e a stored row has no field that could identify anyone", (() => {
  const g = (globalThis as { __50PICK_SITE_VISITS?: { pages: Map<string, object>; sources: Map<string, object> } }).__50PICK_SITE_VISITS!;
  const keys = new Set([...g.pages.values(), ...g.sources.values()].flatMap((r) => Object.keys(r)));
  return j([...keys].sort()) === j(["campaign", "day", "entries", "medium", "path", "referrer", "source", "views", "visits"]);
})());
const capDay = Date.UTC(2026, 9, 1, 9, 0, 0);
for (let i = 0; i < SITE_VISIT_MAX_PATHS + 5; i++) await recordVisit({ p: `/markets/m${i}`, r: "", s: "", m: "", c: "", e: false }, capDay);
await recordVisit({ p: "/markets/m0", r: "", s: "", m: "", c: "", e: false }, capDay);
const capRep = await siteVisitsReport("2026-10-01", "2026-10-01", 5000);
ok("§7f a day admits SITE_VISIT_MAX_PATHS distinct paths; the rest count as (other); a known path still counts as itself",
  capRep.pages.length === SITE_VISIT_MAX_PATHS + 1 && capRep.pages.find((p) => p.path === OTHER_PATH)?.views === 5
  && capRep.pages.find((p) => p.path === "/markets/m0")?.views === 2, `${capRep.pages.length} rows`);
const pruned = await pruneSiteVisits(Date.UTC(2026, 9, 1, 9, 0, 0) + SITE_VISIT_RETENTION_DAYS * 86_400_000);
ok("§7g the purge deletes days older than the retention period and keeps the rest",
  pruned > 0 && (await siteVisitsReport("2026-09-15", "2026-09-16")).views === 0 && (await siteVisitsReport("2026-10-01", "2026-10-01")).views > 0, `${pruned} rows`);

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 25) { console.error(`!! only ${pass + fail} assertions ran`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
