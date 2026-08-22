import { PageLoader } from "@/components/ui/page-loader";

/**
 * ⛔ B7 RULE 3 — a page and its loading.tsx state the SAME tier. The page is
 * <PageContainer tier="reading">, and `reading` is 1080, so this is 1080. `/updown/[roundId]`
 * once shipped 1232 against a 1080 skeleton: a 152px jump on every load that no test could see.
 */
export default function Loading() {
  return <PageLoader tier="reading" rows={6} />;
}
