/**
 * test:maswali-design — MILLIONEA'S SURFACES SAY ONLY WHAT IS TRUE, IN THE PLATFORM'S OWN DRAWING (MASWALI-BUILD S5 pages;
 * MASWALI-PLAN §7b S5 item 7; DESIGN_AUTHORITY §M8a; the S5 UI review of 2026-10-18).
 *
 *   npx tsx scripts/maswali-design.test.mts     (npm run test:maswali-design)
 *
 *   §1 the brief's laws: gold only where money was earned (and the two commits that move it); one lit answer per row; no
 *      emoji; no count-up; no score on a loss; no potential payout; the countdown only on the slip and the hub's buy block
 *   §2 the S5 UI review, each finding as a case the old code fails, with its control:
 *        H1 a void is said truthfully (being voided: "if it stands"; voided: "refunded" only once landed)
 *        H2 a seal line is final only on the week's word (never at the settlement gate, inside the objection window)
 *        M3 a certain void says so (no "a reserve will take its place"); reserves below zero in words (D-20)
 *        M4 every Millionea key is a family key, `void` is Phosphor's `prohibit`; the ticket card's link has a visible name
 *        M5 each question's answers are one radio group; M6 polite regions mounted from the first render
 *        M7 the home card has a voiding and a voided state; L8 L10 L11 L12 L13
 *      and the review of 24ec0d33 (R4): no next week promised in a final week, its day the template's; a pending carry
 *      "at least" on the card
 *      and round 3's shares (R3): a forfeited share is its own state on every surface that says a ticket's state, and a
 *      result line says paid, held and forfeited shares as they are
 *   §3 its own controls: each source check is seen to fail on a planted copy
 *
 * ⏳ §2 M4's family checks STAY RED until the Phosphor lane's W2 swap is merged in (W2 is on main at 732efbc5, and maswali-s4
 *    carries it): every MILLIONEA_GLYPHS key on `I`, each drawn from MASWALI-PLAN §10c's Phosphor pick — the map names it
 *    and the generated registry draws it — and `I.void` the registry's `prohibit`. They test the drawing itself, so a
 *    legacy literal gone is not enough to pass them. By the lead's ruling this suite is NOT in predeploy.
 * Pure: it reads source files and runs the pure builders. No server, no database, no network, no file written.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import NodeModule from "node:module";
import * as ts from "typescript";
import { dict } from "../src/lib/i18n-dict.ts";
import { fill, formatTzs, formatTzsSigned } from "../src/lib/utils.ts";
import { outcomeWord } from "../src/lib/side-label.ts";
import { sealLineOf } from "../src/components/maswali/maswali-seal-line.tsx";
import { poolRule, type PoolView } from "../src/components/maswali/maswali-pool-figure.tsx";
import { millioneaLedgerRows, type MillioneaLedgerInput } from "../src/components/maswali/maswali-ledger.tsx";
import { dressLedgerRows, ledgerInputOf } from "../src/app/millionea/hub-pool.tsx";
import { homeCardOf, nextWeekOpen } from "../src/components/maswali/maswali-card-model.ts";
import { outcomeStampText } from "../src/components/maswali/maswali-outcome-stamp.tsx";
import { counted, eatWeekday } from "../src/components/maswali/maswali-format.ts";
import { eatIsoWeek } from "../src/lib/eat-day.ts";
import { capReachedLine, resultDoorSerial, resultLine } from "../src/app/millionea/millionea-view.ts";
import { TICKET_SHOWN_KEY } from "../src/lib/maswali-week-label.ts";
import type { MillioneaNotice } from "../src/lib/server/maswali-player.ts";
import { MILLIONEA_GLYPHS } from "../src/components/maswali/maswali-glyph.tsx";
import { I } from "../src/components/ui/glyphs.tsx";
import { FILL_KEYS, GLYPH_MAP, NEW_KEYS } from "./glyphs/map.ts";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel: string) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n") : "");
const code = (src: string) => decomment(src);
const squash = (s: string) => s.replace(/\s+/g, " ");
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);
const LOCALES = ["en", "sw", "zh"] as const;
/** A node's text as a reader reads it: the one Millionea ledger's labels and values are kept runs, not strings (React's
 *  server renderer; a kept run reads no provider). */
const nodeText = (() => {
  const r = createRequire(import.meta.url);
  const { createElement } = r("react") as typeof import("react");
  const { renderToStaticMarkup: ssr } = r("react-dom/server") as typeof import("react-dom/server");
  return (n: unknown) => ssr(createElement("span", null, n as never)).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
})();
/** A week's figures as the one ledger's input, every field at rest (each case names what it sets). */
const LEDGER_AT_REST: Omit<MillioneaLedgerInput, "kind"> = {
  price: 1_000, tickets: 0, sales: 0, carryIn: null, floor: null, topUp: 0, jackpot: null, feePct: 13, fee: null, levies: null,
  winners: 0, toWinners: null, share: null, paid: null, remainder: null, carriedForward: null, refunds: null, sunset: null,
};
/** The hub's live figure (`maswali-pool-feed.ts`'s frame), for the hub's own input to the one ledger (`ledgerInputOf`). */
const hubFigure = (over: Record<string, unknown>) => ({ weekId: "w", code: "MLN-2026-W48", visibility: "PUBLIC", state: "OPEN", carryIn: null, carryPendingCode: null,
  carryFromCode: null, sales: 0, floor: 1_000_000, jackpot: 1_000_000, atLeast: false, feeRate: 0.13, ...over }) as never;

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

/** Every Millionea source file: the routes and the components. */
const MLN_FILES: string[] = (() => {
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const n of readdirSync(join(ROOT, rel))) {
      const p = `${rel}/${n}`;
      if (statSync(join(ROOT, p)).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(n)) out.push(p);
    }
  };
  walk("src/app/millionea");
  walk("src/components/maswali");
  return out.sort();
})();
const SLIP = "src/components/maswali/maswali-slip.tsx";
const SLIP_CLIENT = "src/app/millionea/slip/slip-client.tsx";
const TICKET = "src/components/maswali/maswali-ticket.tsx";
const LEDGER = "src/components/maswali/maswali-win-ledger.tsx";
const CARD = "src/components/maswali/maswali-home-card.tsx";
const HUB = "src/app/millionea/page.tsx";
const TICKET_PAGE = "src/app/millionea/tickets/[serial]/page.tsx";
const REGISTER_WEEK = "src/app/millionea/register/[week]/page.tsx";

// ── §1 · the brief's laws ───────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · the brief's laws (MASWALI-PLAN §7b S5 item 7)");
/** Gold, as a class or a variant: the gilt ink and metal, the gold button, the raw gold tokens. */
const GOLD = /\bgilt-(?:ink|metal)\b|\bbtn-gold\b|variant="gold"|var\(--gilt\b|\b(?:text|bg|border)-gold\b/g;
/** Where gold may stand, and how many times (§M8a item 7, D-5): the won amount and the ledger's two earned lines; the
 *  confirm's armed commit; the slip's deposit entry (the platform's own, shipped). Everywhere else: none. */
const GOLD_ALLOWED: Record<string, number> = { [LEDGER]: 2, [SLIP]: 2, [SLIP_CLIENT]: 2 };
const goldDefects = (readAt: (rel: string) => string) => MLN_FILES.flatMap((f) => {
  const n = (code(readAt(f)).match(GOLD) ?? []).length;
  return n === (GOLD_ALLOWED[f] ?? 0) ? [] : [`${f}: ${n} gold mark(s), ${GOLD_ALLOWED[f] ?? 0} allowed`];
});
{
  const d = goldDefects(read);
  ok(`1.1 · gold only where money was earned or moves (§M8a item 7, D-5): the win ledger's earned figures, the confirm's armed commit and the deposit entry — none on the pool, the jackpot, the floor, the card, the stub (${MLN_FILES.length} files)`,
    MLN_FILES.length >= 30 && d.length === 0, d.join(" | "));
  const slip = squash(code(read(SLIP)));
  ok("1.2 · one lit answer per row: each side's variant lights only when it is THE pick, the other a ghost (§B2)",
    slip.includes('const yesLit = pick === "YES", noLit = pick === "NO";') && slip.includes('variant={yesLit ? "yes" : "ghost"}') && slip.includes('variant={noLit ? "no" : "ghost"}'));
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{1F000}-\u{1F2FF}]/u;
  const emojiIn = [...MLN_FILES.filter((f) => EMOJI.test(code(read(f)))),
    ...LOCALES.flatMap((l) => Object.entries(dict[l].millionea as Record<string, string>).filter(([, v]) => EMOJI.test(v)).map(([k]) => `${l}.millionea.${k}`))];
  ok("1.3 · no emoji in a Millionea string or on a Millionea surface (comments aside)", emojiIn.length === 0, emojiIn.join(" | "));
  const COUNT_UP = /CountUp|countUp|AnimatedNumber|NumberTicker|animateValue/;
  const counting = MLN_FILES.filter((f) => COUNT_UP.test(code(read(f))));
  ok("1.4 · no count-up: a figure changes by its tick, never by counting (§M8a item 7)", counting.length === 0, counting.join(" | "));
  const ledger = code(read(LEDGER));
  const loss = ledger.slice(ledger.indexOf("export function MaswaliLossReceipt"));
  ok("1.5 · no score on a loss: the receipt's rows are the facts, never a count of matches or a \"x/10\"",
    loss.length > 0 && !/\bscore\b|\/10|matched"\)\.length/.test(loss));
  const projecting = MLN_FILES.filter((f) => /potentialPayout/.test(code(read(f))));
  ok("1.6 · no potential payout anywhere on Millionea (a held ticket never names a share)", projecting.length === 0, projecting.join(" | "));
  const PILL = /<MaswaliClosingPill\b/, HOOK = /useCountdown\(/;
  const pills = MLN_FILES.filter((f) => PILL.test(code(read(f))));
  const hooks = MLN_FILES.filter((f) => HOOK.test(code(read(f))));
  ok("1.7 · a countdown is DRAWN on the slip and the hub's buy block only (§10 §8); the clock hook elsewhere only reads the close (the slip's composer) or expires a control printing a fixed time (the free cancel)",
    j(pills) === j([HUB, SLIP].sort()) && j(hooks) === j([SLIP_CLIENT, SLIP, "src/components/maswali/maswali-ticket-cancel.tsx"].sort()), j({ pills, hooks }));
}

// ── §2 · the S5 UI review ─────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · the S5 UI review, each finding a case the old code fails");
const en = dict.en, sw = dict.sw, zh = dict.zh;
type Out = "YES" | "NO" | "VOID" | null;
const week = (mains: Out[], reserves: Out[]) => [
  ...mains.map((o, i) => ({ role: "MAIN" as const, ordinal: i + 1, outcome: o })),
  ...reserves.map((o, i) => ({ role: "RESERVE" as const, ordinal: i + 1, outcome: o })),
];
const PICKS = Array.from({ length: 15 }, () => "YES" as const);

// H1 · the void, truthfully
{
  const base = { carriedIn: null, sales: { tickets: 10, amount: 10_000 }, pool: 10_000, floor: null };
  const price = formatTzs(1_000);
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-HUB, the lead's ruling: every surface that prints a week's money draws the
  // ONE Millionea ledger, the REGISTER lane's `millioneaLedgerRows`): the refund rows are that builder's, read as a reader
  // reads them; the hub's being-voided row as the hub draws it (`dressLedgerRows`, L15): no figure, and no dash either —
  // the sentence names its amount and stands alone (a "—" read as a missing figure beside "TZS 1,000"). A voided week's
  // refunds on their way print their amount muted beside "on its way back" — the week's money out reconciles on it
  // (MR-26) — and never beside "refunded" (MR-18).
  const rowOf = (rows: ReturnType<typeof millioneaLedgerRows>, key: string) => {
    const r = rows.find((x) => x.key === key);
    return r && { label: nodeText(r.label), value: nodeText(r.value), muted: r.emphasis === "muted" };
  };
  const hubVoiding = ledgerInputOf(hubFigure({ state: "RESOLVING", sales: 10_000, floor: null, jackpot: 0 }), 1_000, true);
  const voiding = rowOf(dressLedgerRows(millioneaLedgerRows(en, "en", hubVoiding), hubVoiding, { n: 0, keys: new Set() }, null), "refund");
  ok("2.H1a · being voided, the refund row is conditional and future (\"if the void stands\"), with no figure — never \"every ticket refunded\" before a refund exists",
    voiding?.label === fill(en.millionea.refundEachIfVoid, { price }) && voiding?.value === "", j(voiding));
  const voided = (landed: boolean) => rowOf(millioneaLedgerRows(en, "en", { ...LEDGER_AT_REST, kind: "voided", tickets: 10, sales: 10_000, refunds: { amount: 10_000, landed } }), "refund");
  const pending = voided(false);
  ok("2.H1b · voided with refunds still on their way: \"on its way back\" (MR-18), its amount muted — never \"refunded\" before every refund landed",
    pending?.label === fill(en.millionea.refundEachPending, { price }) && pending?.muted === true && pending.value === formatTzs(10_000), j(pending));
  const landed = voided(true);
  ok("2.H1c · CONTROL · voided with every refund landed: \"every ticket refunded\", the total beside it",
    landed?.label === fill(en.millionea.refundEach, { price }) && landed?.value === formatTzs(10_000) && landed.muted === false, j(landed));
  ok("2.H1d · a void shares no jackpot: no \"shared by every 10/10 ticket\" rule on a voiding or voided week — and the rule stands on a selling one (control)",
    poolRule(en, { kind: "voiding", ...base, price: 1_000 }, 13) === null
      && poolRule(en, { kind: "selling", ...base, jackpot: 1_000_000 }, 13) === fill(en.millionea.ruleShared, { pct: 13 }));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-HUB M6, the lead's one name for the window): the condition is an
  // objection's — "If no objection changes this by …" / "Ikiwa hakuna pingamizi …" / "若至 … 无异议 …" — never "a check".
  const conditional: Record<(typeof LOCALES)[number], RegExp> = { en: /\bIf no objection\b/, sw: /\bIkiwa hakuna pingamizi\b/, zh: /若.*无异议/ };
  const unconditional = LOCALES.filter((l) => !conditional[l].test(dict[l].millionea.weekVoidingBody) || /\bcheck\b|[Uu]kaguzi|核查/.test(dict[l].millionea.weekVoidingBody));
  ok("2.H1e · the voiding sentence is conditional in every language (an objection can still un-void the week)", unconditional.length === 0, j(unconditional));
  const page = squash(code(read(TICKET_PAGE)));
  ok("2.H1f · a ticket's void line says \"refunded\" only once ITS refund landed, \"on its way back\" before",
    page.includes('fill(refund === "pending" ? t.millionea.weekVoidedBodyPending : t.millionea.weekVoidedBody, {'));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-FIX-PLAYER P3): the register's ledger rows are built in register-parts.tsx
  // (`registerLedgerRows`, rendered by test:maswali-register §15); the week page draws them.
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER): the rows are the ONE Millionea ledger's (`maswali-ledger.tsx`,
  // rendered — refunds pending and landed, in three languages — by test:maswali-design-register 2.8); register-parts hands it
  // the read model's `refundsPending`, and the week page draws the rows with `MaswaliLedger`.
  const reg = squash(code(read("src/app/millionea/register/register-parts.tsx")));
  const ledgerSrc = squash(code(read("src/components/maswali/maswali-ledger.tsx")));
  ok("2.H1g · the register's voided ledger: \"refunded\" only once every refund landed",
    reg.includes("refunds: kind === \"voided\" ? { amount: w.sales ?? 0, landed: !w.refundsPending } : null,")
      && ledgerSrc.includes("afterIn.push(refunds.landed") && ledgerSrc.includes("label: keepFact(locale, fill(m.refundEachPending, { price }), [price])")
      && squash(code(read(REGISTER_WEEK))).includes("<MaswaliLedger rows={registerLedgerRows(t, locale, w)} />"));
}

// H2 · final only on the week's word
{
  // Main 4 voided and A1 usable: the settlement gate is READY, the objection window still open.
  const ready = week(["YES", "YES", "YES", "VOID", "YES", "YES", "YES", "YES", "YES", "YES"], ["YES", null, null, null, null]);
  const open = sealLineOf(ready, PICKS);
  ok("2.H2a · at a ready gate, unasked, the line is PENDING: no carry, no unused reserve, no Unbroken Line (an objection can still change the set)",
    open.final === false && open.unbroken === false && open.annex.every((r) => r.carriedTo === undefined && r.mark !== "unused")
      && open.mains.every((m) => m.standIn === undefined), j(open));
  const settled = sealLineOf(ready, PICKS, { final: true });
  ok("2.H2b · CONTROL · on the week's word (SETTLED) the same record is final: A1 stands in for 4, the line is unbroken",
    settled.final && settled.unbroken && settled.mains[3]?.standIn === "A1" && settled.annex[0]?.carriedTo === 4, j(settled));
  const view = squash(code(read("src/app/millionea/millionea-view.ts")));
  ok("2.H2c · the composer says final for a SETTLED week only, and voided for a VOIDED one",
    view.includes('return { weekVoid: weekState === "VOIDED", final: weekState === "SETTLED" };') && count(view, "lineOpts(weekState)") === 2);
}

// M3 · a certain void, and reserves below zero
{
  // The delivery's Timeline D: three mains void, main 5 never sealed, three reserves void — no reserve can save it.
  const doomed = week(["VOID", "VOID", "VOID", "YES", null, "YES", "YES", "YES", "YES", "YES"], ["VOID", "VOID", "VOID", null, null]);
  const line = sealLineOf(doomed, PICKS);
  ok("2.M3a · a week whose void is certain is said so (`weekVoidCertain`), though a main is still unsealed", line.voidCertain === true && line.final === false, j(line));
  const healthy = week(["VOID", "YES", "YES", "YES", null, "YES", "YES", "YES", "YES", "YES"], [null, null, null, null, null]);
  ok("2.M3b · CONTROL · one voided main with five reserves to come is not", sealLineOf(healthy, PICKS).voidCertain === false);
  const ticket = squash(code(read(TICKET)));
  ok("2.M3c · a voided main in a certain-void week is never told \"a reserve will take its place\"",
    ticket.includes("words: line.voidCertain ? t.millionea.voidWeekCertain : t.millionea.voidAwaiting"));
  ok("2.M3d · reserves below zero are said in words (D-20), never \"-1 of 5\" — on the ticket and the hub, with no clamp to a false 0",
    ticket.includes("live.reservesLeft.valid < 0 ? fill(t.millionea.reservesShort, { b: live.reservesLeft.of })")
      && squash(code(read(HUB))).includes("return valid < 0 ? fill(t.millionea.reservesShort, { b: RESERVE_COUNT })")
      && ![HUB, TICKET_PAGE].some((f) => /Math\.max\(0, RESERVE_COUNT/.test(code(read(f)))));
  // D-20 in plain words (the S5 review of 24ec0d33, LOW 14): what is true — not enough reserves for the voided questions —
  // never a figure below zero ("below 0 of 5" read as nonsense).
  const plain = (s: string) => s.trim() !== "" && !/[0-9]/.test(s) && !s.includes("{b}") && !s.includes("{a}");
  const d20 = LOCALES.filter((l) => !plain(dict[l].millionea.reservesShort) || dict[l].millionea.reservesShort === dict[l].millionea.reservesLeft);
  ok("2.M3e · the D-20 sentence says it in words in all three languages — no figure, never \"below 0\"; CONTROL: the old line is refused",
    d20.length === 0 && !plain("Valid reserves left: below 0 of {b}"), j(d20.map((l) => dict[l].millionea.reservesShort)));
}

// M4 · the family, and a link with a name
{
  const family = I as unknown as Record<string, unknown>;
  // MASWALI-PLAN §10c's picks: each key Millionea adds, and the platform's void, with the Phosphor drawing the plan names.
  const PICKS: Record<string, string> = {
    millionea: "diamond", markPending: "circle-dashed", reserve: "lifebuoy", standIn: "arrow-bend-down-right",
    carry: "arrow-bend-double-up-right", floor: "vault", register: "notebook", commitment: "fingerprint",
    refund: "arrow-u-down-left", salesPaused: "pause-circle", howTo: "book-open-text", cap: "stack", finalWeek: "flag-checkered",
    void: "prohibit",
  };
  // The drawings the codegen made from the map (`npm run glyphs:gen`; test:glyph-sync holds the two equal) — absent before W1.
  const REGISTRY_FILE = "src/components/ui/glyph-registry.generated.ts";
  const registry: Record<string, { s?: string }> | null = existsSync(join(ROOT, REGISTRY_FILE))
    ? ((await import(`../${REGISTRY_FILE}`)) as { GLYPH_REGISTRY: Record<string, { s?: string }> }).GLYPH_REGISTRY : null;
  // The map as the codegen reads it (`scripts/glyphs/codegen.mts`: `{ ...GLYPH_MAP, ...NEW_KEYS }`) — since W2 the thirteen
  // Millionea keys are in NEW_KEYS, the keys the lexicon did not have before (2026-10-18).
  const MAP: Record<string, unknown> = { ...GLYPH_MAP, ...NEW_KEYS };
  const missing = MILLIONEA_GLYPHS.filter((k) => typeof family[k] !== "function");
  const unpicked = MILLIONEA_GLYPHS.filter((k) => !(k in PICKS));
  const mapWrong = Object.entries(PICKS).filter(([k, ph]) => (MAP[k] as { ph?: string } | undefined)?.ph !== ph).map(([k]) => k);
  const drawnWrong = registry === null ? ["(no generated registry)"]
    : Object.entries(PICKS).filter(([k, ph]) => registry[k]?.s !== `p-${ph}`).map(([k]) => `${k}: ${registry[k]?.s ?? "absent"}`);
  ok(`2.M4a · every Millionea key is on the family I, drawn from §10c's Phosphor pick — the map names it and the generated registry draws it: ${missing.length} of ${MILLIONEA_GLYPHS.length} missing from I`,
    missing.length === 0 && unpicked.length === 0 && mapWrong.length === 0 && drawnWrong.length === 0,
    j({ missing, unpicked, mapWrong, drawnWrong }));
  const voidEntry = MAP.void as { ph?: string } | undefined;
  ok("2.M4b · `void` is Phosphor's `prohibit` in the map (§10c: one meaning, one glyph)", voidEntry?.ph === "prohibit", j(voidEntry));
  const glyphs = code(read("src/components/ui/glyphs.tsx"));
  const legacyVoid = read("src/components/ui/glyphs.tsx").includes('void: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></G>,');
  // The family drawn from the registry: glyphs.tsx reads it, and every key it draws is on I.
  const fromRegistry = /import \{[^}]*\bGLYPH_REGISTRY\b[^}]*\} from "\.\/glyph-registry\.generated"/.test(glyphs)
    && registry !== null && Object.keys(registry).every((k) => typeof family[k] === "function");
  ok("2.M4c · ⏳ `I.void` is the registry's `prohibit` — the family is drawn from the generated registry (W2), the legacy circled X gone (red until W2 is merged in)",
    typeof family.void === "function" && registry?.void?.s === "p-prohibit" && fromRegistry && !legacyVoid,
    j({ registryVoid: registry?.void?.s ?? null, fromRegistry, legacyVoid }));
  const ticket = squash(code(read(TICKET)));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-19 (S5 VIS P16, P10): the line has one annex rule now (no `annex` prop: under the mains
  // everywhere), and it rests for every ticket that counts for nothing (`ticketRests`: cancelled AND refunded) — §4 holds both.
  ok("2.M4d · the ticket card's one link carries a visible name in words, its accessible name starting with it",
    ticket.includes("aria-label={`${t.millionea.viewTicket} · ${serial}`}") && /<MaswaliSealLine line=\{line\} size=\{18\} inert=\{ticketRests\(shown\)\} \/> <span[^>]*>\s?\{t\.millionea\.viewTicket\}/.test(ticket));
}

// M5 · one radio group per question; M6 · polite regions mounted from the first render
const radioDefects = (src: string) => {
  const s = squash(code(src));
  const d: string[] = [];
  if (!s.includes('role="radiogroup" aria-labelledby={`${rowId}-n ${rowId}-t`}')) d.push("no radio group named by the number and the question");
  if (count(s, 'role="radio"') !== 2 || !s.includes("aria-checked={yesLit}") || !s.includes("aria-checked={noLit}")) d.push("the answers are not two radios with aria-checked");
  if (/aria-pressed/.test(s)) d.push("toggle semantics (aria-pressed) remain");
  if (!s.includes("tabIndex={noLit ? -1 : 0}") || !s.includes("tabIndex={noLit ? 0 : -1}")) d.push("not one Tab stop per question");
  if (!s.includes("onKeyDown={onArrow}") || !/ArrowRight[^;]*ArrowDown[^;]*ArrowLeft[^;]*ArrowUp/.test(s)) d.push("no arrow keys");
  if (!s.includes(`id={${"`${rowId}-n`"}}`) || !s.includes(`id={${"`${rowId}-t`"}}`)) d.push("the number and the question carry no ids");
  return d;
};
const liveDefects = (slipSrc: string, ticketSrc: string) => {
  const slip = squash(code(slipSrc)), ticket = squash(code(ticketSrc));
  const d: string[] = [];
  const slipLive = slip.indexOf('<p aria-live="polite" aria-atomic="true" className="sr-only" data-testid="millionea-slip-live">');
  if (slipLive < 0) d.push("the slip has no polite region");
  else if (/\{[^{}]*&& \(?\s*$/.test(slip.slice(Math.max(0, slipLive - 60), slipLive))) d.push("the slip's region mounts only with its words");
  if (/role="status"/.test(slip.slice(slip.indexOf("function MaswaliSlip(")))) d.push("the slip still mounts a status together with its words");
  const ticketLive = ticket.indexOf('<p aria-live="polite" aria-atomic="true" data-testid="millionea-ticket-live"');
  if (ticketLive < 0) d.push("the ticket has no polite region");
  else if (/\{liveText && $/.test(ticket.slice(Math.max(0, ticketLive - 20), ticketLive))) d.push("the ticket's region mounts only with its words");
  return d;
};
{
  const r = radioDefects(read(SLIP));
  ok("2.M5 · each question's two answers are ONE radio group named by its number and its question: radios with aria-checked, one Tab stop, the arrows move and choose", r.length === 0, r.join(" | "));
  const l = liveDefects(read(SLIP), read(TICKET));
  ok("2.M6 · the slip's refusal and the ticket's arriving results speak through polite regions mounted from the first render", l.length === 0, l.join(" | "));
}

// M7 · the home card's void states
{
  const q = (slot: number, outcome: Out) => ({ slot, role: slot <= 10 ? "MAIN" : "RESERVE", outcome });
  const weekOf = (outcomes: Out[]) => ({
    id: "w42", code: "2026-W42", visibility: "PUBLIC", state: "RESOLVING", isFinal: false,
    opensAt: "2026-10-12T06:00:00.000Z", closesAt: "2026-10-16T15:00:00.000Z", closedAt: "2026-10-16T15:00:00.000Z", firstEventAt: null,
    ticketPrice: 1_000, ticketCap: 10, selling: false, pool: { jackpot: 1_000_000, feeRate: 0.13 },
    questions: outcomes.map((o, i) => q(i + 1, o)), resultsOut: outcomes.filter((o) => o !== null).length,
    voidedMains: 0, voidedReserves: 0, nextResultAt: null, mine: null,
  });
  const hubOf = (w: unknown, last: unknown = null) => ({ line: "PUBLIC", week: w, grading: null, lastWeek: last, paused: false, life: "LIVE", nextOpensAt: null, notices: [], asOf: "2026-10-17T09:00:00.000Z" });
  const NOW = Date.parse("2026-10-17T09:00:00.000Z");
  const doomed: Out[] = ["VOID", "VOID", "VOID", "YES", null, "YES", "YES", "YES", "YES", "YES", "VOID", "VOID", "VOID", null, null];
  const voiding = homeCardOf(en, hubOf(weekOf(doomed)) as never, 0.13, NOW);
  ok("2.M7a · a week whose void is certain is \"being voided\" on the card, with no jackpot (never \"shared by every 10/10\" and \"15 of 15 results in\")",
    voiding?.state.kind === "voiding" && voiding.jackpot === null, j(voiding));
  const fine: Out[] = ["YES", "YES", "YES", "YES", null, "YES", "YES", "YES", "YES", "YES", null, null, null, null, null];
  const closed = homeCardOf(en, hubOf(weekOf(fine)) as never, 0.13, NOW);
  ok("2.M7b · CONTROL · an ordinary graded week is \"closed\", its jackpot shown", closed?.state.kind === "closed" && closed.jackpot === 1_000_000, j(closed));
  const lastVoided = { id: "w41", code: "2026-W41", state: "VOIDED", isFinal: false, closedAt: null, settledAt: null, tickets: 9, sales: 9_000, carryIn: 0, jackpot: null, winners: null, share: null, fee: null, topUp: null, paid: null, carriedForward: null, refundsPending: true };
  const voided = homeCardOf(en, hubOf(null, lastVoided) as never, 0.13, NOW);
  ok("2.M7c · a voided last week is \"voided\" on the card, its refunds still on their way", voided?.state.kind === "voided" && (voided.state as { refundsPending?: boolean }).refundsPending === true && voided.jackpot === null, j(voided));
  const card = squash(code(read(CARD)));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-19 (S5 VIS P3): the card has ONE headline block at every width — the 768 figure block is
  // gone — so one `{!voidKind && (` guards the figure's rule; the void's words are a fact line (A1, `factsIn`).
  ok("2.M7d · the card draws no figure's rule on a void (one headline block, at every width), and says the void's own words",
    count(card, "{!voidKind && (") === 1 && card.includes("meta = factsIn(t.millionea.weekVoidingShort);") && card.includes("meta = factsIn(state.refundsPending ? t.millionea.weekVoidedShortPending : t.millionea.weekVoidedShort);"));
}

// L8 L10 L11 L12 L13
{
  const slip = squash(code(read(SLIP)));
  ok("2.L8 · a closed slip's picks rest at the disabled control's own opacity, never multiplied by a wrapper's", !/state-disabled-opacity/.test(slip));
  ok("2.L9 · the Swahili mixed result line is count-neutral (no singular verb over a count)",
    !/\{w\} imeshinda|\{l\} hazikushinda/.test(sw.millionea.resultMixed) && sw.millionea.resultMixed.includes("{w}") && sw.millionea.resultMixed.includes("{l}"), sw.millionea.resultMixed);
  const ticket = squash(code(read(TICKET)));
  ok("2.L10 · an unknown payout is a dash, never a fabricated TZS 0 (AGENTS §6)", !ticket.includes("payout ?? 0") && ticket.includes('value={payout === null ? "—" : formatTzs(payout)}'));
  ok("2.L11 · the stub's ended line comes from the ticket's one state, never a second prop",
    ticket.includes('const ended = shown === "refunded" || shown === "cancelled" ? shown : undefined;') && !/ended\?:/.test(ticket) && !/\bended=/.test(squash(code(read(TICKET_PAGE)))));
  const card = squash(code(read(CARD)));
  ok("2.L12 · the card counts a player's tickets as \"n of cap this week\", never \"10/10\" under the rule's \"every 10/10 ticket\"",
    count(card, "t.millionea.yourTicketsThisWeek") === 2 && !LOCALES.some((l) => "yourTicketsShort" in (dict[l].millionea as Record<string, string>)));
  const stamp = LOCALES.filter((l) => outcomeStampText(dict[l], "VOID") !== `${dict[l].millionea.stampResult} · ${outcomeWord(dict[l], "VOID", "MASWALI")}`);
  ok("2.L13 · the stamp's VOID is the platform's own word (one definition site, §L2) in every language", stamp.length === 0 && outcomeStampText(zh, "VOID").endsWith("已作废"), j(stamp));
}

// R3 · round 3's shares: a forfeited share is its own state everywhere a ticket's state is said, and a result line
// says paid, held and forfeited shares as they are
const LIST_PAGE = "src/app/millionea/tickets/page.tsx";
/** A function's text from its stated signature (ending in its body's brace) to that body's own closing brace. */
const bodyAt = (src: string, sig: string): string => {
  const at = src.indexOf(sig);
  if (at < 0) return "";
  let depth = 0;
  for (let i = at + sig.length - 1; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(at, i + 1);
  }
  return "";
};
const CHIP_SIG = 'export function millioneaTicketChip(shown: TicketShown): StatusChipVariant | "no" {';
const SHARE_SIG = "function shareLine(t: Dict, view: MillioneaTicketView): string | null {";
/** Every switch on a ticket's state, each with its return type stated (so tsc refuses a state left out). */
const SWITCHES: ReadonlyArray<[string, string, string]> = [
  ["Tiketi zangu's payout (payoutOf)", LIST_PAGE, "function payoutOf(row: MillioneaTicketRow, price: number): number | null {"],
  ["the ticket's share mark (shareLine)", TICKET_PAGE, SHARE_SIG],
  ["the ticket's chip (millioneaTicketChip)", TICKET, CHIP_SIG],
];
const STATES = Object.keys(TICKET_SHOWN_KEY);
const unhandled = (readAt: (rel: string) => string) => SWITCHES.flatMap(([name, file, sig]) => {
  const body = bodyAt(code(readAt(file)), sig);
  if (!body) return [`${name}: not found with its stated return type`];
  return STATES.filter((s) => !body.includes(`case "${s}":`)).map((s) => `${name}: no case "${s}"`);
});
const heldGuardDefects = (hubSrc: string) => {
  const hub = squash(code(hubSrc));
  const d: string[] = [];
  const guard = hub.indexOf("if (n.winningTickets === 0 && n.held > 0) return null;"), line = hub.indexOf("text: resultLine(t, n, week, lost),");
  if (!(guard > 0 && line > guard)) d.push("a week whose every win is still held can be written on the hub");
  if (hub.includes("!n.won")) d.push("the hub still branches on `won` alone");
  return d;
};
{
  type Result = Extract<MillioneaNotice, { notice: "RESULT" }>;
  const R = (o: Partial<Result>): Result => ({ notice: "RESULT", weekId: "w42", code: "2026-W42", won: false, winningTickets: 0, total: null, held: 0, forfeited: 0, ...o });
  const W = 42;
  const cases: ReadonlyArray<[string, Result, number, string]> = [
    ["one paid share", R({ won: true, winningTickets: 1, total: 304_500 }), 0, fill(en.millionea.resultWon, { week: W })],
    ["two paid shares", R({ won: true, winningTickets: 2, total: 609_000 }), 0, fill(en.millionea.resultWonMany, { week: W, n: 2 })],
    ["a paid share beside two losses", R({ won: true, winningTickets: 1, total: 304_500 }), 2, fill(en.millionea.resultMixed, { week: W, w: 1, l: 2 })],
    ["a paid share and one still held — both won", R({ won: true, winningTickets: 1, total: 304_500, held: 1 }), 0, fill(en.millionea.resultWonMany, { week: W, n: 2 })],
    ["only a forfeited share", R({ forfeited: 1 }), 0, fill(en.millionea.resultForfeitedOne, { week: W })],
    ["two forfeited shares beside a loss", R({ forfeited: 2 }), 1, fill(en.millionea.resultForfeited, { week: W, n: 2 })],
    ["CONTROL · three losses", R({}), 3, fill(en.millionea.resultLost, { week: W, n: 3 })],
    ["CONTROL · one loss", R({}), 1, fill(en.millionea.resultLostOne, { week: W })],
  ];
  const wrong = cases.filter(([, n, lost, want]) => resultLine(en, n, W, lost) !== want).map(([name, n, lost]) => `${name}: ${resultLine(en, n, W, lost)}`);
  ok("2.R3a · a result line says what is true of each share (round 3, RR3): paid, and held beside a paid one, are \"won\"; a week whose only win was forfeited says FORFEITED; a loss is the calm loss line",
    wrong.length === 0, wrong.join(" | "));
  // The line as 24ec0d33 wrote it: on `!n.won` first — which, since round 3, a forfeited-only week also is.
  const before = (n: Result, lost: number) => !n.won || n.winningTickets + n.held === 0
    ? (lost > 0 || !n.won ? counted(Math.max(lost, 1), en.millionea.resultLostOne, en.millionea.resultLost, { week: W }) : "settled")
    : "won";
  const onlyForfeited = R({ forfeited: 1 });
  ok("2.R3b · the case the old line fails: a forfeited-only week printed \"your ticket did not win\" over a ticket that won",
    before(onlyForfeited, 0) === fill(en.millionea.resultLostOne, { week: W }) && resultLine(en, onlyForfeited, W, 0) !== before(onlyForfeited, 0));
  const said = LOCALES.filter((l) => resultLine(dict[l], onlyForfeited, W, 0) !== fill(dict[l].millionea.resultForfeitedOne, { week: W })
    || resultLine(dict[l], R({ forfeited: 3 }), W, 0) !== fill(dict[l].millionea.resultForfeited, { week: W, n: 3 }));
  ok("2.R3c · the forfeited line in every language, one and many", said.length === 0, j(said));
  const row = (serial: string, shown: string, share: string | null) => ({ serial, shown, share }) as never;
  const door = (xs: never[]) => resultDoorSerial(xs);
  const lost = row("A1", "lost", null), held = row("A2", "won", "held"), paid = row("A3", "won", "paid"), gone = row("A4", "forfeited", "forfeited");
  ok("2.R3d · the result's door opens a PAID winning ticket first (its seal plays there), else one held, else one forfeited, else the list",
    door([lost, held, gone, paid]) === "A3" && door([lost, gone, held]) === "A2" && door([lost, gone]) === "A4" && door([lost]) === null && door([]) === null);
  const g = heldGuardDefects(read(HUB));
  ok("2.R3e · a week whose every win is still HELD says nothing on the hub until Compliance decides — the line is never written for it, and `won` alone decides nothing", g.length === 0, g.join(" | "));
  const u = unhandled(read);
  ok(`2.R3f · every ticket state (${STATES.join(", ")}) is named in each switch on one — the payout, the share mark, the chip — each with its return type stated, so tsc refuses a state left out`,
    u.length === 0 && STATES.includes("forfeited") && STATES.length === 6, u.join(" | "));
  const chip = bodyAt(code(read(TICKET)), CHIP_SIG);
  ok("2.R3g · a forfeited ticket's chip is the neutral slate — never the win's green, never the loss's rose", chip.includes('case "forfeited": return "neutral";'));
  const share = squash(bodyAt(code(read(TICKET_PAGE)), SHARE_SIG));
  ok("2.R3h · the ticket's share mark: \"held\" on a won share still held, the forfeited word on a forfeited ticket, nothing on a paid one",
    share.includes('case "won": return view.share === "held" ? t.millionea.shareHeld : null;') && share.includes('case "forfeited": return t.millionea.shareForfeited;'));
  const card = squash(code(read(TICKET)));
  ok("2.R3i · Tiketi zangu's card: a forfeited share shows its word in the payout's place, a held one its own — never gold, never a figure; a paid share keeps the earned stat",
    card.includes('{shown === "won" && payout !== null ? ( <MaswaliEarnedStat t={t} amount={payout} />')
      && card.includes(') : shown === "forfeited" || (shown === "won" && share === "held") ? (')
      && card.includes('value={shown === "forfeited" ? t.millionea.shareForfeited : t.millionea.shareHeld} tone="muted"'));
  const bar = squash(code(read("src/app/millionea/tickets/tickets-bar.tsx")));
  ok("2.R3j · the lenses: a forfeited ticket is settled, never won", bar.includes('case "settled": return shown !== "running";') && bar.includes('case "won": return shown === "won";'));
  ok("2.R3k · a forfeited result is never said in the win's words, in any language",
    LOCALES.every((l) => dict[l].millionea.resultForfeitedOne !== dict[l].millionea.resultWon && dict[l].millionea.resultForfeited !== dict[l].millionea.resultWonMany));
}

// R4 · the review of 24ec0d33, MEDIUM 5 and 6: no next week promised when none can follow, its day the template's; and a
// pending carry said as "at least" on the card, as the hub's pool block says it
{
  const NOW = Date.parse("2026-10-17T09:00:00.000Z"); // a Saturday, 12:00 EAT
  const MONDAY = { weekday: 1, clock: "00:00" };
  const NEXT_MONDAY = Date.parse("2026-10-18T21:00:00.000Z"); // Monday 19 October, 00:00 EAT
  const sellingWeek = (o: Record<string, unknown> = {}) => ({
    id: "w42", code: "2026-W42", visibility: "PUBLIC", state: "OPEN", isFinal: false,
    // ⚠️ opened LATE, on Tuesday 09:00 EAT: a typed seven days from here is a Tuesday, the template's next open a Monday.
    opensAt: "2026-10-13T06:00:00.000Z", closesAt: "2026-10-18T15:00:00.000Z", closedAt: null, firstEventAt: null,
    ticketPrice: 1_000, ticketCap: 10, selling: true, pool: { jackpot: 1_000_000, feeRate: 0.13, atLeast: false, carryPendingCode: null },
    questions: [], resultsOut: 0, voidedMains: 0, voidedReserves: 0, nextResultAt: null,
    mine: { held: 10, cap: 10, tickets: [] }, ...o,
  });
  const hubOf = (w: unknown, life = "LIVE") => ({ line: "PUBLIC", week: w, grading: null, lastWeek: null, paused: false, life, nextOpensAt: null, notices: [], asOf: "2026-10-17T09:00:00.000Z" });
  const live = hubOf(sellingWeek());
  const next = nextWeekOpen(live as never, MONDAY, NOW);
  // The line as 24ec0d33 wrote it: the week's own open, plus seven typed days.
  const typed = Date.parse(sellingWeek().opensAt as string) + 7 * 86_400_000;
  ok("2.R4a · the next week opens on the TEMPLATE's next open, through the EAT calendar's helpers — a late-opened week's next is still the template's Monday, never its own Tuesday plus seven days",
    next === NEXT_MONDAY && eatWeekday(en, typed) !== eatWeekday(en, NEXT_MONDAY), j({ next: next === null ? null : new Date(next).toISOString(), typed: new Date(typed).toISOString() }));
  const none = [
    nextWeekOpen(hubOf(sellingWeek({ isFinal: true })) as never, MONDAY, NOW),
    nextWeekOpen(hubOf(sellingWeek(), "ENDING") as never, MONDAY, NOW),
    nextWeekOpen(hubOf(sellingWeek(), "RETIRED") as never, MONDAY, NOW),
    nextWeekOpen(live as never, null, NOW),
  ];
  ok("2.R4b · no next week when none can follow: the final week shown, a final week running (ENDING), Millionea ended (RETIRED) — and none on an unreadable template; CONTROL: a live week has one",
    none.every((x) => x === null) && next !== null, j(none));
  const atCap = homeCardOf(en, live as never, 0.13, NOW, next);
  const finalAtCap = homeCardOf(en, hubOf(sellingWeek({ isFinal: true })) as never, 0.13, NOW, nextWeekOpen(hubOf(sellingWeek({ isFinal: true })) as never, MONDAY, NOW));
  const capOf = (m: typeof atCap) => (m?.state.kind === "open" ? m.state.capFull : undefined);
  ok("2.R4c · the card at the cap names the template's next week and its day — and in a final week names none",
    j(capOf(atCap)) === j({ next: { week: eatIsoWeek(NEXT_MONDAY).week, opensOn: eatWeekday(en, NEXT_MONDAY) } })
      && j(capOf(finalAtCap)) === j({ next: null }), j({ atCap: capOf(atCap), finalAtCap: capOf(finalAtCap) }));
  const pending = homeCardOf(en, hubOf(sellingWeek({ pool: { jackpot: 1_000_000, feeRate: 0.13, atLeast: true, carryPendingCode: "2026-W41" } })) as never, 0.13, NOW, next);
  ok("2.R4d · a carry still waiting on an earlier week makes the card's figure a lower bound, and names that week (§M8a item 9); CONTROL: a known carry is exact",
    pending?.atLeast === true && pending.pendingWeek === 41 && atCap?.atLeast === false && atCap.pendingWeek === null, j({ pending, atCap }));
  const card = squash(code(read(CARD)));
  const door = squash(code(read("src/components/maswali/maswali-home-card-door.tsx")));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-19 (S5 VIS P3): the waiting week's line is drawn ONCE, after the R-HEADLINE, at every
  // width (it was drawn twice: in the phone column and again in the 768 block, in another order).
  ok("2.R4e · the card draws that bound as the hub does — \"at least\" around the figure and the waiting week's line — and the door hands it the model's bound and the template's next week",
    card.includes("return jackpot !== null && atLeast ? fillNodes(t.millionea.atLeast, { amount: run }) : run;")
      && card.includes("const pending = jackpot !== null && pendingWeek !== null ? fill(t.millionea.pendingCarry, { week: pendingWeek }) : null;")
      && count(card, "{pending && <span") === 1
      && door.includes("homeCardOf(t, hub, configuredFeeRate(), nowMs, nextWeekOpen(hub, millioneaOpenTemplate(), nowMs))")
      && door.includes("atLeast={model.atLeast} pendingWeek={model.pendingWeek}"));
  const hubSrc = squash(code(read(HUB)));
  const model = code(read("src/components/maswali/maswali-card-model.ts"));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-FIX-PLAYER P13): the cap's line is one helper now (`capReachedLine`), which the
  // slip's refusal says too; §5 P13 checks its words in three languages.
  const viewSrc = squash(code(read("src/app/millionea/millionea-view.ts")));
  ok("2.R4f · the hub's cap line promises no next week when none follows (`capReachedOnly`), and neither the hub nor the card counts seven days from a week's open",
    hubSrc.includes("door = <Callout tone=\"info\" role=\"status\">{capReachedLine(t, w.ticketCap, nextOpen)}</Callout>;")
      && viewSrc.includes("return nextOpenMs === null ? fill(t.millionea.capReachedOnly, { cap })")
      && hubSrc.includes("nextOpen={nextWeekOpen(hub, millioneaOpenTemplate(), nowMs)}")
      && !/7 \* 86_400_000/.test(hubSrc) && !/opened \+ 7 \* DAY_MS/.test(model));
}

// R5 · the review of 24ec0d33, LOW 14: Millionea's Chinese breaks as the platform's does — every page root and each part
// drawn on another page carries the one rule
{
  const ROOTS: ReadonlyArray<[string, string]> = [
    [HUB, '<PageContainer tier="reading" className="kp-mln-zh">'],
    ["src/app/millionea/how/page.tsx", '<PageContainer tier="reading" className="kp-mln-zh">'],
    ["src/app/millionea/slip/page.tsx", '<PageContainer tier="reading" className="kp-mln-zh">'],
    ["src/app/millionea/register/page.tsx", '<PageContainer tier="reading" className="kp-mln-zh">'],
    [REGISTER_WEEK, '<PageContainer tier="reading" className="kp-mln-zh">'],
    ["src/app/millionea/tickets/page.tsx", '<PageContainer tier="reading" className="kp-mln-zh space-y-6">'],
    [TICKET_PAGE, '<PageContainer tier="receipt" id={view.positionId} className="kp-mln-zh space-y-5">'],
    [CARD, 'className={cn("kp-mln-zh mat-raised flex items-start gap-2 rounded-card p-3'],
    ["src/app/positions/page.tsx", 'className="kp-mln-zh mat-flat flex min-h-[44px] items-center gap-3 rounded-control'],
  ];
  const zhDefects = (readAt: (rel: string) => string) => {
    const d = ROOTS.filter(([f, root]) => !code(readAt(f)).includes(root)).map(([f]) => f);
    // Every PageContainer a Millionea page draws carries it (the slip draws two).
    for (const f of MLN_FILES.filter((x) => x.startsWith("src/app/millionea/") && x.endsWith("/page.tsx"))) {
      const s = code(readAt(f));
      if (count(s, "<PageContainer") !== count(s, 'className="kp-mln-zh')) d.push(`${f}: a PageContainer without kp-mln-zh`);
    }
    const css = readAt("src/app/globals.css");
    if (!css.includes(".kp-mln-zh:lang(zh) { word-break: keep-all; overflow-wrap: anywhere; }")) d.push("globals.css: the rule");
    return d;
  };
  const z = zhDefects(read);
  ok("2.R5a · every Millionea page root, the home card and the /positions row carry `.kp-mln-zh`, the one rule that keeps a Chinese word whole (keep-all, and anywhere as the floor)", z.length === 0, z.join(" | "));
  const plantedZh = zhDefects((r) => (r === CARD ? read(r).replace('"kp-mln-zh mat-raised', '"mat-raised') : read(r)));
  ok("2.R5a′ CONTROL · the card without the rule is reported", plantedZh.includes(CARD));
}

// ── §3 · controls ─────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · controls — each source check fails on a planted copy");
{
  const plant = (rel: string, from: string, to: string) => (r: string) => (r === rel ? read(r).replace(from, to) : read(r));
  const goldCard = goldDefects(plant(CARD, 'const run = <span className={cn("amount", className)}>{figure}</span>;', 'const run = <span className={cn("amount gilt-ink", className)}>{figure}</span>;'));
  ok("3.1 · gold planted on the card's figure is reported", goldCard.some((x) => x.startsWith(CARD)));
  const toggles = radioDefects(read(SLIP).replace("aria-checked={yesLit}", "aria-pressed={yesLit}"));
  ok("3.2 · toggle semantics put back on an answer are reported", toggles.some((x) => x.includes("aria-pressed")));
  const late = liveDefects(read(SLIP), read(TICKET).replace('<p aria-live="polite" aria-atomic="true" data-testid="millionea-ticket-live"', '{liveText && <p aria-live="polite" aria-atomic="true" data-testid="millionea-ticket-live"'));
  ok("3.3 · a ticket region mounted only with its words is reported", late.some((x) => x.includes("ticket's region")));
  const noForfeit = unhandled(plant(LIST_PAGE, '    case "forfeited": return null;\n', ""));
  ok("3.4 · a payout switch that forgets the forfeited state is reported", noForfeit.some((x) => x.includes("payoutOf") && x.includes('"forfeited"')));
  const spent = heldGuardDefects(read(HUB).replace("if (n.winningTickets === 0 && n.held > 0) return null;", ""));
  ok("3.5 · a hub that writes a line for a week still on hold is reported", spent.some((x) => x.includes("still held")));
}

// ── §4 · the S5 tile read — VIS-P (S5-VIS-FINDINGS §A, §C and §D, 2026-10-19) ──────────────────────────────────────────
console.log("\n§4 · the S5 tile read (VIS-P): each fix a case the old drawing fails, with its plant");
const req = createRequire(import.meta.url);
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
{
  // A dialog's chrome is a portal, which the server renderer cannot draw: a stand-in draws the panel in place and the rest of
  // the module is its own (`test:visual-pass-r5j`'s harness), so a dialog's markup renders as the browser receives it.
  const at = req.resolve("../src/components/ui/modal.tsx");
  const real = req(at) as Record<string, unknown>;
  const stub = new NodeModule(at);
  stub.filename = at; stub.loaded = true;
  const Inline = (p: { open: boolean; children?: unknown; panelClassName?: string }) =>
    p.open ? h("div", { "data-panel": p.panelClassName ?? "" }, p.children as never) : null;
  stub.exports = { ...real, Modal: Inline };
  (req.cache as Record<string, unknown>)[at] = stub;
}
type L3 = (typeof LOCALES)[number];
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: L3; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (l: L3, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: "/" }, h(I18nProvider as never, { initial: l } as never, el as never))));
const textOf = (m: string) => m.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
/** The text of every `white-space: nowrap` run of a rendering, in order (a run may hold an `.amount` span inside it). */
const keptRuns = (m: string): string[] => {
  const out: string[] = [];
  for (const open of m.matchAll(/<span class="whitespace-nowrap[^"]*">/g)) {
    let depth = 0, i = open.index ?? 0;
    for (; i < m.length; i++) {
      if (m.startsWith("<span", i)) depth++;
      else if (m.startsWith("</span>", i) && --depth === 0) break;
    }
    out.push(textOf(m.slice(open.index ?? 0, i)));
  }
  return out;
};
const plantIn = (rel: string, from: string, to: string) => (r: string) => (r === rel ? read(r).replace(from, to) : read(r));
const FACTS = req("../src/components/maswali/maswali-facts.tsx") as typeof import("../src/components/maswali/maswali-facts.tsx");
const twCfg = ((m: { default?: unknown }) => (m.default ?? m) as { theme: { extend: { spacing: Record<string, string>; fontSize: Record<string, [string, { letterSpacing: string }]> } } })(req("../tailwind.config.ts"));
const sp = (k: string) => parseFloat(twCfg.theme.extend.spacing[k] ?? "NaN");
const rungOf = (k: string) => { const [size, o] = twCfg.theme.extend.fontSize[k] ?? ["NaN", { letterSpacing: "NaN" }]; return { px: parseFloat(size), track: parseFloat(o.letterSpacing) }; };
const fontkit = req("fontkit") as { openSync: (p: string) => { unitsPerEm: number; layout: (s: string) => { advanceWidth: number } } };
const FONT = (f: string) => fontkit.openSync(join(ROOT, "src/lib/server/reports/fonts", f));
/** A run's width in a face at a size, with the rung's own letter-spacing per character. */
const widthIn = (face: ReturnType<typeof FONT>, s: string, px: number, trackPx: number) => (face.layout(s).advanceWidth / face.unitsPerEm) * px + trackPx * Array.from(s).length;

// A1 · the fact line, built once
const factLineDefects = (m: string, n: number, joined: string) => {
  const d: string[] = [];
  const items = (m.match(/class="kp-mln-fact"/g) ?? []).length;
  if (!m.includes('class="kp-mln-facts')) d.push("no fact list");
  if (items !== n) d.push(`${items} fact items, ${n} wanted`);
  if ((m.match(/<span class="sr-only"> · <\/span>/g) ?? []).length !== n - 1) d.push("the separators are not the screen reader's alone");
  if (textOf(m) !== joined) d.push(`the text reads "${textOf(m)}"`);
  return d;
};
{
  const list = (facts: unknown[], layout?: string) => renderToStaticMarkup(h(FACTS.MaswaliFacts as never, { facts, layout } as never));
  const d = factLineDefects(list(["Alpha", "Beta", null, "Gamma"]), 3, "Alpha · Beta · Gamma");
  ok("4.A1a · a fact line: each fact its own item (an empty one dropped), the separator drawn by the stylesheet and said to a screen reader as the DOM's own \" · \" — a copy and a reader get the old joined line word for word; `stack` and `phone` are its other layouts",
    d.length === 0 && list(["a", "b"], "stack").includes("kp-mln-facts--stack") && list(["a", "b"], "phone").includes("kp-mln-facts--phone"), d.join(" | "));
  ok("4.A1a′ PLANT · a line drawn as one joined run (how every \"·\" line was drawn) is reported",
    factLineDefects(renderToStaticMarkup(h("span", null, "Alpha · Beta · Gamma")), 3, "Alpha · Beta · Gamma").length > 0);
  const css = squash(read("src/app/globals.css"));
  const cssDefects = (s: string) => {
    const d2: string[] = [];
    if (!s.includes(".kp-mln-facts { --mln-sep: 0.9em; display: flex; flex-wrap: wrap; align-items: baseline; margin-inline-start: calc(-1 * var(--mln-sep)); clip-path: inset(-1em -100vw -1em var(--mln-sep)); }")) d2.push("the list is not pulled back and clipped at its start");
    if (!s.includes(".kp-mln-fact { min-width: 0; padding-inline-start: var(--mln-sep); }")) d2.push("a fact cannot wrap inside itself, or has no gap for its mark");
    if (!s.includes('.kp-mln-fact::before { content: "·"; content: "·" / ""; display: inline-block; width: var(--mln-sep); margin-inline-start: calc(-1 * var(--mln-sep)); text-align: center; }')) d2.push("the mark is not each fact's leading mark, drawn in its gap");
    if (!s.includes(".kp-mln-facts--stack > .kp-mln-fact::before { content: none; }")) d2.push("a stacked list draws marks");
    if (!/@media \(max-width: 767\.98px\) \{ \.kp-mln-facts--phone \{ flex-direction: column;[^}]*\} \.kp-mln-facts--phone > \.kp-mln-fact \{ padding-inline-start: 0; \} \.kp-mln-facts--phone > \.kp-mln-fact::before \{ content: none; \} \}/.test(s)) d2.push("below 768 the phone layout is not one fact per line without marks");
    return d2;
  };
  const c = cssDefects(css);
  ok("4.A1b · the stylesheet: the list pulled back by the mark's gap and clipped there (so the mark of a line's first fact is cut away), each fact's mark LEADING it in that gap (so none ends a line), a fact free to wrap inside itself (no overflow at 320), and the stacked and phone layouts drawing no mark",
    c.length === 0, c.join(" | "));
  ok("4.A1b′ PLANT · a list that is not clipped at its start (a line could open on \"·\") is reported",
    cssDefects(css.replace("clip-path: inset(-1em -100vw -1em var(--mln-sep)); ", "")).some((x) => x.includes("clipped")));
  // Each phrase A1 names, from the dictionary as drawn: one unbreakable run in the reader's language.
  const runsOf = (l: L3, text: string) => keptRuns(renderToStaticMarkup(h("p", null, FACTS.keepFact(l, text) as never)));
  const CASES: Array<[L3, string, string]> = [
    ["en", fill(en.millionea.pendingCarry, { week: 47 }), "Week 47's"],
    ["en", FACTS.factsOf(fill(en.millionea.ruleShared, { pct: 13 }))[1] ?? "", "13% fee"],
    ["sw", FACTS.factsOf(fill(sw.millionea.ruleShared, { pct: 13 }))[1] ?? "", "ada 13%"],
    ["zh", FACTS.factsOf(fill(zh.millionea.ruleShared, { pct: 13 }))[1] ?? "", "13% 费用"],
    ["en", en.millionea.reserveRule, "A1–A5"],
    ["sw", sw.millionea.howTwo, "A1 hadi A5"],
    ["zh", zh.millionea.howTwo, "A1 至 A5"],
    ["en", fill(en.millionea.yourTicketsThisWeek, { n: 1, cap: 10 }), "1 of 10"],
    ["sw", fill(sw.millionea.yourTicketsThisWeek, { n: 1, cap: 10 }), "1 kati ya 10"],
    ["en", fill(en.millionea.howOne, { price: formatTzs(1_000) }), "5 reserve"],
    ["en", fill(en.millionea.howOne, { price: formatTzs(1_000) }), "TZS 1,000"],
    ["zh", fill(zh.millionea.howThree, { pct: 13 }), "13% 费用"],
    ["en", fill(en.millionea.salesCloseAt, { when: "Friday 18:00" }), "Friday 18:00"],
    ["zh", fill(zh.millionea.eventAt, { when: "周六 09:00" }), "周六 09:00"],
    ["en", fill(en.millionea.lockedAt, { when: "Friday 18:00" }), "Friday 18:00 EAT"],
  ];
  const torn = CASES.filter(([l, text, phrase]) => !runsOf(l, text).some((r) => r.includes(phrase))).map(([l, text, phrase]) => `${l} "${phrase}" in "${text}": ${j(runsOf(l, text))}`);
  ok(`4.A1c · every phrase A1 names stays one unbreakable run as the dictionary draws it — "Week 47's", "13% fee" / "ada 13%" / "13% 费用", "A1–A5", "A1 hadi A5", "A1 至 A5", "1 of 10", "5 reserve", "TZS 1,000", "Friday 18:00 EAT", "周六 09:00" (${CASES.length} cases)`,
    torn.length === 0, torn.join(" | "));
  const keepRun = req("../src/components/ui/keep-run.tsx") as typeof import("../src/components/ui/keep-run.tsx");
  const platformOnly = (text: string) => keptRuns(renderToStaticMarkup(h("p", null, keepRun.keepRanges(text, keepRun.keptRanges(text)) as never)));
  ok("4.A1c′ PLANT · the platform's kept runs alone (no Millionea runs) leave \"13% fee\" and \"A1 hadi A5\" free to tear",
    !platformOnly(FACTS.factsOf(fill(en.millionea.ruleShared, { pct: 13 }))[1] ?? "").some((r) => r.includes("13% fee"))
      && !platformOnly(sw.millionea.howTwo).some((r) => r.includes("A1 hadi A5")));
  const joinDefects = (readAt: (rel: string) => string) => MLN_FILES.filter((f) => code(readAt(f)).includes('.join(" · ")'));
  const joins = joinDefects(read);
  ok("4.A1d · no Millionea drawing joins visible facts into one string with \" · \" any more — every such line is a fact line", joins.length === 0, joins.join(" | "));
  ok("4.A1d′ PLANT · the card's old joined meta put back is reported",
    joinDefects(plantIn(CARD, "let meta: ReactNode[] = [];", 'let meta: ReactNode[] = []; const old = ["a", "b"].join(" · ");')).includes(CARD));
  // The win receipt also had template literals and JSX text with the same visible separator. A `.join` census alone
  // missed them: at 320, its top-up and remainder labels share a narrow row with a figure, so the dot could lead a line.
  const ledgerLiteralSeparators = (src: string) => {
    const found: string[] = [];
    const tree = ts.createSourceFile(LEDGER, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node)
        || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) && node.text.includes(" · ")) {
        found.push(`${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1}: ${node.text.trim()}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    return found;
  };
  const receiptDots = ledgerLiteralSeparators(read(LEDGER));
  ok("4.A1e · the win receipt has no literal joined fact: its eyebrow, legal line and three narrow money-row labels draw separate facts",
    receiptDots.length === 0, receiptDots.join(" | "));
  const oldTopUp = read(LEDGER).replace('label={<MaswaliFacts facts={[t.millionea.topUp, t.millionea.topUpNote]} layout="phone" />}', 'label={`${t.millionea.topUp} · ${t.millionea.topUpNote}`}');
  ok("4.A1e′ PLANT · putting the old top-up template label back is reported",
    oldTopUp !== read(LEDGER) && ledgerLiteralSeparators(oldTopUp).length > 0);
}

// P1 · the cut: the sheet leaves first, then the stamp
const cutDefects = (src: string) => {
  const s = squash(code(src));
  const d: string[] = [];
  const okAt = s.indexOf("if (r.ok && r.data && r.data.tickets.length === slips.length"), refusal = s.indexOf("const failure = r as ReasonedFailure;");
  const branch = okAt >= 0 && refusal > okAt ? s.slice(okAt, refusal) : "";
  if (!branch.includes("setLanding({") || !branch.includes("setConfirmOpen(false);")) d.push("the landed cut does not close the sheet and wait for it");
  if (/setCut\(|setDraft\(/.test(branch)) d.push("the landed cut opens the stamp or clears the slip while the sheet is still on screen");
  const at = s.indexOf("useEffect(() => { if (landing === null || confirmOpen) return;");
  const effect = at < 0 ? "" : s.slice(at, s.indexOf("}, [landing, confirmOpen]);", at));
  if (!effect) d.push("no effect waits for the sheet to have closed");
  if (!effect.includes('exitBeatMs("--t-quick")') || !effect.includes("setDraft(landing.cleared);") || !effect.includes("setCut(landing.cut);")) d.push("the stamp and the cleared slip do not wait for the sheet's exit beat");
  return d;
};
{
  const d = cutDefects(read(SLIP_CLIENT));
  ok("4.P1 · a landed cut closes the confirm sheet FIRST; only once its exit beat is over (`exitBeatMs(\"--t-quick\")`, nothing under reduced motion) does the slip clear and the stamp open — the stamp never stands over a leaving sheet whose answers already read \"—\"",
    d.length === 0, d.join(" | "));
  const old = read(SLIP_CLIENT).replace("          requestId.current = null;", "          setDraft(newSlipDraft(hiddenSlots, VOIDED_ROW_FILL));\n          requestId.current = null;");
  ok("4.P1′ PLANT · the old order (the slip cleared inside the landed branch, beside the closing sheet) is reported",
    old !== read(SLIP_CLIENT) && cutDefects(old).some((x) => x.includes("while the sheet is still on screen")));
}

// P2 · the stamp's serial on one line, its facts stacked
{
  const sc = squash(code(read(SLIP_CLIENT)));
  ok("4.P2a · a single cut's stamp asks for the mono serial, a batch has a count heading and every serial, both carry Millionea's Chinese rule and stacked centred facts",
    sc.includes('titleFace={cut?.serials.length === 1 ? "mono" : undefined} className="kp-mln-zh"')
      && sc.includes('cut.serials.map((serial, i) => ({ label: fill(t.millionea.draftTicket, { n: formatNumber(cut.firstTicketNumber + i) }), value: serial }))')
      && sc.includes('<MaswaliFacts layout="stack" className="kp-mln-facts--center"'));
  const { OperationResultModal } = req("../src/components/markets/operation-result-modal.tsx") as { OperationResultModal: (p: Record<string, unknown>) => unknown };
  const result = (p: Record<string, unknown>) => inApp("en", h(OperationResultModal as never, { open: true, variant: "success", onClose() {}, title: "MLN-2026-W49-000041", ...p } as never));
  const h2Of = (m: string) => /<h2 class="([^"]+)"/.exec(m)?.[1] ?? "";
  const mono = result({ stamp: true, titleFace: "mono", className: "kp-mln-zh" }), plain = result({});
  const monoCls = h2Of(mono).split(" ");
  ok("4.P2b · the result's `titleFace=\"mono\"` sets its title in the mono face on the 18px rung, the 22px one from 360 (`xs`), never the display face; without it the title is the display title exactly as before, and the panel's children gain a wrapper only when a class is asked for",
    monoCls.includes("font-mono") && monoCls.includes("text-title-sm") && monoCls.includes("xs:text-title-md") && !monoCls.includes("font-display")
      && h2Of(plain) === "mt-1 font-display text-[22px] font-bold text-text leading-tight tracking-[-0.018em]"
      && mono.includes('<div class="kp-mln-zh">') && !plain.includes("kp-mln-zh"), j({ mono: h2Of(mono), plain: h2Of(plain) }));
  // The text column: the Modal's px-3 each side, the result's own p-6 each side. The serial, in the repo's own faces.
  const SERIAL = "MLN-2026-W49-000041";
  const column = (vw: number) => vw - 2 * sp("3") - 2 * sp("6");
  const sm = rungOf("title-sm"), md = rungOf("title-md");
  const JBM_BOLD = FONT("JetBrainsMono-Bold.ttf"), SORA_BOLD = FONT("Sora-Bold.ttf");
  const at320 = widthIn(JBM_BOLD, SERIAL, sm.px, sm.track), at360 = widthIn(JBM_BOLD, SERIAL, md.px, md.track);
  const display = widthIn(SORA_BOLD, SERIAL, 22, -0.018 * 22);
  ok(`4.P2c · the serial holds ONE line: at 320 the 18px mono run is ${at320.toFixed(1)}px in its ${column(320)}px column, from 360 the 22px one ${at360.toFixed(1)}px in ${column(360)}px — the 22px display title, ${display.toFixed(1)}px, wrapped "MLN-2026-W49-" / "000041" there`,
    at320 <= column(320) && at360 <= column(360) && display > column(360), j({ at320, at360, display }));
  ok(`4.P2c′ PLANT · the 22px mono serial at 320 (${widthIn(JBM_BOLD, SERIAL, md.px, md.track).toFixed(1)}px) would not hold its ${column(320)}px column — the 18px rung there is the fit, not a choice`,
    widthIn(JBM_BOLD, SERIAL, md.px, md.track) > column(320));
}

// P3 · one order on the card at every width, and on the hub
const cardBlockDefects = (src: string) => {
  const s = code(src);
  const d: string[] = [];
  if (/\bmd:hidden\b|md:flex xl:hidden/.test(s)) d.push("the card still draws a 768-only block");
  if (count(squash(s), '<MaswaliFacts layout="phone" facts={') !== 2) d.push("the headline and the state are not phone-stacked fact lines");
  return d;
};
{
  const { MaswaliHomeCard } = req("../src/components/maswali/maswali-home-card.tsx") as { MaswaliHomeCard: (p: Record<string, unknown>) => unknown };
  const cardOf = (l: L3) => textOf(inApp(l, h(MaswaliHomeCard as never, {
    t: dict[l], locale: l, week: 49, jackpot: 1_000_000, atLeast: true, pendingWeek: 47, pct: 13, cap: 10,
    state: { kind: "open", closesAt: Date.parse("2026-12-04T15:00:00.000Z"), held: 1 },
  } as never)));
  const disorder = LOCALES.flatMap((l) => {
    const d = dict[l].millionea;
    const head = FACTS.factsOf(d.ruleWithFigure);
    const marks = [d.productLabel, (head[0] ?? "").replace("{amount}", "").trim(), fill(head[1] ?? "", { pct: 13 }), fill(head[2] ?? "", { pct: 13 }),
      fill(d.pendingCarry, { week: 47 }), d.salesCloseAt.replace("{when}", "").trim(), fill(d.yourTicketsThisWeek, { n: 1, cap: 10 })];
    const text = cardOf(l);
    const at = marks.map((m) => text.indexOf(m));
    return at.some((x, i) => x < 0 || (i > 0 && x <= at[i - 1])) ? [`${l}: ${j(at)} in "${text}"`] : [];
  });
  ok("4.P3a · the card says ONE order in every language — its title, the R-HEADLINE (\"Jackpot\" with its figure, the 10/10 share, the fee at payout), the carry's line, then the close and the reader's tickets — from one markup at every width",
    disorder.length === 0, disorder.join(" | "));
  const b = cardBlockDefects(read(CARD));
  ok("4.P3b · no width draws the card otherwise: no 768-only block (it dropped \"Jackpot\" and set its lines in another order), the headline and the state one fact per line below 768", b.length === 0, b.join(" | "));
  const old768 = read(CARD).replace("      <I.chevronRight s={18}", '      <span className="hidden md:flex xl:hidden" />\n      <I.chevronRight s={18}');
  ok("4.P3b′ PLANT · a 768-only block put back on the card is reported", old768 !== read(CARD) && cardBlockDefects(old768).some((x) => x.includes("768")));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-HUB H1): the pool block is its HEAD and its LEDGER now; the order is the head's.
  const { MaswaliPoolHead } = req("../src/components/maswali/maswali-pool-figure.tsx") as { MaswaliPoolHead: (p: Record<string, unknown>) => unknown };
  const hubOrder = LOCALES.filter((l) => {
    const d = dict[l].millionea;
    const text = textOf(inApp(l, h(MaswaliPoolHead as never, { t: dict[l], locale: l, pct: 13,
      view: { kind: "selling", carriedIn: { week: 47, amount: null }, sales: { tickets: 41, amount: 41_000 }, pool: 41_000, floor: 1_000_000, jackpot: 1_000_000 } } as never)));
    const rule = text.indexOf(fill(FACTS.factsOf(d.ruleShared)[0] ?? "", { pct: 13 })), carry = text.indexOf(fill(d.pendingCarry, { week: 47 }));
    return !(rule >= 0 && carry > rule);
  });
  ok("4.P3c · the hub's pool block says the same order: the figure, the R-HEADLINE's rule, then the carry's line (it said the carry first)", hubOrder.length === 0, j(hubOrder));
}

// P4 · the strip: a label, then its whole range
{
  const { MaswaliWeekStrip } = req("../src/components/maswali/maswali-week-strip.tsx") as { MaswaliWeekStrip: (p: Record<string, unknown>) => unknown };
  const phases = {
    salesFrom: Date.parse("2026-11-30T00:01:00+03:00"), salesTo: Date.parse("2026-12-04T18:00:00+03:00"),
    eventsFrom: Date.parse("2026-12-05T09:00:00+03:00"), eventsTo: Date.parse("2026-12-06T23:00:00+03:00"),
    resultsFrom: Date.parse("2026-12-06T23:00:00+03:00"), resultsTo: Date.parse("2026-12-07T12:00:00+03:00"),
  };
  const WANT: Record<L3, string[]> = {
    en: ["Monday 00:01 –", "Friday 18:00 EAT", "Saturday 09:00 –", "Sunday", "Sunday –", "Monday"],
    sw: ["Jumatatu 00:01 –", "Ijumaa 18:00 EAT", "Jumamosi 09:00 –", "Jumapili", "Jumapili –", "Jumatatu"],
    zh: ["周一 00:01 –", "周五 18:00 EAT", "周六 09:00 –", "周日", "周日 –", "周一"],
  };
  const stripDefects = (l: L3, m: string) => {
    const d: string[] = [];
    if (j(keptRuns(m)) !== j(WANT[l])) d.push(`${l}: kept ${j(keptRuns(m))}`);
    if (count(m, "kp-mln-facts--stack") !== 3) d.push(`${l}: the phases are not label-then-range lines`);
    return d;
  };
  const d = LOCALES.flatMap((l) => stripDefects(l, inApp(l, h(MaswaliWeekStrip as never, { t: dict[l], phases, current: 0 } as never))));
  ok("4.P4a · each phase of the strip is its label, then its range, in every language — and the range is kept whole: its start with the dash and its end with \"EAT\" one run each (\"Monday 00:01 –\" · \"Friday 18:00 EAT\"), so it never reads \"Friday 18:00\" / \"EAT\" or \"Sunday\" / \"– Monday\"",
    d.length === 0, d.join(" | "));
  ok("4.P4a′ PLANT · the strip's old line per phase (\"Sales · Monday 00:01 – Friday 18:00 EAT\", nothing kept) is reported",
    stripDefects("en", renderToStaticMarkup(h("ol", null, h("li", null, "Sales · Monday 00:01 – Friday 18:00 EAT")))).length > 0);
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-HUB M1): the two columns start at 1024 (the market page's grid), so the
  // strip spans them from 1024; the aside and the questions both start under it.
  const gridDefects = (src: string) => {
    const s = squash(code(src));
    const d2: string[] = [];
    if (!s.includes('<div className="lg:col-span-2"> <MaswaliWeekStrip')) d2.push("the strip does not span the measure from 1024");
    if (count(s, 'phases ? "lg:row-start-2" : "lg:row-start-1"') !== 2) d2.push("the aside and the questions do not start under the strip");
    return d2;
  };
  ok("4.P4b · from 1024 the hub's strip spans both columns (each range then has a third of the measure), and the aside, the questions and last week start under it",
    gridDefects(read(HUB)).length === 0, gridDefects(read(HUB)).join(" | "));
  ok("4.P4b′ PLANT · the strip back in the left column is reported",
    gridDefects(read(HUB).replace('<div className="lg:col-span-2">\n                      <MaswaliWeekStrip', '<div className="lg:col-start-1">\n                      <MaswaliWeekStrip')).length > 0);
}

// P5 · the carry's row and the fee row say what is true
{
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-HUB, the lead's ruling): the pool's rows are the ONE Millionea ledger's
  // (`millioneaLedgerRows` over the hub's live input, `ledgerInputOf`) — the same words, read as a reader reads them.
  const live = (l: L3, over: Record<string, unknown> = {}) => millioneaLedgerRows(dict[l], l, ledgerInputOf(hubFigure({ carryPendingCode: "MLN-2026-W47", sales: 41_000, atLeast: true, ...over }), 1_000, false));
  const WORDS: Record<L3, [string, string, string]> = {
    en: ["Carried in from Week 47", "Not yet settled", "13% at payout"],
    sw: ["Kiasi kutoka Wiki 47", "Bado haijakamilika", "13% wakati wa malipo"],
    zh: ["滚存（第47周）", "尚未结算", "派奖时扣除 13%"],
  };
  const wrong = LOCALES.flatMap((l) => {
    const rows = live(l), inRow = rows.find((r) => r.key === "in"), fee = rows.find((r) => r.key === "fee");
    const [label, value, feeValue] = WORDS[l];
    const got = { label: nodeText(inRow?.label), value: nodeText(inRow?.value), fee: nodeText(fee?.value) };
    const once = got.label.split("47").length - 1 === 1;
    return got.label === label && got.value === value && inRow?.emphasis === "muted" && once && got.fee === feeValue && fee?.emphasis === "muted" ? [] : [`${l}: ${j(got)}`];
  });
  // Before the first sale, the same: the fee is a rate and when it is taken.
  const presale = { value: nodeText(live("en", { sales: 0 }).find((r) => r.key === "fee")?.value) };
  const won = { value: nodeText(millioneaLedgerRows(en, "en", { ...LEDGER_AT_REST, kind: "won", tickets: 1050, sales: 1_050_000, jackpot: 1_050_000, fee: 136_500, winners: 3,
    toWinners: 913_500, share: 304_500, paid: 913_500, remainder: 0 }).find((r) => r.key === "fee")?.value) };
  ok("4.P5 · the carry's row names its week ONCE and says an unsettled week in words (\"Carried in from Week 47\" · \"Not yet settled\", §D sw and zh), the fee row before a payout says the rate and when (\"13% at payout\", never \"—\"), and a fee taken is the signed figure (\"−TZS 136,500\")",
    wrong.length === 0 && presale?.value === "13% at payout" && won?.value === formatTzsSigned(-136_500) && formatTzsSigned(-136_500) === "−TZS 136,500", wrong.join(" | "));
  const oldLabel = `${fill("Carried in (Week {week})", { week: 47 })} · ${fill("Week {week} not yet settled", { week: 47 })}`;
  ok("4.P5′ PLANT · the old row (\"Carried in (Week 47) · Week 47 not yet settled\" over a dash) says Week 47 twice", oldLabel.split("47").length - 1 === 2);
}

// P6 · the example draws what a real ticket draws, and says what it is
const exampleDefects = (seal: string, how: string, example: string) => {
  const d: string[] = [];
  const s = squash(code(seal));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critics' M7): the strike in the number's own ink (the border
  // ink drew it ~2.2:1), and a void main's second line kept in both frames (test:maswali-design-register 4.6 renders it).
  if (!s.includes('{voidCell(m) ? ( <> <s className="decoration-current">{m.ordinal}</s> {(m.standIn || keepLine) && <span className={m.standIn ? undefined : "invisible"}>{m.standIn ?? reserveLabel(1)}</span>} </> ) : m.ordinal}')) d.push("a stood-in main's number is not struck with its reserve under it");
  const hw = squash(code(how));
  if (!hw.includes("label={`${t.millionea.exampleLabel} · ${t.millionea.exampleWinnersWeek}`}") || !hw.includes("label={`${t.millionea.exampleLabel} · ${t.millionea.exampleFloorWeek}`}") || /exampleLabel\} · [12]\b/.test(hw)) d.push("a worked ledger's label has no noun");
  if (!squash(code(example)).includes("fill(t.millionea.seeExample, { r: standIn, n: formatNumber(voided) })")) d.push("the button does not say what it plays with a formatted question number");
  return d;
};
{
  const HOW = "src/app/millionea/how/page.tsx", EXAMPLE = "src/app/millionea/how/how-example.tsx", SEAL = "src/components/maswali/maswali-seal-line.tsx";
  const { MaswaliSealLine } = req("../src/components/maswali/maswali-seal-line.tsx") as { MaswaliSealLine: (p: Record<string, unknown>) => unknown };
  const example = sealLineOf(week(["YES", "YES", "YES", "VOID", "YES", "YES", "YES", "YES", "YES", "YES"], ["YES", "YES", "YES", "YES", "YES"]), PICKS, { final: true });
  const m = renderToStaticMarkup(h(MaswaliSealLine as never, { line: example, size: 24, numbers: true } as never));
  const d = exampleDefects(read(SEAL), read(HOW), read(EXAMPLE));
  const templated = LOCALES.filter((l) => !dict[l].millionea.seeExample.includes("{r}") || !dict[l].millionea.seeExample.includes("{n}"));
  ok("4.P6a · How's example draws what a real ticket draws: main 4's number struck with \"A1\" under it (the void seen on its own place, the check above it A1's) — the same Seal Line every ticket draws",
    m.includes('<s class="decoration-current">4</s><span>A1</span>') && count(m, "<s ") === 1 && d.filter((x) => x.includes("struck")).length === 0, d.join(" | "));
  ok("4.P6b · each worked ledger says which week it works through (\"Example · a week with winners\", never \"EXAMPLE · 1\"), and the button says what it plays (\"Show A1 replacing question 4\", in all three languages)",
    d.length === 0 && templated.length === 0 && fill(en.millionea.seeExample, { r: "A1", n: 4 }) === "Show A1 replacing question 4", j({ d, templated }));
  const fitRule = /\.btn\.kp-mln-example-button\s*\{([^}]*)\}/.exec(read("src/app/globals.css"))?.[1] ?? "";
  const exampleFitDefects = (button: string, rule: string) => {
    const problems: string[] = [];
    if (!squash(code(button)).includes('className="border-border-control kp-mln-example-button"')) problems.push("the kit Button lacks its scoped fit class");
    for (const [name, value] of [["max-width", "100%"], ["min-width", "0"], ["height", "auto"],
      ["min-height", "var(--h-control-md)"], ["padding-block", "var(--sp-2)"], ["white-space", "normal"]] as const) {
      if (!rule.split(";").some((line) => line.trim() === `${name}: ${value}`)) problems.push(`${name} is not ${value}`);
    }
    return problems;
  };
  ok("4.P6c · How's example keeps the approved Swahili wording inside its 320px card and a md-height kit Button",
    exampleFitDefects(read(EXAMPLE), fitRule).length === 0, j(exampleFitDefects(read(EXAMPLE), fitRule)));
  ok("4.P6c′ PLANT · the old nowrap and a removed md-height floor both fail the same fit guard",
    exampleFitDefects(read(EXAMPLE), fitRule.replace("white-space: normal", "white-space: nowrap")).some((x) => x.includes("white-space"))
      && exampleFitDefects(read(EXAMPLE), fitRule.replace("min-height: var(--h-control-md)", "min-height: 0")).some((x) => x.includes("min-height")));
  ok("4.P6′ PLANT · a stood-in number drawn plain, and the old \"Example · 1\" label, are reported",
    exampleDefects(read(SEAL).replace("{voidCell(m) ? (", "{false ? ("), read(HOW), read(EXAMPLE)).some((x) => x.includes("struck"))
      && exampleDefects(read(SEAL), read(HOW).replace("label={`${t.millionea.exampleLabel} · ${t.millionea.exampleWinnersWeek}`}", "label={`${t.millionea.exampleLabel} · 1`}"), read(EXAMPLE)).some((x) => x.includes("noun")));
  ok("4.P6″ PLANT · an unformatted example question number is reported",
    exampleDefects(read(SEAL), read(HOW), read(EXAMPLE).replace("n: formatNumber(voided)", "n: voided")).some((x) => x.includes("formatted question number")));
}

// P7 · the slip's rail, its meter and its words
/** WCAG 2.x relative luminance of an `oklch(L% C H)` token, through OKLab → linear sRGB (gamut-clipped). */
const lumOf = (token: string) => {
  const m = new RegExp(`${token.replace(/[-]/g, "\\-")}:\\s*oklch\\(([0-9.]+)% ([0-9.]+) ([0-9.]+)\\)`).exec(read("src/app/globals.css"));
  if (!m) return Number.NaN;
  const [L, C, H] = [Number(m[1]) / 100, Number(m[2]), (Number(m[3]) * Math.PI) / 180];
  const a = C * Math.cos(H), b = C * Math.sin(H);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const rgb = [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_]
    .map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
const contrast = (a: string, b: string) => { const [x, y] = [lumOf(a), lumOf(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const STEPPED = "src/components/markets/stepped-progress.tsx";
const meterDefects = (src: string) => {
  const s = squash(code(src));
  const grouped = s.slice(s.indexOf("function GroupedProgress"));
  const empty = /background: i < g\.done \? "var\(--royal-400\)" : "var\((--[a-z-]+)\)"/.exec(grouped)?.[1] ?? "";
  const d: string[] = [];
  if (!empty) d.push("the grouped meter's fills are not the done royal and one empty token");
  else if (contrast(empty, "--panel") < 2.3 || contrast("--royal-400", empty) < 1.9) d.push(`the empty track ${empty} reads ${contrast(empty, "--panel").toFixed(2)}:1 on the rail, ${contrast("--royal-400", empty).toFixed(2)}:1 from done`);
  return d;
};
const railDefects = (src: string) => {
  const s = squash(code(src));
  const rail = s.slice(s.indexOf("{!closed && ( <div className=\"sticky bottom-"));
  const d: string[] = [];
  if (!rail.startsWith('{!closed && ( <div className="sticky bottom-[calc(65px+env(safe-area-inset-bottom,0px))] z-30 flex flex-col gap-2')) d.push("the rail is not a column");
  if (!rail.includes('style={{ background: "var(--panel)" }}> <SteppedProgress groups={groups} /> <div className={cn("flex items-center gap-2", actionLabel && "flex-wrap")}>')) d.push("the meter has not the rail's full width on its own row");
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-FIX-PLAYER P10): each count carries its total — the questions the slip asks.
  if (!s.includes('<span key="mains" className="whitespace-nowrap">{fill(t.millionea.mainsProgress, { a: formatNumber(progress.mains), n: formatNumber(progress.mainsOf) })}</span>') || !s.includes('<span key="reserves" className="whitespace-nowrap">{fill(t.millionea.reservesProgress, { b: formatNumber(progress.reserves), n: formatNumber(progress.reservesOf) })}</span>')) d.push("the two counts are not whole facts");
  if (!s.includes('{ key: "cap", node: capLine, className: "xl:hidden" }') || !s.includes("<span>{capLine}</span>")) d.push("the cap stands twice from 1280");
  if (!s.includes('q.eventAt === null ? null : <span key="event" className="whitespace-nowrap">{fill(t.millionea.eventAt, { when: eatWeekdayClock(t, q.eventAt) })}</span>')) d.push("the event's day and time are not one run");
  return d;
};
{
  const r = railDefects(read(SLIP));
  ok("4.P7a · the slip's rail: the 15-step meter on its own full-width row, then the two counts as whole facts (\"Main 0/10\" · \"Reserve 0/5\", stacked without the \"·\" where they do not fit) beside the pay control; \"Event Saturday 09:00\" one run; from 1280 the cap said once, in the summary panel",
    r.length === 0, r.join(" | "));
  const m = meterDefects(read(STEPPED));
  ok(`4.P7b · the meter's empty segments are seen: --border-strong reads ${contrast("--border-strong", "--panel").toFixed(2)}:1 on the rail's --panel (the old --bg-inset ${contrast("--bg-inset", "--panel").toFixed(2)}:1), and the done --royal-400 stands ${contrast("--royal-400", "--border-strong").toFixed(2)}:1 apart from it`,
    m.length === 0 && contrast("--bg-inset", "--panel") < 1.1, m.join(" | "));
  ok("4.P7′ PLANT · the old near-invisible track, and the meter back beside the button, are reported",
    meterDefects(read(STEPPED).replace(': "var(--border-strong)" }} />', ': "var(--bg-inset)" }} />')).length > 0
      && railDefects(read(SLIP).replace('style={{ background: "var(--panel)" }}>\n          <SteppedProgress groups={groups} />\n          <div className={cn("flex items-center gap-2", actionLabel && "flex-wrap")}>', 'style={{ background: "var(--panel)" }}>\n          <div className={cn("flex items-center gap-2", actionLabel && "flex-wrap")}>\n          <SteppedProgress groups={groups} />')).some((x) => x.includes("full width")));
}

// P10 · money that came back says so; a ticket that counts for nothing rests
const restDefects = (seal: string, ticketSrc: string, page: string) => {
  const d: string[] = [];
  if (!squash(code(seal)).includes('const markOf = (m: SocketMark): SocketMark => (inert ? "unused" : m);')) d.push("an inert line draws live sockets");
  if (!squash(code(seal)).includes('mark === "unused" && "kp-mln-rest"')) d.push("an unused socket is not at rest");
  const t2 = squash(code(ticketSrc));
  if (!t2.includes("const inert = ticketRests(shown);")) d.push("the ticket does not rest for every state that counts for nothing");
  if (!squash(code(page)).includes('fill(t.millionea.cancelModalBody, { price: formatTzs(view.refund?.state === "landed" ? view.refund.amount : view.stub.price) })')) d.push("the ticket page does not say where the money went");
  return d;
};
{
  const T = req("../src/components/maswali/maswali-ticket.tsx") as { ticketRests: (s: string) => boolean; MaswaliTicketCard: (p: Record<string, unknown>) => unknown };
  const rests = ["cancelled", "refunded"].every((s) => T.ticketRests(s)) && !["running", "won", "lost", "forfeited"].some((s) => T.ticketRests(s));
  const pendingLine = sealLineOf(week(Array(10).fill(null), Array(5).fill(null)), PICKS);
  const cardOf = (l: L3, shown: string, more: Record<string, unknown> = {}) => textOf(inApp(l, h(T.MaswaliTicketCard as never, {
    t: dict[l], locale: l, serverNow: Date.parse("2026-12-01T09:00:00Z"), href: "/millionea/tickets/X", serial: "MLN-2026-W49-000041", week: 49,
    shown, line: pendingLine, price: 1_000, payout: shown === "running" ? null : 1_000, placedAt: "2026-12-01T08:13:00Z", ...more,
  } as never)));
  const words = LOCALES.filter((l) => {
    const d = dict[l].millionea;
    const cancelled = cardOf(l, "cancelled"), refunded = cardOf(l, "refunded"), onItsWay = cardOf(l, "running", { refundPending: true }), live = cardOf(l, "running");
    return !(cancelled.includes(d.statRefunded) && cancelled.includes("TZS 1,000") && !cancelled.includes(dict[l].journey.ticketFinalPayout)
      && refunded.includes(d.statRefunded) && onItsWay.includes(d.statRefund) && onItsWay.includes(d.refundOnItsWay) && !onItsWay.includes(dict[l].journey.ticketPayoutAtResult)
      && live.includes(dict[l].journey.ticketPayoutAtResult));
  });
  ok("4.P10a · money that came back says so on the card, in every language: a cancelled ticket and a refunded one read \"Refunded TZS 1,000\" (never \"Final payout\"), a voided week's ticket whose refund is on its way \"Refund · On its way back\" (never \"When the result is in\")",
    rests && words.length === 0, j({ rests, words }));
  const { MaswaliSealLine } = req("../src/components/maswali/maswali-seal-line.tsx") as { MaswaliSealLine: (p: Record<string, unknown>) => unknown };
  const inert = renderToStaticMarkup(h(MaswaliSealLine as never, { line: pendingLine, size: 18, inert: true } as never));
  const live = renderToStaticMarkup(h(MaswaliSealLine as never, { line: pendingLine, size: 18 } as never));
  const d = restDefects(read("src/components/maswali/maswali-seal-line.tsx"), read(TICKET), read(TICKET_PAGE));
  ok("4.P10b · a ticket that counts for nothing (cancelled, refunded) rests: all fifteen sockets at rest (`.kp-mln-rest`), never the live \"awaiting\" ring a pending ticket wears (0 at rest there); its page says where the money went (\"TZS 1,000 returned to main balance\")",
    count(inert, "kp-mln-rest") === 15 && count(live, "kp-mln-rest") === 0 && d.length === 0, d.join(" | "));
  ok("4.P10′ PLANT · an inert line drawing the awaiting ring again is reported",
    restDefects(read("src/components/maswali/maswali-seal-line.tsx").replace('(inert ? "unused" : m)', '(inert ? "awaiting" : m)'), read(TICKET), read(TICKET_PAGE)).some((x) => x.includes("live sockets")));
}

// P11 · the tickets list
const listDefects = (page: string, ticketSrc: string, bar: string) => {
  const d: string[] = [];
  const p = squash(code(page));
  if (!p.includes("const newestFirst = (a: MillioneaTicketRow, b: MillioneaTicketRow) => (Date.parse(b.boughtAt) - Date.parse(a.boughtAt)) || b.serial.localeCompare(a.serial);")
    || !p.includes(".filter((row) => inLens(lens, row.shown)).sort(newestFirst).map((row) => ({ g, row, price }))")) d.push("a week's tickets are not newest first");
  if (!p.includes("<PageHeader eyebrow={t.millionea.productTitle} title={t.millionea.ticketsTitle} />")) d.push("the classic title is not the one-line one");
  const t2 = squash(code(ticketSrc));
  if (t2.includes("text-body-sm leading-snug") || count(t2, "valueClassName={WORDS}") !== 3) d.push("a value in words has another line box than the money beside it");
  const b = code(bar);
  if (/QueryStrip/.test(b) || !squash(b).includes('<nav aria-label={t.journey.ticketsFilterAria} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1.5">')) d.push("the four lenses scroll under a fade");
  if (!squash(b).includes('case "won": return t.millionea.lensWon;')) d.push("the lenses are not Millionea's words");
  return d;
};
{
  const LIST_SRC = LIST_PAGE, BAR = "src/app/millionea/tickets/tickets-bar.tsx";
  const d = listDefects(read(LIST_SRC), read(TICKET), read(BAR));
  const SORA_BOLD = FONT("Sora-Bold.ttf"), lg = rungOf("title-lg");
  const column = 320 - 2 * sp("3");
  const titleW = widthIn(SORA_BOLD, en.millionea.ticketsTitle, lg.px, lg.track), oldW = widthIn(SORA_BOLD, en.millionea.myTicketsTitle, lg.px, lg.track);
  const lens = sw.millionea.lensOpen === "Zinazoendelea" && sw.millionea.lensSettled === "Zilizokamilika" && sw.millionea.lensWon === "Ulizoshinda" && zh.millionea.lensWon === "已中奖";
  ok(`4.P11 · Tiketi zangu's list: each week's tickets newest first (000042 before 000041), the title one line at 320 ("${en.millionea.ticketsTitle}" ${titleW.toFixed(0)}px in ${column}px, where "${en.millionea.myTicketsTitle}" ${oldW.toFixed(0)}px left "tickets" alone), words on the money rung's line box (the two cards' rows level), four lenses that wrap whole in Millionea's own words (§D)`,
    d.length === 0 && titleW <= column && oldW > column && lens, j({ d, titleW, oldW, lens }));
  ok("4.P11′ PLANT · the list unsorted, and the lenses back in a scrolling strip, are reported",
    listDefects(read(LIST_SRC).replace(".sort(newestFirst)", ""), read(TICKET), read(BAR)).some((x) => x.includes("newest"))
      && listDefects(read(LIST_SRC), read(TICKET), read(BAR).replace('<nav aria-label={t.journey.ticketsFilterAria}', "<QueryStrip ariaLabel={t.journey.ticketsFilterAria}><nav")).some((x) => x.includes("scroll")));
}

// P12 · the free cancel on the first screen; P16 · one annex rule; P13 · the empty board's words; A2, A4, §D
{
  const placeDefects = (src: string) => {
    const s = squash(code(src));
    const cancelAt = s.indexOf("{cancel && ( <div className=\"flex flex-col gap-1.5\"> {cancel}"), firstClause = s.indexOf("<Clause ");
    return cancelAt > 0 && cancelAt < firstClause && cancelAt > s.indexOf("<MaswaliSealLine line={line} size={24}") ? [] : ["the free cancel waits under the fifteen clauses"];
  };
  ok("4.P12 · a pending ticket's free cancel stands in its head, under the Seal Line — on the first screen (the stamp promised \"Free cancel until 11:18\")", placeDefects(read(TICKET)).length === 0);
  const below = read(TICKET).replace(/\n          \{cancel && \(\n[\s\S]*?\n          \)\}\n        <\/div>\n        <ol>/, "\n        </div>\n        <ol>").replace("      </article>\n", "      </article>\n      {cancel && (\n        <div className=\"flex flex-col gap-1.5\">\n          {cancel}\n        </div>\n      )}\n");
  ok("4.P12′ PLANT · the cancel moved back under the ticket is reported", below !== read(TICKET) && placeDefects(below).length > 0);
  const SEAL = "src/components/maswali/maswali-seal-line.tsx";
  const annexDefects = (src: string) => {
    const s = code(src);
    return /\bannex\?: |"beside"|annex ===/.test(s) || !squash(s).includes('<div aria-hidden className={cn("flex flex-col gap-1.5", className)}>') ? ["the annex has two rules"] : [];
  };
  const usedBeside = MLN_FILES.filter((f) => /annex="(?:below|beside)"/.test(code(read(f))));
  ok("4.P16 · one rule for the annex at every size and width — the five reserves on their own row under the ten mains (the hub's row set them beside the mains, the card under them)",
    annexDefects(read(SEAL)).length === 0 && usedBeside.length === 0, j(usedBeside));
  ok("4.P16′ PLANT · the beside mode put back is reported",
    annexDefects(read(SEAL).replace("  numbers?: boolean;\n  idBase", '  annex?: "below" | "beside";\n  numbers?: boolean;\n  idBase')).length > 0);
  const JH = "src/components/journey/home/journey-home.tsx";
  const emptyDefects = (src: string) => squash(code(src)).includes("title={millionea ? t.millionea.homeEmptyOther : t.journey.homeEmptyTitle}") ? [] : ["the empty board under the card says there are no open questions at all"];
  const other = LOCALES.filter((l) => !/\bother\b|mengine|其他/.test(dict[l].millionea.homeEmptyOther));
  ok("4.P13 · under the Millionea card the journey home's empty board says \"No other open questions right now\" (sw \"mengine\", zh \"其他\") — and only there", emptyDefects(read(JH)).length === 0 && other.length === 0, j(other));
  ok("4.P13′ PLANT · the plain empty title under the card is reported",
    emptyDefects(read(JH).replace("title={millionea ? t.millionea.homeEmptyOther : t.journey.homeEmptyTitle}", "title={t.journey.homeEmptyTitle}")).length > 0);
  const zhDefects2 = (slip: string, client: string) => {
    const d: string[] = [];
    if (!squash(code(slip)).includes('showClose={false} panelClassName="kp-mln-zh">')) d.push("the confirm sheet is portalled without Millionea's Chinese rule");
    if (!squash(code(client)).includes('className="kp-mln-zh"')) d.push("the stamp is portalled without it");
    return d;
  };
  ok("4.A2 · the two dialogs portalled out of the page's root carry `.kp-mln-zh` themselves — the confirm sheet's panel and the cut's stamp — so their Chinese keeps a word whole (and the one label rule reaches them)",
    zhDefects2(read(SLIP), read(SLIP_CLIENT)).length === 0, zhDefects2(read(SLIP), read(SLIP_CLIENT)).join(" | "));
  ok("4.A2′ PLANT · a confirm sheet without the class is reported", zhDefects2(read(SLIP).replace(' panelClassName="kp-mln-zh">', ">"), read(SLIP_CLIENT)).length > 0);
  const signDefects = (readAt: (rel: string) => string) => MLN_FILES.filter((f) => /formatTzs\(-|money\(-|fig\(-|`−\$\{formatTzs/.test(code(readAt(f))));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-HUB, the lead's ruling): the pool's fee rows are the one Millionea ledger's
  // fee row now (`maswali-ledger.tsx`, the register's and the hub's alike; the sunset's payout is its won branch).
  const signed = ["src/components/maswali/maswali-ledger.tsx", "src/components/maswali/maswali-pool-figure.tsx", "src/app/millionea/how/page.tsx", LEDGER].map((f) => count(code(read(f)), "formatTzsSigned("));
  ok("4.A4 · every negative figure on Millionea is the platform's signed money (\"−TZS 136,500\"): no hand-built sign, no `formatTzs` of a negative — the one ledger's fee row, How's fee row, the win ledger's fee and net; the pool's head signs nothing",
    signDefects(read).length === 0 && j(signed) === j([1, 0, 1, 2]), j({ hand: signDefects(read), signed }));
  ok("4.A4′ PLANT · How's old fee row (`fig(-f.F)`, \"TZS -136,500\") is reported",
    signDefects(plantIn("src/app/millionea/how/page.tsx", "value={<span className=\"amount\">{formatTzsSigned(-f.F)}</span>}", "value={fig(-f.F)}")).includes("src/app/millionea/how/page.tsx"));
  // §D · the decided words, applied on these pages (en binding; sw and zh for Gate B's native review).
  const D: Array<[L3, string, string]> = [
    ["sw", "pendingCarry", "pamoja na kiasi kinachohamishwa kutoka Wiki {week} itakapokamilika"],
    ["sw", "howFour", "Hakuna 10/10? Bwawa lote linahamishiwa wiki inayofuata, bila ada."],
    ["sw", "mainsProgress", "Makuu {a}/{n}"], // re-pinned (P10): "Makuu" as decided, its total the slip's own
    ["sw", "carriedIn", "Kiasi kutoka Wiki {week}"], ["sw", "carriedInPending", "Bado haijakamilika"],
    ["zh", "ruleShared", "由所有 10/10 彩票平分 · 派奖时扣除 {pct}% 费用"],
    ["zh", "ruleWithFigure", "大奖 {amount} · 由所有 10/10 彩票平分 · 派奖时扣除 {pct}% 费用"],
    ["zh", "stripResults", "结果与派奖 · {range}"], ["zh", "stripEvents", "事件 · {range}"],
    ["zh", "mains", "正选题"], ["zh", "mainsProgress", "正选 {a}/{n}"], ["zh", "eventAt", "事件 {when}"], ["zh", "firstEventAt", "首个事件：{when}"],
    ["zh", "ticketRunning", "待结算"], ["zh", "howThree", "所有 10/10 彩票平分大奖；{pct}% 费用仅在派奖时扣除。"], ["zh", "carriedInPending", "尚未结算"],
    ["zh", "jumpTo", "前往第{n}题"], ["zh", "capRule", "上限：每周 {cap} 张 · 这是第{n}张"],
    ["en", "carriedIn", "Carried in from Week {week}"], ["en", "carriedInPending", "Not yet settled"], ["en", "statRefunded", "Refunded"],
  ];
  const off = D.filter(([l, k, v]) => (dict[l].millionea as Record<string, unknown>)[k] !== v).map(([l, k]) => `${l}.${k}`);
  const listZh = counted(1, "", "", {}) === "" ? (req("../src/components/maswali/maswali-format.ts") as { joinList: (l: L3, xs: string[]) => string }).joinList("zh", ["A2", "A3", "A4", "A5"]) : "";
  ok(`4.D · §D's words on these pages, as decided (${D.length} keys): sw "itakapokamilika", "linahamishiwa", "Makuu", "Kiasi kutoka Wiki"; zh 派奖, 正选题, 事件, 待结算, 由所有, unspaced ordinals (the lead's ruling) and a Chinese list spaced from its Latin ("A2、A3、A4 和 A5")`,
    off.length === 0 && listZh === "A2、A3、A4 和 A5" && !LOCALES.some((l) => /主题|赛事|支付时/.test(JSON.stringify(dict[l].millionea)) && l === "zh"), j({ off, listZh }));
  ok("4.D′ PLANT · the old Chinese rule (\"由每张 … 支付时收取\") is reported", ("由每张 10/10 彩票平分 · 支付时收取 {pct}% 费用" as string) !== zh.millionea.ruleShared);
}

// ── §5 · S5-FIX-PLAYER (the independent review of the player surfaces, 2026-10-21) ────────────────────────────────────
console.log("\n§5 · S5-FIX-PLAYER: each finding a case the old code fails, with its plant");

// P13 · a refusal before any pick says the page's words, never a purchase result's
const SLIP_PAGE = "src/app/millionea/slip/page.tsx";
const slipRefusalDefects = (src: string) => {
  const s = squash(code(src));
  const d: string[] = [];
  const at = s.indexOf('if (slip.refusal && slip.refusal !== "millionea_sales_closed") {');
  const branch = at < 0 ? "" : s.slice(at, s.indexOf("const closesAt = ", at));
  if (!branch) d.push("no refusal branch before the slip");
  if (!branch.includes('if (slip.refusal === "millionea_cap_reached") { const hub = await millioneaHubNow(gate.userId, gate.state); said = { body: capReachedLine(t, slip.ticketCap, hub ? nextWeekOpen(hub, millioneaOpenTemplate(), nowMs) : null), tone: "info" };')) d.push("the cap is not the hub's line (its next week only when one can follow)");
  if (!branch.includes('else if (slip.refusal === "millionea_not_available") { said = { body: t.millionea.hubNoWeek, tone: "neutral" };')) d.push("\"not available\" is not the hub's \"no week on sale\"");
  if (/failMillioneaCapReached|failMillioneaNotAvailable/.test(s)) d.push("the slip names a purchase result's sentence");
  return d;
};
{
  const d = slipRefusalDefects(read(SLIP_PAGE));
  ok("5.P13a · the slip's refusals before any pick: the cap in the hub's own line (the next week named only when one can follow), \"not available\" as the hub's \"No Millionea week is on sale right now.\" — never \"Nothing was charged.\" over nothing tried", d.length === 0, d.join(" | "));
  const NEXT = Date.parse("2026-10-18T21:00:00.000Z"); // Monday 19 October 2026, 00:00 EAT — ISO week 43
  const lines = LOCALES.map((l) => [capReachedLine(dict[l], 10, null), capReachedLine(dict[l], 10, NEXT)]);
  const want = LOCALES.map((l) => [fill(dict[l].millionea.capReachedOnly, { cap: 10 }), fill(dict[l].millionea.capReachedNote, { cap: 10, week: 43, day: dict[l].millionea.weekdays[0] })]);
  const promise = LOCALES.filter((l) => /next week|wiki ijayo|下周/i.test(capReachedLine(dict[l], 10, null)));
  ok("5.P13b · the cap's one line, in three languages: \"You have reached 10 tickets this week.\" with no next week to follow, \"… Week 43 opens Monday.\" when one can — and the final week's never promises one",
    j(lines) === j(want) && lines[0][0] === "You have reached 10 tickets this week." && lines[0][1] === "You have reached 10 tickets this week. Week 43 opens Monday." && promise.length === 0, j({ lines, promise }));
  const old = read(SLIP_PAGE).replace('said = { body: t.millionea.hubNoWeek, tone: "neutral" };', "said = { body: t.error.failMillioneaNotAvailable, tone: \"neutral\" };");
  ok("5.P13′ PLANT · the purchase result's \"Nothing was charged.\" put back on the slip is reported", old !== read(SLIP_PAGE) && slipRefusalDefects(old).length > 0);
}

// P15 · the hub counts down and prints the close only while the week sells; P17 · each icon its lexicon meaning
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-HUB): the buy block is its DOOR (`BuyDoor`) and its FACTS now; the close and
// its pill stand in one row (R1-motion M8), and only beside a door that buys (L9: never under the cap's line or a break's).
const sellingDefects = (src: string) => {
  const s = squash(code(src));
  const d: string[] = [];
  const at = s.indexOf("function BuyDoor(");
  const block = at < 0 ? "" : s.slice(at, s.indexOf("function BuyFacts(", at));
  if (!block.includes("const open = w.selling;")) d.push("the close line and the pill do not ask whether the week sells");
  if (/const open = w\.state === "OPEN"/.test(block)) d.push("the close line asks the state alone (a paused week counts down)");
  const row = block.indexOf("{open && buys && ( <div className=\"flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1\" data-testid=\"millionea-hub-close\"> <p className=\"flex items-center gap-1.5 text-body-sm text-text-muted\"> <I.clock s={14} className=\"shrink-0\" />");
  if (row < 0) d.push("the printed close is not drawn under `open` and a buying door, with the clock");
  if (!(row >= 0 && block.indexOf("<MaswaliClosingPill closesAt={closesMs} serverNow={nowMs} compact />", row) > row)) d.push("the pill is not drawn in the close's row under `open`");
  return d;
};
const iconDefects = (src: string) => {
  const s = squash(code(src));
  const d: string[] = [];
  if (!s.includes('{w?.isFinal && <Callout tone="info" glyph="finalWeek" role="status">{t.millionea.finalWeek}</Callout>}')) d.push("the final week's notice does not draw its own key");
  if (/glyph="flag"/.test(s)) d.push("the hub draws `flag` (object to a result) for a fact that is not an objection");
  if (/<I\.hourglassHalf\b/.test(s)) d.push("the hub draws the countdown's hourglass beside a printed time");
  return d;
};
{
  const d = sellingDefects(read(HUB));
  ok("5.P15 · the hub prints the sales close and its closing pill only while the week SELLS to the reader (`selling`: OPEN, before the close, not paused, the rollout selling its line) — never a countdown over a paused week or a public week at STAFF_PREVIEW", d.length === 0, d.join(" | "));
  const old = read(HUB).replace("const open = w.selling;", 'const open = w.state === "OPEN" && closesMs > nowMs;');
  ok("5.P15′ PLANT · the old state-only `open` (a paused week counted down) is reported", old !== read(HUB) && sellingDefects(old).some((x) => x.includes("state alone")));
  const i = iconDefects(read(HUB));
  const REG = (await import("../src/components/ui/glyph-registry.generated.ts")).GLYPH_REGISTRY as Record<string, { s?: string; i?: Record<string, unknown> }>;
  const fill = REG.finalWeek?.s === "p-flag-checkered" && !!REG.finalWeek?.i?.fill && (FILL_KEYS as readonly string[]).includes("finalWeek");
  ok("5.P17 · each icon on the hub says its §10c meaning: the final-week notice draws `finalWeek` (flag-checkered, shipped in Fill for the Callout's status) — not `flag`, which means \"object to a result\" — and the printed close draws `clock`, the hourglass staying the countdown's",
    i.length === 0 && fill, j({ i, fill: REG.finalWeek }));
  const oldIcons = read(HUB).replaceAll('glyph="finalWeek"', 'glyph="flag"').replace("<I.clock s={14} className=\"shrink-0\" />", "<I.hourglassHalf s={14} className=\"shrink-0\" />");
  const caught = iconDefects(oldIcons);
  ok("5.P17′ PLANT · the old `flag` and hourglass put back are each reported",
    caught.some((x) => x.includes("draws `flag`")) && caught.some((x) => x.includes("hourglass")) && caught.some((x) => x.includes("its own key")), j(caught));
}

// P5 · "next event" is never an instant already past
{
  const PLAYER = (await import("../src/lib/server/maswali-player.ts")) as { resultsOf: (qs: Array<{ eventStartsAt: string }>, gq: Array<{ role: "MAIN" | "RESERVE"; ordinal: number; outcome: Out }>, nowMs: number) => { nextResultAt: string | null; resultsOut: number } };
  const ev = ["2026-12-05T06:00:00.000Z", "2026-12-05T09:00:00.000Z", "2026-12-06T06:00:00.000Z"];
  const qs = ev.map((e) => ({ eventStartsAt: e }));
  const gq = (outs: Out[]) => outs.map((o, i) => ({ role: "MAIN" as const, ordinal: i + 1, outcome: o }));
  const next = (outs: Out[], now: string) => PLAYER.resultsOf(qs, gq(outs), Date.parse(now)).nextResultAt;
  const cases: Array<[string, string | null, string | null]> = [
    ["before every event", next([null, null, null], "2026-12-05T05:00:00.000Z"), ev[0]],
    ["after the first, its result not in", next([null, null, null], "2026-12-05T07:00:00.000Z"), ev[1]],
    ["the second sealed early: the third", next([null, "YES", null], "2026-12-05T07:00:00.000Z"), ev[2]],
    ["every unsealed event begun: none", next([null, null, null], "2026-12-06T07:00:00.000Z"), null],
    ["every result in: none", next(["YES", "NO", "VOID"], "2026-12-04T00:00:00.000Z"), null],
  ];
  const wrong = cases.filter(([, got, want]) => got !== want).map(([name, got]) => `${name}: ${got}`);
  ok("5.P5 · a ticket's \"next event\" is the first unsealed event still AHEAD — and none once every unsealed event has begun (it named the earliest unsealed one, already past: \"next event Saturday 09:00\" on the Sunday)",
    wrong.length === 0, wrong.join(" | "));
  const src = squash(code(read("src/lib/server/maswali-player.ts")));
  const fixed = "nextResultAt: waiting.find((at) => Date.parse(at) >= nowMs) ?? null,";
  const old = src.replace(fixed, "nextResultAt: waiting.find((at) => Date.parse(at) >= nowMs) ?? waiting[0] ?? null,");
  ok("5.P5′ PLANT · the read model's line is the fixed one, and the old fallback to the earliest unsealed event is told apart from it",
    src.includes(fixed) && old !== src && !old.includes(fixed));
}

// P10 · a question voided before the close is asked of nobody: no count, no total, no invented pick
{
  const SLIPMOD = req("../src/components/maswali/maswali-slip.tsx") as { slipProgress: (p: ReadonlyArray<string | null>, qs: ReadonlyArray<{ role: "MAIN" | "RESERVE"; ordinal: number }>) => { mains: number; reserves: number; mainsOf: number; reservesOf: number; ready: boolean } };
  const all = [...Array.from({ length: 10 }, (_, i) => ({ role: "MAIN" as const, ordinal: i + 1 })), ...Array.from({ length: 5 }, (_, i) => ({ role: "RESERVE" as const, ordinal: i + 1 }))];
  const asked = all.filter((q) => !(q.role === "MAIN" && q.ordinal === 3)); // M3 voided before the close: the slip asks 14
  const filled: Array<string | null> = Array.from({ length: 15 }, (_, i) => (i === 2 ? "YES" : null)); // the slip's own fill at slot 3
  const before = SLIPMOD.slipProgress(filled, asked);
  const done = SLIPMOD.slipProgress(filled.map((p, i) => p ?? (i % 2 ? "NO" : "YES")), asked);
  const plain = SLIPMOD.slipProgress(Array(15).fill(null), all);
  ok("5.P10a · the slip counts only the questions it asks: one voided before the close, it opens on \"Main 0/9 · Reserve 0/5\" (never \"1/10\" from its own fill) and arms at 9/9 — and with none voided, 0/10 · 0/5",
    j(before) === j({ mains: 0, reserves: 0, mainsOf: 9, reservesOf: 5, ready: false }) && j(done) === j({ mains: 9, reserves: 5, mainsOf: 9, reservesOf: 5, ready: true })
      && j(plain) === j({ mains: 0, reserves: 0, mainsOf: 10, reservesOf: 5, ready: false }), j({ before, done, plain }));
  const words = LOCALES.map((l) => [fill(dict[l].millionea.answerAll, { n: 14 }), fill(dict[l].millionea.mainsProgress, { a: 0, n: 9 }), fill(dict[l].millionea.ticketDraftHint, { n: 14 })]);
  ok("5.P10b · the words count what is asked: \"Answer all 14\" / \"Jibu maswali 14\" / \"回答全部 14 题\", \"Main 0/9\", and the drafts' hint the same 14 — no fixed 15 or 10 left in them",
    j(words.map((w) => w.slice(0, 2))) === j([["Answer all 14", "Main 0/9"], ["Jibu maswali 14", "Makuu 0/9"], ["回答全部 14 题", "正选 0/9"]])
      && words.every((w) => w[2].includes("14") && !w[2].includes("15")) && LOCALES.every((l) => !/\b15\b|\/10\b|\/5\b/.test(`${dict[l].millionea.answerAll} ${dict[l].millionea.mainsProgress} ${dict[l].millionea.reservesProgress} ${dict[l].millionea.ticketDraftHint}`)), j(words));
  const VIEW = req("../src/app/millionea/millionea-view.ts") as { clausesOf: (t: unknown, l: L3, qs: unknown[], slots: unknown[], filled?: number[]) => Array<{ pick: string | null; ordinal: number; role: string }> };
  const q = (slot: number) => ({ slot, label: `M${slot}`, role: slot <= 10 ? "MAIN" : "RESERVE", category: "sports", text: { en: `Q${slot}`, sw: `Q${slot}`, zh: `Q${slot}` }, criterion: { en: "", sw: "", zh: "" }, sourceUrl: "", sourceDomain: "x.tz", eventStartsAt: "2026-12-05T06:00:00.000Z", eventZone: "Africa/Dar_es_Salaam", voidDeadlineAt: "2026-12-07T20:59:00.000Z", outcome: slot === 3 ? "VOID" : null });
  const qs = Array.from({ length: 15 }, (_, i) => q(i + 1));
  const slots = qs.map((x) => ({ slot: x.slot, label: x.label, role: x.role, pick: "YES", outcome: x.outcome, mark: "awaiting", carried: null, standsInFor: null }));
  const clauses = VIEW.clausesOf(en, "en", qs, slots, [3]);
  const { MaswaliTicket } = req("../src/components/maswali/maswali-ticket.tsx") as { MaswaliTicket: (p: Record<string, unknown>) => unknown };
  const line = sealLineOf(week(["YES", "YES", "VOID", null, null, null, null, null, null, null], [null, null, null, null, null]), PICKS);
  const ticketText = textOf(inApp("en", h(MaswaliTicket as never, { t: en, locale: "en", serverNow: Date.parse("2026-12-05T09:00:00Z"), serial: "MLN-2026-W49-000041", week: 49,
    weekState: "OPEN", shown: "running", clauses, line, stub: { price: 1_000, boughtAt: "2026-12-01T08:13:00Z", questionSetHash: "7f3a…" } } as never)));
  ok("5.P10c · the ticket draws no pick where the slip filled one itself (the read model's `slipFilled`): question 3 reads \"Pick —\", every other question its own pick",
    clauses.find((c) => c.ordinal === 3 && c.role === "MAIN")?.pick === null && clauses.filter((c) => c.pick === "YES").length === 14
      && ticketText.includes(`Q3${en.millionea.pick}—`) && ticketText.includes(`Q4${en.millionea.pick}${en.common.yes}`), ticketText.slice(0, 160));
  const oldProgress = (p: ReadonlyArray<string | null>) => { let m = 0, r = 0; for (let i = 0; i < 15; i++) if (p[i]) { if (i < 10) m++; else r++; } return { mains: m, reserves: r }; };
  ok("5.P10′ PLANT · the old count over all fifteen slots says \"Main 1/10\" before any tap — told apart from the fixed count",
    oldProgress(filled).mains === 1 && before.mains === 0);
}

// P6 · where a week stands once its results are in: one phase, every surface
{
  const VIEW = req("../src/app/millionea/millionea-view.ts") as {
    millioneaWeekPhase: (w: Record<string, unknown>, nowMs: number) => { kind: string; objectionsUntil: number | null };
    weekPhaseWord: (t: unknown, state: string, phase: { kind: string; objectionsUntil: number | null }) => string;
  };
  const CLOSE = "2026-12-08T09:00:00.000Z"; // Tuesday 12:00 EAT
  const qs = (outs: Out[]) => outs.map((o, i) => ({ slot: i + 1, role: i < 10 ? "MAIN" : "RESERVE", outcome: o }));
  const yes15: Out[] = Array(15).fill("YES");
  const doomed: Out[] = ["VOID", "VOID", "VOID", "VOID", "VOID", "VOID", "YES", "YES", "YES", "YES", "YES", "YES", "YES", "YES", "YES"];
  const wk = (state: string, final: boolean, outs: Out[] = yes15) => ({ state, gradedSetFinalAt: final ? "2026-12-07T09:00:00.000Z" : null, objectionsCloseAt: final ? CLOSE : null, questions: qs(outs) });
  const at = (iso: string) => Date.parse(iso);
  const cases: Array<[string, Record<string, unknown>, number, string, number | null]> = [
    ["an open week", wk("OPEN", false), at("2026-12-04T09:00:00.000Z"), "state", null],
    ["results still coming in (graded set not final)", wk("RESOLVING", false, [...yes15.slice(0, 14), null]), at("2026-12-06T09:00:00.000Z"), "state", null],
    ["before the window's end", wk("RESOLVING", true), at("2026-12-08T08:59:59.000Z"), "objections", at(CLOSE)],
    ["at the window's end", wk("RESOLVING", true), at(CLOSE), "settling", null],
    ["after it, until settled", wk("RESOLVING", true), at("2026-12-08T15:00:00.000Z"), "settling", null],
    ["a void-certain week inside its window", wk("RESOLVING", true, doomed), at("2026-12-08T08:00:00.000Z"), "voiding", at(CLOSE)],
    ["a void-certain week after it", wk("RESOLVING", true, doomed), at("2026-12-08T10:00:00.000Z"), "voiding", null],
    ["a settled week", wk("SETTLED", true), at("2026-12-09T09:00:00.000Z"), "state", null],
  ];
  const wrong = cases.flatMap(([name, w, now, kind, until]) => {
    const p = VIEW.millioneaWeekPhase(w, now);
    return p.kind === kind && p.objectionsUntil === until ? [] : [`${name}: ${j(p)}`];
  });
  ok("5.P6a · ⭐ one phase for every surface (`millioneaWeekPhase`): the state's own word until the graded set is final; then the objection window until its end — at the end and after it, Settling; a void-certain week, being voided; the window's end given only while it is ahead",
    wrong.length === 0, wrong.join(" | "));
  const WANT: Record<L3, [string, string, string, string]> = {
    en: ["Objection window", "Settling", "Week is being voided", "Objection window until Tuesday 12:00"],
    sw: ["Dirisha la pingamizi", "Inakamilishwa", "Wiki inabatilishwa", "Dirisha la pingamizi hadi Jumanne 12:00"],
    zh: ["异议窗口", "待结算", "整周作废中", "异议窗口至 周二 12:00"],
  };
  const words = LOCALES.filter((l) => {
    const d = dict[l].millionea;
    const got = [VIEW.weekPhaseWord(dict[l], "RESOLVING", { kind: "objections", objectionsUntil: 1 }), VIEW.weekPhaseWord(dict[l], "RESOLVING", { kind: "settling", objectionsUntil: null }),
      VIEW.weekPhaseWord(dict[l], "RESOLVING", { kind: "voiding", objectionsUntil: null }), fill(d.checkWindowUntil, { when: `${d.weekdays[1]} 12:00` })];
    return j(got) !== j(WANT[l]) || d.regCheck !== WANT[l][0] || VIEW.weekPhaseWord(dict[l], "RESOLVING", { kind: "state", objectionsUntil: null }) !== d.weekStatusResolving;
  });
  ok("5.P6b · the phase's words, the platform's one name for the window (the lead's ruling): \"Objection window\" / \"Dirisha la pingamizi\" / \"异议窗口\", \"…until Tuesday 12:00\", \"Settling\" / \"Inakamilishwa\" / \"待结算\", \"Week is being voided\" (zh \"整周作废中\", never 本周 for a week that may not be this one) — the register's regCheck the same",
    words.length === 0, j(words));
  const hub = squash(code(read(HUB))), page = squash(code(read(TICKET_PAGE)));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-HUB M5, the lead's ruling: adopt the register's one week chip): the
  // eyebrow's state is `WeekStateChip` beside the week — asked the one phase, "Paused for now" over a paused week — and its
  // text form (`weekLabelText`) the chip's own word (the hub's eyebrow and its grading block alike).
  const EYEBROW_WORD = "<WeekStateChip t={t} state={w.state} phase={millioneaWeekPhase(w, nowMs)} paused={paused} />";
  const EYEBROW_TEXT = "weekChipWord(t, w.state, millioneaWeekPhase(w, nowMs), paused)";
  const phaseWired = (hubSrc: string) => hubSrc.includes(EYEBROW_WORD) && hubSrc.includes(EYEBROW_TEXT) && count(hubSrc, "<WeekLabel t={t} w={") === 2
    && hubSrc.includes("const until = millioneaWeekPhase(w, nowMs).objectionsUntil;") && count(hubSrc, "objectionsLine(t, locale, w, nowMs)") === 2
    && hubSrc.includes("return millioneaWeekPhase(w, nowMs).kind === \"voiding\";") && !/WEEK_STATE_KEY\[w\.state\]/.test(hubSrc);
  const wired = phaseWired(hub)
    && page.includes("const phase = millioneaWeekPhase({ ...view.week, questions: view.questions }, nowMs);")
    && page.includes("phaseWord={phase.kind === \"state\" ? undefined : weekPhaseWord(t, view.week.state, phase)}") && page.includes("objectionsUntil: phase.objectionsUntil ?? undefined,");
  ok("5.P6c · every surface asks the one phase: the hub's eyebrow chip and grading block, its buy block's live line and its voiding pool, the ticket's week line and live line", wired);
  const { MaswaliTicket } = req("../src/components/maswali/maswali-ticket.tsx") as { MaswaliTicket: (p: Record<string, unknown>) => unknown };
  const pend = sealLineOf(week(Array(10).fill("YES"), Array(5).fill("YES")), PICKS);
  const tText = textOf(inApp("en", h(MaswaliTicket as never, { t: en, locale: "en", serverNow: at("2026-12-07T12:00:00.000Z"), serial: "MLN-2026-W49-000041", week: 49,
    weekState: "RESOLVING", phaseWord: en.millionea.weekStatusCheck, shown: "running", clauses: [], line: pend, stub: { price: 1_000, boughtAt: "2026-12-01T08:13:00Z", questionSetHash: "7f3a…" },
    live: { resultsIn: 15, reservesLeft: { valid: 5, of: 5 }, objectionsUntil: at(CLOSE) } } as never)));
  ok("5.P6d · the ticket says it: \"Week 49 · Objection window\" over \"15 of 15 results in · … · Objection window until Tuesday 12:00\" — never \"Results coming in\"",
    tText.includes("Week 49 · Objection window") && tText.includes("Objection window until Tuesday 12:00") && !tText.includes(en.millionea.weekStatusResolving), tText.slice(0, 200));
  // The old eyebrow: the chip without the phase — the state's own word ("Results coming in") over a week whose results are in.
  const oldEyebrow = read(HUB).replace(EYEBROW_WORD, "<WeekStateChip t={t} state={w.state} paused={paused} />");
  const blind = (w: Record<string, unknown>, now: number) => ({ kind: "state", objectionsUntil: null as number | null, w, now });
  ok("5.P6′ PLANT · the old eyebrow (the state's word over a week whose results are in) and a phase that ignores the window are each reported",
    oldEyebrow !== read(HUB) && !phaseWired(squash(code(oldEyebrow))) && cases.some(([, w, now, kind]) => blind(w, now).kind !== kind));
}

// P7 · "Results and payout" ends at the objection window's end — one rule for the hub's strip and How to play
{
  const PL = (await import("../src/lib/server/maswali-player.ts")) as unknown as {
    millioneaResultsBy: (close: string | null, lastVoid: number | null, rules: { objectionWindowHours: number; objectionNotBeforeAt: string }) => number | null;
    millioneaHowTimeline: (h: Record<string, unknown>, nowMs: number) => { resultsFrom: number; resultsTo: number; eventsTo: number } | null;
  };
  const VIEW = req("../src/app/millionea/millionea-view.ts") as { phasesOf: (w: Record<string, unknown>) => { resultsFrom: number; resultsTo: number } | null };
  const R = { objectionWindowHours: 24, objectionNotBeforeAt: "12:00" };
  const eat = (iso: string) => Date.parse(`${iso}+03:00`);
  const by = [
    PL.millioneaResultsBy("2026-12-08T11:31:00.000Z", eat("2026-12-07T23:59:00"), R) === Date.parse("2026-12-08T11:31:00.000Z"),
    PL.millioneaResultsBy(null, eat("2026-12-07T23:59:00"), R) === eat("2026-12-08T23:59:00"),
    PL.millioneaResultsBy(null, eat("2026-12-07T03:00:00"), R) === eat("2026-12-08T12:00:00"),
    PL.millioneaResultsBy(null, null, R) === null,
  ];
  ok("5.P7a · a week's results and payout end at its objection window's stamped end once known; before, at the latest void deadline plus the frozen window — Monday 23:59 → Tuesday 23:59, Monday 03:00 → never before Tuesday 12:00 (MR-16's floor)",
    by.every(Boolean), j(by));
  const H = { openWeekday: 1, openAt: "00:00", closeWeekday: 5, closeAt: "18:00", minLockBufferMinutes: 30, voidDeadlineHours: 48, finalDeadlineWeekday: 1, finalDeadlineAt: "23:59", objectionWindowHours: 24, objectionNotBeforeAt: "12:00" };
  const NOW = eat("2026-12-02T10:00:00"); // a Wednesday of the week of Monday 30 November
  const how = PL.millioneaHowTimeline(H, NOW);
  // A real week of that template, as the hub reads it: last event Sunday 04:00, every void deadline capped at Monday 23:59.
  const deadline = eat("2026-12-07T23:59:00").toString();
  const hubWeek = { opensAt: new Date(eat("2026-11-30T00:01:00")).toISOString(), closesAt: new Date(eat("2026-12-04T18:00:00")).toISOString(),
    questions: [{ eventStartsAt: new Date(eat("2026-12-05T09:00:00")).toISOString(), voidDeadlineAt: new Date(eat("2026-12-07T09:00:00")).toISOString() },
      { eventStartsAt: new Date(eat("2026-12-06T04:00:00")).toISOString(), voidDeadlineAt: new Date(Number(deadline)).toISOString() }],
    resultsBy: new Date(PL.millioneaResultsBy(null, Number(deadline), R) ?? 0).toISOString() };
  const hub = VIEW.phasesOf(hubWeek);
  const { MaswaliWeekStrip } = req("../src/components/maswali/maswali-week-strip.tsx") as { MaswaliWeekStrip: (p: Record<string, unknown>) => unknown };
  const resultsWords = (l: L3, phases: unknown) => textOf(inApp(l, h(MaswaliWeekStrip as never, { t: dict[l], phases, current: null } as never))).split(FACTS.factsOf(dict[l].millionea.stripResults)[0] ?? "").pop() ?? "";
  const same = LOCALES.filter((l) => !how || !hub || resultsWords(l, how) !== resultsWords(l, hub));
  ok("5.P7b · ⭐ How to play and the hub say ONE range for a week of the template: \"Results and payout · Sunday – Tuesday\" in both (the hub ended at the latest void deadline, \"Sunday – Monday\"; How at Monday plus the window, \"Monday – Tuesday\")",
    !!how && !!hub && how.resultsTo === eat("2026-12-08T23:59:00") && hub.resultsTo === how.resultsTo && same.length === 0
      && resultsWords("en", how).replace(/^\s*·\s*/, "").replace(/\s+/g, " ").trim() === "Sunday – Tuesday", j({ how: how && new Date(how.resultsTo).toISOString(), hub: hub && new Date(hub.resultsTo).toISOString(), en: resultsWords("en", how), same }));
  const oldHub = VIEW.phasesOf({ ...hubWeek, resultsBy: null });
  const oldHowTo = eat("2026-12-07T00:00:00") + 24 * 3_600_000;
  ok("5.P7′ PLANT · the old ends — the hub at the latest void deadline (Monday 23:59) and How at Monday plus the window (Tuesday 00:00) — are each told apart from the one rule",
    !!oldHub && oldHub.resultsTo === Number(deadline) && oldHub.resultsTo !== how?.resultsTo && oldHowTo !== how?.resultsTo);
}

// P8 · while a new week sells and the previous one is graded, the hub names each week truly
const weekLabelDefects = (src: string) => {
  const s = squash(code(src));
  const d: string[] = [];
  if (!s.includes("const heading = w.state === \"OPEN\" ? t.millionea.weekQuestions : fill(t.millionea.regWeekQuestions, { week: weekNumberOf(w.code) });")
    || !s.includes(">{heading}</h2>")) d.push("a week being graded heads its fifteen \"This week's questions\"");
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-HUB H4, M10): after Millionea ends the row is the final week's however
  // long ago (`retired`); and the carry leaves from the rollover notice's own figure, only when that rollover is this week's
  // carry in by the figure's own provenance (`carryFromCode`) — never from a row that is not drawn.
  if (!s.includes("if (!last || (!retired && !hub.lastWeekIsPrevious)) return null;")) d.push("\"Last week\" names a week that is not the one before the hub's");
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-HUB 6): the rollover that carries is `carryingRollover`'s — the one whose
  // week the figure names, of however many unseen (test:maswali-hub 6.5 holds its cases) — so one id is ever drawn.
  if (!s.includes("const rollover = carryingRollover(hub.notices, w?.pool ?? null);") || !s.includes("const carries = rollover !== null;")
    || !s.includes("carryFrom={carries ? CARRIED_FIGURE_ID : undefined}")) d.push("the carry can leave from a figure that is not this week's carry");
  const mine = s.slice(s.indexOf("function MineBlock("), s.indexOf("function BuyDoor("));
  if (!mine.includes("const onSale = w.state === \"OPEN\";") || !mine.includes("{onSale && <p className=\"text-body-sm text-text-muted\">{keepFact(locale, fill(t.millionea.yourTicketsThisWeek,")) d.push("a week being graded says \"Your tickets this week: n of cap\"");
  return d;
};
{
  const d = weekLabelDefects(read(HUB));
  ok("5.P8 · while a new week sells and the last one is graded the hub names each week truly: no cap line (\"Your tickets this week: 2 of 10\") under a week being graded, its own tickets kept; \"Last week\" only for the week right before the hub's own (the read model's `lastWeekIsPrevious`); a week being graded heads its questions \"Week 47's questions\"",
    d.length === 0, d.join(" | "));
  const plants = [
    weekLabelDefects(read(HUB).replace("if (!last || (!retired && !hub.lastWeekIsPrevious)) return null;", "if (!last) return null;")),
    weekLabelDefects(read(HUB).replace("{onSale && <p className=\"text-body-sm text-text-muted\">", "{<p className=\"text-body-sm text-text-muted\">")),
    weekLabelDefects(read(HUB).replace(">{heading}</h2>", ">{t.millionea.weekQuestions}</h2>")),
  ];
  ok("5.P8′ PLANT · each old label put back — \"Last week\" for any final week, the cap line under a graded week, \"This week's questions\" over a past week — is reported", plants.every((p) => p.length > 0), j(plants));
}

// P9 · the pool block's carry names the chain's week, never one counted from the open
{
  const VIEW = req("../src/app/millionea/millionea-view.ts") as { poolViewOf: (fig: Record<string, unknown>, price: number, voiding?: boolean) => PoolView };
  const fig = (over: Record<string, unknown>) => ({ weekId: "w", code: "MLN-2026-W48", visibility: "PUBLIC", state: "OPEN", carryIn: 412_000, carryPendingCode: null,
    carryFromCode: "MLN-2026-W46", sales: 41_000, floor: 1_000_000, jackpot: 1_000_000, atLeast: false, feeRate: 0.13, ...over });
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-HUB, the lead's ruling): the carry's row is the one ledger's, over the
  // hub's live input (`ledgerInputOf`), read as a reader reads it; the head's pending line still reads `poolViewOf`.
  const label = (l: L3, f: Record<string, unknown>) => nodeText(millioneaLedgerRows(dict[l], l, ledgerInputOf(f as never, 1_000, false)).find((r) => r.key === "in")?.label);
  const headLine = (f: Record<string, unknown>) => (VIEW.poolViewOf(f, 1_000) as { carriedIn: { week: number | null } | null }).carriedIn;
  const off = LOCALES.filter((l) => label(l, fig({})) !== fill(dict[l].millionea.carriedIn, { week: 46 }) || label(l, fig({ carryFromCode: null })) !== dict[l].millionea.carriedInNoWeek
    || label(l, fig({ carryIn: null, carryPendingCode: "MLN-2026-W47", carryFromCode: null })) !== fill(dict[l].millionea.carriedIn, { week: 47 })
    || headLine(fig({ carryIn: null, carryPendingCode: "MLN-2026-W47", carryFromCode: null }))?.week !== 47);
  ok("5.P9 · the pool block's carry row names the calendar chain's week — \"Carried in from Week 46\" across a voided Week 47, the week it waits on while pending — and, with none known, \"Carried in from earlier weeks\" (never a week counted from the open, never \"Week 0\")",
    off.length === 0, j(LOCALES.map((l) => [label(l, fig({})), label(l, fig({ carryFromCode: null }))])));
  const viewSrc = squash(code(read("src/app/millionea/millionea-view.ts")));
  ok("5.P9′ PLANT · the old arithmetic (previousWeekNumber, the open minus seven days) is gone from the joint and the view reads the figure's own week",
    !/previousWeekNumber|nextWeekNumber|weekAfter\(/.test(viewSrc) && viewSrc.includes("week: fig.carryFromCode ? weekNumberOf(fig.carryFromCode) : null")
      && squash(code(read("src/app/millionea/hub-pool.tsx"))).includes("week: fig.carryFromCode ? weekNumberOf(fig.carryFromCode) : null"));
}

// P18 · the slip's two notices are the kit's Callout, never a hand-rolled copy
const kitNoticeDefects = (src: string) => {
  const s = squash(code(src));
  const d: string[] = [];
  if (/border-warning-border|bg-warning-bg|text-warning-fg|<I\.warning\b/.test(s)) d.push("the slip paints its own warning box");
  if (!s.includes("<Callout tone=\"warning\">{moneyRuns(fill(t.millionea.lowBalanceBody, { balance: balanceText, price: priceText }))}</Callout>")) d.push("the short balance is not the kit's warning Callout");
  if (!s.includes("<Callout tone=\"neutral\" title={t.millionea.refusalIncomplete}>")) d.push("the incomplete refusal is not the kit's neutral Callout");
  if (/<div className="mat-flat flex gap-2 rounded-control px-3 py-2">/.test(s)) d.push("the old hand-rolled refusal box is back");
  return d;
};
{
  const d = kitNoticeDefects(read(SLIP));
  const { MaswaliSlipConfirm } = req("../src/components/maswali/maswali-slip.tsx") as { MaswaliSlipConfirm: (p: Record<string, unknown>) => unknown };
  const sheet = (l: L3) => inApp(l, h(MaswaliSlipConfirm as never, {
    open: true, onClose() {}, week: 49, questions: [], picks: [], price: 1_000, balance: 400, ticketNumber: 1, cap: 10, cancelUntil: null, pct: 13,
    lowBalance: true, depositDoor: null, onCommit() {},
  } as never));
  const drawn = LOCALES.filter((l) => {
    const m = sheet(l);
    return !(m.includes('role="note"') && m.includes("border-warning-border bg-warning-bg") && textOf(m).includes(fill(dict[l].millionea.lowBalanceBody, { balance: "TZS 400", price: "TZS 1,000" })));
  });
  ok("5.P18 · the slip's two notices are the kit's own Callout — the confirm's short balance its warning tone (drawn: the kit's note, frame and wash around the words, in three languages), the incomplete ticket its neutral tone — never a hand-rolled copy",
    d.length === 0 && drawn.length === 0, j({ d, drawn }));
  const oldBox = read(SLIP).replace("<Callout tone=\"warning\">{moneyRuns(fill(t.millionea.lowBalanceBody, { balance: balanceText, price: priceText }))}</Callout>",
    "<div className=\"flex gap-2 rounded-control border border-warning-border bg-warning-bg px-3 py-2\"><I.warning s={18} className=\"mt-px shrink-0 text-warning-fg\" /><p className=\"text-body-sm text-text\">{moneyRuns(fill(t.millionea.lowBalanceBody, { balance: balanceText, price: priceText }))}</p></div>");
  ok("5.P18′ PLANT · the old hand-rolled short-balance box put back is reported", oldBox !== read(SLIP) && kitNoticeDefects(oldBox).some((x) => x.includes("paints its own")));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI DESIGN: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run prints; VIS-P's fact, example and word plants brought it to 110, and S5-FIX-PLAYER's §5
 *  (P5, P6, P7, P8, P9, P10, P13, P15, P17, P18) to 141. */
const MIN_ASSERTIONS = 141;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
