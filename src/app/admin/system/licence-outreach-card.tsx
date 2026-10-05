"use client";

/**
 * U33a-R · THE "LICENCE OUTREACH" CARD — the one place the decision in OD58 is taken, on the Public policy lines tab of
 * /admin/system (`?tab=policy`; spec `docs/marketing-specs/U33a-U37c-OD58.md` §5.3 · §6 U33a-R · §7.7).
 *
 * ⭐ WHY IT SITS UNDER THE POLICY LINES RATHER THAN BESIDE THE WORDINGS. Three of its four checks are satisfied by
 * editing the very lines on this tab, and each refusal names the bullet to fix. An officer clears a check and watches
 * this card lose a row without changing tabs — the decision and its evidence read as one page. (A technical placement
 * call, taken on Ali's standing delegation of 2026-10-02.)
 *
 * ⛔ THE BUTTON IS NOT THE GATE. Every check is re-run on the SERVER inside the writer, over the policy record as it is
 * at that instant: this card can only be as fresh as its last render, and a line that was fixed — or un-fixed — in
 * another tab since would otherwise decide who 50pick may lawfully text. What the card owes the officer is the REASON,
 * which is why each failing check is printed in full rather than collapsed into a disabled button.
 *
 * ⛔ A SEPARATE FILE, NOT `system-client.tsx` (the U33w/U33p cards' reason): `test:admin-act-gate` judges a whole FILE,
 * and `system-client.tsx` is a declared, ungated entry on its shrink-only allowlist. This card consults the gate itself
 * (`useMayAct`), so a viewer who may not act reads the state and changes nothing.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { I } from "@/components/ui/glyphs";
import { useDeferredToast } from "@/components/ui/toast";
import { ActReadOnly, useMayAct } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { closeLicenceOutreachAction, openLicenceOutreachAction } from "./actions";

/** What the server page hands down — the state as stored, and every check that still refuses an opening. */
export type LicenceOutreachView = {
  readonly state: "open" | "closed";
  /** Present only while open: who recorded it, and when (as stored). */
  readonly recordedBy?: string;
  readonly recordedAt?: string;
  readonly blockers: readonly { readonly check: string; readonly sentence: string }[];
};

/** The dialog bodies — exactly the words of spec §5.3, so the decision is described the same way everywhere. */
const OPEN_BODY =
  "From now on, players who have not stopped 50pick offers, and contacts on lists recorded under the licence, can receive campaigns. A stop is always kept.";
const CLOSE_BODY = "Closing stops licence outreach at once: only people who consented will receive campaigns.";

export function LicenceOutreachCard({ view }: { view: LicenceOutreachView }) {
  const mayAct = useMayAct();
  const router = useRouter();
  const [pending, start] = useTransition();
  const { toast } = useDeferredToast(pending);
  const [asking, setAsking] = useState<null | "open" | "close">(null);

  const blocked = view.blockers.length > 0;

  const run = (kind: "open" | "close") => {
    setAsking(null);
    start(async () => {
      const res = await runAdminAction(() => (kind === "open" ? openLicenceOutreachAction() : closeLicenceOutreachAction()));
      if (!res.ok) {
        toast({
          title: kind === "open" ? "Couldn't open licence outreach" : "Couldn't close licence outreach",
          description: res.error,
          variant: "danger",
        });
        // ⭐ A refusal re-renders the card from the server, so a check that failed on the server — but not in this
        // card's last render — appears in the list the officer is looking at, rather than only in a toast they dismiss.
        router.refresh();
        return;
      }
      toast({
        title: kind === "open" ? "Licence outreach is open" : "Licence outreach is closed",
        description: kind === "open" ? OPEN_BODY : CLOSE_BODY,
      });
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex items-start gap-2 mb-3">
        <I.shieldcheck s={16} />
        <p className="text-caption text-text-secondary">
          While this is closed, campaigns reach only people who agreed to receive them. Open, they may also reach players
          who have not stopped 50pick offers and contacts on lists recorded under the licence. A stop is always kept, and
          both acts are recorded in the audit log.
        </p>
      </div>

      <p className="text-body-sm mb-3">
        <span className="text-text-subtle">Status: </span>
        <strong className={view.state === "open" ? "text-success" : "text-text"}>
          {view.state === "open" ? "Open" : "Closed"}
        </strong>
        {view.state === "open" && view.recordedAt ? (
          <span className="text-text-subtle"> — recorded {view.recordedAt}</span>
        ) : null}
      </p>

      {view.state === "closed" && blocked && (
        <ul className="mb-3 space-y-1.5">
          {view.blockers.map((b) => (
            <li key={b.check} className="text-body-sm text-text-secondary flex items-start gap-2">
              <span aria-hidden className="text-warning">•</span>
              <span>{b.sentence}</span>
            </li>
          ))}
        </ul>
      )}

      {!mayAct ? (
        <ActReadOnly />
      ) : view.state === "open" ? (
        <Button variant="secondary" onClick={() => setAsking("close")} disabled={pending}>
          Close licence outreach
        </Button>
      ) : (
        <Button onClick={() => setAsking("open")} disabled={pending || blocked}>
          Open licence outreach
        </Button>
      )}

      <ConfirmModal
        open={asking !== null}
        onClose={() => setAsking(null)}
        onConfirm={() => run(asking === "open" ? "open" : "close")}
        title={asking === "open" ? "Open licence outreach?" : "Close licence outreach?"}
        body={asking === "open" ? OPEN_BODY : CLOSE_BODY}
        confirmLabel={asking === "open" ? "Open" : "Close"}
        loading={pending}
      />
    </div>
  );
}
