import { AdminSectionGate } from "@/components/admin/admin-section-gate";

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <AdminSectionGate>{children}</AdminSectionGate>;
}
