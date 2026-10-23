import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { readDepositStatus } from "@/lib/server/deposit-status";
import { DepositWaitingClient } from "../deposit-waiting-client";
import { firstDepositNotice, kycNoticeDismissValue } from "@/lib/server/kyc-notice";
import { KYC_NOTICE_COOKIE } from "@/lib/kyc-notice";
import { cookies } from "next/headers";
import { slipReturnPath } from "@/lib/journey/slip-return";
import { resolveMillionea } from "@/lib/server/millionea-preview";

export const dynamic = "force-dynamic";

export default async function DepositWaitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnPath?: string }> }) {
  const session = await currentSession();
  const id = (await params).id;
  // MB-57 (MASWALI-BUILD FLOW 3): the Millionea slip's way back as the deposit action handed it on — kept through a sign-in,
  // honoured only while Millionea is visible to this reader (`lib/journey/slip-return.ts`).
  const slipAsked = slipReturnPath((await searchParams).returnPath);
  if (!session) redirect(`/auth/login?next=${encodeURIComponent(`/wallet/deposit/wait/${id}${slipAsked ? `?returnPath=${encodeURIComponent(slipAsked)}` : ""}`)}`);
  const slipReturn = slipAsked && (await resolveMillionea()).visible ? slipAsked : null;
  const read = await readDepositStatus(session.userId, { kind: "txn-id", value: id });
  const notice = await firstDepositNotice(session.userId, {
    dismissCookie: (await cookies()).get(KYC_NOTICE_COOKIE)?.value, depositInHand: true,
  });
  return <DepositWaitingClient ownerId={session.userId} initial={read.view}
    lookupUrl={`/api/wallet/deposits/${encodeURIComponent(id)}/status`} paymentKey={read.txn?.idempotencyKey ?? null}
    firstDepositNotice={notice} noticeDismissValue={notice ? kycNoticeDismissValue(session.userId) : null} slipReturn={slipReturn} />;
}
