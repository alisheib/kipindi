/**
 * A MIS-FILED MARKET CAN BE CORRECTED — AND THE LICENCE EXCLUSION CANNOT BE REACHED THIS WAY.
 * Jay (Gaming Board) item #14.
 *
 * Category was set ONCE, at creation (`admin/markets/new/wizard.tsx`). Everywhere else in
 * `/admin/markets` it was only filtered and sorted, so a market filed under the wrong topic
 * could be fixed only by **re-creating it** — which on a market already holding stakes is not
 * a correction at all.
 *
 * 🔴 THE RISK IS THE LICENCE, NOT THE TYPO. `MARKET_CATEGORIES` excludes politics **by licence
 * terms** — *"operators caught listing political markets risk the licence"* — and a
 * re-categorisation control is exactly the shape of thing that could quietly become the way
 * back in. The acceptance asks for a guard proving it cannot, so §2 drives it.
 *
 * ⛔ AND THE SUBTLE HALF IS `resolvePublishCategory`, WHICH MUST **NOT** BE USED HERE. That
 * function is a COERCER: anything unrecognised becomes `other`. That is right when publishing a
 * generated poll and wrong here, because it would turn a typed `politics` into a **successful**
 * re-categorisation to `other` and report success. **An operator who asks for something
 * forbidden must be told no, not quietly given something else** — §2 pins the difference.
 *
 * Run: npm run test:recategorise
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const { recategoriseMarket, MARKET_CATEGORIES, resolvePublishCategory } =
  await import("../src/lib/server/market-service.ts");
const { marketStore } = await import("../src/lib/server/market-dal.ts");

const svc = decomment(readFileSync(join(ROOT, "src/lib/server/market-service.ts"), "utf8"));
const actions = decomment(readFileSync(join(ROOT, "src/app/markets/actions.ts"), "utf8"));
const control = decomment(readFileSync(join(ROOT, "src/app/admin/markets/recategorise-control.tsx"), "utf8"));

const OFFICER = "usr_test_officer";
const iso = (n: number) => new Date(Date.UTC(2026, 7, 1, 0, n)).toISOString();

async function seedMarket(category: string) {
  const id = `mkt_recat_${Math.abs(category.length * 7919)}`;
  await marketStore.set({
    id, productLine: "MARKET", titleEn: "Will it rain?", titleSw: null, titleZh: null,
    category, status: "LIVE", yesPool: 0, noPool: 0, predictorCount: 0,
    createdAt: iso(0), updatedAt: iso(0),
    selectionClosedAt: iso(60), resolutionAt: iso(120),
  } as never);
  return id;
}

// ── 1 · ⭐ THE CORRECTION WORKS — the thing Jay actually asked for ──────────
{
  const id = await seedMarket("other");
  const r = await recategoriseMarket({ marketId: id, category: "weather", officerId: OFFICER });
  ok("1: ⭐ a mis-filed market can be corrected", r.ok === true, r.ok ? "" : r.error);
  ok("1: …and the change reports both ends", r.ok && r.data.before === "other" && r.data.after === "weather",
     r.ok ? `${r.data.before} → ${r.data.after}` : "");
  ok("1: …and it really is stored", (await marketStore.get(id))?.category === "weather");
  // Idempotent: re-filing under the same category is a no-op, not an audit row saying nothing
  // changed.
  const again = await recategoriseMarket({ marketId: id, category: "weather", officerId: OFFICER });
  ok("1: re-filing under the same category is a no-op", again.ok === true);
  ok("1: a market that does not exist is refused, not silently created",
     (await recategoriseMarket({ marketId: "mkt_nope", category: "tech", officerId: OFFICER })).ok === false);
}

// ── 2 · 🔴 THE LICENCE EXCLUSION IS UNREACHABLE BY THIS PATH ───────────────
{
  const id = await seedMarket("sports");
  const before = (await marketStore.get(id))?.category;

  for (const banned of ["politics", "Politics", " POLITICS ", "religion", "adult", "violence"]) {
    const r = await recategoriseMarket({ marketId: id, category: banned, officerId: OFFICER });
    ok(`2: 🔴 "${banned.trim()}" is refused`, r.ok === false, r.ok ? "ACCEPTED" : "");
  }
  // ⛔ AND NOTHING MOVED. A refusal that half-ran would be worse than none.
  ok("2: 🔴 the market's category is untouched after every refusal",
     (await marketStore.get(id))?.category === before, String((await marketStore.get(id))?.category));

  // ⭐ THE COERCER TRAP, PINNED. `resolvePublishCategory("politics")` returns "other" — that is
  // its job when publishing a generated poll. If this path used it, a typed `politics` would
  // succeed as `other` and report success.
  ok("2: ⭐ the coercer really would have swallowed it — the trap is real, not theoretical",
     resolvePublishCategory("politics") === "other", resolvePublishCategory("politics"));
  ok("2: ⛔ …and `recategoriseMarket` does NOT use it",
     !/recategoriseMarket[\s\S]{0,1600}?resolvePublishCategory/.test(svc));

  // The refusal names what IS permitted, so a typo and a licence refusal are distinguishable.
  const r = await recategoriseMarket({ marketId: id, category: "politics", officerId: OFFICER });
  ok("2: the refusal names the permitted categories", !r.ok && MARKET_CATEGORIES.every((c) => r.error.includes(c)),
     r.ok ? "" : r.error);
}

// ── 3 · THE CANONICAL LIST IS ONE LIST, AT BOTH ENDS ───────────────────────
{
  ok("3: politics is not in the canonical list", !(MARKET_CATEGORIES as readonly string[]).includes("politics"));
  ok("3: the list still holds the seven the licence permits", MARKET_CATEGORIES.length === 7,
     MARKET_CATEGORIES.join(", "));
  // ⛔ The console must offer exactly what the server accepts — from the SAME list, not a copy.
  ok("3: the control takes its choices as a prop rather than declaring its own",
     /categories: readonly string\[\]/.test(control) && !/"sports"/.test(control));
  ok("3: …and the page passes the canonical list",
     /categories=\{MARKET_CATEGORIES\}/.test(decomment(readFileSync(join(ROOT, "src/app/admin/markets/[id]/page.tsx"), "utf8"))));
}

// ── 4 · AUDITED, and money is not involved ─────────────────────────────────
{
  ok("4: the change is audited with before and after",
     /action: "market\.recategorised"[\s\S]{0,320}?before, after/.test(svc));
  ok("4: the action is admin-gated", /requireAdminOrThrow\(session\.userId, "recategoriseMarketAction"\)/.test(actions));
  // ⛔ NO 2FA STEP-UP, deliberately. `requireAdminTotp` guards the actions that move or lock
  // MONEY. This one changes a filing label — no pool, stake, status or resolution moves.
  // Demanding a step-up for a filing correction trains operators to click step-ups through.
  const block = actions.slice(actions.indexOf("recategoriseMarketAction"), actions.indexOf("adminReopenMarketAction"));
  ok("4: ⛔ …and it does NOT demand a 2FA step-up for a filing change", !/requireAdminTotp/.test(block));
  // It must not touch money. If this ever starts writing pools or status, the claim above is
  // no longer true and the step-up decision has to be revisited.
  const fn = svc.slice(svc.indexOf("export async function recategoriseMarket"), svc.indexOf("export type MarketStatus"));
  // ⚠️ ASK ABOUT THE WRITE, NOT ABOUT THE WHOLE FUNCTION. A first draft banned the words
  // `status`/`yesPool` anywhere in the body and went red on correct code — the audit payload
  // legitimately RECORDS `m.status` so a reviewer can see what the market was when it was
  // re-filed. Reading a field to describe it is not writing it.
  const writes = fn.slice(fn.indexOf("marketStore.set("), fn.indexOf("marketStore.set(") + 120);
  ok("4: ⛔ the write is the spread plus the category, and nothing else",
     /marketStore\.set\(\{ \.\.\.m, category: after \}\)/.test(writes), writes.slice(0, 90));
  ok("4: ⛔ …and there is exactly ONE write in the whole function",
     (fn.match(/marketStore\.set\(/g) ?? []).length === 1);
}

// ── 5 · A × H — `/results` GROUPS BY CATEGORY ─────────────────────────────
{
  // The commission's interaction row: *"a re-categorisation that does not invalidate the page's
  // grouping shows a market in two places or none."*
  //
  // ⭐ MEASURED, NOT ASSUMED: all three surfaces are `force-dynamic`, so they re-read `category` on
  // every request and the staleness failure mode is structurally unreachable. That REASON is what
  // gets pinned -- the day someone makes `/results` static to speed it up, this goes red and the
  // revalidation stops being optional.
  const results = decomment(readFileSync(join(ROOT, "src/app/results/page.tsx"), "utf8"));
  const markets = decomment(readFileSync(join(ROOT, "src/app/markets/page.tsx"), "utf8"));
  const DYN = 'export const dynamic = "force-dynamic"';
  ok("5: ⭐ `/results` is force-dynamic -- it re-reads the category, so it cannot go stale",
     results.includes(DYN));
  ok("5: …and it really does group off `m.category`, so a correction moves the market",
     results.includes("m.category === activeCat") && results.includes("m.category === c"));
  ok("5: …and the action names `/results` anyway, so a static `/results` still refreshes",
     actions.includes('revalidatePath("/results")'));
  ok("5: …and `/markets` re-reads it too", markets.includes(DYN));
}

console.log(`\nrecategorise: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
