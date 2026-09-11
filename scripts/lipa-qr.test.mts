/**
 * LIPA QR GUARD — the shipped QR still pays who we say it pays.
 *
 * ── WHAT MAKES THIS GUARD NON-VACUOUS ────────────────────────────────────────
 * The question worth asking of any check is *"would it still pass if the feature
 * were absent or broken?"* — so this one deliberately does NOT assert that a file
 * exists, that a component is imported, or that a config key is set. All three of
 * those pass while the QR on the page sends money to a stranger.
 *
 * It DECODES the shipped image and compares the payload it actually carries,
 * byte-for-byte, against the string pinned in `lipa-config.ts`. Swap the artwork,
 * re-crop it, run it through an optimiser, or point the config at a different file,
 * and §1 fails. It also re-derives the EMVCo CRC, so a payload that decodes but is
 * corrupt is caught rather than trusted.
 *
 * §2 pins the safety rule that keeps the QR from contradicting the words beside it,
 * including the case that was live in the tree when this was written (the agent fee
 * destination was `0769777877` while the QR pays `70063747`).
 *
 * §4 is the money rule as a test: this panel may appear ONLY on surfaces where a
 * human reconciles the payment. A static QR on a self-service top-up takes a
 * player's money and credits no wallet, silently. That is a rule prose cannot
 * enforce and a reviewer will not catch in a year's time, so it is enforced here.
 *
 * Run: npm run test:lipa-qr    Red control: npm run red:lipa-qr
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { DEFAULT_LIPA_CONFIG } from "../src/lib/server/lipa-config.ts";
import { LIPA_QR_RELEASED, formatLipaNumber, lipaQrIsSafeFor, lipaQrWouldShow, normalizeLipaNumber, shouldShowLipaQr } from "../src/lib/lipa.ts";
// ⛔ The SHARED comment scanner — see §4.3. A private stripper would trip `test:decomment`'s
// ratchet on exactly the grounds that make the shared one correct.
import { decomment } from "./lib/decomment.mts";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const jsQRmod = require("jsqr");
const jsQR = jsQRmod.default ?? jsQRmod;

const ROOT = path.resolve(import.meta.dirname, "..");

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("Lipa QR guard\n");

/**
 * ⭐ PROVENANCE, PRINTED. `red:lipa-qr` mutates a COPY of the tree and runs this gate
 * from it; "the gate exited non-zero" is not evidence that it read the mutant. Worse,
 * a gate can sit in the mutant tree while resolving the ORIGINAL modules — the trap
 * `ai-cycles-red.mjs` records as lesson ②. So the gate states which tree it read and
 * where each module under test actually resolved, and the harness refuses to score a
 * run whose paths point outside the tree it mutated.
 */
log(`root: ${ROOT}`);
for (const spec of ["../src/lib/server/lipa-config.ts", "../src/lib/lipa.ts"]) {
  log(`module: ${decodeURIComponent(new URL(spec, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))}`);
}
log("");

const cfg = DEFAULT_LIPA_CONFIG;

// ── §1 THE ARTWORK ────────────────────────────────────────────────────────────
log("§1 the artwork actually decodes to the payload we pinned");

const assetAbs = path.join(ROOT, "public", cfg.qrAssetPath.replace(/^\/+/, ""));
const assetExists = fs.existsSync(assetAbs);
check("1.1 the configured asset is on disk", assetExists, assetExists ? "" : cfg.qrAssetPath);

let decoded: string | null = null;
if (assetExists) {
  // ⚠️ WRAPPED, BECAUSE AN UNREADABLE ASSET IS A RESULT, NOT AN ACCIDENT. A truncated or
  // corrupt PNG makes sharp throw, and an uncaught throw here would abort the whole gate
  // — no FAIL line, just a stack trace, which reads to CI as "the guard is broken" rather
  // than "the artwork is broken". The failure mode this guard exists for must come out as
  // a named failure.
  try {
    // Decode the file as shipped. Two passes: jsQR's own `inversionAttempts` does not
    // rescue this symbol (the centre logo shifts its binarisation) and the code is only
    // found when the pixels are inverted before jsQR sees them. Dropping the second pass
    // would make this guard report "not a QR" for a QR every phone reads.
    // `density` + an explicit raster size matter: the asset is a VECTOR symbol, and
    // sharp would otherwise rasterise it at its nominal size, which is small enough to
    // reintroduce the very aliasing the SVG exists to avoid.
    const { data, info } = await sharp(assetAbs, { density: 300 })
      .resize(900, 900, { fit: "contain", background: "#ffffff" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = info.width * info.height;
    const rgba = Buffer.alloc(px * 4);
    for (let i = 0; i < px; i++) {
      const r = data[i * info.channels];
      const g = info.channels > 1 ? data[i * info.channels + 1] : r;
      const b = info.channels > 2 ? data[i * info.channels + 2] : r;
      rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = 255;
    }
    for (const invert of [false, true]) {
      const view = invert ? Buffer.from(rgba.map((v, i) => (i % 4 === 3 ? v : 255 - v))) : rgba;
      const code = jsQR(new Uint8ClampedArray(view), info.width, info.height, { inversionAttempts: "attemptBoth" });
      if (code?.data) { decoded = code.data; break; }
    }
  } catch (err) {
    log(`  note: the asset could not be read as an image — ${(err as Error).message.slice(0, 100)}`);
  }
}

check("1.2 it decodes as a QR code", decoded !== null, decoded === null ? "no symbol found in the shipped image" : "");
check(
  "1.3 the decoded payload is byte-identical to the pinned qrPayload",
  decoded === cfg.qrPayload,
  decoded === null ? "nothing decoded" : decoded === cfg.qrPayload ? "" : `image says ${JSON.stringify(decoded.slice(0, 48))}… , config says ${JSON.stringify(cfg.qrPayload.slice(0, 48))}…`,
);

/** EMVCo CRC-16/CCITT-FALSE over everything up to and including the "6304" tag. */
function emvCrc(body: string): string {
  let crc = 0xffff;
  for (let i = 0; i < body.length; i++) {
    crc ^= body.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
const crcOk = cfg.qrPayload.length > 8 && emvCrc(cfg.qrPayload.slice(0, -4)) === cfg.qrPayload.slice(-4);
check("1.4 the payload's EMVCo CRC-16 re-derives", crcOk, crcOk ? "" : `stated ${cfg.qrPayload.slice(-4)}, computed ${emvCrc(cfg.qrPayload.slice(0, -4))}`);

const namesNumber = cfg.qrPayload.includes(normalizeLipaNumber(cfg.lipaNumber));
check("1.5 the payload names the configured Lipa number", namesNumber, namesNumber ? "" : `payload does not contain ${cfg.lipaNumber}`);

// ⭐ The cache-busting property, asserted rather than trusted. `public/sw.js` serves
// every .png cache-first until CACHE_NAME is bumped; a QR reissued at the SAME path
// would leave returning players scanning the old merchant indefinitely. The filename
// is a hash of the payload precisely so that cannot happen — this proves it still is.
const wantHash = crypto.createHash("sha256").update(cfg.qrPayload, "utf8").digest("hex").slice(0, 8);
const gotHash = /selcom-lipa-qr\.([0-9a-f]{8})\.svg$/.exec(cfg.qrAssetPath)?.[1] ?? null;
check(
  "1.6 the filename's hash matches the payload (so a reissued QR gets a new URL)",
  gotHash === wantHash,
  gotHash === null ? `asset path is not content-hashed: ${cfg.qrAssetPath}` : gotHash === wantHash ? "" : `filename says ${gotHash}, payload hashes to ${wantHash}`,
);

// Exactly one QR asset in the tree — a superseded stray is something a future edit
// could point the config back at.
const strays = fs.readdirSync(path.join(ROOT, "public", "pay")).filter((f) => /^selcom-lipa-qr\./.test(f));
check("1.7 exactly one Lipa QR asset exists", strays.length === 1, strays.length === 1 ? "" : `found ${strays.length}: ${strays.join(", ")}`);

// ── §2 THE SAFETY RULE ────────────────────────────────────────────────────────
log("\n§2 the QR cannot contradict the account named beside it");

const display = { enabled: true, merchantName: cfg.merchantName, lipaNumber: cfg.lipaNumber, ussdCode: cfg.ussdCode, qrAssetPath: cfg.qrAssetPath };

// ⛔ 2.1–2.5 assert the RULE, via `lipaQrWouldShow`, deliberately bypassing the release
// gate. While the QR is withheld every `shouldShowLipaQr` "hides when …" assertion is
// true by construction — it would hold with the safety rule DELETED. Testing the rule
// through the gate would therefore have retired five guards the moment the QR went off,
// silently, and handed them back broken on the day it came back on. §2b tests the gate.
check("2.1 shows when the destination IS the Lipa number", lipaQrWouldShow(display, cfg.lipaNumber));
check("2.2 hides when the destination is a DIFFERENT account", !lipaQrWouldShow(display, "0769777877"));
check("2.3 hides when the operator switch is off", !lipaQrWouldShow({ ...display, enabled: false }, cfg.lipaNumber));
check("2.4 hides when the destination is empty (absence is not agreement)", !lipaQrWouldShow(display, ""));
check("2.5 hides when there is no asset", !lipaQrWouldShow({ ...display, qrAssetPath: "" }, cfg.lipaNumber));
// An operator typing the number off the poster gets the spaces. That must still match,
// or the QR silently disappears for a setting that is correct in every way that matters.
check("2.6 a spaced or dashed form of the same number still matches", lipaQrIsSafeFor("7006 3747", cfg.lipaNumber) && lipaQrIsSafeFor("7006-3747", cfg.lipaNumber));
check("2.7 a number that merely CONTAINS the Lipa number does not match", !lipaQrIsSafeFor("170063747", cfg.lipaNumber) && !lipaQrIsSafeFor("700637470", cfg.lipaNumber));
check("2.8 the display form groups as the poster prints it", formatLipaNumber(cfg.lipaNumber) === "7006 3747", formatLipaNumber(cfg.lipaNumber));

// ── §2b THE RELEASE GATE ──────────────────────────────────────────────────────
// ⛔ THE MONEY RULE WHILE THE QR IS WITHHELD. A Lipa payment carries no reference on
// any network, so it cannot be attributed to a payer by the system (§3c/§3d). Until
// Selcom confirms a verifiable per-order QR, NOTHING may render the affordance — and
// "nothing" has to mean the matching, fully-configured, operator-enabled case too,
// because that is the only one that would otherwise show.
log("\n§2b the release gate withholds the QR everywhere, whatever the config says");

check("2b.1 ⛔ the release gate is OFF — the QR is withheld", LIPA_QR_RELEASED === false, `LIPA_QR_RELEASED=${String(LIPA_QR_RELEASED)}`);
check(
  "2b.2 ⛔ the PERFECT config — matching account, switch on, asset present — still renders NOTHING",
  !shouldShowLipaQr(display, cfg.lipaNumber),
);
// ⭐ DISCRIMINATION. 2b.2 alone would pass if the rule merely happened to reject this
// config, so prove the rule WOULD have shown it and that the gate is what refuses.
check(
  "2b.3 ⭐ …and the rule itself WOULD have shown it, so it is the GATE refusing, not a broken config",
  lipaQrWouldShow(display, cfg.lipaNumber) && !shouldShowLipaQr(display, cfg.lipaNumber),
);
// Every other shape stays refused too — no path around the gate.
check(
  "2b.4 no config shape reaches the screen while withheld",
  [cfg.lipaNumber, "0769777877", "", "7006 3747", "170063747"].every((a) => !shouldShowLipaQr(display, a)) &&
    !shouldShowLipaQr({ ...display, enabled: false }, cfg.lipaNumber) &&
    !shouldShowLipaQr({ ...display, qrAssetPath: "" }, cfg.lipaNumber),
);

// ── §3 THE CONFIG DEFENDS ITSELF ──────────────────────────────────────────────
log("\n§3 the config refuses values that would break the affordance");

// Re-declared here rather than exported: the point is to prove the SHIPPED validator
// refuses these, and importing a private function to test it would test the copy.
// `setLipaConfig` is the only writer, so we exercise it through its own result type.
const { setLipaConfig, getLipaConfig } = await import("../src/lib/server/lipa-config.ts");
const before = getLipaConfig();
const rejects = (label: string, patch: Record<string, unknown>) => {
  const r = setLipaConfig(patch as never, "guard");
  check(label, !r.ok, r.ok ? "it was ACCEPTED" : "");
  if (r.ok) setLipaConfig(before, "guard"); // put it back if the guard failed
};
rejects("3.1 rejects a non-numeric Lipa number", { lipaNumber: "70063747A" });
rejects("3.2 rejects a too-short Lipa number", { lipaNumber: "700" });
rejects("3.3 rejects an empty merchant name", { merchantName: "   " });
rejects("3.4 rejects a USSD code that is not one", { ussdCode: "call us" });
rejects("3.5 rejects an asset path outside /pay/", { qrAssetPath: "/uploads/evil.png" });
rejects("3.6 rejects an empty pinned payload", { qrPayload: "" });
// ⛔ §4a made structural. A raster QR is unscannable at some sizes and DPRs (moiré), so a .png
// under /pay/ — which the path rule alone would wave through — is refused by the validator and
// not merely by the prose. The path is correct here; only the extension is wrong.
rejects("3.8 rejects a RASTER asset, even at a valid /pay/ path", { qrAssetPath: "/pay/selcom-lipa-qr.d997c1d2.png" });
const roundTrip = setLipaConfig({ lipaNumber: "7006 3747" } as never, "guard");
check("3.7 a spaced Lipa number is refused rather than silently stored", !roundTrip.ok);
setLipaConfig(before, "guard");

// ── §4 THE MONEY RULE: WHERE THIS PANEL MAY APPEAR ───────────────────────────
log("\n§4 the panel appears only where a human reconciles the payment");

/**
 * ⛔ THE RULE. This QR is STATIC: no amount, no per-payment reference (EMVCo
 * point-of-initiation `11`). Our rail credits a wallet solely on the `dep_…` order id
 * we mint, and `api/webhooks/payments/route.ts` discards an unknown reference as
 * `"unknown-reference"`. So on a self-service top-up the player pays, the company
 * receives, the balance does not move, and nothing goes red. The only safe home is a
 * payment a person already reconciles by hand — today, the agent registration fee.
 *
 * Adding a surface here is a deliberate act. If you are adding `/wallet/deposit`,
 * read `src/lib/server/lipa-config.ts` first: the answer is a per-ORDER dynamic QR,
 * not this one.
 */
const ALLOWED_SURFACES = new Set([
  "src/app/agent/page.tsx",
  "src/app/agent/apply/apply-client.tsx",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mts)$/.test(e.name)) out.push(p);
  }
  return out;
}
const srcFiles = walk(path.join(ROOT, "src"));
const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join("/");

const importers = srcFiles
  .filter((f) => /\bLipaQrPanel\b/.test(fs.readFileSync(f, "utf8")))
  .map(rel)
  .filter((f) => f !== "src/components/pay/lipa-qr-panel.tsx");
const unexpected = importers.filter((f) => !ALLOWED_SURFACES.has(f));
const missing = [...ALLOWED_SURFACES].filter((f) => !importers.includes(f));

check("4.1 no surface outside the allow-list renders the QR panel", unexpected.length === 0, unexpected.join(", "));
// The other direction, so the allow-list cannot rot into a list of files that no
// longer exist while the guard reports green.
check("4.2 every allow-listed surface still renders it", missing.length === 0, missing.join(", "));

// The pinned payload is a build-time assertion. If it reaches a component it has
// reached the browser, and `lipaDisplay()`'s deliberate omission has been undone.
/**
 * ⚠️ STRIP COMMENTS FIRST, WITH THE SHARED SCANNER.
 *
 * 🔴 THIS FIRED ON A DOCBLOCK, 2026-09-11. `/agent/apply/page.tsx` gained a comment explaining
 * why the Lipa props are now gated at the SERVER component — and that explanation necessarily
 * NAMES the field it is about. The check read raw bytes, found the identifier in prose, and
 * reported a payload leak on the very file that had just been made safer.
 *
 * ⛔ A SOURCE ASSERTION HAS TO TEST CODE, NOT WRITING ABOUT CODE, or documenting a fix becomes
 * indistinguishable from not making it — and an accusation that must be waved away is how the
 * next real one gets waved away too. `scripts/lib/decomment.mts` exists for exactly this:
 * *"a guard that greps raw text matches the paragraph explaining the fix instead of the fix."*
 * ⭐ The SHARED scanner, never a private pair of regexes: `test:decomment` ratchets those,
 * because a regex pair has an ORDER and each order is its own blindness.
 */
const payloadLeaks = srcFiles
  .filter((f) => /\.tsx$/.test(f) && /qrPayload/.test(decomment(fs.readFileSync(f, "utf8"))))
  .map(rel);
check("4.3 the pinned payload never reaches a component", payloadLeaks.length === 0, payloadLeaks.join(", "));
// ⭐ CONTROL · it must still catch a REAL interpolation, or decommenting has hollowed it out.
check("4.3b CONTROL · a real interpolation is still caught after decommenting",
  /qrPayload/.test(decomment("export const X = () => <p>{cfg.qrPayload}</p>;")));
// ⭐ …and the shape that caused the false positive must NOT be caught.
check("4.3c CONTROL · …while a docblock merely NAMING the field is not",
  !/qrPayload/.test(decomment("/* dropping `qrPayload` kept it out of the browser */\nexport const Y = 1;")));

// ⛔ The deposit page is the specific surface this rule exists to protect. Named
// explicitly so the guard says WHY if someone ever wires it up.
const depositFiles = srcFiles.filter((f) => rel(f).startsWith("src/app/wallet/")).map(rel);
const depositLeaks = depositFiles.filter((f) => /\bLipaQrPanel\b|\blipaDisplay\b/.test(fs.readFileSync(path.join(ROOT, f), "utf8")));
check(
  "4.4 no wallet surface renders the static QR (it would credit no wallet)",
  depositLeaks.length === 0,
  depositLeaks.length ? `${depositLeaks.join(", ")} — a static QR on a self-service top-up takes money and credits nobody; use a per-order dynamic QR` : "",
);

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — ${cfg.merchantName} · Lipa ${formatLipaNumber(cfg.lipaNumber)} · ${strays[0] ?? "no asset"}`);
process.exit(fail === 0 ? 0 : 1);
