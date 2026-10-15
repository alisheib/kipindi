"""Build the S14 local-preview agency comparison from disposable E2E captures.

Run ``npm run e2e:journey`` at mobile and desktop first, with the output directories
documented in docs/qa/s14-independent-visual-review-20261015.md. The screenshots
are local synthetic evidence; this PDF must never be described as production proof.
"""

from __future__ import annotations

from io import BytesIO
import json
from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A2, landscape
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent.parent
AGENCY = ROOT / "docs/design-system/v5-2026-09-29-simplified-journey/frames"
MOBILE = ROOT / ".qa-shots/simple-journey/e2e-mobile-review"
DESKTOP = ROOT / ".qa-shots/simple-journey/e2e-desktop-review"
OUTPUT = ROOT / "output/pdf/s14-local-preview-agency-comparison-20261015.pdf"

INK = HexColor("#F8F9FF")
MUTED = HexColor("#BCC5E5")
LINE = HexColor("#44509A")
NAVY = HexColor("#06092A")
PANEL = HexColor("#11164B")
COBALT = HexColor("#4F76E8")
GOLD = HexColor("#F7CA57")
PAGE_W, PAGE_H = landscape(A2)

FRAMES = [
    ("01", "Home", "1-home.png", "00-home.png",
     "How-to leads the question list. The agency frame uses Swahili sample questions; local captures use English seeded markets."),
    ("02", "Selected choice", "2-bet-sheet.png", "05-returned-choice.png",
     "The returned sheet retains the chosen YES side and TZS 500 stake. The seeded one-sided market carries its own risk note."),
    ("03", "Short balance", "3-balance-too-low.png", "02-short-balance.png",
     "A TZS 0 wallet offers the TZS 1,000 minimum deposit. Place bet stays disabled until funding completes and the player presses again."),
    ("04", "Deposit", "4-deposit.png", "03-deposit-form.png",
     "The YES chip and TZS 500 choice precede amount, payment methods, phone and PIN note. TZS 1,000 is the minimum deposit, not the bet."),
    ("05", "How to play", "5-how-to-play.png", "00-how-to-play.png",
     "Three steps, the estimate example and the action remain visible. The deck's helpline was superseded by the 2026-10-06 owner ruling."),
]


def checked_evidence(folder: Path, expected: int) -> dict:
    data = json.loads((folder / "evidence.json").read_text(encoding="utf-8"))
    checks = data.get("checks", [])
    if data.get("error") or len(checks) != expected or any(c.get("state") != "PASS" for c in checks):
        raise RuntimeError(f"Incomplete local capture: {folder}")
    if data.get("base") != "http://localhost:3049":
        raise RuntimeError(f"Unexpected capture origin: {data.get('base')}")
    return data


def image_reader(path: Path) -> tuple[ImageReader, int, int, BytesIO]:
    with Image.open(path) as source:
        rgb = source.convert("RGB")
        width, height = rgb.size
        packed = BytesIO()
        rgb.save(packed, format="JPEG", quality=89, subsampling=0, optimize=True)
    packed.seek(0)
    return ImageReader(packed), width, height, packed


def label(pdf: canvas.Canvas, x: float, y: float, text: str, color=INK, size=16) -> None:
    pdf.setFillColor(color)
    pdf.setFont("Helvetica-Bold", size)
    pdf.drawString(x, y, text)


def body(pdf: canvas.Canvas, x: float, top: float, message: str, width: float, size=12, leading=17) -> None:
    pdf.setFont("Helvetica", size)
    pdf.setFillColor(MUTED)
    for n, line in enumerate(simpleSplit(message, "Helvetica", size, width)):
        pdf.drawString(x, top - n * leading, line)


def frame_header(pdf: canvas.Canvas, number: str, title: str, page: int, subtitle: str) -> None:
    pdf.setFillColor(NAVY)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    pdf.setFillColor(COBALT)
    pdf.roundRect(48, PAGE_H - 67, 147, 28, 8, fill=1, stroke=0)
    label(pdf, 62, PAGE_H - 59, "S14 / DESIGN READ", size=11)
    label(pdf, 49, PAGE_H - 113, f"{number}  {title}", size=30)
    body(pdf, 50, PAGE_H - 137, subtitle, 1160, size=12)
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(1)
    pdf.line(49, PAGE_H - 159, PAGE_W - 49, PAGE_H - 159)
    pdf.setStrokeColor(GOLD)
    pdf.setFillColor(NAVY)
    pdf.roundRect(PAGE_W - 389, PAGE_H - 116, 340, 47, 9, fill=1, stroke=1)
    label(pdf, PAGE_W - 371, PAGE_H - 96, "LOCAL PREVIEW  /  NOT PRODUCTION PROOF", GOLD, 12)
    label(pdf, PAGE_W - 172, 47, f"{page:02d} / 06", MUTED, 10)


def image_card(pdf: canvas.Canvas, path: Path, x: float, y: float, width: float, height: float,
               caption: str, detail: str) -> None:
    label(pdf, x, y + height + 26, caption, INK, 15)
    label(pdf, x, y + height + 8, detail, MUTED, 10)
    pdf.setFillColor(PANEL)
    pdf.setStrokeColor(LINE)
    pdf.roundRect(x, y, width, height, 9, fill=1, stroke=1)
    reader, iw, ih, keep = image_reader(path)
    usable_w, usable_h = width - 16, height - 16
    factor = min(usable_w / iw, usable_h / ih)
    w, h = iw * factor, ih * factor
    pdf.drawImage(reader, x + (width - w) / 2, y + height - 8 - h, width=w, height=h)
    keep.close()


def build() -> None:
    mobile = checked_evidence(MOBILE, 44)
    desktop = checked_evidence(DESKTOP, 42)
    if mobile.get("viewport") != {"width": 390, "height": 844} or desktop.get("viewport") != {"width": 1280, "height": 900}:
        raise RuntimeError("Unexpected viewport evidence")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    pdf.setTitle("S14 local preview | 50pick simplified journey and agency frames")
    pdf.setAuthor("50pick QA")
    pdf.setSubject("Local disposable mock preview; five agency frames; no production or agency sign-off")

    xs = [49, 454, 859]
    widths = [391, 391, PAGE_W - 908]
    y, height = 161, 824
    for page, (number, title, agency_name, actual_name, note) in enumerate(FRAMES, 1):
        frame_header(pdf, number, title, page,
                     "Agency reference at left; integrated local browser captures in the middle and at right.")
        image_card(pdf, AGENCY / agency_name, xs[0], y, widths[0], height,
                   "Agency frame", "2026-09-29 presentation / illustrative copy")
        image_card(pdf, MOBILE / actual_name, xs[1], y, widths[1], height,
                   "Local phone", "390 x 844 browser / full page for deposit")
        image_card(pdf, DESKTOP / actual_name, xs[2], y, widths[2], height,
                   "Local desktop", "1280 x 900 browser / full page for deposit")
        label(pdf, 49, 129, "REVIEW NOTE", GOLD, 10)
        body(pdf, 143, 129, note, PAGE_W - 203, size=12)
        body(pdf, 49, 75,
             "Synthetic in-memory market and payment data. Agency mockup chrome, language, stake and palette are reference, not a production screenshot.",
             PAGE_W - 250, size=10, leading=13)
        pdf.showPage()

    frame_header(pdf, "06", "Payment-to-bet receipt", 6,
                 "Local mock proof of the separation between funding and placing a bet; no real money moved.")
    receipt_items = [
        ("Paid waiting", "04-paid-waiting.png", MOBILE),
        ("Returned choice", "05-returned-choice.png", MOBILE),
        ("One bet receipt", "06-one-bet-receipt.png", MOBILE),
        ("Desktop receipt", "06-one-bet-receipt.png", DESKTOP),
    ]
    gap = 12
    width = (PAGE_W - 98 - 3 * gap) / 4
    for index, (title, name, folder) in enumerate(receipt_items):
        x = 49 + index * (width + gap)
        image_card(pdf, folder / name, x, 173, width, 790, title,
                   "Local mock / explicit player action")
    label(pdf, 49, 128, "BROWSER PROOF", GOLD, 10)
    body(pdf, 157, 128,
         "Paid: wallet TZS 1,000, zero bet. Return: YES / TZS 500 still waiting. One separate press: one position and one BET_PLACED row.",
         PAGE_W - 210, size=12)
    body(pdf, 49, 75,
         f"Mobile {len(mobile['checks'])}/{len(mobile['checks'])}; desktop {len(desktop['checks'])}/{len(desktop['checks'])} browser assertions passed. Capture dates: {mobile['completedAt'][:10]} and {desktop['completedAt'][:10]} UTC. Agency sign-off and production SHA read-back remain open.",
         PAGE_W - 250, size=10, leading=13)
    pdf.showPage()
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
