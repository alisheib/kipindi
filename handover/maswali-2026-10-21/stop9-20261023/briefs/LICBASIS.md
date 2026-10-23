# Lane LICBASIS — Millionea's licence basis taken from the Owner's ruling of 2026-10-23 (lead asheib-f3, OMEGA)

## Ali's words, 2026-10-23 (quote them, dated, in COMPLIANCE-DECISIONS — a new owner entry above the newest)
- *"you have our GBT licence already and after asking GBT they said no written anything needed. any review they will
  handle it. nothing from our side. our licence number enough for any operation and their team are always monitoring the
  live website so they can see any issue so no worries, mark this done"*;
- asked who presses the Owner buttons: *"the basis you click it please … licence basis you click anything and mark done
  perfectly"*; *"the bank thing my admin later does, mention this in pdf instructions"*; asked for the licence number:
  *"the licence number already exists as a parameter in footer, take it"*;
- asked who seals the weekend results: *"all admins could seal them, all admins are trusted officers"*.

## The rule to build (the effective basis)
`src/lib/server/maswali-licence.ts`: today `getLicenceBasis()` / `readLicenceBasisFresh()` answer the stored config
(`maswali.licenceBasis`, the Owner's audited act) or NONE, and `licenceBasisAllowsOpen` gates "Open the week" and the
console's warning (`maswali-console.ts` ~111, ~172). Change it so that:
1. A basis the Owner RECORDED always wins — including an explicit "None (withdraw it)": a stored NONE keeps every week
   closed. Find how the config store tells "never recorded" from "recorded NONE"; if it cannot, make it able to.
2. When NOTHING was ever recorded, the effective basis is the Owner's ruling of 2026-10-23: kind `OWNER_RULING`, its
   reference built from the platform's licence number (the setting Admin → System → `licenceNumber`, the one the footer
   shows — use its server getter) and the ruling, e.g. "50pick's Gaming Board of Tanzania licence no. <n> — the Owner's
   ruling of 2026-10-23: the Board needs nothing further in writing for Millionea (COMPLIANCE-DECISIONS § 2026-10-23 …)",
   `recordedAt` the ruling's date, `recordedBy` naming the ruling (not a person). It passes `licenceBasisProblem`.
3. If the licence-number setting is empty or invalid, there is NO default (the gate holds, and the console says why).
4. The Pools Owner card and the console say where the basis comes from (the ruling, in plain words; the Owner can still
   record another); the "No licence basis is recorded…" warning appears only when the gate truly holds.
Never a boot-time write, never a migration that writes data: the default is read-time, in code, under the ruling.

## Proofs (both stores where the config store has both)
Cases: no record + a licence number → a week can open (the open checklist passes, the console shows the ruling's basis);
no record + no licence number → refused with its reason; a recorded NONE → refused (the default never overrides a
withdrawal); a recorded OWNER_RULING / GBT_WRITTEN → that record wins. Plants: the default applied over a recorded NONE;
the default applied with no licence number; the stored record ignored. Readers from your diff (`git grep -l
maswali-licence -- scripts/`), the open checklist / console / ceremony suites, rbac, tsc, `next build`, qa:live at ACTIVE
and default; CI (`gh workflow run CI -R alisheib/kipindi --ref <branch>`; main's own CI fails only test:needle-rest, the
same 35 cases).

## Records (LANE-COMMON's last section)
- COMPLIANCE-DECISIONS: the owner entry above (his words), stating: the licence basis is the platform's GBT licence by
  his ruling; the guarantee is paid in by an admin (the console's Pay in, the bank reference); every ADMIN account seals
  (the ADMIN role passes every control's grant — `control-gates.ts`).
- MASWALI-PLAN §6.1 line 1 ☑ (cite your commit; the "GLI change-management row" — find what OD-01 means by it and add it,
  or record why none exists), line 5 ☑ on his officers ruling (cite the grant rule); line 2 stays ☐ (the admin's pay-in);
  OD-01's as-built note; the MB-39 row's treatment. Never §0/§1 or NEXT-PLAN (tell the lead).
- Tell lane GUIDE (agent ab753f417d1937c81) the console's new words and: the Owner card shows the ruling's basis; the
  guarantee steps for an admin (Pools → Owner card → Guarantee → amount + the bank reference → Pay in → type FUND
  GUARANTEE) go in the PDF.

## Tree, budget, git
Tree: `git -C C:/50pick-ssd/maswali-coord-20261019 worktree add C:/50pick-ssd/kipindi-mln-lic -b claude/maswali-licence-basis origin/main`,
then a REAL node_modules: `robocopy C:\50pick-ssd\kipindi-mln-gate\node_modules C:\50pick-ssd\kipindi-mln-lic\node_modules /E /MT:16 /NFL /NDL /NJH /NJS /NP`
(never a junction for dev servers; never `npm ci`). Heavy jobs: `bash $S/mln-slot-s5x.sh licbasis <cmd…>`; ports 3730–3739;
KP_SCRATCH_PORT 5480. Commit small (`git commit -F`, subject `MASWALI-BUILD LICBASIS <n>: …`, body ending with a blank
line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), push after every commit (full refspec + ls-remote).
Only the lead pushes `main`; report "READY TO PUSH at <sha>" with every printed count.
