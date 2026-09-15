import { AdminSectionGate } from "@/components/admin/admin-section-gate";

/** This section's view/act gate, re-decided on every navigation into it. See `admin-section-gate.tsx`. */
export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <AdminSectionGate>{children}</AdminSectionGate>;
}
