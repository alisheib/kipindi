/**
 * MASWALI MILLIONEA — THE COMMITMENT (MASWALI-BUILD S2; MASWALI-PLAN §3 MR-9, MR-13, MB-32).
 *
 * WHAT IT PROVES. At the sales close the platform publishes ONE root over every live ticket. After that nothing about the
 * tickets can change without the root changing, and each ticket's owner can prove their own ticket is inside it — without
 * anyone else's picks ever being shown.
 *
 *   leaf(ticket)   = SHA-256( weekId | ticketId | salt | canonical picks )        — `selectionsHash`, written at purchase
 *   root(week)     = the RFC 6962 Merkle Tree Hash over the leaves, sorted by ticket id
 *   picksKey       = SHA-256( canonical picks )                                    — server-only, the replay compare
 *   questionSetHash = SHA-256 over the fifteen frozen questions, published at the OPEN
 *
 * ⛔ THE SALT IS WHY THE LEAF IS SAFE TO PUBLISH (MB-32). Fifteen YES/NO answers have only 2^15 = 32,768 possible values;
 *    an unsalted hash would be reversed by trying them all. 128 random bits per ticket, held server-side and shown only
 *    to its owner, close that door. `test:maswali-commitment` brute-forces an unsalted leaf to prove the point.
 * ⛔ RFC 6962, NOT "DUPLICATE THE LAST LEAF". Leaves and inner nodes are hashed under different one-byte prefixes
 *    (0x00 / 0x01), and an odd node is split at the largest power of two below n — so no two different ticket sets can
 *    produce one root (the duplicate-last-leaf construction allows exactly that).
 *
 * Isomorphic and synchronous on purpose: the server stamps the root inside the close's transaction, and a browser can
 * verify an inclusion proof on `/fairness` with no round trip. The SHA-256 below is the FIPS 180-4 algorithm, checked
 * against `node:crypto` on thousands of random inputs by the suite; nothing else in this module is cryptography.
 */

// ── SHA-256 (FIPS 180-4), bytes in, bytes out ───────────────────────────────────────────────────────

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  // The length in bits, big-endian, in the last 8 bytes (the high word covers inputs beyond 512 MiB).
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padded.length - 4, bitLen >>> 0, false);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, h[i], false);
  return out;
}

const utf8 = (s: string) => new TextEncoder().encode(s);
export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const HEX64 = /^[0-9a-f]{64}$/;
export function fromHex(hex: string): Uint8Array {
  if (!HEX64.test(hex)) throw new Error(`[maswali-commitment] not a 32-byte hex digest: ${JSON.stringify(hex)}`);
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
const sha256Hex = (s: string) => toHex(sha256(utf8(s)));

// ── THE TICKET ──────────────────────────────────────────────────────────────────────────────────────

const SALT_RE = /^[0-9a-f]{32}$/;

/** 128 random bits, as 32 lowercase hex characters. Web Crypto, present in Node 19+ and every browser. */
export function newSalt(): string {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** The picks as the commitment writes them: fifteen letters, Y or N, in slot order. Throws on anything else. */
export function canonicalSelections(picks: readonly string[]): string {
  if (!Array.isArray(picks) || picks.length !== 15) throw new Error("[maswali-commitment] a ticket answers all 15 questions");
  return picks.map((p, i) => {
    if (p === "YES") return "Y";
    if (p === "NO") return "N";
    throw new Error(`[maswali-commitment] slot ${i + 1} is not YES or NO`);
  }).join("");
}

/** ⭐ The ticket's leaf (`selectionsHash`): SHA-256 of `weekId|ticketId|salt|canonical`, hex. */
export function leafHash(input: { weekId: string; ticketId: string; salt: string; picks: readonly string[] }): string {
  if (!input.weekId || !input.ticketId || input.weekId.includes("|") || input.ticketId.includes("|")) {
    throw new Error("[maswali-commitment] a week id and a ticket id, with no '|' in either");
  }
  if (!SALT_RE.test(input.salt)) throw new Error("[maswali-commitment] the salt is 128 bits of hex");
  return sha256Hex(`${input.weekId}|${input.ticketId}|${input.salt}|${canonicalSelections(input.picks)}`);
}

/** The replay compare (server-only use): SHA-256 of the canonical picks alone. Never published — 2^15 inputs. */
export function picksKey(picks: readonly string[]): string {
  return sha256Hex(`maswali.picks|${canonicalSelections(picks)}`);
}

// ── THE TREE (RFC 6962 §2.1) ────────────────────────────────────────────────────────────────────────

const LEAF_PREFIX = 0x00;
const NODE_PREFIX = 0x01;

function leafNode(leafHex: string): Uint8Array {
  const b = new Uint8Array(33);
  b[0] = LEAF_PREFIX;
  b.set(fromHex(leafHex), 1);
  return sha256(b);
}
function innerNode(left: Uint8Array, right: Uint8Array): Uint8Array {
  const b = new Uint8Array(65);
  b[0] = NODE_PREFIX;
  b.set(left, 1);
  b.set(right, 33);
  return sha256(b);
}
/** The largest power of two strictly below n (n ≥ 2). */
const splitPoint = (n: number) => { let k = 1; while (k * 2 < n) k *= 2; return k; };

function mth(leaves: readonly string[]): Uint8Array {
  if (leaves.length === 0) return sha256(new Uint8Array(0));
  if (leaves.length === 1) return leafNode(leaves[0]);
  const k = splitPoint(leaves.length);
  return innerNode(mth(leaves.slice(0, k)), mth(leaves.slice(k)));
}

/** A ticket in the tree: its id (the sort key) and its leaf. */
export type CommittedTicket = { ticketId: string; leaf: string };

const byId = (a: CommittedTicket, b: CommittedTicket) => (a.ticketId < b.ticketId ? -1 : a.ticketId > b.ticketId ? 1 : 0);

function ordered(tickets: readonly CommittedTicket[]): CommittedTicket[] {
  const s = [...tickets].sort(byId);
  for (let i = 1; i < s.length; i++) if (s[i].ticketId === s[i - 1].ticketId) throw new Error(`[maswali-commitment] ticket ${s[i].ticketId} appears twice`);
  for (const t of s) fromHex(t.leaf);
  return s;
}

/** ⭐ The week's root over every live ticket, sorted by ticket id. An empty week's root is SHA-256 of nothing. */
export function merkleRoot(tickets: readonly CommittedTicket[]): string {
  return toHex(mth(ordered(tickets).map((t) => t.leaf)));
}

/** The audit path for one ticket (RFC 6962 §2.1.1), nearest sibling first. */
export type InclusionProof = { ticketId: string; leaf: string; index: number; size: number; path: string[] };

export function inclusionProof(tickets: readonly CommittedTicket[], ticketId: string): InclusionProof {
  const s = ordered(tickets);
  const index = s.findIndex((t) => t.ticketId === ticketId);
  if (index < 0) throw new Error(`[maswali-commitment] ticket ${ticketId} is not in the week`);
  const leaves = s.map((t) => t.leaf);
  const path: string[] = [];
  const walk = (m: number, d: readonly string[]) => {
    if (d.length <= 1) return;
    const k = splitPoint(d.length);
    if (m < k) { walk(m, d.slice(0, k)); path.push(toHex(mth(d.slice(k)))); }
    else { walk(m - k, d.slice(k)); path.push(toHex(mth(d.slice(0, k)))); }
  };
  walk(index, leaves);
  return { ticketId, leaf: s[index].leaf, index, size: s.length, path };
}

/** ⭐ Does this proof put this leaf under this root? Pure; what a browser runs on `/fairness`. Never throws. */
export function verifyInclusion(proof: InclusionProof, rootHex: string): boolean {
  try {
    if (!Number.isSafeInteger(proof.index) || !Number.isSafeInteger(proof.size) || proof.index < 0 || proof.index >= proof.size) return false;
    // RFC 9162 §2.1.3.2's verification, which is the same audit path as RFC 6962.
    let fn = proof.index, sn = proof.size - 1;
    let r = leafNode(proof.leaf);
    for (const p of proof.path) {
      if (sn === 0) return false;
      const sib = fromHex(p);
      if ((fn & 1) === 1 || fn === sn) {
        r = innerNode(sib, r);
        if ((fn & 1) === 0) { while ((fn & 1) === 0 && fn !== 0) { fn >>= 1; sn >>= 1; } }
      } else {
        r = innerNode(r, sib);
      }
      fn >>= 1; sn >>= 1;
    }
    return sn === 0 && toHex(r) === rootHex;
  } catch {
    return false;
  }
}

// ── THE QUESTION SET ────────────────────────────────────────────────────────────────────────────────

/** The fifteen questions as the open freezes them — every field that decides what a player bought. */
export type FrozenQuestion = {
  role: "MAIN" | "RESERVE";
  ordinal: number;
  slot: number;
  category: string;
  textEn: string; textSw: string; textZh: string;
  criterionEn: string; criterionSw: string; criterionZh: string;
  sourceUrl: string; fallbackSourceUrl: string | null;
  eventStartsAt: string; eventZone: string; voidDeadlineAt: string;
};

/**
 * ⭐ `questionSetHash`, published at the OPEN: SHA-256 over the fifteen rows in slot order, each serialised with a FIXED
 * key order (so no JSON engine's key order can change the digest). Any edit to a frozen field changes it.
 */
export function questionSetHash(questions: readonly FrozenQuestion[]): string {
  if (questions.length !== 15) throw new Error("[maswali-commitment] a week has exactly 15 questions");
  const rows = [...questions].sort((a, b) => a.slot - b.slot);
  rows.forEach((q, i) => { if (q.slot !== i + 1) throw new Error(`[maswali-commitment] slots must be 1…15, found ${q.slot} at ${i + 1}`); });
  const KEYS: Array<keyof FrozenQuestion> = ["slot", "role", "ordinal", "category", "textEn", "textSw", "textZh", "criterionEn", "criterionSw",
    "criterionZh", "sourceUrl", "fallbackSourceUrl", "eventStartsAt", "eventZone", "voidDeadlineAt"];
  const canonical = JSON.stringify(rows.map((q) => KEYS.map((k) => q[k])));
  return sha256Hex(`maswali.questions.v1|${canonical}`);
}
