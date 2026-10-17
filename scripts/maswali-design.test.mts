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
 *   §3 its own controls: each source check is seen to fail on a planted copy
 *
 * ⏳ §2 M4's family check (every MILLIONEA_GLYPHS key drawn by `I`, and `I.void` no longer the legacy circled X) STAYS RED
 *    until the Phosphor lane's W2 swap lands — by the lead's ruling this suite is NOT in predeploy, and the staff preview
 *    waits on W2.
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
import { homeCardOf } from "../src/components/maswali/maswali-card-model.ts";
import { outcomeStampText } from "../src/components/maswali/maswali-outcome-stamp.tsx";
import { MILLIONEA_GLYPHS } from "../src/components/maswali/maswali-glyph.tsx";
import { I } from "../src/components/ui/glyphs.tsx";
import { GLYPH_MAP } from "./glyphs/map.ts";
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
  const d20 = LOCALES.filter((l) => !/\b0\b/.test(dict[l].millionea.reservesShort) || !dict[l].millionea.reservesShort.includes("{b}"));
  ok("2.M3e · the D-20 sentence exists in all three languages", d20.length === 0, j(d20));
}

// M4 · the family, and a link with a name
{
  const family = I as unknown as Record<string, unknown>;
  const missing = MILLIONEA_GLYPHS.filter((k) => typeof family[k] !== "function");
  ok(`2.M4a · ⏳ every Millionea key is drawn by the family I (red until the Phosphor W2 swap lands): missing ${missing.length} of ${MILLIONEA_GLYPHS.length}`,
    missing.length === 0, missing.join(", "));
  const voidEntry = GLYPH_MAP.void as { ph?: string } | undefined;
  ok("2.M4b · `void` is Phosphor's `prohibit` in the map (§10c: one meaning, one glyph)", voidEntry?.ph === "prohibit", j(voidEntry));
  const legacyVoid = read("src/components/ui/glyphs.tsx").includes('void: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></G>,');
  ok("2.M4c · ⏳ `I.void` is no longer the legacy circled X that reads as xCircle — a miss (red until W2)", !legacyVoid);
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

// ── §3 · controls ─────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · controls — each source check fails on a planted copy");
{
  const plant = (rel: string, from: string, to: string) => (r: string) => (r === rel ? read(r).replace(from, to) : read(r));
  const goldCard = goldDefects(plant(CARD, '<span className="amount text-title-sm font-semibold text-text">{figure}</span>', '<span className="amount gilt-ink text-title-sm font-semibold text-text">{figure}</span>'));
  ok("3.1 · gold planted on the card's figure is reported", goldCard.some((x) => x.startsWith(CARD)));
  const toggles = radioDefects(read(SLIP).replace("aria-checked={yesLit}", "aria-pressed={yesLit}"));
  ok("3.2 · toggle semantics put back on an answer are reported", toggles.some((x) => x.includes("aria-pressed")));
  const late = liveDefects(read(SLIP), read(TICKET).replace('<p aria-live="polite" aria-atomic="true" data-testid="millionea-ticket-live"', '{liveText && <p aria-live="polite" aria-atomic="true" data-testid="millionea-ticket-live"'));
  ok("3.3 · a ticket region mounted only with its words is reported", late.some((x) => x.includes("ticket's region")));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI DESIGN: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run PRINTS; it only rises, to a printed number. ⏳ Set from the first green run (W2). */
const MIN_ASSERTIONS = 1;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
