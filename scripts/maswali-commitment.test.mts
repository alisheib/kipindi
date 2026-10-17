/**
 * test:maswali-commitment — THE ROOT PROVES THE TICKETS, AND THE SALT KEEPS THEM PRIVATE (MASWALI-BUILD S2; MR-9, MR-13, MB-32).
 *
 *   npx tsx scripts/maswali-commitment.test.mts     (npm run test:maswali-commitment)
 *
 *   §1 the hand-written SHA-256 agrees with node:crypto — the FIPS vectors, and 2,000 random inputs of every length class
 *   §2 the leaf: deterministic, every input changes it, the separator cannot be smuggled
 *   §3 the tree: RFC 6962's known shapes; order-independent input, one root; no two ticket sets share one
 *   §4 ⭐ every ticket's inclusion proof verifies, for every tree size 1…40; a tampered proof never does
 *   §5 ⛔ the reason for the salt: an UNSALTED leaf is reversed by trying all 32,768 pick sets; a salted one is not
 *   §6 the question-set hash: a change to any frozen field changes it; slot order is canonical
 */
import { createHash, randomBytes } from "node:crypto";
import {
  canonicalSelections, fromHex, inclusionProof, leafHash, merkleRoot, newSalt, picksKey, questionSetHash, sha256, toHex, verifyInclusion,
  type CommittedTicket, type FrozenQuestion,
} from "../src/lib/maswali-commitment.ts";

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
const nodeSha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const enc = (s: string) => new TextEncoder().encode(s);
const PICKS = ["YES", "NO", "YES", "YES", "NO", "NO", "YES", "NO", "YES", "YES", "NO", "YES", "NO", "NO", "YES"];

// ── §1 · SHA-256 ────────────────────────────────────────────────────────────
console.log("\n§1 · SHA-256 agrees with node:crypto");
{
  ok("1.1 · FIPS 180-4 vector: empty", toHex(sha256(new Uint8Array(0))) === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  ok("1.2 · FIPS 180-4 vector: abc", toHex(sha256(enc("abc"))) === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  ok("1.3 · FIPS 180-4 vector: the 448-bit message", toHex(sha256(enc("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))) === "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  let bad = 0;
  for (let i = 0; i < 2_000; i++) {
    // Every padding boundary: lengths around 55/56/63/64 bytes and their multiples, plus random lengths.
    const len = i < 300 ? i : Math.floor(Math.random() * 5_000);
    const b = new Uint8Array(randomBytes(len));
    if (toHex(sha256(b)) !== nodeSha(b)) bad++;
  }
  ok("1.4 · 2,000 inputs (every length 0…299, then random up to 5,000 bytes) agree byte for byte", bad === 0, `${bad} disagreed`);
  ok("1.5 · non-ASCII text agrees (Swahili and Chinese questions are hashed)", toHex(sha256(enc("Swali la 1 · 第一题"))) === nodeSha(enc("Swali la 1 · 第一题")));
}

// ── §2 · the leaf ───────────────────────────────────────────────────────────
console.log("\n§2 · the ticket's leaf");
{
  const salt = newSalt();
  const base = { weekId: "wk_1", ticketId: "tk_1", salt, picks: PICKS };
  const leaf = leafHash(base);
  ok("2.1 · a salt is 128 bits of hex, and two are never alike", /^[0-9a-f]{32}$/.test(salt) && salt !== newSalt());
  ok("2.2 · the leaf is SHA-256 of weekId|ticketId|salt|picks", leaf === nodeSha(enc(`wk_1|tk_1|${salt}|${canonicalSelections(PICKS)}`)));
  ok("2.3 · deterministic", leaf === leafHash(base));
  const flipped = [...PICKS]; flipped[14] = "NO";
  ok("2.4 · every input changes it: the week, the ticket, the salt, one pick",
    new Set([leaf, leafHash({ ...base, weekId: "wk_2" }), leafHash({ ...base, ticketId: "tk_2" }), leafHash({ ...base, salt: newSalt() }), leafHash({ ...base, picks: flipped })]).size === 5);
  ok("2.5 · ⛔ a '|' in an id is refused (no two inputs may serialise alike)", throws(() => leafHash({ ...base, ticketId: "tk|1" })));
  ok("2.6 · ⛔ a short salt is refused", throws(() => leafHash({ ...base, salt: "abc" })));
  ok("2.7 · ⛔ a ticket of 14 picks is refused", throws(() => leafHash({ ...base, picks: PICKS.slice(0, 14) })));
  ok("2.8 · canonical picks are fifteen letters", canonicalSelections(PICKS) === "YNYYNNYNYYNYNNY");
  ok("2.9 · the replay key is not the leaf (it carries no salt and is never published)", picksKey(PICKS) !== leaf && picksKey(PICKS) === picksKey([...PICKS]));
}

// ── §3 · the tree ───────────────────────────────────────────────────────────
console.log("\n§3 · the tree (RFC 6962)");
const tickets = (n: number): CommittedTicket[] => Array.from({ length: n }, (_, i) => ({ ticketId: `tk_${String(i).padStart(4, "0")}`, leaf: nodeSha(enc(`leaf ${i}`)) }));
{
  ok("3.1 · an empty week's root is SHA-256 of nothing", merkleRoot([]) === nodeSha(new Uint8Array(0)));
  const one = tickets(1);
  ok("3.2 · one ticket: the root is the leaf node SHA-256(0x00 ‖ leaf)", merkleRoot(one) === nodeSha(new Uint8Array([0, ...fromHex(one[0].leaf)])));
  const two = tickets(2);
  const n0 = createHash("sha256").update(new Uint8Array([0, ...fromHex(two[0].leaf)])).digest();
  const n1 = createHash("sha256").update(new Uint8Array([0, ...fromHex(two[1].leaf)])).digest();
  ok("3.3 · two tickets: SHA-256(0x01 ‖ left ‖ right)", merkleRoot(two) === nodeSha(new Uint8Array([1, ...n0, ...n1])));
  const t7 = tickets(7);
  ok("3.4 · the input order does not matter — the tree sorts by ticket id", merkleRoot(t7) === merkleRoot([...t7].reverse()));
  ok("3.5 · ⛔ dropping a ticket changes the root", merkleRoot(t7) !== merkleRoot(t7.slice(0, 6)));
  ok("3.6 · ⛔ duplicating the last ticket's leaf under a new id is a DIFFERENT root (no duplicate-last-leaf collision)",
    merkleRoot(t7) !== merkleRoot([...t7, { ticketId: "tk_9999", leaf: t7[6].leaf }]));
  ok("3.7 · ⛔ a ticket twice is refused", throws(() => merkleRoot([...t7, t7[0]])));
  ok("3.8 · ⛔ a malformed leaf is refused", throws(() => merkleRoot([{ ticketId: "x", leaf: "zz" }])));
}

// ── §4 · inclusion proofs ───────────────────────────────────────────────────
console.log("\n§4 · ⭐ every ticket proves itself, at every tree size");
{
  let bad = 0, checked = 0, forged = 0;
  for (let n = 1; n <= 40; n++) {
    const t = tickets(n);
    const root = merkleRoot(t);
    for (const x of t) {
      checked++;
      const p = inclusionProof(t, x.ticketId);
      if (!verifyInclusion(p, root)) bad++;
      // Tampering: another leaf, another index, a wrong path step, another root — each must fail.
      const other = nodeSha(enc(`not ${x.ticketId}`));
      if (verifyInclusion({ ...p, leaf: other }, root)) forged++;
      if (n > 1 && verifyInclusion({ ...p, index: (p.index + 1) % n }, root)) forged++;
      if (p.path.length > 0 && verifyInclusion({ ...p, path: [other, ...p.path.slice(1)] }, root)) forged++;
      if (verifyInclusion(p, merkleRoot(t.slice(0, Math.max(0, n - 1))))) forged += n > 1 ? 1 : 0;
    }
  }
  ok(`4.1 · all ${checked} proofs (trees of 1…40 tickets) verify against their root`, bad === 0 && checked === 820, `${bad} failed of ${checked}`);
  ok("4.2 · ⛔ no tampered proof verifies (wrong leaf, wrong index, wrong path step, wrong root)", forged === 0, `${forged} forged proofs verified`);
  ok("4.3 · a proof for a ticket not in the week is refused", throws(() => inclusionProof(tickets(5), "tk_nope")));
  ok("4.4 · ⛔ verifyInclusion never throws on garbage", verifyInclusion({ ticketId: "x", leaf: "zz", index: -1, size: 0, path: ["q"] }, "r") === false);
}

// ── §5 · why the salt ───────────────────────────────────────────────────────
console.log("\n§5 · ⛔ an unsalted leaf gives the picks away; a salted one does not");
{
  // The attack MB-32 names: the leaf without a salt, and a brute force over every possible ticket.
  const unsalted = (picks: readonly string[]) => nodeSha(enc(`wk_1|tk_1|${canonicalSelections(picks)}`));
  const published = unsalted(PICKS);
  let found: string | null = null, tried = 0;
  for (let m = 0; m < 1 << 15 && !found; m++) {
    tried++;
    const guess = Array.from({ length: 15 }, (_, i) => ((m >> i) & 1 ? "YES" : "NO"));
    if (unsalted(guess) === published) found = canonicalSelections(guess);
  }
  ok("5.1 · CONTROL · the unsalted leaf is reversed by brute force — the plant works", found === canonicalSelections(PICKS), `tried ${tried}`);
  const salted = leafHash({ weekId: "wk_1", ticketId: "tk_1", salt: newSalt(), picks: PICKS });
  let hit = false;
  for (let m = 0; m < 1 << 15 && !hit; m++) {
    const guess = Array.from({ length: 15 }, (_, i) => ((m >> i) & 1 ? "YES" : "NO"));
    if (nodeSha(enc(`wk_1|tk_1|${canonicalSelections(guess)}`)) === salted) hit = true;
  }
  ok("5.2 · ⭐ the salted leaf survives the same brute force (all 32,768 pick sets tried)", !hit);
}

// ── §6 · the question-set hash ──────────────────────────────────────────────
console.log("\n§6 · the question-set hash");
{
  const q = (slot: number): FrozenQuestion => ({
    role: slot <= 10 ? "MAIN" : "RESERVE", ordinal: slot <= 10 ? slot : slot - 10, slot, category: "sports",
    textEn: `Question ${slot}?`, textSw: `Swali ${slot}?`, textZh: `问题 ${slot}？`,
    criterionEn: `YES if ${slot}.`, criterionSw: `NDIO ikiwa ${slot}.`, criterionZh: `如果 ${slot} 则是。`,
    sourceUrl: `https://example.org/${slot}`, fallbackSourceUrl: null,
    eventStartsAt: "2026-10-24T15:00:00.000Z", eventZone: "Europe/London", voidDeadlineAt: "2026-10-26T15:00:00.000Z",
  });
  const set = Array.from({ length: 15 }, (_, i) => q(i + 1));
  const h = questionSetHash(set);
  ok("6.1 · a 64-hex digest, the same for the same set in any order", /^[0-9a-f]{64}$/.test(h) && h === questionSetHash([...set].reverse()));
  const keys: Array<keyof FrozenQuestion> = ["category", "textEn", "textSw", "textZh", "criterionEn", "criterionSw", "criterionZh", "sourceUrl", "fallbackSourceUrl", "eventStartsAt", "eventZone", "voidDeadlineAt"];
  const changed = keys.filter((k) => questionSetHash(set.map((x, i) => (i === 6 ? { ...x, [k]: k === "fallbackSourceUrl" ? "https://example.org/fb" : `${String(x[k])}!` } : x))) !== h);
  ok("6.2 · ⭐ a change to ANY frozen field of any one question changes the hash", changed.length === keys.length, `unchanged: ${keys.filter((k) => !changed.includes(k)).join(",")}`);
  const swapped = set.map((x) => (x.slot === 11 ? { ...x, ordinal: 2, slot: 12 } : x.slot === 12 ? { ...x, ordinal: 1, slot: 11 } : x));
  ok("6.3 · ⛔ swapping the reserve ORDER changes it (the reserve order is what a player bought)", questionSetHash(swapped) !== h);
  ok("6.4 · ⛔ fourteen questions are refused", throws(() => questionSetHash(set.slice(0, 14))));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI COMMITMENT: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
const MIN_ASSERTIONS = 1;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
