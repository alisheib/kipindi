# TOKENS-USED — the mechanical check, run

> §d: *"⛔ **The mechanical check runs first** — every `var(--token)` the handover claims must
> already exist in `globals.css :root` / `motion.css`; an invented token **fails** the handover,
> it is not negotiated."*
>
> **Run 2026-09-03, before [`MOTION.md`](MOTION.md) was written. 14 of 14 resolve. PASS.**

## The check

Every token named in this handover, read back out of `src/app/motion.css` — the value column is
what the file actually says, not what the handover assumed it says.

| token | value in `motion.css` | named by |
|---|---|---|
| `--t-flick` | `90ms` | beat 1 (side pick) |
| `--t-quick` | `140ms` | reference ladder |
| `--t-base` | `220ms` | beat 3 (dial settle), beat 4 (scrim) |
| `--t-move` | `340ms` | beat 2 (panel arrives) |
| `--t-stage` | `520ms` | beat 4 (modal), beat 5 (seal) |
| `--t-max` | `620ms` | reference ladder (ceiling) |
| `--m-settle` | `cubic-bezier(0.16, 0.9, 0.24, 1.004)` | beats 2, 4, 5 |
| `--m-glide` | `cubic-bezier(0.32, 0.72, 0, 1)` | beat 1 |
| `--m-leave` | `cubic-bezier(0.55, 0, 0.85, 0.3)` | reference (exits) |
| `--m-breathe` | `cubic-bezier(0.65, 0, 0.35, 1)` | reference (loops) |
| `--m-pivot` | `cubic-bezier(0.34, 1.4, 0.44, 1)` | beat 3 — **and nowhere else** (§M8) |
| `--m-press` | `0.97` | beat 1 |
| `--m-stagger` | `40ms` | §3 stagger |
| `--m-blur-behind` | `7px` | beat 4 (scrim) |

## How to re-run it

```
for t in --t-flick --t-quick --t-base --t-move --t-stage --t-max \
         --m-settle --m-glide --m-leave --m-breathe --m-pivot --m-press \
         --m-stagger --m-blur-behind; do
  grep -qE "^\s*$t\s*:" src/app/motion.css && echo "  ok $t" || echo "  MISSING $t"
done
```

⭐ **And the standing version of this check is now a guard, not a shell loop.**
`test:motion-ladder` **§3** asserts that nothing outside `motion.css` *declares* a curve or a
duration, and **§4** that `--m-pivot` is used only by the needle and dials. Both are RED-proven
(`red:motion-ladder`, 6/6). A future handover that invents a token fails §3 on the day it lands,
without anyone remembering to run a loop.

## ⛔ What this check does NOT prove

Say it plainly, because a green table invites the wrong conclusion:

- It proves the tokens **exist**. It does not prove any surface **uses** them — that is
  `test:motion-ladder` §1.1 and `BASE=… npm run test:motion`.
- It proves the tokens exist **in the source**. It does not prove they **resolve in a browser** —
  and that distinction is not academic here: `chat-tokens.css` is `@import`ed at the top of
  `globals.css` while `motion.css` loads after it, and that ordering silently zeroed the chat
  surface's motion once already. Row 7's browser drive asserted every `--cm-*` computes to the
  literal read out of `motion.css` **in the same run**, which is the only form of this check that
  can catch a cascade fault.
