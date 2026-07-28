"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import {
  createCampaign, addContacts, addContactsStructured, sendCampaign, cancelCampaign,
  type CreateCampaignInput, type ContactRow,
} from "@/lib/server/invite-service";
import { requireStaff } from "@/lib/server/rbac-guard";

// RBAC: authorization is data-driven — requireStaff checks this role's canAct for the
// domain (Owner/ADMIN bypasses), audits a blocked attempt, then enforces step-up 2FA.
async function ensureAdmin() {
  return requireStaff("growth");
}

export async function createCampaignAction(input: CreateCampaignInput):
  Promise<{ ok: true; campaignId: string } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  try {
    const r = await createCampaign(input, s.userId);
    if (!r.ok) return r;
    revalidatePath("/admin/invites");
    return { ok: true, campaignId: r.campaign.id };
  } catch (err) {
    return { ok: false, error: safeError(err, "Create campaign failed") };
  }
}

export async function addContactsAction(campaignId: string, text: string):
  Promise<{ ok: true; added: number; skipped: number; invalid: string[] } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  try {
    const r = await addContacts(campaignId, text, s.userId);
    revalidatePath(`/admin/invites/${campaignId}`);
    return r;
  } catch (err) {
    return { ok: false, error: safeError(err, "Add contacts failed") };
  }
}

export async function addContactsStructuredAction(campaignId: string, rows: ContactRow[]):
  Promise<{ ok: true; added: number; skipped: number; invalid: number } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  try {
    const r = await addContactsStructured(campaignId, rows, s.userId);
    revalidatePath(`/admin/invites/${campaignId}`);
    return r;
  } catch (err) {
    return { ok: false, error: safeError(err, "Add structured contacts failed") };
  }
}

export async function sendCampaignAction(campaignId: string):
  Promise<{ ok: true; sent: number; failed: number; pending: number } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  try {
    const r = await sendCampaign(campaignId, s.userId);
    revalidatePath(`/admin/invites/${campaignId}`);
    revalidatePath("/admin/invites");
    return r;
  } catch (err) {
    return { ok: false, error: safeError(err, "Send campaign failed") };
  }
}

export async function cancelCampaignAction(campaignId: string):
  Promise<{ ok: true } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  try {
    const r = await cancelCampaign(campaignId, s.userId);
    revalidatePath(`/admin/invites/${campaignId}`);
    revalidatePath("/admin/invites");
    return r;
  } catch (err) {
    return { ok: false, error: safeError(err, "Cancel campaign failed") };
  }
}
