// railway-billing-read.mjs — READ-ONLY: the workspace's plan, current usage vs limit, latest invoices' status (totals in
// CENTS per RAILWAY-LIVE.md). Token read from .env.qa.local, never printed.
import { readFileSync } from "node:fs";
const env = readFileSync("F:/kipindi-main/.env.qa.local", "utf8");
const token = (env.match(/^RAILWAY_WORKSPACE_TOKEN=(.+)$/m) ?? [])[1]?.trim();
const gql = async (query) => (await fetch("https://backboard.railway.com/graphql/v2", {
  method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
})).json();
const p = await gql(`query { project(id: "5e87353c-1d59-433d-a683-a32b9149f74c") { workspaceId } }`);
const ws = p?.data?.project?.workspaceId;
console.log("workspace id found:", !!ws, p.errors ? p.errors.map((e) => e.message).join("; ") : "");
if (!ws) process.exit(2);
const w = await gql(`query { workspace(workspaceId: "${ws}") { plan customer { currentUsage usageLimit { softLimit hardLimit } invoices { status total } } } }`);
if (w.errors) { console.log("errors:", w.errors.map((e) => e.message).join("; ")); }
const c = w?.data?.workspace?.customer;
console.log("plan:", w?.data?.workspace?.plan, "| current usage (cents):", c?.currentUsage, "| limit:", JSON.stringify(c?.usageLimit));
for (const inv of (c?.invoices ?? []).slice(0, 4)) console.log("invoice:", inv.status, "total(cents):", inv.total);
