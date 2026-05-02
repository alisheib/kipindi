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

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-9 w-9 lg:w-[108px] rounded-md bg-surface-pressed" aria-hidden />;

  const current = (ORDER.includes(theme as (typeof ORDER)[number]) ? theme : "system") as (typeof ORDER)[number];
  const CurrentIcon = ICON[current];

  // Mobile / small screens: single icon button that cycles light → system → dark
  // Desktop: 3-button segmented pill
  return (
    <>
      <button
        type="button"
        aria-label={`Theme: ${current}`}
        onClick={() => {
          const i = ORDER.indexOf(current);
          setTheme(ORDER[(i + 1) % ORDER.length]);
        }}
        className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface-pressed text-text-secondary hover:text-text hover:bg-surface-hover transition-colors duration-micro"
      >
        <CurrentIcon size={16} strokeWidth={1.5} />
      </button>
      <div className="hidden lg:inline-flex items-center gap-1 rounded-md bg-surface-pressed p-1">
        {ORDER.map((value) => {
          const Icon = ICON[value];
          return (
            <button
              key={value}
              type="button"
              aria-label={value.charAt(0).toUpperCase() + value.slice(1)}
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-micro",
                theme === value ? "bg-surface text-royal shadow-e1" : "text-text-tertiary hover:text-text",
              )}
            >
              <Icon size={16} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
    </>
  );
}
