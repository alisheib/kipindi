import { readFileSync, writeFileSync } from "node:fs";
const raw = readFileSync("50pick-Identity-Sprint.html","utf8");
// the template is the last <script type="__bundler/template"> ... </script>
const m = raw.match(/<script type="__bundler\/template">\s*([\s\S]*?)<\/script>/);
if(!m){ console.log("no template found"); process.exit(1); }
let s = m[1].trim();
// it's a JSON string literal (starts with ")
const html = JSON.parse(s);
writeFileSync("scripts/_identity-decoded.html", html, "utf8");
console.log("decoded length:", html.length);
// find the identity / avatar component sections — look for JS that builds the avatar
const idx = html.search(/function .*[Aa]vatar|sigil|crest|hashFor|seedFor|TIER|FRAME|RING|buildAvatar|Identity/);
console.log("first identity-logic hit at char:", idx);
