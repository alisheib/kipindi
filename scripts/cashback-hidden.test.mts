/**
 * THE CASH BACK OFFER IS HIDDEN, AND NOTHING THAT MUST STILL WORK STOPPED — Jay item #5.
 *
 * Ali's words, quoted in the commission: *"disabled/hidden for now until further notice."*
 * ⛔ **A FEATURE-STATE, NOT A DELETION.** The component stays, the grant path stays, every
 * grant already made stays visible and keeps fulfilling. Only the OFFER goes.
 *
 * ⚠️ AND THE DEFAULT IS WHAT PRODUCTION ACTUALLY RUNS ON. Measured 2026-08-25: there is **no
 * bonus row in `SystemConfig` at all**, so `DEFAULT_BONUS_CONFIG` IS the live value — the
 * promo was rendering on `/wallet` and `/wallet/deposit` offering *"a 10% cash back bonus"*.
 * That is the precedent the brief warns about: a switch reads differently in production than
 * a reader assumes from the repo. ⭐ **Check the live state, not the file.**
 *
 * ⭐ THE RULE HAS TWO HALVES, AND A GUARD THAT CHECKS ONLY ONE IS WORSE THAN NONE — it would
 * pass just as happily over a codebase where cashback had been ripped out entirely, which is
 * the thing Ali explicitly did not ask for. §2 is "the offer is gone"; §3 is "the ledger path
 * is not".
 *
 * Run: npm run test:cashback-hidden
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const { DEFAULT_BONUS_CONFIG } = await import("../src/lib/server/bonus-config.ts");

const src = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8"));

/** Every source file under src/, walked once. */
const FILES: string[] = [];
(function walk(d: string) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) { if (e !== "node_modules" && e !== ".next") walk(p); }
    else if (e.endsWith(".ts") || e.endsWith(".tsx")) FILES.push(p);
  }
})(join(ROOT, "src"));
const rel = (f: string) => f.replace(ROOT, "").split("\\").join("/");

const walletPage = src("src/app/wallet/page.tsx");
const depositPage = src("src/app/wallet/deposit/page.tsx");
const walletClient = src("src/app/wallet/wallet-client.tsx");
const walletSvc = src("src/lib/server/wallet-service.ts");

// ── 1 · THE SWITCH IS OFF, and this default is the live value ───────────────
{
  ok("1: ⛔ the cash back offer is OFF by default", DEFAULT_BONUS_CONFIG.cashbackEnabled === false,
     String(DEFAULT_BONUS_CONFIG.cashbackEnabled));
  // ⛔ The rest of the bonus system is NOT off. Turning the whole feature off would hide the
  // offer too, and would be a different and much larger change than the one asked for.
  ok("1: ⭐ …and the bonus system as a whole is still ON — only the offer went",
     DEFAULT_BONUS_CONFIG.enabled === true, String(DEFAULT_BONUS_CONFIG.enabled));
  // The percentage and mode survive so re-enabling is one value, not a re-configuration.
  ok("1: the percentage survives, so re-enabling is one switch",
     DEFAULT_BONUS_CONFIG.cashbackPercentage > 0, String(DEFAULT_BONUS_CONFIG.cashbackPercentage));
}

// ── 2 · NO PLAYER SURFACE CAN RENDER THE OFFER ─────────────────────────────
{
  ok("2: the deposit page gates the promo on the switch",
     /bonusCfg\.enabled && bonusCfg\.cashbackEnabled/.test(depositPage));
  ok("2: the wallet page gates it on the same switch",
     /bonusCfg\.enabled && bonusCfg\.cashbackEnabled \? bonusCfg\.cashbackPercentage : 0/.test(walletPage));

  const importers = FILES
    .filter((f) => /from "@\/components\/ui\/cashback-promo"/.test(decomment(readFileSync(f, "utf8"))))
    .map(rel);
  ok("2: the promo has exactly two importers", importers.length === 2, importers.join(", "));
  // ⚠️ The wallet surface imports it from its CLIENT component, not from `page.tsx` — the page
  // computes the gated `cashbackPercent` and passes it down. A first draft of this assertion
  // expected `wallet/page.tsx` and failed against a correct product. The chain is
  // page-computes → client-renders, which is the right shape and had to be looked at.
  ok("2: ⭐ …and both are wallet surfaces whose value comes from the switch",
     importers.every((f) => f.includes("/wallet/deposit/page.tsx") || f.includes("/wallet/wallet-client.tsx")),
     importers.join(", "));
  // ⛔ The client must not invent its own condition — it renders what the page computed.
  ok("2: the wallet client renders off the passed-in value, not its own config read",
     /cashbackPercent > 0 && <CashbackPromo/.test(walletClient) && !/cashbackEnabled/.test(walletClient));
}

// ── 3 · ⛔ THE LEDGER PATH IS NOT DELETED — the other half of the rule ──────
{
  // "Hidden" is a state. A deleted file is not a state.
  ok("3: ⛔ the promo component still exists — this is a state, not a deletion",
     existsSync(join(ROOT, "src/components/ui/cashback-promo.tsx")));

  // ⭐ THE BLAST RADIUS, MADE CHECKABLE. `cashbackEnabled` may be read by the two display
  // gates and by ONE grant branch, and that branch must additionally require AUTO mode —
  // which production does not run. If a fourth reader appears, the claim "hiding the offer
  // cannot stop a grant" has quietly stopped being true.
  const readers = FILES
    .filter((f) => !f.endsWith("bonus-config.ts") && /cashbackEnabled/.test(decomment(readFileSync(f, "utf8"))))
    .map(rel);
  ok("3: ⭐ exactly three things read the switch", readers.length === 3, readers.join(" · "));
  ok("3: …two of them are the display gates",
     readers.filter((r) => r.includes("/wallet/page.tsx") || r.includes("/wallet/deposit/page.tsx")).length === 2,
     readers.join(" · "));
  ok("3: …and the third is the wallet service's grant branch",
     readers.some((r) => r.includes("/lib/server/wallet-service.ts")), readers.join(" · "));
  ok("3: 🔴 …and that branch also requires AUTO mode, which production does not run",
     /cfg\.enabled && cfg\.cashbackEnabled && cfg\.cashbackMode === "AUTO"/.test(walletSvc));
  ok("3: ⭐ the live mode is REQUEST, so that branch was already inert",
     DEFAULT_BONUS_CONFIG.cashbackMode === "REQUEST", String(DEFAULT_BONUS_CONFIG.cashbackMode));

  // ⛔ And the fulfilment machinery must not consult it at all: an existing grant's remaining
  // balance and wagering progress cannot depend on whether the OFFER is advertised.
  const bonusSvc = src("src/lib/server/bonus-service.ts");
  ok("3: ⛔ the bonus service never reads the offer switch — a granted bonus fulfils regardless",
     !/cashbackEnabled/.test(bonusSvc));
}

console.log(`\ncashback-hidden: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
