/**
 * test:campaign-visuals §R — U48a's claims: THE RESULTS ON THE LIVE CAMPAIGN PAGE (ENGINE-SPEC §4.16; E5 · E23 · E28 · E30 ·
 * OD24 · OD26 · OD40 · OD41).
 *
 * ⭐ WHY A LIBRARY BESIDE THE SUITE, as the page's (`campaign-visuals-page.mts`): the results have a world of imports of their
 * own — the card, the DLR route, the opt-out service, the walk — and `scripts/campaign-visuals.test.mts` runs these claims
 * with ITS harness (the world, the viewers, the plants), so ONE run and ONE red run cover all three halves.
 *   R1  ⭐ `accepted` IS NEVER DELIVERED — only a RECEIPT, through the real DLR route, moves "Delivered" (the plan's OD41 rule);
 *   R2  the honesty line, rendered from the data — present with no receipt, gone after one (a failure's too), the not-set-up
 *       line only while this server could not take one, neither said about a campaign that handed nothing over;
 *   R3  the 15-minute figure counts the rows STILL SENT and handed over before the cutoff, and nothing else (E5);
 *   R4  ⭐ stopped-by-link attribution (E30) — a stop after this campaign's message counts; a stop before it, a stop after a
 *       NEWER campaign's message to the same number, an officer's, a lifted one and a number never handed anything do not —
 *       each stop is one campaign's, never two's; made by the REAL opt-out service the spelling is the one the walk reads;
 *   R5  the reasons are U38b's five buckets, protected ONE line, dominant first, for every role (the figures card's own list);
 *   R6  ⛔ E23 · the floor — below it there are NO results, and nothing on the page names a split or whether anyone was messaged;
 *   R7  whether receipts are set up is the DLR route's own rule — held equal to the route's real `authorized` over a matrix;
 *   R8  ⛔ OD24 · the price line for a viewer who may read money only — exact, an estimate, never below the floor;
 *   R9  the failed split, no answer and what is left — agreeing with the figures card, from the ONE groupBy asked ONCE;
 *   R10 the stop walk and its cost — chunks, memory, a failure said and never a zero, nothing asked when there is nobody to ask about;
 *   R11 the card itself — the spec's titles, the words, an unread count said, no arithmetic and no money in the browser's file;
 *   R12 the wiring — the doors by identity, the module's reach, the mount and the ghost;
 *   R13 the reasons are printed ONCE — by the results card; the figures card keeps its own list only for a view with no results.
 * ⛔ This file holds no backslash (an editing tool decodes them): patterns are built from character classes and codes.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment } from "./decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CR = String.fromCharCode(13);
const NL = String.fromCharCode(10);
const DQ = String.fromCharCode(34);
const json = (v: unknown): string => JSON.stringify(v);
const rawRead = (rel: string): string => readFileSync(join(ROOT, ...rel.split("/")), "utf8").split(CR).join("");
const code = (rel: string): string => decomment(rawRead(rel));

const DIR = "src/app/admin/campaigns/[id]/";
const RES = await import("../../src/lib/server/marketing/campaign-results.ts");
const LIVEM = await import("../../src/lib/server/marketing/campaign-live.ts");
const MODEL = await import("../../src/lib/server/marketing/campaign-model.ts");
const COPY = await import("../../src/app/admin/campaigns/[id]/live-copy.ts");
const CARD = await import("../../src/app/admin/campaigns/[id]/results-card.tsx");
const CLIENT = await import("../../src/app/admin/campaigns/[id]/live-client.tsx");
const ROUTE = await import("../../src/app/api/webhooks/blackball/route.ts");
const OPTOUT = await import("../../src/lib/server/marketing/optout-service.ts");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
const { db, BULK_KEYED_READ_MAX } = await import("../../src/lib/server/store.ts");
const { DISPATCH_TARGET_TYPE } = await import("../../src/lib/server/marketing/dispatch.ts");
const { AUDIENCE_REASON_LABEL } = await import("../../src/app/admin/campaigns/new/audience-copy.ts");

type CampaignLiveView = import("../../src/lib/server/marketing/campaign-live.ts").CampaignLiveView;
type LiveViewer = import("../../src/lib/server/marketing/campaign-live.ts").LiveViewer;
type LiveViewDeps = import("../../src/lib/server/marketing/campaign-live.ts").LiveViewDeps;
type ResultsDeps = import("../../src/lib/server/marketing/campaign-results.ts").ResultsDeps;
type StopWalkDeps = import("../../src/lib/server/marketing/campaign-results.ts").StopWalkDeps;
type StoredSmsCampaignRecipient = import("../../src/lib/server/store.ts").StoredSmsCampaignRecipient;

/* ══ THE LABELS — each once, so a red case names exactly the claims it must turn red ═════════════════════════════════ */

export const LABELS = {
  r1: "R1 · ⭐ `accepted` IS NEVER DELIVERED (OD41, the plan's rule) — a campaign whose messages the gateway ACCEPTED (SmsMessage rows ACCEPTED, recipients SENT) reads Delivered 0 and Handed over, no receipt yet N, however many there are and whatever else is on the list; then receipts POSTed at the REAL DLR route move exactly their recipients — a DELIVRD to Delivered, an UNDELIV to Failed (not delivered) — and the figures card's Handed over stays Delivered + the rest",
  r2: "R2 · THE HONESTY LINE IS RENDERED FROM THE DATA (OD41) — with a message handed over and no receipt of any kind the card says 'No delivery receipt has arrived for this campaign yet — handed over is not delivered'; after ONE receipt (delivered, or a failure) it is gone by itself; it is never said about a campaign that handed nothing over; a server that could not take a receipt says so as well, true only while Delivered cannot move; and both are gone after a receipt",
  r3: "R3 · THE 15-MINUTE FIGURE COUNTS THE ROWS STILL SENT AND HANDED OVER BEFORE THE CUTOFF, AND NOTHING ELSE (E5) — over a list of SENT rows at 16 min, 15 min plus a millisecond, exactly 15 min, 14 min, 2 hours and none, a DELIVERED, an UNCONFIRMED and a receipt-failed row, a PENDING one: exactly the older SENT ones, the cutoff being now less 15 minutes; not asked at all when nothing is SENT; a count that fails is said as unread (a dash and its sentence), never a zero, and does not fail the view",
  r4: "R4 · ⭐ STOPPED BY THEIR LINK, ATTRIBUTED (E30) — over two campaigns that messaged the same numbers: a link stop after this campaign's message counts; one made BEFORE it does not; one made after a NEWER campaign's message to the same number is that campaign's and counts there, once, never in both; a stop between the two messages is this campaign's; a newer FAILED message explains nothing; an officer's withdrawal (other evidence), another reason, a lifted stop, and a person who was skipped or whose message failed do not count; and the stop the REAL opt-out service writes is counted",
  r5: "R5 · THE REASONS ARE U38b'S FIVE BUCKETS, PROTECTED ONE LINE, FOR EVERY ROLE — skipped rows across every gate reason read under Not sent in AUDIENCE_REASON_LABEL's five words (zeros too), protected ONE line, dominant first, then Can't be sent to and an unworded refusal only because there is one of each, adding up to Not sent — for a reader, a GROWTH officer and a viewer who may only look alike, the figures card's own list, and no gate reason's key anywhere in the results",
  r6: "R6 · ⛔ E23 · THE FLOOR — a masked viewer on a campaign of 9 rows has NO results and the page names no split, no reason and nothing about whether anyone was messaged (the floor's sentence stands alone); at 10 rows everything; a reader at 9 everything; a list of 9 under a confirmed 50 is floored; a campaign with nobody on its list has none for anyone; a viewer who may read money but not numbers is floored too, and gets no price",
  r7: "R7 · WHETHER A RECEIPT CAN ARRIVE IS THE DLR ROUTE'S OWN RULE — receiptsSetUp equals the route's real `authorized` over a matrix of environments (no secret in production and out of it, on the live rail and the stub; a secret one character short of the floor and at it; the rotation's previous secret alone), and the process's own environment is read as the route reads it",
  r8: "R8 · ⛔ OD24 · THE PRICE LINE FOR A VIEWER WHO MAY READ MONEY ONLY — a money reader's results carry handed over (SENT + DELIVERED) × the configured price and the card says it in exactly the spec's sentence (TZS 6 and TZS 6.50 both); a GROWTH officer and a viewer who may only look get no price, no TZS anywhere in the view or the card, and the price is not even asked; nothing is said while nothing is handed over or when the price cannot be read; below the floor a money reader gets nothing",
  r9: "R9 · THE FAILED SPLIT, NO ANSWER AND WHAT IS LEFT, AGREEING WITH THE FIGURES — failed rows split by their class (no receipt: prefix = the network refused it; a receipt: prefix = reported undelivered), every one in exactly one; no answer; waiting is PENDING + HELD, and for a stopped campaign everybody it did not message — the headline's own figure, a list that never finished included; every result adds to the figures card (Delivered + Handed over = its Handed over, Failed, Not sent, No answer, Waiting) and the view asks its ONE groupBy exactly once",
  r10: "R10 · THE STOP WALK AND ITS COST — walked in chunks (a list of an exact multiple of the chunk ends on an empty page), each chunk's stops asked in ONE query of at most a chunk of numbers, every person once; the real chunk is 1,000 and fits the bulk read's bound; production keeps a campaign's count for a short time and shares a walk in flight — a failed walk is never kept; a count that cannot be made is unread, never a zero, and never fails the view; a view never waits longer than its budget for the walk — one that is slower says unread THIS time and the memory finds it done for the next; nothing is asked of a campaign that handed nothing over",
  r11: "R11 · THE CARD — the spec's titles in the spec's order (Delivered · Handed over, no receipt yet · No receipt after 15 minutes · Failed with The network refused it and Not delivered (receipt) · Not sent — the checks refused them · No answer from the network · Stopped before sending · Stopped by their link since this campaign); the Delivered row prints Delivered and never Handed over (distinct numbers); the honesty and price lines are the spec's sentences; an unread count is a dash and its sentence; nothing is drawn below the floor; and the card's file does no arithmetic on a count, formats no money, reads no clock and reaches nothing of the server",
  r12: "R12 · THE WIRING — the view's results deps frozen and wired to the REAL doors by identity and by source; the results module names no send and writes nothing; only the live view imports it; the card is imported by the page alone, which mounts it behind LiveWhenResults in its own block under the figures; the ghost has the matching block; the client exports the one hook the card reads",
  r13: "R13 · THE REASONS ARE PRINTED ONCE — over a reader's campaign above the floor the whole page (status, controls, figures and results) draws the five reasons in the results card and none in the figures card, and not the figures card's 'Not sent, by reason' title; the same view with its results taken away keeps the figures card's own list; a masked viewer on nine rows is drawn neither; the figures card's file guards its list on the view having no results",
} as const;
export type ResultsLabel = (typeof LABELS)[keyof typeof LABELS];

/* ══ THE SOURCES AND THE IMPLEMENTATION UNDER TEST — swapped piece by piece by the plants ════════════════════════════ */

export type ResultsSources = {
  results: string; card: string; page: string; loading: string; client: string; geometry: string; live: string; copy: string;
  /** Every src file that names campaign-results at all, decommented — R12's importer scan. */
  importers: ReadonlyMap<string, string>;
};
function walkDir(abs: string): string[] {
  return readdirSync(abs, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkDir(join(abs, e.name)) : /[.]tsx?$/.test(e.name) ? [join(abs, e.name)] : []);
}
const NAMING = new Map<string, string>();
for (const abs of walkDir(join(ROOT, "src"))) {
  const raw = readFileSync(abs, "utf8");
  if (raw.includes("campaign-results")) NAMING.set(abs.slice(ROOT.length + 1).split(String.fromCharCode(92)).join("/"), decomment(raw.split(CR).join("")));
}
const REAL_SOURCES: ResultsSources = {
  results: code("src/lib/server/marketing/campaign-results.ts"), card: code(`${DIR}results-card.tsx`), page: code(`${DIR}page.tsx`),
  loading: code(`${DIR}loading.tsx`), client: code(`${DIR}live-client.tsx`), geometry: code(`${DIR}live-geometry.ts`),
  live: code("src/lib/server/marketing/campaign-live.ts"), copy: code(`${DIR}live-copy.ts`), importers: NAMING,
};

export type ResultsImpl = {
  /** The results card inside the client provider and the app router, exactly as the page composes it. */
  render: (view: CampaignLiveView, o: { mayAct: boolean }) => string;
  /** The whole page's bodies — status, controls, figures and results — as the page composes them (R13). */
  renderPage: (view: CampaignLiveView, o: { mayAct: boolean }) => string;
  /** Whether this server can take a receipt (R7). */
  setUp: typeof RES.receiptsSetUp;
  /** The stop walk's memory (R10), and the walk with the deps its claims hand it (R4, R10). */
  memo: typeof RES.memoByKey;
  walk: typeof RES.stoppedByLinkOf;
  walkDeps: StopWalkDeps;
  /** Production's results deps, as the view is wired (R10, R12). */
  production: Readonly<ResultsDeps>;
  sources: ResultsSources;
};

function renderCard(view: CampaignLiveView, o: { mayAct: boolean }): string {
  const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
  return renderToStaticMarkup(
    createElement(AppRouterContext.Provider, { value: router as never },
      createElement(CLIENT.LiveProvider, { initial: view, mayAct: o.mayAct, children: [
        createElement(CARD.LiveWhenResults, { key: "r" }, createElement("div", { "data-block": "live-results" }, createElement(CARD.LiveResults))),
      ] })));
}

/** The whole page's bodies, as the page composes them — to read what the page says as a whole (R6). */
function renderWhole(view: CampaignLiveView, o: { mayAct: boolean }): string {
  const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
  return renderToStaticMarkup(
    createElement(AppRouterContext.Provider, { value: router as never },
      createElement(CLIENT.LiveProvider, { initial: view, mayAct: o.mayAct, children: [
        createElement("div", { key: "s", "data-block": "live-status" }, createElement(CLIENT.LiveStatus)),
        createElement("div", { key: "c", "data-block": "live-controls" }, createElement(CLIENT.LiveControls)),
        createElement(CLIENT.LiveWhenListed, { key: "p" }, createElement("div", { "data-block": "live-progress" }, createElement(CLIENT.LiveProgress))),
        createElement(CARD.LiveWhenResults, { key: "r" }, createElement("div", { "data-block": "live-results" }, createElement(CARD.LiveResults))),
      ] })));
}

export const REAL_RESULTS: ResultsImpl = {
  render: renderCard,
  renderPage: renderWhole,
  setUp: RES.receiptsSetUp,
  memo: RES.memoByKey,
  walk: RES.stoppedByLinkOf,
  walkDeps: RES.STOP_WALK_DEPS,
  production: RES.RESULTS_DEPS,
  sources: REAL_SOURCES,
};

/** A source with one anchor replaced. ⛔ An anchor that is not there THROWS, so a plant can never pass as caught unchanged. */
export const plantIn = (src: string, from: string, to: string): string => {
  if (!src.includes(from)) throw new Error(`plant anchor not found: ${from.slice(0, 60)}`);
  return src.replace(from, to);
};

/* ══ THE PIECES ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

type Shape = {
  status: string; skipReason?: string; failureClass?: string; sentAt?: string; smsReference?: string; msisdn?: string;
};
export type ResultsHarness = {
  claim: (label: string, body: () => Promise<[boolean, string]>) => Promise<void>;
  view: (id: string, viewer: LiveViewer, over?: Partial<LiveViewDeps>) => Promise<CampaignLiveView>;
  campaign: (key: string, shape: { path: string[]; count?: number; name?: string; estimateTzs?: number | null; budgetTzs?: number | null }) => Promise<{ id: string }>;
  rows: (id: string, shapes: ReadonlyArray<Shape>) => Promise<string[]>;
  many: (n: number, s: Shape) => Shape[];
  READER: LiveViewer; GROWTH: LiveViewer; WATCHER: LiveViewer;
  /** Keep a rendered card for the phone-number sweep (P1). */
  see: (text: string) => void;
  /** The memory twin's maps (a fixture only). */
  mem: () => { smsCampaignRecipients: Map<string, StoredSmsCampaignRecipient> };
  /** The suite's fixed clock, in ms. */
  at: number;
  /** A made-up bare gateway key on an NDC. */
  key: (ndc: string, n: number) => string;
  run: number;
};

const UNESCAPES: Array<[string, string]> = [["&#x27;", "'"], ["&quot;", DQ], ["&lt;", "<"], ["&gt;", ">"], ["&amp;", "&"]];
const unescapeHtml = (s: string): string => UNESCAPES.reduce((t, [from, to]) => t.split(from).join(to), s);
/** The markup with every tag taken out, entities decoded. */
const textOfHtml = (html: string): string => unescapeHtml(html.split("<").map((p, i) => (i === 0 ? p : p.slice(p.indexOf(">") + 1))).join(""));
const rowTag = (name: string): string => `data-results-row=${DQ}${name}${DQ}`;
/** What follows `marker` after the row's own start: the text up to the next tag — the row's own, as nested rows come after it. */
function textAfter(html: string, name: string, marker: string): string | null {
  const at = html.indexOf(rowTag(name));
  if (at < 0) return null;
  const m = html.indexOf(marker, at);
  if (m < 0) return null;
  const from = html.indexOf(">", m) + 1;
  return unescapeHtml(html.slice(from, html.indexOf("<", from)));
}
const valueOf = (html: string, name: string): string | null => textAfter(html, name, "data-results-value");
const helpOf = (html: string, name: string): string | null => textAfter(html, name, "data-results-help");
const hasRow = (html: string, name: string): boolean => html.includes(rowTag(name));
/** The row's opening tag, for its attributes. */
function openingOf(html: string, name: string): string {
  const at = html.indexOf(rowTag(name));
  if (at < 0) return "";
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
}
const honestyIn = (html: string): { noReceiptYet: boolean; notSetUp: boolean } => ({
  noReceiptYet: html.includes(`data-results-honesty=${DQ}no_receipt_yet${DQ}`), notSetUp: html.includes(`data-results-honesty=${DQ}not_set_up${DQ}`),
});
/** The reasons list's (label, count) pairs in the order drawn — read off the kit's rows' hover titles, "Label: N". */
function reasonsIn(html: string): Array<{ label: string; count: number }> {
  const at = html.indexOf("data-results-reasons");
  if (at < 0) return [];
  const end = html.indexOf("data-results-row=", at);
  const part = end < 0 ? html.slice(at) : html.slice(at, end);
  const out: Array<{ label: string; count: number }> = [];
  const key = `title=${DQ}`;
  for (let i = part.indexOf(key); i >= 0; i = part.indexOf(key, i + 1)) {
    const text = unescapeHtml(part.slice(i + key.length, part.indexOf(DQ, i + key.length)));
    const cut = text.lastIndexOf(": ");
    if (cut > 0) out.push({ label: text.slice(0, cut), count: Number(text.slice(cut + 2).split(",").join("")) });
  }
  return out;
}

const RUNNING = ["CONFIRMED", "PREPARING", "RUNNING"];
const DONE = [...RUNNING, "DONE"];
const PAUSED = [...RUNNING, "PAUSED"];
const STOPPED = [...RUNNING, "CANCELLED"];
const MIN = 60_000;

/** Run `fn` with the named environment variables set (undefined: removed), and put every one of them back. */
async function withEnv<T>(env: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> {
  const was: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) {
    was[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(env)) {
      if (was[k] === undefined) delete process.env[k];
      else process.env[k] = was[k];
    }
  }
}
/** The route as the vendor's callback reaches it locally: no secret, not production, the stub rail — open, as a drive has it. */
const OPEN_ROUTE = { BLACKBALL_WEBHOOK_SECRET: undefined, BLACKBALL_WEBHOOK_SECRET_PREVIOUS: undefined, SMS_PROVIDER: "console", NODE_ENV: "test" };
const ROUTE_URL = "https://www.50pick.tz/api/webhooks/blackball";

let SEQ = 0;
/** The results' deps for a claim: production's, the stop walk un-remembered and wired to the implementation under test, the rail
 *  able to take a receipt and the price TZS 6 — then the claim's own word. */
function deps(impl: ResultsImpl, over: Partial<ResultsDeps> = {}): ResultsDeps {
  return {
    ...RES.RESULTS_DEPS,
    stoppedByLink: (id: string) => impl.walk(id, impl.walkDeps),
    receiptsSetUp: () => true,
    priceTzs: async () => 6,
    ...over,
  };
}

/* ══ THE CLAIMS ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

export async function resultsClaims(impl: ResultsImpl, h: ResultsHarness): Promise<void> {
  const L = LABELS;
  const T = h.at;
  const iso = (ms: number): string => new Date(ms).toISOString();
  const { READER, GROWTH, WATCHER } = h;
  const viewerOf = (v: LiveViewer) => ({ mayAct: v.mayAct });
  const mem = () => h.mem().smsCampaignRecipients;
  const numberOf = (rowId: string): string => {
    const r = mem().get(rowId);
    if (r === undefined) throw new Error("fixture: a recipient row is not in the store");
    return r.msisdn;
  };
  const results = async (id: string, viewer: LiveViewer = READER, over: Partial<ResultsDeps> = {}, more: Partial<LiveViewDeps> = {}) => {
    const v = await h.view(id, viewer, { results: deps(impl, over), ...more });
    return v;
  };
  const card = (v: CampaignLiveView, viewer: LiveViewer = READER): string => {
    const html = impl.render(v, viewerOf(viewer));
    h.see(html);
    return html;
  };
  /** The SmsMessage a send writes for a recipient row — ACCEPTED, as the gateway answered. Answers its reference. */
  const accepted = async (rowId: string): Promise<string> => {
    const row = mem().get(rowId);
    if (row === undefined) throw new Error("fixture: a recipient row is not in the store");
    const reference = row.smsReference ?? `ref_u48a_${h.run}_${++SEQ}`;
    row.smsReference = reference;
    await db.smsMessage.create({
      reference, msisdn: row.msisdn, purpose: "MARKETING", provider: "console", senderId: "50PICK", bodyLen: 40, status: "ACCEPTED",
      providerMsg: null, dlrStatus: null, dlrDesc: null, balanceTzs: null, attempts: 1, targetType: DISPATCH_TARGET_TYPE, targetId: rowId,
      createdAt: row.sentAt ?? iso(T - 20 * MIN), sentAt: row.sentAt ?? iso(T - 20 * MIN), deliveredAt: null, failedAt: null,
    });
    return reference;
  };
  /** Receipts POSTed at the REAL route, in ONE callback (a batch, as the vendor sends them): [row, the vendor's token]. */
  const receive = async (lines: ReadonlyArray<[string, string]>): Promise<number> => {
    const statuses = [];
    for (const [rowId, token] of lines) {
      const row = mem().get(rowId);
      if (row === undefined || row.smsReference === null) throw new Error("fixture: a receipt for a row with no reference");
      statuses.push({ reference: row.smsReference, status: token, description: token === "DELIVRD" ? "Success" : "Undelivered", msisdn: row.msisdn });
    }
    const res = await withEnv(OPEN_ROUTE, () => ROUTE.POST(new Request(ROUTE_URL, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ statuses }),
    })));
    return res.status;
  };

  /* ── R1 · ⭐ `accepted` is never delivered ── */
  await h.claim(L.r1, async () => {
    const c = await h.campaign("rr1", { path: RUNNING, count: 14 });
    const ids = await h.rows(c.id, [
      ...Array.from({ length: 5 }, (_, i): Shape => ({ status: "SENT", sentAt: iso(T - 2 * MIN), smsReference: `ref_u48a_${h.run}_r1_${i}` })),
      ...h.many(2, { status: "UNCONFIRMED" }), { status: "FAILED", failureClass: "REJECTED" }, ...h.many(4, { status: "PENDING" }),
      ...h.many(2, { status: "SKIPPED", skipReason: "suppressed" }),
    ]);
    const sentIds = ids.slice(0, 5);
    for (const id of sentIds) await accepted(id);
    // the gateway ACCEPTED all five — and nothing else has happened
    const before = await results(c.id);
    const html0 = card(before);
    const a = before.results;
    const none = a !== null && a.delivered === 0 && a.handedOver === 5 && valueOf(html0, "delivered") === "0" && valueOf(html0, "handedOver") === "5"
      && before.kpis.handedOver === 5;
    // receipts through the real route: two DELIVRD and one UNDELIV, in one POST
    const status = await receive([[sentIds[0], "DELIVRD"], [sentIds[1], "DELIVRD"], [sentIds[2], "UNDELIV"]]);
    const after = await results(c.id);
    const html1 = card(after);
    const b = after.results;
    const moved = status === 200 && b !== null && b.delivered === 2 && b.handedOver === 2 && b.failed.total === 2 && b.failed.receipt === 1 && b.failed.wire === 1
      && valueOf(html1, "delivered") === "2" && valueOf(html1, "handedOver") === "2" && valueOf(html1, "failed") === "2";
    // the figures card's Handed over is Delivered + the rest, however it is split (the network took 4 of the 5; one failed by receipt)
    const sums = b !== null && after.kpis.handedOver === b.delivered + b.handedOver && after.kpis.failed === b.failed.total
      && after.kpis.handedOver === 4 && after.kpis.noAnswer === 2;
    // a gateway message that is ACCEPTED and carries no receipt moves nothing, whatever status it holds
    const msg = await db.smsMessage.findByReference(mem().get(sentIds[3])?.smsReference ?? "");
    const quiet = msg?.status === "ACCEPTED" && mem().get(sentIds[3])?.status === "SENT" && mem().get(sentIds[4])?.status === "SENT";
    return [none && moved && sums && quiet,
      `before: delivered ${a?.delivered} handed over ${a?.handedOver} (card ${valueOf(html0, "delivered")}/${valueOf(html0, "handedOver")}) · after receipts: delivered ${b?.delivered} handed over ${b?.handedOver} failed ${json(b?.failed)} (HTTP ${status}) · KPI handed over ${after.kpis.handedOver} · an accepted message with no receipt stays SENT ${quiet}`];
  });

  /* ── R2 · the honesty line, from the data ── */
  await h.claim(L.r2, async () => {
    const c = await h.campaign("rr2", { path: RUNNING, count: 10 });
    const ids = await h.rows(c.id, [
      ...Array.from({ length: 6 }, (_, i): Shape => ({ status: "SENT", sentAt: iso(T - 3 * MIN), smsReference: `ref_u48a_${h.run}_r2_${i}` })), ...h.many(4, { status: "PENDING" }),
    ]);
    for (const id of ids.slice(0, 6)) await accepted(id);
    const none = await results(c.id);
    const noneHtml = card(none);
    const said = none.results?.honesty.noReceiptYet === true && none.results.honesty.notSetUp === false;
    const saidCard = json(honestyIn(noneHtml)) === json({ noReceiptYet: true, notSetUp: false })
      && textOf(noneHtml).includes(COPY.RESULTS_HONESTY.noReceiptYet)
      && COPY.RESULTS_HONESTY.noReceiptYet === "No delivery receipt has arrived for this campaign yet — 'handed over' is not 'delivered'.";
    // the same list on a server that cannot take a receipt: both lines
    const off = await results(c.id, READER, { receiptsSetUp: () => false });
    const offHtml = card(off);
    const bothSaid = off.results?.honesty.noReceiptYet === true && off.results.honesty.notSetUp === true
      && json(honestyIn(offHtml)) === json({ noReceiptYet: true, notSetUp: true }) && textOf(offHtml).includes(COPY.RESULTS_HONESTY.notSetUp);
    // ONE receipt (a DELIVRD, through the route) — the line is gone by itself, and so is the not-set-up one
    await receive([[ids[0], "DELIVRD"]]);
    const after = await results(c.id);
    const afterOff = await results(c.id, READER, { receiptsSetUp: () => false });
    const gone = after.results?.honesty.noReceiptYet === false && json(honestyIn(card(after))) === json({ noReceiptYet: false, notSetUp: false })
      && afterOff.results?.honesty.noReceiptYet === false && afterOff.results.honesty.notSetUp === false && json(honestyIn(card(afterOff))) === json({ noReceiptYet: false, notSetUp: false });
    // a FAILURE receipt is a receipt too: the line is gone for a campaign whose only receipt is an UNDELIV
    const f = await h.campaign("rr2f", { path: RUNNING, count: 10 });
    const fids = await h.rows(f.id, [
      ...Array.from({ length: 4 }, (_, i): Shape => ({ status: "SENT", sentAt: iso(T - 3 * MIN), smsReference: `ref_u48a_${h.run}_r2f_${i}` })), ...h.many(6, { status: "PENDING" }),
    ]);
    for (const id of fids.slice(0, 4)) await accepted(id);
    const fBefore = await results(f.id);
    await receive([[fids[0], "UNDELIV"]]);
    const fAfter = await results(f.id);
    const failureCounts = fBefore.results?.honesty.noReceiptYet === true && fAfter.results?.honesty.noReceiptYet === false && fAfter.results.failed.receipt === 1;
    // nothing handed over: nothing to caution about — even on a server that could not take a receipt
    const n = await h.campaign("rr2n", { path: RUNNING, count: 12 });
    await h.rows(n.id, [...h.many(4, { status: "PENDING" }), ...h.many(4, { status: "SKIPPED", skipReason: "suppressed" }), ...h.many(4, { status: "FAILED", failureClass: "REJECTED" })]);
    const nothing = await results(n.id, READER, { receiptsSetUp: () => false });
    const quiet = nothing.results?.honesty.noReceiptYet === false && nothing.results.honesty.notSetUp === false && json(honestyIn(card(nothing))) === json({ noReceiptYet: false, notSetUp: false });
    // an unanswered message is handed to the wire too: the line stands for a campaign with only those
    const u = await h.campaign("rr2u", { path: RUNNING, count: 12 });
    await h.rows(u.id, [...h.many(3, { status: "UNCONFIRMED" }), ...h.many(9, { status: "PENDING" })]);
    const unanswered = await results(u.id);
    const stands = unanswered.results?.honesty.noReceiptYet === true;
    return [said && saidCard && bothSaid && gone && failureCounts && quiet && stands,
      `said ${said}/${saidCard} · on a server with no receipts ${bothSaid} · gone after one DELIVRD ${gone} · gone after an UNDELIV alone ${failureCounts} · nothing handed over: none ${quiet} · only unanswered: stands ${stands}`];
  });

  /* ── R3 · the 15-minute figure ── */
  await h.claim(L.r3, async () => {
    const c = await h.campaign("rr3", { path: RUNNING, count: 14 });
    await h.rows(c.id, [
      { status: "SENT", sentAt: iso(T - 16 * MIN) }, { status: "SENT", sentAt: iso(T - 16 * MIN) },
      { status: "SENT", sentAt: iso(T - 15 * MIN - 1) },
      { status: "SENT", sentAt: iso(T - 15 * MIN) },
      { status: "SENT", sentAt: iso(T - 14 * MIN) },
      { status: "SENT", sentAt: iso(T - 120 * MIN) },
      { status: "SENT" },
      { status: "DELIVERED", sentAt: iso(T - 180 * MIN) },
      { status: "UNCONFIRMED" },
      { status: "FAILED", failureClass: "receipt:UNDELIV", sentAt: iso(T - 40 * MIN) },
      { status: "PENDING" }, { status: "SKIPPED", skipReason: "suppressed" },
    ]);
    // another campaign's old SENT rows are none of this one's — and have their own figure
    const other = await h.campaign("rr3o", { path: RUNNING, count: 12 });
    await h.rows(other.id, [...h.many(3, { status: "SENT", sentAt: iso(T - 60 * MIN) }), ...h.many(9, { status: "PENDING" })]);
    const asked: string[] = [];
    const v = await results(c.id, READER, { sentBefore: async (id, before) => { asked.push(before); return RES.RESULTS_DEPS.sentBefore(id, before); } });
    const ov = await results(other.id);
    const html = card(v);
    const counted = v.results?.noReceiptAfter15 === 4 && valueOf(html, "noReceipt") === "4" && json(asked) === json([iso(T - 15 * MIN)]) && v.results.handedOver === 7
      && ov.results?.noReceiptAfter15 === 3;
    // nothing SENT: nothing asked
    const d = await h.campaign("rr3d", { path: DONE, count: 12 });
    await h.rows(d.id, [...h.many(11, { status: "DELIVERED", sentAt: iso(T - 90 * MIN) }), { status: "SKIPPED", skipReason: "suppressed" }]);
    let askedDone = 0;
    const dv = await results(d.id, READER, { sentBefore: async () => { askedDone++; return 99; } });
    const noRead = askedDone === 0 && dv.results?.noReceiptAfter15 === 0 && !hasRow(card(dv), "noReceipt");
    // a count that fails is unread: a dash and its sentence, not a zero — and the view still comes
    const bad = await results(c.id, READER, { sentBefore: async () => { throw new Error("the count is down (fixture)"); } });
    const badHtml = card(bad);
    const unread = bad.results !== null && bad.results.noReceiptAfter15 === null && valueOf(badHtml, "noReceipt") === "—"
      && helpOf(badHtml, "noReceipt") === COPY.RESULTS_UNREAD && openingOf(badHtml, "noReceipt").includes("data-results-unread") && bad.results.handedOver === 7;
    return [counted && noRead && unread,
      `4 of 7 SENT are older (view ${v.results?.noReceiptAfter15}, card ${valueOf(html, "noReceipt")}) · the cutoff asked ${json(asked.map((a) => Date.parse(a) - T))} ms · nothing SENT: asked ${askedDone}× · a failed count: ${json(bad.results?.noReceiptAfter15)} / "${valueOf(badHtml, "noReceipt")}"`];
  });

  /* ── R4 · ⭐ stopped by their link, attributed ── */
  await h.claim(L.r4, async () => {
    const A = await h.campaign("rr4a", { path: RUNNING, count: 12 });
    const B = await h.campaign("rr4b", { path: RUNNING, count: 12 });
    const tA = T - 60 * MIN;
    // eleven people on A: every number is the first of the shapes below, the same number on B where B messaged it
    const people = ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9", "n10", "n11"] as const;
    const numbers = Object.fromEntries(people.map((p, i) => [p, h.key("77", h.run * 100 + i + 11)])) as Record<(typeof people)[number], string>;
    const sent = (p: (typeof people)[number], at = tA): Shape => ({ status: "SENT", sentAt: iso(at), msisdn: numbers[p] });
    await h.rows(A.id, [
      sent("n1"), sent("n2"), sent("n3"), sent("n4"), sent("n5"), sent("n6"),
      { status: "SKIPPED", skipReason: "suppressed", msisdn: numbers.n7 },
      { status: "FAILED", failureClass: "receipt:UNDELIV", sentAt: iso(tA), msisdn: numbers.n8 },
      { status: "DELIVERED", sentAt: iso(tA), msisdn: numbers.n9 },
      sent("n10"), sent("n11"),
    ]);
    await h.rows(B.id, [
      { status: "SENT", sentAt: iso(T - 40 * MIN), msisdn: numbers.n3 },
      { status: "SENT", sentAt: iso(T - 10 * MIN), msisdn: numbers.n4 },
      { status: "FAILED", failureClass: "receipt:UNDELIV", sentAt: iso(T - 40 * MIN), msisdn: numbers.n10 },
    ]);
    let stopSeq = 0;
    const stop = async (n: string, at: number, o: { reason?: string; evidence?: string | null; lifted?: boolean } = {}): Promise<void> => {
      await db.suppression.create({
        id: `sup_u48a_${h.run}_${++stopSeq}`, channel: "SMS", identifier: n, category: "MARKETING", reason: (o.reason ?? "WITHDRAWN") as never,
        evidence: o.evidence === undefined ? `optout:ref${stopSeq}` : o.evidence, recordedBy: null, createdAt: iso(at),
        liftedAt: o.lifted === true ? iso(at + MIN) : null, liftedReason: o.lifted === true ? "optout:back" : null,
      });
    };
    await stop(numbers.n1, T - 30 * MIN);                                   // after A's message: A's
    await stop(numbers.n2, T - 90 * MIN);                                   // BEFORE A's message: nobody's here
    await stop(numbers.n3, T - 20 * MIN);                                   // after B's newer message: B's
    await stop(numbers.n4, T - 30 * MIN);                                   // between A's and B's message: A's
    await stop(numbers.n5, T - 30 * MIN, { reason: "OPERATOR" });          // an operator's refusal, link-looking evidence
    await stop(numbers.n6, T - 30 * MIN, { evidence: "run:officer-bulk" }); // an officer's withdrawal
    await stop(numbers.n7, T - 30 * MIN);                                   // skipped: never handed a message
    await stop(numbers.n8, T - 30 * MIN);                                   // failed by receipt: never reached
    await stop(numbers.n9, T - 5 * MIN);                                    // delivered, then stopped: A's
    await stop(numbers.n10, T - 20 * MIN);                                  // B's message FAILED: explains nothing — A's
    await stop(numbers.n11, T - 30 * MIN, { lifted: true });               // lifted: not active
    const a = await results(A.id);
    const b = await results(B.id);
    const aHtml = card(a);
    const counts = a.results?.stoppedByLink === 4 && b.results?.stoppedByLink === 1 && valueOf(aHtml, "stoppedByLink") === "4";
    // the SAME stop is never counted by two campaigns (n3 → B only, n4 → A only)
    const once = (a.results?.stoppedByLink ?? 0) + (b.results?.stoppedByLink ?? 0) === 5;
    // ⭐ the stop the REAL opt-out service writes is the spelling the walk reads: a fresh number handed over 5 minutes ago
    const C = await h.campaign("rr4c", { path: RUNNING, count: 12 });
    const key = h.key("78", h.run * 100 + 77);
    await h.rows(C.id, [{ status: "SENT", sentAt: iso(T - 5 * MIN), msisdn: key }, ...h.many(11, { status: "PENDING" })]);
    const before = await results(C.id);
    const token = await OPTOUT.ensureOptOutToken(key);
    const made = token === null ? null : await OPTOUT.stopMarketing(token, "SW");
    const written = await db.suppression.find({ channel: "SMS", identifier: key, category: "MARKETING" });
    const spelled = written !== null && written.reason === RES.LINK_STOP_REASON && (written.evidence ?? "").startsWith(RES.LINK_STOP_EVIDENCE_PREFIX);
    const after = await results(C.id);
    const real = made !== null && made.ok && spelled && before.results?.stoppedByLink === 0 && after.results?.stoppedByLink === 1;
    return [counts && once && real,
      `A ${a.results?.stoppedByLink} (want 4: n1, n4, n9, n10) · B ${b.results?.stoppedByLink} (want 1: n3) · card "${valueOf(aHtml, "stoppedByLink")}" · the real service wrote reason ${written?.reason} evidence "${(written?.evidence ?? "").slice(0, 7)}…" → ${before.results?.stoppedByLink} → ${after.results?.stoppedByLink}`];
  });

  /* ── R5 · the reasons ── */
  await h.claim(L.r5, async () => {
    const c = await h.campaign("rr5", { path: RUNNING, count: 20 });
    const skip = (r: string, n = 1): Shape[] => h.many(n, { status: "SKIPPED", skipReason: r });
    await h.rows(c.id, [
      ...skip("suppressed", 3), ...skip("no_consent"), ...skip("no_basis", 2), ...skip("consent_withdrawn"),
      ...skip("rg_self_excluded"), ...skip("rg_cooling_off"), ...skip("rg_harm_marker"), ...skip("rg_under25_history"),
      ...skip("age_minor"), ...skip("account_status"), ...skip("bad_msisdn"), ...skip("mystery_reason"), ...h.many(3, { status: "SENT", sentAt: iso(T - MIN) }),
    ]);
    const want = [
      { label: AUDIENCE_REASON_LABEL.protected, count: 6 }, { label: AUDIENCE_REASON_LABEL.suppressed, count: 3 },
      { label: AUDIENCE_REASON_LABEL.no_consent, count: 3 }, { label: AUDIENCE_REASON_LABEL.withdrawn, count: 1 },
      { label: COPY.NOT_SENT_EXTRA.unsendable, count: 1 }, { label: COPY.NOT_SENT_EXTRA.other, count: 1 },
      { label: AUDIENCE_REASON_LABEL.age_unknown, count: 0 },
    ];
    const wrong: string[] = [];
    const RAW = new RegExp("rg_|age_minor|account_status|self_excluded|cooling|harm_marker|under25|mystery_reason|no_basis|bad_msisdn");
    for (const [who, viewer] of [["reader", READER], ["growth", GROWTH], ["watcher", WATCHER]] as Array<[string, LiveViewer]>) {
      const v = await results(c.id, viewer);
      const r = v.results;
      const html = card(v, viewer);
      if (r === null) { wrong.push(`${who}: no results`); continue; }
      if (json(r.notSent.reasons) !== json(want)) wrong.push(`${who}: the reasons are ${json(r.notSent.reasons)}`);
      if (json(r.notSent.reasons) !== json(v.notSentReasons)) wrong.push(`${who}: not the figures card's own list`);
      const total = r.notSent.reasons.reduce((n, x) => n + x.count, 0);
      if (total !== r.notSent.total || total !== 15 || r.notSent.total !== v.kpis.notSent) wrong.push(`${who}: the reasons add to ${total}, Not sent is ${r.notSent.total}`);
      if (json(reasonsIn(html)) !== json(want)) wrong.push(`${who}: the card draws ${json(reasonsIn(html))}`);
      if (reasonsIn(html).filter((x) => x.label === AUDIENCE_REASON_LABEL.protected).length !== 1) wrong.push(`${who}: protected is not ONE line`);
      if (RAW.test(json(r)) || RAW.test(textOf(html))) wrong.push(`${who}: a gate reason's key is in the results`);
    }
    // without an unsendable or an unworded refusal, the five alone
    const plain = await h.campaign("rr5p", { path: RUNNING, count: 12 });
    await h.rows(plain.id, [...skip("suppressed", 2), ...h.many(10, { status: "SENT", sentAt: iso(T - MIN) })]);
    const p = await results(plain.id);
    const five = (p.results?.notSent.reasons ?? []).length === 5 && p.results?.notSent.reasons[0]?.label === AUDIENCE_REASON_LABEL.suppressed;
    return [wrong.length === 0 && five, `wrong [${wrong.join("; ")}] · plain: ${json(p.results?.notSent.reasons.map((x) => x.count))}`];
  });

  /* ── R6 · ⛔ the floor ── */
  await h.claim(L.r6, async () => {
    const nine = await h.campaign("rr6a", { path: RUNNING, count: 9 });
    await h.rows(nine.id, [...h.many(5, { status: "SENT", sentAt: iso(T - 20 * MIN), smsReference: `ref_u48a_${h.run}_r6a` }), ...h.many(4, { status: "SKIPPED", skipReason: "rg_self_excluded" })]);
    const ten = await h.campaign("rr6b", { path: RUNNING, count: 10 });
    await h.rows(ten.id, [...h.many(6, { status: "SENT", sentAt: iso(T - 20 * MIN) }), ...h.many(4, { status: "SKIPPED", skipReason: "rg_self_excluded" })]);
    const shrunk = await h.campaign("rr6c", { path: RUNNING, count: 50 });
    await h.rows(shrunk.id, [...h.many(5, { status: "SENT", sentAt: iso(T - 20 * MIN) }), ...h.many(4, { status: "SKIPPED", skipReason: "suppressed" })]);
    const empty = await h.campaign("rr6d", { path: ["CONFIRMED"], count: 1604 });
    const MONEY_ONLY: LiveViewer = { userId: "usr_u48a_money_only", mayAct: true, reads: false, money: true };
    const m9 = await results(nine.id, GROWTH);
    const m10 = await results(ten.id, GROWTH);
    const r9 = await results(nine.id, READER);
    const ms = await results(shrunk.id, GROWTH);
    const me = await results(empty.id, GROWTH);
    const re = await results(empty.id, READER);
    let priceAsked = 0;
    const money9 = await results(nine.id, MONEY_ONLY, { priceTzs: async () => { priceAsked++; return 6; } });
    const money10 = await results(ten.id, MONEY_ONLY);
    const hidden = m9.results === null && ms.results === null && money9.results === null;
    const shown = m10.results !== null && r9.results !== null && money10.results !== null;
    const none = me.results === null && re.results === null;
    // the page says the floor's sentence and nothing that names a split: no results block, no honesty, no price, no "delivered"
    const page = renderWhole(m9, viewerOf(GROWTH));
    h.see(page);
    const text = textOf(page);
    const alone = text.includes(COPY.LIVE_FLOOR) && !page.includes("data-block=" + DQ + "live-results" + DQ) && !page.includes("data-results") && !/deliver/i.test(text)
      && !text.includes("Estimated spend") && !text.includes("No delivery receipt");
    const noJson = !json(m9).includes("honesty") && !json(m9).includes("stoppedByLink") && !json(m9).includes("noReceiptAfter15");
    return [hidden && shown && none && alone && noJson && priceAsked === 0,
      `masked 9: ${m9.results === null ? "no results" : "RESULTS"} · confirmed 50 with 9 rows: ${ms.results === null ? "none" : "RESULTS"} · money without numbers at 9: ${money9.results === null ? "none" : "RESULTS"} (price asked ${priceAsked}×) · at 10: masked ${m10.results === null ? "none" : "shown"}, money-only ${money10.results === null ? "none" : "shown"} · a reader at 9: ${r9.results === null ? "none" : "shown"} · no list yet: ${me.results === null && re.results === null ? "none for anyone" : "RESULTS"} · the page alone ${alone}`];
  });

  /* ── R7 · whether receipts are set up ── */
  await h.claim(L.r7, async () => {
    const S16 = "s".repeat(16);
    const S15 = "s".repeat(15);
    const P16 = "p".repeat(16);
    const matrix: Array<{ name: string; secret: string; previous: string; production: boolean; provider: "console" | "blackball" }> = [
      { name: "no secret, a stub, not production", secret: "", previous: "", production: false, provider: "console" },
      { name: "no secret, production", secret: "", previous: "", production: true, provider: "console" },
      { name: "no secret, the live rail, not production", secret: "", previous: "", production: false, provider: "blackball" },
      { name: "no secret, production, the live rail", secret: "", previous: "", production: true, provider: "blackball" },
      { name: "no secret but a previous one, production", secret: "", previous: P16, production: true, provider: "blackball" },
      { name: "no secret but a previous one, a stub", secret: "", previous: P16, production: false, provider: "console" },
      { name: "a secret at the floor", secret: S16, previous: "", production: true, provider: "blackball" },
      { name: "a secret one short of the floor", secret: S15, previous: "", production: true, provider: "blackball" },
      { name: "a secret one short of the floor, out of production", secret: S15, previous: "", production: false, provider: "console" },
      { name: "a short secret and a previous at the floor", secret: S15, previous: P16, production: true, provider: "blackball" },
      { name: "a secret at the floor and a short previous", secret: S16, previous: "p".repeat(3), production: true, provider: "blackball" },
    ];
    const wrong: string[] = [];
    for (const m of matrix) {
      const env = { BLACKBALL_WEBHOOK_SECRET: m.secret === "" ? undefined : m.secret, BLACKBALL_WEBHOOK_SECRET_PREVIOUS: m.previous === "" ? undefined : m.previous,
        NODE_ENV: m.production ? "production" : "test", SMS_PROVIDER: m.provider };
      const routeSays = await withEnv(env, () => {
        // can ANY caller carrying one of the secrets (or none) be let in? — the route's own `authorized`, on the very environment
        const tries = [undefined, m.secret, m.previous].filter((t, i, all) => (t === undefined || t !== "") && all.indexOf(t) === i);
        return tries.some((t) => ROUTE.authorized(new Request(t === undefined ? ROUTE_URL : `${ROUTE_URL}?token=${encodeURIComponent(t)}`, { method: "POST" })));
      });
      const ours = impl.setUp({ secret: m.secret, previous: m.previous, production: m.production, provider: m.provider });
      const read = await withEnv(env, () => RES.receiptRouteNow());
      if (routeSays !== ours) wrong.push(`${m.name}: the route ${routeSays}, receiptsSetUp ${ours}`);
      if (read.secret !== m.secret || read.previous !== m.previous || read.production !== m.production || read.provider !== m.provider) wrong.push(`${m.name}: the environment is read as ${json({ ...read, secret: read.secret.length, previous: read.previous.length })}`);
    }
    // production's own dep is that rule over the process's environment: no secret in production → no; a secret at the floor → yes
    const prodNo = await withEnv({ BLACKBALL_WEBHOOK_SECRET: undefined, BLACKBALL_WEBHOOK_SECRET_PREVIOUS: undefined, NODE_ENV: "production", SMS_PROVIDER: "blackball" }, () => impl.production.receiptsSetUp());
    const prodYes = await withEnv({ BLACKBALL_WEBHOOK_SECRET: S16, BLACKBALL_WEBHOOK_SECRET_PREVIOUS: undefined, NODE_ENV: "production", SMS_PROVIDER: "blackball" }, () => impl.production.receiptsSetUp());
    if (prodNo !== false || prodYes !== true) wrong.push(`the production dep says ${prodNo} without a secret and ${prodYes} with one`);
    return [wrong.length === 0, wrong.length === 0 ? `${matrix.length} environments: receiptsSetUp is exactly what the route's authorized lets in; the environment is read as the route reads it; production's dep is that rule` : wrong.join(" | ")];
  });

  /* ── R8 · ⛔ the price line ── */
  await h.claim(L.r8, async () => {
    const c = await h.campaign("rr8", { path: RUNNING, count: 20 });
    await h.rows(c.id, [
      ...Array.from({ length: 8 }, (_, i): Shape => ({ status: "SENT", sentAt: iso(T - MIN), smsReference: `ref_u48a_${h.run}_r8_${i}` })),
      ...h.many(4, { status: "DELIVERED", sentAt: iso(T - 5 * MIN) }), ...h.many(2, { status: "SKIPPED", skipReason: "suppressed" }), ...h.many(6, { status: "PENDING" }),
    ]);
    const spec = "Estimated spend: TZS 72 (handed over × TZS 6 per SMS, configured, not yet measured) — the SMS credit on Admin → System is the true figure.";
    const money = await results(c.id, READER);
    const mHtml = card(money, READER);
    const line = money.results?.spend ?? null;
    const exact = line !== null && line.tzs === 72 && line.handedOver === 12 && line.perSmsTzs === 6 && money.kpis.handedOver === 12
      && textOf(mHtml).includes(spec) && COPY.resultsSpendLine({ tzs: 8412, perSmsTzs: 6 }) === "Estimated spend: TZS 8,412 (handed over × TZS 6 per SMS, configured, not yet measured) — the SMS credit on Admin → System is the true figure.";
    const pence = await results(c.id, READER, { priceTzs: async () => 6.5 });
    const penceHtml = card(pence, READER);
    const half = pence.results?.spend?.tzs === 78 && textOf(penceHtml).includes("handed over × TZS 6.50 per SMS");
    // the others: no price, no TZS in the view or the card, and the price is not asked
    let asked = 0;
    const counting = { priceTzs: async () => { asked++; return 6; } };
    const quiet: string[] = [];
    for (const [who, viewer] of [["growth", GROWTH], ["watcher", WATCHER]] as Array<[string, LiveViewer]>) {
      const v = await results(c.id, viewer, counting);
      const html = card(v, viewer);
      if (v.results === null || v.results.spend !== null) quiet.push(`${who}: spend ${json(v.results?.spend)}`);
      if (json(v).includes("TZS") || html.includes("TZS") || textOf(html).includes("Estimated spend")) quiet.push(`${who}: a money word`);
    }
    if (asked !== 0) quiet.push(`the price was asked ${asked}×`);
    // nothing handed over, or a price that cannot be read: no line, and the view still comes
    const idle = await h.campaign("rr8i", { path: RUNNING, count: 12 });
    await h.rows(idle.id, [...h.many(6, { status: "PENDING" }), ...h.many(6, { status: "SKIPPED", skipReason: "suppressed" })]);
    let idleAsked = 0;
    const iv = await results(idle.id, READER, { priceTzs: async () => { idleAsked++; return 6; } });
    const unreadable = await results(c.id, READER, { priceTzs: async () => null });
    const thrown = await results(c.id, READER, { priceTzs: async () => { throw new Error("the settings are down (fixture)"); } });
    const bare = iv.results?.spend === null && idleAsked === 0 && unreadable.results?.spend === null && thrown.results !== null && thrown.results.spend === null;
    // production's price is the owner's settings (TZS 6 until saved — E14), read fresh, never a number of this module's own
    const configured = (await impl.production.priceTzs()) === 6;
    return [exact && half && quiet.length === 0 && bare && configured,
      `reader: ${json(line)} card has the spec's sentence ${textOf(mHtml).includes(spec)} · TZS 6.50 → ${pence.results?.spend?.tzs} · others: [${quiet.join("; ")}] · production's price is the settings' ${configured} · nothing handed over: price asked ${idleAsked}× spend ${json(iv.results?.spend)} · unreadable ${json(unreadable.results?.spend)} · thrown ${json(thrown.results?.spend)}`];
  });

  /* ── R9 · the failed split, no answer and what is left ── */
  await h.claim(L.r9, async () => {
    const c = await h.campaign("rr9", { path: PAUSED, count: 30, name: "R9" });
    await h.rows(c.id, [
      ...h.many(2, { status: "FAILED", failureClass: "REJECTED" }), { status: "FAILED", failureClass: "BAD_MSISDN" }, { status: "FAILED", failureClass: "UNKNOWN" },
      { status: "FAILED" },
      ...h.many(2, { status: "FAILED", failureClass: "receipt:UNDELIV" }), { status: "FAILED", failureClass: "receipt:EXPIRED" },
      ...h.many(2, { status: "UNCONFIRMED" }), ...h.many(3, { status: "PENDING" }), ...h.many(2, { status: "HELD", failureClass: "gate_unanswered" }),
      ...h.many(3, { status: "SENT", sentAt: iso(T - MIN) }), ...h.many(4, { status: "DELIVERED", sentAt: iso(T - 5 * MIN) }), ...h.many(3, { status: "SKIPPED", skipReason: "suppressed" }),
    ]);
    let asked = 0;
    const base = h.view;
    const v = await base(c.id, READER, {
      results: deps(impl),
      recipients: {
        countByOutcome: async (id: string) => { asked++; return db.smsCampaignRecipient.countByOutcome(id); },
        lastActivity: async (id: string) => db.smsCampaignRecipient.lastActivity(id),
      },
    });
    const html = card(v);
    const r = v.results;
    const split = r !== null && json(r.failed) === json({ total: 8, wire: 5, receipt: 3 }) && r.noAnswer === 2 && r.left.count === 5 && !r.left.stopped
      && valueOf(html, "failed") === "8" && valueOf(html, "noAnswer") === "2" && valueOf(html, "waiting") === "5" && !hasRow(html, "stopped");
    const agree = r !== null && v.kpis.handedOver === r.delivered + r.handedOver && v.kpis.failed === r.failed.total && v.kpis.notSent === r.notSent.total
      && v.kpis.noAnswer === r.noAnswer && v.kpis.waiting === r.left.count && asked === 1;
    // a STOPPED campaign says everybody it did not message — the headline's figure
    const s = await h.campaign("rr9s", { path: STOPPED, count: 20 });
    await h.rows(s.id, [...h.many(4, { status: "SENT", sentAt: iso(T - MIN) }), ...h.many(6, { status: "PENDING" }), { status: "HELD", failureClass: "gate_unanswered" }]);
    const sv = await results(s.id);
    const sHtml = card(sv);
    const stopped = sv.results?.left.stopped === true && sv.results.left.count === 7 && sv.headline.endsWith("— 7 people were not messaged.")
      && valueOf(sHtml, "stopped") === "7" && !hasRow(sHtml, "waiting");
    // …and one stopped before its list was finished: the confirmed count less what was settled, the headline's again
    const e = await h.campaign("rr9e", { path: ["CONFIRMED", "PREPARING", "CANCELLED"], count: 12 });
    await h.rows(e.id, h.many(5, { status: "PENDING" }));
    const ev = await results(e.id);
    const early = ev.results?.left.stopped === true && ev.results.left.count === 12 && ev.headline.endsWith("— 12 people were not messaged.");
    // a finished campaign has nobody left: no row for it
    const d = await h.campaign("rr9d", { path: DONE, count: 12 });
    await h.rows(d.id, [...h.many(10, { status: "DELIVERED", sentAt: iso(T - 30 * MIN) }), ...h.many(2, { status: "SKIPPED", skipReason: "suppressed" })]);
    const dv = await results(d.id);
    const finished = dv.results?.left.count === 0 && !hasRow(card(dv), "waiting") && !hasRow(card(dv), "stopped") && !hasRow(card(dv), "noAnswer");
    return [split && agree && stopped && early && finished,
      `failed ${json(r?.failed)} (want 8 = 5 + 3) · no answer ${r?.noAnswer} · left ${json(r?.left)} · agree with the figures ${agree} (groupBy asked ${asked}×) · stopped: ${json(sv.results?.left)} "${sv.headline.slice(-30)}" · stopped early: ${json(ev.results?.left)} · finished: ${dv.results?.left.count}`];
  });

  /* ── R10 · the stop walk and its cost ── */
  await h.claim(L.r10, async () => {
    // (1) chunks — a small chunk, a list of 21 people over 7: three full pages, then an empty one
    const c = await h.campaign("rr10", { path: RUNNING, count: 30 });
    const tag = (i: number) => h.key("79", h.run * 100 + i);
    const shapes: Shape[] = Array.from({ length: 21 }, (_, i): Shape => ({ status: i % 2 === 0 ? "SENT" : "DELIVERED", sentAt: iso(T - 60 * MIN), msisdn: tag(i) }));
    await h.rows(c.id, shapes);
    let n = 0;
    for (const i of [0, 3, 8, 13, 14, 20]) {
      await db.suppression.create({ id: `sup_u48a_${h.run}_w${n++}`, channel: "SMS", identifier: tag(i), category: "MARKETING", reason: "WITHDRAWN",
        evidence: `optout:w${i}`, recordedBy: null, createdAt: iso(T - 10 * MIN), liftedAt: null, liftedReason: null });
    }
    const pages: Array<string | null> = [];
    const batches: number[] = [];
    const seen = new Set<string>();
    let twice = 0;
    const walkDeps: StopWalkDeps = {
      ...impl.walkDeps, chunk: 7,
      page: async (id, after, limit) => { pages.push(after); const p = await impl.walkDeps.page(id, after, limit); for (const x of p) { if (seen.has(x.msisdn)) twice++; seen.add(x.msisdn); } return p; },
      stops: async (b) => { batches.push(b.identifiers.length); return impl.walkDeps.stops(b); },
    };
    const counted = await impl.walk(c.id, walkDeps);
    const chunked = counted === 6 && pages.length === 4 && pages[0] === null && json(batches) === json([7, 7, 7]) && twice === 0 && seen.size === 21;
    // (2) the real chunk: 1,000 people, and the first page the bulk read's bound allows
    const real = RES.STOP_WALK_CHUNK === 1000 && RES.STOP_WALK_DEPS.chunk === 1000 && RES.STOP_WALK_CHUNK <= BULK_KEYED_READ_MAX
      && MODEL.SMS_HANDED_OVER_PAGE_MAX === BULK_KEYED_READ_MAX;
    const big = await h.campaign("rr10b", { path: RUNNING, count: 1001 });
    await h.rows(big.id, Array.from({ length: 1000 }, (_, i): Shape => ({ status: "SENT", sentAt: iso(T - 60 * MIN), msisdn: h.key("62", h.run * 2000 + i) })));
    await h.rows(big.id, [{ status: "SENT", sentAt: iso(T - 60 * MIN), msisdn: h.key("63", h.run * 2000 + 1) }]);
    await db.suppression.create({ id: `sup_u48a_${h.run}_big`, channel: "SMS", identifier: h.key("63", h.run * 2000 + 1), category: "MARKETING", reason: "WITHDRAWN",
      evidence: "optout:big", recordedBy: null, createdAt: iso(T - 10 * MIN), liftedAt: null, liftedReason: null });
    const bigPages: number[] = [];
    const bigCount = await impl.walk(big.id, { ...impl.walkDeps, page: async (id, after, limit) => { const p = await impl.walkDeps.page(id, after, limit); bigPages.push(p.length); return p; } });
    const twoPages = bigCount === 1 && json(bigPages) === json([1000, 1]);
    // (3) production keeps a count for a short time and shares a walk: two askers, one walk — through the real production deps
    const pm = await h.campaign("rr10m", { path: RUNNING, count: 12 });
    await h.rows(pm.id, [{ status: "SENT", sentAt: iso(T - 60 * MIN) }, ...h.many(11, { status: "PENDING" })]);
    const handed = db.smsCampaignRecipient.handedOverPage;
    let walks = 0;
    let shared: number[] = [];
    try {
      db.smsCampaignRecipient.handedOverPage = (async (...a: Parameters<typeof handed>) => { walks++; return handed(...a); }) as typeof handed;
      shared = await Promise.all([impl.production.stoppedByLink(pm.id), impl.production.stoppedByLink(pm.id)]);
      shared.push(await impl.production.stoppedByLink(pm.id));
    } finally {
      db.smsCampaignRecipient.handedOverPage = handed;
    }
    const remembered = walks === 1 && json(shared) === json([0, 0, 0]);
    // (4) the memory itself: one walk while it runs and for the time it is kept; a failure is never kept
    let now = 1_000;
    const held = new Map<string, import("../../src/lib/server/marketing/campaign-results.ts").Memo<number>>();
    let reads = 0;
    let failNext = false;
    const get = impl.memo(async (key: string) => { reads++; if (failNext) { failNext = false; throw new Error("the walk is down (fixture)"); } return key.length; }, { ttlMs: 30_000, now: () => now, held });
    const [x, y] = await Promise.all([get("abc"), get("abc")]);
    now += 29_000;
    await get("abc");
    const inside = reads === 1 && x === 3 && y === 3;
    now += 2_000;
    await get("abc");
    const expired = reads === 2;
    failNext = true;
    now += 40_000;
    let rejected = false;
    try { await get("abc"); } catch { rejected = true; }
    await get("abc");
    const notKept = rejected && reads === 4;
    let syncThrow = false;
    let early: Promise<number> | null = null;
    try { early = impl.memo((): Promise<number> => { throw new Error("a throw before it starts (fixture)"); }, { ttlMs: 1, now: () => now, held: new Map() })("k"); } catch { syncThrow = true; }
    let earlyRejected = false;
    try { await early; } catch { earlyRejected = true; }
    const asRejection = !syncThrow && earlyRejected;
    // (4a) ⭐ a view never hangs on the walk: slower than its budget it says unread THIS time, and the walk goes on in the memory — the
    // next view finds it done. (The budget's timer is due before the walk's, so the order holds however loaded the machine is.)
    const slowCampaign = await h.campaign("rr10s", { path: RUNNING, count: 12 });
    await h.rows(slowCampaign.id, [...h.many(3, { status: "SENT", sentAt: iso(T - 60 * MIN) }), ...h.many(9, { status: "PENDING" })]);
    const slowHeld = new Map<string, import("../../src/lib/server/marketing/campaign-results.ts").Memo<number>>();
    const slowRead = impl.memo(async () => { await new Promise((r) => setTimeout(r, 150)); return 5; }, { ttlMs: 30_000, now: () => Date.now(), held: slowHeld });
    const firstLook = await results(slowCampaign.id, READER, { stoppedByLink: slowRead, budgetMs: 20 });
    const firstHtml = card(firstLook);
    await new Promise((r) => setTimeout(r, 300));
    const secondLook = await results(slowCampaign.id, READER, { stoppedByLink: slowRead, budgetMs: 20 });
    const budgeted = firstLook.results?.stoppedByLink === null && valueOf(firstHtml, "stoppedByLink") === "—" && secondLook.results?.stoppedByLink === 5
      && RES.RESULTS_READ_BUDGET_MS > 0 && RES.RESULTS_DEPS.budgetMs === RES.RESULTS_READ_BUDGET_MS && firstLook.results?.handedOver === 3;
    // (4b) a walk that cannot move refuses, and one that never ends is cut off — each a failure the view says as unread
    const stuck = await impl.walk("cmp_stuck", { ...impl.walkDeps, chunk: 2, page: async () => [{ msisdn: h.key("62", 1), sentAt: iso(T) }, { msisdn: h.key("62", 2), sentAt: iso(T) }], stops: async () => [] })
      .then(() => false, () => true);
    let counter = 0;
    const endless = await impl.walk("cmp_endless", { ...impl.walkDeps, chunk: 1, page: async () => [{ msisdn: h.key("62", 100 + ++counter), sentAt: iso(T) }], stops: async () => [] })
      .then(() => false, () => true);
    const guarded = stuck && endless && counter === RES.STOP_WALK_PAGES_MAX;
    // (5) unread: a walk that fails is a dash and its sentence, never a zero, and the view still comes
    const d = await h.campaign("rr10d", { path: RUNNING, count: 12 });
    await h.rows(d.id, [...h.many(3, { status: "SENT", sentAt: iso(T - 60 * MIN) }), ...h.many(9, { status: "PENDING" })]);
    const down = await results(d.id, READER, { stoppedByLink: async () => { throw new Error("the stops list is down (fixture)"); } });
    const downHtml = card(down);
    const unread = down.results !== null && down.results.stoppedByLink === null && valueOf(downHtml, "stoppedByLink") === "—"
      && helpOf(downHtml, "stoppedByLink") === COPY.RESULTS_UNREAD && down.results.handedOver === 3;
    // (6) nobody handed anything: nothing asked
    const idle = await h.campaign("rr10i", { path: RUNNING, count: 12 });
    await h.rows(idle.id, [...h.many(8, { status: "PENDING" }), ...h.many(4, { status: "SKIPPED", skipReason: "suppressed" })]);
    const asked: string[] = [];
    const iv = await results(idle.id, READER, {
      sentBefore: async () => { asked.push("sentBefore"); return 1; }, stoppedByLink: async () => { asked.push("stoppedByLink"); return 1; },
      priceTzs: async () => { asked.push("priceTzs"); return 6; },
    });
    const nothing = asked.length === 0 && iv.results?.stoppedByLink === 0 && iv.results.noReceiptAfter15 === 0;
    return [chunked && real && twoPages && remembered && inside && expired && notKept && asRejection && budgeted && guarded && unread && nothing,
      `chunks of 7 over 21: counted ${counted} (want 6), pages ${pages.length}, batches ${json(batches)}, twice ${twice} · 1,001 people → pages ${json(bigPages)} count ${bigCount} · real chunk ${real} · production: ${walks} walk(s) for 3 askers ${json(shared)} · memory: inside ${inside} expired ${expired} failure not kept ${notKept} throw-as-rejection ${asRejection} · a slow walk: first look ${json(firstLook.results?.stoppedByLink)}, the next ${json(secondLook.results?.stoppedByLink)} · a stuck walk refuses ${stuck}, an endless one is cut at ${counter} pages ${endless} · failed walk: ${json(down.results?.stoppedByLink)} "${valueOf(downHtml, "stoppedByLink")}" · nobody handed over: asked [${asked.join(",")}]`];
  });

  /* ── R11 · the card ── */
  await h.claim(L.r11, async () => {
    const c = await h.campaign("rr11", { path: STOPPED, count: 40 });
    await h.rows(c.id, [
      ...h.many(2, { status: "DELIVERED", sentAt: iso(T - 90 * MIN) }), ...h.many(7, { status: "SENT", sentAt: iso(T - 20 * MIN) }), { status: "SENT", sentAt: iso(T - 2 * MIN) },
      { status: "FAILED", failureClass: "REJECTED" }, { status: "FAILED", failureClass: "receipt:UNDELIV" },
      ...h.many(3, { status: "SKIPPED", skipReason: "suppressed" }), ...h.many(2, { status: "UNCONFIRMED" }), ...h.many(9, { status: "PENDING" }),
    ]);
    const v = await results(c.id, READER);
    const html = card(v, READER);
    const r = v.results;
    const text = textOf(html);
    const order = ["delivered", "handedOver", "noReceipt", "failed", "notSent", "noAnswer", "stopped", "stoppedByLink"];
    const at = order.map((n) => html.indexOf(rowTag(n)));
    const ordered = at.every((x, i) => x > 0 && (i === 0 || x > at[i - 1]));
    const TITLES = [
      "Delivered", "Handed over, no receipt yet", "No receipt after 15 minutes", "Failed", "The network refused it", "Not delivered (receipt)",
      "Not sent — the checks refused them", "No answer from the network", "Stopped before sending", "Stopped by their link since this campaign",
    ];
    const titled = TITLES.every((t) => text.includes(t)) && !text.includes("Waiting")
      && COPY.RESULTS_ROW.delivered.label === TITLES[0] && COPY.RESULTS_ROW.handedOver.label === TITLES[1] && COPY.RESULTS_ROW.noReceipt.label === TITLES[2]
      && COPY.RESULTS_ROW.failed.label === TITLES[3] && COPY.RESULTS_FAILED.wire === TITLES[4] && COPY.RESULTS_FAILED.receipt === TITLES[5]
      && COPY.RESULTS_ROW.notSent.label === TITLES[6] && COPY.RESULTS_ROW.noAnswer.label === TITLES[7] && COPY.RESULTS_ROW.stopped.label === TITLES[8]
      && COPY.RESULTS_ROW.stoppedByLink.label === TITLES[9];
    // ⭐ OD41 in the markup: distinct numbers — Delivered prints 2, Handed over prints 8; never the one for the other
    const own = r !== null && r.delivered === 2 && r.handedOver === 8 && valueOf(html, "delivered") === "2" && valueOf(html, "handedOver") === "8"
      && valueOf(html, "failed") === "2" && valueOf(html, "notSent") === "3" && valueOf(html, "noAnswer") === "2" && valueOf(html, "stopped") === "9" && valueOf(html, "noReceipt") === "7";
    const words = helpOf(html, "delivered") === COPY.RESULTS_ROW.delivered.help && helpOf(html, "handedOver") === COPY.RESULTS_ROW.handedOver.help
      && !/delivered/i.test(COPY.RESULTS_ROW.handedOver.help.replace("Delivery is confirmed", "")) && !/delivered/i.test(COPY.RESULTS_ROW.noReceipt.help);
    // below the floor nothing is drawn; with no results the block is not there at all
    const masked = await h.campaign("rr11m", { path: RUNNING, count: 9 });
    await h.rows(masked.id, [...h.many(5, { status: "SENT", sentAt: iso(T - 20 * MIN) }), ...h.many(4, { status: "PENDING" })]);
    const gone = !impl.render(await results(masked.id, GROWTH), viewerOf(GROWTH)).includes("data-results");
    // the card's file: no arithmetic, no clock, no money, nothing of the server
    const src = impl.sources.card;
    const BANNED = ["Math.", ".reduce(", "parseInt(", "parseFloat(", ".toFixed(", ".toLocaleString(", "Intl.", "Date.now(", "new Date(", "setInterval", "setTimeout", "formatTzs", "TZS", "campaignMoneyVisible"];
    const NUMBER_CALL = new RegExp("(?:^|[^A-Za-z0-9_])Number[(]");
    const FIELD = "(?:value|max|count|total|delivered|handedOver|failed|wire|receipt|noAnswer|noReceiptAfter15|stoppedByLink|length)";
    const OP = "[-+*/%]";
    const after = new RegExp("[.]" + FIELD + "[)]?[ ]*" + OP + "[ ]*[A-Za-z0-9_(]");
    const before = new RegExp("[A-Za-z0-9_)][ ]*" + OP + "[ ]*[A-Za-z0-9_.]*[.]" + FIELD + "(?![A-Za-z0-9_])");
    const worked = [...BANNED.filter((b) => src.includes(b)), ...(NUMBER_CALL.test(src) ? ["Number("] : []), ...(after.test(src) || before.test(src) ? ["arithmetic on a figure"] : [])];
    const specs = Array.from(src.matchAll(/^import (type )?[{][^}]*[}] from "([^"]+)";/gm)).map((m) => `${m[1] ? "type " : ""}${m[2]}`).sort();
    const reach = json(specs) === json(["./live-client", "./live-copy", "./live-geometry", "@/components/admin/admin-charts", "@/components/ui/callout", "@/lib/utils", "type react"].sort());
    const client = rawRead(`${DIR}results-card.tsx`).trimStart().startsWith(`${DQ}use client${DQ}`);
    // an unread count: a dash and its sentence, never a zero
    const bad = await results(c.id, READER, { sentBefore: async () => { throw new Error("the count is down (fixture)"); }, stoppedByLink: async () => { throw new Error("the stops list is down (fixture)"); } });
    const badHtml = card(bad, READER);
    const unread = valueOf(badHtml, "noReceipt") === "—" && valueOf(badHtml, "stoppedByLink") === "—" && helpOf(badHtml, "noReceipt") === COPY.RESULTS_UNREAD
      && helpOf(badHtml, "stoppedByLink") === COPY.RESULTS_UNREAD && valueOf(badHtml, "delivered") === "2";
    return [ordered && titled && own && words && gone && unread && worked.length === 0 && reach && client,
      `order ${ordered} · the spec's titles ${titled} · Delivered ${valueOf(html, "delivered")} / Handed over ${valueOf(html, "handedOver")} (want 2 / 8) · words ${words} · below the floor nothing ${gone} · unread said ${unread} · the file: [${worked.join(", ")}] · imports ${reach} · "use client" ${client}`];
  });

  /* ── R12 · the wiring ── */
  await h.claim(L.r12, async () => {
    const s = impl.sources;
    const V = LIVEM.LIVE_VIEW_DEPS;
    const R = V.results;
    const frozen = R === RES.RESULTS_DEPS && Object.isFrozen(R) && Object.isFrozen(R.rules) && Object.isFrozen(RES.STOP_WALK_DEPS) && Object.isFrozen(RES.STOP_WALK_DEPS.rules)
      && R.rules.delivered === RES.deliveredRows && R.rules.failedSplit === RES.failedSplitOf && R.rules.honesty === RES.honestyOf
      && RES.STOP_WALK_DEPS.rules.isLinkStop === RES.isLinkStop && RES.STOP_WALK_DEPS.rules.attributedElsewhere === RES.attributedElsewhere;
    const doors = s.results.includes("db.smsCampaignRecipient.countSentBefore(campaignId, before)") && s.results.includes("db.smsCampaignRecipient.handedOverPage(campaignId, after, limit)")
      && s.results.includes("db.suppression.findActiveAmong(batch)") && s.results.includes("db.smsCampaignRecipient.listByMsisdn(msisdn, sinceIso)")
      && s.live.includes("results: RESULTS_DEPS,") && s.live.includes("campaignResults({");
    // The send names are spelled in halves: marketing-window's W6 walks every file under scripts/ for the send path's NAME as text,
    // and this is a pattern the results module is held to, not a driver of any send.
    const SEND = new RegExp(["sendBatch", "dispatch" + "Slice", "blackballSend", "sendCampaign" + "Test", "engineSend"].join("|"));
    const WRITE = new RegExp("[.](create|createMany|update|settle|transition|claim|requeueHeld|recordReceipt|recordSend|lift)[(]|audit[(]");
    const quiet = !SEND.test(s.results) && !WRITE.test(s.results);
    const mount = s.page.includes('import { LiveResults, LiveWhenResults } from "./results-card";') && s.page.includes("<LiveWhenResults>")
      && s.page.includes('<div data-block="live-results"><AdminCard title={RESULTS_TITLE}><LiveResults /></AdminCard></div>') && s.page.indexOf("</LiveWhenListed>") < s.page.indexOf("<LiveWhenResults>");
    const ghost = s.loading.includes('data-skeleton="live-results"') && s.loading.includes("RESULTS_ROW_BOX") && s.loading.indexOf('data-skeleton="live-progress"') < s.loading.indexOf('data-skeleton="live-results"');
    const hook = s.client.includes("export function useLive(): Live {") && !s.client.includes("LiveResults") && !s.client.includes("results-card");
    const geometry = s.geometry.includes("export const RESULTS_ROW_BOX =") && s.geometry.includes("export const RESULTS_ROW_COUNT = 5;");
    // ⛔ the module is SERVER code: a VALUE import of it is the live view's (and the dev seed's, for one constant) and nobody else's —
    // never the card, the client or the page (a type-only import is erased, and allowed)
    const SPEC = new RegExp('^(import|export)( [^;]*?)? from "([^"]+)"', "gm");
    const importers = [...s.importers].filter(([rel, text]) => {
      if (rel.endsWith("/campaign-results.ts")) return false;
      return Array.from(text.matchAll(SPEC)).some((m) => !/^ type /.test(m[2] ?? "") && m[3].endsWith("/campaign-results"));
    }).map(([rel]) => rel).sort();
    const reach = json(importers) === json(["src/app/api/dev-test/marketing-live-seed/route.ts", "src/lib/server/marketing/campaign-live.ts"]);
    return [frozen && doors && quiet && mount && ghost && hook && geometry && reach,
      `deps frozen and wired ${frozen} · imported by value by [${importers.join(', ')}] ${reach} · the doors named ${doors} · reads only ${quiet} · mounted behind LiveWhenResults under the figures ${mount} · ghost block ${ghost} · useLive exported, the client names no card ${hook} · geometry ${geometry}`];
  });

  /* ── R13 · the reasons are printed once ── */
  await h.claim(L.r13, async () => {
    const c = await h.campaign("rr13", { path: RUNNING, count: 14 });
    await h.rows(c.id, [
      ...h.many(6, { status: "SENT", sentAt: iso(T - 5 * MIN) }), ...h.many(3, { status: "SKIPPED", skipReason: "suppressed" }),
      ...h.many(2, { status: "SKIPPED", skipReason: "no_consent" }), ...h.many(3, { status: "PENDING" }),
    ]);
    const reader = await results(c.id, READER);
    const count = (text: string, part: string): number => text.split(part).length - 1;
    // the whole page for a reader above the floor: the list is the results card's, and only there
    const page = impl.renderPage(reader, viewerOf(READER));
    h.see(page);
    const pageText = textOf(page);
    const listed = reasonsIn(page);
    const wanted = reader.results?.notSent.reasons ?? [];
    const total = listed.reduce((n, x) => n + x.count, 0);
    const once = count(page, "data-live-reasons") === 0 && count(page, "data-results-reasons") === 1 && json(listed) === json(wanted) && listed.length >= 5
      && total === 5 && total === reader.kpis.notSent && count(pageText, COPY.LIVE_BREAKDOWN_TITLE) === 0;
    // the same view with its results taken away (a viewer who has none to read) keeps the figures card's own list
    const bare = impl.renderPage({ ...reader, results: null }, viewerOf(READER));
    h.see(bare);
    const own = count(bare, "data-live-reasons") === 1 && count(bare, "data-results-reasons") === 0 && count(textOf(bare), COPY.LIVE_BREAKDOWN_TITLE) === 1
      && !bare.includes("data-results");
    // a masked viewer on nine rows: neither list — the floor's sentence alone
    const nine = await h.campaign("rr13b", { path: RUNNING, count: 9 });
    await h.rows(nine.id, [...h.many(5, { status: "SENT", sentAt: iso(T - 5 * MIN) }), ...h.many(4, { status: "SKIPPED", skipReason: "suppressed" })]);
    const masked = impl.renderPage(await results(nine.id, GROWTH), viewerOf(GROWTH));
    h.see(masked);
    const neither = count(masked, "data-live-reasons") === 0 && count(masked, "data-results-reasons") === 0;
    // the file: the figures card's list is guarded on the view having no results
    const guard = impl.sources.client.includes("view.notSentReasons !== null && view.results === null && (");
    return [once && own && neither && guard,
      `the reader's page: figures-card lists ${count(page, "data-live-reasons")}, results lists ${count(page, "data-results-reasons")}, the five words once ${json(listed) === json(wanted)} (sum ${total} of ${reader.kpis.notSent}), the old title ${count(pageText, COPY.LIVE_BREAKDOWN_TITLE)}× · without results the figures card draws its own ${own} · masked: neither ${neither} · the guard in the file ${guard}`];
  });
}

/** The text of the card's markup (tags out, entities decoded). */
function textOf(html: string): string {
  return textOfHtml(html);
}

/* ══ THE PLANTS — each defect IN MEMORY, each failing EXACTLY the claims it names ═══════════════════════════════════ */

type ViewPlant = (d: LiveViewDeps) => LiveViewDeps;
export type ResultsPlant = { name: string; expect: string[]; impl: { viewDeps?: ViewPlant; results?: ResultsImpl } };

export function resultsPlants(phoneLabel: string): ResultsPlant[] {
  const L = LABELS;
  const base = REAL_RESULTS;
  const S = REAL_SOURCES;
  const withResults = (over: Partial<ResultsImpl>): { results: ResultsImpl } => ({ results: { ...base, ...over } });
  const withSources = (over: Partial<ResultsSources>): { results: ResultsImpl } => withResults({ sources: { ...S, ...over } });
  const withRules = (rules: Partial<ResultsDeps["rules"]>): { viewDeps: ViewPlant } => ({
    viewDeps: (d) => ({ ...d, results: { ...d.results, rules: { ...d.results.rules, ...rules } } }),
  });
  const withDeps = (over: (d: LiveViewDeps) => Partial<ResultsDeps>): { viewDeps: ViewPlant } => ({
    viewDeps: (d) => ({ ...d, results: { ...d.results, ...over(d) } }),
  });
  const withWalk = (over: Partial<StopWalkDeps>): { results: ResultsImpl } => withResults({ walkDeps: { ...base.walkDeps, ...over } });
  /** The memory twin's recipient rows, for a plant that reads them directly (a fixture only). */
  const memRows = (): Map<string, StoredSmsCampaignRecipient> =>
    (globalThis as unknown as { __50PICK_STORE: { smsCampaignRecipients: Map<string, StoredSmsCampaignRecipient> } }).__50PICK_STORE.smsCampaignRecipients;
  return [
    { name: "R-R1 (the plan's own) · handed over counted as delivered — the network taking a message reads as its delivery (the honesty line, which asks whether anything was delivered, never stands; and every claim that reads Delivered beside a SENT row sees it)", expect: [L.r1, L.r2, L.r9, L.r11],
      impl: withRules({ delivered: (c) => c.DELIVERED + c.SENT }) },
    { name: "R-R2 · the honesty line hard-coded — it stands whatever the data says, after a receipt too, and for a campaign that handed nothing over", expect: [L.r2],
      impl: withRules({ honesty: (i) => ({ noReceiptYet: true, notSetUp: !i.setUp }) }) },
    { name: "R-R2b · the honesty line never said — a campaign with a message handed over and no receipt is told nothing", expect: [L.r2],
      impl: withRules({ honesty: () => ({ noReceiptYet: false, notSetUp: false }) }) },
    { name: "R-R2c · 'receipts aren't set up' said whatever the server can do — Delivered 'will stay at zero' on a server that takes receipts", expect: [L.r2],
      impl: withRules({ honesty: (i) => RES.honestyOf({ ...i, setUp: false }) }) },
    { name: "R-R2d · only a DELIVERED receipt counts as one — a failure's receipt leaves 'no delivery receipt has arrived' standing", expect: [L.r2],
      impl: withRules({ honesty: (i) => RES.honestyOf({ ...i, receiptFailed: 0 }) }) },
    { name: "R-R3 · the 15-minute figure counted from every row handed over — a DELIVERED row and a failed one are 'no receipt' too", expect: [L.r3, L.r11],
      impl: withDeps(() => ({ sentBefore: async (id, before) => [...memRows().values()].filter((r) => r.campaignId === id && r.sentAt !== null && Date.parse(r.sentAt) < Date.parse(before)).length })) },
    { name: "R-R3b · the cutoff on the wrong side of now — the figure counts rows handed over in the last 15 minutes as well", expect: [L.r3, L.r11],
      impl: withDeps((d) => ({ sentBefore: async (id, before) => d.results.sentBefore(id, new Date(2 * d.now().getTime() - Date.parse(before)).toISOString()) })) },
    { name: "R-R4 · attribution ignoring a newer campaign — a stop after another campaign's message to the number is counted here as well", expect: [L.r4],
      impl: withWalk({ rules: { ...base.walkDeps.rules, attributedElsewhere: () => false } }) },
    { name: "R-R4b · a stop made BEFORE this campaign's message counted — the createdAt rule gone", expect: [L.r4],
      impl: withWalk({ rules: { ...base.walkDeps.rules, isLinkStop: (stop, sentAt) => RES.isLinkStop({ ...stop, createdAt: sentAt }, sentAt) } }) },
    { name: "R-R4c · any evidence will do — an officer's bulk withdrawal counts as the person's own link", expect: [L.r4],
      impl: withWalk({ rules: { ...base.walkDeps.rules, isLinkStop: (stop, sentAt) => RES.isLinkStop({ ...stop, evidence: `${RES.LINK_STOP_EVIDENCE_PREFIX}x` }, sentAt) } }) },
    { name: "R-R4d · any reason will do — an operator's refusal counts as a stop by the link", expect: [L.r4],
      impl: withWalk({ rules: { ...base.walkDeps.rules, isLinkStop: (stop, sentAt) => RES.isLinkStop({ ...stop, reason: RES.LINK_STOP_REASON as never }, sentAt) } }) },
    { name: "R-R4e · a lifted stop counted — every stop the number ever had, not the ones still in force", expect: [L.r4],
      impl: withWalk({ stops: async (b) => (await Promise.all(b.identifiers.map((i) => db.suppression.listFor(i)))).flat() }) },
    { name: "R-R4f · every message counts as the newer one — a failed message of another campaign explains a stop it cannot", expect: [L.r4],
      impl: withWalk({ rules: { ...base.walkDeps.rules, attributedElsewhere: (rows, o) => RES.attributedElsewhere(rows.map((r) => ({ ...r, status: "SENT" as const, sentAt: r.sentAt ?? new Date(Date.parse(o.sentAt) + 1).toISOString() })), o) } }) },
    { name: "R-R7 · 'set up' means a secret is set — a secret one short of the floor, and the open stub, read the wrong way", expect: [L.r7],
      impl: withResults({ setUp: (r) => r.secret !== "" }) },
    { name: "R-R7b · production's 'set up' is a constant — the dep ignores the environment", expect: [L.r7],
      impl: withResults({ production: Object.freeze({ ...RES.RESULTS_DEPS, receiptsSetUp: () => true }) }) },
    { name: "R-R8b · production's price is a number of its own — not the owner's setting", expect: [L.r8],
      impl: withResults({ production: Object.freeze({ ...RES.RESULTS_DEPS, priceTzs: async () => 7 }) }) },
    { name: "R-R9 · the failed merged — every failure the network's refusal, none reported undelivered by a receipt (R1 and R2 move a row to Failed by a receipt)", expect: [L.r1, L.r2, L.r9],
      impl: withRules({ failedSplit: (groups) => { const s = RES.failedSplitOf(groups); return { total: s.total, wire: s.total, receipt: 0 }; } }) },
    { name: "R-R10 · the walk reads the first chunk only — everyone past the first page is never asked about", expect: [L.r10],
      impl: withResults({ walk: async (id, deps) => RES.stoppedByLinkOf(id, { ...deps, page: async (c, a, l) => (a === null ? deps.page(c, a, l) : []) }) }) },
    { name: "R-R10b · production walks on every view — no memory, no shared flight", expect: [L.r10],
      impl: withResults({ production: Object.freeze({ ...RES.RESULTS_DEPS, stoppedByLink: (id: string) => RES.stoppedByLinkOf(id) }) }) },
    { name: "R-R10c · the memory keeps a failure — one failed walk is the answer for the whole time", expect: [L.r10],
      impl: withResults({ memo: (read, o) => {
        const wrapped = RES.memoByKey(read, o);
        return (key) => { const p = wrapped(key); p.catch(() => { o.held.set(key, { settledAt: o.now(), promise: p }); }); return p; };
      } }) },
    { name: "R-R10d · a count that cannot be made drawn as a zero — the failed stop count reads 0", expect: [L.r10, L.r11],
      impl: withDeps((d) => ({ stoppedByLink: async (id) => { try { return await d.results.stoppedByLink(id); } catch { return 0; } } })) },
    { name: "R-R10e · no render budget — a view waits for the stop walk as long as it takes", expect: [L.r10],
      impl: withDeps(() => ({ budgetMs: 600_000 })) },
    { name: "R-R11 · the Delivered row prints what was handed over — the network's taking a message passes for its delivery in the browser", expect: [L.r1, L.r11],
      impl: withResults({ render: (view, o) => base.render({ ...view, results: view.results === null ? null : { ...view.results, delivered: view.results.handedOver } }, o) }) },
    { name: "R-R11b · an unread count drawn as a zero", expect: [L.r3, L.r10, L.r11],
      impl: withResults({ render: (view, o) => base.render({ ...view, results: view.results === null ? null : { ...view.results, noReceiptAfter15: view.results.noReceiptAfter15 ?? 0, stoppedByLink: view.results.stoppedByLink ?? 0 } }, o) }) },
    { name: "R-R11c · the card works a figure out in the browser — Waiting is the people less the ones that failed", expect: [L.r11],
      impl: withSources({ card: plantIn(S.card, "value={r.left.count}", "value={r.noAnswer - r.failed.total}") }) },
    { name: "R-R11d · the card formats a TZS figure itself", expect: [L.r11],
      impl: withSources({ card: `import { formatTzs } from "@/lib/utils";${NL}${S.card}` }) },
    { name: "R-R11e · the card reaches the server's store", expect: [L.r11],
      impl: withSources({ card: `import { db } from "@/lib/server/store";${NL}${S.card}` }) },
    { name: "R-R11f · the card drawn below the floor — a hidden viewer's page carries a results block", expect: [L.r11],
      impl: withResults({ render: (view, o) => (view.results === null ? `${base.render(view, o)}<div data-results>${COPY.RESULTS_HONESTY.noReceiptYet}</div>` : base.render(view, o)) }) },
    { name: "R-R12 · the results module names a send of its own", expect: [L.r12],
      impl: withSources({ results: plantIn(S.results, "export async function campaignResults(", "const viaWire = sendBatch;" + NL + "export async function campaignResults(") }) },
    { name: "R-R12b · the results module writes — an audit row from a read", expect: [L.r12],
      impl: withSources({ results: `${S.results}${NL}audit({ action: "x" });` }) },
    { name: "R-R12c · the page forgets to mount the card", expect: [L.r12],
      impl: withSources({ page: plantIn(S.page, "<LiveWhenResults>", "<>") }) },
    { name: "R-R12d · the ghost has no block for the card", expect: [L.r12],
      impl: withSources({ loading: plantIn(S.loading, 'data-skeleton="live-results"', 'data-skeleton="live-other"') }) },
    { name: "R-R12e · the view's results deps are not production's", expect: [L.r12],
      impl: withSources({ live: plantIn(S.live, "results: RESULTS_DEPS,", "results: { ...RESULTS_DEPS },") }) },
    { name: "R-R12f · the browser's card imports the server module by value — the stop walk's reads reach the client's file", expect: [L.r12],
      impl: withSources({ importers: new Map([...S.importers, ["src/app/admin/campaigns/[id]/results-card.tsx", `import { campaignResults } from "@/lib/server/marketing/campaign-results";`]]) }) },
    { name: "R-R13 · the figures card prints its own list beside the results' — the reasons twice (the guard on the view having no results removed from the client's file)", expect: [L.r13],
      impl: withSources({ client: plantIn(S.client, "view.notSentReasons !== null && view.results === null && (", "view.notSentReasons !== null && (") }) },
    { name: "R-R13b · the page draws the figures card's list as well as the results' — a second 'Not sent, by reason' beside the card", expect: [L.r13],
      impl: withResults({ renderPage: (view, o) => {
        const html = base.renderPage(view, o);
        return view.results === null ? html : `${html}<div data-live-reasons><p>${COPY.LIVE_BREAKDOWN_TITLE}</p></div>`;
      } }) },
    { name: "R-R13c · the figures card never draws its list — not even for a viewer whose view has no results", expect: [L.r13],
      impl: withResults({ renderPage: (view, o) => base.renderPage({ ...view, notSentReasons: null }, o) }) },
    { name: "R-P4 · a phone number reaches the results card", expect: [phoneLabel],
      impl: withResults({ render: (view, o) => `${base.render(view, o)}<p>+255712345678</p>` }) },
  ];
}
