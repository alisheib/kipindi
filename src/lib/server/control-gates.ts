/**
 * WHICH DOMAIN EACH INTERACTIVE ADMIN CONTROL REQUIRES — one definition, imported by
 * BOTH the page that renders the control and the action that enforces it.
 *
 * WHY THIS EXISTS (finding E-18/E-19, live QA campaign 2026-08-01). The admin console
 * has a THREE-layer gate — nav item, route, action — and `admin-nav-groups.ts` states
 * they "MUST agree with the route + action gates (same domains)". On two surfaces they
 * did not, and the failure mode is worse than an unusable button:
 *
 *   • `/admin/resolver-queue` is the `trading` domain, so a MODERATOR sees the page AND
 *     its controls — but "Re-check this market now" and the two-admin toggle both
 *     require `compliance`. `DEFAULT_GRANTS` makes those sets DISJOINT (MODERATOR has
 *     trading and no compliance; COMPLIANCE has compliance and no trading), so on
 *     production only the 9 ADMIN accounts could work the queue.
 *   • `<AiToolkit>` renders in the admin SHELL HEADER, i.e. on every admin page for
 *     every role that can open the console, and all four of its toggles require
 *     `compliance` too.
 *
 * And clicking a control the UI offered writes `privilege_escalation_blocked` at
 * SECURITY severity — so an ordinary operator's legitimate click is recorded as an
 * attempted privilege escalation in the log a compliance officer reads. That is audit
 * pollution on a licensed platform, not just a UX wart.
 *
 * ⛔ THE FIX IS NOT TO WIDEN THE GRANTS. These controls are compliance decisions and
 * AI-spend controls; `roles.ts` says CONFIG_ROLES/COMPLIANCE_ROLES are "NEVER
 * MODERATOR". The fix is for the PAGE to ask the same question the ACTION will ask,
 * and render an explanatory read-only state instead of a control that bounces —
 * exactly the precedent `admin/objections/page.tsx` already set with `canDecide`.
 *
 * So: the domain lives HERE, once. The page reads it through `canUseControl()`; the
 * action reads it for its own `canAct()` check. They cannot drift, because there is
 * nothing to drift from. `scripts/control-gates.test.mts` fails if a new refusing
 * action appears whose domain differs from its route's without being declared here.
 */
import { canAct } from "./rbac";
import type { AdminDomain, Role } from "./roles";

/**
 * control id → the domain its server action demands.
 *
 * The id is the ACTION's name without the `Action` suffix, so the mapping back to the
 * enforcement point is mechanical. Add a row here the moment an admin control's action
 * gates on a domain that is not its own route's domain.
 */
export const CONTROL_DOMAIN = {
  /** `/admin/resolver-queue` · "Re-check this market now" — one paid AI call that can
   *  SEAL a market, so it stays a compliance decision on a trading page. */
  recheckMarketNow: "compliance",
  /** `/admin/resolver-queue` · the two-admin authorization toggle — relaxing it is the
   *  POCA §16 two-officer control (docs/COMPLIANCE-DECISIONS.md). Compliance only. */
  setTwoAdminAuth: "compliance",
  /** `/admin/resolver-queue` + `/admin/resolver/[id]` · Resolve YES/NO/VOID. This one
   *  genuinely IS trading — `requireAdminOrThrow` in `app/markets/actions.ts` checks
   *  `canAct(role, "trading")` despite its name, so a MODERATOR can seal a verdict.
   *  Declared anyway: the queue must still hide the buttons from a trading role that
   *  has VIEW but not ACT, which the Owner can create live at `/admin/roles`. */
  resolveMarket: "trading",
  /** admin shell header · the AI toolkit's four toggles (chatbot, resolution pause,
   *  auto-resolve, poll generation). AI spend + resolution policy — compliance. */
  aiToolkit: "compliance",
  /** `/admin/markets` · the emergency void kill switch — pulls a LIVE market and
   *  refunds every open stake. Deliberately tighter than the trading page that hosts
   *  it: "it moves money / closes a live pool — not a moderator job". Third instance
   *  of E-18, found by this file's own guard rather than by a click on production. */
  emergencyVoidMarket: "compliance",
} as const satisfies Record<string, AdminDomain>;

export type ControlId = keyof typeof CONTROL_DOMAIN;

/**
 * Can this role actually USE the control? The page asks this to decide what to render;
 * the action asks `canAct(role, CONTROL_DOMAIN[id])` to decide whether to allow. Same
 * question, one source.
 *
 * ADMIN (Owner) bypasses the grant table exactly as it does everywhere else, and a
 * missing role is a NO — an unauthenticated render must never offer a privileged
 * control.
 */
export async function canUseControl(
  role: string | null | undefined,
  control: ControlId,
): Promise<boolean> {
  if (!role) return false;
  if (role === "ADMIN") return true;
  return canAct(role as Role, CONTROL_DOMAIN[control]);
}
