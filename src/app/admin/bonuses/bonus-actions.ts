"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { tzPhone } from "@/lib/server/validators";
import { setBonusConfig, type BonusConfig } from "@/lib/server/bonus-config";
import { creditBonus, cancelGrant } from "@/lib/server/bonus-service";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  const u = await db.user.findById(s.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
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

/**
 * Manually grant a bonus to a player by phone number. Admin-gated inside the
 * action (defence-in-depth). Routes through bonus-service.creditBonus so the
 * grant is wagering-tracked and audited like every other bonus.
 */
export async function grantBonusToPlayerAction(input: GrantInput):
  Promise<{ ok: true; grantId: string; handle: string } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  const parse = GrantSchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input." };

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

  revalidatePath("/admin/bonuses");
  return { ok: true, grantId: r.grant.id, handle: user.displayName?.trim() || parse.data.phone };
}

/** Persist the bonus-program config (full object from the client form). */
export async function saveBonusConfigAction(config: BonusConfig) {
  const s = await ensureAdmin();
  const r = setBonusConfig(config, s.userId);
  revalidatePath("/admin/bonuses");
  return r;
}

/** Cancel an ACTIVE grant — removes its remaining bonus from the player's wallet. */
export async function cancelGrantAction(grantId: string):
  Promise<{ ok: true; removedTzs: number } | { ok: false; error: string }> {
  const s = await ensureAdmin();
  const r = await cancelGrant(grantId, s.userId, "Cancelled from admin bonuses page");
  revalidatePath("/admin/bonuses");
  return r;
}
