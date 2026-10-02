import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard } from "@/components/admin/admin-skeletons";

/**
 * The ghost for /admin/campaigns/new (U37b).
 *
 * ⭐ WITHOUT IT THE LIST'S GHOST WOULD STAND IN: a `loading.tsx` wraps its segment's children too, so the composer would
 * flash the campaign LIST's rail and table while it loads. This one is the composer's own.
 * ⭐ THE FIRST CARD'S TOP EDGE IS EQUAL BY CONSTRUCTION: the same `AdminPageHead` (same literal title, same gloss, no
 * action), then `SkBody` — the page's own `AdminBody` — with the Message card's ghost first, as the page puts the
 * Message card first. Nothing above that edge can move when the page swaps in; the U37b drive measures it at 1280 and
 * 360 (within 1px).
 * ⭐ THE CARDS' HEIGHTS ARE NOT EQUAL BY CONSTRUCTION, said rather than hidden: the Message card's fields, counters and
 * the English line depend on what the draft holds, and the test card on whether a draft is saved. Each ghost is the
 * kit's titled card (title, gloss where the real card has one, body lines), and the drive RECORDS the three height
 * differences at both widths.
 * ⛔ `data-skeleton` stamps are the drive's handles — never match on class strings. ⛔ No numeric scale key: the
 * spacing scale is overridden.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="New SMS campaign" sw="Kampeni mpya" />
      <SkBody>
        <div data-skeleton="compose-message"><SkCard lines={9} titleW="w-[88px]" /></div>
        <div data-skeleton="compose-audience"><SkCard lines={2} sw={false} titleW="w-[80px]" /></div>
        <div data-skeleton="compose-test"><SkCard lines={4} sw={false} titleW="w-[80px]" /></div>
      </SkBody>
    </>
  );
}
