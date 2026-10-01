/**
 * WHICH DOORS THIS READER GETS — the shell's door formulas and the staff console, in one function (the Vodacom plan
 * S6; S6-PLAN WP2 step 4).
 *
 * `app-shell.tsx` resolves invite, invite's "paid" half, the agent door and the proposals state ONCE, on the server,
 * and threads the answers down (its own notes say why a client component never reads them). The Akaunti hub (WP5) needs
 * the same answers for the same reader. ⛔ Re-spelling them in the hub would give the platform two definitions of each
 * door — the drift this repo has filed for the nav resolver, the money surface and the crumb resolver. So the formulas
 * live here, and `test:journey-shell` §4 pins app-shell's own spelling of the same three, and the classic chrome's
 * proposals rule, beside this truth table.
 *
 *   · inviteVisible    — `inviteIsLiveFor(viewer)`: STANDING, not role (2026-09-07).
 *   · invitePaid       — the player programme's one "paid" OR an approved agent's standing (review P8, 2026-09-26).
 *   · agentDoorVisible — the programme enabled OR the reader already inside it: closing the programme must not strip
 *                        an approved agent of their only route to it.
 *   · proposalsVisible — every proposals door is gone when DISABLED (`proposals-config.ts`), as in the classic chrome.
 *   · staffConsole     — EVERY staff role, SUPPORT included (SJ-23; VODACOM-PLAN §0h point 8). `isStaffRole`, never
 *                        `ADMIN_CONSOLE_ROLES`, which is the classic avatar menu's narrower rule.
 *
 * ⛔ SERVER ONLY. It does no I/O, but it is not free of the environment: `inviteIsLiveFor` reads `FEATURE_INVITE`, and
 * `feature-state.ts` forbids a "use client" importer for exactly that reason. In a browser bundle the variable is
 * absent, the answer falls back to the shipped constant, and an operator's WITHDRAWN would be ignored. `test:journey-shell`
 * §4 holds this file out of every bundle a "use client" file pulls in; an `import type` of its shapes is erased, and
 * allowed.
 * ⛔ NO READS HERE. The caller passes what it read, and a failed read arrives as the closed default (`NO_VIEWER`,
 * `invitePayable: false`, a null role), so a failure can never open a door. §2 pins this file to the three imports below.
 */
import { inviteIsLiveFor, type InviteViewer } from "@/lib/feature-state";
import { isStaffRole } from "@/lib/server/roles";
import type { ProposalsState } from "@/lib/server/proposals-config";

export type ViewerDoorsInput = {
  /** Who is asking about Invite — `NO_VIEWER` (or null) for a guest or a failed read. */
  inviteViewer: InviteViewer | null | undefined;
  /** `invitePaysPlayersNow()`, already failing closed (`.catch(() => false)`). */
  invitePayable: boolean;
  /** `getAgentConfig().enabled`. */
  agentEnabled: boolean;
  /** `getProposalsConfig().state`. */
  proposalsState: ProposalsState;
  /** The STORED role, or null for a guest or a failed user read. */
  role: string | null | undefined;
};

export type ViewerDoors = {
  inviteVisible: boolean;
  invitePaid: boolean;
  agentDoorVisible: boolean;
  proposalsVisible: boolean;
  staffConsole: boolean;
};

export function viewerDoorsFor(i: ViewerDoorsInput): ViewerDoors {
  const inStanding = !!i.inviteViewer?.agentInGoodStanding;
  return {
    inviteVisible: inviteIsLiveFor(i.inviteViewer),
    invitePaid: i.invitePayable || inStanding,
    agentDoorVisible: i.agentEnabled || inStanding,
    proposalsVisible: i.proposalsState !== "DISABLED",
    staffConsole: isStaffRole(i.role),
  };
}
