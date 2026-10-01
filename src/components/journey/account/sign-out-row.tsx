"use client";

/**
 * TOKA — sign-out, the hub's last control (the Vodacom plan S6, SJ-17; S6-PLAN WP5 step 5).
 *
 * ⭐ The avatar menu's own confirm — the kit `ConfirmDialog`, claret, the `profile.signOutConfirm*` words — and then a
 * POST to `/auth/logout` (a GET sign-out is neutered). The form is real and in the page; the confirm submits it.
 * ⛔ The dialog is the kit Modal, which portals out of the page, so nothing here is placed over the route content
 * (`test:stacking` §5). Its copy is reviewed by `test:popup-fit`.
 */
import { useRef } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

export function SignOutRow() {
  const { t } = useT();
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action="/auth/logout" method="POST">
      <ConfirmDialog
        tone="claret"
        title={t.profile.signOutConfirmTitle}
        body={<p>{t.profile.signOutConfirmBody}</p>}
        confirmLabel={t.profile.signOutConfirmYes}
        cancelLabel={t.profile.signOutConfirmNo}
        onConfirm={() => form.current?.submit()}
        trigger={
          <button type="button" className="kp-hub__exit">
            <span className="kp-hub__glyph" aria-hidden><I.logOut s={20} /></span>
            <span className="kp-hub__label">{t.common.signOut}</span>
          </button>
        }
      />
    </form>
  );
}
