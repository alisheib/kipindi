// Throwaway: build the offline document with a hostile licence and run its two scripts in a vm with odd cookies.
import vm from "node:vm";
import { offlineDocument } from "file:///F:/kipindi-vis/src/lib/offline-document.ts";

const evil = `</script><script>alert(1)</script>"'&<b>`;
const doc = offlineDocument({ licenceNumber: evil });
console.log("raw evil present:", doc.includes(evil), "| <script> tags:", (doc.match(/<script>/g) ?? []).length, "| </script> tags:", (doc.match(/<\/script>/g) ?? []).length);
const scripts = [...doc.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
console.log("script count:", scripts.length);

function runHead(cookie: string, stored: string | null | "throw") {
  const docEl = { lang: "sw" };
  const document = { cookie, documentElement: docEl, title: "" };
  const localStorage = { getItem: (k: string) => { if (stored === "throw") throw new Error("blocked"); return k === "kp-locale" ? stored : null; } };
  vm.runInNewContext(scripts[0], { document, localStorage, RegExp, decodeURIComponent });
  return `${docEl.lang} / ${document.title}`;
}
const cases: Array<[string, string | null | "throw"]> = [
  ["", null], ["kp-locale=en", null], ["a=1; kp-locale=zh", null], ["xkp-locale=en", null], ["kp-locale=%E0%A4%A", "zh"],
  ["kp-locale=EN", "en"], ["kp-locale=fr", "throw"], ["kp-locale=%7A%68", null], ["kp-locale=en; kp-locale=zh", null], ["kp-locale=", "sw"],
];
for (const [c, s] of cases) console.log(JSON.stringify(c).padEnd(32), JSON.stringify(s).padEnd(8), "->", runHead(c, s));

function runBody(pathname: string, fire: "click" | "online") {
  const calls: string[] = [];
  const listeners: Record<string, () => void> = {};
  const btn = { addEventListener: (t: string, f: () => void) => { listeners["btn:" + t] = f; } };
  const location = { pathname, replace: (u: string) => calls.push("replace " + u), reload: () => calls.push("reload") };
  const window = { addEventListener: (t: string, f: () => void) => { listeners["win:" + t] = f; } };
  const document = { getElementById: (id: string) => (id === "kp-offline-retry" ? btn : null) };
  vm.runInNewContext(scripts[1], { location, window, document });
  (fire === "click" ? listeners["btn:click"] : listeners["win:online"])();
  return calls.join(",");
}
for (const p of ["/positions", "/offline", "/offline/", "/", "/OFFLINE"]) console.log("pathname", p.padEnd(12), "click:", runBody(p, "click"), "| online:", runBody(p, "online"));
