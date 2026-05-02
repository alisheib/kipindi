import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { user } from "@/lib/mock-data";

export function KycStatusBanner() {
  if (user.kycStatus === "approved") return null;
  const status = user.kycStatus;
  const isPending = status === "in_progress";
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 border-b",
      isPending ? "bg-info-bg border-info-border text-info" : "bg-warning-bg border-warning-border text-warning",
    )}>
      <ShieldAlert size={16} strokeWidth={1.5} className="shrink-0" />
      <div className="flex-1 min-w-0 text-body-sm">
        <span className="font-medium">{isPending ? "Verify your identity to withdraw" : "Verify ID to start"}</span>
        <span className="text-text-secondary"> · Thibitisha kitambulisho</span>
      </div>
      <Link href="/profile" className="text-label font-semibold underline-offset-2 hover:underline">
        Continue · Endelea
      </Link>
    </div>
  );
}
