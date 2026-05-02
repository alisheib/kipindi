import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  illustration,
  title,
  description,
  action,
  className,
}: {
  illustration: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-9 px-3", className)}>
      <div className="w-32 h-26 mb-2 opacity-90">{illustration}</div>
      <p className="font-display text-title-sm text-text">{title}</p>
      {description && <p className="text-body-sm text-text-secondary max-w-sm mt-1">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
