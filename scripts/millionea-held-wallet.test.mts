/**
 * test:millionea-held-wallet — A HELD WALLET HEARS ONE MILLIONEA SENTENCE (MASWALI-BUILD FLOW 13, the lead's ruling of
 * 2026-10-23 on FLOW 10's follow-ups: "one Millionea sentence for the buy's refusal AND the slip's pre-refusal, in Ali's
 * ruled buy vocabulary" and "for a held wallet, the hub's buy block says the same refusal instead of the 'Fill a ticket'
 * door").
 *
 *   npx tsx scripts/millionea-held-wallet.test.mts               (npm run test:millionea-held-wallet)
 *   npx tsx scripts/millionea-held-wallet.test.mts --prove-red   (npm run red:millionea-held-wallet — each plant on disk, restored)
 *
 * §1 THE ONE CHOICE (`lib/millionea-refusal.ts`): `wallet_frozen` is said in `millionea.walletFrozen`; every other reason
 *    keeps the registry's sentence (the choice answers null).
 * §2 THE THREE SURFACES READ IT, and the hub's read is the buy's own condition: the slip page's pre-refusal (before the
 *    registry's fallback), the buy's refusal toast, the hub's buy block (after a break and a guest's door, before the cap's
 *    line and the fill door, from `millioneaWalletHeld`); the buy, the slip's read and the hub's read all hold a wallet
 *    whose status is not ACTIVE.
 * §3 THE WORDS — the lead's three sentences exactly (the English apostrophe the dictionary's typographic one), and the
 *    platform's `error.failWalletFrozen` untouched for every other product.
 * That the slip refuses a held wallet at all, on both stores, and the buy with the same reason, is test:maswali-player 4.7b
 * (FLOW 10); the drawn proof — the slip, the buy's toast and the hub in sw/en/zh — is FLOW 13's recorded browser walk.
 * Pure and static: it reads files and calls a pure function; no server, no database.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { millioneaRefusalBody } from "../src/lib/millionea-refusal.ts";
import { dict } from "../src/lib/i18n-dict.ts";
import { decomment } from "./lib/decomment.mts";
import { MUTATIONS } from "./anchors/millionea-held-wallet.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SELF = "scripts/millionea-held-wallet.test.mts";

if (process.argv.includes("--prove-red")) {
  let caught = 0, missed = 0;
  for (const plant of MUTATIONS) {
    const target = resolve(ROOT, plant.file);
    const before = readFileSync(target, "utf8");
    try {
      writeFileSync(target, injectDefect(before, plant.from, plant.to));
      const run = spawnSync(process.execPath, ["--import", "tsx", SELF], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
      const out = `${run.stdout}\n${run.stderr}`;
      const red = run.status !== 0 && plant.failure.test(out);
      if (red) caught++; else missed++;
      console.log(`${red ? "RED caught" : "MISSED"}: ${plant.name}${red ? "" : ` — exit ${run.status}; ${out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 3).join(" | ")}`}`);
    } finally {
      writeFileSync(target, before);
    }
    if (readFileSync(target, "utf8") !== before) { console.log(`FILE LEFT DIRTY: ${plant.file}`); missed++; }
  }
  console.log(`\nmillionea-held-wallet RED: ${caught}/${MUTATIONS.length} caught, ${missed} missed`);
  process.exit(missed === 0 && caught === MUTATIONS.length ? 0 : 1);
}

let passed = 0, failed = 0;
const ok = (name: string, condition: boolean, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (condition) passed++; else failed++;
};
const read = (path: string) => decomment(readFileSync(resolve(ROOT, path), "utf8").replace(/\r\n/g, "\n")).replace(/\s+/g, " ");
/** Every needle present, each after the one before it. */
const inOrder = (src: string, needles: readonly string[]) => {
  let at = -1;
  for (const n of needles) { const i = src.indexOf(n, at + 1); if (i < 0 || i <= at) return false; at = i; }
  return true;
};
const LOCALES = ["en", "sw", "zh"] as const;
const m = (l: (typeof LOCALES)[number]) => (dict[l] as unknown as { millionea: Record<string, string> }).millionea;
const e = (l: (typeof LOCALES)[number]) => (dict[l] as unknown as { error: Record<string, string> }).error;

// ── §1 · the one choice ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · the one choice");
ok("1.1 · ⭐ a held wallet (`wallet_frozen`) is said in Millionea's own sentence, in each language",
  LOCALES.every((l) => millioneaRefusalBody("wallet_frozen", dict[l]) === m(l).walletFrozen && m(l).walletFrozen.length > 0));
const OTHERS: unknown[] = ["wallet_missing", "balance_insufficient", "millionea_cap_reached", "millionea_sales_closed", "millionea_paused",
  "millionea_staff_barred", "millionea_not_available", "millionea_bonus_refused", "WALLET_FROZEN", "wallet_frozen ", "", null, undefined];
const said = OTHERS.filter((r) => millioneaRefusalBody(r as string | null | undefined, dict.en) !== null);
ok("1.2 · ⛔ every other reason keeps the registry's sentence — the choice answers null", said.length === 0, JSON.stringify(said));

// ── §2 · the three surfaces ─────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · the three surfaces read it");
const slipPage = read("src/app/millionea/slip/page.tsx");
ok("2.1 · ⭐ the slip's pre-refusal says it instead of the slip — before the registry's fallback, which would say \"bets\"",
  slipPage.includes('import { millioneaRefusalBody } from "@/lib/millionea-refusal";')
    && inOrder(slipPage, [
      'if (slip.refusal && slip.refusal !== "millionea_sales_closed") {',
      "} else if (millioneaRefusalBody(slip.refusal, t)) { said = { body: millioneaRefusalBody(slip.refusal, t)!, tone: \"neutral\" }; } else { const r = renderFailure(",
    ]));
const slipClient = read("src/app/millionea/slip/slip-client.tsx");
ok("2.2 · ⭐ the buy's refusal toast says it — the one sentence, the registry's for every other reason",
  slipClient.includes('import { millioneaRefusalBody } from "@/lib/millionea-refusal";')
    && slipClient.includes("toast({ title: t.millionea.refusedTitle, description: millioneaRefusalBody(reason, t) ?? said.body, variant,")
    && !slipClient.includes("description: said.body"));
const hub = read("src/app/millionea/page.tsx");
ok("2.3 · ⭐ the hub's buy block says it for a held wallet instead of the fill door — after a break's notice and a guest's door, before the cap's line",
  hub.includes("const walletHeld = await millioneaWalletHeld(gate.userId);")
    && hub.includes("breakBody={breakBody} walletHeld={walletHeld} guest={guest}")
    && inOrder(hub, [
      "if (breakBody) {",
      "} else if (open && !signedIn) {",
      '} else if (open && walletHeld) { door = <Callout tone="neutral" role="status" data-testid="millionea-hub-held">{millioneaRefusalBody("wallet_frozen", t)}</Callout>; } else if (open && atCap) {',
      "} else if (open) { buys = true; door = ( <Link href={MILLIONEA_HREF.slip as never}",
    ]));
const doors = read("src/lib/server/millionea-doors.ts");
const player = read("src/lib/server/maswali-player.ts");
const money = read("src/lib/server/maswali-money-service.ts");
ok("2.4 · ⭐ one condition: the buy, the slip's read and the hub's read each hold a wallet whose status is not ACTIVE — and the hub's read fails open (the slip and the buy still refuse)",
  money.includes('if (!wallet || wallet.status !== "ACTIVE") return refuse("Wallet unavailable.", { code: "NOT_FOUND", reason: wallet ? "wallet_frozen" : "wallet_missing" });')
    && player.includes('frozen = !!wallet && wallet.status !== "ACTIVE";')
    && inOrder(doors, [
      "export const millioneaWalletHeld = cache(async (userId: string | null): Promise<boolean> => {",
      "if (!userId) return false;",
      'return !!wallet && wallet.status !== "ACTIVE"; } catch { return false; }',
    ]));

// ── §3 · the words ──────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · the words");
const RULED = {
  en: "Your wallet is frozen, so tickets can’t be bought. Contact support to resolve it.",
  sw: "Pochi yako imegandishwa, kwa hiyo huwezi kukata tiketi. Wasiliana na msaada kutatua hili.",
  zh: "您的钱包已冻结，无法出票。请联系客服处理。",
} as const;
ok("3.1 · ⭐ the lead's three sentences, in Ali's ruled buy words (tickets bought / kukata tiketi / 出票)",
  LOCALES.every((l) => m(l).walletFrozen === RULED[l]), LOCALES.map((l) => m(l).walletFrozen).join(" | "));
const PLATFORM = {
  en: "Your wallet is frozen, so bets can’t be placed. Contact support to resolve it.",
  sw: "Pochi yako imegandishwa, kwa hiyo huwezi kuweka dau. Wasiliana na msaada kutatua hili.",
  zh: "您的钱包已冻结，无法投注。请联系客服处理。",
} as const;
ok("3.2 · the platform's sentence stays for every other product (`error.failWalletFrozen`, untouched)",
  LOCALES.every((l) => e(l).failWalletFrozen === PLATFORM[l]), LOCALES.map((l) => e(l).failWalletFrozen).join(" | "));

const FLOOR = 8;
ok(`floor · at least ${FLOOR} checks ran before this one`, passed + failed >= FLOOR, `${passed + failed} ran`);
console.log(`\nmillionea-held-wallet: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
