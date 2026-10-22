"use client";

import type { ComponentProps } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { numeralRuns } from "@/components/maswali/maswali-facts";

/**
 * MILLIONEA'S EMPTY STATE — the kit's own (`EmptyState`: the siblings' box, its plate, its held phrases, its hung Chinese
 * marks) with the body's numerals in the numerals' face (§T5: "Wiki 3 iko wazi hadi Ijumaa 18:00." sets "3" and "18:00"
 * `.mono`, in the fact lines' own rule, `numeralRuns`), through the kit's OPT-IN `bodyPart` (the lead's ruling, 2026-10-22).
 * The one door for a Millionea page whose empty-state body holds a numeral: a server page cannot hand a function to the
 * client kit, so it hands this its words and its door, and the numeral face is joined here, on the client side of the kit.
 * Every word stays the dictionary's; only the numerals' face changes (test:maswali-tickets 11.2–11.4).
 */
export function MaswaliEmptyState(props: Omit<ComponentProps<typeof EmptyState>, "bodyPart">) {
  return <EmptyState {...props} bodyPart={numeralRuns} />;
}
