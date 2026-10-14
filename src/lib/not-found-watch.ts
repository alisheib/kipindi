/**
 * ⭐ A NOT-FOUND PAGE LIGHTS NO DESTINATION, BEFORE THE SCRIPTS RUN — without a root `:has()` (A21, 2026-10-14).
 *
 * `lib/not-found-mark.ts` has the why: once the scripts run, the journey's chrome reads the not-found mark and lights no
 * tab; before they run, only CSS can answer, and it must answer in two cases — an address no route matches (the server's
 * HTML carries the mark, `#kp-not-found`) and a record found missing inside a loading boundary (the HTML carries React's
 * record of the verdict on the boundary's `<template>`: `data-dgst="NEXT_HTTP_ERROR_FALLBACK;404"`, written by the
 * server, or set on the existing template by React's inline `$RX` script when the verdict streams in later).
 *
 * The rules read those two marks with `:root:has(#kp-not-found, template[data-dgst=…])` until 2026-10-14. A `:has()`
 * whose subject is the root made Chrome re-run the page's whole `:has()` invalidation set on <html> for every element
 * added anywhere (opening the bet sheet restyled 307 elements, twice; /live restyled 321–479 elements up to 15 times in
 * its first 3 s at 4× CPU). So the answer is now a flag on <html>, `data-not-found`, raised by THIS script:
 *  · rendered by the root layout as an inline script at the top of <body>, for a JOURNEY request only (the rules are the
 *    journey rail's and header's; a classic page's served bytes do not change);
 *  · it watches the document while it loads — a mark or a 404 template inserted, or `data-dgst` set on a template by
 *    `$RX` — and raises the flag in the microtask after that insertion, before the next frame is painted;
 *  · it stops watching at DOMContentLoaded (a streamed page has finished arriving) or at its first hit, so it costs
 *    nothing once the page is loaded;
 *  · `NotFoundMark` lowers the flag in the layout effect that announces the mark (the chrome's own answer turns in that
 *    commit, before its paint), so a page left on a client navigation never keeps a flag the CSS would still read.
 *
 * ⛔ HAND-WRITTEN ES5, NOT A SERIALISED FUNCTION: the inline script must be exactly these bytes in every build, and
 * `test:root-has` executes this very string against a controlled document. Pure module (no imports): the root layout
 * (server) and `NotFoundMark` (client) both load it.
 */

/** The attribute raised on <html> while a not-found page is in the document before the scripts run. */
export const NOT_FOUND_FLAG = "data-not-found";
/** Next's digest for `notFound()`, as React writes it on the errored boundary's template. */
export const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";
/** The mark's id — the same value as `NOT_FOUND_MARK` in `lib/not-found-mark.ts` (`test:root-has` holds them equal). */
export const NOT_FOUND_MARK_ID = "kp-not-found";
/** Either sign of a not-found page in the document. */
export const NOT_FOUND_QUERY = `#${NOT_FOUND_MARK_ID}, template[data-dgst="${NOT_FOUND_DIGEST}"]`;

/** The inline script (root layout, journey requests only). */
export const NOT_FOUND_WATCH_SCRIPT = `(function(){
var d=document,r=d.documentElement,f=${JSON.stringify(NOT_FOUND_FLAG)},q=${JSON.stringify(NOT_FOUND_QUERY)},g=${JSON.stringify(NOT_FOUND_DIGEST)};
if(d.querySelector(q)){r.setAttribute(f,"");return;}
if(typeof MutationObserver!=="function")return;
var w=new MutationObserver(function(rs){
for(var i=0;i<rs.length;i++){var x=rs[i];
if(x.type==="attributes"){var t=x.target;if(t.nodeName==="TEMPLATE"&&t.getAttribute("data-dgst")===g){r.setAttribute(f,"");w.disconnect();return;}continue;}
for(var j=0;j<x.addedNodes.length;j++){var n=x.addedNodes[j];if(n.nodeType===1&&(n.matches(q)||n.querySelector(q))){r.setAttribute(f,"");w.disconnect();return;}}}
});
w.observe(d,{childList:true,subtree:true,attributes:true,attributeFilter:["data-dgst"]});
d.addEventListener("DOMContentLoaded",function(){w.disconnect();},{once:true});
})();`;
