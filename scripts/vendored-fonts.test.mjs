import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// The 20c49f568 build emitted these same faces and Latin preloads. Keep all
// subsets so non-Latin names retain glyph coverage, while builds stay offline.
const root = process.cwd();
const css = readFileSync(join(root, "src/app/fonts.css"), "utf8");
const globalCss = readFileSync(join(root, "src/app/globals.css"), "utf8");
const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
const config = readFileSync(join(root, "next.config.ts"), "utf8");
const expected = new Map([
  ["Sora", { weights: [400, 500, 600, 700, 800], subsets: 2, license: "OFL-sora.txt" }],
  ["Inter", { weights: [400, 500, 600, 700], subsets: 7, license: "OFL-inter.txt" }],
  ["JetBrains Mono", { weights: [400, 500, 600], subsets: 6, license: "OFL-jetbrainsmono.txt" }],
]);

assert(!layout.includes('from "next/font/google"'), "A Google font fetch remains in the layout");
assert(layout.includes('import "./fonts.css";'), "Vendored font CSS is not imported");
assert(layout.includes('className="notranslate kp-local-fonts"'), "Font variables are not applied to html");
assert(config.includes('"/fonts/:path*"'), "Content-addressed fonts need immutable cache headers");

const faceMatches = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)];
const faces = faceMatches.map((match) => match[1]);
// Frozen baseline digests detect any unnoticed range, face-order, fallback
// metric, or asset change while permitting unrelated CSS comments to evolve.
assert.equal(createHash("sha256").update(faceMatches.map((match) => match[0]).join("\n")).digest("hex"),
  "5158d415c49fdff34256899c8ce8e8be905f7879a0a3c43981d52d6b3869ccfc", "Original 59 face definitions changed");
const expectedFiles = new Set();
for (const [family, spec] of expected) {
  const familyFaces = faces.filter((face) => face.includes(`font-family:${family};`));
  assert.equal(familyFaces.length, spec.weights.length * spec.subsets, `${family} face count`);
  let filesForFamily;
  for (const weight of spec.weights) {
    const weighted = familyFaces.filter((face) => face.includes(`font-weight:${weight};`));
    assert.equal(weighted.length, spec.subsets, `${family} weight ${weight} subset count`);
    const files = new Set();
    for (const face of weighted) {
      const file = /src:url\("\/fonts\/([^"/]+\.woff2)"\)format\("woff2"\)/.exec(face)?.[1];
      assert(file, `${family} ${weight} has a local WOFF2 source`);
      assert(/unicode-range:U\+/.test(face), `${family} ${weight} has a unicode range`);
      assert(face.includes("font-display:swap;"), `${family} ${weight} retains swap`);
      files.add(file);
      expectedFiles.add(file);
    }
    assert.equal(files.size, spec.subsets, `${family} ${weight} distinct subsets`);
    const current = [...files].sort().join("|");
    if (filesForFamily !== undefined) assert.equal(current, filesForFamily, `${family} subset files must match across weights`);
    filesForFamily = current;
  }
  assert(faces.some((face) => face.includes(`font-family:${family} Fallback;`)), `${family} fallback metrics`);
  assert(existsSync(join(root, "public/fonts", spec.license)), `${family} OFL license`);
}
assert.equal(expectedFiles.size, 15, "Expected two Sora, seven Inter and six JetBrains Mono subset files");
const assetHash = createHash("sha256");
for (const file of [...expectedFiles].sort()) {
  const path = join(root, "public/fonts", file);
  assert(existsSync(path), `${file} exists`);
  const bytes = readFileSync(path);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "wOF2", `${file} is WOFF2`);
  assetHash.update(file).update(bytes);
}
assert.equal(assetHash.digest("hex"), "c6082c6972d2219ce448752bcdd95b348a3889fcede98c463884232e060dbb21",
  "Original 15 font binaries changed");

const preloads = [...layout.matchAll(/<link rel="preload" href="\/fonts\/([^"/]+\.woff2)" as="font" type="font\/woff2" crossOrigin="anonymous" \/>/g)].map((match) => match[1]);
const latin = [...expectedFiles].filter((file) => file.includes("-s.p."));
assert.equal(preloads.length, 3, "Exactly three Latin faces preload");
assert.deepEqual(preloads.sort(), latin.sort(), "Only the same three Latin faces preload");
const assertStacks = (css) => {
  const block = /\.kp-local-fonts\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
  const value = (name) => new RegExp(`--${name}:\\s*([^;]+);`).exec(block)?.[1].trim();
  assert.equal(value("font-display"), '"Sora", "Sora Fallback", system-ui, var(--font-cjk), sans-serif',
    "Sora metric fallback and original CJK chain preserved");
  assert.equal(value("font-sans"), '"Inter", "Inter Fallback", system-ui, var(--font-cjk), sans-serif',
    "Inter metric fallback and original CJK chain preserved");
  assert.equal(value("font-mono"), '"JetBrains Mono", "JetBrains Mono Fallback", ui-monospace, var(--font-cjk), monospace',
    "Mono metric fallback and original CJK chain preserved");
  const cjk = /--font-cjk:\s*([^;]+);/.exec(css)?.[1] ?? "";
  for (const family of ["PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC"]) {
    assert(cjk.includes(`'${family}'`), `${family} explicit CJK fallback preserved`);
  }
};
assertStacks(globalCss);
if (process.argv.includes("--prove-red")) {
  const withoutCjk = globalCss.replace('"Inter Fallback", system-ui, var(--font-cjk), sans-serif', '"Inter Fallback", system-ui, sans-serif');
  assert.notEqual(withoutCjk, globalCss, "CJK red plant applied");
  assert.throws(() => assertStacks(withoutCjk), /original CJK chain preserved/, "CJK omission must fail the guard");
  console.log("vendored-fonts red: omitted CJK chain rejected");
}

console.log(`vendored-fonts: ${faces.length} faces, ${expectedFiles.size} WOFF2 subsets, ${preloads.length} Latin preloads, three licenses — PASS`);
