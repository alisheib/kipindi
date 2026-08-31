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
  /**
   * `/admin/resolver-queue` · the BULK resolve bar — seal every SELECTED market that
   * already clears the platform's own auto-resolve floor.
   *
   * `trading`, matching `resolveMarket` beside it and the route itself. It is the same
   * act as pressing "Resolve YES" on each of those cards in turn, through the same
   * `resolveMarket`, with the same audit rows — so gating it harder than the single-market
   * control would be theatre: the officer can already do all of it one click at a time.
   * Declared here (rather than left to the route) for the same reason `resolveMarket` is:
   * the Owner can create a role at `/admin/roles` with `trading` VIEW but no ACT, and that
   * role must see a locked bar, not one that bounces and logs the click as an escalation.
   */
  bulkResolveMarkets: "trading",
  /**
   * ⭐ `/admin/resolver-queue` · SEALING A ROW THE AUTO-RESOLVE FLOOR REFUSED — the typed
   * per-row override.
   *
   * `compliance`, and the split from `bulkResolveMarkets` above is the whole control.
   * Confirming a market the platform's own gate would seal is trading work. Sealing one it
   * REFUSED — because the AI cited espn.com where the market's approved source is
   * premierleague.com — is a relaxation of the citation gate that stands between a model's
   * read and a sealed real-money outcome. That is the same kind of decision as
   * `setTwoAdminAuth` two rows down, and it takes the same domain.
   *
   * ⚠️ WHAT THIS ACTUALLY MEANS ON THIS PLATFORM, STATED PLAINLY RATHER THAN AS AN
   * ASPIRATION — an earlier draft of this comment claimed the two halves "are supposed to
   * need two different people", and NO configuration of the system can produce two people.
   * `/admin/resolver-queue` is a `trading` route and `DEFAULT_GRANTS` makes `trading` and
   * `compliance` DISJOINT, so a COMPLIANCE officer cannot open this page at all and never
   * sees the bar. The real effect is:
   *   · a TRADING officer gets the bar, seals the rows the floor already allows, and sees a
   *     LOCKED override on the ones it refused;
   *   · the override itself is therefore **Owner-only in practice**.
   * That is the same shape `recheckMarketNow` and `setTwoAdminAuth` already have on this
   * very page, and it is documented there as a known gap rather than a design. It is the
   * SAFE direction — relaxing the citation gate is the tightest thing on this surface — but
   * it is a gap, not a separation of duties, and widening `trading` to cover it would be a
   * compliance decision, not a refactor. ⛔ Do not "fix" it by moving this key to `trading`.
   */
  bulkResolveOverride: "compliance",
  /** admin shell header · the AI toolkit's four toggles (chatbot, resolution pause,
   *  auto-resolve, poll generation). AI spend + resolution policy — compliance. */
  aiToolkit: "compliance",
  /**
   * `/admin/retention` · PURGE A CHAIN'S HISTORY — the redaction ceremony
   * (`docs/DATA-RETENTION.md` §7). The last un-actioned line of scan #1, declared 2026-08-31.
   *
   * ⛔ AND IT IS NOT THE NO-OP IT LOOKED LIKE. `purge-actions.ts` passed the literal
   * `"compliance"` to `softRequireStaff` at six call sites, so the DOMAIN was correct and
   * enforced — the security boundary was never in doubt. What was missing is that the domain
   * had two homes: the action's literal and nothing else. `control-gates.test.mts` §4 stayed
   * silent because `/admin/retention`'s own route domain already equals `"compliance"`, so its
   * mismatch check could never fire here. ⭐ Declaring it makes the action READ this constant
   * (§3 now enforces that, and the SITES entry alongside it), which is what turns a coincidence
   * into a single definition site (§0a).
   */
  purgeChainHistory: "compliance",
  /** `/admin/markets` · the emergency void kill switch — pulls a LIVE market and
   *  refunds every open stake. Deliberately tighter than the trading page that hosts
   *  it: "it moves money / closes a live pool — not a moderator job". Third instance
   *  of E-18, found by this file's own guard rather than by a click on production. */
  emergencyVoidMarket: "compliance",
  /**
   * `/admin/updown/rounds` · "Void & refund this round" — the operator's remedy for a
   * round the engine could not finish (E-23).
   *
   * ⚠️ `trading`, AND THIS WAS GOT WRONG ONCE — the correction is the interesting part.
   * It first shipped as `compliance`, by analogy with `emergencyVoidMarket` below. That
   * analogy is wrong, and production said so within the hour: `/admin/updown/rounds` is
   * a `trading` route, `DEFAULT_GRANTS` makes trading and compliance DISJOINT, so the
   * QA compliance officer opening the page got *"Your role cannot view this page"* while
   * the trading officer who could see it got only a lock. **Net effect: the remedy was
   * usable by the 9 ADMIN accounts and nobody else** — which is E-23 restated, not fixed.
   *
   * Why `trading` is also right on the merits, not just convenient:
   *   · `docs/UPDOWN-ARCHITECTURE.md` §10 already assigned "void a round" to
   *     MARKET_OPS_ROLES (ADMIN/COMPLIANCE/MODERATOR) before any of this. That was the
   *     subsystem's own documented decision and it was correct.
   *   · `emergencyVoidMarket` cancels a HEALTHY live market — a discretionary act that
   *     destroys a working product. This releases a round the engine has ALREADY failed
   *     to finish, and the outcome is fixed: every player gets their own stake back. A
   *     recovery lever is not a money-movement decision.
   *   · The officer who watches Up & Down rounds is the trading officer. A stuck round
   *     is an operations problem, and it is the one they will see first.
   * Residual risk, stated rather than hidden: a trading officer could void a round that
   * was about to pay a winner. It is bounded — only an UNSETTLED round qualifies, and
   * the self-healer now terminates every round within ~390s — and every use is audited
   * to the officer by name with a reason they had to type.
   *
   * Still declared here rather than hard-coded, because the Owner can create a role at
   * `/admin/roles` with `trading` VIEW but no ACT; that role must see the locked state,
   * not a button that bounces. Same reason `resolveMarket` is declared.
   */
  voidUpDownRound: "trading",

  /**
   * ⭐ E-67 · `/admin/updown` · **Generate round** — the control that replaced automatic
   * emission. Ali, 2026-08-03: *"nothing should be by 50pick automatic — my admins will enter
   * and generate every 5 min."* Every chain is STOPPED; a round now exists only because an
   * operator pressed this.
   *
   * `trading`, matching `voidUpDownRound` and the route itself — NOT `accounting`. Creating a
   * round is a trading act: it opens a book, it does not change the economics (the margin, the
   * rates and the stake bounds are all frozen from the chain and the asset). Putting it behind
   * `accounting` would reproduce E-27 exactly — a control a MODERATOR can see fully armed on a
   * page they own, which bounces on every click.
   */
  generateUpDownRound: "trading",

  // ── E-27 · the Up & Down CONFIG tier, on a trading page ────────────────────
  /**
   * `/admin/updown` · the asset registry and the economics controls. All five demand
   * `accounting` (`ensure("accounting")` in `admin/updown/actions.ts`) while the route
   * is `trading`, so a MODERATOR sees every one of them fully armed and every one bounces.
   *
   * ⛔ NOT widened, and the reason is written down rather than assumed:
   * `docs/UPDOWN-ARCHITECTURE.md` §10 assigns "Asset registry + rate profile + thresholds
   * + reading method" to CONFIG_ROLES, **"never MODERATOR — it changes economics"**. That
   * is the subsystem's own decision and it is correct: `minMoveTicks` decides void-vs-
   * outcome, the rate profile is the fee a round freezes, and the reading method chooses
   * what settles real money. So the page must render a locked state, exactly as E-18 did.
   *
   * ⚠️ The consequence, stated plainly because it is a real operational gap and not a
   * detail: `DEFAULT_GRANTS` gives COMPLIANCE `accounting` **view-only** and FINANCE (the
   * one non-Owner role with `accounting` act) **no `trading` view at all** — so it cannot
   * open this page. Net effect: these five controls are **Owner-only in practice**, while
   * the architecture doc and this file's own sibling comment both say "ADMIN/COMPLIANCE".
   * Declaring them here does not close that gap; it makes it visible. Whether a non-Owner
   * should be able to turn the price feed on is Ali's decision (§6m).
   */
  createAsset: "accounting",
  updateAsset: "accounting",
  toggleAsset: "accounting",
  /** `/admin/updown` · mock ⇄ twelvedata ⇄ AI. Chooses what settles real money. */
  updateReadingMethod: "accounting",
  /** `/admin/updown` · staleness window, confidence floor, attempts, backoff ladder. */
  updateThresholds: "accounting",

  /**
   * `/admin/updown/proposals` · "Arm" — its own comment says why it is tighter than its
   * route: *"arming starts a chain that moves real money"*.
   *
   * ⚠️ Recorded, not changed: `setChainState` ("Start", on `/admin/updown`) starts a chain
   * too and is `trading`. The same act therefore has two domains depending on which page
   * it is reached from. That inconsistency is a product decision, not a bug this file may
   * settle on its own — see §6m.
   */
  armProposal: "accounting",

  /** `/admin/proposals` · prize economics — its comment: *"config = prize economics
   *  (money-grade)"*. Route is `trading`. */
  saveProposalsConfig: "accounting",
  /** `/admin/proposals` · approving grants the proposer's bonus, so it is `growth` on a
   *  `trading` page — and `growth` is disjoint from `trading` in `DEFAULT_GRANTS`. */
  approveProposal: "growth",
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
