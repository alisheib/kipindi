// Does Node's fetch send the sec-fetch-* headers a caller sets, or its own? An in-process echo on an ephemeral port, one request.
import { createServer } from "node:http";
const srv = createServer((req, res) => { res.end(JSON.stringify(Object.fromEntries(Object.entries(req.headers).filter(([k]) => k.startsWith("sec-") || k === "upgrade-insecure-requests")))); });
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${srv.address().port}/`;
const plain = await fetch(url).then((r) => r.text());
const nav = await fetch(url, { headers: { "sec-fetch-mode": "navigate", "sec-fetch-dest": "document", "sec-fetch-site": "none", "sec-fetch-user": "?1", "upgrade-insecure-requests": "1" } }).then((r) => r.text());
srv.close();
console.log("no headers set:", plain);
console.log("navigation set:", nav);
