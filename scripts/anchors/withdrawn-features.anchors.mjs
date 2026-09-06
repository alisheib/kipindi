/**
 * RED anchors for `npm run red:withdrawn-features` — the control for §6–§8 of
 * `test:withdrawn-features` (invite/bonus withdrawal, 2026-09-06).
 *
 * ⭐ SUCCESSOR TO `invite-coming-soon.anchors.mjs`, which was retired with its suite. That file's
 * three source anchors quoted lines this withdrawal DELETED, so `test:red-anchors` went 1291/0 →
 * 1288/3: the anchors could no longer resolve, and a red harness that cannot inject is a control
 * that silently stopped controlling. ⛔ That is the failure mode this whole mechanism exists to
 * prevent, so it was replaced rather than dropped.
 *
 * ⛔ ONLY §6–§8 ARE ANCHORABLE. §1–§5 of that suite are RUNTIME tests — they import the real
 * modules and drive the real services, so they do not read `KP_SRC` and a copied-tree mutation
 * cannot reach them. Their control is the manual harness recorded in docs/BONUS-WITHDRAWAL.md §5
 * (neutralise the RG gate, drop `!bonusFunded`, soften WITHDRAWN → COMING_SOON). Anchoring a
 * mutation to a section it cannot affect would be worse than no anchor: a green run that proves
 * nothing at all.
 *
 * Each mutation below is a realistic way this withdrawal would be HALF-shipped.
 */

export const MUTATIONS = [
  {
    // §7 — the shape the positional rule exists for: ONE surface left behind, still linking to
    // the page but no longer asking whether it may. The file's other references stay intact, so
    // a file-level "does it mention the gate?" check would sail straight past this.
    name: "bottom-nav.tsx — the More rail links to Invite without consulting the gate",
    file: "src/components/layout/bottom-nav.tsx",
    from: `    inviteVisible ? [{ href: "/profile/invite", label: t.common.invite }] : [];`,
    to: `    [{ href: "/profile/invite", label: t.common.invite }];`,
    expect: "§7",
  },
  {
    // §7 on a server surface, proving the rule is not pinned to the client nav files.
    name: "profile/page.tsx — the settings row renders unconditionally",
    file: "src/app/profile/page.tsx",
    from: `          {inviteIsLiveFor(user.role) && (`,
    to: `          {true && (`,
    expect: "§7",
  },
  {
    // ⭐ §8 — THE ORDERING MUTATION, and the most valuable of the three. The page still consults
    // the gate, so a "does it check?" rule stays green — but it now does so AFTER the referral
    // summary has been fetched, i.e. a real code has been minted for a player who may not refer.
    // Only a POSITIONAL assertion catches this.
    name: "invite/page.tsx — the gate moves BELOW the referral read (present, now useless)",
    file: "src/app/profile/invite/page.tsx",
    from: `  if (!inviteIsLiveFor(viewer?.role ?? null)) notFound();`,
    to: `  const _summaryFirst = await getPlayerReferralSummary(session.userId);\n  if (!inviteIsLiveFor(viewer?.role ?? null)) notFound();`,
    expect: "§8",
  },
];
