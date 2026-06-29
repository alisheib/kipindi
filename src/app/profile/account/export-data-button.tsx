"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { exportDataAction } from "./actions";
import { useT } from "@/lib/i18n";

export function ExportDataButton() {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const click = async () => {
    setLoading(true);
    try {
      const result = await exportDataAction();
      if (!result.ok) {
        toast({ title: t.common.exportFailed, description: result.error, variant: "danger" });
        return;
      }
      const blob = new Blob([result.payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: t.common.dataExported, description: result.filename, variant: "success" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button variant="primary" size="lg" leading={<I.download s={14} />} onClick={click} loading={loading}>
      {t.common.downloadData}
    </Button>
  );
}
