"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
// ⛔ NEVER THE RAW SERVER STRING — `docs/FAILURE-INVENTORY.md` §1.5/§1.6: the server's
// English audit prose reaching a Swahili or Chinese player at the moment something failed.
import { errorCopy } from "@/lib/error-copy";
import { refusalReason, refusalVariant } from "@/lib/failure-reasons";
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
        // §F2/§F3 (R5-I): at the registry's rank — a refusal the player can fix is the calm `factual` toast, a fault `danger`.
        toast({ title: t.common.exportFailed, description: errorCopy(t, result), variant: refusalVariant(refusalReason(result)) });
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
