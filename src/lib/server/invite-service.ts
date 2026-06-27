/**
 * Invite-campaign service — bulk player acquisition.
 *
 * An admin creates a campaign (bonus amount + message), uploads email/phone
 * contacts, and sends branded SMS/email invites carrying the campaign `code`.
 * When an invitee registers with that code, bindRegistration() grants them the
 * campaign bonus (idempotent) and marks their entry REGISTERED.
 *
 * Per Ali (2026-06-26): no monthly cap, no approval gate — admins have full
 * discretion. The bonus routes through bonus-service.creditBonus (source INVITE),
 * so it carries the campaign's wagering multiplier and expiry like any bonus.
 */
import { db, type StoredInviteCampaign, type StoredInviteEntry, type ContactType } from "./store";
import { randomId } from "./crypto";
import { audit } from "./audit";
import { withLock } from "./locks";
import { getBonusConfig } from "./bonus-config";
import { creditBonus } from "./bonus-service";
import { tzPhone } from "./validators";
import { sendEmail, inviteHtml } from "./email";
import { sms, inviteMessage, smsConfigured } from "./sms";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Classify + normalize a contact string into EMAIL or PHONE (E.164), or null. */
export function classifyContact(raw: string): { type: ContactType; value: string } | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (EMAIL_RE.test(v)) return { type: "EMAIL", value: v.toLowerCase() };
  const phone = tzPhone.safeParse(v);
  if (phone.success) return { type: "PHONE", value: phone.data };
  return null;
}

/**
 * Parse pasted/CSV contacts. One contact per line; an optional `,<amount>` after
 * the contact overrides the per-invitee bonus. Returns valid rows + invalid lines.
 */
export function parseContacts(text: string): {
  valid: Array<{ type: ContactType; value: string; bonusAmountTzs?: number }>;
  invalid: string[];
} {
  const valid: Array<{ type: ContactType; value: string; bonusAmountTzs?: number }> = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const line of (text ?? "").split(/[\r\n]+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [c, amtRaw] = trimmed.split(",").map((s) => s.trim());
    const contact = classifyContact(c);
    if (!contact) { invalid.push(trimmed); continue; }
    if (seen.has(contact.value)) continue; // de-dupe within the upload
    seen.add(contact.value);
    const amt = amtRaw ? Number(amtRaw.replace(/[^\d]/g, "")) : NaN;
    valid.push({ ...contact, bonusAmountTzs: Number.isFinite(amt) && amt > 0 ? Math.round(amt) : undefined });
  }
  return { valid, invalid };
}

function genCode(name: string): string {
  const stem = (name || "INVITE").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "INVITE";
  return `${stem}${randomId(3).toUpperCase().slice(0, 4)}`;
}

export type CreateCampaignInput = {
  name: string;
  bonusAmountTzs: number;
  wagerMultiplier?: number;
  expiresInDays?: number;
  messageEn: string;
  messageSw: string;
};

export async function createCampaign(input: CreateCampaignInput, adminId: string):
  Promise<{ ok: true; campaign: StoredInviteCampaign } | { ok: false; error: string }> {
  const name = (input.name ?? "").trim();
  if (!name) return { ok: false, error: "Campaign name is required." };
  const bonus = Math.round(input.bonusAmountTzs);
  if (!Number.isFinite(bonus) || bonus <= 0) return { ok: false, error: "Bonus amount must be positive." };
  const cfg = getBonusConfig();
  const multiplier = input.wagerMultiplier ?? cfg.defaultWagerMultiplier;
  if (multiplier < 1 || multiplier > 100) return { ok: false, error: "Multiplier must be 1–100×." };
  const expiresInDays = input.expiresInDays ?? cfg.defaultExpiryDays;
  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 365) return { ok: false, error: "Expiry must be 1–365 days." };

  // Unique code (retry a couple of times on the rare collision).
  let code = genCode(name);
  for (let i = 0; i < 3 && (await db.inviteCampaign.findByCode(code)); i++) code = genCode(name);

  const now = new Date().toISOString();
  const campaign = await db.inviteCampaign.create({
    id: `inv_${randomId(10)}`,
    code,
    name,
    bonusAmountTzs: bonus,
    wagerMultiplier: multiplier,
    expiresInDays,
    messageEn: (input.messageEn ?? "").trim(),
    messageSw: (input.messageSw ?? "").trim(),
    status: "DRAFT",
    totalInvites: 0,
    totalRegistered: 0,
    createdById: adminId,
    createdAt: now,
    updatedAt: now,
  });
  audit({ category: "ADMIN", action: "invite.campaign_created", actorId: adminId, targetType: "InviteCampaign", targetId: campaign.id, payload: { name, bonus, code } });
  return { ok: true, campaign };
}

/** Create one QUEUED entry for a (type,value) if the campaign doesn't already
 *  have that contact. Returns true if a new entry was created. */
async function addEntryIfNew(
  campaign: StoredInviteCampaign,
  type: ContactType,
  value: string,
  bonusAmountTzs?: number,
): Promise<boolean> {
  const existing = await db.inviteEntry.findByCampaignAndContact(campaign.id, value);
  if (existing) return false;
  await db.inviteEntry.create({
    id: `ive_${randomId(10)}`,
    campaignId: campaign.id,
    contactType: type,
    contactValue: value,
    bonusAmountTzs: bonusAmountTzs ?? campaign.bonusAmountTzs,
    status: "QUEUED",
    sentAt: null,
    registeredUserId: null,
    bonusGrantId: null,
    failureReason: null,
    createdAt: new Date().toISOString(),
  });
  return true;
}

/** Add contacts to a DRAFT/SENT campaign. Skips duplicates already on the campaign. */
export async function addContacts(campaignId: string, text: string, adminId: string):
  Promise<{ ok: true; added: number; skipped: number; invalid: string[] } | { ok: false; error: string }> {
  const campaign = await db.inviteCampaign.findById(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };
  const { valid, invalid } = parseContacts(text);
  let added = 0, skipped = 0;
  for (const c of valid) {
    if (await addEntryIfNew(campaign, c.type, c.value, c.bonusAmountTzs)) added++;
    else skipped++;
  }
  if (added > 0) await db.inviteCampaign.incrementCounters(campaignId, { invites: added });
  audit({ category: "ADMIN", action: "invite.contacts_added", actorId: adminId, targetType: "InviteCampaign", targetId: campaignId, payload: { added, skipped, invalid: invalid.length } });
  return { ok: true, added, skipped, invalid };
}

/** A structured contact row from the redesigned admin form: an email and/or a
 *  phone (at least one), with an optional per-invitee bonus override. */
export type ContactRow = { email?: string | null; phone?: string | null; bonusAmountTzs?: number | null };

/**
 * Add contacts from the split email/phone form. Each row may carry an email, a
 * phone, or both — a row with both becomes TWO entries so the invitee is reached
 * on each channel. Validates/normalizes each value (email lowercased, phone →
 * E.164); a row with neither a valid email nor a valid phone is reported in
 * `invalid`. Skips contacts already on the campaign. This is the admin-proof
 * replacement for the error-prone single-textarea path.
 */
export async function addContactsStructured(campaignId: string, rows: ContactRow[], adminId: string):
  Promise<{ ok: true; added: number; skipped: number; invalid: number } | { ok: false; error: string }> {
  const campaign = await db.inviteCampaign.findById(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };
  let added = 0, skipped = 0, invalid = 0;
  for (const row of rows ?? []) {
    const amount = row.bonusAmountTzs && row.bonusAmountTzs > 0 ? Math.round(row.bonusAmountTzs) : undefined;
    const emailRaw = (row.email ?? "").trim();
    const phoneRaw = (row.phone ?? "").trim();
    const email = emailRaw ? classifyContact(emailRaw) : null;
    const phone = phoneRaw ? classifyContact(phoneRaw) : null;
    // A row must yield at least one valid channel of the kind the admin entered.
    const emailValid = !!email && email.type === "EMAIL";
    const phoneValid = !!phone && phone.type === "PHONE";
    if (!emailValid && !phoneValid) { invalid++; continue; }
    if (emailValid) { if (await addEntryIfNew(campaign, "EMAIL", email!.value, amount)) added++; else skipped++; }
    if (phoneValid) { if (await addEntryIfNew(campaign, "PHONE", phone!.value, amount)) added++; else skipped++; }
  }
  if (added > 0) await db.inviteCampaign.incrementCounters(campaignId, { invites: added });
  audit({ category: "ADMIN", action: "invite.contacts_added", actorId: adminId, targetType: "InviteCampaign", targetId: campaignId, payload: { added, skipped, invalid, structured: true } });
  return { ok: true, added, skipped, invalid };
}

/** Send all QUEUED entries (email via Postmark, phone via SMS). Best-effort per
 *  entry — a failed send marks that entry FAILED and the campaign continues.
 *
 *  SMS honesty: when no SMS provider is live (`smsConfigured()` is false), phone
 *  entries are left QUEUED and reported as `pending` rather than marked SENT —
 *  so the admin is never told "delivered" when nothing left the box. They go out
 *  automatically on the next Send once a provider (e.g. Selcom) is wired. */
export async function sendCampaign(campaignId: string, adminId: string):
  Promise<{ ok: true; sent: number; failed: number; pending: number } | { ok: false; error: string }> {
  // Serialize per campaign so two concurrent "Send" clicks can't both read the
  // same QUEUED entries and double-deliver an invite.
  return withLock(`invite-send:${campaignId}`, async () => {
  const campaign = await db.inviteCampaign.findById(campaignId);
  if (!campaign) return { ok: false as const, error: "Campaign not found." };
  if (campaign.status === "CANCELLED") return { ok: false as const, error: "Campaign is cancelled." };

  const smsLive = smsConfigured();
  await db.inviteCampaign.update(campaignId, { status: "SENDING" });
  const entries = (await db.inviteEntry.findByCampaign(campaignId)).filter((e) => e.status === "QUEUED");
  let sent = 0, failed = 0, pending = 0;
  for (const e of entries) {
    // No live SMS channel → leave phone invites QUEUED (they'll send once a
    // provider is configured). Never mark them SENT — that would lie to the admin.
    if (e.contactType === "PHONE" && !smsLive) { pending++; continue; }
    try {
      if (e.contactType === "EMAIL") {
        const r = await sendEmail({
          to: e.contactValue,
          subject: `You're invited to 50pick — TZS ${Math.round(e.bonusAmountTzs).toLocaleString("en-US")} bonus`,
          html: inviteHtml({ campaignName: campaign.name, bonusAmountTzs: e.bonusAmountTzs, code: campaign.code, message: campaign.messageEn }),
          tag: "invite",
        });
        if (!r.ok) throw new Error("email delivery failed");
      } else {
        await sms.send(e.contactValue, inviteMessage({ message: campaign.messageSw || campaign.messageEn, code: campaign.code, bonusTzs: e.bonusAmountTzs }));
      }
      await db.inviteEntry.update(e.id, { status: "SENT", sentAt: new Date().toISOString(), failureReason: null });
      sent++;
    } catch (err) {
      await db.inviteEntry.update(e.id, { status: "FAILED", failureReason: String((err as Error)?.message ?? err).slice(0, 200) });
      failed++;
    }
  }
  // SENDING → SENT once this pass is done. Pending phone invites stay QUEUED so a
  // later Send (after SMS is live) picks them up.
  await db.inviteCampaign.update(campaignId, { status: "SENT" });
  audit({ category: "ADMIN", action: "invite.campaign_sent", actorId: adminId, targetType: "InviteCampaign", targetId: campaignId, payload: { sent, failed, pending } });
  return { ok: true as const, sent, failed, pending };
  });
}

export async function cancelCampaign(campaignId: string, adminId: string):
  Promise<{ ok: true } | { ok: false; error: string }> {
  const campaign = await db.inviteCampaign.findById(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };
  await db.inviteCampaign.update(campaignId, { status: "CANCELLED" });
  audit({ category: "ADMIN", action: "invite.campaign_cancelled", actorId: adminId, targetType: "InviteCampaign", targetId: campaignId, payload: {} });
  return { ok: true };
}

/**
 * Bind a newly-registered user to an invite code: grant the campaign bonus
 * (idempotent by `invite:<campaignId>:<userId>`), mark the matching entry
 * REGISTERED, and bump the campaign's registered count. Best-effort and safe to
 * call from the registration path — returns the granted amount, or null if the
 * code is unknown/cancelled or no bonus was granted.
 */
export async function bindRegistration(userId: string, code: string, contact?: { phone?: string | null; email?: string | null }):
  Promise<{ grantedTzs: number } | null> {
  const campaign = await db.inviteCampaign.findByCode(code);
  if (!campaign || campaign.status === "CANCELLED") return null;

  // Match this user to a pre-listed entry (by phone or email) if one exists, to
  // pick up a per-invitee amount override and to mark delivery REGISTERED.
  let entry: StoredInviteEntry | null = null;
  if (contact?.phone) entry = await db.inviteEntry.findByCampaignAndContact(campaign.id, contact.phone);
  if (!entry && contact?.email) entry = await db.inviteEntry.findByCampaignAndContact(campaign.id, contact.email.trim().toLowerCase());

  const amount = entry?.bonusAmountTzs ?? campaign.bonusAmountTzs;
  const r = await creditBonus(userId, {
    amountTzs: amount,
    source: "INVITE",
    sourceRef: `invite:${campaign.id}:${userId}`, // idempotent — no double bonus
    wagerMultiplier: campaign.wagerMultiplier,
    expiryDays: campaign.expiresInDays,
    note: `Invite campaign "${campaign.name}"`,
  });
  if (!r.ok) return null;

  if (entry && entry.status !== "REGISTERED") {
    await db.inviteEntry.update(entry.id, { status: "REGISTERED", registeredUserId: userId, bonusGrantId: r.grant.id });
  }
  if (!r.deduped) {
    await db.inviteCampaign.incrementCounters(campaign.id, { registered: 1 });
  }
  audit({ category: "ADMIN", action: "invite.registered", actorId: userId, targetType: "InviteCampaign", targetId: campaign.id, payload: { grantedTzs: amount, deduped: r.deduped } });
  return { grantedTzs: amount };
}

// ── Admin read models ───────────────────────────────────────────────────────

export async function listCampaigns(limit = 200): Promise<StoredInviteCampaign[]> {
  return db.inviteCampaign.list(limit);
}

/** Lightweight preview for the registration page's "?invite=" banner. */
export async function getInvitePreview(code: string): Promise<{ name: string; bonusAmountTzs: number } | null> {
  const c = await db.inviteCampaign.findByCode(code);
  if (!c || c.status === "CANCELLED") return null;
  return { name: c.name, bonusAmountTzs: c.bonusAmountTzs };
}

export async function getCampaignDetail(campaignId: string): Promise<{
  campaign: StoredInviteCampaign;
  entries: StoredInviteEntry[];
  counts: Record<string, number>;
} | null> {
  const campaign = await db.inviteCampaign.findById(campaignId);
  if (!campaign) return null;
  const entries = await db.inviteEntry.findByCampaign(campaignId);
  const counts: Record<string, number> = {};
  for (const e of entries) counts[e.status] = (counts[e.status] ?? 0) + 1;
  return { campaign, entries, counts };
}

export async function getInviteStats(): Promise<{
  campaigns: number;
  totalInvites: number;
  totalRegistered: number;
  conversionPct: number;
}> {
  const all = await db.inviteCampaign.list(1000);
  const totalInvites = all.reduce((s, c) => s + c.totalInvites, 0);
  const totalRegistered = all.reduce((s, c) => s + c.totalRegistered, 0);
  return {
    campaigns: all.length,
    totalInvites,
    totalRegistered,
    conversionPct: totalInvites > 0 ? Math.round((totalRegistered / totalInvites) * 100) : 0,
  };
}
