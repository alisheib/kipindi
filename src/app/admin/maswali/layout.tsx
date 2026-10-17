import { AdminSectionGate } from "@/components/admin/admin-section-gate";

/** E-381 §6 item 10 — this section's view/act gate, re-decided on every navigation into it. See `admin-section-gate.tsx`. */
export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <AdminSectionGate>{children}</AdminSectionGate>;
}
