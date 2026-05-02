"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Theme toggle is temporarily disabled — the app is locked to dark mode while
 * the light theme is being polished. The buttons are still rendered (greyed out
 * and non-interactive) so the layout stays consistent.
 */
const ORDER = ["light", "system", "dark"] as const;
const ICON: Record<(typeof ORDER)[number], typeof Sun> = {
  light: Sun,
  system: Monitor,
  dark: Moon,
};

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9 lg:w-[108px] rounded-md bg-surface-pressed" aria-hidden />;

  return (
    <>
      <button
        type="button"
        aria-label="Theme: dark (light + system disabled)"
        disabled
        title="Light mode coming soon"
        className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface-pressed text-text opacity-100 cursor-not-allowed"
      >
        <Moon size={16} strokeWidth={1.5} />
      </button>
      <div className="hidden lg:inline-flex items-center gap-1 rounded-md bg-surface-pressed p-1" title="Light mode coming soon">
        {ORDER.map((value) => {
          const Icon = ICON[value];
          const active = value === "dark";
          return (
            <button
              key={value}
              type="button"
              aria-label={value.charAt(0).toUpperCase() + value.slice(1)}
              aria-pressed={active ? "true" : "false"}
              disabled={!active}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-micro",
                active ? "bg-surface text-royal shadow-e1 cursor-default" : "text-text-tertiary opacity-30 cursor-not-allowed",
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
