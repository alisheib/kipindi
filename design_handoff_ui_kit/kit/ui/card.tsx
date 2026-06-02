/**
 * Card — kit-faithful surface (--bg-elevated + --border, theme-adaptive).
 * elevation: flat (no shadow) · raised (default e2) · floating (e3)
 * interactive: adds hover lift + teal-500 border + cursor pointer
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type Elevation = "flat" | "raised" | "floating";

const elevationClass: Record<Elevation, string> = {
  flat:     "border border-border",
  raised:   "border border-border shadow-e2",
  floating: "border border-border shadow-e3",
};

export function Card({
  elevation = "raised",
  interactive,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { elevation?: Elevation; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-bg-elevated text-text",
        elevationClass[elevation],
        interactive &&
          "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-teal-500 hover:shadow-e3 cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pt-4 pb-2", className)} {...p} />;
}
export function CardBody({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-3", className)} {...p} />;
}
export function CardFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pt-2 pb-4", className)} {...p} />;
}
