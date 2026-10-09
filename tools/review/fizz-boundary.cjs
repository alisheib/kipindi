// Throwaway: does React 19.2's server renderer (Next's compiled copy) draw a CLASS error boundary's fallback when a
// child throws inside a Suspense boundary, or does it emit the Suspense fallback marked for a client render?
const React = require("F:/kipindi-vis/node_modules/next/dist/compiled/react");
const { renderToPipeableStream } = require("F:/kipindi-vis/node_modules/next/dist/compiled/react-dom/server.node.js");
const { Writable } = require("node:stream");
const h = React.createElement;

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { nf: false }; }
  static getDerivedStateFromError(e) { if (e && e.digest === "NEXT_HTTP_ERROR_FALLBACK;404") return { nf: true }; throw e; }
  render() { return this.state.nf ? h("div", null, h("span", { hidden: true, id: "kp-not-found" }), "NOT FOUND UI") : this.props.children; }
}
function Page() { const e = new Error("NEXT_HTTP_ERROR_FALLBACK;404"); e.digest = "NEXT_HTTP_ERROR_FALLBACK;404"; throw e; }

const tree = h("html", null, h("body", null,
  h("header", null, "HEADER"),
  h(React.Suspense, { fallback: h("div", null, "LOADING SKELETON") }, h(Boundary, null, h(Page)))));

let html = "";
const sink = new Writable({ write(c, _e, cb) { html += c.toString(); cb(); } });
const s = renderToPipeableStream(tree, {
  onError(e) { console.log("onError:", e.digest || e.message); return e.digest; },
  onAllReady() { s.pipe(sink); sink.on("finish", () => {}); setTimeout(() => {
    console.log(html.replace(/<script[\s\S]*?<\/script>/g, "<script…>"));
    console.log("\nmark in server HTML:", html.includes("kp-not-found"), "| skeleton:", html.includes("LOADING SKELETON"), "| client-render marker ($!):", html.includes("<!--$!-->"));
  }, 50); },
});
