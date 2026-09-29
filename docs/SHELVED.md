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
| _(none yet: the first rows arrive with S6)_ | | | | | |

## Unmerged branches kept for reference

Branches from programmes the journey supersedes. They are never deleted.

| Branch | Last commit | Programme | Note |
|---|---|---|---|
| _(none)_ | | landing v3 | Checked 2026-09-29 against `origin`: every landing-v3 branch is already merged into `main`, so no landing branch needs keeping. The only branch ahead of `main` is `mobile-visual` (the Mobile Visual programme), and the journey does not supersede it. |
