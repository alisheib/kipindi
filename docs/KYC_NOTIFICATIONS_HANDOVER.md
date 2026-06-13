# Handover — KYC submission/review email + notification flow

**Goal:** when a player finishes uploading KYC and it enters review, both the
player and our team get notified (in-app + email); when we approve/reject, the
player is emailed. Everything traceable, with references, 0 gaps.

This doc is self-contained — a fresh session can execute it without re-deriving
context. Build it cleanly, test, commit, push (push policy: push always).

---

## Current state (already built — DO NOT redo)
- **KYC flow** (`src/lib/server/kyc-service.ts`): `startKyc → submitNidaStep
  (verifyNida) → attachDocument ×3 → submitForReview (→ PENDING_REVIEW) →
  reviewKyc (APPROVE/REJECT)`.
- **`reviewKyc`** already fires `kycApprovedHtml` / `kycRejectedHtml` to the user
  + `notifyKyc` (in-app) + audit. Idempotent, self-review blocked, reason
  required on reject.
- **Admin in-platform surface already exists:** `/admin/approvals` shows a "KYC
  awaiting verification" queue + a "KYC pending" KPI (`listPendingKyc()`), each
  row deep-links to `/admin/players/<id>?tab=kyc` where doc previews render.
- **Email infra is fixed and reliable:** `sendEmailToUser(userId, build)` reads
  `user.email` and now falls back to the live `resolvePhoneEmail(phone)`
  (`src/lib/server/email-map.ts`, env `PHONE_EMAIL_MAP`). Bilingual EN/SW
  templates in `email.ts` with `wrap()`, `detailRows()`, `ctaButton()`,
  `fmtDateTime()` (EAT), `refNote()`. Postmark when `POSTMARK_API_KEY` set, else
  `[email-stub]` console log.
- **`StoredKyc` fields** (`src/lib/server/store.ts`): `id` (use as reference),
  `userId`, `status`, `nidaNumber`, `fullName`, `dob`, `documents[]`
  (`{docType, storageKey, uploadedAt}`), `submittedAt`, `reviewerId`,
  `reviewedAt`.

## The gap to build
1. **On submit → PENDING_REVIEW:** no email to the player, and no email/notify
   to our team. (Only `notifyKyc` in-app fires today.)
2. **Approved email** is generic — should explicitly say "you can start playing"
   + carry the reference.

---

## What to build

### A. New email templates (`src/lib/server/email.ts`)

**`kycSubmittedHtml({ name, reference, submittedAt, docTypes, viewUrl })`** — to the player.
- eyebrow: "Documents received · Nyaraka zimepokelewa"
- heading: "We're reviewing your documents"
- subtitle: "Thanks{name?, ${name}}. Your ID documents are in and our team is
  verifying them. You'll get an email the moment it's decided — usually within a
  few hours during business hours." + SW line.
- `detailRows`: Reference (`reference`), Submitted (`fmtDateTime(submittedAt)`),
  Documents ("ID front, ID back, selfie" from `docTypes`), Status ("Pending
  verification").
- A line: "Need to change a document? Reply to this email and we'll reopen your
  submission." (Docs are LOCKED during review — see Decision #1; default is the
  reply-to-support path, not self-service.)
- `refNote()` + `ctaButton(viewUrl="/profile/kyc", "View your submission · Tazama")`.

**`kycSubmittedAdminHtml({ reference, userRef, phoneMasked, name, nidaMasked, submittedAt, reviewUrl })`** — to compliance/ops.
- eyebrow: "KYC · awaiting review"
- heading: "New identity submission to verify"
- `detailRows`: Reference, Player (`name` + `phoneMasked`), NIDA (`nidaMasked`),
  Submitted (`fmtDateTime`).
- `ctaButton(reviewUrl, "Review now")` where `reviewUrl = ${BASE_URL}/admin/players/${userId}?tab=kyc`.
- NO images, NO full NIDA in the body (mask: last 4 only).

**Enhance `kycApprovedHtml({ name, reference? })`**
- Keep heading; change subtitle to: "Your identity is confirmed — you can now
  deposit, place bets, and withdraw." + SW. Add a `detailRows` with Reference if
  passed. CTA stays "Browse markets" (or "/markets").

(Optional) add Reference row to `kycRejectedHtml` for symmetry.

### B. Recipient resolution — ALL admins for now (Ali's decision 2026-06-14)
Notify **every admin-role user** that has a resolvable email. Later we'll narrow
to a curated subset.

`async function kycNotifyEmails(): Promise<string[]>`:
- If env **`KYC_NOTIFY_EMAILS`** is set (comma-separated) → use that (the future
  "only some accounts" path). Otherwise:
- `const users = await db.user.list();` filter to
  `["ADMIN","COMPLIANCE","MODERATOR"].includes(u.role)`, map each to
  `u.email || resolvePhoneEmail(u.phoneE164)`, drop falsy, **dedupe + lowercase**.
- Returns `[]` if none → admin email simply skipped (log once). Best-effort.
- Send one email per recipient (or a single send with multiple `To`); never
  throws. (10 admins = 10 sends, fine. If this list ever grows large, batch.)

### C. Wire into `submitForReview` (`src/lib/server/kyc-service.ts`)
After the `db.kyc.upsert({... status: "PENDING_REVIEW", submittedAt ...})`:
- **Idempotency guard (IMPORTANT):** only fire emails when transitioning INTO
  PENDING_REVIEW. If `k.status === "PENDING_REVIEW"` already at entry, return ok
  WITHOUT resending. (Today submitForReview has no such guard — add it so a
  double-submit doesn't double-email.)
- Fetch `const u = await db.user.findById(userId)` for name/phone.
- **Player email:** `sendEmailToUser(userId, (email) => ({ to: email,
  subject: "Documents received · verification pending", tag: "kyc-submitted",
  html: kycSubmittedHtml({ name: firstName(k.fullName ?? u?.displayName),
  reference: k.id, submittedAt: now, docTypes: k.documents.map(d=>d.docType),
  viewUrl: "/profile/kyc" }) })).catch(()=>{})`
- **Admin email(s):** for each `to` in `kycNotifyEmails()`:
  `sendEmail({ to, subject: "New KYC to verify · " + k.id, tag: "kyc-admin",
  html: kycSubmittedAdminHtml({...}) }).catch(()=>{})`. Best-effort, never throws.
- Keep `notifyKyc(userId, "PENDING_REVIEW")`.
- Mask helpers: `nidaMasked = "•••• " + (k.nidaNumber?.slice(-4) ?? "")`,
  `phoneMasked` like existing masking in notification-service (reuse if present).

### D. Approved email reference (`reviewKyc`)
Pass `reference: k.id` into `kycApprovedHtml` (and `kycRejectedHtml` if you add it).

### E. Identity propagation after KYC (name + email) — "every change reflects"
**Problem:** after approval, the verified legal name sits in `k.fullName` but
`user.displayName` is never updated, so greetings/profile/welcome+login emails
(all resolve via `displayLabel(user)`) still show the old/empty handle. Email is
collected via profile / `PHONE_EMAIL_MAP`, not KYC.

**Name — do this in `reviewKyc` on APPROVE (and only then):**
- If `user.displayName` is empty/null (user never set a handle), set
  `user.displayName = k.fullName` via `db.user.update`. If they DID set a handle,
  **leave it** (don't override a chosen nickname).
- Result: greetings, profile, admin, and emails now show the verified name
  everywhere via `displayLabel`. Public surfaces stay safe automatically:
  leaderboard already uses `displayName.split(" ")[0]` (first name only,
  `src/app/leaderboard/page.tsx`), comments use `maskName(...)` frozen at write
  (`src/lib/server/comments-store.ts`). **Do NOT** render full legal surname on
  any public surface — verify no new surface does.
- Confirm `displayLabel` (resolver used by emails) returns the real name once
  displayName is set; if it falls back to phone/"Player", that's now fixed.

**Email — make KYC the canonical collection point:**
- Add an **email field to the KYC NIDA step** (or onboarding): validate (zod
  `.email()`, lowercase/trim — mirror `src/app/profile/actions.ts`), store on
  `user.email` via `db.user.update`. The DAL now persists/reads `user.email`
  (fixed this session) so it round-trips on Postgres.
- Once set, all transactional mail routes to it automatically (the
  `sendEmailToUser` → `user.email || resolvePhoneEmail` fix). `PHONE_EMAIL_MAP`
  becomes a fallback for legacy/test accounts only.
- The KYC "submitted" email (section A) should send to that just-collected email.

**Trace to re-verify after the change (grep + eyeball):** `displayName` reads in
`app-shell` greeting, `/profile`, `/admin/players`, `/leaderboard`, comments;
`displayLabel(` call sites; every `*Html({ name })` email. Ensure each shows the
verified name where private and first-name/masked where public.

### F. Upload UX / loaders — "users never get lost mid-upload"
- **`src/components/profile/kyc-doc-uploader.tsx`:** `fileToDataUrl()` (canvas
  resize) runs BEFORE the `useTransition` `start()`, so `pending` (the spinner +
  "Uploading…") doesn't show during resize — on a big phone photo that's a 1–2s
  dead zone. **Fix:** introduce a `busy` state set the moment a file is picked,
  covering resize → action → done; show spinner + "Preparing…/Uploading…" the
  whole time; disable the slot; clear on success/error. Keep the existing toast +
  "Attached" done state.
- **`src/app/profile/kyc/page.tsx` (line ~215):** the "Submit for review" button
  is a plain `<button>` in `<form action={submitKycForReviewAction}>` with no
  pending feedback. **Fix:** use `SubmitButton` (already imported, as the NIDA
  step does) with `pendingLabel="Submitting…"` so the user sees progress while
  the submission + emails fire.
- General: keep the file input disabled while busy; success must be visually
  unmistakable (checkmark + "Attached"); on failure show the toast AND restore
  the slot so they can retry. Verify on a throttled connection + a large (~8MP)
  photo that the loader is visible end-to-end.

---

## Edge cases / "0 flaws" checklist
- [ ] All sends are best-effort, wrapped, and **never block or fail** the
      submission/review transition.
- [ ] **No PII leak:** never put images, full NIDA, or DOB in any email body.
      Admin email masks NIDA to last 4.
- [ ] **Idempotent:** submitting twice (or a retry) does NOT resend the player
      or admin email. Approve/reject already idempotent in `reviewKyc` — keep.
- [ ] Bilingual EN/SW, consistent with existing templates, responsive (the
      shared `wrap()`/`detailRows()` already are).
- [ ] `KYC_NOTIFY_EMAILS` unset → admin email simply skipped (logged once), no
      crash.
- [ ] Player email link goes to `/profile/kyc`; copy is honest about the
      locked-during-review behavior (see Decision #1).
- [ ] Reference (`k.id`) identical across the player email, admin email, and the
      audit/queue so support can cross-reference.

---

## Test plan (do all, like prior work)
1. **Integration (tsx, in-memory):** set `PHONE_EMAIL_MAP` + `KYC_NOTIFY_EMAILS`,
   drive `startKyc → submitNidaStep → attachDocument ×3 → submitForReview`,
   capture `console.log`, assert: player `[email-stub] … kyc-submitted` to the
   mapped address AND one admin stub per `KYC_NOTIFY_EMAILS` entry. Call
   `submitForReview` again → assert NO second send (idempotency).
2. `reviewKyc` APPROVE → assert `kycApprovedHtml` stub with reference + "start
   playing" copy. REJECT → `kycRejectedHtml` stub.
3. **Visual:** add the new templates to `scripts/email-preview.mts`, render at
   375 + 600, eyeball (reference, links, masked NIDA, no PII).
4. `npx tsc --noEmit` clean, `npx next build` clean.
5. `scripts/kyc-review.test.mts` still passes; gauntlet `pre-deploy-live-check`
   133/133.
6. Commit + push. (Deploy verifies on prod via the onRequestError hook +
   Postmark activity.)

---

## Open decisions to confirm with Ali (ask at session start)
1. **"Change documents" link:** docs lock once `PENDING_REVIEW`. Default plan =
   email says "reply to reopen" + link to `/profile/kyc` (no code change to the
   lock). Alternative = build a self-service **"Withdraw & edit"** button on
   `/profile/kyc` that resets status to allow re-upload (extra server action +
   state transition). **Recommend default; build withdraw only if Ali wants it.**
2. **Player viewing their own uploaded images:** currently images are served
   only to admins (`/api/admin/kyc-doc`). Letting the player re-view their
   images needs a user-self route. Default = `/profile/kyc` shows which doc
   types are on file (no image re-view). Confirm if Ali wants full self-view.
3. **Admin recipients: DECIDED (2026-06-14) → ALL admin-role users with an
   email, for now** (see section B). `KYC_NOTIFY_EMAILS` env is the later
   "only some accounts" override. No action needed unless Ali changes his mind.
4. (Optional) Admin in-app bell vs relying on the existing `/admin/approvals`
   queue. Default = queue is enough.
5. **Name backfill (section E):** on approve, set `displayName` from `fullName`
   only when displayName is empty (recommended), vs always, vs never. Confirm we
   never show full legal surname publicly. **Recommend: backfill-if-empty.**
6. **Email collection point (section E):** add an email field to the KYC NIDA
   step (recommended — canonical, tied to identity) vs keep relying on the
   profile form + `PHONE_EMAIL_MAP`. Confirm with Ali.

## Test additions for sections E & F
- After `reviewKyc` APPROVE: assert `user.displayName` is backfilled from
  `fullName` when it was empty, and **untouched** when a handle pre-existed.
- Assert leaderboard/comments still show first-name/masked (no full surname).
- If email collected in KYC: assert it lands on `user.email` and the next
  transactional email resolves to it (not the map fallback).
- Uploader: on a large photo + throttled network, the loader is visible from
  file-pick through "Attached"; submit button shows "Submitting…"; failure
  restores the slot for retry.

---

## Related KYC hardening (separate, larger — note, don't bundle unless asked)
From the architecture review (same session): NIDA is still a **mock**
(`src/lib/server/nida.ts`); documents are stored as **base64 inline** in
`storageKey` instead of object storage; image validation trusts the declared
mime (no magic-byte/EXIF strip); raw-doc viewing allows ADMIN/COMPLIANCE/
MODERATOR (tighten to COMPLIANCE); consider a structured **officer affirmation
checklist** on approve and a KYC vendor (Smile ID) for real NIDA + liveness.
These are the real-money-launch P0/P1 items — track separately.

## Env vars introduced here
- `KYC_NOTIFY_EMAILS` — comma-separated compliance/ops inboxes for the "new KYC
  submission" admin email. (Plus existing `PHONE_EMAIL_MAP`, `POSTMARK_API_KEY`.)
