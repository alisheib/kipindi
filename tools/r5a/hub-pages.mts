const { dict } = await import("file:///F:/kipindi-r5a/src/lib/i18n-dict.ts");
const at = (t: any, p: string) => p.split(".").reduce((v, k) => (v == null ? v : v[k]), t);
const v = (p: string) => ["sw", "en", "zh"].map((l) => at((dict as any)[l], p)).join(" | ");
const ROWS: [string, string, string[]][] = [
  ["results", "common.results", ["results.title (h1 sr-only + visible label)"]],
  ["live", "common.live", ["common.live+common.markets (h1 sr-only)"]],
  ["leaderboard", "common.leaderboard", ["leaderboard.title (eyebrow)", "leaderboard.topPredictors (h1)"]],
  ["fairness", "footer.resolutionAttestation", ["common.resolutionAttestation (eyebrow)", "common.howAMarketResolves (h1)"]],
  ["help", "common.help", ["help.pageTitle (eyebrow)", "help.heading (h1)"]],
  ["wallet", "common.wallet", ["common.walletLabel (eyebrow)", "common.yourFunds (h1)", "wallet.title (loading eyebrow)"]],
  ["withdraw", "journey.withdrawAction", ["wallet.withdrawTitle (eyebrow)", "wallet.moveFundsOut (h1)"]],
  ["limits", "footer.setLimits", ["rg.playerProtection (eyebrow)", "profile.responsibleGambling (h1)"]],
  ["invite", "profile.inviteFriends", ["profile.inviteFriends (h1 sr-only, unpaid)", "profile.inviteEarn (h1 sr-only, paid)"]],
  ["proposals", "common.proposeEarn", ["proposals.title (h1 sr-only)"]],
  ["profile", "common.profile", ["profile.title (h1 sr-only, + name)"]],
  ["kyc", "common.verifyId", ["profile.kycIdentityVerification (eyebrow)", "profile.verifyIdentity (h1)"]],
  ["notifications", "common.notifications", ["notif.eyebrow (eyebrow)", "notif.title (h1)"]],
  ["search", "common.search", ["market.title (h1 sr-only of /markets)"]],
  ["agent", "agent.footerLink", ["agent.eyebrow (eyebrow)", "agent.title (h1)"]],
];
for (const [id, label, pages] of ROWS) {
  console.log(`\n${id}: ROW ${label} = ${v(label)}`);
  for (const p of pages) { const key = p.split(" ")[0].split("+"); console.log(`    PAGE ${p} = ${key.map(v).join("  +  ")}`); }
}
