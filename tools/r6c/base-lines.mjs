// Base (89893725) line numbers of each cause, for the report.
import { execSync } from "node:child_process";
const BASE = "89893725";
const show = (f) => execSync(`git show ${BASE}:${f}`, { cwd: "F:/kipindi-r6c", encoding: "utf8", maxBuffer: 64 << 20 }).split(/\r?\n/);
const Q = [
  ["C12", "src/components/markets/bet-confirm-modal.tsx", [/flex items-baseline justify-between/, /TZS \{formatNumber\(stake\)\}/, /\{t\.dialog\.stakeLabel\}/]],
  ["C7", "src/components/updown/updown-stake-controls.tsx", [/udStakeRange/]],
  ["C7", "src/components/updown/round-stake-panel.tsx", [/udStakeRange/, /formatTzs\(minStake\)/]],
  ["C8", "src/app/updown/page.tsx", [/minmax\(300px/]],
  ["C8", "src/app/updown/updown-ghost.tsx", [/minmax\(300px/]],
  ["C8", "src/app/updown/history/page.tsx", [/minmax\(320px/, /udNet|NET/]],
  ["C13", "src/components/layout/avatar-menu.tsx", [/"\/profile\/kyc": t\.profile\.verifyIdentity/, /href: "\/profile\/kyc"/, /href: "\/profile\/invite"/, /\.filter\(\(r\) =>/]],
  ["C13", "src/app/profile/kyc/page.tsx", [/kycIdentityVerification/, /<h1/, /BackLink/]],
  ["C13", "src/components/journey/account/hub-rows.ts", [/verifyIdentity/, /inviteFriends/]],
  ["C13", "src/app/profile/page.tsx", [/verifyIdentity|kycIdentityVerification|Verify ID/, /inviteFriends/]],
  ["C1", "src/components/layout/public-footer.tsx", [/inviteFriends/]],
  ["C1", "src/app/profile/invite/page.tsx", [/title:/, /inviteEarnSub/, /BackLink/, /<h1/]],
  ["C1", "src/app/profile/invite/agent-dashboard.tsx", [/BackLink/, /dashTitle/]],
  ["C14", "src/components/markets/conviction-dial.tsx", [/viewPositions/]],
  ["C14", "src/app/positions/performance/page.tsx", [/BackLink/, /eyebrow=/, /noPerformance/, /tracking-\[0\.08em\]/]],
  ["C14", "src/app/help/page.tsx", [/myPositions/]],
  ["C14", "src/app/updown/[roundId]/page.tsx", [/udOpenInPositions/]],
  ["C4", "src/app/auth/login/page.tsx", [/tone: "warning"/, /cooled/]],
  ["C2", "src/components/layout/needle-drawer.tsx", [/M6 6l12 12|M6 6 L18 18/, /role="dialog"/]],
  ["C2", "src/components/chat/ChatPanel.tsx", [/cm-close/, /role="dialog"/]],
  ["C2", "src/styles/chat/chat-styles.css", [/\.cm-close/]],
  ["C9", "src/components/markets/operation-result-modal.tsx", [/<Modal$/, /panelClassName/]],
  ["C9", "src/components/markets/win-celebration.tsx", [/<Modal$/]],
  ["C10", "src/components/layout/notifications-panel.tsx", [/pickTitle\(n, locale\)/, /pickBody\(n, locale\)/]],
  ["C11", "src/components/markets/sell-confirm-modal.tsx", [/earlyExitFee|EARLY/i]],
  ["C11", "src/app/wallet/withdraw/page.tsx", [/sm:text-right/, /BackLink/]],
  ["C11", "src/app/wallet/wallet-client.tsx", [/tracking-\[0\.14em\] font-semibold/]],
  ["C11", "src/components/updown/price-hero.tsx", [/eyebrow/]],
  ["C11", "src/components/updown/round-countdown.tsx", [/eyebrow/]],
  ["C11", "src/app/updown/[roundId]/page.tsx", [/eyebrow[^"]*text-right|text-right[^"]*eyebrow/]],
  ["C16", "src/components/markets/market-card.tsx", [/size="xs"/, /aria-label=\{signal\.label\}/]],
  ["C17", "src/components/markets/position-card.tsx", [/line-clamp-2/]],
  ["C18", "src/components/journey/tickets/tickets-ghost.tsx", [/h-5 w-\[/]],
  ["BACK", "src/app/notifications/page.tsx", [/BackLink/]],
  ["BACK", "src/app/profile/responsible-gambling/page.tsx", [/BackLink/]],
  ["GAP", "src/app/wallet/deposit/return/page.tsx", [/gap-2\.5/]],
  ["GAP", "src/components/markets/side-picker.tsx", [/gap-2\.5/]],
  ["GAP", "src/app/auth/reset-password/page.tsx", [/gap-2\.5/]],
  ["GAP", "src/app/auth/verify-email/page.tsx", [/gap-2\.5/]],
  ["GAP", "src/app/wallet/receipt/[id]/page.tsx", [/gap-2\b/]],
  ["GAP", "src/app/wallet/receipt/[id]/loading.tsx", [/gap-2\b/]],
];
for (const [id, f, pats] of Q) {
  let L; try { L = show(f); } catch { console.log(`${id} ${f}: (not in base)`); continue; }
  for (const p of pats) {
    const hits = L.map((l, i) => [i + 1, l]).filter(([, l]) => p.test(l)).slice(0, 4);
    console.log(`${id} ${f} ${p} -> ${hits.map(([n, l]) => `${n}: ${l.trim().slice(0, 110)}`).join(" | ") || "none"}`);
  }
}
