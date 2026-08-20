/**
 * THE ANCHORS `red:dsar-intake` MUTATES — declared, as DATA, importable without running.
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
 * E-33 was a wired-to-nothing action, and the two failure modes on either side of fixing it
 * are opposite: the register goes back to being unpopulable (cases 8–10, the form or the
 * button silently unmounted — `tsc` is perfectly happy either way), or it becomes populable
 * with the two rights it must refuse (cases 1–2, which open a 30-day statutory obligation for
 * work the export has already done). Cases 5–7 are the third shape: a queue that says a job
 * is finished when it is not.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string }} RedMutation */

const PRIVACY = "src/lib/server/privacy.ts";
const PLAYER = "src/app/profile/account/actions.ts";
const PAGE = "src/app/profile/account/page.tsx";
const ADMIN_PAGE = "src/app/admin/privacy/page.tsx";
const CONTROLS = "src/app/admin/privacy/dsar-controls.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    // 🔴 The narrower that narrows nothing — the shape the officer's door SHIPPED with, where
    // an unrecognised type silently became ACCESS.
    name: "type-narrower-accepts-anything (an ACCESS request from a hand-posted body)",
    file: PRIVACY,
    suite: "dsar-intake",
    from: `  return (REQUESTABLE_TYPES as readonly string[]).includes(String(raw))
    ? (String(raw) as RequestableType)
    : null;`,
    to: `  return (String(raw || "ACCESS") as RequestableType);`,
  },
  {
    // The register opened to a right that needs no request at all.
    name: "ACCESS added back to the requestable set (a 30-day clock for work already done)",
    file: PRIVACY,
    suite: "dsar-intake",
    from: `export const REQUESTABLE_TYPES = ["ERASURE", "CORRECTION"] as const;`,
    to: `export const REQUESTABLE_TYPES = ["ERASURE", "CORRECTION", "ACCESS"] as const;`,
  },
  {
    // The cap that never fires — a public form, uncapped.
    name: "no-duplicate-cap (a public form fills the compliance queue)",
    file: PRIVACY,
    suite: "dsar-intake",
    from: `  return queue.some(
    (r) => r.userId === userId && r.type === type && (r.status === "PENDING" || r.status === "PARTIAL"),
  );`,
    to: `  return false;`,
  },
  {
    // The cap widened into a blanket lock: one open correction then blocks an erasure request.
    // Plausible, and it silently denies a player a different right.
    name: "cap-ignores-the-kind (an open correction blocks an erasure request)",
    file: PRIVACY,
    suite: "dsar-intake",
    from: `    (r) => r.userId === userId && r.type === type && (r.status === "PENDING" || r.status === "PARTIAL"),`,
    to: `    (r) => r.userId === userId && (r.status === "PENDING" || r.status === "PARTIAL"),`,
  },
  {
    // ⛔ PARTIAL stops counting as open — so the seven-year reminder retires itself and a
    // second erasure request can be filed against a job already in progress.
    name: "PARTIAL-not-open (the seven-year reminder retires itself)",
    file: PRIVACY,
    suite: "dsar-intake",
    from: `    (r) => r.userId === userId && r.type === type && (r.status === "PENDING" || r.status === "PARTIAL"),
  );`,
    to: `    (r) => r.userId === userId && r.type === type && r.status === "PENDING",
  );`,
  },
  {
    // 🔴 FULFILLED while the documents are held for another seven years — the compliance
    // queue describing work it has not done, which is audit F-01's defect exactly.
    name: "held-documents-still-marked-FULFILLED (the queue lies about finished work)",
    file: PRIVACY,
    suite: "dsar-intake",
    from: `  r.status = held ? "PARTIAL" : "FULFILLED";`,
    to: `  r.status = "FULFILLED";`,
  },
  {
    // The release date not recorded — so nothing on the platform knows when the held
    // documents may be destroyed, and the PARTIAL status becomes unactionable.
    name: "release-date-not-recorded (a PARTIAL nobody can ever finish)",
    file: PRIVACY,
    suite: "dsar-intake",
    from: `  r.erasureHeldUntil = held;`,
    to: `  r.erasureHeldUntil = null;`,
  },
  {
    // A refused erasure closed anyway — the false "fulfilled" the old outright refusal
    // existed to prevent, reintroduced now that the branch does real work.
    name: "refused-erasure-closed-anyway (a false 'fulfilled' over intact data)",
    file: PRIVACY,
    suite: "dsar-intake",
    from: `      return { ok: false, error: erasure.error };`,
    to: `      erasure = { ok: true, alreadyErased: false, documentsReleased: true, documentsHeldUntil: null, counts: { kycSubmissions: 0, idNumbersHashed: 0, documentsDeleted: 0, documentObjectsFailed: 0, extraRequestsCleared: 0, comments: 0, notificationsDeleted: 0, notificationsRedacted: 0, otps: 0, pushSubscriptions: 0, watchlistEntries: 0 } };`,
  },
  {
    // The player's door casting form input instead of narrowing it.
    name: "player-door-casts-the-type (the exact hole the officer's door shipped with)",
    file: PLAYER,
    suite: "dsar-intake",
    from: `  const type = asRequestableType(formData.get("type"));`,
    to: `  const type = String(formData.get("type") ?? "ACCESS") as "ERASURE" | "CORRECTION";`,
  },
  {
    // ⛔ THE ONE THAT MATTERS MOST, because it is E-33 coming straight back and `tsc` cannot
    // see it: the action is perfect, and nothing renders its form.
    name: "player-form-unmounted (E-33 again — an action with no caller, and tsc is happy)",
    file: PAGE,
    suite: "dsar-intake",
    from: `        <FormColumn measure="field"><PrivacyRequestForm /></FormColumn>`,
    to: `        {null}`,
  },
  {
    // The same defect on the officer's side.
    name: "on-behalf-button-unmounted (the walk-in case unrecordable again)",
    file: ADMIN_PAGE,
    suite: "dsar-intake",
    from: `                        <FileDsarOnBehalfButton userId={u.id} />`,
    to: `                        {null}`,
  },
  {
    // ⚠️ The false claim restored. It is not merely untrue — for an erasure it is impossible,
    // because the routine destroys the email and phone the message would go to.
    name: "dialog-promises-a-notification-again (a message the platform cannot send)",
    file: CONTROLS,
    suite: "dsar-intake",
    from: `        title={isErasure ? "Erase this player's personal data" : "Mark DSAR fulfilled"}`,
    to: `        title={"Mark DSAR fulfilled"}`,
  },
];
