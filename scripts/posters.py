#!/usr/bin/env python3
"""
Wizart Studio ad creatives — 1080x1080, Hindi, for Rewa (MP).

Run again after changing PHONE below:

    python3 scripts/posters.py

Why generated instead of designed by hand: the phone number, the price and the
wording will all change once the first ads run. A script means changing one
line and getting four fresh files, instead of reopening four canvases.

Poppins carries Devanagari, and Pillow is built with raqm here, so matras and
conjuncts are shaped properly rather than stacked left to right. Verified
before writing this — a font without shaping turns "ग्राहक" into rubble.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

# ---------------------------------------------------------------- edit these
PHONE = "98765 43210"          # <-- apna number daalo
SITE = "wizart.pdmmarketing.in"
BRAND = "Wizart Studio"
# ---------------------------------------------------------------------------

OUT = Path(__file__).resolve().parent.parent / "posters"
OUT.mkdir(exist_ok=True)

FDIR = "/usr/share/fonts/truetype/google-fonts/"
def font(weight, size):
    return ImageFont.truetype(f"{FDIR}Poppins-{weight}.ttf", size)

S = 1080
INK   = "#0f172a"
MUT   = "#64748b"
VIO   = "#7c3aed"
VIO_D = "#5b21b6"
GRN   = "#059669"
AMB   = "#b45309"
PAPER = "#ffffff"


def wrap(draw, text, fnt, max_w):
    """Greedy wrap. Hindi splits on spaces like English, so this is enough."""
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def block(draw, text, fnt, x, y, max_w, fill, lh=1.22, center=False):
    """Draw wrapped text, return the y just below it."""
    lines = wrap(draw, text, fnt, max_w)
    step = int(fnt.size * lh)
    for i, ln in enumerate(lines):
        px = x + (max_w - draw.textlength(ln, font=fnt)) / 2 if center else x
        draw.text((px, y + i * step), ln, font=fnt, fill=fill)
    return y + len(lines) * step


def footer(d, dark=False):
    """Brand, site and phone. Same place on every poster so the eye learns it."""
    fg = "#ffffff" if dark else INK
    sub = "#c4b5fd" if dark else MUT
    d.text((70, S - 132), BRAND, font=font("Bold", 34), fill=fg)
    d.text((70, S - 88), SITE, font=font("Regular", 26), fill=sub)
    ph = f"📞 {PHONE}"
    f = font("Bold", 40)
    w = d.textlength(PHONE, font=f)
    d.text((S - 70 - w, S - 122), PHONE, font=f, fill=fg)
    d.text((S - 70 - d.textlength("कॉल करें", font=font("Regular", 26)), S - 76),
           "कॉल करें", font=font("Regular", 26), fill=sub)


def price_tag(d, x, y, big="₹999", small="साल भर"):
    f1, f2 = font("Bold", 92), font("Medium", 30)
    d.text((x, y), big, font=f1, fill=VIO)
    d.text((x + d.textlength(big, font=f1) + 16, y + 46), small, font=f2, fill=MUT)


# ---------------------------------------------------------------- poster 1
def poster_split():
    """The whole product in one picture: one QR, two roads."""
    im = Image.new("RGB", (S, S), PAPER)
    d = ImageDraw.Draw(im)

    d.rectangle([0, 0, S, 14], fill=VIO)

    y = block(d, "खुश ग्राहक चुप चला जाता है।", font("Bold", 62), 70, 90, 940, INK)
    y = block(d, "नाराज़ ग्राहक गूगल पर लिखता है।", font("Bold", 62), 70, y + 6, 940, VIO)
    block(d, "इसीलिए रेटिंग गिरती रहती है।", font("Regular", 34), 70, y + 20, 940, MUT)

    # the fork
    top = 430
    d.rounded_rectangle([70, top, 520, top + 250], 26, fill="#ecfdf5", outline="#a7f3d0", width=3)
    d.text((104, top + 34), "★★★★★", font=font("Bold", 44), fill=GRN)
    block(d, "4–5 स्टार", font("Bold", 40), 104, top + 100, 390, INK)
    block(d, "सीधे आपके गूगल पेज पर", font("Regular", 28), 104, top + 152, 390, "#047857")

    d.rounded_rectangle([560, top, 1010, top + 250], 26, fill="#fffbeb", outline="#fde68a", width=3)
    d.text((594, top + 34), "★★★", font=font("Bold", 44), fill="#d97706")
    block(d, "3 या कम", font("Bold", 40), 594, top + 100, 390, INK)
    block(d, "सिर्फ़ आपके पास, प्राइवेट", font("Regular", 28), 594, top + 152, 390, AMB)

    d.rounded_rectangle([70, 730, 1010, 806], 20, fill="#f5f3ff")
    block(d, "काउंटर पर बस एक QR कोड", font("Medium", 36), 70, 748, 940, VIO_D, center=True)

    price_tag(d, 70, 838)
    footer(d)
    im.save(OUT / "1-do-raste.png")


# ---------------------------------------------------------------- poster 2
def poster_price():
    """For people who already understand the idea and want the number."""
    im = Image.new("RGB", (S, S), "#faf5ff")
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([50, 50, S - 50, S - 50], 40, fill=PAPER)

    block(d, "आपकी दुकान का", font("Medium", 40), 90, 110, 900, MUT)
    y = block(d, "डिजिटल कार्ड + गूगल रिव्यू", font("Bold", 58), 90, 158, 900, INK)

    d.text((90, y + 30), "₹999", font=font("Bold", 150), fill=VIO)
    d.text((410, y + 118), "साल भर", font=font("Medium", 40), fill=MUT)
    d.text((410, y + 168), "यानी ₹83 महीना", font=font("Regular", 28), fill=MUT)

    items = [
        "अपना लिंक और QR कोड",
        "फ़ोटो, सर्विस, रेट लिस्ट",
        "गूगल रिव्यू वाला अलग QR",
        "शिकायत पहले आप तक",
        "जब चाहें ख़ुद बदलें",
    ]
    yy = y + 320
    for t in items:
        d.ellipse([92, yy + 12, 110, yy + 30], fill=VIO)
        d.text((132, yy), t, font=font("Medium", 34), fill=INK)
        yy += 58

    footer(d)
    im.save(OUT / "2-daam.png")


# ---------------------------------------------------------------- poster 3
def poster_pain():
    """Dark, one question, no explaining. Built to stop the thumb."""
    im = Image.new("RGB", (S, S), "#0f172a")
    d = ImageDraw.Draw(im)

    d.ellipse([-160, -220, 560, 500], fill="#1e1b4b")

    y = block(d, "एक खराब रिव्यू", font("Bold", 76), 70, 150, 940, "#ffffff")
    y = block(d, "कितने ग्राहक ले गया?", font("Bold", 76), 70, y + 4, 940, "#a78bfa")

    block(d,
          "गूगल पर देखकर लोग तय करते हैं कि आना है या नहीं। "
          "जो नाराज़ है वही लिखता है — और वही सबको दिखता है।",
          font("Regular", 36), 70, y + 40, 940, "#cbd5e1", lh=1.4)

    d.rounded_rectangle([70, 640, 1010, 790], 24, fill="#7c3aed")
    block(d, "अब शिकायत पहले आप तक आएगी,", font("Bold", 38), 100, 668, 880, "#ffffff")
    block(d, "गूगल पर बाद में — या कभी नहीं।", font("Bold", 38), 100, 716, 880, "#ede9fe")

    d.text((70, 826), "₹999", font=font("Bold", 84), fill="#ffffff")
    d.text((260, 866), "साल भर", font=font("Medium", 32), fill="#c4b5fd")

    footer(d, dark=True)
    im.save(OUT / "3-sawaal.png")


# ---------------------------------------------------------------- poster 4
def poster_reseller():
    """Different buyer, different maths. Numbers are from the live plans table."""
    im = Image.new("RGB", (S, S), PAPER)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, S, 14], fill=VIO)

    block(d, "कमाई का मौका", font("Medium", 36), 70, 90, 940, VIO)
    y = block(d, "₹10,000 लगाइए।", font("Bold", 66), 70, 142, 940, INK)
    y = block(d, "76 कार्ड बनाइए।", font("Bold", 66), 70, y + 2, 940, INK)

    rows = [
        ("आपका खर्च", "₹10,000", MUT),
        ("76 कार्ड ₹999 में बेचे तो", "₹75,924", INK),
        ("बचा", "₹65,924", GRN),
    ]
    yy = y + 50
    for label, val, col in rows:
        d.text((90, yy + 6), label, font=font("Medium", 34), fill=MUT)
        f = font("Bold", 46)
        d.text((1010 - d.textlength(val, font=f), yy), val, font=f, fill=col)
        yy += 76
        d.line([90, yy - 12, 1010, yy - 12], fill="#e2e8f0", width=2)

    d.rounded_rectangle([70, yy + 20, 1010, yy + 150], 24, fill="#f5f3ff")
    block(d, "अपने शहर में आप ही बेचिए।", font("Bold", 38), 100, yy + 44, 880, VIO_D)
    block(d, "दाम आप तय कीजिए — पूरा पैसा आपका।", font("Regular", 30), 100, yy + 92, 880, MUT)

    footer(d)
    im.save(OUT / "4-reseller.png")


if __name__ == "__main__":
    poster_split()
    poster_price()
    poster_pain()
    poster_reseller()
    for f in sorted(OUT.glob("*.png")):
        print(f"{f.name:22} {f.stat().st_size // 1024} KB")
