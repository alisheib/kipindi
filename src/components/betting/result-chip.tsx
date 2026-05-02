import { Chip } from "@/components/ui/chip";

export function ResultChip({ status }: { status: "won" | "lost" | "draw" | "voided" | "cashedout" | "placed" }) {
  if (status === "won")       return <Chip variant="gold">Won · Imeshinda</Chip>;
  if (status === "lost")      return <Chip variant="neutral">Pool grew · Bwawa limeongezeka</Chip>;
  if (status === "draw")      return <Chip variant="warning">Draw · Sare</Chip>;
  if (status === "voided")    return <Chip variant="neutral">Voided · Limefutwa</Chip>;
  if (status === "cashedout") return <Chip variant="gold">Cashed out · Imetolewa</Chip>;
  return <Chip variant="brand">Placed · Limewekwa</Chip>;
}
