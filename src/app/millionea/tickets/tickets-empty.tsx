"use client";

import type { ComponentProps } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { numeralRuns } from "@/components/maswali/maswali-facts";

/**
 * Tiketi zangu's empty states — the kit's own (`EmptyState`, the siblings' box, M3) with its body's numerals in the
 * numerals' face (§T5: "Wiki 3 iko wazi hadi Ijumaa 18:00." sets "3" and "18:00" `.mono`), through the kit's opt-in
 * `bodyPart` (the lead's ruling, 2026-10-22). A client component because a function crosses no server boundary: the page
 * hands this its words and its door, and the numeral face is joined here, on the client side of the kit.
 */
export function MillioneaTicketsEmpty(props: Omit<ComponentProps<typeof EmptyState>, "bodyPart">) {
  return <EmptyState {...props} bodyPart={numeralRuns} />;
}
