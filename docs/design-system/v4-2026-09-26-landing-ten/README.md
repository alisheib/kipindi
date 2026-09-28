> ## ⚠️ READ THIS BEFORE THE PAGE BELOW — IT IS THE DESIGNER'S NOTE, AND TWO OF ITS LINES ARE NO LONGER TRUE HERE
>
> **WHERE THIS LIVES.** The note below says to put the package at `docs/design-brief/landing-10/`.
> It is filed **here** instead, because this folder already held the v3 delivery of the same
> package and the landing-v3 campaign cites it by this path — `docs/LANDING-TEN.md` and
> `INHERIT-MANIFEST.md` both link into it. Moving it would have broken a live campaign's
> references to tidy a directory name. ⛔ There is no `docs/design-brief/landing-10/`; do not
> create one, or the next session will find two packages and no way to tell which is current.
>
> **WHAT IS CURRENT (installed 2026-09-28).**
> | File | Revision |
> |---|---|
> | `UPDATE-2026-09-28.md` | ⭐ **Read first. It supersedes any line it conflicts with**, incl. in the handover below |
> | `HANDOVER-LANDING-10.md`, `SPEC-VALUES.md`, `ACCEPTANCE.md`, `KICKOFF-PROMPT.md`, `i18n-draft.json` | v4 |
> | `design/50pick Review Board.dc.html` | v4 (a superset of v3 — §3e/§3f plus §3g–§3j, which the v4 `ACCEPTANCE.md` cites) |
> | `design/v4/50pick Home Concept v4.dc.html` | ⭐ the current visual target, with its **own** `support.js` beside it |
> | `design/50pick Home Concept v3.dc.html` | **kept deliberately** — `INHERIT-MANIFEST.md` cites it by name as the target the shipped work was built against. The two concepts need different runtimes, which is why v4 is self-contained in `design/v4/` |
> | `before/*.png` | unchanged — byte-identical to the v3 drop |
> | `INHERIT-MANIFEST.md`, `specs/*.md` | **not the designer's** — the landing-v3 lane's own authored work. Nothing here replaced them |
>
> **⚠️ §0 OF `UPDATE-2026-09-28.md` IS A TARGET STATE, NOT AN INVENTORY.** It describes
> `wallet-sheet.tsx`, two `hero-deposit` links and a `funded` branch as things "the repo has now".
> On 2026-09-28 the first two did not exist and the third had just landed with R1. Read §0 as spec.
>
> **STATUS: §1–§3 of the update are BUILT AND LIVE** (`37bde8a5`) — the header pill yields below
> 1024, the rail carries the centre Deposit coin, Results moved into More. Gates **V22** and **V25**
> ship with them, both RED-PROVED on production (`ccfa54f0`). The rest of §4 is open, and most of it
> overlaps the landing-v3 lane's own work packages — **reconcile before starting any of it.**
>
> **The concept opens from `design/v4/`**, not from `design/`:
> `npx serve docs/design-system/v4-2026-09-26-landing-ten/design/v4`

# 50pick landing: handover package for Claude Code

This folder holds everything the build needs. Put it in the repo at `docs/design-brief/landing-10/` and start Claude Code with the kickoff prompt below.

## What's in the folder
| File | What it is | How Claude Code uses it |
|---|---|---|
| `UPDATE-2026-09-28.md` | **Read first if the earlier plan is already built.** It covers the header Deposit pill, the rail coin, Results in More, and the v4 delta | Its own kickoff is in §6 |
| `KICKOFF-PROMPT.md` | The opening message for the session | Paste it as the first message |
| `HANDOVER-LANDING-10.md` | The plan: laws, layout by width, 18 work packages, gate checks V15–V21, test matrix, owner decisions, definition of done | Work through it in order |
| `SPEC-VALUES.md` | Exact values: colours mapped to tokens, type scale, spacing, sizes, motion, every component state, and the data each component needs | The source of numbers; never guess them |
| `ACCEPTANCE.md` | The eight reviewers' checklists, the component placement map and the wallet scenario, as checkboxes | The sign-off list; each item needs evidence |
| `i18n-draft.json` | 103 draft strings in en, sw and zh, taken from the concept | Map them onto existing i18n keys; sw and zh need native sign-off |
| `design/50pick Home Concept v4.dc.html` | The live concept (works in a browser) | The visual target |
| `design/50pick Review Board.dc.html` | Phone, tablet and desktop frames, the wallet scenario, the scorecard and the placement map | Visual reference |
| `design/support.js`, `design/public/brand/mark-color.svg` | The concept's runtime and logo | Needed only to open the concept |
| `before/01–05.png` | Production screenshots from 26 Sep 2026 | The before state, for comparison |

## Opening the concept
Serve the folder, for example with `npx serve docs/design-brief/landing-10/design`, then open `50pick Home Concept v4.dc.html`.

URL parameters let you jump to a state:
- `?signedIn=1` signed in
- `&balance=1` or `&balance=0` with or without money
- `&wallet=1` Wallet open
- `&locale=sw` or `&locale=zh` language

Resize the window to 360, 768 and 1280 wide. Playwright can screenshot each state at each width for side-by-side comparison with the build.

⚠️ The concept is a **picture, not code**. Its inline styles, simulated data and draft strings must not be copied into `src/`. Build with the classes in `globals.css`, the existing components and real data.
