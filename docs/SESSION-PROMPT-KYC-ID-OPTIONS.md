# SESSION COMMISSION · FOUR WAYS TO PROVE WHO YOU ARE — any ONE of them, not NIDA alone

**Commissioned:** Ali, 2026-08-19 — *"we have to give options for KYC, not just NIDA. One of them:
mandatory NIDA, or passport number and attach passport front page, or driving licence number and
attach driving licence front, or voting card and attach it. One of them works for us, not just NIDA.
Please follow Tanzanian guidelines for their sizes — 100% accurate and fully tailored and tested,
perfectly responsive. Act as a super-strict government-issued-ID compliance engineer, a UI/UX
engineer, a strict form validator, and a perfect graphics and visuals engineer."*

**Take any time needed.** Ali: *"it should be perfectly implemented and validated end to end, ready
to use."* There is no partial delivery of an identity control.

> ⭐ **WHAT THIS CHANGES, IN ONE LINE.** Today a player can only prove identity with a **NIDA
> number**. After this, **any ONE** of four Tanzanian identity documents is enough: **NIDA**,
> **passport** (+ bio page image), **driving licence** (+ front image), or **voter's card** (+ image).
>
> ⛔ **AND ONE LINE ABOUT WHAT IT MUST NOT CHANGE.** `docs/NIDA-POLICY.md` states the two controls
> that actually do the work: **"Uniqueness — one NIDA, one account"** and **"Document review by a
> human — this is the real identity control."** Widening *which document* is accepted must not
> widen *how many accounts one human can hold*, and must not remove the human.

---

## §0 · READ THESE FIRST, IN THIS ORDER

1. `docs/NIDA-POLICY.md` — the uniqueness rule and the human-review rule. Both survive.
2. `docs/COMPLIANCE-DECISIONS.md` — where a dated instruction from an authority gets recorded.
3. `docs/FLOWS.md` — the withdrawal/deposit gates, and ⚠️ **check whether Unit B of
   `SESSION-PROMPT-JAY-COMMENTS.md` has landed**: the Gaming Board instructed that KYC stop being a
   *precondition of withdrawal*. If it has, KYC is no longer a money gate — it is still the identity
   record, and this unit still matters. If it has not, do not pre-empt it here.
4. `src/lib/server/kyc-service.ts`, `src/lib/server/nida.ts`, `src/lib/server/storage.ts`,
   `src/app/profile/kyc/` — the whole existing path, end to end.
5. `DESIGN_AUTHORITY.md` — the only design door. ⛔ No new control language.

---

## §1 · WHAT IS ALREADY THERE — measured 2026-08-19, do not rediscover it

⭐ **THE ENUM ALREADY ANTICIPATED THIS.** `prisma/schema.prisma`:

```prisma
enum DocType { NIDA  NIDA_FRONT  NIDA_BACK  PASSPORT  DRIVER_LICENSE  VOTER_CARD  SELFIE }
enum KycRejectReason { BLURRY_DOC  DETAILS_MISMATCH  EXPIRED_ID  UNDERAGE  SANCTIONED  DUPLICATE_IDENTITY  OTHER }
```

`PASSPORT`, `DRIVER_LICENSE` and `VOTER_CARD` **exist and are unused**. `EXPIRED_ID` exists too, and
it matters — see §3 ③.

**What is missing.** `KycSubmission` holds exactly one identity number and it is NIDA-shaped:

| Column | Today |
|---|---|
| `nidaNumber` | `String?` — the only identity number on the model |
| `nidaVerifiedAt` | `DateTime?` |
| index | 🔴 **partial unique** `KycSubmission_nidaNumber_active_key ON ("nidaNumber") WHERE "nidaNumber" IS NOT NULL AND status <> 'REJECTED'` |

🔴 **THAT PARTIAL UNIQUE INDEX IS THE UNIQUENESS RULE, AND IT ONLY KNOWS ABOUT NIDA.** It is the
database-level enforcement of *"one NIDA, one account"* — not application logic that can be
forgotten. Read §3 ② before you touch it; **extending it wrongly is the single most expensive
mistake available in this unit.**

**Validation today:** `src/lib/server/nida.ts:55` → `/^\d{20}$/`, with
`nida.verify.invalid_format` audited on failure. The player-facing message is a dictionary key in
all three locales — `nidaValidation`: *"NIDA number must be exactly 20 digits (numbers only)"* /
*"Nambari ya NIDA lazima iwe tarakimu 20 haswa"* / *"NIDA号码必须恰好20位数字"*.

**Refusals today:** `kyc-service.ts:121` and `:188` → `nida_taken`; `:304` → `nida_not_verified`.
⚠️ Both names are about to become wrong for three of the four types. See §3 ⑤.

**Storage today:** `src/lib/server/storage.ts` is a **seam**, and it already does what this unit
needs. Default `INLINE` writes an `data:image/…;base64,…` URL into Postgres; with `KYC_STORAGE=r2`
plus R2 credentials it writes `r2:<key>` and the bytes go to Cloudflare R2. ⛔ **Write and read every
new attachment through `putKycDocument` / `readKycDocument`. Do not add a second storage path.**

---

## §2 · THE FORMATS — and the one place this commission refuses to guess

⛔ **A REGEX ON A NATIONAL ID IS A COMPLIANCE CONTROL, AND A WRONG ONE LOCKS A REAL CITIZEN OUT OF
THEIR OWN MONEY.** That failure is worse than a permissive field, because the human review is the
real control (`NIDA-POLICY.md`) and a rejected format never reaches a human at all. This repo already
has the pattern for this exact problem: `src/lib/server/updown-symbols.ts` gives gold a measured
`minMoveTicks: 40` and deliberately gives silver and platinum **no** minimum, because *"nobody has
measured their seams — and inventing one from gold's would be exactly the guess this file exists to
prevent."*

**Researched 2026-08-19. Two are known, two are not:**

| Document | What is documented | Confidence |
|---|---|---|
| **NIDA (NIN)** | **20 digits.** Published example `19950101-12345-67890-12` → **8-5-5-2**: `YYYYMMDD` date of birth, 5-digit registration/centre block, 5-digit serial, 2 check digits. The repo's existing `/^\d{20}$/` agrees | 🟢 **High** — and already shipped |
| **Passport** | **9 characters, alphanumeric**, letters leading. Tanzania has issued the EAC-format ICAO e-passport since **January 2018**; older booklets are still in circulation and valid until they expire | 🟡 **Medium** — secondary sources, no TRA/Immigration spec |
| **Driving licence** | 🔴 **NOT PUBLICLY DOCUMENTED.** TRA's own driver's-licence guide describes the card (name, photo, licence number, categories, validity dates) and does **not** publish the number's shape | 🔴 **None** |
| **Voter's card** | 🔴 **NOT PUBLICLY DOCUMENTED.** NEC/INEC material confirms the card carries a voter ID number, the holder's data and the enrolment station; the number's format is not published | 🔴 **None** |

⛔ **SO THE RULE FOR THIS UNIT IS:**

1. **NIDA** — keep `^\d{20}$`. It is already enforced, already messaged in three locales, and the
   published example agrees with it. ⭐ **And it can be checked harder than a length:** digits 1–8
   are a date. Reject `19993101…` (month 31) and reject a date of birth that makes the applicant
   **under 18**, with `UNDERAGE` — which is a real reject reason already in the enum.
2. **Passport** — a **stated, sourced** constraint (9 alphanumeric) implemented as a *warning-level*
   normalisation, not a hard refusal, unless you find a government source. Uppercase and strip
   spaces before comparing.
3. **Driving licence and voter's card** — ⛔ **DO NOT INVENT A PATTERN.** Accept a
   trimmed, uppercased, non-empty alphanumeric string within a sane length band, and **say in the
   catalogue entry and in `COMPLIANCE-DECISIONS.md` that no authoritative format was found**, exactly
   the way `updown-symbols.ts` says it for silver. The image plus the human reviewer carry the
   weight here.

   ⭐ **AND THIS IS NOW AN OWNER DECISION, NOT A RECOMMENDATION.** Ali, 2026-08-19, asked directly:
   *"for now driving and voting, keep them open — later we change."* So the permissive field for
   those two is **instructed**, and the next session does not get to tighten it on a guess. ⛔ Build
   the validator so a format can be **added later without reshaping anything** — one place per type
   that returns either a rule or "no published format", so tightening the licence is a one-line
   change with a citation beside it and never a refactor.
4. 🔴 **If you find an authoritative TRA / NEC / Immigration specification, cite it inline and
   tighten the rule.** A sourced regex is a control; an invented one is a liability.

⚠️ **Ali asked for "their sizes, 100% accurate".** Deliver that as **sourced where a source exists
and openly unsourced where none does** — not as four confident regexes, three of which would be
fiction. Say so in the handoff in one sentence.

---

## §3 · THE SIX THINGS THAT MAKE THIS HARD

### ① The chooser is a form-state machine, not a dropdown

One control picks the type; the fields and the required attachment change with it. ⛔ **Use the
kit** — `DESIGN_AUTHORITY.md` records that hand-rolling a control language is a documented refusal.
A real `radiogroup` (or the kit's segmented control), labels tied to inputs, and the *type* in the
URL or form state so a failed submit round-trips.

⛔ **A PLACEHOLDER MUST NEVER BECOME A VALUE (A-5).** `712 345 678` on the withdraw page is the
standing example. A greyed `19950101-12345-67890-12` in the NIDA box must never post.

### ② Uniqueness must span ALL FOUR TYPES, or the rule is gone

🔴 **THIS IS THE WHOLE COMPLIANCE RISK OF THIS UNIT.** Today the partial unique index is on
`nidaNumber` alone. Add three more number columns naively and you get three more ways for **one human
to hold four accounts** — and, worse, a route **around** a rejection: someone blocked as
`DUPLICATE_IDENTITY` on their NIDA simply re-registers with their passport.

**Required shape:** ONE identity tuple, unique together, indexed at the **database** level like the
existing one — e.g. `idType` + `idNumber` with a partial unique index on `(idType, idNumber) WHERE
"idNumber" IS NOT NULL AND status <> 'REJECTED'`. ⚠️ **Prefer migrating `nidaNumber` into the shared
pair over adding a fourth parallel column**, and keep the existing index's exact `WHERE` semantics —
a `REJECTED` submission must not hold a number hostage.

⛔ **AND ANSWER THIS EXPLICITLY IN THE HANDOFF, BECAUSE IT IS A POLICY QUESTION, NOT A CODE ONE:**
one human legitimately holds a NIDA *and* a passport *and* a licence. Uniqueness per `(type, number)`
stops the same document twice; it does **not** stop one person using two different documents on two
accounts. **Nothing in the codebase can close that gap** — only NIDA-as-mandatory or a
cross-document identity match could, and Ali has asked for the opposite. **State the residual gap in
writing to the Board**, dated, in `COMPLIANCE-DECISIONS.md`. Do not quietly pretend it is closed.

### ③ Two of the four EXPIRE, and `EXPIRED_ID` already exists

Passports and driving licences have validity dates. NIDA and voter's cards effectively do not.

- Capture an **expiry date** for passport and licence; do not ask for one where it does not exist.
- An expired document is **refused at submit** with a real message, or accepted-and-flagged for the
  reviewer — decide, and say which. `KycRejectReason.EXPIRED_ID` is the reviewer's word for it.
- ⚠️ **A document that expires AFTER approval is a live compliance question.** Say what happens.

### ④ NIDA's number contains the date of birth; the other three do not

So the DOB cross-check that is possible for NIDA is **impossible** for the rest. ⛔ **Do not let the
`UNDERAGE` check silently only work for NIDA** — that is a guard that passes because the feature is
absent. For the other three, age comes from the form plus the reviewer's eyes on the image.

### ⑤ Two failure reasons are about to be misnamed, and the registry notices

`nida_taken` and `nida_not_verified` are declared in `src/lib/server/failure-reasons.ts` and mapped
in its registry. Rename or generalise them (`id_taken`, `id_not_verified`) and you must move **the
union member, the map row and the dictionary key together** — `npm run test:failure-reasons` fails on
a **dead mapped code**, and session 47 filed six of exactly that. ⛔ Leaving `nida_taken` firing for a
rejected *passport* is a lie in the audit trail.

### ⑥ A phone photo is 3–8 MB, and the default storage is Postgres

`INLINE` mode base64-encodes the image into a database column — **+33% on every byte**. Four document
types will multiply submissions.

- A **mime allow-list** (`image/jpeg`, `image/png`, and decide on `application/pdf` for a passport
  scan) and a **hard byte cap**, both enforced **server-side** — a client-side check is a courtesy.
- Client-side downscale before upload, so a real phone photo does not bounce off the cap.
- An honest error naming the actual limit. ⛔ Never "Upload failed".
- ⚠️ **Check whether `KYC_STORAGE=r2` is set on production before assuming where the bytes land**,
  and say which one the drive used.

---

## §4 · WHAT "DONE" MEANS — all seven, not six

1. **It works driven on the real product** — a submission of **each of the four types**, on
   production, reaching a reviewer and being approved. A green suite is not proof.
2. **A guard exists and is proven RED** against the defect it protects, with a **positive control in
   the same run**. ⛔ Ask of every guard: *would this still pass if the feature were absent?*
   For this unit, ask it twice about uniqueness.
3. **It was LOOKED AT** — **393 / 768 / 1024 / 1280 / 1440 × EN / SW / ZH**, for the chooser, each
   type's fields, the upload control, an upload error, and the reviewer's screen. ⚠️ Swahili and
   Chinese are where labels overflow.
4. **`npm run test:all` green with `DATABASE_URL` UNSET**, before the commit. ⚠️ `test:responsive` and
   `test:motion` need a **live server** — `BASE=https://www.50pick.tz node scripts/responsive-audit.mjs`.
   Both were green against production at `E-172`; if one goes red, it is this unit.
5. **Docs moved in the same commit** — `NIDA-POLICY.md` (it is about to be about more than NIDA;
   consider whether it should be renamed), `COMPLIANCE-DECISIONS.md`, `FLOWS.md`, `RULES.md` if a rule
   a player is held to changes.
6. **A register row filed** in `docs/LIVE-QA-CAMPAIGN.md`, with the id **re-grepped at the moment of
   filing**, and a new topmost `RESUME AT` block inside §6b's topmost `###`.
7. 💰 **The money position stated first and plainly in the handoff**, whether or not a shilling moved.

---

## §5 · THE TRAPS — every one measured in this repo, most of them this month

1. ⛔ **`git add -A` — never.** Two sessions share this working directory. Stage by pathspec, check
   `git branch --show-current` before every commit, and **push your own SHA, not `HEAD`**:
   `git push origin <sha>:main`. **Every push to `main` deploys live.**
2. ⛔ **The repo path is a fact about the MACHINE.** Ask the shell — `hostname && git rev-parse
   --show-toplevel`. Four sessions have been sent to a path that did not exist. Ops scripts under
   `scripts/live/ops/` now derive their own root; do not reintroduce a literal.
3. ⛔ **Git Bash rewrites anything that looks like a Unix path.** `ONLY=/results` reaches the child as
   `C:/Program Files/Git/results` — so a filtered sweep silently measures **nothing** and reports
   green. Prefix `MSYS_NO_PATHCONV=1`. Measured at `E-172`.
4. ⛔ **Every doc and most sources in this repo are CRLF.** A patch anchor written with `\n` matches
   **zero times**; a single-line one splices an LF into a CRLF file. Detect the EOL per file.
5. ⛔ **Write patch scripts with the file tool, not a shell heredoc** — PowerShell destroys UTF-8 on
   round-trip and backticks inside double quotes execute. Swahili and Chinese strings are UTF-8.
6. ⛔ **A comment that quotes deleted code is a decoy anchor.** A guard that greps the raw file will
   match your example and pass over the real thing. Describe old code; never paste it. Measured at
   `E-170` — on the fix's own comment.
7. ⛔ **Appending a section to a suite puts it after the verdict.** Insert above the summary.
8. ⛔ **A guard can REQUIRE the defect.** `test:outcome` §3 asserted a product-blind ternary was
   *present*, so the correct fix read as a regression (`E-169`). Before trusting any KYC guard, ask
   what it would say if you fixed the thing it covers.
9. ⛔ **A check can pass through the wrong field**, and **an assertion phrased as the defect goes red
   when you fix it**. Every refusal needs a positive control in the same run.
10. ⛔ **An ops script that calls a service and exits loses its audit rows.** `audit()` is
    fire-and-forget onto a serialised queue; `await auditFlush()` before exit. Measured: four state
    changes, one audit row (E-66). **On an identity path this is the record a regulator asks for.**
11. ⛔ **A DB read gives state, not reason.** Cast every timestamp `::text` — node-postgres parses a
    naive timestamp in the client's zone, and this laptop is EAT (+3) and ~93s slow.
12. ⛔ **Truncation is paint.** `innerText` returns the full string whatever the ellipsis shows.
13. ⛔ **Closed `<details>` children still have layout boxes** but are neither painted nor
    hit-tested. Do not "fix" a phantom clipped control; check `elementFromPoint` and Playwright's
    `isVisible()`. Fixed in the sweep at `E-172` after ~200 false failures.

---

## §6 · THE INTEGRATION MATRIX — where this unit touches the rest

| Pair | What must be true JOINTLY | The failure mode if you skip it |
|---|---|---|
| **ID options × withdrawal (Board #1)** | If Unit B has landed, KYC is no longer a payout gate — so an unverified player withdraws while a *verified-by-passport* player must be indistinguishable in the ledger and the audit trail | A payout path that behaves differently by document type is a discrimination finding, and the Board will read it as one |
| **ID options × the AML regime** | ⛔ **Do not touch `TWO_PERSON_THRESHOLD_TZS` or `/admin/aml`.** Those come from the AML/FIU regime, a **different authority** | A Gaming Board instruction about documents does not repeal an AML threshold |
| **ID options × `/admin/players` + the SUPPORT tier** | A support agent must see *which* document type was used without seeing the number or the image unless their tier allows it | *"A read-only auditor was offered the payment kill-switches"* is already on record here |
| **ID options × the reviewer's screen** | The reviewer sees the right fields **per type** — an expiry for a passport, none for a voter's card — and the image, at every width | A reviewer approving a document they cannot actually read is the human control failing silently |
| **ID options × duplicate detection** | A `DUPLICATE_IDENTITY` rejection on one document type must not be bypassable by submitting a different type | §3 ② — this is the residual gap; it must be **stated**, not hidden |
| **ID options × storage** | Every attachment goes through `putKycDocument`; production's `KYC_STORAGE` is known and stated | A second storage path means a document nobody can read back later |

---

## §7 · THE SEAL — one continuous journey per document type, on production

Run it **four times, once per type**, as one uninterrupted journey. A step you cannot evidence did
not happen.

1. **Register** a fresh fleet player (`fleet:NN` on `7990000NN`; prod minting is pre-authorised —
   ⚠️ `QA_FLEET_PASSWORD` must be present in `.env.qa.local`).
2. **Open the KYC page** and choose the document type. *Record: the chooser at 393 in all three
   languages.*
3. **Submit a deliberately BAD value** for that type. *Record: the refusal, and that it names the
   real rule rather than "invalid".*
4. **Submit a deliberately OVERSIZE image.** *Record: the error naming the actual limit.*
5. **Submit the good value + the required attachment.** *Record: the stored `storageKey`'s shape —
   `data:` or `r2:` — read from the database, not the page.*
6. **A second account submits the SAME document.** *Record: the refusal, and the audit row. This is
   the uniqueness rule; it is the most important artefact in the seal.*
7. **A reviewer opens it, sees the image and the type-correct fields, and approves.** *Record: the
   reviewer's screen at 393 and 1440.*
8. **The player's own screen reflects approval**, in their language.
9. **`test:kyc-honesty` and every KYC suite green**, plus `test:failure-reasons`.

⭐ **THE SEAL IS THE ARTEFACT.** One numbered walk × four types, one screenshot or one database read
per step, in the register row.

---

## §8 · CLOSE-OUT

1. A **register row** with the measurement that proves it, id re-grepped at filing.
2. A new topmost **`RESUME AT`** block in §6b — the marker must sit inside the **topmost `###`** or
   `test:tracker-hygiene` fails; that guard has drifted four times.
3. **`COMPLIANCE-DECISIONS.md`**: the instruction, dated, its source, what changed, what deliberately
   did not, **and the residual uniqueness gap from §3 ② in plain words**.
4. **`docs/README.md`**'s count and index row if any doc is added or renamed — the gate counts
   **tracked** files, so `git add` before running it.
5. **`test:all` green** (`DATABASE_URL` unset) **and `red:all`**, plus `test:responsive` and
   `test:motion` **against a live server**.
6. 💰 **The money position, first and plainly.**
7. **One sentence on the formats**: which of the four are enforced from a source, which are
   deliberately permissive, and why. Ali asked for 100% accuracy; the honest form of that is a
   sourced rule where a source exists and a stated absence where none does.
