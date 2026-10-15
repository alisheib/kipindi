"""Build a redacted, source-pinned digest of the final local S14 visual drives."""
from __future__ import annotations

import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

if len(sys.argv) != 7:
    raise SystemExit("usage: s14-final-evidence-digest.py MATRIX CLOSURE OUT E2E_MOBILE E2E_DESKTOP CLASSIC")
matrix_dir, closure_dir, out_dir, mobile_dir, desktop_dir, classic_dir = map(Path, sys.argv[1:7])
out_dir.mkdir(parents=True, exist_ok=True)
matrix_path = matrix_dir / "manifest.json"
closure_path = closure_dir / "evidence.json"
matrix = json.loads(matrix_path.read_text(encoding="utf-8"))
closure = json.loads(closure_path.read_text(encoding="utf-8"))
if matrix.get("sourceCommit") != closure.get("sourceCommit"):
    raise SystemExit("matrix and closure source commits differ")

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

tiles = []
groups = defaultdict(list)
for tile in matrix["tiles"]:
    path = matrix_dir / tile["image"]
    sha = digest(path)
    if sha != tile["sha256"]:
        raise SystemExit(f"image digest mismatch: {tile['image']}")
    read = tile.get("read", {})
    missing = [el["selector"] for el in read.get("elements", []) if not el.get("present")]
    overflow = read.get("documentOverflowX", read.get("viewportOverflowX", 0))
    tiles.append({"frame": tile["frame"], "role": tile["role"], "locale": tile["locale"],
                  "width": tile["width"], "height": tile["height"], "image": tile["image"],
                  "sha256": sha, "overflowX": overflow, "missingSelectors": missing})
    if tile["height"] == 844 and tile["width"] in (320, 360, 390, 768, 1024, 1280, 1440):
        groups[(tile["frame"], tile["role"])].append(tile)

font = ImageFont.load_default()
contacts = []
for (frame, role), data in sorted(groups.items()):
    for kind, widths, cell_h in (("mobile", (320, 360, 390), 870),
                                 ("desktop", (768, 1024, 1280, 1440), 370)):
        cells = {(t["locale"], t["width"]): t for t in data if t["width"] in widths}
        if len(cells) != len(widths) * 3:
            raise SystemExit(f"incomplete contact sheet: {frame}/{role}/{kind}: {len(cells)}")
        gap, cell_w, header = 8, 320, 19
        sheet = Image.new("RGB", (gap + len(widths) * (cell_w + gap), gap + 3 * (cell_h + gap)), "#080922")
        draw = ImageDraw.Draw(sheet)
        for ri, locale in enumerate(("sw", "en", "zh")):
            for ci, width in enumerate(widths):
                tile = cells[(locale, width)]
                src = Image.open(matrix_dir / tile["image"]).convert("RGB")
                src.thumbnail((cell_w, cell_h - header), Image.Resampling.LANCZOS)
                x = gap + ci * (cell_w + gap)
                y = gap + ri * (cell_h + gap)
                draw.text((x, y), f"{frame} | {role} | {locale} | {width}", fill="#bbc8ec", font=font)
                sheet.paste(src, (x, y + header))
        name = f"{frame}-{role}-{kind}-contact.png"
        path = out_dir / name
        sheet.save(path, optimize=True)
        contacts.append({"name": name, "sha256": digest(path), "widths": list(widths)})

closure_images = []
for item in closure.get("images", []):
    path = closure_dir / item["name"]
    sha = digest(path)
    if sha != item["sha256"]:
        raise SystemExit(f"closure image digest mismatch: {item['name']}")
    closure_images.append({"name": item["name"], "sha256": sha})

journeys = []
for label, directory in (("mobile", mobile_dir), ("desktop", desktop_dir)):
    path = directory / "evidence.json"
    evidence = json.loads(path.read_text(encoding="utf-8"))
    checks = evidence.get("checks", [])
    if evidence.get("error") or evidence.get("restoreError") or len(checks) < 40 or any(c.get("state") != "PASS" for c in checks):
        raise SystemExit(f"{label} e2e incomplete: {len(checks)} checks")
    images = [{"name": name, "sha256": digest(directory / name)} for name in evidence.get("images", [])]
    journeys.append({"viewport": label, "checkCount": len(checks), "failed": 0,
                     "startedAt": evidence.get("startedAt"), "completedAt": evidence.get("completedAt"),
                     "evidenceSha256": digest(path), "imageCount": len(images), "images": images})

classic_path = classic_dir / "manifest.json"
classic = json.loads(classic_path.read_text(encoding="utf-8"))
if classic.get("sourceCommit") != matrix.get("sourceCommit") or classic.get("failures"):
    raise SystemExit("classic source mismatch or failed cells")
classic_cells = []
for cell in classic.get("cells", []):
    image = classic_dir / cell["image"]
    image_sha = digest(image)
    if image_sha != cell["sha256"]:
        raise SystemExit(f"classic image digest mismatch: {cell['name']}")
    crop = cell.get("crop")
    crop_sha = digest(classic_dir / crop["image"]) if crop else None
    if crop and crop_sha != crop["sha256"]:
        raise SystemExit(f"classic crop digest mismatch: {cell['name']}")
    classic_cells.append({"name": cell["name"], "image": cell["image"], "sha256": image_sha,
                          "crop": {"image": crop["image"], "sha256": crop_sha} if crop else None})
if len(classic_cells) != 16 or classic.get("heldWindowMs", 1e9) >= 300_000:
    raise SystemExit(f"classic scope/window incomplete: {len(classic_cells)} cells")

report = {
    "kind": "S14-final-source-pinned-local-frame-read",
    "sourceCommit": matrix["sourceCommit"],
    "premise": matrix["premise"],
    "matrixCapturedAt": matrix["generatedAt"],
    "closureCapturedAt": closure["generatedAt"],
    "matrixLocalPath": str(matrix_dir), "closureLocalPath": str(closure_dir),
    "matrixManifestSha256": digest(matrix_path), "closureEvidenceSha256": digest(closure_path),
    "tileCount": len(tiles), "widths": matrix["widths"], "locales": matrix["locales"],
    "overflowXCount": sum(t["overflowX"] > 1 for t in tiles),
    "missingSelectorCount": sum(len(t["missingSelectors"]) for t in tiles),
    "pageErrorCount": sum(e.get("type") == "pageerror" for e in matrix.get("errors", [])),
    "closureChecks": [{"id": c["id"], "state": c["state"]} for c in closure["checks"]],
    "closureImageCount": len(closure_images), "closureImages": closure_images,
    "journeys": journeys,
    "classic": {"cellCount": len(classic_cells), "heldWindowMs": classic["heldWindowMs"],
                "manifestSha256": digest(classic_path), "cells": classic_cells},
    "contactSheets": contacts, "tiles": tiles,
}
if (len(tiles) != 201 or len(contacts) != 16 or len(closure["checks"]) != 24
        or any(c["state"] != "PASS" for c in closure["checks"])
        or report["overflowXCount"] or report["missingSelectorCount"] or report["pageErrorCount"]):
    raise SystemExit("S14 final frame gate incomplete; inspect raw manifests")
(out_dir / "digest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"source {report['sourceCommit']} · {len(tiles)} tiles · {len(contacts)} contact sheets · "
      f"{len(closure['checks'])} closure checks · {len(closure_images)} closure images · "
      f"overflow {report['overflowXCount']} · missing {report['missingSelectorCount']} · "
      f"page errors {report['pageErrorCount']}")
