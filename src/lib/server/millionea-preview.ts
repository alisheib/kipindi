/**
 * MASWALI MILLIONEA — WHO SEES IT, AND THE ONE PER-REQUEST ANSWER (MASWALI-BUILD S1).
 *
 * At STAFF_PREVIEW a request sees Millionea when its session's STORED role is a staff role on an open account — re-read
 * per request, because a session cookie is a photograph of a role and a demotion must hide the product at once. Both
 * shells: this never forces a shell; it only lets Millionea be seen. ACTIVE shows everyone; WITHDRAWN shows nobody.
 *
 * ⏳ THE PREVIEW PASS FOR NON-STAFF QA PLAYERS LANDS WITH ITS WRITER (S4), NOT HERE. The S8 drive needs a QA player who
 *    is not staff to see a DRIVE week, through a pass a staff member sets in that browser (the journey's `kp_preview`
 *    pattern, its own MAC domain under the journey's preview secret). A cookie is a privacy-notice fact
 *    (`test:privacy-notice` §4 pins every cookie the code names, described in three locales), so it ships in the same
 *    commit as the route that writes it and the §7 sentence that tells players about it — never ahead of them.
 *    `resolveMillioneaFor` already takes the `pass` input, so S4 adds a reader and changes no caller.
 *
 * ⛔ IT OPENS NOTHING BUT A VIEW. Visibility is never read by RBAC, `requireStaff`, the proxy's `/admin` gate or any
 *    money path; a buy still meets every gate (`millionea_staff_barred` refuses the staff session itself).
 * ⛔ NOTHING HERE THROWS: the resolver runs on every page that may show a Millionea entry, and a failure is HIDDEN.
 */
import { cache } from "react";
import { isStaffRole } from "./roles";
import { getSession } from "./session";
import { db } from "./store";
import { millioneaStateNow } from "./millionea-switch";
import { millioneaVisibleFor, type RolloutState } from "@/lib/millionea-rollout";

/** Account statuses whose holder no longer counts as staff for the preview. PENDING_KYC is not one: staff need no KYC. */
const CLOSED_STATUSES = new Set(["SUSPENDED", "CLOSED", "SELF_EXCLUDED", "COOLED_OFF"]);

/** What the checks need to look up. Injected by suites; the real ones read the store and the switch. */
export type MillioneaViewerDeps = {
  findUser?: (id: string) => Promise<{ role: string; status: string } | null>;
  stateNow?: () => Promise<RolloutState>;
};

const findUserReal = async (id: string): Promise<{ role: string; status: string } | null> => {
  const u = await db.user.findById(id);
  return u ? { role: u.role, status: u.status } : null;
};

/** A user id whose STORED row is a staff role on an open account. ⛔ Never throws: a failed lookup is not staff. */
async function storedStaff(userId: string | null | undefined, deps: MillioneaViewerDeps): Promise<boolean> {
  try {
    if (typeof userId !== "string" || userId.length === 0) return false;
    const user = await (deps.findUser ?? findUserReal)(userId);
    return !!user && isStaffRole(user.role) && !CLOSED_STATUSES.has(user.status);
  } catch {
    return false;
  }
}

export type MillioneaResolution = {
  /** The effective rollout. */
  state: RolloutState;
  /** This request may see Millionea: its routes, its card, its More row, its notices. */
  visible: boolean;
  /** …and wears the "Preview" mark while it does. */
  preview: boolean;
};

const HIDDEN = (state: RolloutState): MillioneaResolution => ({ state, visible: false, preview: false });

/**
 * The resolution from its parts — the testable core of `resolveMillionea`. `pass` is a verified preview pass (S4);
 * until S4 nothing supplies one. Never throws.
 */
export async function resolveMillioneaFor(
  input: { sessionUserId: string | null | undefined; pass?: boolean },
  deps: MillioneaViewerDeps = {},
): Promise<MillioneaResolution> {
  let state: RolloutState = "WITHDRAWN";
  try {
    state = await (deps.stateNow ?? millioneaStateNow)();
    if (state === "WITHDRAWN") return HIDDEN(state);
    if (state === "ACTIVE") return { state, ...millioneaVisibleFor(state, { staff: false, pass: false }) };
    const staff = await storedStaff(input.sessionUserId, deps);
    return { state, ...millioneaVisibleFor(state, { staff, pass: input.pass === true }) };
  } catch {
    return HIDDEN(state);
  }
}

/**
 * ⭐ THE PER-REQUEST ANSWER. Every Millionea route, the home card, the More row and every notice ask THIS, and React's
 * `cache` makes it one resolution per render, so two parts of one page cannot disagree. Never rejects.
 */
export const resolveMillionea = cache(async (): Promise<MillioneaResolution> => {
  try {
    const session = await getSession().catch(() => null);
    return await resolveMillioneaFor({ sessionUserId: session?.userId ?? null });
  } catch {
    return HIDDEN("WITHDRAWN");
  }
});
