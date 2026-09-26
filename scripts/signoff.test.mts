/**
 * ONE RULE FOR "WHO SIGNED THIS MARKET OFF" — the guard on `src/lib/markets/signoff.ts`.
 *
 *   npx tsx scripts/signoff.test.mts     (npm run test:signoff)
 *
 * Found by the landing v3 review, 2026-09-26: the landing's settled strip said "Automatic" for a market
 * the automatic resolver sealed, while `/fairness` said "One officer" for the SAME market — it asked only
 * "are the two stamps different?", and the resolver stamps its own actor into both. A public attestation
 * that credits a person with a machine's verdict is an over-claim (MOBILE-VISUAL-PLAN ruling 15).
 *
 * §1 · the rule itself, case by case (solo, two officers, automatic, reversed on objection, unstamped)
 * §2 · the prefix still covers the real automatic actor — if AUTO_RESOLVER_ACTOR is ever renamed off
 *      `system_`, the rule would silently start counting a machine as a person
 * §3 · every public surface that states a sign-off reads the rule rather than deriving its own:
 *      the landing strip (platform-stats), `/fairness`, and `/api/fairness/recent`
 * §4 · CONTROL — the §3 scan is not blind: an inline derivation planted into a copy of the fairness
 *      page is caught
 */
import { readFileSync } from "node:fs";
import { signoffOf, signoffWord, AUTOMATIC_ACTOR_PREFIX } from "../src/lib/markets/signoff.ts";

const ROOT = new URL("..", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8").replace(/\r\n/g, "\n");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

// §1 · the rule
const st = (a: string | null, b: string | null) => ({ resolutionStage1By: a, resolutionStage2By: b });
ok("§1 a solo resolve (both stamps the same officer) is one officer", signoffOf(st("usr_a", "usr_a")) === "one");
ok("§1 two distinct officers are two", signoffOf(st("usr_a", "usr_b")) === "two");
ok("§1 the automatic resolver is automatic, never 'one officer'", signoffOf(st("system_auto_resolver", "system_auto_resolver")) === "auto");
ok("§1 the demo auto-settle is automatic", signoffOf(st("system_demo_auto", "system_demo_auto")) === "auto");
ok("§1 a stage-1-only stamp is one officer", signoffOf(st("usr_a", null)) === "one");
ok("§1 no stamp at all is unknown (null), not a claim", signoffOf(st(null, null)) === null);
ok("§1 a verdict REVERSED on objection says so, whatever the stamps", signoffOf(st("usr_a", "usr_b"), true) === "objection");
const words = { twoOfficerSealed: "2", oneOfficerSealed: "1", autoSealed: "A", correctedOnObjection: "O" };
ok("§1 each sign-off has its own word", ["two", "one", "auto", "objection"].map((s) => signoffWord(words, s as never)).join("") === "21AO");

// §2 · the prefix covers the real actor
const ms = read("src/lib/server/market-service.ts");
const actor = ms.match(/export const AUTO_RESOLVER_ACTOR = "([^"]+)"/)?.[1];
ok("§2 AUTO_RESOLVER_ACTOR is found", !!actor, actor ?? "not found");
ok("§2 AUTO_RESOLVER_ACTOR carries the automatic prefix", !!actor && actor.startsWith(AUTOMATIC_ACTOR_PREFIX), `${actor} vs ${AUTOMATIC_ACTOR_PREFIX}`);

// §3 · the surfaces read the rule
const SURFACES: Array<[string, RegExp]> = [
  ["src/lib/server/platform-stats.ts", /signoffOf\(m, reversed\.has\(m\.id\)\)/],
  ["src/app/fairness/page.tsx", /signoff: signoffOf\(m, reversed\.has\(m\.id\)\)/],
  ["src/app/api/fairness/recent/route.ts", /signoff: signoffOf\(m\)/],
];
const renders = (src: string) => /signoffWord\(/.test(src);
for (const [f, re] of SURFACES) ok(`§3 ${f} derives the sign-off through signoffOf`, re.test(read(f)));
ok("§3 /fairness PRINTS the sign-off through signoffWord, not a two-way ternary", renders(read("src/app/fairness/page.tsx")));
ok("§3 the landing strip PRINTS it through signoffWord", renders(read("src/components/home/trust-band.tsx")));

// §4 · control: an inline derivation in the printing cell is caught
const fair = read("src/app/fairness/page.tsx");
const planted = fair.replace(/signoffWord\(t\.common, m\.signoff \?\? "one"\)/, 'm.twoOfficer ? t.common.twoOfficerSealed : t.common.oneOfficerSealed');
ok("§4 control · the plant landed", planted !== fair);
ok("§4 control · an inline two-way print is reported", !renders(planted));

console.log(`\nsignoff: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
