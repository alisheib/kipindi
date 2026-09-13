# House Bots — START HERE (any machine, any session)

**What this is:** the approved plan and live progress tracker for **House Bots**. The owner designates real 50pick accounts, and a
server engine stakes from them on Up & Down rounds and polls, so players see real money to win. It was planned and approved
2026-09-13 and is being built on branch **`house-bots`**.

**Where we are right now → [`PROGRESS.md`](PROGRESS.md)** (read its "RESUME AT" block first).
From a phone or any browser: https://github.com/alisheib/kipindi/blob/house-bots/plans/house-bots/PROGRESS.md

## Files
| File | What it is | Authority |
|---|---|---|
| `PROGRESS.md` | Status, resume point, commit checklist, release steps, session log | **The only record of progress** |
| `00-NEW-SESSION-PROMPT.md` | Paste into a new Claude Code session to build or resume | — |
| `PLAN.md` | Approved plan: decisions D1–D16, invariants, flows, data, engine, console, verification; §18 reconciles overlaps | 3rd |
| `04-amendments.md` | Verified amendments A1–A24, C1–C15, R1–R9, P1–P4, S1–S5, F1–F9, all mandatory | **1st** |
| `02-sealed-flows.md` | Every flow step by step (password lifecycle in depth) | 2nd |
| `03-design-spec.md` | Screen-by-screen design law and the render/responsive protocol | 2nd |
| `01-scenario-register.md` | 241 scenarios, each with its expected behaviour and test | reference |

**Order of authority:** `04-amendments.md` > `02-sealed-flows.md` / `03-design-spec.md` > `PLAN.md`. Where any of them
disagrees with the code, trust the code and fix the doc in the same commit.

## Resume on any machine
1. **Get the repository**
   - If `C:\kipindi-main` doesn't exist: `git clone https://github.com/alisheib/kipindi.git C:\kipindi-main`.
   - If it does: `git -C C:\kipindi-main fetch origin`. That's safe even if another session is working there: fetch never touches its working tree.
2. **Get the House Bots worktree**
   - If `C:\kipindi-house-bots` doesn't exist: `git -C C:\kipindi-main worktree add C:\kipindi-house-bots house-bots`. Git creates the local branch tracking `origin/house-bots`.
   - If it does exist: `git -C C:\kipindi-house-bots pull --rebase`.
3. **Install:** `cd C:\kipindi-house-bots && npm ci`. It needs its own `node_modules`; never junction another folder's.
4. **Secrets** are not in git. Set up `.env`, the Railway CLI login and local Postgres per `docs/SETUP.md`.
5. **Start a new Claude Code session** and paste the contents of `plans/house-bots/00-NEW-SESSION-PROMPT.md`.

⛔ **Never build, stage or check out in a checkout another session is using.** ⛔ **Never push to `main` before Release step R4**;
pushing `main` is a live deploy. Pushing `house-bots` is safe: Railway deploys only `main`, and CI runs only on `main` and PRs.
