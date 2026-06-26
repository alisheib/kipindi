"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import {
  createCampaign, addContacts, sendCampaign, cancelCampaign,
  type CreateCampaignInput,
} from "@/lib/server/invite-service";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  const u = await db.user.findById(s.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
  return s;
}

export async function createCampaignAction(input: CreateCampaignInput):
  Promise<{ ok: true; campaignId: string } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  const r = await createCampaign(input, s.userId);
  if (!r.ok) return r;
  revalidatePath("/admin/invites");
  return { ok: true, campaignId: r.campaign.id };
}

export async function addContactsAction(campaignId: string, text: string):
  Promise<{ ok: true; added: number; skipped: number; invalid: string[] } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  const r = await addContacts(campaignId, text, s.userId);
  revalidatePath(`/admin/invites/${campaignId}`);
  return r;
}

export async function sendCampaignAction(campaignId: string):
  Promise<{ ok: true; sent: number; failed: number } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  const r = await sendCampaign(campaignId, s.userId);
  revalidatePath(`/admin/invites/${campaignId}`);
  revalidatePath("/admin/invites");
  return r;
}

export async function cancelCampaignAction(campaignId: string):
  Promise<{ ok: true } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  const r = await cancelCampaign(campaignId, s.userId);
  revalidatePath(`/admin/invites/${campaignId}`);
  revalidatePath("/admin/invites");
  return r;
}
