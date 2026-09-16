/**
 * red:otp-delivery — proves `test:otp-delivery` catches each defect that made the OTP path
 * unsafe to use as a login path, each on its OWN named assertion.
 *
 * ⭐ THE FIRST TWO MUTATIONS ARE NOT INVENTED. They restore the code as it actually stood
 * before this branch — `sms.send(...).catch(() => audit(...))`, and the awaited-but-swallowed
 * variant that a careless "fix" would produce. If this suite cannot tell either of those from
 * the current code, then flipping `OTP_ENABLED=1` is unguarded.
 *
 * Mechanics in `red-in-place.mjs`; mutations are DATA in `scripts/anchors/otp-delivery.anchors.mjs`.
 *
 * Run: npm run red:otp-delivery
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInPlaceRed } from "./red-in-place.mjs";
import { MUTATIONS } from "./anchors/otp-delivery.anchors.mjs";

process.exit(
  runInPlaceRed({
    root: join(dirname(fileURLToPath(import.meta.url)), ".."),
    gate: "scripts/otp-delivery.test.mts",
    mutations: MUTATIONS,
    label: "red:otp-delivery",
  }),
);
