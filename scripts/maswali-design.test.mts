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
import { dict } from "../src/lib/i18n-dict.ts";
import { fill, formatTzs } from "../src/lib/utils.ts";
import { outcomeWord } from "../src/lib/side-label.ts";
import { sealLineOf } from "../src/components/maswali/maswali-seal-line.tsx";
import { poolLedgerRows, poolRule, type PoolView } from "../src/components/maswali/maswali-pool-figure.tsx";
import { homeCardOf, nextWeekOpen } from "../src/components/maswali/maswali-card-model.ts";
import { outcomeStampText } from "../src/components/maswali/maswali-outcome-stamp.tsx";
import { counted, eatWeekday, remainderNoteOf } from "../src/components/maswali/maswali-format.ts";
import { remainderFate, settleArithmetic } from "../src/lib/maswali-money.ts";
import { eatIsoWeek } from "../src/lib/eat-day.ts";
import { resultDoorSerial, resultLine } from "../src/app/millionea/millionea-view.ts";
import { TICKET_SHOWN_KEY } from "../src/lib/maswali-week-label.ts";
import type { MillioneaNotice } from "../src/lib/server/maswali-player.ts";
import { MILLIONEA_GLYPHS } from "../src/components/maswali/maswali-glyph.tsx";
import { I } from "../src/components/ui/glyphs.tsx";
import { GLYPH_MAP, NEW_KEYS } from "./glyphs/map.ts";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel: string) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n") : "");
const code = (src: string) => decomment(src);
const squash = (s: string) => s.replace(/\s+/g, " ");
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);
const LOCALES = ["en", "sw", "zh"] as const;

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
  const refundOf = (v: PoolView) => poolLedgerRows(en, v, 13).find((r) => r.key === "refund");
  const voiding = refundOf({ kind: "voiding", ...base, price: 1_000 });
  ok("2.H1a · being voided, the refund row is conditional and future (\"if the void stands\"), with no figure — never \"every ticket refunded\" before a refund exists",
    voiding?.label === fill(en.millionea.refundEachIfVoid, { price }) && voiding?.value === "—", j(voiding));
  const pending = refundOf({ kind: "voided", ...base, price: 1_000, refunded: 0, carriedForward: { week: 43, amount: 0 }, refundLanded: false });
  ok("2.H1b · voided with refunds still on their way: \"on its way back\", no refunded total (MR-18)",
    pending?.label === fill(en.millionea.refundEachPending, { price }) && pending?.value === "—", j(pending));
  const landed = refundOf({ kind: "voided", ...base, price: 1_000, refunded: 10_000, carriedForward: { week: 43, amount: 0 }, refundLanded: true });
  ok("2.H1c · CONTROL · voided with every refund landed: \"every ticket refunded\", the total beside it",
    landed?.label === fill(en.millionea.refundEach, { price }) && landed?.value === formatTzs(10_000), j(landed));
  ok("2.H1d · a void shares no jackpot: no \"shared by every 10/10 ticket\" rule on a voiding or voided week — and the rule stands on a selling one (control)",
    poolRule(en, { kind: "voiding", ...base, price: 1_000 }, 13) === null
      && poolRule(en, { kind: "selling", ...base, jackpot: 1_000_000 }, 13) === fill(en.millionea.ruleShared, { pct: 13 }));
  const conditional: Record<(typeof LOCALES)[number], RegExp> = { en: /\bIf no check\b/, sw: /usipobadilisha/, zh: /若/ };
  const unconditional = LOCALES.filter((l) => !conditional[l].test(dict[l].millionea.weekVoidingBody));
  ok("2.H1e · the voiding sentence is conditional in every language (a check can still un-void the week)", unconditional.length === 0, j(unconditional));
  const page = squash(code(read(TICKET_PAGE)));
  ok("2.H1f · a ticket's void line says \"refunded\" only once ITS refund landed, \"on its way back\" before",
    page.includes('fill(refund === "pending" ? t.millionea.weekVoidedBodyPending : t.millionea.weekVoidedBody, {'));
  const reg = squash(code(read(REGISTER_WEEK)));
  ok("2.H1g · the register's voided ledger: \"refunded\" only once every refund landed",
    reg.includes("node: w.refundsPending ? <ReceiptRow") && reg.includes("t.millionea.refundEachPending"));
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
  ok("2.M4d · the ticket card's one link carries a visible name in words, its accessible name starting with it",
    ticket.includes("aria-label={`${t.millionea.viewTicket} · ${serial}`}") && /<MaswaliSealLine line=\{line\} size=\{18\} annex="below" inert=\{shown === "cancelled"\} \/> <span[^>]*>\s?\{t\.millionea\.viewTicket\}/.test(ticket));
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
  ok("2.M7d · the card draws neither the figure's rule nor the 768 figure block on a void, and says the void's own words",
    count(card, "{!voidKind && (") === 2 && card.includes("meta = t.millionea.weekVoidingShort;") && card.includes("meta = state.refundsPending ? t.millionea.weekVoidedShortPending : t.millionea.weekVoidedShort;"));
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
  ok("2.R4e · the card draws that bound as the hub does — \"at least\" around the figure and the waiting week's line — and the door hands it the model's bound and the template's next week",
    card.includes("return jackpot !== null && atLeast ? fillNodes(t.millionea.atLeast, { amount: run }) : run;")
      && card.includes("const pending = jackpot !== null && pendingWeek !== null ? fill(t.millionea.pendingCarry, { week: pendingWeek }) : null;")
      && count(card, "{pending && <span") === 2
      && door.includes("homeCardOf(t, hub, configuredFeeRate(), nowMs, nextWeekOpen(hub, millioneaOpenTemplate(), nowMs))")
      && door.includes("atLeast={model.atLeast} pendingWeek={model.pendingWeek}"));
  const hubSrc = squash(code(read(HUB)));
  const model = code(read("src/components/maswali/maswali-card-model.ts"));
  ok("2.R4f · the hub's cap line promises no next week when none follows (`capReachedOnly`), and neither the hub nor the card counts seven days from a week's open",
    hubSrc.includes("nextOpen === null ? fill(t.millionea.capReachedOnly, { cap: w.ticketCap })")
      && hubSrc.includes("nextOpen={nextWeekOpen(hub, millioneaOpenTemplate(), nowMs)}")
      && !/7 \* 86_400_000/.test(hubSrc) && !/opened \+ 7 \* DAY_MS/.test(model));

  // F1 · MR-30, OD-03 · a final week still to open is ANNOUNCED where the product is entered: the hub and the card.
  const ahead = { code: "2026-W44", opensAt: "2026-10-25T21:00:00.000Z" }; // Monday 26 October, 00:00 EAT
  const announced = homeCardOf(en, { ...hubOf(sellingWeek(), "ENDING"), finalAhead: ahead } as never, 0.13, NOW, null);
  const unannounced = homeCardOf(en, live as never, 0.13, NOW, next);
  ok("2.F1a · ⛔ a final week still to open is named on the card whatever week the card shows; CONTROL: with none announced, nothing is",
    announced?.finalAhead === 44 && announced.finalWeek === false && unannounced?.finalAhead === null, j({ announced, unannounced: unannounced?.finalAhead }));
  const own = homeCardOf(en, { ...hubOf(sellingWeek({ isFinal: true }), "ENDING"), finalAhead: ahead } as never, 0.13, NOW, null);
  ok("2.F1b · the final week's own card says \"final week\" once, never names itself again as the week to come",
    own?.finalWeek === true && own.finalAhead === null, j(own));
  const presale = homeCardOf(en, { ...hubOf(null, "ENDING"), finalAhead: ahead } as never, 0.13, NOW, null);
  const pastDue = homeCardOf(en, { ...hubOf(null, "ENDING"), finalAhead: { code: "2026-W44", opensAt: "2026-10-12T21:00:00.000Z" } } as never, 0.13, NOW, null);
  ok("2.F1c · with no week and no last week the card is the final week's presale, on the day it was announced to open; CONTROL: an announced time already past is never drawn as one to come",
    presale?.state.kind === "presale" && presale.week === 44 && presale.finalWeek === true
      && (presale.state as { opensOn?: string }).opensOn === eatWeekday(en, Date.parse(ahead.opensAt)) && pastDue === null, j({ presale, pastDue }));
  const cardF = squash(code(read(CARD)));
  const doorF = squash(code(read("src/components/maswali/maswali-home-card-door.tsx")));
  ok("2.F1d · the card draws the announcement, the door hands it the model's, and the hub draws its callout from the read model in both forms (with the time while it is ahead)",
    cardF.includes('{!finalWeek && finalAhead !== null && <span className="text-body-sm text-text">{fill(t.millionea.finalAheadShort, { week: finalAhead })}</span>}')
      && doorF.includes("finalAhead={model.finalAhead}")
      && hubSrc.includes('{hub.finalAhead && <Callout tone="info" glyph="flag" role="status">{finalAheadLine(t, hub.finalAhead, nowMs)}</Callout>}')
      && hubSrc.includes("return at !== null && at > nowMs ? fill(t.millionea.finalAheadAt, { week, when: eatWeekdayClock(t, at) }) : fill(t.millionea.finalAhead, { week });")
      && LOCALES.every((l) => /\{week\}/.test(dict[l].millionea.finalAheadAt) && /\{when\}/.test(dict[l].millionea.finalAheadAt)
        && /\{week\}/.test(dict[l].millionea.finalAhead) && !/\{when\}/.test(dict[l].millionea.finalAhead) && /\{week\}/.test(dict[l].millionea.finalAheadShort)));

  // F3 · MR-30 · the buyer of a final week is told its rule at purchase: on the slip, first, and on the confirm sheet.
  const slipF = squash(code(read(SLIP)));
  const clientF = squash(code(read(SLIP_CLIENT)));
  const slipPage = squash(code(read("src/app/millionea/slip/page.tsx")));
  ok("2.F3a · ⛔ a final week's rule is on the slip (its first rule) and on the confirm sheet (beside the fee rule), on the week's own flag",
    slipF.includes("...(finalWeek ? [t.millionea.finalRule] : []), t.millionea.reserveRule,")
      && slipF.includes("fill(t.millionea.ruleShared, { pct }), finalWeek ? t.millionea.finalRule : null, ]")
      && count(clientF, "finalWeek={finalWeek}") === 2 && slipPage.includes("finalWeek={slip.week.isFinal}")
      && LOCALES.every((l) => dict[l].millionea.finalRule.includes("10/10")));
}

// F4 · MR-25 · where the rounding remainder went, read off the week's own arithmetic, said one way on the register and the
// receipt — and never as "house money" (D19)
{
  const RATES = { traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 };
  const week = (sales: number, winners: number) => settleArithmetic({ rolloverIn: 0, sales, winners, floor: 2_000_000, feeRate: 0.13, rates: RATES });
  const fateOf = (a: ReturnType<typeof week>) => (a.kind === "PAYOUT" ? remainderFate(a.dust, a.carryOut) : null);
  const big = week(10_000_000, 7), topped = week(500_000, 7), between = week(1_999_998, 7);
  ok("2.F4a · ⛔ a week whose own money covers the remainder carries it all; a week the guarantee tops up keeps it all; a floor week whose money covers part carries that part",
    big.kind === "PAYOUT" && big.dust > 0 && fateOf(big) === "carried"
      && topped.kind === "PAYOUT" && topped.U > 0 && topped.dust > 0 && fateOf(topped) === "kept"
      && between.kind === "PAYOUT" && between.U === 0 && between.carryOut > 0 && between.carryOut < between.dust && fateOf(between) === "part",
    j({ big, topped, between }));
  const notes = (l: (typeof LOCALES)[number]) => [dict[l].millionea.remainderNote, dict[l].millionea.remainderNoteKept, dict[l].millionea.remainderNotePart];
  ok("2.F4b · the register and the receipt say it through one helper, the receipt in every paying week; no note names the house's money",
    squash(code(read(REGISTER_WEEK))).includes("remainderNoteOf(t, remainderFate(w.remainder ?? 0, w.carriedForward ?? 0))")
      && squash(code(read(LEDGER))).includes('remainderNoteOf(t, L.remainderFate ?? "carried")')
      && squash(code(read("src/app/millionea/millionea-view.ts"))).includes("remainderFate: win.remainder > 0 ? remainderFate(win.remainder, win.carriedOut) : undefined,")
      && remainderNoteOf(en, "carried") === en.millionea.remainderNote && remainderNoteOf(en, "kept") === en.millionea.remainderNoteKept
      && remainderNoteOf(en, "part") === en.millionea.remainderNotePart
      && LOCALES.every((l) => notes(l).every((n) => n.length > 0 && !/house|nyumba|平台资金/i.test(n))), j(LOCALES.map(notes)));
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

console.log(`\n${"═".repeat(70)}\n  MASWALI DESIGN: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run PRINTS; it only rises, to a printed number. ⏳ The STATIC count, until the first green
 *  run (on a tree with W2) prints it (the S5 review of 24ec0d33, MEDIUM 8): 62 call sites, none in a loop. */
const MIN_ASSERTIONS = 70;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
