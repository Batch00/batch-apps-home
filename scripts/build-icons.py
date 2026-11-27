"""Builds every Batch Apps icon from one SVG source, scripts/icon-source.svg.

The mark: a #3b82f6 circle with a white Inter Bold "B" (font-size 18 of 32, baseline at y 22,
centered on its ink). The B is a path, so no icon depends on a font being installed.

  python scripts/build-icons.py
      Renders from scripts/icon-source.svg (needs Pillow and fontTools):
        public/favicon.svg                      the source mark itself
        public/icons/icon-192.png, icon-512.png purpose "any": the round mark, transparent corners
        public/icons/icon-maskable-512.png      purpose "maskable": full-bleed blue, B in the safe zone
        public/icons/apple-touch-icon.png       180, opaque full-bleed blue (iOS rounds the corners)

  python scripts/build-icons.py --font path/to/inter-latin-700-normal.woff
      First rewrites scripts/icon-source.svg from Inter Bold, then renders as above. Get the font
      from npm @fontsource/inter (files/inter-latin-700-normal.woff) or Google Fonts, outside the
      repo: the font is never committed.
"""

import argparse
import math
import re
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "scripts" / "icon-source.svg"
ICONS = ROOT / "public" / "icons"
FAVICON = ROOT / "public" / "favicon.svg"

BOX = 32  # the source's viewBox is 0 0 32 32
FONT_SIZE = 18
BASELINE = 22
BLUE = (59, 130, 246)
WHITE = (255, 255, 255)
SUPERSAMPLE = 8  # render large in 1-bit, then downsample for smooth edges
SAFE_RADIUS = 0.4 * BOX  # maskable safe zone: a centered circle, 80% of the icon wide

SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- Batch Apps mark: Inter Bold "B" as a path, built by scripts/build-icons.py -->
  <circle cx="16" cy="16" r="16" fill="#3b82f6"/>
  <path fill="#ffffff" d="{d}"/>
</svg>
"""


def write_source(font_path):
    """Writes the source SVG: the Inter Bold B, scaled into the 32 box and centered on its ink."""
    font = TTFont(str(font_path))
    glyphs = font.getGlyphSet()
    name = font.getBestCmap()[ord("B")]
    scale = FONT_SIZE / font["head"].unitsPerEm

    bounds = BoundsPen(glyphs)
    glyphs[name].draw(bounds)
    x_min, _, x_max, _ = bounds.bounds
    dx = BOX / 2 - (x_min + x_max) / 2 * scale

    # Font units are y-up from the baseline; SVG is y-down.
    pen = SVGPathPen(glyphs, ntos=lambda v: f"{round(v, 3):g}")
    glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, dx, BASELINE)))
    SOURCE.write_text(SVG_TEMPLATE.format(d=pen.getCommands()), encoding="utf-8", newline="\n")


class FlattenPen:
    """Collects a path as closed polygons, with curves split into short straight segments."""

    STEPS = 24

    def __init__(self):
        self.contours = []
        self.current = []

    def moveTo(self, p):
        self.current = [p]

    def lineTo(self, p):
        self.current.append(p)

    def qCurveTo(self, *points):
        # parse_path hands over one control point per call; handle the general TrueType case too.
        start = self.current[-1]
        *offs, end = points
        for i, c in enumerate(offs):
            stop = end if i == len(offs) - 1 else ((c[0] + offs[i + 1][0]) / 2, (c[1] + offs[i + 1][1]) / 2)
            for s in range(1, self.STEPS + 1):
                t = s / self.STEPS
                self.current.append(tuple((1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * e for a, b, e in zip(start, c, stop)))
            start = stop

    def curveTo(self, c1, c2, end):
        start = self.current[-1]
        for s in range(1, self.STEPS + 1):
            t = s / self.STEPS
            u = 1 - t
            self.current.append(tuple(u**3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t**3 * e for a, b, c, e in zip(start, c1, c2, end)))

    def closePath(self):
        if len(self.current) > 2:
            self.contours.append(self.current)
        self.current = []

    endPath = closePath


def read_mark():
    """The B's contours from the source SVG, in 32-box units."""
    svg = SOURCE.read_text(encoding="utf-8")
    d = re.search(r'<path[^>]*\sd="([^"]+)"', svg).group(1)
    pen = FlattenPen()
    parse_path(d, pen)
    return pen.contours


def glyph_mask(contours, size):
    """Even-odd fill of the contours (the B's counters come out as holes), as a 1-bit image."""
    k = size / BOX
    mask = Image.new("1", (size, size), 0)
    for contour in contours:
        layer = Image.new("1", (size, size), 0)
        ImageDraw.Draw(layer).polygon([(x * k, y * k) for x, y in contour], fill=1)
        mask = ImageChops.logical_xor(mask, layer)
    return mask


def render(contours, size, full_bleed):
    big = size * SUPERSAMPLE
    if full_bleed:
        backdrop = Image.new("1", (big, big), 1)
    else:
        backdrop = Image.new("1", (big, big), 0)
        ImageDraw.Draw(backdrop).ellipse([0, 0, big - 1, big - 1], fill=1)
    glyph = glyph_mask(contours, big)

    shape = backdrop.convert("L").resize((size, size), Image.LANCZOS)
    letter = glyph.convert("L").resize((size, size), Image.LANCZOS)
    img = Image.new("RGBA", (size, size), BLUE + (0,))
    img.putalpha(shape)
    white = Image.new("RGBA", (size, size), WHITE + (255,))
    img.paste(white, (0, 0), letter)
    return img


def check_safe_zone(contours):
    center = BOX / 2
    far = max(math.dist((x, y), (center, center)) for contour in contours for x, y in contour)
    if far > SAFE_RADIUS:
        raise SystemExit(f"The B reaches {far:.2f} from center, past the maskable safe zone ({SAFE_RADIUS}).")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--font", type=Path, help="Inter Bold (.ttf, .otf or .woff) to rebuild the SVG source from")
    args = parser.parse_args()

    if args.font:
        write_source(args.font)

    contours = read_mark()
    check_safe_zone(contours)

    FAVICON.write_text(SOURCE.read_text(encoding="utf-8"), encoding="utf-8", newline="\n")
    ICONS.mkdir(parents=True, exist_ok=True)
    render(contours, 192, False).save(ICONS / "icon-192.png", optimize=True)
    render(contours, 512, False).save(ICONS / "icon-512.png", optimize=True)
    render(contours, 512, True).save(ICONS / "icon-maskable-512.png", optimize=True)
    render(contours, 180, True).convert("RGB").save(ICONS / "apple-touch-icon.png", optimize=True)


if __name__ == "__main__":
    main()
