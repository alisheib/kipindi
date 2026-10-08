/**
 * THE ANCHORS `red:ops-provision-staff` PLANTS — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array: `test:red-anchors` §3 audits that every anchor below still resolves EXACTLY ONCE
 * in `scripts/ops-provision-staff.mts`, without running the harness. ⚠️ NO SIDE EFFECTS: data only, repo-relative
 * POSIX paths.
 *
 * The harness plants each one in a COPY outside the repo and never rewrites the script itself, but its red mode writes
 * those copies, and §4's in-process class admits no file-writing call — so it counted among the harnesses whose anchors
 * nobody audits, and put `main` at 66 against the ceiling of 65 when it landed (`4bd4c728`). Declaring is how it
 * leaves that count, as `chat-safety` and `ticker-honesty` did. Moved out of `scripts/ops-provision-staff.test.mts` by
 * the Vodacom plan's S7 WP0 (2026-10-08), the strings byte for byte; `expect` names the claims each plant must fire.
 */
const SCRIPT = "scripts/ops-provision-staff.mts";

export const MUTATIONS = [
  { name: "the no-database refusal removed", file: SCRIPT, expect: ["P1"],
    from: "if (!process.env.DATABASE_URL) {", to: "if (false) {" },
  { name: "the production-environment refusal removed", file: SCRIPT, expect: ["P2a", "P2b"],
    from: 'if (has("--execute")) {', to: "if (false) {" },
  { name: "the git-ignore check always says yes", file: SCRIPT, expect: ["P3a", "P3b"],
    from: "function outsideOrIgnored(path: string): boolean {", to: "function outsideOrIgnored(path: string): boolean {\n  return true;" },
  { name: "a second password allowed into the secrets file", file: SCRIPT, expect: ["P3d"],
    from: "_PASSWORD=`, \"m\").test(", to: "_PASSWORD=NEVER`, \"m\").test(" },
  { name: "the store imported statically, before the rewrite", file: SCRIPT, expect: ["P4"],
    from: 'import type { StoredUser, StoredWallet } from "../src/lib/server/store.ts";', to: 'import { db as _early, type StoredUser, type StoredWallet } from "../src/lib/server/store.ts";' },
  { name: "the password printed in the secrets mode too", file: SCRIPT, expect: ["P4b"],
    from: "for (const c of created) console.log(`   ${c.role.padEnd(11)} ${c.phone}   ${c.id}`);", to: "for (const c of created) console.log(`   ${c.role.padEnd(11)} ${c.phone}   ${c.tempPassword}`);" },
];
