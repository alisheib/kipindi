import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkCard, SkFormCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Two-factor authentication"
        sw="Uthibitisho wa hatua mbili"
        actions={<SkChip className="h-[30px] w-32" />}
      />
      {/* ⚠️ The cap is NOT optional here (fixed 2026-08-21). This route is in the
          admin layout's TOTP_EXEMPT set, so the layout returns a bare fragment
          with none of the console measure — the page therefore caps ITSELF with
          `mx-auto w-full max-w-form` (page.tsx, DESIGN_AUTHORITY B7). The
          skeleton did not, so it drew edge-to-edge and the real page then
          collapsed to the form measure: a ~1,280px jump at 1920 on an admin's
          first 2FA enrolment. Mirror the page's shell exactly. */}
      <SkBody className="mx-auto w-full max-w-form">
        {/* Intro */}
        <SkCard lines={2} title={false} />
        {/* Authenticator app */}
        <SkFormCard fields={1} titleW="w-40" />
        {/* How this works in production */}
        <SkCard lines={3} titleW="w-48" />
      </SkBody>
    </>
  );
}
