// Shared disk plants for the admin form behavior proof and test:red-anchors.
// The red runner imports these exact anchors, so the audit certifies what it injects.
export const MUTATIONS = [
  {
    name: "blank reference",
    file: "src/lib/maswali-admin-form-validation.ts",
    from: "ref.length >= 5 && ref.length <= 120",
    to: "ref.length >= 0 && ref.length <= 120",
    failure: /blank rail reference cannot open a money confirmation/,
  },
  {
    name: "fund-button gate",
    file: "src/app/admin/maswali/pools/pools-controls.tsx",
    from: 'disabled={pending || !ready} onClick={() => setMode("fund")}',
    to: 'disabled={pending} onClick={() => setMode("fund")}',
    failure: /Pay in must stay disabled until both the amount and rail reference are valid/,
  },
  {
    name: "share-decision gate",
    file: "src/app/admin/maswali/integrity/integrity-controls.tsx",
    from: "if (!validShareDecision(reason)) { setTried(true); return; }",
    to: "if (false) { setTried(true); return; }",
    failure: /Hold must refuse a blank decision inside the confirmation/,
  },
  {
    name: "hold-alert placement",
    file: "src/app/admin/maswali/integrity/integrity-controls.tsx",
    from: '{!open && error && <span role="alert"',
    to: '{error && <span role="alert"',
    failure: /Hold failure must have one visible alert inside its open confirmation/,
  },
  {
    name: "decision-alert placement",
    file: "src/app/admin/maswali/integrity/integrity-controls.tsx",
    from: '{mode === null && error && <span role="alert"',
    to: '{error && <span role="alert"',
    failure: /Release or forfeit failure must have one visible alert inside its open confirmation/,
  },
];
