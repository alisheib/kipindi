import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-md bg-surface-pressed animate-pulse", className)} aria-hidden />;
}
