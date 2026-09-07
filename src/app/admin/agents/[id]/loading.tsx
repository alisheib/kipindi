import { AdminPageHead } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { SkCard, SkFormCard } from "@/components/admin/admin-skeletons";

/**
 * The workstation, in the console's own skeleton kit: the head, then the two-column console —
 * the applicant card, the eight-tile document grid and the fee card on the left; the decision
 * rail (a form) on the right. One column below lg, exactly as the page.
 */
export default function AdminAgentWorkstationLoading() {
  return (
    <>
      <AdminPageHead title="Agent application" sw="Maombi ya uwakala" />
      <AdminBody>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]" aria-hidden>
          <div className="space-y-4">
            <SkCard lines={2} />
            <div className="glass-panel p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="h-[120px] rounded-xl border border-border bg-bg-overlay/40 kp-shimmer-track" />)}
              </div>
            </div>
            <SkCard lines={3} />
          </div>
          <SkFormCard fields={6} cols="grid-cols-1" sw={false} />
        </div>
      </AdminBody>
    </>
  );
}
