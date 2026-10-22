/**
 * MASWALI MILLIONEA — WHAT `/fairness` PUBLISHES, AND ONE OWNER'S INCLUSION PROOF (MASWALI-BUILD S6 item 1; MASWALI-PLAN
 * §3 MR-9 and MR-13, §8 MB-32 and MB-33).
 *
 * Two read models and nothing else:
 *   · `millioneaFairnessView` — the commitments `/fairness` summarises: each public week's question-set hash and the
 *     instant it was stamped (the open), and once sales close, the tickets' Merkle root, their count and the close.
 *     ⭐ A SUMMARY THAT LINKS, NEVER A SECOND REGISTER: the week's questions, seals, voids, reserves and ledger live on
 *     S5's register (`/millionea/register/[week]`), which shows a week only once its results can no longer change. What
 *     only `/fairness` can show is the commitment BEFORE the results — the hash from the open, the root from the close —
 *     which is the whole point of a commitment (MR-13).
 *   · `millioneaTicketProof` — one ticket's leaf and its RFC 6962 audit path to the published root, for its owner only.
 *
 * ⛔ THE ROLLOUT DECIDES FIRST, AND A HIDDEN PRODUCT COSTS NOTHING: `millioneaFairnessView` is handed the request's
 *    resolution (`millionea-preview.ts → resolveMillionea`, the gate's own answer) and returns null without reading a
 *    row when the viewer may not see Millionea — so the page a Yes/No or Up & Down reader gets is today's, byte for byte.
 * ⛔ A DRIVE WEEK (OD-21) IS PRIVATE: never in the summary. Its tickets' owners still reach their own proof.
 * ⛔ A TICKET IS ITS OWNER'S (MB-32, MB-95): the proof is built only for the account that bought it, and a malformed
 *    serial, a serial nobody holds and a serial someone else holds are one answer — null — so walking serials learns
 *    nothing. The salt is shown to its owner and to nobody else; the audit path carries only sibling hashes, never
 *    another ticket's picks or salt.
 * ⛔ THE BROWSER CHECKS AGAINST THE ROOT THE CLOSE STAMPED, NEVER AGAINST ONE REBUILT HERE: the path is rebuilt from the
 *    committed tickets, and `verifyInclusion` measures it against `ticketMerkleRoot` as stamped. A rebuild that disagrees
 *    with the stamp is reported as a mismatch — it is never quietly re-rooted.
 * ⭐ ONE BUILD A WEEK (S6 review #9): the stamped root never moves, so the tree rebuilt from the committed tickets is kept
 *    — only when it reproduces the stamp, keyed by the week AND that root, a few weeks at most (`MILLIONEA_PROOF_TREES`)
 *    — and every later proof of the week reads its own path from it, with no ticket list read at all. A rebuild that
 *    misses the stamp is never kept, so the next view rebuilds and reports again. Proof views that arrive together
 *    while no tree is kept share ONE build (round 3, L3): one ticket list read, not one each.
 * ⛔ NO MUTATOR IS EXPORTED (round 3, L5): the kept trees live on `globalThis` under a registered symbol — the house's
 *    test-seam pattern (`house-bot/holder-hook.ts`) — so the suite reaches them through the symbol, one cache across
 *    module copies, and no page can import a way to empty or resize them.
 * ⛔ READS ONLY. Nothing here writes, locks or moves money (the kept trees are this process's memory, never a row).
 */
import { ticketStore, weekStore, type StoredTicket, type StoredWeek, type WeekVisibility } from "./maswali-dal";
import { normalizeMillioneaSerial } from "./maswali-player";
import { calendarStartMs } from "./maswali-service";
import {
  canonicalSelections, commitmentTree, leafHash, verifyInclusion, type CommitmentTree, type InclusionProof,
} from "@/lib/maswali-commitment";
import type { TicketState, WeekState } from "@/lib/maswali-week-label";

/** Weeks whose commitment can be published before their results: on sale, closed, being graded. */
const UNSETTLED: WeekState[] = ["OPEN", "CLOSED", "RESOLVING"];
/** Weeks whose record is final — the register carries each of them whole. */
const FINAL: WeekState[] = ["SETTLED", "VOIDED"];

/**
 * How many final weeks the summary prints before it hands the reader to the register. A layout choice, not a rule anyone
 * reads: the register lists every final week, and the summary says it shows the latest ones.
 */
export const MILLIONEA_FAIRNESS_RECENT = 4;

/** One public week's commitments, as `/fairness` prints them. No ticket, no player, no pick. */
export type MillioneaCommitmentRow = {
  code: string;
  state: WeekState;
  /** Published at the open (MR-13): the fifteen frozen questions' hash. */
  questionSetHash: string | null;
  /** The instant the open stamped that hash (`stampOpen` writes the week's `opensAt` with it). */
  hashPublishedAt: string;
  /** The close as it stands — what the root waits for while the week sells. */
  closesAt: string;
  /** Stamped once at the close (MR-13), all three together: the root over every live ticket, their count, the instant.
   *  Null, all three, until the close. */
  ticketMerkleRoot: string | null;
  ticketCount: number | null;
  closedAt: string | null;
  /** The week is final, so its whole record is on the register (which never shows a week whose results can change). */
  onRegister: boolean;
};

export type MillioneaFairnessView = {
  /** The public weeks on sale or being graded, newest first: their commitments ahead of their results. */
  current: MillioneaCommitmentRow[];
  /** The latest final public weeks, newest first, at most `MILLIONEA_FAIRNESS_RECENT`; the register holds every one. */
  recent: MillioneaCommitmentRow[];
};

function commitmentOf(w: StoredWeek): MillioneaCommitmentRow {
  // The close stamps the root, the count and the instant in one claim (`weekStore.stampClose`): either all three are
  // published, or none is — a count without its root would be a figure nothing commits to.
  const closed = w.closedAt !== null && w.ticketMerkleRoot !== null;
  return {
    code: w.code, state: w.state, questionSetHash: w.questionSetHash, hashPublishedAt: w.opensAt, closesAt: w.closesAt,
    ticketMerkleRoot: closed ? w.ticketMerkleRoot : null, ticketCount: closed ? w.ticketCount : null, closedAt: closed ? w.closedAt : null,
    onRegister: FINAL.includes(w.state),
  };
}

/** Newest first IN THE CALENDAR, the order of creation breaking a tie — S5's R3: a week drafted later for an earlier
 *  Monday is still the earlier week, so the store's creation order (`seq`) alone would misplace it. */
function newestFirst(weeks: readonly StoredWeek[]): StoredWeek[] {
  return [...weeks].sort((a, b) => calendarStartMs(b) - calendarStartMs(a) || b.seq - a.seq);
}

/**
 * ⭐ THE `/fairness` SUMMARY — or null when this request may not see Millionea (read nothing then).
 * ⛔ EVERY WEEK IS FOUND BY ITS STATE, NEVER AS ONE OF THE NEWEST N OF ALL STATES (S5 review L1): drafts take the newest
 *    `seq`, so a newest-N page could hold drafts only and hide the week on sale.
 * ⛔ THE LATEST FINAL WEEKS ARE THE CALENDAR'S: every final week is read and the newest few kept, because a limit applied
 *    in the store's creation order could keep an older week over a newer one. One row a week, so the read stays small.
 */
export async function millioneaFairnessView(resolution: { visible: boolean }): Promise<MillioneaFairnessView | null> {
  if (resolution.visible !== true) return null;
  const [current, finals] = await Promise.all([
    weekStore.list({ visibility: "PUBLIC", states: UNSETTLED }),
    weekStore.list({ visibility: "PUBLIC", states: FINAL }),
  ]);
  return {
    current: newestFirst(current).map(commitmentOf),
    recent: newestFirst(finals).slice(0, MILLIONEA_FAIRNESS_RECENT).map(commitmentOf),
  };
}

// ── ONE OWNER'S PROOF ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Where a ticket stands against its week's commitment:
 *   AWAITING_CLOSE — the week still sells: the root is stamped at the close, and the proof follows it;
 *   CANCELLED      — a free cancel took the ticket out of the count, the commitment and the grading (MR-12);
 *   COMMITTED      — the leaf recomputes from its inputs, and its audit path reaches the stamped root;
 *   MISMATCH       — one of those two fails. Never expected; shown as it is, never re-rooted.
 */
export type MillioneaProofStanding = "AWAITING_CLOSE" | "CANCELLED" | "COMMITTED" | "MISMATCH";

export type MillioneaTicketProof = {
  serial: string;
  week: {
    id: string; code: string; visibility: WeekVisibility; state: WeekState; closesAt: string; closedAt: string | null;
    questionSetHash: string | null; ticketMerkleRoot: string | null; ticketCount: number | null;
  };
  /** The leaf's inputs, for the owner to recompute: the ticket's id, its 128-bit salt (MB-32: the owner's only), the
   *  fifteen answers as the commitment writes them (Y or N, in slot order), and the leaf written at purchase. */
  ticket: { id: string; status: TicketState; salt: string; picks: string; leaf: string };
  /** SHA-256(weekId|ticketId|salt|picks), recomputed here, equals the leaf written at purchase. */
  leafMatches: boolean;
  standing: MillioneaProofStanding;
  /** The audit path from the leaf to the root (RFC 6962 §2.1.1), once the week has closed and while the ticket is in it. */
  proof: InclusionProof | null;
  /** `verifyInclusion(proof, ticketMerkleRoot)` — the very check the owner's browser runs again on the page. */
  verifies: boolean;
};

/**
 * How many weeks' trees one server process keeps (review #9). The proofs people open are their latest weeks', so a few
 * is plenty; the oldest-used tree leaves first. A tree holds its tickets' ids and leaves and about two 32-byte nodes a
 * ticket.
 */
export const MILLIONEA_PROOF_TREES = 4;

/** The kept trees (`weekId|root` → tree, oldest-used first), the builds in flight, and the bound. */
type ProofTrees = { trees: Map<string, CommitmentTree>; building: Map<string, Promise<CommitmentTree>>; bound: number };
const PROOF_TREES = Symbol.for("millionea.proof-trees");
function proofTrees(): ProofTrees {
  const g = globalThis as Record<symbol, ProofTrees | undefined>;
  return (g[PROOF_TREES] ??= { trees: new Map(), building: new Map(), bound: MILLIONEA_PROOF_TREES });
}

/** The week's tree as its close committed it, built once per process and kept only when it reproduces the stamp. */
async function committedTree(week: StoredWeek & { ticketMerkleRoot: string }): Promise<CommitmentTree> {
  const c = proofTrees();
  const key = `${week.id}|${week.ticketMerkleRoot}`;
  const kept = c.trees.get(key);
  if (kept) {
    c.trees.delete(key);
    c.trees.set(key, kept);
    return kept;
  }
  const inFlight = c.building.get(key);
  if (inFlight) return inFlight;
  const build = (async () => {
    // The committed set is the close's own: every ticket LIVE at the close. Nothing is bought or cancelled after it
    // (MR-4; the close waits for any purchase or cancel in flight, R2), so it is every ticket of the week not cancelled —
    // still LIVE, SETTLED by the settlement, or REFUNDED by a week void.
    const tree = commitmentTree((await ticketStore.listForWeek(week.id))
      .filter((x) => x.status !== "CANCELLED")
      .map((x) => ({ ticketId: x.id, leaf: x.selectionsHash })));
    if (tree.root === week.ticketMerkleRoot) {
      c.trees.set(key, tree);
      while (c.trees.size > c.bound) c.trees.delete(c.trees.keys().next().value as string);
    }
    return tree;
  })();
  c.building.set(key, build);
  try {
    return await build;
  } finally {
    c.building.delete(key);
  }
}

/** The leaf recomputed from a stored ticket, or null when its inputs cannot form one (the page then says it does not
 *  match — a stored row that cannot be recomputed is the case the check exists for). */
function recomputedLeaf(weekId: string, t: StoredTicket): string | null {
  try {
    return leafHash({ weekId, ticketId: t.id, salt: t.salt, picks: t.selections });
  } catch {
    return null;
  }
}

/** A ticket's proof page address, by its serial. The ticket page links here (the lead's wiring at merge). */
export function millioneaProofHref(serial: string): string {
  return `/fairness/millionea/${encodeURIComponent(serial)}`;
}

/**
 * ⭐ ONE TICKET'S INCLUSION PROOF, FOR ITS OWNER — or null. ⛔ Null for a malformed serial, a serial nobody holds and a
 * serial someone else holds alike (MB-95): the route renders the same 404 for all three.
 * B-1 · no swallow: a store that cannot be read, or a stored row the commitment cannot read, throws to the route's error
 * boundary — it never renders as a proof, and never as "not found".
 */
export async function millioneaTicketProof(userId: string, serial: unknown): Promise<MillioneaTicketProof | null> {
  const s = normalizeMillioneaSerial(serial);
  if (!s || !userId) return null;
  const t = await ticketStore.getBySerial(s);
  if (!t || t.userId !== userId) return null;
  const week = await weekStore.get(t.cycleId);
  if (!week) return null;

  const closed = week.closedAt !== null && week.ticketMerkleRoot !== null;
  const base = {
    serial: t.serial,
    week: {
      id: week.id, code: week.code, visibility: week.visibility, state: week.state, closesAt: week.closesAt,
      closedAt: closed ? week.closedAt : null, questionSetHash: week.questionSetHash,
      ticketMerkleRoot: closed ? week.ticketMerkleRoot : null, ticketCount: closed ? week.ticketCount : null,
    },
    ticket: { id: t.id, status: t.status, salt: t.salt, picks: canonicalSelections(t.selections), leaf: t.selectionsHash },
    leafMatches: recomputedLeaf(week.id, t) === t.selectionsHash,
  };
  if (t.status === "CANCELLED") return { ...base, standing: "CANCELLED", proof: null, verifies: false };
  if (!closed || week.ticketMerkleRoot === null) return { ...base, standing: "AWAITING_CLOSE", proof: null, verifies: false };

  const root = week.ticketMerkleRoot;
  const proof = (await committedTree({ ...week, ticketMerkleRoot: root })).proof(t.id);
  // A live ticket the committed set does not hold cannot be: it is shown as the mismatch it is, never as a missing page.
  if (!proof) return { ...base, standing: "MISMATCH", proof: null, verifies: false };
  const verifies = verifyInclusion(proof, root);
  // The path's leaf is the one the tree was built from; it must still be this ticket's stored leaf.
  const committed = verifies && base.leafMatches && proof.leaf === t.selectionsHash;
  return { ...base, standing: committed ? "COMMITTED" : "MISMATCH", proof, verifies };
}
