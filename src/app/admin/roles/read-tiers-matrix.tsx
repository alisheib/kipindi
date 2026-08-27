"use client";

/**
 * The READ-TIER editor — roles × field classes, one three-way cell each.
 * Design + rulings: docs/READ-TIERS.md (§3.2 the grid, §4a the rulings, §4c the cell).
 *
 * ⛔ IT IS A TAB ON `/admin/roles`, NOT A PAGE OF ITS OWN. §6: "two permission screens is how
 * two permission models are born." One screen, two axes, and the difference between them is
 * spelled out on this tab rather than left for a reader to infer.
 *
 * ⭐ THE OWNER IS LISTED HERE, AND THE ACCESS TAB DELIBERATELY DOES NOT LIST IT. That looks like
 * an inconsistency and is a ruling (D3). The Owner bypasses the DOMAIN table so a bad grant can
 * never lock them out of a route — but the READ axis resolves ADMIN through the table like every
 * other role, because ADMIN is the only account that exists on production and a masking rule the
 * Owner skipped would have no possible witness. The banner below says so on screen, because an
 * unexplained difference between two tabs of the same screen is how a rule gets "tidied away".
 *
 * ⚠️ `masked` on a class with no masked form is OFFERED AND DISABLED WITH ITS REASON, never
 * hidden — Ali, 2026-08-04: "Why isn't gold in the list?" is a worse question for an operator
 * than seeing it greyed with the answer beside it.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { setRoleReadGrantAction, resetRoleReadGrantsAction } from "./actions";
import {
  READ_CLASSES,
  READ_CLASS_LABEL,
  READ_CLASS_SUMMARY,
  READ_CELL_LABEL,
  ROLE_LABEL,
  isMaskable,
  type ReadClass,
  type ReadCell,
  type Role,
} from "@/lib/server/roles";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";

type Matrix = Record<string, Record<ReadClass, ReadCell>>;

export function ReadTiersMatrix({ matrix: initial }: { matrix: Matrix }) {
  // A1 · `/admin/roles` is OWNER-ONLY, so the layout computes `mayAct = isAdmin(viewerRole)`
  // and it is `true` for anyone who can open this tab at all — the gate is inert here TODAY.
  // It is consulted anyway: `roles-matrix.tsx` and `staff-forms.tsx` sit behind the same
  // owner-only argument, and an ungated control is one OWNER_ONLY_PREFIXES edit away from
  // being the offer A1 is about. The grid still READS for anyone who reaches it; only the
  // writes are gated.
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const [matrix, setMatrix] = useState<Matrix>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useDeferredToast(pending);
  const [resetting, setResetting] = useState(false);

  const save = (role: string, cls: ReadClass, next: ReadCell) => {
    const prev = matrix[role][cls];
    setMatrix((m) => ({ ...m, [role]: { ...m[role], [cls]: next } })); // optimistic
    start(async () => {
      const fd = new FormData();
      fd.set("role", role);
      fd.set("readClass", cls);
      fd.set("cell", next);
      const r = await setRoleReadGrantAction(fd);
      if (!r.ok) {
        // ⛔ The refusal is shown VERBATIM — it names which levels the class permits, and
        // paraphrasing it throws away the only part that says what to do next.
        toast({ title: "Couldn't save", description: r.error, variant: "danger" });
        setMatrix((m) => ({ ...m, [role]: { ...m[role], [cls]: prev } })); // roll back
        router.refresh();
      }
    });
  };

  const doReset = () => {
    start(async () => {
      const r = await resetRoleReadGrantsAction();
      if (!r.ok) { toast({ title: "Reset failed", description: r.error, variant: "danger" }); return; }
      router.refresh();
      toast({ title: "Reset to defaults", variant: "success" });
    });
  };

  const options = (cls: ReadClass) => [
    { value: "read", label: READ_CELL_LABEL.read },
    {
      value: "masked",
      label: READ_CELL_LABEL.masked,
      disabled: !isMaskable(cls),
      hint: isMaskable(cls) ? undefined : "This class has no masked form — a partial reveal would identify it.",
    },
    { value: "none", label: READ_CELL_LABEL.none },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <p className="text-caption text-text-tertiary max-w-2xl">
          What each role may READ, field by field — a separate question from which pages they can open.
          <strong className="text-text"> Can reveal</strong> still shows dots at rest and adds a one-tap reveal that
          writes an audit entry. <strong className="text-text">Masked only</strong> is the ceiling: dots, and no way
          past them. <strong className="text-text">Hidden</strong> removes the field entirely. Saves instantly and
          applies on that staffer&apos;s next request.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setResetting(true)}
          loading={pending}
          disabled={!mayAct}
          title={actReason}
        >
          Reset to defaults
        </Button>
      </div>

      {/* ⛔ The Owner difference, explained where it is seen. */}
      <div className="rounded-md border border-warning-border bg-warning-bg px-3 py-2">
        <p className="text-caption text-text-secondary">
          <strong className="text-text">The Owner IS listed on this tab</strong> — unlike Access, where the Owner
          always has every page. Reads are different on purpose: a masking rule the Owner skipped could not be checked
          by anyone, because the Owner is the only account on the platform. The Owner can still never be locked out —
          the worst a change here does is show dots where a value was.
        </p>
      </div>

      {Object.keys(matrix).map((role) => (
        <div key={role} className="rounded-lg glass-panel p-4">
          <p className="font-display font-semibold text-body-sm text-text mb-3">{ROLE_LABEL[role as Role]}</p>
          <div className="grid grid-cols-1 gap-2">
            {(READ_CLASSES as readonly ReadClass[]).map((cls) => (
              <div
                key={cls}
                className="flex items-start justify-between gap-3 rounded-md border border-border bg-bg-overlay px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-body-sm text-text">{READ_CLASS_LABEL[cls]}</p>
                  <p className="text-micro text-text-tertiary">{READ_CLASS_SUMMARY[cls]}</p>
                </div>
                <div className="shrink-0">
                  {/* ⚠️ `ariaLabel`, NOT `aria-label` — the kit Select names itself through a
                      referenced label and drops the hyphenated attribute silently (E-225). */}
                  <Select
                    ariaLabel={`${ROLE_LABEL[role as Role]} — ${READ_CLASS_LABEL[cls]}`}
                    size="sm"
                    value={matrix[role][cls]}
                    onChange={(v) => save(role, cls, v as ReadCell)}
                    disabled={pending || !mayAct}
                    options={options(cls)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <ConfirmModal
        open={resetting}
        onClose={() => setResetting(false)}
        onConfirm={() => { setResetting(false); doReset(); }}
        title="Reset all read levels to defaults?"
        body="Every role goes back to the seeded default grid in docs/READ-TIERS.md §3.2. Any custom read levels you've set are discarded. Continue?"
        confirmLabel="Reset to defaults"
        tone="claret"
        tier="hard"
      />
    </div>
  );
}
