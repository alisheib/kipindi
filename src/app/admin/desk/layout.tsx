import { AdminSectionGate } from "@/components/admin/admin-section-gate";

/**
 * The desk's view/act gate, re-decided on every navigation into the section. See `admin-section-gate.tsx`.
 *
 * ⛔ IT IS NOT THE GATE THAT DECIDES WHAT IS SENT, and it is given no extra condition of its own (C7-SPEC ruling 301):
 * a layout's verdict changes what is PAINTED, and a flight request whose router state names the admin layouts skips it
 * altogether. The page decides its own audience, first statement, on the viewer's STORED role, before it reads
 * anything. This layout is kept for what it PAINTS — the restricted panel on a normal navigation — and for the
 * `AdminActProvider` it supplies, so the page's `null` never leaves a blank screen.
 *
 * ⛔ THE `title` IS LOAD-BEARING (ruling 301). Without it the panel on `/admin/desk/<id>` would be headed with the raw
 * record id, which this layout streams to any signed-in account.
 */
export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <AdminSectionGate title="Desk">{children}</AdminSectionGate>;
}
