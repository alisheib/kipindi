/** MB-89: independently answered tickets share one reviewed, atomic purchase and one complete receipt. Pure; no money writes. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  addSlip, firstIncompleteSlip, newSlipDraft, parseSlipDraft, pickInDraft, removeActiveSlip, selectSlip,
  slipComplete, slipTotal,
} from "../src/lib/millionea-slip-draft.ts";
import { SLOT_COUNT } from "../src/lib/maswali-score.ts";

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
  if (!c.includes('if (closed || total === null) return;') || !c.includes('const incomplete = firstIncompleteSlip(draftRef.current);') || !c.includes('if (incomplete >= 0) {')) d.push("an incomplete ticket can open the money confirm");
  if (!c.includes('if (hiddenSlots.includes(slot)) return;')) d.push("a player can change a sealed void answer");
  if (!c.includes('const allowed = Math.max(0, cap - held);') || !c.includes('if (draftRef.current.slips.length > allowed) {')
    || !c.includes('draftRef.current.slips.length > allowed || pending') || !c.includes('count < allowed')) d.push("a stale or exhausted allowance can be confirmed");
  if (!c.includes('r.data.tickets.length === slips.length') || !c.includes('r.data.tickets.map((ticket) => ticket.serial)') || !c.includes('cut.serials.map((serial, i) =>')) d.push("the result drops a ticket serial");
  if (!c.includes('Math.max(0, (total ?? price) - fundsNow)') || !c.includes('setLowBalance(balance !== null && balance < total)') || !c.includes('price={total ?? price}')) d.push("the confirmation or deposit shortfall uses one-ticket money");
  if (!c.includes('slips={draft.slips}') || !sheet.includes('slips?.map((slip, i) => (') || !sheet.includes('<PicksList questions={questions} picks={slip} />')) d.push("the review omits independently answered tickets");
  if (!sheet.includes('fill(t.millionea.ticketsOfCap, { from: formatNumber(ticketNumber), to: formatNumber(ticketNumber + count - 1), cap: formatNumber(cap) })')
    || !sheet.includes('fill(many ? t.millionea.cutTickets : t.millionea.cutTicket')) d.push("the one commit does not name the full range and charge");
  return d;
}
ok("the client sends the batch once and the one confirm and result name every ticket and the total", wiringDefects(client, confirm).length === 0);

if (process.argv.includes("--prove-red")) {
  const plant = (source: string, from: string, to: string) => {
    if (!source.includes(from)) throw new Error(`Missing mutation target: ${from}`);
    return source.replace(from, to);
  };
  ok("RED: sending only the active ticket is caught", wiringDefects(plant(client, 'fd.set("slips", JSON.stringify(slips));', 'fd.set("slips", JSON.stringify([picks]));'), confirm).some((d) => d.includes("every independent")));
  ok("RED: reopening a confirm with a fresh key is caught", wiringDefects(plant(client, 'requestId.current ??= newRequestId();', 'requestId.current = newRequestId();'), confirm).some((d) => d.includes("stable single")));
  ok("RED: presenting only the first serial is caught", wiringDefects(plant(client, 'cut.serials.map((serial, i) =>', 'cut.serials.slice(0, 1).map((serial, i) =>'), confirm).some((d) => d.includes("drops a ticket")));
  ok("RED: at the cap an extra ticket cannot be treated as allowed", wiringDefects(plant(client, 'Math.max(0, cap - held)', 'Math.max(1, cap - held)'), confirm).some((d) => d.includes("exhausted allowance")));
  ok("RED: charging one ticket in the review is caught", wiringDefects(plant(client, 'price={total ?? price}', 'price={price}'), confirm).some((d) => d.includes("one-ticket money")));
  ok("RED: hiding a ticket's picks from confirmation is caught", wiringDefects(client, plant(confirm, 'slips?.map((slip, i) => (', 'slips?.slice(0, 1).map((slip, i) => (')).some((d) => d.includes("review omits")));
}

console.log(`\nmaswali-multi-slip: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
