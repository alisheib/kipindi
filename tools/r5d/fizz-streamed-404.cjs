// R5-D: the not-found verdict thrown AFTER the shell flushed (a slow read): what the HTML carries, and what $RX does.
const React = require("F:/kipindi-r5d/node_modules/next/dist/compiled/react");
const { renderToPipeableStream } = require("F:/kipindi-r5d/node_modules/next/dist/compiled/react-dom/server.node.js");
const { Writable } = require("node:stream");
const h = React.createElement;
let ready = false, resolve; const pending = new Promise((r) => { resolve = () => { ready = true; r(); }; });
function Page() { if (!ready) throw pending; const e = new Error("NEXT_HTTP_ERROR_FALLBACK;404"); e.digest = "NEXT_HTTP_ERROR_FALLBACK;404"; throw e; }
const tree = h("html", null, h("body", null, h("header", null, "HEADER"),
  h(React.Suspense, { fallback: h("div", null, "LOADING GHOST") }, h(Page))));
let html = ""; const chunks = [];
const sink = new Writable({ write(c, _e, cb) { html += c.toString(); chunks.push(c.toString()); cb(); } });
const s = renderToPipeableStream(tree, {
  onError(e) { return e && e.digest; },
  onShellReady() { s.pipe(sink); setTimeout(() => resolve(), 20); },
});
setTimeout(() => {
  const strip = (x) => x.replace(/<script>\$RX=[\s\S]*?<\/script>/, "<script>$RX=…</script>");
  console.log("first flush :", strip(chunks[0]).slice(0, 260));
  console.log("later flush :", strip(chunks.slice(1).join("")).slice(0, 300));
  // run the inline $RX on a stand-in template the way the browser does
  const rx = /\$RX=(function\([^)]*\)\{[\s\S]*?\});/.exec(html)?.[1];
  const call = /\$RX\("([^"]+)","([^"]+)"/.exec(html);
  const tpl = { dataset: {}, previousSibling: { data: "$?" } };
  const document = { getElementById: (id) => (id === call[1] ? tpl : null) };
  new Function("document", `var $RX=${rx}; $RX(${JSON.stringify(call[1])}, ${JSON.stringify(call[2])});`)(document);
  console.log("after $RX   : template", call[1], "dataset.dgst =", tpl.dataset.dgst, "| comment =", tpl.previousSibling.data);
}, 200);
