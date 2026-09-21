# Five things only you can answer — 21 September 2026

**What this is.** The desk (the owner-only page for the house accounts) is at its last step. Everything that a
command on this computer can check has now been checked, re-checked by a second method, and in most cases
deliberately broken on purpose to prove the checks would actually catch a fault. What is left is not work —
it is five judgements that are yours, not a session's.

**How to answer.** One line each is enough: "1 — move them", "2 — accept", and so on. Nobody is waiting on
anything else from you. Where an answer costs money or time it says so below, and every one says plainly what
happens if you leave it unanswered.

---

## 1. A finish line that cannot be reached

Before this stage of the desk can be called finished, one list has to be empty: the list of checks we postponed
while building it. Two things on that list are, by your own earlier decision, not allowed to be done until the
*next* stage of the work. So the list can never empty and the stage can never be declared finished — not because
anything is broken, but because of where two lines were filed. Nothing about the product changes either way.
You can **(a) move those two lines onto the next stage's list**, where they were always going to be done, or
**(b) leave them and say that next-stage items do not count against this stage.** My recommendation is **(a)**:
(b) creates an exception, and an exception to a rule like this gets a little wider every time someone is in a
hurry — this same list has already lost its force five separate times in exactly that way, which is why it was
tightened in the first place. It costs about ten minutes of editing, no code, and the two checks still get done,
just at the stage they belong to. **If you do not answer:** this is the one item on this page that stops the
release outright. The stage cannot be declared finished by anybody, and it stays stuck at "not yet" while the
pressure builds on somebody to simply step over the rule.

## 2. Pages that say "not found" while telling machines they were found

If someone opens a desk account page using an address that does not exist, the person reading the screen is
correctly told there is nothing there — but the answer the server quietly sends back to browsers, monitors and
search engines says "yes, this page exists". We measured it properly and it is not the desk's fault: the same
thing happens on the players pages, the identity-check pages and the markets pages, all for the same underlying
reason, because a page starts sending itself before it knows whether the record exists. It is not a leak —
everyone gets the identical answer, signed in or not, so nobody can learn anything from it. You can
**(a) accept it, let us record exactly what was measured, and raise the fix as its own separate piece of work
later**, or **(b) hold the desk until the fix is made everywhere.** My recommendation is **(a)**: the fix has to
move four sections at once and the desk must never move alone, so doing it under release pressure is how a
cosmetic problem turns into an outage. (a) costs nothing now and a modest job later; (b) makes the desk wait on
three unrelated sections. **If you do not answer:** the line stays open on the list from question 1, so the
stage stays unfinished — and a line marked "waiting for a decision nobody asked for" is precisely the kind that
gets quietly skipped six months later.

## 3. Two records of the same check that contradict each other

When we built the form that sets up a new house account, one session recorded that it had checked that form at
every screen size and had opened and read the screenshots. Two later sessions, the next day, both wrote that the
same check was still owed. One of those is wrong, and I cannot settle it by reading: the screenshots were saved
in a folder that is deliberately not kept in the project's history, on another copy of the code, so they may no
longer exist at all. You can **(a) take the earlier session's word and close it**, or **(b) have the screens
re-taken the next time anybody has the app running, and close it on evidence that anyone can open.** My
recommendation is **(b)**: we have been burned repeatedly by figures that were written down once and then
rotted, and the entire value of that list is that it holds evidence rather than claims — the moment it carries
two contradictory records it stops being worth keeping. It costs a few minutes on a session that already has the
app running; it needs no extra machine time of its own. **If you do not answer:** the line stays open and the
stage stays unfinished, and nobody will close it on the earlier session's word alone, so in practice it waits
until someone re-takes the screens anyway.

## 4. A check that was written down wrong, and therefore never happened

One line on the list asks us to test the "you have unsaved changes" bar on the desk's limits screen using a
particular tool. The instruction was typed in a way that would have aimed that tool at a completely different
page and then reported a clean pass — so had anybody run it, it would have produced a false all-clear about a
screen it never looked at. Nobody ran it, so no false result exists anywhere. Separately, the same behaviour
*was* checked properly on a real running copy: someone typed into the real form, saw the bar appear with its
Discard and Save buttons at both phone and desktop width, photographed it, and an automatic check covers that
file with no exemption. You can **(a) correct the written instruction and accept the evidence we already have**,
or **(b) correct it and also insist the original tool is run the next time the app is served.** My
recommendation is **(a)**: the only thing that tool adds is a test of two half-filled forms on one page at the
same time, and that screen has only one form, so there is nothing there for it to find. Either answer costs
nothing. **If you do not answer:** the line stays open and the stage stays unfinished — and worse, the wrongly
typed instruction stays sitting in the file where the next person will copy it straight out.

## 5. An instruction of yours that points at a drive this computer does not have

One of your dated instructions tells whoever next runs the side-by-side comparison of the old and new test
results to use a copy of the code kept on a drive called F. There is no F drive on this computer. The copy is
on the C drive, and it is now exactly level with the live code — which is the very thing that instruction was
asking someone to sort out. Nobody will rewrite an instruction of yours without your word. You can
**(a) confirm the drive letter should read C, and we add a dated correction beneath it with your original left
visible**, or **(b) leave it as written and we note the discrepancy alongside.** My recommendation is **(a)**,
and it costs one line. **If you do not answer:** nothing breaks today and the release is not held — but the next
person to run that comparison is sent to a folder that cannot be opened, and our most expensive mistakes have
all started with a wrong instruction in an authority, which travels much further than a wrong note.

---

## For whoever picks this up next — not part of the above

Re-derived on 21 September 2026 in the alerts lane, from the register's own tables rather than from any recorded
figure. The register carries exactly four flagged rows and they are **35, 40, 50, 53** — the ids the Commit 7
verdict names, confirmed independently here rather than inherited.

| Question | Row(s) | What discharges it |
|---|---|---|
| 1 | **35**, and row **36**'s PII half, which sits in the same position by ruling 524 | Ali only. Move both into a Commit-8 section, or amend the gate line. ⛔ The only hard block on C7 step 7. |
| 2 | **50** | Ali's call, then record the verdict in §3 and raise the platform question as its own ruling. |
| 3 | **53** | Ali's call, or re-drive the four widths once a server exists; row 61 claims the discharge, rows 69 and 72 cite it as open. |
| 4 | **40** | Rewrite the command as `MSYS_NO_PATHCONV=1 ROUTE='/admin/desk?tab=limits' npm run qa:pending-bar` (verified at source: the script reads `process.env.ROUTE` and defaults to `/admin/config`, so a trailing `ROUTE=` is an argv token), then Ali's call on whether the render-drive evidence stands in. |
| 5 | Ruling **533** (not a register row; surfaces in row **33**) | Ali only — a dated ruling is the owner's. Re-derived here: the rulings file writes `F:/kipindi-old-build` **8** times and `C:/kipindi-old-build` **0** times, and `Get-PSDrive -PSProvider FileSystem` returns exactly one drive, `C`. |

⚠️ Question 5 is **not** one of the four flagged rows. It is included because it is an owner-only correction that
no session may make, and because the wrong path is in the authority itself rather than in a copy of it.

⛔ Questions 2, 3 and 4 each keep a line open in a section the gate requires to be EMPTY, so all three hold the
close of C7 step 7 — but unlike question 1 they can also be discharged by work (a served page, a re-drive, a
register correction) rather than by a ruling. Question 1 cannot be discharged by anyone but Ali, at any cost.
