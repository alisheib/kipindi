/**
 * U47b-2 · WHO IS LOOKING AT THE LIVE CAMPAIGN PAGE — `LiveViewer` from the officer's STORED row, read ONCE, then asked of its
 * three cells (ENGINE-SPEC §4.15 decisions 2, 7 and 8):
 *   · `mayAct` — may the role ACT in the campaign's domain (`canAct` on `domainForPath("/admin/campaigns")`, growth — the
 *     act grant, decision 7; the Owner always may);
 *   · `reads`  — may it read a number (`identity.contact` read — `mayReveal`, the cell that reveals one: E23's floor);
 *   · `money`  — may it read money (`campaignMoneyVisible`, the ONE decider — OD24).
 * The page's first render, the step, the poll and every act ask THIS, so what an officer is shown and what their press is
 * judged by are one decision, and two reads of the role can never disagree inside it (U40b's `confirmViewerFor`, the same
 * shape).
 *
 * ⛔ NEVER THE BROWSER'S WORD, AND IT FAILS CLOSED: no officer, no row, no role, a read or a decider that fails — no act, no
 * number, no money.
 * ⛔ IT DECIDES WHAT THE VIEW SHOWS AND WHAT THE SERVICES MAY SAY — never whether a request runs at all: that is each action's
 * own gate, its first statement (`softRequireStaff` for the step and the acts, `softViewStaff` for the poll). A page render is
 * gated by its own `AdminPageGate`.
 * ⛔ SERVER-ONLY (the store, the grant table). It holds no `*Action` and no directive.
 *
 * Guard: `npm run test:campaign-visuals` L2 (the actions hand THIS to the services) · Red: `npm run red:campaign-visuals`.
 */
import { db } from "@/lib/server/store";
import { currentSession } from "@/lib/server/auth-service";
import { domainForPath } from "@/lib/server/roles";
import type { Role } from "@/lib/server/roles";
import { canAct, mayReveal } from "@/lib/server/rbac";
import { campaignMoneyVisible } from "@/lib/server/marketing/estimate";
import type { LiveViewer } from "@/lib/server/marketing/campaign-live";

/** The campaign pages' domain — the route table's own answer for the section, never a literal. */
export const LIVE_DOMAIN = domainForPath("/admin/campaigns");

/** The reads `liveViewerFor` asks — swappable for the suite's in-process plants; production never passes them. */
export type LiveViewerDeps = {
  /** The officer's STORED role: one read of their own row (never the cookie's claim). */
  role: (userId: string) => Promise<Role | null>;
  /** May this role act in the campaign's domain? (`canAct` — the Owner always may.) */
  mayAct: (role: Role) => Promise<boolean>;
  /** May this role read a number? (`identity.contact` read.) */
  reads: (role: Role) => Promise<boolean>;
  /** May this role read campaign money? (`campaignMoneyVisible`.) */
  money: (role: Role) => Promise<boolean>;
};

/** Frozen: production's reads — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const LIVE_VIEWER_DEPS: Readonly<LiveViewerDeps> = Object.freeze({
  // ⛔ Through a promise: the memory twin's `findById` answers synchronously, so a throw there must become a rejection.
  role: async (userId: string): Promise<Role | null> => ((await Promise.resolve().then(() => db.user.findById(userId)))?.role ?? null) as Role | null,
  mayAct: (role: Role) => canAct(role, LIVE_DOMAIN),
  reads: (role: Role) => mayReveal(role, "identity.contact"),
  money: (role: Role) => campaignMoneyVisible(role),
});

/**
 * ⭐ THE VIEWER — the stored role read once, then each cell asked of it; every failure is the closed answer (the header).
 */
export async function liveViewerFor(userId: string | null | undefined, deps: LiveViewerDeps = LIVE_VIEWER_DEPS): Promise<LiveViewer> {
  const id = typeof userId === "string" ? userId.trim() : "";
  const closed: LiveViewer = { userId: id, mayAct: false, reads: false, money: false };
  if (id === "") return closed;
  let found: Role | null = null;
  try {
    found = await deps.role(id);
  } catch {
    return closed;
  }
  if (found === null) return closed;
  const role: Role = found;
  const ask = async (cell: (r: Role) => Promise<boolean>): Promise<boolean> => {
    try {
      return (await cell(role)) === true;
    } catch {
      return false;
    }
  };
  return { userId: id, mayAct: await ask(deps.mayAct), reads: await ask(deps.reads), money: await ask(deps.money) };
}

/**
 * ⭐ ONE CELL OF THE VIEWER — may this officer ACT on a campaign? The STORED role read once and ONLY the act grant asked of it
 * (the U47b-2 review's NIT: the campaigns list needs this one cell and was asking all three, a money decider among them, to
 * throw two answers away). The same `LiveViewerDeps` the whole viewer reads, so the list and the page can never disagree
 * about one officer. ⛔ Fails closed: no id, no row, a role read or a decider that throws or answers anything but true — no act.
 */
export async function liveMayActFor(userId: string | null | undefined, deps: LiveViewerDeps = LIVE_VIEWER_DEPS): Promise<boolean> {
  const id = typeof userId === "string" ? userId.trim() : "";
  if (id === "") return false;
  try {
    const role = await deps.role(id);
    return role !== null && (await deps.mayAct(role)) === true;
  } catch {
    return false;
  }
}

/**
 * ⭐ THE LIST'S SECOND CELL — may the officer looking at the campaigns LIST act on a campaign? The list says why a campaign
 * paused through the live page's one function (`pausedReasonSentenceFor`), and a viewer who may only LOOK must not be told to
 * "press Resume" (the U47b-1 re-review: the sentence has a view-only form). Its first cell, may they read a number, is the
 * list's own `viewerReadsContacts`. Decided here, on the server, from the STORED role (`liveMayActFor`: the act grant alone).
 * ⛔ Fails closed: no session, no row, a role or a decider that throws — no act.
 */
export async function viewerMayActOnCampaigns(): Promise<boolean> {
  const session = await currentSession();
  if (!session) return false;
  return liveMayActFor(session.userId);
}
