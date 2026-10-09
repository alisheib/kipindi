/**
 * ROUND 5 OF THE VISUAL PASS, HELPER G (2026-10-09) — one page, one name: the two money pages and the sweep of every
 * journey door; and the regulator's one name on every line that prints it. Every fix held beside a control or a plant
 * that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r5g.test.mts        (npm run test:visual-pass-r5g)
 *
 * The owner's rules (Ali): only perfect visual and logical results (2026-10-08); consistency and perfection in each move —
 * a finding is fixed with every sibling it has (2026-10-09). The items are S/visual/triage-r5.md's "For the follow-up
 * round" G-1 and R5-A's F18 siblings (G-5); the measurements are S/r5g/measure-g5.mts (S = the session scratchpad).
 *   §1  G-1 the deposit and withdraw screens name themselves as their journey doors do — names, pages, tabs, ghosts, the
 *       deposit's commit and the provider's return — from one home (`money-names.ts`); classic keeps its words
 *   §2  G-1's sweep: every journey door against the page it opens, per locale, each with its verdict — and every door to
 *       the two money pages anywhere in the product, counted
 *   §3  G-1's sweep fixes: /updown/history's tab, the Up & Down board's history pill, /profile's help row, the agent's
 *       top-up door, an agent's invite tab
 *   §4  G-5 the regulator's name: one pattern; the opt-out shell's footer, the offline document and global-error keep it
 *       whole where their line can hold it; every other line that prints it, classified
 *   §5  what classic readers keep
 * ⛔ It reads, renders and runs in memory; it writes nothing. The on-disk mutation proof is S/r5g/mutation-r5g.mjs.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import NodeModule from "node:module";
import { decomment } from "./lib/decomment.mts";

const req = createRequire(import.meta.url);
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const has = (file: string, snippet: string) => squash(code(file)).includes(squash(snippet));
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const text = (markup: string) => markup.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

/* ── the world the server components run in: the request's language and journey answer, stubbed (r5d's harness) ───── */
type Loc = "sw" | "en" | "zh";
const LOCALES: Loc[] = ["sw", "en", "zh"];
const REQ = { locale: "sw" as Loc, path: "/", journey: true };
const nextHeaders = req("next/headers") as { cookies: unknown; headers: unknown };
nextHeaders.cookies = async () => ({ get: (k: string) => (k === "kp-locale" ? { value: REQ.locale } : undefined) });
nextHeaders.headers = async () => new Headers({ "x-pathname": REQ.path });
{
  const at = req.resolve("../src/lib/server/journey-preview.ts");
  const stub = new NodeModule(at);
  stub.filename = at; stub.loaded = true;
  stub.exports = { resolveSimpleJourney: async () => ({ state: "LIVE", journey: REQ.journey, preview: false, pass: null }) };
  (req.cache as Record<string, unknown>)[at] = stub;
}
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
type Dict = Record<string, Record<string, unknown>>;
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Loc, Dict> };
const at = (t: unknown, p: string): unknown => p.split(".").reduce<unknown>((v, k) => (v != null && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), t);
const word = (l: Loc, p: string) => String(at(dict[l], p) ?? `‹no ${p}›`);
const { depositNames, withdrawNames } = req("../src/lib/journey/money-names.ts") as {
  depositNames: (t: unknown, journey: boolean) => { title: string; eyebrow: string; heading: string; commit: string };
  withdrawNames: (t: unknown, journey: boolean) => { title: string; eyebrow: string; heading: string };
};
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Loc; children: unknown }) => unknown };
// The providers the root layout gives a client part (r5d's `inApp`): the router, the path and the language.
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inLocale = (l: Loc, el: unknown) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER },
  h(PathnameContext.Provider, { value: "/" }, h(I18nProvider as never, { initial: l }, el as never))));

/** A function's whole text, from its head through the brace that closes its body (r5d's reader). */
function fnText(src: string, head: string): string {
  const start = src.indexOf(head);
  if (start < 0) return "";
  let i = src.indexOf("(", start), depth = 0;
  for (; i < src.length; i++) { if (src[i] === "(") depth++; else if (src[i] === ")" && --depth === 0) break; }
  const open = src.indexOf("{", i);
  depth = 0;
  for (let k = open; k < src.length; k++) { if (src[k] === "{") depth++; else if (src[k] === "}" && --depth === 0) return src.slice(start, k + 1); }
  return "";
}
const esbuild = req("esbuild") as { transformSync: (c: string, o: { loader: string; jsx?: string }) => { code: string } };
/** A page's generateMetadata, transpiled from its own source and run with what it reads stubbed. */
async function runMeta(file: string, deps: Record<string, unknown>): Promise<unknown> {
  const fn = fnText(raw(file), "export async function generateMetadata(");
  if (!fn) return "‹no generateMetadata›";
  const js = esbuild.transformSync(fn.replace(/^export\s+/, ""), { loader: "ts" }).code;
  return (new Function(...Object.keys(deps), `${js}\nreturn generateMetadata;`)(...Object.values(deps)) as () => Promise<unknown>)();
}
const journeyDeps = (l: Loc, journey: boolean) => ({
  getServerT: async () => ({ t: dict[l], locale: l }),
  resolveSimpleJourney: async () => ({ state: "LIVE", journey, preview: false, pass: null }),
  depositNames, withdrawNames,
});
const titleOf = (m: unknown) => String((m as { title?: unknown })?.title ?? "‹none›");
/** A PageHeader's two lines, read out of rendered markup: the eyebrow (its glyph skipped) and the h1. */
const headOf = (markup: string) => ({
  eyebrow: /<p class="[^"]*\beyebrow\b[^"]*">(?:<svg[\s\S]*?<\/svg>)?([^<]*)<\/p>/.exec(markup)?.[1] ?? "‹none›",
  h1: /<h1[^>]*>([^<]*)<\/h1>/.exec(markup)?.[1] ?? "‹none›",
});
const unesc = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

/* ══ §1 · G-1 · THE TWO MONEY PAGES ════════════════════════════════════════════════════════════════════════════════ */
section("1 · G-1 · the deposit and withdraw screens name themselves as their journey doors do (Amana / Toa fedha under Weka pesa / Toa pesa)");
{
  const J = (l: Loc) => ({ dep: word(l, "journey.depositAction"), wd: word(l, "journey.withdrawAction"), wallet: word(l, "wallet.title") });
  const named = LOCALES.map((l) => {
    const dj = depositNames(dict[l], true), dc = depositNames(dict[l], false), wj = withdrawNames(dict[l], true), wc = withdrawNames(dict[l], false);
    return {
      l,
      journey: dj.title === J(l).dep && dj.heading === J(l).dep && dj.commit === J(l).dep && dj.eyebrow === J(l).wallet
        && wj.title === J(l).wd && wj.heading === J(l).wd && wj.eyebrow === J(l).wallet,
      classic: dc.title === word(l, "common.deposit") && dc.heading === word(l, "common.deposit") && dc.commit === word(l, "common.deposit")
        && dc.eyebrow === word(l, "common.addFunds") && wc.title === word(l, "wallet.withdrawTitle") && wc.heading === word(l, "wallet.moveFundsOut")
        && wc.eyebrow === word(l, "wallet.withdrawTitle"),
      sw: l === "sw" ? `${dj.eyebrow.toUpperCase()} / ${dj.heading} · ${wj.eyebrow.toUpperCase()} / ${wj.heading}` : "",
    };
  });
  ok(`1.1 · a journey reader's deposit and withdraw screens take their doors' words for the tab, the h1 and the deposit's commit, under the Wallet's eyebrow (sw ${named[0].sw}); a classic reader's keep today's keys`,
    named.every((n) => n.journey && n.classic), j(named));
  ok("1.1′ CONTROL · the defect was real: in Swahili the screens said \"Amana\" and \"Toa fedha\" (tab \"Toa\") under journey doors saying \"Weka pesa\" and \"Toa pesa\"",
    word("sw", "common.deposit") === "Amana" && word("sw", "journey.depositAction") === "Weka pesa" && word("sw", "wallet.moveFundsOut") === "Toa fedha"
      && word("sw", "wallet.withdrawTitle") === "Toa" && word("sw", "journey.withdrawAction") === "Toa pesa");
  // The eyebrow names the section the screen belongs to — the Wallet, as /wallet/receipts' eyebrow does — and never repeats the heading.
  const repeats = (names: (t: unknown, journey: boolean) => { eyebrow: string; heading: string }) =>
    LOCALES.filter((l) => names(dict[l], true).eyebrow.toLocaleLowerCase() === names(dict[l], true).heading.toLocaleLowerCase());
  ok("1.2 · the journey's eyebrow never repeats its heading in any language, and it is the Wallet's own name — /wallet's tab and /wallet/receipts' eyebrow (the sub-page convention)",
    repeats(depositNames).length === 0 && repeats(withdrawNames).length === 0 && has("src/app/wallet/receipts/page.tsx", "eyebrow={t.wallet.title}")
      && has("src/app/wallet/page.tsx", "return { title: t.wallet.title };"));
  ok("1.2′ CONTROL · today's eyebrows over the journey's headings would repeat them: sw \"WEKA PESA\" over \"Weka pesa\", en \"WITHDRAW\" over \"Withdraw\", zh 提现 over 提现",
    word("sw", "common.addFunds") === word("sw", "journey.depositAction") && word("en", "wallet.withdrawTitle") === word("en", "journey.withdrawAction")
      && word("zh", "wallet.withdrawTitle") === word("zh", "journey.withdrawAction"));
  const plantedNames = (t: unknown, journey: boolean) => ({ ...depositNames(t, journey), eyebrow: journey ? String(at(t, "common.addFunds")) : "" });
  ok("1.2″ PLANT · a journey arm that kept \"WEKA PESA\" as the deposit's eyebrow is reported (it repeats the h1 in Swahili)", repeats(plantedNames).join() === "sw");

  // The deposit page: its tab, its head and its commit all read the one home.
  const DEP = "src/app/wallet/deposit/page.tsx";
  const dep = squash(code(DEP));
  const depHeadOk = dep.includes("const names = depositNames(t, journey);") && dep.indexOf("const { journey } = await resolveSimpleJourney();") < dep.indexOf("const names = depositNames(t, journey);")
    && dep.includes('icon={<I.arrowDownToLine s={14} className="text-text-subtle" />} eyebrow={names.eyebrow} title={names.heading} subtitle={t.wallet.mobileMoney}')
    && dep.includes("<DepositConfirm journey={journey} />") && !/t\.common\.(?:deposit|addFunds)\b/.test(dep);
  ok("1.3 · the deposit page's head reads `depositNames(t, journey)` after the page's own resolver, its commit is handed the same answer, and no name key is spelled in the page", depHeadOk);
  const depMeta = await Promise.all(LOCALES.flatMap((l) => [true, false].map(async (jr) => ({ l, jr, title: titleOf(await runMeta(DEP, journeyDeps(l, jr))) }))));
  const depMetaOk = depMeta.every((m) => m.title === (m.jr ? word(m.l, "journey.depositAction") : word(m.l, "common.deposit")));
  ok(`1.3′ · RUN: its <title> is the h1's word — ${depMeta.filter((m) => m.l === "sw").map((m) => `${m.jr ? "journey" : "classic"} "${m.title}"`).join(", ")} in Swahili, and the same rule in en and zh`,
    depMetaOk, j(depMeta));

  // The deposit's loading drawing: the page's head for either reader, drawn by the root ghost and the segment's loading file alike.
  const { DepositGhost } = req("../src/app/wallet/deposit/deposit-ghost.tsx") as { DepositGhost: (p: { t: unknown; journey: boolean }) => unknown };
  const ghostHeads = LOCALES.flatMap((l) => [true, false].map((jr) => ({ l, jr, ...headOf(renderToStaticMarkup(h(DepositGhost as never, { t: dict[l], journey: jr } as never))) })));
  const ghostOk = ghostHeads.every((g) => unesc(g.h1) === depositNames(dict[g.l], g.jr).heading && unesc(g.eyebrow) === depositNames(dict[g.l], g.jr).eyebrow);
  ok("1.4 · RENDERED: the deposit ghost draws the page's own eyebrow and h1 for a journey reader and for a classic one, in every language", ghostOk, j(ghostHeads));
  const DepositLoading = (req("../src/app/wallet/deposit/loading.tsx") as { default: () => Promise<unknown> }).default;
  const runs: string[] = [];
  for (const l of LOCALES) for (const jr of [true, false]) {
    REQ.locale = l; REQ.journey = jr;
    const own = renderToStaticMarkup((await DepositLoading()) as never);
    if (own !== renderToStaticMarkup(h(DepositGhost as never, { t: dict[l], journey: jr } as never))) runs.push(`${l} ${jr ? "journey" : "classic"}`);
  }
  REQ.locale = "sw"; REQ.journey = true;
  ok("1.4′ · RUN: the segment's loading file asks the per-request answer and draws exactly that ghost (3 languages × both readers); the root ghost, a journey reader's alone, hands it `journey`",
    runs.length === 0 && has("src/components/journey/route-ghost.tsx", '"/wallet/deposit": <DepositGhost t={t} journey />')
      && has("src/app/wallet/deposit/loading.tsx", "const [{ t }, { journey }] = await Promise.all([getServerT(), resolveSimpleJourney()]); return <DepositGhost t={t} journey={journey} />;"),
    runs.join(", "));
  const oldGhostH1 = headOf(renderToStaticMarkup(h(DepositGhost as never, { t: dict.sw, journey: false } as never))).h1;
  ok(`1.4″ PLANT · the root ghost's old call (no journey answer) drew "${oldGhostH1}" before a journey screen that lands as "${depositNames(dict.sw, true).heading}" — reported as a ghost whose words do not land where the page's do`,
    oldGhostH1 !== depositNames(dict.sw, true).heading);

  // The deposit's commit: the confirm dialog's button that sends the money.
  const confirm = squash(code("src/app/wallet/deposit/deposit-confirm.tsx"));
  ok(`1.5 · the deposit's commit says the screen's name (sw journey "${depositNames(dict.sw, true).commit}", classic "${depositNames(dict.sw, false).commit}"), from the page's own answer`,
    confirm.includes("export function DepositConfirm({ journey }: { journey: boolean }) {") && confirm.includes("confirmLabel={depositNames(t, journey).commit}")
      && !confirm.includes("confirmLabel={t.common.deposit}") && depositNames(dict.sw, true).commit === "Weka pesa" && depositNames(dict.sw, false).commit === "Amana");

  // The withdraw page: tab and head; its loading file RUN.
  const WD = "src/app/wallet/withdraw/page.tsx";
  const wd = squash(code(WD));
  const wdHeadOk = wd.includes("const { journey } = await resolveSimpleJourney(); const names = withdrawNames(t, journey);")
    && wd.indexOf("if (!session) redirect(") < wd.indexOf("const names = withdrawNames(t, journey);")
    && wd.includes('icon={<I.arrowUpFromLine s={14} className="text-text-subtle" />} eyebrow={names.eyebrow} title={names.heading} subtitle={t.wallet.mobileMoneyOnly}')
    && !/t\.wallet\.(?:withdrawTitle|moveFundsOut)\b/.test(wd);
  ok("1.6 · the withdraw page's head reads `withdrawNames(t, journey)` after its session check, and no name key is spelled in the page", wdHeadOk);
  const wdMeta = await Promise.all(LOCALES.flatMap((l) => [true, false].map(async (jr) => ({ l, jr, title: titleOf(await runMeta(WD, journeyDeps(l, jr))) }))));
  ok(`1.6′ · RUN: its <title> — ${wdMeta.filter((m) => m.l === "sw").map((m) => `${m.jr ? "journey" : "classic"} "${m.title}"`).join(", ")} in Swahili; en and zh by the same rule`,
    wdMeta.every((m) => m.title === (m.jr ? word(m.l, "journey.withdrawAction") : word(m.l, "wallet.withdrawTitle"))), j(wdMeta));
  const WithdrawLoading = (req("../src/app/wallet/withdraw/loading.tsx") as { default: () => Promise<unknown> }).default;
  const wdGhost: Array<{ l: Loc; jr: boolean; eyebrow: string; h1: string }> = [];
  for (const l of LOCALES) for (const jr of [true, false]) {
    REQ.locale = l; REQ.journey = jr;
    wdGhost.push({ l, jr, ...headOf(renderToStaticMarkup((await WithdrawLoading()) as never)) });
  }
  REQ.locale = "sw"; REQ.journey = true;
  ok("1.6″ · RUN: the withdraw page's loading file draws the page's own eyebrow and h1 for either reader, in every language",
    wdGhost.every((g) => unesc(g.h1) === withdrawNames(dict[g.l], g.jr).heading && unesc(g.eyebrow) === withdrawNames(dict[g.l], g.jr).eyebrow)
      && has("src/app/wallet/withdraw/loading.tsx", "eyebrow={names.eyebrow} title={names.heading}"), j(wdGhost));

  // The provider's return: the deposit's last page.
  const RET = "src/app/wallet/deposit/return/page.tsx";
  const retMeta = await Promise.all(LOCALES.flatMap((l) => [true, false].map(async (jr) => ({ l, jr, title: titleOf(await runMeta(RET, journeyDeps(l, jr))) }))));
  ok("1.7 · the provider's return names the deposit as the deposit screen's tab does — its <title> RUN and its eyebrow read from the same answer (\"WEKA PESA\" for a journey reader, \"AMANA\" for a classic one)",
    retMeta.every((m) => m.title === depositNames(dict[m.l], m.jr).title) && has(RET, "eyebrow={depositNames(t, journey).title}")
      && has(RET, "const { journey } = await resolveSimpleJourney();") && !has(RET, "eyebrow={t.common.deposit}"), j(retMeta));

  // The capture harness reads the journey's h1s (the lock turn's tiles).
  const harness = raw("scripts/qa-journey-shell.mjs");
  const hq = (p: string) => LOCALES.map((l) => `'${word(l, p)}'`);
  const want = (path: string, key: string) => `'${path}': H('eq', ${hq(key)[0]}, ${hq(key)[1]}, ${hq(key)[2]}),`;
  ok("1.8 · the capture harness expects the journey's h1 on the two screens (the lock turn's tiles read \"Weka pesa\" / \"Toa pesa\")",
    harness.includes(want("/wallet/deposit", "journey.depositAction")) && harness.includes(want("/wallet/withdraw", "journey.withdrawAction")));

  // ONE HOME: the six readers import the names; none spells a name key of its own.
  const READERS = ["src/app/wallet/deposit/page.tsx", "src/app/wallet/deposit/deposit-ghost.tsx", "src/app/wallet/deposit/deposit-confirm.tsx",
    "src/app/wallet/deposit/return/page.tsx", "src/app/wallet/withdraw/page.tsx", "src/app/wallet/withdraw/loading.tsx"];
  const homeOk = READERS.every((f) => /import \{ (?:depositNames|withdrawNames) \} from "@\/lib\/journey\/money-names";/.test(code(f)));
  const mod = code("src/lib/journey/money-names.ts");
  ok("1.9 · one home: the six readers import `money-names.ts`, which is pure (an erased type import, no directive)",
    homeOk && !/^\s*["']use (?:client|server)["']/m.test(mod) && [...mod.matchAll(/^import\s.*$/gm)].every((m) => /^import type /.test(m[0])));
}

/* ══ §2 · G-1's SWEEP · EVERY JOURNEY DOOR AGAINST THE PAGE IT OPENS ═══════════════════════════════════════════════ */
section("2 · G-1's sweep · every journey door against the page it opens, per locale — and every door to the two money pages");
type Words = string | Record<Loc, string>;
const words = (w: Words, l: Loc) => (typeof w === "string" ? word(l, w) : w[l]);
const fold = (s: string) => s.toLocaleLowerCase().replace(/\s+/g, " ").trim();
/** The legal pages' own titles, read from their page-local maps (`const TITLE: Record<Locale, string> = {…}`). */
const legalTitle = (file: string): Record<Loc, string> => {
  const body = /const TITLE: Record<Locale, string> = \{([\s\S]*?)\};/.exec(raw(file))?.[1] ?? "";
  return Object.fromEntries([...body.matchAll(/\b(en|sw|zh):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]])) as Record<Loc, string>;
};
/** What each page calls itself for a journey reader — its tab, and its h1 — with the source lines that say so. */
type Page = { title: Words; h1?: Words; proof: Array<[string, string]> };
const PAGES: Record<string, Page> = {
  "/updown": { title: "market.udTitle", h1: "market.udTitle", proof: [["src/app/updown/page.tsx", "return { title: t.market.udTitle };"], ["src/app/updown/page.tsx", "eyebrow={t.market.udStreaming} title={t.market.udTitle}"]] },
  "/positions": { title: "journey.tabTickets", h1: "journey.tabTickets", proof: [["src/app/positions/page.tsx", "return { title: journey ? t.journey.tabTickets : t.common.positions };"], ["src/components/journey/tickets/ticket-switch.tsx", "<PageHeader title={t.journey.tabTickets} />"]] },
  "/updown/history": { title: "journey.tabTickets", h1: "journey.tabTickets", proof: [["src/app/updown/history/page.tsx", "return { title: journey ? t.journey.tabTickets : t.market.udHistoryTitle };"], ["src/app/updown/history/page.tsx", '{journey ? <TicketsHead current="updown" t={t} />']] },
  "/account": { title: "journey.tabAccount", h1: "journey.tabAccount", proof: [["src/app/account/page.tsx", "return { title: t.journey.tabAccount };"]] },
  "/wallet": { title: "wallet.title", h1: "common.yourFunds", proof: [["src/app/wallet/page.tsx", "return { title: t.wallet.title };"], ["src/app/wallet/wallet-client.tsx", "<PageHeader eyebrow={t.common.walletLabel} title={t.common.yourFunds} />"]] },
  "/wallet/deposit": { title: "journey.depositAction", h1: "journey.depositAction", proof: [["src/app/wallet/deposit/page.tsx", "return { title: depositNames(t, journey).title };"], ["src/app/wallet/deposit/page.tsx", "title={names.heading}"]] },
  "/wallet/withdraw": { title: "journey.withdrawAction", h1: "journey.withdrawAction", proof: [["src/app/wallet/withdraw/page.tsx", "return { title: withdrawNames(t, journey).title };"], ["src/app/wallet/withdraw/page.tsx", "title={names.heading}"]] },
  "/wallet/receipts": { title: "receipts.title", h1: "receipts.title", proof: [["src/app/wallet/receipts/page.tsx", "return { title: t.receipts.title };"], ["src/app/wallet/receipts/page.tsx", "eyebrow={t.wallet.title} title={t.receipts.title}"]] },
  "/wallet/receipt/[id]": { title: "wallet.receiptEyebrow", proof: [["src/app/wallet/receipt/[id]/page.tsx", "return { title: t.wallet.receiptEyebrow };"], ["src/app/wallet/receipt/[id]/page.tsx", "eyebrow={t.wallet.receiptEyebrow}"]] },
  "/results": { title: "results.title", h1: "results.title", proof: [["src/app/results/page.tsx", "const title = t.results.title;"], ["src/app/results/page.tsx", '<h1 className="sr-only">{t.results.title}</h1>']] },
  "/live": { title: "common.live", h1: "common.live", proof: [["src/app/live/page.tsx", "return { title: t.common.live };"]] },
  "/leaderboard": { title: "leaderboard.title", h1: "leaderboard.topPredictors", proof: [["src/app/leaderboard/page.tsx", "const title = t.leaderboard.title;"], ["src/app/leaderboard/page.tsx", "<PageHeader eyebrow={t.leaderboard.title} title={t.leaderboard.topPredictors} />"]] },
  "/fairness": { title: "common.resolutionAttestation", h1: "common.howAMarketResolves", proof: [["src/app/fairness/page.tsx", "return { title: t.common.resolutionAttestation };"]] },
  "/help": { title: "common.help", h1: "help.heading", proof: [["src/app/help/page.tsx", "return { title: t.common.help };"], ["src/app/help/page.tsx", "eyebrow={t.help.pageTitle} title={t.help.heading}"]] },
  "/notifications": { title: "notif.title", h1: "notif.title", proof: [["src/app/notifications/page.tsx", "return { title: t.notif.title };"]] },
  "/profile": { title: "profile.title", h1: "profile.title", proof: [["src/app/profile/page.tsx", "return { title: t.profile.title };"]] },
  "/profile/kyc": { title: "profile.kycIdentityVerification", h1: "profile.verifyIdentity", proof: [["src/app/profile/kyc/page.tsx", "return { title: t.profile.kycIdentityVerification };"], ["src/app/profile/kyc/page.tsx", ": t.profile.verifyIdentity}"]] },
  "/profile/invite": { title: "profile.inviteFriends", h1: "profile.inviteFriends", proof: [["src/app/profile/invite/page.tsx", "return { title: payable ? t.profile.inviteEarn : t.profile.inviteFriends };"]] },
  "/profile/invite (an agent)": { title: "agent.dashTitle", h1: "agent.dashTitle", proof: [["src/app/profile/invite/page.tsx", "if (dashboard) return { title: t.agent.dashTitle };"], ["src/app/profile/invite/agent-dashboard.tsx", '<h1 className="sr-only">{t.agent.dashTitle}</h1>']] },
  "/proposals": { title: "proposals.title", h1: "proposals.voteForMarkets", proof: [["src/app/proposals/page.tsx", "const title = t.proposals.title;"], ["src/app/proposals/page.tsx", "eyebrow={t.proposals.title} title={t.proposals.voteForMarkets}"]] },
  "/agent": { title: "agent.title", h1: "agent.title", proof: [["src/app/agent/page.tsx", "return { title: t.agent.title };"]] },
  "/markets": { title: "market.title", h1: "market.title", proof: [["src/app/markets/page.tsx", "return { title: t.market.title };"]] },
  "/profile/responsible-gambling": { title: "rg.playerProtection", h1: "profile.responsibleGambling", proof: [["src/app/profile/responsible-gambling/page.tsx", "return { title: t.rg.playerProtection };"]] },
  "/profile/account": { title: "profile.myAccount", h1: "profile.myAccount", proof: [["src/app/profile/account/page.tsx", "return { title: t.profile.myAccount };"]] },
  "/profile/activity": { title: "activity.title", h1: "activity.title", proof: [["src/app/profile/activity/page.tsx", "return { title: t.activity.title };"]] },
  "/watchlist": { title: "watchlist.title", h1: "watchlist.title", proof: [["src/app/watchlist/page.tsx", "return { title: t.watchlist.title };"]] },
  "/profile/notifications": { title: "push.pageTitle", h1: "push.pageTitle", proof: [["src/app/profile/notifications/page.tsx", "return { title: t.push.pageTitle };"]] },
  "/profile/security": { title: "security.title", h1: "security.title", proof: [["src/app/profile/security/page.tsx", "return { title: t.security.title };"]] },
  "/profile/source-of-funds": { title: "profile.sourceOfFunds", h1: "profile.sourceOfFunds", proof: [["src/app/profile/source-of-funds/page.tsx", "return { title: t.profile.sourceOfFunds };"]] },
  "/profile/sessions": { title: "profile.activeSessions", h1: "profile.activeSessions", proof: [["src/app/profile/sessions/page.tsx", "return { title: t.profile.activeSessions };"]] },
  "/legal/privacy": { title: legalTitle("src/app/legal/privacy/page.tsx"), proof: [["src/app/legal/privacy/page.tsx", "title: TITLE[locale]"]] },
  "/legal/aml": { title: legalTitle("src/app/legal/aml/page.tsx"), proof: [["src/app/legal/aml/page.tsx", "title: TITLE[locale]"]] },
  "/legal/terms": { title: legalTitle("src/app/legal/terms/page.tsx"), proof: [["src/app/legal/terms/page.tsx", "title: TITLE[locale]"]] },
  "/legal/rules": { title: legalTitle("src/app/legal/rules/page.tsx"), proof: [["src/app/legal/rules/page.tsx", "title: TITLE[locale]"]] },
  "/legal/responsible-gambling": { title: legalTitle("src/app/legal/responsible-gambling/page.tsx"), proof: [["src/app/legal/responsible-gambling/page.tsx", "title: TITLE[locale]"]] },
  "/auth/login": { title: "auth.signInTitle", proof: [["src/app/auth/login/page.tsx", "return { title: t.auth.signInTitle };"]] },
  "/auth/register": { title: "auth.signUpTitle", proof: [["src/app/auth/register/page.tsx", "title: t.auth.signUpTitle,"]] },
};
/**
 * A door's verdict. `name` — it names the page as the page names itself (its tab or its h1, every language, letter case
 * aside). Every other verdict says why it legitimately differs, and two keep the difference as a CONTROL (it must still
 * differ, so the verdict flips loudly the day the words land): `s12` (new words needed — the report's S12) and `owner`
 * (a ruling the owner has to make).
 */
type Verdict = "name" | "action" | "kind" | "home" | "brand" | "notice" | "dormant" | "s12" | "owner";
type Door = { at: string; proof: [string, string]; words: Words; to: string; verdict: Verdict; why?: string };
const FILES = {
  topbar: "src/components/journey/journey-top-bar.tsx", sheet: "src/components/layout/wallet-sheet.tsx", wallet: "src/app/wallet/wallet-client.tsx",
  receipts: "src/app/wallet/receipts/page.tsx", deposit: "src/app/wallet/deposit/page.tsx", ret: "src/app/wallet/deposit/return/page.tsx",
  receipt: "src/app/wallet/receipt/[id]/page.tsx", withdraw: "src/app/wallet/withdraw/page.tsx", bell: "src/components/layout/notifications-panel.tsx",
  band: "src/components/home/updown-band.tsx", updown: "src/app/updown/page.tsx", history: "src/app/updown/history/page.tsx",
  switch: "src/components/journey/tickets/ticket-switch.tsx", udStake: "src/components/updown/updown-stake-controls.tsx",
  udPanel: "src/components/updown/round-stake-panel.tsx", apply: "src/app/agent/apply/apply-client.tsx", kyc: "src/app/profile/kyc/page.tsx",
  cashback: "src/components/ui/cashback-promo.tsx", menu: "src/components/layout/avatar-menu.tsx",
};
const DOORS: Door[] = [
  // The journey header (SJ-15) and the Wallet sheet.
  { at: "header · the gilt pill", proof: [FILES.topbar, "<span>{t.journey.depositAction}</span>"], words: "journey.depositAction", to: "/wallet/deposit", verdict: "name" },
  { at: "header · Ingia", proof: [FILES.topbar, "{t.common.signIn}"], words: "common.signIn", to: "/auth/login", verdict: "name" },
  { at: "header · Jisajili", proof: [FILES.topbar, "{t.common.signUp}"], words: "common.signUp", to: "/auth/register", verdict: "owner",
    why: "one act, two names in both shells: the header's \"Jisajili / Sign up\" and the page's eyebrow, tab and submit \"Fungua akaunti / Create account\" — the owner picks one (composition either way; the header's pill needs the S4 fit re-measured if it grows)" },
  { at: "Wallet sheet · deposit", proof: [FILES.sheet, "{journey ? t.journey.depositAction : t.common.deposit}"], words: "journey.depositAction", to: "/wallet/deposit", verdict: "name" },
  { at: "Wallet sheet · withdraw", proof: [FILES.sheet, "{journey ? t.journey.withdrawAction : t.common.withdraw}"], words: "journey.withdrawAction", to: "/wallet/withdraw", verdict: "name" },
  { at: "Wallet sheet · Fungua pochi", proof: [FILES.sheet, "{t.wallet.openWallet}"], words: "wallet.openWallet", to: "/wallet", verdict: "action", why: "\"open\" + the page's own name (Pochi)" },
  // /wallet and its pages.
  { at: "/wallet · Weka pesa button", proof: [FILES.wallet, "{journey ? t.journey.depositAction : t.common.deposit}"], words: "journey.depositAction", to: "/wallet/deposit", verdict: "name" },
  { at: "/wallet · Toa pesa button", proof: [FILES.wallet, "{journey ? t.journey.withdrawAction : t.common.withdraw}"], words: "journey.withdrawAction", to: "/wallet/withdraw", verdict: "name" },
  { at: "/wallet · the zero balance's link", proof: [FILES.wallet, "{journey ? t.journey.depositAction : t.common.addFunds}"], words: "journey.depositAction", to: "/wallet/deposit", verdict: "name" },
  { at: "/wallet · the empty book's door", proof: [FILES.wallet, "{journey ? t.journey.depositAction : t.common.depositCta}"], words: "journey.depositAction", to: "/wallet/deposit", verdict: "name" },
  { at: "/wallet · Risiti zote", proof: [FILES.wallet, "{t.receipts.allReceipts}"], words: "receipts.allReceipts", to: "/wallet/receipts", verdict: "action", why: "\"all\" + the page's name (Risiti)" },
  { at: "/wallet/receipts · the empty book's door", proof: [FILES.receipts, "{journey ? t.journey.depositAction : t.common.depositCta}"], words: "journey.depositAction", to: "/wallet/deposit", verdict: "name" },
  { at: "/wallet/deposit · back", proof: [FILES.deposit, '<BackLink fallbackHref="/wallet" label={t.wallet.title} />'], words: "wallet.title", to: "/wallet", verdict: "name" },
  { at: "/wallet/deposit · the break's Toa pesa", proof: [FILES.deposit, "{journey ? t.journey.withdrawAction : t.common.withdraw}"], words: "journey.withdrawAction", to: "/wallet/withdraw", verdict: "name" },
  { at: "/wallet/withdraw · back", proof: [FILES.withdraw, '<BackLink fallbackHref="/wallet" label={t.wallet.title} />'], words: "wallet.title", to: "/wallet", verdict: "name" },
  { at: "the provider's return · back to the wallet", proof: [FILES.ret, "{t.error.backToWallet}"], words: "error.backToWallet", to: "/wallet", verdict: "action", why: "\"back to\" + the page's name" },
  { at: "the provider's return · view receipt", proof: [FILES.ret, "{t.wallet.viewReceipt}"], words: "wallet.viewReceipt", to: "/wallet/receipt/[id]", verdict: "action", why: "\"view\" + the page's name (Risiti)" },
  { at: "the provider's return · try again", proof: [FILES.ret, "{t.error.tryAgain}"], words: "error.tryAgain", to: "/wallet/deposit", verdict: "action", why: "a retry: names the act, not the page" },
  { at: "the receipt · all receipts", proof: [FILES.receipt, "{t.receipts.allReceipts}"], words: "receipts.allReceipts", to: "/wallet/receipts", verdict: "action", why: "\"all\" + the page's name" },
  { at: "the receipt · back to the wallet", proof: [FILES.receipt, "{t.error.backToWallet}"], words: "error.backToWallet", to: "/wallet", verdict: "action", why: "\"back to\" + the page's name" },
  // The bell.
  { at: "bell · see all", proof: [FILES.bell, "{t.notif.seeAll}"], words: "notif.seeAll", to: "/notifications", verdict: "action", why: "\"see all\" of the panel's list" },
  { at: "bell · a notice", proof: [FILES.bell, "{t.notif.seeAll}"], words: { sw: "‹the notice's sentence›", en: "‹the notice's sentence›", zh: "‹the notice's sentence›" }, to: "/notifications", verdict: "notice",
    why: "a notice is its event's sentence (stored when sent, in three languages), not a page's name; the row opens the page the event concerns" },
  // Up & Down.
  { at: "home · the Up & Down band", proof: [FILES.band, "{t.home.updownCta}"], words: "home.updownCta", to: "/updown", verdict: "action", why: "\"Play Up & Down\": the game named in the act" },
  { at: "home · all rounds", proof: [FILES.band, "{t.home.udMatchAllRounds}"], words: "home.udMatchAllRounds", to: "/updown", verdict: "action", why: "\"all rounds\": the board's content" },
  { at: "home · the next round", proof: [FILES.band, "{t.home.udMatchNextRound}"], words: "home.udMatchNextRound", to: "/updown", verdict: "action", why: "\"play the next round\"" },
  { at: "/updown · the history pill", proof: [FILES.updown, "const historyName = journey ? t.journey.tabTickets : t.market.udHistoryTitle;"], words: "journey.tabTickets", to: "/updown/history", verdict: "name" },
  { at: "/updown/history · the empty list's board door", proof: [FILES.history, '<Link href="/updown" className="btn btn-primary btn-md">{t.market.udTitle}</Link>'], words: "market.udTitle", to: "/updown", verdict: "name" },
  { at: "Tiketi zangu's switch · Maswali", proof: [FILES.switch, '{ value: "questions", labelEn: t.journey.tabQuestions, href: "/positions" }'], words: "journey.tabQuestions", to: "/positions", verdict: "kind", why: "the switch names the KIND of ticket inside the one page \"Tiketi zangu\"" },
  { at: "Tiketi zangu's switch · Juu/Chini", proof: [FILES.switch, '{ value: "updown", labelEn: t.nav.updown, href: "/updown/history" }'], words: "nav.updown", to: "/updown/history", verdict: "kind", why: "the kind, as above" },
  { at: "Up & Down · not enough money (card)", proof: [FILES.udStake, "{t.market.udDepositCta}"], words: "market.udDepositCta", to: "/wallet/deposit", verdict: "name" },
  { at: "Up & Down · not enough money (round)", proof: [FILES.udPanel, "{t.market.udDepositCta}"], words: "market.udDepositCta", to: "/wallet/deposit", verdict: "name" },
  // The agent's fee, the KYC page's way back, the withdrawn cash back.
  { at: "/agent/apply · the shortfall's top-up", proof: [FILES.apply, "{journey ? t.journey.depositAction : t.agent.payTopUp}"], words: "journey.depositAction", to: "/wallet/deposit", verdict: "name" },
  { at: "/profile/kyc · continue", proof: [FILES.kyc, "{t.common.continue}"], words: "common.continue", to: "/wallet/withdraw", verdict: "action", why: "\"Continue\": back to wherever the player came from (`?next=`)" },
  { at: "the cash back promo", proof: [FILES.cashback, "{t.common.depositNow}"], words: "common.depositNow", to: "/wallet/deposit", verdict: "dormant", why: "the cash back programme is withdrawn (`bonusIsLiveFor()`): the promo is never drawn — if it returns, its door takes the pair" },
];
// The tabs (JOURNEY_TABS), the hub's rows (both readers), the avatar menu's journey rows, the journey footer (RENDERED) and
// /profile's rows (parsed): added below from the code itself, so a door added there is a door counted here.
const { JOURNEY_TABS } = req("../src/lib/nav/active-tab.ts") as { JOURNEY_TABS: Array<{ key: string; href: string; label: string }> };
const TAB_VERDICT: Record<string, [Verdict, string?]> = {
  questions: ["home", "the front page carries the brand's name in its tab (an absolute title) and the hero's question as its h1; the tab names the board it holds"],
  updown: ["s12", "sw \"Juu/Chini\" (the tab, the nav, the switch) against the page's \"Juu na Chini\" — triage r5-5's S12 item, a native speaker's word"],
  tickets: ["name"], account: ["name"],
};
for (const tab of JOURNEY_TABS) DOORS.push({ at: `tab · ${tab.key}`, proof: ["src/lib/nav/active-tab.ts", `label: "${tab.label}"`], words: tab.label, to: tab.href, verdict: TAB_VERDICT[tab.key]?.[0] ?? ("?" as Verdict), why: TAB_VERDICT[tab.key]?.[1] });
const { hubRowsFor } = req("../src/components/journey/account/hub-rows.ts") as { hubRowsFor: (v: unknown) => Array<{ rows: Array<{ id: string; kind: string; href?: string; label?: string }> }> };
const member = (agent: boolean) => ({ signedIn: true, userId: "u", name: "n", initials: "N", phone: "p", balance: 1, walletHeld: false, kycOffered: true, agentInStanding: agent, proposalsState: "OPEN",
  doors: { inviteVisible: true, invitePaid: false, proposalsVisible: true, agentDoorVisible: true, staffConsole: false } });
const HUB_VERDICT: Record<string, [Verdict, string?]> = {
  limits: ["action", "an RG door names the act on its page (R5-A's ruling; owner-approved RG doors)"], break: ["action", "an RG door, as above"], exclude: ["action", "an RG door, as above"],
  search: ["action", "\"Tafuta\": the act the board offers (R5-A)"], agent: ["brand", "\"Kuwa wakala\" is the page's name without its brand (\"Kuwa Wakala wa 50pick\") — R5-A ruled it the page's own"],
  aml: ["s12", "no key holds the AML page's Swahili title (R5-A's S12)"], rules: ["s12", "no key holds the rules page's name (R5-A's S12)"],
};
const seenHub = new Set<string>();
for (const [viewer, rows] of [["guest", hubRowsFor({ signedIn: false })], ["member", hubRowsFor(member(false))], ["agent", hubRowsFor(member(true))]] as const) {
  for (const row of rows.flatMap((g) => g.rows)) {
    if (!row.href || !row.label) continue;
    const key = `${row.id}|${row.href}|${row.label}`;
    if (seenHub.has(key)) continue;
    seenHub.add(key);
    const to = row.label === "agent.dashTitle" ? "/profile/invite (an agent)" : row.href.replace(/#.*$/, "");
    const [verdict, why] = HUB_VERDICT[row.id] ?? ["name"];
    DOORS.push({ at: `hub (${viewer}) · ${row.id}`, proof: ["src/components/journey/account/hub-rows.ts", `"${row.label}"`], words: row.label, to, verdict, why });
  }
}
{
  // The avatar menu's journey rows: the literal rows as MENU_ROWS writes them, with the journey's overrides.
  const menu = code(FILES.menu);
  const lit = (href: string) => {
    const m = new RegExp(`\\{ href: "${esc(href)}",\\s*icon: I\\.\\w+,\\s*en: "([^"]*)",\\s*sw: "([^"]*)",\\s*zh: "([^"]*)"`).exec(menu);
    return m ? { en: m[1], sw: m[2], zh: m[3] } : { en: "‹absent›", sw: "‹absent›", zh: "‹absent›" };
  };
  const proof: [string, string] = [FILES.menu, 'const journeyName: Partial<Record<string, string>> = journey ? { "/profile/kyc": t.profile.verifyIdentity, "/leaderboard": t.leaderboard.title, "/proposals": t.proposals.title } : {};'];
  DOORS.push(
    { at: "avatar menu · Wasifu", proof, words: lit("/profile"), to: "/profile", verdict: "name" },
    { at: "avatar menu · Pochi", proof, words: lit("/wallet"), to: "/wallet", verdict: "name" },
    { at: "avatar menu · Matokeo", proof, words: lit("/results"), to: "/results", verdict: "name" },
    { at: "avatar menu · invite (unpaid)", proof: [FILES.menu, "{ ...r, en: t.profile.inviteFriends, sw: t.profile.inviteFriends, zh: t.profile.inviteFriends, accent: false }"], words: "profile.inviteFriends", to: "/profile/invite", verdict: "name" },
    { at: "avatar menu · invite (paid — a paid player or an agent)", proof: [FILES.menu, "r.invite && !invitePaid"], words: lit("/profile/invite"), to: "/profile/invite (an agent)", verdict: "owner",
      why: "\"Alika na upate zawadi / Invite & Earn\" where an agent's page is \"Dashibodi ya wakala\" and the hub says so; for a paid PLAYER the page and this row say \"Alika na upate zawadi\" while the hub and the footer keep \"Alika marafiki\" — where the \"earn\" promise may stand is the owner's (D5), so neither is changed here" },
    { at: "avatar menu · Tiketi zangu (journey)", proof: [FILES.menu, "{ ...r, icon: I.ticket, en: t.journey.tabTickets, sw: t.journey.tabTickets, zh: t.journey.tabTickets }"], words: "journey.tabTickets", to: "/positions", verdict: "name" },
    { at: "avatar menu · Bingwa (journey)", proof, words: "leaderboard.title", to: "/leaderboard", verdict: "name" },
    { at: "avatar menu · Mapendekezo (journey)", proof, words: "proposals.title", to: "/proposals", verdict: "name" },
    { at: "avatar menu · KYC (journey)", proof, words: "profile.verifyIdentity", to: "/profile/kyc", verdict: "name" },
  );
}
{
  // /profile's rows, as the page writes them (a shared body: both shells).
  const prof = code("src/app/profile/page.tsx");
  const PROFILE_VERDICT: Record<string, [Verdict, string?]> = { "agent.dashTitle": ["name"] };
  for (const m of prof.matchAll(/<SettingRow icon=\{I\.\w+\}\s+title=\{t\.([\w.]+)\}[^>]*?href="([^"]+)"/g)) {
    const [key, href] = [m[1], m[2]];
    const to = key === "agent.dashTitle" ? "/profile/invite (an agent)" : href;
    const [verdict, why] = PROFILE_VERDICT[key] ?? ["name"];
    DOORS.push({ at: `/profile · ${key}`, proof: ["src/app/profile/page.tsx", `title={t.${key}}`], words: key, to, verdict, why });
  }
}
{
  // The journey footer, RENDERED in each language; every link it draws is a door counted here.
  const { PublicFooter } = req("../src/components/layout/public-footer.tsx") as { PublicFooter: unknown };
  const props = { proposalsState: "OPEN", agentDoorVisible: true, inviteVisible: true, supportEmail: "desk@example.test", supportPhone: "0700000000", supportPhoneTel: "+255700000000", journeyShown: true };
  const FOOTER_VERDICT: Record<string, [Verdict, string?]> = {
    "/profile/responsible-gambling": ["action", "an RG door: \"Weka mipaka\" names the act (owner-approved RG copy)"],
    "/legal/responsible-gambling": ["action", "an RG door: \"Pumzika / Jizuie\" names the acts (owner-approved RG copy)"],
    "/legal/rules": ["s12", "no key holds the rules page's name (R5-A's S12)"], "/legal/aml": ["s12", "no key holds the AML page's Swahili title (R5-A's S12)"],
    "/agent": ["brand", "the page's name without its brand (R5-A)"], "/profile/account": ["action", "\"Hamisha / funga akaunti yangu\": the two acts the page offers"],
  };
  const links = LOCALES.map((l) => [...inLocale(l, h(PublicFooter as never, props as never)).matchAll(/<a [^>]*href="(\/[^"#?]*)"[^>]*>([\s\S]*?)<\/a>/g)]
    .map((m) => ({ l, href: m[1], words: unesc(text(m[2])).replace(/\s+/g, " ").trim() })));
  const byHref = new Map<string, Record<Loc, string>>();
  for (const set of links) for (const k of set) {
    if (k.href === "/") continue; // the brand's own mark
    const prev = byHref.get(k.href) ?? ({} as Record<Loc, string>);
    // The proposals link carries its state flag ("INAKUJA") beside the name; the name is what is compared.
    prev[k.l] = k.href === "/proposals" ? k.words.replace(new RegExp(`\\s*${esc(word(k.l, "proposals.comingSoonTag"))}$`, "i"), "") : k.words;
    byHref.set(k.href, prev);
  }
  for (const [href, w] of byHref) {
    const [verdict, why] = FOOTER_VERDICT[href] ?? ["name"];
    DOORS.push({ at: `journey footer · ${href}`, proof: ["src/components/layout/public-footer.tsx", "journeyShown"], words: w, to: href, verdict, why });
  }
}
{
  const proofs = Object.entries(PAGES).flatMap(([href, p]) => p.proof.filter(([f, s]) => !has(f, s)).map(([f, s]) => `${href}: ${f} ∌ ${s}`));
  ok(`2.1 · every page's name is read from its own source (${Object.keys(PAGES).length} pages: each tab title and h1 proved in the file that sets it)`, proofs.length === 0, proofs.join(" | "));
  const doorProofs = DOORS.filter((d) => !has(d.proof[0], d.proof[1])).map((d) => `${d.at}: ${d.proof[0]} ∌ ${d.proof[1]}`);
  ok(`2.2 · every door is read from its own source (${DOORS.length} doors: the tabs, the hub for a guest, a player and an agent, the header and the Wallet sheet, the Wallet, the receipt, the bell, Up & Down, /profile's rows, the avatar menu, the journey footer rendered in three languages)`,
    doorProofs.length === 0 && DOORS.length >= 80, `${DOORS.length} doors · ${doorProofs.join(" | ")}`);
  const unknownPage = DOORS.filter((d) => !PAGES[d.to] && !["home", "notice", "kind", "action", "dormant"].includes(d.verdict));
  ok("2.3 · every door that must name its page opens a page this census knows", unknownPage.length === 0, j(unknownPage.map((d) => `${d.at} → ${d.to}`)));
  const named = (d: Door, l: Loc) => {
    const p = PAGES[d.to];
    const w = fold(words(d.words, l));
    return !!p && (w === fold(words(p.title, l)) || (!!p.h1 && w === fold(words(p.h1, l))));
  };
  const wrong = DOORS.filter((d) => d.verdict === "name" && !LOCALES.every((l) => named(d, l)));
  ok("2.4 · every door ruled `name` says its page's own name — its tab or its h1 — in sw, en and zh (letter case aside)", wrong.length === 0,
    j(wrong.map((d) => ({ at: d.at, to: d.to, door: LOCALES.map((l) => words(d.words, l)), page: LOCALES.map((l) => words(PAGES[d.to]?.title ?? "", l)) }))));
  const stale = DOORS.filter((d) => (d.verdict === "s12" || d.verdict === "owner") && LOCALES.every((l) => named(d, l)));
  ok("2.5 CONTROL · every door kept for S12 or for the owner still differs from its page in some language — the day the words land, this flips and the verdict is re-ruled",
    stale.length === 0, j(stale.map((d) => d.at)));
  const unexplained = DOORS.filter((d) => d.verdict !== "name" && !d.why);
  const unruled = DOORS.filter((d) => !["name", "action", "kind", "home", "brand", "notice", "dormant", "s12", "owner"].includes(d.verdict));
  ok("2.6 · every door that differs says why (an act, a kind, the front page, the brand, a notice, a withdrawn promo, S12, or the owner's)", unexplained.length === 0 && unruled.length === 0,
    j([...unexplained, ...unruled].map((d) => d.at)));
  // The census, printed per locale (the report's table): door words → the page's tab / h1, with the verdict.
  console.log("     census (sw · en · zh):");
  for (const d of DOORS) {
    const p = PAGES[d.to];
    const cell = (l: Loc) => `${words(d.words, l)} → ${p ? `${words(p.title, l)}${p.h1 && fold(words(p.h1, l)) !== fold(words(p.title, l)) ? ` | h1 ${words(p.h1, l)}` : ""}` : d.to}`;
    console.log(`       [${d.verdict}] ${d.at}: ${LOCALES.map(cell).join(" · ")}`);
  }
  // PLANTS: a door that says another page's word, and a census that loses a door.
  const planted: Door = { at: "PLANT", proof: ["", ""], words: "common.deposit", to: "/wallet/deposit", verdict: "name" };
  ok("2.4′ PLANT · the deposit screen's old Swahili name on a journey door (\"Amana\" → a page named \"Weka pesa\") is reported", !named(planted, "sw"));
  const plantedPage = { ...PAGES, "/wallet/deposit": { ...PAGES["/wallet/deposit"], title: "common.deposit", h1: "common.deposit" } };
  ok("2.4″ PLANT · the page's old name with the doors' new words (the defect this item fixed) is reported", fold(words("journey.depositAction", "sw")) !== fold(words(plantedPage["/wallet/deposit"].title, "sw")));
  // ONE NAME, ONE PAGE — the other half: two pages a journey reader can open must not share a name, or say why they do.
  const collisions = (pages: Record<string, Page>) => {
    const found = new Set<string>();
    for (const l of LOCALES) {
      const by = new Map<string, string[]>();
      for (const [href, p] of Object.entries(pages)) if (!href.includes("(")) by.set(fold(words(p.title, l)), [...(by.get(fold(words(p.title, l))) ?? []), href]);
      for (const hrefs of by.values()) if (hrefs.length > 1) found.add([...hrefs].sort().join(" + "));
    }
    return found;
  };
  const SHARED_BY_DESIGN: Record<string, string> = {
    "/positions + /updown/history": "one page, Tiketi zangu, in its two kinds (its switch names the kind)",
    "/wallet/receipt/[id] + /wallet/receipts": "Swahili and Chinese write one word for a receipt and for receipts (\"Risiti\", 收据)",
  };
  const SHARED_S12: Record<string, string> = {
    "/notifications + /profile/notifications": "the inbox and the push-settings page are both \"Arifa / Notifications / 通知\" — the settings page needs a name of its own (S12)",
  };
  const found = collisions(PAGES);
  const unruledPairs = [...found].filter((k) => !SHARED_BY_DESIGN[k] && !SHARED_S12[k]);
  ok(`2.8 · no two pages share a name unless ruled: ${[...found].join("; ")}`, unruledPairs.length === 0, j(unruledPairs));
  ok("2.8′ CONTROL · the S12 pair still shares its name (it flips the day the settings page gets its own)", Object.keys(SHARED_S12).every((k) => found.has(k)));
  ok("2.8″ PLANT · the withdraw screen titled with the deposit's name (\"Weka pesa\") — two pages under one name — is reported",
    [...collisions({ ...PAGES, "/wallet/withdraw": { ...PAGES["/wallet/withdraw"], title: "journey.depositAction" } })].some((k) => !SHARED_BY_DESIGN[k] && !SHARED_S12[k]));
}
{
  // EVERY DOOR TO THE TWO MONEY PAGES, ANYWHERE IN THE PRODUCT: each site is a door in the census above, classic-only chrome,
  // or not a door (a redirect, a URL built for an action) — so a new door cannot be added without its words being ruled.
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mts)$/.test(n) ? [p.replace(/\\/g, "/")] : [];
  });
  const DOOR_AT = /(?:href=\{?["'`](\/wallet\/(?:deposit|withdraw))(?:\?[^"'`]*)?["'`]|router\.push\(["'`](\/wallet\/(?:deposit|withdraw))["'`])/g;
  const sites = walk("src").filter((f) => !f.startsWith("src/app/admin/") && !f.startsWith("src/app/api/"))
    .flatMap((f) => [...code(f).matchAll(DOOR_AT)].map((m) => `${f} → ${m[1] ?? m[2]}`));
  const CENSUSED = new Set(DOORS.filter((d) => d.to === "/wallet/deposit" || d.to === "/wallet/withdraw").map((d) => `${d.proof[0]} → ${d.to}`));
  // The classic bar's pill (and the classic rail's coin, whose address is a variable this pattern does not read) are classic
  // chrome: a journey reader is drawn neither (`app-shell.tsx`: the journey's header and tabs in their place).
  const CLASSIC_ONLY = new Set(["src/components/layout/top-app-bar.tsx → /wallet/deposit"]);
  const loose = [...new Set(sites)].filter((s) => !CENSUSED.has(s) && !CLASSIC_ONLY.has(s));
  console.log(`     the sites: ${[...new Set(sites)].join(" · ")}`);
  ok(`2.7 · every door to /wallet/deposit and /wallet/withdraw in the product (${new Set(sites).size} sites) is in the census with its words ruled, or classic-only chrome (the classic bar's pill)`,
    loose.length === 0 && sites.length >= 12, `${j([...new Set(sites)])} · loose: ${j(loose)}`);
  ok("2.7′ PLANT · a new door to the deposit screen added anywhere (here: the receipt page) is reported as unruled",
    !CENSUSED.has(`${FILES.receipt} → /wallet/deposit`) && !CLASSIC_ONLY.has(`${FILES.receipt} → /wallet/deposit`));
}

/* ══ §3 · G-1's SWEEP · THE FIXES ═══════════════════════════════════════════════════════════════════════════════════ */
section("3 · G-1's sweep fixes · the history page's tab and its pill, /profile's help row, the agent's top-up, an agent's invite tab");
{
  const HISTORY = "src/app/updown/history/page.tsx";
  const hm = await Promise.all(LOCALES.flatMap((l) => [true, false].map(async (jr) => ({ l, jr, title: titleOf(await runMeta(HISTORY, journeyDeps(l, jr))) }))));
  ok(`3.1 · RUN: /updown/history's tab follows its h1 — "${hm[0].title}" for a journey reader (Tiketi zangu's Up & Down kind, as /positions' tab), "${hm[1].title}" for everybody else`,
    hm.every((m) => m.title === (m.jr ? word(m.l, "journey.tabTickets") : word(m.l, "market.udHistoryTitle"))), j(hm));
  ok("3.1′ CONTROL · its h1 for a journey reader IS \"Tiketi zangu\" (the tickets' head), and its tab was \"Juu na Chini zako\" for everybody",
    has(HISTORY, '{journey ? <TicketsHead current="updown" t={t} />') && has("src/components/journey/tickets/ticket-switch.tsx", "<PageHeader title={t.journey.tabTickets} />")
      && word("sw", "market.udHistoryTitle") === "Juu na Chini zako");
  const ud = squash(code("src/app/updown/page.tsx"));
  ok("3.2 · the Up & Down board's history pill names the page it opens for a journey reader — \"Tiketi zangu\" and the tab's ticket sign — and keeps \"Juu na Chini zako\" and its portfolio sign for everybody else",
    ud.includes("const { journey } = await resolveSimpleJourney(); const historyName = journey ? t.journey.tabTickets : t.market.udHistoryTitle;")
      && ud.includes('href="/updown/history" aria-label={historyName} className={HEADER_PILL} > {journey ? <I.ticket s={13} /> : <I.portfolio s={13} />} <span className="hidden sm:inline">{historyName}</span>')
      && has("src/lib/nav/active-tab.ts", '{ key: "tickets", href: "/positions", glyph: "ticket", label: "journey.tabTickets" }'));
  const prof = code("src/app/profile/page.tsx");
  ok(`3.3 · /profile's help row names the help page as the page does — "${word("en", "common.help")}" / "${word("zh", "common.help")}" (its tab), where it said "${word("en", "profile.helpSupport")}" / "${word("zh", "profile.helpSupport")}"`,
    /<SettingRow icon=\{I\.heartPulse\}\s+title=\{t\.common\.help\}\s+subtitle=\{t\.profile\.helpSupportSub\}\s+href="\/help" \/>/.test(prof) && !/title=\{t\.profile\.helpSupport\}/.test(prof)
      && has("src/app/help/page.tsx", "return { title: t.common.help };"));
  ok("3.3′ CONTROL · the words differed in English and Chinese only (\"Msaada\" in both Swahili keys) — why R5-A's Swahili read missed it",
    word("en", "profile.helpSupport") !== word("en", "common.help") && word("zh", "profile.helpSupport") !== word("zh", "common.help") && word("sw", "profile.helpSupport") === word("sw", "common.help"));
  ok("3.3″ · the chat's RG card keeps its \"Msaada\" door's words (an RG surface: never reworded)", has("src/components/chat/messages/RgRedirectCard.tsx", "{i18n.profile.helpSupport}"));
  const apply = squash(code("src/app/agent/apply/apply-client.tsx")), applyPage = squash(code("src/app/agent/apply/page.tsx"));
  ok(`3.4 · the agent's top-up door says the deposit screen's journey name ("${word("sw", "journey.depositAction")}") beside the header's own pill; a classic reader keeps "${word("sw", "agent.payTopUp")}"`,
    apply.includes('onClick={() => router.push("/wallet/deposit" as never)}> {journey ? t.journey.depositAction : t.agent.payTopUp} </Button>')
      && apply.includes("export function ApplyClient({ app, documents, missing, kycGate, fee, lipa, walletPay, limits, journey }: Props) {")
      && applyPage.includes("const { journey } = await resolveSimpleJourney();") && applyPage.includes("journey={journey} />"));
  // An agent's invite tab: RUN with the readers stubbed.
  const INVITE = "src/app/profile/invite/page.tsx";
  const inviteDeps = (l: Loc, o: { session: boolean; payable: boolean; approved: boolean | "throws" }) => ({
    getServerT: async () => ({ t: dict[l], locale: l }),
    currentSession: async () => (o.session ? { userId: "u1" } : null),
    invitePaysPlayersNow: async () => o.payable,
    db: { affiliate: { findByUserId: async () => { if (o.approved === "throws") throw new Error("read failed"); return o.approved ? { approvedAt: "2026-09-01T00:00:00Z" } : null; } } },
    isApprovedAgent: (a: { approvedAt?: string | null } | null) => !!a?.approvedAt,
  });
  const cases = [
    { name: "an approved agent", o: { session: true, payable: false, approved: true as const }, want: "agent.dashTitle" },
    { name: "an approved agent, players paid", o: { session: true, payable: true, approved: true as const }, want: "agent.dashTitle" },
    { name: "a player, unpaid", o: { session: true, payable: false, approved: false as const }, want: "profile.inviteFriends" },
    { name: "a player, paid", o: { session: true, payable: true, approved: false as const }, want: "profile.inviteEarn" },
    { name: "a failed read", o: { session: true, payable: false, approved: "throws" as const }, want: "profile.inviteFriends" },
    { name: "no session", o: { session: false, payable: false, approved: true as const }, want: "profile.inviteFriends" },
  ];
  const inv = await Promise.all(cases.map(async (c) => ({ name: c.name, got: titleOf(await runMeta(INVITE, inviteDeps("sw", c.o))), want: word("sw", c.want) })));
  ok(`3.5 · RUN: an agent's invite tab is the dashboard's own name ("${word("sw", "agent.dashTitle")}", its h1 and its hub row), asked as the body asks it; a player's tab is unchanged; a failed read is "not an agent"`,
    inv.every((c) => c.got === c.want) && has("src/lib/server/affiliate-service.ts", "if (!isApprovedAgent(acct) || !acct) return null;")
      && has("src/app/profile/invite/agent-dashboard.tsx", '<h1 className="sr-only">{t.agent.dashTitle}</h1>'), j(inv));
  ok(`3.5′ CONTROL · the agent's tab said "${word("sw", "profile.inviteEarn")}" over a body headed "${word("sw", "agent.dashTitle")}"`, word("sw", "profile.inviteEarn") !== word("sw", "agent.dashTitle"));
}

/* ══ §4 · G-5 · THE REGULATOR'S NAME ═══════════════════════════════════════════════════════════════════════════════ */
section("4 · G-5 · the regulator's one name — one pattern, kept whole wherever its line can hold it, on every line that prints it");
const fontkit = createRequire(import.meta.url)("fontkit") as {
  openSync: (p: string) => { layout: (s: string) => { positions: { xAdvance: number }[] }; unitsPerEm: number };
};
const interReg = fontkit.openSync("src/lib/server/reports/fonts/Inter-Regular.ttf");
const monoReg = fontkit.openSync("src/lib/server/reports/fonts/JetBrainsMono-Regular.ttf");
const IDEO = /[㐀-鿿豈-﫿　-〿＀-￯]/;
/** Inter (or the mono) at a size and tracking; an ideograph is 1em; a format character is nothing. */
const widthOf = (s: string, size = 13, track = -0.05, face = interReg) => {
  const chars = [...s].filter((c) => !/\p{Cf}/u.test(c));
  const ideo = chars.filter((c) => IDEO.test(c)).length;
  const latin = chars.filter((c) => !IDEO.test(c)).join("");
  const adv = latin ? face.layout(latin).positions.reduce((a, p) => a + p.xAdvance, 0) / face.unitsPerEm * size : 0;
  return adv + ideo * size + track * chars.length;
};
const CSS = raw("src/app/globals.css");
const gbtFrom = (container: string, l: Loc) => Number(new RegExp(`@container ${container} \\(min-width: ([0-9.]+)px\\) \\{ \\.kp-gbt-name:lang\\(${l}\\) \\{ white-space: nowrap; \\} \\}`).exec(CSS)?.[1]);
const { REGULATOR_NAME, regulatorSplit } = req("../src/lib/regulator-name.ts") as { REGULATOR_NAME: RegExp; regulatorSplit: (s: string) => [string, string, string] | null };
const NAME: Record<Loc, string> = Object.fromEntries(LOCALES.map((l) => [l, regulatorSplit(word(l, "footer.licensedByGbt"))?.[1] ?? "‹none›"])) as Record<Loc, string>;
{
  ok(`4.1 · one pattern finds the name in each language's licence sentence (${LOCALES.map((l) => `${l} "${NAME[l].replace(/\p{Cf}/gu, "")}"`).join(", ")}), and cuts it without changing a character`,
    LOCALES.every((l) => { const c = regulatorSplit(word(l, "footer.licensedByGbt")); return !!c && c.join("") === word(l, "footer.licensedByGbt"); })
      && NAME.en === "Gaming Board of Tanzania" && NAME.sw === "Bodi ya Michezo ya Kubahatisha Tanzania" && /^坦桑尼亚\p{Cf}?博彩委员会$/u.test(NAME.zh));
  const kw = code("src/components/ui/keep-words.tsx"), od = code("src/lib/offline-document.ts");
  ok("4.2 · one home: `keepRegulator` and the offline document both read `regulator-name.ts`; neither spells the pattern; the module is pure and holds no invisible character",
    kw.includes('import { regulatorSplit } from "@/lib/regulator-name";') && od.includes('import { regulatorSplit } from "@/lib/regulator-name";')
      && !/Bodi ya Michezo ya Kubahatisha/.test(kw) && !/Bodi ya Michezo ya Kubahatisha/.test(od)
      && !/^\s*import /m.test(code("src/lib/regulator-name.ts")) && !/[ ​⁠]|\\u(?:00a0|200b|2060)/i.test(raw("src/lib/regulator-name.ts")));
  // global-error may import nothing but React: its copy is held to the one pattern, its Chinese written in its own escapes.
  const ge = raw("src/app/global-error.tsx");
  const geSrc = /const REGULATOR_NAME = \/(.+)\/u;/.exec(ge)?.[1] ?? "";
  const geDecoded = geSrc.replace(/\\u([0-9a-f]{4})/gi, (_, x: string) => String.fromCharCode(parseInt(x, 16)));
  ok("4.3 · global-error's copy of the pattern is the one pattern, character for character once its escapes are read", geDecoded === REGULATOR_NAME.source && /u/.test(REGULATOR_NAME.flags), `${geDecoded} vs ${REGULATOR_NAME.source}`);
  const drifted = geDecoded.replace("坦桑尼亚\\p{Cf}?博彩委员会", "坦桑尼亚博彩委员会");
  ok("4.3′ PLANT · a copy that lost the zh name's break-hint allowance is reported", drifted !== REGULATOR_NAME.source);
}
{
  // THE OPT-OUT SHELL'S FOOTER — RENDERED from its own source (the function transpiled, its parts stubbed), in every language.
  const shell = raw("src/components/layout/app-shell.tsx");
  const fn = fnText(shell, "function OptOutShell(");
  const js = esbuild.transformSync(fn, { loader: "tsx", jsx: "transform" }).code;
  const { keepRegulator } = req("../src/components/ui/keep-words.tsx") as { keepRegulator: (s: string) => unknown };
  const Stub = ({ children }: { children?: unknown }) => h("div", null, children as never);
  const OptOutShell = new Function("React", "SkipToContent", "FiftyLockup", "LanguageMenu", "MainLandmark", "keepRegulator", "LICENCE_NUMBER", `${js}\nreturn OptOutShell;`)(
    React, () => null, () => null, () => null, Stub, keepRegulator, () => "LIC-0001") as (p: { t: unknown; children: unknown }) => unknown;
  const footers = LOCALES.map((l) => ({ l, mk: renderToStaticMarkup(h(OptOutShell as never, { t: dict[l], children: null } as never)) }));
  const line = (mk: string) => /<p class="([^"]*)">([^]*?)<\/p>/.exec(mk.slice(mk.indexOf('data-testid="optout-footer"')))!;
  const shellOk = footers.every(({ l, mk }) => {
    const m = line(mk);
    return /\bkp-gbt\b/.test(m[1]) && /\bflex-1\b/.test(m[1]) && m[2].includes(`<span class="kp-gbt-name">${NAME[l]}</span>`) && unesc(text(m[2])) === word(l, "footer.licensedByGbt");
  });
  ok("4.4 · RENDERED: the opt-out shell's licence line is a `.kp-gbt` line taking the row's remainder (`flex-1`), its words the dictionary's with the name in its keep span, in every language",
    shellOk, j(footers.map(({ l, mk }) => [l, line(mk)[1], line(mk)[2].slice(0, 120)])));
  // The geometry: the row is the board column less its gutters; the line is the row less the 28px roundel and its 10px gap.
  const roundel = Number(/\.kp-rg__18 \{[^}]*?width: ([0-9]+)px;/.exec(CSS)?.[1]);
  const gap = Number(/<div className="flex items-center gap-\[([0-9]+)px\]">\s*\{\/\*[^]*?\*\/\}\s*<span className="kp-rg__18">/.exec(shell)?.[1]);
  const lineAt = (vw: number) => Math.min(vw, 1280) - (vw >= 1024 ? 64 : 32) - roundel - gap;
  const need = (l: Loc) => widthOf(l === "zh" ? NAME.zh : `${NAME[l]}.`);
  const from = (l: Loc) => gbtFrom("kp-gbt", l);
  ok(`4.5 · the line is the row less the roundel (${roundel}px) and its gap (${gap}px) — vw − 70 under 1024 — and the name is kept from globals.css's own widths (en ${from("en")}, sw ${from("sw")}, zh ${from("zh")}: the name and its full stop, ${LOCALES.map((l) => `${l} ${need(l).toFixed(1)}`).join(", ")}px, plus 3)`,
    roundel === 28 && gap === 10 && lineAt(320) === 250 && LOCALES.every((l) => from(l) >= need(l) + 2 && from(l) <= need(l) + 6));
  // Where the name was torn and where it is now whole: a 2-line balanced split of the sentence, with and without the name kept.
  const sentence = (l: Loc) => word(l, "footer.licensedByGbt");
  const splitsName = (l: Loc, vw: number) => widthOf(sentence(l)) > lineAt(vw) && l !== "zh";
  const torn = { en: [320, 334].every((vw) => splitsName("en", vw)) && !splitsName("en", 335), sw: [333, 390].every((vw) => splitsName("sw", vw) && lineAt(vw) >= from("sw")) && !splitsName("sw", 391) };
  ok(`4.6 · the widths the rule changes: en 320–334 ("Licensed by the Gaming" / "Board of Tanzania." → "Licensed by the" / "Gaming Board of Tanzania.") and sw 333–390 (→ "Leseni ya" / "Bodi ya Michezo ya Kubahatisha Tanzania."); under 333 no Swahili line can hold the name and it wraps as before; zh is one line from 320`,
    torn.en && torn.sw && lineAt(332) < from("sw") && widthOf(sentence("zh")) <= lineAt(320), j({ torn, en: widthOf(sentence("en")).toFixed(1), sw: widthOf(sentence("sw")).toFixed(1), zh: widthOf(sentence("zh")).toFixed(1) }));
  const collapsed = squash(code("src/components/layout/app-shell.tsx")).replace('className="kp-gbt flex-1 text-text-muted', 'className="kp-gbt text-text-muted');
  ok("4.4′ PLANT · the line made a size container without `flex-1` (a contained line has no width of its own to give its flex row: it would collapse) is reported",
    !/className="kp-gbt flex-1 /.test(collapsed));
}
{
  // THE OFFLINE DOCUMENT — RUN: CSS only, the words unchanged, the thresholds globals.css's own.
  const OD = req("../src/lib/offline-document.ts") as { offlineDocument: (o: { licenceNumber: string }) => string; OFFLINE_GBT_FROM: Record<Loc, number>; OFFLINE_LOCALES: Loc[] };
  const doc = OD.offlineDocument({ licenceNumber: "LIC-0001" });
  const css = /<style>([\s\S]*?)<\/style>/.exec(doc)?.[1] ?? "";
  const spans = LOCALES.map((l) => {
    const m = new RegExp(`<span class="l" lang="${l}">([^<]*)<span class="kp-gbt-name">([^<]*)</span>([^<]*)</span>`).exec(doc);
    return { l, ok: !!m && m[2] === NAME[l] && m[1] + m[2] + m[3] === word(l, "footer.licensedByGbt").replace(/&/g, "&amp;") };
  });
  ok("4.7 · RUN: the offline document's licence line holds each language's name in a `.kp-gbt-name` span, the sentence's characters unchanged", spans.every((s) => s.ok), j(spans));
  const rules = LOCALES.map((l) => ({ l, doc: Number(new RegExp(`@container kp-gbt \\(min-width:([0-9.]+)px\\)\\{\\.kp-gbt-name:lang\\(${l}\\)\\{white-space:nowrap\\}\\}`).exec(css)?.[1]), app: gbtFrom("kp-gbt", l) }));
  ok(`4.8 · its line is the row's remainder and a size container (\`.kp-off__gbt\`), and the name is nowrap from globals.css's own widths (${rules.map((r) => `${r.l} ${r.doc}`).join(", ")}) — CSS only, no new script`,
    /\.kp-off__rg \.kp-off__gbt\{[^}]*flex:1 1 0%;min-width:0;container:kp-gbt\/inline-size\}/.test(css) && rules.every((r) => r.doc === r.app && r.doc === OD.OFFLINE_GBT_FROM[r.l])
      && count(doc, "<script>") === 2 && /\.kp-off__rg-row\{display:flex;align-items:center;gap:10px\}/.test(css) && /\.kp-off__18\{flex:none;[^}]*width:28px/.test(css), j(rules));
  const driftedDoc = css.replace("@container kp-gbt (min-width:263px)", "@container kp-gbt (min-width:240px)");
  ok("4.8′ PLANT · a Swahili threshold drifted from globals.css (240px: under the name's 259.3px, it would overflow) is reported",
    Number(/@container kp-gbt \(min-width:([0-9.]+)px\)\{\.kp-gbt-name:lang\(sw\)/.exec(driftedDoc)?.[1]) !== gbtFrom("kp-gbt", "sw"));
  // The document's face: Inter first, then the system's. Next's capsize table: every platform face sets Latin narrower than Inter.
  const CAPSIZE = JSON.parse(readFileSync("node_modules/next/dist/server/capsize-font-metrics.json", "utf8")) as Record<string, { xWidthAvg: number; unitsPerEm: number }>;
  const avg = (k: string) => CAPSIZE[k].xWidthAvg / CAPSIZE[k].unitsPerEm;
  const faces = ["roboto", "segoeUI", "helveticaNeue", "notoSans", "arial"].map((k) => ({ k, avg: +avg(k).toFixed(4) }));
  ok(`4.9 · the system faces the offline document falls back to (Roboto, Segoe UI, Helvetica Neue, Noto Sans, Arial) all set Latin narrower than Inter (${avg("inter").toFixed(4)} em) — a width that holds the name in Inter holds it in each`,
    faces.every((f) => f.avg < avg("inter")), j(faces));
}
{
  // GLOBAL-ERROR — RENDERED in each language (its locale read from the cookie), the name an inline-block where its line can hold it.
  const GlobalError = (req("../src/app/global-error.tsx") as { default: unknown }).default;
  const g = globalThis as { document?: unknown };
  const geRender = (l: Loc) => {
    g.document = { cookie: `kp-locale=${l}` };
    try { return renderToStaticMarkup(h(GlobalError as never, { error: Object.assign(new Error("x"), { digest: "d1" }), reset: () => undefined } as never)); }
    finally { delete g.document; }
  };
  const GE_NAME = { en: "Gaming Board of Tanzania", sw: "Bodi ya Michezo ya Kubahatisha Tanzania", zh: "坦桑尼亚博彩委员会" };
  const kept = LOCALES.map((l) => ({ l, ok: geRender(l).includes(`<span style="display:inline-block">${GE_NAME[l]}</span>`) }));
  ok("4.10 · RENDERED: global-error's licence line keeps the name as an inline-block in every language (its own face and no stylesheet: the browser measures whether the line can hold it)",
    kept.every((k) => k.ok), j(kept));
  // The widths: 11px in a column of min(420, vw − 48). Measured in Inter; the device face is narrower (4.9).
  const ge = raw("src/app/global-error.tsx");
  const gbt = (l: Loc) => (new Function(`return ${/\n\s*gbt: ("[^"]*"),/g.exec(ge.slice(ge.indexOf(`  ${l}: {`)))?.[1]}`)() as string);
  const col = (vw: number) => Math.min(420, vw - 48);
  const lineW = (l: Loc) => widthOf(gbt(l), 11, 0), nameW = (l: Loc) => widthOf(GE_NAME[l], 11, 0);
  ok(`4.11 · the line it changes: sw (${lineW("sw").toFixed(1)}px) wraps on every phone to 393px and its greedy break fell inside the name; the name (${nameW("sw").toFixed(1)}px) fits a 320 phone's ${col(320)}px column whole; en (${lineW("en").toFixed(1)}px) and zh (${lineW("zh").toFixed(1)}px) are one line from 320`,
    lineW("sw") > col(393) && lineW("sw") <= col(394) && nameW("sw") <= col(320) && lineW("en") <= col(320) && lineW("zh") <= col(320));
  ok("4.10′ PLANT · the line printed plain (the name splittable again) is reported", !renderToStaticMarkup(h("span", null, gbt("sw"))).includes("inline-block"));
}
{
  // EVERY LINE THAT PRINTS THE REGULATOR'S NAME, CLASSIFIED: kept whole, frozen chrome, never able to split, or not a player's line.
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mts|mjs)$/.test(n) ? [p.replace(/\\/g, "/")] : [];
  });
  const PRINTS = /Gaming Board of Tanzania|Licensed by Gaming Board|Bodi ya Michezo ya Kubahatisha|博彩委员会|博彩管理委员会|\\u535a\\u5f69\\u59d4\\u5458\\u4f1a|footer\.licensedByGbt|\bwfGbt\b|auth\.licensedByGbt/;
  const files = walk("src").filter((f) => f !== "src/lib/i18n-dict.ts" && PRINTS.test(code(f)));
  const CLASS: Record<string, string> = {
    "src/components/layout/public-footer.tsx": "kept (journey arm, R5-A) · the classic arm is frozen chrome, main's bytes",
    "src/components/home/hero-intro.tsx": "kept (the hero's trust row, R5-A; its ghost draws the same component)",
    "src/components/layout/app-shell.tsx": "kept (the opt-out shell's footer, this round)",
    "src/lib/offline-document.ts": "kept (the offline document, this round — CSS only)",
    "src/app/global-error.tsx": "kept (an inline-block, this round)",
    "src/components/ui/keep-words.tsx": "the keeper itself (`keepRegulator`)",
    "src/lib/regulator-name.ts": "the pattern itself",
    "src/app/api/og/market/[id]/route.tsx": "never splits: a fixed 1200×630 image, one 14px mono row of 1080px holding 613px",
    "src/lib/server/email.ts": "never splits: 231px of 11px Inter in a 300px column on a 320 phone (mail clients have no container queries)",
    "src/components/agent/commission-waterfall.tsx": "never splits where its line can hold it: the name STARTS the label, so a greedy line breaks inside it only when the line is narrower than the name",
    "src/components/auth/auth-shell.tsx": "the acronym (\"18+ · Licensed by GBT\"): nothing to split — the name's form is an S12/owner item",
    "src/app/legal/privacy/page.tsx": "legal prose (D19a: the published legal text is origin/main's own, byte for byte; a policy version ships any change) — and a list item that begins with the name",
    "src/app/legal/terms/page.tsx": "legal prose (D19a), running text: a held 25–40 character name would leave a hole of most of a phone line in the paragraph",
    "src/app/legal/rules/_content-up-down.tsx": "legal prose (D19a), as above",
    "src/app/legal/rules/_content-yes-no.tsx": "legal prose (D19a), as above",
    "src/app/_actions/chat.ts": "the assistant's instructions: never shown as written",
    "src/app/api/dev-test/marketing-typed-test-seed/route.ts": "a development seed, never served in production",
    "src/lib/marketing/consent-basis.ts": "staff console wording (a list's basis), not a player's line",
    "src/app/admin/system/system-client.tsx": "staff console: the licence field's hint",
    "src/lib/server/reports/catalogue.ts": "a regulator report's note (staff exports), not a player's line",
    "src/lib/support-config.ts": "an evidence record (`FIRST_LICENSED_EVIDENCE().basis`), printed on no player surface",
  };
  const unclassified = files.filter((f) => !CLASS[f]);
  ok(`4.12 · every source that prints the regulator's name (${files.length} files, the dictionary aside) is classified: kept whole (5), frozen, never able to split, legal prose under D19a, the acronym, or not a player's line`,
    unclassified.length === 0 && files.length >= 15, `unclassified: ${j(unclassified)} · files: ${j(files)}`);
  ok("4.12′ PLANT · a new line printing the name (the dashboard's licence strip, say) is reported as unclassified", !CLASS["src/app/agent/page.tsx"]);
  // The lines that cannot split, measured.
  const og = widthOf("Predict events. Not chance.", 14, 0, monoReg) + widthOf("Licensed by the Gaming Board of Tanzania · 18+", 14, 0, monoReg);
  const email = widthOf("18+ · Licensed by Gaming Board of Tanzania", 11, 0);
  const wf = LOCALES.map((l) => ({ l, starts: String(at(dict[l], "agent.wfGbt")).search(/Gaming Board of Tanzania|Bodi ya Michezo ya Kubahatisha Tanzania|坦桑尼亚博彩/u) === 0 }));
  ok(`4.13 · the lines left alone cannot tear the name: the OG card's row ${og.toFixed(0)} of 1080px; the email's line ${email.toFixed(0)} of 300px at 320; the waterfall's label begins with the name in every language`,
    og < 1080 && email < 300 && wf.every((w) => w.starts) && has("src/app/api/og/market/[id]/route.tsx", "<span>Licensed by the Gaming Board of Tanzania · 18+</span>")
      && has("src/lib/server/email.ts", "18+ · Licensed by Gaming Board of Tanzania<br>"), j(wf));
  // Legal prose is left as published: no keep span or size container in the legal tree (D19a pins it to main; a policy
  // version ships any change), and this item's own diff touches none of it.
  const legalFiles = walk("src/app/legal");
  const legalKept = legalFiles.filter((f) => /keepRegulator|kp-gbt/.test(code(f)));
  let legalTouched: string[] = [];
  try { legalTouched = execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" }).split("\n").filter((p) => p.startsWith("src/app/legal/")); } catch { legalTouched = ["‹git unavailable›"]; }
  ok(`4.14 · legal prose is left as published: none of the ${legalFiles.length} legal files wraps the name, and this item's diff touches none (D19a's pin; a policy version ships any change there)`,
    legalFiles.length >= 14 && legalKept.length === 0 && legalTouched.length === 0, j({ legalKept, legalTouched }));
}

/* ══ §5 · WHAT CLASSIC READERS KEEP ════════════════════════════════════════════════════════════════════════════════ */
section("5 · classic readers keep their words: the money pages, their ghosts, the classic footer; the shared bodies changed are named");
{
  const { DepositGhost } = req("../src/app/wallet/deposit/deposit-ghost.tsx") as { DepositGhost: unknown };
  const classicHead = headOf(renderToStaticMarkup(h(DepositGhost as never, { t: dict.sw, journey: false } as never)));
  ok(`5.1 · a classic reader's deposit ghost is today's: "${unesc(classicHead.eyebrow)}" over "${unesc(classicHead.h1)}"`, unesc(classicHead.eyebrow) === "Weka pesa" && unesc(classicHead.h1) === "Amana");
  const { PublicFooter } = req("../src/components/layout/public-footer.tsx") as { PublicFooter: unknown };
  const classic = renderToStaticMarkup(h(PublicFooter as never, { proposalsState: "OPEN", agentDoorVisible: true, inviteVisible: true, supportEmail: "d@x.t", supportPhone: "0", supportPhoneTel: "+0" } as never));
  ok("5.2 · the classic footer keeps main's licence line: no keep span, no size container (frozen chrome)", !classic.includes("kp-gbt") && text(classic).includes(word("sw", "footer.licensedByGbt")));
  ok("5.3 · the two shared-body changes classic readers see too: /profile's help row (\"Help\" / \"帮助\"; Swahili unchanged) and an approved agent's invite tab (\"Dashibodi ya wakala\")",
    has("src/app/profile/page.tsx", "title={t.common.help}") && has("src/app/profile/invite/page.tsx", "if (dashboard) return { title: t.agent.dashTitle };"));
}

console.log(`\nvisual-pass-r5g: ${pass} passed, ${fails.length} failed`);
if (fails.length) { console.log(fails.map((f) => `  ✗ ${f}`).join("\n")); process.exitCode = 1; }
