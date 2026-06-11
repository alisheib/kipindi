"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { buildDsarBundleAction, fulfillDsarAction } from "./actions";

export function ExportDsarBundleButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const onClick = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("userId", userId);
      const r = await buildDsarBundleAction(fd);
      if (!r.ok) {
        toast({ title: "Export failed", description: r.error, variant: "danger" });
        return;
      }
      const blob = new Blob([JSON.stringify(r.bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dsar-${userId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "DSAR bundle generated", variant: "success" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button type="button" size="sm" variant="secondary" onClick={onClick} loading={busy}>
      Export bundle
    </Button>
  );
}

export function FulfillDsarButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const onClick = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("id", id);
      const r = await fulfillDsarAction(fd);
      if (!r.ok) {
        toast({ title: "Could not fulfill", description: r.error, variant: "danger" });
      } else {
        router.refresh();
        setTimeout(() => toast({ title: "Marked fulfilled", variant: "success" }), 400);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button type="button" size="sm" variant="primary" onClick={onClick} loading={busy}>
      Mark fulfilled
    </Button>
  );
}
