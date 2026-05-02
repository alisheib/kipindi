"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-9 w-[108px] rounded-md bg-surface-pressed" aria-hidden />;

  const Item = ({ value, icon: Icon, label }: { value: string; icon: typeof Sun; label: string }) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={theme === value}
      onClick={() => setTheme(value)}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-micro",
        theme === value ? "bg-surface text-royal shadow-e1" : "text-text-tertiary hover:text-text"
      )}
    >
      <Icon size={16} strokeWidth={1.5} />
    </button>
  );

  return (
    <div className="inline-flex items-center gap-1 rounded-md bg-surface-pressed p-1">
      <Item value="light" icon={Sun} label="Light" />
      <Item value="system" icon={Monitor} label="System" />
      <Item value="dark" icon={Moon} label="Dark" />
    </div>
  );
}
