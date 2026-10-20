/** R-ADMIN: every console KPI and the shared status badges use family glyphs. */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Chip } from "../src/components/ui/chip";
import { adminKpiGlyph } from "../src/components/admin/admin-kpi-glyph";
import { MarketStatusBadge, KycStatusBadge, DsarStatusBadge } from "../src/components/admin/status-badge";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const files = {
  kpi: read("src/components/admin/admin-shell.tsx"),
  subject: read("src/components/admin/admin-kpi-glyph.ts"),
  chip: read("src/components/ui/chip.tsx"),
  status: read("src/components/admin/status-badge.tsx"),
  payout: read("src/app/admin/payments/payout-status-control.tsx"),
  restricted: read("src/components/admin/admin-restricted.tsx"),
  toolkit: read("src/components/admin/ai-toolkit.tsx"),
  affiliate: read("src/app/admin/affiliate/affiliate-admin-client.tsx"),
  payable: read("src/app/admin/affiliate/payable-switch.tsx"),
  bonuses: read("src/app/admin/bonuses/bonus-admin-client.tsx"),
  proposals: read("src/app/admin/proposals/admin-proposals-client.tsx"),
  pollActions: read("src/app/admin/ai-polls/poll-actions.tsx"),
  pollDetail: read("src/app/admin/ai-polls/[id]/page.tsx"),
  pollMissing: read("src/app/admin/ai-polls/[id]/not-found.tsx"),
  desk: read("src/lib/server/house-console-read.ts"),
};

const DESK_SUBJECTS = [
  ["Stake today", "coins"],
  ["Loss today", "coins"],
  ["Open exposure", "coins"],
  ["Accounts", "users"],
] as const;

function mapperFromSource(source: string): (label: string) => string {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, unknown> = {};
  runInNewContext(compiled, { exports });
  if (typeof exports.adminKpiGlyph !== "function") throw new Error("adminKpiGlyph export missing");
  return exports.adminKpiGlyph as (label: string) => string;
}

function kpiLabels(dir: string): string[] {
  const labels: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) labels.push(...kpiLabels(path));
    else if (path.endsWith(".tsx")) {
      const source = readFileSync(path, "utf8");
      if (!source.includes("<AdminKpi")) continue;
      const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node) => {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sf) === "AdminKpi") {
          const attr = node.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "label");
          if (attr && ts.isJsxAttribute(attr) && attr.initializer && ts.isStringLiteral(attr.initializer))
            labels.push(attr.initializer.text);
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
  }
  return labels;
}

function defects(s: typeof files): string[] {
  const bad: string[] = [];
  const subject = mapperFromSource(s.subject);
  for (const [label, glyph] of DESK_SUBJECTS) {
    if (!s.desk.includes(`"${label}"`)) bad.push(`desk no longer supplies ${label}`);
    if (subject(label) !== glyph) bad.push(`desk ${label} must use ${glyph}, got ${subject(label)}`);
  }
  if ((s.kpi.match(/\{subject\}/g) ?? []).length !== 2 || !s.kpi.includes('variant="identity"') ||
      !s.kpi.includes('tier="duo"') || !s.kpi.includes("plateGlyph(26)"))
    bad.push("KPI normal and unavailable paths need one derived Duotone identity plate");
  if (!s.kpi.includes("adminKpiGlyph(label)")) bad.push("KPI must pick a subject from the shared lexicon");
  if (!s.chip.includes("glyph?: FillGlyphKey") || !s.chip.includes('tier="fill"') ||
      !s.chip.includes("{StatusGlyph &&")) bad.push("Chip's status glyph must draw in Fill beside its word");
  for (const name of ["MARKET_GLYPH", "KycStatusBadge", "KycStageBadge", "DsarStatusBadge", "ObjectionStatusBadge", "AccountStatusBadge"])
    if (!s.status.includes(name)) bad.push(`${name} is missing its status family`);
  if ((s.status.match(/glyph=\{/g) ?? []).length < 6) bad.push("all six shared admin status families need glyphs");
  if (!s.payout.includes('<I.checkCircle s={11} tier="fill"') || !s.payout.includes('<I.xCircle s={11} tier="fill"'))
    bad.push("payout rail status needs distinct filled outcomes");
  if (!s.restricted.includes('<IconPlate size={40} variant="warning"') || !s.restricted.includes('tier="fill"'))
    bad.push("restricted admin page needs the shared warning plate");
  if (!s.toolkit.includes('<IconPlate size={32} variant="identity"') || !s.toolkit.includes('tier="duo"'))
    bad.push("AI toolkit needs the identity plate");
  if (!s.affiliate.includes('variant="identity"') || !s.affiliate.includes('<Icon s={plateGlyph(36)} tier="duo"'))
    bad.push("affiliate settings need shared identity plates");
  if (!s.payable.includes('variant={payable ? "identity" : "warning"}') || !s.payable.includes('tier="fill"'))
    bad.push("payable state needs identity and warning plates");
  if ((s.bonuses.match(/<IconPlate/g) ?? []).length !== 2 ||
      !s.bonuses.includes('variant={on ? "identity" : "warning"}') || !s.bonuses.includes('tier="duo"'))
    bad.push("bonus settings need shared identity and warning plates");
  if (!s.proposals.includes('variant={meta.plateVariant}') || !s.proposals.includes('<HeaderIcon s={plateGlyph(40)} tier="fill"'))
    bad.push("proposal machine needs a state plate and filled state glyph");
  if ((s.pollActions.match(/<IconPlate size=\{36\} variant=/g) ?? []).length !== 4 ||
      (s.pollActions.match(/tier="fill"/g) ?? []).length < 5)
    bad.push("AI generation results need four shared status plates");
  if ((s.pollDetail.match(/<IconPlate size=\{32\} variant="empty"/g) ?? []).length !== 2 ||
      !s.pollMissing.includes('<IconPlate size={48} variant="empty"'))
    bad.push("AI poll missing-data states need the empty plate");
  return bad;
}

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

check("admin card and status contracts", defects(files).length === 0, defects(files).join("; "));
const labels = kpiLabels(join(root, "src/app/admin"));
const generic = [...new Set(labels.filter((label) => adminKpiGlyph(label) === "chart"))];
check(`semantic subjects for ${labels.length} literal KPI labels`, labels.length >= 200 && generic.length === 0, generic.join(", "));
check("semantic subjects for dynamic desk KPI labels",
  DESK_SUBJECTS.every(([label, glyph]) => adminKpiGlyph(label) === glyph));
const html = renderToStaticMarkup(createElement(Chip, { size: "sm", variant: "success", glyph: "checkCircle" }, "Approved"));
check("status chip renders its Fill glyph and the word", html.includes('data-g="checkCircle.fill"') && html.includes("Approved"));
const live = renderToStaticMarkup(createElement(MarketStatusBadge, { status: "LIVE" }));
const rejected = renderToStaticMarkup(createElement(KycStatusBadge, { status: "REJECTED" }));
const partial = renderToStaticMarkup(createElement(DsarStatusBadge, { status: "PARTIAL", deletionFailed: true }));
check("stored admin statuses render distinct Fill meanings",
  live.includes('data-g="live.fill"') && rejected.includes('data-g="xCircle.fill"') && partial.includes('data-g="alertCircle.fill"'));

if (process.argv.includes("--prove-red")) {
  const plants: Array<[string, keyof typeof files, string, string]> = [
    ["normal KPI loses its plate", "kpi", "{subject}", ""],
    ["unavailable KPI loses its plate", "kpi", "{subject}", ""],
    ["KPI loses Duotone", "kpi", 'tier="duo"', 'tier="line"'],
    ["chip loses Fill", "chip", 'tier="fill"', 'tier="line"'],
    ["market badge loses its glyph", "status", "glyph={MARKET_GLYPH[status]}", ""],
    ["payout error loses its glyph", "payout", '<I.xCircle s={11} tier="fill"', '<I.alertCircle s={11} tier="fill"'],
    ["generation result regains a private tile", "pollActions", '<IconPlate size={36} variant="success"', '<span className="private-tile"'],
    ["missing poll loses the empty plate", "pollMissing", '<IconPlate size={48} variant="empty"', '<span className="private-tile"'],
    ["desk money label becomes generic", "subject", '[/^Stake today$|^Loss today$/i, "coins"]', '[/^Stake today$|^Loss today$/i, "chart"]'],
    ["desk account label becomes generic", "subject", '[/^Accounts$/i, "users"]', '[/^Accounts$/i, "chart"]'],
  ];
  for (const [name, key, from, to] of plants) {
    if (!files[key].includes(from)) { check(name, false, "plant anchor absent"); continue; }
    const at = name === "normal KPI loses its plate" ? files[key].lastIndexOf(from) : files[key].indexOf(from);
    const mutant = { ...files, [key]: files[key].slice(0, at) + to + files[key].slice(at + from.length) };
    check(name, defects(mutant).length > 0, defects(mutant).join("; "));
  }
}
console.log(`admin cards: ${failures} failure(s)`);
if (failures) process.exit(1);
