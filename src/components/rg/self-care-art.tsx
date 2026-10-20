import { I } from "@/components/ui/glyphs";

/** Calm sunrise for responsible-gambling care, drawn by the shared family. */
export function RgSunriseArt({ size = 44, className }: { size?: number; className?: string }) {
  return <I.sunHorizon s={size} tier="duo" className={className} aria-hidden />;
}
