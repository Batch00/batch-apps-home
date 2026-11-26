"""Builds the PWA and home-screen icons in public/icons/ from the favicon mark.

The mark is public/favicon.svg: a #3b82f6 circle with a white bold "B" (font-size 18 of 32,
baseline at y 22). Inter is not installed on most machines, so this draws the B in Arial Bold,
the favicon's own fallback. Run with: python scripts/build-icons.py (needs Pillow).

  icon-192.png, icon-512.png   purpose "any": the round mark on a transparent square
  icon-maskable-512.png        purpose "maskable": full-bleed blue, the B inside the safe zone
  apple-touch-icon.png         180, opaque full-bleed blue (iOS rounds the corners itself)
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
FONT = Path("C:/Windows/Fonts/arialbd.ttf")
BLUE = (59, 130, 246, 255)
WHITE = (255, 255, 255, 255)
SCALE = 4  # draw large, then downsample for smooth edges


def mark(size, full_bleed):
    big = size * SCALE
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if full_bleed:
        draw.rectangle([0, 0, big, big], fill=BLUE)
    else:
        draw.ellipse([0, 0, big - 1, big - 1], fill=BLUE)
    font = ImageFont.truetype(str(FONT), round(big * 18 / 32))
    draw.text((big / 2, big * 22 / 32), "B", font=font, fill=WHITE, anchor="ms")
    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    mark(192, False).save(OUT / "icon-192.png", optimize=True)
    mark(512, False).save(OUT / "icon-512.png", optimize=True)
    mark(512, True).save(OUT / "icon-maskable-512.png", optimize=True)
    mark(180, True).convert("RGB").save(OUT / "apple-touch-icon.png", optimize=True)


if __name__ == "__main__":
    main()
