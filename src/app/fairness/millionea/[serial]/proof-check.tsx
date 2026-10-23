"use client";

/**
 * THE OWNER'S BROWSER CHECKS THE PROOF AGAIN (MASWALI-BUILD S6 item 1; `maswali-commitment.ts`: "a browser can verify an
 * inclusion proof on /fairness with no round trip").
 *
 * It recomputes the ticket's fingerprint from the four inputs the page prints, and walks the audit path to the root the
 * close stamped, with the same isomorphic SHA-256 and RFC 6962 code the close used — so the verdict the reader sees is
 * computed in their own browser, not merely reported by the server.
 * ⭐ THE SERVER PRINTS "CHECKING…" AND THE BROWSER THE ANSWER (`useSyncExternalStore`'s server snapshot is null): the
 *    first frame never claims a check that has not run, and nothing re-renders after hydration but this one line.
 * ⛔ Pure reads only: no request, no storage, no state shared with any other component.
 */
import { useSyncExternalStore } from "react";
import { leafHash, verifyInclusion, type InclusionProof } from "@/lib/maswali-commitment";

type Props = {
  weekId: string;
  ticketId: string;
  salt: string;
  /** The fifteen answers as the commitment writes them: Y or N, in slot order. */
  picks: string;
  proof: InclusionProof;
  root: string;
  words: { checking: string; ok: string; bad: string };
};

/** Nothing to subscribe to: the inputs never change while the page is open. */
const subscribe = () => () => {};

/** The browser's own verdict: the leaf recomputes AND its path reaches the stamped root. Never throws. */
function verdict(p: Props): boolean {
  try {
    const picks = p.picks.split("").map((c) => (c === "Y" ? "YES" : c === "N" ? "NO" : "?"));
    const leaf = leafHash({ weekId: p.weekId, ticketId: p.ticketId, salt: p.salt, picks });
    return leaf === p.proof.leaf && verifyInclusion(p.proof, p.root);
  } catch {
    return false;
  }
}

export function ProofCheck(props: Props) {
  // A boolean snapshot is stable between calls, as `useSyncExternalStore` requires; null on the server.
  const result = useSyncExternalStore<boolean | null>(subscribe, () => verdict(props), () => null);
  return (
    <p role="status" aria-live="polite" className="text-body-sm text-text-muted">
      {result === null ? props.words.checking : result ? props.words.ok : props.words.bad}
    </p>
  );
}
