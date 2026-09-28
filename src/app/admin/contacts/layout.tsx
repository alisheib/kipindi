import { AdminSectionGate } from "@/components/admin/admin-section-gate";

/** This section's view/act gate, re-decided on every navigation into it. See `admin-section-gate.tsx`.
 *  ⛔ NO `title` PROP WHILE THIS SECTION IS ONE PAGE. The default titles the restricted panel from the
 *  last URL segment (`crumbsFromPath`), which reads "Contacts" here. Pass an explicit title the moment
 *  `/admin/contacts/[id]` exists: a contact id is a phone-bearing record, and a detail route would
 *  otherwise put that id in the refusal heading (ruling 301). */
export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <AdminSectionGate>{children}</AdminSectionGate>;
}
