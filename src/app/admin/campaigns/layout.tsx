import { AdminSectionGate } from "@/components/admin/admin-section-gate";

/** This section's view/act gate, re-decided on every navigation into it. See `admin-section-gate.tsx`.
 *  ⭐ AN EXPLICIT TITLE FROM THE FIRST COMMIT. Without one the restricted panel is titled from the last URL segment,
 *  which reads "Campaigns" here — the bare word `/admin/invites` already owns ("Invite campaigns") — and, once U47's
 *  `/admin/campaigns/[id]` exists, would read a raw campaign id (ruling 301). A literal, because
 *  `test:layout-staleness` §1.0 accepts no computed prop on a section gate. */
export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <AdminSectionGate title="SMS campaigns">{children}</AdminSectionGate>;
}
