// R6-C onto R5-K (temp tree F:/kipindi-wip): the ghosts R5-K rebuilt follow the pages R6-C changed; R5-K's suite re-pinned.
// CRLF kept: every file here is CRLF, each replacement is written with \n and converted.
const fs = require("fs");
const R = "F:/kipindi-wip/";
function edit(p, pairs) {
  let s = fs.readFileSync(R + p, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${p}: ${n} matches for ${a.slice(0, 80)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(R + p, crlf ? s.replace(/\n/g, "\r\n") : s);
}

// 1 · the deposit return's ghost: the page's pair stands on `gap-2` (12px) since R6-C
edit("src/app/wallet/deposit/return/loading.tsx", [
  [" * four 16px rows and one 44px control; the page is a hero, a panel of six rows, two 48px buttons (stacked on a phone,\n * 10px apart) and a footnote",
   " * four 16px rows and one 44px control; the page is a hero, a panel of six rows, two 48px buttons (stacked on a phone,\n * 10px apart then, 12px since round 6's `gap-2`) and a footnote"],
  ["      {/* ⚠️ TOKEN, not `h-10` (80px on the overridden scale): the page's two `btn-lg` pills (--h-control-lg), 10px apart. */}\n      <div className=\"flex flex-col sm:flex-row gap-[10px]\" aria-hidden>",
   "      {/* ⚠️ TOKEN, not `h-10` (80px on the overridden scale): the page's two `btn-lg` pills (--h-control-lg), 12px apart on\n          the page's `gap-2` (round 6 moved the pair off the stock 10px `gap-2.5`; merged 2026-10-09). */}\n      <div className=\"flex flex-col sm:flex-row gap-2\" aria-hidden>"],
]);

// 2 · the withdraw ghost's balance label: right-aligned from `sm`, it takes back its trailing tracking as the page's does
edit("src/app/wallet/money-form-ghost.tsx", [
  ["      <p className=\"font-mono text-micro uppercase eyebrow\"><GhostText>{t.wallet.available}</GhostText></p>\n",
   "      {/* The page's label takes back its trailing tracking from `sm`, where it is right-aligned (F19, round 6 · C11); the\n          same class here keeps the label's box the page's (merged 2026-10-09). */}\n      <p className=\"font-mono text-micro uppercase eyebrow kp-track-end\"><GhostText>{t.wallet.available}</GhostText></p>\n"],
]);

// 3 · the profile ghost's identity row: the row's name since R6-C (C13), its tab and eyebrow's
edit("src/app/profile/loading.tsx", [
  ["/** The settings rows a player is shown (`profile/page.tsx`, in its order): the invite row (the programme live for them),\n *  the identity row (not yet verified) and the rest. */",
   "/** The settings rows a player is shown (`profile/page.tsx`, in its order): the invite row (the programme live for them;\n *  its name while invites pay nothing, as today — `invite-name.ts`), the identity row (not yet verified; named after the\n *  KYC page's tab and eyebrow since round 6, C13) and the rest. */"],
  ["  [t.profile.verifyIdentity, t.profile.verifyIdSub],\n", "  [t.profile.kycIdentityVerification, t.profile.verifyIdSub],\n"],
]);

// 4 · R5-K's suite: the drawings where they stand after R6-C, each re-pin with its reason
edit("scripts/visual-pass-r5k.test.mts", [
  // the performance drawing is a named export now, beside a server loading file
  ["  performance: (req(`../${FILES.performance}`) as { default: unknown }).default,\n",
   "  // R6-C (merged 2026-10-09) moved the drawing into `performance-ghost.tsx` as `PerformanceGhost`, beside a server loading\n  // file that hands it the journey answer; rendered without it, it draws the classic words, as before.\n  performance: ((m: { default?: unknown; PerformanceGhost?: unknown }) => m.PerformanceGhost ?? m.default)(req(`../${FILES.performance}`)),\n"],
  // 3.1: the pair's gap is the page's `gap-2` (12px) since R6-C
  ["'<div className=\"flex flex-col sm:flex-row gap-2.5\">', '<p className=\"text-body-sm leading-relaxed text-text-subtle\">{t.wallet.returnFootnote}</p>']);",
   "'<div className=\"flex flex-col sm:flex-row gap-2\">', '<p className=\"text-body-sm leading-relaxed text-text-subtle\">{t.wallet.returnFootnote}</p>']);"],
  ["'<div className=\"flex flex-col sm:flex-row gap-[10px]\" aria-hidden>',", "'<div className=\"flex flex-col sm:flex-row gap-2\" aria-hidden>',"],
  ["the two `btn-lg` buttons 10px apart (`gap-2.5` ≡ `gap-[10px]`), the footnote",
   "the two `btn-lg` buttons on the page's own gap (`gap-2`, 12px — round 6 moved the pair off the stock 10px `gap-2.5`; merged 2026-10-09), the footnote"],
  ["pageOrder === \"\" && ghostOrder === \"\" && noCard && geometry(\"gap-2.5\") === geometry(\"gap-[10px]\"), j({ pageOrder, ghostOrder, noCard }));",
   "pageOrder === \"\" && ghostOrder === \"\" && noCard && geometry(\"gap-2\") === geometry(\"gap-[12px]\"), j({ pageOrder, ghostOrder, noCard }));"],
  // 4.1: the balance label takes back its trailing tracking on the page (R6-C, C11) and in the ghost
  ["<p className=\"font-mono text-micro uppercase eyebrow\"><GhostText>{t.wallet.available}</GhostText></p> <div className=\"h-[22px] w-[132px] rounded-sm bg-bg-overlay sm:ml-auto\" /> </div>')",
   "<p className=\"font-mono text-micro uppercase eyebrow kp-track-end\"><GhostText>{t.wallet.available}</GhostText></p> <div className=\"h-[22px] w-[132px] rounded-sm bg-bg-overlay sm:ml-auto\" /> </div>')"],
  ["&& squash(page).includes('<div className=\"sm:text-right shrink-0\"> <p className=\"font-mono text-micro uppercase eyebrow text-text-subtle\">')",
   "&& squash(page).includes('<div className=\"sm:text-right shrink-0\"> <p className=\"font-mono text-micro uppercase eyebrow text-text-subtle kp-track-end\">')"],
  // 5.5: the invite row's name is asked of `invite-name.ts` since R6-C (C1); the ghost draws a player's, invites unpaid
  ["  const pageRows = [...code(FILES.profilePage).matchAll(/<SettingRow icon=\\{I\\.\\w+\\}\\s+title=\\{t\\.(\\w+\\.\\w+)\\}\\s+subtitle=\\{t\\.(\\w+\\.\\w+)\\}/g)].map((m) => `${m[1]}|${m[2]}`).filter((r) => !r.startsWith(\"agent.\"));\n",
   "  // R6-C (C1, merged 2026-10-09): a player's invite row asks `invite-name.ts` for its name and line; the drawing is a\n  // player's while invites pay nothing (today), so the call reads as those two keys.\n  const INVITE_ROW = \"title={inviteName(t, { agent: false, paid: invitePayable })} subtitle={inviteLine(t, { agent: false, paid: invitePayable })}\";\n  const pageRows = [...code(FILES.profilePage).replace(INVITE_ROW, \"title={t.profile.inviteFriends} subtitle={t.profile.inviteFriendsSub}\").matchAll(/<SettingRow icon=\\{I\\.\\w+\\}\\s+title=\\{t\\.(\\w+\\.\\w+)\\}\\s+subtitle=\\{t\\.(\\w+\\.\\w+)\\}/g)].map((m) => `${m[1]}|${m[2]}`).filter((r) => !r.startsWith(\"agent.\"));\n"],
  ["    pageRows.length === 12 && j(pageRows) === j(ghostRows) && rowOk, j({ pageRows: pageRows.length, ghostRows: ghostRows.length, rowOk }));",
   "    pageRows.length === 12 && j(pageRows) === j(ghostRows) && rowOk && code(FILES.profilePage).includes(INVITE_ROW)\n      && raw(\"src/lib/journey/invite-name.ts\").includes(\"return r.agent ? t.agent.dashTitle : r.paid ? t.profile.inviteEarn : t.profile.inviteFriends;\")\n      && raw(\"src/lib/journey/invite-name.ts\").includes(\"return r.agent ? t.agent.dashSubtitle : r.paid ? t.profile.inviteEarnSub : t.profile.inviteFriendsSub;\"),\n    j({ pageRows: pageRows.length, ghostRows: ghostRows.length, rowOk }));"],
  // 7.1: the head names the section in the journey's words since R6-C (C14) — the page's `section`, the ghost's prop
  ["const PAGE = [\"<BackLink \", \"<PageHeader eyebrow={t.common.positions} title={t.performance.title} />\",",
   "const PAGE = [\"<BackLink \", \"<PageHeader eyebrow={section} title={t.performance.title} />\","],
  ["const GHOST = [\"<BackLinkGhost />\", \"<PageHeader eyebrow={t.common.positions} title={t.performance.title} />\",",
   "const GHOST = [\"<BackLinkGhost />\", \"<PageHeader eyebrow={journey ? t.journey.tabTickets : t.common.positions} title={t.performance.title} />\","],
  ["    p === \"\" && g === \"\" && count(ghost, '<section className=\"glass-panel p-5 kp-shimmer-track\" aria-hidden>') === 2, j({ p, g }));",
   "    p === \"\" && g === \"\" && count(ghost, '<section className=\"glass-panel p-5 kp-shimmer-track\" aria-hidden>') === 2\n      && page.includes(\"const section = journey ? t.journey.tabTickets : t.common.positions;\"), j({ p, g }));"],
]);
console.log("ok");
