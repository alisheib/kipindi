"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { BuyTray } from "./buy-tray";

type Side = "YES" | "NO";

export function BetslipBottomSheet({
  marketId,
  yesPool,
  noPool,
  initialSide = "YES",
  trigger,
}: {
  marketId: string;
  yesPool: number;
  noPool: number;
  initialSide?: Side;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="contents"
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
      >
        {trigger}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center" role="dialog" aria-label="Predict">
          <div className="absolute inset-0 bg-bg-overlay backdrop-blur-md" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="relative w-full sm:w-auto sm:max-w-[380px] bg-bg-elevated rounded-t-xl sm:rounded-xl border border-border shadow-e5 kp-slide-up"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-center pt-2 pb-1 sm:hidden">
              <span className="h-1 w-10 rounded-pill bg-border-strong" />
            </div>
            <div className="flex items-center justify-between px-3 pt-1 pb-2 sm:py-3 border-b border-border">
              <p className="font-display text-[14px] font-semibold text-text">Predict</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-3">
              <BuyTray marketId={marketId} yesPool={yesPool} noPool={noPool} initialSide={initialSide} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
