"use client";

import { useEffect, useRef, useState } from "react";
import { PENDING_BET_KEY } from "@/lib/journey/pending-bet";
import { trustedDepositBet } from "@/lib/journey/deposit-state-client";
import { useT } from "@/lib/i18n";
import { fundingStorageKey, parseStoredFunding, releaseStoredFunding, writeStoredFunding } from "@/lib/journey/funding-storage";

const fundingKey = fundingStorageKey;

/** Keep the whole classic Card form, but require a recoverable funding key and a trusted chosen-bet handoff. */
export function CardIntentBridge({ ownerId, rawBet, returnPath, releaseKey }: {
  ownerId: string; rawBet: string | null; returnPath: string | null; releaseKey: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const submittedKey = useRef<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [recoverKey, setRecoverKey] = useState<string | null>(null);
  const { t } = useT();

  useEffect(() => {
    const form = ref.current?.closest("form");
    const gate = form?.querySelector<HTMLElement>("[data-card-intent-gate]");
    const keyField = form?.querySelector<HTMLInputElement>('input[name="idempotencyKey"]');
    if (!form || !gate || !ref.current || !keyField) { setInvalid(true); return; }
    // A query-only navigation can reuse this DOM node after an earlier effect enabled it.
    // Every new recovery decision begins closed, including the stored-key early return.
    gate.inert = true;
    const trust = () => {
      if (!rawBet) { if (ref.current) ref.current.value = ""; return true; }
      try {
        const saved = trustedDepositBet(ownerId, rawBet, returnPath,
          { kind: "tab-marker", hydrated: true, markerRaw: window.sessionStorage.getItem(PENDING_BET_KEY) }, Date.now());
        if (!saved || !ref.current) return false;
        ref.current.value = JSON.stringify(saved);
        return true;
      } catch { return false; }
    };
    try {
      const box = window.sessionStorage;
      if (releaseKey && releaseStoredFunding(box, ownerId, releaseKey) && submittedKey.current === releaseKey) submittedKey.current = null;
      setRecoverKey(null);
      const existing = box.getItem(fundingKey(ownerId));
      if (existing) {
        const record = parseStoredFunding(existing, ownerId);
        if (!record) throw new Error("Invalid saved payment");
        setRecoverKey(record.key);
        setInvalid(false);
      } else {
        if (!trust()) throw new Error("Chosen bet unavailable");
        gate.inert = false;
        setInvalid(false);
      }
    } catch { gate.inert = true; setInvalid(true); }

    const submit = (event: Event) => {
      try {
        if (gate.inert || window.sessionStorage.getItem(fundingKey(ownerId))) throw new Error("Payment recovery is locked");
        if (submittedKey.current) { event.preventDefault(); return; }
        if (!trust()) throw new Error("Payment cannot be recovered");
        const key = crypto.randomUUID();
        if (!writeStoredFunding(window.sessionStorage, ownerId, { v: 1, key, owner: ownerId, startedAt: Date.now(), attempts: 1 }))
          throw new Error("Payment key unavailable");
        keyField.value = key;
        submittedKey.current = key;
      } catch {
        event.preventDefault();
        gate.inert = true;
        setInvalid(true);
      }
    };
    form.addEventListener("submit", submit, true);
    return () => form.removeEventListener("submit", submit, true);
  }, [ownerId, rawBet, returnPath, releaseKey]);

  return <>
    <input ref={ref} type="hidden" hidden name="pendingBet" defaultValue="" />
    {recoverKey && <div role="status" className="rounded-lg border border-border bg-bg-inset p-4">
      <p className="text-body-sm text-text">{t.wallet.returnPendingWarnBody}</p>
      <a href={`/wallet/deposit/wait?key=${encodeURIComponent(recoverKey)}`} className="btn btn-primary btn-md mt-3 inline-flex">{t.wallet.viewReceipt}</a>
    </div>}
    {invalid && <p role="alert" className="text-body-sm text-danger-fg">{t.journey.depositUnknownBody}</p>}
  </>;
}
