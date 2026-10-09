// Can RgConfirmSubmit render on the server, outside a form, and what does its trigger draw?
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { RgConfirmSubmit } = await import("file:///F:/kipindi-r4i/src/components/rg/rg-confirm-submit.tsx");
const { I } = await import("file:///F:/kipindi-r4i/src/components/ui/glyphs.tsx");
const out = renderToStaticMarkup(h("form", null, h(RgConfirmSubmit as never, { label: "Pumzika", body: "b", icon: h(I.pause, { s: 13 }), buttonClass: "btn btn-ghost btn-md", widthOf: "Jizuie" })));
console.log(out);
