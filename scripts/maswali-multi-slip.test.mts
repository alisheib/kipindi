/** MB-89: independently answered tickets share one reviewed, atomic purchase and one complete receipt. Pure; no money writes. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  addSlip, firstIncompleteSlip, newSlipDraft, parseSlipDraft, pickInDraft, removeActiveSlip, selectSlip,
  slipComplete, slipTotal,
} from "../src/lib/millionea-slip-draft.ts";
import { SLOT_COUNT } from "../src/lib/maswali-score.ts";
import { millioneaFreeCancelEnd } from "../src/lib/millionea-free-cancel.ts";
import { exitWindowFacts } from "../src/lib/exit-window.ts";

let passed = 0, failed = 0;
function ok(label: string, holds: boolean) {
  console.log(`${holds ? "PASS" : "FAIL"} ${label}`);
  holds ? passed++ : failed++;
}

const own = newSlipDraft([], "YES");
ok("one empty draft opens as one ticket with fifteen unanswered slots", own.slips.length === 1 && firstIncompleteSlip(own) === 0 && own.slips[0].every((p) => p === null));
const two = addSlip(own, [], "YES", 2);
const firstYes = selectSlip(pickInDraft(selectSlip(two, 0), 1, "YES"), 1);
const secondNo = pickInDraft(firstYes, 1, "NO");
ok("ticket one and ticket two hold different answers at the same slot", secondNo.slips[0][0] === "YES" && secondNo.slips[1][0] === "NO");
ok("a third ticket is refused at the remaining cap", addSlip(secondNo, [], "YES", 2) === secondNo);
const restored = parseSlipDraft(JSON.parse(JSON.stringify(secondNo)) as unknown, [], "YES", 2);
ok("reload or deposit return restores both independent slips and the active ticket", restored?.active === 1 && restored.slips[0][0] === "YES" && restored.slips[1][0] === "NO");
ok("a legacy single ticket survives this release", parseSlipDraft(Array.from({ length: SLOT_COUNT }, (_, i) => i === 0 ? "NO" : null), [], "YES", 2)?.slips[0][0] === "NO");
ok("tampered picks and an over-cap stored batch are refused", parseSlipDraft({ v: 2, active: 0, slips: [[...Array(SLOT_COUNT - 1).fill(null), "MAYBE"]] }, [], "YES", 2) === null
  && parseSlipDraft(JSON.parse(JSON.stringify(secondNo)) as unknown, [], "YES", 1) === null);
const hidden = parseSlipDraft({ v: 2, active: 0, slips: [Array(SLOT_COUNT).fill(null)] }, [2], "NO", 2);
ok("a sealed void slot uses the server's fixed answer on restore", hidden?.slips[0][1] === "NO");
ok("a player cannot change a sealed void slot through the composer guard", hidden?.slips[0][1] === "NO" && secondNo.slips[0][1] === null);
let both = secondNo;
for (let ticket = 0; ticket < 2; ticket++) {
  both = selectSlip(both, ticket);
  for (let slot = 1; slot <= SLOT_COUNT; slot++) both = pickInDraft(both, slot, ticket === 0 ? "YES" : "NO");
}
ok("one incomplete ticket blocks the whole batch", firstIncompleteSlip(secondNo) === 0 && !slipComplete(secondNo.slips[1]));
ok("two fully answered, different tickets can reach one confirmation", firstIncompleteSlip(both) === -1 && both.slips[0].every((p) => p === "YES") && both.slips[1].every((p) => p === "NO"));
ok("removing the active ticket preserves the other answers and moves the active index", removeActiveSlip(both).slips.length === 1 && removeActiveSlip(both).slips[0][0] === "YES" && removeActiveSlip(both).active === 0);
ok("the display charge is the exact count times frozen price, including the shortfall arithmetic", slipTotal(1_000, 2) === 2_000 && 2_000 - 1_500 === 500 && slipTotal(Number.MAX_SAFE_INTEGER, 2) === null);

const client = readFileSync(join("src", "app", "millionea", "slip", "slip-client.tsx"), "utf8");
const confirm = readFileSync(join("src", "components", "maswali", "maswali-slip.tsx"), "utf8");
function wiringDefects(c: string, sheet: string): string[] {
  const d: string[] = [];
  if (!c.includes('fd.set("slips", JSON.stringify(slips));') || !c.includes('const slips = draftRef.current.slips.map((slip) => [...slip]);')) d.push("the buy does not send every independent ticket");
  if (!c.includes('requestId.current ??= newRequestId();') || !c.includes('fd.set("idempotencyKey", key);') || !c.includes('const key = requestId.current ?? (requestId.current = newRequestId());')) d.push("the batch has no stable single request key");
  // RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-SLIP, H3): an unanswered ticket opens at its first question instead.
  if (!c.includes('if (closed || total === null) return;') || !c.includes('const unfinished = firstIncompleteSlip(draftRef.current);') || !c.includes('if (unfinished >= 0) { goToTicket(unfinished, true); return; }')) d.push("an incomplete ticket can open the money confirm");
  if (!c.includes('if (hiddenSlots.includes(slot)) return;')) d.push("a player can change a sealed void answer");
  if (!c.includes('const allowed = Math.max(0, cap - held);') || !c.includes('if (draftRef.current.slips.length > allowed) {')
    || !c.includes('draftRef.current.slips.length > allowed || pending') || !c.includes('count < allowed')) d.push("a stale or exhausted allowance can be confirmed");
  if (!c.includes('r.data.tickets.length === slips.length') || !c.includes('r.data.tickets.map((ticket) => ticket.serial)') || !c.includes('stamp.serials.map((serial, i) =>')) d.push("the result drops a ticket serial");
  // RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-SLIP, H4): the deposit is the shortfall plan's for the whole total.
  if (!c.includes('slipShortfall(depositFacts, fundsNow, total, Date.now())') || !c.includes('setLowBalance(balance !== null && balance < total)') || !c.includes('total={total ?? price}')) d.push("the confirmation or deposit shortfall uses one-ticket money");
  if (!c.includes('slips={draft.slips}') || !sheet.includes('slips?.map((slip, i) => (') || !sheet.includes('<PicksList questions={questions} picks={slip} />')) d.push("the review omits independently answered tickets");
  if (!sheet.includes('fill(t.millionea.ticketsOfCap, { from: formatNumber(ticketNumber), to: formatNumber(ticketNumber + count - 1), cap: formatNumber(cap) })')
    || !sheet.includes('fill(many ? t.millionea.cutTickets : t.millionea.cutTicket')) d.push("the one commit does not name the full range and charge");
  return d;
}
ok("the client sends the batch once and the one confirm and result name every ticket and the total", wiringDefects(client, confirm).length === 0);

// ── S5-FIX-PLAYER P1 · the confirm sheet's free cancel is asked of NOW, on every tick — never a time fixed at the render ──
const MIN = 60_000;
const CLOSE = Date.parse("2026-12-04T15:00:00.000Z"); // Friday 18:00 EAT
type FreeCancel = typeof millioneaFreeCancelEnd;
/** The one rule's table: `cancelMaswaliTicket`'s test — the runway (a grace above zero fitted before the close), the end at
 *  the earlier of the grace's end and the close as it stands now. */
function ruleDefects(rule: FreeCancel): string[] {
  const d: string[] = [];
  const cases: Array<[string, number, number, number, number | null]> = [
    ["twelve minutes before the close: placed + 5", CLOSE - 12 * MIN, CLOSE, 5, CLOSE - 7 * MIN],
    ["exactly the grace before the close: the runway holds, it ends at the close", CLOSE - 5 * MIN, CLOSE, 5, CLOSE],
    ["one second short of the runway: none", CLOSE - 5 * MIN + 1_000, CLOSE, 5, null],
    ["a grace of zero: none", CLOSE - 60 * MIN, CLOSE, 0, null],
  ];
  for (const [name, placed, close, grace, want] of cases) { const got = rule(placed, close, close, grace); if (got !== want) d.push(`${name}: ${got}`); }
  const moved = rule(CLOSE - 12 * MIN, CLOSE, CLOSE - 9 * MIN, 5);
  if (moved !== CLOSE - 9 * MIN) d.push(`a close moved earlier ends the window there: ${moved}`);
  for (let placed = CLOSE - 30 * MIN; placed <= CLOSE; placed += 15_000) {
    const facts = exitWindowFacts({ placedAtMs: placed, closesAtMs: CLOSE, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 });
    if ((rule(placed, CLOSE, CLOSE, 5) !== null) !== facts.hadRunway) { d.push(`the runway disagrees with the exit formula at close − ${(CLOSE - placed) / 1000}s`); break; }
  }
  return d;
}
/** The sheet over time: rendered 40 minutes before the close, open at every 30 s from then to the close. Each promise the
 *  sheet makes is the rule asked of THAT instant: still ahead (never a past time), and none in the last five minutes. */
function sheetDefects(rule: FreeCancel, askedAt: (renderMs: number, nowMs: number) => number): string[] {
  const d: string[] = [];
  const render = CLOSE - 40 * MIN;
  for (let now = render; now <= CLOSE; now += 30_000) {
    const until = rule(askedAt(render, now), CLOSE, CLOSE, 5);
    const runway = CLOSE - now >= 5 * MIN;
    if (runway && (until === null || until <= now)) { d.push(`close − ${(CLOSE - now) / MIN}min: promised ${until === null ? "none" : `${(until - now) / 1000}s from now`}`); break; }
    if (!runway && until !== null) { d.push(`close − ${(CLOSE - now) / 1000}s: a free cancel promised with no runway left`); break; }
  }
  return d;
}
/** RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-SLIP, the slip critic's M12): the sheet asks the rule itself, of the
 *  server-aligned NOW (`useServerNowGated`: only while it is open, drawn again only when the answer's minute moves) — the
 *  composer hands it the render's server instant and the week's grace, and no longer re-renders every second for it. */
function liveDefects(c: string, sheet: string, player: string, page: string): string[] {
  const d: string[] = [];
  if (!sheet.includes("const now = useServerNowGated(serverNow, (n) => (open ?")) d.push("the sheet is not given the server-aligned instant");
  if (!sheet.includes("const endAt = (now: number) => millioneaFreeCancelEnd(now, closesAt, closesAt, minutes);") || !sheet.includes("return open && now !== null ? endAt(now) : null;")) d.push("the sheet's free cancel is not the rule asked of now");
  if (!sheet.includes("const cancelUntil = useFreeCancel(open, serverNow, closesAt, freeCancelMinutes);") || !c.includes("serverNow={serverNow}") || !c.includes("freeCancelMinutes={freeCancelMinutes}")) d.push("the sheet is not handed the live answer");
  if (/cancelIfBoughtNow/.test(c + sheet + player + page)) d.push("a free cancel fixed at the render is still read");
  if (!player.includes("const end = millioneaFreeCancelEnd(placedMs, closeAtPurchaseMs, closeNowMs, graceMinutes);")) d.push("the server's window is not the same rule");
  if (!player.includes("held, balance, freeCancelMinutes: terms.freeCancelMinutes, refusal,") || !page.includes("freeCancelMinutes={slip.freeCancelMinutes}")) d.push("the week's frozen grace does not reach the slip");
  return d;
}
const player = readFileSync(join("src", "lib", "server", "maswali-player.ts"), "utf8");
const slipPage = readFileSync(join("src", "app", "millionea", "slip", "page.tsx"), "utf8");
ok("P1 · the free cancel's one rule: placed + grace with the runway, the close's end when it moved earlier, none one second short of the runway or with no grace — and the runway is the platform's exit formula's, to the second", ruleDefects(millioneaFreeCancelEnd).length === 0);
ok("P1 · the confirm sheet over forty minutes: each promise is asked of that instant — always still ahead, and none in the last five minutes before the close", sheetDefects(millioneaFreeCancelEnd, (_render, now) => now).length === 0);
ok("P1 · the sheet asks the rule of the server-aligned NOW while it is open; the server's own window is the same rule; the week's frozen grace reaches the slip; nothing fixed at the render is read", liveDefects(client, confirm, player, slipPage).length === 0);

if (process.argv.includes("--prove-red")) {
  const plant = (source: string, from: string, to: string) => {
    if (!source.includes(from)) throw new Error(`Missing mutation target: ${from}`);
    return source.replace(from, to);
  };
  ok("RED: sending only the active ticket is caught", wiringDefects(plant(client, 'fd.set("slips", JSON.stringify(slips));', 'fd.set("slips", JSON.stringify([picks]));'), confirm).some((d) => d.includes("every independent")));
  ok("RED: reopening a confirm with a fresh key is caught", wiringDefects(plant(client, 'requestId.current ??= newRequestId();', 'requestId.current = newRequestId();'), confirm).some((d) => d.includes("stable single")));
  ok("RED: presenting only the first serial is caught", wiringDefects(plant(client, 'stamp.serials.map((serial, i) =>', 'stamp.serials.slice(0, 1).map((serial, i) =>'), confirm).some((d) => d.includes("drops a ticket")));
  ok("RED: at the cap an extra ticket cannot be treated as allowed", wiringDefects(plant(client, 'Math.max(0, cap - held)', 'Math.max(1, cap - held)'), confirm).some((d) => d.includes("exhausted allowance")));
  ok("RED: charging one ticket in the review is caught", wiringDefects(plant(client, 'total={total ?? price}', 'total={price}'), confirm).some((d) => d.includes("one-ticket money")));
  ok("RED: hiding a ticket's picks from confirmation is caught", wiringDefects(client, plant(confirm, 'slips?.map((slip, i) => (', 'slips?.slice(0, 1).map((slip, i) => (')).some((d) => d.includes("review omits")));
  // P1's plants: the promise fixed at the render (the defect), a rule that forgets the runway, a sheet fed the render's instant.
  ok("RED: P1 · the sheet promising the time its page rendered is caught — a promise already past, and one with no runway left",
    sheetDefects(millioneaFreeCancelEnd, (render) => render).length > 0);
  ok("RED: P1 · a rule that forgets the runway is caught", ruleDefects((placed, _close, closeNow, grace) => (grace > 0 ? Math.min(placed + grace * MIN, closeNow) : null)).length > 0);
  ok("RED: P1 · the sheet asking the rule of the render's instant is caught",
    liveDefects(client, plant(confirm, "return open && now !== null ? endAt(now) : null;", "return open && now !== null ? endAt(serverNow) : null;"), player, slipPage).some((d) => d.includes("asked of now")));
}

console.log(`\nmaswali-multi-slip: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
