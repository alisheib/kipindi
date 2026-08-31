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
        <div key={role} className="glass-panel p-4">
          <p className="font-display font-semibold text-body-sm text-text mb-3">{ROLE_LABEL[role as Role]}</p>
          <div className="grid grid-cols-1 gap-2">
            {(ADMIN_DOMAINS as readonly AdminDomain[]).map((d) => {
              const g = matrix[role][d];
              const sensitive = SENSITIVE.has(d);
              /* ⛔ `G-5` AGAIN, AND THIS ROW NEVER GOT THE FIX. `AdminCard`'s header learned it in
                 2026-08-02: an action side that is `shrink-0` beside a text side that is only
                 `min-w-0` means the TEXT absorbs the entire shortfall, because `min-w-0` is not a
                 request for space — it is only permission to disappear. Measured by `qa:fit` on
                 /admin/roles: the domain description rendered into a **27px box holding 161px of
                 text**, 126 times across the matrix. At 1280 the same element measures 161/161 and
                 fits, which is why reading the markup alone would never have found it.
                 ⭐ The repair is the card header's: the row WRAPS and the text keeps a basis, so a
                 wide control group drops to its own line instead of eating the description. */
              return (
                <div key={d} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 rounded-md border border-border bg-bg-overlay px-3 py-2">
                  <div className="min-w-0 flex-1 basis-[14rem]">
                    <p className="text-body-sm text-text">{DOMAIN_LABEL[d]}</p>
                    {/* ⚠️ AND A `title` AS WELL, because the basis fixed the COLLAPSE but not the
                        length: `qa:fit` re-measured this at 204px (up from 27px) against a longest
                        description of 715px — "See finance, reports, transactions, payments…". The
                        row now gives the text its fair share; DG-A-10's ruling covers the rest,
                        keeping the full string reachable rather than lost. */}
                    <p className="text-micro text-text-tertiary truncate"
                       title={`See ${DOMAIN_SUMMARY[d].view}${DOMAIN_SUMMARY[d].act !== "—" ? ` · Do: ${DOMAIN_SUMMARY[d].act}` : ""}`}>
                      See {DOMAIN_SUMMARY[d].view}{DOMAIN_SUMMARY[d].act !== "—" ? ` · Do: ${DOMAIN_SUMMARY[d].act}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <label className="flex items-center gap-1.5">
                      <span className="font-mono text-micro uppercase eyebrow text-text-subtle">See</span>
                      <Toggle on={g.canView} onClick={() => toggleView(role, d)} aria-label={`${ROLE_LABEL[role as Role]} can view ${DOMAIN_LABEL[d]}`} />
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className="font-mono text-micro uppercase eyebrow" style={{ color: sensitive && g.canAct ? MONEY : "var(--text-subtle)" }}>
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
        /* ⛔ NOT "RESET" (S-17). /admin/roles carries two near-identical reset dialogs — this
           one and read-tiers-matrix's — on adjacent surfaces with the same tone, the same
           confirm label and one word of difference in the title. A shared typed word would
           arm whichever one happened to be open, which is precisely the muscle-memory the
           gate exists to interrupt. Each names what it actually discards. */
        tier="hard"
        typedWord="RESET PERMISSIONS"
      />
    </div>
  );
}
