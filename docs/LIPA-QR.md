# Selcom Lipa QR — the authority

**2026-09-08.** Ocean Entertainment Limited's Selcom merchant QR ("Lipa Namba **7006 3747**"),
where it may appear, and — the part that matters — **where it may not**.

⛔ **Read §1 before adding a caller.** The one-line version: this QR cannot credit a wallet.

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
| `red:lipa-qr` | **10/10 caught, 0 missed, 0 broken harness.** Plants a *valid but different* QR, a one-character payload edit, a de-hashed filename, four separate corruptions of the safety rule, the deposit-page wiring, and two validator holes — each must fail the gate **on its own named check** |
| `qa:lipa-qr` | **122 checks.** Screenshots the element as painted and **decodes that**, at 360/393/768/1280 × en/sw/zh: a rectangle, a ≥150 CSS-px floor, square, no clipping, a vector source, the printed number matching the encoded one. Then it sets the fee destination to a *different* account and asserts the QR is **gone** while the account is still shown as text — and on every pass the same selector must match **nothing** on `/wallet/deposit`. It restores the destination it found |

⚠️ `red:lipa-qr` scores a run as CAUGHT only when the gate read the **mutant** tree and failed
on the **targeted** check. "It exited non-zero" is not evidence, and an unmatched anchor is
reported as a broken harness rather than a pass.

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
