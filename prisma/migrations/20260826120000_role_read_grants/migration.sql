-- READ_TIERS overrides — Jay (Gaming Board) unit K, the SECOND permission axis.
-- Design + rulings: docs/READ-TIERS.md (§3.3 storage, §4a the rulings, §4c the cell).
--
-- ⭐ PURELY ADDITIVE — this is an EXPAND-only migration. One new table, no column is
-- dropped, no type is altered, no existing row changes value. Nothing reads this table
-- until the resolver ships, and with ZERO rows in it every role resolves to the code
-- defaults in roles.ts, which are the seed matrix. So the release that creates it is a
-- no-op for every existing surface, sign-in included.
--
-- ⛔ "readClass" IS TEXT ON PURPOSE AND MUST STAY TEXT. The classes are
-- 'money.figures', 'identity.contact', 'identity.personal', 'history.activity'.
-- A Postgres enum (and a Prisma one) cannot hold a dot, so making this an enum would
-- force a SECOND vocabulary — MONEY_FIGURES beside money.figures — for classes that
-- already have names, and two names for one thing is how a permission model acquires
-- two opinions. The resolver validates every row against READ_CLASSES and DISCARDS
-- anything it does not recognise, so an unrecognised string FAILS CLOSED (the field is
-- hidden) rather than granting a read.
--
-- ⚠️ "cell" is 'read' | 'masked' | 'none', and 'read' means "masked at rest, MAY
-- reveal" — NOT "sees the raw value". See §4c; the whole design turns on that.
CREATE TABLE IF NOT EXISTS "RoleReadGrant" (
    "role"      "UserRole"   NOT NULL,
    "readClass" TEXT         NOT NULL,
    "cell"      TEXT         NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "RoleReadGrant_pkey" PRIMARY KEY ("role", "readClass")
);
