/**
 * THE LIPA MERCHANT IDENTITY — where money paid by QR actually goes.
 *
 * ── WHY THIS IS ITS OWN CONFIG AND NOT A FIELD ON `AgentConfig` ──────────────
 * The first surface to use it is the agent registration fee, so folding it into
 * `agent-config.ts` would have been one line shorter today. But a Lipa number is a
 * property of **the company**, not of the agent programme — the same 7006 3747
 * collects for anything Ocean Entertainment ever bills for. The moment a second
 * surface wants it (a per-order deposit QR is the obvious next one) an
 * agent-programme field would have to be read by a wallet page, and the value
 * would get copied rather than moved. DESIGN_AUTHORITY §L2: one fact, one home.
 *
 * ── ⛔ WHAT THIS CONFIG CANNOT DO ────────────────────────────────────────────
 * It cannot credit anybody. The QR it describes is **STATIC** — its EMVCo "Point
 * of Initiation Method" tag reads `11`, and it carries no amount and no
 * per-payment reference (verified by decoding the artwork itself; see
 * `scripts/extract-lipa-qr.mjs`). Our money-in rail attributes a payment solely by
 * the `dep_…` order id we mint at create-order, and
 * `api/webhooks/payments/route.ts` drops an unrecognised reference on the floor
 * with `reason: "unknown-reference"`. So a payment made through this QR reaches
 * Ocean Entertainment's Selcom account and reaches NO wallet.
 *
 * That is why the only surface allowed to show it is one where a HUMAN already
 * reconciles the payment — the agent registration fee, which is pay-out-of-band,
 * upload-the-receipt, type-its-reference, officer-verifies. ⛔ Do not put this QR
 * on `/wallet/deposit` or any other self-service top-up. A player would pay, the
 * company would receive it, their balance would not move, and nothing would go
 * red anywhere. Crediting a wallet from a static QR needs Selcom's C2B
 * `/lookup` + `/validation` + `/notification` legs and a per-player reference,
 * none of which exist here (`docs/SELCOM-API-DIGEST.md` §9.2).
 *
 * ── CHANGING IT ──────────────────────────────────────────────────────────────
 * `merchantName` / `lipaNumber` / `ussdCode` / `enabled` are operator-editable at
 * `/admin/agents` → Settings, persisted in `SystemConfig` and audited like every
 * other config. ⚠️ `qrPayload` and `qrAssetPath` are NOT operator-editable: the
 * image is a picture that moves money, and it is replaced by re-running the
 * extraction script against a new Selcom-issued poster, which re-verifies the
 * CRC and the merchant id before it will write anything.
 */
import { defineConfig } from "./define-config";
// ⚠️ RELATIVE, NOT `@/lib/lipa`. The same idiom `define-config.ts` uses for `./audit`,
// and here it is load-bearing: `red:lipa-qr` runs the guard against a COPY of the tree,
// and a `@/…` alias resolves through the tsconfig of the CWD — so the mutant would
// import the ORIGINAL module and the harness would certify a guard it never exercised.
import { normalizeLipaNumber } from "../lipa";

export const LIPA_CONFIG_KEY = "lipa.config";

export type LipaConfig = {
  /** Operator switch for the QR affordance only. Never changes where money goes. */
  enabled: boolean;
  /** Legal merchant name, as printed on the poster and registered with Selcom. */
  merchantName: string;
  /** Selcom merchant collection number ("Lipa Namba"), digits only. */
  lipaNumber: string;
  /** USSD fallback for a handset that cannot scan. */
  ussdCode: string;
  /**
   * Public path of the verified QR image. Not operator-editable — see the header.
   *
   * ⭐ THE `.d997c1d2.` IS A HASH OF `qrPayload`, NOT DECORATION. `public/sw.js`
   * serves every `.svg`/`.png` **cache-first until `CACHE_NAME` is bumped** (its own
   * comment records the mixx/halopesa marks needing exactly that). A stale logo is
   * cosmetic; a stale QR keeps a returning player paying a merchant account that
   * may no longer be ours, silently, and a tester on a fresh browser would never
   * see it. Because the name is derived from the content, a reissued QR is a new
   * URL and the stale-cache trap cannot arise — nothing to remember, nothing to bump.
   *
   * ⭐ AND IT IS AN SVG, WHICH IS A SCANNABILITY DECISION, NOT A FILE-SIZE ONE. The
   * bitmap Selcom ships is the PROVENANCE — it is what proves this payload is theirs —
   * but painted through a browser's resampler it decoded at 160px, FAILED at 176 and
   * 192, decoded at 208 and failed again at 240, with the pattern moving at a different
   * devicePixelRatio. That is moiré between the module grid and the pixel grid, not a
   * resolution floor, and it would have shipped as "some players can scan it". A vector
   * symbol has nothing to resample. `scripts/extract-lipa-qr.mjs` re-renders the
   * CRC-verified payload and refuses to write unless the SVG decodes back to it
   * byte-for-byte. ⛔ Do not swap this back to a raster.
   */
  qrAssetPath: string;
  /**
   * The exact TIPS/EMVCo payload the shipped PNG decodes to.
   *
   * ⭐ PINNED, AND THE PIN IS THE POINT. `test:lipa-qr` decodes
   * `public/pay/selcom-lipa-qr.png` and asserts it still equals this string
   * byte-for-byte. A swapped, re-cropped, re-compressed or well-meaningly
   * "optimised" image fails the build instead of quietly redirecting money. An
   * assertion that the file merely EXISTS would pass in every one of those cases.
   */
  qrPayload: string;
};

/**
 * Ocean Entertainment Limited, as extracted and verified from the Selcom poster
 * `70063747-QR-1.pdf` on 2026-09-08 (CRC-16 `50F1` valid, merchant id present,
 * point-of-initiation `11` = static, PNG round-trip decode identical).
 */
export const DEFAULT_LIPA_CONFIG: LipaConfig = {
  enabled: true,
  merchantName: "OCEAN ENTERTAINMENT LIMITED",
  lipaNumber: "70063747",
  ussdCode: "*150*50#",
  qrAssetPath: "/pay/selcom-lipa-qr.d997c1d2.svg",
  qrPayload:
    "000201010211041552545429990002026390014tz.go.bot.tips0105039980208700637475204599953038345802TZ5920OCEAN ENTERTAINMENT 6013DAR ES SALAAM610512345621203087006374781510012tz.co.selcom0131 https://selcompay.me/70063747 630450F1",
};

function validate(c: LipaConfig): { ok: true } | { ok: false; reason: string } {
  if (!c.merchantName.trim())
    return { ok: false, reason: "The merchant name cannot be empty — the payer is shown it to confirm who they are paying." };
  const digits = normalizeLipaNumber(c.lipaNumber);
  // ⛔ A Lipa number is an identifier, so anything non-numeric is a typo, not a format.
  // Bounds are wide on purpose: Selcom issues 8 digits today and we do not want a
  // guess about their future numbering to be the thing that blocks an operator.
  if (digits.length < 4 || digits.length > 20)
    return { ok: false, reason: "The Lipa number must be 4–20 digits." };
  if (digits !== c.lipaNumber)
    return { ok: false, reason: "The Lipa number must be digits only — no spaces or dashes." };
  // A USSD string a player is told to dial. Empty is allowed (some operators have
  // none); anything present must look like one rather than like prose.
  if (c.ussdCode.trim() && !/^\*[\d*#]+#$/.test(c.ussdCode.trim()))
    return { ok: false, reason: "The USSD code must look like *150*50# — start with *, end with #." };
  // ⛔ The asset is served from /public. A path that escapes it is either a mistake
  // or an attempt to point the QR at something we do not control.
  if (!/^\/pay\/[A-Za-z0-9._-]+\.(png|svg)$/.test(c.qrAssetPath))
    return { ok: false, reason: "The QR asset must be a .png or .svg under /pay/." };
  if (!c.qrPayload.trim())
    return { ok: false, reason: "The pinned QR payload cannot be empty — it is what the guard checks the image against." };
  return { ok: true };
}

const _config = defineConfig<LipaConfig>({
  key: LIPA_CONFIG_KEY,
  defaults: DEFAULT_LIPA_CONFIG,
  validate,
  audit: { action: "lipa.config.updated", targetType: "LipaConfig" },
});

export function getLipaConfig(): LipaConfig {
  return _config.get();
}

export function setLipaConfig(updates: Partial<LipaConfig>, officerId: string):
  | { ok: true; config: LipaConfig }
  | { ok: false; error: string } {
  return _config.set(updates, officerId);
}

/**
 * The client-safe subset handed to a payment surface as props.
 *
 * ⛔ Deliberately DROPS `qrPayload`. It is a build-time assertion, not something a
 * browser needs, and shipping it would invite a client to "verify" the QR against
 * a string an attacker controls the same page as.
 */
export function lipaDisplay(c: LipaConfig = getLipaConfig()) {
  return {
    enabled: c.enabled,
    merchantName: c.merchantName,
    lipaNumber: c.lipaNumber,
    ussdCode: c.ussdCode,
    qrAssetPath: c.qrAssetPath,
  };
}
