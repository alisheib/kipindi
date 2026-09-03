/**
 * RED anchors for `npm run red:invite-coming-soon` — the control for
 * `test:invite-coming-soon` (Invite & Earn coming-soon coverage, 2026-09-03).
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE. `red-anchors.test.mts` audits every declared anchor without
 * running the harness that injects it — declaring these here, rather than only inline in
 * `red-invite-coming-soon.mjs`, is what lets it. Same law as `motion-ladder.anchors.mjs` beside it.
 *
 * Each mutation is a way this feature would REALISTICALLY be half-shipped: one entry point left
 * consulting nothing, the page checking the switch too late, or a locale left without the words.
 * A guard that only catches "somebody deleted everything" is not a guard.
 */

export const MUTATIONS = [
  {
    // §2.1 — the shape this rule exists for: ONE surface left behind. The wallet card is the
    // likeliest, because it is the only entry point that is not in a nav file.
    name: "wallet-client.tsx — the zero-bonus card stops consulting the switch",
    file: "src/app/wallet/wallet-client.tsx",
    from: `              {!inviteIsLive() && <ComingSoonBadge label={t.profile.inviteComingSoonTag} size="xs" />}`,
    to: `              {false && <ComingSoonBadge label={t.profile.inviteComingSoonTag} size="xs" />}`,
    expect: "2.1",
  },
  {
    // §2.1 again, on a nav surface — proves the rule is not pinned to one file.
    name: "top-app-bar.tsx — the More overflow stops consulting the switch",
    file: "src/components/layout/top-app-bar.tsx",
    from: `        { href: "/profile/invite", label: t.common.invite, comingSoon: !inviteIsLive() },`,
    to: `        { href: "/profile/invite", label: t.common.invite },`,
    expect: "2.1",
  },
  {
    // ⭐ §3.3 — THE ORDERING MUTATION, and the one worth the most. The page still consults the
    // switch (so §3.1 stays green and a "does it check?" rule would pass), but it does so AFTER
    // the referral summary has already been fetched — i.e. a real code has been minted for a
    // player during a closed programme. Only a POSITIONAL assertion catches this.
    name: "invite/page.tsx — the guard moves BELOW the referral read (still present, now useless)",
    file: "src/app/profile/invite/page.tsx",
    from: `  if (!inviteIsLive()) {`,
    to: `  const _summaryFirst = await getPlayerReferralSummary(session.userId);\n  if (!inviteIsLive()) {`,
    expect: "3.3",
  },
  {
    // §4 — a locale left behind. `undefined` renders as an empty flag, which looks like a
    // styling bug rather than a missing translation, so nobody files it.
    name: "i18n-dict.ts — the Swahili coming-soon tag is dropped",
    file: "src/lib/i18n-dict.ts",
    from: `      inviteComingSoonTag: "Inakuja",`,
    to: `      inviteComingSoonTagMISSING: "Inakuja",`,
    expect: "4.inviteComingSoonTag",
  },
];
