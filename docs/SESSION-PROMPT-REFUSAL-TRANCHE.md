# SESSION PROMPT — THE LAST REFUSAL TRANCHE: wallet · KYC · auth, and the channel nothing was watching

Repo: `C:\kipindi-main`, branch `main`. ⚠️ **Every push to `main` deploys LIVE to `https://50pick.tz`.**

This closes `docs/RULES.md` §2.9 — the **last ⏳ in the RULES programme**. The betting and
cash-out paths shipped 2026-08-14 (C2–C5); wallet, KYC, auth, proposals and objections did not,
and a channel nobody was scanning turned out to carry five of them.

⛔ **THIS SESSION CHANGES WHAT A REFUSAL SAYS, NOT WHAT IT REFUSES.** No money logic, no new
gates on behaviour, no layout work. If you find a behavioural defect, FILE it and keep going.

---

## §0 · BEFORE YOU TOUCH ANYTHING

```bash
git fetch --all --prune && git log --since="today" --format="%ci %h %s" origin/main && git status --short
```

⚠️ **A SECOND SESSION MAY BE LIVE IN THIS SAME CLONE.** Measured 2026-08-15: a labelling session
committed four units into the working tree while another was still verifying. So:
1. ⛔ **NEVER `git add -A`.** Stage by explicit path; `git commit -F msg -- <paths>`.
2. ⛔ **Before pushing, compare `git log -1 origin/main` with `git log -1 HEAD`.** If HEAD sits on
   another session's commits, push **only your own SHA** (`git push origin <sha>:main`). Pushing
   `HEAD` deploys their unverified work to a live money platform.
3. ⛔ **NEVER run a RED mutation harness while another session may be editing.** They rewrite real
   source and restore it only if the run completes — an interrupted run **zeroed two source
   files** on 2026-08-15. Scan for NUL bytes after any interrupted run.
4. ⛔ **Never run `next build` while a `next dev` server is up** — they share `.next/` and it hangs.
5. ⚠️ `:3015` is yours by convention. `netstat -ano | grep LISTENING | grep :301` first.

Read, in this order:
1. `docs/RULES.md` **§2.9** — the standard, and the ⏳ this session removes.
2. `docs/FAILURE-INVENTORY.md` — **§1.5 and its note**, **§2.3**, **§4**, and **§6** (the matrix).
3. `docs/DESIGN_AUTHORITY.md` **§F** — the feedback law: which channel and which severity.
4. `.claude/skills/50pick-standards/SKILL.md` **§5b** — twelve ways an instrument here has lied.

---

## §1 · WHAT IS ALREADY BUILT — do not rebuild it

⭐ **Verified in the source 2026-08-15. The machinery exists; this session feeds it.**

| Piece | Where | State |
|---|---|---|
| The reason registry | `src/lib/failure-reasons.ts` | **22 reasons**, each with a severity, a channel and a dict key |
| Code → reason fallback | `reasonForCode()` — `failure-reasons.ts:257` | maps a CODE to a registry row when a service emits no `reason` |
| The one renderer | `renderFailure()` — `failure-reasons.ts:317` | ⛔ never renders `r.error`; the server's English is audit truth, not a headline |
| The guard | `test:failure-reasons` (152 checks) · `red:failure-reasons` | §8 pins each phrase test to the server's own string; §9 pins code→reason→severity; §10 ratchets raw renders |

**So the shape of the work is:** teach a service to emit its own `reason` (+ `detail` figures as
NUMBERS), delete the phrase test that was standing in for it, and let `renderFailure` do the rest.

---

## §2 · THE TWO HALVES, AND THE SECOND ONE IS THE ONE NOBODY SAW

### ▶ 2a · The tranche §2.3 already names

Wallet / KYC / auth / proposals / objections reasons still recovered from English prose:

`deposit_limit` · `sof_required` · `kyc_required` · `nida_taken` · `nida_not_verified` ·
`doc_image_type` · `doc_too_large` · `docs_locked` · `docs_required` · `extra_docs_required` ·
`no_extra_request` · `withdraw_below_min` · `email_invalid` · `email_taken` ·
`email_unverified` · `name_invalid` · `avatar_type` · `avatar_size` · `password_wrong` ·
`password_weak` · `voting_closed` · `proposals_paused` · `objection_window_open` ·
`signin_required`

⚠️ **19 of these ALREADY carry a distinct machine CODE** (`EMAIL_TAKEN`, `NIDA_TAKEN`,
`DOC_TOO_LARGE`, `PW_WEAK`, `VOTING_CLOSED`, …), so `reasonForCode()` may already route them.
**Check before writing a service change** — §2.3 says the services were never the problem.

⛔ **`INVALID` and `SUSPENDED` are deliberately NOT mapped.** They mean four things each; picking
one would restore the *"Wallet unavailable." → top up your balance* defect the registry exists to
retire. Those keep `errorCopy`'s phrase disambiguation until their service emits a real reason —
**and §8 pins every one of those phrases to the server's own sentence**, so when you reword a
service string, that test goes red on purpose. Delete the phrase test in the same commit as the
reason that replaces it.

### ▶ 2b · 🔴 THE BANNER CHANNEL — five surfaces, and the ratchet could not see them

`test:failure-reasons` §10 reports **0** raw server strings in front of a player. That is true
**of the channel it scans and only that one.** Its pattern is

```
/\b(?:title|description):\s*(?!t\.)[A-Za-z_$][\w$]*\.error\b(?!\.)/
```

— an object **property**, i.e. a toast or modal argument. A **form-action page does not report
that way**: it `redirect(...?error=<the server's English sentence>)` and the server component
renders `{sp.error}` as JSX **text** inside a `Callout` or a `role="alert"` div. That form matches
nothing in §10's regex, so the whole channel sat outside its denominator.

**Re-measured 2026-08-15 — five, and one is a compliance surface:**

| Surface | Class | What a SW/ZH player actually reads |
|---|---|---|
| `profile/responsible-gambling/page.tsx:79` | 🔴 RG / compliance | *"Invalid value for dailyLossLimit."* |
| `profile/kyc/page.tsx:94` | KYC | the server's English |
| `profile/source-of-funds/page.tsx:71` | KYC / SOF | the server's English |
| `profile/account/page.tsx:75` | account | the server's English |
| `auth/reset-password/page.tsx:138` | auth | the server's English |

⚠️ **Four of the five were in `FAILURE-INVENTORY.md` §1.5's original list of twelve** and were
dropped from the "real population of six" when the re-measurement scanned only toast props.
`auth/reset-password` was never listed at all.

⭐ **A RATCHET ALREADY HOLDS THE LINE AT 5** — `test:feedback-law` §8, which prints the five by
name and carries a positive control. ⛔ **Lower `CEILING` in the same commit that fixes one.** A
ceiling nobody lowers is a budget, not a ratchet.

**The shape of the fix.** A redirect can only carry a string, so send the **reason key**, not the
prose: `redirect('?reason=deposit_limit&need=50000')`, and let the page render it through the
same registry. ⛔ Do not invent a second renderer for server components — if `renderFailure` is
client-only, extract the pure part rather than forking it (`updown-source-label.ts` and
`updown-refund-reason.ts` are the models: a `Record<reason, dictKey>` consumed by both sides).

---

## §3 · METHOD

**Step 1 — measure before you write.** For each reason in §2a, open the service site and ask:
*does it already emit a distinct code that `reasonForCode()` maps?* Only what is genuinely
unmapped needs a service change. ⛔ A list built from greps is a lie — open the call sites.

**Step 2 — one family per commit.** wallet → KYC → auth → proposals/objections → the five
banners. Each: service emits `reason` (+ numeric `detail`) → registry row with severity + channel
+ dict key in **EN/SW/ZH** → the phrase test it replaces **deleted** → guard + RED → docs.

**Step 3 — severity is decided by §F, not by taste.** *The player can fix it and their money did
not move* → **warning**, which on this platform means the **`factual`** toast: ⛔ never toast
`warning` (struck in gold — gold is money that was EARNED), ⛔ never toast `default` (paints
`checkCircle`, a tick over a failure). A hard block or a genuine fault → `danger`. A money-path
failure is **sticky** (`durationMs: 0`).

**Step 4 — the figures are DATA.** ⛔ Interpolated numbers come from `detail` as **numbers**,
never parsed out of English prose the way `tzsFigures` does. And assert **no placeholder
survives**: `String.replace` with a string pattern substitutes only the FIRST occurrence, which
once shipped a literal `{min}` onto a money screen with every assertion green (`RULES.md` §2.9).

---

## §4 · DEFINITION OF DONE

- Every §2a reason either emits a machine `reason` or is proven already routed by
  `reasonForCode()`; each has severity + channel + copy in **all three** languages.
- Every phrase test replaced by a real reason is **deleted**, not left beside it.
- The five §2b banners render through the registry; `test:feedback-law` §8's `CEILING` is
  **lowered to the new count** in the same commit.
- `test:failure-reasons` extended so §10 **also** sees the banner channel — one denominator, not
  two. ⭐ With a positive control: a scanner that has gone blind prints "0" exactly like a clean
  tree.
- RED-proven, one mutation per defect, each reverted byte-for-byte. Use
  `scripts/red-anchor.mjs` — ⛔ do not hand-roll anchor matching; the last harness that did had
  **all five of its multi-line anchors silently missing** on a CRLF checkout.
- `docs/RULES.md` §2.9's **⏳ LANDING marker removed** — ⛔ only after verifying on production.
- `npx tsc --noEmit` · `npm run build` · `npm run test:all` · `npm run red:all` at the END.
- **Frames read** at 360/768/1280/1920 × EN/SW/ZH for every refusal you touch — *triggered*, not
  just loaded. Drive a REAL refusal (a wrong password, a too-large document, an over-limit
  deposit); do not fake one by breaking the network, which lands in a different branch.
- Verified on production: HTTP 200, clean `railway logs -s 50pick`, and a frame actually read.
- ⭐ **Then EMPTY this file.**

---

## §5 · TRAPS

- ⛔ **`node -e` and shell heredocs eat a backslash layer, and bash will execute backticks inside
  a heredoc.** NEVER shell-edit `src/lib/i18n-dict.ts` or any doc containing code spans — use the
  editor. Paid for twice on 2026-08-15.
- ⛔ **An `ERROR` in a log is not a defect, and a retry is not an outage.** A caught `P2002` still
  prints `prisma:error`. Measure the OUTCOME, never the symptom. (2026-08-15: an "Up & Down is
  down" claim was raised and withdrawn the same hour on exactly this mistake — see
  `LIVE-QA-CAMPAIGN.md` §6b.)
- ⛔ **Language comes from the `kp-locale` COOKIE**; there is no `/api/locale`. Set it on the
  Playwright **context**, read `<html lang>` back, and refuse to capture on a mismatch.
- ⛔ **Use a class or `data-` attribute, not text, to find a control** — a `/UP|JUU|涨/` filter
  matched only Chinese because EN renders "Up" and SW "Juu": case.
- ⛔ **A rect is not visibility.** Use `checkVisibility()`.
- ⚠️ `.env.qa.local` is dated 11 Aug and is STALE — a sign-in landing back on the signed-out
  shell is that staleness, not a product defect.
