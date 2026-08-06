# Drop the Claude Design delivery in this folder, untouched

**Ali: this is the only step that is yours.** Unzip whatever comes back into this folder
exactly as received — do not rename, tidy or merge anything. Then start a session and paste
the prompt below.

⛔ **Keep the original.** When something looks wrong six weeks from now, the first question is
always *"is this what they sent, or what we did to it?"* — and that is only answerable if the
raw delivery still exists. Nothing in here is ever edited; the integration happens in `src/`.

---

## The prompt to paste

```
The Claude Design delivery is in docs/design-brief/delivery/.

Read docs/design-brief/INTAKE.md FIRST and follow it — it is the integration playbook:
what to verify before anything moves, where each artifact goes, the ORDER (tokens before
components, because everything inherits), the gates, and what to reject.

Then read docs/design-brief/README.md for what we actually commissioned (D-0 … D-6) and
AUDIT.txt for the measured before-state.

⛔ Do not paste anything straight into src/. Do not skip the verification table in §1.
⛔ Stop after INTAKE §3 step 3 — one component per family — and LOOK at them at 360 and
   1280 in EN/SW/ZH before touching the rest.

Work in F:\kipindi-main on branch main. EVERY PUSH TO MAIN DEPLOYS LIVE.
One change, one guard proven RED first, docs updated in the SAME commit, one push, one
production verification — never batched. Another session may be active: check
`git status` before staging and stage by explicit path, never `git add -A`.
```

---

## What is NOT yours to check

Don't try to verify the tokens, the reduced-motion branches or the prop signatures — that is
what `INTAKE.md` §1 is for and a session will do it mechanically.

## What IS yours, and only yours

**Does it feel like the product?** Specifically:

1. **Is it calm?** The law says *heraldic, never casino* — a seal being pressed, not a jackpot.
   If the celebration reads as excited rather than dignified, it is wrong however well made.
2. **Does the gold look like money?** `--gilt` means *earned money* on player surfaces. It
   should read as metal, not as a highlight colour.
3. **Would you screenshot it?** The win moment is the most shared screen in the product.

⭐ If those three are right, everything else is repairable in-house. If they are wrong, say so
before a session spends a day integrating it — that is far cheaper than fixing it after.
