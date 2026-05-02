"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const ORDER = ["light", "system", "dark"] as const;
const ICON: Record<(typeof ORDER)[number], typeof Sun> = {
  light: Sun,
  system: Monitor,
  dark: Moon,
};
const LABEL: Record<(typeof ORDER)[number], string> = {
  light: "Light",
  system: "System",
  dark: "Dark",
};

/**
 * Single icon button that cycles light → system → dark.
 * Compact at every breakpoint; the icon reflects the active theme.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-8 w-8 rounded-md bg-surface-pressed" aria-hidden />;

  const current = (ORDER.includes(theme as (typeof ORDER)[number]) ? theme : "system") as (typeof ORDER)[number];
  const Icon = ICON[current];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  return (
    <button
      type="button"
      aria-label={`Theme: ${LABEL[current]}. Click to switch to ${LABEL[next]}.`}
      title={`Theme: ${LABEL[current]} (click for ${LABEL[next]})`}
      onClick={() => setTheme(next)}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-micro",
        "text-text-tertiary hover:text-text hover:bg-surface-hover",
      )}
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
