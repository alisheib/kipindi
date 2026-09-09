# Selcom Lipa QR — the authority

**2026-09-08.** Ocean Entertainment Limited's Selcom merchant QR ("Lipa Namba **7006 3747**"),
where it may appear, and — the part that matters — **where it may not**.

⛔ **Read §1 before adding a caller.** The one-line version: this QR cannot credit a wallet.

🛑 **Status 2026-09-09 — the QR is WITHDRAWN (`LIPA_QR_RELEASED = false`, §3d) and the fee
destination is back to `Digital Selcom Bank` / `0769777877` (§3b).** The QR renders nowhere; the
agent fee runs on the arrangement that worked before it — account as text, receipt uploaded,
officer reconciles. **Deposits and cashout were never touched.** ⭐ The reason: a Lipa payment
carries no reference on any network, so it cannot be traced to the payer (§3c), and payment
without traceability is the problem. Re-enabling requires **Selcom confirming a verifiable
per-order QR** (§6), not a preference.

---

## 1. What this QR is, established by decoding it

The artwork is not taken on trust. `scripts/extract-lipa-qr.mjs` pulls it out of the
Selcom-issued poster, decodes it, and refuses to write anything that fails verification.
What it reports:

| Field | Value |
|---|---|
| Scheme | `tz.go.bot.tips` — Bank of Tanzania **TIPS**, EMVCo-format |
| Acquirer | `tz.co.selcom` |
| Merchant | `OCEAN ENTERTAINMENT` · `DAR ES SALAAM` · `TZ` |
| Merchant id | **70063747** (EMVCo tag 26/02 and 62/03) |
| Currency | `834` (TZS) |
| **Point of Initiation (tag 01)** | **`11` = STATIC** |
| **Transaction Amount (tag 54)** | **absent** — the payer types the amount |
| CRC-16 | `50F1`, re-derived and valid |

⭐ **`11` is the whole story.** A dynamic QR (`12`) is minted per transaction and carries a
reference. A static one is a picture of a shopfront: everybody who scans it pays the same
account, and nothing in the payment says who paid or what for.

## 2. Why it cannot be a wallet top-up

Money-in is attributed **solely** by the `dep_…` order id we mint at create-order:

- `src/lib/server/selcom.ts` → `selcomDeposit` / `selcomCardCheckout` create a Selcom order
  with our `order_id`.
- `src/app/api/webhooks/payments/route.ts` → `db.txn.findByProviderRef(ref)`. No row means
  `{ ok: true, ignored: true, reason: "unknown-reference" }` — **HTTP 200, nothing credited**.
- Deposits then settle from an authoritative order-status re-query (`selcomVerifyOrder`).

A payment made through the static QR carries no such reference — and, being a Lipa payment
rather than an order, would most likely not reach our webhook at all, since the callback URL is
registered **per order**. The money lands in Ocean Entertainment's Selcom account and no
balance moves.

> 🔴 So a poster QR on `/wallet/deposit` would mean: **the player pays, the company receives,
> their balance does not move, and nothing anywhere goes red.** No error, no alert, no red
> dashboard — and a tester with a fresh account would see a page that looks perfect.

`test:lipa-qr` §4.4 and `qa:lipa-qr`'s discrimination arm both enforce this, so the rule
survives the memory of whoever wrote it.

## 3. Where it IS used, and why that is safe

**The agent registration fee only.** That payment is already out-of-band and
**human-reconciled**: the applicant pays a named account, uploads the receipt image, types the
receipt reference, and a compliance officer verifies it before approving. Attribution is a
person, not a webhook — so the QR removes typing, changes nothing about how the money is
matched, and cannot strand anything. The fee is refundable in full if the application fails.

Surfaces: `src/app/agent/page.tsx` (the fee section) and
`src/app/agent/apply/apply-client.tsx` (Step 4 · Payment). Both render
`src/components/pay/lipa-qr-panel.tsx`.

### 3a. The rule that keeps the QR honest

⭐ **The QR renders only when the destination account the page names IS the Lipa number the QR
encodes** (`shouldShowLipaQr`, `src/lib/lipa.ts`). Point the fee elsewhere and the QR
disappears on its own, leaving the number as text.

This exists because the two values have different homes — `agentConfig.feeDestinationAccount`
and `lipaConfig.lipaNumber` — and at the time of writing they **disagreed**
(`0769777877` vs `70063747`). Two destinations on one screen for one payment is how money goes
missing for a week, and it is indistinguishable from a scam to the person paying. So it is made
unrepresentable rather than merely discouraged.

⚠️ **Consequence for operators:** switching the fee destination silently hides the QR. That is
the safe direction, but it is invisible — so `/admin/agents` → Settings → *Lipa payment* states
in words whether the QR is live right now, and if not, which two values disagree.

### 3b. ⏮ The destination that was switched for the QR — and switched back

⭐ **The QR is rendering on `50pick.tz/agent` today.** The fee destination was switched to the
Lipa number at `/admin/agents` → Settings, so `shouldShowLipaQr` is satisfied and the panel shows.
Verified against the live site, not inferred:

```
account: "7006 3747"                                  ← the fee destination
<img src="/pay/selcom-lipa-qr.d997c1d2.svg" width=224 …>
"Digital Selcom Bank" — 0 occurrences
/pay/selcom-lipa-qr.d997c1d2.svg → HTTP 200, image/svg+xml
```

⛔ **The handover this replaces said the opposite** — that the QR "renders NOTHING in production
by design" because the shipped default `0769777877` still disagreed with `70063747`. That was
true of the **code default** and false of **production**, because a persisted `SystemConfig` row
wins over the default and one had been written. 🎯 **A default is not a deployment.** Anything
claiming what this QR does in production has to be read off production; the two disagree by
design, since the whole point of the operator setting is to override the default.

⚠️ So the safety rule is now load-bearing in the live direction rather than the hidden one: the
QR is visible, and it stays honest only because the account printed beside it is the same number
it encodes. Point the fee destination anywhere else and the panel vanishes on its own — which is
correct, and which is also the moment `/admin/agents` → Settings becomes the only place that says
so in words.

⏮ **RESTORED 2026-09-09.** Management withdrew the QR and returned the fee to the arrangement
that worked before it, so the destination went back to **Digital Selcom Bank / `0769777877`**.
Verified on the live public page: it names that account, `7006 3747` appears nowhere, and no QR
image renders.

⭐ **It was changed through `/admin/agents` → Settings, deliberately, and NOT by a database
write.** `AuditLog` is an HMAC hash chain with `@@unique([prevHash])` — tamper-evident and
fork-proof. A raw `UPDATE` on `SystemConfig` would have left a money-config change with **no
audit entry at all**, which is precisely why the 2026-09-08 save went unnoticed for a day; and
hand-forging a chained entry risks making the whole log verify as *tampered*. The console writes
the value **and** appends a properly chained entry through the app's own code. The resulting row:

```
2026-09-09T11:08:41Z  agent.config.updated
   feeDestinationName:    "Selcom LIPA NAMBA - OCEAN ENTERTAINMENT LIMITED" -> "Digital Selcom Bank"
   feeDestinationAccount: "7006 3747" -> "0769777877"
```

⛔ **And nothing else moved, which was checked rather than assumed.** The 2026-09-08 save changed
the destination **and** the VAT rate in one write and only the destination was noticed — so this
change re-read every other field from a fresh page load and diffed them: `feeVatTreatment`,
`feeVatRatePct`, `registrationFeeTzs` and `lipaNumber` are byte-identical before and after.
🎯 **One admin save can carry several fields; reading the one you care about tells you nothing
about the others in the same write.**

### 3c. ⛔ The QR has NO payment status — a person is the integration

**There is no API behind this QR, and there is no status to read.** Nothing calls Selcom when
someone scans it; nothing tells us they paid; there is no callback, no order, no reference, no
reconciliation feed. Asked "has this applicant paid?", the system's honest answer is **it does not
know** — because a static QR is a picture, and a Lipa payment made from it is not an order we
created (§2).

⭐ **What actually confirms an agent fee is a compliance officer reading a bank statement.**
`reconcileFee` (`src/lib/server/agent-application-service.ts`) is the only path to
`feeDisposition: "COLLECTED"`, and it requires a human to type what they can see:

| Step | Who | What |
|---|---|---|
| 1 | applicant | pays — by scanning, **or** by typing the Lipa number. Identical outcome |
| 2 | applicant | records a receipt reference; without `feeReference` reconciliation is **refused** |
| 3 | officer | opens the bank statement, types the statement line ref, the amount they read, the masked source account |
| 4 | system | refuses unless the attested amount **exactly equals** the fee — a short or over payment is rejected and audited as `agent.fee.amount_mismatch` |
| 5 | system | marks `COLLECTED`, posts the balanced ledger entries, audits `agent.fee.reconciled` |

🎯 **So the QR removes typing and nothing else.** It changes no part of how the money is matched.
That is exactly why it is safe here and nowhere else: this payment was *already* human-reconciled
before the QR existed, so the QR adds no new trust assumption. On a wallet top-up there is no
officer and no statement line, which is why §2 forbids it there.

⚠️ **And the order-based rail IS strictly more trustworthy — that instinct is correct.** A deposit
carries a `dep_…` order id, so Selcom's callback attributes it automatically and
`settlePaymentWebhook` settles it exactly once, advisory-locked and amount-tamper-defended, with
**no human step**. Compared with that, a static QR is a downgrade in every respect except typing.

⭐ **The improvement, when someone has the time, is to put the agent fee through Checkout as a real
order** — the same question §6 is blocked on. It would give the fee automatic status like a deposit
and retire steps 3–4 above. ⛔ Until that is answered, do **not** close the gap by making the static
QR credit anything: see the C2B prohibition in §6.

The on-screen copy already tells the payer the truth — *"Keep the receipt — you upload it below"*
and *"check that your app shows the name above. If it shows anyone else, stop and tell us."*
⛔ Never reword that into anything implying a scan is confirmed, tracked, or received.

### 3d. 🛑 WITHDRAWN 2026-09-09 — `LIPA_QR_RELEASED = false`

**Management decision.** The QR is off everywhere, on every surface, in every locale, and the
agent fee runs on the normal flow: the applicant is told the destination in text, pays it, uploads
the receipt, and a compliance officer reconciles it (§3c). **Nothing else changed** — deposits,
cashout and every other money path were not touched.

> ⭐ **The reason, in one line: payment without traceability is the problem, and the QR is the
> shortcut to it.** A Lipa Namba payment has nowhere to carry our reference — on M-Pesa, Mixx,
> Airtel and HaloPesa alike the payer enters the **Lipa number** and the **amount** and is never
> asked for a reference. So the money cannot be attributed to a person by the system, only by a
> human reading a statement. Scanning does not change that; it only saves typing.

⚠️ **Withdrawing the QR did NOT buy traceability, and it was never claimed to.** The fee is still
an out-of-band Lipa transfer, still reconciled by hand. What the withdrawal removes is the
*encouragement* of an untraceable payment on a page that looked like a modern, tracked checkout.
The traceable answer is §6 — putting the fee through Checkout as a real **order** — and that is
still blocked on Selcom.

#### How it is switched off, and why not the operator toggle

⛔ **`LIPA_QR_RELEASED` in `src/lib/lipa.ts` is a CONSTANT, deliberately.** `lipaConfig.enabled`
already existed and would have hidden the QR too — but it is persisted in `SystemConfig`, and **a
persisted row beats a code default**. Turning the QR off by editing a default would have changed
nothing in production. That is not hypothetical: it is the exact trap this feature already walked
into once (§3b). A constant cannot be overridden by a row, an operator, or an environment, so
"off" means off everywhere, provably.

`shouldShowLipaQr` consults it **first and unconditionally**. Nothing below can re-open the
affordance.

#### The guards did not go quiet with it

⭐ **A withdrawn feature must not blind its own guards.** With the gate off, every assertion of the
form `!shouldShowLipaQr(…)` is true by construction — it would hold with the safety rule
**deleted**. Five guards would have retired silently and been handed back broken on the day the QR
returned. So:

| | Now tests |
|---|---|
| `test:lipa-qr` §2 | the safety **rule**, via `lipaQrWouldShow`, which bypasses the gate on purpose |
| `test:lipa-qr` §2b | the **gate** — and §2b.3 proves the rule *would* have shown the perfect config, so it is the gate refusing and not a broken setting |
| `red:lipa-qr` | **11/11**, the new case being *"the release gate is switched back on"* → must fail `2b.1` |
| `qa:lipa-qr` | absence at every width × locale, each led by a **positive control** (the page rendered, N chars read) because a 500, a redirect and a withheld QR look identical to a selector |

⛔ The painted-pixel decode and the CSS-pixel floor were **removed, not left passing** — there is
no symbol on screen to measure, and a check with nothing to measure is not coverage.

#### Re-enabling

⛔ **The condition is not "someone wants the QR back".** It is **Selcom confirming that a QR payment
can be verified against the payer** — a per-order QR from Checkout whose `order_id` reaches our
webhook, exactly as a deposit already does (§6). Then: flip the constant, restore the presence and
decode arms in the drive (`git show 6a5701cd:scripts/live/lipa-qr-drive.mjs`), and re-run all three
gates. Everything behind the flag was kept alive and guarded for that day — the verified vector
artwork, the payload pin, the safety rule, the console card.

## 4. The artwork

`public/pay/selcom-lipa-qr.<hash>.svg` — a **vector** symbol carrying the payload decoded and
CRC-verified from Selcom's own poster. `scripts/extract-lipa-qr.mjs` rasterises the SVG it is
about to write and decodes it, refusing to write unless it comes back byte-identical to what
the PDF carried.

### 4a. 🔴 Why it is a vector, and why a raster QR is a defect here

The first version shipped the bitmap straight out of the PDF — 840px, quiet zone added, the
Selcom "S" logo intact. It looked perfect in every screenshot. Then `qa:lipa-qr` decoded the
symbol **as the browser painted it**, and found:

| rendered size | 160 | 176 | 192 | 208 | 224 | 240 | 256 | 288 |
|---|---|---|---|---|---|---|---|---|
| decodes? | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |

…and the pattern *moved* at a different `devicePixelRatio`. That is not a resolution floor you
can design around — it is **moiré**: the QR's module grid beating against the device pixel grid
as the browser resamples an 840px image down to ~190. No `image-rendering` value fixes it;
`pixelated` drops module edges on a downscale and smooth blurs them, and which one wins depends
on the exact ratio.

Shipped, that would have meant **some players can scan it and some cannot, unpredictably**, with
the file on disk perfect, every screenshot fine, and every unit test green. A vector symbol has
nothing to resample and decodes at every size and DPR tested.

⚠️ The Selcom "S" logo is **not** carried over. It is an occlusion the symbol survives only on
error correction; re-adding it over a regenerated code would trade scannability for decoration
on something that moves money. The merchant name and Lipa number sit beside it in text, which is
what a payer actually checks against their wallet app.

⛔ **Do not swap in a `.png` "for consistency with the other `/pay/` marks."** Those are logos.
This is money.

⭐ **The filename is a hash of the payload, and that is a money guard.** `public/sw.js` serves
every `.svg`/`.png` **cache-first until `CACHE_NAME` is bumped** — its own comment records the
mixx/halopesa marks needing exactly that bump. For a logo a stale cache is cosmetic. For a QR
it would leave every returning player scanning a **superseded merchant code** indefinitely,
invisibly to anyone testing in a fresh browser. Content-hashing the name means a reissued QR is
a new URL: nothing to remember, nothing to bump. `test:lipa-qr` §1.6 asserts the property still
holds.

⛔ The image and its pinned payload are **not operator-editable**. Replacing them means
re-running the extraction script against a new Selcom-issued poster, which re-verifies the CRC
and the merchant id and refuses to write on failure. A text field would let someone point the
QR at an image nobody has decoded.

## 5. Guards

| Guard | Holds |
|---|---|
| `test:lipa-qr` §1 | the shipped SVG **decodes** to the pinned payload byte-for-byte; its EMVCo CRC re-derives; it names the configured Lipa number; the filename hash matches; exactly one asset exists |
| `test:lipa-qr` §2 | the safety rule — shows on a match, hides on a mismatch, an empty account, a switched-off operator toggle, and a number that merely *contains* the Lipa number |
| `test:lipa-qr` §3 | the config refuses a non-numeric number, a bad USSD string, an asset path outside `/pay/`, an empty pin |
| `test:lipa-qr` §4 | **the money rule** — an allow-list of surfaces, both directions, plus an explicit "no wallet surface renders this" arm |
| `red:lipa-qr` | **10/10 caught, 0 missed, 0 broken harness** (restored 2026-09-09 — see §5a; it was 9/10 from the SVG migration until then). Plants a *valid but different* QR, a one-character payload edit, a de-hashed filename, four separate corruptions of the safety rule, the deposit-page wiring, and two validator holes — each must fail the gate **on its own named check** |
| `qa:lipa-qr` | **122 checks.** Screenshots the element as painted and **decodes that**, at 360/393/768/1280 × en/sw/zh: a rectangle, a ≥150 CSS-px floor, square, no clipping, a vector source, the printed number matching the encoded one. Then it sets the fee destination to a *different* account and asserts the QR is **gone** while the account is still shown as text — and on every pass the same selector must match **nothing** on `/wallet/deposit`. It restores the destination it found |

⚠️ `red:lipa-qr` scores a run as CAUGHT only when the gate read the **mutant** tree and failed
on the **targeted** check. "It exited non-zero" is not evidence, and an unmatched anchor is
reported as a broken harness rather than a pass.

### 5a. 🔴 The day the red harness scored itself 10/10 while one case proved nothing

**2026-09-09.** The table above said 10/10. Executed on `5bd5f84e` it reported **9/10 · 1 missed**,
and it had been 9/10 since the artwork became a vector — the handover that claimed 10/10 was
written from a measurement taken **before** the SVG migration and never re-run.

The broken case was *"the asset filename loses its content hash"*, the mutation defending the
cache-busting property in §4a. It renamed the asset to `selcom-lipa-qr.png` and rewrote the
config with a regex ending `\.png`. Once the config held `.svg`, **that rewrite matched nothing**
— so the config kept pointing at the hashed path, the renamed file was simply gone, and the gate
failed on §1.1 *(the configured asset is on disk)* instead of the targeted §1.6.

⭐ **And §1.6 passed on the mutant tree, which is the part worth remembering.** It derives the
hash from `cfg.qrAssetPath` — the **config string**, never the file on disk. A mutation that
strands the asset cannot make §1.6 fail no matter how wrong the filename is.

Two properties of the harness are the only reason this surfaced at all, and both were deliberate:

- it demands the failure be the **named** check, so this scored `WRONG CHECK` rather than a pass.
  A harness counting a non-zero exit would have reported 10/10 forever — the file *was* failing
  the gate, just for a reason that had nothing to do with content hashing;
- it reports an unusable mutation as a **broken harness**, not a catch.

⛔ **The fix is that the mutation now removes the hash and nothing else.** The extension is read
from the file that is actually on disk rather than hard-coded, the asset stays findable, decodable
and byte-identical to the pin, and §1.6 is left as the only check that *can* fail. A config
rewrite that changes nothing now returns a broken-harness reason instead of proceeding silently —
the text-anchor path already refused a mutation that left the file identical, and a `mutate` that
rewrites a file owes the same proof.

🎯 **The general rule this is an instance of: a mutation that breaks its subject in more than one
way is not aimed at anything.** It will keep failing the gate, and it will stop testing what its
name says. When a guard reads a *description* of an artefact (a path, a config string) rather than
the artefact, a mutation must corrupt the description — corrupting the artefact leaves the guard
untouched and the harness green for the wrong reason.

## 6. What is NOT built

**A per-order dynamic QR on `/wallet/deposit`.** This is the real answer to "let players pay
without typing", and it is safe precisely because the QR would be bound to an order: the
`dep_…` id is already in it, so `handleSelcomCallback` → `selcomVerifyOrder` →
`settlePaymentWebhook` (exactly-once, advisory-locked, amount-tamper-defended) works
**unchanged**. No new attribution, no new money path.

It is blocked on one fact: **does Selcom's Checkout `create-order` return a scannable per-order
QR / Masterpass payload?** `selcomCardCheckout` reads only `data[0].payment_gateway_url` today.
`SELCOM-API-DIGEST.md` §9.2 also still records which collection product our vendor account is
enabled for as unconfirmed. Nothing here is guessed until that is answered.

⛔ **Also not built, deliberately:** Selcom's C2B `/lookup` + `/validation` + `/notification`
legs with a per-player payment reference. That is the *only* way a static QR could credit a
wallet, it is a material change to the money path, and a static poster QR does not prompt the
payer for a reference anyway — which is the entire point of scanning one.
