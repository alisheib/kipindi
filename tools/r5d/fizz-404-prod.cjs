// R5-D · F5 on React's PRODUCTION server renderer (the app's compiled copy): a notFound() inside a loading boundary,
// thrown before the shell is sent and after it — what the HTML carries.
const React = require("F:/kipindi-r5d/node_modules/next/dist/compiled/react");
const { renderToPipeableStream } = require("F:/kipindi-r5d/node_modules/next/dist/compiled/react-dom/server.node.js");
const { Writable } = require("node:stream");
const h = React.createElement;
const D = "NEXT_HTTP_ERROR_FALLBACK;404";
const nf = () => Object.assign(new Error(D), { digest: D });
const render = (Page, late) => new Promise((resolve) => {
  let out = ""; const sink = new Writable({ write(c, _e, cb) { out += c.toString(); cb(); } });
  const s = renderToPipeableStream(h("html", null, h("body", null, h("header", null, "chrome"), h(React.Suspense, { fallback: h("div", { id: "ghost" }, "ghost") }, h(Page)))),
    { onError: (e) => e && e.digest, onShellReady() { s.pipe(sink); late(); } });
  setTimeout(() => resolve(out), 150);
});
(async () => {
  console.log("NODE_ENV", process.env.NODE_ENV, "· build", require.resolve("F:/kipindi-r5d/node_modules/next/dist/compiled/react-dom/server.node.js"));
  const early = await render(() => { throw nf(); }, () => {});
  console.log("early :", /<template data-dgst="[^"]*"[^>]*><\/template>/.exec(early)?.[0]);
  let ready = false, go; const wait = new Promise((r) => { go = () => { ready = true; r(); }; });
  const late = await render(() => { if (!ready) throw wait; throw nf(); }, () => setTimeout(go, 20));
  const call = /\$RX\("([^"]+)","([^"]+)"/.exec(late);
  console.log("late  : template", /<template id="[^"]+"><\/template>/.exec(late)?.[0], "· $RX call", call && call.slice(1, 3).join(" / "));
})();
