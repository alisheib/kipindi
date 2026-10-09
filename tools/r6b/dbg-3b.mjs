import { readFileSync } from "node:fs";
const read = (rel) => readFileSync("F:/kipindi-r6b/" + rel, "utf8");
const code = (src) => src.replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
const headersSrc = code(read("src/lib/security-headers.ts")), proxySrc = code(read("src/proxy.ts"));
console.log("hsts in headers:", /"Strict-Transport-Security": "max-age=\d+; includeSubDomains; preload"/.test(headersSrc));
console.log("import in proxy:", proxySrc.includes('import { PROD_HEADERS, SECURITY_HEADERS } from "@/lib/security-headers";'));
console.log("prod loop in proxy:", /for \(const \[k, v\] of Object\.entries\(PROD_HEADERS\)\) res\.headers\.set\(k, v\);/.test(proxySrc));
const i = proxySrc.indexOf("import { isStaffRole }"); console.log(JSON.stringify(proxySrc.slice(i, i + 200)));
console.log(JSON.stringify(headersSrc.slice(0, 300)));
