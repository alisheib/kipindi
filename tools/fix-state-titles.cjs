// After R6-C's one-name rule (C1) and C13: a loading drawing never states a reader's state it cannot know. The KYC and
// invite ghosts showed a title that is right for one reader and false for another; both are set and not shown now.
// Usage: node fix-state-titles.cjs <root>
const fs = require("fs");
const R = (process.argv[2] || "F:/kipindi-wip").replace(/\/?$/, "/");
function edit(p, pairs) {
  let s = fs.readFileSync(R + p, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${p}: ${n} matches for ${a.slice(0, 90)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(R + p, crlf ? s.replace(/\n/g, "\r\n") : s);
}

edit("src/app/profile/kyc/loading.tsx", [
  [" * /profile/kyc opens on its back link and its hero — the page's own `PageHeader` and its sentence (set and not shown,\n * in the page's type and measure) — on the page's 24px rung. The hero is the unverified player's (\"Verify your identity\"\n * and its review-time sentence), the reader this page is for; a pending, approved or refused account reads its own.\n",
   " * /profile/kyc opens on its back link and its hero — the page's own `PageHeader` and its sentence (set and not shown,\n * in the page's type and measure) — on the page's 24px rung. The hero is the unverified player's (\"Verify your identity\"\n * and its review-time sentence), the reader this page is for; a pending, approved or refused account reads its own.\n" +
   " * ⛔ THE TITLE IS SET AND NOT SHOWN (2026-10-09, after round 6's C13): it states the reader's verification — \"Verify your\n * identity\", \"Your identity is verified\", \"We couldn't verify you\" — which this drawing cannot know, and a verified\n * player read \"Verify your identity\" until the page arrived. It keeps the unverified title's width (the case drawn); the\n * eyebrow, the page's name in every state, stays shown.\n"],
  ["eyebrow={t.profile.kycIdentityVerification} title={t.profile.verifyIdentity} />",
   "eyebrow={t.profile.kycIdentityVerification} title={<GhostText>{t.profile.verifyIdentity}</GhostText>} />"],
]);

edit("src/app/profile/invite/loading.tsx", [
  ["import { BackLinkGhost } from \"@/components/ui/back-link\";\n", "import { BackLinkGhost } from \"@/components/ui/back-link\";\nimport { GhostText } from \"@/components/ui/ghost-text\";\n"],
  [" * /profile/invite opens on its back link and its title row (19px, set solid), on the page's 24px rung. The title is\n * the unpaid invitation's — \"Invite friends\" with no chip — the page every player who is not a paid agent is shown.\n",
   " * /profile/invite opens on its back link and its title row (19px, set solid), on the page's 24px rung. The title is\n * the unpaid invitation's — \"Invite friends\" with no chip — the page every player who is not a paid agent is shown.\n" +
   " * ⛔ SET AND NOT SHOWN (2026-10-09, after round 6's C1): the page names itself for its reader (`invite-name.ts` — an\n * agent's dashboard, \"Invite & Earn\" while invites pay, otherwise \"Invite friends\"), which this drawing cannot know; it\n * keeps the unpaid name's width and shows no name an agent or a paid player would not read.\n"],
  ["<p className=\"font-display text-[19px] font-bold leading-none\">{t.profile.inviteFriends}</p>",
   "<p className=\"font-display text-[19px] font-bold leading-none\"><GhostText>{t.profile.inviteFriends}</GhostText></p>"],
]);

edit("scripts/visual-pass-r5l.test.mts", [
  ["\"title={t.profile.verifyIdentity}\"]],\n",
   "\"title={<GhostText>{t.profile.verifyIdentity}</GhostText>}\"]], // set and not shown since 2026-10-09 (1.4)\n"],
  ["/* ══ §2 · THE SAME RULE IN THE PAGE: EVERY IN-PAGE SUSPENSE SKELETON IS ITS ROUTE'S OWN GHOST ═══════════════════════ */",
   "{\n" +
   "  // A TITLE THAT STATES THE READER'S STATE IS SET AND NOT SHOWN (2026-10-09, after round 6's C1 and C13): /profile/kyc's h1\n" +
   "  // is its reader's verification, /profile/invite's title its reader's programme (`invite-name.ts`); the drawing knows\n" +
   "  // neither, so it keeps the case drawn's width inside a word bar and shows no word a reader in another state would not read.\n" +
   "  const STATE_TITLES: Array<[string, string, (l: Locale) => string]> = [\n" +
   "    [\"src/app/profile/kyc/loading.tsx\", \"title={<GhostText>{t.profile.verifyIdentity}</GhostText>}\", (l) => dict[l].profile.verifyIdentity],\n" +
   "    [\"src/app/profile/invite/loading.tsx\", \"<GhostText>{t.profile.inviteFriends}</GhostText>\", (l) => dict[l].profile.inviteFriends],\n" +
   "  ];\n" +
   "  const shown: string[] = [];\n" +
   "  for (const [f, , word] of STATE_TITLES) for (const l of LOCALES) if (wordsIn(render(f, l), [word(l)]).length) shown.push(`${f} ${l}: \"${word(l)}\" shown`);\n" +
   "  const kycPage = REAL(\"src/app/profile/kyc/page.tsx\"), invitePage = REAL(\"src/app/profile/invite/page.tsx\");\n" +
   "  ok(\"1.4 · RUN in sw, en and zh: a title that states the reader's state is set and not shown — /profile/kyc's (unverified, verified, refused) and /profile/invite's (an agent's dashboard, a paid or an unpaid player's name): each drawing keeps the case drawn's width inside a word bar\",\n" +
   "    shown.length === 0 && STATE_TITLES.every(([f, s]) => REAL(f).includes(s)) && kycPage.includes(\"t.profile.verifyTitleApproved\") && invitePage.includes(\"inviteName(t, { agent: false, paid })\"), shown.join(\" | \"));\n" +
   "  ok(\"1.4′ PLANT · the KYC title shown again (the old drawing) is reported\", !planted(STATE_TITLES[0][0], STATE_TITLES[0][1], \"title={t.profile.verifyIdentity}\")(STATE_TITLES[0][0]).includes(STATE_TITLES[0][1]));\n" +
   "}\n\n" +
   "/* ══ §2 · THE SAME RULE IN THE PAGE: EVERY IN-PAGE SUSPENSE SKELETON IS ITS ROUTE'S OWN GHOST ═══════════════════════ */"],
]);
console.log("ok");
