/**
 * ONE RULE FOR "WHO SIGNED THIS MARKET OFF" — the guard on `src/lib/markets/signoff.ts`.
 *
 *   npx tsx scripts/signoff.test.mts     (npm run test:signoff)
 *
 * Found by the landing v3 reviews, 2026-09-26: the landing's settled strip said "Automatic" for a market
 * the automatic resolver sealed while `/fairness` said "One officer" for the SAME market; and every
 * surface credited whoever signed a verdict an upheld objection later REVERSED or VOIDED. A public
 * attestation that credits a person with a verdict they did not sign is an over-claim (MOBILE-VISUAL-PLAN
 * ruling 15).
 *
 * §1 · the rule itself, case by case — solo, two officers, automatic, unstamped, a reversal after the seal,
 *      a reversal before a later seal (an emergency void re-stamps), an objection VOID by another officer,
 *      and an emergency void's own closing row (same officer — not "on objection")
 * §2 · the prefix still covers the real automatic actor
 * §3 · every public surface that states a sign-off derives it through the rule WITH the market's rulings:
 *      the landing strip, `/fairness`, `/api/fairness/recent`, and the market page's resolution panel
 * §4 · CONTROLS — the §3 scan is not blind: a flagless call and an inline two-stamp derivation, planted into
 *      copies, are both caught
 */
import { readFileSync } from "node:fs";
import { signoffOf, signoffWord, AUTOMATIC_ACTOR_PREFIX, type Ruling } from "../src/lib/markets/signoff.ts";

const ROOT = new URL("..", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8").replace(/\r\n/g, "\n");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

// §1 · the rule
const st = (a: string | null, b: string | null, at: string | null = null) =>
  ({ resolutionStage1By: a, resolutionStage2By: b, resolutionStage2At: at });
const T0 = "2026-09-20T10:00:00.000Z", T1 = "2026-09-20T10:30:00.000Z", T2 = "2026-09-20T11:00:00.000Z";
const rev = (by: string, at: string): Ruling => ({ remedy: "REVERSE", by, at });
const vd = (by: string, at: string): Ruling => ({ remedy: "VOID", by, at });
ok("§1 a solo resolve (both stamps the same officer) is one officer", signoffOf(st("usr_a", "usr_a", T0)) === "one");
ok("§1 two distinct officers are two", signoffOf(st("usr_a", "usr_b", T0)) === "two");
ok("§1 the automatic resolver is automatic, never 'one officer'", signoffOf(st("system_auto_resolver", "system_auto_resolver", T0)) === "auto");
ok("§1 the demo auto-settle is automatic", signoffOf(st("system_demo_auto", "system_demo_auto", T0)) === "auto");
ok("§1 no stamp at all is unknown (null), not a claim", signoffOf(st(null, null)) === null);
ok("§1 a REVERSE upheld after the seal is 'corrected on objection', whatever the stamps",
   signoffOf(st("usr_a", "usr_b", T0), [rev("usr_c", T1)]) === "objection");
ok("§1 a REVERSE before a later seal yields to the stamps (an emergency void re-stamped it)",
   signoffOf(st("usr_c", "usr_c", T2), [rev("usr_d", T1)]) === "one");
ok("§1 an objection VOID by another officer after the seal is 'corrected on objection'",
   signoffOf(st("usr_a", "usr_b", T0), [vd("usr_c", T1)]) === "objection");
ok("§1 an EMERGENCY void's own closing row (same officer as the new seal) is not 'on objection'",
   signoffOf(st("usr_c", "usr_c", T1), [vd("usr_c", T2)]) === "one");
ok("§1 a ruling on a market with no recorded seal time still counts",
   signoffOf(st("usr_a", "usr_b"), [rev("usr_c", T1)]) === "objection");
ok("§1 no rulings is the stamps", signoffOf(st("usr_a", "usr_b", T0), []) === "two");
const words = { twoOfficerSealed: "2", oneOfficerSealed: "1", autoSealed: "A", correctedOnObjection: "O" };
ok("§1 each sign-off has its own word", ["two", "one", "auto", "objection"].map((s) => signoffWord(words, s as never)).join("") === "21AO");

// §2 · the prefix covers the real actor
const ms = read("src/lib/server/market-service.ts");
const actor = ms.match(/export const AUTO_RESOLVER_ACTOR = "([^"]+)"/)?.[1];
ok("§2 AUTO_RESOLVER_ACTOR is found", !!actor, actor ?? "not found");
ok("§2 AUTO_RESOLVER_ACTOR carries the automatic prefix", !!actor && actor.startsWith(AUTOMATIC_ACTOR_PREFIX), `${actor} vs ${AUTOMATIC_ACTOR_PREFIX}`);

// §3 · the surfaces read the rule, with the market's rulings
const WITH_RULINGS = /signoffOf\(m, (?:rulings\.get\(m\.id\)|\(await objectionRulings\(\)\)\.get\(m\.id\))\)/;
const SURFACES = [
  "src/lib/server/platform-stats.ts",
  "src/app/fairness/page.tsx",
  "src/app/api/fairness/recent/route.ts",
  "src/app/markets/[id]/page.tsx",
];
const derives = (src: string) => WITH_RULINGS.test(src) && /objectionRulings\(\)/.test(src);
const inline = (src: string) => /resolutionStage1By\s*!==\s*m?\.?_?(?:resolutionStage2By|s2)|_s1\s*!==\s*_s2/.test(src);
for (const f of SURFACES) {
  const src = read(f);
  ok(`§3 ${f} derives the sign-off through signoffOf WITH the market's rulings`, derives(src));
}
ok("§3 the market page no longer derives two-officer inline", !inline(read("src/app/markets/[id]/page.tsx")));
ok("§3 /fairness PRINTS the sign-off through signoffWord", /signoffWord\(/.test(read("src/app/fairness/page.tsx")));
ok("§3 the landing strip PRINTS it through signoffWord", /signoffWord\(/.test(read("src/components/home/trust-band.tsx")));
ok("§3 the resolution panel hides the overturned verdict's evidence", /correctedOnObjection \? null/.test(read("src/components/markets/resolution-panel.tsx")));

// §4 · controls
const api = read("src/app/api/fairness/recent/route.ts");
const flagless = api.replace(/signoffOf\(m, rulings\.get\(m\.id\)\)/, "signoffOf(m)");
ok("§4 control · the flagless plant landed", flagless !== api);
ok("§4 control · a flagless call is reported", !derives(flagless));
const page = read("src/app/markets/[id]/page.tsx");
const inlined = page + "\nconst _s1 = m.resolutionStage1By, _s2 = m.resolutionStage2By; const twoOfficerX = _s1 !== _s2;\n";
ok("§4 control · an inline two-stamp derivation is reported", inline(inlined));

console.log(`\nsignoff: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
