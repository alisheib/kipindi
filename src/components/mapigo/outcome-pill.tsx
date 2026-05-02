import { cn } from "@/lib/utils";
import type { MapigoCall } from "@/lib/mapigo-data";

const stylesFor = (call: MapigoCall) => {
  switch (call) {
    case "SPIKE": return { dot: "bg-danger", text: "text-danger", border: "border-danger/30",            bg: "bg-danger-bg/25" };
    case "DRIFT": return { dot: "bg-gold",   text: "text-gold",   border: "border-gold-subtleHover/40", bg: "bg-gold-subtle/30" };
    case "CALM":  return { dot: "bg-info",   text: "text-info",   border: "border-info/30",              bg: "bg-info-bg/25" };
  }
};

export function OutcomePill({
  call,
  size = "md",
  className,
}: {
  call: MapigoCall;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const s = stylesFor(call);
  const sizeClass =
    size === "xs" ? "h-4 px-1.5 text-micro tracking-[0.12em]" :
    size === "sm" ? "h-5 px-1.5 text-micro tracking-[0.14em]" :
    size === "lg" ? "h-7 px-2.5 text-label tracking-[0.16em]" :
    "h-6 px-2 text-caption tracking-[0.14em]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm font-bold uppercase border whitespace-nowrap",
        sizeClass,
        s.bg,
        s.text,
        s.border,
        className,
      )}
    >
      <span aria-hidden className={cn("h-1 w-1 rounded-pill", s.dot)} />
      {call}
    </span>
  );
}
