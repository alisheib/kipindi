// railway-read.mjs — READ-ONLY: the 50pick service's latest production deployments (status, time, commit).
// The workspace token is read from F:\kipindi-main\.env.qa.local inside this process and never printed.
import { readFileSync } from "node:fs";
const env = readFileSync("F:/kipindi-main/.env.qa.local", "utf8");
const token = (env.match(/^RAILWAY_WORKSPACE_TOKEN=(.+)$/m) ?? [])[1]?.trim();
if (!token) { console.log("token: absent"); process.exit(2); }
const PROJECT = "5e87353c-1d59-433d-a683-a32b9149f74c";
const ENV = "372d937a-4bf1-43fc-919c-9c75a599067d";
const SERVICE = "baba8802-7f79-4306-9706-1e19a4b95e7c";
const gql = async (query) => {
  const r = await fetch("https://backboard.railway.com/graphql/v2", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return r.json();
};
const p = await gql(`query { project(id: "${PROJECT}") { name } }`);
console.log("token works for the project:", !!p?.data?.project?.name, p?.errors ? `errors: ${p.errors.map((e) => e.message).join("; ")}` : "");
const d = await gql(`query { deployments(first: 6, input: { projectId: "${PROJECT}", environmentId: "${ENV}", serviceId: "${SERVICE}" }) { edges { node { status createdAt meta } } } }`);
if (d.errors) { console.log("deployments errors:", d.errors.map((e) => e.message).join("; ")); process.exit(3); }
for (const { node } of d.data.deployments.edges) {
  const m = node.meta ?? {};
  console.log(node.createdAt, node.status.padEnd(10), String(m.commitHash ?? "").slice(0, 9), String(m.commitMessage ?? "").split("\n")[0].slice(0, 70));
}
