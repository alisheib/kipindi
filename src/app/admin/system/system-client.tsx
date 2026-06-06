"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { backupNowAction, verifyChainAction } from "./actions";

export function SystemActions({ kind }: { kind: "backup" | "verify-chain" }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  if (kind === "backup") {
    const click = async () => {
      setLoading(true);
      try {
        const r = await backupNowAction();
        if (r.ok) {
          setResult(`Snapshot written ${new Date(r.ts).toLocaleString("en-GB")}`);
          toast({ title: "Backup written", description: r.ts, variant: "success" });
        } else {
          setResult(`FAILED: ${r.error}`);
          toast({ title: "Backup failed", description: r.error, variant: "danger" });
        }
      } finally {
        setLoading(false);
      }
    };
    return (
      <div className="space-y-2">
        <Button variant="primary" size="lg" leading={<I.database size={14} />} onClick={click} loading={loading}>
          Backup now
        </Button>
        {result && (
          <p className="text-caption flex items-center gap-1.5 text-text-secondary">
            <I.checkCircle size={12} className="text-success" />
            {result}
          </p>
        )}
      </div>
    );
  }

  // verify-chain
  const click = async () => {
    setLoading(true);
    try {
      const r = await verifyChainAction();
      if (r.valid) {
        setResult("Chain valid · all entries pass HMAC verification");
        toast({ title: "Chain valid", description: "Every audit entry verifies", variant: "success" });
      } else {
        setResult(`Chain broken at ${r.firstBreakAt} (index ${r.index})`);
        toast({ title: "Chain broken", description: `First break: ${r.firstBreakAt}`, variant: "danger" });
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-2">
      <Button variant="primary" size="lg" leading={<I.shieldcheck s={14} />} onClick={click} loading={loading}>
        Verify audit chain
      </Button>
      {result && (
        <p className="text-caption flex items-center gap-1.5 text-text-secondary">
          {result.startsWith("Chain valid") ? <I.checkCircle size={12} className="text-success" /> : <I.warning s={12} />}
          {result}
        </p>
      )}
    </div>
  );
}
