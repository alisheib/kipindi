"""Compose the five S14 design-vs-production pages after real captures exist.

Input is a JSON manifest with environment="production", sourceCommit, capturedAt,
and screenshots keyed home, bet-sheet, low-balance, deposit, how-to-play. Each
entry needs a PNG/JPEG path, HTTPS URL without query or fragment, and capturedAt.
Paths may be absolute or relative to the manifest. Example command:

  python scripts/s14-agency-comparison.py \
    --manifest C:/captures/s14/production-capture.json \
    --output C:/captures/s14/agency-side-by-side.pdf

The compositor refuses absent/nonproduction screenshots. --allow-local-draft is
for layout QA only and watermarks every page; it must never be sent as approval.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


FRAMES = (
    ("home", "01 / Home", "1-home.png"),
    ("bet-sheet", "02 / Bet sheet", "2-bet-sheet.png"),
    ("low-balance", "03 / Low balance", "3-balance-too-low.png"),
    ("deposit", "04 / Deposit", "4-deposit.png"),
    ("how-to-play", "05 / How to play", "5-how-to-play.png"),
)
DECK_DIR = (Path(__file__).resolve().parents[1]
            / "docs/design-system/v5-2026-09-29-simplified-journey/frames")
INK = colors.HexColor("#141C3B")
MUTED = colors.HexColor("#526079")
RULE = colors.HexColor("#D6DBE5")
BLUE = colors.HexColor("#2951B7")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def date_with_zone(value: object, field: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be an ISO timestamp with time zone")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{field} must be an ISO timestamp with time zone") from exc
    if parsed.tzinfo is None:
        raise ValueError(f"{field} must include a time zone")
    return parsed.strftime("%Y-%m-%d %H:%M %Z")


def validate_image(path: Path, label: str, production: bool) -> tuple[int, int]:
    if not path.is_file():
        raise ValueError(f"{label} image missing: {path}")
    if path.suffix.lower() not in (".png", ".jpg", ".jpeg"):
        raise ValueError(f"{label} must be PNG or JPEG: {path}")
    with Image.open(path) as im:
        im.verify()
    with Image.open(path) as im:
        width, height = im.size
    if production and (width < 320 or height < 500 or not 0.18 <= width / height <= 0.85):
        raise ValueError(f"{label} must be a portrait mobile capture: {width}x{height}")
    return width, height


def image_in_box(pdf: canvas.Canvas, path: Path, x: float, y: float,
                 width: float, height: float) -> None:
    iw, ih = Image.open(path).size
    scale = min(width / iw, height / ih)
    dw, dh = iw * scale, ih * scale
    px, py = x + (width - dw) / 2, y + (height - dh) / 2
    pdf.setStrokeColor(RULE)
    pdf.setLineWidth(0.65)
    pdf.rect(px - 0.5, py - 0.5, dw + 1, dh + 1, stroke=1, fill=0)
    pdf.drawImage(ImageReader(str(path)), px, py, dw, dh, mask="auto")


def compose(manifest_path: Path, output_path: Path, allow_local_draft: bool) -> None:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    environment = manifest.get("environment")
    production = environment == "production"
    if not production and not (allow_local_draft and environment == "local-draft"):
        raise ValueError("A production capture manifest is required; local drafts need --allow-local-draft")
    source = manifest.get("sourceCommit")
    if not isinstance(source, str) or not re.fullmatch(r"[0-9a-f]{40}", source):
        raise ValueError("sourceCommit must be a full 40-character lowercase SHA")
    captured = date_with_zone(manifest.get("capturedAt"), "capturedAt")
    entries = manifest.get("screenshots")
    if not isinstance(entries, dict) or set(entries) != {row[0] for row in FRAMES}:
        raise ValueError("screenshots must contain exactly the five named S14 frames")

    validated = []
    used_paths: set[Path] = set()
    for key, title, deck_name in FRAMES:
        entry = entries[key]
        if not isinstance(entry, dict) or not isinstance(entry.get("path"), str):
            raise ValueError(f"{key}: path, URL and capturedAt are required")
        screenshot = Path(entry["path"])
        if not screenshot.is_absolute():
            screenshot = manifest_path.parent / screenshot
        screenshot = screenshot.resolve()
        if screenshot in used_paths:
            raise ValueError(f"{key}: duplicate screenshot path")
        used_paths.add(screenshot)
        deck = DECK_DIR / deck_name
        validate_image(deck, f"{key} deck", False)
        screenshot_size = validate_image(screenshot, key, production)
        url = entry.get("url")
        if not isinstance(url, str):
            raise ValueError(f"{key}: URL is required")
        parsed = urlsplit(url)
        valid_origin = (parsed.scheme == "https" if production else
                        parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1"))
        if not valid_origin or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError(f"{key}: use an HTTPS production URL (or localhost for a draft) without credentials, query, or fragment")
        if len(url) > 118:
            raise ValueError(f"{key}: URL too long for the comparison footer")
        shot_at = date_with_zone(entry.get("capturedAt"), f"{key}.capturedAt")
        validated.append((key, title, deck, screenshot, screenshot_size, url, shot_at))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    page_w, page_h = landscape(A3)
    pdf = canvas.Canvas(str(output_path), pagesize=(page_w, page_h), pageCompression=1)
    pdf.setTitle("50pick S14 - design and production visual comparison")
    pdf.setAuthor("50pick visual QA")
    margin, gutter = 42, 24
    col_w = (page_w - 2 * margin - gutter) / 2
    box_y, box_h = 73, page_h - 158

    for page_no, (key, title, deck, screenshot, screenshot_size, url, shot_at) in enumerate(validated, 1):
        pdf.setFillColor(INK)
        pdf.setFont("Helvetica-Bold", 19)
        pdf.drawString(margin, page_h - 45, "50pick / S14 visual comparison")
        pdf.setFont("Helvetica", 12)
        pdf.setFillColor(MUTED)
        pdf.drawRightString(page_w - margin, page_h - 43, title)
        pdf.setStrokeColor(RULE)
        pdf.line(margin, page_h - 55, page_w - margin, page_h - 55)

        for col, label in enumerate(("Design deck frame", f"Production capture ({screenshot_size[0]} x {screenshot_size[1]})")):
            pdf.setFillColor(BLUE if col else INK)
            pdf.setFont("Helvetica-Bold", 11)
            pdf.drawString(margin + col * (col_w + gutter), page_h - 78, label)
        image_in_box(pdf, deck, margin, box_y, col_w, box_h)
        image_in_box(pdf, screenshot, margin + col_w + gutter, box_y, col_w, box_h)

        pdf.setStrokeColor(RULE)
        pdf.line(margin, 64, page_w - margin, 64)
        pdf.setFillColor(MUTED)
        pdf.setFont("Helvetica", 8)
        pdf.drawString(margin, 51, f"Source {source[:12]}  |  Captured {shot_at}  |  {url}")
        pdf.drawString(margin, 39, f"Design SHA-256 {sha256(deck)[:16]}  |  Production SHA-256 {sha256(screenshot)[:16]}")
        pdf.drawRightString(page_w - margin, 39, f"{page_no} / {len(FRAMES)}")
        if not production:
            pdf.saveState()
            pdf.setFillColor(colors.HexColor("#B22B37"))
            pdf.setFont("Helvetica-Bold", 12)
            pdf.drawRightString(page_w - margin, page_h - 78, "LOCAL DRAFT - NOT AGENCY PROOF")
            pdf.restoreState()
        pdf.showPage()
    pdf.save()
    print(f"{len(validated)} pages; {environment}; source {source}; captured {captured}; output {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--allow-local-draft", action="store_true")
    args = parser.parse_args()
    compose(args.manifest.resolve(), args.output.resolve(), args.allow_local_draft)
