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

## Unmerged branches kept for reference

Branches from programmes the journey supersedes. They are never deleted.

| Branch | Last commit | Programme | Note |
|---|---|---|---|
| _(none)_ | | landing v3 | Checked 2026-09-29 against `origin`: every landing-v3 branch is already merged into `main`, so no landing branch needs keeping. The only branch ahead of `main` is `mobile-visual` (the Mobile Visual programme), and the journey does not supersede it. |
