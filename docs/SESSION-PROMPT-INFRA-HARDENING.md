STATUS: 🟢 **1, 2 AND 3 CLOSED 2026-08-24 — 4 remains OPEN** (its own session, as written).
Four infrastructure findings, written 2026-08-24 from a verified audit of the running platform.
Each is small; the point of this file is that none of them may be shipped on a green suite
alone. ⛔ **Every push to `main` deploys LIVE.**

## What closed, 2026-08-24 — and what the *Verify live* blocks actually returned

| # | State | Evidence against the running platform |
|---|---|---|
| 1 | ✅ **CLOSED** | `poweredByHeader: false` @`0ea8f042`. `curl -sI https://www.50pick.tz` → **no `x-powered-by`**, HSTS still present, and all 8 other `src/proxy.ts` headers still present (counted, not eyeballed). |
| 2 | ✅ **CLOSED** | `engines: {node:"24.x"}` @`0ea8f042`. `railway ssh "node --version"` → **v24.19.0**, matching the CI pin. Railpack's own deploy record reads `requestedVersion "24.x" → resolvedVersion "24.19.0"` — proof it read `engines`, not just that a version changed. |
| 3 | ✅ **CLOSED** | SSL/TLS `full`→**`strict`** first, then `www` → **Proxied**. `cf-ray` present, apex still DNS-only. SSE verified before AND after: identical, 4 heartbeats 15.0s apart, open the full 45s. Selcom egress re-probed inside the container: unchanged. `qa:live` **146/146**. |
| 4 | 🟠 **OPEN** | Untouched, deliberately — §4 says its own session, and it is the only item here that is real work. |

⛔ **THREE THINGS THIS COMMISSION GOT WRONG**, each found by running it rather than reading it:

1. **§3's SSE verify command cannot fail.** `curl -N -s .../api/events --max-time 40` returns
   `{"error":"Unauthorized"}` in 13 seconds — the route validates the session *before* it opens
   the stream, so that command returns the same 24 bytes proxied, buffering, terminating early,
   or not proxied at all. Replaced by `npm run qa:sse-edge`, which signs in, opens the real
   stream and times the bytes. **Do not restore the curl.**
2. **§2's "the report states 22.23.2".** The *committed* report says "Node.js 24 LTS" and
   contains no `22.23` at all — so raising production to 24 made it CORRECT and no rebuild was
   needed. The 22.23.2 wording exists only in an uncommitted working copy.
3. **§0's baseline was red before anything was touched**, and one of the six failures was not
   real: `typecheck` failed on `prisma-dal.ts(778,11)` because the *local* generated Prisma
   client predated a schema field added 2026-08-21. `npx prisma generate` cleared it, no code.
   True baseline: **239/244**, five failures, all pre-existing — and the branch matched it
   exactly.

⚠️ **A defect found while verifying, outside all four items:** `qa:live` had been **dying at
section [B] since 2026-08-21** on the selector `input[type=hidden][name=dob]`. `DateSelect`'s
mirror stopped being a hidden input that day, deliberately (a hidden input is barred from
constraint validation, so its `required` was inert). Sections C, D and E had not run for three
days, and `predeploy` ends with `qa:live`. The selector was repaired — not the assertion — and
the gauntlet now returns 146/146. Verified as NOT edge-related first, by running the identical
gauntlet against the still-unproxied apex and watching it fail the same way.

🔴 **ACME renewal through the new proxy — the one deadline this work created.** Origin certs
expire **2026-10-15** and Railway renews by answering a challenge at the origin, which now
arrives via Cloudflare for `www`. No renewal has been observed through that path, and an expired
origin cert under `Full (strict)` is a total outage with no warning.

⭐ **So it is a gate, not a note.** `qa:live` §[F] fails at **21 days** left — a check that goes
red the day the site dies is a headstone, not a gate — and `qa:live` is the last step of
`predeploy`. Tracked as **`E-195`** in [`NEXT-PLAN.md`](NEXT-PLAN.md) → ⏰ DATED.

⛔ **Its first version was green on the wrong certificate.** Since the flip, dialling
`www.50pick.tz` returns CLOUDFLARE'S cert (`CN=50pick.tz`, Google Trust Services, expiry
`Oct 15 12:26:23`) — which Cloudflare renews itself and which is never at risk. Railway's origin
cert is a different one (`CN=www.50pick.tz`, Let's Encrypt, `Oct 15 14:49:57`). The gate now
dials Railway's domain target with the hostname as SNI, and carries a positive control that goes
red if it ever reads the edge's certificate again. Both assertions were driven red before being
trusted: the control by pointing `CERT_ORIGIN_HOST` at the proxied name, the expiry by raising
the threshold past the real value.

⛔ **AND ONE THE COMMISSION NEVER LISTED, WHICH IS THE MONEY ONE.**
`PAYMENT_WEBHOOK_URL` is `https://www.50pick.tz/api/webhooks/payments` — the exact host §3 asks
you to proxy. Selcom confirms deposits with a **server-to-server POST**: no browser, nothing that
can answer a challenge. If Cloudflare interrogated it, deposits would stop confirming while the
site looked perfectly healthy. Checked with a POST that cannot change anything (no `X-Provider`,
no `Authorization: SELCOM` → refused at the handler's first line with
`400 {"ok":false,"error":"unknown-provider"}`, before any secret, audit row or settlement): it
returns exactly that JSON through the proxy, `cf-ray` stamped, byte-identical to the same POST
against the still-direct apex. **Re-run it if anyone enables Bot Fight Mode, a WAF managed
ruleset, or a rate limit on this zone.**

## The suite state — and a table that went stale while it was being written

`test:all` was **239/244** before this work and 239/244 after it: the same five, none introduced
here. A parallel session then landed `d9f43125` (E-190), which fixed three of them, so the number
is now **242/244** — measured on the rebased tree, not inferred from their commit message.

| Suite | Why it was red | Now |
|---|---|---|
| `test:responsive` | needs a dev server on `:3000`; `ECONNREFUSED ::1:3000` | ❌ still red — **harness, not product** |
| `test:motion` | same — `ERR_CONNECTION_REFUSED` at `localhost:3000` | ❌ still red — **harness, not product** |
| `test:integrity` | `[A10] src/app/admin/ai-usage/page.tsx:102` — money via `toLocaleString`, not `formatTzs()` | ✅ fixed in `d9f43125` |
| `test:admin-act-gate` | `admin/ai-usage/cycle-controls.tsx` acted without the gate; the allowlist GREW 22 → 23 | ✅ fixed in `d9f43125` |
| `test:design-one-door` | `docs/README.md` stopped stating its file count in the form the guard read — session 59e changed the prose, not the guard | ✅ fixed in `d9f43125` |

⛔ **The two that remain have never once been green on this machine, and that is the point.**
They are the only suites needing a running server, so `test:all` has a permanent 242/244 ceiling
here. Read as "two known bugs" it sends someone hunting defects that do not exist; read as
"always fine" it hides the day one of them goes red for a real reason. Run them against a server
to make them mean something — they are not a standing excuse.

⚠️ **Both real defects were on the SAME admin AI-usage page and both shipped to `main` red.**
`predeploy` would have stopped them — but `predeploy` ends with `qa:live`, which had been
crashing at section [B] since 2026-08-21, so nobody was running it far enough to find out.

# Infrastructure hardening — four findings, live-verified

## Why this exists

While producing the Technical Architecture Report (`docs/Reports/`) every version and count in
it was checked against the running platform. The report is now accurate. In the course of that
check, four things were found that are **not** in the report and are worth closing.

All four were measured, not inferred. The evidence for each is in its section.

---

## 0 · Read before touching anything

| | |
|---|---|
| ⛔ **Every push to `main` is a live deploy.** | Work on a branch. Verify on the branch. Merge deliberately. |
| ⛔ **The repo is CRLF.** | A multi-line match anchored on `\n` silently matches nothing. Normalise, edit, restore CRLF. |
| ⛔ **`railway run` executes on YOUR laptop**, `railway ssh` runs inside the container. | Selcom and the internal DB host only work from inside. See [`SETUP.md`](SETUP.md) §5. |
| ⚠️ **Do not touch the Cloudflare mail records.** | MX/SPF/DKIM belong to the mail lane. This commission touches the two web records only. |
| ✅ **The safety net** | `npm run typecheck` · `npm run test:all` · `npm run predeploy` · `npm run qa:live` |

**Baseline to capture before the first change**, so "nothing broke" is a comparison and not a
feeling:

```bash
curl -s https://www.50pick.tz/api/health          # save this output
curl -sI https://www.50pick.tz                    # save the headers
railway ssh "node --version"
npm run test:all                                  # record the pass count
```

---

## 1 · `x-powered-by: Next.js` is sent on every response

**Measured:** `curl -sI https://www.50pick.tz` returns `x-powered-by: Next.js`.

Framework and version disclosure on every response. It is the first line of most scanner
reports and costs one line to remove.

**Change** — `next.config.ts`, in the config object:

```ts
poweredByHeader: false,
```

**Verify live, after deploy:**

```bash
curl -sI https://www.50pick.tz | grep -i "x-powered-by"   # must return NOTHING
curl -sI https://www.50pick.tz | grep -i "strict-transport-security"  # must still be present
```

⛔ The second command matters: the security headers are set in `src/proxy.ts` and this change is
in `next.config.ts`. Confirm you removed a header without disturbing the ones that must stay.

---

## 2 · Production runs Node 22; CI pins Node 24

**Measured:** `railway ssh "node --version"` → `v22.23.2`.
`.github/workflows/ci.yml` and `.github/workflows/backup-nightly.yml` both pin `node-version: 24`.

So every suite is proven on a runtime the platform does not run. `package.json` declares no
`engines` field, which is why the platform builder chose its own default.

**Decide one direction and make both ends agree.** Either is defensible; they must match.

- **Raise production to 24** — add to `package.json`:
  ```json
  "engines": { "node": "24.x" }
  ```
- **or lower CI to 22** — change `node-version: 24` to `22` in both workflow files.

⚠️ **If raising production:** the deploy rebuilds native modules. This tree's dependencies are
pure-JS or prebuilt, so the risk is low — but the failure mode is a container that will not
boot, so watch the deploy log rather than assuming.

**Verify live, after deploy:**

```bash
railway ssh "node --version"                      # must match the CI pin
curl -s https://www.50pick.tz/api/health          # ok:true, uptimeSec reset = new container
npm run test:all                                  # same pass count as the baseline
```

---

## 3 · No CDN or WAF in front of the origin

**Measured:** `curl -sI https://www.50pick.tz` returns `server: railway-hikari` and **no
`cf-ray` header**. Cloudflare is DNS-only; traffic reaches Railway directly. There is no edge
cache, no DDoS absorption and no WAF in front of a live-odds product.

**Change:** in the Cloudflare dashboard set the apex and `www` records to **Proxied**.

⛔ **Three things that will bite, in order:**

1. **Set SSL/TLS mode to `Full (strict)` BEFORE proxying.** Anything less either breaks the
   Railway certificate or serves an unencrypted origin leg.
2. **`www` first. Leave the apex DNS-only until `www` is confirmed.** That keeps a working
   route while you test, and this domain has stalled on verification before — see
   [`LIVE-HOSTING-STATUS.md`](LIVE-HOSTING-STATUS.md).
3. **Server-Sent Events must survive the proxy.** `/api/events` is a long-lived
   `text/event-stream` with a 15-second heartbeat. Cloudflare must not buffer or terminate it.
   This is the single most likely thing to break, and it breaks *quietly* — the page still
   loads, live prices simply stop moving.

⚠️ **Selcom's IP allow-list is on the platform's EGRESS** (outbound to Selcom). Proxying inbound
traffic does not change it — but confirm rather than assume, with the probe below.

**Verify live, after each record is flipped:**

```bash
curl -sI https://www.50pick.tz | grep -i "cf-ray"       # now PRESENT = proxied
curl -s  https://www.50pick.tz/api/health               # ok:true

# SSE must stay open and keep sending. Watch for ~40s: heartbeats every 15s.
curl -N -s https://www.50pick.tz/api/events --max-time 40

railway ssh "node scripts/selcom-probe.mjs"             # payment rails still reachable
npm run qa:live                                         # full live gauntlet
```

⛔ **If the SSE stream closes early or sends nothing, revert that record to DNS-only
immediately.** A silent live-price failure is worse than no CDN.

---

## 4 · ~297 script files sit outside the type checker

**The repo's own record:** `E-161` in [`NEXT-PLAN.md`](NEXT-PLAN.md) — **297 files, 1,007
errors**, mostly `TS18048` on un-narrowed `ServiceResult` reads. `tsc` does not typecheck
`.mts`, which is why eleven fixtures kept writing a deleted column while `npm run typecheck`
exited 0.

This is the only item here that is a real piece of work — a scripts-scoped `tsconfig` plus
roughly a thousand mechanical narrowings. **Do not attempt it in the same session as 1–3.**

**Do it in tranches, money suites first**, because that is where an unchecked fixture has
already cost real time:

1. Create `tsconfig.scripts.json` covering `scripts/**/*.mts`, `noEmit`, strict.
2. Add a new `typecheck:scripts` entry to `package.json` — red at first, deliberately.
3. Fix the money suites first — `money-invariants`, `fee-model`, `loser-share-fee`,
   `settlement-gate`, `ledger`, `trial-balance`.
4. Only when a tranche is clean, add it to the `include` and keep the gate green.
5. Add `typecheck:scripts` to `predeploy` when the last tranche lands — **not before**, or the
   gate is red for days and people learn to skip it.

⛔ **Fix the types; do not change the assertions.** A suite that is made to typecheck by
loosening what it asserts has been deleted, not repaired.

---

## Order, and what "done" means

| # | Item | Effort | Ship with |
|---|---|---|---|
| 1 | `poweredByHeader: false` | minutes | 2 |
| 2 | Node alignment | ~30 min | 1 |
| 3 | Cloudflare proxy | 1–2 h | on its own |
| 4 | `.mts` typechecking | 1–2 days | its own session |

**1 and 2 ship together** — one branch, one deploy, both verified by `curl` and
`railway ssh`. **3 is its own deploy** because its failure mode is a live-traffic failure and it
must be reversible in one dashboard click. **4 is a separate session.**

⛔ **None of these is done because a suite went green.** Each is done when the command in its
own *Verify live* block returns the stated result against `https://www.50pick.tz`, and when
`/api/health` and the `test:all` pass count match the baseline captured in §0.

## Rollback

| Item | Reverting it |
|---|---|
| 1 | Remove the line, redeploy. |
| 2 | Restore the previous pin, redeploy. Watch the boot log. |
| 3 | Set the record back to DNS-only in Cloudflare — takes effect in seconds, no deploy. |
| 4 | Never shipped half-done: a tranche is either clean and in `include`, or out of it. |

## When it is finished

Update [`LIVE-HOSTING-STATUS.md`](LIVE-HOSTING-STATUS.md) with the new edge posture and the Node
version, and note the change in this file. ⛔ The Technical Architecture Report in
`docs/Reports/` states `22.23.2` as the runtime — **if item 2 raises production to 24, that
report is wrong the moment the deploy lands.** Rebuild it in the same session:

```bash
node docs/Reports/mkreport.mjs technical-architecture-report.html 50pick-technical-architecture-report.pdf
```

That renderer refuses to build if any sheet overflows its page, so a version string that
changes a line count cannot silently reflow the document.
