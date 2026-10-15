"use client";

import { useEffect } from "react";
import { releaseStoredFunding } from "@/lib/journey/funding-storage";

/** Clear a proven no-row refusal even when a break or wallet hold replaces the form. */
export function FundingReleaseBridge({ ownerId, releaseKey }: { ownerId: string; releaseKey: string | null }) {
  useEffect(() => {
    if (!releaseKey) return;
    try { releaseStoredFunding(window.sessionStorage, ownerId, releaseKey); }
    catch { /* A storage failure keeps the key locked. */ }
  }, [ownerId, releaseKey]);
  return null;
}
