/**
 * MASWALI MILLIONEA'S WORDS IN A PUBLISHED LEGAL TEXT — PRINTED ONLY WITH THE PRODUCT (MASWALI-BUILD S5; the lead's
 * decision of 2026-10-18, under Ali's delegation).
 *
 * /legal/privacy is live, and §7's slip paragraph names Maswali Millionea. So the paragraph, and the version it moves the
 * notice to (`POLICY_PAGES.privacy.codeVersion`, printed in META's place by `policyMeta`), appear only while the server's
 * ceiling admits the product (`millioneaWordingPublished`: `millioneaCeiling()` above WITHDRAWN). Below it — production
 * today — the page is the notice that stood before, byte for byte: no paragraph, the earlier version.
 * ⛔ SERVER-RENDERED: below the ceiling the children are never rendered, so no word of them reaches the page's HTML or
 *    its payload — this is not a hidden element.
 * ⭐ The wording publishes with the ceiling; Ali and the native readers approve it at Gate B, before ACTIVE
 *    (COMPLIANCE-DECISIONS "Privacy v2026-10-17").
 * Guards: `test:privacy-notice` §1 pins both renderings — production's text and version, and the text and version
 * published with the ceiling — and §4q holds every Millionea paragraph inside this wrapper, read through the one reader
 * of both renderings (`scripts/lib/millionea-wording-source.mts`).
 */
import type { ReactNode } from "react";
import { millioneaWordingPublished } from "@/lib/millionea-rollout";

export function MillioneaWording({ children }: { children: ReactNode }) {
  return millioneaWordingPublished() ? <>{children}</> : null;
}
