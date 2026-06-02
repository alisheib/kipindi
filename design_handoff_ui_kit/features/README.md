# Features — index

Each subfolder is one product area, isolated. Shared primitives are **not**
copied here — features import them from `../../kit/`. See `markets/README.md`
for the signature surface (it has its own detailed doc).

## markets/  → see `markets/README.md`
The core: browse card, probability chart + sparkline, conviction dial, position
card, pool bar, bet/sell flows, win celebration, countdowns.

## proposals/
Community-proposed markets and their lifecycle.
- `vote-control.tsx` — upvote/threshold control for a proposal.
- `status-badge.tsx` — proposal state (proposed/approved/live/rejected).
- `status-timeline.tsx` — the lifecycle as a stepped timeline.
- `category-icon.tsx` — per-category iconography (sports/politics/culture…).

## badges/
Achievements + tiers.
- `Badge.tsx` — a tier/achievement badge (tier colours incl. Sovereign=claret).
- `AchievementToast.tsx` — the unlock moment toast.
- `icons.tsx` — badge icon set.

## chat/
The AI Help Companion (has its own token + style files in `tokens/globals.css`
via the chat imports).
- `ChatRoot.tsx` / `ChatPanel.tsx` / `ChatBubble.tsx` — shell, panel, message.
- `HelpMark.tsx` — the launcher mark.
- `messages/` — `Bubbles`, `Primitives`, `EmptyState`, `EscalateHandoff`,
  `RgRedirectCard` (responsible-gaming redirect inside chat).
- `types.ts` — message/role types.

## layout/
App-wide chrome.
- `app-shell.tsx` — the overall frame.
- `top-app-bar.tsx` / `bottom-nav.tsx` — desktop bar + mobile tab bar.
- `avatar-menu.tsx` / `notifications-panel.tsx` — account + alerts.
- `wallet-balance-pill.tsx` — live wallet balance (animated on change).
- `page-ribbon.tsx` — section ribbon/header.
- `public-footer.tsx` — footer with regulator/crest.
- `auth-flash.tsx` — post-auth flash message.

## landing/
- `hero-constellation.tsx` — the marketing hero (constellation motif).

## onboarding/
- `first-visit-primer.tsx` — first-visit explainer.

## profile/
- `avatar-uploader.tsx` / `name-editor.tsx` — profile editing.

## responsible-gaming/
Regulatory surfaces — calm, credible, never punitive.
- `reality-check.tsx` — session reality-check prompt.
- `self-exclude-confirm.tsx` — self-exclusion confirmation.

## settings/
- `feedback-settings.tsx` — haptics / motion / feedback preferences.

## admin/
Operator console (internal).
- `admin-shell.tsx` / `admin-mobile-nav.tsx` — console frame + mobile nav.
- `admin-charts.tsx` — operator charts.
- `period-picker.tsx` — date-range control.
