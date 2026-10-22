# S5 round 2 — the ONE integrated render (lead asheib-f3)

Every S5 lane's round-2 branch is merged into `claude/maswali-s5-release` (the head named in your message). Now each lane
shoots ITS OWN surface on that integrated head — the same tiles the independent critics will read — so the critics judge
the product as it will ship, with every lane's work meeting every other's.

## Your tree at the integrated head (never move your branch)
`git fetch origin && git status --short` (must be clean) → `git checkout --detach <integrated head>` → confirm
`git rev-parse --short=9 HEAD`. Your node_modules stay valid (same lockfile; check `git diff --quiet <your old head>
HEAD -- package-lock.json`; if it differs, stop and tell the lead).

## Shoot your whole surface (heavy: through your slot helper; your own ports and KP_SCRATCH_PORT)
- Every state your seed and shot scripts cover, at 320 · 360 · 768 · 1024 · 1280 · 1920 × sw / en / zh, every page to its
  end, plus motion frames where your scripts capture them and the reduced-motion end states.
- Tiles into `$F/render/<tag>/<lane>/` (the tag in the lead's message), named `<page|state>-<locale>-<width>[-sN].png`;
  a one-line `INDEX.md` per folder listing what each prefix shows (the critics read it first).
- Your lane-specific drives too (HUB: drives a/b/c; SLIP: the multi-slip + way-back; DOORS' door drive + door-preview +
  qa:maswali-door-dark — run by the lead or the OB agent; REGISTER: states + sunset + the hop drive in FULL
  (qa:millionea-ghost-hops, 17 hops + --prove-red); TICKETS: states/moments/ghosts/sunset + the landing line; PLATFORM:
  D10–D15 + rail gaps + notice-bar widows + route entrance).
- READ every tile yourself, sw first; fix only what is plainly yours and small (guard + plant, push on a NEW branch
  `claude/maswali-s5-r3-<lane>` from the integrated head); everything else goes into your report for the critics' round.

## Report
The tile folder and its INDEX, every run's printed counts, what you fixed (branch + commits) and what you saw that is not
yours (file, line, tile). Then wait: the critics score on these tiles, and their findings come back to you.
