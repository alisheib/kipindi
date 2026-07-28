"use client";

/**
 * The grant-matrix editor — roles × domains, a View + Act toggle per cell. Saves each
 * toggle instantly (optimistic + server action) and applies on the role's next request.
 *
 * Consequence highlighting (Ali): each domain row spells out, in the kit's type, what
 * "See" and "Do" mean there; the Act toggle on money/PII domains (accounting, compliance)
 * is tinted amber as a caution. The Owner (ADMIN) is never shown — it bypasses the table.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { setRoleGrantAction, resetRoleGrantsAction } from "./actions";
import { ADMIN_DOMAINS, DOMAIN_LABEL, DOMAIN_SUMMARY, ROLE_LABEL, type AdminDomain, type Role } from "@/lib/server/roles";

type Grant = { canView: boolean; canAct: boolean };
type Matrix = Record<string, Record<AdminDomain, Grant>>;

const SENSITIVE = new Set<AdminDomain>(["accounting", "compliance"]);
const MONEY = "var(--warning-500)";

export function RolesMatrix({ matrix: initial }: { matrix: Matrix }) {
  const [matrix, setMatrix] = useState<Matrix>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useDeferredToast(pending);
  const [resetting, setResetting] = useState(false);

  const save = (role: string, domain: AdminDomain, next: Grant) => {
    setMatrix((m) => ({ ...m, [role]: { ...m[role], [domain]: next } })); // optimistic
    start(async () => {
      const fd = new FormData();
      fd.set("role", role);
      fd.set("domain", domain);
      fd.set("canView", String(next.canView));
      fd.set("canAct", String(next.canAct));
      const r = await setRoleGrantAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't save", description: r.error, variant: "danger" });
        router.refresh(); // roll back to the server truth
      }
    });
  };

  const toggleView = (role: string, d: AdminDomain) => {
    const cur = matrix[role][d];
    const canView = !cur.canView;
    save(role, d, { canView, canAct: canView ? cur.canAct : false }); // hiding a domain also removes act
  };
  const toggleAct = (role: string, d: AdminDomain) => {
    const cur = matrix[role][d];
    const canAct = !cur.canAct;
    save(role, d, { canView: canAct ? true : cur.canView, canAct }); // acting implies viewing
  };

  const doReset = () => {
    start(async () => {
      const r = await resetRoleGrantsAction();
      if (!r.ok) { toast({ title: "Reset failed", description: r.error, variant: "danger" }); return; }
      router.refresh();
      toast({ title: "Reset to defaults", variant: "success" });
    });
  };

  const roles = Object.keys(matrix);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-caption text-text-tertiary max-w-2xl">
          Toggle what each role can <strong className="text-text">See</strong> (open the pages) and{" "}
          <strong className="text-text">Do</strong> (make changes) per area. Saves instantly and applies on each
          staffer&apos;s next request — no deploy. Turning off <em>See</em> also removes <em>Do</em>; turning on{" "}
          <em>Do</em> switches on <em>See</em>. The <strong>Owner</strong> is not listed — the Owner always has full access.
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setResetting(true)} loading={pending}>
          Reset to defaults
        </Button>
      </div>

      {roles.map((role) => (
        <div key={role} className="rounded-lg glass-panel p-4">
          <p className="font-display font-semibold text-body-sm text-text mb-3">{ROLE_LABEL[role as Role]}</p>
          <div className="grid grid-cols-1 gap-2">
            {(ADMIN_DOMAINS as readonly AdminDomain[]).map((d) => {
              const g = matrix[role][d];
              const sensitive = SENSITIVE.has(d);
              return (
                <div key={d} className="flex items-start justify-between gap-3 rounded-md border border-border bg-bg-overlay px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-body-sm text-text">{DOMAIN_LABEL[d]}</p>
                    <p className="text-micro text-text-tertiary truncate">
                      See {DOMAIN_SUMMARY[d].view}{DOMAIN_SUMMARY[d].act !== "—" ? ` · Do: ${DOMAIN_SUMMARY[d].act}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <label className="flex items-center gap-1.5">
                      <span className="font-mono text-micro uppercase tracking-[0.12em] text-text-subtle">See</span>
                      <Toggle on={g.canView} onClick={() => toggleView(role, d)} aria-label={`${ROLE_LABEL[role as Role]} can view ${DOMAIN_LABEL[d]}`} />
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className="font-mono text-micro uppercase tracking-[0.12em]" style={{ color: sensitive && g.canAct ? MONEY : "var(--text-subtle)" }}>
                        Do{sensitive ? " ⚠" : ""}
                      </span>
                      <Toggle on={g.canAct} onClick={() => toggleAct(role, d)} aria-label={`${ROLE_LABEL[role as Role]} can act on ${DOMAIN_LABEL[d]}`} />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <ConfirmModal
        open={resetting}
        onClose={() => setResetting(false)}
        onConfirm={() => { setResetting(false); doReset(); }}
        title="Reset all role permissions to defaults?"
        body="Every role goes back to the seeded default matrix. Any custom grants you've set are discarded. The Owner is unaffected. Continue?"
        confirmLabel="Reset to defaults"
        tone="claret"
        tier="hard"
      />
    </div>
  );
}
