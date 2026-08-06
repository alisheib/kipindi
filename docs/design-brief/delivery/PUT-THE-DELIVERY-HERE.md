# Drop the Claude Design delivery in this folder, untouched

**Ali: this is the only step that is yours.** Unzip whatever comes back into this folder exactly
as received — do not rename, tidy or merge anything. Then start a session and paste the prompt
below.

⛔ **Keep the original.** When something looks wrong six weeks from now the first question is
always *"is this what they sent, or what we did to it?"* — and that is only answerable if the raw
delivery still exists. Nothing in here is ever edited; integration happens in `src/`.

---

## THE PROMPT — paste this whole block

```
Integrate the Claude Design delivery. It is unzipped, untouched, in
docs/design-brief/delivery/.

Work in F:\kipindi-main on branch main. Production is https://50pick.tz.
⛔ EVERY PUSH TO MAIN DEPLOYS LIVE. There is no staging.

READ FIRST, in this order — do not open src/ before you have:
  1. docs/design-brief/INTAKE.md — THE PLAYBOOK. Follow it literally. It has the
     verification table (§1), where each artifact goes (§2), what must be DELETED when
     each piece lands (§3b), how to drive it live (§3c), the gates (§4), and what to
     reject (§5).
  2. docs/design-brief/README.md — what we commissioned, including the deliverable
     spec D-0 … D-6. Judge the delivery against it, not against taste.
  3. docs/design-brief/AUDIT.txt — the measured BEFORE: 79% no light · 60% no
     elevation · 44% no motion · 43 components with all three absent.
  4. docs/DESIGN_AUTHORITY.md — the invariants. oklch only, YES=green/NO=rose
     untouchable, gilt = earned money, one dark-royal theme, calm not casino.

⚠️ ANOTHER SESSION IS OFTEN ACTIVE IN THIS TREE.
  · `git status` before you stage, every time.
  · Stage by EXPLICIT PATH. ⛔ NEVER `git add -A` — it swept another session's
    in-flight work into a commit and broke main once already.
  · If src/components/updown/ has uncommitted changes, stay out of that directory.

VERIFY BEFORE YOU MOVE ANYTHING (INTAKE §1)
  Run the verification table. Reject on the spot if: a raw cubic-bezier or bare ms
  appears; a reduced-motion branch is described but not written; anything animates
  width/height/top/left/margin; any hex or rgb; a package.json change; a changed public
  prop; shadows hand-written per component instead of an elevation ladder; or no
  "how to extend this" note.
  ⭐ THE ACCEPTANCE TEST THAT MATTERS: take a component they never saw — ui/callout.tsx
  — and apply the system from the written rules alone. If you have to guess, D-3 was
  not delivered. Say so and stop; that is the one thing not repairable in-house.

INTEGRATE IN THIS ORDER — it is not a preference, everything inherits (INTAKE §3)
  1. Tokens only. Nothing visual. Commit alone.
  2. Keyframes + utility classes. Nothing consuming them yet. Commit alone.
  3. ONE component per family — ui/modal.tsx, markets/market-card.tsx, ui/button.tsx.
     ⛔ STOP HERE AND LOOK at all three, at 360 and 1280, in EN/SW/ZH, before touching
     anything else. This is when you find out the ladder is wrong, while three files
     use it and not forty.
  4. The rest of each family, one commit per family.
  5. The 185 icons — mechanical once the primitive exists.
  6. The written rules into docs/DESIGN_AUTHORITY.md.

REPLACE, NEVER ACCUMULATE (INTAKE §3b) — this is what keeps the repo clean
  Every piece that lands KILLS something, in the SAME commit:
    the struck seal      -> delete the drawn trophy and its eight straight-line rays
                            in brand/reward-burst.tsx, and any keyframe only they used
    an elevation ladder  -> delete every hand-written box-shadow/ring- a component
                            carried; grep box-shadow under src/components and justify
                            each survivor
    a gilt recipe        -> delete every inline one-off gold gradient
    an entrance family   -> delete the keyframes it supersedes (33 exist today)
    new tokens           -> delete the literals they replace
  ⛔ If the old thing survives beside the new one you have built a SECOND design system,
  and every future session has to guess which is current.

  THE THREE PROOFS THAT NOTHING WAS LEFT BEHIND:
    · test:design-frozen  — its 45-file allowlist must SHRINK. If it is still 45, the
      delivery decorated rather than replaced.
    · test:motion-ladder  — its allowlist must shrink too (2 today).
    · node scripts/ui-material-audit.mjs — re-run it. The AUDIT.txt numbers must move.
      If they do not, the integration is wrong, not the audit.

GATES — every commit, no exceptions
  npx tsc --noEmit && npm run build
  npm run test:design-frozen && npm run test:ui-consistency
  npm run test:motion-ladder && npm run test:crest-legibility
  npm run test:trilingual && npm run test:integrity && npm run test:tracker-hygiene
  (test:responsive and test:motion need a live :3000 server — documented exception.)

THEN DRIVE IT (INTAKE §3c) — a gate is a pre-flight, the browser is the evidence
  SHOT_DIR=.qa-design node scripts/live-s29-sweep.mjs player 360,768,1280,1920 en,sw,zh
  SHOT_DIR=.qa-design node scripts/live-s29-sweep.mjs admin  360,1280 en,sw,zh
  SHOT_DIR=.qa-design node scripts/live-s31-win-popup.mjs
  ⛔ locator.screenshot(), NEVER fullPage. ⛔ THEN OPEN THE IMAGES — the scan ranks,
  it does not judge. 360/SW is where truncation bites; 360/ZH is where panels go empty.
  ⚠️ The payout is a ~900ms rolling counter and the modal auto-dismisses at 4.5s.
  ⚠️ Run once with OS reduced-motion ON — every animation must still convey its state.

DISCIPLINE
  One change, one guard PROVEN RED FIRST, docs updated in the SAME commit, one push,
  one production verification — never batched. Judge a process by its EXIT CODE.
  Before writing a check ask "would this still pass if the feature were absent?"
  Before quoting a count, ask which POPULATION it is a count of.
  Update docs/LIVE-QA-CAMPAIGN.md §6 and §6b at every step, and
  docs/design-system/v2-2026-07-27/07-provenance/CHANGELOG.md with what landed.
  If the intake teaches you something, amend INTAKE.md itself.
  Do not come back to me between steps — push as you go.
```

---

## What is NOT yours to check

Tokens, reduced-motion branches, prop signatures, oklch compliance — that is `INTAKE.md` §1 and
a session does it mechanically in minutes.

## What IS yours, and only yours

**Does it feel like the product?**

1. **Is it calm?** The law is *heraldic, never casino* — a seal being pressed, not a jackpot. If
   the celebration reads as excited rather than dignified it is wrong however well made.
2. **Does the gold look like money?** `--gilt` means *earned money*. It should read as metal,
   not as a highlight colour.
3. **Would you screenshot it?** The win moment is the most-shared screen in the product.

⭐ If those three are right, everything else is repairable in-house. If any is wrong, say so
**before** a session spends a day integrating — far cheaper than fixing it after.

## One thing to expect

They may come back saying a treatment needs a token that does not exist. ⭐ **That is correct
behaviour** — the brief explicitly tells them to say so rather than invent a value. Do not read
it as being blocked; forward it and we add the token deliberately.
