// railway-deploy-main.mjs <full-sha> — asks Railway to deploy the 50pick service (production) at main's commit, because
// its GitHub trigger has created no deployment since the builder failure of 2026-10-20 16:02Z. Token read from
// F:\kipindi-main\.env.qa.local inside this process, never printed. Prints only the mutation's answer.
import { readFileSync } from "node:fs";
const sha = process.argv[2];
if (!/^[0-9a-f]{40}$/.test(sha ?? "")) { console.log("need a full 40-hex sha"); process.exit(2); }
const env = readFileSync("F:/kipindi-main/.env.qa.local", "utf8");
const token = (env.match(/^RAILWAY_WORKSPACE_TOKEN=(.+)$/m) ?? [])[1]?.trim();
const ENV = "372d937a-4bf1-43fc-919c-9c75a599067d";
const SERVICE = "baba8802-7f79-4306-9706-1e19a4b95e7c";
const r = await fetch("https://backboard.railway.com/graphql/v2", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: `mutation { serviceInstanceDeployV2(serviceId: "${SERVICE}", environmentId: "${ENV}", commitSha: "${sha}") }` }),
});
const j = await r.json();
console.log(j.errors ? `errors: ${j.errors.map((e) => e.message).join("; ")}` : `deployment requested: ${JSON.stringify(j.data)}`);
