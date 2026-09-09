/**
 * MUTATIONS for `npm run red:lipa-qr` — the RED proof of `npm run test:lipa-qr`.
 *
 * ⛔ WHY THIS FILE EXISTS, AND WHY IT IS THE ONE THAT MATTERED MOST. `test:red-anchors` §4 is an
 * equality ratchet on how many red harnesses do NOT declare their anchors, and raising it is the
 * one edit that file forbids. This harness is the reason the ratchet was broken and nobody knew:
 * it merged on 2026-09-08 from a parallel session on the same day as `red:route-census`, and
 * whoever raised the ceiling 65 → 66 counted only the addition they could SEE. The real count was
 * 67. §4 has been red on `main` ever since, and the note left at the constant — *"the one addition
 * is red-route-census.mjs"* — was false the moment the two branches met.
 *
 * 🎯 **A RATCHET CONSTANT BUMPED BY ONE SESSION IS WRONG AS SOON AS A SECOND SESSION MERGES ITS
 * OWN ADDITION.** Neither session can see the other's at bump time. That is the argument for the
 * rule the constant already states: the count comes DOWN to meet the ceiling, never the reverse.
 *
 * ── TWO KINDS OF MUTATION LIVE HERE, AND THE SECOND IS WHY `resolvePath` EXISTS ────────────────
 *
 * Six cases are ordinary exact-string anchors (`file` + `from`/`to`), audited by `resolveAnchor`.
 * Two are not: they rewrite a BINARY ASSET on the copied tree, because the defect they restore is
 * in an image rather than in text. Those declare `kind: "path"` and are audited by `resolvePath`.
 *
 * ⛔ AND THAT AUDIT IS NOT CEREMONY. Both find their subject with
 * `readdirSync(dir).find(/^selcom-lipa-qr\./)` and RETURN A STRING when it finds nothing — they do
 * not throw. Rename or reissue the QR and those two cases quietly stop planting their defects
 * while the harness keeps running and keeps printing a tally. `presence: "present"` is what turns
 * that silence into a failing assertion.
 *
 * ⚠️ `QR_ASSET` PINS THE HASHED FILENAME ON PURPOSE. It is the same string
 * `src/lib/server/lipa-config.ts` pins as `qrAssetPath`, and the hash is content-derived: if the
 * QR is ever reissued, BOTH must change, and this audit going red is the intended way to find
 * that out. ⛔ Do not soften it to the directory to make it survive a reissue — surviving a
 * reissue is precisely the behaviour that would make it worthless.
 *
 * ⛔ THE MUTATIONS RUN AGAINST A COPY, NEVER THIS CHECKOUT (two sessions share it). The `path`
 * below is repo-relative because the AUDITOR reads the real tree; the `mutate` functions receive
 * the copy's root and join against that.
 */
import { readdirSync, renameSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * The shipped QR, pinned by content hash — the same string `lipa-config.ts` carries as
 * `qrAssetPath`.
 *
 * ⚠️ THIS IS A MAINTENANCE POINT, BY DESIGN. The filename is a hash of the payload
 * (`docs/LIPA-QR.md` §4a), so it CHANGES whenever the QR is reissued, and
 * `scripts/extract-lipa-qr.mjs` is what regenerates it. When that happens this constant, the pin
 * in `lipa-config.ts` and the asset on disk all move together — and `test:red-anchors` going red
 * here is the intended way to be told.
 *
 * ⛔ NOTHING INSIDE A `mutate()` CLOSURE MAY READ THIS. The closures find the asset with
 * `readdirSync(dir).find(...)` against the COPIED tree, and they must keep doing so: a closure
 * that trusted this constant instead of the disk would go back to failing silently on a reissue,
 * which is the exact rot `presence: "present"` was added to make loud.
 */
const QR_ASSET = "public/pay/selcom-lipa-qr.d997c1d2.svg";

export const MUTATIONS = [
  {
    name: "the shipped artwork is a DIFFERENT QR",
    kind: "path",
    presence: "present",
    path: QR_ASSET,
    why: "the exact failure a swapped or re-exported poster produces: it still renders, still scans, and pays someone else",
    check: "1.3 the decoded payload is byte-identical",
    async mutate(root) {
      // ⭐ A VALID, SCANNABLE, DIFFERENT QR — not a corrupted file. Corrupting the bytes
      // would only prove "the guard notices an unopenable image", which is the easy half.
      // The failure that actually costs money is a perfectly good QR belonging to someone
      // else, so that is what gets planted: same filename, same everything, different
      // merchant. Anything less and §1.3 has not really been exercised.
      const dir = join(root, "public", "pay");
      const f = readdirSync(dir).find((n) => /^selcom-lipa-qr\./.test(n));
      if (!f) return "no QR asset in the copied tree";
      const QRCode = require("qrcode");
      await QRCode.toFile(join(dir, f), "00020101021130160012tz.co.selcom0208999999995204599953038345802TZ5910NOT US LTD6013DAR ES SALAAM6304FFFF", {
        type: "png", width: 760, margin: 4, errorCorrectionLevel: "H",
      });
      return null;
    },
  },
  {
    name: "the pinned payload is edited by one character",
    why: "a hand-edited config value is how the pin stops describing the image it is meant to police",
    check: "1.3 the decoded payload is byte-identical",
    file: "src/lib/server/lipa-config.ts",
    from: '"000201010211041552545429990002026390014tz.go.bot.tips',
    to: '"000201010211041552545429990002026390014tz.go.bot.TIPS',
  },
  {
    name: "the asset filename loses its content hash",
    kind: "path",
    presence: "present",
    path: QR_ASSET,
    why: "the cache-first service worker then pins a REISSUED QR in every returning player's browser",
    check: "1.6 the filename's hash matches the payload",
    // ⛔ THIS CASE WAS BROKEN BY THE SVG MIGRATION AND SCORED ITSELF 10/10 ANYWAY. It used to
    // rename the asset to `selcom-lipa-qr.png` and rewrite the config with a regex ending
    // `\.png`. Once the artwork became a vector the config held `.svg`, so the rewrite matched
    // NOTHING: the config kept pointing at the hashed path, the renamed file was simply gone,
    // and the gate failed on 1.1/1.2/1.3 while the targeted 1.6 — which reads the CONFIG STRING,
    // never the file on disk — still passed. Recorded as `9/10 · WRONG CHECK` only because the
    // scorer demands the NAMED check; a harness that merely counted a non-zero exit would have
    // reported this as caught forever.
    //
    // ⭐ SO THE MUTATION REMOVES THE HASH AND NOTHING ELSE. The extension comes from the file
    // that is actually there, so the asset stays findable (1.1), decodable (1.2) and byte-identical
    // to the pin (1.3) — leaving 1.6 as the ONLY check that can fail. A mutation that strands the
    // asset proves the gate notices a missing file, which is not what 1.6 is for.
    mutate(root) {
      const dir = join(root, "public", "pay");
      const f = readdirSync(dir).find((n) => /^selcom-lipa-qr\./.test(n));
      if (!f) return "no QR asset in the copied tree";
      // Extension taken from disk, never hard-coded — that hard-coding is what rotted last time.
      const parts = /^selcom-lipa-qr\.[0-9a-f]{8}(\.[A-Za-z0-9]+)$/.exec(f);
      if (!parts) return `the asset is not content-hashed to begin with (${f}) — there is no hash to remove`;
      const ext = parts[1];
      const dehashed = `selcom-lipa-qr${ext}`;
      renameSync(join(dir, f), join(dir, dehashed));
      const p = join(root, "src", "lib", "server", "lipa-config.ts");
      const before = readFileSync(p, "utf8");
      const after = before.replace(
        new RegExp(`/pay/selcom-lipa-qr\\.[0-9a-f]{8}\\${ext}`),
        `/pay/${dehashed}`,
      );
      // ⭐ The silent no-op is the whole defect above, so it is now LOUD. The text-anchor path
      // already refuses a mutation that leaves the file identical; a `mutate` that rewrites a
      // file owes the same proof.
      if (after === before) return `the config still points at a hashed ${ext} path — nothing was de-hashed`;
      writeFileSync(p, after, "utf8");
      return null;
    },
  },
  {
    name: "the safety rule always says yes",
    why: "the QR would render beside ANY destination account — a code paying 7006 3747 under words naming a different account",
    check: "2.2 hides when the destination is a DIFFERENT account",
    file: "src/lib/lipa.ts",
    from: "  return a.length > 0 && l.length > 0 && a === l;",
    to: "  return true;",
  },
  {
    name: "the safety rule degrades to a substring match",
    why: "the subtle version of the same defect — 170063747 and 700637470 are different accounts that both 'contain' the number",
    check: "2.7 a number that merely CONTAINS the Lipa number does not match",
    file: "src/lib/lipa.ts",
    from: "  return a.length > 0 && l.length > 0 && a === l;",
    to: "  return a.length > 0 && l.length > 0 && a.includes(l);",
  },
  {
    name: "the operator switch is ignored",
    why: "an operator turning the QR off would be told it is off while applicants keep seeing it",
    check: "2.3 hides when the operator switch is off",
    file: "src/lib/lipa.ts",
    from: "  if (!lipa || !lipa.enabled) return false;",
    to: "  if (!lipa) return false;",
  },
  {
    name: "an empty destination counts as agreement",
    why: "an unset fee destination would show a QR anyway — absence read as consent",
    check: "2.4 hides when the destination is empty",
    file: "src/lib/lipa.ts",
    from: "  return a.length > 0 && l.length > 0 && a === l;",
    to: "  return l.length > 0 && a === l || a.length === 0;",
  },
  {
    name: "the static QR is wired onto the deposit page",
    why: "⛔ THE MONEY DEFECT THIS WHOLE GUARD EXISTS FOR: the player pays, the company receives, no wallet moves, nothing goes red",
    check: "4.4 no wallet surface renders the static QR",
    file: "src/app/wallet/deposit/page.tsx",
    from: 'import { PageContainer } from "@/components/layout/page-container";',
    to: 'import { PageContainer } from "@/components/layout/page-container";\nimport { LipaQrPanel } from "@/components/pay/lipa-qr-panel";',
  },
  {
    name: "the config accepts a Lipa number that is not digits",
    why: "a validator that waves anything through lets an operator store a number no wallet app can dial — and one that never equals the fee destination, so the QR silently vanishes",
    check: "3.1 rejects a non-numeric Lipa number",
    file: "src/lib/server/lipa-config.ts",
    // ⚠️ The DIGITS-ONLY rule, not the length rule. An earlier version of this mutation
    // disabled the length check and was scored WRONG CHECK — correctly: it proved 3.2,
    // not 3.1. The harness catching its own mis-aimed anchor is the behaviour that makes
    // its verdicts worth reading.
    from: "  if (digits !== c.lipaNumber)",
    to: "  if (false)",
  },
  {
    name: "the config accepts an asset path outside /pay/",
    why: "the QR could then be pointed at any image in the deployment, including an uploaded one",
    check: "3.5 rejects an asset path outside /pay/",
    file: "src/lib/server/lipa-config.ts",
    from: '  if (!/^\\/pay\\/[A-Za-z0-9._-]+\\.svg$/.test(c.qrAssetPath))',
    to: "  if (false)",
  },
];

