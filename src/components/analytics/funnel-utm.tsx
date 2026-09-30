"use client";

/**
 * FunnelUtm — keeps the visit's first-touch campaign tags (`utm_source`, `utm_campaign`) in sessionStorage (`kp-utm`)
 * so the journey funnel's counts can be read per campaign (the Vodacom plan S3b, §0f). Runs once per document; keeps
 * the FIRST tags only; stores nothing when the landing URL carries none. Named in Privacy §7. Renders null.
 */
import { useEffect } from "react";
import { captureFirstTouchUtm } from "@/lib/journey/funnel-beacon";

export function FunnelUtm() {
  useEffect(() => { captureFirstTouchUtm(); }, []);
  return null;
}
