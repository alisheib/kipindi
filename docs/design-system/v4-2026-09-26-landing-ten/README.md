# 50pick landing: handover package for Claude Code

This folder holds everything the build needs. Put it in the repo at `docs/design-brief/landing-10/` and start Claude Code with the kickoff prompt below.

## What's in the folder
| File | What it is | How Claude Code uses it |
|---|---|---|
| `KICKOFF-PROMPT.md` | The opening message for the session | Paste it as the first message |
| `HANDOVER-LANDING-10.md` | The plan: laws, layout by width, 18 work packages, gate checks V15–V21, test matrix, owner decisions, definition of done | Work through it in order |
| `SPEC-VALUES.md` | Exact values: colours mapped to tokens, type scale, spacing, sizes, motion, every component state, and the data each component needs | The source of numbers; never guess them |
| `ACCEPTANCE.md` | The eight reviewers' checklists, the component placement map and the wallet scenario, as checkboxes | The sign-off list; each item needs evidence |
| `i18n-draft.json` | 103 draft strings in en, sw and zh, taken from the concept | Map them onto existing i18n keys; sw and zh need native sign-off |
| `design/50pick Home Concept v3.dc.html` | The live concept (works in a browser) | The visual target |
| `design/50pick Review Board.dc.html` | Phone, tablet and desktop frames, the wallet scenario, the scorecard and the placement map | Visual reference |
| `design/support.js`, `design/public/brand/mark-color.svg` | The concept's runtime and logo | Needed only to open the concept |
| `before/01–05.png` | Production screenshots from 26 Sep 2026 | The before state, for comparison |

## Opening the concept
Serve the folder, for example with `npx serve docs/design-brief/landing-10/design`, then open `50pick Home Concept v3.dc.html`.

URL parameters let you jump to a state:
- `?signedIn=1` signed in
- `&balance=1` or `&balance=0` with or without money
- `&wallet=1` Wallet open
- `&locale=sw` or `&locale=zh` language

Resize the window to 360, 768 and 1280 wide. Playwright can screenshot each state at each width for side-by-side comparison with the build.

⚠️ The concept is a **picture, not code**. Its inline styles, simulated data and draft strings must not be copied into `src/`. Build with the classes in `globals.css`, the existing components and real data.
