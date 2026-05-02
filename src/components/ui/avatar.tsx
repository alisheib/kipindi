import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClass: Record<Size, string> = {
  xs: "h-5 w-5 text-micro",
  sm: "h-6 w-6 text-caption",
  md: "h-8 w-8 text-label",
  lg: "h-10 w-10 text-body-sm",
  xl: "h-14 w-14 text-body-lg",
};

export function Avatar({
  initials,
  size = "md",
  color,
  className,
}: {
  initials: string;
  size?: Size;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-pill font-display font-semibold tabular text-onBrand select-none",
        sizeClass[size],
        className,
      )}
      style={{ backgroundColor: color ?? "var(--royal)" }}
    >
      {initials}
    </div>
  );
}
