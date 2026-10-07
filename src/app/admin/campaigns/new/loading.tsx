import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkCard, SkChip, SkTitle } from "@/components/admin/admin-skeletons";
import { AudienceFloorGhost } from "./audience-split-card";

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
 * ⭐ U38b · THE AUDIENCE CARD'S GHOST is the counted card's shape — the rail, the words, the count and the callout — and
 * its COUNT is the count alone (OD65: `AudienceFloorGhost`, one tile and the sentence's box — the very boxes a viewer who
 * may not read a number is shown, at every size), because the composer is GROWTH's screen first; a reader's card grows
 * into the full figures when the page swaps in (`qa:marketing-audience` asserts GROWTH's count block equal at 1280 and
 * 360, and RECORDS the reader's growth; the keyed fallback is each role's own and equal for both). The rail's and the words' heights depend on the role, the book's
 * lists and tags and how the pills wrap, and are RECORDED.
 * ⛔ `data-skeleton` stamps are the drive's handles — never match on class strings. ⛔ No numeric scale key that the
 * spacing scale inverts: the spacing scale is overridden.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="New SMS campaign" sw="Kampeni mpya" />
      <SkBody>
        <div data-skeleton="compose-message"><SkCard lines={9} titleW="w-[88px]" /></div>
        <div data-skeleton="compose-audience">
          <div className="glass-panel p-4">
            <SkTitle titleW="w-[80px]" sw={false} className="mb-3" />
            <div className="space-y-2">
              {/* The rail: Who, Operator, the window — dense pills, 32px, under its group key. */}
              <div className="flex flex-col gap-2 border-b border-border-subtle pb-3">
                {[3, 6, 5].map((n, row) => (
                  <div key={row} className="flex items-center gap-1 flex-wrap gap-y-1.5">
                    <SkBar className="h-[12px] w-[56px]" />
                    {Array.from({ length: n }).map((_, i) => <SkChip key={i} className="h-[32px] w-[72px]" />)}
                  </div>
                ))}
              </div>
              {/* The words: one line. */}
              <SkBar className="h-[18px] w-[240px]" />
              <div data-skeleton="compose-audience-count"><AudienceFloorGhost footer={null} /></div>
              {/* The permanent callout. */}
              <SkBar className="h-[40px] w-full rounded-md" />
            </div>
          </div>
        </div>
        <div data-skeleton="compose-test"><SkCard lines={4} sw={false} titleW="w-[80px]" /></div>
      </SkBody>
    </>
  );
}
