"use client";

/**
 * TIKETI ZANGU, FOR A GUEST — what a signed-out reader gets for tapping the tickets destination (the Vodacom plan S6,
 * SJ-16; `S6-PLAN.md` WP6a step 5; the S4 frame `s4-9-tiketi-guest`).
 *
 * A guest has no tickets to show, so the tab opens a small sheet instead of a page: "Ingia uone tiketi zako", then
 * Jisajili (the filled action, first: a guest is most often new) and Ingia, each returning to Tiketi zangu once the
 * reader is in (G12). The Modal's own close button dismisses it, as do the scrim and Escape.
 *
 * ⭐ THE KIT'S SHEET, NOT A NEW ONE. `<Modal sheet sheetUntil="lg">` is the Wallet's own shell (a bottom sheet below
 * 1024, a centred dialog from there) and it portals to the document body, so the sheet sits on the dialog rung and
 * not inside the stacking context of the bar or the rail that opened it. The grab handle and the two-up action row
 * are the Wallet's own classes, so the two sheets a journey reader meets are drawn one way.
 * ⚠️ Each action closes the sheet as it navigates: the bar and the rail outlive the page, so a sheet left open would
 * be waiting over the sign-in screen.
 */
import { useId } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { useT } from "@/lib/i18n";

export function TicketsGuestSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const titleId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      sheet
      sheetUntil="lg"
      maxWidth={440}
      panelClassName="kp-wsheet"
    >
      <div aria-hidden className="kp-wsheet__grab" />
      <h2 id={titleId} className="kp-jsheet__title">{t.journey.ticketsGuestTitle}</h2>
      <div className="kp-wsheet__pair">
        <Link
          href={"/auth/register?next=%2Fpositions" as never}
          onClick={onClose}
          className="btn btn-primary btn-lg kp-wsheet__act"
          data-testid="tickets-guest-signup"
        >
          {t.common.signUp}
        </Link>
        <Link
          href={"/auth/login?next=%2Fpositions" as never}
          onClick={onClose}
          className="btn btn-outline btn-lg kp-wsheet__act"
          data-testid="tickets-guest-signin"
        >
          {t.common.signIn}
        </Link>
      </div>
    </Modal>
  );
}
