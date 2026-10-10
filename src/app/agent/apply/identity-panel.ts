/**
 * ⭐ THE APPLICANT'S OWN IDENTITY, ASKED THE AGENT PROGRAMME'S WAY (2026-10-10) — in the identity panel's vocabulary.
 *
 * ⛔ NOT `kycGateState`. That asks the WITHDRAWAL gate's question — approved EVER — and since 2026-10-10 a player's
 * typed details are approved automatically, so it would answer "nothing to do" for an applicant no officer has seen.
 * The agent programme asks for an officer's approval of the document photos and a selfie (`photoIdentityVerified`,
 * `agent-identity.ts`), which the CALLER asks and passes in as `photoVerified` — the gate's own predicate, never a
 * second reading of the stamp here:
 *   · approved on photos → null, no panel;
 *   · a FINAL refusal → `refused_final` (support, never a retry), whatever came before it;
 *   · with an officer — a photo case sent, or typed details routed to one → `pending_review`: the next move is ours,
 *     and the photo track's documents are locked while it lasts;
 *   · an officer's request for corrections → `more_info`; a recoverable refusal → `rejected`;
 *   · ⭐ APPROVED from typed details with no photos yet → `photo_upgrade` (review R5.6, 2026-10-10). It was
 *     `not_started`, so a VERIFIED player read "Verify your identity"; the panel now says the identity is verified and
 *     names the one thing the programme still asks — the photos, which our team checks;
 *   · otherwise the photos are still to come — `uploaded` once any is attached (an approved identity included: its
 *     upgrade is under way), else `not_started`.
 * The panel's link leads to the photo track by name (`/profile/kyc?for=agent`): this applicant holds a live application.
 *
 * ⛔ PURE, AND NOT IN A "use client" FILE. The page (a server component) calls it, and `test:kyc-gate-state-table` §4
 * runs it over every row shape. It imports only a TYPE from the panel component, which the compiler erases — a value
 * import from a "use client" module would make this a client reference the server cannot call (the 2026-09-05
 * `kycGateState` outage, `kyc-gate-state.ts`).
 */
import type { KycGatePanelState } from "@/components/kyc/kyc-gate-panel";
import { isFinalRefusal } from "@/lib/kyc-refusal";

/** The row's facts this reads. Every KYC shape on the server carries them (`StoredKyc`). */
export type AgentIdentityFacts = {
  status?: string | null;
  rejectReason?: string | null;
  documents?: readonly unknown[] | null;
} | null | undefined;

export function agentIdentityPanel(kyc: AgentIdentityFacts, photoVerified: boolean): KycGatePanelState | null {
  if (photoVerified) return null;
  if (kyc?.status === "REJECTED" && isFinalRefusal(kyc?.rejectReason)) return "refused_final";
  const attached = kyc?.documents?.length ?? 0;
  switch (kyc?.status) {
    case "PENDING_REVIEW": return "pending_review";
    case "ADDITIONAL_INFO_REQUIRED": return "more_info";
    case "REJECTED": return "rejected";
    case "APPROVED": return attached > 0 ? "uploaded" : "photo_upgrade";
    case "IN_PROGRESS": return attached > 0 ? "uploaded" : "not_started";
    default: return "not_started";
  }
}
