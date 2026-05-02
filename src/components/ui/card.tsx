import * as React from "react";
import { cn } from "@/lib/utils";

type Elevation = "flat" | "raised" | "floating";

const elevationClass: Record<Elevation, string> = {
  flat: "shadow-e0 border border-border-subtle",
  raised: "shadow-e2 border border-border-subtle",
  floating: "shadow-e3 border border-border-subtle",
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
        "rounded-lg bg-surface text-text",
        elevationClass[elevation],
        interactive && "transition-all duration-medium ease-standard hover:shadow-e3 hover:bg-surface-hover cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 pt-3 pb-1.5", className)} {...p} />;
}
export function CardBody({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 py-2", className)} {...p} />;
}
export function CardFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 pt-1.5 pb-3", className)} {...p} />;
}
