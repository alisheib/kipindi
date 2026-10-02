# SHELVED — code kept, not in use

> **What this file is.** Owner ruling (Ali, 2026-09-29): what the Simplified Journey cuts is taken out of USE and
> kept in the CODE, because it may be used again. Every shelved item stays at its own path under `src/`, compiles,
> and keeps its unit test wired. This file is the one record of what is shelved and how to put it back.
> Programme of record: [`docs/VODACOM-PLAN.md`](VODACOM-PLAN.md).
>
> **Rules for rows.**
> - A row is added in the SAME commit that hides the item behind the journey flag (S6–S12), not at the end.
> - Items stay IN PLACE: no `_shelved` folder, no renames. Scripts pin these paths.
> - On a line that carries a path, a link or an `npm run` command, write "shelved" or "unmounted".
>   `scripts/docs-links.mjs` stops checking lines that use other wording for this.
> - "How to re-mount" must be a working instruction, and "Test" must name a script that runs today.

| Item | Files | Why shelved | Date | How to re-mount | Test |
|---|---|---|---|---|---|
| The classic header, for journey viewers only (`TopAppBar`: its destinations, More, the gilt Deposit, and on a phone the language menu, the bell and the avatar menu) | `src/components/layout/top-app-bar.tsx`, unmounted for a journey request only | SJ-15: the journey header carries the captioned balance, "+ Weka pesa" and from 1024 the four destinations; on a phone the language menu, the notifications and the account moved to Akaunti (`/account`) | 2026-10-02 | In `src/components/layout/app-shell.tsx`, render the header ternary's else arm for every request | `npm run test:simple-journey-flag` (10.shell.chrome.header) |
| The classic rail, for journey viewers only (`BottomNav`) | `src/components/layout/bottom-nav.tsx`, unmounted for a journey request only | SJ-16: four equal tabs (Maswali, Juu/Chini, Tiketi zangu, Akaunti) replace the five-slot rail | 2026-10-02 | In `src/components/layout/app-shell.tsx`, render the rail ternary's else arm for every request | `npm run test:simple-journey-flag` (10.shell.chrome.tabs) |
| More, in both its rail and its bar variant, for journey viewers only | `src/components/layout/nav-more.tsx`, shelved with the classic header and rail | SJ-16: no More slot; what it carried is a row in Akaunti | 2026-10-02 | Comes back with the classic header or rail (rows above) | `npm run test:stacking` (its NavMore rows under both classic bars) |
| The centre Deposit coin (`data-testid="deposit-rail"`), for journey viewers only | `src/components/layout/bottom-nav.tsx`, shelved with the classic rail | SJ-16: the journey rail has no coin; money-in is "+ Weka pesa" in the header and the Wallet the capsule opens | 2026-10-02 | Comes back with the classic rail (row above) | `npm run test:wallet-reach` |
| The Juu/Chini accent dot (the gilt product-line dot on the rail and on the bar's link), for journey viewers only | `src/components/layout/bottom-nav.tsx`, `src/components/layout/top-app-bar.tsx`, shelved with them | SJ-16: the four tabs carry no accent; `test:journey-shell` 8.tabs keeps one off the journey rail | 2026-10-02 | Comes back with the classic rail and header (rows above) | `npm run test:journey-shell` |
| The email-verify bar, for journey viewers only (`EmailVerifyBanner`) | `src/components/layout/email-verify-banner.tsx`, unmounted for a journey request only | VODACOM-PLAN §3.2 item 2: no email-verify bar on the journey. The deposit screen's own email gate still stands between an unconfirmed address and a deposit, and S9 asks for the code in the flow | 2026-10-02 | In `src/components/layout/app-shell.tsx`, take `!journeyShown &&` out of the bar's mount | `npm run test:simple-journey-flag` (10.shell.emailbar) |
| The Needle on the journey's pages, for journey viewers only | `src/components/layout/needle.tsx`, shelved on `/`, a question, Tiketi zangu and the deposit screen by one term of its visibility gate | VODACOM-PLAN §3.2: the Needle, the channels panel and the chat bubble stand down on journey surfaces (`isJourneySurface` in `src/lib/surfaces.ts`) | 2026-10-02 | In `src/components/layout/needle.tsx`, take the `journeyOn && isJourneySurface(pathname)` term out of `suppressed` | `npm run test:journey-shell` (11.needle) |
| The channels panel on the journey's pages, for journey viewers only | `src/components/social/channels-panel.tsx`, shelved there by `journeyHidden` | As the Needle's row | 2026-10-02 | In `src/components/social/channels-panel.tsx`, take `journeyHidden` out of `eligible` and out of its render guard | `npm run test:journey-shell` (11.channels.eligible, 11.channels.render) |
| The chat bubble on the journey's pages, for journey viewers only | `src/components/chat/ChatRoot.tsx`, shelved there by one render guard (the conversation is kept) | As the Needle's row | 2026-10-02 | In `src/components/chat/ChatRoot.tsx`, take out the `journeyOn && isJourneySurface(pathname)` render guard | `npm run test:journey-shell` (11.chat) |

## Unmerged branches kept for reference

Branches from programmes the journey supersedes. They are never deleted.

| Branch | Last commit | Programme | Note |
|---|---|---|---|
| _(none)_ | | landing v3 | Checked 2026-09-29 against `origin`: every landing-v3 branch is already merged into `main`, so no landing branch needs keeping. The only branch ahead of `main` is `mobile-visual` (the Mobile Visual programme), and the journey does not supersede it. |
