/**
 * THE AKAUNTI HUB'S READER — who is asking for `/account`, read once and composed through the shell's own door formulas
 * (the Vodacom plan S6, SJ-17; `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md` WP5, amendment A14).
 *
 * ⭐ ONE BATCH. The user, the wallet, the KYC row, the invite viewer and the invite switch are asked together: one more
 * sequential round trip per row would be a latency tax on the page a phone opens to sign out. The agent programme and
 * proposals are cached config reads.
 * ⭐ THE DOORS ARE `viewerDoorsFor`'S — invite by standing, "paid" and the agent door by the shell's own formulas,
 * proposals by state, the staff console for every staff role (SJ-23). Nothing here re-spells one
 * (`test:journey-account` §1).
 * ⭐ "Verify ID" follows `/profile`'s own predicate: offered unless the identity is approved or finally refused.
 * ⛔ EVERY FAILED READ CLOSES A DOOR, NEVER OPENS ONE: no user row → no role, so no console; no invite viewer → the closed
 * viewer (no invite, no standing); no wallet → no figure, and not called held; a KYC row that was not read → "Verify ID"
 * is not offered (a verified player is never told to verify again on the strength of a failed query); a failed switch
 * read → not paid; a failed config read → no agent door and no proposals door. `test:journey-account` §6 and §7 plant
 * each one.
 * ⛔ A GUEST IS READ NOTHING: `loadHubViewer(null)` touches no dependency at all.
 * ⚠️ SERVER ONLY: it reads the store, and `viewerDoorsFor` reads the environment. `deps` is the test seam — the suite runs
 * this against the in-memory store and, in its own process, against the Prisma twin over a fake client.
 */
import { db, type StoredKyc, type StoredUser, type StoredWallet } from "@/lib/server/store";
import { inviteViewerFor } from "@/lib/server/affiliate-service";
import { invitePaysPlayersNow } from "@/lib/server/invite-rewards-switch";
import { getAgentConfig } from "@/lib/server/agent-config";
import { getProposalsConfig, type ProposalsState } from "@/lib/server/proposals-config";
import { NO_VIEWER, type InviteViewer } from "@/lib/feature-state";
import { viewerDoorsFor } from "@/lib/journey/viewer-doors";
import { displayInitials, displayLabel } from "@/lib/display-label";
import { maskPhone } from "@/lib/phone-normalize";
import { kycDoorOffered } from "@/lib/kyc-refusal";
import { isLockedOut } from "@/lib/server/responsible-gambling";
import { breakStateOf } from "@/lib/break-end";
import type { HubViewer } from "@/components/journey/account/hub-rows";

/** Every read the hub makes — passed in, so the suite can stand in either store and fail any one of them. */
export type HubViewerDeps = {
  user: (userId: string) => Promise<StoredUser | null>;
  wallet: (userId: string) => Promise<StoredWallet | null>;
  kyc: (userId: string) => Promise<StoredKyc | null>;
  inviteViewer: (userId: string) => Promise<InviteViewer>;
  invitePayable: () => Promise<boolean>;
  agentEnabled: () => boolean;
  proposalsState: () => ProposalsState;
  /** R4-I · the reader's break or exclusion (`isLockedOut`). Optional, so a stand-in without it reads none. */
  lockout?: (userId: string) => Promise<{ locked: boolean; until: string | null; reason: string | null }>;
};

/** The shipped reads. `inviteViewerFor` and the invite switch already fail closed; the catch here is the belt. */
export const HUB_VIEWER_DEPS: HubViewerDeps = {
  user: (userId) => db.user.findById(userId),
  wallet: (userId) => db.wallet.findByUserId(userId),
  kyc: (userId) => db.kyc.findByUserId(userId),
  inviteViewer: (userId) => inviteViewerFor(userId),
  invitePayable: () => invitePaysPlayersNow().catch(() => false),
  agentEnabled: () => getAgentConfig().enabled,
  proposalsState: () => getProposalsConfig().state,
  lockout: (userId) => isLockedOut(userId),
};

/** A read that throws before it hands back a promise still settles as a failure — never as an escape from the batch. */
function attempt<T>(read: () => Promise<T>): Promise<T> {
  try {
    return read();
  } catch (e) {
    return Promise.reject(e);
  }
}

/** The hub's reader: a guest for no user id, else the signed-in reader with every door composed. Never throws. */
export async function loadHubViewer(userId: string | null, deps: HubViewerDeps = HUB_VIEWER_DEPS): Promise<HubViewer> {
  if (!userId) return { signedIn: false };
  const [u, w, k, iv, paid, lock] = await Promise.allSettled([
    attempt(() => deps.user(userId)),
    attempt(() => deps.wallet(userId)),
    attempt(() => deps.kyc(userId)),
    attempt(() => deps.inviteViewer(userId)),
    attempt(() => deps.invitePayable()),
    // R4-I · in the same batch. It feeds a STATUS line, never a door: a failed read (or no reader) shows none.
    attempt(() => (deps.lockout ? deps.lockout(userId) : Promise.resolve(null))),
  ]);
  const user = u.status === "fulfilled" ? u.value : null;
  const wallet = w.status === "fulfilled" ? w.value : null;
  const inviteViewer = iv.status === "fulfilled" ? iv.value : NO_VIEWER;
  let agentEnabled = false;
  let proposalsState: ProposalsState = "DISABLED";
  try { agentEnabled = deps.agentEnabled() === true; } catch { /* closed: no agent door */ }
  try { proposalsState = deps.proposalsState(); } catch { /* closed: no proposals door */ }
  // `/profile`'s own predicate, the one function every KYC door asks (`kycDoorOffered`; round 6, review C13). ⛔ Only a row
  // that was READ can offer it: a failed read is not "not started".
  const kycOffered = k.status === "fulfilled" && kycDoorOffered(k.value?.status, k.value?.rejectReason);
  const who = user ?? { id: userId, displayName: null };
  return {
    signedIn: true,
    userId,
    name: displayLabel(who),
    initials: displayInitials(who),
    phone: maskPhone(user?.phoneE164),
    balance: wallet ? wallet.balance : null,
    walletHeld: !!wallet && wallet.status !== "ACTIVE",
    breakEnd: lock.status === "fulfilled" && lock.value ? breakStateOf(lock.value) : null,
    kycOffered,
    agentInStanding: inviteViewer.agentInGoodStanding === true,
    proposalsState,
    doors: viewerDoorsFor({
      inviteViewer,
      invitePayable: paid.status === "fulfilled" && paid.value === true,
      agentEnabled,
      proposalsState,
      role: user?.role ?? null,
    }),
  };
}
