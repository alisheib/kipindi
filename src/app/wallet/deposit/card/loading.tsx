import { CardDepositGhost } from "../deposit-ghost";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";

export default async function CardDepositLoading() {
  const { journey } = await resolveSimpleJourney();
  return <CardDepositGhost journey={journey} />;
}
