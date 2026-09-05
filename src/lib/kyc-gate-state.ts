/**
 * `KycStatus` → the identity gate's own vocabulary. Pure, and deliberately NOT in a
 * `"use client"` file.
 *
 * 🔴 IT LIVED IN `kyc-gate-panel.tsx` FOR ONE COMMIT AND THAT WAS A SITE-WIDE OUTAGE.
 * That file is `"use client"`, so exporting a plain function from it makes the function a
 * client reference. Every caller here is a SERVER component — `AppShell`, the deposit and
 * withdraw pages, the market and Up & Down pages — and calling it from the server throws:
 *
 *     Attempted to call kycGateState() from the server but kycGateState is on the client.
 *
 * ⛔ `AppShell` renders on EVERY page, so the blast radius was the whole site, not the
 * money screens. ⚠️ AND NEITHER `tsc` NOR `next build` SAW IT: the boundary is a runtime
 * contract, and both were clean. It surfaced the first time a browser actually loaded a
 * page — `qa:kyc-gate`, on the run that was meant to check button sizes.
 *
 * ⛔ Do not move this back beside the component "to keep them together". The component may
 * import from here; nothing server-side may import from the component.
 */

/** Which of the four identity states the player is in, in the panel's own vocabulary. */
export type KycGateState = "not_started" | "pending_review" | "more_info" | "rejected";

/**
 * Map the server's `KycStatus` onto the panel's vocabulary.
 *
 * ⛔ `APPROVED` RETURNS `null`, AND CALLERS MUST BRANCH ON THAT rather than defaulting to a
 * panel. An approved player seeing any gate at all is the worst failure this has — it
 * withholds a control they are entitled to, on a money screen.
 * ⚠️ A MISSING ROW IS `not_started`, matching `assertKycForMoney`. If these two ever
 * disagree, the screen and the server tell different stories about the same account.
 */
export function kycGateState(status: string | null | undefined): KycGateState | null {
  switch (status) {
    case "APPROVED": return null;
    case "PENDING_REVIEW": return "pending_review";
    case "ADDITIONAL_INFO_REQUIRED": return "more_info";
    case "REJECTED": return "rejected";
    default: return "not_started"; // NOT_STARTED, IN_PROGRESS, and no row at all
  }
}
