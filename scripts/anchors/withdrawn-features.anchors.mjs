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
 * Each mutation below is a realistic way an invite entry point would ship UNGATED: shown to a viewer
 * the seam refuses (signed out; closed, suspended or self-excluded; an agent out of standing), or
 * minting a code before the gate is asked. (Written for the 2026-09-06 withdrawal; since 2026-09-25 the
 * invite is ACTIVE and unpaid, and the gate is the eligibility seam.)
 */

export const MUTATIONS = [
  {
    // §7 — the shape the positional rule exists for: ONE surface left behind, still linking to
    // the page but no longer asking whether it may. The file's other references stay intact, so
    // a file-level "does it mention the gate?" check would sail straight past this.
    // ⚠️ RE-ANCHORED 2026-09-26: the row's label became `t.profile.inviteFriends` (the page's own
    // name). Same mutation, same meaning — the gate is dropped and the row renders for everyone.
    name: "bottom-nav.tsx — the More rail links to Invite without consulting the gate",
    file: "src/components/layout/bottom-nav.tsx",
    from: `    inviteVisible ? [{ href: "/profile/invite", label: t.profile.inviteFriends }] : [];`,
    to: `    [{ href: "/profile/invite", label: t.profile.inviteFriends }];`,
    expect: "§7",
  },
  {
    // §7 — the FOOTER door (added 2026-09-26). It renders on every page at every width, signed out
    // too, so a footer link that forgot its gate would show a signed-out visitor, a self-excluded
    // player and an agent out of standing a door the page refuses them.
    name: "public-footer.tsx — the footer links to Invite for everyone",
    file: "src/components/layout/public-footer.tsx",
    from: `          {inviteVisible && <FooterLink href="/profile/invite">{t.profile.inviteFriends}</FooterLink>}`,
    to: `          {<FooterLink href="/profile/invite">{t.profile.inviteFriends}</FooterLink>}`,
    expect: "§7",
  },
  {
    // §7 on a server surface, proving the rule is not pinned to the client nav files.
    // ⚠️ RE-ANCHORED 2026-09-25. The row stopped calling `inviteViewerFor` inline — the viewer is
    // read ONCE at the top of the page now, because the unpaid player invite made the row's WORDS
    // depend on the same fact as its visibility. The mutation is unchanged in meaning: the gate is
    // removed and the row renders for everyone. ⛔ Re-anchoring is mandatory when the quoted line
    // moves; an anchor that cannot inject is a control that has silently stopped controlling, which
    // is the exact failure recorded in this file's own header.
    name: "profile/page.tsx — the settings row renders unconditionally",
    file: "src/app/profile/page.tsx",
    from: `          {inviteIsLiveFor(inviteViewer) && (`,
    to: `          {true && (`,
    expect: "§7",
  },
  {
    // ⭐ §8 — THE ORDERING MUTATION, and the most valuable of these. The page still consults
    // the gate, so a "does it check?" rule stays green — but it now does so AFTER the referral
    // summary has been fetched, i.e. a real code has been minted for a player who may not refer.
    // Only a POSITIONAL assertion catches this.
    name: "invite/page.tsx — the gate moves BELOW the referral read (present, now useless)",
    file: "src/app/profile/invite/page.tsx",
    from: `  if (!inviteIsLiveFor(inviteViewer)) notFound();`,
    to: `  const _summaryFirst = await getPlayerReferralSummary(session.userId);\n  if (!inviteIsLiveFor(inviteViewer)) notFound();`,
    expect: "§8",
  },
];
