"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostText } from "@/components/ui/ghost-text";
import { useT } from "@/lib/i18n";

/**
 * /fairness/millionea/[serial] loading state — client code (`test:visual-pass-r5h` §1: a player loading file sends a
 * reference, never a drawn tree), opening on the page's own bands (R5-L, `test:visual-pass-r5l` §1): its back link's box,
 * then its header — the eyebrow the page prints, the title's line held by a word bar — then the reading-tier panel.
 * ⛔ It draws no word of the product (the S5 ticket page's rule): a loading state renders before the gate can answer, so
 * it must not announce a product the rollout may be hiding. The title's bar therefore holds the eyebrow's own word, set
 * and not shown, never the page's title (`test:visual-pass-r5l` CASES maps one to the other).
 */
export default function MillioneaProofLoading() {
  const { t } = useT();
  return (
    <PageLoader
      tier="reading"
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHeader eyebrow={t.footer.fairness} title={<GhostText>{t.footer.fairness}</GhostText>} />
        </>
      }
    />
  );
}
