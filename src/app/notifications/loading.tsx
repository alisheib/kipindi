"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

/**
 * /notifications opens on its back link and its header (the bell, 22px, on the eyebrow's row), on the page's 24px rung.
 *
 * ⛔ B7 RULE 3 — a page and its loading.tsx state the SAME tier. The page is
 * <PageContainer tier="reading">, and `reading` is 1080, so this is 1080. `/updown/[roundId]`
 * once shipped 1232 against a 1080 skeleton: a 152px jump on every load that no test could see.
 * The generic body below — `components/ui/page-loader.tsx` has the rule (R5-L): a loader opens on its page's own opening
 * bands, in the page's rhythm, and its spinner panel stands where the page's first band of data begins.
 */
export default function Loading() {
  const { t } = useT();
  return (
    <PageLoader
      tier="reading"
      rows={6}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHeader icon={<I.bellRing s={22} />} eyebrow={t.notif.eyebrow} title={t.notif.title} />
        </>
      }
    />
  );
}
