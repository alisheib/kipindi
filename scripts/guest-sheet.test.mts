/**
 * test:guest-sheet — the journey's guest bet sheet (the Vodacom plan S10, `docs/VODACOM-PLAN.md` §3.7;
 * `docs/design-system/v5-2026-09-29-simplified-journey/S10-PLAN.md` WP1, with its amendments).
 *
 *   npm run test:guest-sheet     (in test:all)
 *   npm run red:guest-sheet      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * What it holds `src/lib/journey/guest-sheet.ts`, `betReturnPath` (pending-bet.ts) and `doorHrefsFor` (auth-landing.ts) to:
 *   §1 THE GUEST'S FRAME — S8's frame with no viewer half: on the deck's Dodoma pools and every estimate state its stake,
 *      bounds, chips and estimate are the money face's; only edit and closed ever draw; the CTA and both quotes withheld.
 *   §2 WHAT A DOOR CARRIES — the bet (a stake only inside the bounds), a keyless, ownerless marker with the page's codes,
 *      the address left behind (every parameter kept) and the `next` (the return page and the bet, nothing else).
 *   §3 THE DOOR'S TAIL — `next` refused unless bounded, `ref` and `invite` normalised or dropped, never cut, never inside
 *      `next`; and the classic question page's guest panel builds its two doors through it (Point for Ali 4, A8).
 *   §4 WHAT AN ADDRESS OPENS — a forwarded stake opens at the minimum; only this tab's ownerless, keyless, fresh marker
 *      lets the stake through; nothing off the journey's pick pages or for a round.
 *   §5 ONE COUNT PER VISITOR OPEN — `returnedOpen` and `countsSheetOpen`.
 *   §6 THE SOURCE — the module imports only sheet-state.ts and pending-bet.ts; no clock, timer, window, document, storage
 *      or fetch; no money figure, rate or multiple typed; client-safe.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written, so `test:red-anchors` counts the twin as in-process.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as GS from "../src/lib/journey/guest-sheet.ts";
import * as SS from "../src/lib/journey/sheet-state.ts";
import * as PB from "../src/lib/journey/pending-bet.ts";
import * as AL from "../src/lib/auth-landing.ts";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const PROVE_RED = process.argv.includes("--prove-red");

type Impl = {
  frame: typeof GS.guestFrame; carried: typeof GS.carriedStake; carry: typeof GS.guestCarry; opens: typeof GS.guestOpensFrom;
  returned: typeof GS.returnedOpen; counts: typeof GS.countsSheetOpen; doors: typeof AL.doorHrefsFor; ret: typeof PB.betReturnPath;
  src: string;
  /** src/app/markets/[id]/page.tsx — the classic guest panel's doors (Point for Ali 4). */
  page: string;
};
const SOURCE = read("src/lib/journey/guest-sheet.ts");
const PAGE_SRC = read("src/app/markets/[id]/page.tsx");
const REAL: Impl = {
  frame: GS.guestFrame, carried: GS.carriedStake, carry: GS.guestCarry, opens: GS.guestOpensFrom, returned: GS.returnedOpen,
  counts: GS.countsSheetOpen, doors: AL.doorHrefsFor, ret: PB.betReturnPath, src: SOURCE, page: PAGE_SRC,
};

/* ─── The world: the deck's Dodoma pools (VODACOM-PLAN §3.1's goldens) ───────────────────────────────────────── */
const NOW = Date.UTC(2026, 9, 14, 9, 0);
const HOUR = 3_600_000;
const RATES = { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, showEstimatedWinnings: true } as const;
const MKT = "mkt_dodoma01", OTHER = "mkt_mbeya02";
const MIN = 500, MAX = 1_000_000;
const KEY = "0f8b6a52-3c1d-4e7a-9b2f-5d6c7e8f9a01";
function seed(o: Partial<SS.SheetSeed> = {}): SS.SheetSeed {
  return { v: 1, id: MKT, yesPool: 24_825, noPool: 50_462, rates: { ...RATES }, feePct: 13, min: MIN, max: MAX, closesAt: new Date(NOW + HOUR).toISOString(), serverNow: NOW, bettable: true, ...o };
}
const bet = (stake: number | null, id = MKT, side: "YES" | "NO" = "YES"): PB.PendingBet => ({ kind: "market", id, side, stake });
/** A signed-in viewer at TZS 0 — only the red twin's "a guest shown the low frame" plant draws with it. */
const ZERO_WALLET: SS.SheetFacts = {
  maintenance: false, lockout: null, session: null, account: { status: "ACTIVE", coolingOffUntil: null },
  wallet: { status: "ACTIVE", balance: 0, bonusBalance: 0 }, loss: { dailyLossLimit: null, lossToday: 0 }, pendingDeposit: null,
  deposit: { limits: { daily: null, weekly: null, monthly: null }, usage: { day: 0, week: 0, month: 0 }, sof: { accepted: true, singleTxn: 1_000_000, rolling30d: 5_000_000 }, railsOpen: true },
};

function run(impl: Impl, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const j = (v: unknown) => JSON.stringify(v);
  const safe = <T,>(f: () => T): T | "threw" => { try { return f(); } catch { return "threw"; } };

  /* §1 · the guest's frame */
  const money = (o: Partial<SS.SheetFrameInput> = {}) => SS.sheetFrame({ seed: seed(), side: "YES", stakeText: "5000", viewer: { state: "failed" }, nowMs: NOW, intent: null, settled: null, ...o });
  const guest = (o: Partial<GS.GuestFrameInput> = {}) => safe(() => impl.frame({ seed: seed(), side: "YES", stakeText: "5000", nowMs: NOW, ...o }));
  const SAME = ["frame", "bounds", "stake", "breaks", "stakeInvalid", "attention", "chips", "estimate", "showEstimate", "holder", "lines", "closedBody", "low", "pending", "lossRoom", "receipt", "block"] as const;
  const same = (g: SS.SheetFrame | "threw", m: SS.SheetFrame) => g !== "threw" && SAME.every((k) => j(g[k]) === j(m[k]));
  const withheld = (g: SS.SheetFrame | "threw") => g !== "threw" && g.cta === null && g.quote === null && g.betInsteadQuote === null && SS.quoteAt(g) === null && SS.quoteAt(g, "betInstead") === null;
  const deck = [guest({ stakeText: "1000" }), guest({ stakeText: "5000" })];
  ok("1.deck · Dodoma at TZS 1,000 → TZS 2,700 ≈2.7×; at 5,000 → TZS 12,360 ≈2.5× — the money face's own estimate, its stake, bounds and chips, with the CTA and both quotes withheld",
    deck.every((g) => g !== "threw" && g.frame === "edit") && j(deck.map((g) => g !== "threw" && g.estimate && [g.estimate.payout, g.estimate.multText])) === j([[2_700, "2.7"], [12_360, "2.5"]])
      && same(deck[0], money({ stakeText: "1000" })) && same(deck[1], money()) && deck.every(withheld)
      && deck[1] !== "threw" && j(deck[1].chips) === j([500, 1_000, 2_500, 5_000]), j(deck));
  const stateCases: Array<[string, Partial<SS.SheetSeed>, string]> = [
    ["priced", {}, "priced"], ["fills an empty side", { yesPool: 0, noPool: 3_000 }, "fillsEmptySide"],
    ["one side refunded", { yesPool: 3_000, noPool: 0 }, "oneSidedRefund"], ["an empty pool", { yesPool: 0, noPool: 0 }, "emptyPool"],
    ["a legacy capped fee", { rates: { feeModel: "capped-commission", commissionRate: 0.1, feeCeilingRate: 0.333 } }, "hidden"],
    ["over the cap", { yesPool: 1_000, noPool: 500_000 }, "priced"], ["thin", { yesPool: 500_000, noPool: 20_000 }, "priced"],
  ];
  const states = stateCases.map(([name, s]) => ({ name, g: guest({ seed: seed(s), stakeText: String(MIN) }), m: money({ seed: seed(s), stakeText: String(MIN) }) }));
  ok("1.states · priced, an empty side, one side refunded, an empty pool, a legacy fee, over the cap and thin: each the money face's own estimate, never a figure of the guest's",
    states.every(({ g, m }, i) => same(g, m) && g !== "threw" && g.estimate?.state === stateCases[i][2] && withheld(g))
      && states[5].g !== "threw" && states[5].g.estimate?.overCap === true && states[6].g !== "threw" && states[6].g.estimate?.lean === "thin",
    j(states.filter(({ g, m }, i) => !(same(g, m) && g !== "threw" && g.estimate?.state === stateCases[i][2])).map((x) => x.name)));
  const bounds = ["", "12.5", "499", String(MAX + 1)].map((s) => ({ s, g: guest({ stakeText: s }), m: money({ stakeText: s }) }));
  ok("1.bounds · empty, not whole, below and above: the edit frame naming its break, as the money face reads it, with nothing to commit",
    j(bounds.map((b) => b.g !== "threw" && [b.g.frame, b.g.breaks])) === j([["edit", "empty"], ["edit", "notWhole"], ["edit", "below"], ["edit", "above"]])
      && bounds.every((b) => same(b.g, b.m) && withheld(b.g)), j(bounds.map((b) => b.g !== "threw" && [b.g.frame, b.g.breaks])));
  const shut = [guest({ seed: seed({ bettable: false }) }), guest({ nowMs: NOW + HOUR - 30_000, offsetMs: 60_000 }), guest({ nowMs: NOW + HOUR - 60_000, offsetMs: 0 })];
  ok("1.closed · a seed not taking bets is closed; a phone clock 30 s behind the close on a server one minute ahead is closed; one minute before on the server's clock is still open",
    shut[0] !== "threw" && shut[0].frame === "closed" && shut[1] !== "threw" && shut[1].frame === "closed" && shut[2] !== "threw" && shut[2].frame === "edit"
      && shut.every(withheld), j(shut.map((g) => g !== "threw" && g.frame)));
  const sweep: string[] = [];
  for (const s of [seed(), seed({ bettable: false }), seed({ yesPool: 0, noPool: 0 }), seed({ closesAt: null }), seed({ closesAt: new Date(NOW - 1).toISOString() })])
    for (const text of ["", "0", "1", "499", "500", "5000", "5,000", "TZS 5000", "1000000", "1000001", "12.5", "5000.00", "abc", "-5"])
      for (const side of ["YES", "NO"] as const) {
        const g = guest({ seed: s, stakeText: text, side });
        if (g === "threw" || !["edit", "closed"].includes(g.frame) || !withheld(g) || g.balance.kind === "known" || g.low !== null || g.pending !== null || g.block !== null) sweep.push(`${s.bettable}/${text}/${side}`);
      }
  ok("1.only · across 140 seeds, stakes and sides only edit and closed ever draw: never low, pending, blocked, placing, in doubt or a receipt, never a balance figure, never a commit",
    sweep.length === 0, j(sweep.slice(0, 6)));

  /* §2 · what a door carries */
  const carriedOf = (text: string, s = seed()) => { const g = guest({ seed: s, stakeText: text }); return g === "threw" ? "threw" : safe(() => impl.carried(g)); };
  ok("2.carried · a stake inside the bounds is carried; empty, not whole, below, above and a closed question carry none (Open point 6)",
    j(["5000", "500", String(MAX), "", "12.5", "499", String(MAX + 1)].map((t) => carriedOf(t))) === j([5_000, 500, MAX, null, null, null, null])
      && carriedOf("5000", seed({ bettable: false })) === null);
  const PAGE = `?cat=weather&q=rain&page=2&from=home&ref=50pick-ag-abc123&invite=inv-9&utm_source=agency&utm_campaign=launch&gclid=zz`;
  const carry = safe(() => impl.carry({ pathname: "/", search: PAGE, seedId: MKT, side: "YES", stake: 5_000, nowMs: NOW }));
  const marker = carry && carry !== "threw" ? (JSON.parse(carry.markerRaw) as Record<string, unknown>) : null;
  ok("2.carry · inside the bounds the bet is id.side.stake; the marker is exactly that bet, its time and the page's codes — never a key, never an owner",
    carry !== null && carry !== "threw" && PB.formatBetParam(carry.bet) === `${MKT}.YES.5000` && marker !== null
      && j(Object.keys(marker).sort()) === j(["at", "bet", "invite", "ref", "utm"]) && marker.bet === `${MKT}.YES.5000` && marker.at === NOW
      && marker.ref === "50PICK-AG-ABC123" && marker.invite === "INV-9" && j(marker.utm) === j({ utm_source: "agency", utm_campaign: "launch" })
      && PB.readMarker(carry.markerRaw, NOW)?.k === undefined && PB.readMarker(carry.markerRaw, NOW)?.owner === undefined
      && PB.stakeFromUrl(carry.bet, carry.markerRaw, NOW) === 5_000, j({ carry, marker }));
  ok("2.address · the address left behind is the page with the bet set and every other parameter kept (cat, q, page, from and the codes)",
    carry !== null && carry !== "threw" && carry.address.startsWith("/?")
      && (() => { const q = new URLSearchParams(carry.address.slice(1)); return q.get("bet") === `${MKT}.YES.5000` && q.get("cat") === "weather" && q.get("q") === "rain" && q.get("page") === "2" && q.get("from") === "home" && q.get("ref") === "50pick-ag-abc123" && q.get("invite") === "inv-9"; })(),
    j(carry));
  const nexts = ([["/", MKT], ["/live", MKT], ["/watchlist", MKT], [`/markets/${MKT}`, MKT], [`/markets/${OTHER}`, MKT], ["/positions", MKT]] as const)
    .map(([p, id]) => { const c = safe(() => impl.carry({ pathname: p, search: PAGE, seedId: id, side: "NO", stake: null, nowMs: NOW })); return c && c !== "threw" ? c.next : c; });
  ok("2.next · `next` is the return page and the bet alone: the home, /live, /watchlist and the bet's own page keep their page; a similar-rail tap on question A returns to B's own page (Open point 13); no code, filter or campaign tag rides inside it",
    j(nexts) === j([`/?bet=${MKT}.NO`, `/live?bet=${MKT}.NO`, `/watchlist?bet=${MKT}.NO`, `/markets/${MKT}?bet=${MKT}.NO`, `/markets/${MKT}?bet=${MKT}.NO`, `/markets/${MKT}?bet=${MKT}.NO`]), j(nexts));
  const outside = safe(() => impl.carry({ pathname: "/", search: "", seedId: MKT, side: "YES", stake: null, nowMs: NOW }));
  const refused = [safe(() => impl.carry({ pathname: "/", search: "", seedId: "evil.YES", side: "YES", stake: 5_000, nowMs: NOW })),
    safe(() => impl.carry({ pathname: "/", search: "", seedId: MKT, side: "UP" as never, stake: 5_000, nowMs: NOW }))];
  const oddStakes = [0, -5, 12.5, 1_234_567_890].map((s) => { const c = safe(() => impl.carry({ pathname: "/", search: "", seedId: MKT, side: "YES", stake: s, nowMs: NOW })); return c && c !== "threw" ? PB.formatBetParam(c.bet) : c; });
  ok("2.refuse · outside the bounds the doors carry the side alone; a stake no bet can hold is dropped to the side; a seed id or side the grammar refuses carries nothing",
    outside !== null && outside !== "threw" && PB.formatBetParam(outside.bet) === `${MKT}.YES` && refused.every((r) => r === null)
      && oddStakes.every((s) => s === `${MKT}.YES`), j({ outside, refused, oddStakes }));
  const returns = ([["/", bet(1)], ["/live", bet(1)], ["/watchlist", bet(1)], [`/markets/${MKT}`, bet(1)], [`/markets/${OTHER}`, bet(1)], ["/positions", bet(1)],
    ["/live/", bet(1)], [`/markets/${MKT}?x=1#h`, bet(1)], ["/", { kind: "round", id: "udr_1", side: "UP", stake: null }]] as const)
    .map(([p, b]) => safe(() => impl.ret(p, b as PB.PendingBet)));
  ok("2.return · betReturnPath: the home, /live, /watchlist and the bet's own page are kept; any other page, a trailing slash or a rail's question returns to the bet's own page; a round to its own",
    j(returns) === j(["/", "/live", "/watchlist", `/markets/${MKT}`, `/markets/${MKT}`, `/markets/${MKT}`, `/markets/${MKT}`, `/markets/${MKT}`, "/updown/udr_1"])
      && j(PB.BET_RETURN_PAGES) === j(["/", "/live", "/watchlist"]) && PB.BET_RETURN_PAGES.every((p) => SS.sheetOpensOn(p)), j(returns));

  /* §3 · the door's tail */
  const tail = (next: string, q: string) => { const d = safe(() => impl.doors(next, new URLSearchParams(q))); return d === "threw" ? d : `${d.signIn} | ${d.signUp}`; };
  const both = (t: string) => `/auth/login${t} | /auth/register${t}`;
  const N = `/markets/${MKT}?bet=${MKT}.YES.5000`;
  const rows: Array<[[string, string], string]> = [
    [[N, "ref=50pick-ag-abc123&invite=inv-9"], both(`?next=${encodeURIComponent(N)}&ref=50PICK-AG-ABC123&invite=INV-9`)],
    [[N, "invite=a b"], both(`?next=${encodeURIComponent(N)}&invite=A+B`)],
    [[N, `invite=${"X".repeat(25)}&ref=abc_123`], both(`?next=${encodeURIComponent(N)}`)],
    [[N, "invite=A%00B"], both(`?next=${encodeURIComponent(N)}`)],
    [["/" + "a".repeat(600), "ref=ab12cd"], both("?ref=AB12CD")],
    [["/auth/login", "invite=inv-9"], both("?invite=INV-9")],
    [["//evil.example", ""], both("")],
    [["/\t/evil.example", ""], both("")],
    [["/positions", "ref=ab12cd&invite=inv-9&utm_source=x"], both("?next=%2Fpositions&ref=AB12CD&invite=INV-9")],
  ];
  const tails = rows.map(([[n, q]]) => tail(n, q));
  ok("3.tail · doorHrefsFor: next kept only when bounded (over 512, an /auth page, //evil or a tab trick is dropped, never cut); ref and invite normalised beside it, a spaced invite URL-encoded, an over-long, control-bearing or malformed code dropped; nothing else rides",
    rows.every(([, want], i) => tails[i] === want), j(rows.map(([i, w], k) => [i, w, tails[k]]).filter(([, w, g]) => w !== g)));

  // 3.question-panel · Point for Ali 4 (A8): the classic question page's guest panel ("Ingia ili kutabiri") builds its
  // two doors through the one tail, with the page's own ref AND invite; with no invite its hrefs are byte for byte
  // the ones it built before (the old formula, recomputed here), so a classic guest without a campaign gets the same page.
  const panelAt = decomment(impl.page).indexOf("const betNext = ");
  const panel = panelAt < 0 ? "" : decomment(impl.page).slice(panelAt, decomment(impl.page).indexOf("})()}", panelAt));
  const oldFormula = (next: string, ref: string | null) => `?next=${encodeURIComponent(next)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;
  const QN = `/markets/${MKT}?side=YES`;
  const before = safe(() => impl.doors(QN, new URLSearchParams("ref=50pick-ag-abc123")));
  const withInvite = safe(() => impl.doors(QN, new URLSearchParams("ref=50pick-ag-abc123&invite=inv-9")));
  ok("3.question-panel · the classic question page's guest panel builds both doors through doorHrefsFor with the page's own ref and invite (Point for Ali 4); with no invite its hrefs are exactly the old ones",
    panel.includes("const doors = doorHrefsFor(betNext, codes);") && panel.includes('if (typeof sp.ref === "string") codes.set("ref", sp.ref);')
      && panel.includes('if (typeof sp.invite === "string") codes.set("invite", sp.invite);')
      && panel.includes("href={doors.signUp as never}") && panel.includes("href={doors.signIn as never}")
      && !panel.includes("encodeURIComponent(") && !panel.includes("?next=")
      && before !== "threw" && before.signUp === `/auth/register${oldFormula(QN, "50PICK-AG-ABC123")}` && before.signIn === `/auth/login${oldFormula(QN, "50PICK-AG-ABC123")}`
      && withInvite !== "threw" && withInvite.signUp === `/auth/register${oldFormula(QN, "50PICK-AG-ABC123")}&invite=INV-9`,
    j({ panel: panel.length, before, withInvite }));

  /* §4 · what an address opens */
  const own = (stake: number | null, o: { at?: number; owner?: string; key?: string; id?: string } = {}) =>
    PB.writeMarker(bet(stake, o.id ?? MKT), o.at ?? NOW - HOUR, {}, o.key, o.owner);
  const at = (path: string, q: string, markerRaw: string | null) => safe(() => impl.opens(path, q, markerRaw, NOW));
  const opened = {
    forwarded: at("/", `bet=${MKT}.YES.50000`, null),
    mine: at("/", `bet=${MKT}.YES.5000`, own(5_000)),
    stamped: at("/", `bet=${MKT}.YES.5000`, own(5_000, { owner: "usr_someone" })),
    keyed: at("/", `bet=${MKT}.YES.5000`, own(5_000, { key: KEY })),
    stale: at("/", `bet=${MKT}.YES.5000`, own(5_000, { at: NOW - 24 * HOUR })),
    future: at("/", `bet=${MKT}.YES.5000`, own(5_000, { at: NOW + HOUR })),
    otherStake: at("/", `bet=${MKT}.YES.9000`, own(5_000)),
    side: at(`/markets/${MKT}`, "side=NO&utm_source=agency", null),
  };
  ok("4.opens · a forwarded stake opens at the minimum; this tab's own ownerless, keyless marker under 24 hours old naming the same bet opens at its stake; an owner-stamped, keyed, stale, future-dated or different-stake marker opens at the minimum",
    j(Object.values(opened).map((o) => o !== null && o !== "threw" ? o.stake : o)) === j([null, 5_000, null, null, null, null, null, null]), j(opened));
  ok("4.side · a campaign link's ?side= on a question's own page opens that side at the minimum and closing strips side; ?bet= does not",
    opened.side !== null && opened.side !== "threw" && j(opened.side.bet) === j(bet(null, MKT, "NO")) && opened.side.dropSide === true
      && opened.mine !== null && opened.mine !== "threw" && opened.mine.dropSide === false, j(opened.side));
  const nothing = [at("/wallet/deposit", `bet=${MKT}.YES.5000`, own(5_000)), at("/auth/register", `bet=${MKT}.YES.5000`, null), at("/", "bet=udr_4f1c09aa2d.UP.5000", null),
    at("/", "bet=nonsense", null), at("/", "side=YES", null), at("/positions", `bet=${MKT}.YES`, null)];
  ok("4.nothing · /wallet/*, /auth/*, /positions, a round, a malformed bet and a bare ?side= off a question's page open nothing", nothing.every((n) => n === null), j(nothing));

  /* §5 · one count per visitor open */
  const returned = {
    door: safe(() => impl.returned(own(5_000), bet(5_000), NOW)),
    stamped: safe(() => impl.returned(own(5_000, { owner: "usr_someone" }), bet(5_000), NOW)),
    stakeless: safe(() => impl.returned(own(5_000), bet(null), NOW)),
    keyed: safe(() => impl.returned(own(5_000, { key: KEY }), bet(5_000), NOW)),
    stale: safe(() => impl.returned(own(5_000, { at: NOW - 24 * HOUR }), bet(5_000), NOW)),
    otherBet: safe(() => impl.returned(own(5_000, { id: OTHER }), bet(5_000), NOW)),
    none: safe(() => impl.returned(null, bet(5_000), NOW)),
  };
  ok("5.returned · only a guest door's own marker (ownerless, keyless, under 24 hours, naming the address's bet with its stake) continues a counted open",
    j(Object.values(returned)) === j([true, false, false, false, false, false, false]), j(returned));
  const counts = [
    safe(() => impl.counts({ tapped: true, markerRaw: own(5_000), bet: bet(5_000), nowMs: NOW })),
    safe(() => impl.counts({ tapped: false, markerRaw: own(5_000), bet: bet(5_000), nowMs: NOW })),
    safe(() => impl.counts({ tapped: false, markerRaw: own(5_000, { owner: "usr_someone" }), bet: bet(5_000), nowMs: NOW })),
    safe(() => impl.counts({ tapped: false, markerRaw: null, bet: bet(null), nowMs: NOW })),
  ];
  ok("5.counts · a tap always counts; the return to a visitor's own counted bet does not count twice; a signed-in player's own address open and a reload count as S8 counts them",
    j(counts) === j([true, false, true, true]), j(counts));

  /* §6 · the source */
  const code = decomment(impl.src);
  const imports = [...code.matchAll(/^import[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
  ok("6.imports · guest-sheet.ts imports only ./sheet-state and ./pending-bet", j([...new Set(imports)].sort()) === j(["./pending-bet", "./sheet-state"]), j(imports));
  const clocks = [...code.matchAll(/Date\.now\(|new Date\(|performance\.now|setTimeout|setInterval|\bwindow\b|\bdocument\b|sessionStorage|localStorage|\bfetch\(/g)].map((m) => m[0]);
  ok("6.clock · no clock but the caller's, no timer, window, document, storage or fetch", clocks.length === 0, j(clocks));
  const typed = code.split("\n").filter((l) => {
    const bare = l.replace(/"[^"]*"/g, '""');
    return /%|×/.test(bare) || [...bare.matchAll(/(?<![\w.])(\d[\d_]*)(?![\w.])/g)].some((m) => Number(m[1].replace(/_/g, "")) >= 500);
  });
  ok("6.typed · no rate, multiple or shilling amount is typed: every figure is the engine's", typed.length === 0, j(typed));
  ok("6.client-safe · no server module, server-only, Server Action or Next import", !/from\s+"@\/lib\/server|server-only|"use server"|from\s+"next\//.test(code));
  return failed;
}

if (!PROVE_RED) {
  console.log("guest-sheet — the Vodacom plan S10 WP1 (pure)");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`\nGUEST SHEET — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const plants: Plant[] = [
    // §1
    { name: "the guest's estimate computed by a second formula (stake × the card's multiple)", expect: /^1\.deck /,
      impl: { ...REAL, frame: (i) => { const f = GS.guestFrame(i); return f.estimate && f.stake ? { ...f, estimate: { ...f.estimate, payout: Math.round(f.stake * 2.8) } } : f; } } },
    { name: "the guest frame keeps the money face's commit", expect: /^1\.deck /,
      impl: { ...REAL, frame: (i) => SS.sheetFrame({ ...i, viewer: { state: "failed" }, intent: null, settled: null }) } },
    { name: "an empty side read as no figure for a guest", expect: /^1\.states /,
      impl: { ...REAL, frame: (i) => { const f = GS.guestFrame(i); return f.estimate?.state === "fillsEmptySide" ? { ...f, estimate: { ...f.estimate, payout: null } } : f; } } },
    { name: "a fractional stake rounded to a whole one for a guest", expect: /^1\.bounds /,
      impl: { ...REAL, frame: (i) => GS.guestFrame({ ...i, stakeText: i.stakeText.replace(/\.\d+$/, "") }) } },
    { name: "the guest's closed flip on the phone's clock", expect: /^1\.closed /,
      impl: { ...REAL, frame: (i) => GS.guestFrame({ ...i, offsetMs: 0 }) } },
    { name: "a guest shown the low frame at a zero balance", expect: /^1\.only /,
      impl: { ...REAL, frame: (i) => { const f = SS.sheetFrame({ ...i, viewer: { state: "read", viewer: { spendable: 0, heldSides: [], bonusWager: null, facts: ZERO_WALLET } }, intent: null, settled: null }); return { ...f, cta: null, quote: null, betInsteadQuote: null }; } } },
    // §2
    { name: "a stake below the minimum carried", expect: /^2\.carried /,
      impl: { ...REAL, carried: (f) => (f.frame === "edit" ? f.stake : null) } },
    { name: "the marker stamped with an owner", expect: /^2\.carry /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry(i); return c && { ...c, markerRaw: PB.writeMarker(c.bet, i.nowMs, PB.attributionFrom(new URLSearchParams(i.search)), undefined, "usr_guest") }; } } },
    { name: "the marker carrying a request key", expect: /^2\.carry /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry(i); return c && { ...c, markerRaw: PB.writeMarker(c.bet, i.nowMs, {}, KEY) }; } } },
    { name: "the address rebuilt from the bet alone (the home's filter and page lost)", expect: /^2\.address /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry(i); return c && { ...c, address: `${i.pathname}?bet=${PB.formatBetParam(c.bet)}` }; } } },
    { name: "next keeps the page's whole query (the codes ride inside next)", expect: /^2\.next /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry(i); return c && { ...c, next: c.address }; } } },
    { name: "a similar-rail tap returns to question A, not B's own page", expect: /^2\.next /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry(i); return c && { ...c, next: PB.pendingBetUrl(i.pathname, c.bet) }; } } },
    { name: "a stake no bet can hold written into the bet", expect: /^2\.refuse /,
      impl: { ...REAL, carry: (i) => { const c = GS.guestCarry({ ...i, stake: null }); return c && i.stake !== null && i.stake !== 0 ? { ...c, bet: { ...c.bet, stake: i.stake } } : c; } } },
    { name: "betReturnPath keeps every page (a rail tap stays on question A)", expect: /^2\.return /,
      impl: { ...REAL, ret: (p) => String(p).split("?")[0].split("#")[0] } },
    // §3
    { name: "the tail cuts an over-long next instead of refusing it", expect: /^3\.tail /,
      impl: { ...REAL, doors: (n, s) => AL.doorHrefsFor(n.slice(0, 512), s) } },
    { name: "the tail passes the invite un-normalised", expect: /^3\.tail /,
      impl: { ...REAL, doors: (n, s) => { const d = AL.doorHrefsFor(n, s); const raw = s.get("invite"); if (raw === null) return d; const fix = (h: string) => { const at = h.indexOf("?"); const q = new URLSearchParams(at < 0 ? "" : h.slice(at + 1)); q.set("invite", raw); return `${at < 0 ? h : h.slice(0, at)}?${q}`; }; return { signIn: fix(d.signIn), signUp: fix(d.signUp) }; } } },
    { name: "the classic question panel drops the invite again", expect: /^3\.question-panel /,
      impl: { ...REAL, page: PAGE_SRC.replace('if (typeof sp.invite === "string") codes.set("invite", sp.invite);', "") } },
    { name: "the classic question panel hand-builds its query again", expect: /^3\.question-panel /,
      impl: { ...REAL, page: PAGE_SRC.replace("href={doors.signUp as never}", "href={`/auth/register?next=${encodeURIComponent(betNext)}` as never}") } },
    { name: "the tail encodes next differently from the classic panel's old bytes", expect: /^3\.question-panel /,
      impl: { ...REAL, doors: (n, q) => { const d = AL.doorHrefsFor(n, q); return { signIn: d.signIn.replaceAll("%2F", "/"), signUp: d.signUp.replaceAll("%2F", "/") }; } } },
    { name: "the tail forgets the invite", expect: /^3\.tail /,
      impl: { ...REAL, doors: (n, s) => { const q = new URLSearchParams(s); q.delete("invite"); return AL.doorHrefsFor(n, q); } } },
    // §4
    { name: "a forwarded link's stake prefilled (a shared link sets the stake)", expect: /^4\.opens /,
      impl: { ...REAL, opens: (p, s, m, n) => { const o = GS.guestOpensFrom(p, s, m, n); return o && { ...o, stake: o.bet.stake }; } } },
    { name: "a signed-in account's own marker prefills a guest", expect: /^4\.opens /,
      impl: { ...REAL, opens: (p, s, m, n) => { const o = GS.guestOpensFrom(p, s, m, n); const r = PB.readMarker(m, n); return o && r && !r.k && r.bet === PB.formatBetParam(o.bet) ? { ...o, stake: o.bet.stake } : o; } } },
    { name: "closing a campaign link's sheet leaves ?side= behind", expect: /^4\.side /,
      impl: { ...REAL, opens: (p, s, m, n) => { const o = GS.guestOpensFrom(p, s, m, n); return o && { ...o, dropSide: false }; } } },
    { name: "?bet= opens a sheet on /wallet/deposit", expect: /^4\.nothing /,
      impl: { ...REAL, opens: (p, s, m, n) => GS.guestOpensFrom(p.startsWith("/wallet") ? "/" : p, s, m, n) } },
    // §5
    { name: "an owner-stamped marker read as a visitor's return (a signed-in open never counted)", expect: /^5\.returned /,
      impl: { ...REAL, returned: (m, b, n) => { const r = PB.readMarker(m, n); return !!b && b.stake !== null && !!r && !r.k && r.bet === PB.formatBetParam(b); } } },
    { name: "the return counted twice", expect: /^5\.counts /,
      impl: { ...REAL, counts: () => true } },
    // §6
    { name: "a storage read inside the pure module", expect: /^6\.clock /,
      impl: { ...REAL, src: SOURCE + "\nexport const peek = () => sessionStorage.getItem(\"kp-pending-bet\");\n" } },
    { name: "a server import in the pure module", expect: /^6\.client-safe /,
      impl: { ...REAL, src: SOURCE.replace('from "./pending-bet";', 'from "./pending-bet";\nimport { db } from "@/lib/server/store";') } },
    { name: "a shilling amount typed into the module", expect: /^6\.typed /,
      impl: { ...REAL, src: SOURCE + "\nexport const GUEST_MIN = 1_000;\n" } },
    { name: "a third import in the pure module", expect: /^6\.imports /,
      impl: { ...REAL, src: SOURCE.replace('from "./pending-bet";', 'from "./pending-bet";\nimport { sendFunnel } from "./funnel-beacon";') } },
  ];
  let caught = 0, failN = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) failN++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = run(REAL, quiet);
  ok("the REAL module passes every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = run(p.impl, quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  const labels: string[] = [];
  run(REAL, (l) => { const m = /^\s+PASS (\S+)/.exec(l); if (m) labels.push(m[1]); });
  const planted = new Set(plants.map((p) => p.expect.source.replace(/^\^/, "").replace(/\\\./g, ".").replace(/ $/, "")));
  const orphans = labels.filter((l) => !planted.has(l));
  ok(`every one of the ${labels.length} checks has a plant`, orphans.length === 0, orphans.join(", "));
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${failN === 0 ? "" : ` · ${failN} FAILED`}\n`);
  process.exitCode = failN === 0 ? 0 : 1;
}
