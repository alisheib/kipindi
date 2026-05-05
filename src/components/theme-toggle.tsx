"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { setStoredTheme, getStoredTheme } from "./theme-provider";

type Theme = "light" | "system" | "dark";
const ORDER: Theme[] = ["light", "system", "dark"];
const ICON: Record<Theme, typeof Sun> = { light: Sun, system: Monitor, dark: Moon };
const LABEL: Record<Theme, string> = { light: "Light", system: "System", dark: "Dark" };

/**
 * Single icon button that cycles light → system → dark.
 * Compact at every breakpoint; the icon reflects the active theme.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setTheme(getStoredTheme());
    setMounted(true);
  }, []);
  if (!mounted) return <div className="h-8 w-8 rounded-md bg-surface-pressed" aria-hidden />;

  const Icon = ICON[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      aria-label={`Theme: ${LABEL[theme]}. Click to switch to ${LABEL[next]}.`}
      title={`Theme: ${LABEL[theme]} (click for ${LABEL[next]})`}
      onClick={() => { setStoredTheme(next); setTheme(next); }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-micro",
        "text-text-tertiary hover:text-text hover:bg-surface-hover",
      )}
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
