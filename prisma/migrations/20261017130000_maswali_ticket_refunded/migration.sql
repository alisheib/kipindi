-- MASWALI MILLIONEA — R1: a ticket refunded with its voided week is REFUNDED (MASWALI-BUILD R1, 2026-10-17).
--
-- @drops constraint:MaswaliTicket_status_check · owner docs/MASWALI-PLAN.md
--
-- "MaswaliTicket"."status" gains REFUNDED: the week void's bulk refund (`refundVoidedWeek`, src/lib/server/maswali-void.ts)
-- moves every LIVE ticket of a VOIDED week to it in the same transaction as the money — the position's VOID, the wallet
-- credit, the BET_REFUND row, the ledger group and the market's settled stamp. This widens the CHECK, and nothing else.
--
-- Re-runnable: the old CHECK is dropped IF EXISTS and the wider one added in the same transaction, so a replay drops the
-- wider one and adds it again. Every existing row is LIVE, CANCELLED or SETTLED and passes. Millionea is dark, so the
-- table holds no production row; the brief ACCESS EXCLUSIVE lock and the validating scan cost nothing.
-- "MaswaliTicket_cancelled_check" is untouched: a REFUNDED ticket carries no cancelledAt, exactly as a LIVE one.
BEGIN;
SET LOCAL lock_timeout = '3s';

ALTER TABLE "MaswaliTicket" DROP CONSTRAINT IF EXISTS "MaswaliTicket_status_check";
ALTER TABLE "MaswaliTicket" ADD CONSTRAINT "MaswaliTicket_status_check" CHECK ("status" IN ('LIVE', 'CANCELLED', 'SETTLED', 'REFUNDED'));

COMMIT;
