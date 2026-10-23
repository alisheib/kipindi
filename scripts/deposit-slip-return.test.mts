/**
 * test:deposit-slip-return — MB-57: A DEPOSIT STARTED FROM THE MILLIONEA SLIP LEADS BACK TO THE SLIP (MASWALI-BUILD FLOW 3,
 * the lead's ruling of 2026-10-23; MASWALI-PLAN §8 MB-57: "after a deposit, return to the slip with picks intact and never
 * place the ticket automatically").
 *
 *   npx tsx scripts/deposit-slip-return.test.mts               (npm run test:deposit-slip-return)
 *   npx tsx scripts/deposit-slip-return.test.mts --prove-red   (npm run red:deposit-slip-return — each plant on disk, restored)
 *
 * §1 THE ONE ALLOWED RETURN (`lib/journey/slip-return.ts`): exactly "/millionea/slip" — no query, no slash, no other page,
 *    never a guess. And the saved bet is untouched: a bet never returns to the slip, the slip's way back is never a saved bet.
 * §2 THE WAY THROUGH, wired end to end: the slip's deposit door carries the way back and nothing else of the slip; the
 *    deposit page and its action honour it only with no saved bet beside it and only while Millionea is visible to the
 *    reader; the action keeps it through a refusal and lands a deposit that went through on the wait page in BOTH shells;
 *    both wait pages hand it to the client; the client offers it once the money arrived and after a failed payment.
 * §3 THE WORDS, in en/sw/zh with identical placeholders, the slip's own nouns and buy verbs.
 * The browser proof — slip, Buy with a low balance, deposit, the wait page, back, the slip with every answer of every ticket —
 * is `qa:maswali-deposit-return` (sw/en/zh at 360 and 1280, both shells, the multi-ticket case, and its own plant).
 * Pure and static: it reads files and calls pure functions; no server, no database.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MILLIONEA_SLIP_RETURN, SLIP_RETURN_PATHS, slipReturnPath } from "../src/lib/journey/slip-return.ts";
import { depositReturnPath, parseSavedDepositBet } from "../src/lib/journey/deposit-state.ts";
import { parseBetParam } from "../src/lib/journey/pending-bet.ts";
import { dict } from "../src/lib/i18n-dict.ts";
import { decomment } from "./lib/decomment.mts";
import { MUTATIONS } from "./anchors/deposit-slip-return.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SELF = "scripts/deposit-slip-return.test.mts";

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
  console.log(`\ndeposit-slip-return RED: ${caught}/${MUTATIONS.length} caught, ${missed} missed`);
  process.exit(missed === 0 && caught === MUTATIONS.length ? 0 : 1);
}

let passed = 0, failed = 0;
const ok = (name: string, condition: boolean, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (condition) passed++; else failed++;
};
const read = (path: string) => decomment(readFileSync(resolve(ROOT, path), "utf8").replace(/\r\n/g, "\n")).replace(/\s+/g, " ");

// ── §1 · the one allowed return ─────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · the one allowed return");
ok("1.1 · ⭐ the slip is the one page a deposit leads back to without a saved bet",
  MILLIONEA_SLIP_RETURN === "/millionea/slip" && SLIP_RETURN_PATHS.length === 1 && slipReturnPath("/millionea/slip") === "/millionea/slip",
  JSON.stringify(SLIP_RETURN_PATHS));
const REFUSED: unknown[] = ["/millionea/slip/", "/millionea", "/millionea/slip?amount=5000", "/millionea/slip#q-1", "//millionea/slip",
  "https://www.50pick.tz/millionea/slip", "/markets", "/", "", " /millionea/slip", "/MILLIONEA/SLIP", null, undefined, 1, ["/millionea/slip"],
  `/millionea/slip${"x".repeat(80)}`];
const leaked = REFUSED.filter((raw) => slipReturnPath(raw) !== null);
ok("1.2 · ⛔ any other path, a query, a slash, another host or a non-string is no way back", leaked.length === 0, JSON.stringify(leaked));
const BET = parseBetParam("mkt_s9.YES.5000")!;
ok("1.3 · the saved bet is untouched: a bet never returns to the slip, and the slip's way back is never a saved bet",
  depositReturnPath("/millionea/slip", BET) === null && parseSavedDepositBet({ v: 1, bet: "mkt_s9.YES.5000", returnPath: "/millionea/slip" }) === null
    && parseSavedDepositBet({ v: 1, slip: "mlw_1", returnPath: "/millionea/slip" }) === null);

// ── §2 · the way through ────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · the way through, wired end to end");
const slip = read("src/app/millionea/slip/slip-client.tsx");
ok("2.1 · ⭐ the slip's deposit door carries the way back beside the amount and the low-balance tag — and nothing else of the slip",
  slip.includes("new URLSearchParams({ amount: String(amount), from: \"low-balance\", returnPath: MILLIONEA_SLIP_RETURN })")
    && !/new URLSearchParams\(\{[^}]*\b(?:slips|picks|answers|week)\b/.test(slip));
ok("2.1b · ⭐ …as a DOCUMENT request, as the bet sheet's door makes — the journey's payment focus is chosen by the root shell on one, and a soft route kept the board's header and tabs over the deposit",
  slip.includes("navigate(() => window.location.assign(`/wallet/deposit?${new URLSearchParams({ amount: String(amount), from: \"low-balance\", returnPath: MILLIONEA_SLIP_RETURN })}`))")
    && !slip.includes("router.push(`/wallet/deposit?"));
const page = read("src/app/wallet/deposit/page.tsx");
ok("2.2 · ⭐ the deposit page honours it only with no saved bet beside it and only while Millionea is visible to the reader",
  page.includes("const slipAsked = sp.bet ? null : slipReturnPath(sp.returnPath);")
    && page.includes("const slipReturn = slipAsked && (await resolveMillionea()).visible ? slipAsked : null;"));
ok("2.3 · both forms post it: the classic form's hidden field and the journey form's",
  page.includes('{slipReturn && <input type="hidden" hidden name="returnPath" value={slipReturn} />}') && page.includes("slipReturn={slipReturn}")
    && read("src/app/wallet/deposit/journey-deposit-form.tsx").includes('{slipReturn && !rawBet && <input type="hidden" hidden name="returnPath" value={slipReturn} />}'));
const action = read("src/app/wallet/deposit/actions.ts");
ok("2.4 · ⭐ the action reads it the same way — never beside a saved bet, only while visible — and keeps it through a refusal",
  action.includes('const slipAsked = pendingBet ? null : slipReturnPath(formData.get("returnPath"));')
    && action.includes("const slipReturn = slipAsked && (await resolveMillionea()).visible ? slipAsked : null;")
    && action.includes('if (slipReturn) carry.set("returnPath", slipReturn);'));
ok("2.5 · ⭐ a deposit that went through lands on the wait page in BOTH shells when it came from the slip (the classic result modal cannot wait for an asynchronous payment)",
  action.includes("if (journeyFlow || slipReturn) redirect(`/wallet/deposit/wait/${data.txnId}${slipQuery ? `?${slipQuery}` : \"\"}` as never);")
    && (action.match(/\/wallet\/deposit\/wait\?key=\$\{encodeURIComponent\(idempotencyKey!?\)\}\$\{slipQuery \? `&\$\{slipQuery\}` : ""\}/g) ?? []).length === 3);
const waitById = read("src/app/wallet/deposit/wait/[id]/page.tsx"), waitByKey = read("src/app/wallet/deposit/wait/page.tsx");
ok("2.6 · both wait pages read it from their address, gate it on Millionea's visibility, and hand it to the client",
  [waitById, waitByKey].every((w) => w.includes("const slipReturn = slipAsked && (await resolveMillionea()).visible ? slipAsked : null;") && w.includes("slipReturn={slipReturn}"))
    && waitById.includes("?returnPath=${encodeURIComponent(slipAsked)}"));
const client = read("src/app/wallet/deposit/wait/deposit-waiting-client.tsx");
ok("2.7 · ⭐ the wait page offers it once the money arrived and after a failed payment — the saved bet's two places — in the slip's own words",
  client.includes('{view.state === "PAID" && slipBack && <a href={slipBack} className="btn btn-primary btn-lg flex w-full justify-center" data-testid="deposit-slip-return">{t.millionea.depositReturnSlip}</a>}')
    && client.includes('{view.state === "FAILED" && slipBack && <a href={slipBack} className="btn btn-ghost btn-lg flex w-full justify-center" data-testid="deposit-slip-return">{t.millionea.depositReturnSlip}</a>}')
    && client.includes("view.pendingBet ? t.journey.depositPaidManual : slipBack ? t.millionea.depositPaidSlip : t.wallet.returnPaidBody"));

// ── §3 · the words ──────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · the words, in three languages");
const KEYS = ["depositReturnSlip", "depositPaidSlip"] as const;
const holes = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join(",");
const m = (l: "en" | "sw" | "zh") => (dict[l] as unknown as { millionea: Record<string, string> }).millionea;
ok("3.1 · ⭐ both sentences exist in en, sw and zh, each its own language, with identical placeholders",
  KEYS.every((k) => (["en", "sw", "zh"] as const).every((l) => typeof m(l)[k] === "string" && m(l)[k].trim().length > 0)
    && holes(m("en")[k]) === holes(m("sw")[k]) && holes(m("en")[k]) === holes(m("zh")[k]) && m("sw")[k] !== m("en")[k] && m("zh")[k] !== m("en")[k]),
  KEYS.map((k) => `${k}: ${m("en")[k]} | ${m("sw")[k]} | ${m("zh")[k]}`).join(" ; "));
ok("3.2 · the slip's own nouns and buy verbs — answers / majibu / 答案; buy / kukata tiketi / 出票 — and nothing bought by itself",
  m("en").depositReturnSlip === "Return to your answers" && m("sw").depositReturnSlip === "Rudi kwenye majibu yako" && m("zh").depositReturnSlip === "返回您的答案"
    && /confirm to buy; no ticket was bought automatically\.$/.test(m("en").depositPaidSlip)
    && /kukata tiketi; hakuna tiketi iliyokatwa kiotomatiki\.$/.test(m("sw").depositPaidSlip)
    && /确认出票；系统没有自动出票。$/.test(m("zh").depositPaidSlip));

const FLOOR = 10;
ok(`floor · at least ${FLOOR} checks ran before this one`, passed + failed >= FLOOR, `${passed + failed} ran`);
console.log(`\ndeposit-slip-return: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
