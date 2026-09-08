import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerT } from "@/lib/i18n-server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { invitationPreview } from "@/lib/server/agent-application-service";
import { fill, formatDateShort } from "@/lib/utils";
import { InviteClient } from "./invite-client";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.agent.inviteTitle };
}
export const dynamic = "force-dynamic";

/**
 * /agent/invite/[token] — the officer-led door. Public at the edge (an invitee may have no
 * account yet), but nothing happens until the invitee is signed in with the phone the
 * invitation is BOUND to and has typed an OTP that was delivered to it. ⭐ That acceptance is
 * the second party the self-service path gets for free.
 */
export default async function AgentInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t } = await getServerT();
  // ⭐ The viewer is read BEFORE the preview so the identity match can be decided against the
  // real address inside the service, rather than by string-matching the mask out here.
  const session = await currentSession();
  const viewer = session ? await db.user.findById(session.userId) : null;
  const preview = await invitationPreview(token, viewer);

  if (!preview.ok) {
    const why = preview.reason === "expired" ? t.agent.inviteExpired : preview.reason === "revoked" ? t.agent.inviteRevoked : preview.reason === "used" ? t.agent.inviteUsed : preview.reason === "declined" ? t.agent.inviteDeclined : t.agent.inviteInvalid;
    return (
      <PageContainer tier="reading" className="space-y-5">
        <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.inviteTitle} />
        <EmptyState kind="default" title={why} body={t.agent.heroSub}
          action={<Link href={"/agent" as never}><Button variant="primary" size="md">{t.agent.title}</Button></Link>} />
      </PageContainer>
    );
  }

  return (
    <PageContainer tier="reading" className="space-y-5">
      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.inviteTitle} subtitle={t.agent.inviteBody} />
      <section className="rounded-xl glass-panel p-4 space-y-1">
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.agent.inviteSentTo}</p>
        {/* ⚠️ `tabular-nums` only on a phone number — it aligns digits, and on an email
            address it just widens the letters for no reason. `break-all` because a long
            address must not push the panel wider than the measure at 360px. */}
        <p className={`font-mono text-title-sm font-bold text-text ${preview.channel === "PHONE" ? "tabular-nums" : "break-all"}`}>{preview.addressMasked}</p>
        <p className="text-body-sm text-text-muted">{fill(t.agent.inviteExpires, { date: formatDateShort(preview.expiresAt) })}</p>
      </section>
      <p className="text-body-sm leading-relaxed text-text-muted">{t.agent.inviteKycNote}</p>
      <InviteClient
        token={token}
        signedIn={!!session}
        viewerMatches={preview.viewerMatches}
        addressMasked={preview.addressMasked}
        channel={preview.channel}
      />
    </PageContainer>
  );
}
