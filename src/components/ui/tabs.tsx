"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabsProps = {
  tabs: { value: string; labelEn: string; labelSw?: string }[];
  value: string;
  onChange: (v: string) => void;
  variant?: "line" | "segmented" | "pill";
  className?: string;
};

export function Tabs({ tabs, value, onChange, variant = "line", className }: TabsProps) {
  if (variant === "segmented") {
    return (
      <div className={cn("inline-flex items-center gap-0.5 rounded-md bg-surface-pressed p-0.5", className)}>
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={value === t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              "h-8 px-3 rounded-sm text-label font-medium transition-colors duration-micro",
              value === t.value ? "bg-surface text-text shadow-e1" : "text-text-tertiary hover:text-text",
            )}
          >
            {t.labelEn}
          </button>
        ))}
      </div>
    );
  }
  if (variant === "pill") {
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              "h-7 px-3 rounded-pill text-label font-medium transition-colors duration-micro",
              value === t.value ? "bg-royal-subtle text-royal" : "bg-surface-pressed text-text-secondary hover:bg-surface-hover",
            )}
          >
            {t.labelEn}
          </button>
        ))}
      </div>
    );
  }
  // line
  return (
    <div className={cn("flex items-end gap-3 border-b border-border-divider", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "relative h-9 px-1 text-label font-medium transition-colors duration-micro",
            value === t.value ? "text-text" : "text-text-tertiary hover:text-text",
          )}
        >
          {t.labelEn}
          <span
            className={cn(
              "absolute left-0 right-0 -bottom-px h-0.5 rounded-pill transition-opacity duration-micro",
              value === t.value ? "bg-gold opacity-100" : "opacity-0",
            )}
          />
        </button>
      ))}
    </div>
  );
}
