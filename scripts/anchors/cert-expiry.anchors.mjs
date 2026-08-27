/**
 * Mutation anchors for `red:cert-expiry` — E-227, the origin-certificate watch.
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` §3 re-resolves every anchor below on
 * every run WITHOUT executing the harness, so an anchor that rots against edited source is caught
 * statically in under a second instead of being discovered as a phantom catch.
 *
 * ── ⭐ ONLY ONE MUTATION LIVES HERE, AND THE REASON IS THE POINT ───────────────────────────
 * Two of this guard's three failure modes are drivable from the OUTSIDE, with no source edit at
 * all — `CERT_MIN_DAYS=60` for the expiry assertion and `CERT_ORIGIN_HOST=www.50pick.tz` for the
 * positive control. That is deliberate design, not a gap: §[F] of `pre-deploy-live-check.mjs`
 * hard-coded `daysLeft > 21`, so its own documented RED proof required EDITING THE FILE, and a
 * proof that needs an edit is one nobody runs. `red:cert-expiry` drives those two by env.
 *
 * The THIRD failure mode cannot be reached from outside, because it is the absence of coverage
 * rather than a wrong answer: if `ORIGIN_OF` loses a host, the script cheerfully checks whatever
 * remains and exits 0. That is the "guard whose POPULATION is blind" shape — the same class of
 * defect that produced E-227 in the first place — so it needs a real source mutation, and it is
 * the one declared below.
 */
const WATCH = "scripts/cert-expiry-watch.mjs";

export const MUTATIONS = [
  {
    name: "the-population-loses-a-host",
    why: "⭐ THE SHAPE THAT PRODUCED E-227 ITSELF — coverage silently shrinks and the guard stays "
       + "green. One host is dropped from ORIGIN_OF, so the watch checks the apex and never dials "
       + "`www` at all. Every remaining assertion PASSES: the certificate it did read is healthy, "
       + "the control it did run is correct, and the run exits 0 having covered half the surface "
       + "it claims. ⛔ §[F] had exactly this defect in a worse form — it selected ONE origin by "
       + "`new URL(BASE).hostname`, so a single run could structurally never cover both hosts, "
       + "and four documents called it a gate anyway.",
    file: WATCH,
    from: `  "www.50pick.tz": "3hwa21jh.up.railway.app",
  "50pick.tz": "ggze9tup.up.railway.app",`,
    to: `  "50pick.tz": "ggze9tup.up.railway.app",`,
    check: "both origin hosts were checked",
  },
];
