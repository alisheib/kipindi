import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const files = execSync('git grep -l "generateMetadata" -- src/app', { cwd: "F:/kipindi-r5d" }).toString().trim().split("\n");
for (const f of files) {
  const s = readFileSync("F:/kipindi-r5d/" + f, "utf8").replace(/\r\n/g, "\n");
  const at = s.search(/export\s+(?:async\s+)?function\s+generateMetadata|export\s+const\s+generateMetadata/);
  if (at < 0) { console.log(`--- ${f}: (re-export or import only)`); const l = s.split("\n").filter((x) => /generateMetadata/.test(x)); console.log(l.join("\n")); continue; }
  // find body by brace matching from first "{" after the signature's ")" + ":" ... approximate: find "{\n" after at
  let i = s.indexOf("{", s.indexOf(")", at));
  // skip the return-type annotation braces: find first "{" that begins the body: after "Promise<Metadata>" or ")"
  const sig = s.slice(at, i);
  let depth = 0, j = i;
  for (; j < s.length; j++) { if (s[j] === "{") depth++; else if (s[j] === "}") { depth--; if (depth === 0) break; } }
  const body = s.slice(at, j + 1);
  const flags = [];
  if (/catch/.test(body)) flags.push("CATCH");
  if (/notFound\(\)/.test(body)) flags.push("NOTFOUND()");
  if (/notFoundMetadata\(\)/.test(body)) flags.push("notFoundMetadata()");
  if (/await\s+(?!params|searchParams|getServerT)/.test(body)) flags.push("AWAIT");
  console.log(`--- ${f}: ${flags.join(" ")} (${body.split("\n").length} lines)`);
  if (flags.includes("CATCH") || flags.includes("NOTFOUND()") || flags.includes("notFoundMetadata()")) console.log(body);
}
