import { NeedleBody } from "file:///F:/kipindi-r3b/src/lib/needle-physics.js";
import { reseat } from "file:///F:/kipindi-r3b/src/lib/needle-rest.ts";
const vp = { w: 390, h: 780 };
const b = new NeedleBody({ size: 60, bounds: () => ({ w: vp.w, h: vp.h, insets: { top: 0, right: 0, bottom: 0, left: 0 } }) });
b.y = 600; b.snapPark("right");
const g = () => { const L = b.limits(); return { minX: L.minX, maxX: L.maxX, minY: L.minY, maxY: L.maxY, size: b.size }; };
const before = g();
b.parked = false; b.parking = true; b.target = { x: b.x, y: 700 };
for (let i = 0; i < 6; i++) b.advance(1000/60);
const x0 = b.x, y0 = b.y;
vp.h = 700; b.reclamp();
const after = g();
const r = reseat({ before, after, edge: b.edge, parked: b.parked, parking: b.parking, held: false, moving: b.moving, x: x0, y: y0, target: b.target });
console.log(JSON.stringify(r), x0, y0, JSON.stringify(after));
if (r.kind === "aim") b.target = r.target;
let n = 0; for (; n < 900; n++) { b.advance(1000/60); if (!b.awake) break; }
console.log("frames", n, "x", b.x, "y", b.y, "parked", b.parked, "parking", b.parking, "edge", b.edge, "stillFor", b.stillFor);

