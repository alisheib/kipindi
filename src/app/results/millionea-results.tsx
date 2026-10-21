import { millioneaDoor } from "@/lib/server/millionea-doors";
import { millioneaResultsSection } from "@/lib/server/maswali-player";
import { getServerT } from "@/lib/i18n-server";
import { loadVisibleMillioneaResults } from "./millionea-results-access";
import { MillioneaResultsView } from "./millionea-results-view";

/** The classic page must stay open while the Millionea rollout is hidden. Where it stands: `millioneaSectionShown`. */
export async function MillioneaResultsSection() {
  const result = await loadVisibleMillioneaResults(millioneaDoor, millioneaResultsSection);
  if (!result) return null;
  const { t } = await getServerT();
  return <MillioneaResultsView t={t} preview={result.preview} weeks={result.weeks} />;
}
