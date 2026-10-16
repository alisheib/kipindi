---
name: 50pick-audit
description: Safe operations for the 50pick (kipindi) real-money platform — a pointer. Releases, migrations, production data and the money invariants are in AGENTS.md at the repository root; read it before any database, migration, deploy or money work.
---

# 50pick — safe operations → `AGENTS.md`

What this playbook used to hold is stated once, in [`AGENTS.md`](../../../AGENTS.md): §4 how a release goes out and
is read back, §5 production data and schema changes, §6 the money invariants. The procedures live with their owners:
[`docs/BACKUP-RUNBOOK.md`](../../../docs/BACKUP-RUNBOOK.md) (backups, `verify:backup-schema`),
[`scripts/load/README.md`](../../../scripts/load/README.md) (the disposable PostgreSQL and cross-instance proofs),
[`docs/RAILWAY-LIVE.md`](../../../docs/RAILWAY-LIVE.md) (production). This file adds nothing and overrides nothing.
