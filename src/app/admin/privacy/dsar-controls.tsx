"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast, useDeferredToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const onClick = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const r = await fulfillDsarAction(fd);
      if (!r.ok) {
        toast({ title: "Could not fulfill", description: r.error, variant: "danger" });
      } else {
        router.refresh();
        deferToast({ title: "Marked fulfilled", variant: "success" });
      }
    });
  };
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" size="sm" variant="primary" loading={pending}>
          Mark fulfilled
        </Button>
      }
      title="Mark DSAR fulfilled"
      body="This records the completion date and closes this data subject access request. The player will be notified. This action cannot be undone."
      confirmLabel="Yes, mark fulfilled"
      tone="warning"
      onConfirm={onClick}
    />
  );
}
