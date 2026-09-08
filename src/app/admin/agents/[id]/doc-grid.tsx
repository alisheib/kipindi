"use client";

/**
 * The eight document slots as a GRID, not a column — an officer must never scroll past seven
 * documents to find Approve. Each tile fetches its image through the gated route (role +
 * step-up 2FA re-checked there, every view audited); a failed fetch shows a labelled state,
 * never the browser's broken-image glyph. Two tiles are a third party's national ID and say so.
 *
 * Neutral chrome throughout: a document is evidence, not money (§M3).
 */
import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { Modal } from "@/components/ui/modal";
import type { AgentDocType } from "@/lib/server/store";

export type DocTile = {
  docType: AgentDocType;
  label: string;
  uploadedAt: string | null;
  suppliedBy: "applicant" | "officer" | null;
  rejected: boolean;
  rejectReason: string | null;
  thirdParty: boolean;
  purged: boolean;
};

export function DocGrid({ applicationId, tiles, thirdPartyHoldDays }: { applicationId: string; tiles: DocTile[]; thirdPartyHoldDays: number }) {
  const [open, setOpen] = useState<DocTile | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((d) => {
          const present = !!d.uploadedAt && !d.purged;
          return (
            <button key={d.docType} type="button" disabled={!present} onClick={() => present && setOpen(d)}
              className={`min-h-[120px] rounded-xl border p-3 text-left transition-colors ${
                !present ? "border-border bg-bg-overlay/30 cursor-not-allowed"
                : d.rejected ? "border-warning-500/60 bg-warning-500/[0.06] hover:border-warning"
                : "border-border bg-bg-overlay/40 hover:border-brand-400"
              }`}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-body-sm font-semibold text-text leading-tight">{d.label}</span>
                {d.thirdParty && <Chip variant="warning">3rd party</Chip>}
              </div>
              <div className="mt-2 flex h-[44px] items-center justify-center rounded-md bg-bg-overlay/60">
                {present ? <I.idCard s={20} className="text-text-muted" /> : <I.x s={16} className="text-text-subtle" />}
              </div>
              <p className="mt-2 font-mono text-body-sm text-text-subtle">
                {d.purged ? "Destroyed on schedule" : !present ? "Not attached" : d.rejected ? "Sent back" : d.suppliedBy === "officer" ? "Supplied by officer" : "Supplied by applicant"}
              </p>
              {d.rejected && d.rejectReason && <p className="mt-1 text-body-sm leading-snug text-warning-500">{d.rejectReason}</p>}
            </button>
          );
        })}
      </div>
      {open && (
        <Modal open onClose={() => setOpen(null)} labelledBy="agent-doc-title" maxWidth={720}>
          <div className="space-y-2">
            <h2 id="agent-doc-title" className="font-display text-body-lg font-semibold text-text">{open.label}</h2>
            {open.thirdParty && (
              <p className="text-body-sm text-warning-500">Third-party identity document. Viewing is audited; it is held {thirdPartyHoldDays} days after the decision and then destroyed.</p>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/admin/agent-doc?app=${encodeURIComponent(applicationId)}&type=${encodeURIComponent(open.docType)}`} alt={open.label}
              className="max-h-[70vh] w-full rounded-md object-contain bg-bg-inset"
              onError={(e) => { (e.currentTarget as HTMLImageElement).alt = "Could not load this document — refresh and try again."; }} />
          </div>
        </Modal>
      )}
    </>
  );
}
