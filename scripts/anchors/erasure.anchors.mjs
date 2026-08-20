/**
 * THE ANCHORS `red:erasure` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason `updown-readiness.anchors.mjs` sets out at length: the fleet
 * auditor must answer *"does every anchor still resolve, exactly once?"* WITHOUT executing a
 * harness that rewrites real source. One definition, imported by both, so adding a mutation
 * adds it to the audit in the same keystroke.
 *
 * ⚠️ NO SIDE EFFECTS. Imported by a suite inside `test:all` — data only, repo-relative POSIX
 * paths, nothing that touches the filesystem to describe it.
 *
 * ── WHAT THESE MUTATIONS ARE ──────────────────────────────────────────────────
 * Every one of them is a defect somebody would plausibly WRITE, not a random edit. Case 1 is
 * the most important: it is the erasure routine the 2026-08-21 decision literally describes
 * — hash the number in place, trust the index — and it hands one human a second account on
 * one national ID. If `test:erasure` can be green over that, the whole item is decoration.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string }} RedMutation */

const ERASURE = "src/lib/server/erasure.ts";
const KYC = "src/lib/server/kyc-service.ts";
const COMMENTS = "src/lib/server/comments-store.ts";
const STORE = "src/lib/server/store.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    // 🔴 THE ONE THE WHOLE ITEM EXISTS FOR. This is the decision implemented AS WRITTEN:
    // the number becomes its keyed HMAC and the index is trusted to keep colliding. It does
    // not — the erased row holds a hash and the next applicant writes the raw number — and
    // with the fingerprint fast-path removed, the in-memory store shows exactly what a
    // fingerprint-less database would: the second account is CREATED.
    name: "hash-in-place-and-trust-the-index (a SECOND account on one national ID)",
    file: KYC,
    suite: "erasure",
    from: `    (await db.kyc.findActiveByFingerprint(fingerprint, userId));`,
    to: `    null;`,
  },
  {
    // The fingerprint written only at erasure. Plausible — "why write it for everyone when
    // only erased rows need it?" — and it silently disarms the index, because a unique index
    // only collides if BOTH rows carry a value.
    name: "fingerprint-not-written-at-the-identity-step (nothing for the erased row to collide with)",
    file: KYC,
    suite: "erasure",
    from: `      idFingerprint: fingerprint,`,
    to: `      idFingerprint: null,`,
  },
  {
    // 🔴 THE OBVIOUS IMPLEMENTATION, AND THE ONE THE DECISION EXISTS TO FORBID: null the
    // number. Reads as the cleanest possible erasure and repeals a P0 AML control.
    name: "null-the-national-id (the trap the owner decision was written to forbid)",
    file: ERASURE,
    suite: "erasure",
    from: `      patch.idNumber = fp;`,
    to: `      patch.idNumber = null;`,
  },
  {
    // Reading the NEWEST submission — which is what every other caller in the platform
    // does. A resubmission after a rejection is the ordinary case, so this leaves the
    // national ID, the full name and the date of birth on the earlier row.
    name: "erase-only-the-newest-submission (the rejected first attempt keeps everything)",
    file: ERASURE,
    suite: "erasure",
    from: `  const submissions = await db.kyc.listByUser(userId);`,
    to: `  const submissions = [await db.kyc.findByUserId(userId)].filter(Boolean) as Awaited<ReturnType<typeof db.kyc.listByUser>>;`,
  },
  {
    // The status guard removed. One mis-typed id then destroys a paying player's sign-in.
    name: "no-CLOSED-guard (a live account can be erased by mistake)",
    file: ERASURE,
    suite: "erasure",
    from: `  if (user.status !== "CLOSED") {`,
    to: `  if (false) {`,
  },
  {
    // 🔴 The 7-year hold removed — a passport scan destroyed in year 1, against POCA Cap 423
    // §16 and against the platform's own published schedule. Irreversible.
    name: "no-statutory-hold (a CDD document destroyed in year one)",
    file: ERASURE,
    suite: "erasure",
    from: `  const documentsReleased = now >= Date.parse(releaseAt);`,
    to: `  const documentsReleased = true;`,
  },
  {
    // ⛔ THE FAILURE MODE storage.ts WAS WRITTEN TO PREVENT, in its own words: "the record
    // says erased, the data is not". Delete the row whatever the object delete returned, and
    // the only pointer to a live national-ID scan is gone with nothing able to retry.
    name: "delete-the-row-even-when-the-object-survived (record says erased, data is not)",
    file: ERASURE,
    suite: "erasure",
    from: `        else { counts.documentObjectsFailed++; survivors.push(doc); }`,
    to: `        else { counts.documentObjectsFailed++; }`,
  },
  {
    // The officer's own sentence left behind — "Proof of address for Asha Mwangi" — inside a
    // JSON column, on a row whose name column was carefully pseudonymised. §8's sweep found
    // this on the real implementation; no hand-written checklist had it.
    name: "officer-request-description-not-redacted (the player's name inside a JSON column)",
    file: ERASURE,
    suite: "erasure",
    from: `      patch.extraRequests = described.map((e) => ({ ...e, description: ERASED_REQUEST_DESCRIPTION }));`,
    to: `      patch.extraRequests = described;`,
  },
  {
    // The frozen author mask left in the thread. With no display name that value IS the last
    // three digits of the phone number, written months before the tombstone.
    name: "comment-author-mask-left-frozen (the phone's last three digits stay public)",
    file: COMMENTS,
    suite: "erasure",
    from: `    c.authorName = opts.authorName;`,
    to: `    void opts.authorName;`,
  },
  {
    // The body kept. 500 characters of free text nobody vetted, which routinely contains the
    // writer's own name.
    name: "comment-body-kept (unvetted free text survives erasure)",
    file: COMMENTS,
    suite: "erasure",
    from: `    c.body = opts.body;`,
    to: `    void opts.body;`,
  },
  {
    // Somebody else's notification never touched — the surface `deleteAllForUser` cannot
    // reach, because the row belongs to the referrer.
    name: "referrer-notification-never-redacted (the mask survives in a row erasure does not own)",
    file: ERASURE,
    suite: "erasure",
    from: `    counts.notificationsRedacted += await db.notification.redactFragment(mask, ERASED_AUTHOR_NAME);`,
    to: `    void mask;`,
  },
  {
    // `dismissAll` instead of a delete — a `dismissedAt` hides a row whose body still says
    // what the player bet and won. The plausible mistake, because the method already existed.
    name: "notifications-dismissed-not-deleted (hidden is not erased)",
    file: ERASURE,
    suite: "erasure",
    from: `  counts.notificationsDeleted = await db.notification.deleteAllForUser(userId);`,
    to: `  counts.notificationsDeleted = await db.notification.dismissAll(userId);`,
  },
  {
    // Marketing consent left `true` — an erased account still reads as marketable.
    name: "marketing-consent-left-true (an erased account still reads as consenting)",
    file: ERASURE,
    suite: "erasure",
    from: `      marketingOptIn: false,`,
    to: `      marketingOptIn: true,`,
  },
  {
    // 🔴 THE ERASED NUMBER WRITTEN INTO THE ONE TABLE THAT CANNOT BE PRUNED. An audit
    // payload naming the phone makes the append-only chain the last place it survives — for
    // seven years, by design.
    name: "audit-payload-carries-the-erased-phone (the chain becomes the leak)",
    file: ERASURE,
    suite: "erasure",
    from: `      alreadyErased: wasErased,
      documentsReleased,
      documentsHeldUntil: documentsReleased ? null : releaseAt.slice(0, 10),
      holdYears: KYC_DOCUMENT_HOLD_YEARS,`,
    to: `      alreadyErased: wasErased,
      documentsReleased,
      documentsHeldUntil: documentsReleased ? null : releaseAt.slice(0, 10),
      holdYears: KYC_DOCUMENT_HOLD_YEARS,
      erasedPhone: user.phoneE164,`,
  },
  {
    // ⭐ THE MONEY. Not a plausible mistake — a deliberate proof that §4's byte-identical
    // assertions are capable of failing at all. A suite that cannot notice a wallet being
    // emptied is not guarding the money.
    name: "money-touched (proves §4's byte-identical assertions can fail)",
    file: ERASURE,
    suite: "erasure",
    from: `  await removeTotp(userId);`,
    to: `  await removeTotp(userId);
  { const w = await db.wallet.findByUserId(userId); if (w) await db.wallet.update(w.id, { balance: 0 }); }`,
  },
  {
    // The in-memory twin of the fingerprint read, gutted. `tsc` cannot catch a missing
    // in-memory half, and a Prisma-only method throws in every unit test — so this is the
    // shape of a DAL half that silently stops answering.
    name: "in-memory-fingerprint-read-always-misses (the DAL half tsc cannot check)",
    file: STORE,
    suite: "erasure",
    from: `        if ((k.idFingerprint ?? "") !== fp) continue;`,
    to: `        if (true) continue;`,
  },
];
