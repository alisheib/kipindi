// page-text.mjs <url> — fetch a public page and print its readable text (styles, scripts and tags removed). Read-only.
const url = process.argv[2];
const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
let html = await r.text();
html = html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
html = html.replace(/<(br|p|div|li|h[1-6]|section|article|tr)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ");
const text = html.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l.length > 2).join("\n");
console.log(`status ${r.status}\n${text.slice(0, 12000)}`);
