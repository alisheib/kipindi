"use client";

/**
 * RE-CATEGORISE A MARKET — Jay (Gaming Board) item #14.
 *
 * Category was set ONCE, at creation. Everywhere else in `/admin/markets` it was only
 * filtered and sorted, so a market filed under the wrong topic could be fixed only by
 * re-creating it — which on a market already holding stakes is not a fix at all.
 *
 * 🔴 THE LICENCE EXCLUSION IS WHY THIS IS A SELECT AND NOT A TEXT FIELD. `MARKET_CATEGORIES`
 * is the canonical list and it excludes politics BY LICENCE, so the operator can only choose
 * from what the licence permits — and the server refuses anything else anyway
 * (`recategoriseMarket` validates against `MARKET_CATEGORY_SET`). The console offering exactly
 * what the server accepts is this codebase's rule: *"a console that greys an option the server
 * would still accept is the defect, not the fix"* — here it is the same rule pointed the other
 * way, and the two ends agree because they read the SAME list.
 */
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { recategoriseMarketAction } from "@/app/markets/actions";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";

export function RecategoriseControl({
  marketId, current, categories, titleEn,
}: { marketId: string; current: string; categories: readonly string[]; titleEn: string }) {
  // A1 · `/admin/markets` is the `trading` domain and `recategoriseMarketAction` gates on
  // `canAct(role, "trading")`. No role holds trading VIEW without ACT under DEFAULT_GRANTS —
  // but the Owner can create one live at /admin/roles, and that role must see a stated refusal
  // rather than a Save button whose click lands in the log as `privilege_escalation_blocked`.
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const [pending, start] = useTransition();
  const [next, setNext] = useState(current);
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const save = () => {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("marketId", marketId);
        fd.set("category", next);
        const r = await recategoriseMarketAction(fd);
        if (!r.ok) {
          // ⛔ The refusal is shown VERBATIM — it names which categories the licence permits,
          // and paraphrasing it would throw away the only thing that says what to do next.
          toast({ title: "Couldn't re-categorise", description: r.error, variant: "danger" });
          return;
        }
        router.refresh();
        deferToast({
          title: `Re-categorised`,
          description: `${titleEn.slice(0, 60)} — ${current} → ${next}. Pools, stakes and resolution are untouched.`,
          variant: "success",
        });
      } catch {
        toast({ title: "Couldn't re-categorise", variant: "danger" });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        ariaLabel="Category"
        value={next}
        onChange={setNext}
        disabled={pending || !mayAct}
        options={categories.map((c) => ({ value: c, label: c }))}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={save}
        loading={pending}
        disabled={next === current || !mayAct}
        title={actReason}
      >
        Save category
      </Button>
    </div>
  );
}
