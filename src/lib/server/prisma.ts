/**
 * Prisma client singleton.
 *
 * Lazy-loaded — DATABASE_URL is the gate. When unset (local dev without
 * Postgres) every consumer gracefully no-ops and the disk snapshot path
 * remains the source of truth. With DATABASE_URL set (Railway), the
 * snapshot is mirrored into the StoreSnapshot table so data survives
 * container restarts.
 */
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_PRISMA: PrismaClient | undefined;
}

export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

export function prisma(): PrismaClient | null {
  if (!hasDatabase()) return null;
  if (globalThis.__50PICK_PRISMA) return globalThis.__50PICK_PRISMA;
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });
  if (process.env.NODE_ENV !== "production") globalThis.__50PICK_PRISMA = client;
  return client;
}
