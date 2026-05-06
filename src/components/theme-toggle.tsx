"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { setStoredTheme, getStoredTheme } from "./theme-provider";

type Theme = "light" | "dark";
const ICON: Record<Theme, typeof Sun> = { light: Sun, dark: Moon };
const LABEL: Record<Theme, string> = { light: "Light", dark: "Dark" };

/**
 * Single icon button that toggles dark ↔ light. Default is dark — there is
 * no "system" option by design (50pick is dark-first).
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = getStoredTheme();
    setTheme(t === "light" ? "light" : "dark");
    setMounted(true);
  }, []);
  if (!mounted) return <div className="h-8 w-8 rounded-md bg-bg-overlay" aria-hidden />;

  const Icon = ICON[theme];
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Theme: ${LABEL[theme]}. Click to switch to ${LABEL[next]}.`}
      title={`Theme: ${LABEL[theme]} (click for ${LABEL[next]})`}
      onClick={() => { setStoredTheme(next); setTheme(next); }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-200",
        "text-text-subtle hover:text-text hover:bg-bg-overlay",
      )}
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
