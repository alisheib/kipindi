"use client";

/**
 * ARIFA — the hub's door to the notifications page, carrying the reader's unread count (the Vodacom plan S6, SJ-17;
 * S6-PLAN WP5 step 5, as amendment A1 changes it).
 *
 * ⭐ The journey's own counter in its "once" mode: one read when the row mounts and one when an action changes the
 * inbox, and no beat at all — the hub costs one request per visit (A1). The classic bell is not touched.
 * ⭐ The count is spoken inside the row's own name ("Arifa, 3 hazijasomwa"); the badge is only its picture, and nothing
 * is drawn while the count is unknown or zero. The counter shows a count only to the reader it was read for, so a
 * shared phone never shows the last player's number.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { CountBadge } from "@/components/ui/count-badge";
import { useT } from "@/lib/i18n";
import { useUnreadCount } from "@/lib/journey/use-unread-count";
import { fill } from "@/lib/utils";

export function UnreadRow({ userId, href, label }: { userId: string | null; href: string; label: string }) {
  const { t } = useT();
  const unread = useUnreadCount({ userId, mode: "once" });
  const n = unread ?? 0;
  return (
    <li>
      <Link href={href as never} className="kp-hub__row">
        <span className="kp-hub__glyph" aria-hidden><I.bell s={20} /></span>
        <span className="kp-hub__text">
          <span className="kp-hub__label">
            {label}
            {n > 0 && <span className="sr-only">, {n === 1 ? t.notif.unreadOne : fill(t.notif.unreadN, { n })}</span>}
          </span>
        </span>
        <CountBadge count={n} tone="brand" size="lg" aria-hidden />
        <I.chevronRight s={18} className="kp-hub__chev" aria-hidden />
      </Link>
    </li>
  );
}
