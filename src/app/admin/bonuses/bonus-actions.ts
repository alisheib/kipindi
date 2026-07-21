"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { tzPhone } from "@/lib/server/validators";
import { setBonusConfig, type BonusConfig } from "@/lib/server/bonus-config";
import { creditBonus, cancelGrant } from "@/lib/server/bonus-service";
import { MONEY_ROLES } from "@/lib/server/roles";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { audit } from "@/lib/server/audit";

const ADMIN_ROLES = MONEY_ROLES; // role tier — see @/lib/server/roles

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  const u = await db.user.findById(s.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
  await requireAdminTotp(s.userId, s.sessionId); // B3: 2FA at the action layer
  return s;
}

const GrantSchema = z.object({
  phone: tzPhone,
  amountTzs: z.number().int().positive().max(100_000_000),
  wagerMultiplier: z.number().min(1).max(100).optional(),
  expiryDays: z.number().int().min(0).max(365).optional(),
  note: z.string().trim().max(200).optional(),
});

export type GrantInput = z.input<typeof GrantSchema>;

export async function grantBonusToPlayerAction(input: GrantInput):
  Promise<{ ok: true; grantId: string; handle: string } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  const parse = GrantSchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input." };

  try {
    const user = await db.user.findByPhone(parse.data.phone);
    if (!user) return { ok: false, error: `No player found with ${parse.data.phone}.` };

    const r = await creditBonus(user.id, {
      amountTzs: parse.data.amountTzs,
      source: "ADMIN",
      wagerMultiplier: parse.data.wagerMultiplier,
      expiryDays: parse.data.expiryDays,
      note: parse.data.note ? `Admin grant by ${s.userId}: ${parse.data.note}` : `Admin grant by ${s.userId}`,
    });
    if (!r.ok) return { ok: false, error: r.error };

    // Non-repudiation: creditBonus() audits `bonus.credited` against the RECIPIENT
    // (the money event). Emit a second ADMIN entry attributed to the granting
    // OFFICER so an "what did officer X do?" query surfaces this money issuance
    // (mirrors cancelGrant, which already records the officer as actorId).
    audit({
      category: "ADMIN",
      action: "bonus.granted_by_officer",
      actorId: s.userId,
      targetType: "User",
      targetId: user.id,
      payload: {
        grantId: r.grant.id,
        amountTzs: parse.data.amountTzs,
        wagerMultiplier: parse.data.wagerMultiplier ?? null,
        expiryDays: parse.data.expiryDays ?? null,
      },
    });

    revalidatePath("/admin/bonuses");
    return { ok: true, grantId: r.grant.id, handle: user.displayName?.trim() || parse.data.phone };
  } catch (err) {
    return { ok: false, error: safeError(err, "Grant failed") };
  }
}

export async function saveBonusConfigAction(config: BonusConfig) {
  const s = await ensureAdmin();
  try {
    const r = setBonusConfig(config, s.userId);
    revalidatePath("/admin/bonuses");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Config save failed") };
  }
}

export async function cancelGrantAction(grantId: string):
  Promise<{ ok: true; removedTzs: number } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  try {
    const r = await cancelGrant(grantId, s.userId, "Cancelled from admin bonuses page");
    revalidatePath("/admin/bonuses");
    return r;
  } catch (err) {
    return { ok: false, error: safeError(err, "Cancel failed") };
  }
}
