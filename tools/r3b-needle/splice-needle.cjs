// Splices the R3-B rest changes into needle.tsx, keeping CRLF. Every anchor must match exactly once.
const fs = require("fs");
const path = require("path");
const FILE = "F:/kipindi-r3b/src/components/layout/needle.tsx";
const HERE = __dirname;
let s = fs.readFileSync(FILE, "utf8");
if (s.includes("\r\n") === false) throw new Error("expected CRLF");
s = s.replace(/\r\n/g, "\n");

function once(hay, needle, label) {
  const i = hay.indexOf(needle);
  if (i < 0) throw new Error(`anchor missing: ${label}`);
  if (hay.indexOf(needle, i + 1) >= 0) throw new Error(`anchor twice: ${label}`);
  return i;
}
function replace(from, to, label) {
  once(s, from, label);
  s = s.replace(from, () => to);
}

// 1 · the import
replace(
  `import { PEPSI_PATHS, PEPSI_TRANSFORM } from "@/lib/needle-art";\n`,
  `import { PEPSI_PATHS, PEPSI_TRANSFORM } from "@/lib/needle-art";\nimport { censusPad, decideRest, glowReach, railRange, reseat, type Box, type Geometry } from "@/lib/needle-rest";\n`,
  "import",
);

// 2 · the rest block (E-400 ① … scheduleClear), replaced whole
const start = once(s, "  /* ── ⭐ E-400 ① · COME TO REST WHERE NOTHING IS UNDER IT", "block start");
const end = once(s, "  let saved: { x?: number; y?: number; edge?: string } | null = null;", "block end");
const block = fs.readFileSync(path.join(HERE, "block-rest.ts"), "utf8").replace(/\r\n/g, "\n");
s = s.slice(0, start) + block + "\n" + s.slice(end);

// 3 · onPark: a check asked for mid-glide runs on landing
replace(
  `    // A rest glide (E-400 ①) ends in the engine's own park, so it lands here too: no haptic for it — the player did
    // nothing — and no re-check, or a glide could chain into another.
    onPark: () => { if (gliding) { gliding = false; glideQuietUntil = performance.now() + 2000; save(); return; } haptic("tuck"); save(); scheduleClear(); },`,
  `    // A rest glide (E-400 ①) ends in the engine's own park, so it lands here too: no haptic for it — the player did
    // nothing — and no re-check of its own, or a glide could chain into another. ⭐ R3-B: a check something ELSE asked
    // for while it glided (a scroll under it, a resize, a route, a panel) runs now, on the page as it is.
    onPark: () => {
      if (gliding) {
        gliding = false;
        glideQuietUntil = performance.now() + 2000;
        save();
        if (recheckOnLand) { recheckOnLand = false; scheduleClear(); }
        return;
      }
      recheckOnLand = false;
      haptic("tuck"); save(); scheduleClear();
    },`,
  "onPark",
);

// 4 · applyViewport: re-seat a disc on its way to a rest
replace(
  `  function applyViewport() {
    const d = diameter();
    if (d !== body.size) body.setSize(d);
    el.style.setProperty("--nsize", d + "px");
    el.style.setProperty("--inlay", (2.6 * (88 / d)).toFixed(2));
    el.style.setProperty("--halo", haloInset() + "%");
    el.style.setProperty("--needlew", (4.4 * Math.max(1, 74 / d)).toFixed(2));
    body.reclamp();
    paint(0);
  }`,
  `  /* ⭐ R3-B ① · A VIEWPORT CHANGE RE-SEATS A DISC ON ITS WAY TO A REST; IT NEVER STRANDS ITS TARGET. Measured on the
     round-3 tiles, the hub drive resizing 320 → 360 → 390 → 1024 → 1280 in one document: a glide in flight at each
     resize kept the tuck x of the width it started at — x≈293 at 360 (the 320 tuck, 295), x≈330 at 390 (the wall, 296)
     — and after 390 → 1024 the engine saw the disc at x≈358 "not tucked", judged it by its centre (392 < 512) and sent
     it LEFT, caught mid-way at x≈241 on the Toka button (299); \`save()\` then kept the left edge for every later page
     (300–317, round 2's 299 and 304 the same). \`reseat\` (needle-rest.ts) decides; \`laidOut\` is the geometry the
     pose and the target were set in, read BEFORE the change, because \`limits()\` already answers for the new one. */
  let laidOut: Geometry | null = null;
  const geometry = (): Geometry => {
    const L = body.limits();
    return { minX: L.minX, maxX: L.maxX, minY: L.minY, maxY: L.maxY, size: body.size };
  };
  function applyViewport() {
    const before = laidOut;
    const x0 = body.x, y0 = body.y;
    const d = diameter();
    if (d !== body.size) body.setSize(d);
    el.style.setProperty("--nsize", d + "px");
    el.style.setProperty("--inlay", (2.6 * (88 / d)).toFixed(2));
    el.style.setProperty("--halo", haloInset() + "%");
    el.style.setProperty("--needlew", (4.4 * Math.max(1, 74 / d)).toFixed(2));
    body.reclamp();
    const after = geometry();
    if (before && (before.minX !== after.minX || before.maxX !== after.maxX || before.minY !== after.minY
      || before.maxY !== after.maxY || before.size !== after.size)) {
      const r = reseat({ before, after, edge: body.edge, parked: body.parked, parking: body.parking, held: !!body.held,
        moving: body.moving, x: x0, y: y0, target: body.target });
      if (r.kind === "rest") { body.y = r.y; body.snapPark(body.edge); endGlide(); save(); }
      else if (r.kind === "aim") body.target = r.target;
    }
    laidOut = after;
    paint(0);
  }`,
  "applyViewport",
);

// 5 · the surface observer, beside the other triggers
replace(
  `  on(window, "resize", (() => scheduleClear(260)) as EventListener);
  scheduleClear(900);
`,
  `  on(window, "resize", (() => scheduleClear(260)) as EventListener);
  scheduleClear(900);
  /* ⭐ R3-B ③ · A SURFACE THAT OPENS OR GOES IS A REASON TO LOOK AGAIN. Scroll, resize, a route and a park were the
     only triggers, and a panel opens with none of them — the channels panel, 45 s into a visit (321). A floating
     surface mounting, unmounting, or gaining or losing its marker or role asks for a check once its entrance has
     played (\`.m-float-in\` is --t-quick, 140ms). Filtered to those surfaces: a live ticker's re-render costs one
     \`matches\` per added element. */
  const SURFACE_SETTLE = 200;
  const POPUP_ROLE = /^(dialog|alertdialog|menu|listbox)$/;
  const surfaceObserver = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "attributes") {
        const t = r.target as Element;
        const was = r.attributeName === "role" && POPUP_ROLE.test(r.oldValue ?? "");
        const marker = r.attributeName === "data-needle-keepout" || r.attributeName === "data-invitation";
        if (was || marker || t.matches(SURFACES) || t.querySelector(SURFACES)) { scheduleClear(SURFACE_SETTLE); return; }
        continue;
      }
      for (const list of [r.addedNodes, r.removedNodes]) {
        for (const n of list) {
          if (n.nodeType !== Node.ELEMENT_NODE) continue;
          const e = n as Element;
          if (e.matches(SURFACES) || e.querySelector(SURFACES)) { scheduleClear(SURFACE_SETTLE); return; }
        }
      }
    }
  });
  surfaceObserver.observe(document.body, {
    subtree: true, childList: true, attributes: true, attributeOldValue: true,
    attributeFilter: ["open", "hidden", "role", "data-needle-keepout", "data-invitation"],
  });
`,
  "observer",
);

// 6 · the API: a read for drives
replace(
  `  // Platform API — mount once, these are the only two calls a page makes.
  const api = {
    session: (minutes: number) => { if (body.setSession(minutes)) { paint(0); if (!isSuppressed()) start(); } },
    acknowledge: () => { if (body.acknowledge() && !isSuppressed()) start(); },
  };`,
  `  // Platform API — mount once, these are the only two calls a page makes.
  const api = {
    session: (minutes: number) => { if (body.setSession(minutes)) { paint(0); if (!isSuppressed()) start(); } },
    acknowledge: () => { if (body.acknowledge() && !isSuppressed()) start(); },
    /** ⭐ R3-B · A READ FOR DRIVES, NEVER A CALL A PAGE MAKES: true when nothing about the rest is pending — tucked, no
        check waiting, no glide, the loop asleep — or when the Needle is hidden. \`qa:journey-shell\` waits on it before a
        tile, so a tile shows the rest and not a glide on its way there (round 3's 194 was one). */
    resting: () => isSuppressed() || (body.parked && !body.held && !gliding && clearTimer === null && raf === null),
  };`,
  "api",
);

// 7 · cleanup
replace(
  `    if (clearTimer !== null) window.clearTimeout(clearTimer);
    motionGateObserver.disconnect();`,
  `    if (clearTimer !== null) window.clearTimeout(clearTimer);
    surfaceObserver.disconnect();
    motionGateObserver.disconnect();`,
  "cleanup",
);

fs.writeFileSync(FILE, s.replace(/\n/g, "\r\n"), "utf8");
console.log("spliced; lines:", s.split("\n").length);
