/** Aggregate out-<surface>/*.json into cross-page consistency tables.  node analyze.mjs admin|player [section] */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SURFACE = process.argv[2] || "admin";
const SECTION = process.argv[3] || "all";
const DIR = path.join(HERE, "..", "..", ".qa-design-gate", `out-${SURFACE}`);
const recs = readdirSync(DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8"))).filter((r) => r.m1440);
const want = (s) => SECTION === "all" || SECTION === s;
const hist = (arr, key) => { const h = {}; for (const a of arr) { const k = key(a); h[k] = (h[k] || 0) + 1; } return Object.entries(h).sort((a, b) => b[1] - a[1]); };
const short = (s, n = 70) => (s || "").slice(0, n);
console.log(`# ${SURFACE}: ${recs.length} pages measured\n`);

if (want("status")) {
  console.log("## status / overflow / errors");
  for (const r of recs) console.log(`${r.route.padEnd(40)} ${r.status} ${r.finalUrl !== undefined && !r.finalUrl.endsWith(r.route) ? "→ " + r.finalUrl.replace(/^https?:\/\/[^/]+/, "") : ""} ovf1440=${r.m1440.overflow.sw - r.m1440.overflow.cw} ovf390=${r.overflow390 ? r.overflow390.sw - r.overflow390.cw : "?"} ovf1920=${r.overflow1920 ? r.overflow1920.sw - r.overflow1920.cw : "?"} err=${(r.errors || []).length}${(r.errors || []).length ? " " + short(r.errors[0], 80) : ""}`);
  console.log();
}

if (want("heights")) {
  console.log("## control heights by kind (1440, outside tables & shell)");
  for (const kind of ["button", "field", "chip", "pill", "tab", "switch", "checkbox", "nav"]) {
    const all = recs.flatMap((r) => r.m1440.controls.filter((c) => c.kind === kind && !c.inTable && !c.inShell).map((c) => ({ ...c, route: r.route })));
    if (!all.length) continue;
    console.log(`\n### ${kind} (${all.length})`);
    for (const [h, n] of hist(all, (c) => c.h)) {
      const ex = all.filter((c) => c.h == h);
      const routes = [...new Set(ex.map((c) => c.route))].slice(0, 5).join(" ");
      const clsH = hist(ex, (c) => short(c.cls.replace(/\b(disabled:|focus-visible:)[^ ]+/g, "").trim(), 60)).slice(0, 3).map(([c, k]) => `${k}× "${c}"`).join(" | ");
      console.log(`  h=${String(h).padStart(5)}  n=${String(n).padStart(3)}  fs=${[...new Set(ex.map((c) => c.fs))].join("/")}  ${routes}\n           ${clsH}`);
    }
  }
  console.log();
}

if (want("rows")) {
  console.log("## rows whose controls differ in height (1440, outside shell)");
  for (const r of recs) for (const g of r.m1440.rowGroups.filter((g) => !g.inShell)) {
    console.log(`- ${r.route}  spread=${g.spread}  parent=${g.parent} [${short(g.parentCls, 60)}]${g.inTable ? " (table)" : ""}`);
    for (const it of g.items.slice(0, 8)) console.log(`      ${it.kind.padEnd(8)} h=${String(it.h).padStart(5)} w=${String(it.w).padStart(6)} fs=${it.fs} "${short(it.text, 28)}" [${short(it.cls, 70)}]`);
  }
  console.log("\n## rows differing at 390");
  for (const r of recs) for (const g of (r.m390?.rowGroups || []).filter((g) => !g.inShell)) {
    console.log(`- ${r.route}  spread=${g.spread}  [${short(g.parentCls, 50)}]  ${g.items.slice(0, 6).map((it) => `${it.kind}:${it.h}"${short(it.text, 14)}"`).join(" · ")}`);
  }
  console.log();
}

if (want("headings")) {
  console.log("## h1 per page");
  for (const r of recs) { const h = r.m1440.headings.filter((h) => h.tag === "h1"); console.log(`${r.route.padEnd(40)} ${h.map((x) => `${x.fs}px/${x.ff}/${x.fw} ls=${x.ls} "${short(x.text, 30)}"`).join(" | ") || "(no h1)"}  h1@390=${(r.m390?.headings || []).map((x) => x.fs).join("/")}`); }
  console.log("\n## h2 / h3 styles (page content)");
  for (const tag of ["h2", "h3", "h4"]) {
    const all = recs.flatMap((r) => r.m1440.headings.filter((h) => h.tag === tag && !h.inShell).map((h) => ({ ...h, route: r.route })));
    console.log(`\n### ${tag} (${all.length})`);
    for (const [k, n] of hist(all, (h) => `${h.fs}px ${h.ff} ${h.fw} ${h.tt !== "none" ? h.tt : ""}`)) console.log(`  ${String(n).padStart(3)}× ${k}   e.g. ${all.filter((h) => `${h.fs}px ${h.ff} ${h.fw} ${h.tt !== "none" ? h.tt : ""}` === k).slice(0, 3).map((h) => `${h.route}:"${short(h.text, 22)}"`).join(", ")}`);
  }
  console.log();
}

if (want("labels")) {
  console.log("## small UPPERCASE label/eyebrow styles across pages (fs ff fw ls color)");
  const agg = {};
  for (const r of recs) for (const [k, v] of Object.entries(r.m1440.upper)) { agg[k] ??= { n: 0, pages: new Set(), ex: [] }; agg[k].n += v.n; agg[k].pages.add(r.route); if (agg[k].ex.length < 3) agg[k].ex.push(...v.ex.slice(0, 2)); }
  for (const [k, v] of Object.entries(agg).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${String(v.n).padStart(4)}× on ${String(v.pages.size).padStart(2)} pages  ${k}   e.g. ${v.ex.slice(0, 3).map((e) => `"${short(e, 20)}"`).join(", ")}`);
  console.log("\n## <label> styles");
  const labs = recs.flatMap((r) => r.m1440.labels.map((l) => ({ ...l, route: r.route })));
  for (const [k, n] of hist(labs, (l) => `${l.fs}px ${l.ff} ${l.fw} ${l.tt} ls=${l.ls} ${l.color}`)) console.log(`  ${String(n).padStart(3)}× ${k}  e.g. ${labs.filter((l) => `${l.fs}px ${l.ff} ${l.fw} ${l.tt} ls=${l.ls} ${l.color}` === k).slice(0, 2).map((l) => `${l.route}:"${short(l.text, 18)}"`).join(", ")}`);
  console.log();
}

if (want("type")) {
  console.log("## type census: distinct font sizes in page content");
  const agg = {};
  for (const r of recs) for (const [k, n] of Object.entries(r.m1440.type)) { agg[k] = (agg[k] || 0) + n; }
  const sizes = {};
  for (const [k, n] of Object.entries(agg)) { const [fs, ff, fw] = k.split("|"); sizes[fs] ??= { n: 0, faces: {} }; sizes[fs].n += n; sizes[fs].faces[`${ff}/${fw}`] = (sizes[fs].faces[`${ff}/${fw}`] || 0) + n; }
  for (const [fs, v] of Object.entries(sizes).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) console.log(`  ${String(fs).padStart(5)}px  n=${String(v.n).padStart(5)}  ${Object.entries(v.faces).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f}:${n}`).join("  ")}`);
  console.log(`  distinct sizes: ${Object.keys(sizes).length}`);
  console.log("\n  per page distinct sizes:");
  for (const r of recs) console.log(`    ${r.route.padEnd(40)} ${new Set(Object.keys(r.m1440.type).map((k) => k.split("|")[0])).size}`);
  console.log();
}

if (want("cards")) {
  console.log("## card/panel geometry (radius × padding × border × shadow)");
  const all = recs.flatMap((r) => r.m1440.cards.map((c) => ({ ...c, route: r.route })));
  for (const [k, n] of hist(all, (c) => `r=${c.br} p=${c.p} b=${c.bs === "none" ? "none" : c.bw + "px " + c.bs} sh=${c.shadow ? "y" : "n"}`).slice(0, 40)) console.log(`  ${String(n).padStart(4)}× ${k}   e.g. ${all.filter((c) => `r=${c.br} p=${c.p} b=${c.bs === "none" ? "none" : c.bw + "px " + c.bs} sh=${c.shadow ? "y" : "n"}` === k).slice(0, 2).map((c) => `${c.route}[${short(c.cls, 40)}]`).join(", ")}`);
  console.log("\n  radii:", hist(all, (c) => c.br).map(([k, n]) => `${k}:${n}`).join("  "));
  console.log();
}

if (want("tables")) {
  console.log("## tables");
  for (const r of recs) for (const t of r.m1440.tables) console.log(`- ${r.route.padEnd(36)} adminTbl=${t.adminTbl ? "Y" : "N"} cols=${t.cols} th=${t.thFs}px/${t.thPad}/${t.thTT} td=${t.tdFs}px/${t.tdPad} rows=[${t.rows.join(",")}] hoverCells=${t.hoverCells} hoverRows=${t.hoverRows} w=${t.w}/${t.wrapW} ovf=${t.wrapOverflow} [${short(t.wrapCls, 40)}]`);
  console.log();
}

if (want("sections")) {
  console.log("## vertical gaps between page sections (px → pages)");
  const all = recs.flatMap((r) => r.m1440.sections.map((s) => ({ ...s, route: r.route })));
  for (const [k, n] of hist(all, (s) => s.gap)) console.log(`  ${String(k).padStart(6)}px  n=${String(n).padStart(3)}  ${[...new Set(all.filter((s) => s.gap == k).map((s) => s.route))].slice(0, 6).join(" ")}`);
  console.log();
}

if (want("truncated")) {
  console.log("## truncated text (1440)");
  for (const r of recs) for (const t of r.m1440.truncated.slice(0, 6)) console.log(`- ${r.route.padEnd(36)} "${short(t.text, 40)}" needs ${t.need} has ${t.w} [${short(t.cls, 50)}]`);
  console.log("\n## truncated text (390)");
  for (const r of recs) for (const t of (r.m390?.truncated || []).slice(0, 6)) console.log(`- ${r.route.padEnd(36)} "${short(t.text, 40)}" needs ${t.need} has ${t.w} [${short(t.cls, 50)}]`);
  console.log();
}

if (want("hover")) {
  console.log("## hover probe: interactive elements with NO visual hover response");
  const all = recs.flatMap((r) => (r.hover || []).map((h) => ({ ...h, route: r.route })));
  const none = all.filter((h) => h.changed.length === 0);
  console.log(`  probed=${all.length}  no-response=${none.length}  cursor-not-pointer=${all.filter((h) => h.cursor !== "pointer").length}`);
  for (const [k, n] of hist(none, (h) => `${h.tag} [${short(h.cls, 60)}]`).slice(0, 40)) console.log(`  ${String(n).padStart(3)}× ${k}  e.g. ${none.filter((h) => `${h.tag} [${short(h.cls, 60)}]` === k).slice(0, 2).map((h) => `${h.route}:"${short(h.text, 18)}"`).join(", ")}`);
  console.log("\n  hover vocabularies (which properties change):");
  for (const [k, n] of hist(all.filter((h) => h.changed.length), (h) => h.changed.join("+"))) console.log(`  ${String(n).padStart(4)}× ${k}`);
  console.log("\n  elements with pointer cursor missing:");
  for (const [k, n] of hist(all.filter((h) => h.cursor !== "pointer" && h.tag !== "a"), (h) => `${h.tag} [${short(h.cls, 50)}]`).slice(0, 15)) console.log(`  ${String(n).padStart(3)}× ${k}`);
  console.log();
}

if (want("nav")) {
  console.log("## nav links (shell) — sample from first page");
  const r = recs[0];
  for (const n of r.m1440.nav.slice(0, 40)) console.log(`  h=${n.h} w=${n.w} fs=${n.fs} ${n.ff}/${n.fw} ${n.tt !== "none" ? n.tt : ""} cur=${n.current || "-"} bg=${n.bg} sh=${n.shadow !== "none" ? "Y" : "-"} "${short(n.text, 22)}" [${short(n.cls, 50)}]`);
  console.log("\n  active-state paint per page (aria-current links):");
  for (const r of recs) { const cur = r.m1440.nav.filter((n) => n.current); console.log(`    ${r.route.padEnd(36)} ${cur.map((n) => `"${short(n.text, 14)}" bg=${n.bg} fw=${n.fw} sh=${n.shadow !== "none" ? "Y" : "-"}`).join(" | ") || "(none marked current)"}`); }
  console.log();
}

if (want("small")) {
  console.log("## controls under 40px at 390 (tap floor), outside tables");
  const all = recs.flatMap((r) => (r.m390?.small || []).map((c) => ({ ...c, route: r.route })));
  for (const [k, n] of hist(all, (c) => `${c.kind} h=${c.h} [${short(c.cls, 55)}]`).slice(0, 40)) console.log(`  ${String(n).padStart(3)}× ${k}  e.g. ${all.filter((c) => `${c.kind} h=${c.h} [${short(c.cls, 55)}]` === k).slice(0, 2).map((c) => `${c.route}:"${short(c.text, 16)}"`).join(", ")}`);
  console.log();
}

if (want("radius")) {
  console.log("## control radius × kind");
  const all = recs.flatMap((r) => r.m1440.controls.filter((c) => !c.inShell).map((c) => ({ ...c, route: r.route })));
  for (const kind of ["button", "field", "chip", "pill", "tab"]) console.log(`  ${kind}: ${hist(all.filter((c) => c.kind === kind), (c) => c.br).map(([k, n]) => `${k}:${n}`).join("  ")}`);
  console.log("\n## button font-size × height");
  console.log("  " + hist(all.filter((c) => c.kind === "button"), (c) => `${c.h}h/${c.fs}fs/${c.ff}`).map(([k, n]) => `${k}:${n}`).join("  "));
  console.log("\n## field font-size × height");
  console.log("  " + hist(all.filter((c) => c.kind === "field"), (c) => `${c.h}h/${c.fs}fs/${c.ff}/${c.tag}`).map(([k, n]) => `${k}:${n}`).join("  "));
  console.log();
}
