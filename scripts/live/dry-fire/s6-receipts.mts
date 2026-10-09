/**
 * SCENARIO 6 · RECEIPTS — delivery receipts for a sample, through the REAL route (`/api/webhooks/blackball`), the way the vendor
 * posts them (`{statuses:[…]}`, the shared secret in the query): DELIVRD · UNDELIV · EXPIRED, a reference nobody sent, a line
 * posted twice, a verdict arriving out of order, an unmapped token, a wrong number, no number, a wrong secret.
 *
 * What must hold: a recipient's status moves FORWARD only — SENT or UNCONFIRMED (or a claim) to DELIVERED or FAILED, and nothing
 * else — never back to PENDING, never DELIVERED ↔ FAILED; a replay changes nothing; a late receipt settles a row the engine had
 * left UNCONFIRMED; a line that does not vouch for the message's own number never moves a recipient; the reply is always exactly
 * `{"status":"Ok"}`; and one `sms.dlr.received` audit row per callback that carried lines.
 */
import { claimNow, drive, postReceipts, resume } from "./core.mts";
import type { Harness, ReceiptLine } from "./core.mts";
import { launch, statusCounts, statusLine } from "./helpers.mts";
import { json, makeRng, num } from "./kit.mts";
import type { SmsCampaignRecipientStatus, StoredSmsCampaignRecipient } from "../../../src/lib/server/store.ts";

const ALLOWED: Record<SmsCampaignRecipientStatus, SmsCampaignRecipientStatus[]> = {
  PENDING: ["PENDING", "HELD", "SENT", "DELIVERED", "FAILED", "SKIPPED", "UNCONFIRMED"],
  HELD: ["HELD", "PENDING"],
  SENT: ["SENT", "DELIVERED", "FAILED"],
  UNCONFIRMED: ["UNCONFIRMED", "DELIVERED", "FAILED"],
  DELIVERED: ["DELIVERED"],
  FAILED: ["FAILED"],
  SKIPPED: ["SKIPPED"],
};

const OK_BODY = JSON.stringify({ status: "Ok" });

export async function receipts(h: Harness, n: number): Promise<Record<string, unknown>> {
  const { S } = h;
  const A = h.fresh("A");
  h.carrier.setBalance(2_000_000);
  const L = await launch(h, A, { key: "s6", scn: 6, label: "receipts", n });
  const id = L.campaign.id;
  const rng = makeRng(h.seed, "scenario/receipts");

  // two lost replies first, so some people are UNCONFIRMED (a late receipt may settle them)
  h.carrier.setPlan(({ nth }) => (nth(id) <= 2 ? { kind: "lost", carrierHasIt: true } : null));
  for (let i = 0; i < 2; i++) {
    await drive(h, A, id, {});
    await resume(h, A, id);
  }
  h.carrier.setPlan(null);
  await drive(h, A, id, {});
  const rows0 = await h.reader.recipients(id);
  const before = new Map(rows0.map((r) => [r.id, r]));
  const sent = rng.shuffle(rows0.filter((r) => r.status === "SENT"));
  const unconf = rng.shuffle(rows0.filter((r) => r.status === "UNCONFIRMED"));
  const take = <T,>(xs: T[], k: number): T[] => xs.splice(0, Math.min(k, xs.length));
  const g = {
    delivered: take(sent, Math.ceil(sent.length * 0.45)),
    undeliv: take(sent, Math.ceil(sent.length * 0.1)),
    expired: take(sent, Math.ceil(sent.length * 0.05)),
    orderFailFirst: take(sent, 8),
    orderDelivFirst: take(sent, 8),
    unmapped: take(sent, 5),
    wrongNumber: take(sent, 5),
    noNumber: take(sent, 5),
    lateDelivered: take(unconf, Math.ceil(unconf.length * 0.5)),
    lateFailed: take(unconf, Math.ceil(unconf.length * 0.25)),
  };
  const line = (r: StoredSmsCampaignRecipient, status: string, description: string | null, msisdn: string | null = r.msisdn): ReceiptLine => {
    const out: ReceiptLine = { status, reference: r.smsReference as string, description: description ?? "" };
    if (msisdn !== null) out.msisdn = msisdn;
    return out;
  };
  const posts: { lines: number; status: number; body: string }[] = [];
  // after EVERY callback every recipient is read again: a status may only ever move forward, step by step — a row that flips to FAILED and
  // back to DELIVERED would look like a plain SENT → DELIVERED at the end
  const lastSeen = new Map(rows0.map((r) => [r.id, r.status]));
  const flips: string[] = [];
  const watch = async (what: string): Promise<void> => {
    for (const r of await h.reader.recipients(id)) {
      const was = lastSeen.get(r.id);
      if (was !== undefined && !ALLOWED[was].includes(r.status)) flips.push(`${was} → ${r.status} (${what})`);
      lastSeen.set(r.id, r.status);
    }
  };
  const post = async (lines: ReceiptLine[], o: { token?: string | null } = {}): Promise<void> => {
    const res = await postReceipts(h, lines, o);
    posts.push({ lines: lines.length, status: res.status, body: res.body });
    await watch(`callback ${posts.length}`);
  };
  // the vendor posts several lines to a callback; chunk each group in threes and fifties alike
  const chunked = async (lines: ReceiptLine[]): Promise<void> => {
    for (let i = 0; i < lines.length; ) {
      const k = rng.chance(0.5) ? 3 : rng.int(1, 50);
      await post(lines.slice(i, i + k));
      i += k;
    }
  };

  await chunked(g.delivered.map((r) => line(r, "DELIVRD", "Success")));
  await chunked(g.undeliv.map((r, i) => line(r, "UNDELIV", i === 0 ? "handset 0712345678 unreachable" : "Undeliverable")));
  await chunked(g.expired.map((r) => line(r, "EXPIRED", "Validity period expired")));
  await chunked(g.lateDelivered.map((r) => line(r, "DELIVRD", "Success")));
  await chunked(g.lateFailed.map((r) => line(r, "UNDELIV", "Undeliverable")));
  // a reference nobody sent
  await post(Array.from({ length: 10 }, (_, i) => ({ status: "DELIVRD", reference: `sms_${"0123456789abcdef".repeat(2).slice(i, i + 24).padEnd(24, "0")}`, description: "Success", msisdn: "255789999901" })));
  // a replay of the whole delivered group
  const replayFrom = h.carrier.requests.length;
  await chunked(g.delivered.map((r) => line(r, "DELIVRD", "Success")));
  // out of order: the failure first, then the delivery — and the other way round
  await post(g.orderFailFirst.map((r) => line(r, "UNDELIV", "Undeliverable")));
  await post(g.orderFailFirst.map((r) => line(r, "DELIVRD", "Success")));
  await post(g.orderDelivFirst.map((r) => line(r, "DELIVRD", "Success")));
  await post(g.orderDelivFirst.map((r) => line(r, "UNDELIV", "Undeliverable")));
  // a token the vendor never listed, and "SENT" (received by the network, not yet a verdict)
  await post(g.unmapped.map((r, i) => line(r, i % 2 === 0 ? "SENT" : "QUEUED", "in the network")));
  // a line for ANOTHER number, and a line with no number at all
  await post(g.wrongNumber.map((r) => line(r, "DELIVRD", "Success", "255789999901")));
  await post(g.noNumber.map((r) => line(r, "DELIVRD", "Success", null)));
  // the wrong secret, and no secret
  const bad = await postReceipts(h, [line(g.delivered[0], "UNDELIV", "forged")], { token: "not-the-secret-0123456789" });
  const none = await postReceipts(h, [line(g.delivered[0], "UNDELIV", "forged")], { token: null });
  await watch("the forged callbacks");

  const rows1 = await h.reader.recipients(id);
  const after = new Map(rows1.map((r) => [r.id, r]));
  const statusOf = (r: StoredSmsCampaignRecipient): SmsCampaignRecipientStatus | undefined => after.get(r.id)?.status;
  const all = (xs: StoredSmsCampaignRecipient[], s: SmsCampaignRecipientStatus): boolean => xs.every((r) => statusOf(r) === s);
  const counts = statusCounts(rows1);

  claimNow(h, "S6.delivered", "DELIVRD moves SENT → DELIVERED with the receipt's instant, once the line carries the message's own number", all(g.delivered, "DELIVERED") && g.delivered.every((r) => after.get(r.id)?.deliveredAt != null), `${g.delivered.length} people DELIVERED`);
  claimNow(h, "S6.failed", "UNDELIV and EXPIRED move SENT → FAILED with the class `receipt:<token>`; a phone number in the vendor's words is scrubbed before it is kept",
    all(g.undeliv, "FAILED") && all(g.expired, "FAILED") && g.undeliv.every((r) => after.get(r.id)?.failureClass === "receipt:UNDELIV") && g.expired.every((r) => after.get(r.id)?.failureClass === "receipt:EXPIRED")
    && [...g.undeliv, ...g.expired].every((r) => !/[0-9]{9,}/.test(after.get(r.id)?.error ?? "")),
    `${g.undeliv.length} UNDELIV + ${g.expired.length} EXPIRED FAILED; the first UNDELIV's words: "${(after.get(g.undeliv[0]?.id)?.error ?? "").slice(0, 40)}"`);
  claimNow(h, "S6.late", "a late receipt settles a row the engine had left UNCONFIRMED (its answer never came): DELIVRD → DELIVERED, UNDELIV → FAILED; the rest stay UNCONFIRMED",
    all(g.lateDelivered, "DELIVERED") && all(g.lateFailed, "FAILED") && unconf.every((r) => statusOf(r) === "UNCONFIRMED"),
    `${g.lateDelivered.length} → DELIVERED, ${g.lateFailed.length} → FAILED, ${unconf.length} still UNCONFIRMED (no receipt)`);
  claimNow(h, "S6.duplicate", "a replay of the whole delivered group changes nothing: the same people DELIVERED, none moved twice", all(g.delivered, "DELIVERED") && replayFrom === h.carrier.requests.length, `${g.delivered.length} lines posted again`);
  claimNow(h, "S6.order", "out of order, the FIRST verdict stands: a failure then a delivery stays FAILED, a delivery then a failure stays DELIVERED — never back, never across",
    all(g.orderFailFirst, "FAILED") && all(g.orderDelivFirst, "DELIVERED"), `${g.orderFailFirst.length} FAILED-first stay FAILED, ${g.orderDelivFirst.length} DELIVERED-first stay DELIVERED`);
  claimNow(h, "S6.unmapped", "a token the vendor never listed (SENT, QUEUED) moves nothing — it is recorded, never guessed as a delivery", all(g.unmapped, "SENT"), `${g.unmapped.length} people still SENT`);
  claimNow(h, "S6.identity", "a line carrying ANOTHER number moves nothing; a campaign line carrying NO number settles the message but never the recipient",
    all(g.wrongNumber, "SENT") && all(g.noNumber, "SENT"), `${g.wrongNumber.length} wrong-number lines and ${g.noNumber.length} no-number lines left their recipients SENT`);
  claimNow(h, "S6.auth", "a callback with the wrong secret, or none, is refused (401) and changes nothing", bad.status === 401 && none.status === 401 && statusOf(g.delivered[0]) === "DELIVERED", `wrong secret → ${bad.status}, no secret → ${none.status}`);
  claimNow(h, "S6.reply", "every authorised callback is answered with exactly the vendor's reply, status Ok (200, nothing else in the body) — whatever its lines were", posts.every((p) => p.status === 200 && p.body === OK_BODY), `${posts.length} callbacks, ${num(posts.reduce((a, p) => a + p.lines, 0))} lines`);

  // forward only, for every recipient of the campaign
  const backwards: string[] = [];
  for (const [rid, b] of before) {
    const a = after.get(rid);
    if (a === undefined || !ALLOWED[b.status].includes(a.status)) backwards.push(`${b.status} → ${a?.status}`);
  }
  claimNow(h, "S6.forward", "every recipient's status only ever moved forward, callback by callback — to DELIVERED or FAILED from SENT or UNCONFIRMED, never across, never back to PENDING", backwards.length === 0 && flips.length === 0, backwards.length === 0 && flips.length === 0 ? `${num(before.size)} rows checked after each of ${posts.length + 2} callbacks` : [...new Set([...backwards, ...flips])].slice(0, 4).join(", "));

  const audit = (await h.reader.audit(h.startedAt)).filter((e) => e.action === "sms.dlr.received");
  const withLines = posts.filter((p) => p.lines > 0).length;
  claimNow(h, "S6.audit", "one `sms.dlr.received` audit row per authorised callback that carried lines", audit.length === withLines, `${withLines} callbacks, ${audit.length} audit rows`);

  const view = await S.live.campaignLiveView(id, h.viewer, A.viewDeps());
  void view;
  return { people: L.world.people.length, rows: rows1.length, groups: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.length])), posts: posts.length, lines: posts.reduce((a, p) => a + p.lines, 0), final: statusLine(counts), summary: json(counts) };
}
