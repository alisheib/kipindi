/** The three transactional browse buttons follow the effective S15 rollout. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { welcomeHtml, oneSidedRefundHtml, loginNotificationHtml } from "../src/lib/server/email";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const calls = [
  { name: "welcome", build: (active?: boolean) => welcomeHtml({ name: "Asha", journeyActive: active }), classic: "Browse markets · Tazama masoko" },
  { name: "one-sided refund", build: (active?: boolean) => oneSidedRefundHtml({ reference: "pos_test", stake: 1000, marketTitle: "Test question", journeyActive: active }), classic: "Browse markets · Angalia masoko" },
  { name: "sign-in notice", build: (active?: boolean) => loginNotificationHtml({ name: "Asha", time: "12:00 EAT", ip: "127.0.0.1", journeyActive: active }), classic: "Browse markets · Tazama masoko" },
];
const cta = (html: string) => {
  const match = /<a href="([^"]+)" class="sp-cta"[^>]*>([^<]+)<\/a>/.exec(html);
  return match ? { path: new URL(match[1]).pathname, label: match[2] } : null;
};
const isDoor = (html: string, path: string, label: string) => {
  const found = cta(html);
  return found?.path === path && found.label === label;
};
let pass = 0, fail = 0;
const ok = (name: string, good: boolean) => { if (good) pass++; else { fail++; console.error(`FAIL ${name}`); } };

for (const { name, build, classic } of calls) {
  ok(`${name}: preview keeps the original /markets door`, isDoor(build(), "/markets", classic));
  ok(`${name}: explicit rollback keeps the original /markets door`, isDoor(build(false), "/markets", classic));
  ok(`${name}: ACTIVE opens the real questions home`, isDoor(build(true), "/", "Browse questions · Tazama maswali"));
  const active = build(true);
  ok(`${name}: a broken active label is caught`, !isDoor(active.replace(">Browse questions · Tazama maswali</a>", ">Browse markets · Tazama masoko</a>"), "/", "Browse questions · Tazama maswali"));
  ok(`${name}: a broken active address is caught`, !isDoor(active.replace(/href="([^"]+)" class="sp-cta"/, (_, href: string) => `href="${href}markets" class="sp-cta"`), "/", "Browse questions · Tazama maswali"));
}
ok("welcome ACTIVE copy explains YES or NO and a bet", /choose YES or NO, and place your first bet/.test(calls[0].build(true)));
ok("welcome preview retains its original prediction copy", /Browse markets, place your first prediction/.test(calls[0].build(false)));

const auth = read("src/lib/server/auth-service.ts");
const market = read("src/lib/server/market-service.ts");
ok("all four auth mail sends read the effective rollout without delaying sign-in", (auth.match(/void shortTitlesInMessagesNow\(\)\.then\(\(journeyActive\)/g) ?? []).length === 4);
ok("auth templates receive that rollout", (auth.match(/journeyActive\s*[,}]/g) ?? []).length >= 4);
ok("settlement reuses the already-read active state for refund mail", market.includes("settledAt, journeyActive: shortTitles"));

console.log(`test:email-journey-cta ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
